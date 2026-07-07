import { useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Nutrition() {
  const [diet, setDiet] = useState("high_protein");
  const [budget, setBudget] = useState("medium");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState(null);

  const gen = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/nutrition/plan", { diet_type: diet, budget });
      setPlan(data);
      toast.success("Meal plan ready");
    } catch { toast.error("Plan generation failed"); }
    finally { setBusy(false); }
  };

  const Meal = ({ title, m, testid }) => (
    <Card className="p-5 rounded-2xl glass glow-hover" data-testid={testid}>
      <div className="text-xs text-accent uppercase tracking-widest">{title}</div>
      <div className="display text-2xl mt-1">{m?.name || "—"}</div>
      <div className="text-xs text-muted-foreground mt-1">{Math.round(m?.calories||0)} kcal · P {Math.round(m?.protein||0)}g · C {Math.round(m?.carbs||0)}g · F {Math.round(m?.fats||0)}g</div>
      {m?.items?.length ? <ul className="mt-3 text-sm space-y-1 text-muted-foreground">{m.items.map((i,k)=><li key={k}>• {i}</li>)}</ul> : null}
    </Card>
  );

  return (
    <div data-testid="nutrition-page" className="space-y-6">
      <div>
        <div className="text-xs text-accent uppercase tracking-widest">Nutrition</div>
        <h1 className="display text-4xl sm:text-5xl">AI Meal Plan</h1>
      </div>

      <Card className="p-5 rounded-2xl flex flex-wrap gap-3 items-end glass glow-hover">
        <div className="flex-1 min-w-[180px]">
          <div className="text-xs text-muted-foreground mb-1.5">Diet</div>
          <Select value={diet} onValueChange={setDiet}>
            <SelectTrigger className="rounded-xl" data-testid="diet-select"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="high_protein">High Protein</SelectItem>
              <SelectItem value="vegetarian">Vegetarian</SelectItem>
              <SelectItem value="vegan">Vegan</SelectItem>
              <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
              <SelectItem value="indian">Indian</SelectItem>
              <SelectItem value="keto">Keto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <div className="text-xs text-muted-foreground mb-1.5">Budget</div>
          <Select value={budget} onValueChange={setBudget}>
            <SelectTrigger className="rounded-xl" data-testid="budget-select"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={gen} disabled={busy} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold" data-testid="gen-plan">
          {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : <Sparkles className="w-4 h-4 mr-1"/>}
          Generate plan
        </Button>
      </Card>

      {plan && (
        <div className="grid md:grid-cols-2 gap-5">
          <Meal title="Breakfast" m={plan.breakfast} testid="meal-breakfast"/>
          <Meal title="Lunch" m={plan.lunch} testid="meal-lunch"/>
          <Meal title="Dinner" m={plan.dinner} testid="meal-dinner"/>
          <Meal title="Snacks" m={plan.snacks} testid="meal-snacks"/>
          {plan.daily_totals && (
            <Card className="p-5 rounded-2xl md:col-span-2 glass glow-hover" data-testid="meal-totals">
              <div className="text-xs text-accent uppercase tracking-widest">Daily totals</div>
              <div className="display text-3xl mt-1">{Math.round(plan.daily_totals.calories)} kcal</div>
              <div className="text-sm text-muted-foreground">P {Math.round(plan.daily_totals.protein)}g · C {Math.round(plan.daily_totals.carbs)}g · F {Math.round(plan.daily_totals.fats)}g</div>
              {plan.notes && <p className="text-sm text-muted-foreground mt-3">{plan.notes}</p>}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
