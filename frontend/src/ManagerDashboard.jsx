import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, LogOut, User as UserIcon } from "lucide-react";
import { api } from "./api";
import { useAuth } from "./AuthContext";
import IdChip from "./IdChip";

export default function ManagerDashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api("/team-sheets");
        if (alive) setSheets(data);
      } catch (e) {
        if (alive) setErr(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  function signOut() {
    logout();
    nav("/login", { replace: true });
  }

  function openSheet(s) {
    const path = s.status === "Locked" ? "checkin" : "sheet";
    nav(`/manager/${path}/${s.id}`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Manager Console</h1>
            <p className="text-sm text-slate-500">Signed in as {user?.name || "Manager"}</p>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Your team's goal sheets</h2>
          <span className="text-sm text-slate-500">{sheets.length} active</span>
        </div>

        {err && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            {err}
          </p>
        )}

        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : sheets.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center text-slate-500">
            <ClipboardCheck className="mx-auto text-slate-400 mb-2" size={32} />
            <p className="text-sm">No sheets from your team yet.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {sheets.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => openSheet(s)}
                  className="w-full text-left block bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-400 hover:shadow-sm transition"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <UserIcon size={20} />
                      </div>
                      <div>
                        <p className="text-base font-medium text-slate-900">{s.user_name}</p>
                        <p className="text-xs text-slate-500">{s.user_email}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      s.status === "Locked" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>FY {s.year}</span>
                    <span>{s.goal_count} goal{s.goal_count !== 1 && "s"} &middot; {s.total_weight}% total</span>
                  </div>
                  <div className="mt-2">
                    <IdChip id={s.id} label="Sheet" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
