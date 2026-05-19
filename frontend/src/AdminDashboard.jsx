import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Users, FileText, Target, Search, X, History, Download,
  Share2, CalendarCheck, ArrowRight, BarChart2, Loader2, AlertCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, PieChart, Pie, Legend,
} from "recharts";
import { api, downloadBlob } from "./api";
import { useAuth } from "./AuthContext";
import Layout from "./Layout";
import OnboardingModal from "./OnboardingModal";

const ROLE_COLORS  = { Employee:"#6366f1", Manager:"#f59e0b", Admin:"#10b981" };
const STATUS_COLORS = { Draft:"#94a3b8", Submitted:"#f59e0b", Locked:"#10b981" };
const Q_COLORS      = ["#6366f1","#8b5cf6","#a78bfa","#c4b5fd"];

export default function AdminDashboard() {
  const { user }  = useAuth();
  const nav       = useNavigate();
  const { pathname } = useLocation();

  // Determine active section from route
  const section = pathname.startsWith("/admin/analytics") ? "analytics"
                : pathname.startsWith("/admin/audit")     ? "audit"
                : "overview";
  const [analytics, setAnalytics]   = useState(null);
  const [qoq, setQoq]               = useState(null);
  const [completion, setCompletion] = useState(null);
  const [year, setYear]             = useState(String(new Date().getFullYear()));
  const [err, setErr]               = useState("");

  const [query, setQuery]       = useState("");
  const [logs, setLogs]         = useState(null);
  const [filtered, setFiltered] = useState(false);
  const [searching, setSearching] = useState(false);
  const [logsErr, setLogsErr]   = useState("");
  const [downloading, setDownloading] = useState(false);

  async function loadAll(y) {
    setErr("");
    try {
      const [a, q, c] = await Promise.all([
        api("/analytics"),
        api(`/analytics/qoq?year=${y}`).catch(() => null),
        api(`/completion?year=${y}`).catch(() => null),
      ]);
      setAnalytics(a); setQoq(q); setCompletion(c);
    } catch (e) { setErr(e.message); }
  }

  async function loadGlobalLogs() {
    setSearching(true); setLogsErr("");
    try { setLogs(await api("/audit-logs")); setFiltered(false); }
    catch (e) { setLogsErr(e.message); setLogs([]); }
    finally { setSearching(false); }
  }

  useEffect(() => { loadAll(year); loadGlobalLogs(); }, []);

  async function searchLogs(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) { await loadGlobalLogs(); return; }
    setSearching(true); setLogsErr("");
    try { setLogs(await api(`/audit-logs/${q}`)); setFiltered(true); }
    catch (e) { setLogsErr(e.message); setLogs([]); }
    finally { setSearching(false); }
  }

  async function doDownload() {
    setDownloading(true);
    try { await downloadBlob("/reports/achievements.csv", "achievements.csv"); }
    catch (e) { setErr(e.message); }
    finally { setDownloading(false); }
  }

  const pieData = analytics
    ? Object.entries(analytics.users_by_role).map(([k,v]) => ({ name:k, value:v }))
    : [];
  const statusData = analytics
    ? Object.entries(analytics.sheets_by_status).map(([k,v]) => ({ name:k, value:v, fill: STATUS_COLORS[k]||"#94a3b8" }))
    : [];
  const qoqData = qoq ? qoq.points : [];

  return (
    <Layout
      title={
        section === "analytics" ? "Analytics" :
        section === "audit"     ? "Audit Trail" :
        "Admin Overview"
      }
      actions={
        <div className="flex gap-2">
          <button onClick={() => nav("/admin/users")} className="btn btn-ghost text-xs">
            <Users size={14}/> Manage Users
          </button>
          {section !== "audit" && (
            <button onClick={doDownload} disabled={downloading} className="btn btn-success text-xs">
              {downloading ? <Loader2 size={14} className="animate-spin-slow"/> : <Download size={14}/>}
              Export CSV
            </button>
          )}
        </div>
      }
    >
      <OnboardingModal role="Admin" />
      {err && <div className="alert alert-err mb-6"><AlertCircle size={16}/>{err}</div>}

      {/* ── OVERVIEW section ── */}
      {section === "overview" && analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8 stagger">
          {[
            { label:"Total Users",  value: analytics.totals.users,  icon: Users,     color:"indigo" },
            { label:"Total Sheets", value: analytics.totals.sheets, icon: FileText,  color:"amber"  },
            { label:"Total Goals",  value: analytics.totals.goals,  icon: Target,    color:"green"  },
          ].map(({ label, value, icon: Icon, color }) => {
            const C = { indigo:{bg:"#ede9fe",fg:"#6d28d9"}, amber:{bg:"#fef3c7",fg:"#d97706"}, green:{bg:"#d1fae5",fg:"#059669"} }[color];
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
      )}

      {/* ── ANALYTICS section ── */}
      {section === "analytics" && analytics && (
        <div className="grid lg:grid-cols-3 gap-4 mb-8">
          {/* Users by Role donut */}
          <div className="card p-5">
            <h3 className="font-bold text-slate-800 mb-3 text-sm">Users by Role</h3>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70}>
                  {pieData.map((e, i) => <Cell key={i} fill={ROLE_COLORS[e.name] || "#94a3b8"} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }} />
                <Tooltip contentStyle={{ borderRadius:10, fontSize:12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Sheets by status */}
          <div className="card p-5">
            <h3 className="font-bold text-slate-800 mb-3 text-sm">Sheets by Status</h3>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={statusData} barSize={36}>
                <XAxis dataKey="name" tick={{ fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:11 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ borderRadius:10, fontSize:12 }}/>
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {statusData.map((e,i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* QoQ trend */}
          <div className="card p-5">
            <h3 className="font-bold text-slate-800 mb-3 text-sm">QoQ Avg Score ({year})</h3>
            {qoqData.length > 0 ? (
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={qoqData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="quarter" tick={{ fontSize:11 }} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,100]} tick={{ fontSize:11 }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ borderRadius:10, fontSize:12 }}/>
                  <Line type="monotone" dataKey="avg_score" stroke="#6366f1" strokeWidth={2.5}
                    dot={{ fill:"#6366f1", r:4 }} activeDot={{ r:6 }}/>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">No check-in data yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ── OVERVIEW: Completion Dashboard ── */}
      {section === "overview" && <section className="mb-10">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarCheck size={18} style={{ color:"#6366f1" }}/>
            <h2 className="font-bold text-slate-900">Check-in Completion</h2>
          </div>
          <div className="flex items-center gap-2">
            <input className="input" style={{ width:80 }} type="text" pattern="\d{4}"
              value={year} onChange={e => setYear(e.target.value)} />
            <button onClick={() => loadAll(year)} className="btn btn-ghost text-xs">Refresh</button>
          </div>
        </div>

        {completion && (
          <>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {["q1","q2","q3","q4"].map((q, i) => {
                const pct = completion.summary[`${q}_pct`];
                return (
                  <div key={q} className="card p-4 text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase">{q.toUpperCase()}</p>
                    <p className="text-3xl font-extrabold mt-1" style={{ color: pct===100?"#059669":pct>=50?"#d97706":"#6366f1" }}>
                      {pct}%
                    </p>
                    <div className="weight-bar-track mt-2">
                      <div className="weight-bar-fill" style={{ width:`${pct}%`, background: pct===100?"#10b981":pct>=50?"#f59e0b":"#6366f1" }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="card overflow-hidden">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Employee</th><th>Reports to</th><th>Sheet</th><th className="text-center">Goals</th>
                    {["Q1","Q2","Q3","Q4"].map(q => <th key={q} className="text-center">{q}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {completion.employees.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-6 text-slate-400">No employees found.</td></tr>
                  )}
                  {completion.employees.map(r => (
                    <tr key={r.user_id}>
                      <td>
                        <p className="font-semibold text-slate-900">{r.user_name}</p>
                        <p className="text-xs text-slate-400">{r.user_email}</p>
                      </td>
                      <td className="text-slate-500 text-xs">{r.manager_email || "—"}</td>
                      <td>
                        {r.sheet_status
                          ? <span className={`badge ${r.sheet_status==="Locked"?"badge-locked":r.sheet_status==="Submitted"?"badge-submitted":"badge-draft"}`}>{r.sheet_status}</span>
                          : <span className="text-xs text-slate-400">No sheet</span>}
                      </td>
                      <td className="text-center text-slate-600">{r.goals_count}</td>
                      {["q1","q2","q3","q4"].map(k => (
                        <td key={k} className="text-center">
                          {r[k]
                            ? <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs">✓</span>
                            : <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-xs">·</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>}

      {/* ── OVERVIEW: Cascade ── */}
      {section === "overview" && <CascadeSection />}

      {/* ── AUDIT section ── */}
      {section === "audit" && <section>
        <div className="flex items-center gap-2 mb-2">
          <History size={18} style={{ color:"#6366f1" }}/>
          <h2 className="font-bold text-slate-900">Audit Trail</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          {filtered ? "Filtered results" : "50 most recent"} — paste any entity UUID to filter.
        </p>
        <form onSubmit={searchLogs} className="flex gap-2 mb-4 flex-wrap">
          <input className="input flex-1" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Entity UUID (e.g. f4a58303-…)" style={{ fontFamily:"monospace", fontSize:13 }}/>
          <button type="submit" disabled={searching} className="btn btn-primary">
            {searching ? <Loader2 size={15} className="animate-spin-slow"/> : <Search size={15}/>}
            Search
          </button>
          {filtered && (
            <button type="button" onClick={async () => { setQuery(""); await loadGlobalLogs(); }} className="btn btn-ghost">
              <X size={15}/> Clear
            </button>
          )}
        </form>
        {logsErr && <div className="alert alert-err mb-3">{logsErr}</div>}
        {logs && logs.length === 0 && !logsErr && (
          <div className="card text-center py-10 text-slate-400">
            {filtered ? "No logs for this entity." : "No audit activity yet."}
          </div>
        )}
        {logs && logs.length > 0 && (
          <div className="card overflow-hidden">
            <table className="tbl">
              <thead>
                <tr>
                  <th>When</th><th>Entity</th><th>Action</th><th>Changed By</th><th>Change</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => <LogRow key={l.id} log={l}/>)}
              </tbody>
            </table>
          </div>
        )}
      </section>}
    </Layout>
  );
}

function CascadeSection() {
  const [goalId, setGoalId] = useState("");
  const [emails, setEmails] = useState("");
  const [year, setYear]     = useState(String(new Date().getFullYear()));
  const [weight, setWeight] = useState(20);
  const [busy, setBusy]     = useState(false);
  const [results, setResults] = useState(null);
  const [err, setErr]       = useState("");

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr(""); setResults(null);
    try {
      const emailList = emails.split(/[\n,]/).map(s=>s.trim()).filter(Boolean);
      if (!emailList.length) throw new Error("Add at least one email");
      setResults(await api(`/goals/${goalId.trim()}/cascade`, {
        method:"POST", body:{ employee_emails:emailList, year, default_weight:Number(weight) }
      }));
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-2">
        <Share2 size={18} style={{ color:"#6366f1" }}/>
        <h2 className="font-bold text-slate-900">Cascade a Goal</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Push a primary goal as a shared copy to multiple employees. Recipients can only adjust weight.
      </p>
      <form onSubmit={submit} className="card p-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Source Goal UUID</label>
            <input className="input" required value={goalId} onChange={e=>setGoalId(e.target.value)}
              placeholder="Paste goal UUID from any sheet" style={{ fontFamily:"monospace", fontSize:13 }}/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Year</label>
            <input className="input" required pattern="\d{4}" value={year} onChange={e=>setYear(e.target.value)}/>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Recipient emails <span className="text-slate-400 font-normal">(comma or newline separated)</span>
          </label>
          <textarea className="input" rows={2} required value={emails} onChange={e=>setEmails(e.target.value)}
            placeholder="employee@company.com, emp2@company.com"/>
        </div>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Default weight on each copy</label>
            <input className="input" type="number" min={10} value={weight} onChange={e=>setWeight(e.target.value)} style={{ width:100 }}/>
          </div>
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? <Loader2 size={15} className="animate-spin-slow"/> : <Share2 size={15}/>}
            Cascade
          </button>
        </div>
        {err && <div className="alert alert-err">{err}</div>}
      </form>
      {results && (
        <ul className="mt-3 space-y-2">
          {results.map((r,i) => {
            const ok = r.status === "cloned" || r.status === "already shared";
            return (
              <li key={i} className={`flex items-center justify-between text-sm px-4 py-2.5 rounded-xl border ${
                ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"
              }`}>
                <span className="font-medium">{r.email}</span>
                <span>{r.status}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const ACTION_COLORS = {
  override:      "badge-submitted",
  approve:       "badge-locked",
  reject:        "bg-rose-100 text-rose-800",
  update_actual: "bg-indigo-100 text-indigo-800",
  cascade:       "bg-violet-100 text-violet-800",
};

function safeParse(s) {
  try { return JSON.stringify(JSON.parse(s), null, 0); } catch { return s ?? "—"; }
}

function LogRow({ log }) {
  const when   = new Date(log.timestamp).toLocaleString();
  const oldVal = safeParse(log.old_value);
  const newVal = safeParse(log.new_value);
  return (
    <tr>
      <td className="text-xs text-slate-500 whitespace-nowrap">{when}</td>
      <td><span className="badge badge-draft">{log.entity_type}</span></td>
      <td><span className={`badge ${ACTION_COLORS[log.action] || "badge-draft"}`}>{log.action}</span></td>
      <td className="font-mono text-xs text-slate-400" title={log.changed_by}>{log.changed_by.slice(0,8)}…</td>
      <td>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100 max-w-[12rem] truncate" title={oldVal}>{oldVal}</span>
          <ArrowRight size={12} className="text-slate-400 shrink-0"/>
          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 max-w-[12rem] truncate" title={newVal}>{newVal}</span>
        </div>
      </td>
    </tr>
  );
}
