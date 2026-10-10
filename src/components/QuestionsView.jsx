import { useRef } from 'react';

// "Questions" tab: short, honest answers to what judges, pantries and donors usually ask.
// These are plans and reasoning, not tested facts. Edit the text here to match what the team will say out loud.
const SECTIONS = [
  {
    title: 'Money and staying afloat',
    items: [
      {
        q: 'How does this keep running if usage goes down?',
        lead: 'It is built to be cheap when it is quiet, and its income does not depend only on donation volume.',
        points: [
          'Low fixed costs: no warehouse, trucks or inventory. Farms deliver directly and the platform is software, so a slow month costs little.',
          'More than one income source: a paid plan for food banks and pantry networks that coordinate many pantries, local sponsors who cover delivery costs or match donations, and food-access grants.',
          'Donations go to the request, not to us. Any support for the platform would be an optional, clearly labeled tip.',
          'It stays useful without donors: a pantry can buy from a nearby farm with its own budget, and farms that donate surplus only need the delivery covered.',
        ],
      },
      {
        q: 'Who would pay for it, and why?',
        lead: 'Pantries never pay to post a need. The people who benefit from coordination would.',
        points: [
          'Food banks and pantry networks: matching, delivery tracking and confirmed-pound reports in one place could save coordinators time and make grant reporting easier.',
          'Local sponsors: a business gets a specific result to point to ("we covered delivery of 150 lbs of vegetables to Decatur") instead of a logo on a banner.',
          'Honest note: we have not tested pricing with anyone yet. A pilot with one pantry network would tell us what they would pay for.',
        ],
      },
    ],
  },
  {
    title: 'Donors',
    items: [
      {
        q: 'Why donate here instead of a food bank, GoFundMe or another charity app?',
        lead: 'If you already give to your local food bank, that is great. We are not trying to replace it.',
        points: [
          'Specific: you fund one visible need ("150 lbs of root vegetables for Decatur within 48 hours") with a goal small enough to actually finish.',
          'Verified: a request only counts as delivered once the pantry confirms the pounds it received.',
          'Local: the money pays a nearby farm for food grown nearby.',
          'Built for this job: crowdfunding sites are made for one-off campaigns, not small, frequent, time-sensitive food orders that need a farm matched and a delivery confirmed.',
          'No pressure: milestones celebrate the community. There is no donor leaderboard.',
        ],
      },
      {
        q: 'Where does the money go? Is it tax-deductible?',
        lead: 'In a real version, money would go through a registered nonprofit, never through us.',
        points: [
          'The pantry is the buyer. A nonprofit partner (the food bank or a fiscal sponsor) would collect donations and pay the farm and the driver on the pantry’s behalf.',
          'That set-up is what could make gifts deductible. Donations straight to a for-profit farm generally are not.',
          'None of this is set up yet. Every pledge in this demo is simulated and no money moves.',
        ],
      },
    ],
  },
  {
    title: 'Trust',
    items: [
      {
        q: 'How do you know the food actually arrived?',
        lead: 'Only the pantry can mark a request delivered, and it enters the pounds it actually received.',
        points: [
          'The Impact page counts only those confirmed pounds. Pledges alone never count as impact.',
          'Next: the farm confirms the drop-off too, with an optional photo, and any mismatch between the two flags the request for review.',
          'This relies on vetted pantries telling the truth, and we say so openly.',
        ],
      },
      {
        q: 'What stops fake requests or fraud?',
        lead: 'Money never goes to an individual, and only vetted organizations take part.',
        points: [
          'Pantries and farms would be checked before they can post or be matched.',
          'Funds would sit with the nonprofit partner and be paid out for confirmed deliveries.',
          'Request sizes and frequency would have sensible limits, and unusual patterns would go to a person for review.',
        ],
      },
    ],
  },
  {
    title: 'Partners',
    items: [
      {
        q: 'Who actually delivers the food?',
        lead: 'In this plan, the farm delivers, and the request pays for it.',
        points: [
          'Every goal includes a delivery cost, so the farm (or a driver it already uses) is paid for the trip, not just the produce.',
          'Matches favor farms close to the pantry, which keeps trips short.',
          'Honest note: the delivery cost in the demo ($10 plus $2.50 a mile) is an assumption. A pilot would tell us whether farms prefer to deliver themselves or hand off to a courier or volunteers.',
        ],
      },
      {
        q: 'What about food safety?',
        lead: 'The pantry stays in charge of what it accepts, the same as with any donated produce.',
        points: [
          'The demo only handles fresh produce, not meat, dairy or cooked food.',
          'Farms would be vetted before joining, and short, local trips mean less time between harvest and the pantry.',
          'The pantry checks the food on arrival and can record fewer pounds or reject a delivery, and only what it confirms counts.',
          'Honest note: we have not worked through the specific handling rules with a food bank yet. We would follow theirs.',
        ],
      },
      {
        q: 'Why would farms take part?',
        lead: 'They get a fair price for surplus that might otherwise go unsold, and the delivery is paid for.',
        points: [
          'Orders are specific, close by and small, so taking one on is not a big commitment.',
          'Farms that would rather give their surplus away can, and the request then only funds the delivery.',
          'Honest note: we have not talked to farms yet. Prices and pickup windows would need their input.',
        ],
      },
      {
        q: 'Isn’t this already being done?',
        lead: 'Parts of it are, which tells us the problem is real.',
        points: [
          'Existing programs already move surplus farm food to food banks, or help growers find pantries to donate to.',
          'What we add is one workflow: a specific pantry shortage, an explainable farm match, community funding, and a pantry-confirmed delivery.',
          'We would want to work alongside groups like these, not compete with them.',
        ],
      },
      {
        q: 'What about pantry staff who aren’t comfortable with apps?',
        lead: 'The demo is designed to be easy to read and easy to use.',
        points: [
          'Map view shows highways and city names, and "Larger text" makes every label bigger.',
          'A request can be typed the way you would say it ("low on greens, maybe 100 lbs, need it by tomorrow") and the form fills itself in.',
          'A food bank coordinator could also post on a pantry’s behalf.',
        ],
      },
    ],
  },
  {
    title: 'Honest limits',
    items: [
      {
        q: 'What doesn’t work yet?',
        lead: 'This is a demo. Here is exactly what is simulated or simplified.',
        points: [
          'Every pantry, farm, pledge and delivery is sample data. There are no accounts, no database and no real payments.',
          'Distances are straight-line estimates, not driving routes, and the road map is simplified.',
          'The request reader is keyword matching, not AI. A Gemini-powered reader is next, run from a server so no key sits in the browser.',
          'Next steps: a pilot with one pantry network, real accounts, driving distances, and combining several pickups into one route.',
        ],
      },
    ],
  },
];

export const QUESTION_COUNT = SECTIONS.reduce((n, s) => n + s.items.length, 0);

export default function QuestionsView() {
  const listRef = useRef(null);
  const setAll = (open) => {
    listRef.current?.querySelectorAll('details').forEach((d) => {
      d.open = open;
    });
  };

  return (
    <section className="impact questions" aria-label="Hard questions">
      <div className="q-head">
        <div>
          <h2>Hard questions</h2>
          <p className="muted">
            Straight answers to what judges, pantries and donors usually ask. These are our plans and reasoning. None of
            it has been tested with real pantries, farms or donors yet.
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
              <details key={it.q} className="q-item" open={si === 0 && ii === 0}>
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
    </section>
  );
}
