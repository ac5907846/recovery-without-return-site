r"""The gap page: the two clocks read together by structural loss
(Figure 4; Table 2 and its continuation; Figure S13 for the seven
states), season by season, and the sale clock.

Reads a18 taxonomy_by_loss.csv, rwr_share.csv, taxonomy_by_season.csv,
season_totals.csv; a15 d2_sale_clock.csv, d2_buyers.csv, d2_prices.csv.
"""

from .common import check, months, pct, rd, storms
from .street import STATES, cells, rwr, rwr_table, taxonomy

LOSS = [(".25-.50", "Lost .25 to .50"), (".50-.75", "Lost .50 to .75"), (">=.75", "Lost .75 or more")]
SALE = [("<.10", "Undamaged (lost under .10)"), (".25-.50", "Lost .25 to .50"), (".50-.75", "Lost .50 to .75"),
        (">=.75", "Lost .75 or more")]


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
        check("RWR at 39 months, lost .75 or more: restored then sold", pct(st["recovery without return: restored then sold"][0]),
              r"\((\d+%) against \d+% of destroyed homes at 39 months\)"),
        check("RWR at 39 months, lost .75 or more: sold then restored", pct(st["recovery without return: sold then restored"][0]),
              r"\(\d+% against (\d+%) of destroyed homes at 39 months\)"),
        check("sold for value within 12 months, lost .75 or more", pct(at12[">=.75"]),
              r"within a year of landfall, (\d+%) of destroyed resident homes are sold"),
        check("sold for value within 12 months, undamaged", pct(at12["<.10"]), r"sold for value against (\d+%) of undamaged"),
        check("median sale price over pre-storm just value, lost .75 or more", pct(sale[">=.75"]["price_over_jv"]),
              r"at a median (\d+%) of the pre-storm just value"),
    ]
