r"""The landing page, Two clocks: a hundred L75 resident owner-occupied
homes followed through the four rolls after the storm, by structural loss,
and the recovery matrix of Figure 1 filled with the shares (Figures 3 and
4 and Table 2 of the paper; Figure S5 for the eight states).

Reads a18 taxonomy_by_loss.csv and rwr_share.csv (the balanced sample:
seasons 2016 to 2021, every season reaches the fourth roll) and the
months of the rolls from a15 d1_restoration.csv.
"""

from .common import check, check_groups, months, num, pct, q, rd, ztest

BINS = [(">=.75", "L ≥75%", "structural loss of at least 75%"),
        (".50-.75", "50% ≤ L <75%", "structural loss of 50% to under 75%"),
        (".25-.50", "25% ≤ L <50%", "structural loss of 25% to under 50%"),
        ("all", "All L25", "structural loss of at least 25%")]

# the eight states of Table 2 and the five cells of the recovery matrix (Figure 1); the keys are the a18 state codes
STATES = [
    ("recovery with return", "rr", "Restored, original owner with homestead", "restored, the pre-storm owner recorded with the homestead exemption"),
    ("restored, same owner, no homestead", "rr", "Restored, original owner without homestead", "restored, the same owner, the homestead exemption no longer recorded"),
    ("recovery without return: sold then restored", "rt", "Restored, new owner: sold before restoration", "sold for value while unrestored, restored under the new owner"),
    ("recovery without return: restored then sold", "rt", "Restored, new owner: sold after restoration", "restored by the original owner, then sold for value"),
    ("recovery without return: owner change, no sale", "rt", "Restored, new owner: no recorded sale", "restored, a new owner recorded without a sale for value (inheritance, trust, foreclosure)"),
    ("stranded incumbent", "ur", "Unrestored, original owner", "not restored, the original owner recorded"),
    ("unresolved transition", "ut", "Unrestored, new owner", "not restored, a new owner recorded"),
    ("cleared", "cl", "Cleared lot", "no structure on the roll"),
]
CLASSES = [
    {"key": "rr", "label": "Restored, original owner", "name": "restoration under original ownership"},
    {"key": "rt", "label": "Restored, new owner", "name": "restoration under new ownership (recovery without return)"},
    {"key": "ur", "label": "Unrestored, original owner", "name": "retained without restoration"},
    {"key": "ut", "label": "Unrestored, new owner", "name": "transferred without restoration"},
    {"key": "cl", "label": "Cleared lot", "name": "no structure on the roll"},
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
        "sample": "resident owner-occupied homes of affected tracts, under the same owner for at least two rolls "
                  "before the storm, seasons 2016 to 2021",
    }}


def checks(files):
    s = files["street.json"]
    c4 = s["cells"][">=.75"][4]["states"]
    c1 = s["cells"][">=.75"][1]["states"]
    rw = s["rwr"]
    cls = {c: sum(v[0] for st, v in c4.items() if next(x[1] for x in STATES if x[0] == st) == c) for c in ("rr", "rt", "ur", "ut", "cl")}
    return [
        check("L75, 39 months: restored under the original owner with homestead", pct(c4["recovery with return"][0]),
              r"(\d+%) had been restored under their original owners with homestead status retained"),
        check("L75, 39 months: restored under new ownership", pct(cls["rt"]), r"another (\d+%) were restored under new ownership"),
        check("L75, 39 months: unrestored", pct(cls["ur"] + cls["ut"]), r"(\d+%) were unrestored and \d+% were cleared lots"),
        check("L75, 39 months: cleared lots", pct(cls["cl"]), r"\d+% were unrestored and (\d+%) were cleared lots"),
        check("L75, 3 months: cleared lots", pct(c1["cleared"][0]), r"declined from (\d+%) at the first post-storm assessment"),
        check("new owner among restored L75 homes, 39 months", pct(rw[">=.75"][4]["share"]),
              r"Among restored homes, (\d+%) had changed ownership"),
        check("the same, 95% CI", f"[{pct(rw['>=.75'][4]['lo'])}, {pct(rw['>=.75'][4]['hi'])}]",
              r"Among restored homes, \d+% had changed ownership \(95% CI (\[\d+%, \d+%\])"),
        check_groups("new owner among restored, 39 months, by structural loss category",
                     ", ".join(pct(rw[b][4]["share"]) for b in (".25-.50", ".50-.75", ">=.75")),
                     r"accounted for (\d+%), (\d+%), and (\d+%) of restored homes"),
        check("L75 against 25% ≤ L <50% at 39 months: p below .001", "p < .001" if rw[">=.75"][4]["p"] < .001 else num(rw[">=.75"][4]["p"], 3),
              r"statistically significant at 39 months \((p < \.001)\)"),
    ]
