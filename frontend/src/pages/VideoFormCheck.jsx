import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, CheckCircle2, AlertTriangle, Video, Sparkles } from "lucide-react";
import { toast } from "sonner";
import CountUp from "@/components/CountUp";

const EXERCISES = ["Squat","Push-ups","Pull-ups","Shoulder Press","Bicep Curls","Lunges","Plank","Deadlift","Bench Press"];

const fileToB64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(",")[1]);
  r.onerror = rej;
  r.readAsDataURL(file);
});

export default function VideoFormCheck() {
  const [ex, setEx] = useState("Squat");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef();

  const pick = (f) => {
    if (!f) return;
    // keep uploads small — a 10–20s clip is all we need
    if (f.size > 40 * 1024 * 1024) {
      toast.error("Video is too large. Please upload a clip under ~40MB (10–20 seconds).");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  };

  const analyze = async () => {
    if (!file) { toast.error("Upload a video of your set first."); return; }
    setBusy(true);
    setResult(null);
    try {
      const b64 = await fileToB64(file);
      const { data } = await api.post("/form/analyze-video", {
        exercise: ex,
        video_base64: b64,
        mime_type: file.type || "video/mp4",
      });
      if (data?.raw) {
        toast.error("Couldn't read the analysis. Try a shorter, clearer clip.");
      } else {
        setResult(data);
        toast.success("Form review ready");
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Analysis failed. Try a shorter clip.");
    } finally {
      setBusy(false);
    }
  };

  const score = result?.score || 0;
  const scoreColor = score >= 80 ? "text-accent" : score >= 60 ? "text-primary" : "text-destructive";

  return (
    <div className="space-y-5" data-testid="video-form-check">
      <Card className="p-5 rounded-2xl glass">
        <div className="text-sm text-muted-foreground mb-4">
          Record 10–20 seconds of your set, upload it, and get a form score with specific corrections for next time.
          No need to set up your phone mid-workout — just film one set and review after.
        </div>

        <div className="grid sm:grid-cols-[200px_1fr] gap-4 items-start">
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">Exercise</div>
            <Select value={ex} onValueChange={setEx}>
              <SelectTrigger className="rounded-xl" data-testid="vfc-exercise"><SelectValue/></SelectTrigger>
              <SelectContent>
                {EXERCISES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1.5">Your set</div>
            <input ref={inputRef} type="file" accept="video/*" className="hidden"
              onChange={e => pick(e.target.files?.[0])} data-testid="vfc-input"/>
            {preview ? (
              <div className="space-y-2">
                <video src={preview} controls className="w-full max-h-64 rounded-xl bg-black" data-testid="vfc-preview"/>
                <Button variant="outline" size="sm" className="rounded-full" onClick={()=>inputRef.current.click()}>
                  <Upload className="w-3.5 h-3.5 mr-1"/>Choose different video
                </Button>
              </div>
            ) : (
              <button onClick={()=>inputRef.current.click()} data-testid="vfc-upload"
                className="w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-accent transition grid place-items-center text-sm text-muted-foreground">
                <div className="text-center">
                  <Video className="w-6 h-6 mx-auto mb-1.5"/>
                  Click to upload a video of your set
                  <div className="text-xs mt-0.5 opacity-70">10–20 seconds · side angle works best</div>
                </div>
              </button>
            )}
          </div>
        </div>

        <Button onClick={analyze} disabled={busy || !file} data-testid="vfc-analyze"
          className="rounded-full mt-4 bg-accent text-accent-foreground hover:bg-accent/90 font-bold">
          {busy ? <><Loader2 className="w-4 h-4 mr-1 animate-spin"/>Analyzing your form…</> : <><Sparkles className="w-4 h-4 mr-1"/>Check my form</>}
        </Button>
      </Card>

      {result && (
        <Card className="p-6 rounded-2xl glass grad-border" data-testid="vfc-result">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">Form Score</div>
              <div className={`display text-6xl ${scoreColor}`}>
                <CountUp value={score}/><span className="text-2xl text-muted-foreground">/100</span>
              </div>
            </div>
            {result.reps_seen > 0 && (
              <div className="text-center">
                <div className="display text-3xl"><CountUp value={result.reps_seen}/></div>
                <div className="text-xs text-muted-foreground">reps seen</div>
              </div>
            )}
          </div>

          {result.top_fix && (
            <div className="rounded-xl bg-accent/10 border border-accent/20 p-4 mb-5">
              <div className="text-xs text-accent uppercase tracking-widest mb-1">Fix this first</div>
              <div className="text-sm font-medium">{result.top_fix}</div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-5">
            {!!(result.good || []).length && (
              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
                  <CheckCircle2 className="w-4 h-4 text-accent"/>What you did well
                </div>
                <ul className="space-y-1.5">
                  {result.good.map((g,i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-accent mt-0.5">•</span>{g}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!!(result.improve || []).length && (
              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500"/>Work on this
                </div>
                <ul className="space-y-1.5">
                  {result.improve.map((g,i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>{g}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
