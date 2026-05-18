import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, FileText, Target, Search, LogOut, ArrowRight, History, Download, X, Share2, CalendarCheck,
} from "lucide-react";
import { api, downloadBlob } from "./api";
import { useAuth } from "./AuthContext";

const ROLE_COLORS = {
  Employee: "bg-indigo-500",
  Manager:  "bg-amber-500",
  Admin:    "bg-emerald-500",
};

const STATUS_COLORS = {
  Draft:     "bg-slate-400",
  Submitted: "bg-amber-500",
  Locked:    "bg-emerald-500",
};

const ACTION_COLORS = {
  override:      "bg-amber-100 text-amber-800",
  approve:       "bg-emerald-100 text-emerald-800",
  update_actual: "bg-indigo-100 text-indigo-800",
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [analyticsErr, setAnalyticsErr] = useState("");

  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState(false);
  const [logs, setLogs] = useState(null);
  const [searching, setSearching] = useState(false);
  const [logsErr, setLogsErr] = useState("");

  const [downloading, setDownloading] = useState(false);
  const [downloadErr, setDownloadErr] = useState("");

  async function loadGlobalLogs() {
    setSearching(true);
    setLogsErr("");
    try {
      const res = await api("/audit-logs");
      setLogs(res);
      setFiltered(false);
    } catch (e) {
      setLogsErr(e.message);
      setLogs([]);
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const a = await api("/analytics");
        setAnalytics(a);
      } catch (e) {
        setAnalyticsErr(e.message);
      }
    })();
    loadGlobalLogs();
  }, []);

  function signOut() {
    logout();
    nav("/login", { replace: true });
  }

  async function searchLogs(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      await loadGlobalLogs();
      return;
    }
    setSearching(true);
    setLogsErr("");
    try {
      const res = await api(`/audit-logs/${q}`);
      setLogs(res);
      setFiltered(true);
    } catch (e) {
      setLogsErr(e.message);
      setLogs([]);
    } finally {
      setSearching(false);
    }
  }

  async function clearFilter() {
    setQuery("");
    await loadGlobalLogs();
  }

  async function downloadReport() {
    setDownloading(true);
    setDownloadErr("");
    try {
      await downloadBlob("/reports/achievements.csv", "achievements.csv");
    } catch (e) {
      setDownloadErr(e.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Admin Console</h1>
            <p className="text-sm text-slate-500">Signed in as {user?.name || "Admin"}</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {/* ---------- Analytics ---------- */}
        <section>
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Analytics overview</h2>
              <p className="text-sm text-slate-500">A snapshot of the platform's current state</p>
            </div>
            <button
              onClick={downloadReport}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition shadow-sm"
            >
              <Download size={16} /> {downloading ? "Preparing..." : "Download Achievement Report (CSV)"}
            </button>
          </div>

          {downloadErr && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              {downloadErr}
            </p>
          )}

          {analyticsErr && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              {analyticsErr}
            </p>
          )}

          {!analytics && !analyticsErr && (
            <p className="text-slate-500">Loading analytics...</p>
          )}

          {analytics && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <StatCard icon={<Users size={18} />}    label="Total Users"  value={analytics.totals.users}  color="indigo" />
                <StatCard icon={<FileText size={18} />} label="Total Sheets" value={analytics.totals.sheets} color="amber" />
                <StatCard icon={<Target size={18} />}   label="Total Goals"  value={analytics.totals.goals}  color="emerald" />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <DistributionCard
                  title="Users by Role"
                  icon={<Users size={18} />}
                  data={analytics.users_by_role}
                  colors={ROLE_COLORS}
                />
                <DistributionCard
                  title="Sheets by Status"
                  icon={<FileText size={18} />}
                  data={analytics.sheets_by_status}
                  colors={STATUS_COLORS}
                />
                <DistributionCard
                  title="Goals by Thrust Area"
                  icon={<Target size={18} />}
                  data={analytics.goals_by_thrust_area}
                />
              </div>
            </>
          )}
        </section>

        {/* ---------- Completion ---------- */}
        <CompletionSection />

        {/* ---------- Cascade Goal ---------- */}
        <CascadeSection />

        {/* ---------- Audit explorer ---------- */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <History size={20} className="text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Audit trail explorer</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Showing the {filtered ? "filtered" : "50 most recent"} log entries. Paste an entity ID to filter.
          </p>

          <form onSubmit={searchLogs} className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Entity UUID (e.g. f4a58303-...)"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Search size={16} /> {searching ? "Searching..." : "Search Logs"}
            </button>
            {filtered && (
              <button
                type="button"
                onClick={clearFilter}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg"
              >
                <X size={16} /> Clear filter
              </button>
            )}
          </form>

          {logsErr && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              {logsErr}
            </p>
          )}

          {logs && logs.length === 0 && !logsErr && (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center text-slate-500">
              {filtered ? "No audit logs found for this entity." : "No audit activity yet."}
            </div>
          )}

          {logs && logs.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">When</th>
                    <th className="px-4 py-2.5 font-medium">Entity</th>
                    <th className="px-4 py-2.5 font-medium">Action</th>
                    <th className="px-4 py-2.5 font-medium">By</th>
                    <th className="px-4 py-2.5 font-medium">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((l) => (
                    <LogRow key={l.id} log={l} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const styles = {
    indigo:  "bg-indigo-50 text-indigo-600",
    amber:   "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <div className={`p-2 rounded-lg ${styles[color]}`}>{icon}</div>
      </div>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function DistributionCard({ title, icon, data, colors }) {
  const entries = Object.entries(data);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  const total = entries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">{icon}</div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>
        <span className="text-xs text-slate-500">Total: {total}</span>
      </div>

      {entries.length === 0 || total === 0 ? (
        <p className="text-sm text-slate-400">No data yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {entries.map(([label, count]) => {
            const pct = Math.round((count / max) * 100);
            const barColor = colors?.[label] || "bg-indigo-500";
            return (
              <li key={label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700">{label}</span>
                  <span className="font-medium text-slate-900">{count}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CompletionSection() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load(y) {
    setLoading(true);
    setErr("");
    try {
      const res = await api(`/completion?year=${y}`);
      setData(res);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(year); }, []);

  const quarters = ["Q1", "Q2", "Q3", "Q4"];

  return (
    <section>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <CalendarCheck size={20} className="text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Check-in completion dashboard</h2>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); load(year); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            pattern="\d{4}"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-24 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="text-sm px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-60"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </form>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Real-time per-employee check-in status for the selected year. A quarter is "complete" when every owned (non-shared-copy) goal has a logged actual.
      </p>

      {err && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {err}
        </p>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {quarters.map((q) => {
              const pct = data.summary[`${q.toLowerCase()}_pct`];
              return (
                <div key={q} className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">{q} completion</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">{pct}%</p>
                  <div className="h-1.5 mt-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-slate-300"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Employee</th>
                  <th className="px-4 py-2.5 font-medium">Reports to</th>
                  <th className="px-4 py-2.5 font-medium">Sheet</th>
                  <th className="px-4 py-2.5 font-medium text-center">Goals</th>
                  {quarters.map((q) => (
                    <th key={q} className="px-3 py-2.5 font-medium text-center">{q}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.employees.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400">No employees found.</td></tr>
                )}
                {data.employees.map((r) => (
                  <tr key={r.user_id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{r.user_name}</div>
                      <div className="text-xs text-slate-500">{r.user_email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{r.manager_email || "—"}</td>
                    <td className="px-4 py-3">
                      {r.sheet_status ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          r.sheet_status === "Locked" ? "bg-emerald-100 text-emerald-800"
                          : r.sheet_status === "Submitted" ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                        }`}>
                          {r.sheet_status}
                        </span>
                      ) : <span className="text-xs text-slate-400">No sheet</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{r.goals_count}</td>
                    {["q1","q2","q3","q4"].map((k) => (
                      <td key={k} className="px-3 py-3 text-center">
                        {r[k] ? (
                          <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm">✓</span>
                        ) : (
                          <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-sm">·</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function CascadeSection() {
  const [goalId, setGoalId] = useState("");
  const [emails, setEmails] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [weight, setWeight] = useState(20);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setResults(null);
    try {
      const emailList = emails.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
      if (emailList.length === 0) throw new Error("Add at least one employee email");
      const res = await api(`/goals/${goalId.trim()}/cascade`, {
        method: "POST",
        body: { employee_emails: emailList, year, default_weight: Number(weight) },
      });
      setResults(res);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <Share2 size={20} className="text-slate-700" />
        <h2 className="text-lg font-semibold text-slate-900">Cascade a goal (Shared Goals)</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Push a primary goal as a shared copy to multiple employees. Recipients can only adjust weight; the primary owner's actuals flow through automatically.
      </p>

      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Source Goal ID</label>
            <input
              type="text"
              required
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              placeholder="Paste a Goal UUID from any sheet"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
            <input
              type="text"
              required
              pattern="\d{4}"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Recipient employee emails <span className="text-slate-400 font-normal">(comma or newline separated)</span>
          </label>
          <textarea
            rows={2}
            required
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="employee@test.com, emp2@test.com"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Default weight on each copy</label>
            <input
              type="number"
              min={10}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
          >
            <Share2 size={16} /> {busy ? "Cascading..." : "Cascade Goal"}
          </button>
        </div>
      </form>

      {err && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">{err}</p>
      )}

      {results && (
        <ul className="mt-4 space-y-2">
          {results.map((r, i) => {
            const ok = r.status === "cloned" || r.status === "already shared";
            return (
              <li
                key={i}
                className={`flex items-center justify-between text-sm rounded-lg px-3 py-2 border ${
                  ok
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}
              >
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

function safeParse(s) {
  try { return JSON.stringify(JSON.parse(s)); } catch { return s ?? "—"; }
}

function LogRow({ log }) {
  const when = new Date(log.timestamp).toLocaleString();
  const oldVal = safeParse(log.old_value);
  const newVal = safeParse(log.new_value);
  return (
    <tr>
      <td className="px-4 py-3 text-slate-600 align-top whitespace-nowrap text-xs">
        {when}
      </td>
      <td className="px-4 py-3 align-top">
        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
          {log.entity_type}
        </span>
      </td>
      <td className="px-4 py-3 align-top">
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${ACTION_COLORS[log.action] || "bg-slate-100 text-slate-700"}`}>
          {log.action}
        </span>
      </td>
      <td
        className="px-4 py-3 font-mono text-xs text-slate-500 align-top whitespace-nowrap"
        title={log.changed_by}
      >
        {log.changed_by.slice(0, 8)}…
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span
            className="bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100 max-w-[18rem] truncate"
            title={oldVal}
          >
            {oldVal}
          </span>
          <ArrowRight size={14} className="text-slate-400 shrink-0" />
          <span
            className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100 max-w-[18rem] truncate"
            title={newVal}
          >
            {newVal}
          </span>
        </div>
      </td>
    </tr>
  );
}
