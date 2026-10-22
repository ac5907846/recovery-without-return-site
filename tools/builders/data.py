r"""The Data and methods page: the records (Table 1), the measures, the
samples, the validation, the models, the status of every hypothesis
(Table 6), the predictive layer (Appendix B) and the limits.

Reads a14 tract_capital.csv; a15 d1_restoration.csv; a16
ml_recovery_auc.csv; a17 d5_validation.csv, d5_charlotte.csv,
d5_match.csv; a18 nfip_tract.csv, nfip_match.csv, capital_corr.csv; a11
propositions.csv.
"""

import re

from .common import check, months, num, pct, rd


def tidy_evidence(s):
    """The a11 evidence strings in the paper's words (build_submission.tidy_evidence)."""
    s = str(s)
    for a, b in (("recovery-without-return share", "RWR share"), (" x ", " × "), ("(points per sd)", "(pp per SD)"),
                 (" against ", " vs "), ("lost half or more", "loss .50 or more"), ("a quarter to a half", ".25 to .50"),
                 ("fraction of structure value regained", "value regained"),
                 ("NFIP policies in force per owner-occupied unit", "NFIP policies per owner-occupied unit"),
                 ("incumbent capital K", "K"), ("Cape Coral permits after Ian:", "Cape Coral:")):
        s = s.replace(a, b)
    return s


def tidy_status(s):
    s = re.sub(r"\s*\((?:v\d[^)]*)\)", "", str(s))
    return s.replace(", found after the pre-specification", " (post hoc)").strip()


def significant(text):
    m = re.search(r"\(([−\-.\d]+) to ([−\-.\d]+)\)", str(text))
    if not m:
        return None
    lo, hi = (float(v.replace("−", "-")) for v in m.groups())
    return bool(lo > 0 or hi < 0)


def hypotheses():
    props = rd("a11_hypothesis_table", "propositions.csv")
    out = []
    for _, r in props.iterrows():
        e = str(r["estimate (95% interval)"])
        hazard = "hazard" in str(r["evidence"])
        if hazard:
            hi = float(e.split("(")[1].split(" to ")[1].rstrip(")"))
            sig = hi < 1
        else:
            sig = significant(e)
        h = str(r["hypothesis"]).split()[0]
        out.append({"h": h, "name": NAMES.get(h, str(r["hypothesis"])), "results_name": str(r["hypothesis"]),
                    "evidence": tidy_evidence(r["evidence"]), "estimate": e,
                    "significant": sig, "status": tidy_status(r["status"])})
    return out


# the hypotheses under the names of the paper's Section 3 and Figure 1 (the a11 file keeps its earlier names)
NAMES = {"H1": "H1: structural loss", "H2": "H2: financial resources", "H3": "H3: owner occupancy",
         "H4": "H4: absentee neighborhoods (exploratory)"}


def build():
    d1 = rd("a15_recovery_tests", "d1_restoration.csv", low_memory=False)
    a = d1[(d1["sample"] == "all") & (d1["measure"] == "restored") & (d1["k"] == 1)]
    groups = {r["group"]: int(r["n"]) for _, r in a[a["by"] == "group"].iterrows()}
    total = int(a[a["by"] == "all"]["n"].iloc[0])
    b = d1[(d1["sample"] == "2016-2022") & (d1["by"] == "all") & (d1["measure"] == "restored") & (d1["k"] == 2)]
    tcap = rd("a14_recovery_panel", "tract_capital.csv", dtype={"tract_fips": str})
    ntr = rd("a18_two_clocks", "nfip_tract.csv", dtype={"tract_fips": str})
    match = rd("a18_two_clocks", "nfip_match.csv")
    pol = ntr.groupby("season")["policies_total"].sum()
    val = rd("a17_permit_timing", "d5_validation.csv")
    v24 = val[(val["roll"] == 2024) & (val["permit"] == "any structure permit finaled") & (val["restoration"] == "county trend")].iloc[0]
    ch = rd("a17_permit_timing", "d5_charlotte.csv")
    ag = ch[ch["event"].astype(str).str.startswith("agreement")].iloc[0]
    dm = rd("a17_permit_timing", "d5_match.csv")
    auc = rd("a16_recovery_ml", "ml_recovery_auc.csv")
    corr = rd("a18_two_clocks", "capital_corr.csv")

    records = [
        {"record": "DOR assessment rolls (NAL)", "link": "https://floridarevenue.com/property/dataportal",
         "gives": "structure and land value, use, living area, year built, homestead exemption, owner name and mailing state",
         "coverage": "67 counties; Final rolls 2009 to 2025 and the 2026 Preliminary roll",
         "used": "loss L, restoration R, value regained F; owner groups; return; owner change"},
        {"record": "DOR sales files (SDF)", "link": "https://floridarevenue.com/property/dataportal",
         "gives": "deed month, price, qualification", "coverage": "2008 to 2024",
         "used": "the sale clock; sold then restored against restored then sold"},
        {"record": "FEMA Individuals and Households Program", "link": "https://www.fema.gov/about/openfema/data-sets",
         "gives": "verified real-property losses by tract; owner registrants' homeowners and flood insurance",
         "coverage": f"seven seasons; {int(tcap['n_owner_reg'].sum()):,} owner registrations",
         "used": "D, the storm-struck tracts; the insured share in K"},
        {"record": "NFIP policies and claims (OpenFEMA)", "link": "https://www.fema.gov/about/openfema/data-sets",
         "gives": "policies in force at landfall; claims within 30 days, by tract",
         "coverage": f"{int(pol.min()):,} to {int(pol.max()):,} policies per season; {pct(match['with_nfip'].min())} to "
                     f"{pct(match['with_nfip'].max())} of tract-seasons matched",
         "used": "NFIP penetration; claims per damaged house"},
        {"record": "American Community Survey, 5-year", "link": "https://www.census.gov/programs-surveys/acs",
         "gives": "tract median income, tenure, age", "coverage": "2011 to 2023", "used": "income in K; controls"},
        {"record": "National Flood Hazard Layer; Census shoreline",
         "link": "https://www.fema.gov/flood-maps/national-flood-hazard-layer",
         "gives": "flood zone at the parcel centroid; distance to the shore", "coverage": "statewide",
         "used": "A and V zones; distance bands"},
        {"record": "Building permits: Cape Coral (every permit); Charlotte County (new residential construction)",
         "link": "https://capecoral-capegis.opendata.arcgis.com/",
         "gives": "issue and final dates; application and certificate of occupancy", "coverage": "2022 to 2026",
         "used": "the day-level clock; validation"},
        {"record": "HURDAT2 best tracks", "link": "https://www.nhc.noaa.gov/data/#hurdat",
         "gives": "6-hourly positions and landfall records", "coverage": "nine storms, 2016 to 2024", "used": "the maps"},
    ]
    measures = [
        ["Rolls and months", "Florida's rolls are assessed on 1 January. The storm year's roll describes each house before the "
         "storm; the four rolls after it fall about " + ", ".join(f"{m:.0f}" for m in months().values()) +
         " months after a September landfall."],
        ["Structural loss L", "One minus the house's structure value on the first roll after the storm over its value on the "
         "storm year's roll, after the county's reassessment trend (the mode of the same ratio over the county's houses). "
         "Damaged: L of .25 or more. Destroyed: .50 or more, the 50% line of the federal substantial-damage rule."],
        ["Restored and cleared", "Restored: structure value back to .90 of its pre-storm value after the county trend. "
         "Cleared: no structure on the roll. Rebuilt: a year built on or after the storm year."],
        ["Value regained F", "The fraction of the pre-storm structure value regained, capped at 1."],
        ["Owner groups", "On the storm year's roll: resident owner-occupant (an individual or trust with a homestead "
         "exemption), non-resident individual (an individual or trust without one), business entity."],
        ["Return and owner change", "Return: restored, the same owner name, the homestead exemption still on the roll. "
         "Owner change: a new owner name on any roll from the first after the storm; the deed month places a sale before "
         "or after restoration."],
        ["Storm-struck tract", "A tract with FEMA-verified real-property losses of at least 5 per 100 owner-occupied "
         "housing units (D)."],
        ["Incumbent capital K", "The mean of two standardized tract measures: the share of the tract's owner registrants "
         "reporting homeowners or flood insurance, and the log of tract median household income. NFIP policies in force "
         "at landfall per 100 owner-occupied units give an independent measure."],
        ["Population", "Houses in storm-struck tracts whose owner had held them since two rolls before the storm, so a house "
         "bought shortly before the storm to be torn down does not count as storm damage."],
    ]
    models = [
        "Linear probability models with tract-by-season fixed effects: each house is compared only with houses of its "
        "own tract after the same storm. Standard errors clustered by county, tract clusters as a check.",
        "Controls on the storm year's roll: structure value per square foot, land share of value, land value per square "
        "foot, house age, living area, mobile home, flood class, distance to the shore.",
        "H1: among restored resident homes, owner change by s+3 (the third roll after the storm, about 27 months) on a "
        "loss of .50 or more against .25 to .50.",
        "H2: among resident homes, damaged or not, return and owner change at s+2 (the second roll after the storm, about "
        "15 months) on damage, damage × K, damage × flood zone and the loss bins.",
        "H3: restoration at s+2 and s+3 on owner group, damage and their product, so the owner gap among damaged houses is "
        "read net of the same gap among undamaged houses.",
        "The tests of H1 and H2 and their reading rules were written before the outcomes were examined. H3's rule, that the "
        "business gap be significant at both horizons, was missed at s+2, so H3 is reported as a description.",
    ]
    limits = [
        "Owner type is not random; comparisons within tract and season, loss bins, controls and the undamaged reference "
        "remove much of the selection, not all. Turnover is read as a pathway, never as a cause.",
        "Capital is measured at the tract, not the house.",
        "Repair-level restoration is measured with noise, worst in Lee County; the main estimates are shown without it.",
        "The 2024 storms reach the second roll only on the 2026 Preliminary roll.",
        "Learners trained on the 2016 to 2020 storms predict recovery after Ian and Idalia poorly, so the hypotheses are "
        "read from the statistical models, not from the learners.",
    ]
    return {"data.json": {
        "records": records,
        "samples": {"total": total, "groups": groups, "balanced_k2": int(b["n"].iloc[0])},
        "measures": measures,
        "models": models,
        "validation": {
            "charlotte_kappa": float(ag["kappa"]), "charlotte_n": int(ag["n"]),
            "cape_kappa": float(v24["kappa"]), "cape_n": int(v24["n_damaged"]),
            "cape_restored_if_permit": float(v24["restored_if_permit"]), "cape_restored_if_not": float(v24["restored_if_not"]),
            "cape_median_r_if_permit": float(v24["median_R_if_permit"]), "cape_median_r_if_not": float(v24["median_R_if_not"]),
            "cape_keyed": [{"year": int(r["file_year"]), "keyed": float(r["keyed"]), "n": int(r["n"])} for _, r in dm.iterrows()],
        },
        "corr": [{"pair": r["pair"], "rho": float(r["spearman"]), "tracts": int(r["tracts"])} for _, r in corr.iterrows()],
        "hypotheses": hypotheses(),
        "learners": [{"learner": r["learner"], "train": int(r["n_train"]), "test": int(r["n_test"]),
                      "base": float(r["base_rate_test"]), "auc": float(r["auc_test"])} for _, r in auc.iterrows()],
        "limits": limits,
        "figures": [["Two clocks", "Figures 1 and 4; Table 2; Figure S13"],
                    ["The gap", "Figure 4; Table 2 and its continuation"],
                    ["Seven seasons", "Figures 2 and 5"],
                    ["Structural loss", "Figure 3; Table 3"],
                    ["Financial resources", "Figure 6; Table 4"],
                    ["Owner occupancy", "Figure 7; Table 5"],
                    ["The shore", "Section 5.5; Figure S12"],
                    ["Data and methods", "Sections 4 and 6.4; Tables 1 and 6; Appendix B"]],
    }}


def checks(files):
    v = files["data.json"]["validation"]
    s = files["data.json"]["samples"]
    return [
        check("Charlotte County: permit and new year built, kappa", num(v["charlotte_kappa"]), r"agree with a kappa of (\.\d+)"),
        {"label": "Cape Coral: finaled repair permit and restoration on the next roll, kappa (paper: below .1)",
         "site": num(v["cape_kappa"]), "paper": "below .1", "ok": v["cape_kappa"] < .1},
        check("damaged houses, all seasons and owner groups", f"{s['total']:,}", r"track ([\d,]+) damaged"),
        {"label": "of which resident owner-occupied", "site": f"{s['groups']['resident']:,}", "paper": None, "ok": True,
         "info": True},
    ]
