import { useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Play, Square, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { usePoseCoach, SUPPORTED_EXERCISES } from "@/lib/poseCoach";

const EXERCISES = ["Squat","Push-ups","Pull-ups","Shoulder Press","Bicep Curls","Lunges","Plank","Deadlift","Bench Press"];
const REAL_TIME = new Set(SUPPORTED_EXERCISES);
const HOLD_EXERCISES = new Set(["Plank"]);

export default function FormCorrection() {
  const [ex, setEx] = useState("Squat");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiCues, setAiCues] = useState([]);
  const { videoRef, canvasRef, ready, live, reps, score, cues, start, stop, lastSession, clearSession } = usePoseCoach({ exercise: ex });
  const [saving, setSaving] = useState(false);

  const MET = { "Squat": 5.0, "Push-ups": 8.0, "Pull-ups": 8.0, "Shoulder Press": 5.0,
    "Bicep Curls": 3.5, "Lunges": 6.0, "Plank": 3.0, "Deadlift": 6.0, "Bench Press": 5.0 };

  const saveReport = async () => {
    if (!lastSession) return;
    setSaving(true);
    const met = MET[lastSession.exercise] || 5.0;
    const calories = +(met * 70 * (lastSession.duration_sec / 3600)).toFixed(1); // ~70kg ref weight
    try {
      await api.post("/sessions", { ...lastSession, calories });
      toast.success(`Session saved · ${calories} kcal · +20 XP`);
      clearSession();
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };
  const isRealTime = REAL_TIME.has(ex);
  const isHold = HOLD_EXERCISES.has(ex);

  const onStart = async () => {
    if (!isRealTime) { toast.info(`${ex} uses AI cue feedback only in v1`); return; }
    if (!ready) { toast.info("Loading pose model…"); return; }
    const ok = await start();
    if (!ok) toast.error("Camera permission required");
  };

  const getAiCues = async () => {
    setAiBusy(true);
    try {
      const { data } = await api.post("/form/feedback", { exercise: ex, reps, issues: cues });
      setAiCues(data.cues || []);
      if (data.top_fix) toast.success(data.top_fix);
    } catch { toast.error("AI feedback unavailable"); }
    finally { setAiBusy(false); }
  };

  return (
    <div data-testid="form-page" className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs text-accent uppercase tracking-widest">Premium · Live Pose AI</div>
          <h1 className="display text-4xl sm:text-5xl">Form Correction</h1>
          <p className="text-sm text-muted-foreground mt-1">MediaPipe real-time pose detection · live rep counting & form scoring for all 9 exercises.</p>
        </div>
        <div className="text-xs">
          <span className={`px-2.5 py-1 rounded-full ${ready ? "bg-accent/20 text-accent" : "bg-secondary text-muted-foreground"}`}>
            {ready ? "Pose model ready" : "Loading model…"}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-0 rounded-3xl overflow-hidden relative aspect-[4/3] bg-black">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline data-testid="form-video"/>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none"/>
          {!live && (
            <div className="absolute inset-0 grid place-items-center text-white/70 text-sm text-center px-6">
              {isRealTime
                ? (ready ? "Camera off · press Start to begin live pose tracking" : "Loading MediaPipe pose model…")
                : `${ex} runs on AI cue feedback (no live tracking in v1)`}
            </div>
          )}
          {live && (
            <>
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-xs text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent pulse-dot"/> Live · {ex}
                </div>
                <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-xs text-white">
                  Score · <span className="text-accent font-bold" data-testid="form-score">{score}</span>
                  <span className="mx-2 opacity-30">|</span>
                  {isHold ? "Hold · " : "Reps · "}<span className="font-bold" data-testid="form-reps">{reps}{isHold ? "s" : ""}</span>
                </div>
              </div>
              <div className="absolute inset-x-0 h-px bg-accent/80 scan-line"/>
              {cues.length > 0 && (
                <div className="absolute bottom-4 left-4 right-4 glass rounded-2xl p-3 text-xs text-white">
                  <div className="font-semibold mb-1">Live cues</div>
                  {cues.map((c,i)=>(<div key={i} className="text-white/80" data-testid={`live-cue-${i}`}>→ {c}</div>))}
                </div>
              )}
            </>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5 rounded-2xl glass glow-hover">
            <div className="text-xs text-muted-foreground mb-1.5">Exercise</div>
            <Select value={ex} onValueChange={(v) => { if (live) stop(); setEx(v); }}>
              <SelectTrigger className="rounded-xl" data-testid="form-exercise"><SelectValue/></SelectTrigger>
              <SelectContent>
                {EXERCISES.map(x => (
                  <SelectItem key={x} value={x}>
                    {x}{REAL_TIME.has(x) ? "  · live" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-3 flex gap-2">
              {!live ? (
                <Button onClick={onStart} disabled={!ready && isRealTime} className="rounded-full flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-bold" data-testid="btn-form-start">
                  <Play className="w-4 h-4 mr-1"/>Start
                </Button>
              ) : (
                <Button onClick={stop} variant="outline" className="rounded-full flex-1" data-testid="btn-form-stop">
                  <Square className="w-4 h-4 mr-1"/>Stop
                </Button>
              )}
              <Button onClick={getAiCues} disabled={aiBusy} variant="outline" className="rounded-full" data-testid="btn-form-feedback" title="AI cue review">
                {aiBusy ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-secondary p-2"><div className="text-[10px] text-muted-foreground">{isHold ? "Hold" : "Reps"}</div><div className="display text-2xl">{reps}{isHold ? "s" : ""}</div></div>
              <div className="rounded-xl bg-secondary p-2"><div className="text-[10px] text-muted-foreground">Score</div><div className="display text-2xl text-accent">{score}</div></div>
              <div className="rounded-xl bg-secondary p-2"><div className="text-[10px] text-muted-foreground">Mode</div><div className="display text-base">{isRealTime ? "Live" : "AI"}</div></div>
            </div>
          </Card>

          <Card className="p-5 rounded-2xl glass glow-hover">
            <div className="text-xs text-muted-foreground mb-2">AI cue review</div>
            {!aiCues.length && <div className="text-sm text-muted-foreground">Tap the sparkle icon while training to get an AI cue pass.</div>}
            <ul className="space-y-2">
              {aiCues.map((c,i)=>(<li key={i} className="text-sm flex gap-2" data-testid={`cue-${i}`}><span className="text-accent">→</span>{c}</li>))}
            </ul>
          </Card>

          {lastSession && (
            <Card className="p-5 rounded-2xl neon-ring glass glow-hover" data-testid="session-report">
              <div className="text-xs text-accent uppercase tracking-widest mb-1">Workout complete</div>
              <div className="display text-3xl">{lastSession.exercise}</div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="rounded-xl bg-secondary p-2"><div className="text-[10px] text-muted-foreground">Reps</div><div className="display text-2xl">{lastSession.reps}</div></div>
                <div className="rounded-xl bg-secondary p-2"><div className="text-[10px] text-muted-foreground">Duration</div><div className="display text-2xl">{lastSession.duration_sec}s</div></div>
                <div className="rounded-xl bg-secondary p-2"><div className="text-[10px] text-muted-foreground">Avg Score</div><div className="display text-2xl text-accent">{lastSession.avg_form_score}</div></div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">Est. {(+(MET[lastSession.exercise] || 5) * 70 * (lastSession.duration_sec / 3600)).toFixed(1)} kcal burned</div>
              <div className="mt-4 flex gap-2">
                <Button onClick={saveReport} disabled={saving} className="rounded-full flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-bold" data-testid="btn-save-session">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : "Save · +20 XP"}
                </Button>
                <Button variant="outline" onClick={clearSession} className="rounded-full" data-testid="btn-dismiss-session">Dismiss</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
