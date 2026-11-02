/* ------------------------------------------------------------------ */
/*  TweenInfo — the "how" of an animation                             */
/* ------------------------------------------------------------------ */

import { oops, pickName } from "../../hidden/helpers.js";
import { EasingStyle, EasingDirection } from "./Enum.js";

function TweenInfo(
  time,
  easingStyle,
  easingDirection,
  repeatCount,
  reverses,
  delayTime,
) {
  if (!(this instanceof TweenInfo)) {
    return new TweenInfo(
      time,
      easingStyle,
      easingDirection,
      repeatCount,
      reverses,
      delayTime,
    );
  }
  // Also accept one settings object: new TweenInfo({ Time: 1, EasingStyle: "Bounce" })
  if (time !== null && typeof time === "object") {
    var o = time;
    var get = function (name) {
      return o[name] !== undefined
        ? o[name]
        : o[name.charAt(0).toLowerCase() + name.slice(1)];
    };
    time = get("Time");
    easingStyle = get("EasingStyle");
    easingDirection = get("EasingDirection");
    repeatCount = get("RepeatCount");
    reverses = get("Reverses");
    delayTime = get("DelayTime");
  }

  time = time === undefined ? 1 : time;
  delayTime = delayTime === undefined ? 0 : delayTime;
  repeatCount = repeatCount === undefined ? 0 : repeatCount;

  if (typeof time !== "number" || !(time >= 0))
    throw oops(
      "Time must be a number of seconds, 0 or more. You gave: " + time,
    );
  if (typeof delayTime !== "number" || !(delayTime >= 0))
    throw oops(
      "DelayTime must be a number of seconds, 0 or more. You gave: " +
        delayTime,
    );
  if (typeof repeatCount !== "number" || isNaN(repeatCount))
    throw oops(
      "RepeatCount must be a number (use -1 to repeat forever). You gave: " +
        repeatCount,
    );

  this.Time = time;
  this.EasingStyle = pickName(
    easingStyle === undefined ? "Quad" : easingStyle,
    EasingStyle,
    "easing style",
  );
  this.EasingDirection = pickName(
    easingDirection === undefined ? "Out" : easingDirection,
    EasingDirection,
    "easing direction",
  );
  this.RepeatCount = repeatCount < 0 ? -1 : Math.floor(repeatCount);
  this.Reverses = !!reverses;
  this.DelayTime = delayTime;
  Object.freeze(this); // like Roblox, a TweenInfo can't be changed after it's made
}
// Roblox style: TweenInfo.new(1, "Quad", "Out")
TweenInfo["new"] = function (a, b, c, d, e, f) {
  return new TweenInfo(a, b, c, d, e, f);
};

export { TweenInfo };
