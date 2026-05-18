import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Target, TrendingUp, Lock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "./api";
import Layout from "./Layout";
import IdChip from "./IdChip";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const STATUSES = ["Not Started", "On Track", "Completed"];

function currentQuarter() {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return "Q1"; if (m <= 6) return "Q2";
  if (m <= 9) return "Q3"; return "Q4";
}

const STATUS_STYLES = {
  "Not Started": { badge: "badge-draft",     dot: "#94a3b8" },
  "On Track":    { badge: "badge-submitted", dot: "#f59e0b" },
  "Completed":   { badge: "badge-locked",    dot: "#10b981" },
};

function ScoreRing({ score, size = 64 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#6366f1";
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={7} />
      <circle className="progress-ring" cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset .6s ease" }} />
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
        fontSize="12" fontWeight="800" fill={color}>{score.toFixed(0)}</text>
    </svg>
  );
}

export default function EmployeeCheckin() {
  const { id } = useParams();
  const nav    = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]       = useState("");

  async function load() {
    setLoading(true); setErr("");
    try { setData(await api(`/sheets/${id}/progress`)); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [id]);

  if (loading) return (
    <Layout title="Check-in">
      <div className="flex items-center gap-3 text-slate-500 py-20 justify-center">
        <Loader2 className="animate-spin-slow" size={22} /> Loading…
      </div>
    </Layout>
  );
  if (!data) return (
    <Layout title="Check-in">
      <div className="alert alert-err"><AlertCircle size={16}/>{err || "Unable to load"}</div>
    </Layout>
  );

  return (
    <Layout
      title={`FY ${data.year} — Check-ins`}
      actions={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200">
            <Lock size={12} /> Locked
          </div>
          <button onClick={() => nav("/employee")} className="btn btn-ghost text-xs">← Back</button>
        </div>
      }
    >
      {/* Overall score hero */}
      <div className="card p-6 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Overall Score</p>
          <div className="score-pill">
            {data.overall_score.toFixed(1)} <small>/ 100</small>
          </div>
          <p className="text-sm text-slate-500 mt-1">Weighted average across all goals</p>
        </div>
        <div className="flex gap-2">
          {QUARTERS.map(q => {
            const allDone = data.goals.every(g => g.checkins.some(c => c.qtr === q && c.actual !== null));
            return (
              <div key={q} className={`text-center px-3 py-2 rounded-xl border text-xs font-bold ${
                allDone ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-400"
              }`}>
                {q}
                <p className="font-normal mt-0.5">{allDone ? "✓" : "—"}</p>
              </div>
            );
          })}
        </div>
      </div>

      {err && <div className="alert alert-err mb-4"><AlertCircle size={16}/>{err}</div>}

      <div className="space-y-4 stagger">
        {data.goals.map(g => <GoalCard key={g.id} goal={g} onLogged={load} />)}
      </div>
    </Layout>
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
    setBusy(true); setErr("");
    try {
      await api(`/goals/${goal.id}/checkins`, { method:"POST", body:{ qtr, actual:Number(actual), status }});
      setActual(""); onLogged();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const sorted = [...goal.checkins].sort((a,b) => QUARTERS.indexOf(a.qtr)-QUARTERS.indexOf(b.qtr));
  const isShared = !!goal.source_goal_id;

  return (
    <div className="card p-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl shrink-0">
            <Target size={18} style={{ color:"#6366f1" }} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-900">{goal.title}</p>
              {isShared && <span className="badge badge-submitted" style={{fontSize:10}}>Shared</span>}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">UoM: {goal.uom} · Target: {goal.target} · Weight: {goal.weight}%</p>
            <IdChip id={goal.id} label="Goal" />
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-center">
          <ScoreRing score={goal.score} />
          <p className="text-xs text-slate-500 mt-1">Score</p>
        </div>
      </div>

      {/* Quarter cards */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {QUARTERS.map(q => {
          const c = sorted.find(x => x.qtr === q);
          return (
            <div key={q} className={`rounded-xl border p-3 text-center transition-all ${
              c ? "bg-slate-50 border-slate-200" : "bg-white border-dashed border-slate-200"
            }`}>
              <p className="text-xs font-bold text-slate-500">{q}</p>
              {c ? (
                <>
                  <p className="text-base font-extrabold text-slate-900 mt-1">{c.actual}</p>
                  <span className={`badge ${STATUS_STYLES[c.status]?.badge || "badge-draft"}`} style={{fontSize:9}}>
                    {c.status}
                  </span>
                  <div className="mt-1.5"><IdChip id={c.id} /></div>
                </>
              ) : (
                <p className="text-xl text-slate-300 mt-1">—</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Log form */}
      {!isShared && (
        <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Quarter</label>
            <select className="input" value={qtr} onChange={e => setQtr(e.target.value)}>
              {QUARTERS.map(q => <option key={q}>{q}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Actual</label>
            <input className="input" type="number" step="any" required value={actual}
              onChange={e => setActual(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={busy} className="btn btn-primary w-full justify-center">
              {busy ? <Loader2 size={14} className="animate-spin-slow" /> : <TrendingUp size={14} />}
              Log
            </button>
          </div>
          {err && <p className="col-span-4 text-xs text-red-600">{err}</p>}
        </form>
      )}
      {isShared && (
        <p className="text-xs text-amber-600 pt-3 border-t border-slate-100">
          This is a shared goal — actuals are logged by the primary owner and sync automatically.
        </p>
      )}
    </div>
  );
}
