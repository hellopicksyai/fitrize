import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import ProgressRing from "@/components/ProgressRing";
import CountUp from "@/components/CountUp";
import Celebrate from "@/components/Celebrate";
import { DashboardSkeleton } from "@/components/Skeletons";
import { motion } from "framer-motion";
import { stagger, rise } from "@/components/PageTransition";
import { Flame, Trophy, Droplet, Plus, Brain, Dumbbell, Camera, Check, Target, Footprints, ScanLine, Loader2 } from "lucide-react";

const Stat = ({ label, value, sub, testid, accent, decimals = 0, suffix = "" }) => (
  <motion.div variants={rise}>
    <Card className="p-5 rounded-2xl glow-hover glass" data-testid={testid}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`display text-4xl mt-1 ${accent ? "text-accent" : ""}`}>
        {typeof value === "number"
          ? <CountUp value={value} decimals={decimals} suffix={suffix} />
          : value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  </motion.div>
);

// New user-facing feature: daily goals checklist — a reason to come back each day.
const DailyGoals = ({ t, target, proteinGoal, water }) => {
  const goals = [
    { label: "Log a meal", done: t.calories > 0, icon: Plus },
    { label: `Hit ${proteinGoal}g protein`, done: t.protein >= proteinGoal, icon: Trophy },
    { label: "Drink 8 glasses water", done: water >= 8, icon: Droplet },
    { label: "Reach calorie goal", done: t.calories >= target * 0.9, icon: Target },
  ];
  const done = goals.filter(g => g.done).length;
  return (
    <Card className="p-5 rounded-2xl glass" data-testid="daily-goals">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-muted-foreground uppercase tracking-widest">Today's Focus</div>
        <div className="text-xs"><span className="text-accent display text-lg">{done}</span>/{goals.length}</div>
      </div>
      <div className="space-y-2">
        {goals.map((g, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className={`w-6 h-6 rounded-full grid place-items-center transition ${g.done ? "bg-accent text-accent-foreground glow-accent" : "bg-secondary text-muted-foreground"}`}>
              {g.done ? <Check className="w-3.5 h-3.5" /> : <g.icon className="w-3.5 h-3.5" />}
            </div>
            <span className={g.done ? "line-through text-muted-foreground" : ""}>{g.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [celebrate, setCelebrate] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [stepInput, setStepInput] = useState("");
  const [savingSteps, setSavingSteps] = useState(false);

  useEffect(() => {
    api.get("/stats/dashboard")
      .then(r => {
        setData(r.data);
        const t = r.data?.today?.totals || {};
        const target = r.data?.profile?.target_cal || 2200;
        if (t.calories >= target * 0.9 && !sessionStorage.getItem("bitfits_celebrated_today")) {
          setCelebrate(true);
          sessionStorage.setItem("bitfits_celebrated_today", "1");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // analytics summary (item 9: show analytics on the dashboard)
    api.get("/analytics?days=30").then(r => setAnalytics(r.data?.summary)).catch(() => {});
  }, []);

  if (loading) return <DashboardSkeleton />;

  const p = data?.profile || {};
  const t = data?.today?.totals || { calories: 0, protein: 0, carbs: 0, fats: 0 };
  const u = data?.user || {};
  const water = data?.today?.water_glasses || 0;
  const steps = data?.steps || 0;

  const saveSteps = async () => {
    if (stepInput === "") return;
    setSavingSteps(true);
    try {
      await api.post("/habits", { steps: parseInt(stepInput) });
      const r = await api.get("/stats/dashboard");
      setData(r.data);
      setStepInput("");
      toast.success("Steps updated");
    } catch {
      toast.error("Couldn't save steps");
    } finally { setSavingSteps(false); }
  };
  const target = p.target_cal || 2200;
  const proteinGoal = p.protein_goal_g || 150;
  const pctGoal = Math.round((t.calories / target) * 100) || 0;

  return (
    <div data-testid="dashboard-page" className="relative space-y-6 overflow-hidden">
      <Celebrate trigger={celebrate} />
      <div className="aurora" aria-hidden />

      <div className="relative flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs text-accent uppercase tracking-widest">Welcome back</div>
          <h1 className="display text-4xl sm:text-5xl">Hello, {u.name || "Athlete"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Goal · {p.goal || "—"} · Target {target} kcal · Protein {proteinGoal}g</p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/nutrition"><Button data-testid="dash-log-meal" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold glow-accent"><Plus className="w-4 h-4 mr-1"/>Log meal</Button></Link>
          <Link to="/app/progress"><Button variant="outline" className="rounded-full" data-testid="dash-body-scan"><ScanLine className="w-4 h-4 mr-1"/>Body Scan</Button></Link>
          <Link to="/app/coach"><Button variant="outline" className="rounded-full" data-testid="dash-ask-coach"><Brain className="w-4 h-4 mr-1"/>Ask coach</Button></Link>
        </div>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="relative grid lg:grid-cols-3 gap-5">
        <motion.div variants={rise} className="lg:col-span-2">
          <Card className="grad-border p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 h-full" data-testid="dash-main-ring">
            <div className="text-center sm:text-left">
              <div className="text-xs text-muted-foreground">Today · Calorie Goal</div>
              <div className="display text-6xl mt-1">
                <CountUp value={Math.round(t.calories)} /> <span className="text-muted-foreground text-3xl">/ {target}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{Math.max(0, target - Math.round(t.calories))} kcal remaining</div>
              <div className="mt-5 grid grid-cols-3 gap-3 max-w-sm">
                <div className="rounded-xl bg-secondary p-3 text-center"><div className="text-[10px] text-muted-foreground">Protein</div><div className="display text-xl text-primary"><CountUp value={Math.round(t.protein)} suffix="g" /></div></div>
                <div className="rounded-xl bg-secondary p-3 text-center"><div className="text-[10px] text-muted-foreground">Carbs</div><div className="display text-xl"><CountUp value={Math.round(t.carbs)} suffix="g" /></div></div>
                <div className="rounded-xl bg-secondary p-3 text-center"><div className="text-[10px] text-muted-foreground">Fats</div><div className="display text-xl"><CountUp value={Math.round(t.fats)} suffix="g" /></div></div>
              </div>
            </div>
            <ProgressRing testid="ring-calories" value={t.calories} max={target} size={180} stroke={14}
              color="#39FF14" label={`${pctGoal}%`} sublabel="of daily goal"/>
          </Card>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-1 gap-5">
          <Stat label="Streak" value={u.streak || 0} suffix="d" sub="Keep it alive" testid="stat-streak" accent/>
          <Stat label="XP" value={u.xp || 0} sub={`Level ${u.level || 1}`} testid="stat-xp"/>
          <Stat label="BMI" value={p.bmi ? Number(p.bmi) : "—"} decimals={1} sub="Healthy 18.5–24.9" testid="stat-bmi"/>
          <Stat label="TDEE" value={p.tdee ? Number(p.tdee) : "—"} sub="kcal/day maintenance" testid="stat-tdee"/>
        </div>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid lg:grid-cols-4 gap-5">
        <motion.div variants={rise}><DailyGoals t={t} target={target} proteinGoal={proteinGoal} water={water} /></motion.div>
        <motion.div variants={rise}>
          <Card className="p-5 rounded-2xl glass glow-hover h-full" data-testid="card-protein">
            <div className="flex items-center justify-between"><div className="text-xs text-muted-foreground">Protein</div><Trophy className="w-4 h-4 text-accent"/></div>
            <div className="display text-4xl mt-2"><CountUp value={Math.round(t.protein)} /><span className="text-muted-foreground text-2xl">/{proteinGoal}g</span></div>
            <div className="h-1.5 mt-3 bg-secondary rounded-full overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-accent to-primary" initial={{width:0}} animate={{ width: `${Math.min(100, (t.protein/proteinGoal)*100)}%` }} transition={{duration:0.9, ease:[0.2,0.8,0.2,1]}}/></div>
          </Card>
        </motion.div>
        <motion.div variants={rise}>
          <Card className="p-5 rounded-2xl glass glow-hover h-full" data-testid="card-water">
            <div className="flex items-center justify-between"><div className="text-xs text-muted-foreground">Water</div><Droplet className="w-4 h-4 text-primary"/></div>
            <div className="display text-4xl mt-2"><CountUp value={+((water||0)*0.25).toFixed(2)} /><span className="text-muted-foreground text-2xl">/3 L</span></div>
            <div className="text-xs text-muted-foreground mt-1">litres · update in nutrition</div>
          </Card>
        </motion.div>
        <motion.div variants={rise}>
          <Card className="p-5 rounded-2xl glass glow-hover h-full" data-testid="card-steps">
            <div className="flex items-center justify-between"><div className="text-xs text-muted-foreground">Steps today</div><Footprints className="w-4 h-4 text-accent"/></div>
            <div className="display text-4xl mt-2"><CountUp value={steps} /><span className="text-muted-foreground text-2xl">/10k</span></div>
            <div className="flex gap-2 mt-2">
              <input type="number" value={stepInput} onChange={e=>setStepInput(e.target.value)} placeholder="Enter steps"
                className="flex-1 min-w-0 text-sm rounded-lg bg-secondary px-2 py-1 outline-none" data-testid="steps-input"/>
              <Button size="sm" className="rounded-lg" onClick={saveSteps} disabled={savingSteps} data-testid="steps-save">
                {savingSteps ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : "Save"}
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* 30-day analytics summary (merged from Analytics — item 9) */}
      {analytics && (
        <motion.div variants={stagger} initial="hidden" animate="show">
          <Card className="p-5 rounded-2xl glass" data-testid="dash-analytics">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-muted-foreground uppercase tracking-widest">Last 30 days</div>
              <Link to="/app/progress" className="text-xs text-accent hover:underline">View analytics →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center"><div className="display text-3xl text-accent"><CountUp value={analytics.consistency_pct || 0} suffix="%" /></div><div className="text-xs text-muted-foreground mt-0.5">Consistency</div></div>
              <div className="text-center"><div className="display text-3xl"><CountUp value={analytics.total_sessions || 0} /></div><div className="text-xs text-muted-foreground mt-0.5">Workouts</div></div>
              <div className="text-center"><div className="display text-3xl"><CountUp value={analytics.avg_calories || 0} /></div><div className="text-xs text-muted-foreground mt-0.5">Avg calories</div></div>
              <div className="text-center"><div className="display text-3xl text-primary"><CountUp value={analytics.avg_protein || 0} suffix="g" /></div><div className="text-xs text-muted-foreground mt-0.5">Avg protein</div></div>
            </div>
          </Card>
        </motion.div>
      )}

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid md:grid-cols-3 gap-5">
        {[
          { to: "/app/workout", icon: Dumbbell, title: "Generate workout", desc: "Sets, reps, rest, progression.", tid: "link-workout", c: "text-primary" },
          { to: "/app/nutrition", icon: Brain, title: "AI meal plan", desc: "Breakfast → snacks, tailored.", tid: "link-nutrition", c: "text-accent" },
          { to: "/app/form", icon: Camera, title: "Form correction", desc: "Skeleton tracking, live cues.", tid: "link-form", c: "text-primary" },
        ].map((x) => (
          <motion.div key={x.to} variants={rise}>
            <Link to={x.to}><Card className="p-5 rounded-2xl glass glow-hover" data-testid={x.tid}><x.icon className={`w-5 h-5 ${x.c} mb-3`}/><div className="display text-xl">{x.title}</div><div className="text-xs text-muted-foreground mt-1">{x.desc}</div></Card></Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
