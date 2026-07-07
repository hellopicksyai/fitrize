import { useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Dumbbell, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Workout() {
  const [type, setType] = useState("gym");
  const [days, setDays] = useState(4);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState(null);

  const gen = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/workouts/generate", { workout_type: type, days_per_week: +days, equipment: [] });
      setPlan(data);
      toast.success("Workout generated");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div data-testid="workout-page" className="space-y-6">
      <div>
        <div className="text-xs text-accent uppercase tracking-widest">Training</div>
        <h1 className="display text-4xl sm:text-5xl">AI Workout Generator</h1>
      </div>

      <Card className="p-5 rounded-2xl flex flex-wrap gap-3 items-end glass glow-hover">
        <div className="flex-1 min-w-[180px]">
          <div className="text-xs text-muted-foreground mb-1.5">Type</div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="rounded-xl" data-testid="wk-type"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="gym">Gym</SelectItem>
              <SelectItem value="home">Home</SelectItem>
              <SelectItem value="calisthenics">Calisthenics</SelectItem>
              <SelectItem value="crossfit">CrossFit</SelectItem>
              <SelectItem value="strength">Strength</SelectItem>
              <SelectItem value="muscle">Muscle Building</SelectItem>
              <SelectItem value="fat_loss">Fat Loss</SelectItem>
              <SelectItem value="functional">Functional</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <div className="text-xs text-muted-foreground mb-1.5">Days/week</div>
          <Input type="number" min={1} max={7} value={days} onChange={e=>setDays(e.target.value)} className="rounded-xl" data-testid="wk-days"/>
        </div>
        <Button onClick={gen} disabled={busy} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold" data-testid="wk-gen">
          {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : <Sparkles className="w-4 h-4 mr-1"/>}
          Generate
        </Button>
      </Card>

      {plan && (
        <div className="space-y-4">
          <Card className="p-5 rounded-2xl glass glow-hover">
            <div className="text-xs text-accent uppercase tracking-widest">Split</div>
            <div className="display text-3xl mt-1">{plan.split_name || "Custom split"}</div>
            {plan.progression && <p className="text-sm text-muted-foreground mt-2">Progression · {plan.progression}</p>}
            {plan.cardio && <p className="text-sm text-muted-foreground">Cardio · {plan.cardio}</p>}
          </Card>

          <div className="grid md:grid-cols-2 gap-5">
            {(plan.days || []).map((d, i) => (
              <Card key={i} className="p-5 rounded-2xl glass glow-hover" data-testid={`day-${i}`}>
                <div className="flex items-center justify-between">
                  <div className="display text-2xl flex items-center gap-2"><Dumbbell className="w-5 h-5 text-primary"/>{d.day}</div>
                  <div className="text-xs text-accent">{d.focus}</div>
                </div>
                <div className="mt-4 divide-y divide-border">
                  {(d.exercises || []).map((ex, k) => (
                    <div key={k} className="py-2.5 flex items-start justify-between gap-3" data-testid={`ex-${i}-${k}`}>
                      <div>
                        <div className="font-medium">{ex.name}</div>
                        {ex.notes && <div className="text-xs text-muted-foreground mt-0.5">{ex.notes}</div>}
                      </div>
                      <div className="text-xs text-right whitespace-nowrap">
                        <div className="font-semibold">{ex.sets}×{ex.reps}</div>
                        <div className="text-muted-foreground">{ex.rest_sec}s rest</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
