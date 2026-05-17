import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Target, TrendingUp, Lock } from "lucide-react";
import { api } from "./api";
import IdChip from "./IdChip";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const STATUSES = ["Not Started", "On Track", "Completed"];

function currentQuarter() {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return "Q1";
  if (m <= 6) return "Q2";
  if (m <= 9) return "Q3";
  return "Q4";
}

const STATUS_BADGE = {
  "Not Started": "bg-slate-100 text-slate-700",
  "On Track":    "bg-amber-100 text-amber-800",
  "Completed":   "bg-emerald-100 text-emerald-800",
};

export default function EmployeeCheckin() {
  const { id } = useParams();
  const nav = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await api(`/sheets/${id}/progress`);
      setData(res);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="p-8 text-slate-500">Loading sheet...</div>;
  if (!data)   return <div className="p-8 text-red-600">{err || "Unable to load"}</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => nav("/employee")}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} /> Back to dashboard
          </button>
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
            <Lock size={12} /> {data.status}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">FY {data.year}</h1>
              <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Track your quarterly progress</span>
                <span className="text-slate-300">&middot;</span>
                <IdChip id={data.sheet_id} label="Sheet" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-slate-400">Overall score</p>
              <p className="text-3xl font-semibold text-indigo-600">{data.overall_score.toFixed(1)}</p>
            </div>
          </div>
        </div>

        {err && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {err}
          </p>
        )}

        <div className="space-y-4">
          {data.goals.map((g) => (
            <GoalCard key={g.id} goal={g} onLogged={load} />
          ))}
        </div>
      </main>
    </div>
  );
}

function GoalCard({ goal, onLogged }) {
  const [qtr, setQtr]       = useState(currentQuarter());
  const [actual, setActual] = useState("");
  const [status, setStatus] = useState("On Track");
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api(`/goals/${goal.id}/checkins`, {
        method: "POST",
        body: { qtr, actual: Number(actual), status },
      });
      setActual("");
      onLogged();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const sorted = [...goal.checkins].sort(
    (a, b) => QUARTERS.indexOf(a.qtr) - QUARTERS.indexOf(b.qtr)
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
            <Target size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-base font-medium text-slate-900">{goal.title}</p>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>UOM: {goal.uom} &middot; Target: {goal.target} &middot; Weight: {goal.weight}%</span>
              <IdChip id={goal.id} label="Goal" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-1.5 rounded-lg">
          <TrendingUp size={14} className="text-indigo-500" />
          <span className="text-slate-600">Score</span>
          <span className="font-semibold text-slate-900">{goal.score.toFixed(1)}</span>
        </div>
      </div>

      {sorted.length > 0 && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUARTERS.map((q) => {
            const c = sorted.find((x) => x.qtr === q);
            return (
              <div
                key={q}
                className={`p-2.5 rounded-lg border text-center ${
                  c ? "bg-slate-50 border-slate-200" : "bg-white border-dashed border-slate-200"
                }`}
              >
                <p className="text-xs font-medium text-slate-500">{q}</p>
                {c ? (
                  <>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{c.actual}</p>
                    <span className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_BADGE[c.status]}`}>
                      {c.status}
                    </span>
                    <div className="mt-1.5">
                      <IdChip id={c.id} />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">—</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4 items-end pt-4 border-t border-slate-100">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Quarter</label>
          <select
            value={qtr}
            onChange={(e) => setQtr(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Actual</label>
          <input
            type="number"
            step="any"
            required
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
        >
          {busy ? "Saving..." : "Log Progress"}
        </button>
      </form>

      {err && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
          {err}
        </p>
      )}
    </div>
  );
}
