import { useState } from 'react';

// "Questions" tab: short, honest answers to what judges, pantries and donors usually ask.
// Each card shows a one-line answer; "More" opens a few supporting points.
// These are plans and reasoning, not tested facts. Edit the text here to match what the team will say out loud.
const TOPICS = [
  { id: 'money', label: 'Money' },
  { id: 'donors', label: 'Donors' },
  { id: 'trust', label: 'Trust' },
  { id: 'partners', label: 'Partners' },
  { id: 'limits', label: 'Limits' },
];

const QUESTIONS = [
  {
    topic: 'money',
    q: 'How does this keep running if usage drops?',
    a: 'It costs little when quiet, and income doesn’t depend only on donations.',
    more: [
      'No warehouse, trucks or inventory. Farms deliver and the platform is software.',
      'Income from food bank plans, local sponsors and food-access grants.',
      'Pantries can still buy from farms with their own budget, no donors needed.',
    ],
  },
  {
    topic: 'money',
    q: 'Who would pay for it?',
    a: 'Never pantries. The networks and sponsors who gain from coordination would.',
    more: [
      'Food banks: matching, tracking and confirmed-pound reports in one place.',
      'Sponsors: a specific result to point to, not a logo on a banner.',
    ],
    note: 'We haven’t tested pricing with anyone yet.',
  },
  {
    topic: 'donors',
    q: 'Why donate here instead of a food bank or GoFundMe?',
    a: 'You fund one specific, local need, and it only counts once the pantry confirms it.',
    more: [
      'Small goals that actually finish, like “150 lbs of roots for Decatur”.',
      'Built for frequent, time-sensitive food orders, not one-off campaigns.',
      'No donor leaderboard. Milestones celebrate the community.',
    ],
  },
  {
    topic: 'donors',
    q: 'Where does my money go? Is it tax-deductible?',
    a: 'Through a registered nonprofit partner, never through us. See the Money tab.',
    more: [
      'The partner holds pledges and pays the farm once delivery is confirmed.',
      'That set-up is what could make gifts deductible.',
    ],
    note: 'None of this is set up yet. Every pledge here is simulated.',
  },
  {
    topic: 'trust',
    q: 'How do you know the food arrived?',
    a: 'Only the pantry can mark it delivered, with the pounds it actually received.',
    more: [
      'Impact counts confirmed pounds only, never pledges.',
      'Next: the farm confirms too, and any mismatch is flagged for review.',
    ],
  },
  {
    topic: 'trust',
    q: 'What stops fake requests or fraud?',
    a: 'Only vetted organizations take part, and money never goes to an individual.',
    more: [
      'Funds sit with the nonprofit partner and pay out for confirmed deliveries.',
      'Limits on request size and frequency; unusual patterns go to a person.',
    ],
  },
  {
    topic: 'partners',
    q: 'Who delivers the food?',
    a: 'The farm, and every goal includes the cost of the trip.',
    more: ['Matches favor nearby farms, which keeps trips short.'],
    note: 'The delivery cost ($10 + $2.50 a mile) is an assumption a pilot would test.',
  },
  {
    topic: 'partners',
    q: 'What about food safety?',
    a: 'The pantry decides what it accepts, as with any donated produce.',
    more: [
      'Fresh produce only: no meat, dairy or cooked food.',
      'The pantry can record fewer pounds or reject a delivery.',
    ],
    note: 'We’d follow a food bank’s handling rules; we haven’t worked through them yet.',
  },
  {
    topic: 'partners',
    q: 'Why would farms take part?',
    a: 'A fair, locked-in price for surplus, with delivery paid for.',
    more: ['Orders are small and nearby. Farms can also donate surplus and just get the delivery funded.'],
    note: 'We haven’t talked to farms yet.',
  },
  {
    topic: 'partners',
    q: 'Isn’t this already being done?',
    a: 'Parts of it are. We join them into one workflow and want to work alongside those groups.',
    more: ['Our addition: a specific shortage, an explained farm match, community funding and a confirmed delivery.'],
  },
  {
    topic: 'partners',
    q: 'What if pantry staff aren’t comfortable with apps?',
    a: 'Plain map view, larger text, and requests typed the way you’d say them.',
    more: ['A food bank coordinator could also post on a pantry’s behalf.'],
  },
  {
    topic: 'limits',
    q: 'What doesn’t work yet?',
    a: 'This is a demo: sample data, no accounts, no database, no real payments.',
    more: [
      'Distances are straight-line and the road map is simplified.',
      'The request reader is keyword matching, not AI.',
      'Next: a pilot with one pantry network, real accounts and driving routes.',
    ],
  },
];

export const QUESTION_COUNT = QUESTIONS.length;

const labelOf = Object.fromEntries(TOPICS.map((t) => [t.id, t.label]));

export default function QuestionsView() {
  const [topic, setTopic] = useState('all');
  const [open, setOpen] = useState(null); // the question whose details are showing
  const shown = topic === 'all' ? QUESTIONS : QUESTIONS.filter((x) => x.topic === topic);

  return (
    <section className="impact faq" aria-label="Hard questions">
      <header className="faq-head">
        <h2>Hard questions</h2>
        <p className="muted">Straight answers. These are our plans, not yet tested with real pantries, farms or donors.</p>
      </header>

      <div className="faq-filters" role="group" aria-label="Filter by topic">
        {[{ id: 'all', label: 'All' }, ...TOPICS].map((t) => {
          const n = t.id === 'all' ? QUESTIONS.length : QUESTIONS.filter((x) => x.topic === t.id).length;
          return (
            <button
              key={t.id}
              className={topic === t.id ? 'faq-chip on' : 'faq-chip'}
              aria-pressed={topic === t.id}
              onClick={() => {
                setTopic(t.id);
                setOpen(null);
              }}
            >
              {t.label}
              <span className="faq-count">{n}</span>
            </button>
          );
        })}
      </div>

      <ul className="faq-grid" key={topic}>
        {shown.map((it, i) => {
          const isOpen = open === it.q;
          const id = `faq-${QUESTIONS.indexOf(it)}`;
          return (
            <li key={it.q} className={isOpen ? 'faq-card is-open' : 'faq-card'} style={{ animationDelay: `${i * 0.03}s` }}>
              <p className="faq-topic">
                <svg viewBox="-10 -10 20 20" aria-hidden="true">
                  <polygon points="0,-9 2.6,-2.6 9,-2.6 3.9,1.6 5.7,8.5 0,4.4 -5.7,8.5 -3.9,1.6 -9,-2.6 -2.6,-2.6" />
                </svg>
                {labelOf[it.topic]}
              </p>
              <h3 className="faq-q">{it.q}</h3>
              <p className="faq-a">{it.a}</p>
              {isOpen && (
                <div className="faq-more" id={id}>
                  <ul>
                    {it.more.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  {it.note && (
                    <p className="faq-note">
                      <strong>Honest note:</strong> {it.note}
                    </p>
                  )}
                </div>
              )}
              <button className="faq-toggle" aria-expanded={isOpen} aria-controls={isOpen ? id : undefined} onClick={() => setOpen(isOpen ? null : it.q)}>
                {isOpen ? 'Less' : 'More'}
                <span className="faq-chev" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
