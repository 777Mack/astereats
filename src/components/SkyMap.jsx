import { useEffect, useMemo, useRef, useState } from 'react';
import { makeProjector } from '../lib/geo.js';
import { labelFor, shortFor } from '../lib/categories.js';
import { prefersReducedMotion } from '../lib/motion.js';
import { usePanZoom } from '../lib/panZoom.js';
import { PLANET_COLORS, planetColor, starColor } from '../lib/colors.js';
import BaseMap from './BaseMap.jsx';

const W = 1000;
const H = 720;

// Small seeded random generator so the starfield is identical on every render.
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hover caption under a planet: what it needs, or how much of the shipment has arrived.
function captionFor(req) {
  if (!req) return 'No open request';
  if (req.status === 'partial') return `${req.deliveredLbs} of ${req.lbsPlanned} lbs arrived`;
  return `${req.lbsNeeded} lbs ${shortFor(req.category)}`;
}

function starPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + Math.cos(ang) * rad).toFixed(1)},${(cy + Math.sin(ang) * rad).toFixed(1)}`);
  }
  return pts.join(' ');
}

const onKey = (fn) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

// Little bursts of stardust. Positions are fixed so every burst looks the same.
const sparkSet = (n, near, far) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + 0.3;
    const d = near + (i % 3) * ((far - near) / 2);
    return { dx: Math.cos(a) * d, dy: Math.sin(a) * d };
  });
const SPARKS_SMALL = sparkSet(10, 32, 52);
const SPARKS_BIG = sparkSet(18, 44, 96);
const COMET_TRAIL = [
  { r: 5, o: 1, d: 0 },
  { r: 4, o: 0.6, d: 0.05 },
  { r: 3, o: 0.4, d: 0.1 },
  { r: 2, o: 0.25, d: 0.15 },
];

// One-off effects that play when something changes (a pledge, a match, funding complete, delivery).
function Effect({ e, pos, farmPos }) {
  const { x, y } = pos;
  if (e.type === 'pledge') {
    return (
      <g className="fx" aria-hidden="true">
        {SPARKS_SMALL.map((s, i) => (
          <circle key={i} className="spark" cx={x} cy={y} r="2.8" style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px` }} />
        ))}
        <text className="fx-amount sky-label" x={x} y={y - 48} textAnchor="middle">
          +${e.amount}
        </text>
      </g>
    );
  }
  if (e.type === 'funded') {
    return (
      <g className="fx" aria-hidden="true">
        <circle className="shock" cx={x} cy={y} r="30" />
        <circle className="shock" cx={x} cy={y} r="30" style={{ animationDelay: '0.18s' }} />
      </g>
    );
  }
  if ((e.type === 'match' || e.type === 'delivered') && farmPos) {
    const from = e.type === 'match' ? pos : farmPos;
    const to = e.type === 'match' ? farmPos : pos;
    return (
      <g className="fx" aria-hidden="true">
        {COMET_TRAIL.map((t, i) => (
          <circle
            key={i}
            className="comet"
            cx={from.x}
            cy={from.y}
            r={t.r}
            style={{ '--tx': `${to.x - from.x}px`, '--ty': `${to.y - from.y}px`, '--o': t.o, animationDelay: `${t.d}s` }}
            filter="url(#glow)"
          />
        ))}
        {e.type === 'delivered' && (
          <>
            {SPARKS_BIG.map((s, i) => (
              <circle
                key={i}
                className="spark spark-late"
                cx={x}
                cy={y}
                r="3.2"
                style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px` }}
              />
            ))}
            <circle className="shock shock-late" cx={x} cy={y} r="30" />
            <circle className="shock shock-late" cx={x} cy={y} r="30" style={{ animationDelay: '1.05s' }} />
          </>
        )}
      </g>
    );
  }
  return null;
}

export default function SkyMap({
  pantries,
  farms,
  latestByPantry,
  selectedPantryId,
  selectedRequest,
  ranking,
  hoverFarmId,
  onSelectPantry,
  selectedFarmId = null,
  onSelectFarm = () => {},
  mode = 'sky',
  largeText = false,
  viewKey = 0,
}) {
  const isMap = mode === 'map';
  const ms = isMap && largeText ? 1.3 : 1; // label size multiplier in map view
  // On phones the map is wider than the screen and scrolls sideways; start centered.
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);

  const pz = usePanZoom(W, H, viewKey);

  // "Power up" on first show: stardust rings fill from empty. Skipped with reduced motion.
  const [booted, setBooted] = useState(prefersReducedMotion());
  useEffect(() => {
    if (booted) return undefined;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setBooted(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [booted]);

  // Effects: compare each pantry's request with what it was a moment ago and play one-off animations.
  const [fx, setFx] = useState([]);
  const prevRef = useRef(null);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    const next = {};
    for (const p of pantries) {
      const r = latestByPantry[p.id];
      if (r) next[p.id] = { id: r.id, pledged: r.pledged, status: r.status, farmId: r.farmId };
    }
    const prev = prevRef.current;
    prevRef.current = next;
    if (!prev || prefersReducedMotion()) return;
    const events = [];
    for (const p of pantries) {
      const a = prev[p.id];
      const b = next[p.id];
      if (!a || !b || a.id !== b.id) continue;
      if (a.status === 'open' && b.status === 'matched') events.push({ type: 'match', pantryId: p.id, farmId: b.farmId });
      if (b.pledged > a.pledged) events.push({ type: 'pledge', pantryId: p.id, amount: b.pledged - a.pledged });
      if (a.status !== 'funded' && b.status === 'funded') events.push({ type: 'funded', pantryId: p.id });
      if (a.status !== 'delivered' && b.status === 'delivered') events.push({ type: 'delivered', pantryId: p.id, farmId: b.farmId });
    }
    if (!events.length) return;
    const stamp = Date.now();
    const stamped = events.map((e, i) => ({ ...e, key: `${stamp}-${i}-${e.type}` }));
    setFx((f) => [...f, ...stamped]);
    timers.current.push(setTimeout(() => setFx((f) => f.filter((x) => !stamped.includes(x))), 3000));
  }, [latestByPantry, pantries]);

  const project = useMemo(() => makeProjector([...pantries, ...farms], W, H, 95), [pantries, farms]);
  const pPos = useMemo(() => Object.fromEntries(pantries.map((p) => [p.id, project(p)])), [pantries, project]);
  const fPos = useMemo(() => Object.fromEntries(farms.map((f) => [f.id, project(f)])), [farms, project]);

  // Map view: where each label goes. Every label stays right beside its own pin (below, beside or above it);
  // pantries choose first, then farms, so the less important labels give way. The boxes also tell the
  // base map which spots to keep clear for road signs and city names.
  const { pinLabels, farmLabels, obstacles } = useMemo(() => {
    const circle = (pos, rad) => ({ x0: pos.x - rad, x1: pos.x + rad, y0: pos.y - rad, y1: pos.y + rad });
    const area = (u, v) =>
      Math.max(0, Math.min(u.x1, v.x1) - Math.max(u.x0, v.x0)) * Math.max(0, Math.min(u.y1, v.y1) - Math.max(u.y0, v.y0));
    const pins = [];
    const labels = [];
    // How far a box pokes into a circle (0 when clear), so labels never sit on their own pin.
    const intoCircle = (box, c) => {
      const nx = Math.max(box.x0, Math.min(c.x, box.x1));
      const ny = Math.max(box.y0, Math.min(c.y, box.y1));
      return Math.max(0, c.r - Math.hypot(nx - c.x, ny - c.y));
    };
    const cost = (box, ownId, own) => {
      let t = own ? intoCircle(box, own) * 400 : 0;
      t += (Math.max(0, 4 - box.x0) + Math.max(0, box.x1 - (W - 4)) + Math.max(0, 4 - box.y0) + Math.max(0, box.y1 - (H - 4))) * 400;
      for (const q of pins) if (q.id !== ownId) t += area(box, q);
      for (const q of labels) t += area(box, q);
      return t;
    };
    const choose = (cands, ownId, own) => {
      let pick = cands[0];
      let best = Infinity;
      for (const c of cands) {
        const k = cost(c.box, ownId, own);
        if (k < best) {
          best = k;
          pick = c;
        }
        if (k === 0) break;
      }
      labels.push({ ...pick.box, kind: 'label' });
      return pick;
    };

    const pantryInfo = pantries.map((p) => {
      const pos = pPos[p.id];
      const req = latestByPantry[p.id];
      const ringR = (req ? 14 + Math.sqrt(req.lbsNeeded) * 1.3 : 13) + 7;
      const caption = captionFor(req);
      pins.push({ ...circle(pos, ringR + 8), kind: 'pin', id: p.id });
      return { p, pos, ringR, caption };
    });
    for (const f of farms) pins.push({ ...circle(fPos[f.id], 20), kind: 'pin', id: f.id });

    // Pantries: a two-line label (name, then what it needs)
    const pinLabels = {};
    for (const { p, pos, ringR: R, caption } of pantryInfo) {
      const w = Math.max(p.area.length * 19 * 0.6, caption.length * 16 * 0.56) * ms + 14;
      const l1 = 22 * ms;
      const l2 = l1 + 21 * ms;
      const h = l2 + 8;
      // anchor: where the text starts; dx is measured from the pin centre; yTop is the box top
      const spot = (anchor, dx, yTop) => {
        const x0 = anchor === 'start' ? pos.x + dx : anchor === 'end' ? pos.x + dx - w : pos.x - w / 2;
        return { anchor, x: anchor === 'middle' ? pos.x : pos.x + dx, y1: yTop + l1, box: { x0, x1: x0 + w, y0: yTop, y1: yTop + h } };
      };
      const cands = [
        spot('middle', 0, pos.y + R + 4), // below
        spot('start', R + 10, pos.y - h / 2), // right
        spot('end', -R - 10, pos.y - h / 2), // left
        spot('middle', 0, pos.y - R - 4 - h), // above
        spot('start', R * 0.4, pos.y + R * 0.6 + 2), // below-right
        spot('end', -R * 0.4, pos.y + R * 0.6 + 2), // below-left
        spot('start', R * 0.4, pos.y - R * 0.6 - h), // above-right
        spot('end', -R * 0.4, pos.y - R * 0.6 - h), // above-left
      ];
      const pick = choose(cands, p.id, { x: pos.x, y: pos.y, r: R + 2 });
      pinLabels[p.id] = { x: pick.x, y1: pick.y1, y2: pick.y1 + 21 * ms, anchor: pick.anchor };
    }

    // Farms: a one-line label ("Farm A")
    const farmLabels = {};
    for (const f of farms) {
      const pos = fPos[f.id];
      const name = f.name.replace('Sample ', '');
      const w = name.length * 16 * 0.62 * ms + 12;
      const h = 24 * ms;
      const spot = (anchor, dx, yTop) => {
        const x0 = anchor === 'start' ? pos.x + dx : anchor === 'end' ? pos.x + dx - w : pos.x - w / 2;
        return { anchor, x: anchor === 'middle' ? pos.x : pos.x + dx, y: yTop + h - 6 * ms, box: { x0, x1: x0 + w, y0: yTop, y1: yTop + h } };
      };
      const cands = [
        spot('middle', 0, pos.y + 16), // below
        spot('start', 20, pos.y - h / 2), // right
        spot('end', -20, pos.y - h / 2), // left
        spot('middle', 0, pos.y - 16 - h), // above
      ];
      const pick = choose(cands, f.id, { x: pos.x, y: pos.y, r: 14 });
      farmLabels[f.id] = { x: pick.x, y: pick.y, anchor: pick.anchor };
    }
    return { pinLabels, farmLabels, obstacles: [...pins, ...labels] };
  }, [pantries, farms, pPos, fPos, latestByPantry, ms]);

  const backdrop = useMemo(() => {
    const rnd = mulberry32(7);
    const core = Array.from({ length: 150 }, () => ({
      x: rnd() * W,
      y: rnd() * H,
      r: 0.5 + rnd() * 1.3,
      o: 0.25 + rnd() * 0.55,
    }));
    // A wider field outside the main picture, seen when zoomed out or panned to the edge.
    const rnd2 = mulberry32(11);
    const outer = [];
    while (outer.length < 900) {
      const x = -1.5 * W + rnd2() * 4 * W;
      const y = -1.5 * H + rnd2() * 4 * H;
      const r = 0.5 + rnd2() * 1.3;
      const o = 0.25 + rnd2() * 0.55;
      if (x < 0 || x > W || y < 0 || y > H) outer.push({ x, y, r, o });
    }
    return [...core, ...outer];
  }, []);

  // Scale bar: a round number of miles that draws 60 to 140 pixels long at the current zoom.
  const unitsPerMile = useMemo(() => {
    const lat = 33.75;
    const a = project({ lat, lng: -84.4 });
    const b = project({ lat, lng: -84.4 + 1 / (69.172 * Math.cos((lat * Math.PI) / 180)) });
    return Math.abs(b.x - a.x);
  }, [project]);
  const pxPerMile = unitsPerMile * pz.pxPerUnit;
  const scaleMiles = [0.5, 1, 2, 5, 10, 20, 50].find((m) => m * pxPerMile >= 60) ?? 50;

  const evByFarm = useMemo(
    () => (ranking ? Object.fromEntries(ranking.map((e) => [e.farm.id, e])) : {}),
    [ranking],
  );

  const selPos = selectedPantryId ? pPos[selectedPantryId] : null;
  const matchedFarmId = selectedRequest?.farmId || null;

  // Lines from the selected planet to its candidate / matched farm(s)
  const lines = [];
  if (selectedRequest && selPos) {
    if (selectedRequest.status === 'open' && ranking) {
      ranking
        .filter((e) => e.eligible)
        .slice(0, 3)
        .forEach((e) => {
          const hot = hoverFarmId === e.farm.id;
          lines.push({
            key: e.farm.id,
            from: selPos,
            to: fPos[e.farm.id],
            width: (1 + e.score / 40) * (hot ? 1.6 : 1),
            opacity: hot ? 1 : 0.3 + 0.4 * (e.score / 100),
            dashed: !hot,
            flow: false,
          });
        });
    } else if (matchedFarmId) {
      lines.push({
        key: matchedFarmId,
        from: selPos,
        to: fPos[matchedFarmId],
        width: 3,
        opacity: 1,
        dashed: false,
        flow: selectedRequest.status !== 'delivered',
      });
    }
  }

  return (
    <>
    <div className="sky-scroll" ref={scrollRef}>
    <svg
      ref={pz.svgRef}
      className={`sky${isMap ? ' map-mode' : ''}${pz.panning ? ' is-panning' : ''}`}
      style={{ '--ms': ms }}
      viewBox={`${pz.vb.x} ${pz.vb.y} ${pz.vb.w} ${pz.vb.h}`}
      {...pz.handlers}
      role="group"
      aria-label={isMap ? 'Road map of pantries and farms' : 'Sky map of pantries and farms'}
    >
      <defs>
        {/* In drawing units, so the glow stays put and fades evenly into the night when zoomed out */}
        <radialGradient id="skyBg" gradientUnits="userSpaceOnUse" cx={W / 2} cy={H * 0.45} r={700}>
          <stop offset="0%" stopColor="#2E1069" />
          <stop offset="100%" stopColor="#1B0948" />
        </radialGradient>
        <radialGradient id="planet" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#C9B3F5" />
          <stop offset="55%" stopColor="#9B75DB" />
          <stop offset="100%" stopColor="#272F8B" />
        </radialGradient>
        {/* One gradient per planet colour a pantry can choose */}
        {Object.entries(PLANET_COLORS).map(([key, c]) => (
          <radialGradient key={key} id={`planet-${key}`} cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor={c.light} />
            <stop offset="55%" stopColor={c.base} />
            <stop offset="100%" stopColor={c.dark} />
          </radialGradient>
        ))}
        <radialGradient id="planetDone" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFE58A" />
          <stop offset="55%" stopColor="#F2B90C" />
          <stop offset="100%" stopColor="#9B75DB" />
        </radialGradient>
        <linearGradient id="streak" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F6F1FF" stopOpacity="0" />
          <stop offset="100%" stopColor="#F6F1FF" stopOpacity="0.95" />
        </linearGradient>
        <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {isMap ? (
        <BaseMap project={project} W={W} H={H} ms={ms} obstacles={obstacles} />
      ) : (
        <>
          {/* Oversized so the night sky also fills the space seen when zoomed out */}
          <rect x={-2500} y={-2500} width={W + 5000} height={H + 5000} fill="url(#skyBg)" />
          {backdrop.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#F6F1FF" opacity={s.o} />
          ))}

          {/* Occasional shooting stars (decorative) */}
          <g transform="translate(150 70)" aria-hidden="true">
            <g className="shoot shoot-1">
              <line x1="-84" y1="-34" x2="0" y2="0" stroke="url(#streak)" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>
          <g transform="translate(560 40)" aria-hidden="true">
            <g className="shoot shoot-2">
              <line x1="-84" y1="-34" x2="0" y2="0" stroke="url(#streak)" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>
        </>
      )}

      {/* Match lines */}
      {lines.map((l) => (
        <g key={`line-${l.key}`} className="line-in">
          <line
            x1={l.from.x}
            y1={l.from.y}
            x2={l.to.x}
            y2={l.to.y}
            stroke={isMap ? '#272F8B' : '#F2B90C'}
            strokeWidth={isMap ? l.width + 1.5 : l.width}
            strokeOpacity={isMap ? Math.max(0.65, l.opacity) : l.opacity}
            strokeLinecap="round"
            strokeDasharray={l.dashed || l.flow ? '7 8' : undefined}
            className={l.flow ? 'flow' : undefined}
          />
        </g>
      ))}

      {/* Farms = stars */}
      {farms.map((f, fi) => {
        const pos = fPos[f.id];
        const ev = evByFarm[f.id];
        const isMatched = matchedFarmId === f.id;
        const hot = hoverFarmId === f.id || selectedFarmId === f.id;
        const picked = selectedFarmId === f.id;
        let state = 'base';
        if (selectedRequest) {
          if (isMatched) state = 'matched';
          else if (ranking) state = ev?.eligible ? 'eligible' : 'dim';
          else state = picked ? 'base' : 'dim'; // a farm the person clicked stays bright
        }
        const stockLbs = ev?.stock?.lbs ?? 0;
        const sc = starColor(f.color);
        const r =
          state === 'base'
            ? 9
            : state === 'matched'
              ? 15
              : state === 'eligible'
                ? 8 + (Math.min(stockLbs, 300) / 300) * 8 + (hot ? 3 : 0)
                : 7;
        const label =
          state === 'dim'
            ? `${f.name}, not a fit for this request`
            : `${f.name}, ${f.area}${ev?.eligible ? `, fit score ${ev.score}` : ''}`;
        return (
          <g
            key={f.id}
            data-tour={`farm-${f.id}`}
            className={`farm farm-${state}${picked ? ' is-picked' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`${label}. Show farm details`}
            aria-pressed={picked}
            onClick={() => onSelectFarm(f.id)}
            onKeyDown={onKey(() => onSelectFarm(f.id))}
            style={{ animationDelay: `${0.25 + fi * 0.07}s` }}
          >
            <title>{label}</title>
            {/* Bigger invisible target so small stars are easy to click or tap */}
            <circle className="farm-hit" cx={pos.x} cy={pos.y} r="22" />
            <circle className="focus-ring" cx={pos.x} cy={pos.y} r={r + 13} fill="none" />
            {picked && (
              <circle
                className="sel-ring"
                cx={pos.x}
                cy={pos.y}
                r={r + 12}
                fill="none"
                stroke={isMap ? '#2E1069' : '#F6F1FF'}
                strokeOpacity={isMap ? 0.9 : 0.7}
                strokeWidth="2"
                strokeDasharray="3 5"
              />
            )}
            {(state === 'matched' || hot) && (
              <circle cx={pos.x} cy={pos.y} r={r + 9} fill={sc.fill} opacity={isMap ? 0.45 : 0.22} />
            )}
            {/* Map view: a soft glow behind each star so the map keeps a little of the night sky */}
            {isMap && state !== 'dim' && <circle className="map-star-glow" cx={pos.x} cy={pos.y} r={r + 10} fill={sc.fill} />}
            <polygon
              points={starPoints(pos.x, pos.y, isMap ? r + 3 : r)}
              fill={isMap ? (state === 'dim' ? '#E3D8F7' : sc.fill) : state === 'dim' ? '#9B75DB' : sc.fill}
              stroke={isMap ? (state === 'dim' ? '#7A55C4' : '#2E1069') : undefined}
              strokeWidth={isMap ? 2 : undefined}
              strokeLinejoin="round"
              opacity={state === 'dim' ? (isMap ? 1 : 0.35) : 1}
              filter={!isMap && (state === 'eligible' || state === 'matched') ? 'url(#glow)' : undefined}
              className={state === 'base' || state === 'eligible' ? 'twinkle' : undefined}
              style={{ animationDelay: `${(f.id.charCodeAt(1) % 7) * 0.4}s` }}
            />
            <text
              x={isMap ? farmLabels[f.id].x : pos.x}
              y={isMap ? farmLabels[f.id].y : pos.y + r + 16}
              textAnchor={isMap ? farmLabels[f.id].anchor : 'middle'}
              className="sky-label sky-label-farm"
              opacity={state === 'dim' ? (isMap ? 0.9 : 0.5) : 1}
            >
              {f.name.replace('Sample ', '')}
            </text>
          </g>
        );
      })}

      {/* Pantries = planets */}
      {pantries.map((p, pi) => {
        const pos = pPos[p.id];
        const req = latestByPantry[p.id];
        const selected = selectedPantryId === p.id;
        const r = req ? 14 + Math.sqrt(req.lbsNeeded) * 1.3 : 13;
        const ringR = r + 7;
        const C = 2 * Math.PI * ringR;
        const frac = booted && req && req.goal > 0 ? Math.min(1, req.pledged / req.goal) : 0;
        // Two separate signals: the ring is funding, the gold fill inside is pounds the pantry confirmed.
        // The planet only turns fully gold (with a glow and a check) when the whole shipment arrived.
        const shipFrac = req && req.lbsPlanned > 0 ? Math.min(1, req.deliveredLbs / req.lbsPlanned) : 0;
        const closed = req?.status === 'delivered';
        const delivered = closed && shipFrac >= 1;
        const filling = !!req && req.deliveredLbs > 0 && !delivered;
        const pc = planetColor(p.color);
        const caption = captionFor(req);
        const aria = req
          ? `${p.name}: needs ${req.lbsNeeded} pounds of ${labelFor(req.category).toLowerCase()}, ${
              req.status === 'partial'
                ? `${req.deliveredLbs} of ${req.lbsPlanned} pounds delivered so far`
                : closed && !delivered
                  ? `closed with ${req.deliveredLbs} of ${req.lbsPlanned} pounds delivered`
                  : `status ${req.status}`
            }`
          : `${p.name}: no open request`;
        return (
          <g
            key={p.id}
            data-tour={`planet-${p.id}`}
            className={`planet${selected ? ' is-selected' : ''}`}
            style={{ animationDelay: `${pi * 0.09}s` }}
            role="button"
            tabIndex={0}
            aria-label={aria}
            aria-pressed={selected}
            onClick={() => onSelectPantry(p.id)}
            onKeyDown={onKey(() => onSelectPantry(p.id))}
          >
            {/* Keyboard focus ring: a circle around the planet instead of the browser's box */}
            <circle className="focus-ring" cx={pos.x} cy={pos.y} r={ringR + 13} fill="none" />
            {selected && (
              <circle
                className="sel-ring"
                cx={pos.x}
                cy={pos.y}
                r={ringR + 9}
                fill="none"
                stroke={isMap ? '#2E1069' : '#F6F1FF'}
                strokeOpacity={isMap ? 0.9 : 0.55}
                strokeDasharray="3 5"
              />
            )}
            {req ? (
              <>
                {/* Stardust meter ring */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={ringR}
                  fill="none"
                  stroke={isMap ? '#CDBDF2' : '#9B75DB'}
                  strokeOpacity={isMap ? 1 : 0.28}
                  strokeWidth={isMap ? 6 : 4}
                />
                <circle
                  className="ring-fill"
                  cx={pos.x}
                  cy={pos.y}
                  r={ringR}
                  fill="none"
                  stroke={isMap ? '#272F8B' : '#F2B90C'}
                  strokeWidth={isMap ? 6 : 4}
                  strokeLinecap="round"
                  style={{ strokeDasharray: `${frac * C} ${C}`, strokeOpacity: frac > 0 ? 1 : 0 }}
                  transform={`rotate(-90 ${pos.x} ${pos.y})`}
                />
                {/* Soft pulse on planets that still need a match */}
                {req.status === 'open' && <circle className="ping" cx={pos.x} cy={pos.y} r={r} fill="none" />}
                {delivered && <circle className="halo" cx={pos.x} cy={pos.y} r={r + 14} fill="#F2B90C" />}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={isMap ? (delivered ? '#F2B90C' : pc.map) : delivered ? 'url(#planetDone)' : `url(#planet-${p.color || 'lavender'})`}
                  stroke={isMap ? '#2E1069' : undefined}
                  strokeWidth={isMap ? 2.5 : undefined}
                  filter={!isMap && delivered ? 'url(#glow)' : undefined}
                />
                {filling && (
                  <>
                    <clipPath id={`ship-clip-${p.id}`}>
                      <circle cx={pos.x} cy={pos.y} r={r - (isMap ? 1.2 : 0)} />
                    </clipPath>
                    <g clipPath={`url(#ship-clip-${p.id})`}>
                      <rect
                        className="ship-fill"
                        x={pos.x - r}
                        y={pos.y - r}
                        width={r * 2}
                        height={r * 2}
                        fill={isMap ? '#F2B90C' : 'url(#planetDone)'}
                        style={{ transform: `scaleY(${booted ? shipFrac : 0})` }}
                      />
                    </g>
                  </>
                )}
                {isMap && !closed && (
                  <path
                    className="pin-house"
                    transform={`translate(${pos.x} ${pos.y}) scale(${Math.max(1, r / 20)})`}
                    d="M-9,1 L0,-8 L9,1 L9,9 L-9,9 Z M-2.5,9 L-2.5,3 L2.5,3 L2.5,9 Z"
                    fill="#ffffff"
                    fillRule="evenodd"
                  />
                )}
                {closed && (
                  <text x={pos.x} y={pos.y + 6} textAnchor="middle" className="planet-check">
                    ✓
                  </text>
                )}
                {req.status === 'open' && (
                  <circle cx={pos.x + r * 0.75} cy={pos.y - r * 0.75} r="6" fill="#C20300" stroke="#ffffff" strokeWidth="2" />
                )}
              </>
            ) : (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r}
                fill={isMap ? '#ffffff' : planetColor(p.color).dark}
                fillOpacity={isMap ? 0.9 : 0.35}
                stroke={isMap ? planetColor(p.color).map : planetColor(p.color).base}
                strokeWidth={isMap ? 2.5 : undefined}
                strokeOpacity="0.8"
                strokeDasharray="4 4"
              />
            )}
            <text
              x={isMap ? pinLabels[p.id].x : pos.x}
              y={isMap ? pinLabels[p.id].y1 : pos.y + ringR + 18}
              textAnchor={isMap ? pinLabels[p.id].anchor : 'middle'}
              className="sky-label sky-label-area"
            >
              {p.area}
            </text>
            <text
              x={isMap ? pinLabels[p.id].x : pos.x}
              y={isMap ? pinLabels[p.id].y2 : pos.y + ringR + 34}
              textAnchor={isMap ? pinLabels[p.id].anchor : 'middle'}
              className="sky-label sky-label-sub"
            >
              {caption}
            </text>
          </g>
        );
      })}

      {/* One-off effects sit on top of everything and ignore the mouse */}
      <g pointerEvents="none">
        {fx.map((e) => {
          const pos = pPos[e.pantryId];
          if (!pos) return null;
          return <Effect key={e.key} e={e} pos={pos} farmPos={e.farmId ? fPos[e.farmId] : null} />;
        })}
      </g>
    </svg>
    </div>

    {/* Zoom controls, compass and scale bar sit on top of the picture, outside the zoomable drawing */}
    <div className="zoom-controls" role="group" aria-label="Zoom">
      <span className="compass" title="North is up" aria-hidden="true">
        <svg viewBox="-12 -12 24 24">
          <polygon points="0,-9 4,3 0,0 -4,3" />
          <text x="0" y="10" textAnchor="middle">
            N
          </text>
        </svg>
      </span>
      <button className="zoom-btn" onClick={pz.zoomIn} disabled={!pz.canZoomIn} aria-label="Zoom in" title="Zoom in">
        +
      </button>
      <button className="zoom-btn" onClick={pz.zoomOut} disabled={!pz.canZoomOut} aria-label="Zoom out" title="Zoom out">
        −
      </button>
      <button className="zoom-btn zoom-home" onClick={pz.reset} aria-label="Reset view" title="Reset view">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
    <div className="scale-bar" aria-label={`Scale: ${scaleMiles} miles`}>
      <span className="scale-line" style={{ width: `${Math.round(scaleMiles * pxPerMile)}px` }} />
      <span>{scaleMiles} {scaleMiles === 1 ? 'mile' : 'miles'}</span>
    </div>
    </>
  );
}
