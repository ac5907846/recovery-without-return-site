/* The Financial resources page (H2). Figure 6's surfaces as a grid: the
   mean of each outcome at t + 2 (about 15 months) for L25 resident
   owner-occupied homes, over structural loss on the first post-storm roll
   (eight equal widths from 25%) and the tract's financial resources index
   K (octiles); a cell is drawn when it holds at least 150 homes; the
   figure's 3 x 3 moving mean or the raw cell means. Beside it the main H2
   estimate of Eq. (2), and the lowest and highest octiles of K as lines.
   Then every estimate of Table 5 and the flood-zone estimates of Table S4.

   Data: data/capital.json (a18 surfaces.csv and the model tables). */

import { el, svg, clear, segmented } from "../lib/dom.js";
import * as fmt from "../lib/format.js";
import * as tip from "../lib/tooltip.js";
import { linear } from "../lib/scale.js";
import { INK, MUTED, GRID, RULE, GREEN, WINE, NAVY, ramp } from "../lib/palette.js";
import { forest, forestKey } from "../lib/forest.js";
import { tour } from "../lib/tour.js";
import { howto, pick, finding } from "../lib/read.js";

const RAMP = { return: "green", changed: "wine", F: "navy" };
const LINE = { return: GREEN, changed: WINE, F: NAVY };
const TOP = 0.72;          /* the ramp stops short of the saturated colour so the ink labels stay legible */

export function capitalChart(host, app) {
  const D = app.capital;
  const state = { o: "return", smooth: true, row: null };
  const E = (group, label) => D.estimates.find((e) => e.group === group && e.label === label);

  const oSeg = segmented(D.outcomes.map((o) => ({ key: o.key, label: o.label })), state.o, (k) => { state.o = k; draw(); });
  const sSeg = segmented([{ key: "s", label: "Smoothed, as in Figure 6" }, { key: "r", label: "Cell means" }], "s", (k) => { state.smooth = k === "s"; draw(); });
  const controls = el("div.controls", {}, [
    el("div.control", {}, [el("span.label", { text: "Outcome at t + 2, about 15 months after landfall" }), oSeg]),
    el("div.control", {}, [el("span.label", { text: "Cells" }), sSeg]),
  ]);

  const gridHost = el("div.figure.grid8");
  const scaleBar = el("div.scale-bar");
  const sideHead = el("h4");
  const sideWhat = el("p.what");
  const sideBig = el("div.bignum");
  const sideNote = el("p.what");
  const sliceHost = el("div.figure");
  const side = el("aside.sidecard", {}, [sideHead, sideWhat, sideBig, sideNote, el("p.what", { style: { marginTop: "1rem" }, text: "The lowest and the highest octile of K, across structural loss:" }), sliceHost]);
  const tourHost = el("div");
  clear(host).append(tourHost, controls, el("div.panelgrid", {}, [el("div", {}, [gridHost, scaleBar]), side]));

  const W = 620;
  const H = 470;
  const m = { top: 14, right: 12, bottom: 54, left: 92 };
  const cw = (W - m.left - m.right) / 8;
  const ch = (H - m.top - m.bottom) / 8;

  function values(o) {
    const S = D.surfaces[o];
    return S.cells.map(([li, ki, n, mean, drawn, smooth]) => ({ li, ki, n, mean, drawn, smooth, v: drawn ? (state.smooth ? smooth : mean) : null }));
  }

  function draw() {
    oSeg.setValue(state.o);
    const S = D.surfaces[state.o];
    const cells = values(state.o);
    const vs = cells.filter((c) => c.v !== null).map((c) => c.v);
    const lo = Math.min(...vs);
    const hi = Math.max(...vs);
    const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Outcome by structural loss and the financial resources index" });
    const defs = svg("defs", {}, [svg("pattern", { id: "hatch8", patternUnits: "userSpaceOnUse", width: 6, height: 6, patternTransform: "rotate(45)" }, [
      svg("rect", { width: 6, height: 6, fill: "#fafafa" }), svg("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: "#c4c4c4", "stroke-width": 1.6 })])]);
    root.append(defs);
    const isPct = state.o !== "F";
    for (const c of cells) {
      const x = m.left + c.li * cw;
      const y = m.top + (7 - c.ki) * ch;
      const fill = c.v === null ? "url(#hatch8)" : ramp(RAMP[state.o], TOP * (c.v - lo) / ((hi - lo) || 1));
      const rect = svg("rect", { x: x + 1, y: y + 1, width: cw - 2, height: ch - 2, fill, stroke: INK, "stroke-width": 0.5, class: `cell r${c.ki}` });
      root.append(rect);
      if (c.v !== null) {
        root.append(svg("text", { x: x + cw / 2, y: y + ch / 2 + 4.5, "text-anchor": "middle", "font-size": 13, "font-weight": 600, fill: INK, "pointer-events": "none", text: isPct ? fmt.pct(c.v) : fmt.num(c.v) }));
      }
      rect.addEventListener("pointerenter", (ev) => {
        rect.setAttribute("stroke-width", 2);
        const lb = [S.l_edges[c.li], S.l_edges[c.li + 1]];
        const kb = [S.k_edges[c.ki], S.k_edges[c.ki + 1]];
        const rows = [["structural loss", `${fmt.num(lb[0])} to ${fmt.num(lb[1])}`], ["K, octile", `${c.ki + 1} of 8 (${fmt.num(kb[0], 1)} to ${fmt.num(kb[1], 1)})`], ["homes", fmt.count(c.n)]];
        if (c.drawn) rows.push(["cell mean", isPct ? fmt.pct(c.mean, 1) : fmt.num(c.mean)], ["smoothed (3 x 3)", isPct ? fmt.pct(c.smooth, 1) : fmt.num(c.smooth)]);
        tip.show(ev, { title: D.outcomes.find((o) => o.key === state.o).label, rows, note: c.drawn ? "" : `Fewer than ${D.min_cell} homes: not drawn.` });
        slice(c.ki);
      });
      rect.addEventListener("pointermove", tip.move);
      rect.addEventListener("pointerleave", () => { rect.setAttribute("stroke-width", 0.5); tip.hide(); slice(null); });
    }
    for (let i = 0; i <= 8; i += 2) {
      root.append(svg("text", { x: m.left + i * cw, y: H - m.bottom + 18, "text-anchor": "middle", "font-size": 12, fill: MUTED, text: fmt.num(S.l_edges[i]) }));
    }
    root.append(svg("text", { x: m.left + 4 * cw, y: H - 12, "text-anchor": "middle", "font-size": 12.5, fill: INK, text: "structural loss (L) on the first post-storm roll" }));
    for (let j = 0; j < 8; j += 1) {
      const y = m.top + (7 - j) * ch + ch / 2 + 4;
      root.append(svg("text", { x: m.left - 8, y, "text-anchor": "end", "font-size": 11.5, fill: MUTED, text: j === 0 ? "lowest octile" : j === 7 ? "highest octile" : `${j + 1}` }));
    }
    root.append(svg("text", { transform: `translate(14,${m.top + 4 * ch}) rotate(-90)`, "text-anchor": "middle", "font-size": 12.5, fill: INK, text: "financial resources index (K) of the tract" }));
    clear(gridHost).append(root);
    clear(scaleBar).append(el("span", { text: isPct ? fmt.pct(lo) : fmt.num(lo) }),
      el("i", { style: { background: `linear-gradient(90deg, ${ramp(RAMP[state.o], 0)}, ${ramp(RAMP[state.o], TOP)})` } }),
      el("span", { text: isPct ? fmt.pct(hi) : fmt.num(hi) }),
      el("span", { style: { marginLeft: "1rem" }, html: `<i style="display:inline-block;width:.9rem;height:.7rem;border:.5px solid #888;background:repeating-linear-gradient(-45deg,#fff 0 2px,#c4c4c4 2px 3px);vertical-align:middle"></i> fewer than ${D.min_cell} homes` }));
    paintSide();
    slice(null);
  }

  function paintSide() {
    const o = state.o;
    const e = E(o, "L25 × K");
    const lab = D.outcomes.find((x) => x.key === o);
    sideHead.textContent = `H2: L25 × K on ${lab.label.toLowerCase()}`;
    sideWhat.textContent = `Eq. (2), in percentage points per unit of K: how the difference between L25 and unaffected homes in this outcome varies with the tract's pre-disaster financial resources.`;
    sideBig.innerHTML = `${fmt.num(e.e, 1)}<small>pp ${fmt.ci(e.lo, e.hi)}${fmt.stars(e.p)}</small>`;
    sideNote.textContent = `${e.base !== undefined ? `Outcome mean ${fmt.pct(e.base)}; ` : ""}${fmt.count(e.n)} L25 and unaffected resident owner-occupied homes; census-tract-by-season fixed effects.`;
  }

  /* the lowest and the highest eighth of K as two lines across the loss (cell means) */
  function slice(row) {
    const cells = values(state.o);
    const SW = 320;
    const SH = 170;
    const sm = { top: 10, right: 50, bottom: 26, left: 40 };
    const S = D.surfaces[state.o];
    const mids = S.l_edges.slice(0, 8).map((v, i) => (v + S.l_edges[i + 1]) / 2);
    const vals = cells.filter((c) => c.v !== null).map((c) => c.v);
    const x = linear([0.25, 1], [sm.left, SW - sm.right]);
    const y = linear([Math.min(...vals), Math.max(...vals)], [SH - sm.bottom, sm.top]);
    const root = svg("svg", { viewBox: `0 0 ${SW} ${SH}`, role: "img", "aria-label": "Lowest and highest octile of K across structural loss" });
    for (const v of y.ticks(3)) {
      root.append(svg("line", { x1: sm.left, x2: SW - sm.right, y1: y(v), y2: y(v), stroke: GRID }),
        svg("text", { x: sm.left - 5, y: y(v) + 3.5, "text-anchor": "end", "font-size": 10, fill: MUTED, text: state.o === "F" ? fmt.num(v) : fmt.tickPct(v) }));
    }
    for (const v of [0.25, 0.5, 0.75, 1]) root.append(svg("text", { x: x(v), y: SH - 8, "text-anchor": "middle", "font-size": 10, fill: MUTED, text: fmt.num(v) }));
    root.append(svg("line", { x1: sm.left, x2: SW - sm.right, y1: SH - sm.bottom, y2: SH - sm.bottom, stroke: RULE }));
    const rowsToDraw = [[0, "#bdbdbd", "lowest K"], [7, LINE[state.o], "highest K"]];
    if (row !== null && row !== 0 && row !== 7) rowsToDraw.push([row, INK, `octile ${row + 1}`]);
    for (const [k, col, name] of rowsToDraw) {
      const pts = cells.filter((c) => c.ki === k && c.v !== null).sort((a, b) => a.li - b.li);
      if (!pts.length) continue;
      root.append(svg("path", { d: `M${pts.map((c) => `${x(mids[c.li]).toFixed(1)},${y(c.v).toFixed(1)}`).join("L")}`, fill: "none", stroke: col, "stroke-width": k === row ? 1.6 : 2.4 }));
      for (const c of pts) root.append(svg("circle", { cx: x(mids[c.li]), cy: y(c.v), r: 2.8, fill: col }));
      const last = pts[pts.length - 1];
      root.append(svg("text", { x: x(mids[last.li]) + 6, y: y(last.v) + 4, "font-size": 10.5, "font-weight": 600, fill: col === "#bdbdbd" ? MUTED : col, text: name }));
    }
    clear(sliceHost).append(root);
  }

  /* ---- every H2 estimate */
  host.append(el("h3.rule", { text: "Every H2 estimate (Table 5; flood zones, Table S4)" }),
    el("p.sub", { text: "L25 interacted with each measure at t + 2: in percentage points per unit of K and per standard deviation of the other measures; the flood-zone rows in percentage points. NFIP penetration measures insurance coverage independently of the IHP registrants." }));
  const fh = el("div");
  host.append(fh);
  const groups = [["return", "Restoration under original ownership"], ["changed", "Ownership change"], ["F", "Capped R"], ["business", "Business ownership at t + 2"], ["flood", "Flood zones: restoration under original ownership"]];
  const rows = [];
  for (const [g, title] of groups) {
    rows.push({ head: title });
    for (const e of D.estimates.filter((x) => x.group === g)) rows.push(e);
  }
  forest(fh, rows, { unit: "pp", d: 1, axis: "percentage points; the line marks no difference" });
  host.append(forestKey());
  const corr = D.corr.find((c) => c.pair.startsWith("K and"));
  if (corr) host.append(el("p.sub", { style: { marginTop: ".7rem" }, text: `K and NFIP penetration correlate at a Spearman ${fmt.num(corr.rho)} over ${fmt.count(corr.tracts)} tracts: two overlapping measures of pre-disaster financial resources.` }));

  howto(host, {
    lines: [
      "L25 resident owner-occupied homes of affected tracts, under the same owner for at least two rolls before the storm, present on the second post-storm roll (t + 2, about 15 months). Structural loss runs left to right, the tract's financial resources index K bottom to top.",
      "K is the mean of two components standardized within season: the insured share of the tract's IHP owner registrants and the log of tract median household income. Each cell holds the homes of one structural-loss category and one octile of K; cells with fewer than 150 homes are hatched.",
      "The smoothed view is Figure 6 (a 3 x 3 moving mean of the drawn cells, without fixed effects); the cell means are the raw averages. Hover a cell for its homes; the side card draws its row.",
    ],
    terms: pick("k", "ret", "loss", "pp", "ci", "spec"),
  });

  const rk = E("return", "L25 × K");
  const ck = E("changed", "L25 × K");
  const nf = E("return", "L25 × NFIP penetration");
  finding(`Where tracts were better insured and better off before the storm, L25 homes were more often restored under their original owners: per unit of the financial resources index, restoration under original ownership is <b>${fmt.num(rk.e, 1)} pp</b> higher ${fmt.ci(rk.lo, rk.hi)} and ownership change ${fmt.num(-ck.e, 1)} pp lower; NFIP penetration points the same way (${fmt.num(nf.e, 1)} pp).`);

  draw();

  const cl = E("return", "L25 × NFIP claims");
  const d20 = E("return", "L25 × K, tracts with D ≥20");
  tour({
    name: "financial resources",
    steps: [
      { cap: "Each cell: L25 resident owner-occupied homes about 15 months after landfall, by structural loss (across) and the tract's financial resources index (up).", ms: 4200, run: () => { state.o = "return"; state.smooth = true; sSeg.setValue("s"); draw(); } },
      { cap: "Restoration under original ownership falls as structural loss grows and rises with pre-disaster financial resources.", ms: 4000, run: () => slice(7) },
      { cap: `Eq. (2), L25 × K: ${fmt.num(rk.e, 1)} pp more restoration under original ownership per unit of K ${fmt.ci(rk.lo, rk.hi)}.`, ms: 3800, run: () => slice(null) },
      { cap: "Ownership change is the mirror image: less frequent where financial resources are greater.", ms: 3800, run: () => { state.o = "changed"; draw(); } },
      { cap: `NFIP penetration at landfall is associated with the outcomes; NFIP claims are not (${fmt.num(cl.e, 1)} pp, ${fmt.ci(cl.lo, cl.hi).slice(1, -1)}).`, ms: 4200, run: () => { state.o = "return"; draw(); } },
      { cap: `In the most heavily affected tracts (D ≥20) the association is smaller and not significant (${fmt.num(d20.e, 1)} pp, ${fmt.ci(d20.lo, d20.hi).slice(1, -1)}).`, ms: 4200, run: () => {} },
    ],
    after: () => {},
    rest: () => { state.o = "return"; state.smooth = true; sSeg.setValue("s"); draw(); },
  }).attach(tourHost, { figure: [gridHost, sliceHost] });
}
