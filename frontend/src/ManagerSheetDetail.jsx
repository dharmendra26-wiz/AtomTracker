import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Lock, Target, RotateCcw, Check, Pencil, Share2, Loader2, AlertTriangle } from "lucide-react";
import { api } from "./api";
import Layout from "./Layout";
import IdChip from "./IdChip";

export default function ManagerSheetDetail() {
  const { id } = useParams();
  const nav    = useNavigate();
  const [sheet, setSheet]       = useState(null);
  const [goals, setGoals]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState("");
  const [approving, setApproving] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectMsg, setRejectMsg]   = useState("");
  const [rejecting, setRejecting]   = useState(false);

  async function load() {
    setLoading(true); setErr("");
    try {
      const d = await api(`/sheets/${id}/progress`);
      setSheet({ id: d.sheet_id, year: d.year, status: d.status });
      setGoals(d.goals);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [id]);

  async function approve() {
    setApproving(true); setErr("");
    try {
      const r = await api(`/sheets/${id}/approve`, { method: "POST" });
      setSheet(s => ({ ...s, status: r.status }));
    } catch (e) { setErr(e.message); }
    finally { setApproving(false); }
  }

  async function reject() {
    if (!rejectMsg.trim()) return;
    setRejecting(true); setErr("");
    try {
      const r = await api(`/sheets/${id}/reject`, { method:"POST", body:{ comment: rejectMsg.trim() }});
      setSheet(s => ({ ...s, status: r.status }));
      setShowReject(false); setRejectMsg("");
    } catch (e) { setErr(e.message); }
    finally { setRejecting(false); }
  }

  if (loading) return (
    <Layout title="Review Sheet">
      <div className="flex items-center gap-3 text-slate-500 py-20 justify-center">
        <Loader2 className="animate-spin-slow" size={22} /> Loading…
      </div>
    </Layout>
  );

  const totalWeight = goals.reduce((s, g) => s + (g.weight||0), 0);
  const isLocked    = sheet?.status === "Locked";
  const isSubmitted = sheet?.status === "Submitted";
  const statusBadge = { Submitted:"badge-submitted", Locked:"badge-locked" };

  return (
    <Layout
      title={`FY ${sheet?.year} — Review`}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge ${statusBadge[sheet?.status]}`}>{sheet?.status}</span>
          <button onClick={() => nav("/manager")} className="btn btn-ghost text-xs">← Back</button>
          {isSubmitted && (
            <>
              <button onClick={() => setShowReject(true)} className="btn btn-warning">
                <RotateCcw size={15} /> Return for Rework
              </button>
              <button onClick={approve} disabled={approving} className="btn btn-success">
                {approving ? <Loader2 size={15} className="animate-spin-slow" /> : <CheckCircle2 size={15} />}
                Approve & Lock
              </button>
            </>
          )}
          {isLocked && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <Lock size={14} /> Approved & Locked
            </div>
          )}
        </div>
      }
    >
      {/* Return for rework panel */}
      {showReject && (
        <div className="card p-5 mb-6 border-amber-200 animate-fade-up" style={{ borderColor:"#fde68a" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} style={{ color:"#d97706" }} />
            <h3 className="font-bold text-amber-900">Return for Rework</h3>
          </div>
          <p className="text-sm text-amber-800 mb-3">Provide a clear comment explaining what needs to be changed.</p>
          <textarea
            className="input mb-3" rows={3} autoFocus
            value={rejectMsg} onChange={e => setRejectMsg(e.target.value)}
            placeholder="e.g. Goal 3 weight is too high — please rebalance to reflect actual priorities."
          />
          {err && <div className="alert alert-err mb-3"><span>{err}</span></div>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowReject(false); setRejectMsg(""); }} className="btn btn-ghost">Cancel</button>
            <button onClick={reject} disabled={rejecting || !rejectMsg.trim()} className="btn btn-warning">
              {rejecting ? <Loader2 size={15} className="animate-spin-slow" /> : <RotateCcw size={15} />}
              Send Back
            </button>
          </div>
        </div>
      )}

      {!showReject && err && <div className="alert alert-err mb-4"><AlertTriangle size={15}/>{err}</div>}

      {/* Sheet summary */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-bold text-slate-900 text-lg">Sheet Summary</p>
            <p className="text-sm text-slate-500">
              {goals.length} goals · Total weight: <strong>{totalWeight}%</strong>
            </p>
            <IdChip id={id} label="Sheet" />
          </div>
          {isSubmitted && (
            <p className="text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">
              💡 Click any Target or Weight cell to edit inline before approving
            </p>
          )}
        </div>
      </div>

      {/* Goals table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Goals</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Goal</th>
                <th>UoM</th>
                <th>Target</th>
                <th className="text-right">Weight</th>
              </tr>
            </thead>
            <tbody>
              {goals.map(g => (
                <MgrGoalRow key={g.id} goal={g} canEdit={isSubmitted} onChange={load} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

function MgrGoalRow({ goal, canEdit, onChange }) {
  const shared   = !!goal.source_goal_id;
  const [editing, setEditing] = useState(false);
  const [target, setTarget]   = useState(goal.target);
  const [weight, setWeight]   = useState(goal.weight);
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState("");

  async function save() {
    setBusy(true); setErr("");
    try {
      const payload = { weight: Number(weight) };
      if (!shared) payload.target = Number(target);
      await api(`/goals/${goal.id}/override`, { method:"POST", body:payload });
      setEditing(false); onChange();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <tr>
        <td>
          <div className="flex items-center gap-2 flex-wrap">
            {shared ? <Share2 size={14} style={{color:"#d97706"}}/> : <Target size={14} style={{color:"#6366f1"}}/>}
            <span className="font-semibold text-slate-900">{goal.title}</span>
            {shared && <span className="badge badge-submitted" style={{fontSize:9}}>Shared</span>}
            <IdChip id={goal.id} label="Goal" />
          </div>
          {goal.thrust_area && <p className="text-xs text-slate-400 mt-0.5 ml-5">{goal.thrust_area}</p>}
        </td>
        <td className="text-slate-600 font-medium">{goal.uom}</td>
        <td>
          {editing && !shared ? (
            <input type="number" step="any" value={target}
              onChange={e => setTarget(e.target.value)}
              className="input" style={{ width:90 }} />
          ) : (
            <button disabled={!canEdit || shared} onClick={() => setEditing(true)}
              className={`px-2 py-1 rounded-lg text-sm font-medium ${canEdit && !shared ? "hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer" : "cursor-default text-slate-600"}`}>
              {goal.target}
            </button>
          )}
        </td>
        <td className="text-right">
          {editing ? (
            <div className="inline-flex items-center gap-1.5">
              <input type="number" min={10} value={weight}
                onChange={e => setWeight(e.target.value)}
                className="input" style={{ width:72 }} />
              <button onClick={save} disabled={busy} className="btn btn-primary" style={{ padding:"6px 9px" }}>
                {busy ? <Loader2 size={13} className="animate-spin-slow"/> : <Check size={13}/>}
              </button>
              <button onClick={() => { setEditing(false); setTarget(goal.target); setWeight(goal.weight); setErr(""); }}
                className="btn btn-ghost text-xs">×</button>
            </div>
          ) : (
            <button disabled={!canEdit} onClick={() => setEditing(true)}
              className={`text-sm font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 ${canEdit ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer" : "bg-slate-100 text-slate-700 cursor-default"}`}>
              {goal.weight}% {canEdit && <Pencil size={10}/>}
            </button>
          )}
        </td>
      </tr>
      {err && (
        <tr>
          <td colSpan={4} className="pb-2">
            <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{err}</p>
          </td>
        </tr>
      )}
    </>
  );
}
