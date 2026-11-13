import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, BadgeAlert, Banknote, Check, CheckCircle2, ChevronRight,
  Copy, Download, Eye, FileDown, FileSpreadsheet, Fingerprint, FlaskConical,
  GitBranch, HeartHandshake, History, Landmark, Layers, Lock, MapPin, Menu,
  Pause, Play, QrCode, Radio, RefreshCw, RotateCcw, Search, Shield, ShieldAlert, ShieldCheck,
  Smartphone, Sparkles, Store, Trash2, Upload, Volume2, VolumeX, Wallet, X, Zap
} from "lucide-react";
import { saveEvidence, getAllEvidence, deleteEvidence } from "./evidenceStore";
import { sounds } from "./soundEffects";
import PayDemo from "./PayDemo.jsx";

const API = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8000" : "");
const BRIDGE_KEY = "toofan-shield-demo-scenario";

const initialTransactions = [
  { sender: "STUDENT-014", receiver: "BAKERY-QR-02", amount: 35, channel: "upi", is_p2m: true, reference_id: "UPI-TXN-001" },
  { sender: "BAKERY-QR-02", receiver: "FAKE-ACC-7A", amount: 3400, channel: "merchant-settlement", is_p2m: false, reference_id: "STTL-TXN-002" },
  { sender: "STUDENT-028", receiver: "FAKE-ACC-7A", amount: 950, channel: "upi", is_p2m: false, reference_id: "UPI-TXN-003" },
  { sender: "STUDENT-031", receiver: "FAKE-ACC-7A", amount: 1250, channel: "upi", is_p2m: false, reference_id: "UPI-TXN-004" },
  { sender: "FAKE-ACC-7A", receiver: "CASHOUT-HUB", amount: 5600, channel: "transfer", is_p2m: false, reference_id: "TRF-TXN-005" },
  { sender: "STUDENT-044", receiver: "FAKE-ACC-8B", amount: 600, channel: "upi", is_p2m: false, reference_id: "UPI-TXN-006" },
  { sender: "FAKE-ACC-8B", receiver: "CASHOUT-HUB", amount: 600, channel: "transfer", is_p2m: false, reference_id: "TRF-TXN-007" },
];

const initialTrace = {
  nodes: [
    { id: "STUDENT-014", incoming: 0, outgoing: 1, role: "account" },
    { id: "STUDENT-028", incoming: 0, outgoing: 1, role: "account" },
    { id: "STUDENT-031", incoming: 0, outgoing: 1, role: "account" },
    { id: "STUDENT-044", incoming: 0, outgoing: 1, role: "account" },
    { id: "BAKERY-QR-02", incoming: 1, outgoing: 1, role: "account" },
    { id: "FAKE-ACC-7A", incoming: 3, outgoing: 1, role: "possible-convergence" },
    { id: "FAKE-ACC-8B", incoming: 1, outgoing: 1, role: "account" },
    { id: "CASHOUT-HUB", incoming: 2, outgoing: 0, role: "destination" },
  ],
  edges: [
    { source: "STUDENT-014", target: "BAKERY-QR-02", amount: 35 },
    { source: "BAKERY-QR-02", target: "FAKE-ACC-7A", amount: 3400 },
    { source: "STUDENT-028", target: "FAKE-ACC-7A", amount: 950 },
    { source: "STUDENT-031", target: "FAKE-ACC-7A", amount: 1250 },
    { source: "FAKE-ACC-7A", target: "CASHOUT-HUB", amount: 5600 },
    { source: "STUDENT-044", target: "FAKE-ACC-8B", amount: 600 },
    { source: "FAKE-ACC-8B", target: "CASHOUT-HUB", amount: 600 },
  ],
  paths: [
    ["STUDENT-014", "BAKERY-QR-02", "FAKE-ACC-7A", "CASHOUT-HUB"],
    ["STUDENT-028", "FAKE-ACC-7A", "CASHOUT-HUB"],
    ["STUDENT-031", "FAKE-ACC-7A", "CASHOUT-HUB"],
    ["STUDENT-044", "FAKE-ACC-8B", "CASHOUT-HUB"],
  ],
  candidates: [
    { account: "FAKE-ACC-7A", reason: "Multiple people secretly sending money to one fake account (test data)", incoming_count: 3, outgoing_count: 1 },
    { account: "CASHOUT-HUB", reason: "All gathered funds end up here for final cash out", incoming_count: 2, outgoing_count: 0 },
  ],
  merchant_alerts: [
    {
      merchant_alias: "FORT-ROAD-BAKERY",
      category: "Bakery & Sweets",
      usual_daily_receipts: 200,
      observed_daily_receipts: 900,
      increase: 700,
      multiple_of_baseline: 4.5,
      status: "unusual-receipts-review",
      rule: "Cash is 4x higher than normal (+₹500 jump) (test rule)",
    },
  ],
  transaction_count: 7,
};

const SCENARIOS = {
  candy: {
    label: "🍬 Candy Shop Trick",
    records: [
      { sender: "STUDENT-014", receiver: "BAKERY-QR-02", amount: 35, channel: "upi", is_p2m: true, reference_id: "DEMO-CANDY-01" },
      { sender: "BAKERY-QR-02", receiver: "FAKE-ACC-7A", amount: 3400, channel: "merchant-settlement", is_p2m: false, reference_id: "DEMO-CANDY-02" },
      { sender: "STUDENT-028", receiver: "FAKE-ACC-7A", amount: 950, channel: "upi", is_p2m: false, reference_id: "DEMO-CANDY-03" },
      { sender: "FAKE-ACC-7A", receiver: "CASHOUT-HUB", amount: 4350, channel: "transfer", is_p2m: false, reference_id: "DEMO-CANDY-04" },
    ],
  },
  direct: {
    label: "⚡ Split Transfers to Fake Acc",
    records: [
      { sender: "STUDENT-021", receiver: "FAKE-ACC-4C", amount: 700, channel: "upi", is_p2m: false, reference_id: "DEMO-DIR-01" },
      { sender: "STUDENT-034", receiver: "FAKE-ACC-4C", amount: 850, channel: "upi", is_p2m: false, reference_id: "DEMO-DIR-02" },
      { sender: "STUDENT-055", receiver: "FAKE-ACC-4C", amount: 1100, channel: "upi", is_p2m: false, reference_id: "DEMO-DIR-03" },
      { sender: "FAKE-ACC-4C", receiver: "CASHOUT-HUB", amount: 2650, channel: "transfer", is_p2m: false, reference_id: "DEMO-DIR-04" },
    ],
  },
  burst: {
    label: "🌐 Multi-Account Money Web",
    records: [
      { sender: "STUDENT-014", receiver: "BAKERY-QR-02", amount: 35, channel: "upi", is_p2m: true, reference_id: "UPI-TXN-001" },
      { sender: "BAKERY-QR-02", receiver: "FAKE-ACC-7A", amount: 3400, channel: "merchant-settlement", is_p2m: false, reference_id: "STTL-TXN-002" },
      { sender: "STUDENT-028", receiver: "FAKE-ACC-7A", amount: 950, channel: "upi", is_p2m: false, reference_id: "UPI-TXN-003" },
      { sender: "STUDENT-031", receiver: "FAKE-ACC-7A", amount: 1250, channel: "upi", is_p2m: false, reference_id: "UPI-TXN-004" },
      { sender: "FAKE-ACC-7A", receiver: "CASHOUT-HUB", amount: 5600, channel: "transfer", is_p2m: false, reference_id: "TRF-TXN-005" },
      { sender: "STUDENT-044", receiver: "FAKE-ACC-8B", amount: 600, channel: "upi", is_p2m: false, reference_id: "UPI-TXN-006" },
      { sender: "FAKE-ACC-8B", receiver: "CASHOUT-HUB", amount: 600, channel: "transfer", is_p2m: false, reference_id: "TRF-TXN-007" },
    ],
  },
  cashDeposit: {
    label: "💵 Suspicious Cash Spike",
    records: [
      { sender: "BAKERY-VAULT-01", receiver: "BANK-SETTLEMENT", amount: 1850, channel: "cash-deposit", is_p2m: false, reference_id: "DEMO-CASH-01" },
      { sender: "BANK-SETTLEMENT", receiver: "FAKE-ACC-7A", amount: 1800, channel: "settlement", is_p2m: false, reference_id: "DEMO-CASH-02" },
      { sender: "FAKE-ACC-7A", receiver: "CASHOUT-HUB", amount: 1750, channel: "transfer", is_p2m: false, reference_id: "DEMO-CASH-03" },
    ],
    merchant: [{
      merchant_alias: "BAKERY-VAULT-01",
      category: "Bakery",
      usual_daily_receipts: 200,
      observed_daily_receipts: 1850,
    }],
  },
};

const SIMULATION_SCRIPTS = {
  candy: [
    { edgeId: "STUDENT-014->BAKERY-QR-02", narration: "Step 1 of 4: Student-014 buys snacks at the bakery using UPI for ₹35.", sound: "click" },
    { edgeId: "BAKERY-QR-02->FAKE-ACC-7A", narration: "Step 2 of 4: Bakery sends ₹3,400 to Fake Acc 7A (pretending it is shop settlement).", sound: "alert" },
    { edgeId: "STUDENT-028->FAKE-ACC-7A", narration: "Step 3 of 4: Student-028 also sends ₹950 directly to Fake Acc 7A (money gathers here!).", sound: "alert" },
    { edgeId: "FAKE-ACC-7A->CASHOUT-HUB", narration: "Step 4 of 4: Fake Acc 7A forwards all ₹4,350 to the Final Cashout Hub.", sound: "success" },
  ],
  direct: [
    { edgeId: "STUDENT-021->FAKE-ACC-4C", narration: "Step 1 of 4: Student-021 sends ₹700 to Fake Acc 4C.", sound: "click" },
    { edgeId: "STUDENT-034->FAKE-ACC-4C", narration: "Step 2 of 4: Student-034 sends ₹850 to Fake Acc 4C (split payment 2).", sound: "alert" },
    { edgeId: "STUDENT-055->FAKE-ACC-4C", narration: "Step 3 of 4: Student-055 sends ₹1,100 to Fake Acc 4C (split payment 3).", sound: "alert" },
    { edgeId: "FAKE-ACC-4C->CASHOUT-HUB", narration: "Step 4 of 4: Fake Acc 4C gathers all ₹2,650 and forwards it to Cashout Hub.", sound: "success" },
  ],
  burst: [
    { edgeId: "STUDENT-014->BAKERY-QR-02", narration: "Step 1 of 5: Student-014 buys snacks at bakery for ₹35.", sound: "click" },
    { edgeId: "BAKERY-QR-02->FAKE-ACC-7A", narration: "Step 2 of 5: Bakery routes ₹3,400 to Fake Acc 7A.", sound: "alert" },
    { edgeId: "STUDENT-028->FAKE-ACC-7A", narration: "Step 3 of 5: Student-028 sends ₹950 into Fake Acc 7A.", sound: "alert" },
    { edgeId: "STUDENT-044->FAKE-ACC-8B", narration: "Step 4 of 5: Meanwhile, Student-044 sends ₹600 to Fake Acc 8B.", sound: "click" },
    { edgeId: "FAKE-ACC-7A->CASHOUT-HUB", narration: "Step 5 of 5: Both fake accounts forward ₹6,200 to the Final Cashout Hub.", sound: "success" },
  ],
  cashDeposit: [
    { edgeId: "BAKERY-VAULT-01->BANK-SETTLEMENT", narration: "Step 1 of 3: Shop deposits ₹1,850 cash into bank (abnormal 4x jump!).", sound: "click" },
    { edgeId: "BANK-SETTLEMENT->FAKE-ACC-7A", narration: "Step 2 of 3: Bank settlement releases ₹1,800 to Fake Acc 7A.", sound: "alert" },
    { edgeId: "FAKE-ACC-7A->CASHOUT-HUB", narration: "Step 3 of 3: Fake Acc 7A dumps ₹1,750 into the Final Cashout Hub.", sound: "success" },
  ],
};

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

// ----------------------------------------------------
// OFFICIAL TOPOLOGY GRAPH VISUALIZER
// ----------------------------------------------------
function OfficialTopologyGraph({ trace, privacy, onSelectNode, selectedNode, activeHighlightEdge, onLoadDemo, onOpenGPay }) {
  const [minAmount, setMinAmount] = useState(0);
  const [animateParticles, setAnimateParticles] = useState(true);

  const nodes = trace.nodes ?? [];
  const edges = trace.edges ?? [];

  const { positions } = useMemo(() => {
    const incomingMap = new Map();
    const outgoingMap = new Map();

    edges.forEach((e) => {
      incomingMap.set(e.target, (incomingMap.get(e.target) || 0) + 1);
      outgoingMap.set(e.source, (outgoingMap.get(e.source) || 0) + 1);
    });

    const tier0 = []; // Origins
    const tier1 = []; // Gateways / Merchants
    const tier2 = []; // Convergence Mules
    const tier3 = []; // Terminal Sinks

    nodes.forEach((node) => {
      const inCount = incomingMap.get(node.id) || 0;
      const outCount = outgoingMap.get(node.id) || 0;

      if (node.role === "possible-convergence" || inCount >= 2) {
        tier2.push(node);
      } else if (outCount === 0 && inCount > 0) {
        tier3.push(node);
      } else if (inCount === 0) {
        tier0.push(node);
      } else {
        tier1.push(node);
      }
    });

    const groups = [tier0, tier1, tier2, tier3];
    const pos = new Map();
    const svgHeight = 310;
    const tierX = [85, 295, 525, 745];

    groups.forEach((group, tIndex) => {
      const x = tierX[tIndex];
      const count = group.length;
      group.forEach((node, nIndex) => {
        const y = count === 1
          ? svgHeight / 2
          : 45 + ((svgHeight - 90) / (count - 1 || 1)) * nIndex;
        pos.set(node.id, { x, y, tier: tIndex });
      });
    });

    return { positions: pos };
  }, [nodes, edges]);

  const filteredEdges = useMemo(() => {
    return edges.filter((e) => e.amount >= minAmount);
  }, [edges, minAmount]);

  function getNodeStyle(node) {
    const isFakeAcc = node.role === "possible-convergence" || node.incoming >= 2 || node.id.includes("FAKE-ACC") || node.id.includes("MULE");
    const isDestination = node.role === "destination" || node.outgoing === 0 || node.id.includes("HUB") || node.id.includes("CASHOUT");
    const isMerchant = node.id.includes("BAKERY") || node.id.includes("MERCHANT") || node.id.includes("SETTLE") || node.id.includes("CANTEEN");

    if (isFakeAcc) {
      return {
        fill: "url(#fakeAccGrad)",
        stroke: "#ef4444",
        glow: "url(#glowRed)",
        textFill: "#dc2626",
        badgeBg: "#fee2e2",
        icon: "⚠️",
      };
    }
    if (isDestination) {
      return {
        fill: "url(#hubGrad)",
        stroke: "#8b5cf6",
        glow: "url(#glowPurple)",
        textFill: "#7c3aed",
        badgeBg: "#ede9fe",
        icon: "🏛️",
      };
    }
    if (isMerchant) {
      return {
        fill: "url(#shopGrad)",
        stroke: "#10b981",
        glow: "url(#glowGreen)",
        textFill: "#059669",
        badgeBg: "#dcfce7",
        icon: "🏪",
      };
    }
    return {
      fill: "url(#studentGrad)",
      stroke: "#0284c7",
      glow: "url(#glowBlue)",
      textFill: "#0284c7",
      badgeBg: "#e0f2fe",
      icon: "👤",
    };
  }

  return (
    <div className="official-graph-card">
      <div className="graph-card-header">
        <div className="graph-header-left">
          <div className="graph-icon-badge">
            <GitBranch size={17} />
          </div>
          <div>
            <h3>Money Flow Map (Follow the Cash)</h3>
            <p>Watch how money moves step-by-step from students to fake accounts and final cashout</p>
          </div>
        </div>

        <div className="graph-header-controls">
          <label className="clean-checkbox-label">
            <input
              type="checkbox"
              checked={animateParticles}
              onChange={(e) => setAnimateParticles(e.target.checked)}
            />
            <span>Moving Money</span>
          </label>

          <div className="clean-slider-group">
            <span>Filter ₹{minAmount}+</span>
            <input
              type="range"
              min="0"
              max="2000"
              step="50"
              value={minAmount}
              onChange={(e) => setMinAmount(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* SVG CANVAS */}
      <div className="graph-canvas-box">
        <div className="tier-stage-labels">
          <span className="tier-badge-label blue"><span className="tier-dot blue" /> STEP 1 · STUDENTS</span>
          <span className="tier-badge-label green"><span className="tier-dot green" /> STEP 2 · SHOPS &amp; QR</span>
          <span className="tier-badge-label red"><span className="tier-dot red" /> STEP 3 · FAKE ACCS (MULES)</span>
          <span className="tier-badge-label purple"><span className="tier-dot purple" /> STEP 4 · FINAL CASHOUT HUB</span>
        </div>

        {nodes.length === 0 ? (
          <div className="empty-graph-state-box">
            <div className="empty-glow-disc">
              <RotateCcw size={30} className="empty-reset-icon" />
            </div>
            <h4>Money Flow Map is Reset (0 Transactions)</h4>
            <p>
              All transactions were reset to a clean slate. You can record a new payment in Google Pay or choose a test pattern above.
            </p>
            <div className="empty-state-actions-cluster">
              {onLoadDemo && (
                <button className="btn-load-demo-inline" onClick={onLoadDemo}>
                  <Play size={13} />
                  <span>Load Sample Money Trail</span>
                </button>
              )}
              {onOpenGPay && (
                <button className="btn-load-demo-inline secondary" onClick={onOpenGPay}>
                  <Smartphone size={13} />
                  <span>Make Payment in Google Pay</span>
                </button>
              )}
            </div>
          </div>
        ) : (
        <svg
          viewBox="0 0 830 310"
          className="topology-svg-element"
          role="img"
          aria-label="Transaction Topology Visualizer"
        >
          <defs>
            {/* Gradients for Nodes */}
            <linearGradient id="studentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#bae6fd" />
            </linearGradient>
            <linearGradient id="shopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d1fae5" />
              <stop offset="100%" stopColor="#a7f3d0" />
            </linearGradient>
            <linearGradient id="fakeAccGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fee2e2" />
              <stop offset="100%" stopColor="#fecaca" />
            </linearGradient>
            <linearGradient id="hubGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ede9fe" />
              <stop offset="100%" stopColor="#ddd6fe" />
            </linearGradient>

            {/* Subtle Tier Column Glass Tints */}
            <linearGradient id="tierColStudent" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.08)" />
              <stop offset="100%" stopColor="rgba(56, 189, 248, 0.02)" />
            </linearGradient>
            <linearGradient id="tierColShop" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(16, 185, 129, 0.08)" />
              <stop offset="100%" stopColor="rgba(16, 185, 129, 0.02)" />
            </linearGradient>
            <linearGradient id="tierColFakeAcc" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(239, 68, 68, 0.09)" />
              <stop offset="100%" stopColor="rgba(239, 68, 68, 0.02)" />
            </linearGradient>
            <linearGradient id="tierColHub" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(139, 92, 246, 0.09)" />
              <stop offset="100%" stopColor="rgba(139, 92, 246, 0.02)" />
            </linearGradient>

            {/* Glowing Drop Shadows */}
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#10b981" floodOpacity="0.55" />
            </filter>
            <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ef4444" floodOpacity="0.6" />
            </filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#0284c7" floodOpacity="0.5" />
            </filter>
            <filter id="glowPurple" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#8b5cf6" floodOpacity="0.55" />
            </filter>

            {/* Arrow Markers */}
            <marker id="cleanArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <polygon points="0 1, 8 4, 0 7" fill="#94a3b8" />
            </marker>
            <marker id="greenArrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
              <polygon points="0 1, 9 4.5, 0 8" fill="#10b981" />
            </marker>
            <marker id="redArrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
              <polygon points="0 1, 9 4.5, 0 8" fill="#ef4444" />
            </marker>
          </defs>

          {/* TIER ZONE GLASS PANELS */}
          <rect x="25" y="10" width="165" height="290" rx="14" fill="url(#tierColStudent)" stroke="rgba(56, 189, 248, 0.18)" strokeWidth="1" />
          <rect x="235" y="10" width="165" height="290" rx="14" fill="url(#tierColShop)" stroke="rgba(16, 185, 129, 0.18)" strokeWidth="1" />
          <rect x="445" y="10" width="165" height="290" rx="14" fill="url(#tierColFakeAcc)" stroke="rgba(239, 68, 68, 0.18)" strokeWidth="1" />
          <rect x="655" y="10" width="150" height="290" rx="14" fill="url(#tierColHub)" stroke="rgba(139, 92, 246, 0.18)" strokeWidth="1" />

          {/* CURVED BEZIER EDGES */}
          {filteredEdges.map((edge, idx) => {
            const p1 = positions.get(edge.source);
            const p2 = positions.get(edge.target);
            if (!p1 || !p2) return null;

            const edgeKey = `${edge.source}->${edge.target}`;
            const isSimHighlighted = activeHighlightEdge === edgeKey;
            const isSelected = selectedNode && (selectedNode.id === edge.source || selectedNode.id === edge.target);

            const dx = (p2.x - p1.x) * 0.48;
            const pathData = `M ${p1.x + 26} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x - 26} ${p2.y}`;
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2 - 8;

            return (
              <g key={`${edge.source}-${edge.target}-${idx}`} className={`edge-item ${isSimHighlighted ? "edge-active-sim" : ""}`}>
                {/* Glow backdrop line for active edge */}
                {isSimHighlighted && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke="rgba(16, 185, 129, 0.35)"
                    strokeWidth="9"
                    strokeLinecap="round"
                  />
                )}

                <path
                  d={pathData}
                  fill="none"
                  stroke={isSimHighlighted ? "#10b981" : isSelected ? "#ef4444" : "#cbd5e1"}
                  strokeWidth={isSimHighlighted ? "3.6" : isSelected ? "2.5" : "1.8"}
                  markerEnd={isSimHighlighted ? "url(#greenArrow)" : isSelected ? "url(#redArrow)" : "url(#cleanArrow)"}
                />

                {/* Animated Cash Particles (Lead + Trail) */}
                {animateParticles && (
                  <>
                    <circle r={isSimHighlighted ? "5.5" : "3.8"} fill={isSimHighlighted ? "#059669" : "#10b981"}>
                      <animateMotion
                        path={pathData}
                        dur={isSimHighlighted ? "1.2s" : `${Math.max(1.4, 3.8 - edge.amount / 1800)}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                    {isSimHighlighted && (
                      <circle r="3" fill="#34d399" opacity="0.7">
                        <animateMotion
                          path={pathData}
                          dur="1.2s"
                          begin="0.12s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                  </>
                )}

                {/* Amount Pill */}
                <rect
                  x={midX - 25}
                  y={midY - 8}
                  width="50"
                  height="17"
                  rx="5"
                  fill={isSimHighlighted ? "#dcfce7" : "#ffffff"}
                  stroke={isSimHighlighted ? "#10b981" : "#e2e8f0"}
                  strokeWidth={isSimHighlighted ? "1.6" : "0.9"}
                  filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
                />
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  className="edge-amount-text"
                  fill={isSimHighlighted ? "#15803d" : "#475569"}
                  fontWeight={isSimHighlighted ? "750" : "600"}
                >
                  {money(edge.amount)}
                </text>
              </g>
            );
          })}

          {/* INTERACTIVE NODES */}
          {nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const style = getNodeStyle(node);
            const isSelected = selectedNode?.id === node.id;
            const label = privacy && node.id.startsWith("STUDENT") ? "STUDENT •••" : node.id;
            const isConvergence = node.role === "possible-convergence" || node.incoming >= 2;

            const [activeSrc, activeDst] = activeHighlightEdge ? activeHighlightEdge.split("->") : [null, null];
            const isSimActiveNode = activeHighlightEdge && (node.id === activeSrc || node.id === activeDst);

            return (
              <g
                key={node.id}
                className={`interactive-node ${isSimActiveNode ? "sim-active-node" : ""}`}
                onClick={() => { sounds.playClick(); onSelectNode(node); }}
                style={{ cursor: "pointer" }}
              >
                {/* Glowing simulation halo ring */}
                {isSimActiveNode && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="33"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.8"
                    strokeDasharray="5 4"
                    className="sim-node-halo"
                  />
                )}

                {/* Glowing alert radar pulse rings for fake accounts */}
                {isConvergence && (
                  <>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="30"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      className="mule-pulse-ring"
                    />
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="36"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="1"
                      className="mule-pulse-ring-outer"
                    />
                  </>
                )}

                {/* Main Circle with 3D drop shadow */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="24"
                  fill={style.fill}
                  stroke={isSelected ? "#dc2626" : isSimActiveNode ? "#10b981" : style.stroke}
                  strokeWidth={isSelected || isSimActiveNode ? "3.2" : "2.2"}
                  filter={isSelected ? "drop-shadow(0 0 8px rgba(220, 38, 38, 0.6))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.08))"}
                />

                <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize="13">
                  {style.icon}
                </text>

                {/* Backdrop pill for label */}
                <rect
                  x={pos.x - 42}
                  y={pos.y + 30}
                  width="84"
                  height="16"
                  rx="4"
                  fill="rgba(255, 255, 255, 0.88)"
                  stroke="#e2e8f0"
                  strokeWidth="0.8"
                />
                <text x={pos.x} y={pos.y + 42} textAnchor="middle" className="node-caption-text">
                  {label.length > 15 ? `${label.slice(0, 13)}…` : label}
                </text>

                {/* Stats badge pill */}
                <rect
                  x={pos.x - 22}
                  y={pos.y + 49}
                  width="44"
                  height="14"
                  rx="4"
                  fill={style.badgeBg || "#f1f5f9"}
                />
                <text x={pos.x} y={pos.y + 59} textAnchor="middle" className="node-stats-text" fill={style.textFill}>
                  ↓{node.incoming} ↑{node.outgoing}
                </text>
              </g>
            );
          })}
        </svg>
        )}
      </div>

      {/* FOOTER LEGEND */}
      <div className="graph-footer-row">
        <div className="legend-pills-wrap">
          <span className="legend-chip"><span className="chip-dot blue" /> Normal Senders</span>
          <span className="legend-chip"><span className="chip-dot yellow" /> Shops & QR Codes</span>
          <span className="legend-chip"><span className="chip-dot red" /> Fake Account (Mule)</span>
          <span className="legend-chip"><span className="chip-dot purple" /> Final Cashout Hub</span>
          <span className="legend-chip"><span className="chip-dot emerald" /> Moving Money</span>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// SIMPLIFIED EVIDENCE WORKFLOW
// ----------------------------------------------------
function OfficialEvidenceWizard() {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [digest, setDigest] = useState("");
  const [capturedAt, setCapturedAt] = useState("");
  const [coordinates, setCoordinates] = useState(null);
  const [officer, setOfficer] = useState("OFFICER-DEMO-01");
  const [caseLabel, setCaseLabel] = useState("CR-2026-TOOFAN-01");
  const [checklist, setChecklist] = useState({
    identityNoted: true,
    groundsCommunicated: true,
    independentWitness: false,
    personInformed: false,
    searchRecordCompleted: false,
  });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [vaultEntries, setVaultEntries] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState("capture");

  useEffect(() => {
    loadVault();
  }, []);

  async function loadVault() {
    try {
      const logs = await getAllEvidence();
      setVaultEntries(logs.sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at)));
    } catch {}
  }

  async function hashBlob(blob, name, previewUrl = null) {
    if (!globalThis.crypto?.subtle) {
      throw new Error("Web Crypto unavailable. Please use modern browser.");
    }
    const bytes = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(hashBuffer), (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");

    setFile(name);
    setFilePreview(previewUrl);
    setDigest(hex);
    setCapturedAt(new Date().toISOString());
    sounds.playClick();
    setNotice("Local SHA-256 digest computed successfully.");
  }

  async function handleFileChoose(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    try {
      const preview = URL.createObjectURL(selected);
      await hashBlob(selected, selected.name, preview);
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function generateSyntheticPlaceholder() {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
        <rect width="100%" height="100%" fill="#0f172a"/>
        <circle cx="300" cy="140" r="54" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
        <text x="50%" y="146" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#38bdf8">EVIDENCE SPECIMEN</text>
        <text x="50%" y="235" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#94a3b8">SYNTHETIC DIGITAL EVIDENCE HOLDER</text>
        <text x="50%" y="265" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#64748b">CASE: ${caseLabel} · OFFICER: ${officer}</text>
      </svg>
    `;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const preview = URL.createObjectURL(blob);
    await hashBlob(blob, "synthetic-evidence-specimen.svg", preview);
  }

  function captureGeolocation() {
    if (!navigator.geolocation) {
      setCoordinates({ latitude: 18.9220, longitude: 72.8347, accuracy: 12 });
      setNotice("Simulated district coordinates set (South Hub Zone).");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
          accuracy: Math.round(coords.accuracy),
        });
        sounds.playClick();
        setNotice(`GPS Coordinates acquired: Lat ${coords.latitude.toFixed(4)}, Long ${coords.longitude.toFixed(4)}.`);
      },
      () => {
        setCoordinates({ latitude: 18.9220, longitude: 72.8347, accuracy: 12 });
        setNotice("Simulated district coordinates set.");
      },
      { timeout: 5000 }
    );
  }

  const checklistScore = Object.values(checklist).filter(Boolean).length;
  const checklistPercent = Math.round((checklistScore / 5) * 100);

  async function handleSaveAndExport() {
    if (!digest) {
      setNotice("Please select or generate an evidence specimen first.");
      return;
    }
    if (checklistPercent < 100) {
      setNotice("Please confirm all 5 procedural checklist items before generating PDF.");
      return;
    }

    setBusy(true);
    setNotice("Generating tamper-evident remand summary...");
    const newEntry = {
      id: crypto.randomUUID(),
      file,
      sha256: digest,
      captured_at: capturedAt,
      coordinates,
      officer_id: officer,
      case_label: caseLabel,
      checklist,
      saved_at: new Date().toISOString(),
    };

    try {
      await saveEvidence(newEntry);
      await loadVault();

      const response = await fetch(`${API}/api/generate-remand-memo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_label: caseLabel,
          evidence: {
            sha256: digest,
            captured_at: capturedAt,
            coordinates,
            officer_id: officer,
            checklist,
          },
        }),
      });

      if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TOOFAN-Evidence-${caseLabel}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      sounds.playCashRegister();
      setNotice("Evidence record saved to IndexedDB vault and PDF memo downloaded!");
    } catch (err) {
      setNotice(`Saved locally, but backend PDF offline: ${err.message}.`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteEntry(id) {
    if (confirm("Remove this evidence record from local vault?")) {
      await deleteEvidence(id);
      await loadVault();
      sounds.playClick();
    }
  }

  return (
    <div className="official-evidence-wrapper">
      <div className="evidence-subtabs-row">
        <button
          className={`subtab-btn ${activeSubTab === "capture" ? "active" : ""}`}
          onClick={() => setActiveSubTab("capture")}
        >
          <Fingerprint size={16} />
          <span>Upload & Stamp Evidence</span>
        </button>
        <button
          className={`subtab-btn ${activeSubTab === "vault" ? "active" : ""}`}
          onClick={() => setActiveSubTab("vault")}
        >
          <History size={16} />
          <span>Saved Evidence Vault ({vaultEntries.length})</span>
        </button>
      </div>

      {activeSubTab === "capture" ? (
        <div className="evidence-two-col-grid">
          {/* STEP 1: SPECIMEN HASHING */}
          <div className="evidence-panel-card">
            <div className="panel-step-header">
              <span className="step-num-pill">STEP 01</span>
              <div>
                <h4>Evidence Photo & Digital Fingerprint</h4>
                <p>Creates an unchangeable digital fingerprint so evidence cannot be faked</p>
              </div>
            </div>

            <div className="clean-fields-pair">
              <div className="input-field-group">
                <label>Case Name or Number</label>
                <input
                  value={caseLabel}
                  onChange={(e) => setCaseLabel(e.target.value)}
                  placeholder="e.g. CASE-2026-TOOFAN-01"
                />
              </div>
              <div className="input-field-group">
                <label>Officer Name or ID</label>
                <input
                  value={officer}
                  onChange={(e) => setOfficer(e.target.value)}
                  placeholder="e.g. OFFICER-RAVI-SHARMA"
                />
              </div>
            </div>

            <div className="specimen-drop-box">
              {filePreview ? (
                <div className="specimen-preview-box">
                  <img src={filePreview} alt="Specimen Thumbnail" className="specimen-thumbnail" />
                  <div className="specimen-name-badge">
                    <b>{file}</b>
                    <small>Fingerprinted locally on your device · 100% private</small>
                  </div>
                </div>
              ) : (
                <div className="specimen-placeholder-prompt">
                  <Upload size={28} className="text-google-blue" />
                  <b>Upload Evidence Photo or File</b>
                  <p>PNG, JPG, or SVG. Processed safely right inside your browser.</p>
                </div>
              )}

              <div className="specimen-btn-row">
                <label className="btn-specimen-primary">
                  <Upload size={14} />
                  <span>Choose Photo File</span>
                  <input type="file" accept="image/*" onChange={handleFileChoose} hidden />
                </label>
                <button className="btn-specimen-outline" onClick={generateSyntheticPlaceholder}>
                  <Sparkles size={14} />
                  <span>Generate Practice Evidence</span>
                </button>
              </div>

              {digest && (
                <div className="digest-display-strip">
                  <ShieldCheck size={18} className="text-emerald" />
                  <div className="digest-copy">
                    <span className="digest-label">DIGITAL FINGERPRINT (SHA-256):</span>
                    <code>{digest}</code>
                  </div>
                  <button
                    className="btn-copy-digest"
                    onClick={() => {
                      navigator.clipboard.writeText(digest);
                      sounds.playClick();
                      setNotice("Digital fingerprint copied to clipboard!");
                    }}
                    title="Copy Hash"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="telemetry-bar-row">
              <div className="telemetry-col">
                <small>TIMESTAMP</small>
                <b>{capturedAt ? new Date(capturedAt).toLocaleTimeString() : "Waiting for file"}</b>
              </div>

              <div className="telemetry-col">
                <small>GPS LOCATION</small>
                <b>
                  {coordinates
                    ? `${coordinates.latitude}° N, ${coordinates.longitude}° E`
                    : "No GPS fix"}
                </b>
              </div>

              <button className="btn-telemetry-gps" onClick={captureGeolocation}>
                <MapPin size={14} />
                <span>{coordinates ? "Refresh GPS" : "Get GPS Location"}</span>
              </button>
            </div>
          </div>

          {/* STEP 2: PROCEDURAL COMPLIANCE & EXPORT */}
          <div className="evidence-panel-card">
            <div className="panel-step-header">
              <span className="step-num-pill">STEP 02</span>
              <div>
                <h4>Legal Rules & Officer Sign-off</h4>
                <p>Check off all basic legal steps before downloading the court report</p>
              </div>
            </div>

            <div className="compliance-meter-box">
              <div className="meter-labels">
                <span>Checklist Progress</span>
                <b>{checklistPercent}% COMPLETE</b>
              </div>
              <div className="meter-track">
                <div
                  className="meter-bar"
                  style={{
                    width: `${checklistPercent}%`,
                    background: checklistPercent === 100 ? "#10b981" : "#f59e0b",
                  }}
                />
              </div>
            </div>

            <div className="checklist-stack">
              {[
                ["identityNoted", "Suspect identity and details written down in official diary"],
                ["groundsCommunicated", "Clear written reason given for the search / inspection"],
                ["independentWitness", "Independent local witness was present during check"],
                ["personInformed", "Person was clearly informed of their legal rights"],
                ["searchRecordCompleted", "List of seized items / phones recorded and signed"],
              ].map(([key, title]) => (
                <label key={key} className={`checklist-row ${checklist[key] ? "checked" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checklist[key]}
                    onChange={(e) => {
                      sounds.playClick();
                      setChecklist((prev) => ({ ...prev, [key]: e.target.checked }));
                    }}
                  />
                  <div className="check-box-square">
                    {checklist[key] && <Check size={12} />}
                  </div>
                  <span className="checklist-text">{title}</span>
                </label>
              ))}
            </div>

            <button
              className="btn-export-pdf-official"
              onClick={handleSaveAndExport}
              disabled={busy}
            >
              <FileDown size={17} />
              <span>{busy ? "Generating Document..." : "Save to Vault & Download PDF Report"}</span>
              <ChevronRight size={16} />
            </button>

            {notice && <div className="evidence-status-toast">{notice}</div>}
          </div>
        </div>
      ) : (
        /* VAULT LOGS TABLE */
        <div className="evidence-panel-card vault">
          <div className="vault-top-row">
            <div>
              <h4>Saved Evidence History</h4>
              <p>Tamper-proof records saved safely right on this computer</p>
            </div>
            <button className="btn-telemetry-gps" onClick={loadVault}>
              <RefreshCw size={14} /> Refresh Logs
            </button>
          </div>

          {vaultEntries.length === 0 ? (
            <div className="vault-empty-box">
              <ShieldAlert size={36} className="text-muted" />
              <b>No Evidence Logs Stored</b>
              <p>Generate a specimen and save it to create your first chain-of-custody log.</p>
            </div>
          ) : (
            <div className="vault-table-container">
              <table className="clean-data-table">
                <thead>
                  <tr>
                    <th>CASE REF</th>
                    <th>OFFICER</th>
                    <th>SPECIMEN</th>
                    <th>SHA-256 HASH</th>
                    <th>SAVED DATE</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {vaultEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td><b>{entry.case_label}</b></td>
                      <td>{entry.officer_id}</td>
                      <td>{entry.file}</td>
                      <td>
                        <code className="hash-code-snippet" title={entry.sha256}>
                          {entry.sha256.slice(0, 16)}...
                        </code>
                      </td>
                      <td>{new Date(entry.saved_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn-delete-record"
                          onClick={() => handleDeleteEntry(entry.id)}
                          title="Delete entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// SIMPLIFIED TRANSACTION FORENSICS LEDGER
// ----------------------------------------------------
function OfficialTransactionLedger({ transactions, privacy, onReset, onLoadDemo, onOpenGPay }) {
  const [filterQuery, setFilterQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchQuery =
        tx.sender.toLowerCase().includes(filterQuery.toLowerCase()) ||
        tx.receiver.toLowerCase().includes(filterQuery.toLowerCase()) ||
        String(tx.amount).includes(filterQuery);

      if (channelFilter === "all") return matchQuery;
      if (channelFilter === "upi") return matchQuery && tx.channel === "upi";
      if (channelFilter === "settlement") return matchQuery && tx.channel.includes("settle");
      if (channelFilter === "cash") return matchQuery && tx.channel.includes("cash");
      return matchQuery;
    });
  }, [transactions, filterQuery, channelFilter]);

  function exportCSV() {
    sounds.playClick();
    const headers = "Sender,Receiver,Amount,Channel,Classification,Reference\n";
    const rows = transactions
      .map(
        (t) =>
          `"${t.sender}","${t.receiver}",${t.amount},"${t.channel}","${t.is_p2m ? "P2M" : "P2P"}","${t.reference_id || ""}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TOOFAN-Transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    sounds.playClick();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `TOOFAN-Transactions-${Date.now()}.json`;
    a.click();
  }

  return (
    <div className="official-ledger-card">
      <div className="ledger-toolbar-row">
        <div className="ledger-search-input-wrap">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search sender, recipient, amount..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
        </div>

        <div className="ledger-filter-pills">
          {["all", "upi", "settlement", "cash"].map((ch) => (
            <button
              key={ch}
              className={`pill-btn ${channelFilter === ch ? "active" : ""}`}
              onClick={() => { sounds.playClick(); setChannelFilter(ch); }}
            >
              {ch.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="ledger-export-actions">
          {onReset && (
            <button className="btn-export-file danger-reset" onClick={onReset} title="Reset all transactions to zero">
              <RotateCcw size={14} />
              <span>Reset All</span>
            </button>
          )}
          <button className="btn-export-file" onClick={exportCSV} title="Export CSV File">
            <FileSpreadsheet size={14} />
            <span>Export CSV</span>
          </button>
          <button className="btn-export-file" onClick={exportJSON} title="Export JSON">
            <Download size={14} />
            <span>JSON</span>
          </button>
        </div>
      </div>

      <div className="ledger-table-box">
        <table className="clean-data-table">
          <thead>
            <tr>
              <th>SENDER (FROM)</th>
              <th>RECEIVER (TO)</th>
              <th>PAYMENT METHOD</th>
              <th>AMOUNT</th>
              <th>TYPE</th>
              <th>TXN ID</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-table-cell">
                  <div className="empty-ledger-box">
                    <div className="empty-ledger-icon">
                      <Landmark size={24} />
                    </div>
                    <b>No Transactions Recorded</b>
                    <p>All transactions have been reset to 0. Send a payment in Google Pay or load test data.</p>
                    <div className="empty-state-actions-cluster">
                      {onLoadDemo && (
                        <button className="btn-empty-load-demo" onClick={onLoadDemo}>
                          <Play size={13} />
                          <span>Load Sample Transactions</span>
                        </button>
                      )}
                      {onOpenGPay && (
                        <button className="btn-empty-load-demo secondary" onClick={onOpenGPay}>
                          <Smartphone size={13} />
                          <span>Make Payment in Google Pay</span>
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
            filtered.map((tx, idx) => {
              const senderLabel = privacy && tx.sender.startsWith("STUDENT") ? "STUDENT •••" : tx.sender;
              return (
                <tr key={`${tx.sender}-${tx.receiver}-${idx}`}>
                  <td>
                    <span className="account-alias-pill origin">{senderLabel}</span>
                  </td>
                  <td>
                    <span className="account-alias-pill target">{tx.receiver}</span>
                  </td>
                  <td>
                    <span className="channel-badge">{tx.channel}</span>
                  </td>
                  <td>
                    <b>{money(tx.amount)}</b>
                  </td>
                  <td>
                    <span className={`type-pill ${tx.is_p2m ? "p2m" : "transfer"}`}>
                      {tx.is_p2m ? "Shop Payment" : "Direct Transfer"}
                    </span>
                  </td>
                  <td>
                    <code className="ref-code">{tx.reference_id || `REF-${idx + 1}`}</code>
                  </td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// MAIN OFFICIAL APP COMPONENT
// ----------------------------------------------------
export default function App() {
  const [privacy, setPrivacy] = useState(true);

  const [transactions, setTransactions] = useState(() => {
    try {
      const raw = localStorage.getItem(BRIDGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.isReset) return [];
        if (Array.isArray(parsed.transactions)) return parsed.transactions;
      }
    } catch {}
    return initialTransactions;
  });

  const [trace, setTrace] = useState(() => {
    try {
      const raw = localStorage.getItem(BRIDGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.isReset) {
          return {
            nodes: [],
            edges: [],
            paths: [],
            candidates: [],
            merchant_alerts: [],
            excluded_p2m_count: 0,
            transaction_count: 0,
            notice: "All synthetic transactions and paths have been reset to zero.",
          };
        }
        if (parsed.trace) return parsed.trace;
      }
    } catch {}
    return initialTrace;
  });

  const [activeTab, setActiveTab] = useState("overview"); // overview | gpay | evidence | ledger
  const [selectedNode, setSelectedNode] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [activeScenario, setActiveScenario] = useState(() => {
    try {
      const raw = localStorage.getItem(BRIDGE_KEY);
      if (raw && JSON.parse(raw).isReset) return null;
    } catch {}
    return "burst";
  });

  const [simulating, setSimulating] = useState(false);
  const [simStepIndex, setSimStepIndex] = useState(0);
  const [resetToast, setResetToast] = useState(false);

  const activeScript = SIMULATION_SCRIPTS[activeScenario] || SIMULATION_SCRIPTS.burst;
  const currentScriptStep = activeScript[simStepIndex] || null;
  const activeHighlightEdge = currentScriptStep?.edgeId || null;

  async function handleResetTransactions() {
    if (typeof sounds.playReset === "function") {
      sounds.playReset();
    } else {
      sounds.playClick();
    }
    const emptyTrace = {
      nodes: [],
      edges: [],
      paths: [],
      candidates: [],
      merchant_alerts: [],
      excluded_p2m_count: 0,
      transaction_count: 0,
      notice: "All synthetic transactions and paths have been reset to zero.",
    };
    const emptyPayload = {
      createdAt: new Date().toISOString(),
      transactions: [],
      merchantObservations: [],
      trace: emptyTrace,
      isReset: true,
    };
    try {
      localStorage.setItem(BRIDGE_KEY, JSON.stringify(emptyPayload));
      window.dispatchEvent(new CustomEvent("toofan-tx-update", { detail: emptyPayload }));
      await fetch(`${API}/api/reset`, { method: "POST" });
    } catch {}
    setTransactions([]);
    setTrace(emptyTrace);
    setSelectedNode(null);
    setSimulating(false);
    setSimStepIndex(0);
    setActiveScenario(null);
    setResetToast(true);
    setTimeout(() => setResetToast(false), 4500);
  }

  async function handleAddTransactions(newTxList, merchantObservations = []) {
    sounds.playPaySuccess();
    const updated = [...newTxList, ...transactions];
    setTransactions(updated);
    setActiveScenario(null);

    const payload = {
      createdAt: new Date().toISOString(),
      transactions: updated,
      merchantObservations,
      isReset: false,
    };
    localStorage.setItem(BRIDGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("toofan-tx-update", { detail: payload }));

    try {
      const response = await fetch(`${API}/api/trace-mule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: updated, merchant_observations: merchantObservations }),
      });
      if (response.ok) {
        const result = await response.json();
        setTrace(result);
        payload.trace = result;
        localStorage.setItem(BRIDGE_KEY, JSON.stringify(payload));
      }
    } catch {}
  }

  function handleRestoreDemo() {
    sounds.playClick();
    handleSelectScenario("burst");
    setResetToast(false);
  }

  useEffect(() => {
    if (!simulating) return;
    const timer = setTimeout(() => {
      setSimStepIndex((prev) => {
        const next = prev + 1;
        if (next >= activeScript.length) {
          setSimulating(false);
          return 0;
        }
        const step = activeScript[next];
        if (step?.sound === "alert") sounds.playAlert();
        else if (step?.sound === "success") sounds.playPaySuccess();
        else sounds.playClick();
        return next;
      });
    }, 2800);
    return () => clearTimeout(timer);
  }, [simulating, simStepIndex, activeScript]);

  function handleSelectScenario(sKey) {
    setActiveScenario(sKey);
    setSimStepIndex(0);
    setSimulating(false);
    const scenario = SCENARIOS[sKey];
    if (scenario) {
      const records = scenario.records;
      const merchantObs = scenario.merchant ?? [];
      const payload = {
        createdAt: new Date().toISOString(),
        transactions: records,
        merchantObservations: merchantObs,
        isReset: false,
      };
      localStorage.setItem(BRIDGE_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent("toofan-tx-update", { detail: payload }));
      broadcast(records, merchantObs);
    }
  }

  function toggleSimulation() {
    if (simulating) {
      setSimulating(false);
    } else {
      setSimStepIndex(0);
      setSimulating(true);
      const step = activeScript[0];
      if (step?.sound === "alert") sounds.playAlert();
      else sounds.playClick();
    }
  }

  function nextSimStep() {
    setSimStepIndex((prev) => {
      const next = (prev + 1) % activeScript.length;
      const step = activeScript[next];
      if (step?.sound === "alert") sounds.playAlert();
      else if (step?.sound === "success") sounds.playPaySuccess();
      else sounds.playClick();
      return next;
    });
  }

  function prevSimStep() {
    setSimStepIndex((prev) => Math.max(0, prev - 1));
  }

  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  useEffect(() => {
    sounds.muted = !soundEnabled;
  }, [soundEnabled]);

  async function broadcast(records, merchantObservations = []) {
    setTransactions(records.slice(0, 100));
    sounds.playClick();
    try {
      const response = await fetch(`${API}/api/trace-mule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: records, merchant_observations: merchantObservations }),
      });
      if (!response.ok) throw new Error(`Engine returned ${response.status}`);
      const result = await response.json();
      setTrace(result);
      sounds.playPaySuccess();
    } catch {
      // Local fallback
    }
  }

  useEffect(() => {
    function loadPayScenario(raw) {
      try {
        const payload = JSON.parse(raw ?? "null");
        if (!payload) return;
        if (payload.isReset) {
          setTransactions([]);
          setTrace({
            nodes: [],
            edges: [],
            paths: [],
            candidates: [],
            merchant_alerts: [],
            excluded_p2m_count: 0,
            transaction_count: 0,
            notice: "All synthetic transactions and paths have been reset to zero.",
          });
          setActiveScenario(null);
          return;
        }
        if (Array.isArray(payload.transactions)) {
          setTransactions(payload.transactions);
          if (payload.trace) {
            setTrace(payload.trace);
          } else if (payload.transactions.length > 0) {
            void broadcast(payload.transactions, payload.merchantObservations ?? []);
          }
        }
      } catch {}
    }

    loadPayScenario(localStorage.getItem(BRIDGE_KEY));
    const handleStorage = (e) => {
      if (e.key === BRIDGE_KEY && e.newValue) loadPayScenario(e.newValue);
    };
    const handleCustom = (e) => {
      if (e.detail) {
        if (e.detail.isReset) {
          setTransactions([]);
          setTrace(e.detail.trace || {
            nodes: [],
            edges: [],
            paths: [],
            candidates: [],
            merchant_alerts: [],
            excluded_p2m_count: 0,
            transaction_count: 0,
          });
          setActiveScenario(null);
        } else if (Array.isArray(e.detail.transactions)) {
          setTransactions(e.detail.transactions);
          if (e.detail.trace) setTrace(e.detail.trace);
          else if (e.detail.transactions.length > 0) void broadcast(e.detail.transactions);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("toofan-tx-update", handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("toofan-tx-update", handleCustom);
    };
  }, []);

  const navItems = [
    { key: "overview", label: "Money Flow Tracker", icon: Activity },
    { key: "gpay", label: "Google Pay Simulator", icon: Smartphone },
    { key: "evidence", label: "Evidence & Proof Vault", icon: ShieldCheck },
    { key: "ledger", label: "Payment Records", icon: Landmark },
  ];

  return (
    <div className="official-app-container">
      {/* OFFICIAL HEADER BANNER */}
      <div className="official-top-banner">
        <FlaskConical size={14} className="text-sky" />
        <span>
          <b>TOOFAN SHIELD</b> · MONEY FLOW & FAKE ACCOUNT TRACKER · PRACTICE TEST DATA
        </span>
        <button
          className="banner-sound-switch"
          onClick={() => setSoundEnabled(!soundEnabled)}
          title="Toggle Sound Effects"
        >
          {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          <span>{soundEnabled ? "Audio On" : "Audio Muted"}</span>
        </button>
      </div>

      <div className="official-layout-wrapper">
        {/* OFFICIAL SIDEBAR */}
        <aside className={`official-sidebar ${menuOpen ? "open" : ""}`}>
          <div className="sidebar-brand-block">
            <div className="emblem-box">
              <Shield size={22} />
            </div>
            <div>
              <b className="emblem-title">TOOFAN<span>SHIELD</span></b>
              <small className="emblem-subtitle">MONEY TRACKER</small>
            </div>
          </div>

          <div className="nav-group-header">NAVIGATION</div>
          <nav className="sidebar-nav-list">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={`sidebar-nav-item ${activeTab === key ? "active" : ""}`}
                onClick={() => {
                  sounds.playClick();
                  setActiveTab(key);
                  setMenuOpen(false);
                }}
              >
                <Icon size={17} />
                <span>{label}</span>
                {activeTab === key && <ChevronRight size={14} className="nav-active-arrow" />}
              </button>
            ))}
          </nav>

          <div className="nav-group-header">QUICK TEST SCENARIOS</div>
          <div className="sidebar-scenarios-stack">
            {Object.entries(SCENARIOS).map(([sKey, scenario]) => (
              <button
                key={sKey}
                className={`scenario-btn-item ${activeScenario === sKey ? "active" : ""}`}
                onClick={() => handleSelectScenario(sKey)}
              >
                <Play size={12} />
                <span>{scenario.label}</span>
              </button>
            ))}
            <button
              className="scenario-btn-item reset-btn"
              onClick={handleResetTransactions}
              title="Reset all transactions to zero"
            >
              <RotateCcw size={12} />
              <span>Reset Transactions</span>
            </button>
          </div>

          <div className="sidebar-footer-box">
            <div className="footer-status-line">
              <span className="live-status-dot" />
              <span>TRACKING ENGINE READY</span>
            </div>
            <small>Local Engine Port 8000 · v0.2.0</small>
          </div>
        </aside>

        {/* MAIN DISPLAY CANVAS */}
        <div className="official-main-viewport">
          <header className="official-topbar">
            <div className="topbar-left-zone">
              <button className="btn-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="topbar-breadcrumbs">
                <span>TOOFAN Tracker</span>
                <ChevronRight size={13} />
                <b>
                  {activeTab === "overview" && "Live Money Flow Map"}
                  {activeTab === "gpay" && "Google Pay Simulator"}
                  {activeTab === "evidence" && "Evidence & Proof Vault"}
                  {activeTab === "ledger" && "All Payment Records"}
                </b>
              </div>
            </div>

            <div className="topbar-right-zone">
              {/* RESET TRANSACTIONS BUTTON */}
              <button
                className="btn-topbar-reset"
                onClick={handleResetTransactions}
                title="Reset all transactions to zero"
              >
                <RotateCcw size={14} />
                <span>Reset Transactions</span>
              </button>

              {/* STUDENT PRIVACY TOGGLE */}
              <div className="privacy-mode-pill">
                <ShieldCheck size={16} className={privacy ? "text-emerald" : "text-muted"} />
                <div className="privacy-pill-text">
                  <b>Student Privacy Protection</b>
                  <small>{privacy ? "Student names hidden (Safe)" : "Real student names shown"}</small>
                </div>
                <button
                  className={`privacy-toggle-btn ${privacy ? "active" : ""}`}
                  onClick={() => { sounds.playClick(); setPrivacy(!privacy); }}
                  role="switch"
                  aria-checked={privacy}
                >
                  <span className="toggle-slider-circle" />
                </button>
              </div>

              {/* QUICK GPAY SHORTCUT BUTTON */}
              <button
                className="btn-open-gpay-top"
                onClick={() => { sounds.playClick(); setActiveTab("gpay"); }}
              >
                <Smartphone size={14} />
                <span>Open GPay Demo</span>
              </button>
            </div>
          </header>

          {/* SCROLLABLE VIEWPORT CONTENT */}
          <div className="official-content-scrollable">
            {resetToast && (
              <div className="floating-reset-toast">
                <div className="toast-content-col">
                  <div className="toast-main-line">
                    <RotateCcw size={15} className="toast-icon-spin" />
                    <b>All transactions have been reset!</b>
                  </div>
                  <small>Money trails, transaction ledger, and accounts have been cleared to 0.</small>
                </div>
                <div className="toast-actions-row">
                  <button className="btn-toast-reload" onClick={handleRestoreDemo}>
                    <Play size={12} />
                    <span>Reload Demo Data</span>
                  </button>
                  <button className="btn-toast-dismiss" onClick={() => setResetToast(false)}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {privacy && (
              <div className="rehab-banner-notice">
                <HeartHandshake size={17} />
                <div>
                  <b>Student Privacy Protection Active.</b>
                  <span> Student names are hidden so young people stay protected.</span>
                </div>
              </div>
            )}

            {/* TAB 1: COMMAND OVERVIEW */}
            {activeTab === "overview" && (
              <div className="overview-page-wrapper">
                {/* INTERACTIVE SCENARIO ENGINE & AUTOMATED SIMULATION STRIP */}
                <div className="scenario-control-strip">
                  <div className="strip-top-row">
                    <div className="strip-title-group">
                      <span className="strip-badge"><Sparkles size={13} /> SAMPLE DEMO PATTERNS</span>
                      <span className="strip-hint">Click a button below to load a practice pattern (or make real payments in Google Pay):</span>
                    </div>
                    <div className="strip-actions-cluster">
                      <button
                        className="btn-strip-reset"
                        onClick={handleResetTransactions}
                        title="Reset all transactions to zero"
                      >
                        <RotateCcw size={13} />
                        <span>Reset All</span>
                      </button>
                      <button
                        className={`btn-simulation-toggle ${simulating ? "running" : ""}`}
                        onClick={toggleSimulation}
                      >
                        {simulating ? <Pause size={14} /> : <Play size={14} />}
                        <span>{simulating ? "Pause Walkthrough" : "▶ Watch Money Move"}</span>
                      </button>
                    </div>
                  </div>

                  {transactions.length === 0 ? (
                    <div className="status-strip-banner clean-slate">
                      <span className="banner-dot green" />
                      <span>
                        <b>System in Clean Slate Mode (0 Active Transactions):</b> All transactions are reset. Send a payment in Google Pay Simulator or click a sample pattern below.
                      </span>
                    </div>
                  ) : (
                    <div className="status-strip-banner active-mode">
                      <span className="banner-dot blue" />
                      <span>
                        <b>Live Money Trails Active:</b> {transactions.length} payments tracked in memory ({money(total)}). Click <b>Reset All</b> anytime to clear everything to zero.
                      </span>
                    </div>
                  )}

                  <div className="scenario-chips-row">
                    {Object.entries(SCENARIOS).map(([sKey, scenario]) => {
                      const isCurrent = activeScenario === sKey && transactions.length > 0;
                      return (
                        <button
                          key={sKey}
                          className={`scenario-chip-card theme-${sKey} ${isCurrent ? "active" : ""}`}
                          onClick={() => handleSelectScenario(sKey)}
                        >
                          <div className="chip-label-row">
                            <b>{scenario.label}</b>
                            <span className="chip-action-pill">Load Pattern →</span>
                          </div>
                          <small className="chip-desc">
                            {sKey === "candy" && "₹35 Bakery -> Fake Acc -> Hub"}
                            {sKey === "direct" && "3 Students -> Fake Acc 4C"}
                            {sKey === "burst" && "7 accounts moving money together"}
                            {sKey === "cashDeposit" && "4.5x shop cash jump alert"}
                          </small>
                        </button>
                      );
                    })}
                  </div>

                  {/* STEP NARRATION CALLOUT BANNER */}
                  {currentScriptStep && (
                    <div className="simulation-narration-banner">
                      <div className="narration-left">
                        <span className="narration-step-tag">
                          STEP {simStepIndex + 1} OF {activeScript.length}
                        </span>
                        <span className="narration-text">{currentScriptStep.narration}</span>
                      </div>
                      <div className="narration-controls">
                        <button className="narration-btn" onClick={prevSimStep} disabled={simStepIndex === 0}>
                          Prev
                        </button>
                        <button className="narration-btn primary" onClick={nextSimStep}>
                          {simStepIndex + 1 >= activeScript.length ? "Restart Step 1" : "Next Step →"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4 EXECUTIVE KPI STAT CARDS */}
                <div className="executive-kpi-grid">
                  <div className="kpi-card blue-theme">
                    <div className="kpi-top">
                      <span>TOTAL MONEY TRACKED</span>
                      <div className="kpi-icon-wrap blue"><Banknote size={17} /></div>
                    </div>
                    <div className="kpi-value">{money(total)}</div>
                    <div className="kpi-sub">
                      Across {transactions.length} payments tracked
                      <span className="kpi-status-tag green">● Live Stream</span>
                    </div>
                  </div>

                  <div className="kpi-card red-theme">
                    <div className="kpi-top">
                      <span>FAKE ACCOUNTS (MULES)</span>
                      <div className="kpi-icon-wrap red"><BadgeAlert size={17} /></div>
                    </div>
                    <div className="kpi-value text-red">{trace.candidates?.length ?? 0}</div>
                    <div className="kpi-sub">
                      Accounts collecting money from multiple people
                      <span className="kpi-status-tag red">● High Risk</span>
                    </div>
                  </div>

                  <div className="kpi-card green-theme">
                    <div className="kpi-top">
                      <span>MONEY TRAILS FOUND</span>
                      <div className="kpi-icon-wrap green"><GitBranch size={17} /></div>
                    </div>
                    <div className="kpi-value">{trace.paths?.length ?? 0}</div>
                    <div className="kpi-sub">
                      Step-by-step payment paths traced
                      <span className="kpi-status-tag blue">● Traced</span>
                    </div>
                  </div>

                  <div className="kpi-card yellow-theme">
                    <div className="kpi-top">
                      <span>SHOP CASH ALERTS</span>
                      <div className="kpi-icon-wrap yellow"><Store size={17} /></div>
                    </div>
                    <div className="kpi-value text-yellow">
                      {trace.merchant_alerts?.filter((a) => a.status === "unusual-receipts-review").length ?? 0}
                    </div>
                    <div className="kpi-sub">
                      Shops with sudden cash jumps
                      <span className="kpi-status-tag yellow">● 4x Jump</span>
                    </div>
                  </div>
                </div>

                {/* OFFICIAL TOPOLOGY GRAPH */}
                <OfficialTopologyGraph
                  trace={trace}
                  privacy={privacy}
                  selectedNode={selectedNode}
                  onSelectNode={setSelectedNode}
                  activeHighlightEdge={activeHighlightEdge}
                  onLoadDemo={handleRestoreDemo}
                  onOpenGPay={() => {
                    sounds.playClick();
                    setActiveTab("gpay");
                  }}
                />

                {/* SELECTED NODE DOSSIER FLYOUT */}
                {selectedNode && (
                  <div className="node-dossier-card">
                    <div className="dossier-header-bar">
                      <div className="dossier-title-col">
                        <b>{privacy && selectedNode.id.startsWith("STUDENT") ? "STUDENT •••" : selectedNode.id}</b>
                        <span className="role-tag-badge">
                          {selectedNode.id.includes("FAKE-ACC") || selectedNode.id.includes("MULE") || selectedNode.role === "possible-convergence"
                            ? "FAKE ACC (MULE)"
                            : selectedNode.id.includes("CASHOUT") || selectedNode.id.includes("HUB") || selectedNode.role === "destination"
                            ? "CASHOUT HUB"
                            : selectedNode.id.includes("BAKERY")
                            ? "SHOP"
                            : "STUDENT"}
                        </span>
                      </div>
                      <button className="btn-close-dossier" onClick={() => setSelectedNode(null)}>
                        <X size={16} />
                      </button>
                    </div>

                    <div className="dossier-stats-grid">
                      <div className="dossier-stat-item">
                        <span>Money Received (In):</span>
                        <b>{selectedNode.incoming} payments</b>
                      </div>
                      <div className="dossier-stat-item">
                        <span>Money Sent Forward (Out):</span>
                        <b>{selectedNode.outgoing} payments</b>
                      </div>
                      <div className="dossier-stat-item">
                        <span>Account Risk Type:</span>
                        <b>
                          {selectedNode.incoming >= 2 || selectedNode.id.includes("FAKE-ACC") || selectedNode.id.includes("MULE")
                            ? "⚠️ High Risk: Fake Account secretly collecting money from multiple people (Mule)"
                            : selectedNode.outgoing === 0 || selectedNode.id.includes("CASHOUT") || selectedNode.id.includes("HUB")
                            ? "🏛️ Final Destination: Cashout account where collected funds land"
                            : "👤 Normal Account: Ordinary sender or shop"}
                        </b>
                      </div>
                    </div>
                  </div>
                )}

                {/* CONNECTED SEQUENCES LIST */}
                {trace.paths?.length > 0 && (
                  <div className="flow-sequences-card">
                    <div className="flow-sequences-header">
                      <div className="header-icon-title">
                        <Layers size={16} />
                        <h4>Discovered Money Trails ({trace.paths.length})</h4>
                      </div>
                      <span className="tag-pill-sub">STEP-BY-STEP TRAILS</span>
                    </div>

                    <div className="routes-stack">
                      {trace.paths.slice(0, 4).map((path, idx) => (
                        <div key={idx} className="route-chain-row">
                          <span className="route-index-badge">TRAIL #{idx + 1}</span>
                          <div className="route-nodes-flex">
                            {path.map((node, nIdx) => {
                              const label = privacy && node.startsWith("STUDENT") ? "STUDENT •••" : node;
                              return (
                                <span key={nIdx} className="route-step-node">
                                  {label}
                                  {nIdx < path.length - 1 && <span className="step-arrow">→</span>}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MERCHANT VARIANCE REVIEW */}
                {(trace.merchant_alerts ?? []).length > 0 && (
                  <div className="merchant-variance-card">
                    <div className="variance-header-row">
                      <div className="header-icon-title">
                        <Store size={17} />
                        <h4>Shop Daily Sales & Cash Review</h4>
                      </div>
                      <span className="demo-rule-badge">4x JUMP DETECTOR</span>
                    </div>

                    <div className="variance-rows-list">
                      {trace.merchant_alerts.map((alert, i) => {
                        const isUnusual = alert.status === "unusual-receipts-review";
                        return (
                          <div
                            key={i}
                            className={`variance-row-item ${isUnusual ? "unusual" : "normal"}`}
                          >
                            <div className="v-icon-col">
                              {isUnusual ? <BadgeAlert size={20} /> : <CheckCircle2 size={20} />}
                            </div>
                            <div className="v-alias-col">
                              <b>{alert.merchant_alias}</b>
                              <small>{alert.category} · Comparing today's cash vs normal sales</small>
                            </div>
                            <div className="v-amount-col">
                              <small>NORMAL DAILY CASH</small>
                              <b>{money(alert.usual_daily_receipts)}</b>
                            </div>
                            <div className="v-amount-col">
                              <small>TODAY'S CASH DRAWER</small>
                              <b>{money(alert.observed_daily_receipts)}</b>
                            </div>
                            <div className="v-status-col">
                              <span className={`status-badge ${isUnusual ? "anomaly" : "ok"}`}>
                                {isUnusual ? "⚠️ UNUSUAL CASH SPIKE" : "✅ NORMAL SALES"}
                              </span>
                            </div>
                            <div className="v-explainer-full">
                              {alert.multiple_of_baseline}x higher than normal days · Cash difference: {alert.increase >= 0 ? "+" : "−"}{money(Math.abs(alert.increase))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: GPAY SIMULATOR */}
            {activeTab === "gpay" && (
              <div className="gpay-embedded-wrapper">
                <PayDemo
                  embedded={true}
                  transactions={transactions}
                  onAddTransactions={handleAddTransactions}
                  onResetTransactions={handleResetTransactions}
                  onNavigateTab={(tab) => {
                    sounds.playClick();
                    setActiveTab(tab);
                  }}
                />
              </div>
            )}

            {/* TAB 3: EVIDENCE & VAULT */}
            {activeTab === "evidence" && (
              <div className="evidence-page-wrapper">
                <OfficialEvidenceWizard />
              </div>
            )}

            {/* TAB 4: PAYMENT RECORDS */}
            {activeTab === "ledger" && (
              <div className="ledger-page-wrapper">
                <OfficialTransactionLedger
                  transactions={transactions}
                  privacy={privacy}
                  onReset={handleResetTransactions}
                  onLoadDemo={handleRestoreDemo}
                  onOpenGPay={() => {
                    sounds.playClick();
                    setActiveTab("gpay");
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
