/* The Financial resources page (H2). Figure 6's surfaces as a grid: the
   mean of each outcome at s+2 (about 15 months) for damaged resident
   owner-occupied homes, over structural loss on the first roll (eight
   equal widths from .25) and the tract's incumbent capital K (octiles);
   a cell is drawn when it holds at least 150 homes; the figure's 3 x 3
   moving mean or the raw cell means. Beside it the pre-specified H2
   estimate, and the lowest and highest capital rows as lines. Then every
   H2 estimate (Table 4) and the flood-zone results.

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
    el("div.control", {}, [el("span.label", { text: "Outcome at s+2, about 15 months after landfall" }), oSeg]),
    el("div.control", {}, [el("span.label", { text: "Cells" }), sSeg]),
  ]);

  const gridHost = el("div.figure.grid8");
  const scaleBar = el("div.scale-bar");
  const sideHead = el("h4");
  const sideWhat = el("p.what");
  const sideBig = el("div.bignum");
  const sideNote = el("p.what");
  const sliceHost = el("div.figure");
  const side = el("aside.sidecard", {}, [sideHead, sideWhat, sideBig, sideNote, el("p.what", { style: { marginTop: "1rem" }, text: "The lowest and the highest eighth of K, across the loss:" }), sliceHost]);
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
    const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Outcome by structural loss and incumbent capital" });
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
        const rows = [["structural loss", `${fmt.num(lb[0])} to ${fmt.num(lb[1])}`], ["capital K, eighth", `${c.ki + 1} of 8 (${fmt.num(kb[0], 1)} to ${fmt.num(kb[1], 1)})`], ["homes", fmt.count(c.n)]];
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
    root.append(svg("text", { x: m.left + 4 * cw, y: H - 12, "text-anchor": "middle", "font-size": 12.5, fill: INK, text: "structural loss on the first roll after the storm" }));
    for (let j = 0; j < 8; j += 1) {
      const y = m.top + (7 - j) * ch + ch / 2 + 4;
      root.append(svg("text", { x: m.left - 8, y, "text-anchor": "end", "font-size": 11.5, fill: MUTED, text: j === 0 ? "lowest eighth" : j === 7 ? "highest eighth" : `${j + 1}` }));
    }
    root.append(svg("text", { transform: `translate(14,${m.top + 4 * ch}) rotate(-90)`, "text-anchor": "middle", "font-size": 12.5, fill: INK, text: "incumbent capital K of the tract" }));
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
    const e = o === "F" ? E("F", "damage × K") : E(o, "damage × K");
    const lab = D.outcomes.find((x) => x.key === o);
    sideHead.textContent = `H2 on ${lab.label.toLowerCase()}`;
    sideWhat.textContent = `Damage × incumbent capital K, in percentage points per standard deviation of K: how much more (or less) a damaged home ends in this outcome where the tract's owners were better insured and better off.`;
    sideBig.innerHTML = `${fmt.num(e.e, 1)}<small>pp ${fmt.ci(e.lo, e.hi)}${fmt.stars(e.p)}</small>`;
    sideNote.textContent = `${e.base !== undefined ? `Base ${o === "F" ? fmt.num(e.base) : fmt.pct(e.base)}; ` : ""}${fmt.count(e.n)} resident homes, damaged or not; tract-by-season fixed effects. ${e.status === "pre-specified" ? "Pre-specified, passed." : ""}`;
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
    const root = svg("svg", { viewBox: `0 0 ${SW} ${SH}`, role: "img", "aria-label": "Lowest and highest capital across the loss" });
    for (const v of y.ticks(3)) {
      root.append(svg("line", { x1: sm.left, x2: SW - sm.right, y1: y(v), y2: y(v), stroke: GRID }),
        svg("text", { x: sm.left - 5, y: y(v) + 3.5, "text-anchor": "end", "font-size": 10, fill: MUTED, text: state.o === "F" ? fmt.num(v) : fmt.tickPct(v) }));
    }
    for (const v of [0.25, 0.5, 0.75, 1]) root.append(svg("text", { x: x(v), y: SH - 8, "text-anchor": "middle", "font-size": 10, fill: MUTED, text: fmt.num(v) }));
    root.append(svg("line", { x1: sm.left, x2: SW - sm.right, y1: SH - sm.bottom, y2: SH - sm.bottom, stroke: RULE }));
    const rowsToDraw = [[0, "#bdbdbd", "lowest K"], [7, LINE[state.o], "highest K"]];
    if (row !== null && row !== 0 && row !== 7) rowsToDraw.push([row, INK, `eighth ${row + 1}`]);
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
  host.append(el("h3.rule", { text: "Every H2 estimate" }),
    el("p.sub", { text: "Damage interacted with each capital measure at s+2, in percentage points per standard deviation of the measure; the flood-zone rows are in percentage points. The tract's flood policies in force at landfall measure capital without any FEMA registrant." }));
  const fh = el("div");
  host.append(fh);
  const groups = [["return", "Recovery with return"], ["changed", "Owner change"], ["F", "Value regained"], ["business", "A business entity holds the house"], ["flood", "The flood zone: return of the pre-storm owner"]];
  const rows = [];
  for (const [g, title] of groups) {
    rows.push({ head: title });
    for (const e of D.estimates.filter((x) => x.group === g)) rows.push({ ...e, key: e.status === "pre-specified" });
  }
  forest(fh, rows, { unit: "pp", d: 1, axis: "percentage points; the line marks no difference" });
  host.append(forestKey());
  const corr = D.corr.find((c) => c.pair.startsWith("K and"));
  if (corr) host.append(el("p.sub", { style: { marginTop: ".7rem" }, text: `K and the tract's NFIP penetration correlate at a Spearman ${fmt.num(corr.rho)} over ${fmt.count(corr.tracts)} tracts: two measures of capital that overlap, not one measure twice.` }));

  howto(host, {
    lines: [
      "Damaged resident owner-occupied homes of the storm-struck tracts, held since two rolls before the storm, present on the second roll after it (s+2, about 15 months). Loss runs left to right, the tract's incumbent capital K bottom to top.",
      "K is the mean of the standardized share of the tract's FEMA owner registrants reporting homeowners or flood insurance and the standardized log of tract median income. Each cell holds the homes of one loss band and one eighth of K; cells with fewer than 150 homes are hatched.",
      "The smoothed view is the paper's Figure 6 (a 3 x 3 moving mean of the drawn cells); the cell means are the raw averages. Hover a cell for its homes; the side card draws its row.",
    ],
    terms: pick("k", "ret", "loss", "pp", "ci", "prespec"),
  });

  const rk = E("return", "damage × K");
  const ck = E("changed", "damage × K");
  const nf = E("return", "damage × NFIP policies in force at landfall");
  finding(`Where the damaged owners of a tract were better insured and better off, the pre-storm owner more often kept the house: one standard deviation more capital raises the return of the pre-storm owner by <b>${fmt.num(rk.e, 1)} pp</b> ${fmt.ci(rk.lo, rk.hi)} and lowers owner change by ${fmt.num(-ck.e, 1)} pp; flood policies in force at landfall give the same answer (${fmt.num(nf.e, 1)} pp).`);

  draw();

  const cl = E("return", "damage × NFIP claims per 100 damaged houses");
  const d20 = E("return", "damage × K, tracts with D of 20 or more");
  tour({
    name: "financial resources",
    steps: [
      { cap: "Each cell: damaged resident homes about 15 months after landfall, by structural loss (across) and the tract's capital (up).", ms: 4200, run: () => { state.o = "return"; state.smooth = true; sSeg.setValue("s"); draw(); } },
      { cap: "Recovery with return falls as the loss grows and rises with the capital the owners had before the storm.", ms: 4000, run: () => slice(7) },
      { cap: `The test: ${fmt.num(rk.e, 1)} pp more returns per standard deviation of capital ${fmt.ci(rk.lo, rk.hi)}.`, ms: 3800, run: () => slice(null) },
      { cap: "Owner change is the mirror image: fewer sales where capital is higher.", ms: 3800, run: () => { state.o = "changed"; draw(); } },
      { cap: `Insurance in force at landfall counts; claims filed do not (${fmt.num(cl.e, 1)} pp, ${fmt.ci(cl.lo, cl.hi).slice(1, -1)}).`, ms: 4200, run: () => { state.o = "return"; draw(); } },
      { cap: `Where the storm destroyed almost everything, capital no longer holds the owner (${fmt.num(d20.e, 1)} pp, ${fmt.ci(d20.lo, d20.hi).slice(1, -1)}).`, ms: 4200, run: () => {} },
    ],
    after: () => {},
    rest: () => { state.o = "return"; state.smooth = true; sSeg.setValue("s"); draw(); },
  }).attach(tourHost);
}
