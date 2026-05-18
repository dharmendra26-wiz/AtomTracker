import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import {
  LayoutDashboard, FileText, CheckSquare, Users, Settings,
  LogOut, ShieldCheck, BarChart2, UserCog, ClipboardList,
} from "lucide-react";

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
