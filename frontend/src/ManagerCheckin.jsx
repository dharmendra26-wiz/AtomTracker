import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Target, TrendingUp, MessageSquare, Send, Loader2, AlertCircle } from "lucide-react";
import { api } from "./api";
import Layout from "./Layout";
import IdChip from "./IdChip";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const STATUS_BADGE = {
  "Not Started": "badge-draft",
  "On Track":    "badge-submitted",
  "Completed":   "badge-locked",
};

function ScoreBar({ score }) {
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#6366f1";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 weight-bar-track">
        <div className="weight-bar-fill" style={{ width: `${Math.min(score,100)}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-10 text-right" style={{ color }}>{score.toFixed(1)}</span>
    </div>
  );
}

export default function ManagerCheckin() {
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
    <Layout title="Team Check-in Review">
      <div className="flex items-center gap-3 text-slate-500 py-20 justify-center">
        <Loader2 className="animate-spin-slow" size={22} /> Loading…
      </div>
    </Layout>
  );
  if (!data) return (
    <Layout title="Team Check-in Review">
      <div className="alert alert-err"><AlertCircle size={16}/>{err || "Unable to load"}</div>
    </Layout>
  );

  return (
    <Layout
      title="Team Check-in Review"
      actions={
        <button onClick={() => nav("/manager")} className="btn btn-ghost text-xs">← Back</button>
      }
    >
      {/* Score summary */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Overall Score · FY {data.year}</p>
            <div className="score-pill mt-1">{data.overall_score.toFixed(1)}<small>/ 100</small></div>
          </div>
          <span className="badge badge-locked">{data.status}</span>
        </div>
      </div>

      {err && <div className="alert alert-err mb-4"><AlertCircle size={16}/>{err}</div>}

      <div className="space-y-4 stagger">
        {data.goals.map(g => <ReviewGoalCard key={g.id} goal={g} onCommented={load} />)}
      </div>
    </Layout>
  );
}

function ReviewGoalCard({ goal, onCommented }) {
  const sorted = [...goal.checkins].sort((a, b) => QUARTERS.indexOf(a.qtr) - QUARTERS.indexOf(b.qtr));
  return (
    <div className="card p-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl shrink-0">
            <Target size={16} style={{ color:"#6366f1" }} />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{goal.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">UoM: {goal.uom} · Target: {goal.target} · Weight: {goal.weight}%</p>
            <IdChip id={goal.id} label="Goal" />
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-slate-400 mb-1">Score</p>
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} style={{ color:"#6366f1" }} />
            <span className="font-bold text-slate-900">{goal.score.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <ScoreBar score={goal.score} />

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400 italic mt-4">No check-ins logged yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {sorted.map(c => <CheckinRow key={c.id} checkin={c} onCommented={onCommented} />)}
        </ul>
      )}
    </div>
  );
}

function CheckinRow({ checkin, onCommented }) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true); setErr("");
    try {
      await api(`/checkins/${checkin.id}/comment`, { method:"POST", body:{ comment: comment.trim() }});
      setComment(""); onCommented();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <li className="border border-slate-100 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">{checkin.qtr}</span>
          <span className="text-sm text-slate-600">
            Actual: <strong className="text-slate-900">{checkin.actual ?? "—"}</strong>
          </span>
          <span className={`badge ${STATUS_BADGE[checkin.status]}`}>{checkin.status}</span>
        </div>
        <IdChip id={checkin.id} label="Check-in" />
      </div>

      {checkin.mgr_comment ? (
        <div className="flex items-start gap-2 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
          <MessageSquare size={15} style={{ color:"#059669" }} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-emerald-700 mb-0.5">Your feedback</p>
            <p className="text-sm text-emerald-800">{checkin.mgr_comment}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <input className="input flex-1" value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Add feedback for this check-in…" />
          <button type="submit" disabled={busy || !comment.trim()} className="btn btn-primary">
            {busy ? <Loader2 size={14} className="animate-spin-slow"/> : <Send size={14}/>}
            Send
          </button>
        </form>
      )}
      {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
    </li>
  );
}
