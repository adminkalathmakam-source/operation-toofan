from __future__ import annotations

import io
import os
from pathlib import Path
import networkx as nx
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

app = FastAPI(
    title="TOOFAN Shield Demo API",
    description=(
        "Synthetic-data training prototype. Outputs are heuristic and informational, "
        "not legal conclusions or operational law-enforcement records."
    ),
    version="0.1.0",
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


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "mode": "synthetic-demo"}


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
    graph = nx.DiGraph()
    included = frame[~frame["is_p2m"].astype(bool)]
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
        role = (
            "destination" if outgoing == 0
            else "possible-convergence" if incoming >= 2
            else "account"
        )
        nodes.append(
            {
                "id": account,
                "incoming": incoming,
                "outgoing": outgoing,
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
    for observation in request.merchant_observations:
        baseline = observation.usual_daily_receipts
        observed = observation.observed_daily_receipts
        ratio = observed / baseline if baseline > 0 else None
        is_outlier = (
            observed >= 4 * baseline and observed - baseline >= 500
            if baseline > 0
            else observed >= 500
        )
        merchant_alerts.append(
            {
                "merchant_alias": observation.merchant_alias,
                "category": observation.category,
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
        ["Checklist (client-reported)", "; ".join(
            f"{key}: {'checked' if value else 'not checked'}"
            for key, value in evidence.checklist.items()
        ) or "No checklist items supplied"],
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
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        target_file = DIST_DIR / full_path
        if target_file.is_file():
            return FileResponse(target_file)
        index_file = DIST_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Frontend index.html not found")

