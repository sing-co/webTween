/* ------------------------------------------------------------------ */
/*  Reading and writing styles                                        */
/* ------------------------------------------------------------------ */

import { oops } from "./helpers.js";

// Friendly names that don't match a CSS name directly.
var ALIASES = {
  backgroundcolor: "background-color",
  backgroundcolor3: "background-color",
  textcolor: "color",
  textcolor3: "color",
};
var TRANSFORM_NAMES = {
  x: "X",
  y: "Y",
  rotation: "Rotation",
  rotate: "Rotation",
  scale: "Scale",
};
// Styles where a plain number should NOT get "px" added.
var NO_UNIT = [
  "opacity",
  "z-index",
  "font-weight",
  "line-height",
  "flex-grow",
  "flex-shrink",
  "order",
  "zoom",
];

// Matches a number plus the unit right after it, e.g. "12px", "-0.5", "50%".
var NUMBER = /(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)([a-z%]*)/gi;

function toCssName(name) {
  if (name.indexOf("--") === 0) return name; // CSS variables stay as they are
  if (ALIASES[name.toLowerCase()]) return ALIASES[name.toLowerCase()];
  return name
    .replace(/^[A-Z]/, function (c) {
      return c.toLowerCase();
    })
    .replace(/[A-Z]/g, function (c) {
      return "-" + c.toLowerCase();
    });
}

function round(n) {
  return String(Math.round(n * 1000) / 1000);
}

// Makes rgb(1, 2, 3) look like rgba(1, 2, 3, 1) so colors always have 4 numbers.
function sameColorShape(text) {
  return text.replace(/rgba?\(([^)]*)\)/g, function (whole, inside) {
    var nums = inside.match(/-?(?:\d+\.?\d*|\.\d+)/g) || [];
    if (nums.length === 3) nums.push("1");
    return nums.length === 4 ? "rgba(" + nums.join(", ") + ")" : whole;
  });
}

// Splits "10px 20px" into the numbers and the text around them.
function splitNumbers(text) {
  var parts = [],
    numbers = [],
    last = 0,
    match;
  NUMBER.lastIndex = 0;
  while ((match = NUMBER.exec(text))) {
    parts.push(text.slice(last, match.index));
    numbers.push({ n: parseFloat(match[1]), unit: match[2] });
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return { parts: parts, numbers: numbers };
}

function currentStyle(el, cssName) {
  return getComputedStyle(el).getPropertyValue(cssName).trim();
}

// Asks the browser what a value really means on this element (e.g. "50%" -> "320px",
// "red" -> "rgb(255, 0, 0)") by trying it for a moment and putting things back.
function measure(el, cssName, value) {
  var s = el.style;
  var oldValue = s.getPropertyValue(cssName),
    oldPriority = s.getPropertyPriority(cssName);
  s.setProperty(cssName, value);
  var result = currentStyle(el, cssName);
  if (oldValue) s.setProperty(cssName, oldValue, oldPriority);
  else s.removeProperty(cssName);
  return result;
}

function parseLength(value, name) {
  if (typeof value === "number") return { n: value, unit: "px" };
  if (typeof value === "string") {
    var m = value.trim().match(/^(-?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/i);
    if (m) return { n: parseFloat(m[1]), unit: m[2] || "px" };
  }
  throw oops(
    name +
      ' should be a number (like 100) or a size (like "50%"). You gave: ' +
      value,
  );
}

function parseAngle(value) {
  if (typeof value === "number") return value;
  var m =
    typeof value === "string" &&
    value.trim().match(/^(-?(?:\d+\.?\d*|\.\d+))(deg|turn|rad)?$/i);
  if (!m)
    throw oops(
      "Rotation should be a number of degrees (like 90). You gave: " + value,
    );
  var n = parseFloat(m[1]),
    unit = (m[2] || "deg").toLowerCase();
  return unit === "turn" ? n * 360 : unit === "rad" ? (n * 180) / Math.PI : n;
}

export { TRANSFORM_NAMES, NO_UNIT, toCssName, round, sameColorShape, splitNumbers, currentStyle, measure, parseLength, parseAngle };
