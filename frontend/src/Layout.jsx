import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useEffect, useState, useRef } from "react";
import {
  LayoutDashboard, FileText, CheckSquare, Users, Settings,
  LogOut, ShieldCheck, BarChart2, UserCog, ClipboardList, Wifi, WifiOff,
} from "lucide-react";

// In production, /api/* is proxied to Render by Vercel (same-origin = no CORS).
// In local dev, VITE_API_URL points directly to localhost:8000.
const BASE = import.meta.env.VITE_API_URL || "/api";


const NAV = {
  Employee: [
    { to: "/employee",          icon: LayoutDashboard, label: "Dashboard" },
    { to: "/employee/goals",    icon: FileText,         label: "My Goals" },
    { to: "/employee/checkins", icon: CheckSquare,      label: "Check-ins" },
  ],
  Manager: [
    { to: "/manager",           icon: LayoutDashboard, label: "Dashboard" },
    { to: "/manager/team",      icon: Users,            label: "Team Sheets" },
    { to: "/manager/checkins",  icon: ClipboardList,    label: "Team Check-ins" },
  ],
  Admin: [
    { to: "/admin",             icon: LayoutDashboard, label: "Overview" },
    { to: "/admin/users",       icon: UserCog,          label: "User Management" },
    { to: "/admin/analytics",   icon: BarChart2,        label: "Analytics" },
    { to: "/admin/audit",       icon: ShieldCheck,      label: "Audit Trail" },
  ],
};

const ROLE_BADGE = {
  Employee: "badge badge-employee",
  Manager:  "badge badge-manager",
  Admin:    "badge badge-admin",
};

function useServerStatus() {
  const [status, setStatus] = useState("unknown"); // unknown | up | down
  const timer = useRef(null);

  function ping() {
    fetch(`${BASE}/`, { signal: AbortSignal.timeout(35000) })
      .then(() => { setStatus("up"); if (timer.current) clearInterval(timer.current); })
      .catch(() => {
        setStatus("down");
        if (!timer.current) {
          timer.current = setInterval(() => {
            fetch(`${BASE}/`, { signal: AbortSignal.timeout(35000) })
              .then(() => { setStatus("up"); clearInterval(timer.current); timer.current = null; })
              .catch(() => setStatus("down"));
          }, 15000);
        }
      });
  }

  useEffect(() => {
    ping();
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  return status;
}

function Avatar({ name }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
      style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
    >
      {initials}
    </div>
  );
}

export default function Layout({ children, title, actions }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const links = NAV[user?.role] || [];
  const serverStatus = useServerStatus();

  function signOut() {
    logout();
    nav("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              AT
            </div>
            <span className="text-white font-bold text-base tracking-tight">AtomTracker</span>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Avatar name={user?.name} />
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{user?.name || "User"}</p>
              <span className={ROLE_BADGE[user?.role]}>{user?.role}</span>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                "sidebar-item" + (isActive ? " active" : "")
              }
            >
              <Icon size={17} className="icon" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-2 py-4 border-t border-white/10 space-y-1">
          <button onClick={signOut} className="sidebar-item w-full text-left">
            <LogOut size={17} className="icon" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="main-area flex flex-col">
        {/* Server wakeup banner */}
        {serverStatus === "down" && (
          <div className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium"
            style={{ background:"#fef3c7", color:"#92400e", borderBottom:"1px solid #fde68a" }}>
            <WifiOff size={15} className="shrink-0" />
            <span>Server is waking up — requests will auto-retry. This takes ~30 s on first load.</span>
            <div className="ml-auto flex items-center gap-1.5 text-xs opacity-70">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" style={{ animation:"pulse-dot 1.2s ease infinite" }} />
              Connecting…
            </div>
          </div>
        )}
        {serverStatus === "up" && (
          <div className="flex items-center gap-2 px-6 py-2 text-xs font-medium animate-fade-in"
            style={{ background:"#f0fdf4", color:"#166534", borderBottom:"1px solid #bbf7d0" }}>
            <Wifi size={13} className="shrink-0" />
            Server is online ✓
          </div>
        )}
        {/* Page header */}
        {title && (
          <header className="page-header">
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </header>
        )}
        <main className="page-content flex-1">{children}</main>
      </div>
    </div>
  );
}
