import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CountUp from "@/components/CountUp";
import { DashboardSkeleton, EmptyState } from "@/components/Skeletons";
import { motion } from "framer-motion";
import { stagger, rise } from "@/components/PageTransition";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { TrendingUp, Dumbbell, Flame, Trophy, Activity, BarChart3 } from "lucide-react";

const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

// Recharts tooltip styled to the theme
const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-card border border-border px-3 py-2 text-xs shadow-lg">
      <div className="text-muted-foreground mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="font-medium">{p.name}: {p.value}</span>
        </div>
      ))}
    </div>
  );
};

const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch { return d; } };
const ACCENT = "#39FF14";
const PRIMARY = "#007AFF";

const SummaryCard = ({ icon: Icon, label, value, suffix = "", accent }) => (
  <motion.div variants={rise}>
    <Card className="p-4 rounded-2xl glass glow-hover" >
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <Icon className={`w-4 h-4 ${accent ? "text-accent" : "text-primary"}`} />
      </div>
      <div className={`display text-3xl mt-1 ${accent ? "text-accent" : ""}`}>
        <CountUp value={value} suffix={suffix} />
      </div>
    </Card>
  </motion.div>
);

const ChartCard = ({ title, icon: Icon, children, hasData, emptyHint }) => (
  <Card className="p-5 rounded-2xl glass" >
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-primary" />
      <div className="text-sm font-medium">{title}</div>
    </div>
    {hasData ? (
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    ) : (
      <div className="text-sm text-muted-foreground text-center py-12">{emptyHint}</div>
    )}
  </Card>
);

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/analytics?days=${days}`)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <DashboardSkeleton />;

  const s = data?.summary || {};
  const nutrition = (data?.nutrition || []).map((n) => ({ ...n, d: fmtDate(n.date) }));
  const workouts = (data?.workouts || []).map((w) => ({ ...w, d: fmtDate(w.date) }));
  const weight = (data?.weight || []).map((w) => ({ ...w, d: fmtDate(w.date) }));

  const nothing = !nutrition.length && !workouts.length && !weight.length;

  return (
    <div data-testid="analytics-page" className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs text-accent uppercase tracking-widest">Insights</div>
          <h1 className="display text-4xl sm:text-5xl">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Your trends across training and nutrition.</p>
        </div>
        <div className="flex gap-1 bg-secondary rounded-full p-1" data-testid="range-toggle">
          {RANGES.map((r) => (
            <button key={r.days} onClick={() => setDays(r.days)} data-testid={`range-${r.days}`}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${days === r.days ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {nothing ? (
        <EmptyState icon={BarChart3} title="No data to chart yet"
          hint="Log some workouts, meals, and weigh-ins — your charts will appear here as your history builds up." />
      ) : (
        <>
          {/* Summary cards */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard icon={Activity} label="Consistency" value={s.consistency_pct || 0} suffix="%" accent />
            <SummaryCard icon={Dumbbell} label="Total volume" value={s.total_volume || 0} suffix="kg" />
            <SummaryCard icon={Flame} label="Avg calories" value={s.avg_calories || 0} />
            <SummaryCard icon={Trophy} label="Avg protein" value={s.avg_protein || 0} suffix="g" accent />
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Weight trend */}
            <ChartCard title="Weight trend" icon={TrendingUp} hasData={weight.length > 1}
              emptyHint="Log at least two weigh-ins in Progress to see your trend.">
              <LineChart data={weight}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={32} />
                <Tooltip content={<TT />} />
                <Line type="monotone" dataKey="weight_kg" name="Weight (kg)" stroke={PRIMARY} strokeWidth={2.5} dot={{ r: 3 }} animationDuration={900} />
              </LineChart>
            </ChartCard>

            {/* Workout volume */}
            <ChartCard title="Workout volume" icon={Dumbbell} hasData={workouts.length > 0}
              emptyHint="Log workouts to see volume lifted over time.">
              <BarChart data={workouts}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={40} />
                <Tooltip content={<TT />} />
                <Bar dataKey="volume" name="Volume (kg)" fill={ACCENT} radius={[6, 6, 0, 0]} animationDuration={900} />
              </BarChart>
            </ChartCard>

            {/* Calories */}
            <ChartCard title="Calories intake" icon={Flame} hasData={nutrition.length > 0}
              emptyHint="Log meals to see your calorie trend.">
              <AreaChart data={nutrition}>
                <defs>
                  <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={40} />
                <Tooltip content={<TT />} />
                <Area type="monotone" dataKey="calories" name="Calories" stroke={ACCENT} strokeWidth={2.5} fill="url(#calGrad)" animationDuration={900} />
              </AreaChart>
            </ChartCard>

            {/* Protein */}
            <ChartCard title="Protein intake" icon={Trophy} hasData={nutrition.length > 0}
              emptyHint="Log meals to see your protein trend.">
              <AreaChart data={nutrition}>
                <defs>
                  <linearGradient id="protGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={32} />
                <Tooltip content={<TT />} />
                <Area type="monotone" dataKey="protein" name="Protein (g)" stroke={PRIMARY} strokeWidth={2.5} fill="url(#protGrad)" animationDuration={900} />
              </AreaChart>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
