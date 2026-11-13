import { useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
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
      setSuccessMsg(t.authSuccess);
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
      }, 700);
    } else {
      sounds.playAlert();
      setErrorMsg(t.invalidCreds);
    }
  }

  function handleSignOutClick() {
    sounds.playClick();
    onSignOut();
    onClose();
  }

  return (
    <div className="police-modal-overlay" onClick={onClose}>
      <div className="police-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* MODAL CLOSE BUTTON */}
        <button className="btn-modal-close" onClick={onClose} title="Close">
          <X size={18} />
        </button>

        {/* ALREADY LOGGED IN VIEW: OFFICER ID BADGE */}
        {policeUser ? (
          <div className="officer-id-badge-view">
            <div className="police-emblem-badge-wrap">
              <div className="police-shield-glow">
                <ShieldCheck size={36} className="text-emerald" />
              </div>
              <div className="police-dept-title">
                <b>KERALA POLICE CYBER CRIME CELL</b>
                <small>GOVERNMENT OF KERALA · AUTHORIZED SESSION</small>
              </div>
            </div>

            <div className="officer-card-dossier">
              <div className="officer-avatar-circle">
                <UserCheck size={32} />
              </div>
              <div className="officer-dossier-info">
                <span className="officer-rank-pill">{POLICE_DEFAULT_USER.rank}</span>
                <h3 className="officer-name-display">{policeUser.officerName}</h3>
                <div className="officer-meta-row">
                  <span className="meta-badge-no">BADGE: {policeUser.badgeNumber}</span>
                  <span className="meta-dot">·</span>
                  <span className="meta-dept-name">{policeUser.department}</span>
                </div>
              </div>
            </div>

            <div className="session-active-info-strip">
              <span className="status-live-dot" />
              <span>
                {lang === "ml" ? "സെഷൻ സജീവം · ലോഗിൻ സമയം: " : "Secure Session Active · Logged in at: "}
                <b>{policeUser.signedInAt}</b>
              </span>
            </div>

            <div className="officer-modal-actions">
              <button className="btn-officer-continue" onClick={onClose}>
                <CheckCircle2 size={16} />
                <span>{lang === "ml" ? "ട്രാക്കറിലേക്ക് മടങ്ങുക" : "Continue in Tracker"}</span>
              </button>
              <button className="btn-officer-logout" onClick={handleSignOutClick}>
                <LogOut size={16} />
                <span>{t.signOut}</span>
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
              <h3>{t.authTerminal}</h3>
              <p className="police-subtext">{t.authSubtitle}</p>
            </div>

            {/* PRE-FILLED CREDENTIALS NOTICE */}
            <div className="police-demo-credentials-pill">
              <Zap size={14} className="text-amber" />
              <div className="creds-hint-text">
                <b>{lang === "ml" ? "ഡെമോ യൂസർ വിവരങ്ങൾ:" : "Demo Officer Credentials:"}</b>
                <span>
                  Username: <code>cyberpolice</code> · Password: <code>toofan2026</code>
                </span>
              </div>
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
                  <span>{t.usernameLabel}</span>
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
                  <span>{t.passwordLabel}</span>
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
                  <span>{t.signInBtn}</span>
                </button>

                <button
                  type="button"
                  className="btn-police-autofill"
                  onClick={handleAutoFill}
                >
                  <Zap size={14} />
                  <span>{t.autoFillDemo}</span>
                </button>
              </div>
            </form>

            <div className="police-footer-disclaimer">
              <small>
                {lang === "ml"
                  ? "പരിശീലന ആവശ്യങ്ങൾക്കുള്ള സിമുലേഷൻ പോർട്ടൽ മാത്രമാണ് ഇത്. യഥാർത്ഥ വിവരങ്ങളുമായി ബന്ധമില്ല."
                  : "Authorized for training and forensic demonstration only. Practice simulation environment."}
              </small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

