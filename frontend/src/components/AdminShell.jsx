import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LayoutDashboard, Users, LogOut, Shield, Loader2, ArrowLeft, MessageSquare, MessageCircle } from "lucide-react";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true, testid: "admin-nav-overview" },
  { to: "/admin/users", label: "Users", icon: Users, testid: "admin-nav-users" },
  { to: "/admin/feedback", label: "Feedback", icon: MessageSquare, testid: "admin-nav-feedback" },
  { to: "/admin/coach", label: "Coach Chats", icon: MessageCircle, testid: "admin-nav-coach" },
];

// A completely separate layout for the admin area — its own dark sidebar,
// its own header, not the user AppShell. Only reachable by admins.
export default function AdminShell({ children }) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const { user, logout } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    api.get("/admin/check")
      .then((r) => {
        if (r.data?.is_admin) setAllowed(true);
        else nav("/app");           // not an admin → bounce to the user app
      })
      .catch(() => nav("/login"))
      .finally(() => setChecking(false));
  }, [nav]);

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0a0a0f] text-white">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (!allowed) return null;

  return (
    <div className="min-h-screen flex bg-[#0a0a0f] text-white">
      {/* Admin sidebar — intentionally different look from the user app */}
      <aside className="w-64 shrink-0 border-r border-white/10 bg-[#0d0d14] flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 grid place-items-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold leading-tight">Fitrize</div>
              <div className="text-[10px] uppercase tracking-widest text-red-400">Admin Console</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={n.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                  isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <n.icon className="w-4 h-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-1">
          <button
            onClick={() => nav("/app")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition"
            data-testid="admin-back-to-app"
          >
            <ArrowLeft className="w-4 h-4" /> Back to app
          </button>
          <button
            onClick={() => { logout(); nav("/login"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-red-400 hover:bg-white/5 transition"
            data-testid="admin-logout"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-white/10 flex items-center justify-between px-6">
          <div className="text-sm text-white/50">Administrator</div>
          <div className="text-sm text-white/80">{user?.name || user?.email}</div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
