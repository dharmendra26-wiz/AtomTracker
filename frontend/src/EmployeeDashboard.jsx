import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FileText, Plus, TrendingUp, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { api } from "./api";
import { useAuth } from "./AuthContext";
import Layout from "./Layout";
import IdChip from "./IdChip";

const STATUS_INFO = {
  Draft:     { cls: "badge-draft",     label: "Draft",     icon: Clock },
  Submitted: { cls: "badge-submitted", label: "Submitted", icon: TrendingUp },
  Locked:    { cls: "badge-locked",    label: "Locked",    icon: CheckCircle2 },
};

function ProgressRing({ pct, size = 56, stroke = 5 }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  const color = pct === 100 ? "#10b981" : pct > 100 ? "#ef4444" : "#6366f1";
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle
        className="progress-ring"
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset .6s ease, stroke .3s" }}
      />
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
        fontSize="11" fontWeight="700" fill={color}>
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [sheets, setSheets]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState("");
  const [year, setYear]       = useState(String(new Date().getFullYear()));
  const [creating, setCreating] = useState(false);
  const retryTimer = useRef(null);

  // Determine view mode from route
  const isGoalsView    = location.pathname === "/employee/goals";
  const isCheckinView  = location.pathname === "/employee/checkins";
  const viewTitle = isGoalsView ? "My Goals" : isCheckinView ? "Check-ins" : null;

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      setSheets(await api("/my-sheets"));
      // Clear any pending retry on success
      if (retryTimer.current) clearTimeout(retryTimer.current);
    } catch (e) {
      setErr(e.message);
      // Auto-retry after 15s if it's a connectivity error
      if (e.message.includes("reach") || e.message.includes("fetch")) {
        retryTimer.current = setTimeout(() => load(), 15000);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    return () => { if (retryTimer.current) clearTimeout(retryTimer.current); };
  }, [load]);

  async function createSheet(e) {
    e.preventDefault();
    setCreating(true); setErr("");
    try { await api("/sheets", { method: "POST", body: { year } }); await load(); }
    catch (e) { setErr(e.message); }
    finally { setCreating(false); }
  }

  function openSheet(s) {
    const path = s.status === "Locked" ? "checkin" : "sheet";
    nav(`/employee/${path}/${s.id}`);
  }

  // Stats
  const total     = sheets.length;
  const locked    = sheets.filter(s => s.status === "Locked").length;
  const submitted = sheets.filter(s => s.status === "Submitted").length;
  const draft     = sheets.filter(s => s.status === "Draft").length;

  // Filter sheets based on the current nav view
  const visibleSheets = isGoalsView
    ? sheets.filter(s => s.status === "Draft" || s.status === "Submitted")
    : isCheckinView
    ? sheets.filter(s => s.status === "Locked")
    : sheets;

  return (
    <Layout
      title={viewTitle || `Good day, ${user?.name?.split(" ")[0] || "there"} 👋`}
      actions={
        <form onSubmit={createSheet} className="flex items-center gap-2">
          <input
            className="input" style={{ width: 96 }}
            type="text" value={year}
            onChange={(e) => setYear(e.target.value)}
            pattern="\d{4}" placeholder="Year"
          />
          <button type="submit" disabled={creating} className="btn btn-primary">
            {creating ? <Loader2 size={15} className="animate-spin-slow" /> : <Plus size={15} />}
            New Sheet
          </button>
        </form>
      }
    >
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        {[
          { label: "Total Sheets",   value: total,     color: "indigo", icon: FileText },
          { label: "Draft",          value: draft,     color: "slate",  icon: Clock },
          { label: "Submitted",      value: submitted, color: "amber",  icon: TrendingUp },
          { label: "Locked",         value: locked,    color: "green",  icon: CheckCircle2 },
        ].map(({ label, value, color, icon: Icon }) => {
          const colors = {
            indigo: { bg: "#ede9fe", fg: "#6d28d9" },
            slate:  { bg: "#f1f5f9", fg: "#475569" },
            amber:  { bg: "#fef3c7", fg: "#d97706" },
            green:  { bg: "#d1fae5", fg: "#059669" },
          }[color];
          return (
            <div key={label} className="stat-card animate-fade-up card">
              <div className="flex items-center justify-between">
                <span className="label">{label}</span>
                <div className="p-2 rounded-lg" style={{ background: colors.bg }}>
                  <Icon size={16} style={{ color: colors.fg }} />
                </div>
              </div>
              <div className="value" style={{ color: colors.fg }}>{value}</div>
            </div>
          );
        })}
      </div>

      {err && (
        <div className="alert alert-err mb-6">
          <AlertCircle size={16} className="shrink-0" />
          <div className="flex-1">
            <span>{err}</span>
          </div>
          <button onClick={load} className="btn btn-ghost text-xs ml-2 shrink-0">Retry</button>
        </div>
      )}

      {/* Sheets list */}
      <div>
        <h2 className="text-base font-bold text-slate-800 mb-4">
          {isCheckinView ? "Locked Sheets (Quarterly Check-ins)" : isGoalsView ? "My Active Goal Sheets" : "My Goal Sheets"}
        </h2>
        {loading ? (
          <div className="flex items-center gap-3 text-slate-500 py-12 justify-center">
            <Loader2 className="animate-spin-slow" size={22} /> Loading…
          </div>
        ) : visibleSheets.length === 0 ? (
          <div className="card text-center py-16 text-slate-400 animate-fade-in">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {isCheckinView ? "No locked sheets yet" : isGoalsView ? "No active goal sheets" : "No sheets yet"}
            </p>
            <p className="text-sm mt-1">
              {isCheckinView
                ? "Once your manager approves a sheet, it will appear here for quarterly check-ins."
                : isGoalsView
                ? "Create a sheet from the Dashboard and add your goals."
                : "Use the \"New Sheet\" button above to get started."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
            {visibleSheets.map((s) => {
              const info = STATUS_INFO[s.status] || STATUS_INFO.Draft;
              const isRework = s.reject_comment && s.status === "Draft";
              return (
                <button
                  key={s.id}
                  onClick={() => openSheet(s)}
                  className="card card-lift text-left p-5 animate-fade-up w-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 rounded-xl" style={{ background: "#ede9fe" }}>
                      <FileText size={20} style={{ color: "#6d28d9" }} />
                    </div>
                    <span className={`badge ${isRework ? "badge-submitted" : info.cls}`}>
                      {isRework ? "Needs Rework" : info.label}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mb-1">FY {s.year}</p>
                  <IdChip id={s.id} label="Sheet" />
                  {isRework && (
                    <p className="text-xs text-amber-700 mt-2 bg-amber-50 px-2 py-1.5 rounded-lg truncate">
                      ↩ {s.reject_comment}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
