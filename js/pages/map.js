import { boot } from "../shell.js";
import { $ } from "../lib/dom.js";
import { mapChart } from "../charts/map.js";

boot({
  id: "map",
  needs: ["map", "geo"],
  mount(app) { mapChart($("#chart"), app); },
});
