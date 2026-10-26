r"""Shared pieces of the data-layer builders: the paths, the paper's number
style, the JSON writer and the check record. One builder module per page
lives beside this file; each exposes

    build()         -> {"<file under data/>": object, ...}
    checks(files)   -> [check(...), ...]      (optional)

and tools\build_data.py runs them and writes the files.

A check reads a number out of the manuscript draft (the file
03_manuscripts\working\build_draft.py builds from) with a pattern and
compares it with the number the site prints, both in the paper's style, so
the site and the paper cannot drift apart unnoticed.
"""

import json
import math
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
APP = HERE.parent.parent                 # 05_webapp
ROOT = APP.parent                        # the paper folder (03_Paper2_Reconstruction)
A = ROOT / "02_analysis"
WORKING = ROOT / "03_manuscripts" / "working"
RAW = ROOT.parent / "01_rawData"
DATA = APP / "data"

if str(A) not in sys.path:
    sys.path.insert(0, str(A))

MINUS = "-"                              # the plain hyphen-minus, never U+2212 (the author, 2026-10-20)


# ------------------------------------------------------------------ the paper's number style
def num(x, d=2):
    """'.07', '-1.2', '0'; no leading zero, no plus sign (build_submission.num)."""
    x = float(x)
    if not np.isfinite(x):
        return "n/a"
    s = f"{abs(x):.{d}f}"
    if s.startswith("0.") and d > 0:
        s = s[1:]
    if float(s or 0) == 0:
        return "0"
    return (MINUS if x < 0 else "") + s


def pts(x, d=1):
    """A share as percentage points: .028 -> '2.8'."""
    return num(100 * float(x), d)


def pct(x, d=0):
    return num(100 * float(x), d) + "%"


def stars(p):
    try:
        p = float(p)
    except (TypeError, ValueError):
        return ""
    if not np.isfinite(p):
        return ""
    return "***" if p < .001 else "**" if p < .01 else "*" if p < .05 else ""


def ztest(x1, n1, x2, n2):
    """Two-proportion z test, two-sided p (build_submission.ztest)."""
    from scipy import stats
    p1, p2 = x1 / n1, x2 / n2
    pp = (x1 + x2) / (n1 + n2)
    se = np.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2))
    return float(2 * stats.norm.sf(abs((p1 - p2) / se)))


# ------------------------------------------------------------------ reading results
def rd(stage, name, **kw):
    """A results CSV of one analysis stage."""
    return pd.read_csv(A / stage / "results" / name, **kw)


def q(df, **sel):
    """The one row matching every key = value."""
    x = df
    for k, v in sel.items():
        x = x[x[k] == v]
    if len(x) != 1:
        raise KeyError(f"{len(x)} rows for {sel}")
    return x.iloc[0]


def est(row, scale=100, lo="ci_low", hi="ci_high", e="estimate"):
    """An estimate row as {e, lo, hi, p, n, base} in the site's units (points for scale 100)."""
    out = {"e": float(row[e]) * scale, "lo": float(row[lo]) * scale, "hi": float(row[hi]) * scale}
    if "p" in row:
        out["p"] = float(row["p"])
    if "n" in row and pd.notna(row["n"]):
        out["n"] = int(row["n"])
    if "mean_y" in row and pd.notna(row["mean_y"]):
        out["base"] = float(row["mean_y"])
    return out


def months():
    """Months after landfall of the four rolls, seasons 2016 to 2022 (Table 2's column heads)."""
    d1 = rd("a15_recovery_tests", "d1_restoration.csv", low_memory=False)
    d1 = d1[(d1["sample"] == "2016-2022") & (d1["measure"] == "months_after_landfall") & (d1["by"] == "all")]
    return {int(k): float(v) for k, v in zip(d1["k"], d1["share"])}


def storms():
    from _shared.constants import STORMS
    return STORMS


# ------------------------------------------------------------------ JSON
def clean(o):
    """NaN and infinities become None so the browser accepts the JSON; numpy scalars become Python."""
    if isinstance(o, dict):
        return {str(k): clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    if isinstance(o, (np.bool_,)):
        return bool(o)
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (float, np.floating)):
        o = float(o)
        return None if (math.isnan(o) or math.isinf(o)) else o
    return o


def rnd(o, d=5):
    """Round every float to d significant decimals to keep the files small."""
    if isinstance(o, dict):
        return {k: rnd(v, d) for k, v in o.items()}
    if isinstance(o, list):
        return [rnd(v, d) for v in o]
    if isinstance(o, float):
        return float(f"{o:.{d}g}")
    return o


def dump(name, obj):
    path = DATA / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rnd(clean(obj)), separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(f"  {name}  {path.stat().st_size / 1e3:.0f} kB")


# ------------------------------------------------------------------ checks against the manuscript
_DRAFT = None


def draft():
    """The text of the draft the manuscript is built from (build_draft.SRC)."""
    global _DRAFT
    if _DRAFT is None:
        src = (WORKING / "build_draft.py").read_text(encoding="utf-8")
        m = re.search(r'^SRC\s*=\s*HERE\s*/\s*"([^"]+)"', src, re.M)
        _DRAFT = (WORKING / m.group(1)).read_text(encoding="utf-8").replace("−", "-")
    return _DRAFT


def check(label, site, pattern, group=1):
    """The number the site prints beside the number the draft prints where `pattern`
    matches (the capture group); both are strings in the paper's style."""
    m = re.search(pattern, draft())
    paper = m.group(group) if m else None
    return {"label": label, "site": site, "paper": paper, "ok": paper is not None and paper == site}


def check_groups(label, site, pattern, sep=", "):
    """As check(), with every capture group of the pattern joined by `sep`."""
    m = re.search(pattern, draft())
    paper = sep.join(m.groups()) if m else None
    return {"label": label, "site": site, "paper": paper, "ok": paper is not None and paper == site}
