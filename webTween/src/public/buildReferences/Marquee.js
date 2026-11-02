/* ------------------------------------------------------------------ */
/*  Marquee — a strip that scrolls sideways forever (logos, quotes)    */
/* ------------------------------------------------------------------ */

import { addStyles } from "../../hidden/pageStyles.js";
import { round } from "../../hidden/styles.js";
import { findOne, sameWord, wantsLessMotion } from "../../hidden/targets.js";

/*
  <div id="logos"> <img src="a.svg" alt="A"> <img src="b.svg" alt="B"> ... </div>
  new Marquee("#logos", { Speed: 60, Direction: "Left" })

  Whatever is inside the element becomes one long strip that loops without a gap.
  It copies the items as many times as it needs to fill the width (the copies are
  hidden from screen readers), pauses while your mouse is over it, and doesn't
  bother moving while it's off screen.
*/
function Marquee(thing, settings) {
  if (!(this instanceof Marquee)) return new Marquee(thing, settings);
  settings = settings || {};
  addStyles("Marquee", MARQUEE_CSS);

  // ===== settings (all optional) =====
  this.Speed = settings.Speed === undefined ? 60 : settings.Speed; // pixels per second
  this.Direction = sameWord(settings.Direction, "Left") === "right" ? "Right" : "Left";
  this.Gap = settings.Gap === undefined ? 48 : settings.Gap; // pixels between items
  this.PauseOnHover = settings.PauseOnHover !== false;

  var box = (this.Instance = findOne(thing, "Marquee"));
  box.classList.add("webtween-marquee");
  box.style.setProperty("--webtween-gap", this.Gap + "px");

  // one set of the items, which gets copied to fill the width
  this._set = document.createElement("div");
  this._set.className = "webtween-marquee-set";
  while (box.firstChild) this._set.appendChild(box.firstChild);
  this._track = document.createElement("div");
  this._track.className = "webtween-marquee-track";
  this._track.appendChild(this._set);
  box.appendChild(this._track);

  this._offset = 0;
  this._paused = false;
  this._onScreen = true;
  if (wantsLessMotion()) {
    box.classList.add("webtween-marquee-still"); // a plain row that wraps, nothing moves
    return;
  }

  var self = this;
  this._fill();
  if (window.ResizeObserver) {
    this._resizeWatcher = new ResizeObserver(function () { self._fill(); });
    this._resizeWatcher.observe(box);
  }
  if (window.IntersectionObserver) {
    this._screenWatcher = new IntersectionObserver(function (entries) {
      self._onScreen = entries[0].isIntersecting;
    });
    this._screenWatcher.observe(box);
  }
  if (this.PauseOnHover) {
    box.addEventListener("mouseenter", function () { self._paused = true; });
    box.addEventListener("mouseleave", function () { self._paused = false; });
  }
  this._tick = this._tick.bind(this);
  this._frameRequest = requestAnimationFrame(this._tick);
}

// Copy the set until the strip is at least twice as wide as the box, so the loop never shows a gap.
Marquee.prototype._fill = function () {
  var track = this._track;
  while (track.children.length > 1) track.removeChild(track.lastChild);
  var setWidth = this._set.offsetWidth + this.Gap;
  if (!setWidth) return;
  var copies = Math.max(1, Math.ceil((this.Instance.offsetWidth * 2) / setWidth));
  for (var i = 0; i < copies; i++) {
    var copy = this._set.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    Array.prototype.forEach.call(copy.querySelectorAll("a, button, input"), function (el) {
      el.tabIndex = -1; // the copies can't be tabbed to
    });
    track.appendChild(copy);
  }
  this._setWidth = setWidth;
};

Marquee.prototype._tick = function (now) {
  this._frameRequest = requestAnimationFrame(this._tick);
  var seconds = this._last ? Math.min(0.1, (now - this._last) / 1000) : 0;
  this._last = now;
  if (this._paused || !this._onScreen || document.hidden || !this._setWidth) return;
  this._offset = (this._offset + this.Speed * seconds) % this._setWidth;
  var x = this.Direction === "Left" ? -this._offset : this._offset - this._setWidth;
  this._track.style.transform = "translateX(" + round(x) + "px)";
};

/** Stop scrolling. */
Marquee.prototype.Pause = function () {
  this._paused = true;
};
/** Start scrolling again. */
Marquee.prototype.Play = function () {
  this._paused = false;
};
/** Stop for good and put the items back the way they were. */
Marquee.prototype.Destroy = function () {
  cancelAnimationFrame(this._frameRequest);
  if (this._resizeWatcher) this._resizeWatcher.disconnect();
  if (this._screenWatcher) this._screenWatcher.disconnect();
  var box = this.Instance;
  box.textContent = "";
  while (this._set.firstChild) box.appendChild(this._set.firstChild);
  box.classList.remove("webtween-marquee", "webtween-marquee-still");
};
Marquee.prototype.pause = Marquee.prototype.Pause;
Marquee.prototype.play = Marquee.prototype.Play;
Marquee.prototype.destroy = Marquee.prototype.Destroy;
Marquee["new"] = function (thing, settings) {
  return new Marquee(thing, settings);
};

var MARQUEE_CSS = [
  ".webtween-marquee { overflow: hidden; }",
  ".webtween-marquee-track { display: flex; width: max-content; gap: var(--webtween-gap); }",
  ".webtween-marquee-set { display: flex; flex: none; align-items: center; gap: var(--webtween-gap); }",
  ".webtween-marquee-set > * { flex: none; }",
  ".webtween-marquee-still .webtween-marquee-track, .webtween-marquee-still .webtween-marquee-set { width: auto; flex-wrap: wrap; }",
].join("\n");

export { Marquee };
