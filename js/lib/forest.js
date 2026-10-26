/* Estimates with their 95% intervals, one row each: the label, the
   interval on a shared scale, and the estimate printed in the paper's
   style. Built from HTML rows (the interval positioned in percent of its
   cell) so the plot stays sharp and readable at any width; on a phone the
   label sits above its interval.

   rows: [{ label, e, lo, hi, p, n, base, main }] in the unit to print,
         or { head: "Group title" } for a group heading. A row with
         main: true is the main specification (filled marker); any other
         row is an alternative specification (open marker).
   opts: { unit: "pp", d: 1, ref: 0, axis: "label under the scale",
           domain: [lo, hi] (optional), value: (row) => "text" (optional) } */

import { el } from "./dom.js";
import { ticks } from "./scale.js";
import * as fmt from "./format.js";
import * as tip from "./tooltip.js";
import { NAVY, GRAY_DARK } from "./palette.js";

export function valueText(r, d = 1, unit = "") {
  return `${fmt.num(r.e, d)}${unit} ${fmt.ci(r.lo, r.hi, d)}${fmt.stars(r.p)}`;
}

export function forest(host, rows, opts = {}) {
  const d = opts.d ?? 1;
  const ref = opts.ref ?? 0;
  const data = rows.filter((r) => !r.head);
  let lo = Math.min(ref, ...data.map((r) => r.lo));
  let hi = Math.max(ref, ...data.map((r) => r.hi));
  if (opts.domain) [lo, hi] = opts.domain;
  const pad = (hi - lo) * 0.06 || 1;
  const t = ticks(lo - pad, hi + pad, opts.ticks ?? 5);
  const d0 = Math.min(lo - pad, t[0]);
  const d1 = Math.max(hi + pad, t[t.length - 1]);
  const x = (v) => ((v - d0) / (d1 - d0)) * 100;

  const wrap = el("div.forest" + (opts.compact ? ".compact" : ""));
  const axis = el("div.forest-row.forest-axis", {}, [
    el("div.f-label", { text: opts.labelHead ?? "" }),
    el("div.f-plot", {}, t.map((v) => el("span.f-tick", { style: { left: `${x(v)}%` }, text: opts.tickFormat ? opts.tickFormat(v) : fmt.num(v, Math.abs(v) < 1 && v !== 0 ? 1 : 0) }))),
    el("div.f-val", { text: opts.valueHead ?? `estimate ${opts.unit ? `(${opts.unit})` : ""}`.trim() }),
  ]);
  wrap.appendChild(axis);

  for (const r of rows) {
    if (r.head) {
      wrap.appendChild(el("div.forest-head", { text: r.head }));
      continue;
    }
    const col = r.color || (r.main ? NAVY : GRAY_DARK);
    const open = !r.main;
    const plot = el("div.f-plot", {}, [
      el("i.f-ref", { style: { left: `${x(ref)}%` } }),
      el("i.f-ci", { style: { left: `${x(r.lo)}%`, width: `${Math.max(0.3, x(r.hi) - x(r.lo))}%`, background: col } }),
      el("i.f-dot" + (open ? ".open" : ""), { style: { left: `${x(r.e)}%`, borderColor: col, background: open ? "#fff" : col } }),
    ]);
    const row = el("div.forest-row" + (r.main ? ".key" : ""), {}, [
      el("div.f-label", {}, [r.label]),
      plot,
      el("div.f-val", { text: opts.value ? opts.value(r) : valueText(r, d) }),
    ]);
    row.addEventListener("pointerenter", (ev) => {
      const tr = [["estimate", `${fmt.num(r.e, d)}${opts.unit ? ` ${opts.unit}` : ""}`], ["95% CI", fmt.ci(r.lo, r.hi, d)]];
      if (r.p !== undefined && r.p !== null) tr.push(["p", fmt.pval(r.p).replace("p ", "")]);
      if (r.base !== undefined && r.base !== null) tr.push(["outcome mean", fmt.pct(r.base)]);
      if (r.n) tr.push(["n", fmt.count(r.n)]);
      tip.show(ev, { title: r.label, rows: tr, note: r.note || opts.note || "" });
    });
    row.addEventListener("pointermove", tip.move);
    row.addEventListener("pointerleave", tip.hide);
    wrap.appendChild(row);
  }
  if (opts.axis) wrap.appendChild(el("div.forest-foot", { text: opts.axis }));
  host.appendChild(wrap);
  return wrap;
}

/** The legend of the markers, shared by every forest on the site. */
export function forestKey() {
  return el("div.legend.forest-key", {}, [
    el("span.item", {}, [el("i.f-dot.key", { style: { background: NAVY, borderColor: NAVY } }), "main specification"]),
    el("span.item", {}, [el("i.f-dot.key.open", { style: { borderColor: GRAY_DARK } }), "alternative specification"]),
    el("span.item", {}, ["* p < .05  ** p < .01  *** p < .001"]),
  ]);
}
