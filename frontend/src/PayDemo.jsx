import { useState, useRef, useEffect } from "react";
import {
  ArrowRight, BadgeAlert, Banknote, Check, CheckCircle2, ChevronRight,
  CircleHelp, Copy, Gift, Info, Lock, MapPin, Mic, QrCode, RefreshCw, RotateCcw,
  Search, Shield, ShieldCheck, Smartphone, Sparkles, Store, Tag,
  Volume2, VolumeX, Wallet, X, Zap
} from "lucide-react";
import { sounds, triggerConfetti } from "./soundEffects";

const API = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8000" : "");
const BRIDGE_KEY = "toofan-shield-demo-scenario";

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

const RECENT_CONTACTS = [
  { id: "bakery", name: "Fort Road Bakery", handle: "bakery.demo@upi", category: "Food & Bakery", color: "#1a73e8", initial: "F", verified: true, isBusiness: true },
  { id: "fakeacc7a", name: "Fake Acc 7A (Collector)", handle: "fakeacc7a@okicici", category: "Fake Account (Mule)", color: "#ea4335", initial: "F", verified: false, isBusiness: false },
  { id: "canteen", name: "Campus Canteen", handle: "canteen.central@upi", category: "Snacks & Canteen", color: "#34a853", initial: "C", verified: true, isBusiness: true },
  { id: "student28", name: "Aarav S. (Student)", handle: "student28@okaxis", category: "Student Friend", color: "#fbbc04", initial: "A", verified: false, isBusiness: false },
  { id: "cashouthub", name: "Final Cashout Hub", handle: "cashout.hub@settle", category: "Cashout Destination", color: "#673ab7", initial: "C", verified: false, isBusiness: false },
  { id: "student31", name: "Pooja M. (Student)", handle: "student31@okaxis", category: "Student Friend", color: "#e91e63", initial: "P", verified: false, isBusiness: false },
];

const PRESETS = [
  { id: "candy", label: "🍬 Candy Shop Trick", desc: "Student pays ₹35 at Bakery -> money forwarded to Fake Acc & Cashout Hub" },
  { id: "direct", label: "⚡ Split Transfers", desc: "Multiple student transfers gathered into Fake Acc 7A" },
  { id: "burst", label: "🌐 Fast Multi-Hop Burst", desc: "7 payments sent through fake accounts to final hub" },
  { id: "cash", label: "💵 Suspicious Cash Spike", desc: "Shop deposits unusual cash into bank account" },
];

export default function PayDemo({ embedded = false }) {
  const [activeTab, setActiveTab] = useState("consumer"); // consumer | business
  const [sender, setSender] = useState("STUDENT-014");
  const [recipient, setRecipient] = useState("bakery.demo@upi");
  const [recipientName, setRecipientName] = useState("Fort Road Bakery");
  const [amount, setAmount] = useState("75");
  const [note, setNote] = useState("Bakery snacks & drink");
  const [bankAccount, setBankAccount] = useState("sbi");

  // Merchant Cash Review state
  const [category, setCategory] = useState("Bakery");
  const [merchant, setMerchant] = useState("MERCHANT-DEMO-01");
  const [baseline, setBaseline] = useState("200");
  const [observed, setObserved] = useState("900");

  // Modals & Sheets
  const [showPaySheet, setShowPaySheet] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinDigits, setPinDigits] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showPersonalQR, setShowPersonalQR] = useState(false);
  const [showScratchCard, setShowScratchCard] = useState(false);
  const [scratchRevealed, setScratchRevealed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastTxId, setLastTxId] = useState("UPI/432910481029/PAY");
  const [searchQuery, setSearchQuery] = useState("");

  const canvasRef = useRef(null);

  const baselineValue = Number(baseline) || 0;
  const observedValue = Number(observed) || 0;
  const increase = observedValue - baselineValue;
  const ratio = baselineValue > 0 ? observedValue / baselineValue : null;
  const isOutlier = baselineValue > 0
    ? observedValue >= 4 * baselineValue && increase >= 500
    : observedValue >= 500;

  useEffect(() => {
    sounds.muted = !soundEnabled;
  }, [soundEnabled]);

  function handleSelectContact(contact) {
    setRecipient(contact.handle);
    setRecipientName(contact.name);
    setShowPaySheet(true);
    sounds.playClick();
  }

  function handlePreset(p) {
    sounds.playClick();
    if (p.id === "candy") {
      setSender("STUDENT-014");
      setRecipient("bakery.demo@upi");
      setRecipientName("Fort Road Bakery");
      setAmount("35");
      setNote("Candy purchase");
      setShowPaySheet(true);
    } else if (p.id === "direct") {
      setSender("STUDENT-021");
      setRecipient("fakeacc7a@okicici");
      setRecipientName("Fake Acc 7A (Collector)");
      setAmount("700");
      setNote("Money transfer");
      setShowPaySheet(true);
    } else if (p.id === "burst") {
      executeBurst();
    } else if (p.id === "cash") {
      setActiveTab("business");
      setMerchant("MERCHANT-DEMO-01");
      setBaseline("200");
      setObserved("900");
    }
  }

  async function resetAllTransactions() {
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
      notice: "All synthetic transactions and paths have been reset.",
    };
    try {
      localStorage.setItem(BRIDGE_KEY, JSON.stringify({
        createdAt: new Date().toISOString(),
        transactions: [],
        merchantObservations: [],
        trace: emptyTrace,
      }));
      await fetch(`${API}/api/reset`, { method: "POST" });
    } catch {}
    setStatus("✨ All transactions have been reset to zero.");
    setTimeout(() => setStatus(""), 4000);
  }

  async function executeBurst() {
    setBusy(true);
    setStatus("Broadcasting payments to Money Flow Map...");
    const transactions = [
      { sender: "STUDENT-014", receiver: "BAKERY-QR-02", amount: 35, channel: "upi", is_p2m: true },
      { sender: "BAKERY-QR-02", receiver: "FAKE-ACC-7A", amount: 3400, channel: "merchant-settlement", is_p2m: false },
      { sender: "STUDENT-028", receiver: "FAKE-ACC-7A", amount: 950, channel: "upi", is_p2m: false },
      { sender: "STUDENT-031", receiver: "FAKE-ACC-7A", amount: 1250, channel: "upi", is_p2m: false },
      { sender: "FAKE-ACC-7A", receiver: "CASHOUT-HUB", amount: 5600, channel: "transfer", is_p2m: false },
      { sender: "STUDENT-044", receiver: "FAKE-ACC-8B", amount: 600, channel: "upi", is_p2m: false },
      { sender: "FAKE-ACC-8B", receiver: "CASHOUT-HUB", amount: 600, channel: "transfer", is_p2m: false },
    ];
    try {
      localStorage.setItem(BRIDGE_KEY, JSON.stringify({
        createdAt: new Date().toISOString(),
        transactions,
        merchantObservations: [],
      }));
      const res = await fetch(`${API}/api/trace-mule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions, merchant_observations: [] }),
      });
      if (res.ok) {
        const trace = await res.json();
        localStorage.setItem(BRIDGE_KEY, JSON.stringify({
          createdAt: new Date().toISOString(),
          transactions,
          merchantObservations: [],
          trace,
        }));
      }
      sounds.playPaySuccess();
      setStatus("Burst sequence sent! Money trails updated in Command Center.");
    } catch {
      setStatus("Burst sequence saved locally.");
    } finally {
      setBusy(false);
    }
  }

  function startPaymentFlow() {
    if (!Number(amount) || Number(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    sounds.playClick();
    if (bankAccount === "upilite") {
      processTransfer();
    } else {
      setShowPinModal(true);
      setPinDigits("");
    }
  }

  function handleKeypadPress(num) {
    if (pinDigits.length < 4) {
      sounds.playClick();
      const updated = pinDigits + num;
      setPinDigits(updated);
      if (updated.length === 4) {
        setTimeout(() => {
          setShowPinModal(false);
          processTransfer();
        }, 220);
      }
    }
  }

  function handleKeypadBackspace() {
    sounds.playClick();
    setPinDigits((prev) => prev.slice(0, -1));
  }

  async function processTransfer() {
    setBusy(true);
    setShowPaySheet(false);
    const numAmount = Number(amount) || 50;
    const cleanSender = sender.trim().toUpperCase() || "STUDENT-014";
    const cleanReceiver = recipient.trim();
    const isP2M = recipient.toLowerCase().includes("bakery") || recipient.toLowerCase().includes("canteen");

    const txId = `UPI/${Math.floor(100000000000 + Math.random() * 900000000000)}/PAY`;
    setLastTxId(txId);

    const transactions = isP2M
      ? [
          { sender: cleanSender, receiver: cleanReceiver, amount: numAmount, channel: "upi", is_p2m: true, reference_id: txId },
          { sender: cleanReceiver, receiver: "FAKE-ACC-7A", amount: Math.max(0, numAmount * 4), channel: "merchant-settlement", is_p2m: false, reference_id: txId },
          { sender: "FAKE-ACC-7A", receiver: "CASHOUT-HUB", amount: Math.max(0, numAmount * 4 - 30), channel: "bank-transfer", is_p2m: false, reference_id: txId },
        ]
      : [
          { sender: cleanSender, receiver: cleanReceiver, amount: numAmount, channel: "upi", is_p2m: false, reference_id: txId },
          { sender: cleanReceiver, receiver: "FAKE-ACC-8B", amount: Math.max(0, numAmount * 3), channel: "transfer", is_p2m: false, reference_id: txId },
          { sender: "FAKE-ACC-8B", receiver: "CASHOUT-HUB", amount: Math.max(0, numAmount * 3 - 50), channel: "transfer", is_p2m: false, reference_id: txId },
        ];

    try {
      localStorage.setItem(BRIDGE_KEY, JSON.stringify({
        createdAt: new Date().toISOString(),
        transactions,
        merchantObservations: [],
      }));

      const res = await fetch(`${API}/api/trace-mule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions, merchant_observations: [] }),
      });
      if (res.ok) {
        const trace = await res.json();
        localStorage.setItem(BRIDGE_KEY, JSON.stringify({
          createdAt: new Date().toISOString(),
          transactions,
          merchantObservations: [],
          trace,
        }));
      }
    } catch {
      // Offline demo fallback
    } finally {
      setBusy(false);
      setShowSuccess(true);
      sounds.playPaySuccess();
      setTimeout(() => {
        triggerConfetti(canvasRef);
      }, 100);
    }
  }

  async function submitMerchantCash() {
    setBusy(true);
    setStatus("");
    sounds.playCashRegister();
    const cleanMerchant = merchant.trim().toUpperCase() || "MERCHANT-DEMO-01";
    const txId = `CASH-DEP/${Math.floor(10000000 + Math.random() * 90000000)}`;

    const transactions = [
      { sender: `${cleanMerchant}-CASH-VAULT`, receiver: "COMMERCIAL-BANK-SETTLEMENT", amount: observedValue, channel: "cash-deposit", is_p2m: false, event_type: "cash_deposit", reference_id: txId },
      { sender: "COMMERCIAL-BANK-SETTLEMENT", receiver: "FAKE-ACC-7A", amount: Math.max(0, observedValue - 40), channel: "merchant-settlement", is_p2m: false, event_type: "settlement", reference_id: txId },
      { sender: "FAKE-ACC-7A", receiver: "CASHOUT-HUB", amount: Math.max(0, observedValue - 90), channel: "bank-transfer", is_p2m: false, event_type: "transfer", reference_id: txId },
    ];

    const merchantObservations = [{
      merchant_alias: cleanMerchant,
      category,
      usual_daily_receipts: baselineValue,
      observed_daily_receipts: observedValue,
    }];

    try {
      localStorage.setItem(BRIDGE_KEY, JSON.stringify({
        createdAt: new Date().toISOString(),
        transactions,
        merchantObservations,
      }));
      const res = await fetch(`${API}/api/trace-mule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions, merchant_observations: merchantObservations }),
      });
      if (res.ok) {
        const trace = await res.json();
        localStorage.setItem(BRIDGE_KEY, JSON.stringify({
          createdAt: new Date().toISOString(),
          transactions,
          merchantObservations,
          trace,
        }));
      }
      sounds.speakAnnouncement(`Rupees ${observedValue} cash received at ${cleanMerchant}`);
      setStatus(`Cash observation logged! ${money(observedValue)} deposit sent to Money Flow Map.`);
    } catch {
      setStatus("Cash observation stored locally.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`gpay-official-wrapper ${embedded ? "is-embedded" : ""}`}>
      <div className="gpay-rainbow-bar" />
      <canvas ref={canvasRef} className="gpay-confetti-canvas" />

      {/* OFFICIAL GPAY TOP APP BAR */}
      <header className="gpay-appbar">
        <div className="gpay-brand-area">
          <div className="gpay-logo-symbol">
            <span className="dot-blue" />
            <span className="dot-red" />
            <span className="dot-yellow" />
            <span className="dot-green" />
          </div>
          <div className="gpay-wordmark">
            <span className="g-brand">Google</span>
            <span className="pay-brand-name">Pay</span>
          </div>
          <span className="gpay-official-badge">
            <span className="status-dot-live" /> OFFICIAL SIMULATOR
          </span>
        </div>

        {/* SEARCH & QUICK ACTION */}
        <div className="gpay-search-box">
          <Search size={16} className="search-icon-muted" />
          <input
            type="text"
            placeholder="Search contacts, phone, or UPI ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Mic size={16} className="mic-icon-muted" />
        </div>

        <div className="gpay-actions-right">
          <button
            className={`sound-switch-btn ${soundEnabled ? "on" : "off"}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Sound Effects On" : "Sound Muted"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {!embedded && (
            <a href="/" className="btn-return-command">
              <Shield size={14} />
              <span>Shield Command Center</span>
              <ArrowRight size={13} />
            </a>
          )}

          <div
            className="user-profile-badge"
            onClick={() => setShowPersonalQR(true)}
            role="button"
            tabIndex={0}
            title="Click to view personal receive QR"
          >
            <div className="profile-initial">{sender.slice(0, 1)}</div>
            <div className="profile-text">
              <b>{sender}</b>
              <small>student14@okaxis</small>
            </div>
            <QrCode size={16} className="qr-preview-icon" />
          </div>
        </div>
      </header>

      {/* TOP NAVIGATION SEGMENTS & PRESETS */}
      <div className="gpay-segmented-bar">
        <div className="segment-pills">
          <button
            className={`seg-pill ${activeTab === "consumer" ? "active" : ""}`}
            onClick={() => { setActiveTab("consumer"); sounds.playClick(); }}
          >
            <Smartphone size={15} />
            <span>Personal (UPI Pay)</span>
          </button>
          <button
            className={`seg-pill ${activeTab === "business" ? "active" : ""}`}
            onClick={() => { setActiveTab("business"); sounds.playClick(); }}
          >
            <Store size={15} />
            <span>Business & Cash Register</span>
          </button>
        </div>

        {/* 1-CLICK TEST SCENARIO CHIPS */}
        <div className="preset-chips-row">
          <span className="preset-title"><Zap size={13} /> Quick Scenarios:</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`preset-chip preset-${p.id}`}
              onClick={() => handlePreset(p)}
              title={p.desc}
            >
              {p.label}
            </button>
          ))}
          <button
            className="preset-chip preset-reset"
            onClick={resetAllTransactions}
            title="Reset and clear all transactions"
          >
            <RotateCcw size={12} />
            <span>Reset Transactions</span>
          </button>
        </div>
      </div>

      {status && (
        <div className="gpay-top-status-toast">
          <span>{status}</span>
          <button className="btn-close-toast" onClick={() => setStatus("")}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="gpay-scrollable-body">
        {activeTab === "consumer" ? (
          /* ==========================================================
             CONSUMER / PERSONAL UPI MODE (CLEAN, ICONIC GPAY)
             ========================================================== */
          <div className="gpay-consumer-view">
            {/* 4 PRIMARY HERO ACTION TILES */}
            <section className="gpay-action-tiles-grid">
              <button className="gpay-tile-btn" onClick={() => setShowScanner(true)}>
                <div className="tile-icon-circle blue">
                  <QrCode size={24} />
                </div>
                <b>Scan any QR</b>
                <small>Camera / Gallery</small>
              </button>

              <button className="gpay-tile-btn" onClick={() => setShowPaySheet(true)}>
                <div className="tile-icon-circle green">
                  <Wallet size={24} />
                </div>
                <b>Pay contacts</b>
                <small>UPI Friends</small>
              </button>

              <button className="gpay-tile-btn" onClick={() => {
                setRecipient("9876543210@paytm");
                setRecipientName("Merchant Phone Pay");
                setShowPaySheet(true);
              }}>
                <div className="tile-icon-circle yellow">
                  <Smartphone size={24} />
                </div>
                <b>Pay phone</b>
                <small>Direct Mobile</small>
              </button>

              <button className="gpay-tile-btn" onClick={() => {
                setRecipient("SBIN000184-48201948");
                setRecipientName("Commercial Bank Account");
                setShowPaySheet(true);
              }}>
                <div className="tile-icon-circle red">
                  <Banknote size={24} />
                </div>
                <b>Bank transfer</b>
                <small>Account + IFSC</small>
              </button>
            </section>

            {/* PEOPLE SECTION (CIRCLES WITH COLORED RINGS) */}
            <section className="gpay-section-block">
              <div className="section-head-row">
                <h3>People & Frequent Transfers</h3>
                <button className="section-link-action" onClick={() => setShowPaySheet(true)}>
                  New Transfer <ChevronRight size={14} />
                </button>
              </div>

              <div className="contacts-circle-grid">
                {RECENT_CONTACTS.filter(c => !c.isBusiness).map((contact) => (
                  <div
                    key={contact.id}
                    className="contact-bubble"
                    onClick={() => handleSelectContact(contact)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="bubble-ring" style={{ borderColor: contact.color }}>
                      <div className="bubble-avatar" style={{ background: `${contact.color}15`, color: contact.color }}>
                        {contact.initial}
                      </div>
                    </div>
                    <span className="bubble-name">{contact.name}</span>
                    <small className="bubble-cat">{contact.category}</small>
                  </div>
                ))}

                <div
                  className="contact-bubble add"
                  onClick={() => setShowPaySheet(true)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="bubble-ring add-dashed">
                    <div className="bubble-avatar add-symbol">+</div>
                  </div>
                  <span className="bubble-name">Pay Anyone</span>
                  <small className="bubble-cat">Enter UPI ID</small>
                </div>
              </div>
            </section>

            {/* VERIFIED BUSINESSES & MERCHANTS */}
            <section className="gpay-section-block">
              <div className="section-head-row">
                <h3>Verified Merchants & Stores</h3>
                <button className="section-link-action" onClick={() => setActiveTab("business")}>
                  Merchant Desk <ChevronRight size={14} />
                </button>
              </div>

              <div className="contacts-circle-grid">
                {RECENT_CONTACTS.filter(c => c.isBusiness).map((contact) => (
                  <div
                    key={contact.id}
                    className="contact-bubble merchant"
                    onClick={() => handleSelectContact(contact)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="bubble-ring business-glow">
                      <div className="bubble-avatar" style={{ background: "#e8f0fe", color: "#1a73e8" }}>
                        <Store size={22} />
                      </div>
                    </div>
                    <span className="bubble-name">{contact.name}</span>
                    <span className="verified-check-tag"><Check size={10} /> Verified</span>
                  </div>
                ))}
              </div>
            </section>

            {/* REWARDS & SCRATCH CARD BANNER */}
            <section className="gpay-rewards-strip">
              <div
                className="reward-banner-card"
                onClick={() => { setShowScratchCard(true); setScratchRevealed(false); }}
              >
                <div className="reward-icon-badge">
                  <Gift size={22} />
                </div>
                <div className="reward-copy">
                  <b>Rewards & Cashbacks</b>
                  <span>₹1,240 won this month · Tap to scratch reward</span>
                </div>
                <ChevronRight size={16} className="reward-arrow" />
              </div>

              <div
                className="reward-banner-card burst"
                onClick={() => executeBurst()}
              >
                <div className="reward-icon-badge blue">
                  <Sparkles size={22} />
                </div>
                <div className="reward-copy">
                  <b>Simulate Fast Multi-Transfer Burst</b>
                  <span>7 test payments sent through fake accounts to final hub</span>
                </div>
                <ChevronRight size={16} className="reward-arrow" />
              </div>
            </section>

            {/* OFFICIAL TRUST FOOTER */}
            <div className="gpay-trust-footer">
              <div className="trust-lock-row">
                <ShieldCheck size={16} className="text-emerald" />
                <span>BHIM UPI OFFICIAL PROTOCOL · PRACTICE DEMO MODE</span>
              </div>
              <p>
                All account names and money amounts are for practice and testing only. Every payment is tracked to show how money moves through fake accounts.
              </p>
            </div>
          </div>
        ) : (
          /* ==========================================================
             BUSINESS & CASH REGISTER MODE
             ========================================================== */
          <div className="gpay-business-view">
            {/* HERO BANNER WITH SOUND POD */}
            <div className="business-summary-card">
              <div className="summary-left">
                <span className="official-biz-tag">
                  <Store size={13} /> GOOGLE PAY FOR BUSINESS
                </span>
                <h2>Shop Cash Counter & Daily Sales</h2>
                <p>
                  Check daily shop cash against normal day-to-day sales. If cash suddenly jumps 4x higher than normal, an alert is triggered.
                </p>
              </div>

              {/* INTERACTIVE SOUND POD / SOUNDBOX */}
              <div className="soundbox-hardware-card">
                <div className="soundbox-header">
                  <span className="soundbox-led pulse-blue" />
                  <b>GPay Sound Pod</b>
                </div>
                <div className="soundbox-grill">
                  <Volume2 size={24} className="soundbox-speaker-icon" />
                  <div className="sound-waves-anim">
                    <span className="eq-bar bar-1" />
                    <span className="eq-bar bar-2" />
                    <span className="eq-bar bar-3" />
                    <span className="eq-bar bar-4" />
                    <span className="eq-bar bar-5" />
                  </div>
                </div>
                <div className="soundbox-btn-row">
                  <button
                    className="btn-soundbox-test"
                    onClick={() => {
                      sounds.playCashRegister();
                      sounds.speakAnnouncement(`Rupees ${observedValue} received on Google Pay`, "en-IN");
                    }}
                    title="English voice announcement"
                  >
                    Voice (EN)
                  </button>
                  <button
                    className="btn-soundbox-test secondary"
                    onClick={() => {
                      sounds.playCashRegister();
                      sounds.speakAnnouncement(`गूगल पे पर ${observedValue} रुपये प्राप्त हुए`, "hi-IN");
                    }}
                    title="Hindi voice announcement"
                  >
                    आवाज़ (HI)
                  </button>
                </div>
              </div>
            </div>

            {/* RECONCILIATION & STANDEE GRID */}
            <div className="business-workspace-grid">
              {/* CASH DESK FORM */}
              <section className="cash-reconcile-card">
                <div className="reconcile-card-head">
                  <Banknote size={20} className="text-emerald" />
                  <div>
                    <h3>Daily Shop Cash Check</h3>
                    <p>Compare today's cash in drawer against usual daily sales</p>
                  </div>
                </div>

                <div className="reconcile-inputs-row">
                  <div className="input-group">
                    <label>Merchant Alias</label>
                    <input
                      className="clean-input"
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
                    />
                  </div>
                  <div className="input-group">
                    <label>Trade Category</label>
                    <select
                      className="clean-input"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option>Bakery & Sweets</option>
                      <option>General Store / Provision</option>
                      <option>Hotel & Restaurant</option>
                      <option>Paan & Snack Shop</option>
                    </select>
                  </div>
                </div>

                <div className="slider-comparison-box">
                  <div className="receipt-stat-col">
                    <span className="stat-heading">Usual Daily Sales</span>
                    <div className="stat-currency-line">
                      <span>₹</span>
                      <input
                        type="number"
                        min="0"
                        value={baseline}
                        onChange={(e) => setBaseline(e.target.value)}
                      />
                    </div>
                    <small>Normal average cash per day</small>
                    <input
                      type="range"
                      min="50"
                      max="1000"
                      step="50"
                      value={baseline}
                      onChange={(e) => setBaseline(e.target.value)}
                      className="range-slider"
                    />
                  </div>

                  <div className="receipt-stat-col observed">
                    <span className="stat-heading text-red">Today's Actual Cash</span>
                    <div className="stat-currency-line text-red">
                      <span>₹</span>
                      <input
                        type="number"
                        min="0"
                        value={observed}
                        onChange={(e) => setObserved(e.target.value)}
                      />
                    </div>
                    <small>Money counted in drawer today</small>
                    <input
                      type="range"
                      min="100"
                      max="4000"
                      step="50"
                      value={observed}
                      onChange={(e) => setObserved(e.target.value)}
                      className="range-slider red"
                    />
                  </div>
                </div>

                {/* ANOMALY MULTIPLIER GAUGE */}
                <div className={`anomaly-gauge-pill ${isOutlier ? "is-anomaly" : "is-normal"}`}>
                  <div className="anomaly-icon-wrap">
                    {isOutlier ? <BadgeAlert size={24} /> : <CheckCircle2 size={24} />}
                  </div>
                  <div className="anomaly-text">
                    <div className="anomaly-title-line">
                      <b>{isOutlier ? "⚠️ UNUSUAL CASH SPIKE DETECTED!" : "✅ NORMAL CASH AMOUNT"}</b>
                      <span className="badge-ratio">
                        {ratio ? `${ratio.toFixed(1)}x of normal` : "No normal set"}
                      </span>
                    </div>
                    <p>
                      Difference: <b>{increase >= 0 ? "+" : "−"}{money(Math.abs(increase))}</b> compared to normal.
                      {isOutlier
                        ? " This is 4 times higher than usual (+₹500+). A sudden jump like this often means someone is depositing suspicious cash through the shop."
                        : " Cash level looks normal and safe."}
                    </p>
                  </div>
                </div>

                <div className="reconcile-actions-bar">
                  <button
                    className="btn-gpay-main"
                    onClick={submitMerchantCash}
                    disabled={busy}
                  >
                    <Banknote size={17} />
                    <span>{busy ? "Broadcasting..." : `Deposit Shop Cash (${money(observedValue)})`}</span>
                  </button>

                  <button
                    className="btn-gpay-outline"
                    onClick={() => {
                      sounds.speakAnnouncement(`Daily settlement summary: Rupees ${observedValue}`);
                    }}
                  >
                    <Volume2 size={16} />
                    <span>Soundbox Voice Check</span>
                  </button>
                </div>

                {status && <div className="status-toast-pill">{status}</div>}
              </section>

              {/* MERCHANT QR STANDEE PREVIEW */}
              <aside className="merchant-standee-preview">
                <div className="standee-3d-card">
                  <div className="standee-top-brand">
                    <span className="g-brand-mini">Google</span>
                    <span className="pay-brand-mini">Pay</span>
                    <small>Accepted Here</small>
                  </div>

                  <div className="standee-qr-frame">
                    <QrCode size={120} className="qr-svg-mock" />
                    <b>{merchant}</b>
                    <span>Scan & Pay with any UPI app</span>
                  </div>

                  <div className="standee-footer-labels">
                    <span>BHIM UPI · GOOGLE PAY FOR BUSINESS</span>
                  </div>
                </div>

                <div className="standee-guidance-note">
                  <Info size={15} />
                  <span>
                    Cash can come from anywhere. Very large cash deposits should be checked to verify where the money came from.
                  </span>
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================================
          MODALS & SLIDE-UP SHEETS
          ========================================================== */}

      {/* MODAL 1: INTERACTIVE GPAY PAYMENT SHEET */}
      {showPaySheet && (
        <div className="sheet-backdrop-overlay" onClick={() => setShowPaySheet(false)}>
          <div className="gpay-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-pill-handle" />

            <div className="sheet-top-header">
              <button className="sheet-close-icon" onClick={() => setShowPaySheet(false)}>
                <X size={18} />
              </button>
              <h4>Pay with Google Pay</h4>
              <ShieldCheck size={18} className="text-google-blue" />
            </div>

            <div className="sheet-payee-card">
              <div className="payee-avatar-circle">
                {recipientName.slice(0, 1)}
              </div>
              <div className="payee-info-col">
                <h5>{recipientName}</h5>
                <div className="payee-handle-row">
                  <span>{recipient}</span>
                  <span className="verified-chip"><Check size={10} /> Verified Merchant</span>
                </div>
                <small className="banking-legal-name">Banking Name: {recipientName.toUpperCase()} PVT LTD</small>
              </div>
            </div>

            {/* MASSIVE CURRENCY INPUT */}
            <div className="sheet-currency-input-wrapper">
              <span className="rupee-sign">₹</span>
              <input
                type="number"
                className="huge-amount-field"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>

            {/* QUICK AMOUNT CHIPS */}
            <div className="quick-chips-wrapper">
              {["+50", "+100", "+500", "+1000"].map((add) => (
                <button
                  key={add}
                  className="quick-chip-btn"
                  onClick={() => {
                    sounds.playClick();
                    setAmount((prev) => String((Number(prev) || 0) + Number(add.replace("+", ""))));
                  }}
                >
                  {add}
                </button>
              ))}
            </div>

            {/* NOTE INPUT */}
            <div className="sheet-note-wrapper">
              <input
                type="text"
                placeholder="What's this payment for? (Add note)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* BANK SELECTOR */}
            <div className="sheet-bank-selector">
              <label className="section-micro-label">PAY FROM ACCOUNT</label>
              <div className="bank-options-list">
                <label className={`bank-choice-card ${bankAccount === "sbi" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="bank"
                    checked={bankAccount === "sbi"}
                    onChange={() => setBankAccount("sbi")}
                  />
                  <div className="bank-logo-box sbi">SBI</div>
                  <div className="bank-details-copy">
                    <b>State Bank of India •••• 4291</b>
                    <small>Savings Account · Primary</small>
                  </div>
                  <div className="radio-circle-indicator" />
                </label>

                <label className={`bank-choice-card ${bankAccount === "upilite" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="bank"
                    checked={bankAccount === "upilite"}
                    onChange={() => setBankAccount("upilite")}
                  />
                  <div className="bank-logo-box lite">LITE</div>
                  <div className="bank-details-copy">
                    <b>UPI Lite (No PIN needed)</b>
                    <small>Balance: ₹1,500 · Instant 1-tap</small>
                  </div>
                  <div className="radio-circle-indicator" />
                </label>
              </div>
            </div>

            <button
              className="btn-gpay-submit-pay"
              onClick={startPaymentFlow}
              disabled={busy}
            >
              <Lock size={15} />
              <span>{busy ? "Securing payment..." : `Pay ₹${amount || "0"}`}</span>
            </button>

            <div className="secured-by-npci-row">
              <span>Secured by</span>
              <b>UPI</b>
              <span className="dot-sep" />
              <span>National Payments Corporation of India</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: 4-DIGIT UPI PIN SHEET */}
      {showPinModal && (
        <div className="sheet-backdrop-overlay">
          <div className="gpay-pin-sheet">
            <div className="pin-sheet-top">
              <button className="pin-close-icon" onClick={() => setShowPinModal(false)}>
                <X size={18} />
              </button>
              <div className="pin-bank-header">
                <span>STATE BANK OF INDIA</span>
                <b>Enter 4-Digit UPI PIN</b>
              </div>
              <div className="bhim-upi-logo">UPI</div>
            </div>

            <div className="pin-amount-badge">
              Paying ₹{amount} to {recipientName}
            </div>

            {/* 4 SECRET DOTS */}
            <div className="pin-dots-container">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`dot-indicator ${i < pinDigits.length ? "filled" : ""}`}
                />
              ))}
            </div>

            {/* NUMERIC KEYPAD */}
            <div className="pin-numeric-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  className="keypad-key"
                  onClick={() => handleKeypadPress(digit)}
                >
                  {digit}
                </button>
              ))}
              <div className="keypad-key empty" />
              <button className="keypad-key" onClick={() => handleKeypadPress(0)}>
                0
              </button>
              <button className="keypad-key backspace" onClick={handleKeypadBackspace}>
                ⌫
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ICONIC GPAY SUCCESS SCREEN */}
      {showSuccess && (
        <div className="sheet-backdrop-overlay">
          <div className="gpay-success-dialog">
            <div className="success-bouncing-circle">
              <Check size={42} strokeWidth={3} />
            </div>

            <div className="success-paid-amount">
              {money(Number(amount))}
            </div>
            <div className="success-paid-to">
              Paid to <b>{recipientName}</b>
            </div>
            <div className="success-recipient-handle">
              {recipient}
            </div>

            <div className="success-receipt-details">
              <div className="receipt-row">
                <span>UPI Ref ID</span>
                <code>{lastTxId}</code>
              </div>
              <div className="receipt-row">
                <span>Paid From</span>
                <span>SBI •••• 4291</span>
              </div>
              <div className="receipt-row">
                <span>Timestamp</span>
                <span>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>

            {/* SCRATCH CARD TEASER */}
            <div
              className="scratch-card-teaser-card"
              onClick={() => {
                setShowSuccess(false);
                setShowScratchCard(true);
                setScratchRevealed(false);
              }}
            >
              <Gift size={24} className="scratch-gift-icon" />
              <div className="scratch-teaser-text">
                <b>You earned a Google Pay Scratch Card! 🎁</b>
                <small>Tap here to reveal your cashback reward</small>
              </div>
              <ChevronRight size={18} />
            </div>

            <div className="success-actions-stack">
              <button
                className="btn-gpay-main full"
                onClick={() => {
                  setShowSuccess(false);
                  if (typeof window !== "undefined") {
                    window.location.href = "/";
                  }
                }}
              >
                <span>Track Cash on Main Dashboard</span>
                <ArrowRight size={15} />
              </button>

              <button
                className="btn-gpay-outline full"
                onClick={() => setShowSuccess(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CAMERA SCANNER SIMULATION */}
      {showScanner && (
        <div className="sheet-backdrop-overlay" onClick={() => setShowScanner(false)}>
          <div className="gpay-scanner-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="scanner-header-bar">
              <button className="scanner-close-btn" onClick={() => setShowScanner(false)}>
                <X size={20} />
              </button>
              <span>Scan any UPI QR</span>
              <Zap size={18} className="text-yellow" />
            </div>

            <div className="scanner-viewfinder">
              <div className="target-corner tl" />
              <div className="target-corner tr" />
              <div className="target-corner bl" />
              <div className="target-corner br" />
              <div className="animated-laser-bar" />
              <div className="scanner-hint">Align QR code within frame</div>
            </div>

            <div className="scanner-presets-box">
              <small>Simulate scanning verified demo QR:</small>
              <div className="scanner-chips-grid">
                <button
                  onClick={() => {
                    setShowScanner(false);
                    setRecipient("bakery.demo@upi");
                    setRecipientName("Fort Road Bakery");
                    setAmount("35");
                    setShowPaySheet(true);
                  }}
                >
                  🏪 Bakery QR (₹35)
                </button>
                <button
                  onClick={() => {
                    setShowScanner(false);
                    setRecipient("canteen.central@upi");
                    setRecipientName("Campus Canteen");
                    setAmount("45");
                    setShowPaySheet(true);
                  }}
                >
                  ☕ Canteen QR (₹45)
                </button>
                <button
                  onClick={() => {
                    setShowScanner(false);
                    setRecipient("fakeacc7a@okicici");
                    setRecipientName("Fake Acc 7A (Collector)");
                    setAmount("950");
                    setShowPaySheet(true);
                  }}
                >
                  ⚡ Fake Acc QR (₹950)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: PERSONAL RECEIVE QR */}
      {showPersonalQR && (
        <div className="sheet-backdrop-overlay" onClick={() => setShowPersonalQR(false)}>
          <div className="personal-qr-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="qr-dialog-close" onClick={() => setShowPersonalQR(false)}>
              <X size={18} />
            </button>
            <div className="personal-avatar-top">{sender.slice(0, 1)}</div>
            <h3>{sender}</h3>
            <span className="personal-handle-pill">student14@okaxis <Copy size={12} /></span>
            <div className="qr-container-clean">
              <QrCode size={160} />
            </div>
            <p>Scan with Google Pay, PhonePe, Paytm, or BHIM UPI</p>
          </div>
        </div>
      )}

      {/* MODAL 6: SCRATCH CARD REWARD */}
      {showScratchCard && (
        <div className="sheet-backdrop-overlay" onClick={() => setShowScratchCard(false)}>
          <div className="scratch-card-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="scratch-close-btn" onClick={() => setShowScratchCard(false)}>
              <X size={18} />
            </button>
            {!scratchRevealed ? (
              <div className="scratch-cover-surface" onClick={() => {
                setScratchRevealed(true);
                sounds.playCashRegister();
                triggerConfetti(canvasRef);
              }}>
                <Sparkles size={32} className="scratch-stars" />
                <h3>Tap to Scratch!</h3>
                <p>Google Pay Festive Cashback</p>
              </div>
            ) : (
              <div className="scratch-revealed-surface">
                <div className="trophy-emoji">🏆</div>
                <h2>You Won ₹15!</h2>
                <p>Credited directly to State Bank of India •••• 4291</p>
                <button
                  className="btn-gpay-main"
                  onClick={() => setShowScratchCard(false)}
                >
                  Claim Reward
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
