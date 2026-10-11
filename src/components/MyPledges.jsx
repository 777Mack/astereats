import { useEffect, useRef } from 'react';
import { labelFor } from '../lib/categories.js';
import { StatusPill } from './SidePanel.jsx';

// "My pledges": a donor's private history. Grouped by request, with each request's live status and the
// share of confirmed pounds their money covered. In this demo the history lives in memory and clears with
// Reset demo, because the demo's requests reset too. A real version would keep it in the donor's account.
const money = (n) => `$${Math.round(n)}`;
const when = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function MyPledges({ pledges, requests, pantryById, onOpen, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const byRequest = new Map();
  for (const p of pledges) {
    const g = byRequest.get(p.requestId) || { requestId: p.requestId, pantryId: p.pantryId, category: p.category, total: 0, items: [] };
    g.total += p.amount;
    g.items.push(p);
    byRequest.set(p.requestId, g);
  }
  const groups = [...byRequest.values()].reverse();
  const reqById = Object.fromEntries(requests.map((r) => [r.id, r]));

  // Pounds your money covered: your share of the goal times the pounds the pantry confirmed.
  const shareLbs = (g) => {
    const r = reqById[g.requestId];
    return r && r.goal > 0 ? Math.round((g.total / r.goal) * r.deliveredLbs) : 0;
  };
  const totalGiven = pledges.reduce((s, p) => s + p.amount, 0);
  const totalLbs = groups.reduce((s, g) => s + shareLbs(g), 0);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="modal pledges" role="dialog" aria-modal="true" aria-labelledby="pledges-title">
        <div className="pledges-head">
          <div>
            <p className="eyebrow">Private to you</p>
            <h2 id="pledges-title">My pledges</h2>
          </div>
          <button ref={closeRef} className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close my pledges">
            Close ✕
          </button>
        </div>

        {pledges.length === 0 ? (
          <div className="pledges-empty">
            <p>No pledges yet.</p>
            <p className="muted">Pick a planet with an open goal and chip in. Everything you give shows up here.</p>
          </div>
        ) : (
          <>
            <div className="pledges-totals">
              <div>
                <strong>{money(totalGiven)}</strong>
                <span>given</span>
              </div>
              <div>
                <strong>{groups.length}</strong>
                <span>{groups.length === 1 ? 'request' : 'requests'} supported</span>
              </div>
              <div>
                <strong>{totalLbs} lbs</strong>
                <span>delivered, your share</span>
              </div>
            </div>

            <ul className="pledges-list">
              {groups.map((g) => {
                const r = reqById[g.requestId];
                const pantry = pantryById[g.pantryId];
                return (
                  <li key={g.requestId}>
                    <div className="pledges-row">
                      <div>
                        <button className="link" onClick={() => onOpen(g.pantryId)}>
                          {pantry?.area ?? 'A pantry'}
                        </button>
                        <span className="muted"> · {labelFor(g.category).toLowerCase()}</span>
                      </div>
                      {r && <StatusPill status={r.status} />}
                    </div>
                    <div className="pledges-row small">
                      <span>
                        You gave <strong>{money(g.total)}</strong>
                        {g.items.length > 1 ? ` in ${g.items.length} pledges` : ''} · last at {when(g.items[g.items.length - 1].at)}
                      </span>
                      {r && r.deliveredLbs > 0 && <span className="pledges-lbs">≈ {shareLbs(g)} lbs delivered</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <p className="note">
          Only you can see this, and there is no leaderboard. In this demo it clears with Reset demo; a real version would
          keep it in your account. If a delivery is never confirmed, these pledges would be refunded.
        </p>
      </section>
    </div>
  );
}
