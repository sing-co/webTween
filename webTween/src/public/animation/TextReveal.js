/* ------------------------------------------------------------------ */
/*  TextReveal — a heading rises in word by word, or letter by letter  */
/* ------------------------------------------------------------------ */

import { pickName } from "../../hidden/helpers.js";
import { addStyles } from "../../hidden/pageStyles.js";
import { findAll, sameWord, wantsLessMotion, whenVisible } from "../../hidden/targets.js";
import { EasingStyle } from "./Enum.js";
import { TweenInfo } from "./TweenInfo.js";
import { TweenService } from "./TweenService.js";

/*
  new TextReveal("h1")                              // word by word, when it scrolls into view
  new TextReveal(".title", { By: "Letters", Stagger: 0.02 })

  Each word (or letter) slides up from behind an invisible line, one after another.
  Write your heading normally in HTML: bold, links and line breaks inside it are kept,
  and screen readers still read the whole sentence.

  Want it on a Timeline instead of on scroll? Use { When: "Never" } and schedule
  reveal.Show() (or tween reveal.Pieces yourself).
*/
function TextReveal(things, settings) {
  if (!(this instanceof TextReveal)) return new TextReveal(things, settings);
  settings = settings || {};
  addStyles("TextReveal", TEXT_REVEAL_CSS);

  // ===== settings (all optional) =====
  this.By = sameWord(settings.By, "Words") === "letters" ? "Letters" : "Words";
  this.Time = settings.Time === undefined ? 0.8 : settings.Time; // how long each piece takes, in seconds
  this.Stagger = settings.Stagger === undefined ? (this.By === "Letters" ? 0.025 : 0.06) : settings.Stagger;
  this.EasingStyle = pickName(settings.EasingStyle || "Quint", EasingStyle, "easing style");
  var when = sameWord(settings.When, "Visible"); // "Visible" (when scrolled to), "Now", or "Never"

  this.Elements = findAll(things, "TextReveal");
  this.Pieces = []; // every word or letter that moves, in reading order

  var self = this;
  this.Elements.forEach(function (el) {
    var pieces = split(el, self.By);
    el._webtweenPieces = pieces;
    self.Pieces = self.Pieces.concat(pieces);
  });

  if (wantsLessMotion()) return; // split but never hidden, so it reads normally

  this.Pieces.forEach(function (piece) {
    TweenService.Create(piece, new TweenInfo(0), { Y: "110%" }).Play();
  });
  this._stops = [];
  if (when === "now") this.Show();
  else if (when !== "never") {
    this.Elements.forEach(function (el) {
      self._stops.push(whenVisible(el, function () {
        self._showPieces(el._webtweenPieces);
      }));
    });
  }
}

// Wrap each word (and each letter, if asked) in two spans: an outer one that hides
// anything below its line, and an inner one that moves.
function split(el, by) {
  if (el._webtweenPieces) return el._webtweenPieces; // already split
  if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
  var pieces = [];

  (function walk(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 1) {
        child.setAttribute("aria-hidden", "true");
        walk(child);
        return;
      }
      if (child.nodeType !== 3 || !child.textContent.trim()) return;
      var bits = child.textContent.split(/(\s+)/);
      var frag = document.createDocumentFragment();
      bits.forEach(function (bit) {
        if (!bit) return;
        if (/^\s+$/.test(bit)) return frag.appendChild(document.createTextNode(bit));
        var word = document.createElement("span");
        word.className = "webtween-word";
        word.setAttribute("aria-hidden", "true");
        (by === "Letters" ? Array.from(bit) : [bit]).forEach(function (text) {
          var mask = document.createElement("span");
          mask.className = "webtween-mask";
          var piece = document.createElement("span");
          piece.className = "webtween-piece";
          piece.textContent = text;
          mask.appendChild(piece);
          word.appendChild(mask);
          pieces.push(piece);
        });
        frag.appendChild(word);
      });
      node.replaceChild(frag, child);
    });
  })(el);
  return pieces;
}

TextReveal.prototype._showPieces = function (pieces) {
  var self = this;
  pieces.forEach(function (piece, i) {
    var info = new TweenInfo(self.Time, self.EasingStyle, "Out", 0, false, i * self.Stagger);
    TweenService.Create(piece, info, { Y: "0%" }).Play();
  });
};

/** Bring all of it in now (for { When: "Never" }, or from a Timeline function). */
TextReveal.prototype.Show = function () {
  if (this._stops) this._stops.forEach(function (stop) { stop(); });
  this._showPieces(this.Pieces);
};

/** Stop waiting to be scrolled to. */
TextReveal.prototype.Destroy = function () {
  if (this._stops) this._stops.forEach(function (stop) { stop(); });
};
TextReveal.prototype.show = TextReveal.prototype.Show;
TextReveal.prototype.destroy = TextReveal.prototype.Destroy;
TextReveal["new"] = function (things, settings) {
  return new TextReveal(things, settings);
};

var TEXT_REVEAL_CSS = [
  ".webtween-word { display: inline-block; white-space: nowrap; }",
  "/* a little room below, so letters like g and y aren't clipped */",
  ".webtween-mask { display: inline-block; overflow: hidden; padding-bottom: 0.12em; margin-bottom: -0.12em; vertical-align: top; }",
  ".webtween-piece { display: inline-block; }",
].join("\n");

export { TextReveal };
