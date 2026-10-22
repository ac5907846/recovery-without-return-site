import { boot } from "../shell.js";
import { $ } from "../lib/dom.js";
import { ownersChart } from "../charts/owners.js";

boot({
  id: "owners",
  needs: ["owners"],
  mount(app) { ownersChart($("#chart"), app); },
});
