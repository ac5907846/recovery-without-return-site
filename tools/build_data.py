#!/usr/bin/env python3
r"""Build the companion site's data layer from the analysis results.

Every number the site shows is written here from
02_analysis\a*\results\*; nothing is typed into a page. One builder per
page lives in tools\builders\ (street, clocks, map, loss, capital, owners,
shore, data); each returns the JSON files its page reads and a list of
checks that read the same number out of the manuscript draft, so the site
and the paper cannot drift apart unnoticed.

Writes  05_webapp\data\*.json and data\geo\*.json
        the HTML documents and page modules (tools\sitemap.py)

Usage:
    py -3 tools/build_data.py                 rebuild every file
    py -3 tools/build_data.py --check         rebuild, then print every check
    py -3 tools/build_data.py --only loss     rebuild one page's files only (no HTML)
"""

import importlib
import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from builders.common import DATA, dump, months  # noqa: E402

BUILDERS = ["street", "clocks", "map", "loss", "capital", "owners", "shore", "data"]
FAILED = []


def load_site():
    spec = importlib.util.spec_from_file_location("site_map", HERE / "sitemap.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def meta(site_map):
    return {
        "title": site_map.TITLE,
        "subtitle": site_map.SUBTITLE,
        "version": site_map.VERSION,
        "months": months(),
        "palette": {"navy": "#16385c", "pink": "#a8325e", "green": "#2f6b4f", "gray": "#8c8c8c",
                    "gray_dark": "#595959", "gray_light": "#bfbfbf", "wine": "#7b1e3b",
                    "pale_navy": "#dce6f0", "pale_pink": "#f3dde5", "pale_green": "#dfeadf", "pale_gray": "#ececec"},
    }


def run(name):
    try:
        mod = importlib.import_module(f"builders.{name}")
        files = mod.build()
        for fn, obj in files.items():
            dump(fn, obj)
        rows = mod.checks(files) if hasattr(mod, "checks") else []
    except Exception as err:                     # one page's builder must not stop the others
        import traceback
        traceback.print_exc()
        print(f"  ({name}: FAILED, {type(err).__name__}: {err})")
        FAILED.append(name)
        return []
    for r in rows:
        r["page"] = name
    return rows


def show(rows):
    print("\nThe site against the manuscript draft")
    for r in rows:
        mark = "info" if r.get("info") else ("ok  " if r["ok"] else "DIFF")
        paper = "" if r.get("paper") is None else f"   paper: {r['paper']}"
        print(f"  {mark} [{r['page']}] {r['label']}\n         site:  {r['site']}{paper}")
    tested = [r for r in rows if not r.get("info")]
    bad = [r for r in tested if not r["ok"]]
    print(f"\n  {len(tested) - len(bad)} of {len(tested)} match" + ("" if not bad else f"; {len(bad)} DIFFER"))
    return bad


def main():
    DATA.mkdir(exist_ok=True)
    args = sys.argv[1:]
    if "--only" in args:
        rows = run(args[args.index("--only") + 1])
        show(rows)
        return
    site_map = load_site()
    dump("meta.json", meta(site_map))
    rows = []
    for name in BUILDERS:
        print(f"[{name}]")
        rows += run(name)
    site_map.write()
    bad = show(rows) if "--check" in args else [r for r in rows if not r.get("info") and not r["ok"]]
    if FAILED:
        print(f"\nBuilders that failed: {', '.join(FAILED)}")
        sys.exit(1)
    if bad and "--check" not in args:
        print(f"\n{len(bad)} check(s) differ from the manuscript; run with --check to see them")


if __name__ == "__main__":
    main()
