import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Users, UserPlus, Activity, Crown, Ban, Dumbbell, Utensils, Loader2 } from "lucide-react";

const Stat = ({ icon: Icon, label, value, tint }) => (
  <div className="rounded-2xl border border-white/10 bg-[#12121a] p-5" data-testid={`stat-${label.toLowerCase().replace(/\s+/g,'-')}`}>
    <div className="flex items-center justify-between">
      <div className="text-xs text-white/50 uppercase tracking-widest">{label}</div>
      <Icon className={`w-4 h-4 ${tint || "text-white/40"}`} />
    </div>
    <div className="text-3xl font-bold mt-2">{value}</div>
  </div>
);

export default function AdminHome() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/overview")
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid place-items-center h-64"><Loader2 className="w-6 h-6 animate-spin text-white/50" /></div>;

  const s = data?.stats || {};
  const recent = data?.recent_users || [];

  return (
    <div className="space-y-6" data-testid="admin-home">
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-sm text-white/50 mt-1">Platform activity at a glance.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} label="Total Users" value={s.total_users ?? 0} tint="text-blue-400" />
        <Stat icon={Activity} label="Active Today" value={s.active_today ?? 0} tint="text-green-400" />
        <Stat icon={UserPlus} label="New (7d)" value={s.new_users_7d ?? 0} tint="text-purple-400" />
        <Stat icon={Crown} label="Premium" value={s.premium_users ?? 0} tint="text-yellow-400" />
        <Stat icon={Dumbbell} label="Workouts Logged" value={s.total_workouts ?? 0} tint="text-orange-400" />
        <Stat icon={Utensils} label="Meals Logged" value={s.total_meals ?? 0} tint="text-pink-400" />
        <Stat icon={Ban} label="Suspended" value={s.suspended ?? 0} tint="text-red-400" />
        <Stat icon={Users} label="Admins" value={s.admin_count ?? 0} tint="text-white/60" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#12121a] p-5">
        <div className="text-sm font-semibold mb-3">Recent signups</div>
        {!recent.length && <div className="text-sm text-white/40">No users yet.</div>}
        <div className="divide-y divide-white/5">
          {recent.map((u) => (
            <div key={u.id} className="py-2.5 flex items-center justify-between text-sm" data-testid={`recent-${u.id}`}>
              <div>
                <div className="font-medium">{u.name || "—"}</div>
                <div className="text-white/40 text-xs">{u.email}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-white/60">{u.tier || "free"}</div>
                <div className="text-white/30 text-xs">{String(u.created_at).slice(0, 10)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
