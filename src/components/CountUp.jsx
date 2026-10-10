import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/motion.js';

// Shows a whole number that eases toward `value` whenever it changes.
// fromZero: also count up from 0 the first time it appears (used for score and impact tiles).
// With reduced motion on, it simply shows the final number.
export default function CountUp({ value, fromZero = false, duration = 700 }) {
  const [shown, setShown] = useState(fromZero && !prefersReducedMotion() ? 0 : value);
  const shownRef = useRef(shown);

  useEffect(() => {
    if (prefersReducedMotion()) {
      shownRef.current = value;
      setShown(value);
      return undefined;
    }
    const from = shownRef.current;
    if (from === value) return undefined;
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out
      const v = p >= 1 ? value : from + (value - from) * eased;
      shownRef.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{Math.round(shown)}</>;
}
