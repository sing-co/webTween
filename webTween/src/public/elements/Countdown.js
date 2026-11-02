/* ------------------------------------------------------------------ */
/*  Countdown — days, hours, minutes and seconds until a moment         */
/* ------------------------------------------------------------------ */

import { oops } from "../../hidden/helpers.js";
import { addStyles, findElement } from "../../hidden/pageStyles.js";
import { Signal } from "../../hidden/signal.js";
import { wantsLessMotion } from "../../hidden/targets.js";
import { TweenInfo } from "../animation/TweenInfo.js";
import { TweenService } from "../animation/TweenService.js";

/*
  new Countdown("2026-12-31T18:00:00+01:00", { Parent: "#launch" })

  Give the date with its time zone on the end (+01:00, or Z for UTC) so everyone
  counts down to the same moment, wherever they are. Without one, it's the visitor's
  own clock, which is right for "midnight on New Year's Eve, wherever you are".

  countdown.Finished.Connect(function () { ... }) runs when it reaches zero.
*/
function Countdown(when, settings) {
  if (!(this instanceof Countdown)) return new Countdown(when, settings);
  settings = settings || {};
  this.Target = when instanceof Date ? when : new Date(when);
  if (isNaN(this.Target)) {
    throw oops('Countdown needs a date it understands, like "2026-12-31T18:00:00+01:00". You gave: ' + when);
  }
  addStyles("Countdown", COUNTDOWN_CSS);

  // ===== settings (all optional) =====
  this.Units = settings.Units || ["Days", "Hours", "Minutes", "Seconds"];
  this.Labels = settings.Labels || {}; // e.g. { Days: "jours" } to rename the words under the numbers
  this.FinishedText = settings.FinishedText || ""; // what to show at zero (leave empty to keep 00 00 00)

  this.Finished = new Signal();
  this.Instance = document.createElement("div");
  this.Instance.className = "webtween-countdown";
  this.Instance.setAttribute("role", "timer");

  var self = this;
  this._numbers = {};
  this.Units.forEach(function (unit) {
    if (!SECONDS_IN[unit]) throw oops('Countdown units can be "Days", "Hours", "Minutes" or "Seconds". You gave: ' + unit);
    var part = document.createElement("div");
    part.className = "webtween-countdown-part";
    var number = document.createElement("span");
    number.className = "webtween-countdown-number";
    var label = document.createElement("span");
    label.className = "webtween-countdown-label";
    label.textContent = self.Labels[unit] || unit;
    part.append(number, label);
    self.Instance.appendChild(part);
    self._numbers[unit] = number;
  });
  if (settings.Parent) findElement(settings.Parent, "Countdown").appendChild(this.Instance);

  this._calm = wantsLessMotion();
  this._update();
  this._timer = setInterval(this._update.bind(this), 250);
}

var SECONDS_IN = { Days: 86400, Hours: 3600, Minutes: 60, Seconds: 1 };

Countdown.prototype._update = function () {
  var left = Math.max(0, Math.floor((this.Target - Date.now()) / 1000));
  this.Remaining = left; // seconds to go
  var self = this;

  // the biggest unit takes everything above it (no Days? then Hours can go past 24)
  this.Units.forEach(function (unit) {
    var value = Math.floor(left / SECONDS_IN[unit]);
    left -= value * SECONDS_IN[unit];
    var text = value < 10 ? "0" + value : String(value);
    var number = self._numbers[unit];
    if (number.textContent === text) return;
    var first = number.textContent === "";
    number.textContent = text;
    if (!first && !self._calm) {
      // the changed number drops in from above
      TweenService.Create(number, new TweenInfo(0), { Y: "-40%", Transparency: 1 }).Play();
      TweenService.Create(number, new TweenInfo(0.45, "Quint", "Out"), { Y: "0%", Transparency: 0 }).Play();
    }
  });

  // a sentence for screen readers, updated once a minute so it doesn't chatter
  var minute = Math.floor(this.Remaining / 60);
  if (minute !== this._spokenMinute) {
    this._spokenMinute = minute;
    this.Instance.setAttribute("aria-label", describe(this.Remaining));
  }

  if (this.Remaining === 0) {
    clearInterval(this._timer);
    if (this.FinishedText) {
      this.Instance.textContent = this.FinishedText;
      this.Instance.classList.add("webtween-countdown-done");
    }
    this.Finished._fire();
  }
};

function describe(seconds) {
  var days = Math.floor(seconds / 86400),
    hours = Math.floor((seconds % 86400) / 3600),
    minutes = Math.floor((seconds % 3600) / 60);
  return days + " days, " + hours + " hours and " + minutes + " minutes to go";
}

/** Stop counting. */
Countdown.prototype.Destroy = function () {
  clearInterval(this._timer);
  this.Instance.remove();
};
Countdown.prototype.destroy = Countdown.prototype.Destroy;
Countdown["new"] = function (when, settings) {
  return new Countdown(when, settings);
};

var COUNTDOWN_CSS = [
  ".webtween-countdown { display: flex; gap: 1.5em; }",
  ".webtween-countdown-part { display: flex; flex-direction: column; align-items: flex-start; overflow: hidden; }",
  ".webtween-countdown-number { display: inline-block; font-size: 2.5em; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }",
  ".webtween-countdown-label { font-size: 0.85em; opacity: 0.75; }",
].join("\n");

export { Countdown };
