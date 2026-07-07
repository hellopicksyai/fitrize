import { useEffect, useRef, useState } from "react";

// Premium animated progress ring: sweeps on mount, soft glow, gradient stroke.
// Backwards-compatible with existing props (value, max, size, stroke, color, track, label, sublabel, testid).
export default function ProgressRing({
  value = 0, max = 100, size = 140, stroke = 10,
  color = "#39FF14", track = "hsl(var(--muted))", label, sublabel, testid, glow = true,
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const targetPct = Math.max(0, Math.min(1, max ? value / max : 0));
  const [pct, setPct] = useState(0);
  const raf = useRef();

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setPct(targetPct); return; }
    const from = pct;
    const start = performance.now();
    const dur = 900;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setPct(from + (targetPct - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPct]);

  const dash = c * pct;
  const gid = `ring-grad-${testid || Math.round(size)}`;

  return (
    <div className="relative grid place-items-center" data-testid={testid} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={`url(#${gid})`} strokeWidth={stroke} strokeLinecap="round" fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          style={glow ? { filter: `drop-shadow(0 0 6px ${color}66)` } : undefined}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="display text-3xl leading-none">{label}</div>
          {sublabel && <div className="text-xs text-muted-foreground mt-1">{sublabel}</div>}
        </div>
      </div>
    </div>
  );
}
