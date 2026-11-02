/* ------------------------------------------------------------------ */
/*  Parallax — things drift at their own speed as the page scrolls    */
/* ------------------------------------------------------------------ */

import { round } from "../../hidden/styles.js";
import { findAll, wantsLessMotion } from "../../hidden/targets.js";

/*
  new Parallax(".photo", { Speed: 0.1 })
  new Parallax(".photo", { Speed: [0.05, 0.12, 0.08] })   // a speed for each one

  Speed is how much it drifts: 0.1 = it moves a tenth as far as the page scrolls,
  so it seems to float a little. Negative speeds drift the other way.
  Each thing is exactly in its normal spot when it's in the middle of the screen.

  If someone's device asks for less motion, nothing moves.
  Parallax sets the element's CSS transform itself, so don't tween X, Y, Rotation or
  Scale on the same element (or use Reveal on it): put one inside the other instead.
*/
function Parallax(things, settings) {
  if (!(this instanceof Parallax)) return new Parallax(things, settings);
  settings = settings || {};

  this.Speed = settings.Speed === undefined ? 0.1 : settings.Speed;
  this.Elements = findAll(things, "Parallax");
  this._offsets = this.Elements.map(function () { return 0; }); // how far each one is drifted right now

  if (wantsLessMotion()) return;

  this._update = this._update.bind(this);
  this._onScroll = function () {
    if (!this._waiting) {
      this._waiting = true;
      requestAnimationFrame(this._update);
    }
  }.bind(this);
  window.addEventListener("scroll", this._onScroll, { passive: true });
  window.addEventListener("resize", this._onScroll);
  this._update();
}

Parallax.prototype._speedOf = function (i) {
  return Array.isArray(this.Speed) ? this.Speed[i] || 0 : this.Speed;
};

Parallax.prototype._update = function () {
  this._waiting = false;
  var middle = window.innerHeight / 2;
  var self = this;
  this.Elements.forEach(function (el, i) {
    var box = el.getBoundingClientRect();
    // where its middle would be without the drift
    var centre = box.top - self._offsets[i] + box.height / 2;
    var offset = (middle - centre) * self._speedOf(i);
    self._offsets[i] = offset;
    el.style.transform = "translateY(" + round(offset) + "px)";
  });
};

/** Stop drifting and put everything back where it was. */
Parallax.prototype.Destroy = function () {
  if (this._onScroll) {
    window.removeEventListener("scroll", this._onScroll);
    window.removeEventListener("resize", this._onScroll);
  }
  this._update = function () {};
  this.Elements.forEach(function (el) {
    el.style.transform = "";
  });
};
Parallax.prototype.destroy = Parallax.prototype.Destroy;
Parallax["new"] = function (things, settings) {
  return new Parallax(things, settings);
};

export { Parallax };
