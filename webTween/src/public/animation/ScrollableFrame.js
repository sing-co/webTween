/* ------------------------------------------------------------------ */
/*  ScrollableFrame — a video that plays as you scroll the page       */
/* ------------------------------------------------------------------ */

import { oops } from "../../hidden/helpers.js";
import { Signal } from "../../hidden/signal.js";
import { addStyles } from "../../hidden/pageStyles.js";

/*
  new ScrollableFrame("intro.mp4", [flyIn, showText], [5, 40], { FrameRate: 30 })
    - when the video reaches frame 5, flyIn runs
    - when it reaches frame 40, showText runs
  Each function gets told "Forward" or "Backward", so you can undo things
  when someone scrolls back up.
*/
function ScrollableFrame(src, keyframeEvents, keyframeTriggers, options) {
  if (!(this instanceof ScrollableFrame)) {
    return new ScrollableFrame(src, keyframeEvents, keyframeTriggers, options);
  }
  if (typeof src !== "string" || !src) {
    throw oops('ScrollableFrame needs the path to a video, like "videos/intro.mp4".');
  }
  keyframeEvents = keyframeEvents || [];
  keyframeTriggers = keyframeTriggers || [];
  if (!Array.isArray(keyframeEvents) || !Array.isArray(keyframeTriggers)) {
    throw oops("keyframeEvents and keyframeTriggers should both be lists, like [flyIn, fadeOut] and [5, 40].");
  }
  if (keyframeEvents.length !== keyframeTriggers.length) {
    throw oops(
      "You gave " + keyframeEvents.length + " keyframe events but " + keyframeTriggers.length +
        " keyframe triggers. Each event needs one frame number to go with it.",
    );
  }
  this._triggers = keyframeTriggers.map(function (frame, i) {
    if (typeof keyframeEvents[i] !== "function") {
      throw oops("Keyframe event number " + (i + 1) + " should be a function.");
    }
    if (typeof frame !== "number" || !(frame >= 0)) {
      throw oops("Keyframe trigger number " + (i + 1) + " should be a frame number, 0 or more. You gave: " + frame);
    }
    return { frame: Math.floor(frame), fn: keyframeEvents[i] };
  });
  this._triggers.sort(function (a, b) {
    return a.frame - b.frame;
  });

  options = options || {};
  var parent = options.Parent || document.body;
  if (typeof parent === "string") {
    var found = document.querySelector(parent);
    if (!found) throw oops('Couldn\'t find anything on the page matching "' + parent + '" to put the ScrollableFrame in.');
    parent = found;
  }

  // Browsers can't tell us a video's frame rate, so it's a setting (most videos are 24, 30 or 60).
  this.FrameRate = options.FrameRate || 30;
  // How many screens of scrolling it takes to get through the whole video.
  this.ScrollLength = options.ScrollLength || 3;
  // How quickly the video catches up to the scroll: 1 = instantly, smaller = smoother.
  this.Smoothness = options.Smoothness === undefined ? 0.15 : Math.min(1, Math.max(0.01, options.Smoothness));
  // Once you've scrolled past the end, keep the last frame as the page's background.
  this.StickToLastFrame = !!(options.StickToLastFrame || options.stickToLastFrame);
  // The video fills the whole window behind the page the entire time, and scrolling
  // the whole page (top to bottom) plays it. Your page's content scrolls over it.
  this.StuckFrame = !!(options.StuckFrame || options.stuckFrame);
  this.Frame = 0;
  this.Progress = 0;
  this.FrameChanged = new Signal();

  // A tall box to scroll through, with a screen-sized "stage" inside that stays stuck
  // to the top of the window while you scroll past.
  var box = document.createElement("div");
  box.className = "webtween-scrollable-frame";
  box.style.position = "relative";
  box.style.height = this.ScrollLength * 100 + "vh";

  var stage = document.createElement("div");
  stage.style.cssText = "position: sticky; top: 0; height: 100vh; overflow: hidden;";

  if (this.StuckFrame) {
    // No tall box needed: the page itself is what you scroll through,
    // and the stage is pinned behind everything.
    box.style.height = "0";
    stage.style.cssText = "position: fixed; inset: 0; z-index: -1; overflow: hidden;";
  }

  var video = document.createElement("video");
  video.src = src;
  video.muted = true; // browsers only let muted videos be controlled freely
  video.playsInline = true;
  video.preload = "auto";
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.style.cssText = "width: 100%; height: 100%; object-fit: cover; display: block;";

  stage.appendChild(video);
  box.appendChild(stage);
  parent.appendChild(box);

  this.Instance = box; // the whole scrolling area
  this.Stage = stage; // put your own things in here and they'll sit on top of the video
  this.Video = video;

  // A "skip the animation" button, so nobody has to scroll through the whole thing.
  this._skipped = false;
  if (options.SkipButton !== false) {
    addStyles("ScrollableFrame", SKIP_CSS);
    var skip = document.createElement("button");
    skip.type = "button";
    skip.className = "webtween-skip";
    skip.textContent = options.SkipText || "Skip the animation";
    skip.addEventListener("click", this.Skip.bind(this));
    stage.appendChild(skip);
    this.SkipButton = skip;
  }

  // A screen-sized box pinned behind the whole page. When you scroll past the end,
  // the video moves in here so its last frame becomes the background.
  this._stuck = false;
  if (this.StickToLastFrame && !this.StuckFrame) {
    this._backdrop = document.createElement("div");
    this._backdrop.className = "webtween-scrollable-frame-backdrop";
    this._backdrop.style.cssText = "position: fixed; inset: 0; z-index: -1; pointer-events: none;";
    document.body.appendChild(this._backdrop);
  }

  var self = this;
  this._ready = false;
  this._shownTime = 0;
  this._lastFrame = -1;
  video.addEventListener("loadedmetadata", function () {
    self._ready = true;
    var lastFrame = Math.floor(video.duration * self.FrameRate);
    self._triggers.forEach(function (t) {
      if (t.frame > lastFrame) {
        console.warn("WebTween: keyframe trigger " + t.frame + " is past the end of the video (about " + lastFrame + " frames).");
      }
    });
    // Phones need a quick play/pause before they'll let us jump around in the video.
    var attempt = video.play();
    if (attempt && attempt.then) {
      attempt.then(function () { video.pause(); }).catch(function () {});
    }
  });
  video.addEventListener("error", function () {
    console.error('WebTween: couldn\'t load the video "' + src + '". Check that the path is right.');
  });

  this._tick = this._tick.bind(this);
  this._frameRequest = requestAnimationFrame(this._tick);
}

ScrollableFrame.prototype._tick = function () {
  this._frameRequest = requestAnimationFrame(this._tick);
  var video = this.Video;
  if (!this._ready || !video.duration) return;

  // How far through the tall box have we scrolled? 0 = top, 1 = bottom.
  var distance = this.Instance.offsetHeight - window.innerHeight;
  var scrolled = -this.Instance.getBoundingClientRect().top;
  if (this.StuckFrame) {
    // ...or with StuckFrame, how far down the whole page are we?
    distance = document.documentElement.scrollHeight - window.innerHeight;
    scrolled = window.scrollY;
  }
  this.Progress = distance > 0 ? Math.min(1, Math.max(0, scrolled / distance)) : 0;

  // Scrolled past the end? Then the video becomes the page's background (and goes back if you scroll up).
  if (this._backdrop) this._setStuck(distance > 0 && scrolled >= distance);

  // After Skip() with StuckFrame, stay on the last frame until they scroll back to the top.
  if (this._skipped && this.Progress === 0) this._skipped = false;
  if (this._skipped) this.Progress = 1;

  // The skip button goes away once there's nothing left to skip.
  if (this.SkipButton) this.SkipButton.classList.toggle("webtween-skip-done", this.Progress >= 0.999);

  // Glide the video toward where the scroll says it should be.
  var targetTime = this.Progress * video.duration;
  this._shownTime += (targetTime - this._shownTime) * this.Smoothness;
  if (Math.abs(targetTime - this._shownTime) < 0.001) this._shownTime = targetTime;

  // Only ask for a new spot once the video has finished jumping to the last one.
  if (!video.seeking && Math.abs(video.currentTime - this._shownTime) > 0.5 / this.FrameRate) {
    video.currentTime = this._shownTime;
  }

  var frame = Math.floor(this._shownTime * this.FrameRate + 0.000001);
  if (frame !== this._lastFrame) {
    this._runTriggers(this._lastFrame, frame);
    this._lastFrame = frame;
    this.Frame = frame;
    this.FrameChanged._fire(frame);
  }
};

// Run every keyframe event whose frame we passed since last time, in the order we passed them.
ScrollableFrame.prototype._runTriggers = function (from, to) {
  var passed;
  if (to > from) {
    passed = this._triggers.filter(function (t) { return t.frame > from && t.frame <= to; });
    passed.forEach(function (t) { safeCall(t.fn, "Forward"); });
  } else {
    passed = this._triggers.filter(function (t) { return t.frame <= from && t.frame > to; });
    passed.reverse().forEach(function (t) { safeCall(t.fn, "Backward"); });
  }
};

// Move the video between its normal spot and the background box behind the page.
// At the moment it swaps, both are exactly screen-sized, so you can't see the jump.
ScrollableFrame.prototype._setStuck = function (stuck) {
  if (stuck === this._stuck) return;
  this._stuck = stuck;
  if (stuck) this._backdrop.appendChild(this.Video);
  else this.Stage.insertBefore(this.Video, this.Stage.firstChild);
};

function safeCall(fn, direction) {
  try {
    fn(direction);
  } catch (err) {
    console.error("WebTween: a keyframe event had an error:", err);
  }
}

/**
  Skip to the end: jump straight to the last frame (every keyframe event on the way
  still runs, "Forward"), and scroll the page to just after the video.
  With StuckFrame there's nothing to scroll past, so it stays on the last frame until
  the page is scrolled back to the top.
*/
ScrollableFrame.prototype.Skip = function () {
  if (this.StuckFrame) {
    this._skipped = true;
  } else {
    var after = window.scrollY + this.Instance.getBoundingClientRect().bottom;
    window.scrollTo({ top: after, behavior: "instant" }); // instant: a smooth scroll would play it all anyway
  }
  if (this.Video.duration) this._shownTime = this.Video.duration;
};

/** Remove it from the page and stop watching the scroll. */
ScrollableFrame.prototype.Destroy = function () {
  cancelAnimationFrame(this._frameRequest);
  this._tick = function () {};
  this.Instance.remove();
  if (this._backdrop) this._backdrop.remove();
};
ScrollableFrame.prototype.destroy = ScrollableFrame.prototype.Destroy;
ScrollableFrame.prototype.skip = ScrollableFrame.prototype.Skip;

// The skip button's default looks. Style .webtween-skip in your own CSS to change them.
var SKIP_CSS = [
  ".webtween-skip {",
  "  position: absolute; left: 50%; bottom: 24px; z-index: 2; /* above anything else you put on the video */",
  "  transform: translateX(-50%);",
  "  min-height: 44px; padding: 0 18px; border: 0; border-radius: 0;",
  "  background: rgba(0, 0, 0, 0.55); color: #fff;",
  "  font: 500 14px/1 system-ui, sans-serif; cursor: pointer;",
  "  transition: opacity 0.4s, visibility 0.4s, background-color 0.2s;",
  "}",
  ".webtween-skip:hover { background: rgba(0, 0, 0, 0.8); }",
  ".webtween-skip:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }",
  ".webtween-skip.webtween-skip-done { opacity: 0; visibility: hidden; pointer-events: none; }",
].join("\n");
ScrollableFrame["new"] = function (a, b, c, d) {
  return new ScrollableFrame(a, b, c, d);
};

export { ScrollableFrame };
