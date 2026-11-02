/* ------------------------------------------------------------------ */
/*  Tabs — a row of tabs with a sliding line, and their panels          */
/* ------------------------------------------------------------------ */

import { oops } from "../../hidden/helpers.js";
import { addStyles } from "../../hidden/pageStyles.js";
import { Signal } from "../../hidden/signal.js";
import { findOne, wantsLessMotion } from "../../hidden/targets.js";
import { TweenInfo } from "../animation/TweenInfo.js";
import { TweenService } from "../animation/TweenService.js";

/*
  <div id="menu">
    <section data-tab="Starters"> ... </section>
    <section data-tab="Mains"> ... </section>
    <section data-tab="Desserts"> ... </section>
  </div>
  new Tabs("#menu")

  Each child with a data-tab name becomes a panel, and the names become the tabs.
  A line slides under the chosen tab and the panel rises in. Works with the keyboard
  (arrow keys, Home, End) and screen readers. Without the script, every panel just
  shows one after another, so nothing is ever lost.
*/
var made = 0;

function Tabs(thing, settings) {
  if (!(this instanceof Tabs)) return new Tabs(thing, settings);
  settings = settings || {};
  addStyles("Tabs", TABS_CSS);

  var box = (this.Instance = findOne(thing, "Tabs"));
  this.Panels = Array.prototype.filter.call(box.children, function (child) {
    return child.hasAttribute("data-tab");
  });
  if (!this.Panels.length) throw oops('Tabs needs children with a data-tab name, like <section data-tab="Starters">.');
  this.Changed = new Signal(); // fires with (index, name)
  this._calm = wantsLessMotion();
  box.classList.add("webtween-tabs");

  // the row of tabs, and the line that slides under the chosen one
  var list = (this._list = document.createElement("div"));
  list.className = "webtween-tablist";
  list.setAttribute("role", "tablist");
  if (settings.Label) list.setAttribute("aria-label", settings.Label);
  var id = "webtween-tabs-" + ++made;
  var self = this;
  this.Tabs = this.Panels.map(function (panel, i) {
    var tab = document.createElement("button");
    tab.type = "button";
    tab.className = "webtween-tab";
    tab.id = id + "-tab-" + i;
    tab.setAttribute("role", "tab");
    tab.textContent = panel.getAttribute("data-tab");
    panel.id = panel.id || id + "-panel-" + i;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    panel.tabIndex = 0;
    tab.setAttribute("aria-controls", panel.id);
    tab.addEventListener("click", function () { self.Show(i); });
    list.appendChild(tab);
    return tab;
  });
  this._line = document.createElement("span");
  this._line.className = "webtween-tab-line";
  list.appendChild(this._line);
  box.insertBefore(list, box.firstChild);

  list.addEventListener("keydown", function (e) {
    var count = self.Tabs.length, to = null;
    if (e.key === "ArrowRight") to = (self.Current + 1) % count;
    else if (e.key === "ArrowLeft") to = (self.Current + count - 1) % count;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = count - 1;
    if (to === null) return;
    e.preventDefault();
    self.Show(to);
    self.Tabs[to].focus();
  });
  if (window.ResizeObserver) {
    this._resizeWatcher = new ResizeObserver(function () { self._moveLine(false); });
    this._resizeWatcher.observe(list);
  }

  this.Current = -1;
  this.Show(settings.Start === undefined ? 0 : settings.Start, true);
}

/** Show a tab, by number (the first is 0) or by its name. */
Tabs.prototype.Show = function (which, quietly) {
  var i = typeof which === "number" ? which : this.Panels.findIndex(function (p) {
    return p.getAttribute("data-tab") === which;
  });
  if (i < 0 || i >= this.Panels.length) throw oops('There\'s no tab "' + which + '".');
  if (i === this.Current) return;
  var self = this;

  this.Tabs.forEach(function (tab, n) {
    tab.setAttribute("aria-selected", n === i ? "true" : "false");
    tab.tabIndex = n === i ? 0 : -1;
  });
  this.Panels.forEach(function (panel, n) {
    panel.hidden = n !== i;
  });
  if (!quietly && !this._calm) {
    var panel = this.Panels[i];
    TweenService.Create(panel, new TweenInfo(0), { Y: 12, Transparency: 1 }).Play();
    TweenService.Create(panel, new TweenInfo(0.45, "Quint", "Out"), { Y: 0, Transparency: 0 }).Play();
  }
  this.Current = i;
  this._moveLine(!quietly);
  if (!quietly) this.Changed._fire(i, this.Panels[i].getAttribute("data-tab"));
};

Tabs.prototype._moveLine = function (animate) {
  var tab = this.Tabs[this.Current];
  if (!tab) return;
  var goal = { X: tab.offsetLeft, Width: tab.offsetWidth };
  var time = animate && !this._calm ? 0.4 : 0;
  TweenService.Create(this._line, new TweenInfo(time, "Quint", "Out"), goal).Play();
};

Tabs.prototype.Destroy = function () {
  if (this._resizeWatcher) this._resizeWatcher.disconnect();
  this._list.remove();
  this.Panels.forEach(function (panel) {
    panel.hidden = false;
  });
};
Tabs.prototype.show = Tabs.prototype.Show;
Tabs.prototype.destroy = Tabs.prototype.Destroy;
Tabs["new"] = function (thing, settings) {
  return new Tabs(thing, settings);
};

var TABS_CSS = [
  ".webtween-tablist { position: relative; display: flex; gap: 4px; overflow-x: auto; margin-bottom: 1.5em; scrollbar-width: none; }",
  ".webtween-tab {",
  "  flex: none; min-height: 44px; padding: 0 1em; border: 0; background: none;",
  "  color: inherit; font: inherit; opacity: 0.6; cursor: pointer; transition: opacity 0.2s;",
  "}",
  ".webtween-tab:hover, .webtween-tab[aria-selected=\"true\"] { opacity: 1; }",
  ".webtween-tab:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }",
  ".webtween-tab-line { position: absolute; left: 0; bottom: 0; height: 3px; width: 0; background: currentColor; pointer-events: none; }",
  ".webtween-tabs [role=\"tabpanel\"]:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }",
].join("\n");

export { Tabs };
