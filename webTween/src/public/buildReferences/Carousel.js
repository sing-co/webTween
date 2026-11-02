/* ------------------------------------------------------------------ */
/*  Carousel — cards in a 3D ring that spins                          */
/* ------------------------------------------------------------------ */

import { oops, pickName } from "../../hidden/helpers.js";
import { round } from "../../hidden/styles.js";
import { addStyles, findElement } from "../../hidden/pageStyles.js";
import { EasingStyle } from "../animation/Enum.js";
import { TweenService } from "../animation/TweenService.js";
import { Card, CARD_CSS } from "../elements/Card.js";

/*
  new Carousel([cat, dog, human], { Radius: 300, EasingStyle: "Back" })

  The cards can be Cards, or just their settings: [{ Title: "Cat", Color: "tomato" }, ...]
  It spins on its own, and with the scroll wheel while your mouse is over it.
  You can change any setting later and it takes effect straight away:
      carousel.Duration = 0.5
*/
function Carousel(cards, settings) {
  if (!(this instanceof Carousel)) return new Carousel(cards, settings);
  if (!Array.isArray(cards) || cards.length === 0) {
    throw oops("Carousel needs a list of cards, like [cat, dog] or [{ Title: \"Cat\" }].");
  }
  settings = settings || {};
  addStyles("Card", CARD_CSS);
  addStyles("Carousel", CAROUSEL_CSS);

  // ===== settings (all optional) =====
  this.Radius = pick(settings.Radius, 250); // how wide the ring is, in pixels
  this.EasingStyle = pickName(pick(settings.EasingStyle, "Back"), EasingStyle, "easing style"); // how a spin feels
  this.Duration = pick(settings.Duration, 1); // how long one spin takes, in seconds
  this.AutoSpinEvery = pick(settings.AutoSpinEvery, 3); // seconds between spins on its own (0 = never)
  this.PauseAfterScroll = pick(settings.PauseAfterScroll, 4); // seconds to stop auto-spinning after you scroll
  this.ScrollSensitivity = pick(settings.ScrollSensitivity, 60); // how much scrolling counts as one "click"

  // the ring, with the cards inside it
  this.Instance = document.createElement("div");
  this.Instance.className = "webtween-carousel";
  this.Cards = cards.map(function (card) {
    return card instanceof Card ? card : new Card(card);
  });
  var ring = this.Instance;
  this.Cards.forEach(function (card) {
    ring.appendChild(card.Instance);
  });
  findElement(settings.Parent || document.body, "Carousel").appendChild(ring);

  // the spin, and where it's heading
  this._spin = 0; // where the ring is turned to right now, in degrees
  this._from = 0; // tweening from...
  this._to = 0; // ...to here
  this._startTime = 0;
  this._lastSpinTime = performance.now();
  this._lastScrollTime = -Infinity;
  this._wheelBuildUp = 0;

  this._onWheel = this._onWheel.bind(this);
  ring.addEventListener("wheel", this._onWheel, { passive: false });

  // the every-frame loop (like RunService.Heartbeat)
  this._everyFrame = this._everyFrame.bind(this);
  this._frameRequest = requestAnimationFrame(this._everyFrame);
}

function pick(value, fallback) {
  return value === undefined ? fallback : value;
}

// one card's worth of turning, in degrees
Carousel.prototype._step = function () {
  return 360 / this.Cards.length;
};

// Like TweenService:Create(...):Play(), but for the spin number.
Carousel.prototype._spinTo = function (target) {
  this._from = this._spin; // start from wherever it is right now
  this._to = target;
  this._startTime = this._lastSpinTime = performance.now();
};

/** Spin to the next card. */
Carousel.prototype.Next = function () {
  this._spinTo(this._to - this._step()); // build on where it's heading, so fast clicks add up
};

/** Spin back to the previous card. */
Carousel.prototype.Previous = function () {
  this._spinTo(this._to + this._step());
};

Carousel.prototype._everyFrame = function (now) {
  this._frameRequest = requestAnimationFrame(this._everyFrame);

  // spin on its own, unless the user scrolled recently (then let them be in control)
  var quietFor = (now - this._lastScrollTime) / 1000;
  var sinceSpin = (now - this._lastSpinTime) / 1000;
  if (this.AutoSpinEvery > 0 && quietFor >= this.PauseAfterScroll && sinceSpin >= this.AutoSpinEvery) {
    this.Next();
  }

  // how far through the spin are we? 0 → 1
  var alpha = this.Duration > 0 ? Math.min(1, (now - this._startTime) / 1000 / this.Duration) : 1;
  var eased = TweenService.GetValue(alpha, this.EasingStyle, "Out");
  this._spin = this._from + (this._to - this._from) * eased;

  // turn each card to its spot, then push it out from the middle
  var step = this._step(),
    spin = this._spin,
    radius = this.Radius;
  this.Cards.forEach(function (card, i) {
    card.Instance.style.transform = "rotateY(" + round(spin + i * step) + "deg) translateZ(" + radius + "px)";
  });
};

Carousel.prototype._onWheel = function (e) {
  e.preventDefault(); // don't scroll the page while over the ring
  this._wheelBuildUp += e.deltaY;
  if (Math.abs(this._wheelBuildUp) < this.ScrollSensitivity) return; // wait for a proper "click" of the wheel

  var down = this._wheelBuildUp > 0;
  this._wheelBuildUp = 0;
  this._lastScrollTime = performance.now();
  if (down) this.Next();
  else this.Previous();
};

/** Remove it (and its cards) from the page and stop spinning. */
Carousel.prototype.Destroy = function () {
  cancelAnimationFrame(this._frameRequest);
  this._everyFrame = function () {};
  this.Instance.removeEventListener("wheel", this._onWheel);
  this.Instance.remove();
};
Carousel.prototype.destroy = Carousel.prototype.Destroy;
Carousel.prototype.next = Carousel.prototype.Next;
Carousel.prototype.previous = Carousel.prototype.Previous;
Carousel["new"] = function (cards, settings) {
  return new Carousel(cards, settings);
};

var CAROUSEL_CSS = [
  ".webtween-carousel {",
  "  position: relative; height: 100vh;",
  "  perspective: 1000px; /* how strong the 3D looks: smaller = more dramatic */",
  "  transform-style: preserve-3d; /* lets the browser work out which card is in front */",
  "}",
  ".webtween-carousel .webtween-card {",
  "  position: absolute; left: 50%; top: 50%;",
  "  margin: -110px 0 0 -80px; /* half the card's size, so it's centred */",
  "}",
].join("\n");

export { Carousel };
