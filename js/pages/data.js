import { boot } from "../shell.js";
import { $ } from "../lib/dom.js";
import { dataPage } from "../charts/data.js";

boot({
  id: "data",
  needs: ["data"],
  mount(app) { dataPage($("#chart"), app); },
});
