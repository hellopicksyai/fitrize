import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, TrendingUp, BarChart3, ScanLine, ClipboardList , Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

// Merged in: Analytics (item 9) and Body Scan (item 8)
import AnalyticsPanel from "@/pages/Analytics";
import BodyScanPanel from "@/pages/BodyScan";

function LogPanel() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ weight_kg: "", body_fat: "", waist_cm: "" });
  const [busy, setBusy] = useState(false);
  const [insight, setInsight] = useState("");

  const load = () => api.get("/progress").then(r => setItems(r.data)).catch(() => {});
  useEffect(() => {
    load();
    api.get("/progress-insights").then(r => setInsight(r.data?.insight || "")).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/progress", {
        weight_kg: +form.weight_kg,
        body_fat: form.body_fat ? +form.body_fat : null,
        waist_cm: form.waist_cm ? +form.waist_cm : null,
      });
      toast.success("Progress saved");
      setForm({ weight_kg: "", body_fat: "", waist_cm: "" });
      load();
    } catch {
      toast.error("Couldn't save. Try again.");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      {insight && (
        <Card className="p-5 rounded-2xl glass grad-border" data-testid="ai-insight">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-accent"/>
            <div className="text-xs text-accent uppercase tracking-widest">AI Insights</div>
          </div>
          <p className="text-sm leading-relaxed">{insight}</p>
        </Card>
      )}
      <Card className="p-5 rounded-2xl glass glow-hover">
        <form onSubmit={submit} className="grid sm:grid-cols-4 gap-3 items-end">
          <div><Label>Weight (kg)</Label><Input required type="number" step="0.1" value={form.weight_kg} onChange={e=>setForm({...form, weight_kg:e.target.value})} className="mt-1 rounded-xl" data-testid="prog-weight"/></div>
          <div><Label>Body Fat %</Label><Input type="number" step="0.1" value={form.body_fat} onChange={e=>setForm({...form, body_fat:e.target.value})} className="mt-1 rounded-xl" data-testid="prog-bf"/></div>
          <div><Label>Waist (cm)</Label><Input type="number" step="0.1" value={form.waist_cm} onChange={e=>setForm({...form, waist_cm:e.target.value})} className="mt-1 rounded-xl" data-testid="prog-waist"/></div>
          <Button type="submit" disabled={busy} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold" data-testid="prog-add">
            {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Plus className="w-4 h-4 mr-1"/>Add entry</>}
          </Button>
        </form>
      </Card>

      <Card className="p-5 rounded-2xl glass glow-hover">
        <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-accent"/><div className="display text-2xl">Weight trend</div></div>
        {items.length < 2 ? <div className="text-sm text-muted-foreground">Add at least 2 entries to see a chart.</div> : (
          <div className="h-72" data-testid="weight-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={items}>
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11}/>
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={["auto","auto"]}/>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}/>
                <Line type="monotone" dataKey="weight_kg" stroke="#39FF14" strokeWidth={3} dot={{ fill: "#007AFF", r: 4 }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-5 rounded-2xl glass glow-hover">
        <div className="display text-2xl mb-3">Entries</div>
        {!items.length && <div className="text-sm text-muted-foreground">No entries yet.</div>}
        <div className="divide-y divide-border">
          {[...items].reverse().map(it => (
            <div key={it.id} className="py-3 flex items-center justify-between" data-testid={`entry-${it.id}`}>
              <div className="text-sm">{it.date}</div>
              <div className="text-sm text-muted-foreground">
                {it.weight_kg} kg{it.body_fat ? ` · ${it.body_fat}%` : ""}{it.waist_cm ? ` · waist ${it.waist_cm}cm` : ""}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function Progress() {
  return (
    <div data-testid="progress-page" className="space-y-6">
      <div>
        <div className="text-xs text-accent uppercase tracking-widest">Progress</div>
        <h1 className="display text-4xl sm:text-5xl">Track the trend</h1>
        <p className="text-sm text-muted-foreground mt-1">Log measurements, view analytics and scan your body — all in one place.</p>
      </div>

      <Tabs defaultValue="scan" className="w-full">
        <TabsList className="rounded-full" data-testid="progress-tabs">
          <TabsTrigger value="scan" className="rounded-full" data-testid="tab-scan"><ScanLine className="w-4 h-4 mr-1.5"/>Body Scan</TabsTrigger>
          <TabsTrigger value="log" className="rounded-full" data-testid="tab-log"><ClipboardList className="w-4 h-4 mr-1.5"/>Log & History</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-full" data-testid="tab-analytics"><BarChart3 className="w-4 h-4 mr-1.5"/>Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="mt-5"><BodyScanPanel /></TabsContent>
        <TabsContent value="log" className="mt-5"><LogPanel /></TabsContent>
        <TabsContent value="analytics" className="mt-5"><AnalyticsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
