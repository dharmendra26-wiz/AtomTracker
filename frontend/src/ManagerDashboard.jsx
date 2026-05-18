import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Users, ClipboardList, TrendingUp, Clock, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { api } from "./api";
import { useAuth } from "./AuthContext";
import Layout from "./Layout";
import IdChip from "./IdChip";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const STATUS_INFO = {
  Submitted: { cls: "badge-submitted", label: "Submitted" },
  Locked:    { cls: "badge-locked",    label: "Locked" },
};

export default function ManagerDashboard() {
  const { user } = useAuth();
  const nav      = useNavigate();
  const location = useLocation();
  const [sheets, setSheets]   = useState([]);
  const [stats,  setStats]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState("");
  const retryTimer = useRef(null);

  // Route-based view filtering
  const isTeamSheetsView  = location.pathname === "/manager/team";
  const isCheckinsView    = location.pathname === "/manager/checkins";

  const visibleSheets = isTeamSheetsView
    ? sheets.filter(s => s.status === "Submitted")
    : isCheckinsView
    ? sheets.filter(s => s.status === "Locked")
    : sheets;

  const pageTitle = isTeamSheetsView ? "Pending Review" : isCheckinsView ? "Team Check-ins" : "Manager Console";

  function loadAll() {
    let alive = true;
    setLoading(true); setErr("");
    Promise.all([
      api("/team-sheets"),
      api("/team-analytics").catch(() => null),
    ])
      .then(([s, t]) => {
        if (!alive) return;
        setSheets(s); setStats(t);
        if (retryTimer.current) clearTimeout(retryTimer.current);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e.message);
        if (e.message.includes("reach") || e.message.includes("fetch")) {
          retryTimer.current = setTimeout(loadAll, 15000);
        }
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }

  useEffect(() => {
    const cleanup = loadAll();
    return () => {
      cleanup && cleanup();
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openSheet(s) {
    nav(`/manager/${s.status === "Locked" ? "checkin" : "sheet"}/${s.id}`);
  }

  const pending = sheets.filter(s => s.status === "Submitted").length;
  const locked  = sheets.filter(s => s.status === "Locked").length;

  const chartData = stats
    ? stats.map(m => ({ name: m.user_name.split(" ")[0], score: m.overall_score }))
    : [];

  return (
    <Layout
      title={pageTitle}
      actions={<span className="text-sm text-slate-500">Signed in as {user?.name}</span>}
    >
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        {[
          { label: "Team Members", value: sheets.length || "—", icon: Users,         color: "indigo" },
          { label: "Pending Review",value: pending,             icon: Clock,          color: "amber"  },
          { label: "Approved",      value: locked,             icon: CheckCircle2,   color: "green"  },
          { label: "Total Active",  value: sheets.length,      icon: ClipboardList,  color: "slate"  },
        ].map(({ label, value, icon: Icon, color }) => {
          const C = {
            indigo: { bg:"#ede9fe", fg:"#6d28d9" },
            amber:  { bg:"#fef3c7", fg:"#d97706" },
            green:  { bg:"#d1fae5", fg:"#059669" },
            slate:  { bg:"#f1f5f9", fg:"#475569" },
          }[color];
          return (
            <div key={label} className="stat-card card animate-fade-up">
              <div className="flex items-center justify-between">
                <span className="label">{label}</span>
                <div className="p-2 rounded-lg" style={{ background: C.bg }}>
                  <Icon size={16} style={{ color: C.fg }} />
                </div>
              </div>
              <div className="value" style={{ color: C.fg }}>{value}</div>
            </div>
          );
        })}
      </div>

      {/* Team score chart */}
      {chartData.length > 0 && (
        <div className="card p-5 mb-8">
          <h2 className="font-bold text-slate-800 mb-4">Team Achievement Scores</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={32}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={v => [`${v}`, "Score"]}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? "#6366f1" : "#8b5cf6"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {err && (
        <div className="alert alert-err mb-4">
          <AlertCircle size={16} className="shrink-0"/>
          <div className="flex-1"><span>{err}</span></div>
          <button onClick={loadAll} className="btn btn-ghost text-xs ml-2 shrink-0">Retry</button>
        </div>
      )}

      {/* Sheets */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-slate-800">
          {isCheckinsView ? "Locked Sheets (Check-in Review)" : isTeamSheetsView ? "Submitted Sheets — Awaiting Review" : "Team Goal Sheets"}
        </h2>
        <span className="text-sm text-slate-500">{visibleSheets.length} {isTeamSheetsView ? "pending" : isCheckinsView ? "locked" : "active"}</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-500 py-16 justify-center">
          <Loader2 className="animate-spin-slow" size={22} /> Loading team sheets…
        </div>
      ) : visibleSheets.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {isTeamSheetsView ? "No sheets pending review" : isCheckinsView ? "No locked sheets yet" : "No submissions yet"}
          </p>
          <p className="text-sm mt-1 max-w-xs mx-auto">
            {isTeamSheetsView
              ? "Employees need to submit their goal sheets before they appear here."
              : isCheckinsView
              ? "Approve a submitted sheet first — it will then appear here for check-in review."
              : "Waiting for your team members to submit their goal sheets."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
          {visibleSheets.map(s => {
            const info = STATUS_INFO[s.status] || STATUS_INFO.Submitted;
            const memberStat = stats?.find(m => m.user_id === s.user_id);
            return (
              <button key={s.id} onClick={() => openSheet(s)}
                className="card card-lift text-left p-5 animate-fade-up w-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-indigo-50 rounded-xl">
                    <Users size={18} style={{ color:"#6366f1" }} />
                  </div>
                  <span className={`badge ${info.cls}`}>{info.label}</span>
                </div>
                <p className="font-bold text-slate-900 text-base">{s.user_name}</p>
                <p className="text-xs text-slate-500 mb-2">{s.user_email}</p>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>FY {s.year}</span>
                  <span>{s.goal_count} goals · {s.total_weight}% weight</span>
                </div>
                {memberStat && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                    <TrendingUp size={12} style={{ color:"#6366f1" }} />
                    <span className="text-xs text-slate-600">Score: <strong>{memberStat.overall_score.toFixed(1)}</strong></span>
                  </div>
                )}
                <div className="mt-2"><IdChip id={s.id} label="Sheet" /></div>
              </button>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
