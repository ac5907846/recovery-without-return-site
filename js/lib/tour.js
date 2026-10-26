/* A guided tour for one page, and the lap through the whole site.

   Each page's tour is a list of steps with a one-line caption and one
   round icon button (pause while it plays, play while it rests). The
   tour starts by itself whenever a page opens, by the address bar or by
   a tab; when it reaches its last step the site moves to the next tab
   and runs that page's tour, through every tab, then starts over. The
   lap counter and the position travel in sessionStorage. The first lap
   runs at a quicker pace, later laps at the normal one. Two things stop
   or resume it, and both toggle: the button, and a click on the page's
   figure (a drag on the map or a click on a control inside the figure
   does not count). Scrolling, keys and clicks elsewhere leave it alone.
   Nothing shows its progress. With reduced motion requested, or with
   ?still=1 in the address (tests and screenshots), nothing plays and
   the page rests in its final state. */

import { el, svg } from "./dom.js";
import { PAGES } from "../pages.js";

const STOP = { stop: true };
const KEY = "recovery-without-return.tour";
const FAST = 0.7;
const DRAG = 6;                       /* px of pointer travel that make a click a drag */
const reduced = window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const still = /[?&]still=1\b/.test(location.search);
const all = [];

function currentPage() {
  const stem = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "") || "index";
  return PAGES.find((p) => p.file.replace(/\.html$/, "") === stem) || PAGES[0];
}

function readState() {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (s && typeof s === "object") return s;
  } catch { /* storage may be blocked */ }
  return null;
}
function writeState(s) {
  try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

function lapState() {
  const page = currentPage();
  let s = readState();
  if (!s || s.page !== page.id) {
    s = { lap: s ? s.lap : 0, page: page.id, step: 0 };
    writeState(s);
  }
  return s;
}

function speed() {
  const s = readState();
  return s && s.lap > 0 ? 1 : FAST;
}

function handOff() {
  const page = currentPage();
  const i = PAGES.findIndex((p) => p.id === page.id);
  if (i < 0) return;
  const next = PAGES[(i + 1) % PAGES.length];
  const s = readState() || { lap: 0 };
  writeState({ lap: (i + 1) % PAGES.length === 0 ? (s.lap || 0) + 1 : (s.lap || 0), page: next.id, step: 0 });
  location.href = next.file;
}

function icon(kind) {
  const g = svg("svg", { viewBox: "0 0 16 16", width: 14, height: 14, "aria-hidden": "true", class: `tour-ico ${kind}` });
  if (kind === "pause") {
    g.append(svg("rect", { x: 3, y: 2.5, width: 3.4, height: 11, rx: .6 }),
      svg("rect", { x: 9.6, y: 2.5, width: 3.4, height: 11, rx: .6 }));
  } else {
    g.append(svg("path", { d: "M4.2 2.4 L13.4 8 L4.2 13.6 Z" }));
  }
  return g;
}

/**
 * steps: [{ cap, ms, run(ctx) }]; run returns a promise that resolves when
 * the step is done; ctx.sleep(ms) rejects when the tour is paused, which
 * ends the step early, and scales with the lap speed. after() runs when
 * the tour pauses or a step ends; rest() puts the figure in its resting
 * state (the last step's view).
 */
export function tour({ name, steps, after, rest, handoff = true }) {
  let gen = 0;
  let playing = false;
  let idx = 0;
  let ui = null;
  let cap = null;
  let btn = null;
  let icoPlay = null;
  let icoPause = null;
  const state = lapState();
  if (state.step > 0 && state.step < steps.length) idx = state.step;

  function sleep(ms) {
    const g = gen;
    return new Promise((res, rej) => {
      setTimeout(() => { if (g === gen && playing) res(); else rej(STOP); }, ms * speed());
    });
  }
  const ctx = { sleep, caption: (t) => { if (cap) cap.textContent = t; } };

  function loop() {
    const g = gen;
    const step = steps[idx];
    ctx.caption(step.cap);
    const s = readState();
    if (s) writeState({ ...s, step: idx });
    Promise.resolve().then(() => step.run(ctx)).then(() => sleep(step.ms)).then(next, (e) => {
      if (e !== STOP) { console.error(e); pause(); }
    });
    function next() {
      if (g !== gen) return;
      if (after) after();
      if (idx + 1 >= steps.length) {
        playing = false;
        idx = 0;
        if (rest) rest();
        paint();
        if (handoff) handOff();
        return;
      }
      idx += 1;
      loop();
    }
  }

  function paint() {
    if (!ui) return;
    ui.classList.toggle("on", playing);
    icoPause.style.display = playing ? "" : "none";
    icoPlay.style.display = playing ? "none" : "";
    btn.setAttribute("aria-label", `${playing ? "Pause" : "Play"} the tour of ${name}`);
    btn.title = playing ? "Pause" : "Play";
  }
  function play() {
    if (playing || !ui) return;
    playing = true;
    gen += 1;
    paint();
    loop();
  }
  function pause() {
    if (!playing) return;
    playing = false;
    gen += 1;
    if (after) after();
    paint();
  }
  const toggle = () => (playing ? pause() : play());

  /* a plain click on the figure toggles the tour; a drag (the map) or a
     click on a control inside it does not */
  function watch(node) {
    let down = null;
    node.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY }; }, true);
    node.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.closest && t.closest("button, a, input, select, label, .tour")) return;
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > DRAG) return;
      toggle();
    });
  }

  function attach(host, opts = {}) {
    if (!ui) {
      cap = el("span.tour-cap", { "aria-live": "polite", text: opts.idle || "" });
      icoPlay = icon("play");
      icoPause = icon("pause");
      btn = el("button.tour-btn", { type: "button", onclick: toggle }, [icoPlay, icoPause]);
      ui = el("div.tour", {}, [cap, btn]);
    }
    host.appendChild(ui);
    const figs = Array.isArray(opts.figure) ? opts.figure : opts.figure ? [opts.figure] : [];
    for (const f of figs) if (f) watch(f);
    paint();
    if (opts.autoplay === false) { if (rest) rest(); return inst; }   /* a shared view in the address holds still */
    if (reduced || still) { if (rest) rest(); return inst; }
    play();
    return inst;
  }

  const inst = { attach, play, pause, toggle, isPlaying: () => playing };
  all.push(inst);
  return inst;
}

export { reduced, still };
