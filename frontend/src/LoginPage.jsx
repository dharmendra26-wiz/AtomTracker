import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const ROLE_HOME = {
  Employee: "/employee",
  Manager: "/manager",
  Admin: "/admin",
};

const DEMO_USERS = [
  { label: "Employee", email: "employee@test.com", password: "employee", color: "indigo" },
  { label: "Manager",  email: "manager@test.com",  password: "manager",  color: "amber" },
  { label: "Admin",    email: "admin@test.com",    password: "admin",    color: "emerald" },
];

const COLOR_CLASSES = {
  indigo:  "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200",
  amber:   "bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
};

export default function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (user) return <Navigate to={ROLE_HOME[user.role] || "/employee"} replace />;

  async function doLogin(emailVal, passwordVal) {
    setErr("");
    setBusy(true);
    try {
      const res = await login(emailVal, passwordVal);
      nav(ROLE_HOME[res.role] || "/employee", { replace: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    doLogin(email, password);
  }

  function demoLogin(u) {
    setEmail(u.email);
    setPassword(u.password);
    doLogin(u.email, u.password);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-semibold text-slate-900">AtomTracker</h1>
        <p className="text-slate-500 mt-1 mb-6">Sign in to your account</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {err && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-3 text-center">
            Demo accounts
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                onClick={() => demoLogin(u)}
                disabled={busy}
                className={`text-sm font-medium px-3 py-2 rounded-lg border transition disabled:opacity-50 ${COLOR_CLASSES[u.color]}`}
              >
                {u.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            First time? Hit <code className="font-mono">GET /setup-demo</code> on the API to seed these.
          </p>
        </div>
      </div>
    </div>
  );
}
