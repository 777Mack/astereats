// True when the person's system asks for less motion. Animations are skipped (or shortened to nothing)
// in that case. CSS has a matching `prefers-reduced-motion` block at the end of styles.css.
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
