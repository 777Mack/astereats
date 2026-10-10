import { useMemo } from 'react';
import { CITIES, ROADS } from '../data/basemap.js';

// The "paper map" layer behind the pins: land, highways, highway signs, city names,
// a scale bar and a north arrow. Pure drawing, no interaction.

const LAND = '#f3eefa';
const EDGE = '#2e1069';
const GOLD = '#f2b90c';

// Smooth line through the points (Catmull-Rom turned into Bezier curves).
function smoothPath(pts, closed) {
  const n = pts.length;
  if (n < 2) return '';
  const at = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return closed ? `${d} Z` : d;
}

const overlaps = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const inside = (pt, r, pad = 0) => pt.x > r.x0 - pad && pt.x < r.x1 + pad && pt.y > r.y0 - pad && pt.y < r.y1 + pad;

export default function BaseMap({ project, W, H, ms, obstacles }) {
  const roads = useMemo(
    () =>
      ROADS.map((r) => ({
        ...r,
        d: smoothPath(
          r.pts.map(([lat, lng]) => project({ lat, lng })),
          r.closed,
        ),
      })),
    [project],
  );

  const placeCity = (name, lat, lng, rank, placed) => {
    const p = project({ lat, lng });
    if (p.x < 24 || p.x > W - 24 || p.y < 34 || p.y > H - 34) return null;
    if (obstacles.some((o) => o.kind === 'pin' && inside(p, o, 4))) return null; // a pin already marks this place
    const size = (rank === 1 ? 26 : 18) * ms;
    const w = name.length * size * 0.56 + 8;
    const tries = [
      { x: p.x + 9, y: p.y + size * 0.32, anchor: 'start', box: { x0: p.x + 5, x1: p.x + 13 + w, y0: p.y - size * 0.7, y1: p.y + size * 0.6 } },
      { x: p.x - 9, y: p.y + size * 0.32, anchor: 'end', box: { x0: p.x - 13 - w, x1: p.x - 5, y0: p.y - size * 0.7, y1: p.y + size * 0.6 } },
      { x: p.x, y: p.y - 11, anchor: 'middle', box: { x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y - 11 - size, y1: p.y - 7 } },
      { x: p.x, y: p.y + size + 8, anchor: 'middle', box: { x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y + 6, y1: p.y + size + 12 } },
    ];
    const free = (t) => t.box.x0 > 6 && t.box.x1 < W - 6 && t.box.y0 > 6 && t.box.y1 < H - 6 && !placed.some((o) => overlaps(t.box, o));
    let fit = tries.find(free);
    // The biggest city must always be named: search outward for the nearest free spot.
    if (!fit && rank === 1) {
      const spots = [];
      for (let dy = -90; dy <= 90; dy += 6) {
        for (let dx = -170; dx <= 170; dx += 6) spots.push({ dx, dy, d: Math.hypot(dx * 0.6, dy) });
      }
      spots.sort((u, v) => u.d - v.d);
      for (const { dx, dy } of spots) {
        const cx = p.x + dx;
        const cy = p.y + dy;
        const t = { x: cx, y: cy + size * 0.32, anchor: 'middle', box: { x0: cx - w / 2, x1: cx + w / 2, y0: cy - size * 0.7, y1: cy + size * 0.6 }, leader: Math.hypot(dx, dy) > 26 };
        if (free(t)) {
          fit = t;
          break;
        }
      }
    }
    return fit ? { name, rank, size, p, ...fit } : null;
  };

  // The biggest city is named first, so nothing else crowds it out.
  const bigCities = useMemo(() => {
    const placed = [...obstacles];
    const out = [];
    for (const [name, lat, lng, rank] of CITIES.filter((c) => c[3] === 1)) {
      const c = placeCity(name, lat, lng, rank, placed);
      if (c) {
        placed.push(c.box);
        out.push(c);
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, W, H, ms, obstacles]);

  // Road signs: keep those that fit inside the picture and don't cover a pin, a label or the big city.
  const shields = useMemo(() => {
    const out = [];
    const blockers = [...obstacles, ...bigCities.map((c) => c.box)];
    for (const r of ROADS) {
      const w = (r.label.length * 8.6 + 16) * ms;
      const h = 24 * ms;
      for (const [lat, lng] of r.shields) {
        const p = project({ lat, lng });
        const box = { x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y - h / 2, y1: p.y + h / 2 };
        if (box.x0 < 8 || box.x1 > W - 8 || box.y0 < 8 || box.y1 > H - 8) continue;
        if (blockers.some((o) => overlaps(box, o))) continue;
        if (out.some((q) => overlaps(box, q.box))) continue;
        out.push({ key: `${r.id}-${lat}-${lng}`, label: r.label, x: p.x, y: p.y, w, h, box });
      }
    }
    return out;
  }, [project, W, H, ms, obstacles, bigCities]);

  // Other city names: each tried to the right, left, above and below its dot.
  const cities = useMemo(() => {
    const placed = [...obstacles, ...bigCities.map((c) => c.box), ...shields.map((s) => s.box)];
    const out = [...bigCities];
    for (const [name, lat, lng, rank] of CITIES.filter((c) => c[3] !== 1).sort((u, v) => u[3] - v[3])) {
      const c = placeCity(name, lat, lng, rank, placed);
      if (c) {
        placed.push(c.box);
        out.push(c);
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, W, H, ms, obstacles, shields, bigCities]);

  // Scale bar: how many pixels are 5 miles?
  const ppm = useMemo(() => {
    const lat = 33.75;
    const a = project({ lat, lng: -84.4 });
    const b = project({ lat, lng: -84.4 + 1 / (69.172 * Math.cos((lat * Math.PI) / 180)) });
    return Math.abs(b.x - a.x);
  }, [project]);
  const barLen = ppm * 5;

  return (
    <g aria-hidden="true">
      <rect width={W} height={H} fill={LAND} />

      {/* Roads: dark edge first, then the coloured centre, so crossings join cleanly */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {roads.map((r) => (
          <path key={`${r.id}-edge`} d={r.d} stroke={EDGE} strokeWidth={r.kind === 'interstate' ? 11 : 8.5} />
        ))}
        {roads.map((r) => (
          <path key={`${r.id}-fill`} d={r.d} stroke={r.kind === 'interstate' ? GOLD : '#ffffff'} strokeWidth={r.kind === 'interstate' ? 7 : 5} />
        ))}
      </g>

      {shields.map((s) => (
        <g key={s.key}>
          <rect x={s.x - s.w / 2} y={s.y - s.h / 2} width={s.w} height={s.h} rx={6 * ms} fill={EDGE} stroke="#ffffff" strokeWidth="1.5" />
          <text className="map-shield" x={s.x} y={s.y + 5 * ms} textAnchor="middle">
            {s.label}
          </text>
        </g>
      ))}

      {cities.map((c) => (
        <g key={c.name}>
          {c.leader && <line x1={c.p.x} y1={c.p.y} x2={c.x} y2={c.y - c.size * 0.3} stroke={EDGE} strokeWidth="2" />}
          <circle cx={c.p.x} cy={c.p.y} r={c.rank === 1 ? 6 : 4.5} fill={EDGE} stroke="#ffffff" strokeWidth="2" />
          <text className={c.rank === 1 ? 'map-city map-city-big' : 'map-city'} x={c.x} y={c.y} textAnchor={c.anchor}>
            {c.name}
          </text>
        </g>
      ))}

      {/* Scale bar */}
      <g transform={`translate(40 ${H - 64})`}>
        <rect x="-10" y="-22" width={Math.max(barLen, 62) + 20} height="42" rx="8" fill="#ffffff" fillOpacity="0.9" />
        <line x1="0" y1="0" x2={barLen} y2="0" stroke={EDGE} strokeWidth="4" strokeLinecap="butt" />
        <line x1="0" y1="-7" x2="0" y2="7" stroke={EDGE} strokeWidth="3" />
        <line x1={barLen} y1="-7" x2={barLen} y2="7" stroke={EDGE} strokeWidth="3" />
        <text className="map-scale" x={barLen / 2} y="15" textAnchor="middle">
          5 miles
        </text>
      </g>

      {/* North arrow */}
      <g transform={`translate(${W - 52} 58)`}>
        <circle r="26" fill="#ffffff" fillOpacity="0.9" stroke={EDGE} strokeWidth="2" />
        <polygon points="0,-17 7,6 0,1 -7,6" fill={EDGE} />
        <text className="map-scale" x="0" y="21" textAnchor="middle" fontSize="13">
          N
        </text>
      </g>
    </g>
  );
}
