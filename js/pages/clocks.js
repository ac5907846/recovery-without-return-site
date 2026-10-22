import { boot } from "../shell.js";
import { $ } from "../lib/dom.js";
import { clocksChart } from "../charts/clocks.js";

boot({
  id: "clocks",
  needs: ["clocks"],
  mount(app) { clocksChart($("#chart"), app); },
});
