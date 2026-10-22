# Recovery without return: companion site

Interactive companion to the study *Recovery without return: physical
housing recovery and ownership continuity after disasters*, built from
the analysis stages a14 to a18. Live at <https://recovery.praiser.us>.

Static site: plain HTML, CSS and ES modules, no build step, no framework,
no external requests, light mode only. Every chart is drawn in the browser
(hand-built SVG) from the JSON files in `data/`, which are generated from
the analysis results. The site is anonymous (no author, no affiliation)
and does not name a journal.

## Pages

`tools/sitemap.py` holds the page list (tab, title, data, entry module)
and writes the HTML documents, `js/pages.js` and `js/pages/<id>.js` from
it. A tab is added or renamed there and nowhere else.

| File | Tab | In the paper | Reads |
|---|---|---|---|
| `index.html` | Two clocks | Figures 1 and 4, Table 2, Figure S13: a block of 100 isometric lots (one per hundredth of the damaged resident homes of a loss bin) moved through the four rolls by a clock, house height the structure clock, roof colour the ownership clock; the recovery matrix of Figure 1 filled with the shares | `street.json` |
| `clocks.html` | The gap | Figure 4, Table 2 and its continuation: the two clocks by loss bin, the seven states of any roll, the sale clock with buyers and prices, the two clocks season by season | `clocks.json` |
| `map.html` | Seven seasons | Figures 2 and 5: struck tracts of any season filled by a Figure 5 quantity, HURDAT2 tracks with Figure 2's landfall rule, zoom to each season, pan and zoom | `map.json`, `geo/` |
| `loss.html` | Structural loss | Figure 3, Table 3: the five paths of a destroyed home as an isometric street, H1 and its checks, what the new owners build | `loss.json` |
| `capital.html` | Financial resources | Figure 6, Table 4: the H2 surface grid (smoothed as in the figure or raw), every H2 estimate and the flood zone | `capital.json` |
| `owners.html` | Owner occupancy | Figure 7, Table 5: owner cards, the Cape Coral permit clock with Cox hazard ratios, Charlotte, H4 terciles and model, H3 checks | `owners.json` |
| `shore.html` | The shore | Section 5.5, Figure S12: states by distance band, H1 and H2 by band, pooled interactions | `shore.json` |
| `data.html` | Data and methods | Table 1, Table 6, Sections 4 and 6.4, Appendix B | `data.json` |

## Run it

A browser will not read `data/` over `file://`, so serve the folder:

```
cd 05_webapp
py -3 -m http.server 8000
```

Then open <http://localhost:8000>. `serve.bat` does the same in one
double-click. `?still=1` on any page holds the tour and shows the page at
rest (tests and screenshots). The landing page and the map keep their
state in the address (`#loss=75&t=4`, `#season=2022&fill=rwr`), so a view
can be shared as a link.

## Rebuild the data layer

```
py -3 tools/build_data.py --check
```

One builder per page lives in `tools/builders/`; each reads results files
under `02_analysis/a*/results/` and returns the JSON its page loads, with a
list of checks: each check reads the same number out of the manuscript
draft (the file `03_manuscripts/working/build_draft.py` builds from) and
compares it with the number the site prints, in the paper's style, and
lists any that differ. Rerun after any analysis or draft change. Tracts
with fewer than 20 damaged homes are hatched on the map, as in Figure 5,
and carry counts only.
The map's geometry comes from the raw TIGER/Line tracts (2010 and 2020),
the cartographic county file and HURDAT2, projected to EPSG:3086 and
delta-encoded in 10 m units. The Figure 6 grid is written to results by
`02_analysis/a18_two_clocks/site_export.py` (the figure computed it at
render time only).

## Design rules carried over from the paper

- The paper's palette: navy, deep pink, deep green and grays; no light
  blue, no orange; green is the pre-storm owner, pink a new owner.
- Numbers in the paper's style: `.43`, no plus sign, the plain hyphen-minus,
  intervals written `(1.4 to 4.2)`, stars `* p < .05 ** p < .01 *** p < .001`.
- No number is typed into a page; the finding line under each title is
  built from the data.
- One finding line per page, the figure, numbers in hover, and a folded
  "How to read this page" block with the terms; little prose otherwise.
- The figure labels follow the general vocabulary of Figure 1 (physical
  recovery, ownership continuity, structural loss, financial resources,
  owner occupancy); the text keeps the two clocks.

## The tour

`js/lib/tour.js`: every page plays a short captioned tour on arrival; at
its end the site moves to the next tab and plays that tour, through every
tab, then starts over. Any click, key, wheel or touch pauses it and the
Play button resumes it; reduced-motion settings and `?still=1` skip it.
While a tour plays its caption stays pinned under the tab bar.

## Testing without a browser session

```
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --disable-gpu --hide-scrollbars --window-size=1400,2400 --virtual-time-budget=9000 --screenshot=out.png "http://127.0.0.1:8000/index.html?still=1"
```

`shell.js` sets `data-ready="1"` on `<html>` when a page has drawn and
`data-error` on any runtime error, so `--dump-dom` shows whether a page
loaded cleanly. Headless Chrome will not go narrower than about 500 px.

## Publish

Cloudflare Pages project `recovery-without-return`
(<https://recovery-without-return.pages.dev>), custom domain
<https://recovery.praiser.us>. To publish a change: rebuild the data
layer, bump `VERSION` in `tools/sitemap.py` (the version string busts the
browser cache), run `py -3 tools/sitemap.py`, test, commit, then

```
py -3 tools/deploy.py --dry-run     list what would go live
py -3 tools/deploy.py               deploy
```

`tools/deploy.py` copies only the files `tools/sitemap.py public_files()`
lists (the pages, stylesheet, modules and data; never the tools) into
`dist/` and runs `npx wrangler pages deploy` on it. Wrangler must be
logged in (`npx wrangler login`).
