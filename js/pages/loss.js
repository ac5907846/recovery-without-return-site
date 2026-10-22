import { boot } from "../shell.js";
import { $ } from "../lib/dom.js";
import { lossChart } from "../charts/loss.js";

boot({
  id: "loss",
  needs: ["loss"],
  mount(app) { lossChart($("#chart"), app); },
});
