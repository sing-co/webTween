/* ------------------------------------------------------------------ */
/*  TweenService                                                      */
/* ------------------------------------------------------------------ */

import { oops, pickName } from "../../hidden/helpers.js";
import { ease } from "../../hidden/easing.js";
import { EasingStyle, EasingDirection } from "./Enum.js";
import { TweenInfo } from "./TweenInfo.js";
import { Tween } from "./Tween.js";

var TweenService = {
  /**
   * Make a tween.
   *   thing:     an element, or a CSS selector like "#box" or ".card"
   *   tweenInfo: a TweenInfo (or leave it out for the default: 1 second, Quad, Out)
   *   goals:     what it should look like at the end, e.g. { X: 100, Transparency: 0.5 }
   */
  Create: function (thing, tweenInfo, goals) {
    var el = thing;
    if (typeof thing === "string") {
      el = document.querySelector(thing);
      if (!el)
        throw oops(
          "Couldn't find anything on the page matching \"" + thing + '".',
        );
    }
    if (!el || el.nodeType !== 1) {
      throw oops(
        'The first thing you give Create should be an element on the page, or a selector like "#box".',
      );
    }
    if (!(tweenInfo instanceof TweenInfo))
      tweenInfo = new TweenInfo(tweenInfo || undefined);
    return new Tween(el, tweenInfo, goals);
  },

  /** Get an eased value between 0 and 1, without animating anything. */
  GetValue: function (alpha, easingStyle, easingDirection) {
    return ease(
      alpha,
      pickName(easingStyle, EasingStyle, "easing style"),
      pickName(easingDirection, EasingDirection, "easing direction"),
    );
  },
};
TweenService.create = TweenService.Create;

export { TweenService };
