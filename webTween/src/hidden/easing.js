/* ------------------------------------------------------------------ */
/*  Easing — how the speed changes over the animation                 */
/* ------------------------------------------------------------------ */

function bounceOut(t) {
  var n = 7.5625,
    d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}

// Every style written as its "In" version; Out and InOut are made from it.
var easeIn = {
  Linear: function (t) {
    return t;
  },
  Sine: function (t) {
    return 1 - Math.cos((t * Math.PI) / 2);
  },
  Quad: function (t) {
    return t * t;
  },
  Cubic: function (t) {
    return t * t * t;
  },
  Quart: function (t) {
    return t * t * t * t;
  },
  Quint: function (t) {
    return t * t * t * t * t;
  },
  Exponential: function (t) {
    return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
  },
  Circular: function (t) {
    return 1 - Math.sqrt(1 - t * t);
  },
  Back: function (t) {
    return 2.70158 * t * t * t - 1.70158 * t * t;
  },
  Elastic: function (t) {
    if (t === 0 || t === 1) return t;
    return (
      -Math.pow(2, 10 * t - 10) *
      Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3))
    );
  },
  Bounce: function (t) {
    return 1 - bounceOut(1 - t);
  },
};

function ease(alpha, style, direction) {
  var f = easeIn[style];
  var t = Math.min(1, Math.max(0, alpha));
  if (direction === "In") return f(t);
  if (direction === "Out") return 1 - f(1 - t);
  return t < 0.5 ? f(2 * t) / 2 : 1 - f(2 - 2 * t) / 2;
}

export { ease };
