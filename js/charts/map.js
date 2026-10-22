/* The map page, Seven seasons (Figures 2 and 5). Florida in the paper's
   map projection; the storm-struck tracts of one season or of all, filled
   by a quantity of Figure 5 (share of damaged homes that lost half or
   more; share of restored homes under a new owner at about 27 months;
   share cleared at 27 months) or simply marked; the HURDAT2 best track of
   the season's storms, every 6-hourly fix, and a ring at each landfall
   record on Florida's own coast (Figure 2's rule). Choosing a season
   zooms to its tracts; the wheel, a drag or the buttons move the map.

   Data: data/map.json and data/geo/*.json (tools/builders/map.py). */

import { el, svg, clear, segmented } from "../lib/dom.js";
import * as fmt from "../lib/format.js";
import * as tip from "../lib/tooltip.js";
import { pathOf, bboxOf, centroid, trackPath } from "../lib/geo.js";
import { NAVY, INK, GRAY_DARK, LAND, LAND_CONTEXT, ramp } from "../lib/palette.js";
import { tour, reduced } from "../lib/tour.js";
import { howto, pick, finding } from "../lib/read.js";

const QUANT = [
  { key: "struck", label: "Struck tracts", col: null, title: "Storm-struck tracts" },
  { key: "destroyed", label: "Lost half or more", col: "destroyed_share", ramp: "navy", title: "Damaged homes that lost half or more of the structure" },
  { key: "rwr", label: "New owner among restored", col: "rwr_share_3", ramp: "wine", title: "Restored homes under a new owner, about 27 months after landfall", at27: true },
  { key: "cleared", label: "Cleared lot", col: "cleared_share_3", ramp: "green", title: "Damaged homes on a cleared lot, about 27 months after landfall", at27: true },
];
const DASH = ["", "9 5", "2 4"];

export function mapChart(host, app) {
  const M = app.map;
  const G = app.geo;
  const F = M.frame;
  const T = M.tracts;
  const seasons = M.seasons;
  const bySeason = new Map(seasons.map((s) => [s.season, s]));
  const countyName = M.counties;
  const state = { season: 2022, q: "rwr" };
  const linked = location.hash.length > 1;      /* a shared view in the address holds still */
  readHash();

  /* ---- controls */
  const seasonSeg = segmented([{ key: "all", label: "All seasons" }, ...seasons.map((s) => ({ key: String(s.season), label: s.label }))],
    String(state.season), (k) => { state.season = k === "all" ? "all" : Number(k); if (state.season === "all") state.q = "struck"; render(true); writeHash(); });
  const qSeg = segmented(QUANT.map((q) => ({ key: q.key, label: q.label })), state.q, (k) => { state.q = k; render(false); writeHash(); });
  const controls = el("div.controls", {}, [
    el("div.control", {}, [el("span.label", { text: "Hurricane season" }), seasonSeg]),
    el("div.control", {}, [el("span.label", { text: "Fill the tracts by" }), qSeg]),
  ]);

  /* ---- the map */
  const root = svg("svg", { viewBox: `0 0 ${F.w} ${F.h}`, role: "img", "aria-label": "Map of Florida with the storm-struck tracts" });
  const defs = svg("defs");
  const hatch = svg("pattern", { id: "hatch", patternUnits: "userSpaceOnUse", width: 400, height: 400, patternTransform: "rotate(45)" }, [
    svg("rect", { width: 400, height: 400, fill: "#fafafa" }),
    svg("line", { x1: 0, y1: 0, x2: 0, y2: 400, stroke: "#b3b3b3", "stroke-width": 120 }),
  ]);
  defs.append(hatch);
  root.append(defs);
  const gContext = svg("g");
  const gCounties = svg("g");
  const gTracts = svg("g");
  const gLines = svg("g", { "pointer-events": "none" });
  const gTracks = svg("g");
  const gLabels = svg("g", { "pointer-events": "none" });
  root.append(svg("rect", { x: -F.w, y: -F.h, width: 3 * F.w, height: 3 * F.h, fill: "#fbfbfb" }), gContext, gCounties, gTracts, gLines, gTracks, gLabels);

  for (const c of G.context) gContext.append(svg("path", { d: pathOf(c.rings), fill: LAND_CONTEXT, stroke: "#ffffff", "stroke-width": 1, "vector-effect": "non-scaling-stroke" }));
  const countyBoxes = [];
  for (const c of G.counties) {
    gCounties.append(svg("path", { d: pathOf(c.rings), fill: LAND, stroke: "#ffffff", "stroke-width": 0.8, "vector-effect": "non-scaling-stroke" }));
    gLines.append(svg("path", { d: pathOf(c.rings), fill: "none", stroke: "#a3a3a3", "stroke-width": 0.5, "vector-effect": "non-scaling-stroke" }));
    countyBoxes.push({ name: c.name, at: centroid(c.rings) });
  }

  /* one path per tract-season row */
  const rows = T.key.map((key, i) => ({
    i, key, fips: T.fips[i], county: T.county[i], season: T.season[i],
    n: T.n_damaged[i], nd: T.n_destroyed[i], destroyed_share: T.destroyed_share[i], n3: T.n_present_3[i], restored_3: T.restored_3[i],
    restored_share_3: T.restored_share_3[i], ret_share_3: T.ret_share_3[i], rwr_share_3: T.rwr_share_3[i],
    stranded_share_3: T.stranded_share_3[i], unresolved_share_3: T.unresolved_share_3[i], cleared_share_3: T.cleared_share_3[i],
  }));
  for (const r of rows) {
    const rings = G.tracts[r.key];
    r.box = bboxOf(rings);
    r.node = svg("path", { class: "tract", d: pathOf(rings), stroke: "#ffffff", "stroke-width": 0.35, "vector-effect": "non-scaling-stroke", display: "none" });
    r.node.addEventListener("pointerenter", (ev) => hoverTract(ev, r));
    r.node.addEventListener("pointermove", tip.move);
    r.node.addEventListener("pointerleave", () => { tip.hide(); r.node.setAttribute("stroke", "#ffffff"); r.node.setAttribute("stroke-width", 0.35); });
    gTracts.append(r.node);
  }
  /* each season's view: the counties that hold 95% of its destroyed homes,
     framed on their tracts with at least 20 damaged homes, so outlying tracts
     (Nicole's east coast in 2022, a large rural tract) do not set the frame
     and Ian opens on the Southwest coast, as in Figure 5 */
  const bbox = new Map();
  for (const s of seasons) {
    const list = rows.filter((r) => r.season === s.season);
    const byCounty = new Map();
    for (const r of list) byCounty.set(r.county, (byCounty.get(r.county) || 0) + r.nd);
    const total = list.reduce((a, r) => a + r.nd, 0);
    const keep = new Set();
    let acc = 0;
    for (const [c, nd] of [...byCounty].sort((a, b) => b[1] - a[1])) {
      if (acc >= 0.95 * total) break;
      acc += nd;
      keep.add(c);
    }
    let pick = list.filter((r) => keep.has(r.county) && r.n >= M.min_homes);
    if (!pick.length) pick = list;
    const box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const r of pick) {
      box[0] = Math.min(box[0], r.box[0]); box[1] = Math.min(box[1], r.box[1]);
      box[2] = Math.max(box[2], r.box[2]); box[3] = Math.max(box[3], r.box[3]);
    }
    bbox.set(s.season, box);
  }

  /* tracks: one group per storm */
  const trackNodes = G.tracks.map((t) => {
    const g = svg("g", { class: "track" });
    for (const run of t.runs) {
      const d = trackPath(run);
      g.append(svg("path", { d, fill: "none", stroke: "transparent", "stroke-width": 12, "vector-effect": "non-scaling-stroke", "pointer-events": "stroke" }),
        svg("path", { class: "track-line", d, fill: "none", stroke: INK, "stroke-width": 1.4, "vector-effect": "non-scaling-stroke", "stroke-linejoin": "round", "pointer-events": "none" }));
      for (const f of run) {
        g.append(svg("path", { d: `M${f[0]},${f[1]}h0`, stroke: INK, "stroke-width": 3.2, "stroke-linecap": "round", "vector-effect": "non-scaling-stroke", "pointer-events": "none" }));
      }
      for (const f of run.filter((v) => v[6])) {
        g.append(svg("path", { d: `M${f[0]},${f[1]}h0`, stroke: INK, "stroke-width": 9, "stroke-linecap": "round", "vector-effect": "non-scaling-stroke", "pointer-events": "none" }),
          svg("path", { d: `M${f[0]},${f[1]}h0`, stroke: "#ffffff", "stroke-width": 5.6, "stroke-linecap": "round", "vector-effect": "non-scaling-stroke", "pointer-events": "none" }));
      }
    }
    const fixes = t.runs.flat();
    const lfs = fixes.filter((f) => f[6]);
    g.addEventListener("pointerenter", (ev) => tip.show(ev, {
      title: t.label,
      rows: [["maximum wind", `${t.max_wind} kt`], ["Florida landfall records", String(lfs.length)], ...lfs.map((f, i) => [`landfall ${i + 1}`, fmt.fixTime(f[2])])],
      note: t.landfall_fl ? "Rings: landfall records on Florida's coast (HURDAT2 identifier L)." : "No landfall on Florida's coast in HURDAT2.",
    }));
    g.addEventListener("pointermove", tip.move);
    g.addEventListener("pointerleave", tip.hide);
    gTracks.append(g);
    const anchor = lfs[0] || fixes.reduce((best, f) => {
      const dx = f[0] - F.w / 2;
      const dy = f[1] - F.h / 2;
      const d = dx * dx + dy * dy;
      return !best || d < best.d ? { f, d } : best;
    }, null).f;
    return { t, g, anchor };
  });

  const btns = el("div.mapbtns", {}, [
    el("button", { type: "button", text: "+", "aria-label": "Zoom in", onclick: () => zoomBy(0.6) }),
    el("button", { type: "button", text: "−", "aria-label": "Zoom out", onclick: () => zoomBy(1 / 0.6) }),
    el("button.wide", { type: "button", text: "Florida", "aria-label": "Show all of Florida", onclick: () => animateTo(full()) }),
  ]);
  const mapwrap = el("div.mapwrap", {}, [root, btns]);
  const legend = el("div.legend");
  const figure = el("div.figure", {}, [mapwrap, legend]);

  /* ---- the side card */
  const sHead = el("h4");
  const sList = el("dl");
  const sKey = el("div.mapkey");
  const side = el("aside.sidecard", {}, [sHead, sList, sKey]);

  const tourHost = el("div");
  clear(host).append(tourHost, controls, el("div.panelgrid", {}, [figure, side]));
  howto(host, {
    lines: [
      "A storm-struck tract has FEMA-verified real-property losses of at least 5 per 100 owner-occupied homes. Tracts of the 2010 and 2020 censuses are drawn as they were for each season.",
      "Shares are of the damaged resident owner-occupied homes of the tract (structure value lost a quarter or more on the first roll), held since two rolls before the storm. Tracts with fewer than 20 damaged homes are hatched, as in the paper's Figure 5.",
      "The 27-month quantities are read on the third roll after the storm, which the 2023 and 2024 seasons have not reached.",
      "Tracks are the National Hurricane Center's HURDAT2 best tracks with every 6-hourly fix; a ring marks a landfall record within 3 km of Florida's coast. Hover a tract or a track for its numbers; scroll or drag to move the map.",
    ],
    terms: pick("struck", "loss", "rwr", "cleared", "rolls"),
  });

  /* ---- view box and zoom */
  let vb = [0, 0, F.w, F.h];
  const full = () => [0, 0, F.w, F.h];
  function setVB(b) {
    vb = b;
    root.setAttribute("viewBox", b.map((v) => v.toFixed(0)).join(" "));
    const px = b[2] / Math.max(1, root.getBoundingClientRect().width || 900);
    hatch.setAttribute("width", (7 * px).toFixed(0));
    hatch.setAttribute("height", (7 * px).toFixed(0));
    hatch.firstChild.setAttribute("width", (7 * px).toFixed(0));
    hatch.firstChild.setAttribute("height", (7 * px).toFixed(0));
    hatch.lastChild.setAttribute("y2", (7 * px).toFixed(0));
    hatch.lastChild.setAttribute("stroke-width", (2 * px).toFixed(0));
    paintLabels(px);
  }
  function fit(box, pad = 0.1) {
    const aspect = F.w / F.h;
    let [x0, y0, x1, y1] = box;
    let w = x1 - x0;
    let h = y1 - y0;
    const minW = F.w * 0.16;
    if (w < minW) { x0 -= (minW - w) / 2; w = minW; }
    x0 -= w * pad; y0 -= h * pad; w *= 1 + 2 * pad; h *= 1 + 2 * pad;
    if (w / h > aspect) { const nh = w / aspect; y0 -= (nh - h) / 2; h = nh; } else { const nw = h * aspect; x0 -= (nw - w) / 2; w = nw; }
    return [x0, y0, w, h];
  }
  let anim = 0;
  function animateTo(target, ms = 950) {
    cancelAnimationFrame(anim);
    if (reduced || !ms) { setVB(target); return Promise.resolve(); }
    const from = vb.slice();
    const t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    return new Promise((res) => {
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        const k = ease(t);
        setVB(from.map((v, i) => v + (target[i] - v) * k));
        if (t < 1) anim = requestAnimationFrame(step); else res();
      };
      anim = requestAnimationFrame(step);
      setTimeout(() => { if (vb[2] !== target[2]) setVB(target); res(); }, ms + 150);
    });
  }
  function zoomBy(f, cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2) {
    const w = Math.min(F.w * 1.2, Math.max(F.w * 0.02, vb[2] * f));
    const h = w * (F.h / F.w);
    animateTo([cx - (cx - vb[0]) * (w / vb[2]), cy - (cy - vb[1]) * (h / vb[3]), w, h], 300);
  }
  function toUnits(ev) {
    const r = root.getBoundingClientRect();
    return [vb[0] + ((ev.clientX - r.left) / r.width) * vb[2], vb[1] + ((ev.clientY - r.top) / r.height) * vb[3]];
  }
  root.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const [ux, uy] = toUnits(ev);
    const f = ev.deltaY > 0 ? 1.18 : 1 / 1.18;
    const w = Math.min(F.w * 1.2, Math.max(F.w * 0.02, vb[2] * f));
    const h = w * (F.h / F.w);
    cancelAnimationFrame(anim);
    setVB([ux - (ux - vb[0]) * (w / vb[2]), uy - (uy - vb[1]) * (h / vb[3]), w, h]);
  }, { passive: false });
  let drag = null;
  root.addEventListener("pointerdown", (ev) => { drag = { x: ev.clientX, y: ev.clientY, vb: vb.slice() }; root.classList.add("drag"); });
  window.addEventListener("pointermove", (ev) => {
    if (!drag) return;
    const r = root.getBoundingClientRect();
    const dx = ((ev.clientX - drag.x) / r.width) * drag.vb[2];
    const dy = ((ev.clientY - drag.y) / r.height) * drag.vb[3];
    if (Math.abs(ev.clientX - drag.x) + Math.abs(ev.clientY - drag.y) > 3) tip.hide();
    setVB([drag.vb[0] - dx, drag.vb[1] - dy, drag.vb[2], drag.vb[3]]);
  });
  window.addEventListener("pointerup", () => { drag = null; root.classList.remove("drag"); });

  /* labels keep a constant size on screen: rebuilt on every zoom step */
  function paintLabels(px) {
    clear(gLabels);
    const fs = 11 * px;
    const halo = { stroke: "#ffffff", "stroke-width": 3 * px, "stroke-linejoin": "round", "paint-order": "stroke" };
    if (vb[2] < F.w * 0.42) {
      for (const c of countyBoxes) {
        if (!c.at) continue;
        const [x, y] = c.at;
        if (x < vb[0] || x > vb[0] + vb[2] || y < vb[1] || y > vb[1] + vb[3]) continue;
        gLabels.append(svg("text", { x, y, "text-anchor": "middle", "font-size": fs, fill: GRAY_DARK, ...halo, text: c.name }));
      }
    }
    for (const tn of trackNodes) {
      if (tn.g.getAttribute("display") === "none") continue;
      const [x, y] = tn.anchor;
      gLabels.append(svg("text", { x: x + 9 * px, y: y - 8 * px, "font-size": 12 * px, "font-weight": 700, fill: INK, ...halo, text: tn.t.label.split(" ")[0] }));
    }
  }

  /* ---- fills */
  function quant() { return QUANT.find((q) => q.key === state.q); }
  function visible(r) { return state.season === "all" || r.season === state.season; }
  function vmaxOf(q, list) {
    if (!q.col) return 1;
    const vals = list.filter((r) => r.n >= M.min_homes && r[q.col] !== null).map((r) => r[q.col]);
    if (!vals.length) return 1;
    return Math.min(1, Math.ceil(Math.max(...vals) * 10) / 10) || 1;
  }
  function fillOf(r, q, vmax) {
    if (state.season === "all") return bySeason.get(r.season).color;
    if (!q.col) return NAVY;
    if (r.n < M.min_homes) return "url(#hatch)";
    const v = r[q.col];
    if (v === null || v === undefined) return "#e3e3e0";
    return ramp(q.ramp, v / vmax);
  }

  function render(zoom) {
    seasonSeg.setValue(String(state.season));
    qSeg.setValue(state.q);
    for (const b of qSeg.querySelectorAll("button")) b.disabled = state.season === "all" && b.textContent !== QUANT[0].label;
    const q = quant();
    const list = rows.filter(visible);
    const vmax = vmaxOf(q, list);
    const order = state.season === "all" ? [...rows].sort((a, b) => a.season - b.season) : rows;
    for (const r of order) {
      const on = visible(r);
      r.node.setAttribute("display", on ? "inline" : "none");
      if (on) {
        r.node.style.fill = fillOf(r, q, vmax);
        if (state.season === "all") gTracts.append(r.node);
      }
    }
    const shown = state.season === "all" ? null : bySeason.get(state.season).storms;
    trackNodes.forEach((tn) => {
      const on = !shown || shown.includes(tn.t.key);
      tn.g.setAttribute("display", on ? "inline" : "none");
      const idx = shown ? shown.indexOf(tn.t.key) : 0;
      for (const p of tn.g.querySelectorAll(".track-line")) {
        p.setAttribute("stroke-dasharray", shown && shown.length > 1 ? DASH[idx] : "");
        p.setAttribute("stroke-width", state.season === "all" ? 1 : 1.5);
      }
    });
    paintSide(q, vmax);
    if (zoom) animateTo(state.season === "all" ? full() : fit(bbox.get(state.season)));
    else setVB(vb);
  }

  function paintSide(q, vmax) {
    clear(sList);
    clear(sKey);
    clear(legend);
    if (state.season === "all") {
      sHead.textContent = "Seven seasons, 2016 to 2024";
      const tot = seasons.reduce((a, s) => a + s.n_damaged, 0);
      sList.append(el("dt", { text: "storm-struck tract-seasons" }), el("dd", { text: fmt.count(seasons.reduce((a, s) => a + s.tracts, 0)) }),
        el("dt", { text: "damaged resident-owned homes" }), el("dd", { text: fmt.count(tot) }));
      for (const s of seasons) {
        sKey.append(el("div.keyrow", {}, [el("i.sq", { style: { background: s.color } }), el("span", { text: s.label }), el("b", { text: fmt.count(s.n_damaged) })]));
      }
      legend.append(el("span.item", {}, [el("i.swatch", { style: { background: INK } }), "HURDAT2 best tracks of the nine storms"]),
        el("span.item.note", {}, ["later seasons drawn over earlier ones where tracts repeat"]));
      return;
    }
    const s = bySeason.get(state.season);
    sHead.textContent = s.label;
    const sto = G.tracks.filter((t) => s.storms.includes(t.key));
    const add = (k, v) => sList.append(el("dt", { text: k }), el("dd", { text: v }));
    for (const t of sto) add(t.label.split(" ")[0], `${fmt.dateLong(t.date)}, ${t.dr}`);
    add("storm-struck tracts", fmt.count(s.tracts));
    add("damaged resident-owned homes", fmt.count(s.n_damaged));
    add("lost half or more", fmt.pct(s.destroyed));
    if (s.restored_3 !== null) {
      add(`restored at ${fmt.mo(s.months_3)} months`, fmt.pct(s.restored_3));
      add("under a new owner, among restored", fmt.num(s.rwr_3));
    } else {
      add("at 27 months", "not yet on the third roll");
    }
    sKey.append(el("p.lab", { text: q.title }));
    if (q.col) {
      const scale = el("div.scale-bar", {}, [el("span", { text: "0" }), el("i", { style: { background: `linear-gradient(90deg, ${ramp(q.ramp, 0)}, ${ramp(q.ramp, 1)})` } }), el("span", { text: fmt.pct(vmax) })]);
      sKey.append(scale, el("div.legend", {}, [el("span.item", {}, [el("i.hatch"), `fewer than ${M.min_homes} damaged homes`]),
        q.at27 ? el("span.item", {}, [el("i.sq", { style: { background: "#e3e3e0" } }), "no restored home yet, or no third roll"]) : null]));
      if (q.at27 && s.restored_3 === null) sKey.append(el("p.what", { text: "This season has not reached the third roll; its tracts are shown without a value." }));
    } else {
      sKey.append(el("div.legend", {}, [el("span.item", {}, [el("i.sq", { style: { background: NAVY } }), "storm-struck tract"])]));
    }
    legend.append(...sto.map((t, i) => el("span.item", {}, [el("i.swatch" + (sto.length > 1 && i > 0 ? ".dash" : ""), { style: { background: INK, color: INK } }), t.label])),
      el("span.item", {}, [el("i.ring"), "Florida landfall record"]),
      el("span.item.note", {}, ["dots: 6-hourly positions"]));
  }

  function hoverTract(ev, r) {
    r.node.setAttribute("stroke", INK);
    r.node.setAttribute("stroke-width", 1.4);
    const s = bySeason.get(r.season);
    const rowsT = [["season", s.label], ["damaged resident homes", fmt.count(r.n)]];
    if (r.n >= M.min_homes) rowsT.push(["lost half or more", fmt.pct(r.destroyed_share)]);
    if (r.n >= M.min_homes && r.restored_share_3 !== null && r.restored_share_3 !== undefined) {
      rowsT.push([`restored, ${fmt.mo(s.months_3)} months`, fmt.pct(r.restored_share_3)], ["recovery with return", fmt.pct(r.ret_share_3)],
        ["new owner among restored", r.rwr_share_3 === null ? "no restored home" : fmt.num(r.rwr_share_3)], ["cleared lot", fmt.pct(r.cleared_share_3)]);
    }
    tip.show(ev, { title: `${countyName[r.county] || r.county} County, tract ${r.fips.slice(5)}`, rows: rowsT,
      note: r.n < M.min_homes ? `Fewer than ${M.min_homes} damaged homes: the shares are not mapped.` : "" });
  }

  function readHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    const s = h.get("season");
    if (s === "all") state.season = "all";
    else if (s && seasons.some((x) => String(x.season) === s)) state.season = Number(s);
    const q = h.get("fill");
    if (QUANT.some((x) => x.key === q)) state.q = q;
    if (state.season === "all") state.q = "struck";
  }
  function writeHash() { history.replaceState(null, "", `#season=${state.season}&fill=${state.q}`); }

  render(false);
  setVB(state.season === "all" ? full() : fit(bbox.get(state.season)));

  const ian = bySeason.get(2022);
  finding(`Seven hurricane seasons struck ${fmt.count(seasons.reduce((a, s) => a + s.tracts, 0))} tract-seasons and damaged ${fmt.count(seasons.reduce((a, s) => a + s.n_damaged, 0))} resident-owned homes. Of the ${fmt.count(ian.n_damaged)} that Ian damaged, ${fmt.pct(ian.restored_3)} stood restored ${fmt.mo(ian.months_3)} months later, and <span class="rwr">${fmt.num(ian.rwr_3)}</span> of the restored ones were under a new owner.`);

  const go = (season, q, ms) => () => { state.season = season; state.q = q; render(true); return new Promise((r) => setTimeout(r, ms || 0)); };
  tour({
    name: "the seven seasons",
    steps: [
      { cap: "Seven hurricane seasons, 2016 to 2024: every storm-struck tract and the nine best tracks.", ms: 3600, run: go("all", "struck") },
      { cap: "Michael, 2018: the Panhandle, where the storm flattened whole neighborhoods.", ms: 3600, run: go(2018, "destroyed") },
      { cap: "Irma, 2017: a wide storm, with two landfalls on Florida's coast.", ms: 3400, run: go(2017, "struck") },
      { cap: "Ian, 2022: on the Southwest coast the homes that lost half or more follow the shore and the track.", ms: 4200, run: go(2022, "destroyed") },
      { cap: "Where Ian destroyed most, the restored homes most often belong to someone new.", ms: 4200, run: go(2022, "rwr") },
      { cap: "Cleared lots at 27 months concentrate on the barrier islands and the canals.", ms: 3800, run: go(2022, "cleared") },
      { cap: "Debby, Helene and Milton, 2024: the season the rolls have only begun to read.", ms: 3600, run: go(2024, "struck") },
    ],
    after: () => {},
    rest: () => { state.season = 2022; state.q = "rwr"; render(false); setVB(fit(bbox.get(2022))); writeHash(); },
  }).attach(tourHost, { autoplay: !linked, idle: linked ? "A linked view; press Play for the guided tour." : undefined });
}
