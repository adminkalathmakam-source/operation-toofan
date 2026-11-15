import { useState, useEffect } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BadgeAlert,
  Building,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  FileDown,
  GraduationCap,
  HeartHandshake,
  Layers,
  Loader2,
  Lock,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  User,
  UserCheck,
  Users,
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

export default function StudentIntakeHotspotPanel({
  role = "analyst", // "analyst" (DANSAF / Excise) | "counsellor" (CWC / Vimukthi)
  onOpenSection94Notice = null,
  onNavigateTab = null,
}) {
  const [clusters, setClusters] = useState([]);
  const [totalReports, setTotalReports] = useState(0);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // New intake form states
  const [studentToken, setStudentToken] = useState(`STU-TOKEN-${Math.floor(100 + Math.random() * 900)}`);
  const [realName, setRealName] = useState("Rohan K. (Class 11)");
  const [parentContact, setParentContact] = useState("+91 94471 28301");
  const [schoolName, setSchoolName] = useState("St. Albert Higher Secondary School");
  const [latitude, setLatitude] = useState(10.02615);
  const [longitude, setLongitude] = useState(76.31252);
  const [locationName, setLocationName] = useState("Fort Road Bakery Counter");
  const [shopVpa, setShopVpa] = useState("bakery.demo@upi");
  const [amount, setAmount] = useState("250");
  const [supplierAlias, setSupplierAlias] = useState("PROVIDER-HARSH");
  const [counselingStatus, setCounselingStatus] = useState("Referred to Vimukthi Student Counseling");

  useEffect(() => {
    fetchHotspots();
  }, []);

  async function fetchHotspots() {
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/hotspots`);
      if (res.ok) {
        const data = await res.json();
        setClusters(data.clusters || []);
        setTotalReports(data.total_reports || 0);
      }
    } catch (err) {
      console.warn("Could not fetch hotspots:", err);
    } finally {
      setBusy(false);
    }
  }

  async function handleLoadSampleHotspots() {
    sounds.playClick();
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/hotspots/load-sample`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setClusters(data.clusters || []);
        setTotalReports(data.total_reports || 0);
        sounds.playAlert();
        setStatusMsg("Loaded 3+ clustered student reports pointing to Fort Road Bakery within 50m!");
        setTimeout(() => setStatusMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogIntake(e) {
    if (e) e.preventDefault();
    const numAmt = Number(amount);
    if (!numAmt || numAmt <= 0) {
      alert("Please enter a valid cash amount");
      return;
    }

    sounds.playClick();
    setBusy(true);
    try {
      const payload = {
        student_token: studentToken,
        student_name: realName,
        student_contact: parentContact,
        school_name: schoolName,
        latitude: Number(latitude),
        longitude: Number(longitude),
        location_name: locationName,
        shop_vpa: shopVpa,
        amount: numAmt,
        supplier_alias: supplierAlias,
        counseling_status: counselingStatus,
      };

      const res = await fetch(`${API}/api/hotspots/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchHotspots();
        sounds.playPaySuccess();
        setStatusMsg(`Cash handover logged under ${studentToken}. Hotspot clusters updated!`);
        setStudentToken(`STU-TOKEN-${Math.floor(100 + Math.random() * 900)}`);
        setTimeout(() => setStatusMsg(""), 3500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  function fetchCurrentGPS() {
    sounds.playClick();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setLatitude(Number(coords.latitude.toFixed(6)));
          setLongitude(Number(coords.longitude.toFixed(6)));
          setStatusMsg(`GPS fix acquired: ${coords.latitude.toFixed(4)}° N, ${coords.longitude.toFixed(4)}° E`);
          setTimeout(() => setStatusMsg(""), 3000);
        },
        () => {
          setLatitude(10.02615);
          setLongitude(76.31252);
          setStatusMsg("Set to District University Corridor GPS coordinates.");
          setTimeout(() => setStatusMsg(""), 3000);
        }
      );
    }
  }

  const isAnalyst = role === "analyst";
  const chokePoints = clusters.filter((c) => c.is_high_risk_choke_point);

  return (
    <div className="hotspot-intake-container" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* SECTION 74 JJ ACT COMPLIANCE STATUS BAR */}
      <div
        style={{
          background: isAnalyst ? "linear-gradient(135deg, #091e3a 0%, #102a4e 100%)" : "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
          color: "#fff",
          borderRadius: "10px",
          padding: "12px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isAnalyst ? (
            <ShieldCheck size={22} className="text-sky" />
          ) : (
            <HeartHandshake size={22} className="text-emerald" />
          )}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", background: isAnalyst ? "#0284c7" : "#059669", padding: "2px 8px", borderRadius: "4px" }}>
                {isAnalyst ? "DANSAF / EXCISE ANALYST MODE" : "CWC / VIMUKTHI COUNSELLOR MODE"}
              </span>
              <b style={{ fontSize: "13px" }}>Section 74 Juvenile Justice (JJ) Act, 2015 Compliance</b>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: isAnalyst ? "#bae6fd" : "#a7f3d0" }}>
              {isAnalyst
                ? "Minor student names, schools, and photos are strictly masked to cryptographic tokens (STU-TOKEN-XXXX). Only cash coordinates & supplier metadata exposed."
                : "Authorized welfare mode: Real student identities, guardian contacts, and psychological rehabilitation tracking enabled."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLoadSampleHotspots}
          style={{
            background: "#f59e0b",
            color: "#000",
            border: "none",
            borderRadius: "6px",
            padding: "8px 12px",
            fontSize: "12px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            whiteSpace: "nowrap",
          }}
          title="Pre-populate 3 student handovers pointing to Fort Road Bakery within 50 meters"
        >
          <Sparkles size={14} />
          <span>Load 3+ Clustered Reports Demo</span>
        </button>
      </div>

      {statusMsg && (
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: "8px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
          <CheckCircle2 size={16} />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* 2-COLUMN LAYOUT: INTAKE FORM (LEFT) & CHOKE POINTS LIST (RIGHT) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: "18px" }}>
        {/* LEFT COLUMN: STUDENT-VICTIM INTAKE FORM */}
        <div className="cash-card-box" style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            <Plus size={18} className="text-emerald" />
            <h4 style={{ margin: 0, fontSize: "15px", color: "#0f172a" }}>Student-Victim Cash Intake Entry</h4>
          </div>

          <form onSubmit={handleLogIntake} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "3px" }}>
                  Cryptographic Token
                </label>
                <input
                  type="text"
                  value={studentToken}
                  readOnly
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: "12px", fontWeight: "700", color: "#0284c7" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "3px" }}>
                  Cash Handover (₹)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="250"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "700" }}
                />
              </div>
            </div>

            {/* IF COUNSELLOR MODE: SHOW REAL NAME & SCHOOL */}
            {!isAnalyst && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "8px 10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: "700", color: "#166534", display: "block", marginBottom: "2px" }}>
                    Student Real Name (CWC Only)
                  </label>
                  <input
                    type="text"
                    value={realName}
                    onChange={(e) => setRealName(e.target.value)}
                    style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #86efac", fontSize: "12px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: "700", color: "#166534", display: "block", marginBottom: "2px" }}>
                    Parent / Guardian Contact
                  </label>
                  <input
                    type="text"
                    value={parentContact}
                    onChange={(e) => setParentContact(e.target.value)}
                    style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #86efac", fontSize: "12px" }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "3px" }}>
                Shop / Handover Landmark Name
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Fort Road Bakery Counter"
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "3px" }}>
                  Public Shop UPI QR ID
                </label>
                <input
                  type="text"
                  value={shopVpa}
                  onChange={(e) => setShopVpa(e.target.value)}
                  placeholder="bakery.demo@upi"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "3px" }}>
                  Suspect Supplier Alias
                </label>
                <input
                  type="text"
                  value={supplierAlias}
                  onChange={(e) => setSupplierAlias(e.target.value.toUpperCase())}
                  placeholder="PROVIDER-HARSH"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                />
              </div>
            </div>

            {/* GPS COORDINATES */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569" }}>
                  Handover GPS Coordinates (50m Clustering)
                </label>
                <button
                  type="button"
                  onClick={fetchCurrentGPS}
                  style={{ background: "none", border: "none", color: "#0284c7", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
                >
                  <Navigation size={11} /> Fetch GPS
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <input
                  type="number"
                  step="0.00001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="Latitude"
                  style={{ padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                />
                <input
                  type="number"
                  step="0.00001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="Longitude"
                  style={{ padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              style={{
                marginTop: "6px",
                padding: "10px",
                borderRadius: "7px",
                background: "#059669",
                color: "#fff",
                border: "none",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              {busy ? <Loader2 size={15} className="spin-fast" /> : <Plus size={15} />}
              <span>Log Cash Handover & Re-Cluster Map</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: CLUSTERED HOTSPOTS & CHOKE POINTS LIST */}
        <div className="cash-card-box" style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <MapPin size={18} className="text-red" />
              <h4 style={{ margin: 0, fontSize: "15px", color: "#0f172a" }}>
                Spatial Hotspots &amp; Cash Choke Points ({clusters.length})
              </h4>
            </div>
            <button
              type="button"
              onClick={fetchHotspots}
              style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
            >
              <RefreshCw size={11} /> Refresh
            </button>
          </div>

          {clusters.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 10px", color: "#64748b" }}>
              <Compass size={32} className="text-muted" style={{ margin: "0 auto 8px" }} />
              <b>No Spatial Clusters Calculated Yet</b>
              <p style={{ fontSize: "12px" }}>Click &quot;Load 3+ Clustered Reports Demo&quot; to view instant detection.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "420px", overflowY: "auto" }}>
              {clusters.map((cluster) => {
                const isChoke = cluster.is_high_risk_choke_point;
                return (
                  <div
                    key={cluster.cluster_id}
                    style={{
                      border: isChoke ? "1.5px solid #ef4444" : "1px solid #e2e8f0",
                      background: isChoke ? "#fff5f5" : "#f8fafc",
                      borderRadius: "8px",
                      padding: "12px",
                      boxShadow: isChoke ? "0 2px 6px rgba(239, 68, 68, 0.15)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                      <div>
                        {isChoke && (
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: "800",
                              background: "#dc2626",
                              color: "#fff",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              letterSpacing: "0.04em",
                              display: "inline-block",
                              marginBottom: "4px",
                            }}
                          >
                            🚨 HIGH-RISK CASH CHOKE POINT (3+ REPORTS)
                          </span>
                        )}
                        <h5 style={{ margin: 0, fontSize: "14px", color: isChoke ? "#991b1b" : "#0f172a" }}>
                          {cluster.location_name}
                        </h5>
                        <small style={{ fontSize: "11px", color: "#64748b" }}>
                          Center GPS: {cluster.center_lat?.toFixed(5)}° N, {cluster.center_lng?.toFixed(5)}° E · 50m radius
                        </small>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: isChoke ? "#b91c1c" : "#0369a1" }}>
                          {cluster.report_count} Reports ({cluster.unique_students} Students)
                        </span>
                        <div style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>
                          {money(cluster.total_cash)} Cash
                        </div>
                      </div>
                    </div>

                    {/* ASSOCIATED STUDENT TOKENS LIST */}
                    <div style={{ marginTop: "6px", fontSize: "11px", color: "#475569", borderTop: "1px dashed #cbd5e1", paddingTop: "6px" }}>
                      <b>Reporting Student Tokens: </b>
                      {cluster.student_tokens?.map((tk, idx) => (
                        <span
                          key={idx}
                          style={{
                            display: "inline-block",
                            background: isAnalyst ? "#e0f2fe" : "#dcfce7",
                            color: isAnalyst ? "#0369a1" : "#15803d",
                            fontWeight: "700",
                            borderRadius: "4px",
                            padding: "1px 6px",
                            margin: "0 4px 2px 0",
                            fontSize: "10.5px",
                          }}
                        >
                          {tk}
                        </span>
                      ))}
                    </div>

                    {/* ACTION DIRECTIVE */}
                    {isChoke && (
                      <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fee2e2", padding: "6px 10px", borderRadius: "6px" }}>
                        <small style={{ fontSize: "10.5px", color: "#991b1b", fontWeight: "600" }}>
                          Linked Shop UPI: <b>{cluster.shop_vpa || "bakery.demo@upi"}</b>
                        </small>

                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenSection94Notice) {
                              onOpenSection94Notice({
                                targetEntity: cluster.shop_vpa || `${cluster.location_name.toUpperCase().replace(/\s+/g, "-")}@upi`,
                                entityName: cluster.location_name,
                                amount: cluster.total_cash,
                                reason: `High-Risk Cash Choke Point: ${cluster.report_count} independent student cash handovers logged within 50m radius.`,
                              });
                            }
                          }}
                          style={{
                            background: "#b91c1c",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            padding: "4px 8px",
                            fontSize: "11px",
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <FileDown size={12} />
                          <span>Generate Section 94 BNSS Notice</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
