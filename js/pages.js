/* Written by tools/sitemap.py from its page list; edit that file. */

export const VERSION = "1";

export const PAGES = [
  {
    "id": "street",
    "file": "index.html",
    "tab": "Two clocks",
    "title": "A damaged home recovers on two clocks: the structure and the owner"
  },
  {
    "id": "clocks",
    "file": "clocks.html",
    "tab": "The gap",
    "title": "Restored, but under a new owner: the gap between the two clocks"
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
    "title": "Financial resources: where owners were insured and better off, the pre-storm owner stays"
  },
  {
    "id": "owners",
    "file": "owners.html",
    "tab": "Owner occupancy",
    "title": "Owner occupancy: residents restore most and clear least, absentee owners wait"
  },
  {
    "id": "shore",
    "file": "shore.html",
    "tab": "The shore",
    "title": "The shore: where the storm does most, not where the clocks separate most"
  },
  {
    "id": "data",
    "file": "data.html",
    "tab": "Data and methods",
    "title": "Records, measures, models and the hypotheses"
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
