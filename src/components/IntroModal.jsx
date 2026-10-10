import { useEffect, useRef, useState } from 'react';
import { APP_NAME } from '../config.js';
import { prefersReducedMotion } from '../lib/motion.js';

// ---- All the words on this popup live here, so you can edit them without touching the layout. ----
// Keep it honest: no real partners, no results we can't back up, every number sourced, and the sample-data note stays.

// First screen (kept short on purpose)
const HEADLINE = 'Your pantry asks. The community answers.';
const SUBHEAD =
  'Post what your pantry needs, and we find a nearby farm and rally neighbors to fund the delivery. Extra support, without the extra work.';

const DIFF_TITLE = 'Why it’s different';
const DIFFS = [
  {
    title: 'It starts from your need',
    text: 'Many donation tools begin with what a farm has on hand. We begin with what your pantry actually needs, and how soon.',
  },
  {
    title: 'Every match comes with a reason',
    text: 'No black box. Each farm is scored out of 100 on supply, distance, timing and cost, and explained in plain words.',
  },
  {
    title: 'Neighbors fund it together',
    text: 'Small pledges cover the produce and the delivery. Milestones celebrate the community, and there is no donor leaderboard.',
  },
  {
    title: 'Only real deliveries count',
    text: 'A delivery counts once your pantry confirms the pounds it received, so our impact numbers are never inflated by pledges alone.',
  },
];

const SAMPLE_NOTE = 'Hackathon prototype: all pantries, farms, pledges and deliveries are sample data. No payments are real.';

// Behind the "Read more" button
const WHY_TITLE = 'Less to manage. More support.';
const WHY_TEXT =
  'Running your own donation process is hard to organize and even harder to account for. With ' +
  `${APP_NAME}, a nonprofit pantry posts what it needs and we handle the matching and the community funding, ` +
  'so you get extra support without extra work.';

const STEPS_TITLE = 'How it works';
const STEPS = [
  { name: 'Ask', text: 'Post what you need in one sentence' },
  { name: 'Match', text: 'We rank nearby farms, with reasons' },
  { name: 'Fund', text: 'Neighbors chip in toward the cost' },
  { name: 'Confirm', text: 'Your pantry confirms what arrived' },
];

const FACTS_TITLE = 'The need, in numbers';
const FACTS = [
  {
    big: 'Nearly 48 million',
    text: 'people in the U.S. experienced food insecurity in 2024, including 14 million children.',
    source: 'USDA',
  },
  {
    big: '1 in 6',
    text: 'people in Georgia experienced food insecurity in 2024, including 1 in 5 children.',
    source: 'Feeding America, Map the Meal Gap',
  },
  {
    big: '30–40%',
    text: 'of the U.S. food supply is estimated to go to waste.',
    source: 'USDA',
  },
];
const FACTS_CLOSE = 'The food exists, and so does the need. What is missing is the connection.';

export default function IntroModal({ onClose, onTour }) {
  const dialogRef = useRef(null);
  const tourBtn = useRef(null);
  const moreRef = useRef(null);
  const [more, setMore] = useState(false);

  // Always call the latest handler without re-running the focus setup below
  const latest = useRef(onClose);
  latest.current = onClose;

  useEffect(() => {
    const before = document.activeElement;
    // preventScroll: the button sits at the bottom, and scrolling to it would hide the headline
    tourBtn.current?.focus({ preventScroll: true });
    if (dialogRef.current) dialogRef.current.scrollTop = 0;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        latest.current();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      // Keep Tab inside the popup while it is open
      const nodes = dialogRef.current.querySelectorAll('button:not(:disabled), [href], input, select, textarea');
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      before?.focus?.();
    };
  }, []);

  // When "Read more" opens, bring the new section into view
  useEffect(() => {
    if (!more || !moreRef.current || !moreRef.current.scrollIntoView) return;
    moreRef.current.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [more]);

  return (
    <div className="modal-backdrop welcome-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section
        ref={dialogRef}
        className="modal welcome"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-sub"
      >
        <button className="welcome-x" onClick={onClose} aria-label="Close and explore">
          <span aria-hidden="true">✕</span>
        </button>

        <header className="welcome-hero">
          <span className="welcome-eyebrow">{APP_NAME} · Metro Atlanta</span>
          <h2 id="welcome-title">{HEADLINE}</h2>
          <p id="welcome-sub" className="welcome-sub">
            {SUBHEAD}
          </p>
        </header>

        <h3 className="welcome-diff-title">{DIFF_TITLE}</h3>
        <ul className="welcome-diffs">
          {DIFFS.map((d) => (
            <li key={d.title}>
              <strong>{d.title}</strong>
              <span>{d.text}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="welcome-more-toggle"
          aria-expanded={more}
          aria-controls="welcome-more"
          onClick={() => setMore((v) => !v)}
        >
          {more ? 'Show less' : 'Read more'} <span aria-hidden="true">{more ? '▴' : '▾'}</span>
        </button>

        <div id="welcome-more" ref={moreRef} className="welcome-more" hidden={!more}>
          <div className="welcome-why">
            <h3>{WHY_TITLE}</h3>
            <p>{WHY_TEXT}</p>
          </div>

          <h3 className="welcome-h">{STEPS_TITLE}</h3>
          <ol className="welcome-steps">
            {STEPS.map((s, i) => (
              <li key={s.name}>
                <span className="welcome-step-n" aria-hidden="true">
                  {i + 1}
                </span>
                <strong>{s.name}</strong>
                <span>{s.text}</span>
              </li>
            ))}
          </ol>

          <h3 className="welcome-h">{FACTS_TITLE}</h3>
          <ul className="welcome-facts">
            {FACTS.map((f) => (
              <li key={f.big}>
                <strong>{f.big}</strong>
                <span>{f.text}</span>
                <em>Source: {f.source}</em>
              </li>
            ))}
          </ul>
          <p className="welcome-close">{FACTS_CLOSE}</p>
        </div>

        <p className="welcome-note">{SAMPLE_NOTE}</p>

        <div className="welcome-actions">
          <button ref={tourBtn} className="btn btn-primary" onClick={onTour}>
            Take the guided tour
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Explore on my own
          </button>
        </div>
      </section>
    </div>
  );
}
