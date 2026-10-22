/* Numbers in the manuscript's style: no leading zero on decimals (.43),
   no plus sign, the plain hyphen-minus, percentages without decimals
   unless asked, intervals written "(1.4 to 4.2)", significance marks
   * p < .05, ** p < .01, *** p < .001. */

export function stripZero(s) {
  return String(s).replace(/(^|[\s(=[\-])0\./g, "$1.");
}

const bad = (v) => v === null || v === undefined || Number.isNaN(Number(v));

/** Fixed decimals, leading zero removed, "-0" written "0". */
export function num(v, d = 2) {
  if (bad(v)) return "n/a";
  const s = Number(v).toFixed(d);
  if (Number(s) === 0) return "0";
  return stripZero(s);
}

/** A share as a percentage: .257 -> "26%". */
export function pct(v, d = 0) {
  if (bad(v)) return "n/a";
  return `${num(v * 100, d)}%`;
}

/** A share in percentage points: .028 -> "2.8". */
export function pts(v, d = 1) {
  if (bad(v)) return "n/a";
  return num(v * 100, d);
}

export function count(v) {
  if (bad(v)) return "n/a";
  return Math.round(v).toLocaleString("en-US");
}

/** "(1.4 to 4.2)" from two numbers already in the unit to print. */
export function ci(lo, hi, d = 1) {
  if (bad(lo) || bad(hi)) return "";
  return `(${num(lo, d)} to ${num(hi, d)})`;
}

export function stars(p) {
  if (bad(p)) return "";
  if (p < 0.001) return "***";
  if (p < 0.01) return "**";
  if (p < 0.05) return "*";
  return "";
}

export function pval(p) {
  if (bad(p)) return "";
  if (p < 0.001) return "p < .001";
  return `p = ${num(p, 3)}`;
}

/** Axis ticks: shares as percentages, counts compact. */
export function tickPct(v) {
  return `${Math.round(v * 100)}%`;
}

export function tick(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return `${num(v / 1e6, 1)}M`;
  if (a >= 1e4) return `${Math.round(v / 1e3)}k`;
  if (a >= 1000) return count(v);
  if (a === 0) return "0";
  if (a >= 10) return String(Math.round(v * 10) / 10);
  return stripZero(String(Math.round(v * 1000) / 1000));
}

/** "September 28, 2022" from "2022-09-28" or "20220928". */
export function dateLong(s) {
  const t = String(s).replace(/-/g, "");
  const d = new Date(Date.UTC(+t.slice(0, 4), +t.slice(4, 6) - 1, +t.slice(6, 8)));
  return d.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "September 28, 2022 18:00 UTC" from HURDAT2's "202209281800". */
export function fixTime(s) {
  const t = String(s);
  return `${dateLong(t.slice(0, 8))}, ${t.slice(8, 10)}:${t.slice(10, 12)} UTC`;
}

/** Months of a roll, rounded: 39.08 -> "39". */
export const mo = (v) => (bad(v) ? "n/a" : String(Math.round(v)));
