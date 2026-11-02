/* ------------------------------------------------------------------ */
/*  Per-element memory (moves, spins, which tweens are running)       */
/* ------------------------------------------------------------------ */

import { round } from "./styles.js";

var elementMemory = new WeakMap();

function memoryOf(el) {
  var m = elementMemory.get(el);
  if (!m) {
    m = {
      move: {
        X: { n: 0, unit: "px" },
        Y: { n: 0, unit: "px" },
        Rotation: 0,
        Scale: 1,
      },
      tweens: new Set(),
      holds: 0,
      savedTransition: "",
    };
    elementMemory.set(el, m);
  }
  return m;
}

function writeMove(el, move) {
  el.style.transform =
    "translate(" +
    round(move.X.n) +
    move.X.unit +
    ", " +
    round(move.Y.n) +
    move.Y.unit +
    ") " +
    "rotate(" +
    round(move.Rotation) +
    "deg) scale(" +
    round(move.Scale) +
    ")";
}

export { memoryOf, writeMove };
