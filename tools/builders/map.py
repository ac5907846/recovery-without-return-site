r"""The map page, Seven seasons (Figures 2 and 5): the affected tracts (D >=5)
of every season with the HURDAT2 best tracks, and restoration and ownership
change by tract at about 27 months.

Reads a18 tract_states.csv and season_totals.csv; draws its geometry from
the raw boundary files the paper's map script reads (TIGER/Line tracts
2010 and 2020, the cartographic county file of 2023) and the HURDAT2 file.

Geometry is projected to EPSG:3086 (Florida GDL Albers, the paper's map
projection), simplified, and written in integer units of 10 m from the
top-left corner of the frame with y running down, each ring delta-encoded
(the first vertex absolute, then the steps), so the browser only scales.

Writes  data/map.json            seasons, storms, the tract-season table (columnar)
        data/geo/tracts.json     the affected tracts, keyed "vintage:fips"
        data/geo/counties.json   Florida's counties with names; Alabama and Georgia as context
        data/geo/tracks.json     every HURDAT2 row of the study storms; a landfall record (L) inside the frame is ringed, as in Figure 2
"""

import numpy as np
import pandas as pd

from .common import RAW, num, pct, rd, storms

CRS = 3086
UNIT = 10.0                       # metres per integer unit
TOL_TRACT, TOL_COUNTY, TOL_CONTEXT = 60.0, 150.0, 600.0
PAD = 30_000.0                    # Florida's bounds plus 30 km (Figure 2 adds 70 km to the west for Sally's loop)
WEST_PAD = 70_000.0
TRACK_PAD = 450_000.0             # fixes kept this far outside the frame, so tracks enter from off the map
MIN_HOMES = 20                    # the paper's hatching rule (Figure 5)
SEASON_COLOR = {2016: "#8c8c8c", 2017: "#2f6b4f", 2018: "#a8325e", 2020: "#595959", 2022: "#16385c",
                2023: "#6f9a80", 2024: "#c4708f"}


def frame(counties):
    minx, miny, maxx, maxy = counties.total_bounds
    return minx - WEST_PAD, miny - PAD, maxx + PAD, maxy + PAD


def encode(geom, fr):
    """Rings of a (Multi)Polygon as delta-encoded integer units, y down from the frame's top."""
    minx, _, _, maxy = fr
    polys = [geom] if geom.geom_type == "Polygon" else list(getattr(geom, "geoms", []))
    rings = []
    for p in polys:
        if p.is_empty or p.geom_type != "Polygon":
            continue
        for ring in [p.exterior, *p.interiors]:
            xy = np.asarray(ring.coords)[:, :2]
            u = np.rint((xy[:, 0] - minx) / UNIT).astype(np.int64)
            v = np.rint((maxy - xy[:, 1]) / UNIT).astype(np.int64)
            keep = np.ones(len(u), dtype=bool)
            keep[1:] = (np.diff(u) != 0) | (np.diff(v) != 0)
            u, v = u[keep], v[keep]
            if len(u) < 4:
                continue
            flat = np.empty(2 * len(u), dtype=np.int64)
            flat[0], flat[1] = u[0], v[0]
            flat[2::2], flat[3::2] = np.diff(u), np.diff(v)
            rings.append(flat.tolist())
    return rings


def load_counties():
    import pyogrio
    c = pyogrio.read_dataframe(RAW / "tiger" / "cb_2023_us_county_500k.shp",
                               where="STATEFP IN ('12', '01', '13')").to_crs(CRS)
    return c[c["STATEFP"] == "12"].copy(), c[c["STATEFP"] != "12"].copy()


def load_tracts(ts):
    import pyogrio
    t10 = pyogrio.read_dataframe(f"zip://{RAW / 'tiger' / 'tracts' / 'tl_2010_12_tract10.zip'}")
    t10 = t10.rename(columns={"GEOID10": "tract_fips"})[["tract_fips", "geometry"]].assign(tract_vintage=2010)
    t20 = pyogrio.read_dataframe(f"zip://{RAW / 'tiger' / 'tracts' / 'tl_2020_12_tract.zip'}")
    t20 = t20.rename(columns={"GEOID": "tract_fips"})[["tract_fips", "geometry"]].assign(tract_vintage=2020)
    g = pd.concat([t10, t20], ignore_index=True)
    want = set(zip(ts["tract_fips"], ts["tract_vintage"]))
    g = g[[(f, v) in want for f, v in zip(g["tract_fips"], g["tract_vintage"])]]
    return g.to_crs(CRS)


def hurdat():
    """Every best-track row of the study storms (the paper's figures_maps.track_points)."""
    want = {v["storm_id"]: k for k, v in storms().items()}
    rows, cur = [], None
    for ln in (RAW / "hurdat2" / "hurdat2-1851-2025-02272026.txt").read_text().splitlines():
        p = [x.strip() for x in ln.split(",")]
        if p[0][:2] == "AL" and len(p[0]) == 8:
            cur = want.get(p[0])
            continue
        if cur:
            lat = float(p[4][:-1]) * (1 if p[4][-1] == "N" else -1)
            lon = float(p[5][:-1]) * (-1 if p[5][-1] == "W" else 1)
            rows.append((cur, p[0], p[1], p[2], p[3], lat, lon, float(p[6])))
    return pd.DataFrame(rows, columns=["storm", "date", "time", "ident", "status", "lat", "lon", "v"])


def tracks(fl_union, fr):
    import geopandas as gpd
    minx, miny, maxx, maxy = fr
    tp = hurdat()
    pts = gpd.GeoSeries(gpd.points_from_xy(tp["lon"], tp["lat"]), crs=4326).to_crs(CRS)
    tp["x"], tp["y"] = pts.x.to_numpy(), pts.y.to_numpy()
    # a ring at every HURDAT2 landfall record inside the frame, as in Figure 2 (2026-10-25; the 3 km coast rule before)
    tp["landfall_fl"] = [(i == "L") and (minx <= x <= maxx) and (miny <= y <= maxy)
                         for i, x, y in zip(tp["ident"], tp["x"], tp["y"])]
    out = []
    for key, v in storms().items():
        q = tp[tp["storm"] == key].reset_index(drop=True)
        inside = ((q["x"] > minx - TRACK_PAD) & (q["x"] < maxx + TRACK_PAD)
                  & (q["y"] > miny - TRACK_PAD) & (q["y"] < maxy + TRACK_PAD)).to_numpy()
        runs, cur = [], []
        for i, ok in enumerate(inside):
            if ok:
                cur.append(i)
            elif cur:
                runs.append(cur)
                cur = []
        if cur:
            runs.append(cur)
        fixes = []
        for run in runs:
            if len(run) < 2:
                continue
            fixes.append([[int(round((q.at[i, "x"] - minx) / UNIT)), int(round((maxy - q.at[i, "y"]) / UNIT)),
                           f"{q.at[i, 'date']}{q.at[i, 'time']}", q.at[i, "ident"], q.at[i, "status"], int(q.at[i, "v"]),
                           bool(q.at[i, "landfall_fl"])] for i in run])
        out.append({"key": key, "label": v["label"], "season": v["season"], "date": v["date"], "dr": v["dr"],
                    "landfall_fl": bool(v["landfall_fl"]), "runs": fixes,
                    "max_wind": int(q["v"].max()), "landfalls_fl": int(q["landfall_fl"].sum())})
    return out


def build():
    ts = rd("a18_two_clocks", "tract_states.csv", dtype={"tract_fips": str})
    tot = rd("a18_two_clocks", "season_totals.csv").sort_values("season")
    fl, ctx = load_counties()
    fr = frame(fl)
    minx, miny, maxx, maxy = fr
    from shapely.geometry import box
    clip = box(minx, miny, maxx, maxy)

    tracts = load_tracts(ts)
    geo_tracts = {}
    for _, r in tracts.iterrows():
        g = r.geometry.simplify(TOL_TRACT, preserve_topology=True)
        geo_tracts[f"{r['tract_vintage']}:{r['tract_fips']}"] = encode(g, fr)
    missing = {f"{v}:{f}" for f, v in zip(ts["tract_fips"], ts["tract_vintage"])} - set(geo_tracts)
    if missing:
        raise SystemExit(f"{len(missing)} struck tracts have no geometry, e.g. {sorted(missing)[:3]}")

    counties = []
    for _, r in fl.sort_values("GEOID").iterrows():
        counties.append({"fips": r["GEOID"], "name": r["NAME"],
                         "rings": encode(r.geometry.simplify(TOL_COUNTY, preserve_topology=True), fr)})
    context = []
    for st, g in ctx.groupby("STATEFP"):
        shape = g.geometry.union_all().intersection(clip).simplify(TOL_CONTEXT, preserve_topology=True)
        context.append({"state": {"01": "Alabama", "13": "Georgia"}[st], "rings": encode(shape, fr)})

    names = {r["GEOID"]: r["NAME"] for _, r in fl.iterrows()}
    cols = ["n_damaged", "n_destroyed", "destroyed_share", "n_present_3", "restored_3", "restored_share_3",
            "ret_share_3", "rwr_3", "rwr_share_3", "stranded_share_3", "unresolved_share_3", "cleared_share_3"]
    table = {"key": [f"{v}:{f}" for f, v in zip(ts["tract_fips"], ts["tract_vintage"])],
             "fips": ts["tract_fips"].tolist(), "county": ts["county_fips"].astype(str).tolist(),
             "season": ts["season"].astype(int).tolist()}
    small = (ts["n_damaged"] < MIN_HOMES).to_numpy()      # Figure 5 hatches these; their shares are not published
    for c in cols:
        keep_small = c in ("n_damaged", "n_destroyed")
        table[c] = [None if (pd.isna(x) or (s and not keep_small)) else float(x) for x, s in zip(ts[c], small)]

    sto = storms()
    seasons = []
    for _, r in tot.iterrows():
        s = int(r["season"])
        members = [k for k, v in sto.items() if v["season"] == s]
        seasons.append({"season": s, "label": " · ".join(sto[k]["label"].split()[0] for k in members) + f" {s}",
                        "storms": members, "color": SEASON_COLOR[s], "tracts": int(r["tracts"]),
                        "n_damaged": int(r["n_damaged"]), "destroyed": float(r["destroyed_share"]),
                        "months_3": None if pd.isna(r["months_3"]) else float(r["months_3"]),
                        "restored_3": None if pd.isna(r["restored_share_3"]) else float(r["restored_share_3"]),
                        "rwr_3": None if pd.isna(r["rwr_share_3"]) else float(r["rwr_share_3"])})

    fl_union = fl.geometry.union_all()
    return {
        "map.json": {"seasons": seasons, "counties": names, "tracts": table, "min_homes": MIN_HOMES,
                     "frame": {"w": int(round((maxx - minx) / UNIT)), "h": int(round((maxy - miny) / UNIT)),
                               "unit_m": UNIT, "crs": f"EPSG:{CRS}"}},
        "geo/tracts.json": geo_tracts,
        "geo/counties.json": {"counties": counties, "context": context},
        "geo/tracks.json": tracks(fl_union, fr),
    }


def checks(files):
    m = files["map.json"]
    ian = next(s for s in m["seasons"] if s["season"] == 2022)
    tk = {t["key"]: t for t in files["geo/tracks.json"]}
    return [
        {"label": "struck tract-seasons on the map, every one with a shape", "site": f"{len(m['tracts']['key']):,}",
         "paper": None, "ok": True, "info": True},
        {"label": "L25 resident owner-occupied homes, all seasons (season totals)",
         "site": f"{sum(s['n_damaged'] for s in m['seasons']):,}", "paper": None, "ok": True, "info": True},
        {"label": "landfall rings, every HURDAT2 L record inside the frame as in Figure 2: Matthew, Irma, Ian, Sally",
         "site": ", ".join(str(tk[k]["landfalls_fl"]) for k in ("matthew_2016", "irma_2017", "ian_2022", "sally_2020")),
         "paper": None, "ok": True, "info": True},
        {"label": "Ian 2022 at 27 months: restored share and under a new owner among restored",
         "site": f"{pct(ian['restored_3'])}, {num(ian['rwr_3'])}", "paper": None, "ok": True, "info": True},
    ]
