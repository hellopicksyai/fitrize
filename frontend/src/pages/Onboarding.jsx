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

const STEPS = ["Basics", "Body", "Activity", "Medical", "Goal"];

const HEALTH_CONDITIONS = ["None","High blood pressure","Diabetes","Heart condition","Asthma / Breathing issues","High cholesterol","Arthritis","Osteoporosis","PCOS","Thyroid disorder","Recent surgery","Pregnancy / Postpartum","Other"];
const INJURY_AREAS = ["None","Neck","Shoulder","Elbow","Wrist","Lower back","Hip","Knee","Ankle"];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    age: 28, gender: "male", height_cm: 178, weight_kg: 76,
    body_fat: "", activity_level: "moderate", goal: "muscle_gain",
    experience: "intermediate", injuries: "",
    health_conditions: [], current_injuries: [], pain_level: 0, coach_notes: "",
  });
  const { refresh } = useAuth();
  const nav = useNavigate();
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    try {
      // fill sensible defaults for any left blank
      const payload = {
        ...form,
        age: form.age === "" ? 25 : form.age,
        height_cm: form.height_cm === "" ? 170 : form.height_cm,
        weight_kg: form.weight_kg === "" ? 70 : form.weight_kg,
        body_fat: form.body_fat === "" ? null : form.body_fat,
      };
      await api.post("/assessment", payload);
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
              <Input data-testid="onb-age" type="number" value={form.age} onChange={e=>set("age")(e.target.value === "" ? "" : parseInt(e.target.value))} placeholder="e.g. 28" className="mt-1.5 rounded-xl"/>
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
              <Input data-testid="onb-height" type="number" value={form.height_cm} onChange={e=>set("height_cm")(e.target.value === "" ? "" : parseFloat(e.target.value))} placeholder="e.g. 178" className="mt-1.5 rounded-xl"/>
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input data-testid="onb-weight" type="number" value={form.weight_kg} onChange={e=>set("weight_kg")(e.target.value === "" ? "" : parseFloat(e.target.value))} placeholder="e.g. 76" className="mt-1.5 rounded-xl"/>
            </div>
            <div>
              <Label>Body Fat %</Label>
              <Input data-testid="onb-bodyfat" type="number" value={form.body_fat} onChange={e=>set("body_fat")(e.target.value === "" ? "" : parseFloat(e.target.value))} placeholder="optional" className="mt-1.5 rounded-xl"/>
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
          <div className="space-y-5" data-testid="onb-medical">
            <div>
              <Label>Do you have any of the following? (select all that apply)</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {HEALTH_CONDITIONS.map(c => {
                  const active = form.health_conditions.includes(c);
                  return (
                    <button key={c} type="button" data-testid={`hc-${c}`}
                      onClick={()=>set("health_conditions")(active ? form.health_conditions.filter(x=>x!==c) : [...form.health_conditions.filter(x=>c==="None"?false:x!=="None"), c].filter(x=>c!=="None"||x==="None"))}
                      className={`text-left text-sm px-3 py-2 rounded-xl border transition ${active ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-muted-foreground"}`}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Current injuries (select all that apply)</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {INJURY_AREAS.map(c => {
                  const active = form.current_injuries.includes(c);
                  return (
                    <button key={c} type="button" data-testid={`inj-${c}`}
                      onClick={()=>set("current_injuries")(active ? form.current_injuries.filter(x=>x!==c) : [...form.current_injuries.filter(x=>c==="None"?false:x!=="None"), c])}
                      className={`text-sm px-3 py-1.5 rounded-full border transition ${active ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-muted-foreground"}`}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Pain level: <span className="text-accent font-bold">{form.pain_level}</span> / 10</Label>
              <input type="range" min="0" max="10" value={form.pain_level}
                onChange={e=>set("pain_level")(parseInt(e.target.value))}
                className="w-full mt-2 accent-[#39FF14]" data-testid="onb-pain"/>
            </div>

            <div>
              <Label>Anything else you'd like your AI coach to know?</Label>
              <Textarea data-testid="onb-coach-notes" value={form.coach_notes} onChange={e=>set("coach_notes")(e.target.value)} placeholder="Optional — goals, preferences, constraints…" className="mt-1.5 rounded-xl"/>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <Label>Primary Goal</Label>
            <Select value={form.goal} onValueChange={set("goal")}>
              <SelectTrigger data-testid="onb-goal" className="mt-1.5 rounded-xl"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="weight_loss">Weight loss</SelectItem>
                <SelectItem value="weight_gain">Gain weight</SelectItem>
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
