/* ------------------------------------------------------------------ */
/*  Hotspots — pulsing dots on a picture that open a little card        */
/* ------------------------------------------------------------------ */

import { oops } from "../../hidden/helpers.js";
import { addStyles } from "../../hidden/pageStyles.js";
import { Signal } from "../../hidden/signal.js";
import { findOne, wantsLessMotion } from "../../hidden/targets.js";
import { TweenInfo } from "../animation/TweenInfo.js";
import { TweenService } from "../animation/TweenService.js";

/*
  new Hotspots("#product", [
    { X: 32, Y: 40, Title: "Brushed aluminium", Text: "One piece, no screws." },
    { X: 70, Y: 65, Title: "USB-C", Text: "Charges in 40 minutes." },
  ])

  X and Y are where the dot goes, in percent of the picture's width and height
  (0, 0 is the top left). Click a dot (or Tab to it and press Enter) to open its
  card; the card opens on whichever side has room.
*/
var made = 0;

function Hotspots(thing, spots, settings) {
  if (!(this instanceof Hotspots)) return new Hotspots(thing, spots, settings);
  if (!Array.isArray(spots) || !spots.length) {
    throw oops('Hotspots needs a list of spots, like [{ X: 30, Y: 40, Title: "Aluminium body" }].');
  }
  addStyles("Hotspots", HOTSPOTS_CSS);
  this.Opened = new Signal(); // fires with the spot's number, or -1 when they all close
  this.Current = -1;
  this._calm = wantsLessMotion();

  var box = (this.Instance = findOne(thing, "Hotspots"));
  box.classList.add("webtween-hotspots");
  if (getComputedStyle(box).position === "static") box.style.position = "relative";

  var self = this,
    id = "webtween-hotspots-" + ++made;
  this.Spots = spots.map(function (spot, i) {
    if (typeof spot.X !== "number" || typeof spot.Y !== "number") {
      throw oops("Hotspot number " + (i + 1) + " needs an X and a Y, in percent.");
    }
    var dot = document.createElement("button");
    dot.type = "button";
    dot.className = "webtween-spot";
    dot.style.left = spot.X + "%";
    dot.style.top = spot.Y + "%";
    dot.setAttribute("aria-expanded", "false");
    dot.setAttribute("aria-label", spot.Title || "Detail " + (i + 1));
    dot.setAttribute("aria-controls", id + "-" + i);

    var card = document.createElement("div");
    card.className = "webtween-spot-card";
    card.id = id + "-" + i;
    card.hidden = true;
    if (spot.Title) {
      var title = document.createElement("strong");
      title.textContent = spot.Title;
      card.appendChild(title);
    }
    if (spot.Text) {
      var text = document.createElement("p");
      text.textContent = spot.Text;
      card.appendChild(text);
    }
    // open on the side with more room
    var left = spot.X > 55, up = spot.Y > 60;
    card.style[left ? "right" : "left"] = (left ? 100 - spot.X : spot.X) + "%";
    card.style[up ? "bottom" : "top"] = (up ? 100 - spot.Y : spot.Y) + "%";
    card.style.margin = (up ? "0 0 26px" : "26px 0 0");
    card.style.transformOrigin = (up ? "bottom " : "top ") + (left ? "right" : "left");

    dot.addEventListener("click", function () {
      if (self.Current === i) self.Close();
      else self.Open(i);
    });
    box.append(dot, card);
    return { dot: dot, card: card };
  });

  this._onOutside = function (e) {
    if (!box.contains(e.target)) self.Close();
  };
  this._onKey = function (e) {
    if (e.key === "Escape" && self.Current >= 0) {
      var dot = self.Spots[self.Current].dot;
      self.Close();
      dot.focus();
    }
  };
  document.addEventListener("pointerdown", this._onOutside);
  document.addEventListener("keydown", this._onKey);
}

/** Open spot number i's card (the first is 0). */
Hotspots.prototype.Open = function (i) {
  this.Close();
  var spot = this.Spots[i];
  spot.card.hidden = false;
  spot.dot.setAttribute("aria-expanded", "true");
  spot.dot.classList.add("webtween-spot-open");
  this.Current = i;
  this.Opened._fire(i);
  if (this._calm) return;
  TweenService.Create(spot.card, new TweenInfo(0), { Scale: 0.92, Transparency: 1 }).Play();
  TweenService.Create(spot.card, new TweenInfo(0.3, "Back", "Out"), { Scale: 1, Transparency: 0 }).Play();
};

/** Close whichever card is open. */
Hotspots.prototype.Close = function () {
  if (this.Current < 0) return;
  var spot = this.Spots[this.Current];
  spot.card.hidden = true;
  spot.dot.setAttribute("aria-expanded", "false");
  spot.dot.classList.remove("webtween-spot-open");
  this.Current = -1;
  this.Opened._fire(-1);
};

Hotspots.prototype.Destroy = function () {
  document.removeEventListener("pointerdown", this._onOutside);
  document.removeEventListener("keydown", this._onKey);
  this.Spots.forEach(function (spot) {
    spot.dot.remove();
    spot.card.remove();
  });
};
Hotspots.prototype.open = Hotspots.prototype.Open;
Hotspots.prototype.close = Hotspots.prototype.Close;
Hotspots.prototype.destroy = Hotspots.prototype.Destroy;
Hotspots["new"] = function (thing, spots, settings) {
  return new Hotspots(thing, spots, settings);
};

var HOTSPOTS_CSS = [
  ".webtween-spot {",
  "  position: absolute; z-index: 2; width: 28px; height: 28px; margin: -14px 0 0 -14px; padding: 0;",
  "  border: 3px solid #fff; border-radius: 50%; background: rgba(22, 22, 22, 0.55); cursor: pointer;",
  "}",
  ".webtween-spot::after {",
  "  content: \"\"; position: absolute; inset: -3px; border-radius: 50%; border: 2px solid #fff;",
  "  animation: webtween-pulse 2s ease-out infinite; pointer-events: none;",
  "}",
  ".webtween-spot-open { background: #fff; }",
  ".webtween-spot:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }",
  "@keyframes webtween-pulse { from { transform: scale(1); opacity: 0.9; } to { transform: scale(2.2); opacity: 0; } }",
  "@media (prefers-reduced-motion: reduce) { .webtween-spot::after { animation: none; } }",
  ".webtween-spot-card {",
  "  position: absolute; z-index: 3; width: max-content; max-width: min(260px, 70%); padding: 12px 14px;",
  "  background: #fff; color: #161616; font: 14px/1.45 system-ui, sans-serif;",
  "  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); /* it floats over the picture */",
  "}",
  ".webtween-spot-card[hidden] { display: none; }",
  ".webtween-spot-card strong { display: block; margin-bottom: 2px; }",
  ".webtween-spot-card p { margin: 0; }",
].join("\n");

export { Hotspots };
