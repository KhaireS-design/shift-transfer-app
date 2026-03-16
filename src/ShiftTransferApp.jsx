import { useState, useEffect, useCallback, useRef } from "react";

// ─── STAFF DATA (from your Excel/AD - replace with API call later) ───
const LOCATION_CODE = "UW3";
const SITE_NAME = "Union Hall";

const STAFF_LIST = [
  // Replace these with your actual staff from the AD export
  // Format: { name: "Last, First", role: "Job Title Code" }
  { name: "Smith, John", role: "Supervisor" },
  { name: "Doe, Jane", role: "Case Manager" },
  { name: "Garcia, Maria", role: "Security" },
  { name: "Williams, Andre", role: "Counselor" },
  { name: "Brown, Lisa", role: "Maintenance" },
  { name: "Davis, Robert", role: "Front Desk" },
  { name: "Johnson, Kim", role: "Case Manager" },
  { name: "Wilson, Troy", role: "Security" },
];

const SHIFTS = {
  Day: { start: "8:00 AM", end: "4:00 PM" },
  Evening: { start: "4:00 PM", end: "12:00 AM" },
  Overnight: { start: "12:00 AM", end: "8:00 AM" },
};

const PRIORITY_COLORS = {
  Low: "#22c55e",
  Medium: "#eab308",
  High: "#f97316",
  Urgent: "#ef4444",
};

// ─── UNIQUE ID GENERATOR ───
function generateId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${LOCATION_CODE}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

// ─── STORAGE HELPERS ───
const STORAGE_KEY = "shift-reports";

async function loadReports() {
  try {
    const result = await window.storage.get(STORAGE_KEY);
    return result ? JSON.parse(result.value) : [];
  } catch {
    return [];
  }
}

async function saveReports(reports) {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(reports));
    return true;
  } catch (e) {
    console.error("Storage error:", e);
    return false;
  }
}

// ─── MAIN APP ───
export default function ShiftTransferApp() {
  const [view, setView] = useState("home"); // home | new | finalize | dashboard | detail
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports().then((r) => { setReports(r); setLoading(false); });
  }, []);

  const handleSaveDraft = async (report) => {
    const updated = [report, ...reports];
    setReports(updated);
    await saveReports(updated);
    setView("home");
  };

  const handleFinalize = async (reportId, incomingData) => {
    const updated = reports.map((r) =>
      r.id === reportId
        ? { ...r, status: "finalized", incoming: incomingData, finalizedAt: new Date().toISOString() }
        : r
    );
    setReports(updated);
    await saveReports(updated);
    setView("home");
  };

  const handleDeleteReport = async (reportId) => {
    const updated = reports.filter((r) => r.id !== reportId);
    setReports(updated);
    await saveReports(updated);
    setSelectedReport(null);
    setView("dashboard");
  };

  if (loading) return <LoadingScreen />;

  return (
    <div style={styles.app}>
      {view === "home" && (
        <HomeScreen
          onNew={() => setView("new")}
          onFinalize={() => setView("finalize")}
          onDashboard={() => setView("dashboard")}
          pendingCount={reports.filter((r) => r.status === "draft").length}
          totalCount={reports.length}
        />
      )}
      {view === "new" && (
        <NewReportForm onSave={handleSaveDraft} onBack={() => setView("home")} />
      )}
      {view === "finalize" && (
        <FinalizeList
          reports={reports.filter((r) => r.status === "draft")}
          onSelect={(r) => { setSelectedReport(r); setView("detail"); }}
          onBack={() => setView("home")}
        />
      )}
      {view === "dashboard" && (
        <Dashboard
          reports={reports}
          onSelect={(r) => { setSelectedReport(r); setView("detail"); }}
          onBack={() => setView("home")}
        />
      )}
      {view === "detail" && selectedReport && (
        <ReportDetail
          report={reports.find((r) => r.id === selectedReport.id) || selectedReport}
          onFinalize={handleFinalize}
          onDelete={handleDeleteReport}
          onBack={() => { setSelectedReport(null); setView("dashboard"); }}
        />
      )}
    </div>
  );
}

// ─── LOADING ───
function LoadingScreen() {
  return (
    <div style={{ ...styles.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={styles.spinner} />
        <p style={{ color: "#94a3b8", marginTop: 16, fontFamily: "Georgia, serif" }}>Loading reports...</p>
      </div>
    </div>
  );
}

// ─── HOME SCREEN ───
function HomeScreen({ onNew, onFinalize, onDashboard, pendingCount, totalCount }) {
  return (
    <div style={styles.centered}>
      <div style={styles.homeCard}>
        <div style={styles.logoMark}>{LOCATION_CODE}</div>
        <h1 style={styles.homeTitle}>Shift Transfer</h1>
        <p style={styles.homeSub}>{SITE_NAME}</p>

        <div style={{ marginTop: 40, width: "100%" }}>
          <button style={styles.primaryBtn} onClick={onNew}>
            <span style={styles.btnIcon}>+</span> New Shift Report
          </button>

          <button style={styles.secondaryBtn} onClick={onFinalize}>
            <span style={styles.btnIcon}>✓</span> Finalize Incoming
            {pendingCount > 0 && <span style={styles.badge}>{pendingCount}</span>}
          </button>

          <button style={styles.tertiaryBtn} onClick={onDashboard}>
            <span style={styles.btnIcon}>☰</span> All Reports
            {totalCount > 0 && <span style={styles.badgeGray}>{totalCount}</span>}
          </button>
        </div>

        <p style={styles.footerText}>
          Outgoing fills report → saves draft → Incoming reviews & finalizes
        </p>
      </div>
    </div>
  );
}

// ─── NEW REPORT FORM ───
function NewReportForm({ onSave, onBack }) {
  const [step, setStep] = useState(0);
  const [shift, setShift] = useState("Day");
  const [role, setRole] = useState("Outgoing Supervisor");
  const [criticalItems, setCriticalItems] = useState("");
  const [observations, setObservations] = useState("");
  const [followup, setFollowup] = useState("");
  const [notes, setNotes] = useState("");
  const [outName, setOutName] = useState("");
  const [outSignature, setOutSignature] = useState("");
  const [cases, setCases] = useState([{ name: "", desc: "", priority: "Medium" }]);
  const [errors, setErrors] = useState({});
  const topRef = useRef(null);

  const steps = ["Shift Info", "Critical Items", "Cases", "Follow-Up", "Sign & Submit"];

  const addCase = () => setCases([...cases, { name: "", desc: "", priority: "Medium" }]);
  const removeCase = (i) => setCases(cases.filter((_, idx) => idx !== i));
  const updateCase = (i, field, val) => {
    const c = [...cases];
    c[i] = { ...c[i], [field]: val };
    setCases(c);
  };

  const scrollTop = () => {
    if (topRef.current) topRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!criticalItems.trim()) e.criticalItems = "Required";
      if (!observations.trim()) e.observations = "Required";
    }
    if (step === 2 && cases.length > 0) {
      if (!cases[0].name.trim()) e.caseName0 = "At least first case name required";
      if (!cases[0].desc.trim()) e.caseDesc0 = "At least first case description required";
    }
    if (step === 3) {
      if (!followup.trim()) e.followup = "Required";
    }
    if (step === 4) {
      if (!outName.trim()) e.outName = "Required";
      if (!outSignature.trim()) e.outSignature = "Required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validate()) { setStep(step + 1); scrollTop(); }
  };
  const prev = () => { setStep(step - 1); setErrors({}); scrollTop(); };

  const submit = () => {
    if (!validate()) return;
    const now = new Date().toISOString();
    const report = {
      id: generateId(),
      locationCode: LOCATION_CODE,
      siteName: SITE_NAME,
      status: "draft",
      createdAt: now,
      shift,
      shiftStart: SHIFTS[shift].start,
      shiftEnd: SHIFTS[shift].end,
      role,
      staffPresent: STAFF_LIST,
      criticalItems,
      observations,
      cases: cases.filter((c) => c.name.trim() || c.desc.trim()),
      followup,
      notes,
      outgoing: { name: outName, signature: outSignature, date: now },
      incoming: null,
      finalizedAt: null,
    };
    onSave(report);
  };

  return (
    <div style={styles.formContainer}>
      <div ref={topRef} />
      <div style={styles.formHeader}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <h2 style={styles.formTitle}>New Shift Report</h2>
      </div>

      {/* Step indicator */}
      <div style={styles.stepBar}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              ...styles.stepDot,
              background: i <= step ? "#3b82f6" : "#334155",
              color: i <= step ? "#fff" : "#94a3b8",
            }}>
              {i < step ? "✓" : i + 1}
            </div>
            <span style={{
              fontSize: 12, marginLeft: 4, color: i <= step ? "#e2e8f0" : "#64748b",
              display: i === step ? "inline" : "none",
            }}>{s}</span>
            {i < steps.length - 1 && <div style={{
              width: 20, height: 2, background: i < step ? "#3b82f6" : "#334155", margin: "0 4px"
            }} />}
          </div>
        ))}
      </div>

      {/* Step 0: Shift Info */}
      {step === 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Shift Information</h3>
          <div style={styles.infoRow}>
            <span style={styles.label}>Site:</span>
            <span style={styles.value}>{SITE_NAME}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Date:</span>
            <span style={styles.value}>{formatDate(new Date().toISOString())}</span>
          </div>

          <label style={styles.fieldLabel}>Shift</label>
          <div style={styles.radioGroup}>
            {Object.keys(SHIFTS).map((s) => (
              <button key={s} style={{
                ...styles.radioBtn,
                background: shift === s ? "#3b82f6" : "#1e293b",
                color: shift === s ? "#fff" : "#94a3b8",
                borderColor: shift === s ? "#3b82f6" : "#334155",
              }} onClick={() => setShift(s)}>
                {s}
                <span style={{ fontSize: 11, display: "block", opacity: 0.7 }}>
                  {SHIFTS[s].start} – {SHIFTS[s].end}
                </span>
              </button>
            ))}
          </div>

          <label style={styles.fieldLabel}>I am filling as</label>
          <select style={styles.select} value={role} onChange={(e) => setRole(e.target.value)}>
            <option>Outgoing Supervisor</option>
            <option>Incoming Supervisor</option>
          </select>

          <label style={styles.fieldLabel}>Staff Present</label>
          <div style={styles.staffTable}>
            <div style={styles.staffHeader}>
              <span style={{ flex: 2 }}>Name</span>
              <span style={{ flex: 1 }}>Role</span>
            </div>
            {STAFF_LIST.map((s, i) => (
              <div key={i} style={styles.staffRow}>
                <span style={{ flex: 2, color: "#e2e8f0" }}>{s.name}</span>
                <span style={{ flex: 1, color: "#94a3b8" }}>{s.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Critical Items */}
      {step === 1 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Critical Items & Observations</h3>

          <label style={styles.fieldLabel}>Critical Items (Issues requiring follow-up) *</label>
          <textarea
            style={{ ...styles.textarea, borderColor: errors.criticalItems ? "#ef4444" : "#334155" }}
            rows={5} value={criticalItems}
            onChange={(e) => setCriticalItems(e.target.value)}
            placeholder="Enter any critical items that need follow-up..."
          />
          {errors.criticalItems && <span style={styles.errorText}>{errors.criticalItems}</span>}

          <label style={styles.fieldLabel}>Observations / Discrepancies *</label>
          <textarea
            style={{ ...styles.textarea, borderColor: errors.observations ? "#ef4444" : "#334155" }}
            rows={5} value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Note any observations or discrepancies..."
          />
          {errors.observations && <span style={styles.errorText}>{errors.observations}</span>}
        </div>
      )}

      {/* Step 2: Cases */}
      {step === 2 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Cases / Incidents</h3>
          {cases.map((c, i) => (
            <div key={i} style={styles.caseCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>Case #{i + 1}</span>
                {cases.length > 1 && (
                  <button style={styles.removeBtn} onClick={() => removeCase(i)}>Remove</button>
                )}
              </div>
              <input
                style={{ ...styles.input, borderColor: errors[`caseName${i}`] ? "#ef4444" : "#334155" }}
                placeholder="Name of family/individual *"
                value={c.name} onChange={(e) => updateCase(i, "name", e.target.value)}
              />
              {errors[`caseName${i}`] && <span style={styles.errorText}>{errors[`caseName${i}`]}</span>}
              <textarea
                style={{ ...styles.textarea, borderColor: errors[`caseDesc${i}`] ? "#ef4444" : "#334155" }}
                rows={3} placeholder="Incident/Case description *"
                value={c.desc} onChange={(e) => updateCase(i, "desc", e.target.value)}
              />
              {errors[`caseDesc${i}`] && <span style={styles.errorText}>{errors[`caseDesc${i}`]}</span>}
              <label style={{ ...styles.fieldLabel, fontSize: 12 }}>Priority</label>
              <div style={styles.radioGroup}>
                {["Low", "Medium", "High", "Urgent"].map((p) => (
                  <button key={p} style={{
                    ...styles.priorityBtn,
                    background: c.priority === p ? PRIORITY_COLORS[p] + "22" : "#1e293b",
                    borderColor: c.priority === p ? PRIORITY_COLORS[p] : "#334155",
                    color: c.priority === p ? PRIORITY_COLORS[p] : "#64748b",
                  }} onClick={() => updateCase(i, "priority", p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {cases.length < 6 && (
            <button style={styles.addCaseBtn} onClick={addCase}>+ Add Another Case</button>
          )}
        </div>
      )}

      {/* Step 3: Follow-Up */}
      {step === 3 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Follow-Up & Notes</h3>

          <label style={styles.fieldLabel}>Follow-Up for Next Shift *</label>
          <textarea
            style={{ ...styles.textarea, borderColor: errors.followup ? "#ef4444" : "#334155" }}
            rows={5} value={followup}
            onChange={(e) => setFollowup(e.target.value)}
            placeholder="Outcome, notifications, wellness checks, etc..."
          />
          {errors.followup && <span style={styles.errorText}>{errors.followup}</span>}

          <label style={styles.fieldLabel}>Additional Notes / Comments</label>
          <textarea
            style={styles.textarea} rows={4} value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
          />
        </div>
      )}

      {/* Step 4: Sign */}
      {step === 4 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Outgoing Supervisor Signature</h3>
          <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16 }}>
            By signing, you confirm this report is accurate. Once saved, your sections will be locked.
          </p>

          <label style={styles.fieldLabel}>Your Full Name *</label>
          <input
            style={{ ...styles.input, borderColor: errors.outName ? "#ef4444" : "#334155" }}
            value={outName} onChange={(e) => setOutName(e.target.value)}
            placeholder="Enter your full name"
          />
          {errors.outName && <span style={styles.errorText}>{errors.outName}</span>}

          <label style={styles.fieldLabel}>Signature (type your name to sign) *</label>
          <input
            style={{
              ...styles.input,
              fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
              fontSize: 22,
              borderColor: errors.outSignature ? "#ef4444" : "#334155",
            }}
            value={outSignature} onChange={(e) => setOutSignature(e.target.value)}
            placeholder="Your signature"
          />
          {errors.outSignature && <span style={styles.errorText}>{errors.outSignature}</span>}
        </div>
      )}

      {/* Navigation */}
      <div style={styles.navRow}>
        {step > 0 && <button style={styles.prevBtn} onClick={prev}>← Previous</button>}
        <div style={{ flex: 1 }} />
        {step < 4 && <button style={styles.nextBtn} onClick={next}>Next →</button>}
        {step === 4 && (
          <button style={styles.submitBtn} onClick={submit}>
            Save Draft & Lock ✓
          </button>
        )}
      </div>
    </div>
  );
}

// ─── FINALIZE LIST ───
function FinalizeList({ reports, onSelect, onBack }) {
  return (
    <div style={styles.formContainer}>
      <div style={styles.formHeader}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <h2 style={styles.formTitle}>Pending Reports</h2>
      </div>
      {reports.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>✓</p>
          <p>No pending reports to finalize.</p>
        </div>
      ) : (
        reports.map((r) => (
          <button key={r.id} style={styles.reportCard} onClick={() => onSelect(r)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{r.shift} Shift</span>
              <span style={styles.draftBadge}>DRAFT</span>
            </div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
              {formatDateTime(r.createdAt)} — by {r.outgoing?.name || "Unknown"}
            </div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
              {r.cases?.length || 0} case(s) · ID: {r.id}
            </div>
          </button>
        ))
      )}
    </div>
  );
}

// ─── DASHBOARD ───
function Dashboard({ reports, onSelect, onBack }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? reports
    : filter === "draft" ? reports.filter((r) => r.status === "draft")
    : reports.filter((r) => r.status === "finalized");

  return (
    <div style={styles.formContainer}>
      <div style={styles.formHeader}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <h2 style={styles.formTitle}>All Reports</h2>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "draft", "finalized"].map((f) => (
          <button key={f} style={{
            ...styles.filterBtn,
            background: filter === f ? "#3b82f6" : "#1e293b",
            color: filter === f ? "#fff" : "#94a3b8",
          }} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={{ marginLeft: 4, opacity: 0.7 }}>
              ({f === "all" ? reports.length : reports.filter((r) => r.status === f).length})
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>No reports found.</div>
      ) : (
        filtered.map((r) => (
          <button key={r.id} style={styles.reportCard} onClick={() => onSelect(r)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{r.shift} Shift</span>
              <span style={r.status === "draft" ? styles.draftBadge : styles.finalBadge}>
                {r.status.toUpperCase()}
              </span>
            </div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
              {formatDateTime(r.createdAt)} — by {r.outgoing?.name || "Unknown"}
            </div>
            {r.incoming && (
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
                Finalized by: {r.incoming.name} on {formatDateTime(r.finalizedAt)}
              </div>
            )}
          </button>
        ))
      )}
    </div>
  );
}

// ─── REPORT DETAIL / FINALIZE VIEW ───
function ReportDetail({ report, onFinalize, onDelete, onBack }) {
  const [inName, setInName] = useState("");
  const [inSignature, setInSignature] = useState("");
  const [errors, setErrors] = useState({});
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const isDraft = report.status === "draft";

  const handleFinalize = () => {
    const e = {};
    if (!inName.trim()) e.inName = "Required";
    if (!inSignature.trim()) e.inSignature = "Required";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    onFinalize(report.id, {
      name: inName,
      signature: inSignature,
      date: new Date().toISOString(),
    });
  };

  return (
    <div style={styles.formContainer}>
      <div style={styles.formHeader}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <h2 style={styles.formTitle}>
          Report: {report.shift} Shift
          <span style={report.status === "draft" ? styles.draftBadge : styles.finalBadge}>
            {report.status.toUpperCase()}
          </span>
        </h2>
      </div>

      {/* Locked outgoing data */}
      <div style={styles.section}>
        <div style={styles.lockedBanner}>Outgoing supervisor data (locked)</div>

        <div style={styles.detailGrid}>
          <DetailItem label="Site" value={report.siteName} />
          <DetailItem label="Date" value={formatDate(report.createdAt)} />
          <DetailItem label="Shift" value={`${report.shift} (${report.shiftStart} – ${report.shiftEnd})`} />
          <DetailItem label="Submitted by" value={report.outgoing?.name} />
          <DetailItem label="Submitted at" value={formatDateTime(report.createdAt)} />
        </div>

        <label style={styles.fieldLabel}>Critical Items</label>
        <div style={styles.lockedText}>{report.criticalItems || "—"}</div>

        <label style={styles.fieldLabel}>Observations / Discrepancies</label>
        <div style={styles.lockedText}>{report.observations || "—"}</div>

        {report.cases && report.cases.length > 0 && (
          <>
            <label style={styles.fieldLabel}>Cases / Incidents</label>
            {report.cases.map((c, i) => (
              <div key={i} style={styles.caseReadonly}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{c.name}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                    background: PRIORITY_COLORS[c.priority] + "22",
                    color: PRIORITY_COLORS[c.priority],
                  }}>{c.priority}</span>
                </div>
                <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>{c.desc}</p>
              </div>
            ))}
          </>
        )}

        <label style={styles.fieldLabel}>Follow-Up for Next Shift</label>
        <div style={styles.lockedText}>{report.followup || "—"}</div>

        <label style={styles.fieldLabel}>Additional Notes</label>
        <div style={styles.lockedText}>{report.notes || "—"}</div>

        <label style={styles.fieldLabel}>Outgoing Signature</label>
        <div style={{ ...styles.lockedText, fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontSize: 20 }}>
          {report.outgoing?.signature}
        </div>
      </div>

      {/* Incoming section */}
      {isDraft ? (
        <div style={styles.section}>
          <h3 style={{ ...styles.sectionTitle, color: "#22c55e" }}>Incoming Supervisor — Finalize</h3>
          <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16 }}>
            Review the above, then sign below to finalize. This will lock the entire report.
          </p>

          <label style={styles.fieldLabel}>Your Full Name *</label>
          <input
            style={{ ...styles.input, borderColor: errors.inName ? "#ef4444" : "#334155" }}
            value={inName} onChange={(e) => setInName(e.target.value)}
            placeholder="Enter your full name"
          />
          {errors.inName && <span style={styles.errorText}>{errors.inName}</span>}

          <label style={styles.fieldLabel}>Signature (type your name to sign) *</label>
          <input
            style={{
              ...styles.input,
              fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
              fontSize: 22,
              borderColor: errors.inSignature ? "#ef4444" : "#334155",
            }}
            value={inSignature} onChange={(e) => setInSignature(e.target.value)}
            placeholder="Your signature"
          />
          {errors.inSignature && <span style={styles.errorText}>{errors.inSignature}</span>}

          <button style={{ ...styles.submitBtn, background: "#16a34a", marginTop: 16 }} onClick={handleFinalize}>
            Finalize & Lock Report ✓
          </button>
        </div>
      ) : (
        report.incoming && (
          <div style={styles.section}>
            <div style={{ ...styles.lockedBanner, background: "#16a34a22", borderColor: "#16a34a44", color: "#22c55e" }}>
              Finalized by incoming supervisor
            </div>
            <DetailItem label="Name" value={report.incoming.name} />
            <DetailItem label="Finalized at" value={formatDateTime(report.finalizedAt)} />
            <label style={styles.fieldLabel}>Signature</label>
            <div style={{ ...styles.lockedText, fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontSize: 20 }}>
              {report.incoming.signature}
            </div>
          </div>
        )
      )}

      {/* Delete */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #1e293b" }}>
        {!showConfirmDelete ? (
          <button style={styles.deleteBtn} onClick={() => setShowConfirmDelete(true)}>
            Delete this report
          </button>
        ) : (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>Are you sure? This cannot be undone.</p>
            <button style={{ ...styles.deleteBtn, background: "#ef4444", color: "#fff" }}
              onClick={() => onDelete(report.id)}>
              Yes, Delete Permanently
            </button>
            <button style={{ ...styles.prevBtn, marginLeft: 8 }}
              onClick={() => setShowConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>

      <div style={styles.reportId}>Report ID: {report.id}</div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
      <div style={{ color: "#e2e8f0", fontSize: 14 }}>{value || "—"}</div>
    </div>
  );
}

// ─── STYLES ───
const styles = {
  app: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#e2e8f0",
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
  },
  centered: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  homeCard: {
    background: "#1e293b",
    borderRadius: 16,
    padding: "40px 32px",
    maxWidth: 400,
    width: "100%",
    textAlign: "center",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
  },
  logoMark: {
    display: "inline-block",
    background: "#3b82f6",
    color: "#fff",
    fontSize: 24,
    fontWeight: 800,
    padding: "12px 24px",
    borderRadius: 12,
    letterSpacing: 2,
    marginBottom: 16,
  },
  homeTitle: {
    fontSize: 28,
    fontWeight: 700,
    margin: "0 0 4px",
    color: "#f1f5f9",
  },
  homeSub: {
    fontSize: 15,
    color: "#94a3b8",
    margin: 0,
  },
  primaryBtn: {
    width: "100%",
    padding: "16px",
    fontSize: 16,
    fontWeight: 700,
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    marginBottom: 12,
    position: "relative",
  },
  secondaryBtn: {
    width: "100%",
    padding: "14px",
    fontSize: 15,
    fontWeight: 600,
    background: "#1e293b",
    color: "#e2e8f0",
    border: "2px solid #334155",
    borderRadius: 10,
    cursor: "pointer",
    marginBottom: 12,
    position: "relative",
  },
  tertiaryBtn: {
    width: "100%",
    padding: "14px",
    fontSize: 15,
    fontWeight: 600,
    background: "transparent",
    color: "#94a3b8",
    border: "1px solid #334155",
    borderRadius: 10,
    cursor: "pointer",
    position: "relative",
  },
  btnIcon: { marginRight: 8 },
  badge: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: "translateY(-50%)",
    background: "#ef4444",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 10,
  },
  badgeGray: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: "translateY(-50%)",
    background: "#475569",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 10,
  },
  footerText: {
    marginTop: 24,
    fontSize: 12,
    color: "#475569",
    lineHeight: 1.5,
  },
  formContainer: {
    maxWidth: 640,
    margin: "0 auto",
    padding: "16px 20px 40px",
  },
  formHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    paddingTop: 8,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#3b82f6",
    fontSize: 15,
    cursor: "pointer",
    padding: 0,
    fontWeight: 600,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
    color: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  stepBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 2,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  section: {
    background: "#1e293b",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 700,
    margin: "0 0 16px",
    color: "#f1f5f9",
  },
  fieldLabel: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#94a3b8",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 15,
    background: "#0f172a",
    color: "#e2e8f0",
    border: "1.5px solid #334155",
    borderRadius: 8,
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    background: "#0f172a",
    color: "#e2e8f0",
    border: "1.5px solid #334155",
    borderRadius: 8,
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 15,
    background: "#0f172a",
    color: "#e2e8f0",
    border: "1.5px solid #334155",
    borderRadius: 8,
    outline: "none",
  },
  radioGroup: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  radioBtn: {
    flex: 1,
    minWidth: 90,
    padding: "10px 8px",
    fontSize: 14,
    fontWeight: 600,
    border: "1.5px solid #334155",
    borderRadius: 8,
    cursor: "pointer",
    textAlign: "center",
    background: "#1e293b",
    color: "#94a3b8",
  },
  priorityBtn: {
    flex: 1,
    padding: "8px 4px",
    fontSize: 13,
    fontWeight: 700,
    border: "1.5px solid #334155",
    borderRadius: 6,
    cursor: "pointer",
    textAlign: "center",
    background: "#1e293b",
  },
  infoRow: {
    display: "flex",
    gap: 8,
    marginBottom: 6,
  },
  label: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: 600,
    minWidth: 60,
  },
  value: {
    color: "#e2e8f0",
    fontSize: 14,
  },
  staffTable: {
    border: "1px solid #334155",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 4,
  },
  staffHeader: {
    display: "flex",
    padding: "8px 12px",
    background: "#334155",
    fontSize: 12,
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  staffRow: {
    display: "flex",
    padding: "7px 12px",
    borderTop: "1px solid #1e293b",
    fontSize: 13,
  },
  caseCard: {
    background: "#0f172a",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    border: "1px solid #334155",
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#ef4444",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 600,
  },
  addCaseBtn: {
    width: "100%",
    padding: 12,
    background: "transparent",
    border: "1.5px dashed #334155",
    borderRadius: 8,
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 2,
    display: "block",
  },
  navRow: {
    display: "flex",
    gap: 12,
    marginTop: 8,
  },
  prevBtn: {
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 600,
    background: "#1e293b",
    color: "#94a3b8",
    border: "1px solid #334155",
    borderRadius: 8,
    cursor: "pointer",
  },
  nextBtn: {
    padding: "12px 28px",
    fontSize: 14,
    fontWeight: 700,
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  submitBtn: {
    padding: "14px 28px",
    fontSize: 15,
    fontWeight: 700,
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  reportCard: {
    width: "100%",
    display: "block",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    textAlign: "left",
    cursor: "pointer",
  },
  draftBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 4,
    background: "#eab30822",
    color: "#eab308",
    marginLeft: 8,
  },
  finalBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 4,
    background: "#22c55e22",
    color: "#22c55e",
    marginLeft: 8,
  },
  filterBtn: {
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    border: "1px solid #334155",
    borderRadius: 8,
    cursor: "pointer",
  },
  lockedBanner: {
    background: "#3b82f622",
    border: "1px solid #3b82f644",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    color: "#60a5fa",
    marginBottom: 16,
    textAlign: "center",
  },
  lockedText: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px 16px",
    marginBottom: 12,
  },
  caseReadonly: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  deleteBtn: {
    background: "transparent",
    border: "1px solid #ef4444",
    color: "#ef4444",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  reportId: {
    textAlign: "center",
    color: "#334155",
    fontSize: 11,
    marginTop: 24,
    fontFamily: "monospace",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #334155",
    borderTop: "3px solid #3b82f6",
    borderRadius: "50%",
    margin: "0 auto",
    animation: "spin 1s linear infinite",
  },
};
