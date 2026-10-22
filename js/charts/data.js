/* The Data and methods page: the records (Table 1), the samples, the
   measures, the validation, the models, the status of every hypothesis
   (Table 6), the predictive layer (Appendix B), the limits (Section 6.4),
   and where each page of the site sits in the paper.

   Data: data/data.json. */

import { el, clear } from "../lib/dom.js";
import * as fmt from "../lib/format.js";
import { tour } from "../lib/tour.js";
import { finding } from "../lib/read.js";

function table(headers, rows, cls = "dtable text") {
  return el("div.tablewrap", {}, [el(`table.${cls.split(" ").join(".")}`, {}, [
    el("thead", {}, [el("tr", {}, headers.map((h) => el("th", { text: h })))]),
    el("tbody", {}, rows.map((r) => el("tr", {}, r.map((c) => (c instanceof Node ? el("td", {}, [c]) : el("td", { text: String(c) })))))),
  ])]);
}

export function dataPage(host, app) {
  const D = app.data;
  const s = D.samples;
  const v = D.validation;

  const tourHost = el("div");
  clear(host).append(tourHost);

  /* records */
  const recHead = el("h3.rule", { text: "The records" });
  recHead.style.marginTop = "0";
  recHead.style.borderTop = "0";
  host.append(recHead, el("p.sub", { text: "Public records only: no survey, no interview. Every parcel in Florida appears on its county's assessment roll each year; the rolls were linked across years on the parcel identifier and the state parcel identifier, which survives county renumbering." }));
  const recTable = table(["Record", "What it gives", "Coverage", "Used for"],
    D.records.map((r) => [el("a", { href: r.link, rel: "noopener", text: r.record }), r.gives, r.coverage, r.used]));
  host.append(recTable);

  /* samples */
  host.append(el("h3.rule", { text: "The homes" }));
  const g = s.groups;
  host.append(el("div.factrow", {}, [
    el("div.fact", {}, [el("b.bignum", { text: fmt.count(s.total) }), el("span", { text: "damaged houses in storm-struck tracts, seven seasons, held since two rolls before the storm" })]),
    el("div.fact", {}, [el("b.bignum", { text: fmt.count(g.resident) }), el("span", { text: "of them resident owner-occupied, the population of the two clocks" })]),
    el("div.fact", {}, [el("b.bignum", { text: fmt.count(g.nonresident) }), el("span", { text: "owned by non-resident individuals" })]),
    el("div.fact", {}, [el("b.bignum", { text: fmt.count(g.business) }), el("span", { text: "owned by business entities" })]),
  ]));
  host.append(el("p.sub", { text: `${fmt.count(s.balanced_k2)} damaged houses of the three owner groups are present on the second roll after the storm in the seasons 2016 to 2022. A house is a single-family house or a mobile home with a structure on the roll of the storm year.` }));

  /* measures */
  host.append(el("h3.rule", { text: "The measures" }));
  const dl = el("dl.defs");
  for (const [t, d] of D.measures) dl.append(el("dt", { text: t }), el("dd", { text: d }));
  host.append(dl);

  /* validation */
  host.append(el("h3.rule", { text: "What the rolls measure well, and what with noise" }));
  host.append(el("ul.plain", {}, [
    el("li", { text: `Destruction and rebuilding are recorded well. In Charlotte County, a new-construction permit issued before 2025 and a new year built on the 2025 roll agree with a kappa of ${fmt.num(v.charlotte_kappa)} (${fmt.count(v.charlotte_n)} houses).` }),
    el("li", { text: `Repair-level restoration is recorded with noise. In Cape Coral, a finaled structure permit predicts restoration on the next roll weakly (kappa ${fmt.num(v.cape_kappa)}, ${fmt.count(v.cape_n)} damaged houses): ${fmt.pct(v.cape_restored_if_permit)} of houses with a finaled permit read restored against ${fmt.pct(v.cape_restored_if_not)} without one, though the median house with a permit has regained ${fmt.num(v.cape_median_r_if_permit)} of its value against ${fmt.num(v.cape_median_r_if_not)}.` }),
    el("li", { text: `The Cape Coral permit files carry the parcel key from 2023 on (${v.cape_keyed.filter((r) => r.year >= 2023).map((r) => `${r.year} ${fmt.pct(r.keyed)}`).join(", ")} of permits keyed); the 2022 file has none.` }),
    el("li", { text: "The models compare houses within tract and season, which absorbs county assessment practice in levels, and every main estimate is re-run without Lee County and with restoration measured against the undamaged houses of the same tract." }),
  ]));

  /* models */
  host.append(el("h3.rule", { text: "The models" }));
  host.append(el("ul.plain", {}, D.models.map((t) => el("li", { text: t }))));

  /* hypotheses */
  host.append(el("h3.rule", { text: "The hypotheses and the evidence each rests on" }),
    el("p.sub", { text: "Table 6 of the paper. Estimates in percentage points unless stated; H2 per standard deviation of the capital measure. The status records whether the test was written before its outcome was examined and whether its rule was met." }));
  const pill = (st) => {
    const cls = /passed/.test(st) ? "pass" : /missed/.test(st) ? "miss" : "desc";
    return el(`span.pill.${cls}`, { text: st });
  };
  host.append(table(["Hypothesis", "Evidence", "Estimate (95% CI)", "p < .05", "Status"],
    D.hypotheses.map((h) => [h.name, h.evidence, h.estimate, h.significant === null ? "" : (h.significant ? "yes" : "no"), pill(h.status)])));

  /* learners */
  host.append(el("h3.rule", { text: "What prediction could not do" }),
    el("p.sub", { text: "Appendix B. Gradient-boosted learners trained on the seasons 2016 to 2020 and tested on the seasons 2022 and 2023 (Ian, Nicole, Idalia). An area under the curve of .5 is a coin flip; the hypotheses are read from the statistical models, not from the learners." }));
  host.append(table(["Learner", "Trained on", "Tested on", "Base rate", "Area under the curve"],
    D.learners.map((r) => [r.learner, fmt.count(r.train), fmt.count(r.test), fmt.pct(r.base), fmt.num(r.auc)]), "dtable"));

  /* limits */
  host.append(el("h3.rule", { text: "Limits" }));
  host.append(el("ul.plain", {}, D.limits.map((t) => el("li", { text: t }))));

  /* the site and the paper */
  host.append(el("h3.rule", { text: "Where each page sits in the paper" }));
  host.append(table(["Page", "In the paper"], D.figures, "dtable text"));
  host.append(el("p.sub", { style: { marginTop: ".9rem" }, html: "The site is static: plain HTML, CSS and JavaScript modules, no framework, no external requests. Every number on it is written from the analysis results by <code>py -3 tools/build_data.py</code>, which also reads each number back out of the manuscript draft and reports any that differ." }));

  finding(`Florida's public parcel records, read on the same parcel across the rolls before and after seven hurricane seasons: ${fmt.count(s.total)} damaged houses, ${fmt.count(g.resident)} of them resident owner-occupied, with their owners, sales, flood insurance and building permits.`);

  tour({
    name: "data and methods",
    steps: [
      { cap: "The records: assessment rolls and sales files, FEMA registrations, flood insurance, flood zones and building permits.", ms: 3600, run: () => recTable.scrollIntoView({ behavior: "smooth", block: "start" }) },
      { cap: "Every hypothesis with the evidence it rests on and the status it earned.", ms: 4200, run: () => host.querySelectorAll("h3.rule")[5].scrollIntoView({ behavior: "smooth", block: "start" }) },
    ],
    after: () => {},
    rest: () => {},
  }).attach(tourHost);
}
