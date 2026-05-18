import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, LogOut } from "lucide-react";
import { api } from "./api";
import { useAuth } from "./AuthContext";
import IdChip from "./IdChip";

const STATUS_STYLES = {
  Draft:     "bg-slate-100 text-slate-700",
  Submitted: "bg-amber-100 text-amber-800",
  Locked:    "bg-emerald-100 text-emerald-800",
};

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await api("/my-sheets");
      setSheets(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createSheet(e) {
    e.preventDefault();
    setCreating(true);
    setErr("");
    try {
      await api("/sheets", { method: "POST", body: { year } });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setCreating(false);
    }
  }

  function signOut() {
    logout();
    nav("/login", { replace: true });
  }

  function openSheet(s) {
    const path = s.status === "Locked" ? "checkin" : "sheet";
    nav(`/employee/${path}/${s.id}`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">AtomTracker</h1>
            <p className="text-sm text-slate-500">Welcome back, {user?.name || "there"}</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <section className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Start a new goal sheet</h2>
          <form onSubmit={createSheet} className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                pattern="\d{4}"
                required
                className="w-32 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
            >
              <Plus size={16} /> {creating ? "Creating..." : "Create Sheet"}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">My goal sheets</h2>

          {err && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              {err}
            </p>
          )}

          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : sheets.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-500">
              No sheets yet. Create one above to get started.
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {sheets.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => openSheet(s)}
                    className="w-full text-left block bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-400 hover:shadow-sm transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-base font-medium text-slate-900">FY {s.year}</p>
                          <div className="mt-0.5">
                            <IdChip id={s.id} label="Sheet" />
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        s.reject_comment && s.status === "Draft"
                          ? "bg-amber-100 text-amber-800"
                          : (STATUS_STYLES[s.status] || "bg-slate-100 text-slate-700")
                      }`}>
                        {s.reject_comment && s.status === "Draft" ? "Returned for rework" : s.status}
                      </span>
                    </div>
                    {s.reject_comment && s.status === "Draft" && (
                      <p className="text-xs text-amber-700 mt-2 italic truncate">
                        "{s.reject_comment}"
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
