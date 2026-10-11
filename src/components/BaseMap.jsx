import { useMemo } from 'react';
import { CITIES, PARKS, ROADS } from '../data/basemap.js';

// The street-map layer behind the pins, styled in the spirit of a familiar web map:
// warm grey land, amber interstates, white highways, soft green parks, blue road signs,
// grey city names. Pure drawing, no interaction. (The compass and scale bar are on-screen controls in SkyMap.)

export const MAP_COLORS = {
  land: '#efece4',
  street: '#ffffff',
  interstate: '#fcd26a',
  interstateEdge: '#e0a22b',
  highwayEdge: '#cbc5b8',
  park: '#cfe6c4',
  sign: '#2f6fb5',
  ink: '#3c4043',
};
const C = MAP_COLORS;

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
        out.push({ key: `${r.id}-${lat}-${lng}`, label: r.label, kind: r.kind, x: p.x, y: p.y, w, h, box });
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

  // Drawing units per mile, so parks stay to scale.
  const ppm = useMemo(() => {
    const lat = 33.75;
    const a = project({ lat, lng: -84.4 });
    const b = project({ lat, lng: -84.4 + 1 / (69.172 * Math.cos((lat * Math.PI) / 180)) });
    return Math.abs(b.x - a.x);
  }, [project]);

  // Parks: drawn as soft rounded patches, sized in miles so they stay to scale.
  const parks = useMemo(
    () =>
      PARKS.map(([name, lat, lng, wMi, hMi]) => {
        const p = project({ lat, lng });
        return { name, x: p.x, y: p.y, w: wMi * ppm, h: hMi * ppm };
      }),
    [project, ppm],
  );

  return (
    <g aria-hidden="true">
      <defs>
        <pattern id="map-streets" width="52" height="52" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
          <path d="M0,13 H52 M0,39 H52 M17,0 V52 M43,0 V52" stroke={C.street} strokeWidth="2.4" fill="none" />
        </pattern>
      </defs>
      {/* Oversized so the land fills a wide screen beyond the 1000 x 720 drawing area */}
      <rect x={-2500} y={-2500} width={W + 5000} height={H + 5000} fill={C.land} />
      <rect x={-2500} y={-2500} width={W + 5000} height={H + 5000} fill="url(#map-streets)" opacity="0.65" />

      {parks.map((k) => (
        <rect key={k.name} x={k.x - k.w / 2} y={k.y - k.h / 2} width={k.w} height={k.h} rx={Math.min(k.w, k.h) / 2.4} fill={C.park} />
      ))}

      {/* Roads: soft edge first, then the coloured centre, so crossings join cleanly */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {roads.map((r) => (
          <path key={`${r.id}-edge`} d={r.d} stroke={r.kind === 'interstate' ? C.interstateEdge : C.highwayEdge} strokeWidth={r.kind === 'interstate' ? 10 : 8} />
        ))}
        {roads.map((r) => (
          <path key={`${r.id}-fill`} d={r.d} stroke={r.kind === 'interstate' ? C.interstate : C.street} strokeWidth={r.kind === 'interstate' ? 7 : 5.5} />
        ))}
      </g>

      {shields.map((s) => (
        <g key={s.key}>
          <rect x={s.x - s.w / 2} y={s.y - s.h / 2} width={s.w} height={s.h} rx={6 * ms} fill={s.kind === 'interstate' ? C.sign : C.ink} stroke="#ffffff" strokeWidth="2" />
          <text className="map-shield" x={s.x} y={s.y + 5 * ms} textAnchor="middle">
            {s.label}
          </text>
        </g>
      ))}

      {cities.map((c) => (
        <g key={c.name}>
          {c.leader && <line x1={c.p.x} y1={c.p.y} x2={c.x} y2={c.y - c.size * 0.3} stroke={C.ink} strokeWidth="1.5" />}
          <circle cx={c.p.x} cy={c.p.y} r={c.rank === 1 ? 5 : 3.5} fill="#5f6368" stroke="#ffffff" strokeWidth="2" />
          <text className={c.rank === 1 ? 'map-city map-city-big' : 'map-city'} x={c.x} y={c.y} textAnchor={c.anchor}>
            {c.name}
          </text>
        </g>
      ))}

    </g>
  );
}
