import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Lock, Target, RotateCcw, Check, Pencil, Share2 } from "lucide-react";
import { api } from "./api";
import IdChip from "./IdChip";

const STATUS_STYLES = {
  Draft:     "bg-slate-100 text-slate-700",
  Submitted: "bg-amber-100 text-amber-800",
  Locked:    "bg-emerald-100 text-emerald-800",
};

export default function ManagerSheetDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [sheet, setSheet] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [approving, setApproving] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectMsg, setRejectMsg] = useState("");
  const [rejecting, setRejecting] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await api(`/sheets/${id}/progress`);
      setSheet({ id: data.sheet_id, year: data.year, status: data.status });
      setGoals(data.goals);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function approve() {
    setApproving(true);
    setErr("");
    try {
      const res = await api(`/sheets/${id}/approve`, { method: "POST" });
      setSheet((s) => ({ ...s, status: res.status }));
    } catch (e) {
      setErr(e.message);
    } finally {
      setApproving(false);
    }
  }

  async function reject() {
    if (!rejectMsg.trim()) return;
    setRejecting(true);
    setErr("");
    try {
      const res = await api(`/sheets/${id}/reject`, {
        method: "POST",
        body: { comment: rejectMsg.trim() },
      });
      setSheet((s) => ({ ...s, status: res.status }));
      setShowReject(false);
      setRejectMsg("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setRejecting(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-slate-500">Loading sheet...</div>;
  }

  const totalWeight = goals.reduce((s, g) => s + (g.weight || 0), 0);
  const isLocked = sheet?.status === "Locked";
  const isSubmitted = sheet?.status === "Submitted";
  const canEdit = isSubmitted; // managers can inline-edit during Submitted

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
          {sheet && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[sheet.status]}`}>
              {sheet.status}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {sheet && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">FY {sheet.year}</h1>
                <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{goals.length} goal{goals.length !== 1 && "s"} &middot; total weight {totalWeight}%</span>
                  <span className="text-slate-300">&middot;</span>
                  <IdChip id={sheet.id} label="Sheet" />
                </div>
                {isSubmitted && (
                  <p className="text-xs text-slate-500 mt-2 italic">
                    Tip: click a target or weight to edit inline before approving.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {isSubmitted && (
                  <button
                    onClick={() => setShowReject(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 text-sm font-medium rounded-lg transition"
                  >
                    <RotateCcw size={16} /> Return for Rework
                  </button>
                )}

                {isSubmitted && (
                  <button
                    onClick={approve}
                    disabled={approving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition"
                  >
                    <CheckCircle2 size={16} /> {approving ? "Approving..." : "Approve & Lock"}
                  </button>
                )}

                {isLocked && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg border border-emerald-200">
                    <Lock size={16} /> Approved & Locked
                  </div>
                )}
              </div>
            </div>

            {showReject && (
              <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Why are you returning this sheet? (Employee will see this comment)
                </label>
                <textarea
                  rows={2}
                  autoFocus
                  value={rejectMsg}
                  onChange={(e) => setRejectMsg(e.target.value)}
                  placeholder="e.g. Goal 3 weight is too high — please rebalance."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => { setShowReject(false); setRejectMsg(""); }}
                    className="text-sm px-3 py-1.5 text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={reject}
                    disabled={rejecting || !rejectMsg.trim()}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
                  >
                    <RotateCcw size={14} /> {rejecting ? "Sending..." : "Send back to Employee"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {err && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {err}
          </p>
        )}

        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Goals</h2>

          {goals.length === 0 ? (
            <p className="text-sm text-slate-500">No goals on this sheet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-4 font-medium">Title</th>
                    <th className="py-2 pr-4 font-medium">UOM</th>
                    <th className="py-2 pr-4 font-medium">Target</th>
                    <th className="py-2 pr-4 font-medium text-right">Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {goals.map((g) => (
                    <ManagerGoalRow key={g.id} goal={g} canEdit={canEdit} onChange={load} />
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

function ManagerGoalRow({ goal, canEdit, onChange }) {
  const shared = !!goal.source_goal_id;
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState(goal.target);
  const [weight, setWeight] = useState(goal.weight);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true);
    setErr("");
    try {
      const payload = { weight: Number(weight) };
      // shared copies: don't try to touch target (backend blocks anyway)
      if (!shared) payload.target = Number(target);
      await api(`/goals/${goal.id}/override`, { method: "POST", body: payload });
      setEditing(false);
      onChange();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr>
        <td className="py-3 pr-4">
          <div className="flex items-center gap-2 flex-wrap">
            {shared
              ? <Share2 size={16} className="text-amber-600" />
              : <Target size={16} className="text-indigo-500" />}
            <span className="font-medium text-slate-900">{goal.title}</span>
            {shared && (
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                Shared
              </span>
            )}
            <IdChip id={goal.id} label="Goal" />
          </div>
        </td>
        <td className="py-3 pr-4 text-slate-600">{goal.uom}</td>
        <td className="py-3 pr-4 text-slate-600">
          {editing && !shared ? (
            <input
              type="number"
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-24 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ) : (
            <button
              disabled={!canEdit || shared}
              onClick={() => setEditing(true)}
              title={shared ? "Target is owned by the primary goal" : canEdit ? "Click to edit" : ""}
              className={`px-2 py-0.5 rounded ${canEdit && !shared ? "hover:bg-indigo-100 hover:text-indigo-700 cursor-pointer" : "cursor-default"}`}
            >
              {goal.target}
            </button>
          )}
        </td>
        <td className="py-3 pr-4 text-right">
          {editing ? (
            <div className="inline-flex items-center gap-1.5">
              <input
                type="number"
                min={10}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-20 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={save}
                disabled={busy}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-60"
                title="Save"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => { setEditing(false); setTarget(goal.target); setWeight(goal.weight); setErr(""); }}
                className="text-xs text-slate-500 hover:text-slate-700 px-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              disabled={!canEdit}
              onClick={() => setEditing(true)}
              title={canEdit ? "Click to edit" : ""}
              className={`text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded inline-flex items-center gap-1 ${
                canEdit ? "hover:bg-indigo-100 hover:text-indigo-700 cursor-pointer" : "cursor-default"
              }`}
            >
              {goal.weight}%
              {canEdit && <Pencil size={10} className="opacity-60" />}
            </button>
          )}
        </td>
      </tr>
      {err && (
        <tr>
          <td colSpan={4} className="pb-2">
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
              {err}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
