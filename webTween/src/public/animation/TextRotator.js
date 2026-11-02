/* ------------------------------------------------------------------ */
/*  TextRotator — one word in a sentence keeps changing                */
/* ------------------------------------------------------------------ */

import { oops, pickName } from "../../hidden/helpers.js";
import { addStyles } from "../../hidden/pageStyles.js";
import { findOne, sameWord, wantsLessMotion } from "../../hidden/targets.js";
import { EasingStyle } from "./Enum.js";
import { TweenInfo } from "./TweenInfo.js";
import { TweenService } from "./TweenService.js";

/*
  <h1>Websites for <span id="who">designers</span></h1>
  new TextRotator("#who", ["designers", "developers", "everyone"])
  new TextRotator("#who", ["designers", "developers"], { Style: "Type" })

  "Slide" (the default) slides each word up and out as the next one comes in.
  "Type" deletes the word letter by letter and types the next one, with a cursor.
  Screen readers hear all the words once, not a word that keeps changing.
*/
function TextRotator(thing, words, settings) {
  if (!(this instanceof TextRotator)) return new TextRotator(thing, words, settings);
  if (!Array.isArray(words) || words.length < 2) {
    throw oops('TextRotator needs a list of at least two words, like ["designers", "developers"].');
  }
  settings = settings || {};
  addStyles("TextRotator", TEXT_ROTATOR_CSS);

  // ===== settings (all optional) =====
  this.Words = words.map(String);
  this.Style = sameWord(settings.Style, "Slide") === "type" ? "Type" : "Slide";
  this.Every = settings.Every === undefined ? 2.5 : settings.Every; // seconds each word stays
  this.EasingStyle = pickName(settings.EasingStyle || "Quint", EasingStyle, "easing style");
  this.Current = 0;

  // the visible, changing word (hidden from screen readers), and the full list for them
  var host = (this.Instance = findOne(thing, "TextRotator"));
  host.classList.add("webtween-rotator", "webtween-rotator-" + this.Style.toLowerCase());
  host.textContent = "";
  this._shown = document.createElement("span");
  this._shown.className = "webtween-rotator-word";
  this._shown.setAttribute("aria-hidden", "true");
  this._shown.textContent = this.Words[0];
  var spoken = document.createElement("span");
  spoken.className = "webtween-visually-hidden";
  spoken.textContent = this.Words.join(", ");
  host.append(this._shown, spoken);

  if (wantsLessMotion()) return; // just the first word
  this._timer = setInterval(this._onTimer.bind(this), this.Every * 1000);
}

TextRotator.prototype._onTimer = function () {
  if (!document.hidden && !this._busy) this.Next();
};

/** Change to the next word now. */
TextRotator.prototype.Next = function () {
  this.Current = (this.Current + 1) % this.Words.length;
  var word = this.Words[this.Current];
  if (this.Style === "Type") this._type(word);
  else this._slide(word);
};

TextRotator.prototype._slide = function (word) {
  var shown = this._shown,
    self = this;
  this._busy = true;
  var out = TweenService.Create(shown, new TweenInfo(0.35, this.EasingStyle, "In"), { Y: "-100%", Transparency: 1 });
  out.Completed.Connect(function () {
    shown.textContent = word;
    TweenService.Create(shown, new TweenInfo(0), { Y: "100%", Transparency: 1 }).Play();
    var back = TweenService.Create(shown, new TweenInfo(0.5, self.EasingStyle, "Out"), { Y: "0%", Transparency: 0 });
    back.Completed.Connect(function () {
      self._busy = false;
    });
    back.Play();
  });
  out.Play();
};

TextRotator.prototype._type = function (word) {
  var shown = this._shown,
    self = this;
  this._busy = true;
  var deleting = setInterval(function () {
    if (shown.textContent.length) return (shown.textContent = shown.textContent.slice(0, -1));
    clearInterval(deleting);
    var i = 0;
    var typing = setInterval(function () {
      shown.textContent = word.slice(0, ++i);
      if (i >= word.length) {
        clearInterval(typing);
        self._busy = false;
      }
    }, 70);
    self._typing = typing;
  }, 40);
  this._deleting = deleting;
};

/** Stop changing words. */
TextRotator.prototype.Destroy = function () {
  clearInterval(this._timer);
  clearInterval(this._deleting);
  clearInterval(this._typing);
};
TextRotator.prototype.next = TextRotator.prototype.Next;
TextRotator.prototype.destroy = TextRotator.prototype.Destroy;
TextRotator["new"] = function (thing, words, settings) {
  return new TextRotator(thing, words, settings);
};

var TEXT_ROTATOR_CSS = [
  ".webtween-rotator { display: inline-block; vertical-align: bottom; }",
  ".webtween-rotator-slide { overflow: hidden; padding-bottom: 0.12em; margin-bottom: -0.12em; }",
  ".webtween-rotator-word { display: inline-block; }",
  "/* the blinking cursor for Style: \"Type\" */",
  ".webtween-rotator-type .webtween-rotator-word::after {",
  "  content: \"\"; display: inline-block; width: 0.06em; height: 0.9em; margin-left: 0.06em;",
  "  vertical-align: -0.08em; background: currentColor; animation: webtween-blink 1s steps(1) infinite;",
  "}",
  "@keyframes webtween-blink { 50% { opacity: 0; } }",
  "@media (prefers-reduced-motion: reduce) { .webtween-rotator-type .webtween-rotator-word::after { animation: none; } }",
  ".webtween-visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }",
].join("\n");

export { TextRotator };
