import { useState, useEffect } from "react";
import {
  AlertCircle, ArrowRight, BadgeAlert, Banknote, Check, CheckCircle2,
  ChevronRight, Coins, DollarSign, Eye, GitBranch, Landmark, Loader2, MapPin, Plus,
  RotateCcw, ShieldCheck, Sparkles, Store, Trash2, User, Users, Volume2, Wallet, Zap
} from "lucide-react";
import { sounds } from "./soundEffects";

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CashLaunderingDesk({
  transactions = [],
  onAddTransactions = null,
  onResetTransactions = null,
  onNavigateTab = null,
  privacy = false,
  initialShop = null,
  lang = "en",
}) {
  // Mode switcher: "instant" (1-click direct flow) | "accumulator" (collect from students until ₹1000)
  const [deskMode, setDeskMode] = useState("instant");

  // Mode A: Direct Cash Flow Form State
  const [student, setStudent] = useState("STUDENT-014");
  const [provider, setProvider] = useState("PROVIDER-HARSH");
  const [shop, setShop] = useState(initialShop || "FORT-ROAD-BAKERY");

  useEffect(() => {
    if (initialShop) {
      setShop(initialShop);
    }
  }, [initialShop]);
  const [altAcc, setAltAcc] = useState("ALT-ACC-7A");
  const [mainAcc, setMainAcc] = useState("MAIN-CASHOUT-HUB");
  const [amount, setAmount] = useState("1000");
  const [note, setNote] = useState("Physical cash fee handover");

  // Mode B: Accumulator Pocket State
  const [pocketStudent, setPocketStudent] = useState("STUDENT-014");
  const [pocketAmount, setPocketAmount] = useState("250");
  const [pocketNote, setPocketNote] = useState("Cash fee");
  const [pocketStash, setPocketStash] = useState([
    { id: "p1", student: "STUDENT-014", amount: 350, note: "Cash snacks / ticket" },
    { id: "p2", student: "STUDENT-028", amount: 400, note: "Fest registration cash" },
    { id: "p3", student: "STUDENT-031", amount: 250, note: "Group contribution cash" },
  ]);

  const [busy, setBusy] = useState(false);
  const [successModal, setSuccessModal] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [launderingHopStage, setLaunderingHopStage] = useState(null); // null | 1 | 2 | 3 | 4

  const pocketTotal = pocketStash.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const threshold = 1000;
  const progressPercent = Math.min(100, Math.round((pocketTotal / threshold) * 100));

  function handleAddStudentToPocket(e) {
    if (e) e.preventDefault();
    const num = Number(pocketAmount);
    if (!num || num <= 0) {
      alert("Please enter a valid cash amount");
      return;
    }
    sounds.playClick();
    const newItem = {
      id: `pocket-${Date.now()}`,
      student: pocketStudent.trim().toUpperCase() || "STUDENT-TEMP",
      amount: num,
      note: pocketNote.trim() || "Cash payment",
    };
    setPocketStash((prev) => [...prev, newItem]);
    setPocketAmount("300");
    setStatusMsg(`Added ${money(num)} cash from ${newItem.student} to pocket!`);
    setTimeout(() => setStatusMsg(""), 3500);
  }

  function handleRemovePocketItem(id) {
    sounds.playClick();
    setPocketStash((prev) => prev.filter((item) => item.id !== id));
  }

  function handleClearPocket() {
    sounds.playClick();
    setPocketStash([]);
    setStatusMsg("Provider's pocket stash emptied.");
    setTimeout(() => setStatusMsg(""), 3000);
  }

  async function executeDirectCashFlow() {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      alert("Please enter a valid cash amount");
      return;
    }
    setBusy(true);
    sounds.playCashRegister();
    if (typeof sounds.speakAnnouncement === "function") {
      sounds.speakAnnouncement(`Rupees ${numAmount} cash received by provider and deposited at shop`, "en-IN");
    }

    const cleanStudent = student.trim().toUpperCase() || "STUDENT-014";
    const cleanProvider = provider.trim().toUpperCase() || "PROVIDER-HARSH";
    const cleanShop = shop.trim().toUpperCase() || "FORT-ROAD-BAKERY";
    const cleanAltAcc = altAcc.trim().toUpperCase() || "ALT-ACC-7A";
    const cleanMainAcc = mainAcc.trim().toUpperCase() || "MAIN-CASHOUT-HUB";
    const now = Date.now();

    // 4 Chained Transactions:
    // 1. Student -> Provider (Physical Cash)
    // 2. Provider -> Shop (Counter Cash Deposit)
    // 3. Shop -> Alt Acc (Online Settlement)
    // 4. Alt Acc -> Main Acc (Forwarding Transfer)
    const newTxList = [
      {
        sender: cleanStudent,
        receiver: cleanProvider,
        amount: numAmount,
        channel: "physical-cash",
        is_p2m: false,
        reference_id: `CASH-STU-${now}`,
        event_type: "cash-handover",
      },
      {
        sender: cleanProvider,
        receiver: cleanShop,
        amount: numAmount,
        channel: "shop-counter-cash",
        is_p2m: false,
        reference_id: `SHOP-DEP-${now + 1}`,
        event_type: "counter-deposit",
      },
      {
        sender: cleanShop,
        receiver: cleanAltAcc,
        amount: numAmount,
        channel: "merchant-settlement",
        is_p2m: false,
        reference_id: `UPI-ONLINE-${now + 2}`,
        event_type: "online-settlement",
      },
      {
        sender: cleanAltAcc,
        receiver: cleanMainAcc,
        amount: numAmount,
        channel: "bank-transfer",
        is_p2m: false,
        reference_id: `FWD-MAIN-${now + 3}`,
        event_type: "mule-forwarding",
      },
    ];

    const merchantObs = [
      {
        merchant_alias: cleanShop,
        category: "Bakery & Sweets",
        usual_daily_receipts: 200,
        observed_daily_receipts: 200 + numAmount,
      },
    ];

    // 4-Hop Animated Progression
    setLaunderingHopStage(1);
    await new Promise((r) => setTimeout(r, 380));
    setLaunderingHopStage(2);
    sounds.playClick();
    await new Promise((r) => setTimeout(r, 380));
    setLaunderingHopStage(3);
    sounds.playClick();
    await new Promise((r) => setTimeout(r, 380));
    setLaunderingHopStage(4);

    if (typeof onAddTransactions === "function") {
      await onAddTransactions(newTxList, merchantObs);
    }

    await new Promise((r) => setTimeout(r, 340));
    setLaunderingHopStage(null);

    sounds.playPaySuccess();
    setSuccessModal({
      title: "Cash Laundering Chain Recorded!",
      totalAmount: numAmount,
      student: cleanStudent,
      provider: cleanProvider,
      shop: cleanShop,
      altAcc: cleanAltAcc,
      mainAcc: cleanMainAcc,
      transactions: newTxList,
    });
    setBusy(false);
  }

  async function executePocketShopDrop() {
    if (pocketStash.length === 0 || pocketTotal <= 0) {
      alert("Provider pocket is empty. Add student cash first.");
      return;
    }
    setBusy(true);
    sounds.playCashRegister();
    if (typeof sounds.speakAnnouncement === "function") {
      sounds.speakAnnouncement(`Rupees ${pocketTotal} pooled cash deposited at bakery counter`, "en-IN");
    }

    const cleanProvider = provider.trim().toUpperCase() || "PROVIDER-HARSH";
    const cleanShop = shop.trim().toUpperCase() || "FORT-ROAD-BAKERY";
    const cleanAltAcc = altAcc.trim().toUpperCase() || "ALT-ACC-7A";
    const cleanMainAcc = mainAcc.trim().toUpperCase() || "MAIN-CASHOUT-HUB";
    const now = Date.now();

    // Student -> Provider transactions for each contributor
    const studentTxs = pocketStash.map((item, idx) => ({
      sender: item.student,
      receiver: cleanProvider,
      amount: Number(item.amount),
      channel: "physical-cash",
      is_p2m: false,
      reference_id: `CASH-STU-${now + idx}`,
      event_type: "student-cash-deposit",
    }));

    // Provider -> Shop
    const providerToShopTx = {
      sender: cleanProvider,
      receiver: cleanShop,
      amount: pocketTotal,
      channel: "shop-counter-cash",
      is_p2m: false,
      reference_id: `COUNTER-DEP-${now + 10}`,
      event_type: "counter-deposit",
    };

    // Shop -> Alt Acc
    const shopToAltTx = {
      sender: cleanShop,
      receiver: cleanAltAcc,
      amount: pocketTotal,
      channel: "merchant-settlement",
      is_p2m: false,
      reference_id: `UPI-ONLINE-${now + 11}`,
      event_type: "online-settlement",
    };

    // Alt Acc -> Main Acc
    const altToMainTx = {
      sender: cleanAltAcc,
      receiver: cleanMainAcc,
      amount: pocketTotal,
      channel: "bank-transfer",
      is_p2m: false,
      reference_id: `FWD-MAIN-${now + 12}`,
      event_type: "mule-forwarding",
    };

    const combinedTxs = [...studentTxs, providerToShopTx, shopToAltTx, altToMainTx];

    const merchantObs = [
      {
        merchant_alias: cleanShop,
        category: "Bakery & Sweets",
        usual_daily_receipts: 200,
        observed_daily_receipts: 200 + pocketTotal,
      },
    ];

    // 4-Hop Animated Progression for Pooled Cash
    setLaunderingHopStage(1);
    await new Promise((r) => setTimeout(r, 380));
    setLaunderingHopStage(2);
    sounds.playClick();
    await new Promise((r) => setTimeout(r, 380));
    setLaunderingHopStage(3);
    sounds.playClick();
    await new Promise((r) => setTimeout(r, 380));
    setLaunderingHopStage(4);

    if (typeof onAddTransactions === "function") {
      await onAddTransactions(combinedTxs, merchantObs);
    }

    await new Promise((r) => setTimeout(r, 340));
    setLaunderingHopStage(null);

    sounds.playPaySuccess();
    setSuccessModal({
      title: "Pooled Cash Deposited at Shop Counter!",
      totalAmount: pocketTotal,
      contributorsCount: pocketStash.length,
      provider: cleanProvider,
      shop: cleanShop,
      altAcc: cleanAltAcc,
      mainAcc: cleanMainAcc,
      transactions: combinedTxs,
    });
    setPocketStash([]);
    setBusy(false);
  }

  return (
    <div className="cash-desk-container">
      {/* HEADER HERO */}
      <div className="cash-desk-hero">
        <div className="hero-badge-pill">
          <Banknote size={14} />
          <span>PHYSICAL CASH & SHOP LAUNDERING DESK</span>
        </div>
        <h2>Cash to Shop Laundering Station</h2>
        <p>
          Students hand physical cash to the provider/agent. The provider pools the cash until reaching ₹1,000, 
          then takes the physical currency to a local bakery or shop. The shop deposits the cash and transfers 
          online money to the provider's alt account (mule), which forwards it to the main master account.
        </p>

        {/* MODE SELECTOR TABS */}
        <div className="cash-desk-modes-bar">
          <button
            className={`desk-mode-pill ${deskMode === "instant" ? "active" : ""}`}
            onClick={() => { sounds.playClick(); setDeskMode("instant"); }}
          >
            <Zap size={14} />
            <span>Direct Cash Flow (Type-in Amount)</span>
          </button>
          <button
            className={`desk-mode-pill ${deskMode === "accumulator" ? "active" : ""}`}
            onClick={() => { sounds.playClick(); setDeskMode("accumulator"); }}
          >
            <Wallet size={14} />
            <span>Pocket Cash Accumulator (Pool ₹1,000 Threshold)</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="cash-desk-toast-status">
          <Sparkles size={14} />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* VISUAL 4-STEP PIPELINE OVERVIEW */}
      <div className="laundering-pipeline-card">
        <div className="pipeline-header">
          <div className="pipeline-title-row">
            <GitBranch size={16} className="text-emerald" />
            <b>How the Cash Laundering Scheme Works</b>
          </div>
          <span className="pipeline-tag-badge">4-HOP PHYSICAL TO ONLINE CONVERSION</span>
        </div>

        <div className="pipeline-steps-grid">
          <div className="pipe-step-box">
            <div className="step-number-tag">STEP 1</div>
            <div className="step-icon-circle blue">
              <User size={20} />
            </div>
            <b>Students Pay Cash</b>
            <p>Students hand physical cash notes directly to the provider/agent in person.</p>
            <span className="step-method-badge cash">Physical Cash Handover</span>
          </div>

          <div className="pipe-arrow-divider">→</div>

          <div className="pipe-step-box">
            <div className="step-number-tag">STEP 2</div>
            <div className="step-icon-circle yellow">
              <Wallet size={20} />
            </div>
            <b>Provider Stashes Cash</b>
            <p>Provider stores currency until hitting the ₹1,000 batch deposit threshold.</p>
            <span className="step-method-badge vault">Pocket Accumulation</span>
          </div>

          <div className="pipe-arrow-divider">→</div>

          <div className="pipe-step-box">
            <div className="step-number-tag">STEP 3</div>
            <div className="step-icon-circle green">
              <Store size={20} />
            </div>
            <b>Walk to Shop / Bakery</b>
            <p>Provider hands cash to shopkeeper; shop sends online UPI to provider's Alt Account.</p>
            <span className="step-method-badge shop">Counter Cash → Online UPI</span>
          </div>

          <div className="pipe-arrow-divider">→</div>

          <div className="pipe-step-box">
            <div className="step-number-tag">STEP 4</div>
            <div className="step-icon-circle purple">
              <Landmark size={20} />
            </div>
            <b>Forward to Main Hub</b>
            <p>Alt account immediately forwards the cleaned digital funds to the main boss account.</p>
            <span className="step-method-badge hub">Bank Settlement Transfer</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODE A: DIRECT 1-CLICK CASH FLOW                          */}
      {/* ========================================================= */}
      {deskMode === "instant" && (
        <div className="cash-form-workspace-grid">
          {/* LEFT: FORM INPUTS */}
          <div className="cash-card-box form-card">
            <div className="card-top-head">
              <div className="head-icon-title">
                <Coins size={18} className="text-emerald" />
                <h3>Enter Cash Details & Shop Route</h3>
              </div>
              <span className="badge-fast">INSTANT TYPE-IN</span>
            </div>

            <div className="cash-form-fields-stack">
              {/* AMOUNT ROW WITH QUICK CHIPS */}
              <div className="input-group-cluster">
                <label className="field-label-bold">
                  <span>Cash Handover Amount</span>
                  <span className="required-star">*</span>
                </label>
                <div className="big-currency-input-wrap">
                  <span className="currency-prefix">₹</span>
                  <input
                    type="number"
                    min="10"
                    step="50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1000"
                    className="big-amount-input"
                  />
                </div>
                <div className="amount-chips-quick-row">
                  {[250, 500, 1000, 2000, 5000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`amount-chip-btn ${amount === String(val) ? "active" : ""}`}
                      onClick={() => { sounds.playClick(); setAmount(String(val)); }}
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2-COLUMN PARTICIPANT SELECTORS */}
              <div className="fields-dual-row">
                <div className="input-field-col">
                  <label className="field-label-bold">1. Student (Cash Payer)</label>
                  <input
                    type="text"
                    className="clean-input"
                    value={student}
                    onChange={(e) => setStudent(e.target.value.toUpperCase())}
                    placeholder="STUDENT-014"
                  />
                  <small className="field-hint">Person handing over physical cash</small>
                </div>

                <div className="input-field-col">
                  <label className="field-label-bold">2. Provider / Agent (Handler)</label>
                  <input
                    type="text"
                    className="clean-input"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value.toUpperCase())}
                    placeholder="PROVIDER-HARSH"
                  />
                  <small className="field-hint">Collects & holds physical cash</small>
                </div>
              </div>

              <div className="fields-dual-row">
                <div className="input-field-col">
                  <div className="field-label-with-action">
                    <label className="field-label-bold">3. Local Shop / Bakery</label>
                    {onNavigateTab && (
                      <button
                        type="button"
                        className="btn-field-mini-link"
                        onClick={() => onNavigateTab("scanner")}
                        title="Scan nearby locations & bakeries for sudden cash jumps"
                      >
                        <MapPin size={11} />
                        <span>AI Scan Shops</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    className="clean-input"
                    value={shop}
                    onChange={(e) => setShop(e.target.value.toUpperCase())}
                    placeholder="FORT-ROAD-BAKERY"
                  />
                  <small className="field-hint">Takes cash & converts to online transfer</small>
                </div>

                <div className="input-field-col">
                  <label className="field-label-bold">4. Provider's Alt Acc (Mule)</label>
                  <input
                    type="text"
                    className="clean-input"
                    value={altAcc}
                    onChange={(e) => setAltAcc(e.target.value.toUpperCase())}
                    placeholder="ALT-ACC-7A"
                  />
                  <small className="field-hint">Secret receiver account</small>
                </div>
              </div>

              <div className="fields-dual-row">
                <div className="input-field-col full">
                  <label className="field-label-bold">5. Main Boss Account (Cashout Hub)</label>
                  <input
                    type="text"
                    className="clean-input"
                    value={mainAcc}
                    onChange={(e) => setMainAcc(e.target.value.toUpperCase())}
                    placeholder="MAIN-CASHOUT-HUB"
                  />
                  <small className="field-hint">Final terminal destination for gathered money</small>
                </div>
              </div>

              {/* ACTION BUTTON */}
              <div className="cash-action-submit-zone">
                <button
                  className="btn-execute-cash-chain"
                  onClick={executeDirectCashFlow}
                  disabled={busy}
                >
                  <Banknote size={18} />
                  <span>
                    {busy ? "Broadcasting 4-Hop Chain..." : `Deposit Cash (${money(Number(amount) || 0)}) & Route Through Shop`}
                  </span>
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE PREVIEW CHAIN */}
          <div className="cash-card-box preview-card">
            <div className="card-top-head">
              <div className="head-icon-title">
                <Eye size={17} className="text-sky" />
                <h3>Chain Summary Preview</h3>
              </div>
              <span className="live-preview-pill">● Live Preview</span>
            </div>

            <div className="preview-route-chain-stack">
              <div className="preview-chain-node origin">
                <div className="chain-avatar blue">👤</div>
                <div className="chain-node-text">
                  <b>{privacy ? "STUDENT •••" : student}</b>
                  <small>Hands over physical cash</small>
                </div>
                <span className="chain-flow-tag red">−{money(Number(amount) || 0)}</span>
              </div>

              <div className="chain-link-arrow">
                <span className="arrow-line" />
                <span className="arrow-badge cash">Physical Cash</span>
                <span className="arrow-line" />
              </div>

              <div className="preview-chain-node provider">
                <div className="chain-avatar yellow">🎒</div>
                <div className="chain-node-text">
                  <b>{provider}</b>
                  <small>Provider / Cash Handler</small>
                </div>
                <span className="chain-flow-tag neutral">Stores in pocket</span>
              </div>

              <div className="chain-link-arrow">
                <span className="arrow-line" />
                <span className="arrow-badge counter">Counter Cash Deposit</span>
                <span className="arrow-line" />
              </div>

              <div className="preview-chain-node merchant">
                <div className="chain-avatar green">🏪</div>
                <div className="chain-node-text">
                  <b>{shop}</b>
                  <small>Shop counter deposits cash</small>
                </div>
                <span className="chain-flow-tag yellow">⚠️ Cash Jump</span>
              </div>

              <div className="chain-link-arrow">
                <span className="arrow-line" />
                <span className="arrow-badge upi">Online UPI Transfer</span>
                <span className="arrow-line" />
              </div>

              <div className="preview-chain-node alt">
                <div className="chain-avatar red">⚠️</div>
                <div className="chain-node-text">
                  <b>{altAcc}</b>
                  <small>Provider's Alt Account (Mule)</small>
                </div>
                <span className="chain-flow-tag red">Digital Transfer</span>
              </div>

              <div className="chain-link-arrow">
                <span className="arrow-line" />
                <span className="arrow-badge settle">Bank Transfer</span>
                <span className="arrow-line" />
              </div>

              <div className="preview-chain-node hub">
                <div className="chain-avatar purple">🏛️</div>
                <div className="chain-node-text">
                  <b>{mainAcc}</b>
                  <small>Final Cashout Destination</small>
                </div>
                <span className="chain-flow-tag green">+{money(Number(amount) || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE B: POCKET CASH ACCUMULATOR                           */}
      {/* ========================================================= */}
      {deskMode === "accumulator" && (
        <div className="cash-accumulator-grid">
          {/* POCKET STASH OVERVIEW & PROGRESS */}
          <div className="cash-card-box pocket-hero-card">
            <div className="pocket-hero-top">
              <div className="pocket-icon-wrap">
                <Wallet size={26} />
              </div>
              <div className="pocket-header-copy">
                <h3>Provider's Cash Pocket</h3>
                <p>Collecting physical cash payments until reaching ₹1,000 threshold</p>
              </div>
              {pocketStash.length > 0 && (
                <button className="btn-clear-pocket" onClick={handleClearPocket} title="Clear pocket">
                  <RotateCcw size={13} />
                  <span>Reset Pocket</span>
                </button>
              )}
            </div>

            {/* BIG BALANCE GAUGE */}
            <div className="pocket-balance-display">
              <span className="pocket-balance-label">TOTAL CASH CURRENTLY IN POCKET</span>
              <div className="pocket-balance-val">{money(pocketTotal)}</div>
              <div className="pocket-progress-track">
                <div
                  className={`pocket-progress-fill ${progressPercent >= 100 ? "ready" : ""}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="pocket-progress-sub">
                <span>
                  {progressPercent >= 100
                    ? "🎉 ₹1,000 Threshold Reached! Ready to walk to bakery!"
                    : `${money(pocketTotal)} of ${money(threshold)} gathered (${progressPercent}%)`}
                </span>
                <b>Target: {money(threshold)}</b>
              </div>
            </div>

            {/* DROP-OFF AT SHOP TRIGGER BUTTON */}
            <div className="shop-drop-cta-box">
              <button
                className={`btn-drop-at-shop ${progressPercent >= 100 ? "pulsing-ready" : ""}`}
                onClick={executePocketShopDrop}
                disabled={busy || pocketTotal === 0}
              >
                <Store size={18} />
                <span>
                  {busy
                    ? "Depositing at Shop Counter..."
                    : `Walk to Bakery & Deposit ${money(pocketTotal)} Cash → Online Alt Acc → Main Hub`}
                </span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* ADD STUDENT CASH FORM & CONTRIBUTOR LIST */}
          <div className="cash-card-box pocket-add-card">
            <div className="card-top-head">
              <div className="head-icon-title">
                <Plus size={17} className="text-emerald" />
                <h3>Add Student Cash to Pocket</h3>
              </div>
              <span className="badge-count">{pocketStash.length} payments</span>
            </div>

            <form onSubmit={handleAddStudentToPocket} className="pocket-entry-form">
              <div className="pocket-inputs-row">
                <div className="pocket-input-col">
                  <label>Student Name</label>
                  <input
                    type="text"
                    className="clean-input"
                    value={pocketStudent}
                    onChange={(e) => setPocketStudent(e.target.value.toUpperCase())}
                    placeholder="STUDENT-014"
                  />
                </div>
                <div className="pocket-input-col">
                  <label>Cash Amount (₹)</label>
                  <input
                    type="number"
                    min="10"
                    step="25"
                    className="clean-input"
                    value={pocketAmount}
                    onChange={(e) => setPocketAmount(e.target.value)}
                    placeholder="250"
                  />
                </div>
                <div className="pocket-input-col note">
                  <label>Reason / Note</label>
                  <input
                    type="text"
                    className="clean-input"
                    value={pocketNote}
                    onChange={(e) => setPocketNote(e.target.value)}
                    placeholder="Cash ticket / fee"
                  />
                </div>
                <button type="submit" className="btn-add-pocket-submit">
                  <Plus size={16} />
                  <span>Add Cash</span>
                </button>
              </div>
            </form>

            {/* CONTRIBUTIONS LIST */}
            <div className="pocket-items-list-wrap">
              <div className="items-list-head">
                <span>CASH ENVELOPES IN POCKET ({pocketStash.length})</span>
                <span>AMOUNT</span>
              </div>
              <div className="pocket-items-scroll">
                {pocketStash.length === 0 ? (
                  <div className="pocket-empty-hint">
                    Pocket is empty. Use the form above to add cash payments from students.
                  </div>
                ) : (
                  pocketStash.map((item) => (
                    <div key={item.id} className="pocket-item-row">
                      <div className="item-left">
                        <div className="item-avatar-coin">💵</div>
                        <div>
                          <b>{privacy ? "STUDENT •••" : item.student}</b>
                          <small>{item.note || "Cash payment"}</small>
                        </div>
                      </div>
                      <div className="item-right">
                        <b>{money(item.amount)}</b>
                        <button
                          type="button"
                          className="btn-del-pocket-item"
                          onClick={() => handleRemovePocketItem(item.id)}
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4-HOP PROGRESSION LOADER MODAL                            */}
      {/* ========================================================= */}
      {launderingHopStage && (
        <div className="sheet-backdrop-overlay">
          <div className="laundering-progress-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hop-modal-header">
              <div className="hop-pulse-dot" />
              <b>EXECUTING 4-HOP LAUNDERING SCHEME</b>
              <span className="hop-step-pill">HOP {launderingHopStage} OF 4</span>
            </div>

            <div className="hop-progress-bar-track">
              <div
                className="hop-progress-bar-fill"
                style={{ width: `${launderingHopStage * 25}%` }}
              />
            </div>

            <div className="hop-stages-animated-list">
              <div className={`hop-live-item ${launderingHopStage >= 1 ? "active" : ""} ${launderingHopStage === 1 ? "current" : ""}`}>
                <div className="hop-step-avatar blue">👤</div>
                <div className="hop-step-text">
                  <b>Hop 1: Handing over physical cash</b>
                  <small>Students hand currency notes directly to Provider</small>
                </div>
                {launderingHopStage > 1 ? <Check size={16} className="text-emerald" /> : launderingHopStage === 1 ? <Loader2 size={16} className="spin-fast text-google-blue" /> : null}
              </div>

              <div className={`hop-live-item ${launderingHopStage >= 2 ? "active" : ""} ${launderingHopStage === 2 ? "current" : ""}`}>
                <div className="hop-step-avatar yellow">🏪</div>
                <div className="hop-step-text">
                  <b>Hop 2: Counter deposit at Fort Road Bakery</b>
                  <small>Provider delivers accumulated currency notes to shopkeeper</small>
                </div>
                {launderingHopStage > 2 ? <Check size={16} className="text-emerald" /> : launderingHopStage === 2 ? <Loader2 size={16} className="spin-fast text-google-blue" /> : null}
              </div>

              <div className={`hop-live-item ${launderingHopStage >= 3 ? "active" : ""} ${launderingHopStage === 3 ? "current" : ""}`}>
                <div className="hop-step-avatar green">⚡</div>
                <div className="hop-step-text">
                  <b>Hop 3: Bakery transfers online UPI to Alt Account 7A</b>
                  <small>Shop sends clean digital funds to secret collector mule</small>
                </div>
                {launderingHopStage > 3 ? <Check size={16} className="text-emerald" /> : launderingHopStage === 3 ? <Loader2 size={16} className="spin-fast text-google-blue" /> : null}
              </div>

              <div className={`hop-live-item ${launderingHopStage >= 4 ? "active" : ""} ${launderingHopStage === 4 ? "current" : ""}`}>
                <div className="hop-step-avatar purple">🏛️</div>
                <div className="hop-step-text">
                  <b>Hop 4: Alt Account forwards to Main Cashout Hub</b>
                  <small>Cleaned digital money arrives safely at terminal boss account</small>
                </div>
                {launderingHopStage === 4 ? <Loader2 size={16} className="spin-fast text-google-blue" /> : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUCCESS MODAL DIALOG                                      */}
      {/* ========================================================= */}
      {successModal && (
        <div className="sheet-backdrop-overlay" onClick={() => setSuccessModal(null)}>
          <div className="cash-success-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="success-dialog-icon-ring">
              <CheckCircle2 size={44} className="text-emerald" />
            </div>

            <h2>{successModal.title}</h2>
            <div className="success-amount-highlight">
              {money(successModal.totalAmount)}
            </div>
            <p className="success-dialog-sub">
              Successfully laundered from physical currency through <b>{successModal.shop}</b> counter 
              into <b>{successModal.altAcc}</b>, and forwarded to <b>{successModal.mainAcc}</b>.
            </p>

            {/* SUMMARY CHIPS */}
            <div className="success-hops-summary-card">
              <div className="hop-step-summary">
                <span className="hop-badge-num">1</span>
                <div>
                  <small>CASH HANDOVER</small>
                  <b>{successModal.student || `${successModal.contributorsCount} Students`} → {successModal.provider}</b>
                </div>
              </div>
              <div className="hop-step-summary">
                <span className="hop-badge-num">2</span>
                <div>
                  <small>COUNTER DROP</small>
                  <b>{successModal.provider} → {successModal.shop}</b>
                </div>
              </div>
              <div className="hop-step-summary">
                <span className="hop-badge-num">3</span>
                <div>
                  <small>ONLINE SETTLEMENT</small>
                  <b>{successModal.shop} → {successModal.altAcc}</b>
                </div>
              </div>
              <div className="hop-step-summary">
                <span className="hop-badge-num">4</span>
                <div>
                  <small>FINAL CASHOUT</small>
                  <b>{successModal.altAcc} → {successModal.mainAcc}</b>
                </div>
              </div>
            </div>

            <div className="success-actions-dual">
              <button
                className="btn-gpay-main full"
                onClick={() => {
                  setSuccessModal(null);
                  if (typeof onNavigateTab === "function") {
                    onNavigateTab("overview");
                  }
                }}
              >
                <GitBranch size={16} />
                <span>Track Live on Money Flow Map</span>
                <ArrowRight size={15} />
              </button>

              <button
                className="btn-gpay-outline full"
                onClick={() => {
                  setSuccessModal(null);
                  if (typeof onNavigateTab === "function") {
                    onNavigateTab("ledger");
                  }
                }}
              >
                <Landmark size={15} />
                <span>View in Payment Records Ledger</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

