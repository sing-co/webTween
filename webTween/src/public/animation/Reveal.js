/* ------------------------------------------------------------------ */
/*  Reveal — things fade and rise into place as you scroll to them    */
/* ------------------------------------------------------------------ */

import { pickName } from "../../hidden/helpers.js";
import { findAll, wantsLessMotion } from "../../hidden/targets.js";
import { EasingStyle } from "./Enum.js";
import { TweenInfo } from "./TweenInfo.js";
import { TweenService } from "./TweenService.js";

/*
  new Reveal(".fade-in", { Distance: 30, Stagger: 0.08 })

  Everything that matches starts invisible and a little lower down. When it scrolls
  onto the screen, it fades in and rises into place. Things that come into view
  together go one after another, Stagger seconds apart.

  If someone's device asks for less motion, nothing is hidden or moved.
  Reveal moves things with Y, so don't also tween X, Y, Rotation or Scale on the
  same element: put one inside the other instead.
*/
function Reveal(things, settings) {
  if (!(this instanceof Reveal)) return new Reveal(things, settings);
  settings = settings || {};

  // ===== settings (all optional) =====
  this.Distance = pick(settings.Distance, 28); // how far below its spot it starts, in pixels
  this.Time = pick(settings.Time, 0.9); // how long the fade and rise take, in seconds
  this.EasingStyle = pickName(pick(settings.EasingStyle, "Quint"), EasingStyle, "easing style");
  this.Stagger = pick(settings.Stagger, 0.08); // seconds between things that appear together
  this.Threshold = pick(settings.Threshold, 0.15); // how much of it must be on screen first (0 to 1)

  this.Elements = findAll(things, "Reveal");
  if (wantsLessMotion() || !window.IntersectionObserver) return; // everything just stays visible

  // hide them all, straight away
  var self = this;
  this.Elements.forEach(function (el) {
    TweenService.Create(el, new TweenInfo(0), { Y: self.Distance, Transparency: 1 }).Play();
  });

  // ...and bring each one in the first time it's on screen
  this._watcher = new IntersectionObserver(function (entries) {
    var arriving = entries.filter(function (entry) { return entry.isIntersecting; });
    arriving.forEach(function (entry, i) {
      self._watcher.unobserve(entry.target);
      self._show(entry.target, i * self.Stagger);
    });
  }, { threshold: this.Threshold });
  this.Elements.forEach(function (el) {
    self._watcher.observe(el);
  });
}

function pick(value, fallback) {
  return value === undefined ? fallback : value;
}

Reveal.prototype._show = function (el, delay) {
  var info = new TweenInfo(this.Time, this.EasingStyle, "Out", 0, false, delay);
  TweenService.Create(el, info, { Y: 0, Transparency: 0 }).Play();
};

/** Show everything now, without waiting for it to be scrolled to. */
Reveal.prototype.ShowAll = function () {
  var self = this;
  if (this._watcher) this._watcher.disconnect();
  this.Elements.forEach(function (el, i) {
    self._show(el, i * self.Stagger);
  });
};

/** Stop watching the scroll. Anything not shown yet stays hidden, so call ShowAll() first if you need it. */
Reveal.prototype.Destroy = function () {
  if (this._watcher) this._watcher.disconnect();
};
Reveal.prototype.showAll = Reveal.prototype.ShowAll;
Reveal.prototype.destroy = Reveal.prototype.Destroy;
Reveal["new"] = function (things, settings) {
  return new Reveal(things, settings);
};

export { Reveal };
