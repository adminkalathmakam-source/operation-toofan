import { useState, useMemo, useEffect } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeAlert,
  Building2,
  CheckCircle2,
  Compass,
  Crosshair,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Layers,
  Loader2,
  MapPin,
  Navigation,
  Radar,
  Radio,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
} from "lucide-react";
import { sounds } from "./soundEffects";

function money(val) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

// SIMULATED LOCATIONS / ZONES DATA
export const SCAN_ZONES = [
  {
    id: "zone-north-campus",
    name: "Sector A: North University & College Road",
    areaName: "University Campus & Hostel Belt",
    coords: "10.0261° N, 76.3125° E",
    radiusKm: 2.2,
    threatLevel: "CRITICAL",
    description: "High student footfall corridor with late-night food stalls and student snack counters.",
    merchants: [
      {
        id: "CAMPUS-CORNER-BAKERY",
        alias: "Campus Corner Bakery & Puffs",
        category: "Bakery & Puffs Counter",
        address: "Shop 4, University Gate Road",
        usualDaily: 1800,
        todayCash: 14500,
        jumpMultiple: 8.05,
        increase: 12700,
        riskScore: 96,
        isSpike: true,
        radarPos: { x: 58, y: 32 },
        connectedAltAcc: "ALT-ACC-7A",
        aiReason: "Sudden spike of ₹500 & ₹100 unbilled cash bundles handed over across the counter without matching bakery production invoices. ₹13,000 immediately transferred to ALT-ACC-7A via UPI.",
      },
      {
        id: "ROYAL-CHAI-POINT",
        alias: "Royal Chai & Snacks Stall",
        category: "Tea & Snacks Kiosk",
        address: "Opposite Science Block",
        usualDaily: 2100,
        todayCash: 11800,
        jumpMultiple: 5.62,
        increase: 9700,
        riskScore: 89,
        isSpike: true,
        radarPos: { x: 38, y: 44 },
        connectedAltAcc: "ALT-ACC-4B",
        aiReason: "High-frequency cash intake uncharacteristic for beverage micro-retail. Rapid outward UPI conversion to intermediary student mule account within 45 minutes.",
      },
      {
        id: "VARSITY-CAFE",
        alias: "Varsity Quick Bites & Coffee",
        category: "Campus Canteen",
        address: "Hostel 3 Commercial Annex",
        usualDaily: 4500,
        todayCash: 4900,
        jumpMultiple: 1.09,
        increase: 400,
        riskScore: 12,
        isSpike: false,
        radarPos: { x: 70, y: 65 },
        connectedAltAcc: "N/A",
        aiReason: "Standard baseline cash volume matching student lunch footfall. No abnormal bank transfers detected.",
      },
      {
        id: "GOLDEN-CHIPS-SWEETS",
        alias: "Golden Hot Chips & Sweets",
        category: "Confectionery",
        address: "12 Campus Cross Junction",
        usualDaily: 3000,
        todayCash: 3400,
        jumpMultiple: 1.13,
        increase: 400,
        riskScore: 15,
        isSpike: false,
        radarPos: { x: 25, y: 72 },
        connectedAltAcc: "N/A",
        aiReason: "Normal seasonal retail receipts profile within standard deviation.",
      },
    ],
  },
  {
    id: "zone-metro-market",
    name: "Sector B: Central Metro Station & Main Bazaar",
    areaName: "Downtown Commercial Transit Zone",
    coords: "9.9816° N, 76.2999° E",
    radiusKm: 2.8,
    threatLevel: "CRITICAL",
    description: "High-density transit nexus with continuous cash flow and high volume retail counters.",
    merchants: [
      {
        id: "FORT-ROAD-BAKERY",
        alias: "Fort Road Royal Bakery & Sweets",
        category: "Bakery & Pastries",
        address: "Fort Road Market Junction",
        usualDaily: 3200,
        todayCash: 24800,
        jumpMultiple: 7.75,
        increase: 21600,
        riskScore: 98,
        isSpike: true,
        radarPos: { x: 48, y: 38 },
        connectedAltAcc: "ALT-ACC-7A",
        aiReason: "Massive anomalous cash surge. Over 42 physical deposits handed across the counter with zero corresponding inventory debit, immediately routed into alt accounts via bulk IMPS/UPI.",
      },
      {
        id: "METRO-SWEETS-DEPOT",
        alias: "Metro Sweets & Halwa Depot",
        category: "Sweet Shop",
        address: "Metro Pillar 142 Entrance",
        usualDaily: 5000,
        todayCash: 28500,
        jumpMultiple: 5.7,
        increase: 23500,
        riskScore: 91,
        isSpike: true,
        radarPos: { x: 64, y: 56 },
        connectedAltAcc: "ALT-ACC-9C",
        aiReason: "Anomalous cash volume spike during off-peak morning hours. 88% of received cash converted into digital transfer within 1 hour.",
      },
      {
        id: "TERMINAL-TEA-KIOSK",
        alias: "Express Terminal Tea Kiosk",
        category: "Beverages & Refreshment",
        address: "Bus Bay 3 Platform",
        usualDaily: 2800,
        todayCash: 3100,
        jumpMultiple: 1.11,
        increase: 300,
        riskScore: 14,
        isSpike: false,
        radarPos: { x: 30, y: 30 },
        connectedAltAcc: "N/A",
        aiReason: "Standard commuter beverage sales. Normal distribution.",
      },
      {
        id: "BAZAAR-BAKE-INN",
        alias: "Bazaar Bake Inn & Cool Bar",
        category: "Snack Bar & Bakes",
        address: "Main Bazaar Lane 2",
        usualDaily: 4200,
        todayCash: 4600,
        jumpMultiple: 1.09,
        increase: 400,
        riskScore: 18,
        isSpike: false,
        radarPos: { x: 75, y: 28 },
        connectedAltAcc: "N/A",
        aiReason: "Consistent POS card-to-cash ratio. No suspicious intermediary routing.",
      },
    ],
  },
  {
    id: "zone-tech-park",
    name: "Sector C: InfoTech Cyber Belt & Late-Night Kiosks",
    areaName: "Technology Park Outer Corridor",
    coords: "10.0125° N, 76.3630° E",
    radiusKm: 3.5,
    threatLevel: "HIGH",
    description: "Corporate and IT corridor with evening snack hubs, 24/7 tea corners, and mobile bakes.",
    merchants: [
      {
        id: "MIDNIGHT-BAKES-HUB",
        alias: "Midnight Chai & Bakes Hub",
        category: "Late Night Bakery",
        address: "Phase 2 Gate Circle",
        usualDaily: 2400,
        todayCash: 19600,
        jumpMultiple: 8.16,
        increase: 17200,
        riskScore: 95,
        isSpike: true,
        radarPos: { x: 52, y: 45 },
        connectedAltAcc: "ALT-ACC-7A",
        aiReason: "Suspicious physical cash drawer accumulation late evening. 93% swapped for immediate online transfers to suspected mule operating account.",
      },
      {
        id: "CLOUDWALK-SWEETS",
        alias: "Cloudwalk Confectionery & Milk Bar",
        category: "Confectionery",
        address: "Tech Boulevard Arcade",
        usualDaily: 3800,
        todayCash: 17200,
        jumpMultiple: 4.52,
        increase: 13400,
        riskScore: 88,
        isSpike: true,
        radarPos: { x: 68, y: 35 },
        connectedAltAcc: "ALT-ACC-3E",
        aiReason: "Substantial jump in unrecorded cash intake coinciding with college fest fee deposit cycles.",
      },
      {
        id: "CYBER-CANTEEN-ANNEX",
        alias: "Cyber Canteen & Snack Stall",
        category: "Food Counter",
        address: "Innovation Tower Ground",
        usualDaily: 6000,
        todayCash: 6500,
        jumpMultiple: 1.08,
        increase: 500,
        riskScore: 11,
        isSpike: false,
        radarPos: { x: 32, y: 60 },
        connectedAltAcc: "N/A",
        aiReason: "Standard digital employee breakfast & lunch payments.",
      },
    ],
  },
  {
    id: "zone-old-town",
    name: "Sector D: Heritage Old Town & Marine Wharf",
    areaName: "Historic Commercial & Fish Harbor Belt",
    coords: "9.9654° N, 76.2427° E",
    radiusKm: 2.0,
    threatLevel: "CRITICAL",
    description: "Traditional trade bazaar with cash-heavy transactions, antique bakeries, and sweet marts.",
    merchants: [
      {
        id: "HARBOR-POINT-BAKERY",
        alias: "Harbor Point Sweets & Bakery",
        category: "Traditional Bakery",
        address: "Wharf Road Jetty Cross",
        usualDaily: 4000,
        todayCash: 26000,
        jumpMultiple: 6.5,
        increase: 22000,
        riskScore: 94,
        isSpike: true,
        radarPos: { x: 45, y: 40 },
        connectedAltAcc: "ALT-ACC-7A",
        aiReason: "Old town bakery used as a high-throughput cash conversion depot. Cash bags collected and digital UPI sent to downstream mules.",
      },
      {
        id: "OLD-PORT-SPICE-BAKES",
        alias: "Old Port Bakes & Cakes",
        category: "Bakery & Sweets",
        address: "Customs Road Market",
        usualDaily: 2600,
        todayCash: 15800,
        jumpMultiple: 6.07,
        increase: 13200,
        riskScore: 90,
        isSpike: true,
        radarPos: { x: 35, y: 55 },
        connectedAltAcc: "ALT-ACC-2D",
        aiReason: "Sudden deviation from historical baseline. Multiple small cash deposits converted into single outbound bank transfer.",
      },
      {
        id: "SEASIDE-SAMOVAR",
        alias: "Seaside Samovar Tea Stall",
        category: "Tea Stall",
        address: "Pier Walkway 9",
        usualDaily: 3100,
        todayCash: 3400,
        jumpMultiple: 1.09,
        increase: 300,
        riskScore: 10,
        isSpike: false,
        radarPos: { x: 62, y: 62 },
        connectedAltAcc: "N/A",
        aiReason: "Normal tourist tea sales. No anomalous digital outflows.",
      },
    ],
  },
];

export default function LocationAiScanner({
  onSelectMerchantForLaundering = null,
  onNavigateTab = null,
}) {
  const [selectedZoneId, setSelectedZoneId] = useState("zone-north-campus");
  const [filterMode, setFilterMode] = useState("all"); // all | spikesOnly | bakeriesOnly
  const [selectedMerchantId, setSelectedMerchantId] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepText, setScanStepText] = useState("");
  const [scanProgress, setScanProgress] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [customRadius, setCustomRadius] = useState(2.5);

  const activeZone = useMemo(() => {
    return SCAN_ZONES.find((z) => z.id === selectedZoneId) || SCAN_ZONES[0];
  }, [selectedZoneId]);

  // Filtered merchants based on active filter
  const displayedMerchants = useMemo(() => {
    return activeZone.merchants.filter((m) => {
      if (filterMode === "spikesOnly") return m.isSpike;
      if (filterMode === "bakeriesOnly") return m.category.toLowerCase().includes("baker");
      return true;
    });
  }, [activeZone, filterMode]);

  // Currently selected merchant (default to first spike or first item)
  const activeMerchant = useMemo(() => {
    if (selectedMerchantId) {
      const found = activeZone.merchants.find((m) => m.id === selectedMerchantId);
      if (found) return found;
    }
    return activeZone.merchants.find((m) => m.isSpike) || activeZone.merchants[0];
  }, [activeZone, selectedMerchantId]);

  const totalMonitored = activeZone.merchants.length;
  const totalSpikes = activeZone.merchants.filter((m) => m.isSpike).length;
  const maxSpike = Math.max(...activeZone.merchants.map((m) => m.jumpMultiple));

  // Trigger simulated AI scan
  function handleTriggerScan() {
    sounds.playClick();
    setIsScanning(true);
    setScanProgress(10);
    setScanStepText("1/4: Initializing AI geofence at coordinates " + activeZone.coords + "...");

    setTimeout(() => {
      setScanProgress(40);
      setScanStepText("2/4: Ingesting merchant POS drawer telemetry & baseline history...");
    }, 500);

    setTimeout(() => {
      setScanProgress(75);
      setScanStepText("3/4: Neural model analyzing cash-to-UPI conversion velocity...");
    }, 1100);

    setTimeout(() => {
      setScanProgress(100);
      setScanStepText(`4/4: Complete! Detected ${totalSpikes} shops with sudden 4x-8x cash jumps.`);
      sounds.playAlert();
      setTimeout(() => {
        setIsScanning(false);
      }, 700);
    }, 1800);
  }

  // Handle selecting a zone
  function handleZoneChange(zoneId) {
    sounds.playClick();
    setSelectedZoneId(zoneId);
    setSelectedMerchantId(null);
    setIsScanning(true);
    setScanProgress(50);
    setScanStepText("Switching sector radar coordinates...");
    setTimeout(() => {
      setIsScanning(false);
    }, 450);
  }

  // Copy forensic brief
  function handleCopyBrief() {
    if (!activeMerchant) return;
    const brief = `[TOOFAN SHIELD AI FORENSIC DISPATCH - SIMULATION DEMO]
TIMESTAMP: ${new Date().toISOString()}
SECTOR: ${activeZone.name} (${activeZone.coords})
MERCHANT ALIAS: ${activeMerchant.alias} (${activeMerchant.category})
ADDRESS: ${activeMerchant.address}
BASELINE DAILY CASH: ${money(activeMerchant.usualDaily)}
TODAY'S CASH DRAWER: ${money(activeMerchant.todayCash)}
ANOMALOUS JUMP: ${activeMerchant.jumpMultiple}x BASELINE (+${money(activeMerchant.increase)})
AI RISK SCORE: ${activeMerchant.riskScore}/100 [${activeMerchant.isSpike ? "CRITICAL CASH ANOMALY" : "NORMAL"}]
SUSPECTED MULE DESTINATION: ${activeMerchant.connectedAltAcc}
AI REASONING: ${activeMerchant.aiReason}
NOTICE: PRACTICE TEST DEMO ONLY - SYNTHETIC DATA.`;

    navigator.clipboard.writeText(brief).then(() => {
      setCopySuccess(true);
      sounds.playPaySuccess();
      setTimeout(() => setCopySuccess(false), 2400);
    });
  }

  // Quick launch in Cash Laundering Desk
  function handleOpenInCashDesk(merchant) {
    sounds.playClick();
    if (typeof onSelectMerchantForLaundering === "function") {
      onSelectMerchantForLaundering(merchant.id);
    }
    if (typeof onNavigateTab === "function") {
      onNavigateTab("cash");
    }
  }

  return (
    <div className="location-ai-scanner-container">
      {/* 1. TOP DEMO NOTICE BANNER (Prominently Disclaiming Real-World Identity) */}
      <div className="scanner-demo-alert-banner">
        <div className="demo-alert-left">
          <ShieldAlert size={19} className="text-amber animate-pulse" />
          <div className="demo-alert-text">
            <b>AI LOCATION SCANNER (DEMO & PRACTICE SIMULATION ONLY)</b>
            <span>
              All coordinates, shop names, and cash velocity anomalies shown are synthetically generated for educational training.
              No real individuals or legal identities are inferred.
            </span>
          </div>
        </div>
        <span className="demo-mode-pill">PRACTICE DEMO · NOT REAL</span>
      </div>

      {/* 2. HEADER & SECTOR CONTROLS */}
      <div className="scanner-header-card">
        <div className="scanner-header-top">
          <div className="scanner-title-zone">
            <div className="scanner-icon-bubble">
              <Radar size={22} className="text-cyan animate-spin-slow" />
            </div>
            <div>
              <h3>AI Geo-Location & Sudden Cash Jump Radar</h3>
              <p className="scanner-subtitle">
                Select a target location to scan for bakeries and shops with sudden, abnormal physical cash spikes converted to online transfers.
              </p>
            </div>
          </div>

          <div className="scanner-actions-zone">
            <button
              className={`btn-scan-trigger ${isScanning ? "scanning" : ""}`}
              onClick={handleTriggerScan}
              disabled={isScanning}
              title="Initiate full AI geofence radar scan"
            >
              {isScanning ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Scanning Sector...</span>
                </>
              ) : (
                <>
                  <Radio size={16} />
                  <span>Scan Selected Location Now</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* SCANNER PROGRESS BAR (WHEN SCANNING) */}
        {isScanning && (
          <div className="scanner-progress-panel">
            <div className="scanner-progress-text-row">
              <span className="step-text">{scanStepText}</span>
              <span className="pct-text">{scanProgress}%</span>
            </div>
            <div className="scanner-progress-track">
              <div
                className="scanner-progress-fill"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* ZONE SELECTOR CARDS ROW */}
        <div className="sector-selector-label-row">
          <span>SELECT TARGET SCANNING SECTOR:</span>
          <small>Click any location to reposition the AI scan radar</small>
        </div>

        <div className="sector-cards-grid">
          {SCAN_ZONES.map((zone) => {
            const isSelected = zone.id === selectedZoneId;
            const spikeCount = zone.merchants.filter((m) => m.isSpike).length;
            return (
              <button
                key={zone.id}
                className={`sector-card-btn ${isSelected ? "active" : ""}`}
                onClick={() => handleZoneChange(zone.id)}
              >
                <div className="sector-card-top">
                  <div className="sector-badge-row">
                    <span className="sector-coords-pill">
                      <Crosshair size={11} />
                      {zone.coords}
                    </span>
                    {spikeCount > 0 && (
                      <span className="sector-spike-pill">
                        {spikeCount} CASH SPIKES
                      </span>
                    )}
                  </div>
                  {isSelected && <span className="sector-active-dot" />}
                </div>

                <div className="sector-card-title">{zone.name}</div>
                <div className="sector-card-desc">{zone.areaName}</div>

                <div className="sector-card-footer">
                  <span className="radius-tag">
                    <Navigation size={11} /> {zone.radiusKm} km radius
                  </span>
                  <span className={`threat-tag ${zone.threatLevel.toLowerCase()}`}>
                    ● {zone.threatLevel} RISK
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MAIN SCANNER LAYOUT: RADAR HUD (LEFT) + ANOMALY DOSSIER (RIGHT) */}
      <div className="scanner-split-grid">
        {/* LEFT COLUMN: SIMULATED AI RADAR CANVAS & CONTROLS */}
        <div className="radar-canvas-panel">
          <div className="radar-panel-header">
            <div className="panel-title-group">
              <Compass size={17} className="text-cyan" />
              <h4>Simulated Sector Radar Map</h4>
            </div>
            <div className="radar-status-badge">
              <span className="radar-live-dot" />
              <span>GEOFENCE: {activeZone.radiusKm} KM RADIUS</span>
            </div>
          </div>

          {/* CIRCULAR RADAR HUD SCREEN */}
          <div className="radar-screen-wrapper">
            <div className="radar-screen">
              {/* Concentric distance rings */}
              <div className="radar-ring ring-1" title="500m radius" />
              <div className="radar-ring ring-2" title="1.0km radius" />
              <div className="radar-ring ring-3" title="1.8km radius" />
              <div className="radar-ring ring-4" title="2.5km boundary" />

              {/* Crosshair axis lines */}
              <div className="radar-axis axis-horizontal" />
              <div className="radar-axis axis-vertical" />

              {/* Degrees markers */}
              <span className="radar-deg deg-n">N 0°</span>
              <span className="radar-deg deg-e">E 90°</span>
              <span className="radar-deg deg-s">S 180°</span>
              <span className="radar-deg deg-w">W 270°</span>

              {/* Rotating radar sweep beam */}
              <div className="radar-sweep-beam" />

              {/* Center Radar Scanner Core */}
              <div className="radar-center-core">
                <div className="radar-core-ping" />
                <MapPin size={15} className="radar-core-icon" />
              </div>

              {/* Interactive Merchant Pins Placed on Radar Grid */}
              {displayedMerchants.map((merchant) => {
                const isSelected = activeMerchant?.id === merchant.id;
                const isAnomaly = merchant.isSpike;
                return (
                  <div
                    key={merchant.id}
                    className={`radar-merchant-pin ${isAnomaly ? "anomaly-pin" : "normal-pin"} ${isSelected ? "active" : ""}`}
                    style={{
                      left: `${merchant.radarPos.x}%`,
                      top: `${merchant.radarPos.y}%`,
                    }}
                    onClick={() => {
                      sounds.playClick();
                      setSelectedMerchantId(merchant.id);
                      if (merchant.isSpike) sounds.playAlert();
                    }}
                    title={`${merchant.alias}: ${merchant.jumpMultiple}x cash spike`}
                  >
                    {isAnomaly && <div className="pin-pulse-wave" />}
                    <div className="pin-head">
                      {isAnomaly ? <Store size={14} /> : <Store size={12} />}
                    </div>

                    <div className="pin-hover-tag">
                      <div className="tag-alias">{merchant.alias}</div>
                      <div className="tag-jump">
                        {merchant.isSpike
                          ? `⚠️ ${merchant.jumpMultiple}x Cash Jump`
                          : "✅ Normal"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RADAR OVERLAY CONTROLS */}
            <div className="radar-footer-controls">
              <div className="radar-legend">
                <span className="legend-item red">
                  <span className="legend-dot red" /> Sudden Cash Jump (4x+)
                </span>
                <span className="legend-item green">
                  <span className="legend-dot green" /> Normal Daily Baseline
                </span>
              </div>
              <div className="radar-coords-pill">
                <Crosshair size={12} />
                <span>CENTROID: {activeZone.coords}</span>
              </div>
            </div>
          </div>

          {/* FILTER PILLS BELOW RADAR */}
          <div className="scanner-filter-bar">
            <span className="filter-label">
              <Filter size={13} /> FILTER SHOPS:
            </span>
            <div className="filter-btn-group">
              <button
                className={`filter-btn ${filterMode === "all" ? "active" : ""}`}
                onClick={() => setFilterMode("all")}
              >
                All Shops ({totalMonitored})
              </button>
              <button
                className={`filter-btn alert ${filterMode === "spikesOnly" ? "active" : ""}`}
                onClick={() => setFilterMode("spikesOnly")}
              >
                ⚠️ Sudden Jumps Only ({totalSpikes})
              </button>
              <button
                className={`filter-btn ${filterMode === "bakeriesOnly" ? "active" : ""}`}
                onClick={() => setFilterMode("bakeriesOnly")}
              >
                Bakeries & Sweets
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED ANOMALY DOSSIER & ACTIONS */}
        <div className="anomaly-dossier-panel">
          <div className="dossier-panel-header">
            <div className="panel-title-group">
              <BadgeAlert size={18} className="text-amber" />
              <h4>AI Anomaly Forensic Profile</h4>
            </div>
            {activeMerchant?.isSpike ? (
              <span className="dossier-alert-tag critical">
                ⚠️ ANOMALOUS CASH JUMP (4x+ SPIKE)
              </span>
            ) : (
              <span className="dossier-alert-tag normal">
                ✅ NORMAL PATTERN
              </span>
            )}
          </div>

          {activeMerchant ? (
            <div className="dossier-content-card">
              {/* MERCHANT IDENTITY & STREET ADDRESS */}
              <div className="merchant-identity-banner">
                <div className="identity-left">
                  <div className={`shop-avatar-box ${activeMerchant.isSpike ? "alert" : "normal"}`}>
                    <Store size={22} />
                  </div>
                  <div>
                    <h3 className="merchant-name-title">{activeMerchant.alias}</h3>
                    <div className="merchant-meta-row">
                      <span className="meta-category-badge">{activeMerchant.category}</span>
                      <span className="meta-address-text">
                        <MapPin size={12} /> {activeMerchant.address}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="risk-score-badge">
                  <span className="score-num">{activeMerchant.riskScore}</span>
                  <small>AI RISK</small>
                </div>
              </div>

              {/* CASH SPIKE COMPARISON METRICS CARDS */}
              <div className="cash-comparison-metric-grid">
                <div className="metric-box baseline">
                  <span className="metric-label">NORMAL DAILY BASELINE</span>
                  <div className="metric-val">{money(activeMerchant.usualDaily)}</div>
                  <small className="metric-sub">Average 30-day daily cash drawer</small>
                </div>

                <div className={`metric-box observed ${activeMerchant.isSpike ? "spike" : ""}`}>
                  <span className="metric-label">TODAY'S CASH DRAWER</span>
                  <div className="metric-val highlight">{money(activeMerchant.todayCash)}</div>
                  <small className="metric-sub">Observed physical cash intake</small>
                </div>

                <div className="metric-box jump-multiple">
                  <span className="metric-label">SUDDEN CASH JUMP</span>
                  <div className={`metric-val ${activeMerchant.isSpike ? "text-amber" : "text-emerald"}`}>
                    {activeMerchant.jumpMultiple}x Higher
                  </div>
                  <small className="metric-sub">
                    Difference: +{money(activeMerchant.increase)}
                  </small>
                </div>
              </div>

              {/* VISUAL CASH BAR COMPARISON */}
              <div className="cash-bar-visual-wrap">
                <div className="bar-label-row">
                  <span>Cash Drawer vs Normal Sales Comparison:</span>
                  <b>{activeMerchant.jumpMultiple}x Multiplier</b>
                </div>
                <div className="multi-layer-cash-track">
                  <div
                    className="cash-bar-baseline"
                    style={{ width: `${Math.min(100, (activeMerchant.usualDaily / activeMerchant.todayCash) * 100)}%` }}
                    title={`Normal Baseline: ${money(activeMerchant.usualDaily)}`}
                  >
                    <span>Baseline</span>
                  </div>
                  <div
                    className="cash-bar-jump"
                    style={{ width: `${Math.max(0, 100 - (activeMerchant.usualDaily / activeMerchant.todayCash) * 100)}%` }}
                    title={`Unexplained Cash Spike: +${money(activeMerchant.increase)}`}
                  >
                    <span>+{money(activeMerchant.increase)} Anomaly</span>
                  </div>
                </div>
              </div>

              {/* AI FORENSIC LOGIC EXPLAINER */}
              <div className="ai-explainer-box">
                <div className="explainer-header">
                  <Sparkles size={15} className="text-cyan" />
                  <b>AI Forensic Detection Logic:</b>
                </div>
                <p className="explainer-body">{activeMerchant.aiReason}</p>

                {activeMerchant.isSpike && (
                  <div className="mule-route-indicator">
                    <span className="route-label">IDENTIFIED DIGITAL MULE SWEEP:</span>
                    <div className="route-flow-pill">
                      <span>{activeMerchant.alias}</span>
                      <ArrowRight size={13} className="text-amber" />
                      <b className="mule-account-highlight">{activeMerchant.connectedAltAcc}</b>
                    </div>
                  </div>
                )}
              </div>

              {/* QUICK ACTION BUTTONS */}
              <div className="dossier-actions-row">
                {activeMerchant.isSpike && (
                  <button
                    className="btn-dossier-primary"
                    onClick={() => handleOpenInCashDesk(activeMerchant)}
                    title="Send this bakery to the Cash to Shop Laundering Desk to simulate the cash handover"
                  >
                    <Building2 size={15} />
                    <span>Test Laundering at this Shop</span>
                    <ArrowRight size={14} />
                  </button>
                )}

                <button
                  className="btn-dossier-secondary"
                  onClick={handleCopyBrief}
                  title="Copy AI Forensic Surveillance Brief to clipboard"
                >
                  {copySuccess ? <CheckCircle2 size={15} className="text-emerald" /> : <FileText size={15} />}
                  <span>{copySuccess ? "Brief Copied!" : "Export AI Dispatch Brief"}</span>
                </button>

                <button
                  className="btn-dossier-tertiary"
                  onClick={() => {
                    sounds.playClick();
                    if (typeof onNavigateTab === "function") {
                      onNavigateTab("overview");
                    }
                  }}
                  title="Trace in live Money Flow Network"
                >
                  <Eye size={15} />
                  <span>View in Money Flow Map</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="dossier-empty-state">
              <Store size={36} className="text-muted" />
              <p>Select a shop from the radar or list to view its cash anomaly profile.</p>
            </div>
          )}

          {/* LIST OF ALL MONITORED MERCHANTS IN SECTOR */}
          <div className="monitored-merchants-sublist">
            <div className="sublist-header">
              <span>ALL MONITORED RETAIL LOCATIONS IN THIS SECTOR:</span>
              <small>{displayedMerchants.length} points active</small>
            </div>

            <div className="merchants-scroll-stack">
              {displayedMerchants.map((item) => {
                const isSelected = activeMerchant?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`merchant-sublist-row ${isSelected ? "selected" : ""} ${item.isSpike ? "spike-row" : ""}`}
                    onClick={() => {
                      sounds.playClick();
                      setSelectedMerchantId(item.id);
                    }}
                  >
                    <div className="row-left">
                      <div className={`row-icon-pip ${item.isSpike ? "red" : "green"}`}>
                        <Store size={13} />
                      </div>
                      <div>
                        <b>{item.alias}</b>
                        <small>{item.category} · {item.address}</small>
                      </div>
                    </div>

                    <div className="row-right">
                      <div className="row-cash-info">
                        <b>{money(item.todayCash)}</b>
                        <small>Baseline: {money(item.usualDaily)}</small>
                      </div>
                      <span className={`badge-spike ${item.isSpike ? "red" : "green"}`}>
                        {item.isSpike ? `${item.jumpMultiple}x SPIKE` : "NORMAL"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

