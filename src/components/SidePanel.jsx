import { useState } from 'react';
import { labelFor } from '../lib/categories.js';
import { formatHours, MILESTONES } from '../lib/match.js';
import CountUp from './CountUp.jsx';

const STATUS_LABEL = {
  open: 'Needs a match',
  matched: 'Funding open',
  funded: 'Awaiting delivery',
  partial: 'Partly delivered',
  delivered: 'Delivered',
};

const money = (n) => `$${Math.round(n)}`;

export function StatusPill({ status }) {
  return <span className={`pill pill-${status}`}>{STATUS_LABEL[status]}</span>;
}

function RequestHeader({ request, pantry }) {
  const urgent = request.deadlineHours <= 12 && request.status !== 'delivered';
  return (
    <header className="req-head" data-tour="req-head">
      <p className="eyebrow">{pantry.name}</p>
      <h2>
        Needs {request.lbsNeeded} lbs of {labelFor(request.category).toLowerCase()}
      </h2>
      <div className="chips">
        <StatusPill status={request.status} />
        <span className="chip">Within {formatHours(request.deadlineHours)}</span>
        {urgent && <span className="badge-urgent">Urgent</span>}
      </div>
    </header>
  );
}

function FarmCard({ ev, rank, onChoose, onHover }) {
  const { farm } = ev;
  return (
    <li
      data-tour={rank === 0 ? 'top-farm' : undefined}
      className={`card farm-card${ev.eligible ? '' : ' is-ineligible'}${rank === 0 ? ' is-top' : ''}`}
      onMouseEnter={() => onHover(farm.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(farm.id)}
      onBlur={() => onHover(null)}
    >
      <div className="farm-card-head">
        <div>
          <h3>
            {farm.name}
            {rank === 0 && <span className="best"> · Best fit</span>}
          </h3>
          <p className="muted">
            {farm.area} · {farm.mode === 'donate' ? 'Donates surplus' : 'Sells at cost'}
          </p>
        </div>
        {ev.eligible && (
          <div className="score" aria-label={`Fit score ${ev.score} out of 100`}>
            <span className="score-num">
              <CountUp value={ev.score} fromZero duration={600} />
            </span>
            <span className="score-of">/100</span>
          </div>
        )}
      </div>

      <ul className="reasons">
        {ev.reasons.map((r) => (
          <li key={r}>
            <span aria-hidden="true" className={ev.eligible ? 'tick-ok' : 'tick-no'}>
              {ev.eligible ? '✓' : '×'}
            </span>
            {r}
          </li>
        ))}
      </ul>

      {ev.eligible && (
        <>
          <div className="cost-row">
            <span className="chip">Produce {money(ev.produceCost)}</span>
            <span className="chip">Delivery {money(ev.transportCost)}</span>
            <span className="chip chip-strong">Goal {money(ev.total)}</span>
          </div>
          <button className="btn btn-primary" onClick={() => onChoose(farm.id)}>
            Match with {farm.name}
          </button>
        </>
      )}
    </li>
  );
}

function StardustMeter({ pledged, goal }) {
  const frac = goal > 0 ? Math.min(1, pledged / goal) : 0;
  return (
    <div className="stardust" data-tour="meter">
      <div className="stardust-top">
        <span className="stardust-label">Stardust meter</span>
        <span className="stardust-num">
          $<CountUp value={pledged} /> <span className="muted">of {money(goal)}</span>
        </span>
      </div>
      <div
        className="meter"
        role="progressbar"
        aria-label="Stardust meter, community funding progress"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={pledged}
      >
        <div className="meter-fill" style={{ width: `${frac * 100}%` }} />
        {MILESTONES.slice(0, 3).map((m) => (
          <span key={m.label} className="meter-tick" style={{ left: `${m.at * 100}%` }} />
        ))}
      </div>
      <ul className="milestones" aria-label="Community milestones">
        {MILESTONES.map((m) => (
          <li
            key={m.label}
            className={frac >= m.at ? 'on' : ''}
            aria-label={`${m.label}, ${Math.round(m.at * 100)} percent, ${frac >= m.at ? 'reached' : 'not yet'}`}
            title={`${Math.round(m.at * 100)}% funded`}
          >
            <span aria-hidden="true">{frac >= m.at ? '★' : '☆'}</span> {m.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FarmSummary({ farm, request }) {
  return (
    <div className="card farm-summary">
      <p className="eyebrow">Matched farm</p>
      <h3>{farm.name}</h3>
      <p className="muted">
        {farm.area} · {farm.mode === 'donate' ? 'Donates surplus' : 'Sells at cost'} ·{' '}
        {request.lbsPlanned} lbs planned
      </p>
      <div className="cost-row">
        <span className="chip">Produce {money(request.produceCost)}</span>
        <span className="chip">Delivery {money(request.transportCost)}</span>
        <span className="chip chip-strong">Goal {money(request.goal)}</span>
      </div>
    </div>
  );
}

function FundingCard({ request, onPledge }) {
  const remaining = Math.max(0, request.goal - request.pledged);
  const options = [5, 10, 25].filter((a) => a < remaining);
  const [custom, setCustom] = useState('');
  const amount = Math.floor(Number(custom));
  const customOk = custom !== '' && amount >= 1 && amount <= Math.ceil(remaining);
  const pledgeCustom = (e) => {
    e.preventDefault();
    if (!customOk) return;
    onPledge(amount);
    setCustom('');
  };
  return (
    <div className="card">
      <StardustMeter pledged={request.pledged} goal={request.goal} />
      <p className="muted small">
        {request.pledgeCount} community pledge{request.pledgeCount === 1 ? '' : 's'} so far. We celebrate completed
        requests, not the biggest donor.
      </p>
      <div className="pledge-row">
        {options.map((a) => (
          <button key={a} className="btn btn-ghost" onClick={() => onPledge(a)}>
            Pledge {money(a)}
          </button>
        ))}
        <button className="btn btn-primary" onClick={() => onPledge(remaining)}>
          {options.length ? `Cover the rest (${money(remaining)})` : `Pledge ${money(remaining)} to finish`}
        </button>
      </div>
      <form className="pledge-custom" onSubmit={pledgeCustom}>
        <label className="pledge-input">
          <span aria-hidden="true">$</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max={Math.ceil(remaining)}
            step="1"
            placeholder="Other amount"
            aria-label={`Custom pledge in dollars, up to ${money(remaining)}`}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-ghost" disabled={!customOk}>
          Pledge{customOk ? ` ${money(amount)}` : ''}
        </button>
      </form>
      {custom !== '' && !customOk && (
        <p className="note" role="status">
          Enter a whole amount from $1 to {money(remaining)}.
        </p>
      )}
      <p className="note">
        Simulated pledges for the demo. No real payment is taken. In a real version, pledges are held until the goal is
        reached and refunded if delivery is not confirmed (see the Money tab).
      </p>
    </div>
  );
}

// Second meter: pounds the pantry has confirmed, out of what the farm planned to send.
export function ShipmentMeter({ delivered, planned }) {
  const frac = planned > 0 ? Math.min(1, delivered / planned) : 0;
  return (
    <div className="ship-meter">
      <div className="ship-head">
        <span className="ship-title">Shipment confirmed</span>
        <span className="ship-amount">
          {delivered} <span className="muted">of {planned} lbs</span>
        </span>
      </div>
      <div
        className={frac >= 1 ? 'ship-bar is-full' : 'ship-bar'}
        role="progressbar"
        aria-label="Pounds confirmed by the pantry"
        aria-valuemin={0}
        aria-valuemax={planned}
        aria-valuenow={delivered}
      >
        <span style={{ width: `${frac * 100}%` }} />
      </div>
    </div>
  );
}

function DeliveryCard({ request, farm, onConfirm, onCloseOut }) {
  const left = request.lbsPlanned - request.deliveredLbs;
  const [lbs, setLbs] = useState(left);
  const valid = Number.isFinite(lbs) && lbs > 0 && lbs <= left;
  const partial = request.deliveredLbs > 0;
  return (
    <div className="card">
      <StardustMeter pledged={request.pledged} goal={request.goal} />
      <ShipmentMeter delivered={request.deliveredLbs} planned={request.lbsPlanned} />
      <div className="delivery">
        <h3>{partial ? `${left} lbs still on the way from ${farm.name}.` : `Funded. ${farm.name} is on the way.`}</h3>
        <p className="muted">
          {partial
            ? 'The planet fills with gold as pounds are confirmed, and turns fully gold once the whole shipment arrives.'
            : 'Delivery only counts once the pantry confirms what actually arrived. Shipments can come in parts.'}
        </p>
        <label className="field">
          <span>Pounds received in this shipment (pantry confirms)</span>
          <input
            type="number"
            min="1"
            max={left}
            value={Number.isFinite(lbs) ? lbs : ''}
            onChange={(e) => setLbs(e.target.value === '' ? NaN : Number(e.target.value))}
          />
        </label>
        <button className="btn btn-primary" disabled={!valid} onClick={() => onConfirm(lbs)}>
          {valid && lbs === left ? 'Confirm: shipment complete' : 'Confirm this shipment'}
        </button>
        {partial && (
          <button className="btn btn-ghost" onClick={onCloseOut}>
            Farm can’t send more: close at {request.deliveredLbs} lbs
          </button>
        )}
        <p className="note">
          Simulated pantry confirmation for the demo.{partial ? ' Closing early would return the unspent share to donors.' : ''}
        </p>
      </div>
    </div>
  );
}

function DeliveredCard({ request, farm }) {
  const short = request.deliveredLbs < request.lbsPlanned;
  return (
    <div className="card card-done">
      <p className="eyebrow">{short ? `Closed short: ${request.deliveredLbs} of ${request.lbsPlanned} lbs` : 'Verified by the pantry'}</p>
      <h3>
        {request.deliveredLbs} lbs of {labelFor(request.category).toLowerCase()} delivered
      </h3>
      <p className="muted">
        From {farm.name}, funded by {request.pledgeCount} community pledge{request.pledgeCount === 1 ? '' : 's'} (
        {money(request.goal)} total).
      </p>
      <StardustMeter pledged={request.pledged} goal={request.goal} />
      <ShipmentMeter delivered={request.deliveredLbs} planned={request.lbsPlanned} />
    </div>
  );
}

export default function SidePanel({
  pantry,
  request,
  farms,
  ranking,
  onChoose,
  onPledge,
  onConfirm,
  onCloseOut,
  onHoverFarm,
  onNewRequest,
}) {
  if (!pantry) {
    return (
      <aside className="panel" aria-label="Details">
        <div className="panel-stack" key="intro">
        <div className="card intro">
          <h2>Read the sky</h2>
          <ul className="legend">
            <li>
              <span className="legend-planet" aria-hidden="true" /> <strong>Planet</strong> = a food pantry. Pick one.
            </li>
            <li>
              <span className="legend-star" aria-hidden="true">★</span> <strong>Star</strong> = a local farm. Click one to see what it has.
            </li>
            <li>
              <span className="legend-ring" aria-hidden="true" /> <strong>Gold ring</strong> = stardust meter (funding).
            </li>
            <li>
              <span className="legend-done" aria-hidden="true" /> <strong>Glowing planet</strong> = delivery confirmed.
            </li>
          </ul>
          <p className="muted">Select a planet to see its request, the best farm matches, and how funding is going.</p>
          <button className="btn btn-primary" onClick={() => onNewRequest(null)}>
            Post a new request
          </button>
        </div>
        </div>
      </aside>
    );
  }

  if (!request) {
    return (
      <aside className="panel" aria-label="Details">
        <div className="panel-stack" key={pantry.id}>
        <div className="card intro">
          <p className="eyebrow">{pantry.name}</p>
          <h2>No open request</h2>
          <p className="muted">This pantry hasn't posted a shortage yet. Post one and watch the sky find nearby supply.</p>
          <button className="btn btn-primary" onClick={() => onNewRequest(pantry.id)}>
            Post a request for {pantry.area}
          </button>
        </div>
        </div>
      </aside>
    );
  }

  const farm = request.farmId ? farms.find((f) => f.id === request.farmId) : null;

  return (
    <aside className="panel" aria-label="Details">
      <div className="panel-stack" key={request.id}>
      <RequestHeader request={request} pantry={pantry} />

      {request.status === 'open' && ranking && (
        <>
          <p className="muted small">
            Farms ranked by fit: supply, distance, timing and cost. Distances are straight-line estimates.
          </p>
          <ol className="farm-list">
            {ranking.map((ev, i) => (
              <FarmCard key={ev.farm.id} ev={ev} rank={i} onChoose={onChoose} onHover={onHoverFarm} />
            ))}
          </ol>
        </>
      )}

      {request.status === 'matched' && farm && (
        <>
          <FarmSummary farm={farm} request={request} />
          <FundingCard request={request} onPledge={onPledge} />
        </>
      )}

      {(request.status === 'funded' || request.status === 'partial') && farm && (
        <>
          <FarmSummary farm={farm} request={request} />
          <DeliveryCard
            key={`${request.id}-${request.deliveredLbs}`}
            request={request}
            farm={farm}
            onConfirm={onConfirm}
            onCloseOut={onCloseOut}
          />
        </>
      )}

      {request.status === 'delivered' && farm && (
        <>
          <FarmSummary farm={farm} request={request} />
          <DeliveredCard request={request} farm={farm} />
        </>
      )}
      </div>
    </aside>
  );
}
