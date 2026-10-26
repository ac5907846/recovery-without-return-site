r"""The Data and methods page: the records (Table 1), the sample, the
measures (Section 4.3), the validation (Section 4.4), the models (Section
4.5), the hypotheses with their main estimates (Tables 4 to 6) and the
limitations (Section 7).

Reads a14 tract_capital.csv; a15 d1_restoration.csv, h7_models.csv,
h6_models.csv, h5_models.csv, d10_tract_model_k2.csv; a17
d5_validation.csv, d5_charlotte.csv, d5_match.csv; a18 nfip_tract.csv,
nfip_match.csv, nfip_tests.csv, continuous.csv, capital_corr.csv.
"""

from .common import check, check_groups, est, months, num, pct, q, rd


def ci(r, d=1):
    return f"{num(r['e'], d)} [{num(r['lo'], d)}, {num(r['hi'], d)}]"


def hypotheses():
    """One row per hypothesis and outcome, in the words of Section 3.2 and the estimates of Tables 4 to 6."""
    h7 = rd("a15_recovery_tests", "h7_models.csv")
    h6 = rd("a15_recovery_tests", "h6_models.csv")
    h5 = rd("a15_recovery_tests", "h5_models.csv")
    nt = rd("a18_two_clocks", "nfip_tests.csv")
    cont = rd("a18_two_clocks", "continuous.csv")
    c2 = cont[cont["model"].str.startswith("P2")].set_index("term")
    cox = rd("a17_permit_timing", "d5_cox.csv").set_index("term")
    tm = rd("a15_recovery_tests", "d10_tract_model_k2.csv").set_index("term")
    rows = []

    def add(h, name, evidence, r, unit="pp", table="", scale=100):
        e = est(r, scale=scale)
        rows.append({"h": h, "name": name, "evidence": evidence, "estimate": f"{ci(e, 2 if unit == 'HR' else 1)}",
                     "unit": unit, "p": e.get("p"), "table": table})

    add("H1", "H1: structural loss", "L50 on ownership change among restored resident homes, t + 3",
        q(h7, term="g50", part="a", horizon=3, cluster="county"), table="Table 4")
    add("H1", "H1: structural loss", "the same at t + 2", q(h7, term="g50", part="a", horizon=2, cluster="county"), table="Table 4")
    add("H2", "H2: financial resources", "L25 × K on restoration under original ownership, t + 2",
        q(h6, outcome="return", capital="K", cluster="county", term="damaged_x_K"), table="Table 5")
    add("H2", "H2: financial resources", "L25 × K on ownership change, t + 2",
        q(h6, outcome="changed", capital="K", cluster="county", term="damaged_x_K"), table="Table 5")
    add("H2", "H2: financial resources", "L25 × NFIP penetration on restoration under original ownership, t + 2",
        q(nt, outcome="return", measure="NFIP penetration"), table="Table 5")
    add("H2", "H2: financial resources", "L25 × K on capped R, t + 2", c2.loc["damaged_x_K"], table="Table 5")
    for k in (2, 3):
        add("H3a", "H3a: property-level residential occupancy", f"NI × L25 on restoration, t + {k}",
            q(h5, term="nonresident_x_damaged", horizon=k, variant="main"), table="Table 6")
        add("H3a", "H3a: property-level residential occupancy", f"BE × L25 on restoration, t + {k}",
            q(h5, term="business_x_damaged", horizon=k, variant="main"), table="Table 6")
    for t, name in (("nonresident", "nonresident individual"), ("business", "business entity")):
        c = cox.loc[t]
        rows.append({"h": "H3a", "name": "H3a: property-level residential occupancy",
                     "evidence": f"Cape Coral: hazard ratio of the first structure permit, {name}",
                     "estimate": f"{num(c['hr'], 2)} [{num(c['hr_ci_low'], 2)}, {num(c['hr_ci_high'], 2)}]", "unit": "HR",
                     "p": float(c["p"]), "table": "Table 6"})
    add("H3b", "H3b: neighborhood-level extension (exploratory)",
        "nonresident ownership share of the tract on its restored share of L25 homes, t + 2, per 10 points",
        tm.loc["nonresident_share"], scale=10)
    return rows


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
    corr = rd("a18_two_clocks", "capital_corr.csv")

    records = [
        {"record": "DOR assessment rolls (NAL)", "link": "https://floridarevenue.com/property/dataportal",
         "gives": "property and land values, building characteristics, ownership and homestead status",
         "coverage": "all 67 counties; final rolls 2009 to 2025 and the preliminary 2026 roll",
         "used": "structural loss L, restoration, capped R, owner type, ownership change"},
        {"record": "DOR sales records (SDF)", "link": "https://floridarevenue.com/property/dataportal",
         "gives": "transaction dates and sale prices", "coverage": "2008 to 2024",
         "used": "sales for value and their timing relative to restoration"},
        {"record": "FEMA Individuals and Households Program", "link": "https://www.fema.gov/about/openfema/data-sets",
         "gives": "verified real-property losses and reported insurance coverage, by census tract",
         "coverage": f"seven hurricane seasons; {int(tcap['n_owner_reg'].sum()):,} owner registrations",
         "used": "tract exposure D; the insured share of the financial resources index"},
        {"record": "NFIP policies and claims (OpenFEMA)", "link": "https://www.fema.gov/about/openfema/data-sets",
         "gives": "policies in force at landfall and claims within 30 days, by census tract",
         "coverage": f"{int(pol.min()):,} to {int(pol.max()):,} policies per season; {pct(match['with_nfip'].min())} to "
                     f"{pct(match['with_nfip'].max())} of tract-seasons matched",
         "used": "NFIP penetration; NFIP claims"},
        {"record": "American Community Survey, five-year estimates", "link": "https://www.census.gov/programs-surveys/acs",
         "gives": "median household income and owner-occupied housing units, by census tract", "coverage": "2011 to 2023",
         "used": "the income component of the index; denominators of D and NFIP penetration"},
        {"record": "National Flood Hazard Layer; Census shoreline",
         "link": "https://www.fema.gov/flood-maps/national-flood-hazard-layer",
         "gives": "flood hazard zone at the parcel centroid; distance to the shoreline", "coverage": "statewide",
         "used": "SFHA, A and V zones; coastal proximity"},
        {"record": "Cape Coral and Charlotte County building permits",
         "link": "https://capecoral-capegis.opendata.arcgis.com/",
         "gives": "permit applications, issuance and completion; new residential construction", "coverage": "2022 to 2026",
         "used": "reconstruction timing; validation of the assessment-based measures"},
        {"record": "HURDAT2 best tracks", "link": "https://www.nhc.noaa.gov/data/#hurdat",
         "gives": "6-hourly positions and landfall records", "coverage": "nine storms, 2016 to 2024", "used": "the maps (Figure 2)"},
    ]
    measures = [
        ["Rolls and months", "Assessment rolls record conditions as of January 1. The roll of the hurricane year, t, is the pre-storm "
         "baseline; t + 1 to t + 4 are the first four post-storm rolls, about " + ", ".join(f"{m:.0f}" for m in months().values()) +
         " months after a September landfall."],
        ["Structural loss (L)", "The proportional decline in assessed structural value between the pre-storm and the first post-storm "
         "roll, adjusted for the countywide reassessment trend (the modal ratio of post-storm to pre-storm structural values). "
         "L25, L50 and L75 mark losses of at least 25%, 50% and 75%; homes with L <10% are the unaffected comparison group, and "
         "homes with 10% ≤ L <25% are excluded from comparisons with it."],
        ["Restored, cleared, rebuilt", "A property is restored on roll t + k when its structural value ratio R is at least 90% of the "
         "pre-storm value after the reassessment trend (R ≥75% and R ≥100% as sensitivity analyses). Cleared: no structure recorded. "
         "Rebuilt: a construction year equal to or later than the storm year."],
        ["Capped R", "The structural value ratio capped at 100%, a continuous measure of physical recovery."],
        ["Owner type", "On the pre-storm roll: resident owner-occupied (an individual or trust with a homestead exemption), "
         "nonresident individually owned (without one), business-owned (a corporate or other business entity)."],
        ["Ownership change (OC) and restoration under original or new ownership (RO, RN)", "OC is one when a different owner is "
         "recorded on any post-storm roll up to t + k. RO requires restoration, no ownership change and a retained homestead "
         "exemption; RN, restoration under new ownership, is what the study calls recovery without return. Sales for value are "
         "deeds priced at least 10% of the pre-storm just value and place a transfer before or after restoration."],
        ["Tract exposure (D)", "FEMA-verified real-property losses per 100 owner-occupied housing units in a census tract and "
         "season; affected tracts have D ≥5."],
        ["Financial resources index (K)", "The mean of two components standardized within season: the insured share (IHP owner "
         "registrants reporting homeowners or flood insurance) and tract income (the log of census-tract median household income). "
         "NFIP penetration, policies in force at landfall per 100 owner-occupied units, is an independent measure of insurance coverage."],
        ["Sample", "Single-family houses and mobile homes in affected tracts, under the same ownership for at least two rolls before "
         "the storm with no sale for value from the second calendar year before the storm to landfall, so planned redevelopment is "
         "not read as hurricane-related structural loss."],
    ]
    models = [
        "Linear probability models with census-tract-by-hurricane-season fixed effects, so each home is compared with homes of the "
        "same tract after the same storm. Standard errors clustered at the county level; tract clusters as a robustness analysis. "
        "Coefficients in percentage points (pp).",
        "Controls measured before the storm: structural value per square foot, land share of value, land value per square foot, "
        "building age, living area, housing type, flood zone and distance to the shoreline.",
        "Eq. (1), H1: among L25 resident owner-occupied homes restored on roll t + k, ownership change on L50, with k = 3 as the "
        "main specification and k = 2 also reported.",
        "Eq. (2), H2: among L25 and unaffected resident owner-occupied homes, restoration under original ownership or ownership "
        "change at t + 2 on L25, L25 × K and L25 × SFHA.",
        "Eq. (3), H3a: among L25 and unaffected homes, restoration at t + 2 and t + 3 on owner type, L25 and their interactions, "
        "so the owner-type gap among L25 homes is read relative to the same gap among unaffected homes; a Cox model of the first "
        "Cape Coral structure permit, stratified by tract, compares reconstruction timing.",
        "H3b (exploratory): the restored share of L25 homes in each tract on the nonresident and business ownership shares, "
        "pre-storm turnover, mean structural loss and D, with county-by-season fixed effects and weights.",
        "Alternative specifications (Figure S3; Tables S2 and S3): tract clusters, R ≥75% and R ≥100%, a wider reassessment-trend "
        "bandwidth, tracts with D ≥20, homes carrying the DOR hurricane code, the seasons before 2024, tract-adjusted restoration, "
        "the sample without Lee County, and every county and season omitted in turn.",
    ]
    limits = [
        "Differences across owner types may reflect unobserved factors; the comparisons are within tract and season with controls, "
        "and the relationships are observational.",
        "Financial resources are measured at the neighborhood (tract) level, not for the household.",
        "Annual assessments capture major structural loss and replacement more reliably than the completion of individual repairs; "
        "the main estimates are also shown without Lee County and with tract-adjusted restoration.",
        "Ownership change is a recorded ownership transition, not an observed household return, relocation or displacement.",
        "The 2024 season is observed only to the preliminary 2026 roll; the main associations held across county exclusions but "
        "were more sensitive to the exclusion of individual hurricane seasons (Tables S2 and S3).",
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
        "limits": limits,
        "figures": [["Two clocks", "Figures 1, 3 and 4; Table 2"],
                    ["The gap", "Figure 4; Tables 2 and 3; Figure S5"],
                    ["Seven seasons", "Figures 2 and 5"],
                    ["Structural loss", "Figure 3; Table 4"],
                    ["Financial resources", "Figure 6; Table 5; Table S4"],
                    ["Owner occupancy", "Figure 7; Table 6"],
                    ["The shore", "Figure S6"],
                    ["Data and methods", "Table 1; Sections 4 and 7; Tables S1 to S3"]],
    }}


def checks(files):
    v = files["data.json"]["validation"]
    s = files["data.json"]["samples"]
    g = s["groups"]
    return [
        check("Charlotte County: permit and roll year built, kappa", num(v["charlotte_kappa"]),
              r"construction years recorded in the assessment rolls \(κ = (\.\d+)\)"),
        check("Cape Coral: finaled structure permit and restoration on the next roll, kappa", num(v["cape_kappa"]),
              r"on the following assessment roll was low \(κ = (\.\d+)\)"),
        check("L25 homes, seven seasons", f"{s['total']:,}", r"includes ([\d,]+) homes with structural losses of at least 25%"),
        check_groups("resident owner-occupied, nonresident individually owned, business-owned",
                     f"{g['resident']:,}, {g['nonresident']:,}, {g['business']:,}",
                     r"([\d,]+) resident owner-occupied, ([\d,]+) nonresident individually owned, and ([\d,]+) business-owned"),
        check("the owner-type comparison sample at the second post-storm roll, 2016-2022", f"{s['balanced_k2']:,}",
              r"use ([\d,]+) of these properties observed at the second post-storm assessment"),
    ]
