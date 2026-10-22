#!/usr/bin/env python3
r"""Publish the companion site to Cloudflare Pages.

Copies the files tools\sitemap.py lists as public (the HTML documents, the
stylesheet, the JavaScript modules and the data files; never the tools or
the README) into dist\, then deploys dist\ with Wrangler to the Pages
project below. Wrangler must be logged in (npx wrangler login).

Usage:
    py -3 tools/deploy.py --dry-run     list what would go live
    py -3 tools/deploy.py               deploy
"""

import shutil
import subprocess
import sys
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(APP / "tools"))
import sitemap  # noqa: E402

PROJECT = "recovery-without-return"
DIST = APP / "dist"


def main():
    files = sitemap.public_files()
    missing = [f for f in files if not (APP / f).exists()]
    if missing:
        raise SystemExit(f"missing public files, run tools/build_data.py first: {missing[:5]}")
    shutil.rmtree(DIST, ignore_errors=True)
    total = 0
    for f in files:
        dst = DIST / f
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(APP / f, dst)
        total += dst.stat().st_size
    print(f"{len(files)} public files, {total / 1e6:.2f} MB, in {DIST}")
    if "--dry-run" in sys.argv:
        for f in files:
            print("  ", f)
        return
    cmd = f'npx --yes wrangler pages deploy "{DIST}" --project-name {PROJECT} --branch main --commit-dirty=true'
    subprocess.run(cmd, shell=True, check=True, cwd=APP)


if __name__ == "__main__":
    main()
