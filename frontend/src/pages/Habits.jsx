import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProgressRing from "@/components/ProgressRing";
import CountUp from "@/components/CountUp";
import Celebrate from "@/components/Celebrate";
import { DashboardSkeleton } from "@/components/Skeletons";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { stagger, rise } from "@/components/PageTransition";
import { Dumbbell, Droplet, Trophy, Moon, Footprints, Check, Sparkles } from "lucide-react";

const ICONS = { workout: Dumbbell, water: Droplet, protein: Trophy, sleep: Moon, steps: Footprints };
const COLORS = { workout: "#39FF14", water: "#007AFF", protein: "#A855F7", sleep: "#6366F1", steps: "#FF9F0A" };

export default function Habits() {
  const [snap, setSnap] = useState(null);
  const [week, setWeek] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sleep, setSleep] = useState("");
  const [steps, setSteps] = useState("");
  const [celebrate, setCelebrate] = useState(false);

  const load = () => {
    Promise.all([api.get("/habits"), api.get("/habits/week")])
      .then(([h, w]) => {
        setSnap(h.data); setWeek(w.data);
        const sl = h.data.items.find(i => i.key === "sleep");
        const st = h.data.items.find(i => i.key === "steps");
        setSleep(sl?.value ? String(sl.value) : "");
        setSteps(st?.value ? String(st.value) : "");
        if (h.data.overall >= 100 && !sessionStorage.getItem("habits_celebrated_today")) {
          setCelebrate(true); sessionStorage.setItem("habits_celebrated_today", "1");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const { data } = await api.post("/habits", {
        sleep_hours: sleep === "" ? null : Number(sleep),
        steps: steps === "" ? null : Number(steps),
      });
      setSnap(data);
      toast.success("Habits updated");
      api.get("/habits/week").then(w => setWeek(w.data)).catch(() => {});
      if (data.overall >= 100) { setCelebrate(true); setTimeout(() => setCelebrate(false), 100); }
    } catch {
      toast.error("Couldn't save. Try again.");
    }
  };

  if (loading) return <DashboardSkeleton />;

  const items = snap?.items || [];
  const overall = snap?.overall || 0;
  const maxWeek = Math.max(100, ...week.map(w => w.overall));

  return (
    <div data-testid="habits-page" className="space-y-6 relative">
      <Celebrate trigger={celebrate} />
      <div>
        <div className="text-xs text-accent uppercase tracking-widest">Consistency</div>
        <h1 className="display text-4xl sm:text-5xl">Habit Tracker</h1>
        <p className="text-sm text-muted-foreground mt-1">Five daily habits. Close every ring.</p>
      </div>

      {/* Overall + rings */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="p-6 rounded-3xl glass grad-border flex flex-col items-center justify-center" data-testid="habit-overall">
          <ProgressRing testid="ring-overall" value={overall} max={100} size={170} stroke={14}
            color="#39FF14" label={`${overall}%`} sublabel="today" />
          <div className="text-sm text-muted-foreground mt-3 text-center">
            {overall >= 100 ? "Perfect day! Every ring closed 🎉" : `${items.filter(i => i.pct >= 100).length}/${items.length} habits complete`}
          </div>
        </Card>

        <motion.div variants={stagger} initial="hidden" animate="show" className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map((it) => {
            const Icon = ICONS[it.key] || Check;
            return (
              <motion.div key={it.key} variants={rise}>
                <Card className="p-4 rounded-2xl glass glow-hover flex flex-col items-center text-center h-full" data-testid={`habit-${it.key}`}>
                  <ProgressRing testid={`ring-${it.key}`} value={it.pct} max={100} size={92} stroke={8}
                    color={COLORS[it.key]} label={`${it.pct}%`} />
                  <div className="flex items-center gap-1.5 mt-2">
                    <Icon className="w-3.5 h-3.5" style={{ color: COLORS[it.key] }} />
                    <span className="text-sm font-medium">{it.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {it.key === "workout"
                      ? (it.value ? "Done" : "Not yet")
                      : <><CountUp value={it.value} /> / {it.goal} {it.unit}</>}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Manual entry for sleep + steps */}
      <Card className="p-5 rounded-2xl glass" data-testid="habit-entry">
        <div className="text-sm font-medium mb-3">Log sleep & steps</div>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">Sleep (hours)</div>
            <Input type="number" inputMode="decimal" value={sleep} onChange={e => setSleep(e.target.value)} placeholder="8" className="rounded-xl w-32" data-testid="habit-sleep" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">Steps</div>
            <Input type="number" inputMode="numeric" value={steps} onChange={e => setSteps(e.target.value)} placeholder="10000" className="rounded-xl w-36" data-testid="habit-steps" />
          </div>
          <Button onClick={save} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold" data-testid="habit-save">
            <Sparkles className="w-4 h-4 mr-1" /> Save
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mt-3">Workout, water and protein update automatically from what you log elsewhere.</div>
      </Card>

      {/* 7-day trend */}
      <Card className="p-5 rounded-2xl glass" data-testid="habit-week">
        <div className="text-sm font-medium mb-4">Last 7 days</div>
        <div className="flex items-end justify-between gap-2 h-32">
          {week.map((d) => {
            const h = Math.max(4, (d.overall / maxWeek) * 100);
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-secondary rounded-lg overflow-hidden flex items-end" style={{ height: "100%" }}>
                  <motion.div className="w-full bg-gradient-to-t from-accent to-primary rounded-lg"
                    initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} />
                </div>
                <div className="text-[10px] text-muted-foreground">{new Date(d.date).toLocaleDateString(undefined, { weekday: "short" })}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
