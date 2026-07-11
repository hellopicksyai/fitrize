import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import NotificationBell from "@/components/NotificationBell";
import {
  LayoutDashboard, Utensils, Dumbbell, MessageSquare, Camera, ScanLine,
  TrendingUp, Moon, Sun, LogOut, Zap, MessageSquarePlus, Menu, X, ClipboardList, BarChart3, Target, Award, User, ShieldAlert,
} from "lucide-react";

const links = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/app/tracker", label: "Calorie Tracker", icon: Utensils, testid: "nav-tracker" },
  { to: "/app/nutrition", label: "Meal Plan", icon: Utensils, testid: "nav-nutrition" },
  { to: "/app/workout", label: "Workout", icon: Dumbbell, testid: "nav-workout" },
  { to: "/app/log-workout", label: "Log Workout", icon: ClipboardList, testid: "nav-log-workout" },
  { to: "/app/form", label: "Form Correction", icon: Camera, testid: "nav-form" },
  { to: "/app/coach", label: "AI Coach", icon: MessageSquare, testid: "nav-coach" },
  { to: "/app/progress", label: "Progress", icon: TrendingUp, testid: "nav-progress" },
  { to: "/app/habits", label: "Habits", icon: Target, testid: "nav-habits" },
  { to: "/app/achievements", label: "Achievements", icon: Award, testid: "nav-achievements" },
  { to: "/app/profile", label: "Profile", icon: User, testid: "nav-profile" },
  { to: "/app/feedback", label: "Feedback", icon: MessageSquarePlus, testid: "nav-feedback" },
];

// Shared nav list used by both desktop sidebar and mobile drawer.
function NavLinks({ loc, onNavigate, isAdmin }) {
  const items = isAdmin
    ? [...links, { to: "/app/admin", label: "Admin", icon: ShieldAlert, testid: "nav-admin", admin: true }]
    : links;
  return (
    <nav className="px-3 flex-1 min-h-0 overflow-y-auto space-y-1 sidebar-scroll">
      {items.map(({ to, label, icon: Icon, testid, admin }, i) => {
        const active = loc.pathname === to || (to !== "/app" && loc.pathname.startsWith(to));
        return (
          <motion.div key={to} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i, duration: 0.3 }}>
            <Link to={to} data-testid={testid} onClick={onNavigate}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${active ? "text-primary-foreground" : "hover:bg-secondary text-muted-foreground hover:text-foreground"} ${admin ? "text-accent" : ""}`}>
              {active && (
                <motion.div layoutId="nav-active-pill" className="absolute inset-0 bg-primary rounded-xl glow-primary" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              <Icon className="w-4 h-4 relative z-10" strokeWidth={1.75} />
              <span className="relative z-10">{label}</span>
            </Link>
          </motion.div>
        );
      })}
    </nav>
  );
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const loc = useLocation();
  const nav = useNavigate();
  const [drawer, setDrawer] = useState(false);

  const UserFooter = () => (
    <div className="p-3 border-t border-border space-y-2 shrink-0">
      <div className="px-3 py-2 text-xs text-muted-foreground">
        <div className="font-medium text-foreground truncate">{user?.name}</div>
        <div className="truncate">{user?.email}</div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 rounded-full" data-testid="btn-theme-toggle" onClick={toggle}>
          {theme === "dark" ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
        </Button>
        <Button variant="outline" size="sm" className="flex-1 rounded-full" data-testid="btn-logout" onClick={() => { logout(); nav("/"); }}>
          <LogOut className="w-4 h-4"/>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex w-full max-w-full overflow-x-hidden">
      {/* Desktop sidebar */}
      {/* Desktop sidebar — fixed to viewport, never scrolls with content */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card fixed top-0 left-0 h-screen z-30 shrink-0">
        <Link to="/" className="px-6 py-6 flex items-center gap-2 shrink-0" data-testid="sidebar-logo">
          <div className="w-9 h-9 rounded-xl bg-primary grid place-items-center glow-primary">
            <Zap className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="display text-2xl">Fitrize</span>
        </Link>
        <NavLinks loc={loc} isAdmin={user?.is_admin} />
        <UserFooter />
      </aside>

      {/* Mobile drawer + backdrop */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)} data-testid="drawer-backdrop" />
            <motion.aside
              className="lg:hidden fixed left-0 top-0 z-50 h-full w-72 max-w-[85vw] flex flex-col bg-card border-r border-border"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              data-testid="mobile-drawer">
              <div className="px-5 py-5 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2" onClick={() => setDrawer(false)}>
                  <div className="w-8 h-8 rounded-lg bg-primary grid place-items-center glow-primary"><Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2.5}/></div>
                  <span className="display text-xl">Fitrize</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setDrawer(false)} data-testid="drawer-close" aria-label="Close menu">
                  <X className="w-5 h-5"/>
                </Button>
              </div>
              <NavLinks loc={loc} onNavigate={() => setDrawer(false)} isAdmin={user?.is_admin} />
              <UserFooter />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 w-full max-w-full lg:ml-64">
        {/* Desktop top bar with notification bell */}
        <header className="hidden lg:flex sticky top-0 z-20 glass-strong border-b border-border px-8 py-3 items-center justify-end gap-2">
          <NotificationBell />
        </header>

        {/* Mobile top bar with hamburger */}
        <header className="lg:hidden sticky top-0 z-30 glass-strong border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setDrawer(true)} data-testid="btn-hamburger" aria-label="Open menu">
              <Menu className="w-5 h-5"/>
            </Button>
            <Link to="/app" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary grid place-items-center"><Zap className="w-4 h-4 text-primary-foreground"/></div>
              <span className="display text-xl">Fitrize</span>
            </Link>
          </div>
          <div className="flex gap-1 items-center">
            <NotificationBell />
            <Button variant="ghost" size="sm" data-testid="btn-theme-toggle-mobile" onClick={toggle}>
              {theme === "dark" ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
            </Button>
            <Button variant="ghost" size="sm" data-testid="btn-logout-mobile" onClick={() => { logout(); nav("/"); }}>
              <LogOut className="w-4 h-4"/>
            </Button>
          </div>
        </header>

        <main className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <PageTransition key={loc.pathname}>{children}</PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
