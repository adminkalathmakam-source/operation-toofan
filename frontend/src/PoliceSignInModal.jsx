import { useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Lock,
  LogOut,
  MapPin,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import { sounds } from "./soundEffects";
import { POLICE_DEFAULT_USER, translations } from "./i18n";

export default function PoliceSignInModal({
  isOpen,
  onClose,
  policeUser,
  onSignIn,
  onSignOut,
  lang = "en",
}) {
  const t = translations[lang] || translations.en;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  function handleAutoFill() {
    sounds.playClick();
    setUsername(POLICE_DEFAULT_USER.username);
    setPassword(POLICE_DEFAULT_USER.password);
    setErrorMsg("");
  }

  function handleSubmit(e) {
    if (e) e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (
      (cleanUser === POLICE_DEFAULT_USER.username && cleanPass === POLICE_DEFAULT_USER.password) ||
      (cleanUser === "keralapolice" && cleanPass === "police123")
    ) {
      setErrorMsg("");
      setSuccessMsg(lang === "ml" ? "ലോഗിൻ വിജയകരം!" : "Sign in successful! Loading police desk...");
      sounds.playPaySuccess();
      setTimeout(() => {
        onSignIn({
          username: cleanUser,
          officerName: lang === "ml" ? POLICE_DEFAULT_USER.officerNameMl : POLICE_DEFAULT_USER.officerName,
          badgeNumber: POLICE_DEFAULT_USER.badgeNumber,
          department: lang === "ml" ? POLICE_DEFAULT_USER.departmentMl : POLICE_DEFAULT_USER.department,
          signedInAt: new Date().toLocaleTimeString(),
        });
        setSuccessMsg("");
        onClose();
      }, 600);
    } else {
      sounds.playAlert();
      setErrorMsg(lang === "ml" ? "തെറ്റായ വിവരങ്ങൾ. ഡെമോ ലോഗിൻ ഉപയോഗിക്കുക." : "Incorrect username or passcode. Please click Auto-Fill Demo.");
    }
  }

  function handleSignOutClick() {
    sounds.playClick();
    onSignOut();
  }

  return (
    <div className="police-modal-overlay" onClick={onClose}>
      <div className="police-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* MODAL CLOSE BUTTON */}
        <button className="btn-modal-close" onClick={onClose} title="Close window">
          <X size={18} />
        </button>

        {/* ALREADY LOGGED IN: OFFICER DUTY PASS & ID CARD */}
        {policeUser ? (
          <div className="officer-id-badge-view">
            {/* OFFICIAL CREST */}
            <div className="police-emblem-badge-wrap">
              <div className="police-shield-glow">
                <ShieldCheck size={38} className="text-emerald" />
              </div>
              <div className="police-dept-title">
                <b>{lang === "ml" ? "കേരള പോലീസ് · സൈബർ ക്രൈം സെൽ" : "KERALA POLICE · CYBER CRIME CELL"}</b>
                <small>{lang === "ml" ? "ഔദ്യോഗിക ഡ്യൂട്ടി പാസ്സ്" : "OFFICIAL POLICE OFFICER DUTY PASS"}</small>
              </div>
            </div>

            {/* OFFICER PHYSICAL ID CARD LOOK */}
            <div className="officer-card-dossier" style={{ position: "relative", overflow: "hidden" }}>
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                background: "linear-gradient(90deg, #10b981, #0284c7, #38bdf8)"
              }} />
              
              <div className="officer-avatar-circle" style={{ background: "rgba(16, 185, 129, 0.15)", borderColor: "#10b981", color: "#10b981" }}>
                <UserCheck size={32} />
              </div>

              <div className="officer-dossier-info">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="officer-rank-pill" style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }}>
                    {POLICE_DEFAULT_USER.rank}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#10b981", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                    <Check size={12} /> {lang === "ml" ? "വെരിഫൈഡ്" : "Verified"}
                  </span>
                </div>

                <h3 className="officer-name-display" style={{ fontSize: "1.1rem" }}>
                  {policeUser.officerName}
                </h3>

                <div className="officer-meta-row" style={{ marginTop: "3px" }}>
                  <span className="meta-badge-no" style={{ background: "#0f172a", padding: "2px 7px", borderRadius: "4px", border: "1px solid #334155" }}>
                    BADGE: {policeUser.badgeNumber}
                  </span>
                  <span className="meta-dept-name" style={{ fontSize: "12px", color: "#cbd5e1" }}>
                    {policeUser.department}
                  </span>
                </div>
              </div>
            </div>

            {/* SIMPLE ENGLISH STATUS STRIP */}
            <div className="session-active-info-strip" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1e293b", padding: "10px 14px", borderRadius: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="status-live-dot" />
                <span style={{ fontSize: "12px", color: "#e2e8f0" }}>
                  <b>{lang === "ml" ? "ഡ്യൂട്ടി സ്റ്റാറ്റസ്: സജീവം" : "Duty Status: On Active Duty"}</b>
                </span>
              </div>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                {lang === "ml" ? "ലോഗിൻ സമയം: " : "Signed in at: "}<b>{policeUser.signedInAt || "Today"}</b>
              </span>
            </div>

            {/* WHAT YOU CAN DO WITH THIS ACCESS - SIMPLE ENGLISH GUIDE */}
            <div className="police-simple-guide-box" style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid #334155", borderRadius: "12px", padding: "14px", textAlign: "left" }}>
              <div style={{ fontSize: "12px", fontWeight: "800", color: "#38bdf8", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Shield size={14} />
                <span>{lang === "ml" ? "നിങ്ങൾക്ക് ചെയ്യാൻ സാധിക്കുന്ന കാര്യങ്ങൾ:" : "What you can do with this Police Access:"}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", color: "#cbd5e1" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <Search size={14} className="text-sky" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>
                    <b>{lang === "ml" ? "പണവഴി ട്രാക്ക് ചെയ്യുക: " : "Trace Money Trails: "}</b>
                    {lang === "ml" ? "വിദ്യാർത്ഥികളിൽ നിന്ന് വ്യാജ അക്കൗണ്ടുകളിലേക്കുള്ള പണമൊഴുക്ക് കാണുക." : "Follow money step-by-step from students to fake accounts and final cashout hubs."}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <Building2 size={14} className="text-amber" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>
                    <b>{lang === "ml" ? "സംശയാസ്പദമായ കടകൾ കണ്ടെത്തുക: " : "Catch Suspicious Shops: "}</b>
                    {lang === "ml" ? "പെട്ടെന്ന് 4 ഇരട്ടി പണം കൂടിയ കടകളും ബേക്കറികളും സ്കാൻ ചെയ്യുക." : "Spot bakery and shop counters with sudden 4x cash increases and off-hour money."}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <FileText size={14} className="text-emerald" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>
                    <b>{lang === "ml" ? "ബാങ്ക് നോട്ടീസ് അയക്കുക: " : "Issue Legal Bank Notices: "}</b>
                    {lang === "ml" ? "സെക്ഷൻ 94 ബി.എൻ.എസ്.എസ്. പ്രകാരം ഒരൊറ്റ ക്ലിക്കിൽ നോട്ടീസ് തയ്യാറാക്കുക." : "Generate official 1-click legal bank requisitions under Section 94 BNSS."}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <Scale size={14} className="text-purple-400" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>
                    <b>{lang === "ml" ? "വിദ്യാർത്ഥി സ്വകാര്യത: " : "Protect Minor Students: "}</b>
                    {lang === "ml" ? "സെക്ഷൻ 74 ജെ.ജെ. ആക്ട് പ്രകാരം കുട്ടികളുടെ വിവരങ്ങൾ സുരക്ഷിതമാണ്." : "Student minor identities are protected with cryptographic tokens (Sec 74 JJ Act)."}
                  </span>
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="officer-modal-actions" style={{ marginTop: "4px" }}>
              <button className="btn-officer-continue" onClick={onClose}>
                <CheckCircle2 size={16} />
                <span>{lang === "ml" ? "തുടരുക (Return to Tracker)" : "Continue Investigation"}</span>
              </button>
              <button className="btn-officer-logout" onClick={handleSignOutClick} title="Log out or switch to another officer">
                <LogOut size={15} />
                <span>{lang === "ml" ? "പുറത്തുകടക്കുക" : "Switch Officer"}</span>
              </button>
            </div>
          </div>
        ) : (
          /* LOGIN FORM VIEW */
          <div className="police-login-view">
            <div className="police-header-emblem">
              <div className="police-crest-wrap">
                <Shield size={34} className="text-sky" />
              </div>
              <h3>{lang === "ml" ? "കേരള പോലീസ് ലോഗിൻ" : "Police Officer Sign In"}</h3>
              <p className="police-subtext">
                {lang === "ml"
                  ? "ഔദ്യോഗിക ഡ്യൂട്ടി പരിശോധനയ്ക്കായി യൂസർനെയിമും പാസ്‌വേഡും നൽകുക"
                  : "Sign in with your officer credentials to access TOOFAN Shield"}
              </p>
            </div>

            {/* DEMO CREDENTIALS CALLOUT IN SIMPLE ENGLISH */}
            <div className="police-demo-credentials-pill" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Zap size={15} className="text-amber" />
                <b style={{ color: "#fbbf24", fontSize: "12px" }}>
                  {lang === "ml" ? "ഡെമോ ലോഗിൻ വിവരങ്ങൾ:" : "Demo Officer Login Details:"}
                </b>
              </div>
              <div style={{ display: "flex", gap: "10px", fontSize: "12px", color: "#fef3c7", background: "rgba(0,0,0,0.25)", padding: "6px 10px", borderRadius: "6px" }}>
                <span>Username: <code>cyberpolice</code></span>
                <span>Password: <code>toofan2026</code></span>
              </div>
              <button
                type="button"
                className="btn-police-autofill"
                onClick={handleAutoFill}
                style={{ marginTop: "2px" }}
              >
                <Zap size={14} />
                <span>{lang === "ml" ? "⚡ ഈ വിവരങ്ങൾ സ്വയം പൂരിപ്പിക്കുക" : "⚡ Click Here to Auto-Fill & Enter"}</span>
              </button>
            </div>

            {errorMsg && (
              <div className="police-alert-message error animate-shake">
                <ShieldAlert size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="police-alert-message success">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="police-form-stack">
              <div className="police-input-group">
                <label>
                  <User size={13} />
                  <span>{lang === "ml" ? "യൂസർനെയിം" : "Officer Username"}</span>
                </label>
                <div className="input-with-icon">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="cyberpolice"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="police-input-group">
                <label>
                  <KeyRound size={13} />
                  <span>{lang === "ml" ? "പാസ്‌വേഡ്" : "Passcode"}</span>
                </label>
                <div className="input-with-icon">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="toofan2026"
                    required
                  />
                  <button
                    type="button"
                    className="btn-toggle-pass"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="police-actions-stack">
                <button type="submit" className="btn-police-authenticate">
                  <Lock size={15} />
                  <span>{lang === "ml" ? "സൈൻ ഇൻ ചെയ്യുക" : "Sign In as Officer"}</span>
                </button>
              </div>
            </form>

            <div className="police-footer-disclaimer">
              <small>
                {lang === "ml"
                  ? "കേരള പോലീസ് ക്രൈംബ്രാഞ്ച് പരിശീലന ആവശ്യങ്ങൾക്കുള്ള സിമുലേഷൻ മാത്രമാണ് ഇത്."
                  : "Authorized demonstration environment for Kerala Police anti-drug financial tracking."}
              </small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

