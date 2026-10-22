/* The gap page (Figure 4; Table 2 and its continuation; Figure S13).
   Three panels, one per structural loss bin: the share of damaged
   resident-owned homes restored (the structure clock), the share restored
   and still held by the pre-storm owner (the two clocks together), the
   pink band between them (recovery without return) and the cleared lot.
   Below: the seven states of the hovered roll as one bar, the sale clock,
   and the two clocks season by season.

   Data: data/clocks.json. */

import { el, svg, clear } from "../lib/dom.js";
import * as fmt from "../lib/format.js";
import * as tip from "../lib/tooltip.js";
import { linear } from "../lib/scale.js";
import { GREEN, PINK, GRAY, GRAY_DARK, INK, MUTED, GRID, RULE, PALE, mix } from "../lib/palette.js";
import { tour } from "../lib/tour.js";
import { howto, pick, finding } from "../lib/read.js";

const SAME = ["recovery with return", "restored, same owner, no homestead"];
const NEW = ["recovery without return: restored then sold", "recovery without return: sold then restored"];
const STATE_STYLE = {
  "recovery with return": { fill: "#9cc3a9", label: "recovery with return" },
  "restored, same owner, no homestead": { fill: "#cfe2d4", label: "restored, same owner, no homestead" },
  "recovery without return: restored then sold": { fill: "#c9668b", label: "RWR: restored, then sold" },
  "recovery without return: sold then restored": { fill: "#e4aac0", label: "RWR: sold, then restored" },
  "stranded incumbent": { fill: "#d6d6d6", label: "stranded incumbent" },
  "unresolved transition": { fill: "#ffffff", label: "unresolved transition" },
  cleared: { fill: "#8c8c8c", label: "cleared lot" },
};
const SALE_COLOR = { "<.10": GRAY, ".25-.50": "#d49ab0", ".50-.75": "#bd5f84", ">=.75": PINK };

const sum = (st, keys) => keys.reduce((a, k) => a + st[k][0], 0);

export function clocksChart(host, app) {
  const C = app.clocks;
  const months = C.months;
  const ks = [1, 2, 3, 4];
  const state = { bin: ">=.75", k: 4 };

  const tourHost = el("div");
  const panels = el("div.panelgrid.three");
  const reading = el("div.reading-strip");
  clear(host).append(tourHost, panels, reading);

  /* ---- the three panels */
  const W = 360;
  const H = 300;
  const m = { top: 30, right: 46, bottom: 40, left: 40 };
  const x = linear([months[1], months[4]], [m.left, W - m.right]);
  const y = linear([0, 0.62], [H - m.bottom, m.top]);
  const parts = [];
  for (const b of C.bins) {
    const cells = C.cells[b.key];
    const pts = ks.map((k) => {
      const st = cells[k].states;
      return { k, m: months[k], same: sum(st, SAME), rest: sum(st, SAME) + sum(st, NEW), cl: st.cleared[0], n: cells[k].n };
    });
    const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `${b.label}: the two clocks` });
    for (const v of [0, 0.2, 0.4, 0.6]) {
      root.append(svg("line", { x1: m.left, x2: W - m.right, y1: y(v), y2: y(v), stroke: v === 0 ? RULE : GRID }),
        svg("text", { x: m.left - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11, fill: MUTED, text: v === 0 ? "0" : fmt.tickPct(v) }));
    }
    for (const p of pts) {
      root.append(svg("text", { x: x(p.m), y: H - m.bottom + 16, "text-anchor": "middle", "font-size": 11, fill: MUTED, text: fmt.mo(p.m) }));
    }
    root.append(svg("text", { x: (m.left + W - m.right) / 2, y: H - 6, "text-anchor": "middle", "font-size": 11, fill: MUTED, text: "months after landfall" }));
    const area = (top, bot) => `M${pts.map((p) => `${x(p.m).toFixed(1)},${y(top(p)).toFixed(1)}`).join("L")}L${[...pts].reverse().map((p) => `${x(p.m).toFixed(1)},${y(bot(p)).toFixed(1)}`).join("L")}Z`;
    const line = (f) => `M${pts.map((p) => `${x(p.m).toFixed(1)},${y(f(p)).toFixed(1)}`).join("L")}`;
    const gSame = svg("g", { class: "s-same" }, [
      svg("path", { d: area((p) => p.same, () => 0), fill: PALE.green }),
      svg("path", { d: line((p) => p.same), fill: "none", stroke: GREEN, "stroke-width": 2.4 }),
    ]);
    const gBand = svg("g", { class: "s-band" }, [svg("path", { d: area((p) => p.rest, (p) => p.same), fill: PALE.pink })]);
    const gRest = svg("g", { class: "s-rest" }, [svg("path", { d: line((p) => p.rest), fill: "none", stroke: PINK, "stroke-width": 2.4 })]);
    const gCl = svg("g", { class: "s-cl" }, [svg("path", { d: line((p) => p.cl), fill: "none", stroke: GRAY_DARK, "stroke-width": 1.6, "stroke-dasharray": "5 3" })]);
    for (const p of pts) {
      gSame.append(svg("circle", { cx: x(p.m), cy: y(p.same), r: 3.6, fill: GREEN }));
      gRest.append(svg("circle", { cx: x(p.m), cy: y(p.rest), r: 3.6, fill: PINK }));
      gCl.append(svg("rect", { x: x(p.m) - 3.2, y: y(p.cl) - 3.2, width: 6.4, height: 6.4, fill: GRAY_DARK }));
    }
    root.append(gBand, gSame, gCl, gRest);
    const last = pts[3];
    const ends = [[last.rest, PINK, "s-rest"], [last.same, GREEN, "s-same"], [last.cl, GRAY_DARK, "s-cl"]].sort((a, b) => b[0] - a[0]);
    let prevY = -Infinity;
    for (const [v, col, cls] of ends) {
      let yy = y(v) + 4;
      if (yy - prevY < 13) yy = prevY + 13;
      prevY = yy;
      root.append(svg("text", { class: cls, x: x(last.m) + 7, y: yy, "font-size": 12, "font-weight": 600, fill: col, text: fmt.pct(v) }));
    }
    const r4 = C.rwr[b.key][4];
    /* the band label goes where the band is widest and clear of the cleared-lot line */
    const lerp = (f, mm) => {
      const i = Math.max(0, pts.findIndex((p, j) => j < pts.length - 1 && mm >= p.m && mm <= pts[j + 1].m));
      const a = pts[i];
      const c = pts[i + 1];
      const u = (mm - a.m) / (c.m - a.m);
      return f(a) + (f(c) - f(a)) * u;
    };
    let best = null;
    for (let mm = months[2] + 3; mm <= months[4] - 3; mm += 1) {
      const top = y(lerp((p) => p.rest, mm));
      const bot = y(lerp((p) => p.same, mm));
      const mid = (top + bot) / 2;
      const clear = Math.abs(y(lerp((p) => p.cl, mm)) - mid);
      const score = (bot - top) - (clear < 24 ? 60 : 0) - Math.abs(mm - (months[3] + months[4]) / 2) * 0.4;
      if (!best || score > best.score) best = { mm, mid, score };
    }
    const bandY = best.mid;
    const bx = x(best.mm);
    const halo = { stroke: "#fff", "stroke-width": 3, "stroke-linejoin": "round", "paint-order": "stroke" };
    root.append(svg("text", { class: "s-band", x: bx, y: bandY - 2, "text-anchor": "middle", "font-size": 11, fill: INK, ...halo, text: "new owner" }),
      svg("text", { class: "s-band", x: bx, y: bandY + 11, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: INK, ...halo, text: `${fmt.num(r4.share)}${fmt.stars(r4.p)}` }));
    /* hover strips, one per roll */
    const guide = svg("line", { y1: m.top - 6, y2: H - m.bottom, stroke: INK, "stroke-width": 0.8, opacity: 0 });
    root.append(guide);
    ks.forEach((k, i) => {
      const x0 = i === 0 ? m.left - 10 : (x(months[ks[i - 1]]) + x(months[k])) / 2;
      const x1 = i === ks.length - 1 ? W - m.right + 30 : (x(months[k]) + x(months[ks[i + 1]])) / 2;
      const hit = svg("rect", { x: x0, y: m.top - 10, width: x1 - x0, height: H - m.bottom - m.top + 10, fill: "transparent" });
      hit.addEventListener("pointerenter", (ev) => { guide.setAttribute("x1", x(months[k])); guide.setAttribute("x2", x(months[k])); guide.setAttribute("opacity", 1); state.bin = b.key; state.k = k; paintReading(); showTip(ev, b, k); });
      hit.addEventListener("pointermove", tip.move);
      hit.addEventListener("pointerleave", () => { guide.setAttribute("opacity", 0); tip.hide(); });
      root.append(hit);
    });
    const head = el("div.panel-head", {}, [el("b", { text: b.label }), el("span", { text: `${fmt.count(cells[4].n)} homes` })]);
    panels.append(el("div.figure", {}, [head, root]));
    parts.push({ b, root, pts });
  }
  const legend = el("div.legend", {}, [
    el("span.item", {}, [el("i.swatch", { style: { background: PINK } }), "restored"]),
    el("span.item", {}, [el("i.swatch", { style: { background: GREEN } }), "restored by the pre-storm owner"]),
    el("span.item", {}, [el("i.sq", { style: { background: PALE.pink } }), "recovery without return"]),
    el("span.item", { style: { color: GRAY_DARK } }, [el("i.swatch.dash", { style: { color: GRAY_DARK } }), "cleared lot"]),
    el("span.item.note", {}, ["new owner: share of restored homes under a new owner at 39 months; * p < .05 ** p < .01 *** p < .001 against lost .25 to .50"]),
  ]);
  panels.after(legend);

  function showTip(ev, b, k) {
    const st = C.cells[b.key][k].states;
    const rows = [["restored", fmt.pct(sum(st, SAME) + sum(st, NEW))], ["by the pre-storm owner", fmt.pct(sum(st, SAME))],
      ["under a new owner", fmt.pct(sum(st, NEW))], ["not restored", fmt.pct(st["stranded incumbent"][0] + st["unresolved transition"][0])],
      ["cleared lot", fmt.pct(st.cleared[0])]];
    const r = C.rwr[b.key][k];
    if (r && r.restored) rows.push(["new owner among restored", `${fmt.num(r.share)} ${fmt.ci(r.lo, r.hi, 2)}`]);
    tip.show(ev, { title: `${b.label}, ${fmt.mo(months[k])} months`, rows, note: `${fmt.count(C.cells[b.key][k].n)} damaged resident-owned homes on the roll.` });
  }

  /* ---- the seven states of one roll, as one bar */
  function paintReading() {
    const b = C.bins.find((v) => v.key === state.bin);
    const st = C.cells[state.bin][state.k].states;
    const segs = C.states.map((s) => ({ key: s.key, v: st[s.key][0], lo: st[s.key][1], hi: st[s.key][2], ...STATE_STYLE[s.key] }));
    const bar = el("div.stackbar", {}, segs.filter((s) => s.v > 0).map((s) => {
      const seg = el("i", { style: { width: `${s.v * 100}%`, background: s.fill } }, [s.v >= 0.06 ? el("span", { text: fmt.pct(s.v) }) : null]);
      seg.addEventListener("pointerenter", (ev) => tip.show(ev, { title: s.label, rows: [["share", `${fmt.pct(s.v, 1)} ${fmt.ci(s.lo * 100, s.hi * 100, 1)}`]] }));
      seg.addEventListener("pointermove", tip.move);
      seg.addEventListener("pointerleave", tip.hide);
      return seg;
    }));
    const key = el("div.legend", {}, segs.map((s) => el("span.item", {}, [el("i.sq", { style: { background: s.fill } }), `${s.label} ${fmt.pct(s.v)}`])));
    const r = C.rwr[state.bin][state.k];
    clear(reading).append(
      el("p.reading-head", { html: `<b>${b.label}, ${fmt.mo(months[state.k])} months after landfall</b>: the seven states of the damaged homes` + (r && r.restored ? `; under a new owner among restored <b>${fmt.num(r.share)}</b> ${fmt.ci(r.lo, r.hi, 2)}${fmt.stars(r.p)}` : "") },),
      bar, key);
  }
  paintReading();

  /* ---- the sale clock */
  host.append(el("h3.rule", { text: "The sale clock: who sells, to whom, at what price" }),
    el("p.sub", { text: "Resident owner-occupied homes sold for value within months of landfall, by structural loss, seasons 2016 to 2024 (sales through December 2024)." }));
  const saleGrid = el("div.panelgrid");
  host.append(saleGrid);
  {
    const SW = 560;
    const SH = 300;
    const sm = { top: 16, right: 120, bottom: 40, left: 44 };
    const sx = linear([0, 36], [sm.left, SW - sm.right]);
    const maxV = Math.max(...C.sales.flatMap((s) => s.clock.map((c) => c.share)));
    const sy = linear([0, Math.ceil(maxV * 20) / 20], [SH - sm.bottom, sm.top]);
    const root = svg("svg", { viewBox: `0 0 ${SW} ${SH}`, role: "img", "aria-label": "Share sold for value by months since landfall" });
    for (const v of sy.ticks(5)) {
      root.append(svg("line", { x1: sm.left, x2: SW - sm.right, y1: sy(v), y2: sy(v), stroke: v === 0 ? RULE : GRID }),
        svg("text", { x: sm.left - 6, y: sy(v) + 4, "text-anchor": "end", "font-size": 11, fill: MUTED, text: v === 0 ? "0" : fmt.tickPct(v) }));
    }
    for (const mm of [3, 6, 12, 24, 36]) root.append(svg("text", { x: sx(mm), y: SH - sm.bottom + 16, "text-anchor": "middle", "font-size": 11, fill: MUTED, text: mm }));
    root.append(svg("text", { x: (sm.left + SW - sm.right) / 2, y: SH - 6, "text-anchor": "middle", "font-size": 11, fill: MUTED, text: "months after landfall" }));
    const labels = [];
    for (const s of C.sales) {
      const col = SALE_COLOR[s.key];
      const d = `M${s.clock.map((c) => `${sx(c.m).toFixed(1)},${sy(c.share).toFixed(1)}`).join("L")}`;
      root.append(svg("path", { d, fill: "none", stroke: col, "stroke-width": s.key === "<.10" ? 1.6 : 2.2, "stroke-dasharray": s.key === "<.10" ? "5 3" : null }));
      for (const c of s.clock) {
        const dot = svg("circle", { cx: sx(c.m), cy: sy(c.share), r: 4, fill: col, stroke: "#fff", "stroke-width": 1 });
        dot.addEventListener("pointerenter", (ev) => tip.show(ev, { title: `${s.label}, within ${c.m} months`, rows: [["sold for value", `${fmt.pct(c.share, 1)} ${fmt.ci(c.lo * 100, c.hi * 100, 1)}`], ["homes", fmt.count(c.n)]] }));
        dot.addEventListener("pointermove", tip.move);
        dot.addEventListener("pointerleave", tip.hide);
        root.append(dot);
      }
      const last = s.clock[s.clock.length - 1];
      labels.push({ y: sy(last.share), text: `${s.label.replace("Undamaged (lost under .10)", "undamaged").replace("Lost ", "lost ")} ${fmt.pct(last.share)}`, col });
    }
    labels.sort((a, b) => a.y - b.y);
    let py = -Infinity;
    for (const l of labels) {
      const yy = Math.max(l.y + 4, py + 14);
      py = yy;
      root.append(svg("text", { x: sx(36) + 8, y: yy, "font-size": 11.5, "font-weight": 600, fill: l.col, text: l.text }));
    }
    saleGrid.append(el("div.figure", {}, [root]));
  }
  {
    const side = el("aside.sidecard");
    side.append(el("h4", { text: "Who buys, and at what price" }));
    const bars = (title, f, note) => {
      const box = el("div.minibars");
      box.append(el("p.lab", { text: title }));
      const max = Math.max(...C.sales.map(f));
      for (const s of C.sales) {
        const v = f(s);
        box.append(el("div.minibar", {}, [
          el("span.k", { text: s.label.replace("Undamaged (lost under .10)", "undamaged") }),
          el("span.t", {}, [el("i", { style: { width: `${(v / max) * 100}%`, background: SALE_COLOR[s.key] === GRAY ? "#d9d9d9" : mix(SALE_COLOR[s.key], "#ffffff", 0.55) } })]),
          el("b", { text: fmt.pct(v) }),
        ]));
      }
      if (note) box.append(el("p.what", { text: note }));
      return box;
    };
    side.append(bars("Business buyer, sales within 24 months", (s) => s.buyers.business || 0),
      bars("Median sale price over the pre-storm just value", (s) => s.price_over_jv, "A deed for value is a recorded sale at a price of at least 10% of the pre-storm just value."));
    saleGrid.append(side);
  }

  /* ---- season by season */
  host.append(el("h3.rule", { text: "Season by season" }),
    el("p.sub", { text: "Damaged resident-owned homes of each season, every loss bin: restored, and restored by the pre-storm owner, on the rolls each season has reached." }));
  const grid = el("div.seasons");
  host.append(grid);
  for (const s of C.seasons) {
    const SW = 240;
    const SH = 150;
    const sm = { top: 10, right: 40, bottom: 22, left: 30 };
    const sx = linear([months[1], months[4]], [sm.left, SW - sm.right]);
    const sy = linear([0, 0.62], [SH - sm.bottom, sm.top]);
    const pts = s.rolls.map((r) => ({ m: months[r.k], k: r.k, same: SAME.reduce((a, k) => a + r.states[k], 0), rest: [...SAME, ...NEW].reduce((a, k) => a + r.states[k], 0), cl: r.states.cleared }));
    const root = svg("svg", { viewBox: `0 0 ${SW} ${SH}`, role: "img", "aria-label": `${s.storms.join(", ")} ${s.season}` });
    for (const v of [0, 0.3, 0.6]) {
      root.append(svg("line", { x1: sm.left, x2: SW - sm.right, y1: sy(v), y2: sy(v), stroke: v === 0 ? RULE : GRID }),
        svg("text", { x: sm.left - 4, y: sy(v) + 3.5, "text-anchor": "end", "font-size": 9.5, fill: MUTED, text: v === 0 ? "0" : fmt.tickPct(v) }));
    }
    for (const k of ks) root.append(svg("text", { x: sx(months[k]), y: SH - 6, "text-anchor": "middle", "font-size": 9.5, fill: MUTED, text: fmt.mo(months[k]) }));
    const area = (top, bot) => `M${pts.map((p) => `${sx(p.m).toFixed(1)},${sy(top(p)).toFixed(1)}`).join("L")}L${[...pts].reverse().map((p) => `${sx(p.m).toFixed(1)},${sy(bot(p)).toFixed(1)}`).join("L")}Z`;
    const line = (f) => `M${pts.map((p) => `${sx(p.m).toFixed(1)},${sy(f(p)).toFixed(1)}`).join("L")}`;
    root.append(svg("path", { d: area((p) => p.same, () => 0), fill: PALE.green }), svg("path", { d: area((p) => p.rest, (p) => p.same), fill: PALE.pink }),
      svg("path", { d: line((p) => p.same), fill: "none", stroke: GREEN, "stroke-width": 1.8 }), svg("path", { d: line((p) => p.rest), fill: "none", stroke: PINK, "stroke-width": 1.8 }),
      svg("path", { d: line((p) => p.cl), fill: "none", stroke: GRAY_DARK, "stroke-width": 1.2, "stroke-dasharray": "4 2" }));
    const last = pts[pts.length - 1];
    root.append(svg("text", { x: sx(last.m) + 5, y: sy(last.rest) + 4, "font-size": 10, "font-weight": 600, fill: PINK, text: fmt.pct(last.rest) }));
    const note = s.rwr_3 !== null ? `new owner among restored at 27 months ${fmt.num(s.rwr_3)}` : `${fmt.mo(last.m)} months so far`;
    const card = el("div.season", {}, [
      el("b", { text: `${s.storms.join(" · ")} ${s.season}` }),
      el("span.meta", { text: `${fmt.count(s.n_damaged)} damaged homes · ${fmt.pct(s.destroyed)} lost half or more` }),
      root,
      el("span.meta", { text: note }),
    ]);
    root.addEventListener("pointerenter", (ev) => tip.show(ev, { title: `${s.storms.join(", ")} ${s.season}`, rows: pts.map((p) => [`${fmt.mo(p.m)} months`, `restored ${fmt.pct(p.rest)} · pre-storm owner ${fmt.pct(p.same)}`]) }));
    root.addEventListener("pointermove", tip.move);
    root.addEventListener("pointerleave", tip.hide);
    grid.append(card);
  }

  howto(host, {
    lines: [
      "Damaged resident owner-occupied homes of the storm-struck tracts, held since two rolls before the storm, in the seasons that reach the fourth roll (2016 to 2021). Shares of the homes present on each roll.",
      "The pink line is the structure clock (restored: structure value back to 90% of its pre-storm level after the county trend); the green line is the same homes restored and still held by the pre-storm owner. The pink band between them is recovery without return.",
      "Hover a roll for every state with its share; the bar below the panels splits the hovered roll into the seven states of the paper's Table 2.",
    ],
    terms: pick("clocks", "rwr", "ret", "stranded", "unresolved", "cleared", "restored", "loss", "rolls"),
  });

  const r25 = C.rwr[".25-.50"][4];
  const r75 = C.rwr[">=.75"][4];
  finding(`The two clocks separate as the loss grows: 39 months after landfall, <span class="rwr">${fmt.num(r25.share)}</span> of the restored homes are under a new owner where the loss was a quarter to a half, and <span class="rwr">${fmt.num(r75.share)}</span> where it was three quarters or more.`);

  /* ---- the tour */
  const focus = (cls, bin = null) => {
    for (const p of parts) {
      for (const g of p.root.querySelectorAll(".s-same, .s-band, .s-rest, .s-cl")) {
        const on = !cls || (g.classList.contains(cls) && (!bin || p.b.key === bin));
        g.classList.toggle("dim", !on);
      }
    }
  };
  const st75 = C.cells[">=.75"];
  tour({
    name: "the gap",
    steps: [
      { cap: "The pink line is the structure clock: the share of damaged homes restored.", ms: 3200, run: () => focus("s-rest") },
      { cap: "The green line reads both clocks: restored and still held by the pre-storm owner.", ms: 3200, run: () => focus("s-same") },
      { cap: "The pink band between them is recovery without return; it widens with the loss.", ms: 3600, run: () => focus("s-band") },
      { cap: `Where the loss was three quarters or more, ${fmt.pct(st75[1].states.cleared[0])} of lots stood cleared on the first roll and ${fmt.pct(st75[4].states.cleared[0])} still do at 39 months.`, ms: 4200, run: () => focus("s-cl", ">=.75") },
      { cap: `Within the band, most owners restore first and sell after: ${fmt.pct(st75[4].states[NEW[0]][0])} against ${fmt.pct(st75[4].states[NEW[1]][0])} who sold the wreck.`, ms: 4400, run: () => { focus(null); state.bin = ">=.75"; state.k = 4; paintReading(); } },
    ],
    after: () => {},
    rest: () => { focus(null); state.bin = ">=.75"; state.k = 4; paintReading(); },
  }).attach(tourHost);
}
