r"""The Owner occupancy page (H3a and the exploratory H3b): the owner
cards of Figure 7, the estimates of Table 6 with the alternative
specifications of Section 4.5, the Cape Coral and Charlotte permit clocks,
and the neighborhood-level extension.

Reads a15 d1_restoration.csv (seasons 2016 to 2022, the sample of
Figure 7), h5_models.csv, d10_tract_ownership.csv, d10_tract_model_k2.csv,
d10_tract_model_k3.csv; a17 d5_permit_clock.csv, d5_cox.csv,
d5_charlotte.csv.
"""

from .common import check, check_groups, est, months, num, pct, rd

GROUPS = [("resident", "Resident owner-occupant", "an individual or trust with a homestead exemption on the storm-year roll"),
          ("nonresident", "Nonresident individual", "an individual or trust without a homestead exemption"),
          ("business", "Business entity", "a corporate or other business owner")]
LOSS = [(".25-.50", "25% ≤ L <50%"), (".50-.75", "50% ≤ L <75%"), (">=.75", "L ≥75%")]
# the main specification and the alternative specifications of Section 4.5
VARIANTS = [("main", "Main model, R ≥90%", True), ("tract_clusters", "Tract clusters", False),
            ("threshold_75", "R ≥75%", False), ("threshold_100", "R ≥100%", False),
            ("trend_bw02", "Wider reassessment-trend bandwidth", False), ("D20", "Tracts with D ≥20", False),
            ("dor_code", "Homes carrying the DOR hurricane code", False), ("without_2024", "Seasons before 2024", False),
            ("added_tract_relative", "Tract-adjusted R ≥90%", False), ("added_without_Lee", "Without Lee County", False)]
EVENTS = [("structure permit issued", "Structure permit issued"), ("structure permit finaled", "Structure permit finaled"),
          ("roof permit issued", "Roof permit issued"), ("new-house permit issued", "New-house permit issued")]
TERCILE = [("nonresident_share", "Nonresident ownership share"), ("business_share", "Business ownership share"),
           ("turnover_pre", "Pre-storm ownership turnover")]


def d1():
    d = rd("a15_recovery_tests", "d1_restoration.csv", low_memory=False)
    return d[d["sample"] == "2016-2022"]


def series(d, by, level, measure):
    x = d[(d["by"] == by) & (d[by] == level) & (d["measure"] == measure)].sort_values("k")
    return [{"k": int(r["k"]), "share": float(r["share"]), "lo": float(r["ci_low"]), "hi": float(r["ci_high"]),
             "n": int(r["n"])} for _, r in x.iterrows()]


def build():
    d = d1()
    h5 = rd("a15_recovery_tests", "h5_models.csv")
    pc = rd("a17_permit_timing", "d5_permit_clock.csv")
    cox = rd("a17_permit_timing", "d5_cox.csv").set_index("term")
    ch = rd("a17_permit_timing", "d5_charlotte.csv")
    t10 = rd("a15_recovery_tests", "d10_tract_ownership.csv")

    cards = []
    for g, label, d_ in GROUPS:
        cards.append({"key": g, "label": label, "def": d_,
                      "n": next(r["n"] for r in series(d, "group", g, "restored") if r["k"] == 2),
                      "restored": series(d, "group", g, "restored"), "cleared": series(d, "group", g, "cleared"),
                      "rebuilt": series(d, "group", g, "rebuilt")})
    loss = []
    for lb, label in LOSS:
        loss.append({"key": lb, "label": label,
                     "n": next(r["n"] for r in series(d, "loss_bin", lb, "restored") if r["k"] == 2),
                     "restored": series(d, "loss_bin", lb, "restored"), "cleared": series(d, "loss_bin", lb, "cleared"),
                     "rebuilt": series(d, "loss_bin", lb, "rebuilt")})

    gaps = []
    for term, who in (("business_x_damaged", "business"), ("nonresident_x_damaged", "nonresident")):
        for v, label, main in VARIANTS:
            for k in (2, 3):
                x = h5[(h5["term"] == term) & (h5["variant"] == v) & (h5["horizon"] == k)]
                if len(x):
                    gaps.append({"who": who, "variant": v, "label": label, "k": k, "main": main, **est(x.iloc[0])})

    permits = []
    for ev, label in EVENTS:
        x = pc[(pc["by"] == "damaged+group") & (pc["damaged"] == "damaged") & (pc["event"] == ev)]
        permits.append({"key": ev, "label": label,
                        "groups": {g: [{"m": int(r["months"]), "share": float(r["share"]), "lo": float(r["ci_low"]),
                                        "hi": float(r["ci_high"]), "n": int(r["n"])}
                                       for _, r in x[x["group"] == g].sort_values("months").iterrows()]
                                   for g, _, _ in GROUPS}})
    hr = {t: {"hr": float(cox.loc[t, "hr"]), "lo": float(cox.loc[t, "hr_ci_low"]), "hi": float(cox.loc[t, "hr_ci_high"]),
              "p": float(cox.loc[t, "p"]), "n": int(cox.loc[t, "n"]), "events": int(cox.loc[t, "events"])}
          for t in ("business", "nonresident", "sfha", "b50", "b75")}
    charlotte = []
    for ev in ("new-construction application", "new-construction permit issued", "certificate of occupancy"):
        x = ch[(ch["loss_bin"] == ">=.75") & (ch["event"] == ev)]
        charlotte.append({"key": ev, "groups": {g: [{"m": int(r["months"]), "share": float(r["share"]), "n": int(r["n"])}
                                                    for _, r in x[x["group"] == g].sort_values("months").iterrows()]
                                                for g, _, _ in GROUPS}})
    ag = ch[ch["event"].astype(str).str.startswith("agreement")].iloc[0]

    terciles = []
    for by, label in TERCILE:
        x = t10[(t10["by"] == by)]
        terciles.append({"key": by, "label": label,
                         "rows": [{"k": int(r["k"]), "tercile": r["tercile"], "tracts": int(r["tracts"]),
                                   "houses": int(r["damaged_houses"]), "restored": float(r["restored_share"]),
                                   "mean": float(r["mean_of_measure"])} for _, r in x.iterrows()]})
    model = []
    for k in (2, 3):
        m = rd("a15_recovery_tests", f"d10_tract_model_k{k}.csv")
        for _, r in m.iterrows():
            # shares enter as fractions; the paper reports the ownership shares per 10 percentage points (scale 10),
            # mean structural loss per 10 points too, and tract exposure D per unit of its log (the model term)
            scale = 10 if r["term"] in ("nonresident_share", "business_share", "turnover_pre", "mean_loss") else 100
            model.append({"k": k, "term": r["term"], **est(r, scale=scale)})

    return {"owners.json": {
        "months": months(),
        "groups": [{"key": g, "label": lab, "def": d_} for g, lab, d_ in GROUPS],
        "cards": cards, "loss": loss, "gaps": gaps,
        "permits": permits, "hr": hr, "charlotte": charlotte,
        "charlotte_kappa": float(ag["kappa"]), "charlotte_n": int(ag["n"]),
        "terciles": terciles, "tract_model": model,
    }}


def checks(files):
    o = files["owners.json"]
    c = {x["key"]: x for x in o["cards"]}
    gp = {(x["who"], x["variant"], x["k"]): x for x in o["gaps"]}
    b2, b3 = gp[("business", "main", 2)], gp[("business", "main", 3)]
    n2, n3 = gp[("nonresident", "main", 2)], gp[("nonresident", "main", 3)]
    hr = o["hr"]
    pis = next(p for p in o["permits"] if p["key"] == "structure permit issued")["groups"]
    at36 = {g: next(r["share"] for r in v if r["m"] == 36) for g, v in pis.items()}
    t2 = {r["tercile"]: r for t in o["terciles"] if t["key"] == "nonresident_share" for r in t["rows"] if r["k"] == 2}
    tm2 = next(r for r in o["tract_model"] if r["k"] == 2 and r["term"] == "nonresident_share")
    tm3 = next(r for r in o["tract_model"] if r["k"] == 3 and r["term"] == "nonresident_share")
    res_cl = [r["share"] for r in c["resident"]["cleared"] if r["k"] in (2, 3, 4)]
    abs_cl = [r["share"] for g in ("nonresident", "business") for r in c[g]["cleared"] if r["k"] in (2, 3, 4)]
    rng = lambda a: f"{num(100 * min(a), 0)}% to {num(100 * max(a), 0)}%"  # noqa: E731
    r4 = lambda g: pct(next(r["share"] for r in c[g]["restored"] if r["k"] == 4))  # noqa: E731
    ci = lambda r: f"95% CI [{num(r['lo'], 1)}, {num(r['hi'], 1)}]"  # noqa: E731
    return [
        check_groups("restored within 39 months: residents, nonresident individuals, business entities",
                     f"{r4('resident')}, {r4('nonresident')}, {r4('business')}",
                     r"(\d+%) of resident owner-occupied homes were restored within 39 months, compared with (\d+%) of homes "
                     r"owned by nonresident individuals and (\d+%) owned by business entities"),
        check_groups("cleared lots: residents, nonresident owners", f"{rng(res_cl)}, {rng(abs_cl)}",
                     r"only (\d+% to \d+%) of resident-owned properties, compared with (\d+% to \d+%)"),
        check_groups("H3a: nonresident individuals at 15 and 27 months (pp less likely)", f"{num(-n2['e'], 1)}, {num(-n3['e'], 1)}",
                     r"nonresident individuals were ([\d.]+) pp less likely to have restored their homes at 15 months and ([\d.]+) pp less likely at 27 months"),
        check_groups("H3a: business entities at 15 and 27 months (pp)", f"{num(b2['e'], 1)}, {num(b3['e'], 1)}",
                     r"not statistically significant at 15 months \(([-.\d]+) pp; p = \.\d+\) and became significant at 27 months \(([-.\d]+) pp;"),
        check_groups("Cape Coral hazard ratios: business, nonresident", f"{num(hr['business']['hr'])}, {num(hr['nonresident']['hr'])}",
                     r"\(hazard ratio \[HR\] = (\.\d+); 95% CI \[\.\d+, \.\d+\]\), as did nonresident individuals \(HR = (\.\d+);"),
        check_groups("Cape Coral HR 95% CIs: business, nonresident",
                     f"[{num(hr['business']['lo'])}, {num(hr['business']['hi'])}], [{num(hr['nonresident']['lo'])}, {num(hr['nonresident']['hi'])}]",
                     r"\(hazard ratio \[HR\] = \.\d+; 95% CI (\[\.\d+, \.\d+\])\), as did nonresident individuals \(HR = \.\d+; 95% CI (\[\.\d+, \.\d+\])"),
        check_groups("structure permit within 36 months: residents, nonresident, business",
                     f"{pct(at36['resident'])}, {pct(at36['nonresident'])}, {pct(at36['business'])}",
                     r"Within 36 months, (\d+%) of L25 resident-owned properties had received a structure permit, compared with (\d+%) of "
                     r"nonresident-owned and (\d+%) of business-owned"),
        check_groups("H3b: restored at 15 months, highest and lowest third of nonresident ownership",
                     f"{pct(t2['high']['restored'])}, {pct(t2['low']['restored'])}",
                     r"restoration reached (\d+%) in the third of census tracts with the highest nonresident ownership, compared with (\d+%)"),
        check("H3b: nonresident share, pp lower per 10 points, 15 months", num(-tm2["e"], 1),
              r"10-percentage-point higher nonresident ownership share was associated with a ([-.\d]+)-pp lower restored share"),
        check("the same, 95% CI", ci(tm2), r"lower restored share \((95% CI \[[-.\d]+, [-.\d]+\])"),
        check("H3b at 27 months (pp per 10 points)", num(tm3["e"], 1), r"at 27 months, the association was weaker \(([-.\d]+) pp;"),
        check("the same, 95% CI", ci(tm3), r"at 27 months, the association was weaker \([-.\d]+ pp; (95% CI \[[-.\d]+, [-.\d]+\])"),
        check("Charlotte County: permit and roll year built, kappa", num(ag_kappa(o)), r"construction years recorded in the assessment rolls \(κ = (\.\d+)\)"),
    ]


def ag_kappa(o):
    return o["charlotte_kappa"]
