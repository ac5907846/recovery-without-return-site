/* Map geometry. tools/builders/map.py projects every shape to the paper's
   map projection (EPSG:3086, Florida GDL Albers) and writes it in integer
   units of 10 m from the top-left corner of the frame, y running down,
   each ring delta-encoded (the first vertex absolute, then the steps).
   The browser decodes the rings once and draws them in those units; the
   SVG viewBox does the scaling, so zooming is a viewBox change. */

/** One delta-encoded ring -> [[x, y], ...] in frame units. */
export function decodeRing(flat) {
  const out = new Array(flat.length / 2);
  let x = 0;
  let y = 0;
  for (let i = 0, j = 0; i < flat.length; i += 2, j += 1) {
    if (i === 0) { x = flat[0]; y = flat[1]; } else { x += flat[i]; y += flat[i + 1]; }
    out[j] = [x, y];
  }
  return out;
}

/** SVG path data for a list of encoded rings, with optional scale. */
export function pathOf(rings, k = 1) {
  let d = "";
  for (const flat of rings) {
    let x = 0;
    let y = 0;
    for (let i = 0; i < flat.length; i += 2) {
      if (i === 0) { x = flat[0]; y = flat[1]; d += `M${(x * k).toFixed(0)},${(y * k).toFixed(0)}`; } else {
        x += flat[i];
        y += flat[i + 1];
        d += `L${(x * k).toFixed(0)},${(y * k).toFixed(0)}`;
      }
    }
    d += "Z";
  }
  return d;
}

/** Bounding box [x0, y0, x1, y1] of encoded rings. */
export function bboxOf(rings, box = [Infinity, Infinity, -Infinity, -Infinity]) {
  for (const flat of rings) {
    let x = 0;
    let y = 0;
    for (let i = 0; i < flat.length; i += 2) {
      if (i === 0) { x = flat[0]; y = flat[1]; } else { x += flat[i]; y += flat[i + 1]; }
      if (x < box[0]) box[0] = x;
      if (y < box[1]) box[1] = y;
      if (x > box[2]) box[2] = x;
      if (y > box[3]) box[3] = y;
    }
  }
  return box;
}

/** Visual centre of the largest ring (a label anchor). */
export function centroid(rings) {
  let best = null;
  let bestArea = -1;
  for (const flat of rings) {
    const ring = decodeRing(flat);
    let area = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0, n = ring.length; i < n; i += 1) {
      const [x0, y0] = ring[i];
      const [x1, y1] = ring[(i + 1) % n];
      const cross = x0 * y1 - x1 * y0;
      area += cross;
      cx += (x0 + x1) * cross;
      cy += (y0 + y1) * cross;
    }
    area /= 2;
    if (Math.abs(area) > bestArea && area !== 0) {
      bestArea = Math.abs(area);
      best = [cx / (6 * area), cy / (6 * area)];
    }
  }
  return best;
}

/** A polyline through track fixes [[x, y, ...], ...] in frame units. */
export function trackPath(fixes) {
  return fixes.map((f, i) => `${i ? "L" : "M"}${f[0]},${f[1]}`).join("");
}
