import { boot } from "../shell.js";
import { $ } from "../lib/dom.js";
import { streetChart } from "../charts/street.js";

boot({
  id: "street",
  needs: ["street"],
  mount(app) { streetChart($("#chart"), app); },
});
