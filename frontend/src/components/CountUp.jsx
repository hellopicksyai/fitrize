import { useEffect, useRef, useState } from "react";

// Animated number that rolls up to `value` on mount and whenever value changes.
// Respects prefers-reduced-motion. Drop-in: <CountUp value={1234} />
export default function CountUp({ value = 0, duration = 900, decimals = 0, suffix = "", prefix = "", className = "" }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef();

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const target = Number(value) || 0;
    const from = fromRef.current;
    if (reduce) { setDisplay(target); fromRef.current = target; return; }

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const current = from + (target - from) * eased;
      setDisplay(current);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  const formatted = display.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return <span className={className}>{prefix}{formatted}{suffix}</span>;
}
