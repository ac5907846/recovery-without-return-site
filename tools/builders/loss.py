r"""The Structural loss page (H1): the five paths of a destroyed home
(Figure 3) and every H1 estimate with its checks (Table 3).

Reads a18 paths_3d.csv, threshold_checks.csv, continuous.csv; a15
h7_models.csv, h7b_cap_terms.csv.
"""

from .common import check, est, months, num, pct, q, rd

PATHS = [("recovery with return", "Recovery with return", "restored, the pre-storm owner back with the homestead"),
         ("recovery without return", "Recovery without return", "restored, under a new owner"),
         ("stranded incumbent", "Stranded incumbent", "not restored, the pre-storm owner still there"),
         ("unresolved transition", "Unresolved transition", "not restored, under a new owner"),
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
    h7 = rd("a15_recovery_tests", "h7_models.csv")
    th = rd("a18_two_clocks", "threshold_checks.csv")
    cont = rd("a18_two_clocks", "continuous.csv")
    c1 = cont[cont["model"].str.startswith("P1")].set_index("term")
    rows = []

    def add(group, label, row, status, **kw):
        rows.append({"group": group, "label": label, "status": status, **est(row, **kw)})

    add("owner", "loss .50 or more vs .25 to .50, s+3 (about 27 months)", q(h7, term="g50", part="a", horizon=3, cluster="county"),
        "pre-specified")
    add("owner", "the same, s+2 (about 15 months)", q(h7, term="g50", part="a", horizon=2, cluster="county"), "check")
    add("owner", "the same, tract clusters", q(h7, term="g50", part="a", horizon=3, cluster="tract"), "check")
    for _, r in th[th["test"].str.startswith("H7")].iterrows():
        add("owner", f"the same, restored at {num(r['threshold'], 2)} of pre-storm value", r, "check")
    add("owner", "the same, relative to the tract's undamaged houses", q(h7, term="g50", part="a_added_tract_relative", horizon=3),
        "added check")
    add("owner", "the same, without Lee County", q(h7, term="g50", part="a_added_without_Lee", horizon=3), "added check")
    for t, label in (("g50", "loss .50 or more"), ("changed", "owner changed"), ("g50_x_changed", "loss .50 or more × owner changed")):
        add("value", label, c1.loc[t], "pre-specified, reported")
    add("area", "rebuilt floor area, new owner vs pre-storm owner (%)", q(h7, part="b", term="changed"), "pre-specified")
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
    main = e["loss .50 or more vs .25 to .50, s+3 (about 27 months)"]
    s2 = e["the same, s+2 (about 15 months)"]
    t75 = e["the same, restored at .75 of pre-storm value"]
    t100 = e["the same, restored at 1.00 of pre-storm value"]
    g50, ch, gx = e["loss .50 or more"], e["owner changed"], e["loss .50 or more × owner changed"]
    area = e["rebuilt floor area, new owner vs pre-storm owner (%)"]
    cap = {c["owner"]: c for c in s["cap"]}
    h = s["headline"]
    return [
        check("H1 at s+3 (pp)", num(main["e"], 1), r"a new owner is ([\d.]+) percentage points \(pp\) more likely at s\+3"),
        check("H1 at s+3: base rate", pct(main["base"]), r"more likely at s\+3 on a base of (\d+%)"),
        check("H1 at s+3: interval", f"{num(main['lo'], 1)} to {num(main['hi'], 1)}", r"quarter to a half \(([-.\d]+ to [-.\d]+); [\d,]+ homes\)"),
        check("H1 at s+3: homes", f"{main['n']:,}", r"\([-.\d]+ to [-.\d]+; ([\d,]+) homes\)"),
        check("H1 at s+2 (pp)", num(s2["e"], 1), r"homes\), ([\d.]+) pp at s\+2"),
        check("H1 restored at .75", num(t75["e"], 1), r"([\d.]+) at a restoration threshold of \.75"),
        check("H1 restored at 1.00", num(t100["e"], 1), r"and ([\d.]+) at 1\.00"),
        check("value regained: loss .50 or more (interval)", f"{num(g50['lo'], 1)} to {num(g50['hi'], 1)}",
              r"regained [\d.]+ pp less of its pre-storm value than a damaged one \(([-.\d]+ to [-.\d]+)\)"),
        check("value regained: owner changed", num(ch["e"], 1), r"an owner change on its own adds nothing \(([-.\d]+),"),
        check("value regained: loss × changed (interval)", f"{num(gx['lo'], 1)} to {num(gx['hi'], 1)}",
              r"regained [\d.]+ pp less still \(([-.\d]+ to [-.\d]+)\)"),
        check("rebuilt floor area (%)", num(area["e"], 1), r"rebuilt houses are ([\d.]+)% larger"),
        check("within the cap terms: pre-storm owners", pct(cap["pre-storm owner"]["within"]), r"\((\d+%) of incumbents and"),
        check("within the cap terms: new owners", pct(cap["new owner"]["within"]), r"of incumbents and (\d+%) of new owners"),
        check("restored destroyed homes under a new owner", num(h["rwr"]),
              r"restored within 39 months, (\.\d+) \(\.\d+ to \.\d+\) were restored under a new owner"),
        check("restored destroyed homes under a new owner (interval)", f"{num(h['lo'])} to {num(h['hi'])}",
              r"restored within 39 months, \.\d+ \((\.\d+ to \.\d+)\) were restored under a new owner"),
    ]
