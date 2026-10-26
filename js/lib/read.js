/* The reading aids of a page, kept out of the way: a folded "How to read
   this page" block with the terms the page uses, defined as in Section 4
   of the paper and the same way on every page. The figures carry their
   numbers in hover; the page itself carries one finding line and nothing
   else. */

import { el } from "./dom.js";

export const TERMS = {
  clocks: ["Physical restoration and ownership continuity", "Two dimensions of housing recovery. Restoration reads whether the structure is repaired, rebuilt, left unrestored or cleared; ownership continuity reads whether the pre-storm owner is still recorded or a new owner is."],
  rwr: ["Recovery without return", "Restoration under new ownership (RN): a restored home with a different owner recorded. It indicates an ownership transition, not directly observed household displacement."],
  ret: ["Restoration under original ownership", "Restored (RO), no ownership change, the homestead exemption retained."],
  stranded: ["Unrestored, original owner", "Not restored, the original owner still recorded."],
  unresolved: ["Unrestored, new owner", "Not restored, a new owner recorded."],
  cleared: ["Cleared lot", "No structure recorded on the roll; the owner may be the original one or new."],
  loss: ["Structural loss (L)", "The proportional decline in assessed structural value between the pre-storm and the first post-storm roll, adjusted for the countywide reassessment trend. L25, L50 and L75: at least 25%, 50% and 75%. Homes with L <10% are the unaffected comparison group."],
  restored: ["Restored", "The structural value ratio R is at least 90% of the pre-storm value after the reassessment trend (R ≥75% and R ≥100% as sensitivity analyses)."],
  capped: ["Capped R", "The structural value ratio capped at 100%, a continuous measure of physical recovery."],
  rolls: ["Rolls and months", "Assessment rolls record conditions as of January 1. The roll of the hurricane year, t, is the pre-storm baseline; t + 1 to t + 4 are the first four post-storm rolls, about 3, 15, 27 and 39 months after a September landfall."],
  resident: ["Owner type", "On the pre-storm roll: a resident owner-occupant is an individual or trust with a homestead exemption; a nonresident individual has none; a business entity is a corporate or other business owner."],
  pp: ["pp", "Percentage points: 31% against 28% is 3 pp."],
  ci: ["95% CI", "The 95% confidence interval in brackets. An interval that excludes zero (or one, for a hazard ratio) marks an association the data can tell from none."],
  k: ["Financial resources index (K)", "The mean of two tract-level components standardized within season: the insured share of IHP owner registrants and the log of census-tract median household income. Estimates are per unit of K."],
  struck: ["Affected tract", "A census tract with tract exposure D ≥5: at least 5 FEMA-verified real-property losses per 100 owner-occupied housing units."],
  spec: ["Main and alternative specifications", "A filled marker is the main specification of Section 4.5; an open marker is one of its alternative specifications (tract clusters, R ≥75% and R ≥100%, a wider reassessment-trend bandwidth, tracts with D ≥20, the DOR hurricane code, the seasons before 2024, tract-adjusted restoration, the sample without Lee County)."],
};

export const pick = (...keys) => keys.map((k) => TERMS[k]).filter(Boolean);

/** A folded block: how to read the page, then its terms. */
export function howto(host, { lines = [], terms = [] }) {
  const block = el("details.howto", {}, [el("summary", { text: "How to read this page" })]);
  if (lines.length) block.appendChild(el("ul", {}, lines.map((t) => el("li", { html: t }))));
  if (terms.length) {
    const dl = el("dl");
    for (const [term, def] of terms) dl.append(el("dt", { text: term }), el("dd", { text: def }));
    block.appendChild(dl);
  }
  host.appendChild(block);
  return block;
}

/** The page's one finding line under its title. */
export function finding(html) {
  const p = document.getElementById("finding");
  if (p) p.innerHTML = html;
}
