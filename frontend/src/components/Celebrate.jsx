import { useEffect, useState } from "react";

// Lightweight confetti burst. Render <Celebrate trigger={someBoolean} /> —
// fires once when trigger flips to true. No dependencies.
const COLORS = ["#39FF14", "#007AFF", "#A855F7", "#FF9F0A", "#FF375F"];

export default function Celebrate({ trigger }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!trigger) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const batch = Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      color: COLORS[i % COLORS.length],
      rounded: Math.random() > 0.5,
    }));
    setPieces(batch);
    const t = setTimeout(() => setPieces([]), 3000);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!pieces.length) return null;
  return (
    <>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            borderRadius: p.rounded ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </>
  );
}
