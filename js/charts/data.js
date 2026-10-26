/* The Data and methods page: the records (Table 1), the sample, the
   measures (Section 4.3), the validation (Section 4.4), the models
   (Section 4.5), the hypotheses with their main estimates (Tables 4 to 6),
   the limitations (Section 7), and where each page of the site sits in
   the paper.

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
  host.append(recHead, el("p.sub", { text: "Public records only (Table 1). Every parcel appears on its county's assessment roll each year; the rolls were linked across years using county and statewide parcel identifiers, so properties are tracked even when county identifiers change." }));
  const recTable = table(["Data source", "Key information", "Coverage", "Analytical use"],
    D.records.map((r) => [el("a", { href: r.link, rel: "noopener", text: r.record }), r.gives, r.coverage, r.used]));
  host.append(recTable);

  /* samples */
  host.append(el("h3.rule", { text: "The sample" }));
  const g = s.groups;
  host.append(el("div.factrow", {}, [
    el("div.fact", {}, [el("b.bignum", { text: fmt.count(s.total) }), el("span", { text: "homes with structural loss of at least 25% (L25) in affected tracts, seven hurricane seasons" })]),
    el("div.fact", {}, [el("b.bignum", { text: fmt.count(g.resident) }), el("span", { text: "resident owner-occupied" })]),
    el("div.fact", {}, [el("b.bignum", { text: fmt.count(g.nonresident) }), el("span", { text: "nonresident individually owned" })]),
    el("div.fact", {}, [el("b.bignum", { text: fmt.count(g.business) }), el("span", { text: "business-owned" })]),
  ]));
  host.append(el("p.sub", { text: `The comparisons across owner types use ${fmt.count(s.balanced_k2)} of these properties observed at the second post-storm assessment for the 2016 to 2022 seasons. The residential sample includes single-family houses and mobile homes with structures recorded in the storm-year roll, under the same ownership for at least two rolls before the storm.` }));

  /* measures */
  host.append(el("h3.rule", { text: "The measures" }));
  const dl = el("dl.defs");
  for (const [t, d] of D.measures) dl.append(el("dt", { text: t }), el("dd", { text: d }));
  host.append(dl);

  /* validation */
  host.append(el("h3.rule", { text: "Measurement validation (Section 4.4)" }));
  host.append(el("ul.plain", {}, [
    el("li", { text: `Major structural loss and replacement are recorded reliably. In Charlotte County, newly constructed homes identified through building permits and the construction years recorded in the assessment rolls agree with κ = ${fmt.num(v.charlotte_kappa)} (${fmt.count(v.charlotte_n)} homes).` }),
    el("li", { text: `The completion of repairs is captured less precisely. In Cape Coral, agreement between finalized structure permits and restoration (R ≥90%) on the following roll was low (κ = ${fmt.num(v.cape_kappa)}; ${fmt.count(v.cape_n)} L25 homes): ${fmt.pct(v.cape_restored_if_permit)} of homes with a finalized permit read restored against ${fmt.pct(v.cape_restored_if_not)} without one, although the median structural value ratio was ${fmt.pct(v.cape_median_r_if_permit)} against ${fmt.pct(v.cape_median_r_if_not)}.` }),
    el("li", { text: `The Cape Coral permit files carry the parcel key from 2023 on (${v.cape_keyed.filter((r) => r.year >= 2023).map((r) => `${r.year} ${fmt.pct(r.keyed)}`).join(", ")} of permits keyed); the 2022 file has none.` }),
    el("li", { text: "The models compare homes within census tract and hurricane season, and the main models are also re-estimated with restoration benchmarked against unaffected homes in the same tract and with each county, Lee included, omitted in turn." }),
  ]));

  /* models */
  host.append(el("h3.rule", { text: "The models (Section 4.5)" }));
  host.append(el("ul.plain", {}, D.models.map((t) => el("li", { text: t }))));

  /* hypotheses */
  host.append(el("h3.rule", { text: "The hypotheses and their main estimates (Tables 4 to 6)" }),
    el("p.sub", { text: "Estimates in percentage points with 95% CIs unless stated: H2 per unit of the financial resources index, H3b per 10 percentage points of the ownership share, the Cape Coral estimates as hazard ratios." }));
  host.append(table(["Hypothesis", "Evidence", "Estimate [95% CI]", "p", "Table"],
    D.hypotheses.map((h) => [h.name, h.evidence, h.estimate, fmt.pval(h.p).replace("p ", ""), h.table])));

  /* limitations */
  host.append(el("h3.rule", { text: "Limitations (Section 7)" }));
  host.append(el("ul.plain", {}, D.limits.map((t) => el("li", { text: t }))));

  /* the site and the paper */
  host.append(el("h3.rule", { text: "Where each page sits in the paper" }));
  host.append(table(["Page", "In the paper"], D.figures, "dtable text"));
  host.append(el("p.sub", { style: { marginTop: ".9rem" }, html: "The site is static: plain HTML, CSS and JavaScript modules, no framework, no external requests. Every number on it is written from the analysis results by <code>py -3 tools/build_data.py</code>, which also reads each number back out of the manuscript draft and reports any that differ." }));

  finding(`Florida's public parcel records, linked across the rolls before and after seven hurricane seasons: ${fmt.count(s.total)} homes with structural loss of at least 25%, ${fmt.count(g.resident)} of them resident owner-occupied, with ownership, sales, disaster-loss, insurance and building-permit records.`);

  tour({
    name: "data and methods",
    steps: [
      { cap: "The records: assessment rolls and sales files, FEMA registrations, flood insurance, flood zones and building permits.", ms: 3600, run: () => recTable.scrollIntoView({ behavior: "smooth", block: "start" }) },
      { cap: "Every hypothesis with its main estimate and the table it comes from.", ms: 4200, run: () => host.querySelectorAll("h3.rule")[5].scrollIntoView({ behavior: "smooth", block: "start" }) },
    ],
    after: () => {},
    rest: () => {},
  }).attach(tourHost);
}
