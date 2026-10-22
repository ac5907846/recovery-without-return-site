/* The Owner occupancy page (H3 and the extension H4). Figure 7's owner
   cards (restored and cleared shares on the rolls by the owner on the
   storm year's roll, seasons 2016 to 2022, with the H3 gap against
   residents net of the same gap among undamaged houses), the Cape Coral
   permit clock after Ian with the hazard ratios of the Cox model, the
   Charlotte County new-house applications, the absentee neighborhoods
   (H4) and every H3 check.

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
        b.addEventListener("pointerenter", (ev) => tip.show(ev, { title: `${c.label}: ${label}, ${fmt.mo(months[k])} months`, rows: [["share", `${fmt.pct(r.share, 1)} ${fmt.ci(r.lo * 100, r.hi * 100, 1)}`], ["houses on the roll", fmt.count(r.n)]] }));
        b.addEventListener("pointermove", tip.move);
        b.addEventListener("pointerleave", tip.hide);
        row.append(b);
      }
      body.append(row);
    };
    bars(c.restored, "restored", GROUP[c.key]);
    bars(c.cleared, "cleared lot", "#9a9a9a");
    if (c.key === "resident") {
      body.append(el("div.gap", { html: "The reference group: the gaps of the other owners are read against residents, net of the same gap among undamaged houses." }));
    } else {
      const g2 = gap(c.key, 2);
      const g3 = gap(c.key, 3);
      body.append(el("div.gap", { html: `Gap against residents, damaged net of undamaged:<br><b>${fmt.num(g2.e, 1)} pp</b> ${fmt.ci(g2.lo, g2.hi)}${fmt.stars(g2.p)} at s+2; <b>${fmt.num(g3.e, 1)} pp</b> ${fmt.ci(g3.lo, g3.hi)}${fmt.stars(g3.p)} at s+3` }));
    }
    const card = el("div.card", {}, [el("div.card-head", { style: { background: GROUP[c.key] } }, [el("h4", { text: c.label }), el("p", { text: `${fmt.count(c.n)} damaged houses` })]), body]);
    card.title = c.def;
    cardNodes[c.key] = card;
    cards.append(card);
  }

  /* ---- the permit clock */
  host.append(el("h3.rule", { text: "Cape Coral after Ian: the permit clock, day by day" }),
    el("p.sub", { text: "Damaged houses in the City of Cape Coral, struck by Ian on 28 September 2022: the share with a permit within months of landfall, by the owner on the storm year's roll. An independent record of the same clock the rolls read once a year." }));
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
        dot.addEventListener("pointerenter", (ev) => tip.show(ev, { title: `${gl[g]}, within ${r.m} months`, rows: [[P.label.toLowerCase(), `${fmt.pct(r.share, 1)} ${fmt.ci(r.lo * 100, r.hi * 100, 1)}`], ["damaged houses", fmt.count(r.n)]] }));
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
    hrSide.append(el("h4", { text: "Who pulls the first permit sooner" }),
      el("p.what", { text: "Hazard ratio of the first structure permit against resident owner-occupants, Cox model with tract strata and the house controls; below 1 means later." }));
    const rows = [["business", "Business entity"], ["nonresident", "Non-resident individual"], ["sfha", "Inside the flood zone (SFHA)"]].map(([k, label]) => {
      const h = D.hr[k];
      return { label, e: h.hr, lo: h.lo, hi: h.hi, p: h.p, n: h.n, status: "description", color: GROUP[k] || INK };
    });
    forest(hrSide, rows, { ref: 1, d: 2, compact: true, unit: "", valueHead: "hazard ratio", value: (r) => `${fmt.num(r.e)} ${fmt.ci(r.lo, r.hi, 2)}${fmt.stars(r.p)}`, axis: "the line marks equal timing (1)" });
    const ch = D.charlotte.find((c) => c.key === "new-construction application");
    hrSide.append(el("p.what", { style: { marginTop: "1.1rem" }, text: "Charlotte County, houses that lost three quarters or more: a new-house application within 36 months" }));
    for (const g of ["resident", "nonresident", "business"]) {
      const s = ch.groups[g];
      const r = s.find((v) => v.m === 36);
      hrSide.append(el("div.minibar", {}, [el("span.k", { text: gl[g] }),
        el("span.t", {}, [el("i", { style: { width: `${(r.share / 0.25) * 100}%`, background: mix(GROUP[g], "#ffffff", 0.45) } })]),
        el("b", { text: fmt.pct(r.share) })]));
    }
    hrSide.append(el("p.what", { text: `Damaged houses: ${["resident", "nonresident", "business"].map((g) => `${gl[g].toLowerCase()} ${fmt.count(ch.groups[g][0].n)}`).join(", ")}. A new-construction permit and a new year built on the 2025 roll agree with a kappa of ${fmt.num(D.charlotte_kappa)}.` }));
  }

  /* ---- H4: absentee neighborhoods */
  host.append(el("h3.rule", { text: "H4: neighborhoods owned from afar" }),
    el("p.sub", { text: "Damaged houses restored by s+2 (about 15 months) in the thirds of storm-struck tracts ranked by three shares measured before the storm. Only the non-resident share carries a gradient once the tracts are compared within county and season." }));
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
      bar.addEventListener("pointerenter", (ev) => tip.show(ev, { title: `${t.label}: ${name}`, rows: [["restored, about 15 months", fmt.pct(r.restored, 1)], ["tracts", fmt.count(r.tracts)], ["damaged houses", fmt.count(r.houses)], ["mean of the share", fmt.num(r.mean)]] }));
      bar.addEventListener("pointermove", tip.move);
      bar.addEventListener("pointerleave", tip.hide);
      box.append(bar);
    }
    h4fig.append(box);
  }
  const h4side = el("aside.sidecard");
  h4side.append(el("h4", { text: "Within county and season" }), el("p.what", { text: "Tract restoration at s+2 on the three shares together, with the mean loss and the damage rate; points per unit share." }));
  const termName = { nonresident_share: "non-resident owners' share", business_share: "business owners' share", turnover_pre: "turnover before the storm", mean_loss: "mean structural loss", log_D: "log damage rate D" };
  forest(h4side, D.tract_model.filter((r) => r.k === 2).map((r) => ({ ...r, label: termName[r.term] || r.term, status: r.term === "nonresident_share" ? "description" : "reported" })),
    { d: 1, compact: true, unit: "", valueHead: "points", value: (r) => `${fmt.num(r.e, 1)} ${fmt.ci(r.lo, r.hi, 1)}${fmt.stars(r.p)}` });
  h4.append(h4fig, h4side);
  host.append(h4);

  /* ---- the H3 checks */
  host.append(el("h3.rule", { text: "H3 and its checks" }),
    el("p.sub", { text: "Restoration of damaged houses against resident owner-occupants, net of the same gap among undamaged houses, in percentage points. The pre-specified rule, a business gap significant at both horizons, was missed at s+2, so H3 is reported as a description." }));
  const fh = el("div");
  host.append(fh);
  const rows = [];
  for (const [who, title] of [["business", "Business entity"], ["nonresident", "Non-resident individual"]]) {
    for (const k of [2, 3]) {
      rows.push({ head: `${title}, s+${k} (about ${fmt.mo(months[k])} months)` });
      for (const g of D.gaps.filter((x) => x.who === who && x.k === k)) rows.push({ ...g, key: g.variant === "main" });
    }
  }
  forest(fh, rows, { unit: "pp", d: 1, axis: "percentage points; below zero, slower than residents" });
  host.append(forestKey());

  howto(host, {
    lines: [
      "Owner groups are read on the storm year's roll: a resident owner-occupant has a homestead exemption; a non-resident individual (a second home or a small landlord) has none; a business entity is a corporation, company, partnership or trust company.",
      "The cards cover the damaged houses of the storm-struck tracts in seasons 2016 to 2022, as in the paper's Figure 7. The gaps compare damaged with undamaged houses of each owner group, so a group's own reassessment habits cancel out.",
      "The permit clock is the City of Cape Coral's permit file after Ian, every permit with its issue and final date; Charlotte County's file holds new residential construction only.",
    ],
    terms: pick("resident", "restored", "cleared", "pp", "ci", "prespec"),
  });

  const res = D.cards.find((c) => c.key === "resident");
  const non = D.cards.find((c) => c.key === "nonresident");
  const bus = D.cards.find((c) => c.key === "business");
  const cl = (c) => c.cleared.filter((r) => r.k >= 2).map((r) => r.share);
  const rng = (a) => `${Math.round(Math.min(...a) * 100)} to ${Math.round(Math.max(...a) * 100)}%`;
  finding(`Residents restore most and clear least: <b>${fmt.pct(at(res.restored, 4).share)}</b> of their damaged homes stand restored ${fmt.mo(months[4])} months after landfall, against ${fmt.pct(at(non.restored, 4).share)} of non-resident individuals' and ${fmt.pct(at(bus.restored, 4).share)} of business-owned homes; cleared lots are ${rng(cl(res))} of resident homes and ${rng([...cl(non), ...cl(bus)])} of absentee-owned ones.`);

  const lit = (k) => { for (const [g, n] of Object.entries(cardNodes)) n.classList.toggle("dim", !!k && g !== k); };
  const b3 = gap("business", 3);
  const n3 = gap("nonresident", 3);
  const t2 = D.terciles.find((t) => t.key === "nonresident_share").rows.filter((r) => r.k === 2);
  const hi = t2.find((r) => r.tercile === "high");
  const lo = t2.find((r) => r.tercile === "low");
  tour({
    name: "owner occupancy",
    steps: [
      { cap: "Three owners of a damaged house: the resident, the absentee individual, the business entity.", ms: 3200, run: () => lit(null) },
      { cap: `Residents restore most: ${fmt.pct(at(res.restored, 4).share)} by ${fmt.mo(months[4])} months, against ${fmt.pct(at(non.restored, 4).share)} and ${fmt.pct(at(bus.restored, 4).share)}.`, ms: 3800, run: () => lit("resident") },
      { cap: `Absentee owners leave lots empty: ${rng([...cl(non), ...cl(bus)])} cleared, against ${rng(cl(res))} of residents.`, ms: 3800, run: () => lit("nonresident") },
      { cap: `Net of undamaged houses, business entities restore ${fmt.num(-b3.e, 1)} pp less by s+3, non-resident individuals ${fmt.num(-n3.e, 1)} pp less.`, ms: 4200, run: () => lit("business") },
      { cap: `In Cape Coral a business pulls its first structure permit at ${fmt.num(D.hr.business.hr)} times a resident's rate: companies do not restore faster.`, ms: 4200, run: () => { lit(null); permitFig.scrollIntoView({ behavior: "smooth", block: "center" }); } },
      { cap: `Neighborhoods owned from afar recover more slowly: ${fmt.pct(hi.restored)} restored at 15 months in the most absentee third of tracts, ${fmt.pct(lo.restored)} in the least.`, ms: 4400, run: () => h4fig.scrollIntoView({ behavior: "smooth", block: "center" }) },
    ],
    after: () => {},
    rest: () => lit(null),
  }).attach(tourHost);
}
