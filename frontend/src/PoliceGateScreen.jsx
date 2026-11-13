import { useState } from "react";
import {
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Languages,
  Lock,
  Radio,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  User,
  Zap,
} from "lucide-react";
import { sounds } from "./soundEffects";
import { POLICE_DEFAULT_USER, translations } from "./i18n";

export default function PoliceGateScreen({
  onAuthenticate,
  lang = "en",
  onToggleLanguage,
}) {
  const t = translations[lang] || translations.en;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStepText, setAuthStepText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Auto fill credentials and instantly authenticate
  function handleQuickLogin() {
    sounds.playClick();
    setUsername(POLICE_DEFAULT_USER.username);
    setPassword(POLICE_DEFAULT_USER.password);
    setErrorMsg("");
    executeAuthentication(POLICE_DEFAULT_USER.username, POLICE_DEFAULT_USER.password);
  }

  function handleSubmit(e) {
    if (e) e.preventDefault();
    executeAuthentication(username, password);
  }

  function executeAuthentication(userVal, passVal) {
    const cleanUser = userVal.trim().toLowerCase();
    const cleanPass = passVal.trim();

    if (
      (cleanUser === POLICE_DEFAULT_USER.username && cleanPass === POLICE_DEFAULT_USER.password) ||
      (cleanUser === "keralapolice" && cleanPass === "police123")
    ) {
      setErrorMsg("");
      setIsAuthenticating(true);
      setAuthStepText(lang === "ml" ? "[1/3] കേരള പോലീസ് സുരക്ഷാ ടോക്കൺ പരിശോധിക്കുന്നു..." : "[1/3] Verifying Kerala Police cryptographic token...");
      sounds.playClick();

      setTimeout(() => {
        setAuthStepText(lang === "ml" ? "[2/3] സൈബർ ഇൻവെസ്റ്റിഗേഷൻ സെല്ലിലേക്ക് പ്രവേശനം അനുവദിക്കുന്നു..." : "[2/3] Decrypting forensic surveillance clearance keys...");
      }, 550);

      setTimeout(() => {
        setAuthStepText(lang === "ml" ? "[3/3] ലോഗിൻ വിജയകരം: എസ്.ഐ. രാഹുൽ കെ." : "[3/3] Clearance Granted: Sub-Inspector Rahul K.");
        setSuccessMsg(t.authSuccess);
        sounds.playPaySuccess();
      }, 1100);

      setTimeout(() => {
        onAuthenticate({
          username: cleanUser,
          officerName: lang === "ml" ? POLICE_DEFAULT_USER.officerNameMl : POLICE_DEFAULT_USER.officerName,
          badgeNumber: POLICE_DEFAULT_USER.badgeNumber,
          department: lang === "ml" ? POLICE_DEFAULT_USER.departmentMl : POLICE_DEFAULT_USER.department,
          signedInAt: new Date().toLocaleTimeString(),
        });
      }, 1650);
    } else {
      sounds.playAlert();
      setErrorMsg(t.invalidCreds);
    }
  }

  return (
    <div className="police-gate-fullscreen">
      {/* BACKGROUND CYBER GRID & AMBIENT RADAR SCAN */}
      <div className="police-gate-bg-grid" />
      <div className="police-gate-scanner-laser" />

      {/* TOP OFFICIAL BRANDING HEADER */}
      <header className="police-gate-topbar">
        <div className="topbar-police-crest">
          <div className="crest-shield-mini">
            <Shield size={20} className="text-cyan" />
          </div>
          <div className="crest-title-group">
            <b>{lang === "ml" ? "കേരള സർക്കാർ · പോലീസ് വകുപ്പ്" : "GOVERNMENT OF KERALA · POLICE DEPARTMENT"}</b>
            <span>{lang === "ml" ? "സൈബർ ക്രൈം ഹെഡ്ക്വാർട്ടേഴ്സ് · കൊച്ചി & തിരുവനന്തപുരം" : "CYBER CRIME HEADQUARTERS · STATE POLICE MEDIA CENTRE"}</span>
          </div>
        </div>

        <div className="topbar-controls">
          <button
            className="btn-gate-lang"
            onClick={onToggleLanguage}
            title={lang === "en" ? "മലയാളത്തിലേക്ക് മാറ്റുക" : "Switch to English"}
          >
            <Languages size={14} />
            <b>{lang === "en" ? "മലയാളം" : "English"}</b>
          </button>
        </div>
      </header>

      {/* MAIN CENTER AUTHENTICATION CARD */}
      <main className="police-gate-main-center">
        <div className="police-gate-auth-card">
          {/* HOLOGRAPHIC DEPARTMENT EMBLEM */}
          <div className="auth-card-emblem-zone">
            <div className="emblem-hex-ring">
              <div className="hex-spin-orbit" />
              <div className="emblem-core-shield">
                <ShieldCheck size={42} className="text-cyan" />
                <Fingerprint size={24} className="fingerprint-overlay" />
              </div>
            </div>

            <div className="auth-card-title-stack">
              <div className="operation-badge">
                <Radio size={12} className="text-emerald animate-pulse" />
                <span>{lang === "ml" ? "ഓപ്പറേഷൻ തൂഫാൻ സജീവം" : "OPERATION TOOFAN ACTIVE"}</span>
              </div>
              <h2>{lang === "ml" ? "തൂഫാൻ ഷീൽഡ് ഇൻവെസ്റ്റിഗേഷൻ ഗേറ്റ്‌വേ" : "TOOFAN SHIELD FORENSIC GATEWAY"}</h2>
              <p className="auth-card-subtitle">
                {lang === "ml"
                  ? "അംഗീകൃത പോലീസ് ഉദ്യോഗസ്ഥർക്കായി മാത്രം നിർമ്മിച്ച സൈബർ ട്രാക്കിംഗ് സിസ്റ്റം"
                  : "Authorized Law Enforcement & Cyber Crime Intelligence Terminal"}
              </p>
            </div>
          </div>

          {/* DEMO CREDENTIALS HIGHLIGHT CALLOUT */}
          <div className="police-demo-credentials-box">
            <div className="creds-pill-header">
              <div className="header-left">
                <Zap size={14} className="text-amber" />
                <b>{lang === "ml" ? "ഡെമോ ലോഗിൻ വിവരങ്ങൾ (DEMO CREDENTIALS):" : "AUTHORIZED DEMO OFFICER CREDENTIALS:"}</b>
              </div>
              <span className="demo-tag">{lang === "ml" ? "പരിശീലനം" : "TRAINING DEMO"}</span>
            </div>

            <div className="creds-values-row">
              <div className="cred-val-chip">
                <span className="cred-key">{lang === "ml" ? "യൂസർ:" : "USER:"}</span>
                <code className="cred-val">cyberpolice</code>
              </div>
              <span className="cred-divider">|</span>
              <div className="cred-val-chip">
                <span className="cred-key">{lang === "ml" ? "പാസ്‌വേഡ്:" : "PASS:"}</span>
                <code className="cred-val">toofan2026</code>
              </div>
            </div>

            <button
              type="button"
              className="btn-quick-autofill-gate"
              onClick={handleQuickLogin}
              disabled={isAuthenticating}
            >
              <Zap size={15} />
              <span>{lang === "ml" ? "⚡ ഒറ്റ ക്ലിക്കിൽ ലോഗിൻ ചെയ്യുക (1-Click Demo Login)" : "⚡ 1-Click Quick Officer Access (Auto-Login)"}</span>
            </button>
          </div>

          {/* ERROR ALERT */}
          {errorMsg && (
            <div className="police-gate-alert error animate-shake">
              <ShieldAlert size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SUCCESS ALERT */}
          {successMsg && (
            <div className="police-gate-alert success">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ACTIVE AUTHENTICATION HUD SCANNER */}
          {isAuthenticating && (
            <div className="authenticating-hud-panel">
              <div className="hud-header">
                <Terminal size={14} className="text-cyan animate-spin-slow" />
                <span className="hud-terminal-title">{lang === "ml" ? "സൈബർ സെൽ സുരക്ഷാ പരിശോധന..." : "CYBER CELL SECURITY VERIFICATION..."}</span>
              </div>
              <div className="hud-step-text">{authStepText}</div>
              <div className="hud-progress-bar">
                <div className="hud-progress-fill" />
              </div>
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleSubmit} className="police-gate-form">
            <div className="gate-input-field">
              <label>
                <User size={13} />
                <span>{t.usernameLabel}</span>
              </label>
              <div className="gate-input-wrapper">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="cyberpolice"
                  required
                  disabled={isAuthenticating}
                />
              </div>
            </div>

            <div className="gate-input-field">
              <label>
                <KeyRound size={13} />
                <span>{t.passwordLabel}</span>
              </label>
              <div className="gate-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="toofan2026"
                  required
                  disabled={isAuthenticating}
                />
                <button
                  type="button"
                  className="btn-gate-toggle-pass"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-gate-authenticate-submit"
              disabled={isAuthenticating}
            >
              <Lock size={16} />
              <span>{isAuthenticating ? (lang === "ml" ? "പരിശോധിക്കുന്നു..." : "Authenticating...") : t.signInBtn}</span>
            </button>
          </form>

          {/* FOOTER NOTICE */}
          <div className="police-gate-footer">
            <div className="footer-dept-shield">
              <Cpu size={14} className="text-cyan" />
              <span>{lang === "ml" ? "കേരള പോലീസ് ക്രൈംബ്രാഞ്ച് സൈബർ സെൽ സിമുലേഷൻ" : "Kerala Police Cyber Crime Branch Simulation"}</span>
            </div>
            <p className="footer-warning-text">
              {lang === "ml"
                ? "ശ്രദ്ധിക്കുക: ഇത് വിദ്യാഭ്യാസ ആവശ്യങ്ങൾക്കും ഫോറൻസിക് പരിശീലനത്തിനുമുള്ള ഡെമോ സിസ്റ്റം മാത്രമാണ്."
                : "NOTICE: Synthetically simulated educational training environment. Authorized demonstration only."}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

