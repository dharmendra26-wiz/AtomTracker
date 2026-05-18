import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Send, Target, Share2, Check, AlertTriangle } from "lucide-react";
import { api } from "./api";
import IdChip from "./IdChip";

const UOMS = ["Min", "Max", "Timeline", "Zero"];

const STATUS_STYLES = {
  Draft:     "bg-slate-100 text-slate-700",
  Submitted: "bg-amber-100 text-amber-800",
  Locked:    "bg-emerald-100 text-emerald-800",
};

const EMPTY_GOAL = {
  title: "",
  desc: "",
  thrust_area: "",
  uom: "Min",
  target: "",
  weight: "",
  is_shared: false,
};

export default function SheetDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [sheet, setSheet] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [form, setForm] = useState(EMPTY_GOAL);
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await api(`/sheets/${id}/progress`);
      setSheet({
        id: data.sheet_id,
        year: data.year,
        status: data.status,
        reject_comment: data.reject_comment,
      });
      setGoals(data.goals);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  const totalWeight = useMemo(
    () => goals.reduce((sum, g) => sum + (g.weight || 0), 0),
    [goals]
  );

  const isDraft = sheet?.status === "Draft";
  const canSubmit = isDraft && totalWeight === 100 && goals.length > 0;
  const atMaxGoals = goals.length >= 8;

  async function addGoal(e) {
    e.preventDefault();
    setAdding(true);
    setErr("");
    try {
      await api(`/sheets/${id}/goals`, {
        method: "POST",
        body: {
          title: form.title,
          desc: form.desc || null,
          thrust_area: form.thrust_area || null,
          uom: form.uom,
          target: Number(form.target),
          weight: Number(form.weight),
          is_shared: form.is_shared,
        },
      });
      setForm(EMPTY_GOAL);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setAdding(false);
    }
  }

  async function submitSheet() {
    if (!canSubmit) return;
    setSubmitting(true);
    setErr("");
    try {
      await api(`/sheets/${id}/submit`, { method: "POST" });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-slate-500">Loading sheet...</div>;
  }

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
          {sheet && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[sheet.status]}`}>
              {sheet.status}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {sheet?.reject_comment && isDraft && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900">Sent back for rework by your manager</p>
              <p className="text-sm text-amber-800 mt-0.5 break-words">{sheet.reject_comment}</p>
              <p className="text-xs text-amber-700 mt-1">Make your changes and re-submit to clear this note.</p>
            </div>
          </div>
        )}

        {sheet && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">FY {sheet.year}</h1>
                <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>{goals.length} goal{goals.length !== 1 && "s"}</span>
                  <span className="text-slate-300">&middot;</span>
                  <IdChip id={sheet.id} label="Sheet" />
                </div>
              </div>
              <button
                onClick={submitSheet}
                disabled={!canSubmit || submitting}
                title={
                  !isDraft ? "Sheet is already submitted or locked"
                  : totalWeight !== 100 ? `Weights must total exactly 100 (currently ${totalWeight})`
                  : goals.length === 0 ? "Add at least one goal first"
                  : "Submit for approval"
                }
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:bg-slate-300 disabled:cursor-not-allowed transition"
              >
                <Send size={16} /> {submitting ? "Submitting..." : "Submit for Approval"}
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium text-slate-700">Total Weightage</span>
                <span className={`font-semibold ${totalWeight === 100 ? "text-emerald-600" : totalWeight > 100 ? "text-red-600" : "text-amber-600"}`}>
                  {totalWeight} / 100
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    totalWeight === 100 ? "bg-emerald-500"
                    : totalWeight > 100 ? "bg-red-500"
                    : "bg-amber-400"
                  }`}
                  style={{ width: `${Math.min(totalWeight, 100)}%` }}
                />
              </div>
              {totalWeight !== 100 && (
                <p className="text-xs text-slate-500 mt-2">
                  Goal weights must add up to exactly 100 before you can submit.
                </p>
              )}
            </div>
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
            <p className="text-sm text-slate-500">No goals added yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {goals.map((g) => (
                <GoalRow key={g.id} goal={g} isDraft={isDraft} onChange={load} />
              ))}
            </ul>
          )}
        </section>

        {isDraft && !atMaxGoals && (
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Add a new goal</h2>
            <form onSubmit={addGoal} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={form.desc}
                  onChange={(e) => setForm({ ...form, desc: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Thrust Area</label>
                <input
                  type="text"
                  value={form.thrust_area}
                  onChange={(e) => setForm({ ...form, thrust_area: e.target.value })}
                  placeholder="e.g. Sales, Quality"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit of Measure</label>
                <select
                  value={form.uom}
                  onChange={(e) => setForm({ ...form, uom: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {UOMS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Weight <span className="text-slate-400 font-normal">(min 10)</span>
                </label>
                <input
                  type="number"
                  min={10}
                  required
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_shared}
                    onChange={(e) => setForm({ ...form, is_shared: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Shared / cascaded goal
                </label>
                <button
                  type="submit"
                  disabled={adding}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
                >
                  <Plus size={16} /> {adding ? "Adding..." : "Add Goal"}
                </button>
              </div>
            </form>
          </section>
        )}

        {atMaxGoals && isDraft && (
          <p className="text-sm text-slate-500 bg-slate-100 rounded-lg px-3 py-2">
            You've reached the maximum of 8 goals for this sheet.
          </p>
        )}

        {!isDraft && (
          <p className="text-sm text-slate-500">
            This sheet is {sheet?.status.toLowerCase()} and can no longer be edited. <Link to="/employee" className="text-indigo-600 hover:underline">Back to dashboard</Link>
          </p>
        )}
      </main>
    </div>
  );
}

function GoalRow({ goal, isDraft, onChange }) {
  const shared = !!goal.source_goal_id;
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState(goal.weight);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true);
    setErr("");
    try {
      await api(`/goals/${goal.id}/weight`, { method: "PATCH", body: { weight: Number(weight) } });
      setEditing(false);
      onChange();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`p-2 rounded-lg shrink-0 ${shared ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-600"}`}>
            {shared ? <Share2 size={18} /> : <Target size={18} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-slate-900 truncate">{goal.title}</p>
              {shared && (
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                  Shared
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>UOM: {goal.uom} &middot; Target: {goal.target}</span>
              <IdChip id={goal.id} label="Goal" />
            </div>
            {shared && (
              <p className="text-[11px] text-amber-700 mt-1">
                Cascaded goal — title and target are locked. Actuals come from the primary owner.
              </p>
            )}
          </div>
        </div>

        {editing ? (
          <div className="flex items-center gap-1.5">
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
              title="Save weight"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => { setEditing(false); setWeight(goal.weight); setErr(""); }}
              className="text-xs text-slate-500 hover:text-slate-700 px-2"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            disabled={!isDraft}
            onClick={() => setEditing(true)}
            title={isDraft ? "Click to edit weight" : "Weight can only be changed while Draft"}
            className={`text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded ${
              isDraft ? "hover:bg-indigo-100 hover:text-indigo-700 cursor-pointer" : "cursor-default"
            }`}
          >
            {goal.weight}%
          </button>
        )}
      </div>
      {err && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 mt-1">
          {err}
        </p>
      )}
    </li>
  );
}
