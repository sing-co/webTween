/* ------------------------------------------------------------------ */
/*  Enum — the same names you know from Roblox                        */
/* ------------------------------------------------------------------ */

var EasingStyle = {
  Linear: "Linear",
  Sine: "Sine",
  Quad: "Quad",
  Cubic: "Cubic",
  Quart: "Quart",
  Quint: "Quint",
  Exponential: "Exponential",
  Circular: "Circular",
  Back: "Back",
  Elastic: "Elastic",
  Bounce: "Bounce",
};
var EasingDirection = { In: "In", Out: "Out", InOut: "InOut" };
var PlaybackState = {
  Begin: "Begin",
  Delayed: "Delayed",
  Playing: "Playing",
  Paused: "Paused",
  Completed: "Completed",
  Cancelled: "Cancelled",
};
var Enum = Object.freeze({
  EasingStyle: Object.freeze(EasingStyle),
  EasingDirection: Object.freeze(EasingDirection),
  PlaybackState: Object.freeze(PlaybackState),
});

export { Enum, EasingStyle, EasingDirection, PlaybackState };
