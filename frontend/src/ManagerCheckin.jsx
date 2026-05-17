import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Target, TrendingUp, MessageSquare, Send } from "lucide-react";
import { api } from "./api";
import IdChip from "./IdChip";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const STATUS_BADGE = {
  "Not Started": "bg-slate-100 text-slate-700",
  "On Track":    "bg-amber-100 text-amber-800",
  "Completed":   "bg-emerald-100 text-emerald-800",
};

export default function ManagerCheckin() {
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
            onClick={() => nav("/manager")}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} /> Back to team
          </button>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
            {data.status}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">FY {data.year}</h1>
              <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Review and provide feedback on your report's progress</span>
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
            <ReviewGoalCard key={g.id} goal={g} onCommented={load} />
          ))}
        </div>
      </main>
    </div>
  );
}

function ReviewGoalCard({ goal, onCommented }) {
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

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500 italic">No check-ins logged yet.</p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((c) => (
            <CheckinRow key={c.id} checkin={c} onCommented={onCommented} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CheckinRow({ checkin, onCommented }) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/checkins/${checkin.id}/comment`, {
        method: "POST",
        body: { comment: comment.trim() },
      });
      setComment("");
      onCommented();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
            {checkin.qtr}
          </span>
          <span className="text-sm text-slate-600">
            Actual: <span className="font-medium text-slate-900">{checkin.actual ?? "—"}</span>
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_BADGE[checkin.status]}`}>
            {checkin.status}
          </span>
        </div>
        <IdChip id={checkin.id} label="Check-in" />
      </div>

      {checkin.mgr_comment ? (
        <div className="flex items-start gap-2 bg-slate-50 rounded-lg p-3 text-sm">
          <MessageSquare size={16} className="text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-0.5">Manager feedback</p>
            <p className="text-slate-700">{checkin.mgr_comment}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add feedback for this check-in..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={busy || !comment.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Send size={14} /> {busy ? "Saving..." : "Add Feedback"}
          </button>
        </form>
      )}

      {err && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
          {err}
        </p>
      )}
    </li>
  );
}
