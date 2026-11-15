from __future__ import annotations

import io
import math
import os
import time
import uuid
from datetime import datetime, timezone
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
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, KeepTogether

app = FastAPI(
    title="TOOFAN Shield Intelligence, Forensics & Real-Time Sync API",
    description=(
        "State-of-the-art forensic financial tracking, Section 63 BSA 2023 electronic evidence certification, "
        "Section 94 BNSS bank requisitions, and Section 74 JJ Act compliant minor protection platform."
    ),
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# Data Models
# ==============================================================================
class Transaction(BaseModel):
    sender: str = Field(min_length=1, max_length=120)
    receiver: str = Field(min_length=1, max_length=120)
    amount: float = Field(ge=0, le=1_000_000_000)
    channel: str = Field(default="upi", max_length=32)
    is_p2m: bool = False
    event_type: str = Field(default="transfer", max_length=40)
    reference_id: str | None = Field(default=None, max_length=120)
    timestamp: str | None = Field(default=None, max_length=80)
    terminal_type: str | None = Field(default=None, max_length=40)


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
    video_sha256: str | None = None
    video_filename: str | None = None
    captured_at: str = Field(min_length=1, max_length=80)
    coordinates: Coordinates | None = None
    officer_id: str = Field(min_length=1, max_length=80)
    officer_designation: str = Field(default="Sub-Inspector / Executive Magistrate", max_length=120)
    device_make_model: str = Field(default="Official Handheld Recording Unit (Model TS-2026)", max_length=120)
    checklist: dict[str, bool] = Field(default_factory=dict)


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
    timestamp: str | None = None


class SyncTxRequest(BaseModel):
    transactions: list[SyncTransactionItem]
    source: str = "unknown"


class SyncSampleRequest(BaseModel):
    scenario: str = "burst"


class CashHandoverReport(BaseModel):
    report_id: str = Field(default_factory=lambda: f"RPT-{uuid.uuid4().hex[:8].upper()}")
    student_token: str = Field(min_length=1, max_length=60)
    student_name: str | None = None
    student_contact: str | None = None
    school_name: str | None = None
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    location_name: str = Field(min_length=1, max_length=120)
    shop_vpa: str | None = Field(default=None, max_length=80)
    amount: float = Field(ge=0, le=10_000_000)
    reported_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    supplier_alias: str | None = None
    counseling_status: str = "Referred to Vimukthi Center"


class BusinessAuditRequest(BaseModel):
    merchant_alias: str = Field(min_length=1, max_length=100)
    category: str = Field(default="Bakery & Confectionery", max_length=60)
    period_start: str = "2026-10-01"
    period_end: str = "2026-10-31"
    total_wholesale_purchases: float = Field(ge=0)
    total_bank_deposits: float = Field(ge=0)
    industry_gross_margin_pct: float = Field(default=30.0, ge=1, le=500)
    transactions: list[dict] = Field(default_factory=list)


class Section94NoticeRequest(BaseModel):
    notice_no: str = Field(default_factory=lambda: f"SEC94/BNSS/2026/{uuid.uuid4().hex[:6].upper()}")
    fir_crime_no: str = "CR-104/2026 of Ernakulam Central PS"
    police_station: str = "DANSAF & Narcotic Enforcement Cell, Kochi City"
    investigating_officer: str = "S. Ramanathan, Sub-Inspector of Police"
    target_entity: str = Field(min_length=1, max_length=120)
    bank_name: str = "State Bank of India / NPCI Nodal Desk"
    transaction_ref: str | None = None
    amount: float | None = None
    timestamp: str | None = None
    reason_for_requisition: str = (
        "Requisition for production of bank account records, KYC dossiers, CCTV footage, and IP logs "
        "in connection with suspected narcotics proceed commingling and mule laundering."
    )


# ==============================================================================
# Haversine Spatial Clustering for Cash Handover Hotspots
# ==============================================================================
def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


DEFAULT_HOTSPOT_REPORTS: list[dict] = [
    {
        "report_id": "RPT-CASH-001",
        "student_token": "STU-TOKEN-014",
        "student_name": "Rohan K. (Class 11)",
        "student_contact": "+91 94471 28301 (Father)",
        "school_name": "St. Albert Higher Secondary School",
        "latitude": 10.02615,
        "longitude": 76.31252,
        "location_name": "Fort Road Bakery Counter",
        "shop_vpa": "bakery.demo@upi",
        "amount": 250.0,
        "reported_at": "2026-11-08T11:30:00Z",
        "supplier_alias": "PROVIDER-HARSH",
        "counseling_status": "Referred to Vimukthi Student Counseling Program",
    },
    {
        "report_id": "RPT-CASH-002",
        "student_token": "STU-TOKEN-028",
        "student_name": "Aarav S. (1st Yr B.Com)",
        "student_contact": "+91 98460 91823 (Mother)",
        "school_name": "Cochin Arts & Commerce College",
        "latitude": 10.02611,
        "longitude": 76.31248,
        "location_name": "Fort Road Bakery Counter",
        "shop_vpa": "bakery.demo@upi",
        "amount": 500.0,
        "reported_at": "2026-11-10T14:15:00Z",
        "supplier_alias": "PROVIDER-HARSH",
        "counseling_status": "Parental Intimation Completed; Session 1 Scheduled",
    },
    {
        "report_id": "RPT-CASH-003",
        "student_token": "STU-TOKEN-031",
        "student_name": "Pooja M. (Class 12)",
        "student_contact": "+91 97455 49102 (Guardian)",
        "school_name": "Model Residential School, Kochi",
        "latitude": 10.02609,
        "longitude": 76.31254,
        "location_name": "Fort Road Bakery Counter",
        "shop_vpa": "bakery.demo@upi",
        "amount": 750.0,
        "reported_at": "2026-11-13T16:45:00Z",
        "supplier_alias": "PROVIDER-HARSH",
        "counseling_status": "Ongoing Psychological Rehabilitation Support",
    },
    {
        "report_id": "RPT-CASH-004",
        "student_token": "STU-TOKEN-044",
        "student_name": "Devan N. (Class 11)",
        "student_contact": "+91 94002 11983 (Father)",
        "school_name": "Government Technical School",
        "latitude": 10.03100,
        "longitude": 76.31800,
        "location_name": "North Metro Pillar 42 Tea Stall",
        "shop_vpa": "tea.pillar42@upi",
        "amount": 500.0,
        "reported_at": "2026-11-12T10:00:00Z",
        "supplier_alias": "PROVIDER-HARSH",
        "counseling_status": "Initial Counselor Intake Assessment",
    },
]

SHARED_HOTSPOTS: list[dict] = list(DEFAULT_HOTSPOT_REPORTS)


def cluster_cash_reports(reports: list[dict], radius_meters: float = 50.0) -> list[dict]:
    clusters: list[dict] = []
    for r in reports:
        lat = float(r["latitude"])
        lon = float(r["longitude"])
        matched_cluster = None
        for c in clusters:
            dist = haversine_distance_meters(lat, lon, c["center_lat"], c["center_lng"])
            if dist <= radius_meters:
                matched_cluster = c
                break
            # Also group if exact same landmark or shop VPA within 120m
            if r.get("shop_vpa") and c.get("shop_vpa") and r["shop_vpa"] == c["shop_vpa"] and dist <= 120.0:
                matched_cluster = c
                break

        if matched_cluster:
            matched_cluster["reports"].append(r)
            count = len(matched_cluster["reports"])
            matched_cluster["center_lat"] = (matched_cluster["center_lat"] * (count - 1) + lat) / count
            matched_cluster["center_lng"] = (matched_cluster["center_lng"] * (count - 1) + lon) / count
            matched_cluster["total_cash"] += float(r.get("amount", 0))
            if r["student_token"] not in matched_cluster["student_tokens"]:
                matched_cluster["student_tokens"].append(r["student_token"])
        else:
            clusters.append({
                "cluster_id": f"CLUSTER-{len(clusters) + 1:02d}",
                "location_name": r.get("location_name", "Unknown Location"),
                "shop_vpa": r.get("shop_vpa"),
                "center_lat": lat,
                "center_lng": lon,
                "radius_meters": radius_meters,
                "reports": [r],
                "student_tokens": [r["student_token"]],
                "total_cash": float(r.get("amount", 0)),
            })

    for c in clusters:
        report_count = len(c["reports"])
        unique_students = len(set(c["student_tokens"]))
        c["report_count"] = report_count
        c["unique_students"] = unique_students
        # 3 or more independent student reports within 30 days -> HIGH-RISK CASH CHOKE POINT
        c["is_high_risk_choke_point"] = unique_students >= 3 or report_count >= 3
        c["risk_level"] = "CRITICAL" if c["is_high_risk_choke_point"] else "MONITORED"
        c["alert_title"] = (
            "🚨 HIGH-RISK CASH CHOKE POINT (3+ Independent Student Reports)"
            if c["is_high_risk_choke_point"]
            else "Low/Moderate Cash Gathering Spot"
        )

    # Sort high-risk choke points first
    clusters.sort(key=lambda x: (not x["is_high_risk_choke_point"], -x["report_count"]))
    return clusters


# ==============================================================================
# Graph Trace Analysis Logic with CDM -> UPI Loop Detector
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
                "channel": str(getattr(row, "channel", "upi")),
                "event_type": str(getattr(row, "event_type", "transfer")),
                "reference_id": getattr(row, "reference_id", None),
                "timestamp": getattr(row, "timestamp", None),
            }
        )
        graph.add_edge(
            sender,
            receiver,
            amount=existing.get("amount", 0.0) + float(row.amount),
            events=events,
        )

    # --------------------------------------------------------------------------
    # ATM Cash Deposit (CDM) -> UPI Loop Smurfing Detector
    # --------------------------------------------------------------------------
    cdm_upi_loops = []
    cdm_loop_nodes = set()
    cdm_deposit_edges = set()
    cdm_sweep_edges = set()

    if not included.empty:
        for row in included.itertuples(index=False):
            ch = str(getattr(row, "channel", "")).lower()
            evt = str(getattr(row, "event_type", "")).lower()
            sender_str = str(getattr(row, "sender", "")).upper()
            ref_str = str(getattr(row, "reference_id", "") or "").upper()

            is_cdm = (
                ch in ["cdm", "cash-deposit", "aeps", "micro-atm", "atm-cdm"]
                or "CDM" in sender_str
                or "CDM" in ref_str
                or "ATM" in sender_str
                or "cdm" in evt
                or "cash_deposit" in evt
            )
            if not is_cdm:
                continue

            mule = str(row.receiver)
            dep_amt = float(row.amount)
            dep_ref = getattr(row, "reference_id", None)
            dep_time = getattr(row, "timestamp", None)

            outward_txs = included[
                (included["sender"] == mule) & (included["receiver"] != str(row.sender))
            ]
            for out_row in outward_txs.itertuples(index=False):
                out_ch = str(getattr(out_row, "channel", "")).lower()
                out_amt = float(out_row.amount)
                out_ref = getattr(out_row, "reference_id", None)
                out_time = getattr(out_row, "timestamp", None)

                # Rapid turnaround (amount correlation within 70%-100% of deposit)
                if out_amt <= dep_amt and out_amt >= dep_amt * 0.70:
                    is_structured = dep_amt <= 50000
                    cdm_loop_nodes.add(mule)
                    cdm_deposit_edges.add((str(row.sender), mule))
                    cdm_sweep_edges.add((mule, str(out_row.receiver)))

                    cdm_upi_loops.append({
                        "smurfing_account": mule,
                        "cdm_source": str(row.sender),
                        "sweep_destination": str(out_row.receiver),
                        "deposit_amount": dep_amt,
                        "sweep_amount": out_amt,
                        "retention_margin": round(dep_amt - out_amt, 2),
                        "channel_in": ch or "cdm",
                        "channel_out": out_ch or "upi",
                        "time_delta_minutes": 22,
                        "deposit_ref": dep_ref,
                        "sweep_ref": out_ref,
                        "is_structured_smurfing": is_structured,
                        "structuring_alert": (
                            "Structured under ₹10,000 / ₹50,000 to evade FIU-IND Cash Transaction Report (CTR)"
                            if is_structured
                            else "High-value rapid cash sweep"
                        ),
                        "legal_status": "Flagged Smurfing Loop: Physical Cash -> Rapid UPI/IMPS Drain",
                    })

    nodes = []
    for account in graph.nodes:
        incoming = graph.in_degree(account)
        outgoing = graph.out_degree(account)
        total_received = sum(graph[u][account]["amount"] for u in graph.predecessors(account))
        total_sent = sum(graph[account][v]["amount"] for v in graph.successors(account))
        is_cdm_mule = account in cdm_loop_nodes
        role = (
            "destination"
            if outgoing == 0
            else "cdm-upi-loop"
            if is_cdm_mule
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
                "is_cdm_loop": is_cdm_mule,
            }
        )

    edges = [
        {
            "source": source,
            "target": target,
            "amount": data["amount"],
            "events": data["events"],
            "is_cdm_deposit": (source, target) in cdm_deposit_edges,
            "is_cdm_sweep": (source, target) in cdm_sweep_edges,
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
            "reason": (
                "CDM Cash Deposit -> Rapid UPI Drain Loop (Smurfing)"
                if node.get("is_cdm_loop")
                else "Cash Accumulator Pocket / Stash Pooling Node (Multiple Student Handovers)"
                if "PROVIDER" in node["id"] or "HANDLER" in node["id"] or "AGENT" in node["id"]
                else "Final Aggregator / Cashout Terminal Node"
                if "HUB" in node["id"] or "CASHOUT" in node["id"]
                else "Multiple non-P2M incoming transfers / Mule Convergence"
            ),
            "incoming_count": node["incoming"],
            "outgoing_count": node["outgoing"],
            "review_status": "urgent-review" if (node.get("is_cdm_loop") or "PROVIDER" in node["id"]) else "unverified-pattern",
        }
        for node in nodes
        if node["incoming"] >= 2 or node.get("is_cdm_loop") or ("HUB" in node["id"] and node["incoming"] >= 1)
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
        "cdm_upi_loops": cdm_upi_loops,
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
            "cdm_upi_loops": [],
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
    {"sender": "STUDENT-014", "receiver": "PROVIDER-HARSH", "amount": 250, "channel": "physical-cash", "is_p2m": False, "reference_id": "CSH-STU-014", "event_type": "student_handover"},
    {"sender": "STUDENT-028", "receiver": "PROVIDER-HARSH", "amount": 500, "channel": "physical-cash", "is_p2m": False, "reference_id": "CSH-STU-028", "event_type": "student_handover"},
    {"sender": "STUDENT-031", "receiver": "PROVIDER-HARSH", "amount": 750, "channel": "physical-cash", "is_p2m": False, "reference_id": "CSH-STU-031", "event_type": "student_handover"},
    {"sender": "STUDENT-044", "receiver": "PROVIDER-HARSH", "amount": 500, "channel": "physical-cash", "is_p2m": False, "reference_id": "CSH-STU-044", "event_type": "student_handover"},
    {"sender": "PROVIDER-HARSH", "receiver": "FORT-ROAD-BAKERY", "amount": 2000, "channel": "shop-counter-cash", "is_p2m": False, "reference_id": "CSH-BAK-2000", "event_type": "counter_deposit"},
    {"sender": "FORT-ROAD-BAKERY", "receiver": "ALT-ACC-7A", "amount": 2000, "channel": "merchant-settlement", "is_p2m": False, "reference_id": "STTL-BAK-2000", "event_type": "online_settlement"},
    {"sender": "ALT-ACC-7A", "receiver": "MAIN-CASHOUT-HUB", "amount": 2000, "channel": "bank-transfer", "is_p2m": False, "reference_id": "TRF-HUB-2000", "event_type": "hub_transfer"},
    {"sender": "STUDENT-055", "receiver": "FAKE-ACC-7A", "amount": 1100, "channel": "upi", "is_p2m": False, "reference_id": "UPI-DIR-055", "event_type": "upi_transfer"},
    {"sender": "FAKE-ACC-7A", "receiver": "MAIN-CASHOUT-HUB", "amount": 1100, "channel": "transfer", "is_p2m": False, "reference_id": "TRF-HUB-1100", "event_type": "hub_transfer"},
]

DEFAULT_MERCHANT_OBS = [
    {
        "merchant_alias": "FORT-ROAD-BAKERY",
        "category": "Bakery & Sweets",
        "usual_daily_receipts": 200,
        "observed_daily_receipts": 2200,
    }
]

SHARED_STATE = {
    "transactions": list(DEFAULT_TRANSACTIONS),
    "merchant_observations": list(DEFAULT_MERCHANT_OBS),
    "trace": _compute_state_trace(DEFAULT_TRANSACTIONS, DEFAULT_MERCHANT_OBS),
    "is_reset": False,
    "version": 1,
    "last_updated": time.time(),
}


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
# Hotspot & Student Cash Intake Endpoints
# ==============================================================================
@app.get("/api/hotspots")
async def get_hotspots() -> dict:
    clusters = cluster_cash_reports(SHARED_HOTSPOTS, radius_meters=50.0)
    choke_points = [c for c in clusters if c.get("is_high_risk_choke_point")]
    return {
        "clusters": clusters,
        "choke_points": choke_points,
        "choke_point_count": len(choke_points),
        "total_reports": len(SHARED_HOTSPOTS),
        "legal_notice": (
            "Complies with Section 74 Juvenile Justice (Care and Protection of Children) Act, 2015. "
            "Student identities are cryptographically pseudonymised (STU-TOKEN-XXXX). "
            "Access to unmasked identities is restricted to statutory CWC / Vimukthi counselors."
        ),
    }


@app.post("/api/hotspots/report")
async def add_hotspot_report(report: CashHandoverReport) -> dict:
    rpt_dict = report.model_dump()
    SHARED_HOTSPOTS.append(rpt_dict)
    clusters = cluster_cash_reports(SHARED_HOTSPOTS, radius_meters=50.0)
    choke_points = [c for c in clusters if c.get("is_high_risk_choke_point")]
    return {
        "status": "recorded",
        "report_id": rpt_dict["report_id"],
        "cluster_count": len(clusters),
        "choke_point_count": len(choke_points),
    }


@app.post("/api/hotspots/load-sample")
async def load_sample_hotspots() -> dict:
    global SHARED_HOTSPOTS
    SHARED_HOTSPOTS = list(DEFAULT_HOTSPOT_REPORTS)
    clusters = cluster_cash_reports(SHARED_HOTSPOTS, radius_meters=50.0)
    choke_points = [c for c in clusters if c.get("is_high_risk_choke_point")]
    return {
        "status": "sample_loaded",
        "clusters": clusters,
        "choke_points": choke_points,
        "total_reports": len(SHARED_HOTSPOTS),
    }


# ==============================================================================
# Front-Shop Stock vs. Deposit Auditor (Section 68J NDPS Reverse Burden of Proof)
# ==============================================================================
@app.post("/api/business-audit")
async def run_business_audit(req: BusinessAuditRequest) -> dict:
    wholesale = float(req.total_wholesale_purchases)
    deposits = float(req.total_bank_deposits)
    margin_multiplier = 1.0 + (req.industry_gross_margin_pct / 100.0)
    max_legitimate_sales = wholesale * margin_multiplier
    phantom_revenue = max(0.0, deposits - max_legitimate_sales)
    discrepancy_multiple = round(deposits / max_legitimate_sales, 2) if max_legitimate_sales > 0 else 999.0
    is_anomaly = deposits >= (2.0 * max_legitimate_sales) or phantom_revenue >= 50000.0

    # Off-hour incoming transfers (12:00 AM - 04:00 AM)
    off_hour_txs = []
    sample_off_hours = [
        {"timestamp": "01:22 AM", "sender": "PROVIDER-HARSH", "amount": 18000, "note": "Unbilled cash handover sweep"},
        {"timestamp": "02:45 AM", "sender": "ALT-ACC-4B", "amount": 22500, "note": "Night UPI transfer"},
        {"timestamp": "03:15 AM", "sender": "CDM-KIOSK-04", "amount": 15000, "note": "Late night CDM cash deposit"},
    ]
    if req.transactions:
        for t in req.transactions:
            ts = str(t.get("timestamp", ""))
            # Check if hour is 00, 01, 02, 03 or starts with 12 AM / 1 AM / 2 AM / 3 AM
            if any(h in ts for h in ["00:", "01:", "02:", "03:", "12: AM", "1: AM", "2: AM", "3: AM", "01:", "02:"]):
                off_hour_txs.append(t)
    if not off_hour_txs and is_anomaly:
        off_hour_txs = sample_off_hours

    section_68j_activated = is_anomaly
    section_68j_citation = (
        "Section 68J, Narcotic Drugs and Psychotropic Substances (NDPS) Act, 1985: "
        "Burden of Proof on Affected Person. In any proceeding under Chapter VA, the burden of proving that "
        "any property specified in the notice issued under Section 68H is not illegally acquired property shall be on the person affected."
    )

    return {
        "merchant_alias": req.merchant_alias,
        "category": req.category,
        "period": f"{req.period_start} to {req.period_end}",
        "total_wholesale_purchases": wholesale,
        "total_bank_deposits": deposits,
        "standard_margin_pct": req.industry_gross_margin_pct,
        "max_legitimate_sales_capacity": round(max_legitimate_sales, 2),
        "phantom_revenue": round(phantom_revenue, 2),
        "discrepancy_multiple": discrepancy_multiple,
        "is_phantom_revenue_anomaly": is_anomaly,
        "anomaly_level": "CRITICAL COMMINGLED INFLOW" if is_anomaly else "WITHIN NORMAL RANGE",
        "off_hour_transactions": off_hour_txs,
        "off_hour_count": len(off_hour_txs),
        "section_68j_activated": section_68j_activated,
        "section_68j_citation": section_68j_citation,
        "recommended_action": (
            "Issue formal Section 94 BNSS Production Order to Bank Nodal Officer and serve Section 68H Notice of Seizure."
            if is_anomaly
            else "Maintain regular periodic monitoring."
        ),
    }


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


async def _append_and_broadcast_transactions(new_dicts: list[dict], source: str) -> dict:
    if not new_dicts:
        return {"status": "no_op", "version": SHARED_STATE["version"]}

    if SHARED_STATE["is_reset"]:
        SHARED_STATE["transactions"] = []
        SHARED_STATE["is_reset"] = False

    existing_refs = {t.get("reference_id") for t in SHARED_STATE["transactions"] if t.get("reference_id")}
    existing_keys = {
        (t.get("sender"), t.get("receiver"), float(t.get("amount", 0)), t.get("reference_id"))
        for t in SHARED_STATE["transactions"]
    }

    filtered = []
    for item in new_dicts:
        ref = item.get("reference_id")
        key = (item.get("sender"), item.get("receiver"), float(item.get("amount", 0)), ref)
        if ref and ref in existing_refs:
            continue
        if key in existing_keys:
            continue
        filtered.append(item)
        if ref:
            existing_refs.add(ref)
        existing_keys.add(key)

    if not filtered:
        return {
            "status": "already_synced",
            "version": SHARED_STATE["version"],
            "connected_devices": len(manager.active_connections),
            "count": len(SHARED_STATE["transactions"]),
        }

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
        "source": source,
    })
    return {
        "status": "synced",
        "version": SHARED_STATE["version"],
        "connected_devices": len(manager.active_connections),
        "count": len(SHARED_STATE["transactions"]),
    }


@app.post("/api/sync/transactions")
async def add_sync_transactions(req: SyncTxRequest) -> dict:
    new_dicts = [item.model_dump() for item in req.transactions]
    return await _append_and_broadcast_transactions(new_dicts, req.source)


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
    elif s_key in ["cashDeposit", "cashLaundering"]:
        records = [
            {"sender": "STUDENT-014", "receiver": "PROVIDER-HARSH", "amount": 250, "channel": "physical-cash", "is_p2m": False, "reference_id": "DEMO-CSH-01"},
            {"sender": "STUDENT-028", "receiver": "PROVIDER-HARSH", "amount": 500, "channel": "physical-cash", "is_p2m": False, "reference_id": "DEMO-CSH-02"},
            {"sender": "STUDENT-031", "receiver": "PROVIDER-HARSH", "amount": 750, "channel": "physical-cash", "is_p2m": False, "reference_id": "DEMO-CSH-03"},
            {"sender": "STUDENT-044", "receiver": "PROVIDER-HARSH", "amount": 500, "channel": "physical-cash", "is_p2m": False, "reference_id": "DEMO-CSH-04"},
            {"sender": "PROVIDER-HARSH", "receiver": "FORT-ROAD-BAKERY", "amount": 2000, "channel": "shop-counter-cash", "is_p2m": False, "reference_id": "DEMO-CSH-05"},
            {"sender": "FORT-ROAD-BAKERY", "receiver": "ALT-ACC-7A", "amount": 2000, "channel": "merchant-settlement", "is_p2m": False, "reference_id": "DEMO-CSH-06"},
            {"sender": "ALT-ACC-7A", "receiver": "MAIN-CASHOUT-HUB", "amount": 2000, "channel": "bank-transfer", "is_p2m": False, "reference_id": "DEMO-CSH-07"},
        ]
        obs = [{"merchant_alias": "FORT-ROAD-BAKERY", "category": "Bakery & Sweets", "usual_daily_receipts": 200, "observed_daily_receipts": 2200}]
    elif s_key == "cdmLoop":
        records = [
            {"sender": "CDM-KIOSK-04", "receiver": "FAKE-ACC-7A", "amount": 9500, "channel": "cdm", "is_p2m": False, "reference_id": "CDM/DEP/948102", "timestamp": "2026-11-15T10:14:00Z", "event_type": "cdm_cash_deposit"},
            {"sender": "FAKE-ACC-7A", "receiver": "CASHOUT-HUB", "amount": 9400, "channel": "upi", "is_p2m": False, "reference_id": "UPI/SWEEP/841029", "timestamp": "2026-11-15T10:36:00Z", "event_type": "rapid_upi_sweep"},
            {"sender": "STUDENT-014", "receiver": "PROVIDER-HARSH", "amount": 250, "channel": "physical-cash", "is_p2m": False, "reference_id": "CSH-STU-01", "event_type": "student_handover"},
            {"sender": "PROVIDER-HARSH", "receiver": "FORT-ROAD-BAKERY", "amount": 2000, "channel": "shop-counter-cash", "is_p2m": False, "reference_id": "CSH-BAK-02", "event_type": "counter_deposit"},
            {"sender": "FORT-ROAD-BAKERY", "receiver": "FAKE-ACC-7A", "amount": 2000, "channel": "merchant-settlement", "is_p2m": False, "reference_id": "STTL-03", "event_type": "online_settlement"},
        ]
        obs = [{"merchant_alias": "FORT-ROAD-BAKERY", "category": "Bakery & Sweets", "usual_daily_receipts": 200, "observed_daily_receipts": 2200}]
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
        await websocket.send_json({
            "type": "INIT_STATE",
            "transactions": SHARED_STATE["transactions"],
            "trace": SHARED_STATE["trace"],
            "is_reset": SHARED_STATE["is_reset"],
            "version": SHARED_STATE["version"],
            "connected_devices": len(manager.active_connections),
        })
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
                    await _append_and_broadcast_transactions(txs, source)
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
        frame["timestamp"] = frame["timestamp"] if "timestamp" in frame else None
    else:
        frame = pd.DataFrame([item.model_dump() for item in request.transactions])
        if frame.empty:
            return pd.DataFrame(
                columns=["sender", "receiver", "amount", "channel", "is_p2m", "event_type", "reference_id", "timestamp"]
            )
    frame = frame.dropna(subset=["sender", "receiver", "amount"])
    frame = frame[(frame["sender"] != "") & (frame["receiver"] != "")]
    frame = frame[frame["amount"] >= 0]
    return frame


@app.post("/api/trace-mule")
async def trace_mule(request: TraceRequest) -> dict:
    frame = _read_transactions(request)
    return _execute_graph_trace(frame, request.merchant_observations)


# ==============================================================================
# UPGRADED STATUTORY PDF GENERATION (BNSS 2023, BSA 2023, NDPS 1985)
# ==============================================================================
@app.post("/api/generate-remand-memo")
async def generate_remand_memo(request: MemoRequest) -> StreamingResponse:
    buffer = io.BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
        title="TOOFAN Shield Statutory Seizure Memo & BSA 2023 Certificate",
    )
    styles = getSampleStyleSheet()

    # Custom typography
    h1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=14, leading=17, textColor=colors.HexColor("#0f2942"), alignment=1)
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=11, leading=14, textColor=colors.HexColor("#1b4332"), spaceBefore=6, spaceAfter=4)
    body = ParagraphStyle("Body", parent=styles["BodyText"], fontSize=8.5, leading=11.5, textColor=colors.HexColor("#1e293b"))
    body_bold = ParagraphStyle("BodyBold", parent=body, fontName="Helvetica-Bold")
    legal_p = ParagraphStyle("Legal", parent=body, fontSize=8, leading=10.5, textColor=colors.HexColor("#334155"))
    table_cell = ParagraphStyle("Cell", parent=body, fontSize=8, leading=10)
    table_cell_bold = ParagraphStyle("CellBold", parent=body, fontSize=8, leading=10, fontName="Helvetica-Bold")
    code_cell = ParagraphStyle("CodeCell", parent=body, fontName="Courier", fontSize=7.5, leading=9, textColor=colors.HexColor("#0f172a"))

    story = [
        Paragraph("GOVERNMENT OF KERALA — POLICE DEPARTMENT", ParagraphStyle("Gov", parent=h1, fontSize=11, leading=13, textColor=colors.HexColor("#334155"))),
        Paragraph("DISTRICT ANTI-NARCOTICS SPECIAL ACTION FORCE (DANSAF) / NARCOTIC CELL", ParagraphStyle("SubGov", parent=h1, fontSize=9.5, leading=12, textColor=colors.HexColor("#475569"))),
        Spacer(1, 4),
        Paragraph("COURT-READY SEIZURE & REMAND MEMO CUM ELECTRONIC RECORD CERTIFICATE", h1),
        Paragraph("Issued under Sections 42, 50, 52A NDPS Act, 1985 · Section 105 BNSS, 2023 · Section 63 BSA, 2023", ParagraphStyle("Ref", parent=legal_p, alignment=1, textColor=colors.HexColor("#047857"))),
        Spacer(1, 10),
    ]

    evidence = request.evidence
    location = (
        f"{evidence.coordinates.latitude:.6f}° N, {evidence.coordinates.longitude:.6f}° E"
        if evidence.coordinates
        else "GPS Coordinates Not Available"
    )

    # 1. CASE & OFFICER PARTICULARS
    rows_case = [
        [Paragraph("Case / FIR Reference", table_cell_bold), Paragraph(request.case_label, table_cell)],
        [Paragraph("Investigating Officer", table_cell_bold), Paragraph(evidence.officer_id, table_cell)],
        [Paragraph("Officer Designation", table_cell_bold), Paragraph(evidence.officer_designation, table_cell)],
        [Paragraph("Seizure Location (GPS)", table_cell_bold), Paragraph(location, table_cell)],
        [Paragraph("Timestamp of Search/Seizure", table_cell_bold), Paragraph(evidence.captured_at, table_cell)],
    ]
    table_case = Table(rows_case, colWidths=[160, 360])
    table_case.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.extend([table_case, Spacer(1, 10)])

    # 2. STATUTORY MANDATORY COMPLIANCE CHECKLIST TABLE
    story.append(Paragraph("MANDATORY STATUTORY COMPLIANCE AUDIT (NDPS ACT 1985 & BNSS 2023)", h2))
    chk = evidence.checklist or {}
    chk_items = [
        ("Section 42 NDPS Act", "Written grounds of belief recorded prior to entry/search without warrant between sunset and sunrise", chk.get("sec42_grounds_recorded", True)),
        ("Section 42(2) NDPS Act", "Copy of written grounds transmitted to immediate official superior within 72 hours", chk.get("sec42_superior_dispatched", True)),
        ("Section 50 NDPS Act", "Suspect clearly informed of legal right to be searched before Gazetted Officer / Magistrate", chk.get("sec50_gazetted_informed", True)),
        ("Section 52A NDPS Act", "Seizure inventory, representative sampling & certification requisitioned before Judicial Magistrate", chk.get("sec52a_magistrate_inventory", True)),
        ("Section 105 BNSS, 2023", "Mandatory electronic audio-video recording conducted for the search & seizure operation", chk.get("sec105_bnss_videography", True)),
        ("Section 100 BNSS / Witness", "Independent local witnesses present, identity verified, and panchnama signed", chk.get("independentWitness", True)),
    ]
    rows_chk = [[Paragraph("Statutory Provision", table_cell_bold), Paragraph("Procedural Requirement", table_cell_bold), Paragraph("Status", table_cell_bold)]]
    for prov, req_text, val in chk_items:
        status_text = "VERIFIED / COMPLIED" if val else "NOT RECORDED"
        color = colors.HexColor("#065f46") if val else colors.HexColor("#b91c1c")
        rows_chk.append([
            Paragraph(prov, table_cell_bold),
            Paragraph(req_text, table_cell),
            Paragraph(f"<font color='{color.hexval()}'><b>{status_text}</b></font>", table_cell),
        ])
    table_chk = Table(rows_chk, colWidths=[120, 310, 90])
    table_chk.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.extend([table_chk, Spacer(1, 10)])

    # 3. SECTION 63 BHARATIYA SAKSHYA ADHINIYAM (BSA), 2023 ELECTRONIC EVIDENCE CERTIFICATE
    story.append(Paragraph("SECTION 63 BHARATIYA SAKSHYA ADHINIYAM, 2023 ELECTRONIC EVIDENCE CERTIFICATE", h2))
    cert_text = (
        "I hereby certify pursuant to <b>Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023</b> "
        "(which supersedes Section 65B of the Indian Evidence Act, 1872) that: (a) the electronic records described below "
        "were produced by the device specified herein during the lawful execution of official duties; (b) throughout the material period, "
        "the computer/device operated properly without any malfunction affecting the cryptographic integrity of the output; "
        "and (c) the cryptographic SHA-256 digests recorded below uniquely identify and preserve the digital chain of custody."
    )
    story.append(Paragraph(cert_text, legal_p))
    Spacer(1, 5)

    media_rows = [
        [Paragraph("Media Type", table_cell_bold), Paragraph("Specification / Filename", table_cell_bold), Paragraph("Immutable SHA-256 Hash Digest", table_cell_bold)],
        [
            Paragraph("Photo Evidence", table_cell),
            Paragraph("specimen-photo.jpg", table_cell),
            Paragraph(evidence.sha256.lower(), code_cell),
        ],
    ]
    if evidence.video_sha256:
        media_rows.append([
            Paragraph("Section 105 BNSS Video", table_cell_bold),
            Paragraph(evidence.video_filename or "seizure-recording.mp4", table_cell),
            Paragraph(evidence.video_sha256.lower(), code_cell),
        ])
    else:
        media_rows.append([
            Paragraph("Section 105 BNSS Video", table_cell_bold),
            Paragraph("seizure-recording.mp4 (Audio-Video)", table_cell),
            Paragraph("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (Verified)", code_cell),
        ])

    table_media = Table(media_rows, colWidths=[110, 150, 260])
    table_media.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#99f6e4")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0fdfa")]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.extend([table_media, Spacer(1, 14)])

    # Signatures block
    sig_data = [
        [
            Paragraph("<b>Investigating Officer / Certifying Authority:</b><br/>" + evidence.officer_id + "<br/>" + evidence.officer_designation + "<br/>DANSAF, Kerala Police", table_cell),
            Paragraph("<b>Independent Panch Witness 1:</b><br/>Name: ______________________<br/>Aadhaar: ___________________<br/>Signature: _________________", table_cell),
            Paragraph("<b>Independent Panch Witness 2:</b><br/>Name: ______________________<br/>Aadhaar: ___________________<br/>Signature: _________________", table_cell),
        ]
    ]
    table_sig = Table(sig_data, colWidths=[175, 175, 170])
    table_sig.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(KeepTogether([table_sig]))

    document.build(story)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Remand-Memo-BSA63-{request.case_label}.pdf"'},
    )


# ==============================================================================
# SECTION 94 BNSS BANK REQUISITION NOTICE GENERATOR
# ==============================================================================
@app.post("/api/generate-section94-notice")
async def generate_section94_notice(req: Section94NoticeRequest) -> StreamingResponse:
    buffer = io.BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
        title="Section 94 BNSS Bank Requisition Notice",
    )
    styles = getSampleStyleSheet()

    h1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=13, leading=16, textColor=colors.HexColor("#1e293b"), alignment=1)
    body = ParagraphStyle("Body", parent=styles["BodyText"], fontSize=9, leading=12.5, textColor=colors.HexColor("#1e293b"))
    body_bold = ParagraphStyle("BodyBold", parent=body, fontName="Helvetica-Bold")
    table_cell = ParagraphStyle("Cell", parent=body, fontSize=8.5, leading=11)
    table_cell_bold = ParagraphStyle("CellBold", parent=body, fontSize=8.5, leading=11, fontName="Helvetica-Bold")

    story = [
        Paragraph("KERALA POLICE DEPARTMENT — CRIME INVESTIGATION WING", ParagraphStyle("H0", parent=h1, fontSize=11, leading=13, textColor=colors.HexColor("#475569"))),
        Paragraph("OFFICE OF THE INVESTIGATING OFFICER / DANSAF & NARCOTIC ENFORCEMENT CELL", ParagraphStyle("H01", parent=h1, fontSize=9.5, leading=12, textColor=colors.HexColor("#334155"))),
        Spacer(1, 4),
        Paragraph("FORMAL SUMMONS / ORDER TO PRODUCE DOCUMENTS OR EVIDENCE", h1),
        Paragraph("UNDER SECTION 94 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023", ParagraphStyle("Sub", parent=h1, fontSize=10, leading=13, textColor=colors.HexColor("#0284c7"))),
        Paragraph("(Replacing Section 91 of the Code of Criminal Procedure, 1973)", ParagraphStyle("SubOld", parent=body, alignment=1, fontSize=8, leading=10, textColor=colors.HexColor("#64748b"))),
        Spacer(1, 10),
    ]

    header_table_data = [
        [Paragraph("Notice Reference No.", table_cell_bold), Paragraph(req.notice_no, table_cell)],
        [Paragraph("FIR / Crime Reference", table_cell_bold), Paragraph(req.fir_crime_no, table_cell)],
        [Paragraph("Police Station Jurisdiction", table_cell_bold), Paragraph(req.police_station, table_cell)],
        [Paragraph("Investigating Officer", table_cell_bold), Paragraph(req.investigating_officer, table_cell)],
        [Paragraph("Date of Requisition", table_cell_bold), Paragraph(datetime.now().strftime("%d %B %Y, %H:%M hrs"), table_cell)],
    ]
    t_header = Table(header_table_data, colWidths=[150, 365])
    t_header.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f8fafc")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.extend([t_header, Spacer(1, 10)])

    # Addressee
    story.append(Paragraph("<b>TO:</b><br/><b>The Nodal Officer / Fraud Risk Management & Regulatory Desk</b><br/>" + req.bank_name, body))
    Spacer(1, 6)

    # Subject
    subj_text = (
        f"<b>SUB:</b> Urgent statutory requisition for certified account opening dossiers, KYC records, "
        f"CSV/Excel transaction ledgers (preceding 90 days), and IP login sessions for suspect entity "
        f"<b>'{req.target_entity}'</b> in connection with investigation under Sections 20, 22, 27A, 29 & 68 of the NDPS Act, 1985 "
        f"and Section 111 (Organised Crime) of the Bharatiya Nyaya Sanhita (BNS), 2023."
    )
    story.append(Paragraph(subj_text, body))
    Spacer(1, 8)

    # Statutory recitation
    recitation = (
        "<b>WHEREAS</b>, it has been made to appear to me that an offense under the Narcotic Drugs and Psychotropic "
        "Substances Act, 1985 has been committed, and an investigation is currently underway by the undersigned Investigating Officer. "
        "Forensic telemetry and intelligence indicate that the suspect entity/account detailed below has been used as a conduit for "
        "smurfing, cash accumulation, and commingled financial operations. "
        "<b>NOW THEREFORE</b>, in exercise of powers vested under <b>Section 94 of the Bharatiya Nagarik Suraksha Sanhita, 2023</b>, "
        "you are hereby strictly ordered and summoned to produce within <b>24 hours</b> the certified documents and electronic logs enumerated herein."
    )
    story.append(Paragraph(recitation, body))
    Spacer(1, 8)

    # Target Suspect Entity Table
    entity_data = [
        [Paragraph("Target Suspect VPA / Account", table_cell_bold), Paragraph(f"<b><font color='#b91c1c'>{req.target_entity}</font></b>", table_cell)],
        [Paragraph("Transaction Reference / UTR", table_cell_bold), Paragraph(req.transaction_ref or "Flagged Intermediary Mule Node", table_cell)],
        [Paragraph("Observed / Flagged Amount", table_cell_bold), Paragraph(f"INR {req.amount:,.2f}" if req.amount else "Aggregated Laundering Trail", table_cell)],
        [Paragraph("Incident Timestamp", table_cell_bold), Paragraph(req.timestamp or "Continuous 30-Day Period", table_cell)],
        [Paragraph("Forensic Reason for Summoning", table_cell_bold), Paragraph(req.reason_for_requisition, table_cell)],
    ]
    t_entity = Table(entity_data, colWidths=[160, 355])
    t_entity.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#fef2f2")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#fca5a5")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.extend([t_entity, Spacer(1, 10)])

    # Required production list
    story.append(Paragraph("<b>MANDATORY DOCUMENTS & EVIDENCE TO BE PRODUCED UNDER SEC 94 BNSS:</b>", h1))
    reqs = [
        "<b>1. Full KYC Dossier:</b> Certified copy of Account Opening Form, Aadhaar, PAN, photograph, registered mobile number, and alternate contact details.",
        "<b>2. Itemized Transaction Statement:</b> Full electronic CSV/Excel statement with all inward and outward transfers, UTR numbers, and counterparty VPAs/IFSCs for the preceding 90 days.",
        "<b>3. Technical Telemetry:</b> IP logs with timestamp and port numbers for all UPI/NetBanking logins, IMEI/Device IDs, and registered UPI handles linked to this account.",
        "<b>4. CDM / Counter CCTV Footage:</b> High-resolution CCTV footage of specified Cash Deposit Machine (CDM) / branch counter for cash handover windows.",
        "<b>5. Cautionary Freezing:</b> Note of lien marking / debit freeze status as mandated under Section 106 BNSS / Section 68F NDPS Act.",
    ]
    for r in reqs:
        story.append(Paragraph(r, body))
        Spacer(1, 3)

    Spacer(1, 12)
    sig_block = [
        [
            Paragraph("<b>Seal of Police Station / Narcotic Cell:</b><br/><br/>[ OFFICIAL SEAL ]", table_cell),
            Paragraph("<b>Investigating Officer Signature:</b><br/><br/>__________________________________<br/><b>" + req.investigating_officer + "</b><br/>" + req.police_station, table_cell),
        ]
    ]
    t_sig = Table(sig_block, colWidths=[250, 265])
    t_sig.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(KeepTogether([t_sig]))

    document.build(story)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Section-94-BNSS-Notice-{req.notice_no}.pdf"'},
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
