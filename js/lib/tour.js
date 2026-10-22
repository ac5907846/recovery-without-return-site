/* A guided tour for one page, and the lap through the whole site.

   Each page's tour is a list of steps with a Play/Pause button, a thin
   progress bar and a one-line caption. On arrival the tour plays by
   itself; when it reaches its last step the site moves to the next tab
   and runs that page's tour, through every tab, then starts over. The
   lap counter and the position travel in sessionStorage. The first lap
   runs at a quicker pace, later laps at the normal one. Any pointer,
   key, wheel or touch input anywhere pauses the tour and the lap; only
   the button resumes them. With reduced motion requested, or with
   ?still=1 in the address (tests and screenshots), nothing plays and
   the page rests in its final state. */

import { el } from "./dom.js";
import { PAGES } from "../pages.js";

const STOP = { stop: true };
const KEY = "recovery-without-return.tour";
const FAST = 0.7;
const reduced = window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const still = /[?&]still=1\b/.test(location.search);
const all = [];
let listening = false;

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
    s = { lap: s ? s.lap : 0, page: page.id, step: 0, paused: s ? !!s.paused : false };
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
  writeState({ lap: (i + 1) % PAGES.length === 0 ? (s.lap || 0) + 1 : (s.lap || 0), page: next.id, step: 0, paused: false });
  location.href = next.file;
}

function listen() {
  if (listening) return;
  listening = true;
  const interrupt = (e) => {
    if (e.target && e.target.closest && e.target.closest(".tour")) return;
    for (const t of all) t.pause();
  };
  document.addEventListener("pointerdown", interrupt, true);
  document.addEventListener("keydown", interrupt, true);
  window.addEventListener("wheel", interrupt, { passive: true, capture: true });
  window.addEventListener("touchstart", interrupt, { passive: true, capture: true });
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
  let bar = null;
  let word = null;
  const state = lapState();
  if (state.step > 0 && state.step < steps.length) idx = state.step;

  function sleep(ms) {
    const g = gen;
    return new Promise((res, rej) => {
      setTimeout(() => { if (g === gen && playing) res(); else rej(STOP); }, ms * speed());
    });
  }
  const ctx = { sleep, caption: (t) => { if (cap) cap.textContent = t; } };

  function progress(step) {
    if (!bar) return;
    const total = steps.reduce((a, s) => a + s.ms, 0);
    const before = steps.slice(0, idx).reduce((a, s) => a + s.ms, 0);
    bar.style.transition = "none";
    bar.style.transform = `scaleX(${before / total})`;
    bar.getBoundingClientRect();
    bar.style.transition = `transform ${step.ms * speed()}ms linear`;
    bar.style.transform = `scaleX(${(before + step.ms) / total})`;
  }
  function freeze() {
    if (!bar) return;
    const now = getComputedStyle(bar).transform;
    bar.style.transition = "none";
    bar.style.transform = now;
  }

  function loop() {
    const g = gen;
    const step = steps[idx];
    ctx.caption(step.cap);
    progress(step);
    const s = readState();
    if (s) writeState({ ...s, step: idx, paused: false });
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
    word.textContent = playing ? "Pause tour" : "Play tour";
    btn.setAttribute("aria-label", `${playing ? "Pause" : "Play"} the tour of ${name}`);
  }
  function play() {
    if (playing || !ui) return;
    playing = true;
    gen += 1;
    const s = readState();
    if (s) writeState({ ...s, paused: false });
    paint();
    loop();
  }
  function pause() {
    if (!playing) return;
    playing = false;
    gen += 1;
    freeze();
    const s = readState();
    if (s) writeState({ ...s, paused: true });
    if (after) after();
    paint();
  }

  function attach(host, opts = {}) {
    listen();
    if (!ui) {
      cap = el("span.tour-cap", { "aria-live": "polite", text: opts.idle || "Press Play for a guided tour of this page." });
      word = el("span.tour-t", { text: "Play tour" });
      bar = el("i.tour-bar");
      btn = el("button.tour-btn", { type: "button", onclick: () => (playing ? pause() : play()) }, [word, bar]);
      ui = el("div.tour", {}, [cap, btn]);
    }
    host.appendChild(ui);
    paint();
    if (opts.autoplay === false) return inst;          /* a linked view: hold it, the tour waits for Play */
    if (reduced || still) { if (rest) rest(); return inst; }
    if (!state.paused) play();
    else if (rest) rest();
    return inst;
  }

  const inst = { attach, play, pause, isPlaying: () => playing };
  all.push(inst);
  return inst;
}

export { reduced, still };
