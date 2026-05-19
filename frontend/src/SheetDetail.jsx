import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus, Send, Target, Share2, Pencil, Trash2, Check, X,
  AlertTriangle, Loader2, Lock,
} from "lucide-react";
import { api } from "./api";
import Layout from "./Layout";
import IdChip from "./IdChip";
import SheetComments from "./SheetComments";

const UOMS = ["Min", "Max", "Timeline", "Zero"];
const UOM_DESC = {
  Min: "Higher is better (e.g. Revenue)",
  Max: "Lower is better (e.g. TAT, Cost)",
  Timeline: "Date-based (completion %)",
  Zero: "Zero = 100% (e.g. Safety incidents)",
};
const EMPTY = { title: "", desc: "", thrust_area: "", uom: "Min", target: "", weight: "" };

function WeightBar({ total }) {
  const pct = Math.min(total, 100);
  const color = total === 100 ? "#10b981" : total > 100 ? "#ef4444" : "#f59e0b";
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-semibold text-slate-700">Total Weightage</span>
        <span style={{ color, fontWeight: 700 }}>{total} / 100</span>
      </div>
      <div className="weight-bar-track">
        <div className="weight-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      {total !== 100 && (
        <p className="text-xs text-slate-500 mt-1.5">
          {total < 100 ? `Need ${100 - total} more weightage to submit.` : `Over by ${total - 100} — reduce a goal's weight.`}
        </p>
      )}
    </div>
  );
}

export default function SheetDetail() {
  const { id }  = useParams();
  const nav     = useNavigate();
  const [sheet, setSheet]       = useState(null);
  const [goals, setGoals]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState("");
  const [form, setForm]         = useState(EMPTY);
  const [adding, setAdding]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true); setErr("");
    try {
      const d = await api(`/sheets/${id}/progress`);
      setSheet({ id: d.sheet_id, year: d.year, status: d.status, reject_comment: d.reject_comment });
      setGoals(d.goals);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [id]);

  const totalWeight = useMemo(() => goals.reduce((s, g) => s + (g.weight || 0), 0), [goals]);
  const isDraft     = sheet?.status === "Draft";
  const canSubmit   = isDraft && totalWeight === 100 && goals.length > 0;
  const atMax       = goals.length >= 8;

  async function addGoal(e) {
    e.preventDefault();
    setAdding(true); setErr("");
    try {
      await api(`/sheets/${id}/goals`, { method: "POST", body: {
        title: form.title, desc: form.desc || null, thrust_area: form.thrust_area || null,
        uom: form.uom, target: Number(form.target), weight: Number(form.weight),
      }});
      setForm(EMPTY); setShowForm(false); await load();
    } catch (e) { setErr(e.message); }
    finally { setAdding(false); }
  }

  async function submitSheet() {
    if (!canSubmit) return;
    setSubmitting(true); setErr("");
    try { await api(`/sheets/${id}/submit`, { method: "POST" }); await load(); }
    catch (e) { setErr(e.message); }
    finally { setSubmitting(false); }
  }

  const statusBadge = { Draft: "badge-draft", Submitted: "badge-submitted", Locked: "badge-locked" };

  if (loading) return (
    <Layout title="Goal Sheet">
      <div className="flex items-center gap-3 text-slate-500 py-20 justify-center">
        <Loader2 className="animate-spin-slow" size={22} /> Loading…
      </div>
    </Layout>
  );

  return (
    <Layout
      title={sheet ? `FY ${sheet.year} — Goal Sheet` : "Goal Sheet"}
      actions={
        <div className="flex items-center gap-2">
          {sheet && <span className={`badge ${statusBadge[sheet.status]}`}>{sheet.status}</span>}
          <button onClick={() => nav("/employee")} className="btn btn-ghost text-xs">← Back</button>
          {isDraft && !atMax && (
            <button onClick={() => setShowForm(v => !v)} className="btn btn-primary">
              <Plus size={15} /> Add Goal
            </button>
          )}
          {isDraft && (
            <button onClick={submitSheet} disabled={!canSubmit || submitting} className="btn btn-success">
              {submitting ? <Loader2 size={15} className="animate-spin-slow" /> : <Send size={15} />}
              Submit
            </button>
          )}
        </div>
      }
    >
      {/* Rework banner */}
      {sheet?.reject_comment && isDraft && (
        <div className="alert alert-warn mb-6 animate-fade-in">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Returned for rework by your manager</p>
            <p className="text-sm mt-0.5">{sheet.reject_comment}</p>
            <p className="text-xs mt-1 opacity-70">Fix the issues below, then re-submit.</p>
          </div>
        </div>
      )}

      {/* Locked notice */}
      {!isDraft && (
        <div className="alert alert-ok mb-6 animate-fade-in">
          <Lock size={16} className="shrink-0" />
          <span>This sheet is <strong>{sheet?.status}</strong> and no longer editable.</span>
        </div>
      )}

      {/* Weight summary */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <p className="font-bold text-slate-900 text-base">{goals.length} goal{goals.length !== 1 && "s"}</p>
            <IdChip id={id} label="Sheet" />
          </div>
          <span className="text-slate-400 text-sm">{atMax ? "Max 8 goals reached" : `${8 - goals.length} slots remaining`}</span>
        </div>
        <WeightBar total={totalWeight} />
      </div>

      {err && <div className="alert alert-err mb-4"><AlertTriangle size={15}/>{err}</div>}

      {/* Goals list */}
      <div className="card p-0 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Goals</h2>
        </div>
        {goals.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Target size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No goals yet. Click "Add Goal" to start.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {goals.map((g) => (
              <GoalRow key={g.id} goal={g} isDraft={isDraft} onChange={load} />
            ))}
          </ul>
        )}
      </div>

      {/* Add goal form */}
      {isDraft && showForm && (
        <div className="card p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-900">New Goal</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={addGoal} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Goal Title *</label>
              <input className="input" required value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Increase Monthly Revenue" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
              <textarea className="input" rows={2} value={form.desc}
                onChange={e => setForm({ ...form, desc: e.target.value })} placeholder="Briefly describe this goal…" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Thrust Area</label>
              <input className="input" value={form.thrust_area}
                onChange={e => setForm({ ...form, thrust_area: e.target.value })} placeholder="e.g. Sales, Quality" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Unit of Measure (UoM)</label>
              <select className="input" value={form.uom}
                onChange={e => setForm({ ...form, uom: e.target.value })}>
                {UOMS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <p className="text-xs text-slate-400 mt-1">{UOM_DESC[form.uom]}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target *</label>
              <input className="input" type="number" step="any" required value={form.target}
                onChange={e => setForm({ ...form, target: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Weight <span className="text-slate-400 font-normal">(min 10)</span></label>
              <input className="input" type="number" min={10} required value={form.weight}
                onChange={e => setForm({ ...form, weight: e.target.value })} />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
              <button type="submit" disabled={adding} className="btn btn-primary">
                {adding ? <Loader2 size={15} className="animate-spin-slow" /> : <Plus size={15} />}
                Add Goal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Feedback thread — employee ↔ manager */}
      <SheetComments sheetId={id} />
    </Layout>
  );
}

/* ── GoalRow ── */
function GoalRow({ goal, isDraft, onChange }) {
  const shared   = !!goal.source_goal_id;
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState("");
  const [draft, setDraft] = useState({
    title: goal.title, desc: goal.desc || "", thrust_area: goal.thrust_area || "",
    uom: goal.uom, target: goal.target, weight: goal.weight,
  });

  async function save() {
    setBusy(true); setErr("");
    try {
      await api(`/goals/${goal.id}`, { method: "PATCH", body: {
        title: draft.title, desc: draft.desc || null, thrust_area: draft.thrust_area || null,
        uom: draft.uom, target: Number(draft.target), weight: Number(draft.weight),
      }});
      setEditing(false); onChange();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm("Delete this goal?")) return;
    setBusy(true); setErr("");
    try { await api(`/goals/${goal.id}`, { method: "DELETE" }); onChange(); }
    catch (e) { setErr(e.message); setBusy(false); }
  }

  if (editing) return (
    <li className="p-5 bg-indigo-50/50 animate-fade-in">
      <div className="grid gap-3 sm:grid-cols-2 mb-3">
        {!shared && <>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
            <input className="input" value={draft.title} onChange={e => setDraft({...draft,title:e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Thrust Area</label>
            <input className="input" value={draft.thrust_area} onChange={e => setDraft({...draft,thrust_area:e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">UoM</label>
            <select className="input" value={draft.uom} onChange={e => setDraft({...draft,uom:e.target.value})}>
              {UOMS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Target</label>
            <input className="input" type="number" step="any" value={draft.target}
              onChange={e => setDraft({...draft,target:e.target.value})} />
          </div>
        </>}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Weight (min 10)</label>
          <input className="input" type="number" min={10} value={draft.weight}
            onChange={e => setDraft({...draft,weight:e.target.value})} />
        </div>
      </div>
      {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="btn btn-primary text-xs">
          {busy ? <Loader2 size={13} className="animate-spin-slow" /> : <Check size={13} />} Save
        </button>
        <button onClick={() => { setEditing(false); setErr(""); }} className="btn btn-ghost text-xs">
          <X size={13} /> Cancel
        </button>
      </div>
    </li>
  );

  return (
    <li className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        <div className={`p-2 rounded-lg shrink-0 ${shared ? "bg-amber-50" : "bg-indigo-50"}`}>
          {shared ? <Share2 size={16} style={{ color:"#d97706" }} /> : <Target size={16} style={{ color:"#6366f1" }} />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900">{goal.title}</p>
            {shared && <span className="badge badge-submitted" style={{ fontSize:10 }}>Shared</span>}
            {goal.thrust_area && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{goal.thrust_area}</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            UoM: {goal.uom} · Target: {goal.target}
          </p>
          <IdChip id={goal.id} label="Goal" />
          {shared && <p className="text-xs text-amber-600 mt-1">Cascaded — title & target locked. Actuals from primary owner.</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
          {goal.weight}%
        </span>
        {isDraft && (
          <>
            <button onClick={() => setEditing(true)} title="Edit" className="btn btn-ghost" style={{ padding:"6px 8px" }}>
              <Pencil size={14} />
            </button>
            {!shared && (
              <button onClick={remove} disabled={busy} title="Delete" className="btn btn-ghost text-red-500 hover:bg-red-50" style={{ padding:"6px 8px" }}>
                {busy ? <Loader2 size={14} className="animate-spin-slow" /> : <Trash2 size={14} />}
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}
