/* The Owner occupancy page (H3a and the exploratory H3b). Figure 7's
   owner cards (restored and cleared shares on the rolls by owner type on
   the pre-storm roll, seasons 2016 to 2022, with the Eq. (3) estimates
   relative to resident owner-occupants and to unaffected homes), the Cape
   Coral permit clock after Ian with the hazard ratios of the Cox model,
   the Charlotte County new-house applications, the neighborhood-level
   extension (H3b) and every estimate of Table 6 across specifications.

   Data: data/owners.json. */

import { el, svg, clear, segmented } from "../lib/dom.js";
import * as fmt from "../lib/format.js";
import * as tip from "../lib/tooltip.js";
import { linear } from "../lib/scale.js";
import { GROUP, MUTED, GRID, RULE, INK, mix } from "../lib/palette.js";
import { forest, forestKey } from "../lib/forest.js";
import { tour } from "../lib/tour.js";
import { howto, pick, finding } from "../lib/read.js";

export function ownersChart(host, app) {
  const D = app.owners;
  const months = D.months;
  const gl = Object.fromEntries(D.groups.map((g) => [g.key, g.label]));
  const gap = (who, k, v = "main") => D.gaps.find((x) => x.who === who && x.k === k && x.variant === v);
  const at = (series, k) => series.find((r) => r.k === k);

  const tourHost = el("div");
  const cards = el("div.cards");
  clear(host).append(tourHost, cards);

  /* ---- the owner cards */
  const cardNodes = {};
  for (const c of D.cards) {
    const body = el("div.card-body");
    const bars = (series, label, color) => {
      body.append(el("p.lab", { text: label }));
      const row = el("div.bars");
      for (const k of [2, 3, 4]) {
        const r = at(series, k);
        const b = el("div.bar", {}, [el("b", { text: fmt.pct(r.share) }),
          el("div.track", {}, [el("i.fill", { style: { width: `${r.share * 100}%`, background: color } })]),
          `${fmt.mo(months[k])} months`]);
        b.addEventListener("pointerenter", (ev) => tip.show(ev, { title: `${c.label}: ${label}, ${fmt.mo(months[k])} months`, rows: [["share", `${fmt.pct(r.share, 1)} ${fmt.ci(r.lo * 100, r.hi * 100, 1)}`], ["homes on the roll", fmt.count(r.n)]] }));
        b.addEventListener("pointermove", tip.move);
        b.addEventListener("pointerleave", tip.hide);
        row.append(b);
      }
      body.append(row);
    };
    bars(c.restored, "restored", GROUP[c.key]);
    bars(c.cleared, "cleared lot", "#9a9a9a");
    if (c.key === "resident") {
      body.append(el("div.gap", { html: "The reference group: the other owner types are compared with resident owner-occupants, relative to the same difference among unaffected homes (Eq. 3)." }));
    } else {
      const g2 = gap(c.key, 2);
      const g3 = gap(c.key, 3);
      body.append(el("div.gap", { html: `Restoration relative to resident owner-occupants, Eq. (3):<br><b>${fmt.num(g2.e, 1)} pp</b> ${fmt.ci(g2.lo, g2.hi)}${fmt.stars(g2.p)} at t + 2; <b>${fmt.num(g3.e, 1)} pp</b> ${fmt.ci(g3.lo, g3.hi)}${fmt.stars(g3.p)} at t + 3` }));
    }
    const card = el("div.card", {}, [el("div.card-head", { style: { background: GROUP[c.key] } }, [el("h4", { text: c.label }), el("p", { text: `${fmt.count(c.n)} L25 homes` })]), body]);
    card.title = c.def;
    cardNodes[c.key] = card;
    cards.append(card);
  }

  /* ---- the permit clock */
  host.append(el("h3.rule", { text: "Cape Coral after Ian: the first permit, day by day" }),
    el("p.sub", { text: "L25 homes in Cape Coral after Hurricane Ian (September 28, 2022): the share with a permit within months of landfall, by owner type on the pre-storm roll. An independent record of reconstruction timing." }));
  const eSeg = segmented(D.permits.map((p) => ({ key: p.key, label: p.label })), D.permits[0].key, (k) => { state.ev = k; drawPermits(); });
  host.append(el("div.controls", {}, [el("div.control", {}, [el("span.label", { text: "Permit" }), eSeg])]));
  const permitGrid = el("div.panelgrid");
  const permitFig = el("div.figure");
  const hrSide = el("aside.sidecard");
  permitGrid.append(permitFig, hrSide);
  host.append(permitGrid);
  const state = { ev: D.permits[0].key };

  function drawPermits() {
    eSeg.setValue(state.ev);
    const P = D.permits.find((p) => p.key === state.ev);
    const W = 600;
    const H = 320;
    const m = { top: 14, right: 150, bottom: 42, left: 46 };
    const x = linear([0, 36], [m.left, W - m.right]);
    const maxV = Math.max(0.1, ...Object.values(P.groups).flat().map((r) => r.hi));
    const y = linear([0, Math.ceil(maxV * 10) / 10], [H - m.bottom, m.top]);
    const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `${P.label} by owner` });
    for (const v of y.ticks(5)) {
      root.append(svg("line", { x1: m.left, x2: W - m.right, y1: y(v), y2: y(v), stroke: v === 0 ? RULE : GRID }),
        svg("text", { x: m.left - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11, fill: MUTED, text: v === 0 ? "0" : fmt.tickPct(v) }));
    }
    for (const mm of [3, 6, 12, 24, 36]) root.append(svg("text", { x: x(mm), y: H - m.bottom + 16, "text-anchor": "middle", "font-size": 11, fill: MUTED, text: mm }));
    root.append(svg("text", { x: (m.left + W - m.right) / 2, y: H - 6, "text-anchor": "middle", "font-size": 11, fill: MUTED, text: "months after landfall" }));
    const ends = [];
    for (const g of ["resident", "nonresident", "business"]) {
      const s = P.groups[g];
      const col = GROUP[g];
      root.append(svg("path", { class: `pl pl-${g}`, d: `M${x(0)},${y(0)}L${s.map((r) => `${x(r.m).toFixed(1)},${y(r.share).toFixed(1)}`).join("L")}`, fill: "none", stroke: col, "stroke-width": 2.4 }));
      for (const r of s) {
        root.append(svg("line", { x1: x(r.m), x2: x(r.m), y1: y(r.lo), y2: y(r.hi), stroke: col, "stroke-width": 1, opacity: 0.55 }));
        const dot = svg("circle", { cx: x(r.m), cy: y(r.share), r: 4.2, fill: col, stroke: "#fff", "stroke-width": 1 });
        dot.addEventListener("pointerenter", (ev) => tip.show(ev, { title: `${gl[g]}, within ${r.m} months`, rows: [[P.label.toLowerCase(), `${fmt.pct(r.share, 1)} ${fmt.ci(r.lo * 100, r.hi * 100, 1)}`], ["L25 homes", fmt.count(r.n)]] }));
        dot.addEventListener("pointermove", tip.move);
        dot.addEventListener("pointerleave", tip.hide);
        root.append(dot);
      }
      const last = s[s.length - 1];
      ends.push({ y: y(last.share), text: `${gl[g]} ${fmt.pct(last.share)}`, col });
    }
    ends.sort((a, b) => a.y - b.y);
    let py = -Infinity;
    for (const e of ends) {
      const yy = Math.max(e.y + 4, py + 15);
      py = yy;
      root.append(svg("text", { x: x(36) + 8, y: yy, "font-size": 11.5, "font-weight": 600, fill: e.col, text: e.text }));
    }
    clear(permitFig).append(root);
  }
  drawPermits();

  {
    hrSide.append(el("h4", { text: "Timing of the first structure permit" }),
      el("p.what", { text: "Cox proportional hazards model stratified by census tract, L25 homes, relative to resident owner-occupants; a hazard ratio below 1 indicates a later first permit." }));
    const rows = [["business", "Business entity"], ["nonresident", "Nonresident individual"], ["sfha", "Inside the SFHA"]].map(([k, label]) => {
      const h = D.hr[k];
      return { label, e: h.hr, lo: h.lo, hi: h.hi, p: h.p, n: h.n, main: true, color: GROUP[k] || INK };
    });
    forest(hrSide, rows, { ref: 1, d: 2, compact: true, unit: "", valueHead: "hazard ratio", value: (r) => `${fmt.num(r.e)} ${fmt.ci(r.lo, r.hi, 2)}${fmt.stars(r.p)}`, axis: "the line marks equal timing (1)" });
    const ch = D.charlotte.find((c) => c.key === "new-construction application");
    hrSide.append(el("p.what", { style: { marginTop: "1.1rem" }, text: "Charlotte County, L75 homes: a new-house application within 36 months" }));
    for (const g of ["resident", "nonresident", "business"]) {
      const s = ch.groups[g];
      const r = s.find((v) => v.m === 36);
      hrSide.append(el("div.minibar", {}, [el("span.k", { text: gl[g] }),
        el("span.t", {}, [el("i", { style: { width: `${(r.share / 0.25) * 100}%`, background: mix(GROUP[g], "#ffffff", 0.45) } })]),
        el("b", { text: fmt.pct(r.share) })]));
    }
    hrSide.append(el("p.what", { text: `L75 homes: ${["resident", "nonresident", "business"].map((g) => `${gl[g].toLowerCase()} ${fmt.count(ch.groups[g][0].n)}`).join(", ")}. Permit records and construction years on the 2025 roll agree with κ = ${fmt.num(D.charlotte_kappa)}.` }));
  }

  /* ---- H3b: neighborhood ownership composition */
  host.append(el("h3.rule", { text: "H3b: neighborhood ownership composition (exploratory)" }),
    el("p.sub", { text: "L25 homes restored by t + 2 (about 15 months) in the thirds of affected tracts ranked by three pre-storm shares. Within county and season, only the nonresident ownership share carries a significant association." }));
  const h4 = el("div.panelgrid");
  const h4fig = el("div.tercile-grid");
  for (const t of D.terciles) {
    const rows = ["low", "mid", "high"].map((q) => t.rows.find((r) => r.k === 2 && r.tercile === q));
    const box = el("div.tercile", {}, [el("b", { text: t.label })]);
    for (const r of rows) {
      const name = { low: "lowest third", mid: "middle third", high: "highest third" }[r.tercile];
      const bar = el("div.minibar", {}, [el("span.k", { text: name }),
        el("span.t", {}, [el("i", { style: { width: `${(r.restored / 0.5) * 100}%`, background: t.key === "nonresident_share" ? mix(GROUP.nonresident, "#ffffff", 0.45) : "#d6d6d6" } })]),
        el("b", { text: fmt.pct(r.restored) })]);
      bar.addEventListener("pointerenter", (ev) => tip.show(ev, { title: `${t.label}: ${name}`, rows: [["restored, about 15 months", fmt.pct(r.restored, 1)], ["tracts", fmt.count(r.tracts)], ["L25 homes", fmt.count(r.houses)], ["mean of the share", fmt.num(r.mean)]] }));
      bar.addEventListener("pointermove", tip.move);
      bar.addEventListener("pointerleave", tip.hide);
      box.append(bar);
    }
    h4fig.append(box);
  }
  const h4side = el("aside.sidecard");
  h4side.append(el("h4", { text: "Within county and season" }), el("p.what", { text: "The restored share of L25 homes at t + 2 on the three shares together, mean structural loss and tract exposure, with county-by-season fixed effects and weights; pp per 10 percentage points of a share (D per unit of its log)." }));
  const termName = { nonresident_share: "nonresident ownership share", business_share: "business ownership share", turnover_pre: "pre-storm ownership turnover", mean_loss: "mean structural loss", log_D: "tract exposure D (log)" };
  forest(h4side, D.tract_model.filter((r) => r.k === 2).map((r) => ({ ...r, label: termName[r.term] || r.term, main: true })),
    { d: 1, compact: true, unit: "", valueHead: "pp", value: (r) => `${fmt.num(r.e, 1)} ${fmt.ci(r.lo, r.hi, 1)}${fmt.stars(r.p)}` });
  h4.append(h4fig, h4side);
  host.append(h4);

  /* ---- H3a across specifications */
  host.append(el("h3.rule", { text: "H3a across specifications (Table 6)" }),
    el("p.sub", { text: "Restoration of L25 homes relative to resident owner-occupants and to the same difference among unaffected homes (Eq. 3), in percentage points: the main specification and the alternative specifications of Section 4.5." }));
  const fh = el("div");
  host.append(fh);
  const rows = [];
  for (const [who, title] of [["nonresident", "Nonresident individual"], ["business", "Business entity"]]) {
    for (const k of [2, 3]) {
      rows.push({ head: `${title}, t + ${k} (about ${fmt.mo(months[k])} months)` });
      for (const g of D.gaps.filter((x) => x.who === who && x.k === k)) rows.push(g);
    }
  }
  forest(fh, rows, { unit: "pp", d: 1, axis: "percentage points; below zero, less restoration than resident owner-occupants" });
  host.append(forestKey());

  howto(host, {
    lines: [
      "Owner type is read on the pre-storm roll: a resident owner-occupant is an individual or trust with a homestead exemption; a nonresident individual has none; a business entity is a corporate or other business owner.",
      "The cards cover the L25 homes of affected tracts in the seasons 2016 to 2022, as in Figure 7. The Eq. (3) estimates compare L25 with unaffected homes of each owner type, so an owner type's own assessment patterns cancel out.",
      "The permit clock is the City of Cape Coral's permit file after Ian, every permit with its issue and final date; Charlotte County's file holds new residential construction only.",
    ],
    terms: pick("resident", "restored", "cleared", "pp", "ci", "spec"),
  });

  const res = D.cards.find((c) => c.key === "resident");
  const non = D.cards.find((c) => c.key === "nonresident");
  const bus = D.cards.find((c) => c.key === "business");
  const cl = (c) => c.cleared.filter((r) => r.k >= 2).map((r) => r.share);
  const rng = (a) => `${Math.round(Math.min(...a) * 100)} to ${Math.round(Math.max(...a) * 100)}%`;
  finding(`Resident owner-occupants restore most and clear least: <b>${fmt.pct(at(res.restored, 4).share)}</b> of their L25 homes were restored within ${fmt.mo(months[4])} months, against ${fmt.pct(at(non.restored, 4).share)} of homes owned by nonresident individuals and ${fmt.pct(at(bus.restored, 4).share)} owned by business entities; cleared lots are ${rng(cl(res))} of resident-owned homes and ${rng([...cl(non), ...cl(bus)])} of nonresident-owned ones.`);

  const lit = (k) => { for (const [g, n] of Object.entries(cardNodes)) n.classList.toggle("dim", !!k && g !== k); };
  const b3 = gap("business", 3);
  const n3 = gap("nonresident", 3);
  const t2 = D.terciles.find((t) => t.key === "nonresident_share").rows.filter((r) => r.k === 2);
  const hi = t2.find((r) => r.tercile === "high");
  const lo = t2.find((r) => r.tercile === "low");
  tour({
    name: "owner occupancy",
    steps: [
      { cap: "Three owner types: the resident owner-occupant, the nonresident individual, the business entity.", ms: 3200, run: () => lit(null) },
      { cap: `Resident owner-occupants restore most: ${fmt.pct(at(res.restored, 4).share)} within ${fmt.mo(months[4])} months, against ${fmt.pct(at(non.restored, 4).share)} and ${fmt.pct(at(bus.restored, 4).share)}.`, ms: 3800, run: () => lit("resident") },
      { cap: `Nonresident owners clear more lots: ${rng([...cl(non), ...cl(bus)])}, against ${rng(cl(res))} of resident owner-occupants.`, ms: 3800, run: () => lit("nonresident") },
      { cap: `Relative to unaffected homes, business entities are ${fmt.num(-b3.e, 1)} pp less likely to have restored at 27 months, nonresident individuals ${fmt.num(-n3.e, 1)} pp.`, ms: 4200, run: () => lit("business") },
      { cap: `In Cape Coral, business entities obtain their first structure permit at a hazard ratio of ${fmt.num(D.hr.business.hr)} relative to resident owner-occupants: they do not restore faster.`, ms: 4200, run: () => { lit(null); permitFig.scrollIntoView({ behavior: "smooth", block: "center" }); } },
      { cap: `Tracts with the most nonresident ownership restore least: ${fmt.pct(hi.restored)} at 15 months in the highest third, ${fmt.pct(lo.restored)} in the lowest.`, ms: 4400, run: () => h4fig.scrollIntoView({ behavior: "smooth", block: "center" }) },
    ],
    after: () => {},
    rest: () => lit(null),
  }).attach(tourHost, { figure: [cards, permitFig] });
}
