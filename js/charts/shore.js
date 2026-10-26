/* The shore page (Figure S6; the coastal proximity models of Section
   4.5). The states of L25 resident owner-occupied homes about 27 months
   after landfall by distance to the shoreline, as a matrix of bubbles
   (area: the share), with Eqs. (1) and (2) estimated within each of the
   nine bands and the pooled interactions with log distance and the V zone.

   Data: data/shore.json (a18 coastal_bands.csv and coastal_models.csv). */

import { el, svg, clear } from "../lib/dom.js";
import * as fmt from "../lib/format.js";
import * as tip from "../lib/tooltip.js";
import { NAVY, GREEN, PINK, GRAY_DARK, INK, MUTED, RULE } from "../lib/palette.js";
import { forest, forestKey } from "../lib/forest.js";
import { tour } from "../lib/tour.js";
import { howto, pick, finding } from "../lib/read.js";

const COLS = [
  { key: "destroyed", label: ["L50", "share"], color: NAVY },
  { key: "restored", label: ["restored"], color: GRAY_DARK },
  { key: "ret", label: ["restored,", "original owner"], color: GREEN },
  { key: "rwr", label: ["restored,", "new owner"], color: PINK },
  { key: "rwr_restored", label: ["new owner", "among restored"], color: PINK, ring: true },
  { key: "stranded", label: ["unrestored,", "original owner"], color: GRAY_DARK },
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
  const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "States of L25 homes by distance to the shore" });
  root.append(svg("text", { x: 4, y: TOP - 14, "font-size": 13, fill: MUTED, text: "distance to the shore" }),
    svg("text", { x: LW + NW / 2, y: TOP - 30, "text-anchor": "middle", "font-size": 13, fill: MUTED, text: "L25" }),
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
        svg("text", { x: cx, y: y + 2, "text-anchor": "middle", "font-size": 13.5, "font-weight": 600, fill: INK, stroke: "#ffffff", "stroke-width": 3, "paint-order": "stroke", "stroke-linejoin": "round", text: fmt.pct(v) }),
      ]);
      node.addEventListener("pointerenter", (ev) => {
        tip.show(ev, { title: `${b.label}`, rows: [["L25 resident homes", fmt.count(b.n)], ["L50 share", fmt.pct(b.destroyed)], ["restored, about 27 months", fmt.pct(b.restored)], ["restored, original owner", fmt.pct(b.ret)], ["restored, new owner", fmt.pct(b.rwr)], ["new owner among restored", fmt.pct(b.rwr_restored)], ["unrestored, original owner", fmt.pct(b.stranded)], ["cleared lot", fmt.pct(b.cleared)], ["in the V zone", fmt.pct(b.vzone)]] });
      });
      node.addEventListener("pointermove", tip.move);
      node.addEventListener("pointerleave", tip.hide);
      colNodes[c.key].append(node);
    });
    rowNodes.push(g);
  });
  fig.append(el("div.scrollx.wide", {}, [root]), el("div.legend", {}, [el("span.item.note", { text: "Bubble area: the share. L25 resident owner-occupied homes of affected tracts, about 27 months after landfall (t + 3); open bubbles are shares of another base (restored homes; all L25 homes in the V zone)." })]));

  /* ---- the reading */
  const within = bands[0];
  const mid = bands.find((b) => b.key === "5 to 10");
  side.append(el("h4", { text: "Structural loss is greatest at the shore" }),
    el("dl", {}, [
      el("dt", { text: "L50 share, within .1 mile" }), el("dd", { text: fmt.pct(within.destroyed) }),
      el("dt", { text: "the same, 5 to 10 miles" }), el("dd", { text: fmt.pct(mid.destroyed) }),
      el("dt", { text: "restored, original owner, within .1 mile" }), el("dd", { text: fmt.pct(within.ret) }),
      el("dt", { text: "the same, 5 to 10 miles" }), el("dd", { text: fmt.pct(mid.ret) }),
    ]));
  const gx = D.models.find((m) => m.term === "g50_x_logdist");
  side.append(el("p.what", { style: { marginTop: "1rem" }, html: `Coastal proximity did not strengthen the association between L50 and ownership change among restored homes. L50 × log distance in Eq. (1): <b>${fmt.num(gx.e, 1)} pp</b> ${fmt.ci(gx.lo, gx.hi, 1)}${fmt.stars(gx.p)} per unit of log miles.` }));

  /* ---- H1 and H2 by band */
  host.append(el("h3.rule", { text: "Eqs. (1) and (2) within each distance band" }),
    el("p.sub", { text: "The main models estimated within each of the nine distance bands, in percentage points with 95% CIs." }));
  const g2 = el("div.panelgrid.even");
  const f1 = el("div");
  const f2 = el("div");
  f1.append(el("p.lab-strong", { text: "Eq. (1): L50 on ownership change among restored homes, t + 3" }));
  f2.append(el("p.lab-strong", { text: "Eq. (2): L25 × K on restoration under original ownership, t + 2" }));
  forest(f1, bands.filter((b) => b.h1).map((b) => ({ label: b.label, ...b.h1, main: true })), { d: 1, compact: true, unit: "pp", axis: "95% CIs; bands without an estimate have too few restored homes" });
  forest(f2, bands.map((b) => ({ label: b.label, ...b.h2, main: true })), { d: 1, compact: true, unit: "pp", axis: "95% CIs" });
  g2.append(f1, f2);
  host.append(g2);

  host.append(el("h3.rule", { text: "Pooled over the bands" }),
    el("p.sub", { text: "L50 (Eq. 1) and L25 (Eq. 2) interacted with log distance to the shore and with V-zone location; because the SFHA includes the V zones, the V-zone term measures the difference between V and A zones. Percentage points (log distance: per unit of log miles)." }));
  const f3 = el("div");
  host.append(f3);
  const groups = {};
  for (const m of D.models) (groups[m.model] = groups[m.model] || []).push(m);
  const rows = [];
  for (const [model, list] of Object.entries(groups)) {
    rows.push({ head: model });
    for (const m of list) rows.push(m);
  }
  forest(f3, rows, { d: 1, unit: "pp" });
  host.append(forestKey());

  howto(host, {
    lines: [
      "Distance is from the parcel centroid to the shoreline derived from Census cartographic boundary files. The nine bands run from within .1 mile to beyond 10 miles.",
      "V zones (V and VE) are coastal high-hazard areas subject to wave action; the A zones are the other SFHA designations, among them coastal A zones subject to storm surge.",
      "Structural loss is greatest at the shore and restoration lowest; the association between L50 and ownership change among restored homes, read within each band and pooled with distance, does not grow toward it (Figure S6).",
    ],
    terms: pick("loss", "ret", "rwr", "stranded", "cleared", "pp", "ci", "spec"),
  });

  finding(`Within .1 mile of the shoreline, <b>${fmt.pct(within.destroyed)}</b> of L25 resident owner-occupied homes had structural loss of at least 50% and ${fmt.pct(within.ret)} were restored under their original owners at 27 months, against ${fmt.pct(mid.destroyed)} and ${fmt.pct(mid.ret)} at 5 to 10 miles. Coastal proximity did not strengthen the association between structural loss and ownership change among restored homes.`);

  const lit = (key) => { for (const [k, n] of Object.entries(colNodes)) n.classList.toggle("dim", !!key && k !== key); };
  tour({
    name: "the shore",
    steps: [
      { cap: "Nine bands of distance to the shoreline; L25 resident owner-occupied homes about 27 months after landfall.", ms: 3200, run: () => lit(null) },
      { cap: `Within .1 mile, ${fmt.pct(within.destroyed)} of the homes had structural loss of at least 50%; at 5 to 10 miles, ${fmt.pct(mid.destroyed)}.`, ms: 3800, run: () => lit("destroyed") },
      { cap: `Restored under the original owner: ${fmt.pct(within.ret)} at the shore, ${fmt.pct(mid.ret)} at 5 to 10 miles.`, ms: 3600, run: () => lit("ret") },
      { cap: "Cleared lots concentrate at the shore.", ms: 3000, run: () => lit("cleared") },
      { cap: "Within each band, the association between L50 and ownership change does not grow toward the shore.", ms: 4000, run: () => { lit(null); f1.scrollIntoView({ behavior: "smooth", block: "center" }); } },
    ],
    after: () => {},
    rest: () => lit(null),
  }).attach(tourHost, { figure: fig });
}
