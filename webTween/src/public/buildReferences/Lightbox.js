/* ------------------------------------------------------------------ */
/*  Lightbox — click a photo and it grows to fill the screen            */
/* ------------------------------------------------------------------ */

import { oops } from "../../hidden/helpers.js";
import { addStyles } from "../../hidden/pageStyles.js";
import { Signal } from "../../hidden/signal.js";
import { findAll, wantsLessMotion } from "../../hidden/targets.js";
import { TweenInfo } from "../animation/TweenInfo.js";
import { TweenService } from "../animation/TweenService.js";

/*
  new Lightbox(".gallery img")
  new Lightbox(myImageCards)

  Click (or press Enter on) any of the photos and it grows from where it is to fill
  the screen. Arrow keys or the buttons go to the next and previous photo; Escape,
  the Close button or a click outside the photo closes it.

  To show a bigger file in the lightbox than on the page, give the image
  data-full="big-photo.jpg". The caption comes from data-caption, or the alt text.
*/
function Lightbox(things, settings) {
  if (!(this instanceof Lightbox)) return new Lightbox(things, settings);
  settings = settings || {};
  addStyles("Lightbox", LIGHTBOX_CSS);

  this.Images = findAll(things, "Lightbox").map(function (el) {
    return el.tagName === "IMG" ? el : el.querySelector("img");
  }).filter(Boolean);
  if (!this.Images.length) throw oops("Lightbox couldn't find any images in what you gave it.");
  this.Opened = new Signal(); // fires with the photo's number
  this.Closed = new Signal();
  this.Current = -1;
  this._calm = wantsLessMotion();

  var self = this;
  this.Images.forEach(function (img, i) {
    img.classList.add("webtween-lightbox-thumb");
    if (!img.closest("a, button")) {
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", "Open photo" + (img.alt ? ": " + img.alt : ""));
    }
    img.addEventListener("click", function (e) {
      e.preventDefault();
      self.Open(i);
    });
    img.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        self.Open(i);
      }
    });
  });

  // the full-screen view, built once and shared by every photo
  var dialog = (this._dialog = document.createElement("dialog"));
  dialog.className = "webtween-lightbox";
  dialog.setAttribute("aria-label", settings.Label || "Photo");
  dialog.innerHTML =
    '<figure class="webtween-lightbox-figure"><img alt=""><figcaption></figcaption></figure>' +
    '<button type="button" class="webtween-lightbox-close">Close</button>' +
    '<button type="button" class="webtween-lightbox-previous" aria-label="Previous photo">‹</button>' +
    '<button type="button" class="webtween-lightbox-next" aria-label="Next photo">›</button>' +
    '<p class="webtween-lightbox-count" aria-live="polite"></p>';
  document.body.appendChild(dialog);
  this._big = dialog.querySelector("img");
  this._caption = dialog.querySelector("figcaption");
  this._count = dialog.querySelector(".webtween-lightbox-count");

  dialog.querySelector(".webtween-lightbox-close").addEventListener("click", function () { self.Close(); });
  dialog.querySelector(".webtween-lightbox-previous").addEventListener("click", function () { self.Previous(); });
  dialog.querySelector(".webtween-lightbox-next").addEventListener("click", function () { self.Next(); });
  dialog.addEventListener("click", function (e) {
    if (e.target === dialog || e.target.classList.contains("webtween-lightbox-figure")) self.Close();
  });
  dialog.addEventListener("cancel", function (e) {
    e.preventDefault(); // Escape: close with the animation instead of instantly
    self.Close();
  });
  dialog.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") self.Next();
    if (e.key === "ArrowLeft") self.Previous();
  });
  if (this.Images.length < 2) dialog.classList.add("webtween-lightbox-single");
}

Lightbox.prototype._fill = function (i) {
  var img = this.Images[i];
  this._big.src = img.getAttribute("data-full") || img.currentSrc || img.src;
  this._big.alt = img.alt || "";
  this._caption.textContent = img.getAttribute("data-caption") || img.alt || "";
  this._count.textContent = this.Images.length > 1 ? i + 1 + " / " + this.Images.length : "";
  this.Current = i;
};

// How to move and shrink the big photo so it sits exactly over the small one.
Lightbox.prototype._overThumb = function () {
  var small = this.Images[this.Current].getBoundingClientRect();
  var big = this._big.getBoundingClientRect();
  if (!big.width || !small.width) return null;
  return {
    X: small.left + small.width / 2 - (big.left + big.width / 2),
    Y: small.top + small.height / 2 - (big.top + big.height / 2),
    Scale: small.width / big.width,
  };
};

/** Open photo number i (the first is 0). */
Lightbox.prototype.Open = function (i) {
  var self = this,
    dialog = this._dialog;
  this._fill(i);
  this._savedOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "hidden"; // the page behind can't scroll
  dialog.showModal();
  this.Opened._fire(i);
  if (this._calm) return;

  TweenService.Create(dialog, new TweenInfo(0), { Transparency: 1 }).Play();
  TweenService.Create(dialog, new TweenInfo(0.3, "Sine", "Out"), { Transparency: 0 }).Play();
  function grow() {
    var from = self._overThumb();
    if (!from) return;
    TweenService.Create(self._big, new TweenInfo(0), from).Play();
    TweenService.Create(self._big, new TweenInfo(0.5, "Quint", "Out"), { X: 0, Y: 0, Scale: 1 }).Play();
  }
  if (this._big.complete && this._big.naturalWidth) grow();
  else this._big.addEventListener("load", grow, { once: true });
};

/** Close it, shrinking back into the photo it came from. */
Lightbox.prototype.Close = function () {
  var self = this,
    dialog = this._dialog;
  if (!dialog.open) return;
  function finish() {
    dialog.close();
    document.documentElement.style.overflow = self._savedOverflow;
    var thumb = self.Images[self.Current];
    if (thumb.tabIndex >= 0) thumb.focus();
    self.Closed._fire();
  }
  if (this._calm) return finish();
  var back = this._overThumb();
  if (back) TweenService.Create(this._big, new TweenInfo(0.35, "Quint", "In"), back).Play();
  var fade = TweenService.Create(dialog, new TweenInfo(0.35, "Sine", "In"), { Transparency: 1 });
  fade.Completed.Connect(function (state) {
    if (state === "Completed") finish();
  });
  fade.Play();
};

/** The next photo (back to the first after the last). */
Lightbox.prototype.Next = function () {
  this._swap((this.Current + 1) % this.Images.length);
};
/** The previous photo. */
Lightbox.prototype.Previous = function () {
  this._swap((this.Current + this.Images.length - 1) % this.Images.length);
};

Lightbox.prototype._swap = function (i) {
  if (this.Images.length < 2) return;
  this._fill(i);
  if (this._calm) return;
  TweenService.Create(this._big, new TweenInfo(0), { X: 0, Y: 0, Scale: 0.96, Transparency: 1 }).Play();
  TweenService.Create(this._big, new TweenInfo(0.35, "Quint", "Out"), { Scale: 1, Transparency: 0 }).Play();
};

Lightbox.prototype.Destroy = function () {
  if (this._dialog.open) this._dialog.close();
  this._dialog.remove();
};
Lightbox.prototype.open = Lightbox.prototype.Open;
Lightbox.prototype.close = Lightbox.prototype.Close;
Lightbox.prototype.next = Lightbox.prototype.Next;
Lightbox.prototype.previous = Lightbox.prototype.Previous;
Lightbox.prototype.destroy = Lightbox.prototype.Destroy;
Lightbox["new"] = function (things, settings) {
  return new Lightbox(things, settings);
};

var LIGHTBOX_CSS = [
  ".webtween-lightbox-thumb { cursor: zoom-in; }",
  ".webtween-lightbox {",
  "  width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; padding: 0; border: 0;",
  "  background: rgba(12, 12, 12, 0.94); color: #fff; overflow: hidden;",
  "}",
  ".webtween-lightbox::backdrop { background: transparent; }",
  ".webtween-lightbox-figure { height: 100%; margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 64px 72px; box-sizing: border-box; }",
  ".webtween-lightbox-figure img { max-width: 100%; max-height: calc(100% - 40px); object-fit: contain; }",
  ".webtween-lightbox-figure figcaption { font: 15px/1.4 system-ui, sans-serif; opacity: 0.85; text-align: center; }",
  ".webtween-lightbox button { position: absolute; border: 0; background: rgba(255, 255, 255, 0.12); color: #fff; font: 600 15px system-ui, sans-serif; cursor: pointer; }",
  ".webtween-lightbox button:hover { background: rgba(255, 255, 255, 0.24); }",
  ".webtween-lightbox button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }",
  ".webtween-lightbox-close { top: 16px; right: 16px; min-height: 44px; padding: 0 16px; }",
  ".webtween-lightbox-previous, .webtween-lightbox-next { top: 50%; width: 48px; height: 64px; margin-top: -32px; font-size: 32px !important; }",
  ".webtween-lightbox-previous { left: 12px; }",
  ".webtween-lightbox-next { right: 12px; }",
  ".webtween-lightbox-single .webtween-lightbox-previous, .webtween-lightbox-single .webtween-lightbox-next { display: none; }",
  ".webtween-lightbox-count { position: absolute; top: 16px; left: 20px; margin: 0; font: 15px system-ui, sans-serif; opacity: 0.8; }",
  "@media (max-width: 600px) { .webtween-lightbox-figure { padding: 64px 12px; } .webtween-lightbox-previous, .webtween-lightbox-next { top: auto; bottom: 16px; margin: 0; } }",
].join("\n");

export { Lightbox };
