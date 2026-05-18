import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Loader2, Zap } from "lucide-react";

const ROLE_HOME = { Employee: "/employee", Manager: "/manager", Admin: "/admin" };

const DEMOS = [
  { label: "Employee",  email: "employee@test.com", password: "employee",
    color: "#6366f1", desc: "Create & track goals" },
  { label: "Manager",   email: "manager@test.com",  password: "manager",
    color: "#f59e0b", desc: "Approve & review team" },
  { label: "Admin / HR", email: "admin@test.com",   password: "admin",
    color: "#10b981", desc: "Full system control" },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState("");

  if (user) return <Navigate to={ROLE_HOME[user.role] || "/employee"} replace />;

  async function doLogin(e, pw) {
    setErr(""); setBusy(true);
    try {
      const res = await login(e, pw);
      nav(ROLE_HOME[res.role] || "/employee", { replace: true });
    } catch (ex) {
      setErr(ex.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex" style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)"
    }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 px-16 py-12 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>AT</div>
          <span className="text-white font-bold text-xl">AtomTracker</span>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 bg-white/10 text-indigo-200
                         text-xs font-semibold px-3 py-1.5 rounded-full mb-6 backdrop-blur-sm">
            <Zap size={13} /> Atomquest Hackathon 1.0
          </div>
          <h2 className="text-5xl font-extrabold text-white leading-tight mb-4">
            Goal Setting &<br />
            <span style={{
              background: "linear-gradient(90deg,#a5b4fc,#c4b5fd)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>Tracking Portal</span>
          </h2>
          <p className="text-indigo-200 text-lg leading-relaxed max-w-md">
            A structured, digital platform that eliminates manual spreadsheets.
            Set quarterly goals, track achievement, and maintain full audit transparency.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 stagger">
            {[
              { n: "3", label: "Roles" },
              { n: "4", label: "Quarters" },
              { n: "100%", label: "Weight Enforced" },
            ].map(({ n, label }) => (
              <div key={label} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm animate-fade-up">
                <p className="text-3xl font-extrabold text-white">{n}</p>
                <p className="text-indigo-300 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-indigo-400 text-sm">© 2026 AtomTracker · Atomberg Technologies</p>
      </div>

      {/* Right panel — login */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 animate-fade-up">
            {/* Mobile logo */}
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>AT</div>
              <span className="font-bold text-slate-900">AtomTracker</span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
            <p className="text-slate-500 text-sm mb-6">Sign in to continue to your dashboard</p>

            {err && (
              <div className="alert alert-err mb-4 animate-fade-in">
                <span>{err}</span>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); doLogin(email, password); }} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                <input
                  className="input"
                  type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                <input
                  className="input"
                  type="password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" disabled={busy} className="btn btn-primary w-full justify-center py-2.5 text-sm">
                {busy ? <><Loader2 size={16} className="animate-spin-slow" /> Signing in…</> : "Sign in"}
              </button>
            </form>

            {/* Demo logins */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 text-center">
                Quick Demo Login
              </p>
              <div className="space-y-2">
                {DEMOS.map((d) => (
                  <button
                    key={d.label}
                    disabled={busy}
                    onClick={() => doLogin(d.email, d.password)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl
                               border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50
                               transition-all text-left group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700">
                        {d.label}
                      </p>
                      <p className="text-xs text-slate-400">{d.desc}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 text-center mt-3">
                Hit <code className="bg-slate-100 px-1 rounded">GET /setup-demo</code> on the API to seed demo users.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
