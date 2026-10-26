r"""The gap page: restoration and ownership continuity read together by
structural loss (Figure 4 and Table 2 of the paper; Figure S5 for the
eight states), season by season, and the sales (Table 3).

Reads a18 taxonomy_by_loss.csv, rwr_share.csv, taxonomy_by_season.csv,
season_totals.csv; a15 d2_sale_clock.csv, d2_buyers.csv, d2_prices.csv.
"""

from .common import check, check_groups, months, pct, rd, storms
from .street import STATES, cells, rwr, rwr_table, taxonomy

LOSS = [(".25-.50", "25% ≤ L <50%"), (".50-.75", "50% ≤ L <75%"), (">=.75", "L ≥75%")]
SALE = [("<.10", "Unaffected (L <10%)"), (".25-.50", "25% ≤ L <50%"), (".50-.75", "50% ≤ L <75%"), (">=.75", "L ≥75%")]


def by_season():
    t = rd("a18_two_clocks", "taxonomy_by_season.csv")
    t = t[t["sample"] == "all"]
    tot = rd("a18_two_clocks", "season_totals.csv").set_index("season")
    names = {}
    for k, v in storms().items():
        names.setdefault(v["season"], []).append(v["label"].split()[0])
    out = []
    for s in sorted(t["season"].unique()):
        x = t[t["season"] == s]
        rolls = []
        for k in sorted(x["k"].unique()):
            y = x[x["k"] == k].set_index("state")
            rolls.append({"k": int(k), "n": int(y["n"].iloc[0]),
                          "states": {st: float(r["share"]) for st, r in y.iterrows()}})
        r = tot.loc[s]
        out.append({"season": int(s), "storms": names.get(int(s), []), "rolls": rolls,
                    "n_damaged": int(r["n_damaged"]), "tracts": int(r["tracts"]),
                    "destroyed": float(r["destroyed_share"]),
                    "restored_3": None if r["restored_share_3"] != r["restored_share_3"] else float(r["restored_share_3"]),
                    "rwr_3": None if r["rwr_share_3"] != r["rwr_share_3"] else float(r["rwr_share_3"])})
    return out


def sales():
    sc = rd("a15_recovery_tests", "d2_sale_clock.csv")
    buy = rd("a15_recovery_tests", "d2_buyers.csv")
    pr = rd("a15_recovery_tests", "d2_prices.csv").set_index("lb")
    out = []
    for lb, label in SALE:
        x = sc[sc["lb"] == lb].sort_values("months")
        b = buy[buy["lb"] == lb].set_index("deed_buyer")["share"]
        out.append({"key": lb, "label": label,
                    "clock": [{"m": int(r["months"]), "share": float(r["share"]), "lo": float(r["ci_low"]),
                               "hi": float(r["ci_high"]), "n": int(r["n"])} for _, r in x.iterrows()],
                    "buyers": {k: float(v) for k, v in b.items()},
                    "price_over_jv": float(pr.loc[lb, "median_prc_over_jv"]),
                    "price_over_land": float(pr.loc[lb, "median_prc_over_land"]),
                    "below_land": float(pr.loc[lb, "share_below_land"]),
                    "sales": int(pr.loc[lb, "n"])})
    return out


def build():
    tb, rb = taxonomy(), rwr()
    return {"clocks.json": {
        "months": months(),
        "bins": [{"key": b, "label": lab} for b, lab in LOSS],
        "states": [{"key": s, "cls": c, "label": lab, "def": d} for s, c, lab, d in STATES],
        "cells": {b: v for b, v in cells(tb).items() if b != "all"},
        "rwr": {b: v for b, v in rwr_table(rb).items() if b != "all"},
        "seasons": by_season(),
        "sales": sales(),
    }}


def checks(files):
    c = files["clocks.json"]
    st = c["cells"][">=.75"][4]["states"]
    sale = {s["key"]: s for s in c["sales"]}
    at12 = {k: next(r for r in v["clock"] if r["m"] == 12)["share"] for k, v in sale.items()}
    return [
        check_groups("L75, 39 months: sold before restoration, sold after restoration, new owner without a recorded sale",
                     ", ".join(pct(st[k][0]) for k in ("recovery without return: sold then restored",
                                                       "recovery without return: restored then sold",
                                                       "recovery without return: owner change, no sale")),
                     r"(\d+%) had been sold before restoration and (\d+%) were sold after restoration by 39 months, "
                     r"while a further (\d+%) changed owners without a recorded sale"),
        check_groups("sold for value within 12 months: L75, unaffected", f"{pct(at12['>=.75'], 1)}, {pct(at12['<.10'], 1)}",
                     r"Within 12 months of landfall, ([\d.]+%) of L75 homes had been sold, compared with ([\d.]+%) of unaffected homes"),
        check_groups("business buyers within 24 months: L75, unaffected",
                     f"{pct(sale['>=.75']['buyers']['business'])}, {pct(sale['<.10']['buyers']['business'])}",
                     r"accounted for (\d+%) of buyers of L75 properties sold within 24 months, compared with (\d+%) for unaffected"),
        check("median sale price of L75 homes, % of pre-storm just value", pct(sale[">=.75"]["price_over_jv"]),
              r"median sale price of these homes was (\d+%) of the pre-storm just value"),
    ]
