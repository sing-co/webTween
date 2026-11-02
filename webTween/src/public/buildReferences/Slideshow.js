/* ------------------------------------------------------------------ */
/*  Slideshow — pictures that slowly fade from one to the next        */
/* ------------------------------------------------------------------ */

import { oops, pickName } from "../../hidden/helpers.js";
import { addStyles, findElement } from "../../hidden/pageStyles.js";
import { findAll, wantsLessMotion } from "../../hidden/targets.js";
import { EasingStyle } from "../animation/Enum.js";
import { TweenInfo } from "../animation/TweenInfo.js";
import { TweenService } from "../animation/TweenService.js";
import { ImageCard } from "../elements/ImageCard.js";

/*
  new Slideshow(["pool.jpg", "lobby.jpg"], { AspectRatio: "16:9", Every: 6, Parent: "#about" })

  The slides can be picture paths (each becomes an ImageCard in AspectRatio's shape),
  ImageCards or Cards, or any page elements. They're stacked in one spot and fade
  from one to the next. The first slide decides how big the slideshow is.

  It waits while the tab isn't being looked at. If someone's device asks for less
  motion, it just shows the first slide.
*/
function Slideshow(slides, settings) {
  if (!(this instanceof Slideshow)) return new Slideshow(slides, settings);
  if (!slides || !slides.length) {
    throw oops('Slideshow needs a list of slides, like ["pool.jpg", "lobby.jpg"].');
  }
  settings = settings || {};
  addStyles("Slideshow", SLIDESHOW_CSS);

  // ===== settings (all optional) =====
  this.Every = pick(settings.Every, 6); // seconds each slide stays before the next fades in
  this.FadeTime = pick(settings.FadeTime, 1.6); // how long a fade takes, in seconds
  this.EasingStyle = pickName(pick(settings.EasingStyle, "Sine"), EasingStyle, "easing style");

  // the box they're stacked in
  this.Instance = document.createElement("div");
  this.Instance.className = "webtween-slideshow";
  var ratio = settings.AspectRatio;
  this.Slides = Array.prototype.map.call(slides, function (slide) {
    if (typeof slide === "string") return new ImageCard({ Image: slide, AspectRatio: ratio }).Instance;
    return findAll(slide, "Slideshow")[0];
  });
  var box = this.Instance;
  this.Slides.forEach(function (el) {
    box.appendChild(el);
  });
  if (settings.Parent) findElement(settings.Parent, "Slideshow").appendChild(box);

  // only the first one shows to begin with
  this.Current = 0;
  this._onTop = 1;
  this.Slides.forEach(function (el, i) {
    TweenService.Create(el, new TweenInfo(0), { Transparency: i === 0 ? 0 : 1 }).Play();
  });

  if (!wantsLessMotion() && this.Slides.length > 1) {
    this._timer = setInterval(this._onTimer.bind(this), this.Every * 1000);
  }
}

function pick(value, fallback) {
  return value === undefined ? fallback : value;
}

Slideshow.prototype._onTimer = function () {
  if (!document.hidden) this.Next(); // no point fading while nobody's looking
};

/** Fade to the next slide (back to the first after the last). */
Slideshow.prototype.Next = function () {
  this.Show((this.Current + 1) % this.Slides.length);
};

/** Fade to slide number n (the first slide is 0). */
Slideshow.prototype.Show = function (n) {
  if (n === this.Current || !this.Slides[n]) return;
  var leaving = this.Slides[this.Current];
  var arriving = this.Slides[n];
  this.Current = n;

  // the new slide fades in on top of the old one, then the old one is hidden underneath
  arriving.style.zIndex = ++this._onTop;
  var fade = TweenService.Create(arriving, new TweenInfo(this.FadeTime, this.EasingStyle, "InOut"), { Transparency: 0 });
  fade.Completed.Connect(function (state) {
    if (state === "Completed") TweenService.Create(leaving, new TweenInfo(0), { Transparency: 1 }).Play();
  });
  fade.Play();
};

/** Stop fading and remove it from the page. */
Slideshow.prototype.Destroy = function () {
  clearInterval(this._timer);
  this.Instance.remove();
};
Slideshow.prototype.next = Slideshow.prototype.Next;
Slideshow.prototype.show = Slideshow.prototype.Show;
Slideshow.prototype.destroy = Slideshow.prototype.Destroy;
Slideshow["new"] = function (slides, settings) {
  return new Slideshow(slides, settings);
};

var SLIDESHOW_CSS = [
  ".webtween-slideshow { position: relative; isolation: isolate; /* the slides' stacking stays inside it */ }",
  "/* div.: beats each slide's own .webtween-... styles */",
  "div.webtween-slideshow > :not(:first-child) { position: absolute; inset: 0; }",
].join("\n");

export { Slideshow };
