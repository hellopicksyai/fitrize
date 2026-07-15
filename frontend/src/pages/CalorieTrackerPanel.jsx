import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Camera, Mic, Plus, Minus, Trash2, Loader2, Droplet } from "lucide-react";

const fileToB64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(",")[1]);
  r.onerror = rej;
  r.readAsDataURL(file);
});

export default function CalorieTrackerPanel() {
  const [today, setToday] = useState({ meals: [], totals: {}, water_glasses: 0 });
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState({ name: "", calories: 0, protein: 0, carbs: 0, fats: 0, meal_type: "lunch" });
  const [voiceText, setVoiceText] = useState("");
  const [voiceLive, setVoiceLive] = useState(false);
  const fileRef = useRef();
  const recRef = useRef(null);

  const load = () => api.get("/meals/today").then(r => setToday(r.data));
  useEffect(() => { load(); }, []);

  const logManual = async (e) => {
    e.preventDefault();
    await api.post("/meals/log", { ...manual,
      calories: +manual.calories, protein: +manual.protein, carbs: +manual.carbs, fats: +manual.fats });
    toast.success("Meal logged");
    setManual({ name: "", calories: 0, protein: 0, carbs: 0, fats: 0, meal_type: "lunch" });
    load();
  };

  const onPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const b64 = await fileToB64(f);
      const { data } = await api.post("/meals/analyze-image", { image_base64: b64, mime_type: f.type });
      if (!data?.name) { toast.error("Couldn't read meal. Try clearer photo."); return; }
      await api.post("/meals/log", {
        name: data.name, calories: +data.calories || 0, protein: +data.protein || 0,
        carbs: +data.carbs || 0, fats: +data.fats || 0, fiber: +data.fiber || 0, sugar: +data.sugar || 0,
        meal_type: "snack",
      });
      toast.success(`Logged: ${data.name} (~${Math.round(data.calories)} kcal)`);
      load();
    } catch (err) { toast.error("Photo analysis failed"); }
    finally { setBusy(false); fileRef.current.value = ""; }
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error("Voice not supported in this browser"); return; }
    const r = new SR();
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = true;
    r.onresult = (e) => {
      const txt = Array.from(e.results).map(x => x[0].transcript).join("");
      setVoiceText(txt);
    };
    r.onend = () => setVoiceLive(false);
    r.start();
    recRef.current = r;
    setVoiceLive(true);
  };

  const submitVoice = async () => {
    if (!voiceText.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post("/meals/voice", { text: voiceText });
      if (!data?.name) { toast.error("Couldn't parse meal"); return; }
      await api.post("/meals/log", {
        name: data.name, calories: +data.calories || 0, protein: +data.protein || 0,
        carbs: +data.carbs || 0, fats: +data.fats || 0, meal_type: "snack",
      });
      toast.success(`Logged: ${data.name}`);
      setVoiceText("");
      load();
    } finally { setBusy(false); }
  };

  const delMeal = async (id) => { await api.delete(`/meals/${id}`); load(); };

  // Water is tracked in litres now (goal 3 L/day). We store it in the same
  // backend field; each "unit" = 0.25 L, so litres = units * 0.25.
  const WATER_GOAL_L = 3;
  const STEP_L = 0.25;
  const litres = ((today.water_glasses || 0) * STEP_L);

  const setWater = async (units) => {
    const glasses = Math.max(0, units);
    setToday((prev) => ({ ...prev, water_glasses: glasses }));
    try {
      await api.post("/water", { glasses });
      load();
    } catch {
      toast.error("Couldn't update water. Try again.");
      load();
    }
  };
  const addWater = () => setWater((today.water_glasses || 0) + 1);       // +0.25 L
  const removeWater = () => setWater((today.water_glasses || 0) - 1);    // -0.25 L

  const T = today.totals || {};

  return (
    <div data-testid="tracker-page" className="space-y-6">
      

      <div className="grid md:grid-cols-4 gap-4">
        {[
          { l: "Calories", v: Math.round(T.calories||0), u: "kcal" },
          { l: "Protein", v: Math.round(T.protein||0), u: "g" },
          { l: "Carbs", v: Math.round(T.carbs||0), u: "g" },
          { l: "Fats", v: Math.round(T.fats||0), u: "g" },
        ].map(s => (
          <Card key={s.l} className="p-4 rounded-2xl glass glow-hover" data-testid={`total-${s.l.toLowerCase()}`}>
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className="display text-3xl mt-1">{s.v}<span className="text-muted-foreground text-base ml-1">{s.u}</span></div>
          </Card>
        ))}
      </div>

      <Card className="p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass glow-hover" data-testid="water-card">
        <div className="flex items-center gap-3">
          <Droplet className="w-5 h-5 text-primary"/>
          <div>
            <div className="text-xs text-muted-foreground">Water</div>
            <div className="display text-2xl">{litres.toFixed(2)} / {WATER_GOAL_L} L</div>
            {/* progress bar toward 3 L */}
            <div className="w-48 h-2 rounded-full bg-secondary mt-2 overflow-hidden">
              <div className="h-full bg-primary glow-primary transition-all"
                style={{ width: `${Math.min(100, (litres / WATER_GOAL_L) * 100)}%` }} aria-hidden />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={removeWater} variant="outline" size="icon" className="rounded-full"
            disabled={(today.water_glasses || 0) <= 0} data-testid="btn-water-remove" aria-label="Remove water">
            <Minus className="w-4 h-4"/>
          </Button>
          <Button onClick={addWater} className="rounded-full" data-testid="btn-water-add"><Plus className="w-4 h-4 mr-1"/>0.25 L</Button>
        </div>
      </Card>

      <Card className="p-5 rounded-2xl glass glow-hover" data-testid="log-card">
        <Tabs defaultValue="photo">
          <TabsList className="rounded-full">
            <TabsTrigger value="photo" data-testid="tab-photo">Photo</TabsTrigger>
            <TabsTrigger value="voice" data-testid="tab-voice">Voice</TabsTrigger>
            <TabsTrigger value="manual" data-testid="tab-manual">Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="photo" className="mt-5">
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">Snap your plate · Gemini Vision estimates calories & macros.</p>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" data-testid="input-food-photo"/>
              <Button onClick={() => fileRef.current.click()} disabled={busy} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold" data-testid="btn-upload-photo">
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : <Camera className="w-4 h-4 mr-1"/>}
                Upload meal photo
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="voice" className="mt-5 space-y-3">
            <p className="text-sm text-muted-foreground">Say what you ate. AI parses calories & macros.</p>
            <div className="flex gap-2">
              <Input value={voiceText} onChange={e=>setVoiceText(e.target.value)} placeholder='e.g. "2 boiled eggs and a banana"' className="rounded-full" data-testid="input-voice-text"/>
              <Button variant={voiceLive ? "default" : "outline"} onClick={startVoice} className="rounded-full" data-testid="btn-voice-start">
                <Mic className={`w-4 h-4 ${voiceLive ? "text-accent" : ""}`}/>
              </Button>
              <Button onClick={submitVoice} disabled={busy || !voiceText} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold" data-testid="btn-voice-log">Log</Button>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="mt-5">
            <form onSubmit={logManual} className="grid sm:grid-cols-6 gap-3">
              <div className="sm:col-span-2"><Label>Name</Label><Input value={manual.name} onChange={e=>setManual({...manual, name:e.target.value})} required className="mt-1 rounded-xl" data-testid="manual-name"/></div>
              <div><Label>Cal</Label><Input type="number" value={manual.calories} onChange={e=>setManual({...manual, calories:e.target.value})} className="mt-1 rounded-xl" data-testid="manual-cal"/></div>
              <div><Label>P (g)</Label><Input type="number" value={manual.protein} onChange={e=>setManual({...manual, protein:e.target.value})} className="mt-1 rounded-xl" data-testid="manual-p"/></div>
              <div><Label>C (g)</Label><Input type="number" value={manual.carbs} onChange={e=>setManual({...manual, carbs:e.target.value})} className="mt-1 rounded-xl" data-testid="manual-c"/></div>
              <div><Label>F (g)</Label><Input type="number" value={manual.fats} onChange={e=>setManual({...manual, fats:e.target.value})} className="mt-1 rounded-xl" data-testid="manual-f"/></div>
              <div className="sm:col-span-2"><Label>Meal</Label>
                <Select value={manual.meal_type} onValueChange={v=>setManual({...manual, meal_type:v})}>
                  <SelectTrigger className="mt-1 rounded-xl" data-testid="manual-meal"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-4 flex items-end"><Button type="submit" className="rounded-full w-full" data-testid="manual-submit"><Plus className="w-4 h-4 mr-1"/>Add meal</Button></div>
            </form>
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-5 rounded-2xl glass glow-hover" data-testid="meal-history">
        <div className="display text-2xl mb-3">Today's meals</div>
        {!today.meals?.length && <div className="text-sm text-muted-foreground">No meals logged yet.</div>}
        <div className="divide-y divide-border">
          {today.meals?.map(m => (
            <div key={m.id} className="flex items-center justify-between py-3" data-testid={`meal-${m.id}`}>
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.meal_type} · {Math.round(m.calories)} kcal · P {Math.round(m.protein)} · C {Math.round(m.carbs)} · F {Math.round(m.fats)}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => delMeal(m.id)} data-testid={`del-${m.id}`}><Trash2 className="w-4 h-4 text-destructive"/></Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}