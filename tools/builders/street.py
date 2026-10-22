r"""The landing page, Two clocks: a hundred damaged resident-owned homes
followed through the four rolls after the storm, by structural loss, and
the recovery matrix of Figure 1 filled with the shares (Figure 4 and
Table 2 of the paper; Figure S13 for the seven states).

Reads a18 taxonomy_by_loss.csv and rwr_share.csv (the balanced sample:
seasons 2016 to 2021, every season reaches the fourth roll) and the
months of the rolls from a15 d1_restoration.csv.
"""

from .common import check, months, num, pct, q, rd, ztest

BINS = [(">=.75", "Lost .75 or more", "three quarters or more of the structure"),
        (".50-.75", "Lost .50 to .75", "half to three quarters of the structure"),
        (".25-.50", "Lost .25 to .50", "a quarter to a half of the structure"),
        ("all", "All damaged", "a quarter or more of the structure")]

# the seven states of the taxonomy and the five cells of the recovery matrix (Figure 1)
STATES = [
    ("recovery with return", "rr", "Recovery with return", "restored, the pre-storm owner still there with the homestead"),
    ("restored, same owner, no homestead", "rr", "Restored, same owner, no homestead", "restored, the same owner name, the homestead exemption dropped"),
    ("recovery without return: restored then sold", "rt", "Restored, then sold", "restored by the pre-storm owner, then sold"),
    ("recovery without return: sold then restored", "rt", "Sold, then restored", "sold while damaged, restored by the new owner"),
    ("stranded incumbent", "ur", "Stranded incumbent", "not restored, the pre-storm owner still there"),
    ("unresolved transition", "ut", "Unresolved transition", "not restored, under a new owner"),
    ("cleared", "cl", "Cleared lot", "no structure on the roll"),
]
CLASSES = [
    {"key": "rr", "label": "Restored, retained", "name": "recovery with return"},
    {"key": "rt", "label": "Restored, transferred", "name": "recovery without return (RWR)"},
    {"key": "ur", "label": "Unrestored, retained", "name": "stranded incumbent"},
    {"key": "ut", "label": "Unrestored, transferred", "name": "unresolved transition"},
    {"key": "cl", "label": "Cleared lot", "name": "ownership retained or transferred"},
]


def taxonomy():
    t = rd("a18_two_clocks", "taxonomy_by_loss.csv")
    return t[t["sample"] == "balanced"]


def rwr():
    r = rd("a18_two_clocks", "rwr_share.csv")
    return r[r["sample"] == "balanced"]


def cells(tb):
    out = {}
    for b, _, _ in BINS:
        out[b] = {}
        for k in (1, 2, 3, 4):
            x = tb[(tb["loss_bin"] == b) & (tb["k"] == k)]
            out[b][k] = {"n": int(x["n"].iloc[0]),
                         "states": {s: [float(r["share"]), float(r["ci_low"]), float(r["ci_high"])]
                                    for s, r in x.set_index("state").iterrows()}}
    return out


def rwr_table(rb):
    out = {}
    for b, _, _ in BINS:
        out[b] = {}
        for k in (2, 3, 4):
            r = q(rb, k=k, loss_bin=b)
            p = None
            if b in (">=.75", ".50-.75"):
                ref = q(rb, k=k, loss_bin=".25-.50")
                p = ztest(r["new_owner"], r["restored"], ref["new_owner"], ref["restored"])
            out[b][k] = {"share": float(r["rwr_share"]), "lo": float(r["ci_low"]), "hi": float(r["ci_high"]),
                         "restored": int(r["restored"]), "new_owner": int(r["new_owner"]), "p": p}
    return out


def build():
    tb, rb = taxonomy(), rwr()
    return {"street.json": {
        "months": months(),
        "bins": [{"key": b, "label": lab, "long": long} for b, lab, long in BINS],
        "states": [{"key": s, "cls": c, "label": lab, "def": d} for s, c, lab, d in STATES],
        "classes": CLASSES,
        "cells": cells(tb),
        "rwr": rwr_table(rb),
        "sample": "resident owner-occupied homes of the storm-struck tracts held since two rolls before the storm, "
                  "seasons 2016 to 2021",
    }}


def checks(files):
    s = files["street.json"]
    c4 = s["cells"][">=.75"][4]["states"]
    rw = s["rwr"]
    rwr4 = c4["recovery without return: sold then restored"][0] + c4["recovery without return: restored then sold"][0]
    return [
        check("lost .75 or more, 39 months: recovery with return", pct(c4["recovery with return"][0]),
              r"by then (\d+%) have been restored and are occupied by the pre-storm household"),
        check("lost .75 or more, 39 months: restored under a new owner", pct(rwr4), r"(\d+%) have been restored under a new owner"),
        check("lost .75 or more, 39 months: stranded incumbent", pct(c4["stranded incumbent"][0]),
              r"(\d+%) stand unrestored with the same owner"),
        check("lost .75 or more, 39 months: unresolved transition", pct(c4["unresolved transition"][0]),
              r"(\d+%) unrestored with a new one"),
        check("lost .75 or more, 39 months: cleared lot", pct(c4["cleared"][0]), r"(\d+%) still do after 39 months"),
        check("lost .75 or more, 3 months: cleared lot", pct(s["cells"][">=.75"][1]["states"]["cleared"][0]),
              r"(\d+%) stand as cleared lots on the first roll"),
        check("RWR share among restored, 39 months, lost .25 to .50", num(rw[".25-.50"][4]["share"]),
              r"At 39 months it is (\.\d+) for homes that lost a quarter to a half"),
        check("RWR share among restored, 39 months, lost .50 to .75", num(rw[".50-.75"][4]["share"]),
              r"(\.\d+) for half to three quarters"),
        check("RWR share among restored, 39 months, lost .75 or more", num(rw[">=.75"][4]["share"]),
              r"and (\.\d+) for three quarters or more \(95%"),
        check("RWR share, 39 months, lost .75 or more: lower bound", num(rw[">=.75"][4]["lo"]),
              r"\.35 to \.37 and (\.\d+) to \.\d+ at the ends"),
        check("RWR share, 39 months, lost .75 or more: upper bound", num(rw[">=.75"][4]["hi"]),
              r"\.35 to \.37 and \.\d+ to (\.\d+) at the ends"),
    ]
