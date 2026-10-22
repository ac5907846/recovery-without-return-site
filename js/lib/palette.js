/* The paper's figure palette (02_analysis/_shared/figlib.py), so the
   site and the manuscript read as one system: navy, deep pink, deep
   green and grays; no light blue, no orange. Filled marks take a pale
   fill and a thin dark outline; lines and markers keep the saturated
   colours. */

export const INK = "#14181d";
export const NAVY = "#16385c";
export const PINK = "#a8325e";
export const GREEN = "#2f6b4f";
export const WINE = "#7b1e3b";
export const GRAY = "#8c8c8c";
export const GRAY_DARK = "#595959";
export const GRAY_LIGHT = "#bfbfbf";
export const GRID = "#e6e8eb";
export const RULE = "#c9ced4";
export const MUTED = "#626a75";
export const LAND = "#f2f2f2";
export const LAND_CONTEXT = "#ececea";
export const WATER = "#ffffff";

export const PALE = {
  navy: "#dce6f0", pink: "#f3dde5", green: "#dfeadf", gray: "#ececec",
};

/* The two clocks: green is the pre-storm owner, pink a new owner; the
   recovery matrix cells of Figure 1. */
export const OWNER = { retained: GREEN, transferred: PINK };
export const CLASS = {
  rr: { fill: PALE.green, line: GREEN, label: "Restored, retained" },
  rt: { fill: PALE.pink, line: PINK, label: "Restored, transferred" },
  ur: { fill: PALE.gray, line: GRAY_DARK, label: "Unrestored, retained" },
  ut: { fill: "#ffffff", line: GRAY_DARK, label: "Unrestored, transferred" },
  cl: { fill: PALE.gray, line: GRAY, label: "Cleared lot" },
};

/* owner groups (Figure 7's cards) */
export const GROUP = { resident: NAVY, nonresident: GRAY_DARK, business: PINK };

/* the pre-specified estimate and its checks (forest plots) */
export const STATUS = {
  "pre-specified": NAVY,
  "pre-specified, reported": NAVY,
  "part of K": GRAY_DARK,
  check: GRAY_DARK,
  "added check": GRAY,
  reported: GRAY_DARK,
  description: GRAY_DARK,
};

const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
export function mix(a, b, t) {
  const A = hex(a);
  const B = hex(b);
  const u = Math.max(0, Math.min(1, t));
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * u).toString(16).padStart(2, "0")).join("");
}

/* The sequential ramps of the paper's maps and surfaces (Figures 5 and 6):
   pale to saturated, never light blue. */
export const RAMPS = {
  navy: ["#dce6f0", NAVY],
  wine: ["#f3dde5", WINE],
  green: ["#dfeadf", GREEN],
  gray: ["#ececec", GRAY_DARK],
};
export function ramp(name, t) {
  const [a, b] = RAMPS[name] || RAMPS.navy;
  return mix(a, b, t);
}
