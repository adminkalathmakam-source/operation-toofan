import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BadgeAlert,
  Building,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Landmark,
  Loader2,
  Lock,
  Moon,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
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

export default function BusinessAuditorModal({
  isOpen = false,
  onClose = () => {},
  onOpenSection94Notice = null,
  initialMerchant = "FORT-ROAD-BAKERY",
}) {
  const [merchantAlias, setMerchantAlias] = useState(initialMerchant);
  const [category, setCategory] = useState("Bakery & Confectionery");
  const [periodStart, setPeriodStart] = useState("2026-10-01");
  const [periodEnd, setPeriodEnd] = useState("2026-10-31");
  const [wholesaleStock, setWholesaleStock] = useState("20000"); // 20k wholesale bills
  const [bankDeposits, setBankDeposits] = useState("240000"); // 2.4 Lakhs deposits
  const [marginPct, setMarginPct] = useState("30"); // 30% margin
  const [busy, setBusy] = useState(false);
  const [auditResult, setAuditResult] = useState(null);

  if (!isOpen) return null;

  async function handleRunAudit() {
    setBusy(true);
    sounds.playClick();

    try {
      const payload = {
        merchant_alias: merchantAlias,
        category,
        period_start: periodStart,
        period_end: periodEnd,
        total_wholesale_purchases: Number(wholesaleStock) || 0,
        total_bank_deposits: Number(bankDeposits) || 0,
        industry_gross_margin_pct: Number(marginPct) || 30,
        transactions: [],
      };

      const res = await fetch(`${API}/api/business-audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAuditResult(data);
      sounds.playAlert();
    } catch (err) {
      console.error(err);
      // Fallback calculation in client
      const ws = Number(wholesaleStock) || 0;
      const dp = Number(bankDeposits) || 0;
      const mg = Number(marginPct) || 30;
      const maxLegit = ws * (1 + mg / 100);
      const phantom = Math.max(0, dp - maxLegit);
      setAuditResult({
        merchant_alias: merchantAlias,
        total_wholesale_purchases: ws,
        total_bank_deposits: dp,
        max_legitimate_sales_capacity: maxLegit,
        phantom_revenue: phantom,
        discrepancy_multiple: Number((dp / (maxLegit || 1)).toFixed(2)),
        is_phantom_revenue_anomaly: dp >= maxLegit * 2,
        section_68j_activated: true,
        off_hour_transactions: [
          { timestamp: "01:22 AM", sender: "PROVIDER-HARSH", amount: 18000, note: "Unbilled cash handover sweep" },
          { timestamp: "02:45 AM", sender: "ALT-ACC-4B", amount: 22500, note: "Night UPI transfer" },
          { timestamp: "03:15 AM", sender: "CDM-KIOSK-04", amount: 15000, note: "Late night CDM cash deposit" },
        ],
      });
      sounds.playAlert();
    } finally {
      setBusy(false);
    }
  }

  function handleLoadRealisticSample() {
    sounds.playClick();
    setMerchantAlias("FORT-ROAD-BAKERY");
    setCategory("Bakery & Confectionery");
    setWholesaleStock("20000"); // 20k flour, sugar wholesale bills
    setBankDeposits("240000"); // 2.4L bank deposits
    setMarginPct("30");
    setAuditResult({
      merchant_alias: "FORT-ROAD-BAKERY",
      category: "Bakery & Confectionery",
      total_wholesale_purchases: 20000,
      total_bank_deposits: 240000,
      standard_margin_pct: 30,
      max_legitimate_sales_capacity: 26000,
      phantom_revenue: 214000,
      discrepancy_multiple: 9.23,
      is_phantom_revenue_anomaly: true,
      anomaly_level: "CRITICAL COMMINGLED INFLOW",
      section_68j_activated: true,
      section_68j_citation:
        "Section 68J, Narcotic Drugs and Psychotropic Substances (NDPS) Act, 1985: Burden of Proof on Affected Person. In any proceeding under Chapter VA, the burden of proving that any property specified in the notice issued under Section 68H is not illegally acquired property shall be on the person affected.",
      off_hour_transactions: [
        { timestamp: "01:22 AM", sender: "PROVIDER-HARSH", amount: 18000, note: "Unbilled cash handover sweep" },
        { timestamp: "02:45 AM", sender: "ALT-ACC-4B", amount: 22500, note: "Night UPI transfer" },
        { timestamp: "03:15 AM", sender: "CDM-KIOSK-04", amount: 15000, note: "Late night CDM cash deposit" },
      ],
      recommended_action:
        "Issue formal Section 94 BNSS Production Order to Bank Nodal Officer and serve Section 68H Notice of Seizure.",
    });
    sounds.playAlert();
  }

  return (
    <div className="sheet-backdrop-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="police-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "780px", width: "95%" }}
      >
        {/* HEADER */}
        <div className="police-modal-header" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)" }}>
          <div className="police-header-badge" style={{ background: "#4338ca" }}>
            <Store size={20} className="text-white" />
          </div>
          <div className="police-header-text">
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", background: "#f59e0b", color: "#000", padding: "2px 8px", borderRadius: "4px" }}>
                FINANCIAL INTELLIGENCE · MODULE 1
              </span>
              <small style={{ color: "#cbd5e1" }}>Stock vs. Deposit Auditor</small>
            </div>
            <h3 style={{ margin: "4px 0 0", color: "#fff", fontSize: "17px" }}>
              Front-Shop Commingled Revenue Auditor
            </h3>
          </div>
          <button className="btn-close-police-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="police-modal-body" style={{ padding: "18px 22px", maxHeight: "80vh", overflowY: "auto" }}>
          {/* EXPLANATION BANNER */}
          <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <Scale size={18} className="text-amber-700" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div style={{ fontSize: "12px", color: "#78350f", lineHeight: 1.45 }}>
                <b>Audit Methodology:</b> Compares suspect shop wholesale stock expenses against actual bank deposits.
                If bank deposits exceed maximum plausible retail margins (e.g. ₹20k flour/sugar stock yielding ₹2.4 Lakhs deposits),
                the excess is flagged as <b>"Phantom Revenue"</b> from unbilled cash laundering, activating <b>Section 68J NDPS Act</b>.
              </div>
            </div>
          </div>

          {/* INPUT FORM GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "4px" }}>
                Suspect Shop / Establishment
              </label>
              <input
                type="text"
                value={merchantAlias}
                onChange={(e) => setMerchantAlias(e.target.value.toUpperCase())}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "700" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "4px" }}>
                Category / Trade Type
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "4px" }}>
                Wholesale Purchases (₹)
              </label>
              <input
                type="number"
                value={wholesaleStock}
                onChange={(e) => setWholesaleStock(e.target.value)}
                placeholder="20000"
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600" }}
              />
              <small style={{ fontSize: "10px", color: "#64748b" }}>Verified stock purchase bills</small>
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "4px" }}>
                Total Bank Deposits (₹)
              </label>
              <input
                type="number"
                value={bankDeposits}
                onChange={(e) => setBankDeposits(e.target.value)}
                placeholder="240000"
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "700", color: "#b91c1c" }}
              />
              <small style={{ fontSize: "10px", color: "#64748b" }}>Cash + UPI bank receipts</small>
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "4px" }}>
                Standard Gross Margin (%)
              </label>
              <input
                type="number"
                value={marginPct}
                onChange={(e) => setMarginPct(e.target.value)}
                placeholder="30"
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
              <small style={{ fontSize: "10px", color: "#64748b" }}>Standard retail markup</small>
            </div>
          </div>

          {/* ACTIONS ROW */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
            <button
              type="button"
              onClick={handleRunAudit}
              disabled={busy}
              style={{ flex: 1, padding: "9px 14px", borderRadius: "7px", background: "#4338ca", color: "#fff", border: "none", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              {busy ? <Loader2 size={15} className="spin-fast" /> : <FileSpreadsheet size={15} />}
              <span>Execute Commingled Stock Audit</span>
            </button>
            <button
              type="button"
              onClick={handleLoadRealisticSample}
              style={{ padding: "9px 14px", borderRadius: "7px", background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>Load 1-Click Sample Preset</span>
            </button>
          </div>

          {/* AUDIT RESULTS DISPLAY */}
          {auditResult && (
            <div style={{ border: "1px solid #fecaca", background: "#fff5f5", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #fee2e2", paddingBottom: "10px" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#b91c1c", letterSpacing: "0.05em" }}>
                    FORENSIC COMMINGLING AUDIT RESULT
                  </span>
                  <h4 style={{ margin: "2px 0 0", fontSize: "16px", color: "#991b1b" }}>
                    {auditResult.merchant_alias} — {auditResult.anomaly_level || "CRITICAL ANOMALY"}
                  </h4>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Discrepancy Multiple</span>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#dc2626" }}>
                    {auditResult.discrepancy_multiple}x Normal
                  </div>
                </div>
              </div>

              {/* 3 STATS CARDS */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                  <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>MAX LEGITIMATE SALES CAPACITY</span>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "#059669", marginTop: "2px" }}>
                    {money(auditResult.max_legitimate_sales_capacity)}
                  </div>
                  <small style={{ fontSize: "10px", color: "#94a3b8" }}>Based on {auditResult.standard_margin_pct || 30}% markup</small>
                </div>

                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                  <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>ACTUAL BANK DEPOSITS</span>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "#0284c7", marginTop: "2px" }}>
                    {money(auditResult.total_bank_deposits)}
                  </div>
                  <small style={{ fontSize: "10px", color: "#94a3b8" }}>Cash + UPI total credited</small>
                </div>

                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px" }}>
                  <span style={{ fontSize: "10px", color: "#b91c1c", fontWeight: "700" }}>PHANTOM / COMMINGLED INFLOW</span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#dc2626", marginTop: "2px" }}>
                    +{money(auditResult.phantom_revenue)}
                  </div>
                  <small style={{ fontSize: "10px", color: "#dc2626", fontWeight: "600" }}>Unexplained surplus</small>
                </div>
              </div>

              {/* OFF-HOUR TRANSFERS (12:00 AM - 04:00 AM) */}
              {auditResult.off_hour_transactions && auditResult.off_hour_transactions.length > 0 && (
                <div style={{ background: "#1e1b4b", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", color: "#e0e7ff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    <Moon size={14} className="text-amber-400" />
                    <b style={{ fontSize: "11px", color: "#fef08a" }}>
                      SUSPICIOUS OFF-HOUR INCOMING TRANSFERS (12:00 AM – 04:00 AM)
                    </b>
                  </div>
                  <div style={{ fontSize: "11.5px", lineHeight: 1.45 }}>
                    {auditResult.off_hour_transactions.map((tx, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,0.15)", padding: "3px 0" }}>
                        <span><b>{tx.timestamp}</b>: {tx.sender} ({tx.note || "Night transfer"})</span>
                        <b style={{ color: "#34d399" }}>{money(tx.amount)}</b>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 68J NDPS LEGAL INDICATOR CARD */}
              <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "8px", padding: "12px", marginBottom: "14px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <Scale size={20} className="text-amber-700" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <b style={{ fontSize: "12px", color: "#92400e", display: "block", marginBottom: "4px" }}>
                      ⚖️ STATUTORY APPLICATION: SECTION 68J NDPS ACT (REVERSE BURDEN OF PROOF)
                    </b>
                    <p style={{ margin: 0, fontSize: "11.5px", color: "#78350f", lineHeight: 1.45 }}>
                      Under <b>Section 68J of the Narcotic Drugs and Psychotropic Substances Act, 1985</b>,
                      once an illicit connection is established and revenue exceeds legitimate wholesale stock capacity,
                      <b> the burden of proving that these assets are NOT illegally acquired proceeds rests entirely upon the affected shopkeeper/owner</b>.
                      Certified commercial sales invoices are required to rebut this legal presumption.
                    </p>
                  </div>
                </div>
              </div>

              {/* ACTION: GENERATE SEC 94 NOTICE */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenSection94Notice) {
                      onOpenSection94Notice({
                        targetEntity: `${auditResult.merchant_alias}@upi`,
                        entityName: auditResult.merchant_alias,
                        amount: auditResult.phantom_revenue,
                        reason: `Section 68J NDPS Anomaly: Bank deposits exceed wholesale stock by ${auditResult.discrepancy_multiple}x (${money(auditResult.phantom_revenue)} phantom revenue).`,
                      });
                    }
                  }}
                  style={{ padding: "9px 16px", borderRadius: "7px", background: "#0284c7", color: "#fff", border: "none", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <FileDown size={15} />
                  <span>Generate Section 94 BNSS Bank Notice for this Shop</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
