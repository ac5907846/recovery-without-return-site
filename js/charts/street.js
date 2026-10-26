/* The landing page, Two clocks. A block of a hundred lots stands for the
   resident owner-occupied homes of one structural loss category, one lot
   per hundredth; the clock moves them through the four rolls after the
   storm. The height of each house is physical restoration (restored,
   unrestored, cleared) and its roof ownership continuity (green: the
   original owner; pink: a new owner). Beside it, the recovery pathways of
   Figure 1 hold the same shares, and the share of restored homes under a
   new owner (Table 2).

   Data: data/street.json (a18 taxonomy_by_loss.csv and rwr_share.csv,
   seasons 2016 to 2021). The lots are a display of the shares, sorted by
   state; they are not individual homes followed over time. */

import { el, svg, clear, segmented } from "../lib/dom.js";
import * as fmt from "../lib/format.js";
import * as tip from "../lib/tooltip.js";
import { makeLot, iso, lotW, stormGlyph } from "../lib/house.js";
import { GREEN, PINK, INK, CLASS } from "../lib/palette.js";
import { tour, reduced } from "../lib/tour.js";
import { howto, pick, finding } from "../lib/read.js";
import { count as countUp } from "../lib/motion.js";

const N = 10;
const L = 40;
const GAP = 7;
const ORDER = ["rr", "rt", "ur", "ut", "cl"];
const KIND = { rr: "full", rt: "full", ur: "tarp", ut: "tarp", cl: "cleared" };
const ROOF = { rr: GREEN, rt: PINK, ur: GREEN, ut: PINK, cl: null };
const CLASS_NOTE = {
  rr: "restored, original owner",
  rt: "restored, new owner",
  ur: "unrestored, original owner",
  ut: "unrestored, new owner",
  cl: "no structure on the roll",
};

/** Largest-remainder rounding of shares to whole lots out of n. */
export function allot(shares, n = 100) {
  const raw = ORDER.map((c) => (shares[c] || 0) * n);
  const base = raw.map(Math.floor);
  let left = n - base.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
  for (let j = 0; j < order.length && left > 0; j += 1, left -= 1) base[order[j][1]] += 1;
  return Object.fromEntries(ORDER.map((c, i) => [c, base[i]]));
}

export function classShares(cell, states) {
  const out = { rr: 0, rt: 0, ur: 0, ut: 0, cl: 0 };
  for (const s of states) out[s.cls] += cell.states[s.key][0];
  return out;
}

export function streetChart(host, app) {
  const S = app.street;
  const months = S.months;
  const state = { bin: ">=.75", t: 4, lit: null };
  const linked = location.hash.length > 1;      /* a shared view in the address holds still */
  readHash();

  /* ---- controls */
  const binSeg = segmented(S.bins.map((b) => ({ key: b.key, label: b.label })), state.bin, (k) => { state.bin = k; update(true); writeHash(); });
  const tItems = [{ key: 0, label: "Before" }, ...[1, 2, 3, 4].map((k) => ({ key: k, label: `${fmt.mo(months[k])} mo` }))];
  const tSeg = segmented(tItems, state.t, (k) => { state.t = Number(k); update(true); writeHash(); });
  const playBtn = el("button.btn-quiet", { type: "button", text: "Run the clock", onclick: () => runClock() });
  const controls = el("div.controls", {}, [
    el("div.control", {}, [el("span.label", { text: "Structural loss (L) on the first post-storm roll" }), binSeg]),
    el("div.control", {}, [el("span.label", { text: "Months after landfall" }), tSeg]),
    el("div.control", {}, [el("span.label", { text: " " }), playBtn]),
  ]);

  /* ---- the block of lots */
  const step = L + GAP;
  const span = N * L + (N - 1) * GAP;
  const W = Math.ceil(lotW(span)) + 40;
  const top = 46;
  const H = Math.ceil(span) + top + 24;
  const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "A block of one hundred lots, one per hundredth of the homes in the category" });
  const gLots = svg("g");
  const gStorm = svg("g", { opacity: 0 });
  const OX = W / 2;
  const P = (x, y) => iso(OX, top, x, y, 0);
  const m = -GAP * 1.4;
  const groundPts = [P(m, m), P(span - m, m), P(span - m, span - m), P(m, span - m)];
  root.append(svg("path", { d: `M${groundPts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join("L")}Z`, fill: "#f6f6f4", stroke: "none" }), gLots, gStorm);
  const slots = [];
  for (let i = 0; i < N; i += 1) for (let j = 0; j < N; j += 1) slots.push({ i, j });
  slots.sort((a, b) => (a.i + a.j) - (b.i + b.j) || a.i - b.i);
  const lots = slots.map(({ i, j }, idx) => {
    const [ox, oy] = iso(OX, top, i * step, j * step, 0);
    const lot = makeLot(gLots, ox, oy, L);
    lot.idx = idx;
    lot.depth = i + j;
    lot.g.addEventListener("pointerenter", (ev) => hoverLot(ev, lot));
    lot.g.addEventListener("pointermove", tip.move);
    lot.g.addEventListener("pointerleave", () => { tip.hide(); if (!state.lit) light(null); });
    return lot;
  });
  gStorm.appendChild(stormGlyph(0, 0, 22, INK));

  const legend = el("div.legend", {}, [
    el("span.item", {}, [icon("full", GREEN), "restored, original owner"]),
    el("span.item", {}, [icon("full", PINK), "restored, new owner"]),
    el("span.item", {}, [icon("tarp", GREEN), "unrestored"]),
    el("span.item", {}, [icon("cleared", null), "cleared lot"]),
    el("span.item.note", {}, ["one lot = one in a hundred homes of the category"]),
  ]);
  const figure = el("div.figure", {}, [root, legend]);

  /* ---- the recovery matrix and the reading */
  const cellNodes = {};
  const cell = (c) => {
    const node = el(`div.cell.${c}`, { style: { background: CLASS[c].fill } }, [
      c === "rt" ? el("span.tag", { text: "RN" }) : null,
      el("span.v", { text: "" }),
      el("span.n", { text: CLASS_NOTE[c] }),
    ]);
    node.addEventListener("pointerenter", () => light(c));
    node.addEventListener("pointerleave", () => light(state.lit));
    node.addEventListener("click", () => { state.lit = state.lit === c ? null : c; light(state.lit); });
    cellNodes[c] = node;
    return node;
  };
  const head = el("h4", { text: "" });
  const matrix = el("div.matrix", { "aria-live": "polite" }, [
    el("span"), el("span.mh", { text: "Original owner" }), el("span.mh", { text: "New owner" }),
    el("span.rh", { text: "Restored" }), cell("rr"), cell("rt"),
    el("span.rh", { text: "Unrestored" }), cell("ur"), cell("ut"),
    el("span.rh", { text: "Cleared" }), cell("cl"),
  ]);
  const big = el("div.bignum.pink");
  const bigWhat = el("p.what");
  const nLine = el("p.what");
  const side = el("aside.sidecard", {}, [head, matrix, el("p.what", { style: { margin: ".9rem 0 .2rem" }, text: "Restored homes under a new owner" }), big, bigWhat, nLine]);

  const tourHost = el("div");
  clear(host).append(tourHost, controls, el("div.panelgrid", {}, [figure, side]));

  howto(host, {
    lines: [
      "Each lot stands for one in a hundred resident owner-occupied homes of the chosen structural loss category, seasons 2016 to 2021 (every season reaches the fourth roll). The lots are sorted by state; they show shares, not single homes followed over time.",
      "The height of a house is physical restoration: a full house is restored, a low box under a tarp is unrestored, an empty lot is cleared. The roof is ownership continuity: green is the original owner, pink a new owner.",
      "The matrix beside it holds the recovery pathways of Figure 1 with the shares of Table 2 filled in. Hover a lot or a cell for the states inside it and their 95% CIs; click a cell to keep its lots lit.",
    ],
    terms: pick("clocks", "ret", "rwr", "stranded", "unresolved", "cleared", "loss", "restored", "rolls"),
  });

  /* ---- the finding line, from the data */
  const c4 = classShares(S.cells[">=.75"][4], S.states);
  const r4 = S.rwr[">=.75"][4];
  const r4lo = S.rwr[".25-.50"][4];
  finding(`Of the resident owner-occupied homes with structural loss of at least 75%, <b>${fmt.pct(c4.rr + c4.rt)}</b> were restored 39 months after landfall, but only <b>${fmt.pct(c4.rr)}</b> under their original owners: <span class="rwr">${fmt.pct(r4.share)}</span> of the restored homes were under a new owner, against ${fmt.pct(r4lo.share)} where the loss was 25% to under 50%.`);

  /* ---- drawing */
  let current = null;
  function plan() {
    if (state.t === 0) return lots.map(() => "before");
    const shares = classShares(S.cells[state.bin][state.t], S.states);
    const counts = allot(shares);
    const out = [];
    for (const c of ORDER) for (let k = 0; k < counts[c]; k += 1) out.push(c);
    return out;
  }

  function update(animate) {
    binSeg.setValue(state.bin);
    tSeg.setValue(state.t);
    const target = plan();
    const wasBefore = current && current[0] === "before";
    lots.forEach((lot, i) => {
      const c = target[i];
      lot.cls = c;
      const spec = c === "before" ? { kind: "full", roof: GREEN } : { kind: KIND[c], roof: ROOF[c] };
      if (!animate || reduced) { lot.set(spec, 0); return; }
      if (current && current[i] === c) return;
      setTimeout(() => lot.set(spec, 650), lot.depth * 28);
    });
    if (animate && !reduced && wasBefore && state.t > 0) sweep();
    current = target;
    side.dataset.t = String(state.t);
    paintSide();
    light(state.lit);
  }

  function paintSide() {
    const bin = S.bins.find((b) => b.key === state.bin);
    if (state.t === 0) {
      head.textContent = "Recovery pathways (Figure 1), before the storm";
      for (const c of ORDER) cellNodes[c].querySelector(".v").textContent = c === "rr" ? "100%" : "0";
      big.textContent = "none yet";
      bigWhat.textContent = "Every home is under the owner recorded for at least two rolls before the storm.";
      nLine.textContent = `${bin.label}: ${fmt.count(S.cells[state.bin][1].n)} resident owner-occupied homes.`;
      return;
    }
    const cellData = S.cells[state.bin][state.t];
    const shares = classShares(cellData, S.states);
    head.textContent = `Recovery pathways (Figure 1), ${fmt.mo(months[state.t])} months after landfall`;
    for (const c of ORDER) {
      const v = cellNodes[c].querySelector(".v");
      v.setAttribute("data-count", String(shares[c]));
      v.setAttribute("data-fmt", "pct0");
      v.textContent = fmt.pct(shares[c]);
    }
    countUp(matrix, 650);
    const r = S.rwr[state.bin][state.t];
    if (!r || !r.restored) {
      big.textContent = "none yet";
      bigWhat.textContent = "No home has reached 90% of its pre-storm structural value on the first post-storm roll.";
    } else {
      big.innerHTML = `${fmt.pct(r.share)}<small>${fmt.ci(100 * r.lo, 100 * r.hi, 0)}${fmt.stars(r.p)}</small>`;
      bigWhat.textContent = `${fmt.count(r.new_owner)} of ${fmt.count(r.restored)} restored homes` + (r.p !== null && r.p !== undefined
        ? `; against the 25% ≤ L <50% category, ${fmt.pval(r.p)}.` : ".");
    }
    nLine.textContent = `${bin.label}: ${fmt.count(cellData.n)} resident owner-occupied homes on this roll.`;
  }

  function light(c) {
    for (const lot of lots) lot.g.classList.toggle("dim", !!c && lot.cls !== c && !(c === "rr" && lot.cls === "before"));
    for (const k of ORDER) cellNodes[k].classList.toggle("lit", k === c);
  }

  function hoverLot(ev, lot) {
    const c = lot.cls;
    if (!state.lit) light(c === "before" ? null : c);
    if (c === "before") {
      tip.show(ev, { title: "Before the storm", rows: [["owner", "the original owner"], ["recorded since", "at least two rolls before the storm"]] });
      return;
    }
    const cellData = S.cells[state.bin][state.t];
    const counts = allot(classShares(cellData, S.states));
    const rows = [["lots", `${counts[c]} of 100`]];
    for (const s of S.states.filter((x) => x.cls === c)) {
      const [v, lo, hi] = cellData.states[s.key];
      rows.push([s.label, `${fmt.pct(v, 1)} ${fmt.ci(lo * 100, hi * 100, 1)}`]);
    }
    rows.push(["homes on the roll", fmt.count(cellData.n)]);
    tip.show(ev, { title: `${CLASS[c].label}: ${S.classes.find((x) => x.key === c).name}`, rows, note: "Shares of the resident owner-occupied homes of the category, with 95% CIs." });
  }

  function sweep() {
    const y = top + span * 0.5;
    const x0 = OX - lotW(span) / 2 - 40;
    const x1 = OX + lotW(span) / 2 + 40;
    const t0 = performance.now();
    const dur = 1400;
    const frame = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const x = x0 + (x1 - x0) * t;
      gStorm.setAttribute("transform", `translate(${x.toFixed(1)},${(y - 30 * Math.sin(t * Math.PI)).toFixed(1)}) rotate(${(-t * 540).toFixed(0)})`);
      gStorm.setAttribute("opacity", String(Math.sin(t * Math.PI).toFixed(2)));
      if (t < 1) requestAnimationFrame(frame); else gStorm.setAttribute("opacity", "0");
    };
    requestAnimationFrame(frame);
  }

  let clockTimer = 0;
  function runClock() {
    clearTimeout(clockTimer);
    const seq = [0, 1, 2, 3, 4];
    let i = 0;
    const next = () => {
      state.t = seq[i];
      update(true);
      i += 1;
      if (i < seq.length) clockTimer = setTimeout(next, i === 1 ? 1500 : 1700);
      else writeHash();
    };
    next();
  }

  function readHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    const b = { "75": ">=.75", "50": ".50-.75", "25": ".25-.50", all: "all" }[h.get("loss")];
    if (b) state.bin = b;
    const m = Number(h.get("t"));
    if ([0, 1, 2, 3, 4].includes(m)) state.t = m;
  }
  function writeHash() {
    const b = { ">=.75": "75", ".50-.75": "50", ".25-.50": "25", all: "all" }[state.bin];
    history.replaceState(null, "", `#loss=${b}&t=${state.t}`);
  }

  function icon(kind, roof) {
    const s = svg("svg", { viewBox: "0 0 34 30", width: 26, height: 23, "aria-hidden": "true" });
    const lot = makeLot(s, 17, 6, 16, { footprint: 0.66 });
    lot.set({ kind, roof }, 0);
    return s;
  }

  update(false);

  /* ---- the tour */
  const at = (bin, t) => allot(classShares(S.cells[bin][t], S.states));
  const a1 = at(">=.75", 1);
  const a4 = at(">=.75", 4);
  const rlo = S.rwr[".25-.50"][4];
  const go = (bin, t, lit = null) => () => { state.bin = bin; state.t = t; state.lit = lit; update(true); };
  const steps = [
    { cap: "Before the storm: a hundred resident owner-occupied homes, each under the same owner for at least two rolls.", ms: 2600, run: go(">=.75", 0) },
    { cap: `Three months after landfall each home has lost at least 75% of its structural value (L75); ${a1.cl} lots are already cleared.`, ms: 3400, run: go(">=.75", 1) },
    { cap: "Fifteen months: the first houses stand restored, some under a pink roof, a new owner.", ms: 3000, run: go(">=.75", 2) },
    { cap: "Twenty-seven months: restoration continues under original and new owners.", ms: 2600, run: go(">=.75", 3) },
    { cap: `Thirty-nine months: ${a4.rr} restored under the original owner, ${a4.rt} under a new owner, ${a4.ur + a4.ut} unrestored, ${a4.cl} cleared.`, ms: 4200, run: go(">=.75", 4) },
    { cap: `Of the restored homes, ${fmt.pct(r4.share)} are under a new owner: recovery without return.`, ms: 3800, run: go(">=.75", 4, "rt") },
    { cap: `Where the loss was 25% to under 50%, the share is ${fmt.pct(rlo.share)}: the greater the structural loss, the more often a restored home has a new owner.`, ms: 4400, run: go(".25-.50", 4, "rt") },
  ];
  tour({
    name: "two clocks",
    steps,
    after: () => {},
    rest: () => { state.bin = ">=.75"; state.t = 4; state.lit = null; update(false); writeHash(); },
  }).attach(tourHost, { autoplay: !linked, figure });
}
