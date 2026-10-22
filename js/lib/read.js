/* The reading aids of a page, kept out of the way: a folded "How to read
   this page" block with the terms the page uses, defined the same way on
   every page. The figures carry their numbers in hover; the page itself
   carries one finding line and nothing else. */

import { el } from "./dom.js";

export const TERMS = {
  clocks: ["The two clocks", "A damaged home recovers on two clocks. The structure clock reads whether the house is repaired, rebuilt, left damaged or cleared; the ownership clock reads whether the pre-storm owner keeps the parcel or sells it."],
  rwr: ["Recovery without return (RWR)", "A restored home under a new owner. The house came back; the household that owned it before the storm did not keep it. It names an ownership change, not an observed displacement."],
  ret: ["Recovery with return", "Restored, the same owner name, the homestead exemption still on the roll."],
  stranded: ["Stranded incumbent", "Not restored, the pre-storm owner still there."],
  unresolved: ["Unresolved transition", "Not restored, under a new owner."],
  cleared: ["Cleared lot", "No structure on the roll; the owner may be the same or new."],
  loss: ["Structural loss", "The share of the house's structure value lost on the first roll after the storm, after the county's reassessment trend. Damaged: a quarter or more. Destroyed: half or more, the line of the federal substantial-damage rule."],
  restored: ["Restored", "Structure value back to 90% of its pre-storm level after the county trend."],
  rolls: ["Rolls and months", "Florida's assessment rolls are taken on 1 January. The storm year's roll (s) describes each house before the storm; the four rolls after it, s+1 to s+4, fall about 3, 15, 27 and 39 months after a September landfall."],
  resident: ["Resident owner-occupant", "An individual or trust with a homestead exemption on the storm year's roll. A non-resident individual has none (a second home or a small landlord); a business entity is a corporation, company, partnership or trust company."],
  pp: ["pp", "Percentage points: 31% against 28% is 3 points."],
  ci: ["95% interval", "The range in parentheses. An interval that excludes zero (or one, for a hazard ratio) marks an effect the data can tell from none."],
  k: ["Incumbent capital K", "The tract's insured share of damaged owners and its median income, standardized and averaged; one SD is one standard deviation of K."],
  struck: ["Storm-struck tract", "A census tract with FEMA-verified real-property losses of at least 5 per 100 owner-occupied homes."],
  prespec: ["Pre-specified", "The test and its reading rule were written before the outcome was examined. A check repeats the test another way; a description is reported, not tested."],
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
