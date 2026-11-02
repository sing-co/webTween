/* ------------------------------------------------------------------ */
/*  Turning "what to animate" into a plain list of page elements       */
/* ------------------------------------------------------------------ */

import { oops } from "./helpers.js";

// Accepts "#box" / ".cards" (everything that matches), one element, a list of
// elements, or Cards and ImageCards (it uses their .Instance).
function findAll(things, what) {
  var list;
  if (typeof things === "string") list = Array.prototype.slice.call(document.querySelectorAll(things));
  else if (things && typeof things.length === "number") list = Array.prototype.slice.call(things);
  else if (things) list = [things];
  else list = [];

  list = list.map(function (thing) {
    return thing && thing.Instance instanceof Element ? thing.Instance : thing;
  });
  list.forEach(function (el) {
    if (!(el instanceof Element)) throw oops(what + " needs page elements, a selector like \".card\", or Cards.");
  });
  return list;
}

// True if the visitor asked their device for less motion.
function wantsLessMotion() {
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

// Exactly one element, or a helpful error.
function findOne(thing, what) {
  var list = findAll(thing, what);
  if (!list.length) throw oops("Couldn't find anything on the page matching \"" + thing + "\" for the " + what + ".");
  return list[0];
}

// Runs fn once, the first time el is (partly) on screen. Returns a function that stops waiting.
function whenVisible(el, fn, threshold) {
  if (!window.IntersectionObserver) {
    fn();
    return function () {};
  }
  var watcher = new IntersectionObserver(function (entries) {
    if (!entries.some(function (e) { return e.isIntersecting; })) return;
    watcher.disconnect();
    fn();
  }, { threshold: threshold === undefined ? 0.2 : threshold });
  watcher.observe(el);
  return function () {
    watcher.disconnect();
  };
}

// The same value whether people write it "Left", "left" or "LEFT".
function sameWord(value, fallback) {
  return String(value === undefined ? fallback : value).toLowerCase();
}

export { findAll, findOne, wantsLessMotion, whenVisible, sameWord };
