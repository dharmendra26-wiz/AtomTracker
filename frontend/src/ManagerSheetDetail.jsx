import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Lock, Target } from "lucide-react";
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

  if (loading) {
    return <div className="p-8 text-slate-500">Loading sheet...</div>;
  }

  const totalWeight = goals.reduce((s, g) => s + (g.weight || 0), 0);
  const isLocked = sheet?.status === "Locked";
  const canApprove = sheet?.status === "Submitted";

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
              </div>

              {canApprove && (
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
                    <tr key={g.id}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Target size={16} className="text-indigo-500" />
                          <span className="font-medium text-slate-900">{g.title}</span>
                          <IdChip id={g.id} label="Goal" />
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{g.uom}</td>
                      <td className="py-3 pr-4 text-slate-600">{g.target}</td>
                      <td className="py-3 pr-4 text-right">
                        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                          {g.weight}%
                        </span>
                      </td>
                    </tr>
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
