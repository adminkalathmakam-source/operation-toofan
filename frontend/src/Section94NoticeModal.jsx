import { useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Building,
  CheckCircle2,
  Clock,
  Download,
  FileDown,
  FileText,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { sounds } from "./soundEffects";

const API = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8000" : "");

function money(val) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export default function Section94NoticeModal({
  isOpen = false,
  onClose = () => {},
  targetEntity = "bakery.demo@upi",
  entityName = "Fort Road Bakery Counter",
  transactionRef = "CDM/DEP/948102",
  amount = 9500,
  timestamp = null,
  reason = "Suspected rapid CDM cash smurfing, unbilled commingled inflows, or mule forwarding.",
  bankName = "State Bank of India / NPCI Nodal Operations Desk",
}) {
  const [noticeNo, setNoticeNo] = useState(`SEC94/BNSS/2026/${Math.floor(1000 + Math.random() * 9000)}`);
  const [firNo, setFirNo] = useState("CR-104/2026 of Ernakulam Central PS");
  const [policeStation, setPoliceStation] = useState("DANSAF & Narcotic Enforcement Cell, Kochi City");
  const [officer, setOfficer] = useState("S. Ramanathan, Sub-Inspector of Police");
  const [targetBank, setTargetBank] = useState(bankName);
  const [targetAccount, setTargetAccount] = useState(targetEntity);
  const [txRef, setTxRef] = useState(transactionRef);
  const [txAmount, setTxAmount] = useState(amount);
  const [customReason, setCustomReason] = useState(reason);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  if (!isOpen) return null;

  async function handleDownloadNotice() {
    setBusy(true);
    sounds.playClick();
    setStatusMsg("Generating official Section 94 BNSS Police Requisition PDF...");

    try {
      const payload = {
        notice_no: noticeNo,
        fir_crime_no: firNo,
        police_station: policeStation,
        investigating_officer: officer,
        target_entity: targetAccount,
        bank_name: targetBank,
        transaction_ref: txRef,
        amount: Number(txAmount) || null,
        timestamp: timestamp || new Date().toISOString(),
        reason_for_requisition: customReason,
      };

      const res = await fetch(`${API}/api/generate-section94-notice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Section-94-BNSS-Notice-${targetAccount.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      sounds.playPaySuccess();
      setStatusMsg("Section 94 BNSS Statutory Notice downloaded successfully!");
      setTimeout(() => {
        setStatusMsg("");
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      setStatusMsg(`Failed to generate notice: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="police-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "680px", width: "95%" }}
      >
        {/* MODAL HEADER */}
        <div className="police-modal-header" style={{ background: "linear-gradient(135deg, #091e3a 0%, #173255 100%)" }}>
          <div className="police-header-badge">
            <Scale size={20} className="text-sky" />
          </div>
          <div className="police-header-text">
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", background: "#0284c7", color: "#fff", padding: "2px 8px", borderRadius: "4px" }}>
                SECTION 94 BNSS, 2023
              </span>
              <small style={{ color: "#94a3b8" }}>Replaced Sec 91 CrPC</small>
            </div>
            <h3 style={{ margin: "4px 0 0", color: "#fff", fontSize: "17px" }}>Formal Police Bank Requisition Notice</h3>
          </div>
          <button className="btn-close-police-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="police-modal-body" style={{ padding: "18px 22px", maxHeight: "78vh", overflowY: "auto" }}>
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <ShieldAlert size={18} className="text-sky" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div style={{ fontSize: "12px", color: "#0369a1", lineHeight: 1.45 }}>
                <b>Statutory Legal Power:</b> Officers cannot access live banking logs without legal process.
                <b> Section 94 of Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023</b> empowers the Investigating Officer
                to compel Bank Nodal Officers / NPCI to produce certified KYC, IP logs, and 90-day CSV ledgers within 24 hours.
              </div>
            </div>
          </div>

          {/* FORM FIELDS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "4px" }}>
                Target Suspect VPA / Account
              </label>
              <input
                type="text"
                value={targetAccount}
                onChange={(e) => setTargetAccount(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "700", color: "#b91c1c" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "4px" }}>
                Bank / Regulatory Desk
              </label>
              <input
                type="text"
                value={targetBank}
                onChange={(e) => setTargetBank(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "4px" }}>
                FIR / Crime Number
              </label>
              <input
                type="text"
                value={firNo}
                onChange={(e) => setFirNo(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "4px" }}>
                Investigating Officer & Rank
              </label>
              <input
                type="text"
                value={officer}
                onChange={(e) => setOfficer(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "4px" }}>
                Transaction Ref / UTR
              </label>
              <input
                type="text"
                value={txRef || ""}
                onChange={(e) => setTxRef(e.target.value)}
                placeholder="e.g. CDM/DEP/948102 or UPI-001"
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "4px" }}>
                Flagged Amount (₹)
              </label>
              <input
                type="number"
                value={txAmount || ""}
                onChange={(e) => setTxAmount(e.target.value)}
                placeholder="9500"
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", fontWeight: "600" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "4px" }}>
              Forensic Grounds for Requisition
            </label>
            <textarea
              rows={2}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", resize: "none" }}
            />
          </div>

          {/* PRODUCTION REQUIREMENTS PREVIEW */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "6px" }}>
              MANDATORY PRODUCTION DIRECTIVES ORDERED IN THIS NOTICE:
            </span>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "11.5px", color: "#475569", lineHeight: 1.45 }}>
              <li>Complete KYC Dossier (Aadhaar, PAN, Customer ID, Account Opening Form, Photo).</li>
              <li>Itemized 90-day CSV Bank Statement with counterparty accounts and UTRs.</li>
              <li>UPI / NetBanking login IP logs with timestamps and device identifiers.</li>
              <li>CCTV Footage of Cash Deposit Machine (CDM) / branch counter for cash windows.</li>
              <li>Cautionary lien / freeze status under Section 106 BNSS / Section 68F NDPS Act.</li>
            </ul>
          </div>

          {statusMsg && (
            <div style={{ padding: "8px 12px", borderRadius: "6px", background: "#f0fdf4", color: "#166534", fontSize: "12px", fontWeight: "600", marginBottom: "12px", textAlign: "center" }}>
              {statusMsg}
            </div>
          )}

          {/* ACTION BUTTON */}
          <button
            type="button"
            className="btn-police-verify-action"
            onClick={handleDownloadNotice}
            disabled={busy}
            style={{ width: "100%", padding: "11px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}
          >
            {busy ? <Loader2 size={16} className="spin-fast" /> : <FileDown size={17} />}
            <span>{busy ? "Generating Court-Ready Notice..." : "Download Section 94 BNSS Police Requisition PDF"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
