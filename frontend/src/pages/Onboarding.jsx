import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";

const STEPS = ["Basics", "Body", "Activity", "Goal"];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    age: 28, gender: "male", height_cm: 178, weight_kg: 76,
    body_fat: 18, activity_level: "moderate", goal: "fat_loss",
    experience: "intermediate", injuries: "",
  });
  const { refresh } = useAuth();
  const nav = useNavigate();
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    try {
      await api.post("/assessment", form);
      await refresh();
      toast.success("Profile ready! Generating your dashboard…");
      nav("/app");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-background">
      <Card className="w-full max-w-2xl rounded-3xl p-8" data-testid="onboarding-card">
        <div className="flex items-center justify-between mb-2">
          <div className="display text-3xl">Fitness Assessment</div>
          <div className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</div>
        </div>
        <Progress value={((step+1)/STEPS.length)*100} className="mt-2 mb-7"/>

        {step === 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Age</Label>
              <Input data-testid="onb-age" type="number" value={form.age} onChange={e=>set("age")(parseInt(e.target.value||0))} className="mt-1.5 rounded-xl"/>
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={set("gender")}>
                <SelectTrigger data-testid="onb-gender" className="mt-1.5 rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>Height (cm)</Label>
              <Input data-testid="onb-height" type="number" value={form.height_cm} onChange={e=>set("height_cm")(parseFloat(e.target.value||0))} className="mt-1.5 rounded-xl"/>
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input data-testid="onb-weight" type="number" value={form.weight_kg} onChange={e=>set("weight_kg")(parseFloat(e.target.value||0))} className="mt-1.5 rounded-xl"/>
            </div>
            <div>
              <Label>Body Fat %</Label>
              <Input data-testid="onb-bodyfat" type="number" value={form.body_fat} onChange={e=>set("body_fat")(parseFloat(e.target.value||0))} className="mt-1.5 rounded-xl"/>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Activity Level</Label>
              <Select value={form.activity_level} onValueChange={set("activity_level")}>
                <SelectTrigger data-testid="onb-activity" className="mt-1.5 rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary</SelectItem>
                  <SelectItem value="light">Lightly active</SelectItem>
                  <SelectItem value="moderate">Moderately active</SelectItem>
                  <SelectItem value="active">Very active</SelectItem>
                  <SelectItem value="very_active">Athlete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Experience</Label>
              <Select value={form.experience} onValueChange={set("experience")}>
                <SelectTrigger data-testid="onb-experience" className="mt-1.5 rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Injuries / Limitations</Label>
              <Textarea data-testid="onb-injuries" value={form.injuries} onChange={e=>set("injuries")(e.target.value)} placeholder="e.g. lower back, knee" className="mt-1.5 rounded-xl"/>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <Label>Primary Goal</Label>
            <Select value={form.goal} onValueChange={set("goal")}>
              <SelectTrigger data-testid="onb-goal" className="mt-1.5 rounded-xl"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="weight_loss">Weight loss</SelectItem>
                <SelectItem value="fat_loss">Fat loss</SelectItem>
                <SelectItem value="muscle_gain">Muscle gain</SelectItem>
                <SelectItem value="strength">Strength</SelectItem>
                <SelectItem value="athletic">Athletic performance</SelectItem>
                <SelectItem value="general">General fitness</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-3 text-xs text-muted-foreground">We'll compute BMI, TDEE, ideal weight range and your daily calorie + protein targets.</p>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button variant="outline" disabled={step===0} onClick={()=>setStep(s=>s-1)} data-testid="onb-back" className="rounded-full">Back</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={()=>setStep(s=>s+1)} data-testid="onb-next" className="rounded-full bg-primary">
              Next <ArrowRight className="w-4 h-4 ml-1"/>
            </Button>
          ) : (
            <Button onClick={submit} disabled={busy} data-testid="onb-submit" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold">
              {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : "Generate plan"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
