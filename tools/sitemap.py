#!/usr/bin/env python3
r"""The site map, in one place. The page list below is the single source
for the tab bar, the page titles, the data each page loads and the entry
modules; this script writes the HTML documents, js\pages.js and
js\pages\<id>.js from it, so a tab is added or renamed here and nowhere
else.

The site is the companion to Paper 2, "Recovery without return: physical
housing recovery and ownership continuity after disasters". It is
anonymous (no author, no affiliation) and does not name a journal.

Usage:
    py -3 tools/sitemap.py        rewrite the HTML documents and the page modules
"""

import json
from html import escape
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
VERSION = "1"
TITLE = "Recovery without return"
SUBTITLE = ("Physical housing recovery and ownership continuity after seven Florida hurricane "
            "seasons, 2016 to 2024")
DESCRIPTION = ("Interactive companion to a study of whether the physical recovery of damaged homes also "
               "means that their pre-disaster owners keep them, read on Florida's parcel records")

PAGES = [
    {"id": "street", "file": "index.html", "tab": "Two clocks", "fn": "streetChart",
     "title": "A damaged home recovers on two clocks: the structure and the owner",
     "needs": ["street"],
     "desc": "a hundred damaged homes followed through the four rolls after the storm"},
    {"id": "clocks", "file": "clocks.html", "tab": "The gap", "fn": "clocksChart",
     "title": "Restored, but under a new owner: the gap between the two clocks",
     "needs": ["clocks"],
     "desc": "the restored share against the share restored by the pre-storm owner, by structural loss, and the sale clock"},
    {"id": "map", "file": "map.html", "tab": "Seven seasons", "fn": "mapChart",
     "title": "Where the storms struck, and where the restored homes changed hands",
     "needs": ["map", "geo"],
     "desc": "the storm-struck tracts of seven hurricane seasons with the HURDAT2 tracks, and the two clocks by tract"},
    {"id": "loss", "file": "loss.html", "tab": "Structural loss", "fn": "lossChart",
     "title": "Structural loss: the greater the loss, the more often a restored home has a new owner",
     "needs": ["loss"],
     "desc": "the five paths of a destroyed home and the H1 estimates with their checks"},
    {"id": "capital", "file": "capital.html", "tab": "Financial resources", "fn": "capitalChart",
     "title": "Financial resources: where owners were insured and better off, the pre-storm owner stays",
     "needs": ["capital"],
     "desc": "the H2 surfaces over structural loss and incumbent capital, and every H2 estimate"},
    {"id": "owners", "file": "owners.html", "tab": "Owner occupancy", "fn": "ownersChart",
     "title": "Owner occupancy: residents restore most and clear least, absentee owners wait",
     "needs": ["owners"],
     "desc": "restoration by owner group on the rolls and in the Cape Coral permits, and absentee neighborhoods"},
    {"id": "shore", "file": "shore.html", "tab": "The shore", "fn": "shoreChart",
     "title": "The shore: where the storm does most, not where the clocks separate most",
     "needs": ["shore"],
     "desc": "the two clocks by distance to the shoreline"},
    {"id": "data", "file": "data.html", "tab": "Data and methods", "fn": "dataPage",
     "title": "Records, measures, models and the hypotheses",
     "needs": ["data"],
     "desc": "the records, the measures, the validation, the models and the status of every hypothesis"},
]

FILES = {
    "meta": "data/meta.json",
    "street": "data/street.json",
    "clocks": "data/clocks.json",
    "map": "data/map.json",
    "loss": "data/loss.json",
    "capital": "data/capital.json",
    "owners": "data/owners.json",
    "shore": "data/shore.json",
    "data": "data/data.json",
}
GEO = ["data/geo/counties.json", "data/geo/tracts.json", "data/geo/tracks.json"]

SOURCES = (
    'Records: <a href="https://floridarevenue.com/property/dataportal" rel="noopener">Florida Department of '
    'Revenue assessment rolls and sales files</a>; '
    '<a href="https://www.fema.gov/about/openfema/data-sets" rel="noopener">OpenFEMA</a> Individuals and '
    'Households Program registrations and National Flood Insurance Program policies and claims; '
    '<a href="https://www.fema.gov/flood-maps/national-flood-hazard-layer" rel="noopener">National Flood '
    'Hazard Layer</a>; <a href="https://www.census.gov/programs-surveys/acs" rel="noopener">American Community '
    'Survey</a>; <a href="https://www.nhc.noaa.gov/data/#hurdat" rel="noopener">HURDAT2</a>; '
    '<a href="https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html" '
    'rel="noopener">TIGER/Line boundaries</a>; '
    '<a href="https://capecoral-capegis.opendata.arcgis.com/" rel="noopener">City of Cape Coral</a> and '
    'Charlotte County building permits. Every number on this site is rebuilt from the analysis results by '
    'one script (<a href="data.html">Data and methods</a>).'
)


def nav():
    return "\n".join(f'      <li><a href="{p["file"]}">{escape(p["tab"])}</a></li>' for p in PAGES)


def html(page):
    v = VERSION
    landing = page["file"] == "index.html"
    title = TITLE if landing else f'{page["tab"]} | {TITLE}'
    preload = [FILES["meta"]] + [FILES[k] for k in page["needs"] if k in FILES]
    if "geo" in page["needs"]:
        preload += GEO
    links = "\n".join(f'<link rel="preload" href="{f}?v={v}" as="fetch" crossorigin>' for f in preload)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)}</title>
<meta name="description" content="{escape(DESCRIPTION)}: {escape(page["desc"])}.">
<meta name="theme-color" content="#16385c">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M2 8 8 3l6 5v6H2z' fill='%23a8325e'/%3E%3C/svg%3E">
<link rel="stylesheet" href="css/style.css?v={v}">
{links}
<link rel="modulepreload" href="js/shell.js?v={v}">
</head>
<body class="page-{page["id"]}">

<a class="skip" href="#page">Skip to content</a>
<header class="masthead" id="masthead">
  <div class="masthead-inner">
    <a class="homelink" href="index.html">{escape(TITLE)}</a>
    <p class="crumb">{escape(SUBTITLE)}</p>
  </div>
</header>
<nav class="sitenav" id="sitenav" aria-label="Pages">
  <div class="sitenav-inner">
    <ul>
{nav()}
    </ul>
  </div>
</nav>

<main id="page" class="section">
  <header class="lede">
    <h1>{escape(page["title"])}</h1>
    <p class="finding" id="finding"></p>
  </header>
  <div class="chart-block" id="chart"></div>
</main>

<footer class="foot">
  <p>{SOURCES}</p>
</footer>

<div id="tooltip" class="tooltip" role="status" aria-live="polite"></div>

<script type="module" src="js/pages/{page["id"]}.js?v={v}"></script>
</body>
</html>
"""


def page_module(page):
    needs = ", ".join(f'"{k}"' for k in page["needs"])
    return (f'import {{ boot }} from "../shell.js";\n'
            f'import {{ $ }} from "../lib/dom.js";\n'
            f'import {{ {page["fn"]} }} from "../charts/{page["id"]}.js";\n\n'
            f'boot({{\n  id: "{page["id"]}",\n  needs: [{needs}],\n'
            f'  mount(app) {{ {page["fn"]}($("#chart"), app); }},\n}});\n')


def pages_js():
    keep = ("id", "file", "tab", "title")
    pages = [{k: p[k] for k in keep} for p in PAGES]
    return ("/* Written by tools/sitemap.py from its page list; edit that file. */\n\n"
            f'export const VERSION = "{VERSION}";\n\n'
            f"export const PAGES = {json.dumps(pages, indent=2, ensure_ascii=False)};\n\n"
            f"export const FILES = {json.dumps(FILES, indent=2)};\n\n"
            f"export const GEO = {json.dumps(GEO)};\n")


def public_files():
    """Every file a deployment carries, relative to the app folder."""
    out = {"css/style.css", "js/shell.js", "js/pages.js", *FILES.values(), *GEO}
    out |= {f"js/lib/{p.name}" for p in (APP / "js" / "lib").glob("*.js")}
    for p in PAGES:
        out |= {p["file"], f"js/pages/{p['id']}.js", f"js/charts/{p['id']}.js"}
    return sorted(out)


def write():
    for p in PAGES:
        (APP / p["file"]).write_text(html(p), encoding="utf-8", newline="\n")
        (APP / "js" / "pages" / f'{p["id"]}.js').write_text(page_module(p), encoding="utf-8", newline="\n")
    (APP / "js" / "pages.js").write_text(pages_js(), encoding="utf-8", newline="\n")
    print(f"  {len(PAGES)} pages, js/pages.js and the page modules written (site version {VERSION})")


if __name__ == "__main__":
    write()
