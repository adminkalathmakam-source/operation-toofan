from __future__ import annotations

import io
import os
import time
from pathlib import Path
import networkx as nx
import pandas as pd
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

app = FastAPI(
    title="TOOFAN Shield Real-Time Multi-Device Sync API",
    description=(
        "Synthetic-data training prototype with real-time WebSocket synchronization across devices. "
        "Outputs are heuristic and informational, not legal conclusions or operational law-enforcement records."
    ),
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Transaction(BaseModel):
    sender: str = Field(min_length=1, max_length=120)
    receiver: str = Field(min_length=1, max_length=120)
    amount: float = Field(ge=0, le=1_000_000_000)
    channel: str = Field(default="upi", max_length=32)
    is_p2m: bool = False
    event_type: str = Field(default="transfer", max_length=40)
    reference_id: str | None = Field(default=None, max_length=120)


class MerchantObservation(BaseModel):
    merchant_alias: str = Field(min_length=1, max_length=80)
    category: str = Field(min_length=1, max_length=40)
    usual_daily_receipts: float = Field(ge=0, le=1_000_000_000)
    observed_daily_receipts: float = Field(ge=0, le=1_000_000_000)


class TraceRequest(BaseModel):
    transactions: list[Transaction] = Field(default_factory=list, max_length=5000)
    csv_data: str | None = Field(default=None, max_length=1_000_000)
    merchant_observations: list[MerchantObservation] = Field(default_factory=list, max_length=500)


class Coordinates(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class Evidence(BaseModel):
    sha256: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    captured_at: str = Field(min_length=1, max_length=80)
    coordinates: Coordinates | None = None
    officer_id: str = Field(min_length=1, max_length=80)
    checklist: dict[str, bool]


class MemoRequest(BaseModel):
    case_label: str = Field(min_length=1, max_length=100)
    evidence: Evidence


class SyncTransactionItem(BaseModel):
    sender: str
    receiver: str
    amount: float
    channel: str = "upi"
    is_p2m: bool = False
    event_type: str = "transfer"
    reference_id: str | None = None


class SyncTxRequest(BaseModel):
    transactions: list[SyncTransactionItem]
    source: str = "unknown"  # "mobile-gpay" | "cash-desk" | "pc-web"


class SyncSampleRequest(BaseModel):
    scenario: str = "burst"


# ==============================================================================
# Graph Trace Analysis Logic
# ==============================================================================
def _execute_graph_trace(frame: pd.DataFrame, merchant_observations: list) -> dict:
    graph = nx.DiGraph()
    included = frame[~frame["is_p2m"].astype(bool)] if not frame.empty else pd.DataFrame()
    for row in included.itertuples(index=False):
        sender = str(row.sender)
        receiver = str(row.receiver)
        existing = graph.get_edge_data(sender, receiver, default={})
        events = existing.get("events", [])
        events.append(
            {
                "amount": float(row.amount),
                "channel": str(row.channel),
                "event_type": str(getattr(row, "event_type", "transfer")),
                "reference_id": getattr(row, "reference_id", None),
            }
        )
        graph.add_edge(
            sender,
            receiver,
            amount=existing.get("amount", 0.0) + float(row.amount),
            events=events,
        )

    nodes = []
    for account in graph.nodes:
        incoming = graph.in_degree(account)
        outgoing = graph.out_degree(account)
        total_received = sum(graph[u][account]["amount"] for u in graph.predecessors(account))
        total_sent = sum(graph[account][v]["amount"] for v in graph.successors(account))
        role = (
            "destination"
            if outgoing == 0
            else "possible-convergence"
            if incoming >= 2
            else "account"
        )
        nodes.append(
            {
                "id": account,
                "incoming": incoming,
                "outgoing": outgoing,
                "total_received": round(float(total_received), 2),
                "total_sent": round(float(total_sent), 2),
                "role": role,
            }
        )
    edges = [
        {
            "source": source,
            "target": target,
            "amount": data["amount"],
            "events": data["events"],
        }
        for source, target, data in graph.edges(data=True)
    ]
    sources = [account for account in graph.nodes if graph.in_degree(account) == 0]
    sinks = [account for account in graph.nodes if graph.out_degree(account) == 0]
    paths = []
    for source in sources:
        for sink in sinks:
            for path in nx.all_simple_paths(graph, source, sink, cutoff=6):
                paths.append(path)
                if len(paths) >= 100:
                    break
            if len(paths) >= 100:
                break
        if len(paths) >= 100:
            break
    candidates = [
        {
            "account": node["id"],
            "reason": "Multiple non-P2M incoming transfers in synthetic data",
            "incoming_count": node["incoming"],
            "outgoing_count": node["outgoing"],
            "review_status": "unverified-pattern",
        }
        for node in nodes
        if node["incoming"] >= 2
    ]
    merchant_alerts = []
    for obs in merchant_observations:
        baseline = (
            obs.usual_daily_receipts
            if hasattr(obs, "usual_daily_receipts")
            else obs.get("usual_daily_receipts", 0)
        )
        observed = (
            obs.observed_daily_receipts
            if hasattr(obs, "observed_daily_receipts")
            else obs.get("observed_daily_receipts", 0)
        )
        alias = (
            obs.merchant_alias
            if hasattr(obs, "merchant_alias")
            else obs.get("merchant_alias", "UNKNOWN")
        )
        category = (
            obs.category
            if hasattr(obs, "category")
            else obs.get("category", "Retail")
        )
        ratio = observed / baseline if baseline > 0 else None
        is_outlier = (
            observed >= 4 * baseline and observed - baseline >= 500
            if baseline > 0
            else observed >= 500
        )
        merchant_alerts.append(
            {
                "merchant_alias": alias,
                "category": category,
                "usual_daily_receipts": baseline,
                "observed_daily_receipts": observed,
                "increase": observed - baseline,
                "multiple_of_baseline": round(ratio, 2) if ratio is not None else None,
                "status": "unusual-receipts-review" if is_outlier else "within-demo-rule",
                "rule": "At least 4x baseline and at least INR 500 higher (demo rule)",
            }
        )
    return {
        "nodes": nodes,
        "edges": edges,
        "paths": paths,
        "candidates": candidates,
        "merchant_alerts": merchant_alerts,
        "excluded_p2m_count": int(frame["is_p2m"].astype(bool).sum()) if not frame.empty else 0,
        "transaction_count": int(len(frame)),
        "notice": (
            "Synthetic paths are candidate sequences only. Cash is fungible; co-occurrence "
            "does not establish that observed cash funded a later deposit or transfer. "
            "Receipt variance is not evidence of crime. No identity or legal conclusion is inferred."
        ),
    }


def _compute_state_trace(records: list[dict], merchant_obs: list[dict]) -> dict:
    if not records:
        return {
            "nodes": [],
            "edges": [],
            "paths": [],
            "candidates": [],
            "merchant_alerts": [],
            "excluded_p2m_count": 0,
            "transaction_count": 0,
            "notice": "All synthetic transactions and paths have been reset to zero.",
        }
    df = pd.DataFrame(records)
    for col in ["sender", "receiver", "amount", "channel", "is_p2m", "event_type", "reference_id"]:
        if col not in df.columns:
            df[col] = False if col == "is_p2m" else "transfer" if col == "event_type" else None
    return _execute_graph_trace(df, merchant_obs)


DEFAULT_TRANSACTIONS = [
    {"sender": "STUDENT-014", "receiver": "BAKERY-QR-02", "amount": 35, "channel": "upi", "is_p2m": True, "reference_id": "UPI-TXN-001"},
    {"sender": "BAKERY-QR-02", "receiver": "FAKE-ACC-7A", "amount": 3400, "channel": "merchant-settlement", "is_p2m": False, "reference_id": "STTL-TXN-002"},
    {"sender": "STUDENT-028", "receiver": "FAKE-ACC-7A", "amount": 950, "channel": "upi", "is_p2m": False, "reference_id": "UPI-TXN-003"},
    {"sender": "STUDENT-031", "receiver": "FAKE-ACC-7A", "amount": 1250, "channel": "upi", "is_p2m": False, "reference_id": "UPI-TXN-004"},
    {"sender": "FAKE-ACC-7A", "receiver": "CASHOUT-HUB", "amount": 5600, "channel": "transfer", "is_p2m": False, "reference_id": "TRF-TXN-005"},
    {"sender": "STUDENT-044", "receiver": "FAKE-ACC-8B", "amount": 600, "channel": "upi", "is_p2m": False, "reference_id": "UPI-TXN-006"},
    {"sender": "FAKE-ACC-8B", "receiver": "CASHOUT-HUB", "amount": 600, "channel": "transfer", "is_p2m": False, "reference_id": "TRF-TXN-007"},
]

DEFAULT_MERCHANT_OBS = [
    {
        "merchant_alias": "FORT-ROAD-BAKERY",
        "category": "Bakery & Sweets",
        "usual_daily_receipts": 200,
        "observed_daily_receipts": 900,
    }
]

# ==============================================================================
# Central Shared State for Cross-Device Synchronization
# ==============================================================================
SHARED_STATE = {
    "transactions": list(DEFAULT_TRANSACTIONS),
    "merchant_observations": list(DEFAULT_MERCHANT_OBS),
    "trace": _compute_state_trace(DEFAULT_TRANSACTIONS, DEFAULT_MERCHANT_OBS),
    "is_reset": False,
    "version": 1,
    "last_updated": time.time(),
}


# ==============================================================================
# WebSocket Real-Time Connection Manager
# ==============================================================================
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead_connections = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
        for dead in dead_connections:
            self.disconnect(dead)


manager = ConnectionManager()


# ==============================================================================
# Cross-Device Sync Endpoints
# ==============================================================================
@app.get("/api/sync/state")
async def get_sync_state() -> dict:
    return {
        "transactions": SHARED_STATE["transactions"],
        "trace": SHARED_STATE["trace"],
        "is_reset": SHARED_STATE["is_reset"],
        "version": SHARED_STATE["version"],
        "connected_devices": len(manager.active_connections),
        "last_updated": SHARED_STATE["last_updated"],
    }


@app.post("/api/sync/transactions")
async def add_sync_transactions(req: SyncTxRequest) -> dict:
    new_dicts = [item.model_dump() for item in req.transactions]
    if not new_dicts:
        return {"status": "no_op", "version": SHARED_STATE["version"]}

    if SHARED_STATE["is_reset"]:
        SHARED_STATE["transactions"] = []
        SHARED_STATE["is_reset"] = False

    # Deduplicate by reference_id
    existing_refs = {t.get("reference_id") for t in SHARED_STATE["transactions"] if t.get("reference_id")}
    filtered = [t for t in new_dicts if not (t.get("reference_id") and t.get("reference_id") in existing_refs)]
    if not filtered:
        filtered = new_dicts

    SHARED_STATE["transactions"].extend(filtered)
    if len(SHARED_STATE["transactions"]) > 300:
        SHARED_STATE["transactions"] = SHARED_STATE["transactions"][-300:]

    SHARED_STATE["trace"] = _compute_state_trace(
        SHARED_STATE["transactions"], SHARED_STATE["merchant_observations"]
    )
    SHARED_STATE["version"] += 1
    SHARED_STATE["last_updated"] = time.time()

    await manager.broadcast({
        "type": "TX_UPDATE",
        "transactions": SHARED_STATE["transactions"],
        "trace": SHARED_STATE["trace"],
        "version": SHARED_STATE["version"],
        "connected_devices": len(manager.active_connections),
        "new_transactions": filtered,
        "source": req.source,
    })
    return {
        "status": "synced",
        "version": SHARED_STATE["version"],
        "connected_devices": len(manager.active_connections),
        "count": len(SHARED_STATE["transactions"]),
    }


@app.post("/api/sync/reset")
async def reset_sync_state() -> dict:
    SHARED_STATE["transactions"] = []
    SHARED_STATE["is_reset"] = True
    SHARED_STATE["trace"] = _compute_state_trace([], SHARED_STATE["merchant_observations"])
    SHARED_STATE["version"] += 1
    SHARED_STATE["last_updated"] = time.time()

    await manager.broadcast({
        "type": "RESET",
        "version": SHARED_STATE["version"],
        "connected_devices": len(manager.active_connections),
    })
    return {"status": "reset", "version": SHARED_STATE["version"]}


@app.post("/api/sync/load-sample")
async def load_sample_sync(req: SyncSampleRequest) -> dict:
    s_key = req.scenario
    if s_key == "candy":
        records = [
            {"sender": "STUDENT-014", "receiver": "BAKERY-QR-02", "amount": 35, "channel": "upi", "is_p2m": True, "reference_id": "DEMO-CANDY-01"},
            {"sender": "BAKERY-QR-02", "receiver": "FAKE-ACC-7A", "amount": 3400, "channel": "merchant-settlement", "is_p2m": False, "reference_id": "DEMO-CANDY-02"},
            {"sender": "STUDENT-028", "receiver": "FAKE-ACC-7A", "amount": 950, "channel": "upi", "is_p2m": False, "reference_id": "DEMO-CANDY-03"},
            {"sender": "FAKE-ACC-7A", "receiver": "CASHOUT-HUB", "amount": 4350, "channel": "transfer", "is_p2m": False, "reference_id": "DEMO-CANDY-04"},
        ]
        obs = DEFAULT_MERCHANT_OBS
    elif s_key == "direct":
        records = [
            {"sender": "STUDENT-021", "receiver": "FAKE-ACC-4C", "amount": 700, "channel": "upi", "is_p2m": False, "reference_id": "DEMO-DIR-01"},
            {"sender": "STUDENT-034", "receiver": "FAKE-ACC-4C", "amount": 850, "channel": "upi", "is_p2m": False, "reference_id": "DEMO-DIR-02"},
            {"sender": "STUDENT-055", "receiver": "FAKE-ACC-4C", "amount": 1100, "channel": "upi", "is_p2m": False, "reference_id": "DEMO-DIR-03"},
            {"sender": "FAKE-ACC-4C", "receiver": "CASHOUT-HUB", "amount": 2650, "channel": "transfer", "is_p2m": False, "reference_id": "DEMO-DIR-04"},
        ]
        obs = DEFAULT_MERCHANT_OBS
    elif s_key == "cashDeposit":
        records = [
            {"sender": "BAKERY-VAULT-01", "receiver": "BANK-SETTLEMENT", "amount": 1850, "channel": "cash-deposit", "is_p2m": False, "reference_id": "DEMO-CASH-01"},
            {"sender": "BANK-SETTLEMENT", "receiver": "FAKE-ACC-7A", "amount": 1800, "channel": "settlement", "is_p2m": False, "reference_id": "DEMO-CASH-02"},
            {"sender": "FAKE-ACC-7A", "receiver": "CASHOUT-HUB", "amount": 1750, "channel": "transfer", "is_p2m": False, "reference_id": "DEMO-CASH-03"},
        ]
        obs = [{"merchant_alias": "BAKERY-VAULT-01", "category": "Bakery", "usual_daily_receipts": 200, "observed_daily_receipts": 1850}]
    else:
        records = list(DEFAULT_TRANSACTIONS)
        obs = DEFAULT_MERCHANT_OBS

    SHARED_STATE["transactions"] = records
    SHARED_STATE["merchant_observations"] = obs
    SHARED_STATE["is_reset"] = False
    SHARED_STATE["trace"] = _compute_state_trace(records, obs)
    SHARED_STATE["version"] += 1
    SHARED_STATE["last_updated"] = time.time()

    await manager.broadcast({
        "type": "SAMPLE_LOADED",
        "transactions": SHARED_STATE["transactions"],
        "trace": SHARED_STATE["trace"],
        "scenario": s_key,
        "version": SHARED_STATE["version"],
        "connected_devices": len(manager.active_connections),
    })
    return {"status": "sample_loaded", "version": SHARED_STATE["version"]}


@app.websocket("/ws/sync")
async def websocket_sync(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Immediate state synchronization upon connecting
        await websocket.send_json({
            "type": "INIT_STATE",
            "transactions": SHARED_STATE["transactions"],
            "trace": SHARED_STATE["trace"],
            "is_reset": SHARED_STATE["is_reset"],
            "version": SHARED_STATE["version"],
            "connected_devices": len(manager.active_connections),
        })
        # Broadcast new device connected count to all other screens
        await manager.broadcast({
            "type": "DEVICE_COUNT",
            "connected_devices": len(manager.active_connections),
        })

        while True:
            data = await websocket.receive_json()
            m_type = data.get("type")
            if m_type == "ADD_TX":
                txs = data.get("transactions", [])
                source = data.get("source", "mobile")
                if txs:
                    if SHARED_STATE["is_reset"]:
                        SHARED_STATE["transactions"] = []
                        SHARED_STATE["is_reset"] = False
                    SHARED_STATE["transactions"].extend(txs)
                    SHARED_STATE["trace"] = _compute_state_trace(
                        SHARED_STATE["transactions"], SHARED_STATE["merchant_observations"]
                    )
                    SHARED_STATE["version"] += 1
                    SHARED_STATE["last_updated"] = time.time()
                    await manager.broadcast({
                        "type": "TX_UPDATE",
                        "transactions": SHARED_STATE["transactions"],
                        "trace": SHARED_STATE["trace"],
                        "version": SHARED_STATE["version"],
                        "connected_devices": len(manager.active_connections),
                        "new_transactions": txs,
                        "source": source,
                    })
            elif m_type == "RESET":
                SHARED_STATE["transactions"] = []
                SHARED_STATE["is_reset"] = True
                SHARED_STATE["trace"] = _compute_state_trace([], SHARED_STATE["merchant_observations"])
                SHARED_STATE["version"] += 1
                SHARED_STATE["last_updated"] = time.time()
                await manager.broadcast({
                    "type": "RESET",
                    "version": SHARED_STATE["version"],
                    "connected_devices": len(manager.active_connections),
                })
            elif m_type == "PING":
                await websocket.send_json({"type": "PONG"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast({
            "type": "DEVICE_COUNT",
            "connected_devices": len(manager.active_connections),
        })
    except Exception:
        manager.disconnect(websocket)


# ==============================================================================
# Existing Core Endpoints (Backward Compatible)
# ==============================================================================
@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "mode": "synthetic-demo", "connected_devices": str(len(manager.active_connections))}


@app.post("/api/reset")
async def reset_data() -> dict:
    return await reset_sync_state()


def _read_transactions(request: TraceRequest) -> pd.DataFrame:
    if request.csv_data is not None:
        try:
            frame = pd.read_csv(io.StringIO(request.csv_data), dtype=str)
        except (pd.errors.ParserError, UnicodeDecodeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail="Invalid CSV input.") from exc
        required = {"sender", "receiver", "amount"}
        if not required.issubset(frame.columns):
            raise HTTPException(
                status_code=422,
                detail="CSV must include sender, receiver, and amount columns.",
            )
        frame["amount"] = pd.to_numeric(frame["amount"], errors="coerce")
        frame["is_p2m"] = (
            frame["is_p2m"].fillna("").str.lower().isin(["true", "1", "yes"])
            if "is_p2m" in frame
            else False
        )
        frame["channel"] = frame["channel"] if "channel" in frame else "unknown"
        frame["event_type"] = frame["event_type"].fillna("transfer") if "event_type" in frame else "transfer"
        frame["reference_id"] = (
            frame["reference_id"].where(frame["reference_id"].notna(), None)
            if "reference_id" in frame
            else None
        )
    else:
        frame = pd.DataFrame([item.model_dump() for item in request.transactions])
        if frame.empty:
            return pd.DataFrame(
                columns=["sender", "receiver", "amount", "channel", "is_p2m", "event_type", "reference_id"]
            )
    frame = frame.dropna(subset=["sender", "receiver", "amount"])
    frame = frame[(frame["sender"] != "") & (frame["receiver"] != "")]
    frame = frame[frame["amount"] >= 0]
    return frame


@app.post("/api/trace-mule")
async def trace_mule(request: TraceRequest) -> dict:
    frame = _read_transactions(request)
    return _execute_graph_trace(frame, request.merchant_observations)


@app.post("/api/generate-remand-memo")
async def generate_remand_memo(request: MemoRequest) -> StreamingResponse:
    buffer = io.BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=48,
        leftMargin=48,
        topMargin=48,
        bottomMargin=48,
        title="TOOFAN Shield Draft Evidence Summary",
    )
    styles = getSampleStyleSheet()
    story = [
        Paragraph("DRAFT TRAINING ARTIFACT — NOT COURT-READY", styles["Title"]),
        Spacer(1, 10),
        Paragraph(
            "This generated summary is not a legal document, does not certify statutory "
            "compliance, and must not be used as a substitute for approved forms, lawful "
            "procedure, independent verification, or review by qualified counsel.",
            styles["BodyText"],
        ),
        Spacer(1, 16),
    ]
    evidence = request.evidence
    location = (
        f"{evidence.coordinates.latitude:.6f}, {evidence.coordinates.longitude:.6f}"
        if evidence.coordinates
        else "Not provided"
    )
    rows = [
        ["Field", "Recorded value"],
        ["Demo case label", request.case_label],
        ["Officer label", evidence.officer_id],
        ["Client-supplied capture timestamp", evidence.captured_at],
        ["Client-supplied coordinates", location],
        ["SHA-256 digest (client-computed)", evidence.sha256.lower()],
        [
            "Checklist (client-reported)",
            "; ".join(
                f"{key}: {'checked' if value else 'not checked'}"
                for key, value in evidence.checklist.items()
            )
            or "No checklist items supplied",
        ],
    ]
    table = Table(rows, colWidths=[150, 340], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#153f42")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#ccd8d5")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f6f4")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.extend(
        [
            table,
            Spacer(1, 16),
            Paragraph(
                "Integrity limitation: a matching digest can help identify whether the "
                "hashed bytes changed after hashing. It does not independently establish "
                "authenticity, source, time, location, lawful seizure, or chain of custody.",
                styles["BodyText"],
            ),
            Spacer(1, 8),
            Paragraph(
                "All fields and generated content require verification. This local demo "
                "does not retain an audit trail or validate statutory procedure.",
                styles["BodyText"],
            ),
        ]
    )
    document.build(story)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="toofan-draft-training-artifact.pdf"'},
    )


# ==============================================================================
# Single-Service SPA Static Serving (Production on Render & Local fallback)
# ==============================================================================
DIST_DIR = (Path(__file__).resolve().parent.parent.parent / "frontend" / "dist").resolve()
if not DIST_DIR.exists():
    DIST_DIR = Path("frontend/dist").resolve()

if DIST_DIR.exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("ws/"):
            raise HTTPException(status_code=404, detail="Route not found")
        target_file = DIST_DIR / full_path
        if target_file.is_file():
            return FileResponse(target_file)
        index_file = DIST_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Frontend index.html not found")
