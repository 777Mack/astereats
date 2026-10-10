import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/motion.js';

// Follows the element the current step points at (it moves while panels animate or the page scrolls).
function useTargetRect(selector, stepKey) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    let raf = 0;
    let last = '';
    let scrolled = false;
    const t0 = performance.now();
    const loop = () => {
      const el = selector ? document.querySelector(selector) : null;
      let next = null;
      if (el) {
        if (!scrolled && performance.now() - t0 > 400) {
          scrolled = true;
          if (el.scrollIntoView) {
            el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
          }
        }
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          next = { x: r.left, y: r.top, w: r.width, h: r.height, round: el.tagName.toLowerCase() === 'circle' };
        }
      }
      const key = next ? `${Math.round(next.x)},${Math.round(next.y)},${Math.round(next.w)},${Math.round(next.h)}` : '';
      if (key !== last) {
        last = key;
        setRect(next);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [selector, stepKey]);
  return rect;
}

export default function Tour({ steps, index, playing, wide, onNext, onBack, onExit, onReplay, onSetPlaying }) {
  const step = steps[index];
  const last = index === steps.length - 1;
  const rect = useTargetRect(step.target, index);

  // Always call the latest handlers from timers and key presses
  const latest = useRef({});
  latest.current = { onNext, onBack, onExit };

  const nextBtn = useRef(null);
  useEffect(() => {
    nextBtn.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target && e.target.closest && e.target.closest('input, textarea, select')) return;
      if (e.key === 'Escape') latest.current.onExit();
      else if (e.key === 'ArrowRight') latest.current.onNext();
      else if (e.key === 'ArrowLeft') latest.current.onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Auto-play: move on after enough time to read the step, then stop at the end
  useEffect(() => {
    if (!playing) return undefined;
    if (last) {
      onSetPlaying(false);
      return undefined;
    }
    const ms = 3500 + step.text.length * 30;
    const t = setTimeout(() => latest.current.onNext(), ms);
    return () => clearTimeout(t);
  }, [playing, index, last, step.text.length, onSetPlaying]);

  return (
    <>
      {rect && (
        <div
          className={`tour-spot${rect.round ? ' tour-spot-round' : ''}`}
          aria-hidden="true"
          style={{ left: rect.x - 7, top: rect.y - 7, width: rect.w + 14, height: rect.h + 14 }}
        />
      )}
      <section
        className={`tour${wide ? ' tour-wide' : ''}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        aria-describedby="tour-text"
      >
        <div className="tour-top">
          <span className="tour-count">
            Step {index + 1} of {steps.length}
          </span>
          <button className="tour-x" onClick={onExit} aria-label="Exit the tour">
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <h2 id="tour-title">{step.title}</h2>
        <p id="tour-text" aria-live="polite">
          {step.text}
        </p>
        <div className="tour-dots" aria-hidden="true">
          {steps.map((s, i) => (
            <span key={s.id} className={i === index ? 'on' : i < index ? 'done' : ''} />
          ))}
        </div>
        <div className="tour-actions">
          <button className="btn btn-ghost" onClick={onBack} disabled={index === 0}>
            Back
          </button>
          <button ref={nextBtn} className="btn btn-primary" onClick={last ? onExit : onNext}>
            {last ? 'Explore on your own' : index === 0 ? 'Start the tour' : 'Next'}
          </button>
          {last ? (
            <button className="btn btn-ghost" onClick={onReplay}>
              Replay
            </button>
          ) : (
            <button className="btn btn-ghost" aria-pressed={playing} onClick={() => onSetPlaying(!playing)}>
              {playing ? 'Pause' : 'Auto-play'}
            </button>
          )}
        </div>
      </section>
    </>
  );
}
