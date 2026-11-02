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

export { findAll, wantsLessMotion };
