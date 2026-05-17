import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, FileText, Target, Search, LogOut, ArrowRight, History, Download, X,
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
