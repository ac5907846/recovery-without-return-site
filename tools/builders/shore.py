r"""The shore page (Section 5.5, Figure S12): the states of damaged
resident homes by distance to the shoreline, and H1 and H2 by band.

Reads a18 coastal_bands.csv and coastal_models.csv.
"""

from .common import check, est, num, pct, rd

ORDER = ["within .25 mile", ".25 to .5", ".5 to 1", "1 to 3", "3 to 10", "beyond 10"]
LABEL = {"within .25 mile": "within .25 mile", ".25 to .5": ".25 to .5 mile", ".5 to 1": ".5 to 1 mile",
         "1 to 3": "1 to 3 miles", "3 to 10": "3 to 10 miles", "beyond 10": "beyond 10 miles"}
TERMS = {"g50": "loss .50 or more", "g50_x_logdist": "loss .50 or more × log distance",
         "g50_x_vzone": "loss .50 or more × V zone", "damaged_x_K": "damage × K", "damaged_x_sfha": "damage × A zones",
         "damaged_x_logdist": "damage × log distance", "damaged_x_vzone": "damage × V zone"}


def build():
    b = rd("a18_two_clocks", "coastal_bands.csv").set_index("band")
    cm = rd("a18_two_clocks", "coastal_models.csv")
    bands = []
    for key in ORDER:
        r = b.loc[key]
        bands.append({"key": key, "label": LABEL[key], "n": int(r["n_damaged"]),
                      "destroyed": float(r["destroyed_share"]), "vzone": float(r["vzone_share"]),
                      "restored": float(r["restored"]), "ret": float(r["recovery_with_return"]),
                      "rwr": float(r["recovery_without_return"]), "rwr_restored": float(r["rwr_among_restored"]),
                      "stranded": float(r["stranded"]), "cleared": float(r["cleared"]),
                      "h1": {"e": 100 * float(r["P1_est"]), "lo": 100 * float(r["P1_lo"]), "hi": 100 * float(r["P1_hi"]),
                             "n": int(r["P1_n"])},
                      "h2": {"e": 100 * float(r["P2_est"]), "lo": 100 * float(r["P2_lo"]), "hi": 100 * float(r["P2_hi"]),
                             "n": int(r["P2_n"])}})
    models = [{"model": r["model"], "term": r["term"], "label": TERMS.get(r["term"], r["term"]), **est(r)}
              for _, r in cm.iterrows()]
    return {"shore.json": {"bands": bands, "models": models}}


def checks(files):
    s = files["shore.json"]
    b = {x["key"]: x for x in s["bands"]}
    w, m = b["within .25 mile"], b["3 to 10"]
    gx = next(x for x in s["models"] if x["term"] == "g50_x_logdist")
    return [
        check("within a quarter mile: destroyed, restored at 27 months, recovery with return",
              f"{pct(w['destroyed'])} of damaged resident homes were destroyed, {pct(w['restored'])} are restored at 27 months and {pct(w['ret'])}",
              r"shoreline, (\d+% of damaged resident homes were destroyed, \d+% are restored at 27 months and \d+%)"),
        check("3 to 10 miles: the same three", f"{pct(m['destroyed'])}, {pct(m['restored'])} and {pct(m['ret'])}",
              r"against (\d+%, \d+% and \d+%) at 3 to 10 miles"),
        check("pooled destruction × log distance", f"{num(gx['e'] / 100, 3)} ({num(gx['lo'] / 100, 4)} to {num(gx['hi'] / 100, 3)})",
              r"log distance is (\.\d+ \(\.\d+ to \.\d+\))"),
    ]
