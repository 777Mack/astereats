import { useEffect, useRef } from 'react';
import { labelFor } from '../lib/categories.js';
import { formatHours } from '../lib/match.js';
import { haversineMiles } from '../lib/geo.js';
import { StatusPill } from './SidePanel.jsx';
import CountUp from './CountUp.jsx';

// The side panel when a farm (star) is selected: what it has, and how it fits the selected pantry's request.
export default function FarmPanel({ farm, pantry, request, evaluation, farmRequests, pantryById, onChoose, onClose }) {
  const headingRef = useRef(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [farm.id]);

  const isThisMatch = request && request.farmId === farm.id;
  const miles = pantry ? haversineMiles(pantry, farm) : null;

  return (
    <aside className="panel" aria-label="Farm details" data-tour="farm-panel">
      <div className="panel-stack" key={farm.id}>
        <div className="farm-panel-top">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <span aria-hidden="true">←</span> {pantry ? `Back to ${pantry.area}` : 'Close'}
          </button>
        </div>

        <header className="req-head">
          <p className="eyebrow">Sample farm</p>
          <h2 ref={headingRef} tabIndex={-1}>
            {farm.name}
          </h2>
          <div className="chips">
            <span className="chip">{farm.area}</span>
            <span className={farm.mode === 'donate' ? 'chip chip-strong' : 'chip'}>
              {farm.mode === 'donate' ? 'Donates surplus' : 'Sells at cost'}
            </span>
            <span className="chip">Ready in about {formatHours(farm.prepHours)}</span>
          </div>
        </header>

        <div className="card">
          <h3>Available now</h3>
          <ul className="stock-list">
            {farm.produce.map((p) => (
              <li key={p.category}>
                <span className="stock-name">{labelFor(p.category)}</span>
                <span className="stock-lbs">{p.lbs} lbs</span>
                <span className="muted">{farm.mode === 'donate' ? 'free' : `$${p.pricePerLb.toFixed(2)}/lb`}</span>
              </li>
            ))}
          </ul>
          {farm.mode === 'donate' && (
            <p className="muted small">This farm gives surplus away, so a request only needs to fund the delivery.</p>
          )}
        </div>

        {pantry && request && request.status === 'open' && evaluation && (
          <div className={evaluation.eligible ? 'card fit-card' : 'card fit-card is-ineligible'}>
            <div className="farm-card-head">
              <div>
                <p className="eyebrow">Fit for {pantry.area}</p>
                <h3>
                  {request.lbsNeeded} lbs of {labelFor(request.category).toLowerCase()} within{' '}
                  {formatHours(request.deadlineHours)}
                </h3>
              </div>
              {evaluation.eligible && (
                <div className="score" aria-label={`Fit score ${evaluation.score} out of 100`}>
                  <span className="score-num">
                    <CountUp value={evaluation.score} fromZero duration={600} />
                  </span>
                  <span className="score-of">/100</span>
                </div>
              )}
            </div>
            <ul className="reasons">
              {evaluation.reasons.map((r) => (
                <li key={r}>
                  <span aria-hidden="true" className={evaluation.eligible ? 'tick-ok' : 'tick-no'}>
                    {evaluation.eligible ? '✓' : '×'}
                  </span>
                  {r}
                </li>
              ))}
            </ul>
            {evaluation.eligible ? (
              <>
                <div className="cost-row">
                  <span className="chip">Produce ${evaluation.produceCost}</span>
                  <span className="chip">Delivery ${evaluation.transportCost}</span>
                  <span className="chip chip-strong">Goal ${evaluation.total}</span>
                </div>
                <button className="btn btn-primary" onClick={() => onChoose(farm.id)}>
                  Match {pantry.area} with {farm.name}
                </button>
              </>
            ) : (
              <p className="muted small">Not a fit for this request, so it can't be matched.</p>
            )}
          </div>
        )}

        {pantry && request && request.status !== 'open' && (
          <div className="card">
            <p className="eyebrow">{pantry.area}</p>
            <p>
              {isThisMatch
                ? `This is the farm matched with ${pantry.area}'s request.`
                : `${pantry.area}'s request is already matched with another farm.`}{' '}
              About {Math.round(miles)} mi away.
            </p>
          </div>
        )}

        {pantry && !request && (
          <div className="card">
            <p>
              About {Math.round(miles)} mi from {pantry.area}. That pantry has no open request right now.
            </p>
          </div>
        )}

        <div className="card">
          <h3>Requests with this farm</h3>
          {farmRequests.length ? (
            <ul className="farm-reqs">
              {farmRequests.map((r) => (
                <li key={r.id}>
                  <span>
                    <strong>{pantryById[r.pantryId].area}</strong>
                    <span className="muted">
                      {' '}
                      · {r.lbsPlanned} lbs {labelFor(r.category).toLowerCase()}
                    </span>
                  </span>
                  <StatusPill status={r.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">None yet.</p>
          )}
        </div>
      </div>
    </aside>
  );
}
