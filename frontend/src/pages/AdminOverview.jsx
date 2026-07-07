import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Navigate } from "react-router-dom";
import CountUp from "@/components/CountUp";
import { DashboardSkeleton } from "@/components/Skeletons";
import { motion } from "framer-motion";
import { stagger, rise } from "@/components/PageTransition";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Users, User, UserCheck, UserPlus, Crown, Dumbbell, Utensils, Flame, IndianRupee, ShieldAlert, ShieldCheck } from "lucide-react";

const StatCard = ({ icon: Icon, label, value, prefix = "", accent }) => (
  <motion.div variants={rise}>
    <Card className="p-5 rounded-2xl glass glow-hover" >
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <Icon className={`w-4 h-4 ${accent ? "text-accent" : "text-primary"}`} />
      </div>
      <div className={`display text-3xl mt-1 ${accent ? "text-accent" : ""}`}>
        <CountUp value={value} prefix={prefix} />
      </div>
    </Card>
  </motion.div>
);

export default function AdminOverview() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    api.get("/admin/overview")
      .then((r) => setData(r.data))
      .catch((e) => { if (e?.response?.status === 403) setDenied(true); })
      .finally(() => setLoading(false));
  }, []);

  // Not an admin → bounce to the normal dashboard
  if (denied || (user && user.is_admin === false)) return <Navigate to="/app" replace />;
  if (loading) return <DashboardSkeleton />;

  const s = data?.stats || {};
  const growth = (data?.growth || []).map((g) => ({ ...g, d: new Date(g.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) }));
  const recent = data?.recent_users || [];

  return (
    <div data-testid="admin-overview" className="space-y-6">
      <div>
        <div className="text-xs text-accent uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Admin</div>
        <h1 className="display text-4xl sm:text-5xl">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Everything at a glance.</p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total users" value={s.total_users || 0} accent />
        <StatCard icon={User} label="Regular users" value={s.regular_users || 0} />
        <StatCard icon={ShieldCheck} label="Admins" value={s.admin_count || 0} accent />
        <StatCard icon={UserCheck} label="Active today" value={s.active_today || 0} />
        <StatCard icon={UserPlus} label="New (7d)" value={s.new_users_7d || 0} />
        <StatCard icon={Crown} label="Premium" value={s.premium_users || 0} accent />
        <StatCard icon={Dumbbell} label="Workouts logged" value={s.total_workouts || 0} />
        <StatCard icon={Utensils} label="Meals logged" value={s.total_meals || 0} />
        <StatCard icon={Flame} label="Calories logged" value={s.total_calories || 0} />
        <StatCard icon={IndianRupee} label="Revenue" value={s.revenue || 0} prefix="₹" accent />
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5 rounded-2xl glass" data-testid="admin-growth">
          <div className="text-sm font-medium mb-4">New users (7 days)</div>
          {growth.length ? (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <AreaChart data={growth}>
                  <defs>
                    <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#39FF14" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#39FF14" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={28} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" name="New users" stroke="#39FF14" strokeWidth={2.5} fill="url(#ug)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="text-sm text-muted-foreground py-10 text-center">No signups in this window.</div>}
        </Card>

        <Card className="p-5 rounded-2xl glass" data-testid="admin-recent">
          <div className="text-sm font-medium mb-4">Recent signups</div>
          <div className="space-y-2">
            {recent.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{u.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
                <div className="text-xs px-2 py-1 rounded-full bg-secondary capitalize shrink-0">{u.tier}</div>
              </div>
            ))}
            {!recent.length && <div className="text-sm text-muted-foreground py-6 text-center">No users yet.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
