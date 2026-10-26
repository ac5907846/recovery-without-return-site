r"""The Structural loss page (H1): the five recovery pathways of an L75
home (Figure 3) and the estimates of Table 4, the main specification and
the alternative specifications of Section 4.5.

Reads a18 paths_3d.csv, threshold_checks.csv, continuous.csv; a15
h7_models.csv, h7b_cap_terms.csv.
"""

from .common import check, check_groups, est, months, num, pct, q, rd

PATHS = [("recovery with return", "Restored, original owner", "restored under the original owner"),
         ("recovery without return", "Restored, new owner", "restored under new ownership: recovery without return"),
         ("stranded incumbent", "Unrestored, original owner", "not restored, the original owner recorded"),
         ("unresolved transition", "Unrestored, new owner", "not restored, a new owner recorded"),
         ("cleared lot", "Cleared lot", "no structure on the fourth roll")]


def paths():
    p = rd("a18_two_clocks", "paths_3d.csv").set_index("path")
    out = []
    for key, label, d in PATHS:
        r = p.loc[key]
        rolls = []
        for k in (1, 2, 3, 4):
            pv = r.get(f"p_vs_recovery_{k}") if key == "recovery without return" else (
                r.get(f"p_vs_stranded_{k}") if key == "unresolved transition" else None)
            rolls.append({"k": k, "F": float(r[f"F_{k}"]), "lo": float(r[f"F_{k}_lo"]), "hi": float(r[f"F_{k}_hi"]),
                          "changed": float(r[f"changed_{k}"]), "cleared": float(r[f"cleared_{k}"]),
                          "p": None if pv is None or pv != pv else float(pv)})
        out.append({"key": key, "label": label, "def": d, "n": int(r["n"]), "share": float(r["share"]),
                    "lo": float(r["share_lo"]), "hi": float(r["share_hi"]), "rolls": rolls})
    r = p.iloc[0]
    head = {"rwr": float(r["rwr_among_restored"]), "lo": float(r["rwr_lo"]), "hi": float(r["rwr_hi"]),
            "ref": float(r["rwr_ref_25_50"]), "p": float(r["rwr_p_vs_ref"])}
    return out, head


def estimates():
    """Every row of Table 4: main = the main specification, alt = an alternative specification."""
    h7 = rd("a15_recovery_tests", "h7_models.csv")
    th = rd("a18_two_clocks", "threshold_checks.csv")
    cont = rd("a18_two_clocks", "continuous.csv")
    c1 = cont[cont["model"].str.startswith("P1")].set_index("term")
    rows = []

    def add(group, label, row, main=False, **kw):
        rows.append({"group": group, "label": label, "main": main, **est(row, **kw)})

    add("owner", "Main model: OC at t + 3 (about 27 months), R ≥90%", q(h7, term="g50", part="a", horizon=3, cluster="county"), True)
    add("owner", "OC at t + 2 (about 15 months), R ≥90%", q(h7, term="g50", part="a", horizon=2, cluster="county"))
    add("owner", "OC at t + 3, tract clusters", q(h7, term="g50", part="a", horizon=3, cluster="tract"))
    for _, r in th[th["test"].str.startswith("H7")].iterrows():
        add("owner", f"OC at t + 3, R ≥{100 * r['threshold']:.0f}%", r)
    add("owner", "OC at t + 3, tract-adjusted R ≥90%", q(h7, term="g50", part="a_added_tract_relative", horizon=3))
    add("owner", "OC at t + 3, without Lee County", q(h7, term="g50", part="a_added_without_Lee", horizon=3))
    for t, label in (("g50", "L50"), ("changed", "OC at t + 3"), ("g50_x_changed", "L50 × OC at t + 3")):
        add("value", label, c1.loc[t], True)
    add("area", "Rebuilt floor area, new vs. original owner (%)", q(h7, part="b", term="changed"), True)
    return rows


def build():
    p, head = paths()
    cap = rd("a15_recovery_tests", "h7b_cap_terms.csv").set_index("owner")
    return {"loss.json": {
        "months": months(),
        "paths": p,
        "headline": head,
        "estimates": estimates(),
        "cap": [{"owner": o, "n": int(cap.loc[o, "n"]), "within": float(cap.loc[o, "within_cap"]),
                 "lo": float(cap.loc[o, "ci_low"]), "hi": float(cap.loc[o, "ci_high"]),
                 "area_ratio": float(cap.loc[o, "median_area_ratio"])} for o in ("pre-storm owner", "new owner")],
    }}


def checks(files):
    s = files["loss.json"]
    e = {r["label"]: r for r in s["estimates"]}
    main = e["Main model: OC at t + 3 (about 27 months), R ≥90%"]
    s2 = e["OC at t + 2 (about 15 months), R ≥90%"]
    g50, ch, gx = e["L50"], e["OC at t + 3"], e["L50 × OC at t + 3"]
    area = e["Rebuilt floor area, new vs. original owner (%)"]
    cap = {c["owner"]: c for c in s["cap"]}
    ci = lambda r: f"[{num(r['lo'], 1)}, {num(r['hi'], 1)}]"  # noqa: E731
    return [
        check("H1 main: L50 on ownership change at 27 months (pp)", num(main["e"], 1), r"L50 properties were ([\d.]+) pp more likely"),
        check("H1 main: 95% CI", f"95% CI {ci(main)}", r"L50 properties were [\d.]+ pp more likely to be under new ownership than those in the "
                                                        r"25% ≤ \*L\* <50% category \((95% CI \[[-.\d]+, [-.\d]+\])"),
        check("H1 main: sample mean", pct(main["base"]), r"relative to a sample mean of (\d+%)"),
        check("H1 at 15 months (pp)", num(s2["e"], 1), r"also significant at 15 months \(([\d.]+) pp\)"),
        check("capped R: L50 among homes without ownership change (pp)", num(-g50["e"], 1), r"L50 properties had a capped \*R\* ([\d.]+) pp lower"),
        check("capped R: L50, 95% CI", f"95% CI {ci(g50)}", r"L50 properties had a capped \*R\* [\d.]+ pp lower than those in the 25% ≤ \*L\* <50% category \((95% CI \[[-.\d]+, [-.\d]+\])"),
        check("capped R: ownership change in the 25% ≤ L <50% category (pp)", num(ch["e"], 1), r"not significantly associated with capped \*R\* \(([-.\d]+) pp;"),
        check("capped R: L50 × ownership change (pp)", num(gx["e"], 1), r"interaction with L50 was negative and significant \(([-.\d]+) pp;"),
        check("capped R: L50 × ownership change, 95% CI", f"95% CI {ci(gx)}", r"interaction with L50 was negative and significant \([-.\d]+ pp; (95% CI \[[-.\d]+, [-.\d]+\])"),
        check("rebuilt floor area, new vs. original owner (log points)", num(area["e"], 1), r"had ([\d.]+) log points"),
        check_groups("within the assessment-cap size limits: original, new owners", f"{pct(cap['pre-storm owner']['within'])}, {pct(cap['new owner']['within'])}",
                     r"size limits \((\d+%) and (\d+%), respectively\)"),
        check("Figure 3 sample: L75 resident owner-occupied homes, 2016-2021", f"{sum(p['n'] for p in s['paths']):,}",
              r"five recovery pathways among ([\d,]+) previously owner-occupied L75 homes"),
    ]
