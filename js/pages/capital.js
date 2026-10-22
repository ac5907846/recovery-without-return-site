import { boot } from "../shell.js";
import { $ } from "../lib/dom.js";
import { capitalChart } from "../charts/capital.js";

boot({
  id: "capital",
  needs: ["capital"],
  mount(app) { capitalChart($("#chart"), app); },
});
