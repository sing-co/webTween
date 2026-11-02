/* ------------------------------------------------------------------ */
/*  Default looks for the classes (Card, Carousel)                    */
/* ------------------------------------------------------------------ */

import { oops } from "./helpers.js";

// Puts some CSS on the page, once. It goes at the very top of <head>, so
// your own stylesheet comes after it and wins if you style the same thing.
var addedStyles = {};
function addStyles(name, css) {
  if (addedStyles[name]) return;
  addedStyles[name] = true;
  var style = document.createElement("style");
  style.setAttribute("data-webtween", name);
  style.textContent = css;
  var head = document.head || document.documentElement;
  head.insertBefore(style, head.firstChild);
}

function findElement(thing, what) {
  if (typeof thing !== "string") return thing;
  var found = document.querySelector(thing);
  if (!found) throw oops('Couldn\'t find anything on the page matching "' + thing + '" to put the ' + what + " in.");
  return found;
}

export { addStyles, findElement };
