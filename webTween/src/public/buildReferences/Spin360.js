/* ------------------------------------------------------------------ */
/*  Spin360 — drag a product around to see it from every side           */
/* ------------------------------------------------------------------ */

import { oops } from "../../hidden/helpers.js";
import { addStyles, findElement } from "../../hidden/pageStyles.js";
import { Signal } from "../../hidden/signal.js";
import { wantsLessMotion } from "../../hidden/targets.js";

/*
  // 36 photos of the product, each turned 10° more than the last
  const photos = Array.from({ length: 36 }, (_, i) => "shoe/" + (i + 1) + ".jpg")
  new Spin360(photos, { Parent: "#shoe", AspectRatio: "1:1" })

  Drag left and right (or use the arrow keys) to turn it. Let go mid-drag and it
  keeps turning for a moment, then slows to a stop. It turns slowly on its own until
  someone touches it (AutoSpin: false turns that off). Photos taken all the way
  round, 24 to 72 of them, work best.
*/
function Spin360(frames, settings) {
  if (!(this instanceof Spin360)) return new Spin360(frames, settings);
  if (!Array.isArray(frames) || frames.length < 2) {
    throw oops("Spin360 needs a list of pictures taken all the way round, like [\"1.jpg\", \"2.jpg\", ...].");
  }
  settings = settings || {};
  addStyles("Spin360", SPIN_CSS);

  // ===== settings (all optional) =====
  this.Frames = frames;
  this.Sensitivity = settings.Sensitivity === undefined ? 8 : settings.Sensitivity; // pixels of dragging per picture
  this.AutoSpin = settings.AutoSpin !== false && !wantsLessMotion();
  this.Changed = new Signal(); // fires with the picture number
  this.Current = 0;

  var box = (this.Instance = document.createElement("div"));
  box.className = "webtween-spin";
  box.style.aspectRatio = String(settings.AspectRatio ? ratioOf(settings.AspectRatio) : 1);
  box.tabIndex = 0;
  box.setAttribute("role", "slider");
  box.setAttribute("aria-label", settings.Label || "Turn the product");
  box.setAttribute("aria-valuemin", "0");
  box.setAttribute("aria-valuemax", String(frames.length - 1));

  this._img = document.createElement("img");
  this._img.alt = settings.Alt || "";
  this._img.draggable = false;
  this._hint = document.createElement("span");
  this._hint.className = "webtween-spin-hint";
  this._hint.setAttribute("aria-hidden", "true");
  this._hint.textContent = settings.HintText || "Drag to turn";
  box.append(this._img, this._hint);
  if (settings.Parent) findElement(settings.Parent, "Spin360").appendChild(box);

  // load every picture up front, so turning never waits
  this._loaded = frames.map(function (src) {
    var img = new Image();
    img.src = src;
    return img;
  });
  this.Show(0);

  var self = this;
  this._drag = null;
  box.addEventListener("pointerdown", function (e) {
    self._touched();
    try { box.setPointerCapture(e.pointerId); } catch (err) {}
    self._drag = { x: e.clientX, frame: self.Current, lastX: e.clientX, lastTime: e.timeStamp, speed: 0 };
    box.classList.add("webtween-spin-dragging");
  });
  box.addEventListener("pointermove", function (e) {
    var d = self._drag;
    if (!d) return;
    var seconds = Math.max(0.001, (e.timeStamp - d.lastTime) / 1000);
    d.speed = -(e.clientX - d.lastX) / self.Sensitivity / seconds; // pictures per second
    d.lastX = e.clientX;
    d.lastTime = e.timeStamp;
    self.Show(d.frame - Math.round((e.clientX - d.x) / self.Sensitivity));
  });
  function letGo() {
    if (!self._drag) return;
    var speed = self._drag.speed;
    self._drag = null;
    box.classList.remove("webtween-spin-dragging");
    if (!wantsLessMotion() && Math.abs(speed) > 4) self._glide(speed);
  }
  box.addEventListener("pointerup", letGo);
  box.addEventListener("pointercancel", letGo);
  box.addEventListener("keydown", function (e) {
    var step = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: 1, ArrowDown: -1 }[e.key];
    if (e.key === "Home") step = -self.Current;
    if (step === undefined) return;
    e.preventDefault();
    self._touched();
    self.Show(self.Current + step);
  });

  if (this.AutoSpin) {
    this._autoTimer = setInterval(function () {
      if (!document.hidden) self.Show(self.Current + 1);
    }, 90);
  }
}

function ratioOf(value) {
  if (typeof value === "number") return value;
  var parts = String(value).split(/[:\/]/);
  return parts.length === 2 ? parseFloat(parts[0]) / parseFloat(parts[1]) : parseFloat(value) || 1;
}

// Someone's in control now: stop turning by itself, hide the hint, stop any glide.
Spin360.prototype._touched = function () {
  clearInterval(this._autoTimer);
  cancelAnimationFrame(this._glideRequest);
  this._hint.classList.add("webtween-spin-hint-gone");
};

// Keep turning after a flick, slowing down to a stop.
Spin360.prototype._glide = function (speed) {
  var self = this,
    position = this.Current,
    last = performance.now();
  (function frame(now) {
    var seconds = (now - last) / 1000;
    last = now;
    speed *= Math.pow(0.04, seconds); // loses most of its speed in about a second
    position += speed * seconds;
    self.Show(Math.round(position));
    if (Math.abs(speed) > 1) self._glideRequest = requestAnimationFrame(frame);
  })(last);
};

/** Show picture number n (it wraps round, so -1 is the last one). */
Spin360.prototype.Show = function (n) {
  var count = this.Frames.length;
  var i = ((Math.round(n) % count) + count) % count;
  if (i === this.Current && this._img.getAttribute("src")) return;
  this.Current = i;
  this._img.src = this.Frames[i];
  this.Instance.setAttribute("aria-valuenow", String(i));
  this.Instance.setAttribute("aria-valuetext", Math.round((i / count) * 360) + " degrees");
  this.Changed._fire(i);
};

Spin360.prototype.Destroy = function () {
  this._touched();
  this.Instance.remove();
};
Spin360.prototype.show = Spin360.prototype.Show;
Spin360.prototype.destroy = Spin360.prototype.Destroy;
Spin360["new"] = function (frames, settings) {
  return new Spin360(frames, settings);
};

var SPIN_CSS = [
  ".webtween-spin { position: relative; cursor: grab; touch-action: pan-y; user-select: none; }",
  ".webtween-spin-dragging { cursor: grabbing; }",
  ".webtween-spin img { display: block; width: 100%; height: 100%; object-fit: contain; pointer-events: none; }",
  ".webtween-spin:focus-visible { outline: 3px solid currentColor; outline-offset: 4px; }",
  ".webtween-spin-hint {",
  "  position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%);",
  "  padding: 6px 12px; background: rgba(0, 0, 0, 0.6); color: #fff;",
  "  font: 600 13px/1.4 system-ui, sans-serif; pointer-events: none; transition: opacity 0.4s;",
  "}",
  ".webtween-spin-hint-gone { opacity: 0; }",
].join("\n");

export { Spin360 };
