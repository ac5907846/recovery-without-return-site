r"""The Owner occupancy page (H3 and the extension H4): the owner cards of
Figure 7, the H3 gaps with their checks (Table 5), the Cape Coral and
Charlotte permit clocks, and the absentee neighborhoods.

Reads a15 d1_restoration.csv (seasons 2016 to 2022, the sample of
Figure 7), h5_models.csv, d10_tract_ownership.csv, d10_tract_model_k2.csv,
d10_tract_model_k3.csv; a17 d5_permit_clock.csv, d5_cox.csv,
d5_charlotte.csv.
"""

from .common import check, est, months, num, pct, rd

GROUPS = [("resident", "Resident owner-occupant", "an individual or trust with a homestead exemption"),
          ("nonresident", "Non-resident individual", "an individual or trust without one: second homes and small landlords"),
          ("business", "Business entity", "a corporation, company, partnership or trust company")]
LOSS = [(".25-.50", "Lost .25 to .50"), (".50-.75", "Lost .50 to .75"), (">=.75", "Lost .75 or more")]
VARIANTS = [("main", "main model", "pre-specified"), ("tract_clusters", "tract clusters", "check"),
            ("threshold_75", "restored at .75 of pre-storm value", "check"),
            ("threshold_100", "restored at 1.00 of pre-storm value", "check"),
            ("trend_bw02", "county trend, bandwidth .02", "check"), ("D20", "tracts with D of 20 or more", "check"),
            ("dor_code", "counties with the DOR hurricane code", "check"), ("without_2024", "without the 2024 season", "check"),
            ("added_tract_relative", "relative to the tract's undamaged houses", "added check"),
            ("added_without_Lee", "without Lee County", "added check")]
EVENTS = [("structure permit issued", "Structure permit issued"), ("structure permit finaled", "Structure permit finaled"),
          ("roof permit issued", "Roof permit issued"), ("new-house permit issued", "New-house permit issued")]
TERCILE = [("nonresident_share", "Non-resident owners' share"), ("business_share", "Business owners' share"),
           ("turnover_pre", "Turnover before the storm")]


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
        for v, label, status in VARIANTS:
            for k in (2, 3):
                x = h5[(h5["term"] == term) & (h5["variant"] == v) & (h5["horizon"] == k)]
                if len(x):
                    gaps.append({"who": who, "variant": v, "label": label, "k": k, "status": status, **est(x.iloc[0])})

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
            model.append({"k": k, "term": r["term"], **est(r)})

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

    def tri(g):
        a, b, d = (pct(r["share"]) for r in c[g]["restored"] if r["k"] in (2, 3, 4))
        return f"{a}, {b} and {d}"

    gp ={(x["who"], x["variant"], x["k"]): x for x in o["gaps"]}
    b2, b3 = gp[("business", "main", 2)], gp[("business", "main", 3)]
    n2, n3 = gp[("nonresident", "main", 2)], gp[("nonresident", "main", 3)]
    iv = lambda r: f"{num(r['lo'], 1)} to {num(r['hi'], 1)}"  # noqa: E731
    hr = o["hr"]
    pis = next(p for p in o["permits"] if p["key"] == "structure permit issued")["groups"]
    at36 = {g: next(r["share"] for r in v if r["m"] == 36) for g, v in pis.items()}
    t2 = {r["tercile"]: r for t in o["terciles"] if t["key"] == "nonresident_share" for r in t["rows"] if r["k"] == 2}
    tm = next(r for r in o["tract_model"] if r["k"] == 2 and r["term"] == "nonresident_share")
    res_cl = [r["share"] for r in c["resident"]["cleared"] if r["k"] in (2, 3, 4)]
    return [
        check("restored, residents, 15/27/39 months", tri("resident"),
              r"seasons, (\d+%, \d+% and \d+%) of resident-owned homes are restored"),
        check("restored, non-resident individuals", tri("nonresident"),
              r"against (\d+%, \d+% and \d+%) of homes owned by non-resident individuals"),
        check("restored, business entities", tri("business"), r"and (\d+%, \d+% and \d+%) of business-owned homes"),
        check("cleared lots, residents (range)", f"{num(100 * min(res_cl), 0)} to {num(100 * max(res_cl), 0)}%",
              r"cleared lots are (\d+ to \d+%) of resident homes"),
        check("H3 business at s+2", f"{num(-b2['e'], 1)} pp less often than residents at s+2 ({iv(b2)})",
              r"business entities restore ([\d.]+ pp less often than residents at s\+2 \([-.\d]+ to [-.\d]+\))"),
        check("H3 business at s+3", f"{num(-b3['e'], 1)} pp less at s+3 ({iv(b3)})", r"and ([\d.]+ pp less at s\+3 \([-.\d]+ to [-.\d]+\))"),
        check("H3 non-resident at s+2 and s+3", f"{num(-n2['e'], 1)} and {num(-n3['e'], 1)} pp less ({iv(n2)}; {iv(n3)})",
              r"non-resident individuals ([\d.]+ and [\d.]+ pp less \([-.\d]+ to [-.\d]+; [-.\d]+ to [-.\d]+\))"),
        check("Cape Coral HR, business", f"{num(hr['business']['hr'])} times the hazard of a resident ({num(hr['business']['lo'])} to {num(hr['business']['hi'])})",
              r"permit at (\.\d+ times the hazard of a resident \(\.\d+ to \.\d+\))"),
        check("Cape Coral HR, non-resident", f"{num(hr['nonresident']['hr'])} ({num(hr['nonresident']['lo'])} to {num(hr['nonresident']['hi'])})",
              r"a non-resident individual at (\.\d+ \(\.\d+ to \.\d+\))"),
        check("Cape Coral permit within 36 months: residents and businesses", f"{pct(at36['resident'])} of resident-owned damaged houses had a permit within 36 months against {pct(at36['business'])}",
              r"(\d+% of resident-owned damaged houses had a permit within 36 months against \d+%)"),
        check("H4 restored at 15 months: most and least absentee thirds", f"{pct(t2['high']['restored'])} at 15 months against {pct(t2['low']['restored'])}",
              r"restored at (\d+% at 15 months against \d+%)"),
        check("H4 non-resident share, per unit share", f"{num(tm['e'], 0)} pp per unit share, {num(tm['lo'], 0)} to {num(tm['hi'], 0)}",
              r"carries the gradient \(([-\d]+ pp per unit share, [-\d]+ to [-\d]+)\)"),
        {"label": "every H3 variant has the business sign (paper: 'Every variant has the sign')",
         "site": ", ".join(f"{v} s+{k} {num(x['e'], 1)}" for (w, v, k), x in gp.items() if w == "business" and x["e"] >= 0) or "all negative",
         "paper": "all negative", "ok": all(x["e"] < 0 for (w, v, k), x in gp.items() if w == "business")},
    ]
