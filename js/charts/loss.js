/* The Structural loss page (H1). Figure 3 as an interactive street: the
   five recovery pathways of a resident owner-occupied L75 home, one row
   per pathway, one lot per roll. The height of each house is the mean
   capped R of the homes on that pathway (a full roof from 90%, a tarp
   between 25% and 90%, a stub below, a cleared lot when most lots are
   cleared); the roof is the owner the majority had on that roll. Then
   every estimate of Table 4, the main and the alternative specifications.

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

  const labelSeg = segmented([{ key: "F", label: "Capped R" }, { key: "changed", label: "New owner" }, { key: "cleared", label: "Cleared lot" }],
    state.label, (k) => { state.label = k; paintLabels(); });
  const controls = el("div.controls", {}, [el("div.control", {}, [el("span.label", { text: "Number under each lot" }), labelSeg])]);

  /* ---- the street of paths */
  const W = LABEL_W + 5 * COL + SHARE_W;
  const H = TOP + D.paths.length * ROW + 10;
  const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "The five recovery pathways of L75 homes" });
  const heads = ["before the storm", ...[1, 2, 3, 4].map((k) => `${fmt.mo(months[k])} months`)];
  heads.forEach((h, c) => root.append(svg("text", { x: LABEL_W + c * COL + COL / 2, y: 20, "text-anchor": "middle", "font-size": 14, "font-weight": 600, text: h })));
  root.append(svg("text", { x: W - 6, y: 20, "text-anchor": "end", "font-size": 14, "font-weight": 600, text: "share" }),
    svg("text", { x: W - 6, y: 37, "text-anchor": "end", "font-size": 12, fill: MUTED, text: "of L75 homes" }),
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
    el("span.item", {}, [el("i.sq", { style: { background: GREEN } }), "original owner"]),
    el("span.item", {}, [el("i.sq", { style: { background: PINK } }), "new owner"]),
    el("span.item.note", {}, ["height: capped R; stars: against the pathway above; * p < .05 ** p < .01 *** p < .001"]),
    el("span.item.note", {}, [`† new owner among restored homes: ${fmt.pct(h.rwr)} against ${fmt.pct(h.ref)} where the loss was 25% to under 50%${fmt.stars(h.p)}`]),
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
      tip.show(ev, { title: `${p.label}: before the storm`, rows: [["owner", "the original owner, recorded for at least two rolls"]] });
      return;
    }
    const r = p.rolls[c - 1];
    const rows = [["capped R", `${fmt.pct(r.F)} ${fmt.ci(100 * r.lo, 100 * r.hi, 0)}`], ["under a new owner", fmt.pct(r.changed)], ["cleared lot", fmt.pct(r.cleared)]];
    if (r.p !== null && r.p !== undefined) rows.push(["against the pathway above", fmt.pval(r.p)]);
    tip.show(ev, { title: `${p.label}, ${fmt.mo(months[r.k])} months`, rows, note: p.def });
  }
  paintLabels();

  /* ---- the reading: H1 */
  const main = D.estimates.find((e) => e.group === "owner" && e.main);
  const side = el("aside.sidecard", {}, [
    el("h4", { text: "H1: structural loss and ownership change" }),
    el("p.what", { text: "Among restored L25 resident owner-occupied homes, the probability of ownership change for L50 against 25% ≤ L <50%, at t + 3 (about 27 months), Eq. (1):" }),
    el("div.bignum", { html: `${fmt.num(main.e, 1)}<small>pp ${fmt.ci(main.lo, main.hi)}${fmt.stars(main.p)}</small>` }),
    el("p.what", { text: `Sample mean ${fmt.pct(main.base)}; ${fmt.count(main.n)} restored homes; census-tract-by-season fixed effects, standard errors clustered by county.` }),
    el("dl", {}, [
      el("dt", { text: "new owner among restored L75 homes, 39 months" }), el("dd", { text: `${fmt.pct(h.rwr)} ${fmt.ci(100 * h.lo, 100 * h.hi, 0)}` }),
      el("dt", { text: "the same, 25% ≤ L <50%" }), el("dd", { text: fmt.pct(h.ref) }),
    ]),
  ]);

  const tourHost = el("div");
  clear(host).append(tourHost, controls, el("div.panelgrid", {}, [figure, side]));

  /* ---- the estimates */
  host.append(el("h3.rule", { text: "H1 across specifications (Table 4)" }),
    el("p.sub", { text: "Ownership change among restored L25 resident owner-occupied homes, L50 against 25% ≤ L <50%, in percentage points: the main specification and the alternative specifications of Section 4.5." }));
  const fh = el("div");
  host.append(fh);
  forest(fh, D.estimates.filter((e) => e.group === "owner"), { unit: "pp", d: 1, axis: "percentage points; the line marks no difference" });
  host.append(forestKey());

  host.append(el("h3.rule", { text: "Capped R and rebuilding (Table 4)" }),
    el("p.sub", { text: "Ownership change was not associated with greater physical recovery. Capped R at t + 3 (about 27 months) among L25 resident owner-occupied homes, in percentage points; then the floor area of L75 homes rebuilt by 39 months and the assessment-cap size limits." }));
  const grid = el("div.panelgrid");
  const fv = el("div");
  forest(fv, D.estimates.filter((e) => e.group === "value" || e.group === "area").map((e) => ({ ...e, label: e.group === "area" ? e.label : `capped R: ${e.label}` })),
    { unit: "", d: 1, axis: "percentage points (floor area: log points, about percent)" });
  const capBox = el("aside.sidecard", {}, [el("h4", { text: "Within the assessment-cap size limits" }),
    el("p.what", { text: "L75 homes rebuilt by 39 months with a living area of at most 110% of the former area or 1,500 square feet, whichever is larger:" })]);
  for (const c of D.cap) {
    capBox.append(el("div.minibar", {}, [el("span.k", { text: c.owner.replace("pre-storm owner", "original owner") }),
      el("span.t", {}, [el("i", { style: { width: `${c.within * 100}%`, background: c.owner === "new owner" ? "#e4aac0" : "#9cc3a9" } })]),
      el("b", { text: fmt.pct(c.within) })]));
  }
  capBox.append(el("p.what", { text: `Median ratio of rebuilt to pre-storm living area: ${D.cap.map((c) => `${c.owner.replace("pre-storm owner", "original owner")} ${fmt.num(c.area_ratio, 2)}`).join("; ")}.` }));
  grid.append(fv, capBox);
  host.append(grid);

  howto(host, {
    lines: [
      "The street follows the resident owner-occupied homes of affected tracts with structural loss of at least 75% (seasons 2016 to 2021), grouped by their state on the fourth post-storm roll: five recovery pathways, each a row (Figure 3).",
      "A house's height is the mean capped R on that pathway and roll; its roof is the owner most of those homes had. Switch the number under each lot between capped R, the share under a new owner and the share cleared.",
      "The estimates are linear probability models with census-tract-by-season fixed effects (Eq. 1); a filled marker is the main specification, an open one an alternative specification.",
    ],
    terms: pick("ret", "rwr", "stranded", "unresolved", "cleared", "loss", "capped", "pp", "ci", "spec"),
  });

  const val = (lab) => D.estimates.find((e) => e.label === lab);
  const gx = val("L50 × OC at t + 3");
  finding(`Among restored L25 resident owner-occupied homes, L50 raises the probability of ownership change by <b>${fmt.num(main.e, 1)} pp</b> ${fmt.ci(main.lo, main.hi)}, relative to a sample mean of ${fmt.pct(main.base)}; and an L50 home under a new owner has a capped R ${fmt.num(-gx.e, 1)} pp lower. Greater structural loss means more ownership change, not greater physical recovery.`);

  const ret = D.paths[0];
  const rwr = D.paths[1];
  tour({
    name: "structural loss",
    steps: [
      { cap: "Each row is one recovery pathway of a home with structural loss of at least 75% (L75); each lot one post-storm roll.", ms: 3800, run: () => light(null) },
      { cap: `Restoration under original ownership: ${fmt.pct(ret.share)} of these homes.`, ms: 3400, run: () => light(0) },
      { cap: `Recovery without return: ${fmt.pct(rwr.share)}, restored under new ownership.`, ms: 3400, run: () => light(1) },
      { cap: `Of the restored homes, ${fmt.pct(h.rwr)} were under a new owner, against ${fmt.pct(h.ref)} where the loss was 25% to under 50%.`, ms: 3800, run: () => light([0, 1]) },
      { cap: `Restoration under new ownership is not faster: capped R at 27 months is ${fmt.pct(rwr.rolls[2].F)} under new owners and ${fmt.pct(ret.rolls[2].F)} under original owners.`, ms: 4400, run: () => { state.label = "F"; paintLabels(); light([0, 1]); } },
      { cap: `${fmt.pct(D.paths[4].share)} of the lots are still cleared 39 months after landfall.`, ms: 3400, run: () => light(4) },
    ],
    after: () => {},
    rest: () => { state.label = "F"; paintLabels(); light(null); },
  }).attach(tourHost, { figure });
}
