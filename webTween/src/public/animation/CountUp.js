/* ------------------------------------------------------------------ */
/*  CountUp — numbers count up from 0 when you scroll to them          */
/* ------------------------------------------------------------------ */

import { pickName } from "../../hidden/helpers.js";
import { findAll, wantsLessMotion, whenVisible } from "../../hidden/targets.js";
import { EasingStyle } from "./Enum.js";
import { TweenService } from "./TweenService.js";

/*
  <p class="stat">12,400+</p>  <p class="stat">$4.9M</p>  <p class="stat">98.5%</p>
  new CountUp(".stat")

  Write the final number in your HTML, the way you want it to end up. CountUp finds
  the number inside the text, keeps whatever is around it ($, +, %, M...) and counts
  up to it the first time it's scrolled onto the screen. Commas and decimals are kept.
*/
function CountUp(things, settings) {
  if (!(this instanceof CountUp)) return new CountUp(things, settings);
  settings = settings || {};

  // ===== settings (all optional) =====
  this.Time = settings.Time === undefined ? 2 : settings.Time; // seconds to count up
  this.EasingStyle = pickName(settings.EasingStyle || "Quart", EasingStyle, "easing style");
  this.From = settings.From === undefined ? 0 : settings.From; // where counting starts

  this.Elements = findAll(things, "CountUp");
  if (wantsLessMotion()) return; // the numbers just stay as you wrote them

  var self = this;
  this._stops = this.Elements.map(function (el) {
    var number = readNumber(el.textContent);
    if (!number) return function () {};
    el.setAttribute("aria-label", el.textContent.trim()); // screen readers hear the final number
    el.style.fontVariantNumeric = "tabular-nums"; // digits all the same width, so it doesn't wobble
    el.textContent = number.write(self.From);
    return whenVisible(el, function () {
      self._count(el, number);
    }, 0.5);
  });
}

// "$12,400+" → a number (12400) and a way to write any number the same way ("$9,870+")
function readNumber(text) {
  var match = /-?\d[\d,]*(\.\d+)?/.exec(text);
  if (!match) return null;
  var raw = match[0];
  var decimals = match[1] ? match[1].length - 1 : 0;
  var commas = raw.indexOf(",") >= 0;
  var before = text.slice(0, match.index),
    after = text.slice(match.index + raw.length);
  return {
    value: parseFloat(raw.replace(/,/g, "")),
    write: function (n) {
      var fixed = n.toFixed(decimals);
      if (commas) {
        var parts = fixed.split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        fixed = parts.join(".");
      }
      return before + fixed + after;
    },
  };
}

CountUp.prototype._count = function (el, number) {
  var self = this,
    start = performance.now();
  (function frame(now) {
    var t = Math.min(1, (now - start) / 1000 / self.Time);
    var eased = TweenService.GetValue(t, self.EasingStyle, "Out");
    el.textContent = number.write(self.From + (number.value - self.From) * eased);
    if (t < 1) requestAnimationFrame(frame);
  })(start);
};

/** Stop waiting to be scrolled to. */
CountUp.prototype.Destroy = function () {
  if (this._stops) this._stops.forEach(function (stop) { stop(); });
};
CountUp.prototype.destroy = CountUp.prototype.Destroy;
CountUp["new"] = function (things, settings) {
  return new CountUp(things, settings);
};

export { CountUp };
