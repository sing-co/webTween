/* ------------------------------------------------------------------ */
/*  Tween — one animation you can Play, Pause and Cancel              */
/* ------------------------------------------------------------------ */

import { oops } from "../../hidden/helpers.js";
import { ease } from "../../hidden/easing.js";
import { Signal } from "../../hidden/signal.js";
import { TRANSFORM_NAMES, NO_UNIT, toCssName, round, sameColorShape, splitNumbers, currentStyle, measure, parseLength, parseAngle } from "../../hidden/styles.js";
import { memoryOf, writeMove } from "../../hidden/memory.js";
import { playing, startClock } from "../../hidden/clock.js";
import { PlaybackState } from "./Enum.js";

function Tween(instance, tweenInfo, goals) {
  this.Instance = instance;
  this.TweenInfo = tweenInfo;
  this.PlaybackState = PlaybackState.Begin;
  this.Completed = new Signal();
  this._goals = readGoals(goals);
  this._elapsed = 0;
  this._startTime = 0;
  this._pausedFrom = null;
}

function readGoals(goals) {
  if (!goals || typeof goals !== "object") {
    throw oops(
      "The third thing you give Create should be a list of goals, like { X: 100, Transparency: 0.5 }.",
    );
  }
  return Object.keys(goals).map(function (name) {
    var value = goals[name];
    var moveName = TRANSFORM_NAMES[name.toLowerCase()];
    if (moveName) {
      var target =
        moveName === "Rotation"
          ? parseAngle(value)
          : moveName === "Scale"
            ? Number(value)
            : parseLength(value, moveName);
      if (moveName === "Scale" && isNaN(target))
        throw oops(
          "Scale should be a number (1 is normal size). You gave: " + value,
        );
      return {
        id: "move:" + moveName,
        kind: "move",
        key: moveName,
        target: target,
      };
    }

    var cssName, text;
    if (name.toLowerCase() === "transparency") {
      // Roblox style: 0 = fully visible, 1 = invisible
      cssName = "opacity";
      text = String(1 - Number(value));
    } else {
      cssName = toCssName(name);
      if (typeof value === "number") {
        text =
          NO_UNIT.indexOf(cssName) >= 0 || cssName.indexOf("--") === 0
            ? String(value)
            : value + "px";
      } else if (typeof value === "string") {
        text = value;
      } else {
        throw oops(
          'The goal for "' +
            name +
            '" should be a number or text, like 100 or "red".',
        );
      }
    }
    if (
      cssName.indexOf("--") !== 0 &&
      typeof CSS !== "undefined" &&
      CSS.supports &&
      !CSS.supports(cssName, text)
    ) {
      throw oops(
        "Can't animate \"" +
          name +
          '" to "' +
          text +
          '". Check the spelling of the name and the value.',
      );
    }
    return {
      id: "css:" + cssName,
      kind: "css",
      cssName: cssName,
      target: text,
    };
  });
}

Tween.prototype._isRunning = function () {
  var s = this.PlaybackState;
  return s === "Playing" || s === "Delayed" || s === "Paused";
};

Tween.prototype._touchesSameThing = function (other) {
  return this._goals.some(function (a) {
    return other._goals.some(function (b) {
      return a.id === b.id;
    });
  });
};

// Turn off CSS transitions on the element while we animate it, so they don't fight.
Tween.prototype._hold = function () {
  var m = memoryOf(this.Instance);
  if (m.holds++ === 0) {
    m.savedTransition = this.Instance.style.transition;
    this.Instance.style.transition = "none";
  }
};
Tween.prototype._release = function () {
  var el = this.Instance,
    m = memoryOf(el);
  m.tweens.delete(this);
  if (--m.holds === 0) {
    void getComputedStyle(el).opacity; // let the final values land before transitions come back
    el.style.transition = m.savedTransition;
  }
};

// Write down where everything starts and where it's going.
Tween.prototype._capture = function () {
  var el = this.Instance,
    move = memoryOf(el).move;
  this._goals.forEach(function (goal) {
    if (goal.kind === "move") {
      if (goal.key === "X" || goal.key === "Y") {
        var start = move[goal.key];
        // Different units (px vs %): start from 0 in the new unit.
        goal.start =
          start.unit === goal.target.unit
            ? { n: start.n, unit: start.unit }
            : { n: 0, unit: goal.target.unit };
      } else {
        goal.start = move[goal.key];
      }
      return;
    }
    goal.startText = sameColorShape(currentStyle(el, goal.cssName));
    var endText = sameColorShape(measure(el, goal.cssName, goal.target));
    goal.from = splitNumbers(goal.startText);
    goal.to = splitNumbers(endText);
    goal.canBlend =
      goal.from.numbers.length === goal.to.numbers.length &&
      goal.to.numbers.length > 0;
    if (!goal.canBlend && goal.startText !== endText) {
      console.warn(
        'WebTween: "' +
          goal.cssName +
          '" can\'t change smoothly from "' +
          goal.startText +
          '" to "' +
          endText +
          '", so it will switch halfway through.',
      );
    }
  });
};

// Put every goal at a point between start (0) and finish (1).
Tween.prototype._apply = function (alpha) {
  var el = this.Instance,
    m = memoryOf(el),
    moved = false;
  this._goals.forEach(function (goal) {
    if (goal.kind === "move") {
      moved = true;
      if (goal.key === "X" || goal.key === "Y") {
        m.move[goal.key] = {
          n: goal.start.n + (goal.target.n - goal.start.n) * alpha,
          unit: goal.target.unit,
        };
      } else {
        m.move[goal.key] = goal.start + (goal.target - goal.start) * alpha;
      }
      return;
    }
    var text;
    if (!goal.canBlend) {
      text = alpha < 0.5 ? goal.startText : goal.target;
    } else {
      text = goal.to.parts[0];
      for (var i = 0; i < goal.to.numbers.length; i++) {
        var a = goal.from.numbers[i],
          b = goal.to.numbers[i];
        if (a.unit === b.unit) {
          text += round(a.n + (b.n - a.n) * alpha) + b.unit;
        } else {
          // e.g. from "12px" to "50%": let the browser mix them.
          text +=
            "calc(" +
            round(a.n * (1 - alpha)) +
            (a.unit || "px") +
            " + " +
            round(b.n * alpha) +
            (b.unit || "px") +
            ")";
        }
        text += goal.to.parts[i + 1];
      }
    }
    el.style.setProperty(goal.cssName, text);
  });
  if (moved) writeMove(el, m.move);
};

// Set the exact final values (the ones you typed, so "50%" stays "50%").
Tween.prototype._applyEnd = function (backAtStart) {
  var el = this.Instance,
    m = memoryOf(el),
    moved = false;
  this._goals.forEach(function (goal) {
    if (goal.kind === "move") {
      moved = true;
      m.move[goal.key] = backAtStart ? goal.start : goal.target;
    } else {
      el.style.setProperty(
        goal.cssName,
        backAtStart ? goal.startText : goal.target,
      );
    }
  });
  if (moved) writeMove(el, m.move);
};

Tween.prototype._step = function (now) {
  var info = this.TweenInfo;
  var elapsed = (this._elapsed = Math.max(0, now - this._startTime) / 1000);
  var oneCycle = info.DelayTime + info.Time * (info.Reverses ? 2 : 1);
  var cycles = info.RepeatCount < 0 ? Infinity : info.RepeatCount + 1;
  var cycle = oneCycle > 0 ? Math.floor(elapsed / oneCycle) : Infinity;

  if (cycle >= cycles) return this._finish();

  var inCycle = elapsed - cycle * oneCycle;
  if (inCycle < info.DelayTime) {
    this.PlaybackState = PlaybackState.Delayed;
    if (cycle > 0) this._apply(0);
    return;
  }
  this.PlaybackState = PlaybackState.Playing;
  var progress = info.Time > 0 ? (inCycle - info.DelayTime) / info.Time : 1;
  if (info.Reverses && progress > 1) progress = 2 - progress;
  this._apply(ease(progress, info.EasingStyle, info.EasingDirection));
};

Tween.prototype._finish = function () {
  playing.delete(this);
  this._applyEnd(this.TweenInfo.Reverses);
  this.PlaybackState = PlaybackState.Completed;
  this._release();
  this.Completed._fire(PlaybackState.Completed);
};

/** Start the animation, or carry on after Pause. */
Tween.prototype.Play = function () {
  var state = this.PlaybackState;
  if (state === "Playing" || state === "Delayed") return;
  var now = performance.now();

  if (state === "Paused") {
    this._startTime = now - this._elapsed * 1000;
    this.PlaybackState = this._pausedFrom;
    playing.add(this);
    startClock();
    return;
  }

  var self = this,
    m = memoryOf(this.Instance);
  this._hold();
  // Like Roblox: a new tween on the same thing stops the older one.
  m.tweens.forEach(function (other) {
    if (other !== self && other._isRunning() && other._touchesSameThing(self))
      other.Cancel();
  });
  m.tweens.add(this);
  this._capture();
  this._startTime = now;
  this._elapsed = 0;
  playing.add(this);
  this._step(now);
  startClock();
};

/** Freeze the animation where it is. Play() continues it. */
Tween.prototype.Pause = function () {
  var state = this.PlaybackState;
  if (state !== "Playing" && state !== "Delayed") return;
  this._elapsed = (performance.now() - this._startTime) / 1000;
  this._pausedFrom = state;
  this.PlaybackState = PlaybackState.Paused;
  playing.delete(this);
};

/** Stop the animation. Things stay where they are; Play() starts over from there. */
Tween.prototype.Cancel = function () {
  if (!this._isRunning()) return;
  playing.delete(this);
  this.PlaybackState = PlaybackState.Cancelled;
  this._release();
  this.Completed._fire(PlaybackState.Cancelled);
};

Tween.prototype.play = Tween.prototype.Play;
Tween.prototype.pause = Tween.prototype.Pause;
Tween.prototype.cancel = Tween.prototype.Cancel;

export { Tween };
