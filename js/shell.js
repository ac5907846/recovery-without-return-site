/* Shared page shell. Every page is a real HTML document with its own URL
   and carries its masthead, tab bar, title and footer as static markup,
   so the frame paints before any script or data arrives. This module
   marks the active tab, shows a placeholder in the chart block, loads
   only the data that page asks for, and hands control to the page's
   module. The page list lives in pages.js, written by tools/sitemap.py. */

import { el, clear, $ } from "./lib/dom.js";
import { VERSION, PAGES, FILES, GEO } from "./pages.js";

export { VERSION, PAGES };

async function getJSON(path) {
  const res = await fetch(`${path}?v=${VERSION}`);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

async function loadInto(app, needs) {
  const wanted = new Set(["meta", ...needs]);
  const geo = wanted.delete("geo");
  const keys = [...wanted];
  const parts = await Promise.all(keys.map((k) => getJSON(FILES[k])));
  keys.forEach((k, i) => { app[k] = parts[i]; });
  if (geo) {
    const [counties, tracts, tracks] = await Promise.all(GEO.map(getJSON));
    app.geo = { counties: counties.counties, context: counties.context, tracts, tracks };
  }
  return app;
}

function markTabs(page) {
  const host = $("#sitenav");
  if (!host) return;
  for (const a of host.querySelectorAll("a")) {
    const on = a.getAttribute("href") === page.file;
    a.classList.toggle("active", on);
    if (on) {
      a.setAttribute("aria-current", "page");
      a.scrollIntoView({ block: "nearest", inline: "center" });
    } else a.removeAttribute("aria-current");
  }
}

function placeholder(mount) {
  if (!mount || mount.children.length) return;
  mount.appendChild(el("div.loading", {}, [el("i.loading-bar"), el("span", { text: "Reading the data layer" })]));
}

function failure(message) {
  const mount = $("#chart") || $("#page") || document.body;
  clear(mount).appendChild(el("div.errorbox", { html: message }));
  document.documentElement.setAttribute("data-error", "1");
}

/* a runtime error anywhere marks the document, so a headless test sees it */
window.addEventListener("error", (e) => {
  document.documentElement.setAttribute("data-error", String(e.message || "error").slice(0, 200));
});
window.addEventListener("unhandledrejection", (e) => {
  document.documentElement.setAttribute("data-error", String((e.reason && e.reason.message) || e.reason).slice(0, 200));
});

/** Entry point for every page module. */
export async function boot({ id, needs = [], mount }) {
  const page = PAGES.find((p) => p.id === id);
  markTabs(page);
  if (location.protocol === "file:") {
    failure("This site loads its data from <code>data/</code>, which a browser will not read from the file "
      + "system. Start a local server in the app folder and open the address it prints:<br><br>"
      + "<code>py -3 -m http.server 8000</code><br>then visit <code>http://localhost:8000</code>.");
    return;
  }
  placeholder($("#chart"));
  try {
    const app = {};
    await loadInto(app, needs);
    clear($("#chart"));
    if (mount) await mount(app, page);
    document.documentElement.setAttribute("data-ready", "1");
  } catch (err) {
    failure(`Could not draw this page: <code>${err.message}</code>. Run <code>py -3 tools/build_data.py</code> and reload.`);
    throw err;
  }
}
