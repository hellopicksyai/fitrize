import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanLine, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

const fileToB64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(",")[1]);
  r.onerror = rej;
  r.readAsDataURL(file);
});

const Slot = ({ label, preview, onPick, testid }) => {
  const ref = useRef();
  return (
    <Card className="p-4 rounded-2xl text-center glass glow-hover" data-testid={testid}>
      <div className="text-xs text-accent uppercase tracking-widest mb-2">{label}</div>
      <div className="aspect-[3/4] rounded-xl bg-secondary grid place-items-center overflow-hidden">
        {preview ? <img src={preview} alt="" className="w-full h-full object-cover"/> : <ScanLine className="w-8 h-8 text-muted-foreground"/>}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e=>{ const f = e.target.files?.[0]; if (f) onPick(f); }}/>
      <Button variant="outline" className="mt-3 rounded-full w-full" onClick={()=>ref.current.click()} data-testid={`${testid}-btn`}><Upload className="w-4 h-4 mr-1"/>Upload</Button>
    </Card>
  );
};

export default function BodyScan() {
  const [imgs, setImgs] = useState({});
  const [previews, setPreviews] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const pick = (key) => async (file) => {
    const b64 = await fileToB64(file);
    setImgs(i => ({ ...i, [key]: b64 }));
    setPreviews(p => ({ ...p, [key]: URL.createObjectURL(file) }));
  };

  const analyze = async () => {
    if (!imgs.front) { toast.error("Front photo is required"); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/body-scan", { front_b64: imgs.front, side_b64: imgs.side, back_b64: imgs.back });
      setResult(data);
      toast.success("Body scan complete");
    } catch { toast.error("Scan failed"); }
    finally { setBusy(false); }
  };

  return (
    <div data-testid="bodyscan-page" className="space-y-6">
      <div>
        <div className="text-xs text-accent uppercase tracking-widest">AI Body Scan</div>
        <h1 className="display text-4xl sm:text-5xl">Photo composition analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload 3 photos · we estimate body fat, posture, symmetry & give focus areas.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Slot label="Front" preview={previews.front} onPick={pick("front")} testid="slot-front"/>
        <Slot label="Side" preview={previews.side} onPick={pick("side")} testid="slot-side"/>
        <Slot label="Back" preview={previews.back} onPick={pick("back")} testid="slot-back"/>
      </div>

      <Button onClick={analyze} disabled={busy || !imgs.front} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold" data-testid="scan-analyze">
        {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : <ScanLine className="w-4 h-4 mr-1"/>}
        Analyze body
      </Button>

      {result && (
        <div className="grid md:grid-cols-2 gap-5" data-testid="scan-result">
          <Card className="p-5 rounded-2xl glass glow-hover">
            <div className="text-xs text-muted-foreground">Body Fat Estimate</div>
            <div className="display text-5xl mt-1">{result.body_fat_estimate ?? "—"}<span className="text-2xl text-muted-foreground">%</span></div>
            <div className="text-sm text-muted-foreground mt-2">Muscle: {result.muscle_development} · Score: {result.overall_score}/100</div>
          </Card>
          <Card className="p-5 rounded-2xl glass glow-hover">
            <div className="text-xs text-muted-foreground">Posture & Symmetry</div>
            <p className="text-sm mt-2">{result.posture}</p>
            <p className="text-sm text-muted-foreground mt-2">{result.symmetry}</p>
          </Card>
          <Card className="p-5 rounded-2xl md:col-span-2 glass glow-hover">
            <div className="text-xs text-muted-foreground">Focus Areas</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(result.focus_areas || []).map((f,i) => <span key={i} className="px-3 py-1.5 rounded-full bg-secondary text-xs">{f}</span>)}
            </div>
            <div className="text-xs text-muted-foreground mt-5">Recommendations</div>
            <ul className="mt-2 space-y-1 text-sm">
              {(result.recommendations || []).map((r,i) => <li key={i}>• {r}</li>)}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
