/* ------------------------------------------------------------------ */
/*  CompareSlider — drag a line across to compare two pictures          */
/* ------------------------------------------------------------------ */

import { oops } from "../../hidden/helpers.js";
import { addStyles } from "../../hidden/pageStyles.js";
import { Signal } from "../../hidden/signal.js";
import { findOne, wantsLessMotion, whenVisible } from "../../hidden/targets.js";
import { TweenService } from "../animation/TweenService.js";

/*
  new CompareSlider("#compare", {
    Before: "room-before.jpg", After: "room-after.jpg",
    BeforeLabel: "Before", AfterLabel: "After",
    AspectRatio: "16:9",
  })

  The "before" picture is on the left of the line, "after" on the right. Drag anywhere
  on it, or use the arrow keys: it's a real slider underneath, so keyboards and screen
  readers can use it too. It gives a little nudge the first time it's on screen, so
  people know it moves (Hint: false turns that off).
*/
function CompareSlider(thing, settings) {
  if (!(this instanceof CompareSlider)) return new CompareSlider(thing, settings);
  settings = settings || {};
  if (!settings.Before || !settings.After) throw oops("CompareSlider needs a Before and an After picture.");
  addStyles("CompareSlider", COMPARE_CSS);

  this.Changed = new Signal(); // fires with the position, 0 to 100
  var box = (this.Instance = findOne(thing, "CompareSlider"));
  box.classList.add("webtween-compare");
  box.style.aspectRatio = String(ratio(settings.AspectRatio || "16:9"));
  box.textContent = "";

  function image(src, alt, className) {
    var img = document.createElement("img");
    img.src = src;
    img.alt = alt;
    img.className = className;
    img.draggable = false;
    return img;
  }
  var beforeLabel = settings.BeforeLabel === undefined ? "Before" : settings.BeforeLabel;
  var afterLabel = settings.AfterLabel === undefined ? "After" : settings.AfterLabel;
  this._before = image(settings.Before, beforeLabel, "webtween-compare-before");
  var after = image(settings.After, afterLabel, "webtween-compare-after");
  this._handle = document.createElement("div");
  this._handle.className = "webtween-compare-handle";
  this._handle.innerHTML = '<span class="webtween-compare-knob" aria-hidden="true">‹ ›</span>';
  box.append(after, this._before, this._handle);
  [[beforeLabel, "left"], [afterLabel, "right"]].forEach(function (label) {
    if (!label[0]) return;
    var tag = document.createElement("span");
    tag.className = "webtween-compare-label webtween-compare-label-" + label[1];
    tag.textContent = label[0];
    tag.setAttribute("aria-hidden", "true");
    box.appendChild(tag);
  });

  // the real slider, invisible, on top of everything
  var input = (this._input = document.createElement("input"));
  input.type = "range";
  input.min = 0;
  input.max = 100;
  input.step = 0.1;
  input.className = "webtween-compare-input";
  input.setAttribute("aria-label", settings.Label || "Compare " + beforeLabel + " and " + afterLabel);
  box.appendChild(input);

  var self = this;
  input.addEventListener("input", function () {
    self._stopHint = true;
    self.Set(Number(input.value));
  });
  this.Set(settings.Start === undefined ? 50 : settings.Start);

  if (settings.Hint !== false && !wantsLessMotion()) {
    this._stopWaiting = whenVisible(box, function () { self._hint(); }, 0.5);
  }
}

function ratio(value) {
  if (typeof value === "number") return value;
  var parts = String(value).split(/[:\/]/);
  return parts.length === 2 ? parseFloat(parts[0]) / parseFloat(parts[1]) : parseFloat(value) || 16 / 9;
}

/** Move the line, from 0 (all "after") to 100 (all "before"). */
CompareSlider.prototype.Set = function (position) {
  var p = Math.max(0, Math.min(100, position));
  this.Position = p;
  this._input.value = p;
  this._input.setAttribute("aria-valuetext", Math.round(p) + "% " + this._before.alt);
  this._before.style.clipPath = "inset(0 " + (100 - p) + "% 0 0)";
  this._handle.style.left = p + "%";
  this.Changed._fire(p);
};

// A small left-right nudge, so people can see it moves.
CompareSlider.prototype._hint = function () {
  var self = this,
    start = performance.now(),
    from = this.Position;
  var steps = [from, from - 12, from + 10, from]; // where it goes, in turn
  (function frame(now) {
    if (self._stopHint) return;
    var t = Math.min(1, (now - start) / 1600) * (steps.length - 1);
    var leg = Math.min(steps.length - 2, Math.floor(t));
    var eased = TweenService.GetValue(t - leg, "Sine", "InOut");
    self.Set(steps[leg] + (steps[leg + 1] - steps[leg]) * eased);
    if (t < steps.length - 1) requestAnimationFrame(frame);
  })(start);
};

CompareSlider.prototype.Destroy = function () {
  this._stopHint = true;
  if (this._stopWaiting) this._stopWaiting();
  this.Instance.textContent = "";
};
CompareSlider.prototype.set = CompareSlider.prototype.Set;
CompareSlider.prototype.destroy = CompareSlider.prototype.Destroy;
CompareSlider["new"] = function (thing, settings) {
  return new CompareSlider(thing, settings);
};

var COMPARE_CSS = [
  ".webtween-compare { position: relative; overflow: hidden; user-select: none; background: #222; }",
  ".webtween-compare img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; }",
  ".webtween-compare-handle { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: #fff; pointer-events: none; }",
  ".webtween-compare-knob {",
  "  position: absolute; top: 50%; left: 50%; width: 44px; height: 44px; margin: -22px 0 0 -22px;",
  "  display: grid; place-items: center; border-radius: 50%; background: #fff; color: #161616;",
  "  font: 700 16px/1 system-ui, sans-serif; letter-spacing: 2px;",
  "}",
  ".webtween-compare-label {",
  "  position: absolute; top: 12px; padding: 4px 10px; background: rgba(0, 0, 0, 0.55); color: #fff;",
  "  font: 600 13px/1.4 system-ui, sans-serif; pointer-events: none;",
  "}",
  ".webtween-compare-label-left { left: 12px; }",
  ".webtween-compare-label-right { right: 12px; }",
  ".webtween-compare-input {",
  "  position: absolute; inset: 0; width: 100%; height: 100%; margin: 0;",
  "  opacity: 0; cursor: ew-resize; touch-action: pan-y; /* phones can still scroll the page up and down */",
  "}",
  ".webtween-compare:has(.webtween-compare-input:focus-visible) .webtween-compare-knob { outline: 3px solid #fff; outline-offset: 3px; }",
].join("\n");

export { CompareSlider };
