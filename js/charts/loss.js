/* The Structural loss page (H1). Figure 3 as an interactive street: the
   five paths of a resident-owned home that lost three quarters or more of
   its structure, one row per path, one lot per roll. The height of each
   house is the mean fraction of the pre-storm structure value the homes on
   that path had regained (a full roof from .90, a tarp between .25 and .90,
   a stub below, a cleared lot when most lots are cleared); the roof is the
   owner the majority had on that roll. Then every H1 estimate with its
   checks (Table 3) and what the new owners build.

   Data: data/loss.json. */

import { el, svg, clear, segmented } from "../lib/dom.js";
import * as fmt from "../lib/format.js";
import * as tip from "../lib/tooltip.js";
import { makeLot } from "../lib/house.js";
import { GREEN, PINK, INK, MUTED } from "../lib/palette.js";
import { forest, forestKey } from "../lib/forest.js";
import { tour } from "../lib/tour.js";
import { howto, pick, finding } from "../lib/read.js";

const L = 44;
const COL = 112;
const ROW = 104;
const LABEL_W = 150;
const SHARE_W = 116;
const TOP = 56;

function specOf(r) {
  if (r.cleared > 0.5) return { kind: "cleared" };
  const roof = r.changed > 0.5 ? PINK : GREEN;
  if (r.F >= 0.9) return { kind: "full", roof };
  if (r.F >= 0.25) return { kind: "tarp", h: r.F, roof };
  return { kind: "stub", h: r.F };
}

export function lossChart(host, app) {
  const D = app.loss;
  const months = D.months;
  const state = { label: "F", lit: null };

  const labelSeg = segmented([{ key: "F", label: "Value regained" }, { key: "changed", label: "New owner" }, { key: "cleared", label: "Cleared lot" }],
    state.label, (k) => { state.label = k; paintLabels(); });
  const controls = el("div.controls", {}, [el("div.control", {}, [el("span.label", { text: "Number under each lot" }), labelSeg])]);

  /* ---- the street of paths */
  const W = LABEL_W + 5 * COL + SHARE_W;
  const H = TOP + D.paths.length * ROW + 10;
  const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "The five paths of a destroyed home" });
  const heads = ["before the storm", ...[1, 2, 3, 4].map((k) => `${fmt.mo(months[k])} months`)];
  heads.forEach((h, c) => root.append(svg("text", { x: LABEL_W + c * COL + COL / 2, y: 20, "text-anchor": "middle", "font-size": 14, "font-weight": 600, text: h })));
  root.append(svg("text", { x: W - 6, y: 20, "text-anchor": "end", "font-size": 14, "font-weight": 600, text: "share" }),
    svg("text", { x: W - 6, y: 37, "text-anchor": "end", "font-size": 12, fill: MUTED, text: "of destroyed homes" }),
    svg("text", { x: LABEL_W + 3 * COL, y: 37, "text-anchor": "middle", "font-size": 12, fill: MUTED, text: "after landfall" }));
  const rowsG = [];
  const valueTexts = [];
  D.paths.forEach((p, r) => {
    const g = svg("g", { class: "path-row" });
    const y0 = TOP + r * ROW;
    if (r % 2 === 0) g.append(svg("rect", { x: 0, y: y0 - 6, width: W, height: ROW, fill: "#fafafa" }));
    const words = p.label.split(" ");
    const lines = words.length > 2 ? [words.slice(0, 2).join(" "), words.slice(2).join(" ")] : [p.label];
    lines.forEach((t, i) => g.append(svg("text", { x: 6, y: y0 + 38 + i * 17, "font-size": 14.5, "font-weight": 700, text: t })));
    const lots = [];
    for (let c = 0; c < 5; c += 1) {
      const cx = LABEL_W + c * COL + COL / 2;
      const [ox, oy] = [cx, y0 + 22];
      const lot = makeLot(g, ox, oy, L);
      const rr = c === 0 ? null : p.rolls[c - 1];
      lot.set(c === 0 ? { kind: "full", roof: GREEN } : specOf(rr), 0);
      lots.push(lot);
      const t = svg("text", { x: cx, y: y0 + 22 + 2 * L * Math.sin(Math.PI / 6) + 17, "text-anchor": "middle", "font-size": 13.5, fill: INK, text: "" });
      g.append(t);
      if (c > 0) valueTexts.push({ t, roll: rr, path: p });
      lot.g.addEventListener("pointerenter", (ev) => hover(ev, p, c));
      lot.g.addEventListener("pointermove", tip.move);
      lot.g.addEventListener("pointerleave", () => { tip.hide(); light(state.lit); });
    }
    const dag = p.key === "recovery without return" ? "†" : "";
    g.append(svg("text", { x: W - 6, y: y0 + 40, "text-anchor": "end", "font-size": 17, "font-weight": 700, text: `${fmt.pct(p.share)}${dag}` }),
      svg("text", { x: W - 6, y: y0 + 59, "text-anchor": "end", "font-size": 12.5, fill: MUTED, text: `${fmt.count(p.n)} homes` }));
    root.append(g);
    rowsG.push({ g, p, lots });
  });
  const h = D.headline;
  const legend = el("div.legend", {}, [
    el("span.item", {}, [el("i.sq", { style: { background: GREEN } }), "pre-storm owner"]),
    el("span.item", {}, [el("i.sq", { style: { background: PINK } }), "new owner"]),
    el("span.item.note", {}, ["height: value regained; stars: against the path above; * p < .05 ** p < .01 *** p < .001"]),
    el("span.item.note", {}, [`† restored homes under a new owner: ${fmt.num(h.rwr)} against ${fmt.num(h.ref)} where the loss was .25 to .50${fmt.stars(h.p)}`]),
  ]);
  const figure = el("div.figure", {}, [el("div.scrollx", {}, [root]), legend]);

  function paintLabels() {
    labelSeg.setValue(state.label);
    for (const v of valueTexts) {
      const r = v.roll;
      let s;
      if (state.label === "F") s = r.cleared > 0.5 ? "cleared" : `${fmt.num(r.F)}${fmt.stars(r.p)}`;
      else if (state.label === "changed") s = fmt.pct(r.changed);
      else s = fmt.pct(r.cleared);
      v.t.textContent = s;
    }
  }
  function light(r) {
    rowsG.forEach((row, i) => row.g.classList.toggle("dim", r !== null && r !== undefined && !(Array.isArray(r) ? r.includes(i) : r === i)));
  }
  function hover(ev, p, c) {
    if (c === 0) {
      tip.show(ev, { title: `${p.label}: before the storm`, rows: [["owner", "the pre-storm owner, held two rolls or more"]] });
      return;
    }
    const r = p.rolls[c - 1];
    const rows = [["value regained", `${fmt.num(r.F)} ${fmt.ci(r.lo, r.hi, 2)}`], ["under a new owner", fmt.pct(r.changed)], ["cleared lot", fmt.pct(r.cleared)]];
    if (r.p !== null && r.p !== undefined) rows.push(["against the path above", fmt.pval(r.p)]);
    tip.show(ev, { title: `${p.label}, ${fmt.mo(months[r.k])} months`, rows, note: p.def });
  }
  paintLabels();

  /* ---- the reading: H1 */
  const main = D.estimates.find((e) => e.group === "owner" && e.status === "pre-specified");
  const side = el("aside.sidecard", {}, [
    el("h4", { text: "H1: severe loss separates the clocks" }),
    el("p.what", { text: "Among restored resident homes, the chance of a new owner when the house lost half or more of its structure, against a quarter to a half, by s+3 (the third roll after the storm, about 27 months):" }),
    el("div.bignum", { html: `${fmt.num(main.e, 1)}<small>pp ${fmt.ci(main.lo, main.hi)}${fmt.stars(main.p)}</small>` }),
    el("p.what", { text: `On a base of ${fmt.pct(main.base)}; ${fmt.count(main.n)} restored homes, tract-by-season fixed effects, standard errors clustered by county. Pre-specified, passed.` }),
    el("dl", {}, [
      el("dt", { text: "restored homes under a new owner, loss .75 or more" }), el("dd", { text: `${fmt.num(h.rwr)} ${fmt.ci(h.lo, h.hi, 2)}` }),
      el("dt", { text: "the same, loss .25 to .50" }), el("dd", { text: fmt.num(h.ref) }),
    ]),
  ]);

  const tourHost = el("div");
  clear(host).append(tourHost, controls, el("div.panelgrid", {}, [figure, side]));

  /* ---- the estimates */
  host.append(el("h3.rule", { text: "H1 and its checks" }),
    el("p.sub", { text: "A new owner among restored resident homes, loss .50 or more against .25 to .50, in percentage points. Every check keeps the sign; the thresholds move the restoration line." }));
  const fh = el("div");
  host.append(fh);
  forest(fh, D.estimates.filter((e) => e.group === "owner").map((e, i) => ({ ...e, key: i === 0 })), { unit: "pp", d: 1, axis: "percentage points; the line marks no difference" });
  host.append(forestKey());

  host.append(el("h3.rule", { text: "What the new owners build" }),
    el("p.sub", { text: "Separation is not a faster recovery. Value regained by s+3 (about 27 months), damaged resident homes present on that roll, in percentage points; then the floor area of rebuilt houses and the assessment-cap terms." }));
  const grid = el("div.panelgrid");
  const fv = el("div");
  forest(fv, D.estimates.filter((e) => e.group === "value" || e.group === "area").map((e) => ({ ...e, label: e.group === "area" ? "rebuilt floor area, new vs pre-storm owner (%)" : `value regained: ${e.label}` })),
    { unit: "", d: 1, axis: "percentage points (floor area: percent)" });
  const capBox = el("aside.sidecard", {}, [el("h4", { text: "Within the assessment-cap terms" }),
    el("p.what", { text: "Rebuilt within 110% of the former floor area or 1,500 square feet, the terms in force through the 2025 roll:" })]);
  for (const c of D.cap) {
    capBox.append(el("div.minibar", {}, [el("span.k", { text: c.owner }),
      el("span.t", {}, [el("i", { style: { width: `${c.within * 100}%`, background: c.owner === "new owner" ? "#e4aac0" : "#9cc3a9" } })]),
      el("b", { text: fmt.pct(c.within) })]));
  }
  capBox.append(el("p.what", { text: `Median rebuilt area over the former area: ${D.cap.map((c) => `${c.owner} ${fmt.num(c.area_ratio, 2)}`).join("; ")}. The terms bind neither.` }));
  grid.append(fv, capBox);
  host.append(grid);

  howto(host, {
    lines: [
      "The street follows the resident-owned homes of the storm-struck tracts that lost three quarters or more of their structure (seasons 2016 to 2021), grouped by their state on the fourth roll: five paths, each a row.",
      "A house's height is the mean fraction of pre-storm structure value regained on that path and roll; its roof is the owner most of those homes had. Switch the number under each lot between value regained, the share under a new owner and the share cleared.",
      "The estimates are linear probability models with tract-by-season fixed effects; a filled marker is the pre-specified test, an open one a check of it.",
    ],
    terms: pick("rwr", "ret", "stranded", "unresolved", "cleared", "loss", "pp", "ci", "prespec"),
  });

  const val = (lab) => D.estimates.find((e) => e.label === lab);
  const gx = val("loss .50 or more × owner changed");
  finding(`Among restored resident homes, a new owner is <b>${fmt.num(main.e, 1)} pp</b> more likely when the house lost half or more of its structure ${fmt.ci(main.lo, main.hi)}, on a base of ${fmt.pct(main.base)}; and a destroyed house that changed hands has regained ${fmt.num(-gx.e, 1)} pp less of its value. The house comes back, often to someone else, and more slowly.`);

  const ret = D.paths[0];
  const rwr = D.paths[1];
  tour({
    name: "structural loss",
    steps: [
      { cap: "Each row is one path of a home that lost three quarters or more of its structure; each lot one roll after the storm.", ms: 3800, run: () => light(null) },
      { cap: `Recovery with return: ${fmt.pct(ret.share)} of these homes, restored by the owner who held them before the storm.`, ms: 3400, run: () => light(0) },
      { cap: `Recovery without return: ${fmt.pct(rwr.share)}, restored under a new owner.`, ms: 3400, run: () => light(1) },
      { cap: `Of the restored homes, ${fmt.num(h.rwr)} changed hands, against ${fmt.num(h.ref)} where the loss was a quarter to a half.`, ms: 3800, run: () => light([0, 1]) },
      { cap: `The new owners are not faster: at 27 months they have regained ${fmt.num(rwr.rolls[2].F)} of the value, the pre-storm owners ${fmt.num(ret.rolls[2].F)}.`, ms: 4400, run: () => { state.label = "F"; paintLabels(); light([0, 1]); } },
      { cap: `${fmt.pct(D.paths[4].share)} of the lots are still cleared 39 months after landfall.`, ms: 3400, run: () => light(4) },
    ],
    after: () => {},
    rest: () => { state.label = "F"; paintLabels(); light(null); },
  }).attach(tourHost);
}
