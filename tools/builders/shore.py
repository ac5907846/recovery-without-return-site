r"""The shore page (Figure S6 and the coastal proximity models of
Section 4.5): the states of L25 resident owner-occupied homes by distance
to the shoreline, Eqs. (1) and (2) within each of the nine bands, and the
pooled interactions with log distance and the V zone.

Reads a18 coastal_bands.csv and coastal_models.csv.
"""

from .common import check, est, num, pct, rd

ORDER = ["within .1 mile", ".1 to .2", ".2 to .3", ".3 to .5", ".5 to 1", "1 to 2", "2 to 5", "5 to 10", "beyond 10"]
LABEL = {"within .1 mile": "within .1 mile", ".1 to .2": ".1 to .2 mile", ".2 to .3": ".2 to .3 mile", ".3 to .5": ".3 to .5 mile",
         ".5 to 1": ".5 to 1 mile", "1 to 2": "1 to 2 miles", "2 to 5": "2 to 5 miles", "5 to 10": "5 to 10 miles",
         "beyond 10": "beyond 10 miles"}
MODEL = {"P1: new owner among restored, s+3": "Eq. (1): ownership change among restored homes at t + 3",
         "P2: return, s+2": "Eq. (2): restoration under original ownership at t + 2",
         "P2: changed, s+2": "Eq. (2): ownership change at t + 2"}
TERMS = {"g50": "L50", "g50_x_logdist": "L50 × log distance", "g50_x_vzone": "L50 × V zone",
         "damaged_x_K": "L25 × K", "damaged_x_sfha": "L25 × A zone", "damaged_x_logdist": "L25 × log distance",
         "damaged_x_vzone": "L25 × V zone, relative to A zones", "damaged_x_vzone_vs_outside": "L25 × V zone, relative to outside the SFHA"}


def build():
    b = rd("a18_two_clocks", "coastal_bands.csv").set_index("band")
    cm = rd("a18_two_clocks", "coastal_models.csv")
    bands = []
    for key in ORDER:
        r = b.loc[key]
        h1 = None if r["P1_est"] != r["P1_est"] else {"e": 100 * float(r["P1_est"]), "lo": 100 * float(r["P1_lo"]),
                                                      "hi": 100 * float(r["P1_hi"]), "n": int(r["P1_n"])}
        bands.append({"key": key, "label": LABEL[key], "n": int(r["n_damaged"]),
                      "destroyed": float(r["destroyed_share"]), "vzone": float(r["vzone_share"]),
                      "restored": float(r["restored"]), "ret": float(r["recovery_with_return"]),
                      "rwr": float(r["recovery_without_return"]), "rwr_restored": float(r["rwr_among_restored"]),
                      "stranded": float(r["stranded"]), "cleared": float(r["cleared"]),
                      "h1": h1,
                      "h2": {"e": 100 * float(r["P2_est"]), "lo": 100 * float(r["P2_lo"]), "hi": 100 * float(r["P2_hi"]),
                             "n": int(r["P2_n"])}})
    models = [{"model": MODEL.get(r["model"], r["model"]), "term": r["term"], "label": TERMS.get(r["term"], r["term"]),
               "main": r["term"] in ("damaged_x_K", "g50"), **est(r)} for _, r in cm.iterrows()]
    return {"shore.json": {"bands": bands, "models": models}}


def checks(files):
    s = files["shore.json"]
    k = next(x for x in s["models"] if x["term"] == "damaged_x_K" and x["model"].startswith("Eq. (2): restoration"))
    return [
        check("L25 × K on restoration under original ownership with distance and V zone added (pp)", num(k["e"], 1),
              r"fell to ([\d.]+) pp \(95% CI"),
        check("the same, 95% CI", f"95% CI [{num(k['lo'], 1)}, {num(k['hi'], 1)}]", r"fell to [\d.]+ pp \((95% CI \[[-.\d]+, [-.\d]+\])"),
        {"label": "nine distance bands, L25 resident owner-occupied homes", "site": f"{sum(b['n'] for b in s['bands']):,}",
         "paper": None, "ok": True, "info": True},
    ]
