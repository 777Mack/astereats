const EARTH_RADIUS_MI = 3958.8;
const toRad = (d) => (d * Math.PI) / 180;

// Straight-line distance in miles (not driving distance).
export function haversineMiles(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h));
}

// Builds a function that turns {lat,lng} into {x,y} inside a width x height box,
// keeping real-world proportions so on-screen distance matches real distance.
export function makeProjector(points, width, height, pad) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const kx = Math.cos(toRad((minLat + maxLat) / 2));
  const spanX = (maxLng - minLng) * kx;
  const spanY = maxLat - minLat;
  const scale = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  return (p) => ({
    x: offX + (p.lng - minLng) * kx * scale,
    y: offY + (maxLat - p.lat) * scale,
  });
}
