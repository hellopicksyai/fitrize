import { useRef, useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanLine, Loader2, Upload, Camera, Check, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const fileToB64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(",")[1]);
  r.onerror = rej;
  r.readAsDataURL(file);
});

const HINTS = {
  Front: "Face the camera, arms slightly out",
  Side: "Turn 90° sideways, stand relaxed",
  Back: "Face away from the camera",
};

// A real in-app camera modal — works on desktop (webcam) and mobile.
function CameraModal({ label, onCapture, onClose }) {
  const videoRef = useRef();
  const streamRef = useRef();
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState("environment");
  const [error, setError] = useState("");

  const openCamera = async (mode) => {
    // stop any existing stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode }, audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
      }
      setReady(true);
      setError("");
    } catch (e) {
      setError("Couldn't access the camera. Check browser permissions, or use Upload instead.");
    }
  };

  useEffect(() => {
    openCamera(facing);
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flip = () => {
    const next = facing === "environment" ? "user" : "environment";
    setFacing(next);
    openCamera(next);
  };

  const snap = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d").drawImage(v, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${label}.jpg`, { type: "image/jpeg" });
        onCapture(file);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        onClose();
      }
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur grid place-items-center p-4" data-testid="camera-modal">
      <div className="bg-card rounded-3xl p-4 w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium">Take {label} photo</div>
          <button onClick={() => { streamRef.current?.getTracks().forEach(t=>t.stop()); onClose(); }} data-testid="camera-close"><X className="w-5 h-5"/></button>
        </div>
        <div className="aspect-[3/4] rounded-2xl bg-black overflow-hidden grid place-items-center">
          {error
            ? <div className="text-sm text-muted-foreground text-center px-6">{error}</div>
            : <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />}
        </div>
        {!error && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button variant="outline" size="icon" className="rounded-full" onClick={flip} data-testid="camera-flip"><RotateCcw className="w-4 h-4"/></Button>
            <Button onClick={snap} disabled={!ready} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold px-8" data-testid="camera-snap">
              <Camera className="w-4 h-4 mr-1"/> Capture
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

const Slot = ({ label, preview, onPick, testid }) => {
  const uploadRef = useRef();
  const [showCam, setShowCam] = useState(false);
  return (
    <Card className="p-4 rounded-2xl text-center glass glow-hover" data-testid={testid}>
      <div className="text-xs text-accent uppercase tracking-widest mb-1">{label}</div>
      <div className="text-[10px] text-muted-foreground mb-2">{HINTS[label]}</div>
      <div className="aspect-[3/4] rounded-xl bg-secondary grid place-items-center overflow-hidden relative">
        {preview
          ? <><img src={preview} alt="" className="w-full h-full object-cover"/>
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent grid place-items-center"><Check className="w-4 h-4 text-accent-foreground"/></div></>
          : <ScanLine className="w-8 h-8 text-muted-foreground"/>}
      </div>

      <input ref={uploadRef} type="file" accept="image/*" className="hidden"
        onChange={e=>{ const f = e.target.files?.[0]; if (f) onPick(f); e.target.value=""; }}/>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <Button variant="outline" className="rounded-full" onClick={()=>uploadRef.current.click()} data-testid={`${testid}-upload`}>
          <Upload className="w-3.5 h-3.5 mr-1"/>Upload
        </Button>
        <Button variant="outline" className="rounded-full" onClick={()=>setShowCam(true)} data-testid={`${testid}-camera`}>
          <Camera className="w-3.5 h-3.5 mr-1"/>Camera
        </Button>
      </div>

      {showCam && <CameraModal label={label} onCapture={onPick} onClose={()=>setShowCam(false)} />}
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
        <p className="text-sm text-muted-foreground mt-1">Add 3 photos (Front, Side, Back) — upload from your gallery or take them with your camera. We estimate body fat, posture, symmetry & focus areas.</p>
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
