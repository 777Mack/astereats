import { useEffect, useRef, useState } from 'react';
import { CATEGORIES } from '../lib/categories.js';
import { parseRequest } from '../lib/parseRequest.js';

export default function NewRequestModal({ pantries, initialPantryId, onSubmit, onClose }) {
  const [pantryId, setPantryId] = useState(initialPantryId || pantries[0]?.id || '');
  const [text, setText] = useState('');
  const [category, setCategory] = useState('greens');
  const [lbs, setLbs] = useState(100);
  const [deadline, setDeadline] = useState(24);
  const [hint, setHint] = useState('');
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fillFromText = () => {
    const p = parseRequest(text);
    if (p.category) setCategory(p.category);
    if (p.lbs) setLbs(p.lbs);
    if (p.deadlineHours) setDeadline(p.deadlineHours);
    const missing = [];
    if (!p.found.category) missing.push('food type');
    if (!p.found.lbs) missing.push('pounds');
    if (!p.found.deadline) missing.push('deadline');
    setHint(
      missing.length
        ? `Filled what I could read. Please set: ${missing.join(', ')}.`
        : 'Filled the form from your note. Check it, then post.',
    );
  };

  const valid = pantryId && lbs > 0 && deadline > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit({ pantryId, category, lbsNeeded: Math.round(lbs), deadlineHours: Number(deadline) });
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="nr-title" onSubmit={submit}>
        <h2 id="nr-title">Post a food request</h2>

        {pantries.length === 0 ? (
          <p className="muted">
            Every pantry already has an active request. Finish one (confirm a delivery) to free up a planet.
          </p>
        ) : (
          <>
            <label className="field">
              <span>Pantry</span>
              <select ref={firstRef} value={pantryId} onChange={(e) => setPantryId(e.target.value)}>
                {pantries.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Describe what you need (optional)</span>
              <textarea
                rows="2"
                value={text}
                placeholder="We're low on greens, maybe 100 lbs, need it by tomorrow"
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <button type="button" className="btn btn-ghost" onClick={fillFromText} disabled={!text.trim()}>
              Fill the form from my note
            </button>
            <p className="note" aria-live="polite">
              {hint || 'Demo reader: finds food type, pounds and deadline in plain sentences.'}
            </p>

            <div className="field-row">
              <label className="field">
                <span>Food type</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Pounds</span>
                <input type="number" min="1" value={lbs} onChange={(e) => setLbs(Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Needed within (hours)</span>
                <input type="number" min="1" value={deadline} onChange={(e) => setDeadline(Number(e.target.value))} />
              </label>
            </div>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!valid || pantries.length === 0}>
            Post request
          </button>
        </div>
      </form>
    </div>
  );
}
