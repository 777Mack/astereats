import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/motion.js';
import { PLANET_COLORS, STAR_COLORS, planetColor, starColor } from '../lib/colors.js';

// "Join" tab: where a pantry or farm says it is interested. Demo only: nothing is sent or saved,
// because there is no backend. When one exists, replace the body of `submit` with a call to a server function.
// The emblem on the left starts as an empty dashed circle (an unclaimed spot in the sky) and morphs into a
// planet (pantry) or a star (farm), matching how each appears on the map.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLES = {
  pantry: {
    label: 'Food pantry',
    noun: 'pantry',
    blurb: 'Post what you need. We find the farm and rally the funding.',
    perks: [
      ['Post in a sentence', '“Low on greens, 100 lbs by tomorrow” fills the form for you.'],
      ['Farms ranked for you', 'Nearby matches scored on supply, distance, timing and cost, with reasons.'],
      ['Neighbors fund it', 'The community covers the produce and the delivery. Pantries never pay to post.'],
    ],
  },
  farm: {
    label: 'Farm',
    noun: 'farm',
    blurb: 'Turn surplus into a fair, locked-in sale, with the trip paid for.',
    perks: [
      ['A price you set', 'Your price is locked when you are matched. No haggling after the fact.'],
      ['Delivery covered', 'Every goal includes the cost of the trip, not just the produce.'],
      ['Small, nearby orders', 'Specific requests close to you. Or donate surplus and just get the delivery funded.'],
    ],
  },
};

const NEXT_STEPS = ['Tell us about you', 'A short review to verify your organization', 'You appear in the sky'];

// ---- Shape morphing: one 60-point outline that is either a circle or a five-point star ----
const N = 60;
const R = 46;
const angleAt = (i) => -Math.PI / 2 + (2 * Math.PI * i) / N;
const circlePts = () => Array.from({ length: N }, (_, i) => [Math.cos(angleAt(i)) * R, Math.sin(angleAt(i)) * R]);
const starPts = () => {
  const outer = R * 1.18;
  const inner = R * 0.5;
  const vtx = Array.from({ length: 11 }, (_, k) => {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const r = k % 2 ? inner : outer;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
  const per = N / 10; // samples along each edge
  return Array.from({ length: N }, (_, i) => {
    const k = Math.floor(i / per);
    const t = (i % per) / per;
    return [vtx[k][0] + (vtx[k + 1][0] - vtx[k][0]) * t, vtx[k][1] + (vtx[k + 1][1] - vtx[k][1]) * t];
  });
};
const toPath = (pts) => `M${pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join('L')}Z`;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function useMorph(role) {
  const cur = useRef(circlePts());
  const [d, setD] = useState(() => toPath(cur.current));
  useEffect(() => {
    const from = cur.current;
    const to = role === 'farm' ? starPts() : circlePts();
    if (prefersReducedMotion()) {
      cur.current = to;
      setD(toPath(to));
      return undefined;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / 650);
      const k = ease(t);
      const pts = from.map(([x, y], i) => [x + (to[i][0] - x) * k, y + (to[i][1] - y) * k]);
      cur.current = pts;
      setD(toPath(pts));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [role]);
  return d;
}

// Fixed background stars for the emblem's little patch of sky
const SKY_DOTS = [
  [-120, -80, 1.2], [-96, 40, 0.8], [-70, -110, 1], [-40, 96, 1.3], [12, -126, 0.9], [60, 112, 1],
  [92, -92, 1.3], [118, 20, 0.8], [130, -40, 1.1], [-132, -10, 1], [84, 70, 0.7], [-20, -60, 0.6],
];

function Emblem({ role, name, city, joined, planetKey, starKey }) {
  const d = useMorph(role);
  const isPantry = role === 'pantry';
  const isFarm = role === 'farm';
  const title = name.trim() || (role ? `Your ${ROLES[role].noun}` : 'Your spot');
  const sub = city.trim() || (role ? 'Your city' : 'waiting in the sky');
  const pc = planetColor(planetKey);
  const sc = starColor(starKey);
  const accent = isFarm ? sc.fill : pc.base;
  return (
    <svg
      className={`join-emblem${role ? ` is-${role}` : ''}${joined ? ' is-joined' : ''}`}
      viewBox="-150 -140 300 300"
      role="img"
      aria-label={role ? `${title}, shown as a ${isFarm ? 'star' : 'planet'}` : 'An empty spot in the sky'}
    >
      <defs>
        <radialGradient id="join-planet" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor={pc.light} />
          <stop offset="55%" stopColor={pc.base} />
          <stop offset="100%" stopColor={pc.dark} />
        </radialGradient>
        <radialGradient id="join-star" cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor={sc.light} />
          <stop offset="100%" stopColor={sc.fill} />
        </radialGradient>
        <filter id="join-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {SKY_DOTS.map(([x, y, r]) => (
        <circle key={`${x},${y}`} className="join-dot" cx={x} cy={y} r={r} />
      ))}

      <g className="join-shape">
        <path className="join-glow" d={d} filter="url(#join-glow)" style={role ? { fill: accent } : undefined} />
        {/* back half of the planet's orbit ring sits behind the planet */}
        <ellipse className="join-orbit" cx="0" cy="0" rx="78" ry="20" transform="rotate(-16)" pathLength="1" />
        <path className="join-outline" d={d} />
        <path className="join-fill-planet" d={d} fill="url(#join-planet)" />
        <path className="join-fill-star" d={d} fill="url(#join-star)" />
        {/* front half of the orbit ring passes in front of the planet */}
        <path className="join-orbit-front" d="M-78,0 A78,20 0 0 0 78,0" transform="rotate(-16)" pathLength="1" />
      </g>

      {/* Little extras: moons for a pantry, twinkles for a farm */}
      <circle className="join-moon" cx="0" cy="0" r="6" />
      {[
        [-78, -54, 0],
        [76, -66, 0.4],
        [70, 58, 0.8],
      ].map(([x, y, delay]) => (
        <path
          key={`${x}`}
          className="join-twinkle"
          d="M0,-9 L2,-2 L9,0 L2,2 L0,9 L-2,2 L-9,0 L-2,-2 Z"
          transform={`translate(${x} ${y})`}
          style={{ animationDelay: `${delay}s`, fill: sc.fill }}
        />
      ))}

      {joined && <circle className="join-shock" r="60" />}

      <text className="join-name" x="0" y="96" textAnchor="middle" style={isFarm ? { fill: sc.fill } : undefined}>
        {title.length > 26 ? `${title.slice(0, 25)}…` : title}
      </text>
      <text className="join-city" x="0" y="118" textAnchor="middle">
        {sub.length > 30 ? `${sub.slice(0, 29)}…` : sub}
      </text>
    </svg>
  );
}

function RoleIcon({ kind }) {
  return kind === 'farm' ? (
    <svg viewBox="-12 -12 24 24" aria-hidden="true">
      <polygon points="0,-10 2.9,-3.1 10,-3.1 4.3,1.4 6.5,9 0,4.8 -6.5,9 -4.3,1.4 -10,-3.1 -2.9,-3.1" fill="#F2B90C" />
    </svg>
  ) : (
    <svg viewBox="-12 -12 24 24" aria-hidden="true">
      <circle r="6.5" fill="#9B75DB" />
      <ellipse rx="11" ry="3.2" fill="none" stroke="#F2B90C" strokeWidth="1.6" transform="rotate(-16)" />
    </svg>
  );
}

export default function JoinView() {
  const [role, setRole] = useState(null);
  const [org, setOrg] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const [planetKey, setPlanetKey] = useState('lavender');
  const [starKey, setStarKey] = useState('gold');

  const valid = role && org.trim() && EMAIL.test(email.trim()) && city.trim();

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    setDone(true);
  };

  const again = () => {
    setOrg('');
    setEmail('');
    setCity('');
    setNote('');
    setDone(false);
  };

  const info = role ? ROLES[role] : null;

  return (
    <section className="impact join" aria-label="Join">
      <header className="join-head">
        <p className="join-eyebrow">Join the sky</p>
        <h2>Put your {info ? info.noun : 'pantry or farm'} on the map</h2>
        <p className="muted">
          Pantries and farms opt in and are reviewed before they appear. Donors don’t need to register.
        </p>
      </header>

      <div className="join-layout">
        <div className="join-stage">
          <Emblem role={role} name={org} city={city} joined={done} planetKey={planetKey} starKey={starKey} />
          <p className="join-stage-note" aria-live="polite">
            {done
              ? 'Welcome aboard. Here is how you would look in the sky.'
              : info
                ? `${role === 'farm' ? 'Farms show up as stars' : 'Food pantries show up as planets'}. Type your name to see yours.`
                : 'Pick who you are to claim your spot.'}
          </p>
        </div>

        <div className="join-side">
          {done ? (
            <div className="join-done" role="status">
              <h3>You’re in the queue, {org.trim()}!</h3>
              <p>
                This is a demo, so nothing was sent or saved. In a real version we would review {org.trim()} and email{' '}
                {email.trim()} before your {(role === 'farm' ? STAR_COLORS[starKey] : PLANET_COLORS[planetKey]).label.toLowerCase()}{' '}
                {role === 'farm' ? 'star' : 'planet'} appears on the map.
              </p>
              <button className="btn btn-ghost" onClick={again}>
                Try another
              </button>
            </div>
          ) : (
            <form className="join-form" onSubmit={submit} noValidate>
              <fieldset className="join-roles">
                <legend>I am a</legend>
                {Object.entries(ROLES).map(([id, r]) => (
                  <label key={id} className={role === id ? 'join-role on' : 'join-role'}>
                    <input type="radio" name="role" checked={role === id} onChange={() => setRole(id)} />
                    <RoleIcon kind={id} />
                    <span>
                      <strong>{r.label}</strong>
                      <small>{r.blurb}</small>
                    </span>
                  </label>
                ))}
              </fieldset>

              {info && (
                <div className="join-reveal" key={role}>
                  <ul className="join-perks">
                    {info.perks.map(([t, d], i) => (
                      <li key={t} style={{ animationDelay: `${0.05 + i * 0.07}s` }}>
                        <strong>{t}</strong>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>

                  <fieldset className="join-colors">
                    <legend>Pick your {role === 'farm' ? 'star' : 'planet'} colour</legend>
                    <div className="join-swatches">
                      {Object.entries(role === 'farm' ? STAR_COLORS : PLANET_COLORS).map(([key, c]) => {
                        const on = (role === 'farm' ? starKey : planetKey) === key;
                        return (
                          <label key={key} className={on ? 'join-swatch on' : 'join-swatch'} title={c.label}>
                            <input
                              type="radio"
                              name="color"
                              checked={on}
                              aria-label={c.label}
                              onChange={() => (role === 'farm' ? setStarKey(key) : setPlanetKey(key))}
                            />
                            {role === 'farm' ? (
                              <svg viewBox="-12 -12 24 24" aria-hidden="true">
                                <polygon
                                  points="0,-11 3.2,-3.4 11,-3.4 4.7,1.5 7.1,9.9 0,5.3 -7.1,9.9 -4.7,1.5 -11,-3.4 -3.2,-3.4"
                                  fill={c.fill}
                                />
                              </svg>
                            ) : (
                              <span style={{ background: `radial-gradient(circle at 35% 30%, ${c.light}, ${c.base} 55%, ${c.dark})` }} />
                            )}
                          </label>
                        );
                      })}
                    </div>
                    <span className="join-color-name">
                      {(role === 'farm' ? STAR_COLORS[starKey] : PLANET_COLORS[planetKey]).label}
                      {role === 'farm' ? '' : ' · a planet turns gold once its delivery is complete'}
                    </span>
                  </fieldset>

                  <label className="field">
                    <span>{role === 'farm' ? 'Farm name' : 'Pantry name'}</span>
                    <input value={org} onChange={(e) => setOrg(e.target.value)} autoComplete="organization" />
                  </label>
                  <div className="join-row">
                    <label className="field">
                      <span>Business email</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        placeholder="name@yourorganization.org"
                      />
                    </label>
                    <label className="field">
                      <span>City or area</span>
                      <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Decatur, GA" />
                    </label>
                  </div>
                  <label className="field">
                    <span>Anything we should know (optional)</span>
                    <textarea
                      rows="2"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={
                        role === 'farm' ? 'What you grow, and how far you can deliver' : 'What you usually need, and how often'
                      }
                    />
                  </label>

                  <button type="submit" className="btn btn-primary join-submit" disabled={!valid}>
                    Claim my {role === 'farm' ? 'star' : 'planet'}
                  </button>
                  <p className="note">Demo form: nothing is sent or saved. Please don’t enter real contact details.</p>
                </div>
              )}
            </form>
          )}

          <ol className="join-next" aria-label="What happens next">
            {NEXT_STEPS.map((s, i) => (
              <li key={s} className={done && i === 0 ? 'done' : ''}>
                <span className="join-next-n" aria-hidden="true">
                  {done && i === 0 ? '✓' : i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
