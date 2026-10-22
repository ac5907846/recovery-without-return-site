r"""The Financial resources page (H2): the surfaces of Figure 6 as an
interactive grid, and every H2 estimate (Table 4) with the flood-zone
results of Section 5.3.

Reads a18 surfaces.csv (written by a18 site_export.py from the figure's
own grid), nfip_tests.csv, sfha_attenuation.csv, coastal_models.csv,
continuous.csv, capital_corr.csv; a15 h6_models.csv.
"""

from .common import check, est, num, pct, q, rd

OUTCOMES = [("return", "Recovery with return", "the pre-storm owner holds the restored house with its homestead"),
            ("changed", "Owner change", "the house is under a new owner"),
            ("F", "Value regained", "fraction of the pre-storm structure value regained")]


def surfaces():
    s = rd("a18_two_clocks", "surfaces.csv")
    out = {}
    for key, _, _ in OUTCOMES:
        x = s[s["outcome"] == key].sort_values(["ki", "li"])
        out[key] = {
            "l_edges": sorted(set(x["l_lo"]).union(x["l_hi"])),
            "k_edges": sorted(set(x["k_lo"]).union(x["k_hi"])),
            "cells": [[int(r["li"]), int(r["ki"]), int(r["n"]), None if r["mean"] != r["mean"] else float(r["mean"]),
                       bool(r["drawn"]), None if r["smooth"] != r["smooth"] else float(r["smooth"])]
                      for _, r in x.iterrows()],
        }
    return out


def estimates():
    h6 = rd("a15_recovery_tests", "h6_models.csv")
    nt = rd("a18_two_clocks", "nfip_tests.csv")
    cont = rd("a18_two_clocks", "continuous.csv")
    att = rd("a18_two_clocks", "sfha_attenuation.csv")
    cm = rd("a18_two_clocks", "coastal_models.csv")
    c2 = cont[cont["model"].str.startswith("P2")].set_index("term")
    rows = []

    def add(group, label, row, status, **kw):
        rows.append({"group": group, "label": label, "status": status, **est(row, **kw)})

    for oc in ("return", "changed"):
        for cap, label, status in (("K", "damage × K", "pre-specified"),
                                   ("z_ins", "damage × insured share", "part of K"),
                                   ("z_linc", "damage × tract income", "part of K"),
                                   ("K_D20", "damage × K, tracts with D of 20 or more", "check"),
                                   ("K_added_without_Lee", "damage × K, without Lee County", "added check")):
            add(oc, label, q(h6, outcome=oc, capital=cap, cluster="county", term="damaged_x_K"), status)
        add(oc, "damage × K, tract clusters", q(h6, outcome=oc, capital="K", cluster="tract", term="damaged_x_K"), "check")
        add(oc, "damage × NFIP policies in force at landfall", q(nt, outcome=oc, measure="NFIP penetration"), "pre-specified")
        add(oc, "damage × NFIP claims per 100 damaged houses", q(nt, outcome=oc, measure="NFIP claims per 100 damaged houses"),
            "reported")
    add("F", "damage × K", c2.loc["damaged_x_K"], "pre-specified")
    add("business", "damage × K", q(h6, outcome="business_owner", capital="K", cluster="county", term="damaged_x_K"),
        "description")
    add("business", "damage × NFIP policies in force at landfall", q(nt, outcome="business_owner", measure="NFIP penetration"),
        "description")
    sA, sB = att.iloc[0], att.iloc[1]
    rows.append({"group": "flood", "label": "damage × SFHA (with K)", "status": "reported",
                 **est(sA, e="damaged_x_sfha")})
    rows.append({"group": "flood", "label": "damage × SFHA, NFIP policies added", "status": "reported",
                 "absorbed": float(sB["share_absorbed"]), **est(sB, e="damaged_x_sfha")})
    rows.append({"group": "flood", "label": "damage × NFIP policies beside the SFHA", "status": "reported",
                 **est(sB, e="damaged_x_nfip", lo="nfip_ci_low", hi="nfip_ci_high"), "p": float(sB["nfip_p"])})
    add("flood", "damage × A zones (riverine and ponding flood)", q(cm, model="P2: return, s+2", term="damaged_x_sfha"),
        "description")
    add("flood", "damage × V zone (wave action)", q(cm, model="P2: return, s+2", term="damaged_x_vzone"), "description")
    return rows


def build():
    corr = rd("a18_two_clocks", "capital_corr.csv")
    return {"capital.json": {
        "outcomes": [{"key": k, "label": lab, "def": d} for k, lab, d in OUTCOMES],
        "surfaces": surfaces(),
        "estimates": estimates(),
        "corr": [{"pair": r["pair"], "rho": float(r["spearman"]), "tracts": int(r["tracts"])} for _, r in corr.iterrows()],
        "min_cell": 150,
    }}


def checks(files):
    e = files["capital.json"]["estimates"]

    def g(group, label):
        return next(r for r in e if r["group"] == group and r["label"] == label)

    rk, ck = g("return", "damage × K"), g("changed", "damage × K")
    ri, ci = g("return", "damage × insured share"), g("changed", "damage × insured share")
    rl, cl = g("return", "damage × tract income"), g("changed", "damage × tract income")
    fk = g("F", "damage × K")
    rn, cn = g("return", "damage × NFIP policies in force at landfall"), g("changed", "damage × NFIP policies in force at landfall")
    rc = g("return", "damage × NFIP claims per 100 damaged houses")
    rd20 = g("return", "damage × K, tracts with D of 20 or more")
    bus = g("business", "damage × K")
    sA, sB = g("flood", "damage × SFHA (with K)"), g("flood", "damage × SFHA, NFIP policies added")
    az, vz = g("flood", "damage × A zones (riverine and ponding flood)"), g("flood", "damage × V zone (wave action)")
    iv = lambda r: f"{num(r['lo'], 1)} to {num(r['hi'], 1)}"  # noqa: E731
    return [
        check("H2 return: damage × K (pp per SD)", num(rk["e"], 1), r"at s\+2 by ([\d.]+) pp \("),
        check("H2 return: interval", iv(rk), r"at s\+2 by [\d.]+ pp \(([-.\d]+ to [-.\d]+); base"),
        check("H2 return: base", pct(rk["base"]), r"at s\+2 by [\d.]+ pp \([-.\d]+ to [-.\d]+; base (\d+%)\)"),
        check("H2 owner change: damage × K", num(-ck["e"], 1), r"changes hands by ([\d.]+) pp \("),
        check("H2 owner change: interval", iv(ck), r"changes hands by [\d.]+ pp \(([-.\d]+ to [-.\d]+); base"),
        check("H2 owner change: base", pct(ck["base"]), r"changes hands by [\d.]+ pp \([-.\d]+ to [-.\d]+; base (\d+%)\)"),
        check("insured share on return and owner change", f"{num(ri['e'], 1)} and {num(ci['e'], 1)}",
              r"insured share: ([-.\d]+ and [-.\d]+)"),
        check("tract income on return and owner change", f"{num(rl['e'], 1)} and {num(cl['e'], 1)}", r"income: ([-.\d]+ and [-.\d]+)\)"),
        check("value regained per SD of K", num(fk["e"], 1), r"rises by ([\d.]+) pp per SD"),
        check("NFIP policies on return", f"{num(rn['e'], 1)} pp on return ({iv(rn)})", r"give the same answer: ([\d.]+ pp on return \([-.\d]+ to [-.\d]+\))"),
        check("NFIP policies on owner change", f"{num(cn['e'], 1)} on owner change ({iv(cn)})", r"and ([-.\d]+ on owner change \([-.\d]+ to [-.\d]+\))"),
        check("NFIP claims on return", f"{num(rc['e'], 1)}, {iv(rc)}", r"does not \(([-.\d]+, [-.\d]+ to [-.\d]+)\)"),
        check("hardest-hit tracts (D of 20 or more)", f"{num(rd20['e'], 1)}, {iv(rd20)}", r"the interaction vanishes \(([-.\d]+, [-.\d]+ to [-.\d]+)\)"),
        check("business entities where capital is higher", f"{num(bus['e'], 1)} pp, {iv(bus)}", r"slightly more often \(([-.\d]+ pp, [-.\d]+ to [-.\d]+)\)"),
        check("SFHA on return", f"{num(sA['e'], 1)} pp more often than outside it ({iv(sA)})",
              r"return ([\d.]+ pp more often than outside it \([-.\d]+ to [-.\d]+\))"),
        check("SFHA with NFIP penetration added", f"{pct(sB['absorbed'])} of the coefficient ({num(sA['e'], 1)} to {num(sB['e'], 1)})",
              r"absorbs only (\d+% of the coefficient \([\d.]+ to [\d.]+\))"),
        check("A zones on return", f"{num(az['e'], 1)} pp more ({iv(az)})", r"return ([\d.]+ pp more \([-.\d]+ to [-.\d]+\))"),
        check("V zone on return", f"{num(-vz['e'], 1)} pp less ({iv(vz)})", r"return ([\d.]+ pp less \([-.\d]+ to [-.\d]+\))"),
    ]
