/* Written by tools/sitemap.py from its page list; edit that file. */

export const VERSION = "2";

export const PAGES = [
  {
    "id": "street",
    "file": "index.html",
    "tab": "Two clocks",
    "title": "Physical restoration and ownership continuity: two dimensions of recovery"
  },
  {
    "id": "clocks",
    "file": "clocks.html",
    "tab": "The gap",
    "title": "Restored, but under a new owner: restoration against ownership continuity"
  },
  {
    "id": "map",
    "file": "map.html",
    "tab": "Seven seasons",
    "title": "Where the storms struck, and where the restored homes changed hands"
  },
  {
    "id": "loss",
    "file": "loss.html",
    "tab": "Structural loss",
    "title": "Structural loss: the greater the loss, the more often a restored home has a new owner"
  },
  {
    "id": "capital",
    "file": "capital.html",
    "tab": "Financial resources",
    "title": "Financial resources: where tracts were insured and better off, the original owner restores"
  },
  {
    "id": "owners",
    "file": "owners.html",
    "tab": "Owner occupancy",
    "title": "Owner occupancy: resident owner-occupants restore most and clear least"
  },
  {
    "id": "shore",
    "file": "shore.html",
    "tab": "The shore",
    "title": "The shore: where structural loss is greatest, not where ownership change among restored homes is"
  },
  {
    "id": "data",
    "file": "data.html",
    "tab": "Data and methods",
    "title": "Records, measures, models and hypotheses"
  }
];

export const FILES = {
  "meta": "data/meta.json",
  "street": "data/street.json",
  "clocks": "data/clocks.json",
  "map": "data/map.json",
  "loss": "data/loss.json",
  "capital": "data/capital.json",
  "owners": "data/owners.json",
  "shore": "data/shore.json",
  "data": "data/data.json"
};

export const GEO = ["data/geo/counties.json", "data/geo/tracts.json", "data/geo/tracks.json"];
