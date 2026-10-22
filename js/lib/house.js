/* Isometric houses, the drawing language of the paper's Figure 3. A lot
   is a rhombus; a house on it is a box with a gable roof. Two channels
   carry the two clocks: the height of the house is the structure (a full
   house with its roof when restored, a low box under a tarp when not, an
   empty lot with debris when cleared) and the colour of the roof is the
   owner (green: the pre-storm owner; pink: a new owner).

   makeLot(parent, ox, oy, L) returns a handle whose set(spec, ms) moves
   the lot to a new state, tweening the height and the roof rise so a
   house can rise, fall or be cleared in place. Colours change through a
   CSS transition. Every outline is a thin dark line (the author's rule). */

import { svg } from "./dom.js";
import { INK, mix } from "./palette.js";

const C = Math.cos(Math.PI / 6);
const S = Math.sin(Math.PI / 6);
export const WALL_L = "#f4f1eb";
export const WALL_R = "#dcd6cc";
export const GROUND = "#ececec";
export const DEBRIS = "#c8c8c8";
export const STUB = "#bdbdbd";

const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Screen point of the lot-local point (x, y, z), the lot's back corner at (ox, oy). */
export function iso(ox, oy, x, y, z) {
  return [ox + (x - y) * C, oy + (x + y) * S - z];
}

const poly = (pts) => `M${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L")}Z`;

/** Screen width and height of one lot of side L (ground only). */
export const lotW = (L) => 2 * L * C;
export const lotH = (L) => 2 * L * S;

function faces(ox, oy, L, H, R, fp) {
  const W = L * fp;
  const a = (L - W) / 2;
  const b = (L - W) / 2;
  const D = W;
  const P = (x, y, z) => iso(ox, oy, x, y, z);
  const ground = poly([P(0, 0, 0), P(L, 0, 0), P(L, L, 0), P(0, L, 0)]);
  if (H <= 0.01) return { ground, back: "", left: "", right: "", gable: "", front: "" };
  const back = poly([P(a, b, H), P(a + W, b, H), P(a + W, b + D / 2, H + R), P(a, b + D / 2, H + R)]);
  const left = poly([P(a, b + D, 0), P(a + W, b + D, 0), P(a + W, b + D, H), P(a, b + D, H)]);
  const right = poly([P(a + W, b, 0), P(a + W, b + D, 0), P(a + W, b + D, H), P(a + W, b, H)]);
  const gable = R > 0.01 ? poly([P(a + W, b, H), P(a + W, b + D, H), P(a + W, b + D / 2, H + R)]) : "";
  const front = poly([P(a, b + D, H), P(a + W, b + D, H), P(a + W, b + D / 2, H + R), P(a, b + D / 2, H + R)]);
  return { ground, back, left, right, gable, front };
}

function debrisPaths(ox, oy, L) {
  const P = (x, y) => iso(ox, oy, x, y, 0);
  const bits = [[.22, .30, .10], [.58, .22, .08], [.46, .62, .09], [.72, .70, .07]];
  return bits.map(([x, y, s]) => poly([P(x * L, y * L), P((x + s) * L, y * L), P((x + s) * L, (y + s * .6) * L), P(x * L, (y + s * .6) * L)]));
}

/** The geometry of a state. kind: "full" | "tarp" | "stub" | "cleared"; h in (0, 1] scales a tarp or stub. */
export function shape(kind, L, h = 1) {
  const Hf = 0.52 * L;
  const Rf = 0.30 * L;
  if (kind === "full") return { H: Hf, R: Rf };
  if (kind === "tarp") return { H: Math.max(0.16, h) * Hf, R: 0 };
  if (kind === "stub") return { H: Math.max(0.10, h) * Hf, R: 0 };
  return { H: 0, R: 0 };
}

export function makeLot(parent, ox, oy, L, opts = {}) {
  const fp = opts.footprint ?? 0.62;
  const g = svg("g", { class: "lot" });
  const ground = svg("path", { class: "lot-ground", fill: GROUND, stroke: INK, "stroke-width": 0.5 });
  const debris = svg("g", { class: "lot-debris" });
  for (const d of debrisPaths(ox, oy, L)) {
    debris.appendChild(svg("path", { d, fill: DEBRIS, stroke: INK, "stroke-width": 0.4 }));
  }
  const house = svg("g", { class: "lot-house" });
  const back = svg("path", { class: "roof-back", stroke: INK, "stroke-width": 0.6, "stroke-linejoin": "round" });
  const left = svg("path", { fill: WALL_L, stroke: INK, "stroke-width": 0.6, "stroke-linejoin": "round" });
  const right = svg("path", { fill: WALL_R, stroke: INK, "stroke-width": 0.6, "stroke-linejoin": "round" });
  const gable = svg("path", { fill: WALL_R, stroke: INK, "stroke-width": 0.6, "stroke-linejoin": "round" });
  const front = svg("path", { class: "roof-front", stroke: INK, "stroke-width": 0.6, "stroke-linejoin": "round" });
  house.append(back, left, right, gable, front);
  g.append(ground, debris, house);
  parent.appendChild(g);

  let cur = { H: 0, R: 0, roof: GROUND, debris: 1 };
  let raf = 0;

  function paint(H, R) {
    const f = faces(ox, oy, L, H, R, fp);
    ground.setAttribute("d", f.ground);
    back.setAttribute("d", f.back);
    left.setAttribute("d", f.left);
    right.setAttribute("d", f.right);
    gable.setAttribute("d", f.gable);
    front.setAttribute("d", f.front);
    const vis = Math.min(1, H / (0.12 * L));
    house.setAttribute("opacity", vis.toFixed(3));
    debris.setAttribute("opacity", (cur.debris * (1 - vis)).toFixed(3));
  }

  /** spec: { kind, h, roof } ; ms: tween length (0 jumps). */
  function set(spec, ms = 0) {
    const tgt = shape(spec.kind, L, spec.h);
    const roof = spec.kind === "stub" ? STUB : spec.roof;
    cur.debris = spec.kind === "cleared" ? 1 : 0;
    if (roof) {
      front.style.fill = roof;
      back.style.fill = mix(roof, "#000000", 0.18);
    }
    cancelAnimationFrame(raf);
    const from = { H: cur.H, R: cur.R };
    if (!ms || reduced) {
      cur = { ...cur, ...tgt };
      paint(cur.H, cur.R);
      return;
    }
    const t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      const k = ease(t);
      const H = from.H + (tgt.H - from.H) * k;
      const R = from.R + (tgt.R - from.R) * k;
      cur.H = H;
      cur.R = R;
      paint(H, R);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    setTimeout(() => { if (cur.H !== tgt.H || cur.R !== tgt.R) { cur.H = tgt.H; cur.R = tgt.R; paint(tgt.H, tgt.R); } }, ms + 120);
  }

  paint(0, 0);
  return { g, set };
}

/** The hurricane symbol of the paper's figures: a spiral, drawn as a path. */
export function stormGlyph(cx, cy, r, color = INK) {
  let d = "";
  const turns = 3.2;
  const n = 90;
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const a = t * turns * 2 * Math.PI;
    const rr = r * (0.12 + 0.88 * t);
    const x = cx + rr * Math.cos(a);
    const y = cy + rr * Math.sin(a) * 0.62;
    d += `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return svg("path", { d, fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linecap": "round", class: "storm-glyph" });
}
