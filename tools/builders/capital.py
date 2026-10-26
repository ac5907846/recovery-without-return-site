r"""The Financial resources page (H2): the surfaces of Figure 6 as an
interactive grid, every estimate of Table 5, and the flood-zone estimates
of Table S4 and Section 5.3.

Reads a18 surfaces.csv (written by a18 site_export.py from the figure's
own grid), nfip_tests.csv, sfha_attenuation.csv, coastal_models.csv,
continuous.csv, capital_corr.csv; a15 h6_models.csv.
"""

from .common import check, check_groups, est, num, pct, q, rd

OUTCOMES = [("return", "Restoration under original ownership", "restored, the original owner recorded with the homestead exemption"),
            ("changed", "Ownership change", "a new owner recorded"),
            ("F", "Capped R", "the structural value ratio, capped at 100%")]


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
    """Every row of Table 5 and Table S4: main = the index K in the main specification, alt = another measure or sample."""
    h6 = rd("a15_recovery_tests", "h6_models.csv")
    nt = rd("a18_two_clocks", "nfip_tests.csv")
    cont = rd("a18_two_clocks", "continuous.csv")
    att = rd("a18_two_clocks", "sfha_attenuation.csv")
    cm = rd("a18_two_clocks", "coastal_models.csv")
    c2 = cont[cont["model"].str.startswith("P2")].set_index("term")
    rows = []

    def add(group, label, row, main=False, **kw):
        rows.append({"group": group, "label": label, "main": main, **est(row, **kw)})

    for oc in ("return", "changed"):
        for cap, label, main in (("K", "L25 × K", True),
                                 ("z_ins", "L25 × insured share", False),
                                 ("z_linc", "L25 × tract income", False),
                                 ("K_D20", "L25 × K, tracts with D ≥20", False),
                                 ("K_added_without_Lee", "L25 × K, without Lee County", False)):
            add(oc, label, q(h6, outcome=oc, capital=cap, cluster="county", term="damaged_x_K"), main)
        add(oc, "L25 × K, tract clusters", q(h6, outcome=oc, capital="K", cluster="tract", term="damaged_x_K"))
        add(oc, "L25 × NFIP penetration", q(nt, outcome=oc, measure="NFIP penetration"))
        add(oc, "L25 × NFIP claims", q(nt, outcome=oc, measure="NFIP claims per 100 damaged houses"))
    add("F", "L25 × K", c2.loc["damaged_x_K"], True)
    add("business", "L25 × K", q(h6, outcome="business_owner", capital="K", cluster="county", term="damaged_x_K"), True)
    add("business", "L25 × NFIP penetration", q(nt, outcome="business_owner", measure="NFIP penetration"))
    sA, sB = att.iloc[0], att.iloc[1]
    rows.append({"group": "flood", "label": "L25 × SFHA", "main": True, **est(sA, e="damaged_x_sfha")})
    rows.append({"group": "flood", "label": "L25 × SFHA, adjusted for NFIP penetration", "main": False,
                 "absorbed": float(sB["share_absorbed"]), **est(sB, e="damaged_x_sfha")})
    add("flood", "L25 × A zone", q(cm, model="P2: return, s+2", term="damaged_x_sfha"))
    add("flood", "L25 × V zone, relative to A zones", q(cm, model="P2: return, s+2", term="damaged_x_vzone"))
    add("flood", "L25 × V zone, relative to outside the SFHA", q(cm, model="P2: return, s+2", term="damaged_x_vzone_vs_outside"))
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

    rk, ck = g("return", "L25 × K"), g("changed", "L25 × K")
    fk = g("F", "L25 × K")
    rn, cn = g("return", "L25 × NFIP penetration"), g("changed", "L25 × NFIP penetration")
    bus = g("business", "L25 × K")
    sA, sB = g("flood", "L25 × SFHA"), g("flood", "L25 × SFHA, adjusted for NFIP penetration")
    ci = lambda r: f"95% CI [{num(r['lo'], 1)}, {num(r['hi'], 1)}]"  # noqa: E731
    return [
        check("H2: L25 × K on restoration under original ownership (pp)", num(rk["e"], 1),
              r"a ([\d.]+)-pp higher probability of restoration under original ownership"),
        check("the same, 95% CI", ci(rk), r"higher probability of restoration under original ownership \((95% CI \[[-.\d]+, [-.\d]+\])"),
        check("H2: L25 × K on ownership change (pp)", num(-ck["e"], 1), r"a ([\d.]+)-pp lower probability of ownership change"),
        check("the same, 95% CI", ci(ck), r"lower probability of ownership change \((95% CI \[[-.\d]+, [-.\d]+\])"),
        check("L25 × K on capped R (pp)", num(fk["e"], 1), r"a ([\d.]+)-pp higher capped"),
        check("the same, 95% CI", ci(fk), r"higher capped \*R\* \((95% CI \[[-.\d]+, [-.\d]+\])"),
        check("NFIP penetration on restoration under original ownership (pp)", num(rn["e"], 1),
              r"higher restoration under original ownership \(([\d.]+) pp;"),
        check("the same, 95% CI", ci(rn), r"higher restoration under original ownership \([\d.]+ pp; (95% CI \[[-.\d]+, [-.\d]+\])"),
        check("NFIP penetration on ownership change (pp)", num(cn["e"], 1), r"less frequent ownership change \(([-.\d]+) pp;"),
        check("the same, 95% CI", ci(cn), r"less frequent ownership change \([-.\d]+ pp; (95% CI \[[-.\d]+, [-.\d]+\])"),
        check("SFHA: L25 difference in restoration under original ownership (pp)", num(sA["e"], 1), r"was ([\d.]+) pp more favorable inside the SFHA"),
        check("the same, 95% CI", ci(sA), r"than outside it \((95% CI \[[-.\d]+, [-.\d]+\])"),
        check("SFHA adjusted for NFIP penetration (pp)", num(sB["e"], 1), r"and ([\d.]+) pp after adjusting for NFIP penetration"),
        check("business ownership of L25 properties: L25 × K (pp)", num(bus["e"], 1), r"business ownership of L25 properties \(([-.\d]+) pp;"),
        check("the same, 95% CI", ci(bus), r"business ownership of L25 properties \([-.\d]+ pp; (95% CI \[[-.\d]+, [-.\d]+\])"),
        check("the same, outcome mean", pct(bus["base"], 1), r"against an outcome mean of ([\d.]+%)"),
    ]
