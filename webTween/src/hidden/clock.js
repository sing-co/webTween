/* ------------------------------------------------------------------ */
/*  The animation clock — one loop drives every playing tween         */
/* ------------------------------------------------------------------ */

var playing = new Set();
var frameRequest = null;

function onFrame() {
  frameRequest = null;
  var now = performance.now();
  playing.forEach(function (tween) {
    tween._step(now);
  });
  if (playing.size) frameRequest = requestAnimationFrame(onFrame);
}
function startClock() {
  if (frameRequest === null) frameRequest = requestAnimationFrame(onFrame);
}

export { playing, startClock };
