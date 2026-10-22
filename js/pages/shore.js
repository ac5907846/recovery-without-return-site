import { boot } from "../shell.js";
import { $ } from "../lib/dom.js";
import { shoreChart } from "../charts/shore.js";

boot({
  id: "shore",
  needs: ["shore"],
  mount(app) { shoreChart($("#chart"), app); },
});
