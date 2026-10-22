/* The shore page (Section 5.5, Figure S12). The states of damaged
   resident-owned homes about 27 months after landfall by distance to the
   shoreline, as a matrix of bubbles (area: the share), with H1 and H2
   estimated within each band and the pooled interactions with distance.

   Data: data/shore.json (a18 coastal_bands.csv and coastal_models.csv). */

import { el, svg, clear } from "../lib/dom.js";
import * as fmt from "../lib/format.js";
import * as tip from "../lib/tooltip.js";
import { NAVY, GREEN, PINK, GRAY_DARK, INK, MUTED, RULE } from "../lib/palette.js";
import { forest, forestKey } from "../lib/forest.js";
import { tour } from "../lib/tour.js";
import { howto, pick, finding } from "../lib/read.js";

const COLS = [
  { key: "destroyed", label: ["lost half", "or more"], color: NAVY },
  { key: "restored", label: ["restored"], color: GRAY_DARK },
  { key: "ret", label: ["recovery", "with return"], color: GREEN },
  { key: "rwr", label: ["recovery", "without return"], color: PINK },
  { key: "rwr_restored", label: ["new owner", "among restored"], color: PINK, ring: true },
  { key: "stranded", label: ["stranded", "incumbent"], color: GRAY_DARK },
  { key: "cleared", label: ["cleared", "lot"], color: "#8c8c8c" },
  { key: "vzone", label: ["in the", "V zone"], color: NAVY, ring: true },
];

export function shoreChart(host, app) {
  const D = app.shore;
  const bands = D.bands;

  const tourHost = el("div");
  const fig = el("div.figure");
  const side = el("aside.sidecard.wide");
  clear(host).append(tourHost, fig, side);

  /* ---- the matrix */
  const LW = 150;
  const NW = 120;
  const CW = 104;
  const RH = 62;
  const TOP = 58;
  const W = LW + NW + COLS.length * CW + 6;
  const H = TOP + bands.length * RH + 8;
  const maxN = Math.max(...bands.map((b) => b.n));
  const R = (v) => Math.sqrt(Math.max(0, v)) * 27;
  const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "States of damaged homes by distance to the shore" });
  root.append(svg("text", { x: 4, y: TOP - 14, "font-size": 13, fill: MUTED, text: "distance to the shore" }),
    svg("text", { x: LW + NW / 2, y: TOP - 30, "text-anchor": "middle", "font-size": 13, fill: MUTED, text: "damaged" }),
    svg("text", { x: LW + NW / 2, y: TOP - 14, "text-anchor": "middle", "font-size": 13, fill: MUTED, text: "homes" }));
  const colNodes = {};
  COLS.forEach((c, j) => {
    const cx = LW + NW + j * CW + CW / 2;
    c.label.forEach((t, i) => root.append(svg("text", { x: cx, y: TOP - 30 + i * 16 - (c.label.length === 1 ? -16 : 0), "text-anchor": "middle", "font-size": 13, fill: INK, "font-weight": 600, text: t })));
    colNodes[c.key] = svg("g", { class: `col col-${c.key}` });
    root.append(colNodes[c.key]);
  });
  const rowNodes = [];
  bands.forEach((b, i) => {
    const y = TOP + i * RH + RH / 2;
    const g = svg("g", { class: "band" });
    g.append(svg("line", { x1: 0, x2: W, y1: y + RH / 2, y2: y + RH / 2, stroke: RULE, "stroke-width": 0.6 }),
      svg("text", { x: 4, y: y + 5, "font-size": 14.5, "font-weight": 600, text: b.label }));
    const bw = (b.n / maxN) * (NW - 50);
    g.append(svg("rect", { x: LW, y: y - 7, width: bw, height: 14, fill: "#e2e2e2", stroke: INK, "stroke-width": 0.5 }),
      svg("text", { x: LW + bw + 5, y: y + 5, "font-size": 12.5, fill: MUTED, text: fmt.count(b.n) }));
    root.append(g);
    COLS.forEach((c, j) => {
      const cx = LW + NW + j * CW + CW / 2;
      const v = b[c.key];
      const r = R(v);
      const node = svg("g", {}, [
        svg("circle", { cx, cy: y - 3, r, fill: c.ring ? "#ffffff" : c.color, "fill-opacity": c.ring ? 1 : 0.22, stroke: c.color, "stroke-width": c.ring ? 1.6 : 1 }),
        svg("text", { x: cx, y: y + 2, "text-anchor": "middle", "font-size": 13.5, "font-weight": 600, fill: INK, stroke: "#ffffff", "stroke-width": 3, "paint-order": "stroke", "stroke-linejoin": "round", text: c.key === "rwr_restored" ? fmt.num(v) : fmt.pct(v) }),
      ]);
      node.addEventListener("pointerenter", (ev) => {
        tip.show(ev, { title: `${b.label}`, rows: [["damaged resident homes", fmt.count(b.n)], ["lost half or more", fmt.pct(b.destroyed)], ["restored, about 27 months", fmt.pct(b.restored)], ["recovery with return", fmt.pct(b.ret)], ["recovery without return", fmt.pct(b.rwr)], ["new owner among restored", fmt.num(b.rwr_restored)], ["stranded incumbent", fmt.pct(b.stranded)], ["cleared lot", fmt.pct(b.cleared)], ["in the V zone", fmt.pct(b.vzone)]] });
      });
      node.addEventListener("pointermove", tip.move);
      node.addEventListener("pointerleave", tip.hide);
      colNodes[c.key].append(node);
    });
    rowNodes.push(g);
  });
  fig.append(el("div.scrollx.wide", {}, [root]), el("div.legend", {}, [el("span.item.note", { text: "Bubble area: the share. Damaged resident owner-occupied homes of the storm-struck tracts, about 27 months after landfall (the third roll); open bubbles are shares of another base (restored homes; all damaged homes in the V zone)." })]));

  /* ---- the reading */
  const within = bands[0];
  const mid = bands.find((b) => b.key === "3 to 10");
  side.append(el("h4", { text: "The storm does most at the shore" }),
    el("dl", {}, [
      el("dt", { text: "lost half or more, within .25 mile" }), el("dd", { text: fmt.pct(within.destroyed) }),
      el("dt", { text: "the same, 3 to 10 miles" }), el("dd", { text: fmt.pct(mid.destroyed) }),
      el("dt", { text: "recovery with return, within .25 mile" }), el("dd", { text: fmt.pct(within.ret) }),
      el("dt", { text: "the same, 3 to 10 miles" }), el("dd", { text: fmt.pct(mid.ret) }),
    ]));
  const gx = D.models.find((m) => m.term === "g50_x_logdist");
  side.append(el("p.what", { style: { marginTop: "1rem" }, html: `The clocks do not separate more there. Destruction × log distance on a new owner among restored homes: <b>${fmt.num(gx.e / 100, 3)}</b> (${fmt.num(gx.lo / 100, 4)} to ${fmt.num(gx.hi / 100, 3)})${fmt.stars(gx.p)}, so the new-owner effect is, if anything, a little larger away from the shore.` }));

  /* ---- H1 and H2 by band */
  host.append(el("h3.rule", { text: "H1 and H2 within each band" }),
    el("p.sub", { text: "The two pre-specified tests estimated in each distance band, in percentage points. Within a mile no band gives a significant H1 estimate." }));
  const g2 = el("div.panelgrid.even");
  const f1 = el("div");
  const f2 = el("div");
  f1.append(el("p.lab-strong", { text: "H1: new owner among restored homes, loss .50 or more, s+3" }));
  f2.append(el("p.lab-strong", { text: "H2: damage × K on the return of the pre-storm owner, s+2" }));
  forest(f1, bands.map((b) => ({ label: b.label, ...b.h1, status: "description" })), { d: 1, compact: true, unit: "pp", axis: "the band results carry intervals, not p values: read the interval" });
  forest(f2, bands.map((b) => ({ label: b.label, ...b.h2, status: "description" })), { d: 1, compact: true, unit: "pp", axis: "the band results carry intervals, not p values: read the interval" });
  g2.append(f1, f2);
  host.append(g2);

  host.append(el("h3.rule", { text: "Pooled over the bands" }),
    el("p.sub", { text: "Damage interacted with distance and with the V zone of wave action, one model per outcome; in percentage points (log distance: per unit of log miles)." }));
  const f3 = el("div");
  host.append(f3);
  const groups = {};
  for (const m of D.models) (groups[m.model] = groups[m.model] || []).push(m);
  const rows = [];
  for (const [model, list] of Object.entries(groups)) {
    rows.push({ head: model.replace("P1:", "H1:").replace("P2:", "H2:") });
    for (const m of list) rows.push({ ...m, status: "description" });
  }
  forest(f3, rows, { d: 1, unit: "pp" });
  host.append(forestKey());

  howto(host, {
    lines: [
      "Distance is from the parcel centroid to the Census cartographic shoreline. Bands run from within a quarter mile to beyond ten miles.",
      "The V zone is the coastal high-hazard flood zone with wave action; the A zones are riverine and ponding flood.",
      "The shore is where the storm destroys most, and where restoration is lowest; the separation of the two clocks, read by H1 within each band and pooled with distance, does not grow toward it.",
    ],
    terms: pick("loss", "ret", "rwr", "stranded", "cleared", "pp", "ci"),
  });

  finding(`Within a quarter mile of the shoreline, <b>${fmt.pct(within.destroyed)}</b> of damaged resident homes lost half or more of their structure and ${fmt.pct(within.ret)} are recovery with return at 27 months, against ${fmt.pct(mid.destroyed)} and ${fmt.pct(mid.ret)} at 3 to 10 miles. Yet the clocks do not separate more at the shore: the shore is where the storm does most, not where the two clocks part most.`);

  const lit = (key) => { for (const [k, n] of Object.entries(colNodes)) n.classList.toggle("dim", !!key && k !== key); };
  tour({
    name: "the shore",
    steps: [
      { cap: "Six bands of distance to the shoreline; damaged resident homes about 27 months after landfall.", ms: 3200, run: () => lit(null) },
      { cap: `Within a quarter mile, ${fmt.pct(within.destroyed)} lost half or more of the structure; at 3 to 10 miles, ${fmt.pct(mid.destroyed)}.`, ms: 3800, run: () => lit("destroyed") },
      { cap: `Recovery with return: ${fmt.pct(within.ret)} at the shore, ${fmt.pct(mid.ret)} at 3 to 10 miles.`, ms: 3600, run: () => lit("ret") },
      { cap: "Cleared lots concentrate at the shore.", ms: 3000, run: () => lit("cleared") },
      { cap: "Within each band, destruction's effect on a new owner does not grow toward the shore.", ms: 4000, run: () => { lit(null); f1.scrollIntoView({ behavior: "smooth", block: "center" }); } },
    ],
    after: () => {},
    rest: () => lit(null),
  }).attach(tourHost);
}
