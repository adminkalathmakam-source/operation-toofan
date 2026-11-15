import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertCircle, ArrowRight, BadgeAlert, Banknote, Building2, Camera, Check, CheckCircle2, ChevronRight,
  Copy, Download, Eye, FileDown, FileSpreadsheet, FileText, Fingerprint, FlaskConical,
  GitBranch, HeartHandshake, History, Landmark, Languages, Layers, Loader2, Lock, LogOut, MapPin, Menu, UserCheck,
  Pause, Play, QrCode, Radio, RefreshCw, RotateCcw, Scale, Scan, Search, Shield, ShieldAlert, ShieldCheck,
  Smartphone, Sparkles, Store, SwitchCamera, Trash2, Upload, Video, Volume2, VolumeX, Wallet, X, Zap
} from "lucide-react";
import { saveEvidence, getAllEvidence, deleteEvidence } from "./evidenceStore";
import { sounds } from "./soundEffects";
import PayDemo from "./PayDemo.jsx";
import CashLaunderingDesk from "./CashLaunderingDesk.jsx";
import LocationAiScanner from "./LocationAiScanner.jsx";
import PoliceSignInModal from "./PoliceSignInModal.jsx";
import PoliceGateScreen from "./PoliceGateScreen.jsx";
import Section94NoticeModal from "./Section94NoticeModal.jsx";
import BusinessAuditorModal from "./BusinessAuditorModal.jsx";
import StudentIntakeHotspotPanel from "./StudentIntakeHotspotPanel.jsx";
import { syncClient } from "./syncClient";
import { translations, POLICE_DEFAULT_USER } from "./i18n.js";

const API = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8000" : "");
const BRIDGE_KEY = "toofan-shield-demo-scenario";

const initialTransactions = [
  { sender: "STUDENT-014", receiver: "BAKERY-QR-02", amount: 3400, channel: "upi", is_p2m: true, reference_id: "UPI-TXN-001" },
  { sender: "BAKERY-QR-02", receiver: "FAKE-ACC-7A", amount: 3400, channel: "merchant-settlement", is_p2m: false, reference_id: "STTL-TXN-002" },
  { sender: "STUDENT-028", receiver: "FAKE-ACC-7A", amount: 950, channel: "upi", is_p2m: false, reference_id: "UPI-TXN-003" },
  { sender: "STUDENT-031", receiver: "FAKE-ACC-7A", amount: 1250, channel: "upi", is_p2m: false, reference_id: "UPI-TXN-004" },
  { sender: "FAKE-ACC-7A", receiver: "CASHOUT-HUB", amount: 5600, channel: "transfer", is_p2m: false, reference_id: "TRF-TXN-005" },
  { sender: "STUDENT-044", receiver: "FAKE-ACC-8B", amount: 600, channel: "upi", is_p2m: false, reference_id: "UPI-TXN-006" },
  { sender: "FAKE-ACC-8B", receiver: "CASHOUT-HUB", amount: 600, channel: "transfer", is_p2m: false, reference_id: "TRF-TXN-007" },
];

const initialTrace = {
  nodes: [
    { id: "STUDENT-014", incoming: 0, outgoing: 1, total_received: 0, total_sent: 3400, role: "account" },
    { id: "STUDENT-028", incoming: 0, outgoing: 1, total_received: 0, total_sent: 950, role: "account" },
    { id: "STUDENT-031", incoming: 0, outgoing: 1, total_received: 0, total_sent: 1250, role: "account" },
    { id: "STUDENT-044", incoming: 0, outgoing: 1, total_received: 0, total_sent: 600, role: "account" },
    { id: "BAKERY-QR-02", incoming: 1, outgoing: 1, total_received: 3400, total_sent: 3400, role: "account" },
    { id: "FAKE-ACC-7A", incoming: 3, outgoing: 1, total_received: 5600, total_sent: 5600, role: "possible-convergence" },
    { id: "FAKE-ACC-8B", incoming: 1, outgoing: 1, total_received: 600, total_sent: 600, role: "account" },
    { id: "CASHOUT-HUB", incoming: 2, outgoing: 0, total_received: 6200, total_sent: 0, role: "destination" },
  ],
  edges: [
    { source: "STUDENT-014", target: "BAKERY-QR-02", amount: 3400 },
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
      { sender: "STUDENT-014", receiver: "BAKERY-QR-02", amount: 3400, channel: "upi", is_p2m: true, reference_id: "UPI-TXN-001" },
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
  cashLaundering: {
    label: "💵 Cash Stash & Bakery Counter (₹2,000)",
    records: [
      { sender: "STUDENT-014", receiver: "PROVIDER-HARSH", amount: 250, channel: "physical-cash", is_p2m: false, reference_id: "DEMO-CSH-01" },
      { sender: "STUDENT-028", receiver: "PROVIDER-HARSH", amount: 500, channel: "physical-cash", is_p2m: false, reference_id: "DEMO-CSH-02" },
      { sender: "STUDENT-031", receiver: "PROVIDER-HARSH", amount: 750, channel: "physical-cash", is_p2m: false, reference_id: "DEMO-CSH-03" },
      { sender: "STUDENT-044", receiver: "PROVIDER-HARSH", amount: 500, channel: "physical-cash", is_p2m: false, reference_id: "DEMO-CSH-04" },
      { sender: "PROVIDER-HARSH", receiver: "FORT-ROAD-BAKERY", amount: 2000, channel: "shop-counter-cash", is_p2m: false, reference_id: "DEMO-CSH-05" },
      { sender: "FORT-ROAD-BAKERY", receiver: "ALT-ACC-7A", amount: 2000, channel: "merchant-settlement", is_p2m: false, reference_id: "DEMO-CSH-06" },
      { sender: "ALT-ACC-7A", receiver: "MAIN-CASHOUT-HUB", amount: 2000, channel: "bank-transfer", is_p2m: false, reference_id: "DEMO-CSH-07" },
    ],
    merchant: [{
      merchant_alias: "FORT-ROAD-BAKERY",
      category: "Bakery & Sweets",
      usual_daily_receipts: 200,
      observed_daily_receipts: 2200,
    }],
  },
  cdmLoop: {
    label: "🏧 CDM -> UPI Smurfing Loop",
    records: [
      { sender: "CDM-KIOSK-04", receiver: "FAKE-ACC-7A", amount: 9500, channel: "cdm", is_p2m: false, reference_id: "CDM/DEP/948102", timestamp: "2026-11-15T10:14:00Z", event_type: "cdm_cash_deposit" },
      { sender: "FAKE-ACC-7A", receiver: "CASHOUT-HUB", amount: 9400, channel: "upi", is_p2m: false, reference_id: "UPI/SWEEP/841029", timestamp: "2026-11-15T10:36:00Z", event_type: "rapid_upi_sweep" },
      { sender: "STUDENT-014", receiver: "PROVIDER-HARSH", amount: 250, channel: "physical-cash", is_p2m: false, reference_id: "CSH-STU-01", event_type: "student_handover" },
      { sender: "PROVIDER-HARSH", receiver: "FORT-ROAD-BAKERY", amount: 2000, channel: "shop-counter-cash", is_p2m: false, reference_id: "CSH-BAK-02", event_type: "counter_deposit" },
      { sender: "FORT-ROAD-BAKERY", receiver: "FAKE-ACC-7A", amount: 2000, channel: "merchant-settlement", is_p2m: false, reference_id: "STTL-03", event_type: "online_settlement" },
    ],
    merchant: [{
      merchant_alias: "FORT-ROAD-BAKERY",
      category: "Bakery & Sweets",
      usual_daily_receipts: 200,
      observed_daily_receipts: 2200,
    }],
  },
};

const VIEW_MODES = {
  all: { label: "All Network", labelMl: "എല്ലാം", key: "all" },
  direct: { label: "Direct Mules", labelMl: "വ്യാജ അക്കൗണ്ട്", key: "direct" },
  candy: { label: "Shop QR", labelMl: "കടകൾ", key: "candy" },
  cdmLoop: { label: "ATM Loop", labelMl: "എ.ടി.എം. ലൂപ്പ്", key: "cdmLoop" },
  cashLaundering: { label: "Cash Stash", labelMl: "പണമിടപാട്", key: "cashLaundering" },
};

const SIMULATION_SCRIPTS = {
  cdmLoop: [
    { edgeId: "CDM-KIOSK-04->FAKE-ACC-7A", narration: "Step 1 of 3: Suspicious structured cash deposit of ₹9,500 injected at CDM Kiosk 04 (under ₹10k CTR limit).", sound: "alert" },
    { edgeId: "FAKE-ACC-7A->CASHOUT-HUB", narration: "Step 2 of 3: Rapid Smurfing Sweep! 22 minutes later, ₹9,400 drained via UPI to Final Cashout Hub.", sound: "alert" },
    { edgeId: "FORT-ROAD-BAKERY->FAKE-ACC-7A", narration: "Step 3 of 3: Commingled bakery counter cash also channeled into Fake Acc 7A mule.", sound: "success" },
  ],
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
  cashLaundering: [
    { edgeId: "STUDENT-014->PROVIDER-HARSH", narration: "Step 1 of 6: Student-014 hands over ₹250 cash to Provider.", sound: "click" },
    { edgeId: "STUDENT-028->PROVIDER-HARSH", narration: "Step 2 of 6: Student-028 hands over ₹500 cash to Provider.", sound: "click" },
    { edgeId: "STUDENT-031->PROVIDER-HARSH", narration: "Step 3 of 6: Student-031 hands over ₹750 cash (provider saves until ₹2,000 stash).", sound: "alert" },
    { edgeId: "PROVIDER-HARSH->FORT-ROAD-BAKERY", narration: "Step 4 of 6: Provider drops ₹2,000 pooled cash at Fort Road Bakery counter.", sound: "alert" },
    { edgeId: "FORT-ROAD-BAKERY->ALT-ACC-7A", narration: "Step 5 of 6: Bakery deposits cash & sends ₹2,000 UPI online transfer to Alt Account.", sound: "alert" },
    { edgeId: "ALT-ACC-7A->MAIN-CASHOUT-HUB", narration: "Step 6 of 6: Alt Account forwards all ₹2,000 into the Final Cashout Hub.", sound: "success" },
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
function OfficialTopologyGraph({ trace, privacy, onSelectNode, selectedNode, activeHighlightEdge, onLoadDemo, isAnalyzing = false }) {
  const [minAmount, setMinAmount] = useState(0);
  const [animateParticles, setAnimateParticles] = useState(true);

  const nodes = trace.nodes ?? [];
  const edges = trace.edges ?? [];

  const nodeMoneyMap = useMemo(() => {
    const map = new Map();
    edges.forEach((e) => {
      const amt = Number(e.amount) || 0;
      const src = map.get(e.source) || { inAmount: 0, outAmount: 0, inCount: 0, outCount: 0 };
      src.outAmount += amt;
      src.outCount += 1;
      map.set(e.source, src);

      const tgt = map.get(e.target) || { inAmount: 0, outAmount: 0, inCount: 0, outCount: 0 };
      tgt.inAmount += amt;
      tgt.inCount += 1;
      map.set(e.target, tgt);
    });
    return map;
  }, [edges]);

  const { positions, hasProvider } = useMemo(() => {
    const incomingMap = new Map();
    const outgoingMap = new Map();

    edges.forEach((e) => {
      incomingMap.set(e.target, (incomingMap.get(e.target) || 0) + 1);
      outgoingMap.set(e.source, (outgoingMap.get(e.source) || 0) + 1);
    });

    const hasProvider = nodes.some((n) => n.id.includes("PROVIDER") || n.id.includes("HANDLER") || n.id.includes("AGENT"));

    if (hasProvider) {
      // 5-Tier layout: Students -> Provider -> Shop/Bakery -> Fake Acc / Mule -> Hub
      const tier0 = []; // Students (inCount === 0)
      const tier1 = []; // Provider / Handler
      const tier2 = []; // Shop / Bakery / Merchant
      const tier3 = []; // Mule / Alt Acc / Fake Acc
      const tier4 = []; // Destination Hub (outCount === 0)

      nodes.forEach((node) => {
        const inCount = incomingMap.get(node.id) || 0;
        const outCount = outgoingMap.get(node.id) || 0;
        const isProv = node.id.includes("PROVIDER") || node.id.includes("HANDLER") || node.id.includes("AGENT");
        const isShop = node.id.includes("BAKERY") || node.id.includes("SHOP") || node.id.includes("CANTEEN") || node.id.includes("MERCHANT");
        const isDest = node.role === "destination" || (outCount === 0 && inCount > 0) || node.id.includes("HUB") || node.id.includes("CASHOUT");

        if (isProv) {
          tier1.push(node);
        } else if (isDest) {
          tier4.push(node);
        } else if (isShop) {
          tier2.push(node);
        } else if (inCount === 0) {
          tier0.push(node);
        } else {
          tier3.push(node);
        }
      });

      const groups = [tier0, tier1, tier2, tier3, tier4];
      const pos = new Map();
      const svgHeight = 310;
      const tierX = [75, 235, 395, 560, 730];

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

      return { positions: pos, hasProvider: true };
    }

    // Standard 4-Tier layout
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

    return { positions: pos, hasProvider: false };
  }, [nodes, edges]);

  const filteredEdges = useMemo(() => {
    return edges.filter((e) => e.amount >= minAmount);
  }, [edges, minAmount]);

  function getNodeStyle(node) {
    const isProvider = node.id.includes("PROVIDER") || node.id.includes("HANDLER") || node.id.includes("AGENT");
    if (isProvider) {
      return {
        fill: "url(#providerGrad)",
        stroke: "#f59e0b",
        glow: "url(#glowAmber)",
        textFill: "#d97706",
        badgeBg: "#fef3c7",
        icon: "🎒",
      };
    }
    const isCdm = node.id.includes("CDM") || node.role === "cdm";
    if (isCdm) {
      return {
        fill: "url(#cdmGrad)",
        stroke: "#ea580c",
        glow: "url(#glowOrange)",
        textFill: "#c2410c",
        badgeBg: "#ffedd5",
        icon: "🏧",
      };
    }
    const isDestination = node.role === "destination" || node.outgoing === 0 || node.id.includes("HUB") || node.id.includes("CASHOUT");
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
    const isMerchant = node.id.includes("BAKERY") || node.id.includes("MERCHANT") || node.id.includes("SETTLE") || node.id.includes("CANTEEN") || node.id.includes("SHOP");
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
    const isFakeAcc = node.role === "possible-convergence" || node.incoming >= 2 || node.id.includes("FAKE-ACC") || node.id.includes("MULE") || node.id.includes("ALT-ACC") || node.is_cdm_loop;
    if (isFakeAcc) {
      return {
        fill: node.is_cdm_loop ? "url(#cdmLoopGrad)" : "url(#fakeAccGrad)",
        stroke: node.is_cdm_loop ? "#ea580c" : "#ef4444",
        glow: node.is_cdm_loop ? "url(#glowOrange)" : "url(#glowRed)",
        textFill: node.is_cdm_loop ? "#9a3412" : "#dc2626",
        badgeBg: node.is_cdm_loop ? "#ffedd5" : "#fee2e2",
        icon: node.is_cdm_loop ? "🏧⚠️" : "⚠️",
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
        {isAnalyzing && <div className="radar-scan-beam" />}
        {isAnalyzing && (
          <div className="topology-analyzing-hud">
            <div className="hud-radar-pulse" />
            <div className="hud-text-col">
              <div className="hud-title-row">
                <Scan size={14} className="spin-slow text-sky" />
                <b>FORENSIC TRACE ENGINE ACTIVE</b>
              </div>
              <span>Tracing money flow pathways, detecting fake accounts &amp; analyzing cashout hubs...</span>
            </div>
          </div>
        )}
        <div className="tier-stage-labels">
          {hasProvider ? (
            <>
              <span className="tier-badge-label blue"><span className="tier-dot blue" /> STEP 1 · STUDENTS</span>
              <span className="tier-badge-label amber" style={{ background: "#fef3c7", color: "#b45309", borderColor: "#fde68a" }}><span className="tier-dot amber" style={{ background: "#f59e0b" }} /> STEP 2 · PROVIDER / CASH POOL</span>
              <span className="tier-badge-label green"><span className="tier-dot green" /> STEP 3 · SHOPS &amp; QR</span>
              <span className="tier-badge-label red"><span className="tier-dot red" /> STEP 4 · ALT ACCS (MULES)</span>
              <span className="tier-badge-label purple"><span className="tier-dot purple" /> STEP 5 · CASHOUT HUB</span>
            </>
          ) : (
            <>
              <span className="tier-badge-label blue"><span className="tier-dot blue" /> STEP 1 · STUDENTS</span>
              <span className="tier-badge-label green"><span className="tier-dot green" /> STEP 2 · SHOPS &amp; QR</span>
              <span className="tier-badge-label red"><span className="tier-dot red" /> STEP 3 · FAKE ACCS (MULES)</span>
              <span className="tier-badge-label purple"><span className="tier-dot purple" /> STEP 4 · FINAL CASHOUT HUB</span>
            </>
          )}
        </div>

        <div className="mobile-map-pan-hint">
          <span>↔ Swipe map horizontally to explore all 4 steps</span>
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
            </div>
          </div>
        ) : (
        <div className="topology-svg-scroll-container">
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
            <linearGradient id="providerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#fde68a" />
            </linearGradient>
            <linearGradient id="cdmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff7ed" />
              <stop offset="100%" stopColor="#fed7aa" />
            </linearGradient>
            <linearGradient id="cdmLoopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffedd5" />
              <stop offset="100%" stopColor="#fed7aa" />
            </linearGradient>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.55" />
            </filter>
            <filter id="glowOrange" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#f97316" floodOpacity="0.65" />
            </filter>

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
            <linearGradient id="tierColProvider" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(245, 158, 11, 0.09)" />
              <stop offset="100%" stopColor="rgba(245, 158, 11, 0.02)" />
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
          {hasProvider ? (
            <>
              <rect x="15" y="10" width="135" height="290" rx="12" fill="url(#tierColStudent)" stroke="rgba(56, 189, 248, 0.18)" strokeWidth="1" />
              <rect x="170" y="10" width="135" height="290" rx="12" fill="url(#tierColProvider)" stroke="rgba(245, 158, 11, 0.18)" strokeWidth="1" />
              <rect x="325" y="10" width="145" height="290" rx="12" fill="url(#tierColShop)" stroke="rgba(16, 185, 129, 0.18)" strokeWidth="1" />
              <rect x="490" y="10" width="145" height="290" rx="12" fill="url(#tierColFakeAcc)" stroke="rgba(239, 68, 68, 0.18)" strokeWidth="1" />
              <rect x="655" y="10" width="155" height="290" rx="12" fill="url(#tierColHub)" stroke="rgba(139, 92, 246, 0.18)" strokeWidth="1" />
            </>
          ) : (
            <>
              <rect x="25" y="10" width="165" height="290" rx="14" fill="url(#tierColStudent)" stroke="rgba(56, 189, 248, 0.18)" strokeWidth="1" />
              <rect x="235" y="10" width="165" height="290" rx="14" fill="url(#tierColShop)" stroke="rgba(16, 185, 129, 0.18)" strokeWidth="1" />
              <rect x="445" y="10" width="165" height="290" rx="14" fill="url(#tierColFakeAcc)" stroke="rgba(239, 68, 68, 0.18)" strokeWidth="1" />
              <rect x="655" y="10" width="150" height="290" rx="14" fill="url(#tierColHub)" stroke="rgba(139, 92, 246, 0.18)" strokeWidth="1" />
            </>
          )}

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

                {/* Glowing alert radar pulse rings for CDM Smurfing Loop */}
                {node.is_cdm_loop && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="34"
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="2.5"
                    strokeDasharray="4 3"
                    className="cdm-pulse-ring"
                  />
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

                {/* Stats badge pill showing exact currency amount */}
                {(() => {
                  const nodeCalc = nodeMoneyMap.get(node.id) || { inAmount: 0, outAmount: 0, inCount: 0, outCount: 0 };
                  const totalReceived = node.total_received !== undefined ? node.total_received : nodeCalc.inAmount;
                  const totalSent = node.total_sent !== undefined ? node.total_sent : nodeCalc.outAmount;
                  const inCount = node.incoming !== undefined ? node.incoming : nodeCalc.inCount;
                  const outCount = node.outgoing !== undefined ? node.outgoing : nodeCalc.outCount;

                  let badgeText = "";
                  if (outCount === 0 && inCount > 0) {
                    badgeText = `Recv ${money(totalReceived)}`;
                  } else if (inCount === 0 && outCount > 0) {
                    badgeText = `Sent ${money(totalSent)}`;
                  } else if (totalReceived > 0 && totalSent > 0) {
                    if (totalReceived === totalSent) {
                      badgeText = `Vol ${money(totalSent)}`;
                    } else {
                      badgeText = `↓${money(totalReceived)} ↑${money(totalSent)}`;
                    }
                  } else if (totalReceived > 0) {
                    badgeText = `Recv ${money(totalReceived)}`;
                  } else if (totalSent > 0) {
                    badgeText = `Sent ${money(totalSent)}`;
                  } else {
                    badgeText = money(0);
                  }

                  const pillWidth = Math.max(54, Math.min(115, badgeText.length * 6.5 + 16));

                  return (
                    <>
                      <rect
                        x={pos.x - pillWidth / 2}
                        y={pos.y + 49}
                        width={pillWidth}
                        height="15"
                        rx="4"
                        fill={style.badgeBg || "#f1f5f9"}
                        stroke={style.stroke}
                        strokeWidth="0.6"
                        strokeOpacity="0.4"
                      />
                      <text x={pos.x} y={pos.y + 60} textAnchor="middle" className="node-stats-text" fill={style.textFill}>
                        {badgeText}
                      </text>
                    </>
                  );
                })()}
              </g>
            );
          })}
        </svg>
        </div>
        )}
      </div>

      {/* FOOTER LEGEND */}
      <div className="graph-footer-row">
        <div className="legend-pills-wrap">
          <span className="legend-chip"><span className="chip-dot blue" /> Normal Senders</span>
          <span className="legend-chip"><span className="chip-dot yellow" /> Shops & QR Codes</span>
          <span className="legend-chip"><span className="chip-dot red" /> Fake Account (Mule)</span>
          <span className="legend-chip" style={{ background: "#ffedd5", borderColor: "#fed7aa", color: "#9a3412" }}><span className="chip-dot amber" style={{ background: "#ea580c" }} /> 🏧 CDM Loop Mule</span>
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
  const [isHashing, setIsHashing] = useState(false);
  const [capturedAt, setCapturedAt] = useState("");
  
  // Section 105 BNSS Mandatory Video Capture
  const [videoFile, setVideoFile] = useState(null);
  const [videoDigest, setVideoDigest] = useState("");
  const [isVideoHashing, setIsVideoHashing] = useState(false);
  const [videoCapturedAt, setVideoCapturedAt] = useState("");

  const [coordinates, setCoordinates] = useState(null);
  const [officer, setOfficer] = useState("OFFICER-DEMO-01");
  const [officerDesignation, setOfficerDesignation] = useState("Inspector / Excise Circle Officer");
  const [deviceModel, setDeviceModel] = useState("Apple iPhone 14 / Police Digital Ev Cam");
  const [caseLabel, setCaseLabel] = useState("CR-2026-TOOFAN-01");
  
  // BNSS 2023, BSA 2023 & NDPS Statutory Checklist
  const [checklist, setChecklist] = useState({
    sec42_written_grounds: true,
    sec42_dispatch_72h: true,
    sec50_magistrate_option: true,
    sec52a_magistrate_inventory: true,
    sec105_bnss_videography: true,
    sec100_bnss_witness: true,
  });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [vaultEntries, setVaultEntries] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState("capture");

  // Camera states and refs
  const [showCamera, setShowCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("environment");
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    loadVault();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function startCamera(facing = cameraFacing) {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(true);
    setCameraError("");

    try {
      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      sounds.playClick();
    } catch (err) {
      console.warn("Primary camera access failed, trying fallback:", err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play();
        }
      } catch (err2) {
        setCameraError("Camera unavailable or permission denied. Please allow camera permissions in your browser or choose a photo file.");
      }
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCameraError("");
  }

  function switchCameraFacing() {
    sounds.playClick();
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    sounds.playClick();

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const filename = `photo-evidence-${Date.now()}.jpg`;
      const previewUrl = URL.createObjectURL(blob);
      await hashBlob(blob, filename, previewUrl);
      captureGeolocation();
      stopCamera();
      sounds.playPaySuccess();
      setNotice("Evidence photo captured and fingerprinted with SHA-256 and GPS timestamp.");
    }, "image/jpeg", 0.92);
  }

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
    setIsHashing(true);
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
    setTimeout(() => setIsHashing(false), 700);
  }

  async function hashVideoBlob(blob, name) {
    if (!globalThis.crypto?.subtle) {
      throw new Error("Web Crypto unavailable. Please use modern browser.");
    }
    setIsVideoHashing(true);
    const bytes = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(hashBuffer), (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");

    setVideoFile(name);
    setVideoDigest(hex);
    setVideoCapturedAt(new Date().toISOString());
    sounds.playClick();
    setNotice("Section 105 BNSS Seizure Video SHA-256 digest computed successfully.");
    setTimeout(() => setIsVideoHashing(false), 700);
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

  async function handleVideoChoose(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    try {
      await hashVideoBlob(selected, selected.name);
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function generateSyntheticVideo() {
    // Generate practice binary block representing 30s body-cam MP4 recording
    const fakeVideoBuffer = new Uint8Array(2048);
    crypto.getRandomValues(fakeVideoBuffer);
    const blob = new Blob([fakeVideoBuffer], { type: "video/mp4" });
    await hashVideoBlob(blob, `sec105-bnss-search-${Date.now()}.mp4`);
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
  const checklistPercent = Math.round((checklistScore / 6) * 100);

  async function handleSaveAndExport() {
    if (!digest) {
      setNotice("Please select or generate a photo evidence specimen first.");
      return;
    }
    if (checklistPercent < 100) {
      setNotice("Please confirm all 6 statutory checklist items (NDPS + BNSS) before generating PDF.");
      return;
    }

    setBusy(true);
    setNotice("Generating court-ready Remand Memo & Section 63 BSA 2023 Certificate...");
    const newEntry = {
      id: crypto.randomUUID(),
      file,
      sha256: digest,
      video_filename: videoFile,
      video_sha256: videoDigest,
      captured_at: capturedAt,
      coordinates,
      officer_id: officer,
      officer_designation: officerDesignation,
      device_make_model: deviceModel,
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
            officer_designation: officerDesignation,
            device_make_model: deviceModel,
            video_sha256: videoDigest || null,
            video_filename: videoFile || null,
            checklist,
          },
        }),
      });

      if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Remand-Memo-BSA63-${caseLabel}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      sounds.playCashRegister();
      setNotice("Court-ready Remand Memo with Sec 63 BSA 2023 Electronic Evidence Certificate downloaded!");
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

            <div className="clean-fields-pair" style={{ marginTop: "8px" }}>
              <div className="input-field-group">
                <label>Officer Designation</label>
                <input
                  value={officerDesignation}
                  onChange={(e) => setOfficerDesignation(e.target.value)}
                  placeholder="e.g. Inspector / Excise Circle Officer"
                />
              </div>
              <div className="input-field-group">
                <label>Evidence Capture Device (Make / Model)</label>
                <input
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  placeholder="e.g. Apple iPhone 14 / Police Sec-105 Unit"
                />
              </div>
            </div>

            <div className="specimen-drop-box">
              {filePreview ? (
                <div className="specimen-preview-box">
                  <div className="specimen-image-container">
                    <img src={filePreview} alt="Specimen Thumbnail" className="specimen-thumbnail" />
                    {isHashing && <div className="laser-hashing-scanner-beam" />}
                    {isHashing && (
                      <div className="laser-hashing-badge">
                        <Fingerprint size={15} className="spin-slow" />
                        <span>COMPUTING SHA-256 DIGITAL FINGERPRINT...</span>
                      </div>
                    )}
                  </div>
                  <div className="specimen-name-badge">
                    <div className="specimen-name-left">
                      <b>{file}</b>
                      <small>Fingerprinted locally on your device · 100% private</small>
                    </div>
                    <button
                      type="button"
                      className="btn-retake-camera"
                      onClick={() => startCamera()}
                      title="Retake photo with camera"
                    >
                      <Camera size={13} />
                      <span>Retake</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="specimen-placeholder-prompt">
                  <div className="placeholder-icon-cluster">
                    <Camera size={26} className="text-emerald" />
                    <Upload size={24} className="text-google-blue" />
                  </div>
                  <b>Take a Live Photo or Upload Evidence File</b>
                  <p>Snap evidence using your device camera or choose a photo file (PNG, JPG, SVG).</p>
                </div>
              )}

              <div className="specimen-btn-row">
                <button
                  type="button"
                  className="btn-specimen-camera"
                  onClick={() => startCamera()}
                  title="Open Camera & Snap Photo"
                >
                  <Camera size={15} />
                  <span>Take Live Photo</span>
                </button>
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

            {/* MANDATORY SECTION 105 BNSS SEIZURE VIDEOGRAPHY */}
            <div className="video-evidence-strip" style={{ marginTop: "14px", padding: "12px", background: "rgba(15, 23, 42, 0.03)", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Video size={16} className="text-blue-600" />
                  <b style={{ fontSize: "13px" }}>Section 105 BNSS Mandated Seizure Video</b>
                </div>
                <span className="demo-rule-badge" style={{ fontSize: "10px", background: "#dbeafe", color: "#1e40af", borderColor: "#bfdbfe" }}>
                  MANDATORY VIDEOGRAPHY
                </span>
              </div>
              <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#64748b" }}>
                Section 105 BNSS, 2023 mandates uninterrupted audio-video recording of search, seizure, and inventory preparation.
              </p>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <label className="btn-specimen-primary" style={{ padding: "6px 12px", fontSize: "12px" }}>
                  <Video size={13} />
                  <span>{videoFile ? "Change Video File" : "Upload Seizure Video"}</span>
                  <input type="file" accept="video/*" onChange={handleVideoChoose} hidden />
                </label>
                <button
                  type="button"
                  className="btn-specimen-outline"
                  style={{ padding: "6px 12px", fontSize: "12px" }}
                  onClick={generateSyntheticVideo}
                >
                  <Sparkles size={13} />
                  <span>Generate Practice Video (Sec 105)</span>
                </button>
              </div>

              {videoDigest && (
                <div className="digest-display-strip" style={{ marginTop: "8px", background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                  <CheckCircle2 size={16} className="text-emerald" />
                  <div className="digest-copy">
                    <span className="digest-label" style={{ color: "#166534" }}>VIDEO SHA-256 (SEC 105 BNSS):</span>
                    <code style={{ color: "#15803d" }}>{videoDigest}</code>
                  </div>
                  <button
                    className="btn-copy-digest"
                    onClick={() => {
                      navigator.clipboard.writeText(videoDigest);
                      sounds.playClick();
                      setNotice("Video SHA-256 copied to clipboard!");
                    }}
                    title="Copy Video Hash"
                  >
                    <Copy size={13} />
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
                <h4>BNSS 2023 & NDPS Statutory Checklist</h4>
                <p>Complete mandatory statutory requirements under NDPS, BNSS 2023, and BSA 2023</p>
              </div>
            </div>

            <div className="compliance-meter-box">
              <div className="meter-labels">
                <span>Statutory Compliance Score</span>
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
                ["sec42_written_grounds", "Section 42 NDPS: Written grounds of belief recorded prior to entry & search"],
                ["sec42_dispatch_72h", "Section 42(2) NDPS: Grounds dispatched to official superior within 72 hours"],
                ["sec50_magistrate_option", "Section 50 NDPS: Written notice informing right to search before Gazetted Officer / Magistrate"],
                ["sec52a_magistrate_inventory", "Section 52A NDPS: Seizure inventory prepared for Magistrate certification & chemical sampling"],
                ["sec105_bnss_videography", "Section 105 BNSS, 2023: Audio-video recording of search & seizure cryptographically hashed"],
                ["sec100_bnss_witness", "Section 100 BNSS: Search conducted in presence of two independent local witnesses with signed panchnama"],
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

            {/* SECTION 63 BSA 2023 STATUTORY CERTIFICATE CARD */}
            <div style={{ marginTop: "12px", marginBottom: "12px", padding: "10px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "11px", color: "#334155", lineHeight: "1.5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
                <Scale size={14} className="text-blue-700" />
                <span>Section 63 Bharatiya Sakshya Adhiniyam (BSA), 2023 Certificate</span>
              </div>
              <span>
                Replaces repealed Section 65B of Indian Evidence Act. The auto-generated Remand Memo embeds an immutable electronic evidence certificate with device metadata, officer declaration, and SHA-256 hashes.
              </span>
            </div>

            <button
              className={`btn-export-pdf-official ${busy ? "is-exporting" : ""}`}
              onClick={handleSaveAndExport}
              disabled={busy}
            >
              {busy ? <Loader2 size={17} className="spin-fast" /> : <FileDown size={17} />}
              <span>{busy ? "Compiling Sec 63 BSA 2023 Certificate & PDF..." : "Generate Court-Ready Remand Memo (BSA 2023)"}</span>
              {!busy && <ChevronRight size={16} />}
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

      {/* CAMERA VIEWFINDER MODAL */}
      {showCamera && (
        <div className="sheet-backdrop-overlay" onClick={stopCamera}>
          <div className="evidence-camera-modal" onClick={(e) => e.stopPropagation()}>
            <div className="camera-modal-header">
              <div className="camera-live-indicator">
                <span className="live-camera-pulse-dot" />
                <b>EVIDENCE CAMERA</b>
                <span className="camera-spec-pill">LIVE VIEWFINDER</span>
              </div>
              <button className="btn-close-camera" onClick={stopCamera} title="Close Camera">
                <X size={18} />
              </button>
            </div>

            <div className="camera-viewfinder-box">
              {cameraError ? (
                <div className="camera-error-banner">
                  <AlertCircle size={32} className="text-red" />
                  <b>Camera Permission Needed</b>
                  <p>{cameraError}</p>
                  <div className="camera-error-actions">
                    <button className="btn-camera-retry" onClick={() => startCamera()}>
                      <RotateCcw size={13} />
                      <span>Try Again</span>
                    </button>
                    <label className="btn-camera-upload-fallback">
                      <Camera size={13} />
                      <span>Use Mobile Camera</span>
                      <input type="file" accept="image/*" capture="environment" onChange={handleFileChoose} hidden />
                    </label>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-video-element"
                  />
                  {/* VIEWFINDER TARGET CORNERS & GRID */}
                  <div className="camera-crosshairs-grid">
                    <div className="target-corner tl" />
                    <div className="target-corner tr" />
                    <div className="target-corner bl" />
                    <div className="target-corner br" />
                    <div className="viewfinder-center-crosshair">+</div>
                  </div>
                  <div className="camera-telemetry-overlay">
                    <span>CASE: {caseLabel}</span>
                    <span>TIMESTAMP: {new Date().toLocaleTimeString()}</span>
                  </div>
                </>
              )}
            </div>

            {!cameraError && (
              <div className="camera-controls-bottom-bar">
                <button
                  type="button"
                  className="btn-flip-camera"
                  onClick={switchCameraFacing}
                  title="Switch front / rear camera"
                >
                  <SwitchCamera size={18} />
                  <span>Flip</span>
                </button>

                <button
                  type="button"
                  className="btn-shutter-snap"
                  onClick={capturePhoto}
                  title="Capture Photo Specimen"
                >
                  <div className="shutter-inner-ring">
                    <Camera size={26} />
                  </div>
                </button>

                <button type="button" className="btn-cancel-camera" onClick={stopCamera}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// SIMPLIFIED TRANSACTION FORENSICS LEDGER
// ----------------------------------------------------
function OfficialTransactionLedger({ transactions, privacy, onReset, onLoadDemo, onOpenSec94 }) {
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
              <th>STATUTORY ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-table-cell">
                  <div className="empty-ledger-box">
                    <div className="empty-ledger-icon">
                      <Landmark size={24} />
                    </div>
                    <b>No Transactions Recorded</b>
                    <p>All transactions have been reset to 0. Click below to load sample investigation records.</p>
                    <div className="empty-state-actions-cluster">
                      {onLoadDemo && (
                        <button className="btn-empty-load-demo" onClick={onLoadDemo}>
                          <Play size={13} />
                          <span>Load Sample Transactions</span>
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
                  <td>
                    <button
                      className="btn-sec94-inline"
                      onClick={() => {
                        sounds.playClick();
                        if (onOpenSec94) {
                          onOpenSec94({
                            targetId: tx.receiver,
                            targetType: tx.receiver.includes("BAKERY") || tx.receiver.includes("SHOP") ? "shop_qr" : "upi_vpa",
                            transactionRef: tx.reference_id,
                            amount: tx.amount,
                          });
                        }
                      }}
                      title="Generate statutory Section 94 BNSS Police Requisition for this account"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "4px 8px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                        borderRadius: "5px",
                        cursor: "pointer",
                        whiteSpace: "nowrap"
                      }}
                    >
                      <FileText size={11} />
                      <span>Sec 94 Notice</span>
                    </button>
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
  // Role-Based Privacy under Section 74 Juvenile Justice Act, 2015
  // "analyst" = DANSAF / Excise Analyst (Minors pseudonymised to STU-TOKEN-XXXX)
  // "counsellor" = CWC / Vimukthi Counsellor (Decrypted for rehabilitation routing)
  const [appRole, setAppRole] = useState("analyst");
  const privacy = appRole === "analyst";

  // Section 94 BNSS Bank Notice & Front-Shop Stock Auditor Modals
  const [showSec94Modal, setShowSec94Modal] = useState(false);
  const [sec94Target, setSec94Target] = useState(null);
  const [showAuditorModal, setShowAuditorModal] = useState(false);

  function handleOpenSec94(target) {
    sounds.playClick();
    setSec94Target(target || { targetId: "FAKE-ACC-7A", targetType: "upi_vpa", amount: 5600 });
    setShowSec94Modal(true);
  }

  function handleOpenAuditor() {
    sounds.playClick();
    setShowAuditorModal(true);
  }

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

  const [activeTab, setActiveTab] = useState("overview"); // overview | scanner | cash | gpay | evidence | ledger

  // Interactive Simulators (Google Pay & Cash to Shop) Toggle Switch
  const [showSimulators, setShowSimulators] = useState(() => {
    try {
      return localStorage.getItem("toofan_show_simulators") === "true";
    } catch {
      return false;
    }
  });

  function handleToggleSimulators(forceVal) {
    setShowSimulators((prev) => {
      const nextVal = typeof forceVal === "boolean" ? forceVal : !prev;
      try {
        localStorage.setItem("toofan_show_simulators", String(nextVal));
      } catch {}
      if (!nextVal && (activeTab === "gpay" || activeTab === "cash")) {
        setActiveTab("overview");
      }
      return nextVal;
    });
  }
  const [selectedLaunderingShop, setSelectedLaunderingShop] = useState("FORT-ROAD-BAKERY");
  const [selectedNode, setSelectedNode] = useState(null);

  // Malayalam (ml) / English (en) Language Mode
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("toofan_app_lang") || "en";
    } catch {
      return "en";
    }
  });
  const t = translations[lang] || translations.en;

  function toggleLanguage() {
    sounds.playClick();
    const nextLang = lang === "en" ? "ml" : "en";
    setLang(nextLang);
    try {
      localStorage.setItem("toofan_app_lang", nextLang);
    } catch {}
  }

  // Kerala Police Officer Authentication
  const [policeUser, setPoliceUser] = useState(() => {
    try {
      const raw = localStorage.getItem("toofan_police_user");
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Cross-Device Real-Time Cloud Sync State
  const [syncStatus, setSyncStatus] = useState({ connected: false, devices: 1 });
  const [liveSyncToast, setLiveSyncToast] = useState(null);

  function handlePoliceSignIn(officer) {
    setPoliceUser(officer);
    try {
      localStorage.setItem("toofan_police_user", JSON.stringify(officer));
    } catch {}
  }

  function handlePoliceSignOut() {
    setPoliceUser(null);
    try {
      localStorage.removeItem("toofan_police_user");
    } catch {}
  }
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [viewMode, setViewMode] = useState("all"); // all | direct | candy | cashDeposit
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simStepIndex, setSimStepIndex] = useState(0);
  const [resetToast, setResetToast] = useState(false);

  const activeScript = SIMULATION_SCRIPTS[viewMode] || SIMULATION_SCRIPTS.burst;
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
      await syncClient.sendReset();
    } catch {}
    setTransactions([]);
    setTrace(emptyTrace);
    setSelectedNode(null);
    setSimulating(false);
    setSimStepIndex(0);
    setViewMode("all");
    setResetToast(true);
    setTimeout(() => setResetToast(false), 4500);
  }

  async function handleAddTransactions(newTxList, merchantObservations = []) {
    sounds.playPaySuccess();
    const updated = [...newTxList, ...transactions];
    setTransactions(updated);
    setViewMode("all");

    const payload = {
      createdAt: new Date().toISOString(),
      transactions: updated,
      merchantObservations,
      isReset: false,
    };
    localStorage.setItem(BRIDGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("toofan-tx-update", { detail: payload }));

    // Real-time broadcast to mobile phones, laptops, and all connected devices
    try {
      await syncClient.sendTransactions(newTxList, "web");
    } catch {}

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

  function handleSelectViewMode(modeKey) {
    sounds.playClick();
    setIsAnalyzing(true);
    setViewMode(modeKey);
    setSimStepIndex(0);
    setSimulating(false);
    setSelectedNode(null);
    setTimeout(() => setIsAnalyzing(false), 550);
  }

  async function handleLoadSampleData(sKey = "burst") {
    sounds.playClick();
    setIsAnalyzing(true);
    const scenario = SCENARIOS[sKey] || SCENARIOS.burst;
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
    
    // Broadcast sample scenario to all connected devices
    try {
      await syncClient.sendLoadSample(sKey);
    } catch {}

    await broadcast(records, merchantObs);
    setViewMode(sKey === "candy" ? "candy" : sKey === "direct" ? "direct" : sKey === "cashDeposit" ? "cashDeposit" : sKey === "cashLaundering" ? "cashLaundering" : "all");
    setResetToast(false);
    setTimeout(() => setIsAnalyzing(false), 650);
  }

  function handleRestoreDemo() {
    handleLoadSampleData(viewMode === "all" ? "burst" : viewMode);
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

  function toggleSimulation() {
    if (transactions.length === 0) {
      sounds.playClick();
      handleLoadSampleData(viewMode === "all" ? "burst" : viewMode);
      setTimeout(() => {
        setSimStepIndex(0);
        setSimulating(true);
      }, 400);
      return;
    }
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

  const displayTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    if (viewMode === "all" || !viewMode) return transactions;
    if (viewMode === "direct") {
      return transactions.filter((t) => !t.is_p2m && (t.receiver.includes("FAKE-ACC") || t.receiver.includes("MULE") || t.channel === "transfer" || t.channel === "upi"));
    }
    if (viewMode === "candy") {
      return transactions.filter((t) => t.is_p2m || t.channel?.includes("settle") || t.sender.includes("BAKERY") || t.receiver.includes("BAKERY") || t.sender.includes("MERCHANT") || t.receiver.includes("MERCHANT"));
    }
    if (viewMode === "cdmLoop") {
      return transactions.filter((t) => t.channel === "cdm" || t.sender.includes("CDM") || t.receiver.includes("CDM") || t.reference_id?.includes("CDM") || t.reference_id?.includes("SWEEP") || t.receiver === "FAKE-ACC-7A" || t.sender === "FAKE-ACC-7A");
    }
    if (viewMode === "cashDeposit" || viewMode === "cashLaundering") {
      return transactions.filter((t) => t.channel?.includes("cash") || t.amount >= 1500 || t.channel?.includes("settle") || t.sender.includes("PROVIDER") || t.receiver.includes("PROVIDER"));
    }
    return transactions;
  }, [transactions, viewMode]);

  const displayTrace = useMemo(() => {
    if (!trace || (!trace.nodes?.length && !trace.edges?.length)) {
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

    let activeEdges = trace.edges || [];
    let activeNodes = trace.nodes || [];
    let activePaths = trace.paths || [];

    if (viewMode === "direct") {
      activeEdges = (trace.edges || []).filter((e) => !e.is_p2m && !e.source.includes("BAKERY") && !e.source.includes("MERCHANT"));
      const nodeIds = new Set();
      activeEdges.forEach((e) => { nodeIds.add(e.source); nodeIds.add(e.target); });
      activeNodes = (trace.nodes || []).filter((n) => nodeIds.has(n.id));
      activePaths = (trace.paths || []).filter((p) => !p.some((id) => id.includes("BAKERY") || id.includes("MERCHANT")));
    } else if (viewMode === "candy") {
      activeEdges = (trace.edges || []).filter((e) => e.source.includes("BAKERY") || e.target.includes("BAKERY") || e.source.includes("MERCHANT") || e.target.includes("MERCHANT") || e.channel?.includes("settle") || e.is_p2m);
      const nodeIds = new Set();
      activeEdges.forEach((e) => { nodeIds.add(e.source); nodeIds.add(e.target); });
      activeNodes = (trace.nodes || []).filter((n) => nodeIds.has(n.id));
      activePaths = (trace.paths || []).filter((p) => p.some((id) => id.includes("BAKERY") || id.includes("MERCHANT")));
    } else if (viewMode === "cdmLoop") {
      activeEdges = (trace.edges || []).filter((e) => e.channel === "cdm" || e.source.includes("CDM") || e.target.includes("CDM") || e.source === "FAKE-ACC-7A" || e.target === "FAKE-ACC-7A" || e.target === "CASHOUT-HUB");
      const nodeIds = new Set();
      activeEdges.forEach((e) => { nodeIds.add(e.source); nodeIds.add(e.target); });
      activeNodes = (trace.nodes || []).filter((n) => nodeIds.has(n.id));
    } else if (viewMode === "cashDeposit" || viewMode === "cashLaundering") {
      activeEdges = (trace.edges || []).filter((e) => (e.amount || 0) >= 1500 || e.channel?.includes("cash") || e.source.includes("PROVIDER") || e.target.includes("PROVIDER") || e.source.includes("FORT-ROAD") || e.target.includes("FORT-ROAD"));
      const nodeIds = new Set();
      activeEdges.forEach((e) => { nodeIds.add(e.source); nodeIds.add(e.target); });
      activeNodes = (trace.nodes || []).filter((n) => nodeIds.has(n.id));
    }

    // Accurately compute exact money received & sent for each node from the active edges
    const enrichedNodes = activeNodes.map((node) => {
      const inAmt = activeEdges.filter((e) => e.target === node.id).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const outAmt = activeEdges.filter((e) => e.source === node.id).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const inCount = activeEdges.filter((e) => e.target === node.id).length;
      const outCount = activeEdges.filter((e) => e.source === node.id).length;
      return {
        ...node,
        total_received: inAmt,
        total_sent: outAmt,
        incoming: inCount,
        outgoing: outCount,
      };
    });

    return {
      ...trace,
      nodes: enrichedNodes,
      edges: activeEdges,
      paths: activePaths,
      transaction_count: activeEdges.length,
    };
  }, [trace, viewMode]);

  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const displayTotal = displayTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

  // True unique money volume tracked (net funds entering / reaching terminal destination)
  const trackedUniqueVolume = useMemo(() => {
    if (!displayTrace.edges || displayTrace.edges.length === 0) return 0;

    const outDegreeMap = new Map();
    const inAmountMap = new Map();
    displayTrace.edges.forEach((e) => {
      outDegreeMap.set(e.source, (outDegreeMap.get(e.source) || 0) + 1);
      inAmountMap.set(e.target, (inAmountMap.get(e.target) || 0) + (Number(e.amount) || 0));
    });

    // Check terminal destinations (CASHOUT-HUB, etc. where all gathered money lands)
    const sinkTotal = (displayTrace.nodes || [])
      .filter((n) => (outDegreeMap.get(n.id) || 0) === 0 && (inAmountMap.get(n.id) || 0) > 0)
      .reduce((sum, n) => sum + (inAmountMap.get(n.id) || 0), 0);

    if (sinkTotal && sinkTotal > 0) {
      return sinkTotal;
    }

    // Fallback: sum of origin accounts (students / cash depositors)
    const inDegreeMap = new Map();
    const outAmountMap = new Map();
    displayTrace.edges.forEach((e) => {
      inDegreeMap.set(e.target, (inDegreeMap.get(e.target) || 0) + 1);
      outAmountMap.set(e.source, (outAmountMap.get(e.source) || 0) + (Number(e.amount) || 0));
    });

    const sourceTotal = (displayTrace.nodes || [])
      .filter((n) => (inDegreeMap.get(n.id) || 0) === 0)
      .reduce((sum, n) => sum + (outAmountMap.get(n.id) || 0), 0);

    return sourceTotal || displayTotal;
  }, [displayTrace, displayTotal]);

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
          setViewMode("all");
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
          setViewMode("all");
        } else if (Array.isArray(e.detail.transactions)) {
          setTransactions(e.detail.transactions);
          if (e.detail.trace) setTrace(e.detail.trace);
          else if (e.detail.transactions.length > 0) void broadcast(e.detail.transactions);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("toofan-tx-update", handleCustom);

    // =======================================================================
    // REAL-TIME CROSS-DEVICE WEBSOCKET CLOUD SYNC INITIALIZATION
    // =======================================================================
    syncClient.connect();

    syncClient.fetchInitialState().then((state) => {
      if (state && Array.isArray(state.transactions)) {
        if (state.is_reset) {
          setTransactions([]);
          setTrace({
            nodes: [],
            edges: [],
            paths: [],
            candidates: [],
            merchant_alerts: [],
            excluded_p2m_count: 0,
            transaction_count: 0,
            notice: "All synthetic transactions and paths have been reset.",
          });
        } else {
          setTransactions(state.transactions);
          if (state.trace) setTrace(state.trace);
        }
        if (state.connected_devices !== undefined) {
          setSyncStatus((prev) => ({ ...prev, devices: state.connected_devices }));
        }
      }
    });

    const emptyTraceObj = {
      nodes: [],
      edges: [],
      paths: [],
      candidates: [],
      merchant_alerts: [],
      excluded_p2m_count: 0,
      transaction_count: 0,
      notice: "All transactions have been reset to zero.",
    };

    const unsubscribeSync = syncClient.subscribe((event, data) => {
      if (event === "SYNC_STATUS") {
        setSyncStatus({ connected: data.connected, devices: data.devices || 1 });
      } else if (event === "DEVICE_COUNT") {
        setSyncStatus((prev) => ({ ...prev, devices: data.connected_devices || 1 }));
      } else if (event === "INIT_STATE" || event === "SAMPLE_LOADED") {
        if (data.is_reset) {
          setTransactions([]);
          setTrace(emptyTraceObj);
          setViewMode("all");
          try {
            localStorage.setItem(BRIDGE_KEY, JSON.stringify({ isReset: true, transactions: [], trace: emptyTraceObj }));
          } catch {}
          return;
        }
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          if (data.trace) setTrace(data.trace);
          setViewMode("all");
          try {
            localStorage.setItem(BRIDGE_KEY, JSON.stringify({ isReset: false, transactions: data.transactions, trace: data.trace }));
          } catch {}
          if (event === "SAMPLE_LOADED") {
            setIsAnalyzing(true);
            setTimeout(() => setIsAnalyzing(false), 650);
          }
        }
      } else if (event === "TX_UPDATE") {
        if (data.is_reset) {
          setTransactions([]);
          setTrace(emptyTraceObj);
          setViewMode("all");
          try {
            localStorage.setItem(BRIDGE_KEY, JSON.stringify({ isReset: true, transactions: [], trace: emptyTraceObj }));
          } catch {}
          return;
        }

        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          if (data.trace) setTrace(data.trace);
          setViewMode("all");
          try {
            localStorage.setItem(BRIDGE_KEY, JSON.stringify({ isReset: false, transactions: data.transactions, trace: data.trace }));
          } catch {}

          // Visual scanner effect when payment arrives
          setIsAnalyzing(true);
          setTimeout(() => setIsAnalyzing(false), 850);

          if (data.new_transactions && data.new_transactions.length > 0) {
            const firstNew = data.new_transactions[0];
            sounds.playPaySuccess();
            setLiveSyncToast({
              sender: firstNew.sender,
              receiver: firstNew.receiver,
              amount: firstNew.amount,
              source: data.source || "mobile",
            });
            setTimeout(() => setLiveSyncToast(null), 5500);
          }
        }
      } else if (event === "RESET") {
        setTransactions([]);
        setTrace(emptyTraceObj);
        setViewMode("all");
        setResetToast(true);
        setTimeout(() => setResetToast(false), 4500);
        try {
          localStorage.setItem(BRIDGE_KEY, JSON.stringify({ isReset: true, transactions: [], trace: emptyTraceObj }));
        } catch {}
      }
    });

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("toofan-tx-update", handleCustom);
      unsubscribeSync();
    };
  }, []);

  const baseNavItems = [
    { key: "overview", label: lang === "ml" ? "പണവഴി ഭൂപടം" : "Money Flow Map", icon: Activity },
    { key: "scanner", label: lang === "ml" ? "ഷോപ്പ് സ്കാനർ" : "Shop Cash Scanner", icon: MapPin },
    { key: "evidence", label: lang === "ml" ? "തെളിവ് ശേഖരണം" : "Seizure Proof Vault", icon: ShieldCheck },
    { key: "ledger", label: lang === "ml" ? "ബാങ്ക് രേഖകൾ" : "Bank Records", icon: Landmark },
  ];

  const simNavItems = [
    { key: "gpay", label: lang === "ml" ? "ഗൂഗിൾ പേ ആപ്പ്" : "Google Pay Simulator", icon: Smartphone },
    { key: "cash", label: lang === "ml" ? "ക്യാഷ് ടു ഷോപ്പ്" : "Cash to Shop Counter", icon: Store },
  ];

  const navItems = showSimulators ? [...baseNavItems, ...simNavItems] : baseNavItems;

  // =========================================================================
  // GATEKEEPER CHECK: REQUIRE KERALA POLICE SIGN IN BEFORE ACCESSING SITE
  // =========================================================================
  if (!policeUser) {
    return (
      <PoliceGateScreen
        onAuthenticate={handlePoliceSignIn}
        lang={lang}
        onToggleLanguage={toggleLanguage}
      />
    );
  }

  return (
    <div className="official-app-container pro-theme">
      {/* GLOBAL TOP SCANNER LOADER */}
      {isAnalyzing && <div className="global-top-scanner-bar" />}

      <div className="official-layout-body">
        {/* MOBILE SIDEBAR BACKDROP */}
        {menuOpen && (
          <div
            className="sidebar-backdrop-overlay"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* STREAMLINED EXECUTIVE SIDEBAR */}
        <aside className={`official-sidebar ${menuOpen ? "open" : ""}`}>
          <div className="sidebar-brand-block">
            <div className="emblem-box">
              <Shield size={20} className="text-sky" />
            </div>
            <div className="emblem-text-wrap">
              <b className="emblem-title">TOOFAN <span className="text-sky">SHIELD</span></b>
              <small className="emblem-subtitle">POLICE CYBER COMMAND</small>
            </div>
            <button
              className="btn-sidebar-close-mobile"
              onClick={() => setMenuOpen(false)}
              title="Close Menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* OFFICER DUTY PASS STRIP */}
          <div className="sidebar-officer-strip">
            <button
              type="button"
              className="sidebar-officer-card"
              onClick={() => {
                sounds.playClick();
                setShowLoginModal(true);
                setMenuOpen(false);
              }}
              title="Click to view Kerala Police Duty Pass"
            >
              <div className="officer-badge-avatar">
                <ShieldCheck size={18} className="text-emerald" />
                <span className="officer-live-dot" />
              </div>
              <div className="officer-card-info">
                <div className="officer-card-top-row">
                  <span className="officer-tag">KERALA POLICE</span>
                  <span className="officer-status-badge">ACTIVE</span>
                </div>
                <b className="officer-name">{policeUser?.officerName || "SI Rahul K."}</b>
                <small className="officer-badge-id">Badge #{policeUser?.badgeNumber || "8842"}</small>
              </div>
              <ChevronRight size={14} className="officer-card-arrow" />
            </button>
          </div>

          {/* MAIN NAVIGATION */}
          <div className="sidebar-nav-section">
            <div className="sidebar-section-label">{lang === "ml" ? "പ്രധാന വിഭാഗങ്ങൾ" : "INVESTIGATION"}</div>
            <nav className="sidebar-nav-list">
              {baseNavItems.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  className={`sidebar-nav-item ${activeTab === key ? "active" : ""}`}
                  onClick={() => {
                    sounds.playClick();
                    setActiveTab(key);
                    setMenuOpen(false);
                  }}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  {activeTab === key && <span className="nav-active-indicator" />}
                </button>
              ))}
            </nav>
          </div>

          {/* SIMULATOR TOOLS SWITCH */}
          <div className="sidebar-sim-section">
            <div className="sidebar-sim-card">
              <div className="sim-card-top">
                <div className="sim-card-title">
                  <Smartphone size={15} className="text-amber" />
                  <span>{t.simulatorsSwitch}</span>
                </div>
                <button
                  type="button"
                  className={`sim-switch-pill ${showSimulators ? "on" : "off"}`}
                  onClick={() => {
                    sounds.playClick();
                    handleToggleSimulators();
                  }}
                  title={t.simulatorsHint}
                >
                  <span className="switch-dot" />
                  <span>{showSimulators ? "ON" : "OFF"}</span>
                </button>
              </div>

              {showSimulators && (
                <div className="sidebar-sim-links-stack animate-fade-in">
                  <button
                    type="button"
                    className={`sidebar-sim-link ${activeTab === "gpay" ? "active" : ""}`}
                    onClick={() => {
                      sounds.playClick();
                      setActiveTab("gpay");
                      setMenuOpen(false);
                    }}
                  >
                    <Smartphone size={14} className="text-sky" />
                    <span>Google Pay Simulator</span>
                  </button>
                  <button
                    type="button"
                    className={`sidebar-sim-link ${activeTab === "cash" ? "active" : ""}`}
                    onClick={() => {
                      sounds.playClick();
                      setActiveTab("cash");
                      setMenuOpen(false);
                    }}
                  >
                    <Store size={14} className="text-emerald" />
                    <span>Cash to Shop Desk</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR FOOTER QUICK ACTIONS */}
          <div className="sidebar-bottom-bar">
            <button
              className="sidebar-action-icon-btn"
              onClick={handleResetTransactions}
              title="Reset All Transactions to 0"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
            <button
              className="sidebar-action-icon-btn primary"
              onClick={() => handleLoadSampleData(viewMode === "all" ? "burst" : viewMode)}
              title="Load Demo Data"
            >
              <Sparkles size={13} />
              <span>Demo</span>
            </button>
          </div>
        </aside>

        {/* MAIN VIEWPORT */}
        <div className="official-main-viewport">
          {/* SINGLE STREAMLINED EXECUTIVE TOPBAR */}
          <header className="official-topbar">
            <div className="topbar-left-zone">
              <button className="btn-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="topbar-branding-line">
                <span className="topbar-brand-title">TOOFAN <span className="text-sky">SHIELD</span></span>
                <span className="topbar-sep">/</span>
                <b className="topbar-active-tab-title">
                  {activeTab === "overview" && (lang === "ml" ? "പണവഴി ഭൂപടം" : "Money Flow Map")}
                  {activeTab === "scanner" && (lang === "ml" ? "ഷോപ്പ് സ്കാനർ" : "Shop Cash Scanner")}
                  {activeTab === "cash" && (lang === "ml" ? "ക്യാഷ് ടു ഷോപ്പ്" : "Cash to Shop Desk")}
                  {activeTab === "gpay" && (lang === "ml" ? "ഗൂഗിൾ പേ ആപ്പ്" : "Google Pay Simulator")}
                  {activeTab === "evidence" && (lang === "ml" ? "തെളിവ് ശേഖരണം" : "Seizure Proof Vault")}
                  {activeTab === "ledger" && (lang === "ml" ? "ബാങ്ക് രേഖകൾ" : "Bank Records")}
                </b>
              </div>
            </div>

            <div className="topbar-right-zone">
              {/* INTERACTIVE SIMULATORS SWITCH */}
              <div className="topbar-sim-group">
                <button
                  type="button"
                  className={`btn-topbar-sim ${showSimulators ? "on" : "off"}`}
                  onClick={() => {
                    sounds.playClick();
                    handleToggleSimulators();
                  }}
                  title="Toggle Phone Payment & Cash Desk Simulators"
                >
                  <Smartphone size={13} className={showSimulators ? "text-amber" : ""} />
                  <span>Simulators</span>
                  <span className={`sim-indicator-pill ${showSimulators ? "on" : "off"}`}>
                    {showSimulators ? "ON" : "OFF"}
                  </span>
                </button>

                {showSimulators && (
                  <div className="topbar-sim-actions animate-fade-in">
                    <button
                      className={`btn-sim-pill gpay ${activeTab === "gpay" ? "active" : ""}`}
                      onClick={() => {
                        sounds.playClick();
                        setActiveTab("gpay");
                      }}
                    >
                      <Smartphone size={12} />
                      <span>GPay</span>
                    </button>
                    <button
                      className={`btn-sim-pill cash ${activeTab === "cash" ? "active" : ""}`}
                      onClick={() => {
                        sounds.playClick();
                        setActiveTab("cash");
                      }}
                    >
                      <Store size={12} />
                      <span>Cash Desk</span>
                    </button>
                  </div>
                )}
              </div>

              {/* QUICK STOCK AUDIT BUTTON */}
              <button
                className="btn-topbar-tool"
                onClick={handleOpenAuditor}
                title="NDPS 68J Suspect Shop Stock vs Cash Audit"
              >
                <Building2 size={13} />
                <span>Stock Audit</span>
              </button>

              {/* SECTION 74 JJ ACT ROLE SEGMENT */}
              <div className="role-segment-pill" title="Section 74 Juvenile Justice Act, 2015">
                <button
                  type="button"
                  className={`role-seg-btn ${appRole === "analyst" ? "active" : ""}`}
                  onClick={() => { sounds.playClick(); setAppRole("analyst"); }}
                  title="Analyst Mode: Minor names masked"
                >
                  <Shield size={12} />
                  <span>Analyst</span>
                </button>
                <button
                  type="button"
                  className={`role-seg-btn ${appRole === "counsellor" ? "active" : ""}`}
                  onClick={() => { sounds.playClick(); setAppRole("counsellor"); }}
                  title="CWC Counsellor Mode: Identity unmasked for rehab"
                >
                  <HeartHandshake size={12} />
                  <span>CWC</span>
                </button>
              </div>

              {/* LANGUAGE TOGGLE */}
              <button
                className={`btn-topbar-lang-toggle ${lang === "ml" ? "ml" : ""}`}
                onClick={toggleLanguage}
                title="Switch Language"
              >
                <Languages size={13} />
                <span>{lang === "en" ? "മലയാളം" : "English"}</span>
              </button>

              {/* POLICE OFFICER BADGE */}
              <button
                className="btn-officer-pass-top"
                onClick={() => { sounds.playClick(); setShowLoginModal(true); }}
                title="Open Kerala Police Duty Pass"
              >
                <ShieldCheck size={15} className="text-emerald" />
                <span className="officer-pass-title">{policeUser?.officerName || "SI Rahul K."}</span>
                <span className="officer-pass-dot" />
              </button>

              {/* CLOUD SYNC LIVE DOT */}
              <div
                className="cloud-sync-status-indicator"
                title={syncStatus.devices > 1 ? `Cloud Sync: ${syncStatus.devices} Devices Connected` : "Cloud Sync: Connected"}
              >
                <span className={`sync-dot ${syncStatus.connected ? "connected" : "connecting"}`} />
              </div>
            </div>
          </header>

          {/* FLOATING REAL-TIME CROSS-DEVICE SYNC TOAST */}
          {liveSyncToast && (
            <div className="live-sync-floating-toast">
              <div className="toast-icon-pulse">
                <Smartphone size={18} className="text-emerald" />
              </div>
              <div className="toast-text-col">
                <b>{lang === "ml" ? "പുതിയ പണമിടപാട് സിങ്ക് ചെയ്തു!" : "Live Payment Synced!"}</b>
                <span>
                  {liveSyncToast.sender} ➔ {liveSyncToast.receiver}: <b className="text-emerald">{money(liveSyncToast.amount)}</b>
                </span>
              </div>
              <span className="toast-live-tag">LIVE</span>
            </div>
          )}

          {/* SCROLLABLE VIEWPORT */}
          <div className="official-content-scrollable">
            {activeTab === "overview" && (
              <div className="overview-page-wrapper">
                {/* SLEEK SEGMENTED PERSPECTIVE BAR & ACTIONS */}
                <div className="overview-header-toolbar">
                  <div className="segmented-filter-bar">
                    {Object.entries(VIEW_MODES).map(([vKey, mode]) => (
                      <button
                        key={vKey}
                        className={`segment-btn ${viewMode === vKey ? "active" : ""}`}
                        onClick={() => handleSelectViewMode(vKey)}
                      >
                        <span>{lang === "ml" ? mode.labelMl : mode.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="overview-action-pills">
                    <button
                      className={`action-pill-btn ${simulating ? "active-running" : ""}`}
                      onClick={toggleSimulation}
                      title="Animate Step-by-Step Trail"
                    >
                      {simulating ? <Pause size={13} /> : <Play size={13} />}
                      <span>{simulating ? "Pause" : "Play Trail"}</span>
                    </button>
                    <button
                      className="action-pill-btn"
                      onClick={() => handleLoadSampleData(viewMode === "all" ? "burst" : viewMode)}
                      title="Load Sample Data"
                    >
                      <Sparkles size={13} />
                      <span>Demo</span>
                    </button>
                    <button
                      className="action-pill-btn danger"
                      onClick={handleResetTransactions}
                      title="Clear All to 0"
                    >
                      <RotateCcw size={13} />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* COMPACT HUD METRIC TILES */}
                <div className="compact-hud-grid">
                  <div className="hud-metric-card blue">
                    <div className="hud-icon-box"><Banknote size={15} /></div>
                    <div className="hud-text-col">
                      <span className="hud-metric-label">TOTAL TRACED</span>
                      <b className="hud-metric-value">{money(trackedUniqueVolume)}</b>
                    </div>
                    <span className="hud-pill-tag green">● {displayTransactions.length} txns</span>
                  </div>

                  <div className="hud-metric-card red">
                    <div className="hud-icon-box"><BadgeAlert size={15} /></div>
                    <div className="hud-text-col">
                      <span className="hud-metric-label">FLAGGED MULES</span>
                      <b className="hud-metric-value text-red">{displayTrace.candidates?.length ?? 0}</b>
                    </div>
                    <span className="hud-pill-tag red">High Risk</span>
                  </div>

                  <div className="hud-metric-card emerald">
                    <div className="hud-icon-box"><GitBranch size={15} /></div>
                    <div className="hud-text-col">
                      <span className="hud-metric-label">ACTIVE TRAILS</span>
                      <b className="hud-metric-value">{displayTrace.paths?.length ?? 0}</b>
                    </div>
                    <span className="hud-pill-tag blue">Traced</span>
                  </div>

                  <div className="hud-metric-card amber">
                    <div className="hud-icon-box"><Store size={15} /></div>
                    <div className="hud-text-col">
                      <span className="hud-metric-label">SHOP CASH SURGE</span>
                      <b className="hud-metric-value text-amber">
                        {displayTrace.merchant_alerts?.filter((a) => a.status === "unusual-receipts-review").length ?? 0}
                      </b>
                    </div>
                    <span className="hud-pill-tag amber">4x Surge</span>
                  </div>
                </div>

                {/* FLOATING STEPPER WHEN SIMULATING */}
                {currentScriptStep && (
                  <div className="hud-simulation-stepper animate-fade-in">
                    <span className="stepper-count-tag">STEP {simStepIndex + 1}/{activeScript.length}</span>
                    <span className="stepper-text">{currentScriptStep.narration}</span>
                    <div className="stepper-controls">
                      <button className="btn-stepper" onClick={prevSimStep} disabled={simStepIndex === 0}>Prev</button>
                      <button className="btn-stepper primary" onClick={nextSimStep}>
                        {simStepIndex + 1 >= activeScript.length ? "Restart" : "Next →"}
                      </button>
                    </div>
                  </div>
                )}

                {/* OFFICIAL TOPOLOGY GRAPH */}
                <OfficialTopologyGraph
                  trace={displayTrace}
                  privacy={privacy}
                  selectedNode={selectedNode}
                  onSelectNode={setSelectedNode}
                  activeHighlightEdge={activeHighlightEdge}
                  onLoadDemo={() => handleLoadSampleData(viewMode === "all" ? "burst" : viewMode)}
                  isAnalyzing={isAnalyzing}
                />

                {/* SELECTED NODE DOSSIER FLYOUT */}
                {selectedNode && (
                  <div className="node-dossier-card">
                    <div className="dossier-header-bar">
                      <div className="dossier-title-col">
                        <b>{privacy && selectedNode.id.startsWith("STUDENT") ? "STUDENT •••" : selectedNode.id}</b>
                        <span className="role-tag-badge">
                          {selectedNode.id.includes("PROVIDER") || selectedNode.id.includes("HANDLER")
                            ? "PROVIDER (CASH AGGREGATOR)"
                            : selectedNode.is_cdm_loop || selectedNode.id.includes("CDM")
                            ? "CDM SMURFING LOOP (RAPID DRAIN)"
                            : selectedNode.id.includes("FAKE-ACC") || selectedNode.id.includes("MULE") || selectedNode.role === "possible-convergence"
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
                      {selectedNode.is_cdm_loop && (
                        <div className="dossier-stat-item" style={{ gridColumn: "1 / -1", background: "#fff7ed", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fed7aa" }}>
                          <span style={{ color: "#c2410c", fontWeight: "700" }}>🏧 CDM SMURFING LOOP DETECTED:</span>
                          <span style={{ fontSize: "12px", color: "#9a3412", display: "block", marginTop: "3px" }}>
                            Cash deposited via ATM Cash Deposit Machine (CDM) was swept via UPI to Cashout Hub within 60 minutes. Structured below CTR reporting limits.
                          </span>
                        </div>
                      )}
                      <div className="dossier-stat-item">
                        <span>{t.dossierReceived || "Money Received (In):"}</span>
                        <b className="text-emerald-700">
                          {money(selectedNode.total_received ?? (displayTrace.edges?.filter(e => e.target === selectedNode.id).reduce((s, e) => s + (Number(e.amount) || 0), 0) || 0))}
                          {" "}<span style={{ fontSize: "0.85em", fontWeight: "normal", color: "#64748b" }}>({selectedNode.incoming || 0} {(selectedNode.incoming || 0) === 1 ? (t.dossierPaymentCountSingle || "payment") : (t.dossierPaymentsCount || "payments")})</span>
                        </b>
                      </div>
                      <div className="dossier-stat-item">
                        <span>{t.dossierSent || "Money Sent Forward (Out):"}</span>
                        <b className="text-blue-700">
                          {money(selectedNode.total_sent ?? (displayTrace.edges?.filter(e => e.source === selectedNode.id).reduce((s, e) => s + (Number(e.amount) || 0), 0) || 0))}
                          {" "}<span style={{ fontSize: "0.85em", fontWeight: "normal", color: "#64748b" }}>({selectedNode.outgoing || 0} {(selectedNode.outgoing || 0) === 1 ? (t.dossierPaymentCountSingle || "payment") : (t.dossierPaymentsCount || "payments")})</span>
                        </b>
                      </div>
                      <div className="dossier-stat-item">
                        <span>{t.dossierRiskType || "Account Risk Type:"}</span>
                        <b>
                          {selectedNode.id.includes("PROVIDER") || selectedNode.id.includes("HANDLER")
                            ? "🎒 Provider / Cash Aggregator: Receives physical cash handovers from students, pools cash until ₹2,000 threshold, then drops at shop counter"
                            : selectedNode.is_cdm_loop
                            ? "🏧 Mule Smurfing Account: Used for rapid CDM cash deposit and rapid outbound UPI drainage"
                            : selectedNode.incoming >= 2 || selectedNode.id.includes("FAKE-ACC") || selectedNode.id.includes("MULE")
                            ? (t.dossierHighRisk || "⚠️ High Risk: Fake Account secretly collecting money from multiple people (Mule)")
                            : selectedNode.outgoing === 0 || selectedNode.id.includes("CASHOUT") || selectedNode.id.includes("HUB")
                            ? (t.dossierDestination || "🏛️ Final Destination: Cashout account where collected funds land")
                            : (t.dossierNormal || "👤 Normal Account: Ordinary sender or shop")}
                        </b>
                      </div>
                    </div>

                    <div className="dossier-actions-row" style={{ marginTop: "14px", display: "flex", gap: "8px", flexWrap: "wrap", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
                      <button
                        className="btn-sec94-launch"
                        onClick={() => handleOpenSec94({
                          targetId: selectedNode.id,
                          targetType: selectedNode.id.includes("BAKERY") ? "shop_qr" : selectedNode.id.includes("CDM") ? "cdm_terminal" : "upi_vpa",
                          amount: selectedNode.total_received || 5000,
                        })}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 14px",
                          fontSize: "12px",
                          fontWeight: "600",
                          background: "#1e40af",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        <FileText size={14} />
                        <span>Generate Section 94 BNSS Notice</span>
                      </button>
                      {(selectedNode.id.includes("BAKERY") || selectedNode.id.includes("SHOP") || selectedNode.id.includes("MERCHANT")) && (
                        <button
                          className="btn-audit-launch"
                          onClick={() => handleOpenAuditor()}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "8px 14px",
                            fontSize: "12px",
                            fontWeight: "600",
                            background: "#fef3c7",
                            color: "#92400e",
                            border: "1px solid #fde68a",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                        >
                          <Building2 size={14} />
                          <span>Audit Suspect Shop (NDPS 68J)</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* CONNECTED SEQUENCES LIST */}
                {displayTrace.paths?.length > 0 && (
                  <div className="flow-sequences-card">
                    <div className="flow-sequences-header">
                      <div className="header-icon-title">
                        <Layers size={16} />
                        <h4>Discovered Money Trails ({displayTrace.paths.length})</h4>
                      </div>
                      <span className="tag-pill-sub">STEP-BY-STEP TRAILS</span>
                    </div>

                    <div className="routes-stack">
                      {displayTrace.paths.slice(0, 4).map((path, idx) => (
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
                {(displayTrace.merchant_alerts ?? []).length > 0 && (
                  <div className="merchant-variance-card">
                    <div className="variance-header-row">
                      <div className="header-icon-title">
                        <Store size={17} />
                        <h4>Shop Daily Sales & Cash Review</h4>
                      </div>
                      <div className="variance-header-actions">
                        <button
                          className="btn-launch-geo-scanner"
                          onClick={() => {
                            sounds.playClick();
                            setActiveTab("scanner");
                          }}
                          title="Open full AI Geo-Location & Sudden Cash Jump Radar"
                        >
                          <MapPin size={13} />
                          <span>Select Location & Scan Map</span>
                          <ArrowRight size={12} />
                        </button>
                        <span className="demo-rule-badge">4x JUMP DETECTOR</span>
                      </div>
                    </div>

                    <div className="variance-rows-list">
                      {displayTrace.merchant_alerts.map((alert, i) => {
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

            {/* TAB: AI LOCATION & SHOP SCANNER */}
            {activeTab === "scanner" && (
              <div className="scanner-page-wrapper">
                <LocationAiScanner
                  onSelectMerchantForLaundering={(merchantId) => {
                    setSelectedLaunderingShop(merchantId);
                  }}
                  onNavigateTab={(tab) => {
                    sounds.playClick();
                    setActiveTab(tab);
                  }}
                  lang={lang}
                />
              </div>
            )}

            {/* TAB 2: CASH TO SHOP LAUNDERING DESK */}
            {activeTab === "cash" && (
              <div className="cash-desk-page-wrapper">
                <CashLaunderingDesk
                  transactions={transactions}
                  onAddTransactions={handleAddTransactions}
                  onResetTransactions={handleResetTransactions}
                  onNavigateTab={(tab) => {
                    sounds.playClick();
                    setActiveTab(tab);
                  }}
                  privacy={privacy}
                  initialShop={selectedLaunderingShop}
                  lang={lang}
                />
              </div>
            )}

            {/* TAB 3: GPAY SIMULATOR */}
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
                  transactions={displayTransactions}
                  privacy={privacy}
                  onReset={handleResetTransactions}
                  onLoadDemo={() => handleLoadSampleData(viewMode === "all" ? "burst" : viewMode)}
                  onOpenSec94={handleOpenSec94}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 94 BNSS BANK PRODUCTION ORDER REQUISITION MODAL */}
      <Section94NoticeModal
        isOpen={showSec94Modal}
        onClose={() => setShowSec94Modal(false)}
        initialData={sec94Target}
        policeUser={policeUser}
      />

      {/* FRONT-SHOP COMMINGLED FUND AUDITOR MODAL (NDPS 68J) */}
      <BusinessAuditorModal
        isOpen={showAuditorModal}
        onClose={() => setShowAuditorModal(false)}
        onOpenSec94={handleOpenSec94}
      />

      {/* KERALA POLICE AUTHENTICATION MODAL */}
      <PoliceSignInModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        policeUser={policeUser}
        onSignIn={handlePoliceSignIn}
        onSignOut={handlePoliceSignOut}
        lang={lang}
      />

      {/* MOBILE BOTTOM NAVIGATION DOCK */}
      <nav className="mobile-bottom-nav">
        {navItems.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`mobile-bottom-nav-item ${activeTab === key ? "active" : ""}`}
            onClick={() => {
              sounds.playClick();
              setActiveTab(key);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <div className="bottom-nav-icon-wrap">
              <Icon size={19} />
              {activeTab === key && <span className="bottom-nav-active-pip" />}
            </div>
            <span className="bottom-nav-label">
              {key === "overview" && (lang === "ml" ? "പണവഴി" : "Money Flow")}
              {key === "scanner" && (lang === "ml" ? "സ്കാനർ" : "AI Scanner")}
              {key === "evidence" && (lang === "ml" ? "തെളിവ്" : "Proof Vault")}
              {key === "ledger" && (lang === "ml" ? "രേഖകൾ" : "Records")}
            </span>
          </button>
        ))}

        {/* POLICE PASS BUTTON ON MOBILE DOCK */}
        <button
          className="mobile-bottom-nav-item police-dock-btn"
          onClick={() => {
            sounds.playClick();
            setShowLoginModal(true);
          }}
          title="Open Kerala Police Officer Pass"
        >
          <div className="bottom-nav-icon-wrap">
            <ShieldCheck size={20} className="text-emerald" />
          </div>
          <span className="bottom-nav-label" style={{ color: "#10b981", fontWeight: "700" }}>
            {lang === "ml" ? "പോലീസ്" : "Police ID"}
          </span>
        </button>
      </nav>
    </div>
  );
}
