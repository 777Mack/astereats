import { useRef } from 'react';

// "Money & terms" tab: what happens to a donor's money, and the draft rules a farm agrees to before it can be matched.
// These are plans for a real version, not features of this demo, and the page says so. Edit the text here.
// The numbers in the draft terms (25%, 3 days, 14 days) are placeholders for the team to settle.
const SECTIONS = [
  {
    title: 'What happens to your money',
    items: [
      {
        q: 'When does my pledge actually leave my account?',
        lead: 'In a real version, nothing is paid out until the goal is fully reached.',
        points: [
          'A pledge toward a request that has not reached its goal is held, not spent. If the goal is never reached, pledges are returned.',
          'Once the goal is reached, the money is held by a registered nonprofit partner, not by this app and not by the farm.',
          'The farm and the driver are paid out of that held money once the pantry confirms what it received.',
        ],
      },
      {
        q: 'What if the food never arrives?',
        lead: 'Donors are refunded automatically if the pantry does not confirm delivery in time.',
        points: [
          'Each request gets a confirmation window after the farm’s ready time (placeholder: 14 days).',
          'If the pantry has not confirmed by then, every donor is refunded in full, with no form to fill in.',
          'If the pantry confirms fewer pounds than planned, only the confirmed share is paid out and the rest goes back to donors.',
        ],
      },
      {
        q: 'What if something else goes wrong?',
        lead: 'Here is who holds the risk, in plain terms.',
        points: [
          'Farm cannot deliver: the request goes back to open, nothing is paid, and donors can keep their pledge toward a new match or take it back.',
          'Delivery costs more than planned: see the price rules below. Increases never fall on donors after a request is funded.',
          'Platform shuts down: money held by the nonprofit partner is returned to donors. That is a reason the money never sits with us.',
          'Honest note: none of this is built or legally set up. A nonprofit partner and a payment provider would have to be in place first.',
        ],
      },
      {
        q: 'Is anything in this demo real money?',
        lead: 'No.',
        points: [
          'Every pledge, goal and delivery here is simulated, and no payment details are collected anywhere in the app.',
          'Do not read the amounts as quotes. They come from sample data and rough assumptions.',
        ],
      },
    ],
  },
  {
    title: 'Farm agreement (draft terms)',
    items: [
      {
        q: 'Are prices locked once a farm is matched?',
        lead: 'Yes. A farm agrees to its terms before it appears on the map, and the price is fixed at match time.',
        points: [
          'The produce price per pound shown when a request is matched is the price for that request. It cannot be raised afterward.',
          'A funded request is never repriced. Donors who completed a goal are not asked for more.',
          'A farm that wants to change its standing prices can do so for future requests, with notice, not for ones already matched.',
        ],
      },
      {
        q: 'What about rising gas or delivery costs?',
        lead: 'Only the delivery part can change, only for a documented reason, and only before the goal is reached.',
        points: [
          'Trigger (placeholder): average diesel price more than 25% above its level on the day of the match, using a public published index.',
          'Scope: only the delivery line of the goal may be adjusted. The produce price stays locked.',
          'Notice: donors and the pantry see the new goal and the reason before it takes effect. The pantry can rematch to another farm.',
          'Fairness: the same rule works downward. If fuel prices fall by the same margin, the delivery line comes down too.',
          'Honest note: this follows common practice in supply contracts (fuel surcharges and price-adjustment clauses), but we have not had these terms reviewed by a lawyer or tested with farms.',
        ],
      },
      {
        q: 'What else does a farm agree to?',
        lead: 'A short list, in plain language.',
        points: [
          'Supply what it listed, at the stated quality, by the ready time it gave.',
          'Deliver (or arrange delivery) to the pantry address on the request.',
          'Accept that only pounds the pantry confirms are paid for.',
          'Register with a business email and a location, and be reviewed before it can be matched.',
        ],
      },
    ],
  },
];

export default function MoneyView({ onJoin }) {
  const listRef = useRef(null);
  const setAll = (open) => {
    listRef.current?.querySelectorAll('details').forEach((d) => {
      d.open = open;
    });
  };

  return (
    <section className="impact questions" aria-label="Money and terms">
      <div className="q-head">
        <div>
          <h2>Your money and the rules</h2>
          <p className="muted">
            How pledges would be held and paid out, and the draft terms a farm agrees to. These are plans for a real
            version, not legal terms. Nothing here is live, and no real money moves in this demo.
          </p>
        </div>
        <div className="q-tools">
          <button className="btn btn-ghost btn-sm" onClick={() => setAll(true)}>
            Open all
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setAll(false)}>
            Close all
          </button>
        </div>
      </div>

      <div ref={listRef} className="q-list">
        {SECTIONS.map((sec, si) => (
          <div key={sec.title} className="q-section">
            <h3 className="q-section-title">{sec.title}</h3>
            {sec.items.map((it, ii) => (
              <details key={it.q} className="q-item" open={si === 0 && ii < 2}>
                <summary>
                  <span>{it.q}</span>
                  <span className="q-chev" aria-hidden="true" />
                </summary>
                <div className="q-body">
                  <p className="q-lead">{it.lead}</p>
                  <ul>
                    {it.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              </details>
            ))}
          </div>
        ))}
      </div>

      <p className="muted">
        Run a pantry or a farm?{' '}
        <button className="link" onClick={onJoin}>
          Tell us you are interested
        </button>
        .
      </p>
    </section>
  );
}
