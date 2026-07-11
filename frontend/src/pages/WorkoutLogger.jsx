import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Celebrate from "@/components/Celebrate";
import { EmptyState, ListSkeleton } from "@/components/Skeletons";
import { Plus, Trash2, Dumbbell, Timer, Trophy, Check, X, Play, Pause, RotateCcw, Save, TrendingUp } from "lucide-react";

const REST_PRESETS = [60, 90, 120, 180];

export default function WorkoutLogger() {
  const [name, setName] = useState("");
  const [rows, setRows] = useState([{ exercise: "", weight_kg: "", reps: "" }]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [celebrate, setCelebrate] = useState(false);
  const [overload, setOverload] = useState({}); // exercise(lowercased) -> suggestion data

  // rest timer
  const [rest, setRest] = useState(0);
  const [running, setRunning] = useState(false);
  const tick = useRef();
  // workout duration
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (running && rest > 0) {
      tick.current = setInterval(() => setRest((r) => { if (r <= 1) { setRunning(false); return 0; } return r - 1; }), 1000);
    }
    return () => clearInterval(tick.current);
  }, [running, rest]);

  const load = () => {
    Promise.all([api.get("/workout-logs"), api.get("/personal-records"), api.get("/overload")])
      .then(([h, p, o]) => {
        setHistory(h.data); setPrs(p.data);
        const map = {};
        (o.data || []).forEach((item) => { map[item.exercise.toLowerCase()] = item; });
        setOverload(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); startedAt.current = Date.now(); }, []);

  const addRow = () => setRows((r) => [...r, { exercise: r.length ? r[r.length - 1].exercise : "", weight_kg: "", reps: "" }]);
  const delRow = (i) => setRows((r) => r.filter((_, idx) => idx !== i));
  const setRow = (i, k, val) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: val } : row)));

  // Progressive overload: apply the suggested weight/reps into a row.
  const applySuggestion = (i, sugg) => {
    setRows((r) => r.map((row, idx) => idx === i
      ? { ...row, weight_kg: String(sugg.weight_kg), reps: String(sugg.reps) }
      : row));
    toast.success(`Applied target: ${sugg.weight_kg}kg × ${sugg.reps}`);
  };

  const startRest = (sec) => { setRest(sec); setRunning(true); };

  const save = async () => {
    const valid = rows.filter((r) => r.exercise.trim() && (Number(r.weight_kg) >= 0) && Number(r.reps) > 0);
    if (!valid.length) { toast.error("Add at least one set with an exercise and reps."); return; }
    setBusy(true);
    try {
      const duration = Math.round((Date.now() - startedAt.current) / 1000);
      const { data } = await api.post("/workout-logs", {
        name: name.trim() || "Workout",
        notes: notes.trim(),
        duration_sec: duration,
        sets: valid.map((r) => ({ exercise: r.exercise.trim(), weight_kg: Number(r.weight_kg) || 0, reps: Number(r.reps) })),
      });
      if (data.prs?.length) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 100);
        toast.success(`💪 ${data.prs.length} new personal record${data.prs.length > 1 ? "s" : ""}! +${data.xp_earned} XP`);
      } else {
        toast.success(`Workout saved! +${data.xp_earned} XP`);
      }
      setName(""); setRows([{ exercise: "", weight_kg: "", reps: "" }]); setNotes("");
      startedAt.current = Date.now();
      load();
    } catch {
      toast.error("Couldn't save workout. Try again.");
    } finally { setBusy(false); }
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div data-testid="workout-logger-page" className="space-y-6 relative">
      <Celebrate trigger={celebrate} />
      <div>
        <div className="text-xs text-accent uppercase tracking-widest">Training</div>
        <h1 className="display text-4xl sm:text-5xl">Log Workout</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your sets, reps and weight. Beat your records.</p>
      </div>

      {/* Rest timer */}
      <Card className="p-4 rounded-2xl glass glow-hover flex items-center justify-between flex-wrap gap-3" data-testid="rest-timer">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-secondary grid place-items-center"><Timer className="w-5 h-5 text-primary"/></div>
          <div>
            <div className="text-xs text-muted-foreground">Rest timer</div>
            <div className="display text-3xl leading-none">{fmt(rest)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {REST_PRESETS.map((s) => (
            <Button key={s} size="sm" variant="outline" className="rounded-full" onClick={() => startRest(s)} data-testid={`rest-${s}`}>{s}s</Button>
          ))}
          <Button size="icon" variant="outline" className="rounded-full" onClick={() => setRunning((r) => !r)} disabled={rest === 0} data-testid="rest-toggle">
            {running ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4"/>}
          </Button>
          <Button size="icon" variant="outline" className="rounded-full" onClick={() => { setRest(0); setRunning(false); }} data-testid="rest-reset"><RotateCcw className="w-4 h-4"/></Button>
        </div>
      </Card>

      {/* Set logger */}
      <Card className="p-5 rounded-2xl glass" data-testid="set-logger">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workout name (e.g. Push Day)" className="rounded-xl mb-4" data-testid="wl-name"/>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
            <div className="col-span-6 sm:col-span-6">Exercise</div>
            <div className="col-span-2 text-center">Kg</div>
            <div className="col-span-2 text-center">Reps</div>
            <div className="col-span-2"></div>
          </div>
          <AnimatePresence>
            {rows.map((r, i) => {
              const sugg = overload[(r.exercise || "").trim().toLowerCase()];
              return (
              <motion.div key={i} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                data-testid={`set-row-${i}`}>
                <div className="grid grid-cols-12 gap-2 items-center">
                  <Input value={r.exercise} onChange={(e) => setRow(i, "exercise", e.target.value)} placeholder="Bench press" className="col-span-6 rounded-xl" data-testid={`set-ex-${i}`}/>
                  <Input value={r.weight_kg} onChange={(e) => setRow(i, "weight_kg", e.target.value)} type="number" inputMode="decimal" placeholder="0" className="col-span-2 rounded-xl text-center" data-testid={`set-kg-${i}`}/>
                  <Input value={r.reps} onChange={(e) => setRow(i, "reps", e.target.value)} type="number" inputMode="numeric" placeholder="0" className="col-span-2 rounded-xl text-center" data-testid={`set-reps-${i}`}/>
                  <div className="col-span-2 flex justify-end">
                    <Button size="icon" variant="ghost" onClick={() => delRow(i)} disabled={rows.length === 1} data-testid={`set-del-${i}`}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                  </div>
                </div>
                {sugg && (
                  <button type="button" onClick={() => applySuggestion(i, sugg.suggestion)}
                    className="mt-1.5 mb-1 ml-1 flex items-center gap-2 text-xs rounded-full bg-accent/10 hover:bg-accent/20 text-accent px-3 py-1.5 transition"
                    data-testid={`overload-chip-${i}`} title={sugg.suggestion.reason}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Last: {Math.round(sugg.last.weight_kg)}kg × {sugg.last.reps} · Try <b>{sugg.suggestion.weight_kg}kg × {sugg.suggestion.reps}</b></span>
                  </button>
                )}
              </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
          <Button variant="outline" className="rounded-full" onClick={addRow} data-testid="wl-add-set"><Plus className="w-4 h-4 mr-1"/>Add set</Button>
        </div>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="rounded-xl mt-4" data-testid="wl-notes"/>
        <Button onClick={save} disabled={busy} className="rounded-full mt-4 w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 font-bold glow-accent" data-testid="wl-save">
          <Save className="w-4 h-4 mr-1"/>{busy ? "Saving..." : "Finish & Save Workout"}
        </Button>
      </Card>

      {/* Personal records */}
      {prs.length > 0 && (
        <Card className="p-5 rounded-2xl glass" data-testid="pr-card">
          <div className="flex items-center gap-2 mb-3"><Trophy className="w-4 h-4 text-accent"/><div className="text-sm font-medium">Personal Records</div></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {prs.map((p) => (
              <div key={p.exercise} className="rounded-xl bg-secondary p-3" data-testid={`pr-${p.exercise}`}>
                <div className="text-sm font-medium capitalize truncate">{p.exercise}</div>
                <div className="display text-2xl text-accent mt-1">{Math.round(p.best_weight)}<span className="text-sm text-muted-foreground"> kg × {p.best_reps}</span></div>
                <div className="text-[10px] text-muted-foreground">Est. 1RM {Math.round(p.best_1rm)} kg</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* History */}
      <Card className="p-5 rounded-2xl glass" data-testid="wl-history">
        <div className="flex items-center gap-2 mb-3"><Dumbbell className="w-4 h-4 text-primary"/><div className="text-sm font-medium">Workout History</div></div>
        {loading ? <ListSkeleton rows={3} /> : history.length === 0 ? (
          <EmptyState icon={Dumbbell} title="No workouts logged yet" hint="Log your first workout above — add a set, enter weight and reps, and hit save." />
        ) : (
          <div className="space-y-3">
            {history.map((h) => (
              <div key={h.id} className="rounded-2xl bg-secondary/50 p-4" data-testid={`history-${h.id}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="font-medium">{h.name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString()} · {Math.round(h.duration_sec/60)}m · {h.total_sets} sets</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {h.sets.map((s, i) => (
                    <span key={i} className={`text-xs px-2 py-1 rounded-lg ${s.is_pr ? "bg-accent/20 text-accent" : "bg-background"}`}>
                      {s.is_pr && "★ "}{s.exercise} {Math.round(s.weight_kg)}×{s.reps}
                    </span>
                  ))}
                </div>
                {h.notes && <div className="text-xs text-muted-foreground mt-2 italic">{h.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
