/* ------------------------------------------------------------------ */
/*  Timeline — line up tweens, functions and other timelines           */
/* ------------------------------------------------------------------ */

import { oops } from "../../hidden/helpers.js";
import { Signal } from "../../hidden/signal.js";
import { logTimeline, showTimelinePanel } from "../../hidden/timelinePanel.js";
import { PlaybackState } from "./Enum.js";
import { Tween } from "./Tween.js";

/*
  const intro = new Timeline({ Name: "Intro" })

  intro.Schedule(titleIn)                     // starts at 0
  intro.Schedule(photoIn, "+0.2")             // 0.2s after the one before it ends
  intro.Schedule(buttonPop, "with")           // at the same time as the one before it
  intro.Schedule(function (direction) {}, 2.5) // runs exactly 2.5s in
  intro.Schedule(otherTimeline)               // timelines can go inside timelines

  intro.Play()

  Functions are told "Forward" or "Backward", like ScrollableFrame's keyframe events,
  because a timeline can be played, scrubbed or jumped back past them.
*/
function Timeline(settings) {
  if (!(this instanceof Timeline)) return new Timeline(settings);
  settings = settings || {};

  // ===== settings (all optional) =====
  this.Name = settings.Name || "Timeline"; // shown by DisplayTimeline
  this.RepeatCount = settings.RepeatCount === undefined ? 0 : settings.RepeatCount; // extra plays (-1 = forever)
  this.Reverses = !!settings.Reverses; // play backwards after each play forwards
  this.Speed = settings.Speed === undefined ? 1 : settings.Speed; // 0.5 = half speed

  this.PlaybackState = PlaybackState.Begin;
  this.Completed = new Signal();
  this.Time = 0; // seconds since the start, repeats included
  this._items = [];
  this._local = 0; // where the playhead is within one play (0 to Duration)
  this._cycle = 0;
  this._prevStart = 0; // where the last thing scheduled starts...
  this._prevEnd = 0; // ...and ends
  this._tick = this._tick.bind(this);
}

/** How long one play takes, in seconds (repeats not included). */
Object.defineProperty(Timeline.prototype, "Duration", {
  get: function () {
    return this._items.reduce(function (most, item) {
      return Math.max(most, item.start + lengthOf(item));
    }, 0);
  },
});

function lengthOf(item) {
  return item.kind === "function" ? 0 : item.thing._totalTime();
}

// How long the whole thing takes, repeats included.
Timeline.prototype._totalTime = function () {
  if (this.RepeatCount < 0) return Infinity;
  return this.Duration * (this.Reverses ? 2 : 1) * (this.RepeatCount + 1);
};

/**
  Add a tween, a function, or another Timeline.
    at:   when it starts. Leave it out for "right after the previous one", or give
          a number of seconds (1.5), "+0.2" / "-0.2" (a gap after, or overlap with,
          the previous one), or "with" (at the same time as the previous one).
    name: what DisplayTimeline calls it (optional)
*/
Timeline.prototype.Schedule = function (thing, at, name) {
  var kind =
    thing instanceof Tween ? "tween"
      : thing instanceof Timeline ? "timeline"
        : typeof thing === "function" ? "function"
          : null;
  if (!kind) {
    throw oops("Schedule needs a tween (from TweenService.Create), a function, or another Timeline.");
  }
  if (thing === this) throw oops("A timeline can't be scheduled inside itself.");
  if (kind !== "function" && thing._totalTime() === Infinity) {
    throw oops(
      "Something that repeats forever (RepeatCount -1) can't go in a timeline, because it never ends. " +
        "Give it a RepeatCount, or set RepeatCount on the Timeline instead.",
    );
  }

  var item = { kind: kind, thing: thing, start: this._whereToStart(at), name: name || nameOf(kind, thing) };
  this._items.push(item);
  this._prevStart = item.start;
  this._prevEnd = item.start + lengthOf(item);
  return this; // so you can chain: intro.Schedule(a).Schedule(b)
};

Timeline.prototype._whereToStart = function (at) {
  if (at === undefined || at === null) return this._prevEnd;
  if (typeof at === "number" && at >= 0) return at;
  if (at === "with") return this._prevStart;
  if (typeof at === "string" && /^[+-]\s*\d*\.?\d+$/.test(at)) {
    return Math.max(0, this._prevEnd + parseFloat(at.replace(/\s/g, "")));
  }
  throw oops('"' + at + "\" isn't a start time. Use a number of seconds like 1.5, or \"+0.2\", \"-0.2\" or \"with\".");
};

// A name for things you didn't name, like "#title: X, opacity".
function nameOf(kind, thing) {
  if (kind === "timeline") return thing.Name;
  if (kind === "function") return thing.name ? thing.name + "()" : "function";
  var el = thing.Instance;
  var who = el.id ? "#" + el.id
    : el.classList.length ? "." + el.classList[0]
      : el.tagName.toLowerCase();
  var what = thing._goals.map(function (goal) {
    return goal.key || goal.cssName;
  });
  return who + ": " + what.join(", ");
}

/** A list of everything scheduled: { Name, Kind, Starts, Ends, Length }, in seconds. */
Timeline.prototype.GetSchedule = function () {
  return this._items.map(function (item) {
    var length = lengthOf(item);
    return { Name: item.name, Kind: item.kind, Starts: item.start, Ends: item.start + length, Length: length };
  });
};

// ===== drawing a moment =====

// Show the timeline as it is at time t within one play. Things are visited in the order
// the playhead meets them (backwards when going backwards), so later things win.
Timeline.prototype._render = function (t, quiet) {
  var forward = t >= this._local;
  this._local = t;
  var items = this._items.slice().sort(function (a, b) {
    return a.start - b.start;
  });
  if (!forward) items.reverse();

  items.forEach(function (item) {
    var length = lengthOf(item);
    var inside = t - item.start; // seconds since this item started (negative = not yet)
    if (item.kind === "function") {
      if (!item.ran && inside >= 0) {
        item.ran = true;
        if (!quiet) safeCall(item.thing, "Forward");
      } else if (item.ran && inside < 0) {
        item.ran = false;
        if (!quiet) safeCall(item.thing, "Backward");
      }
      return;
    }
    // nothing changes for things we're well before or past: skip them
    var clamped = inside < 0 ? -1 : Math.min(inside, length);
    if (clamped === item.shownAt) return;
    item.shownAt = clamped;

    if (item.kind === "tween") item.thing._renderAt(clamped);
    else item.thing._renderTotal(clamped, quiet);

    var finished = inside >= length;
    if (finished && !item.done) {
      item.done = true;
      if (!quiet && item.kind === "tween") item.thing.Completed._fire(PlaybackState.Completed);
    } else if (!finished) {
      item.done = false;
    }
  });
};

// Show the timeline at time T since the start, working out repeats and reverses.
Timeline.prototype._renderTotal = function (T, quiet) {
  var one = this.Duration;
  if (T < 0 || one === 0) return this._render(T < 0 ? -1 : 0, quiet);
  var perCycle = one * (this.Reverses ? 2 : 1);
  var cycles = this.RepeatCount < 0 ? Infinity : this.RepeatCount + 1;
  var cycle = Math.min(Math.floor(T / perCycle), cycles - 1);
  var inCycle = Math.min(T - cycle * perCycle, perCycle);
  var local = inCycle > one ? perCycle - inCycle : inCycle;

  // Starting a new play without Reverses: finish the last one, then jump back to the
  // start without running any functions on the way back.
  if (!this.Reverses && cycle !== this._cycle) {
    this._render(cycle > this._cycle ? one : 0, quiet);
    this._render(cycle > this._cycle ? 0 : one, true);
  }
  this._cycle = cycle;
  this._render(local, quiet);
};

// ===== playing =====

/** Play from where it is (from the start if it's finished). */
Timeline.prototype.Play = function () {
  if (this.PlaybackState === PlaybackState.Playing) return;
  if (this.PlaybackState === PlaybackState.Completed || this.Time >= this._totalTime()) this.Seek(0);
  this.PlaybackState = PlaybackState.Playing;
  this._lastNow = performance.now();
  this._frameRequest = requestAnimationFrame(this._tick);
};

Timeline.prototype._tick = function (now) {
  if (this.PlaybackState !== PlaybackState.Playing) return;
  var seconds = Math.max(0, (now - this._lastNow) / 1000) * this.Speed;
  this._lastNow = now;
  var total = this._totalTime();
  this.Time = Math.min(total, this.Time + seconds);
  this._renderTotal(this.Time);
  if (this.Time >= total) return this._finish();
  this._frameRequest = requestAnimationFrame(this._tick);
};

Timeline.prototype._finish = function () {
  this.PlaybackState = PlaybackState.Completed;
  this._letGo();
  this.Completed._fire(PlaybackState.Completed);
};

// Give CSS transitions back on everything this timeline animated.
Timeline.prototype._letGo = function () {
  this._items.forEach(function (item) {
    if (item.kind !== "function") item.thing._letGo();
  });
};

/** Freeze where it is. Play() carries on. */
Timeline.prototype.Pause = function () {
  if (this.PlaybackState !== PlaybackState.Playing) return;
  this.PlaybackState = PlaybackState.Paused;
  cancelAnimationFrame(this._frameRequest);
};

/** Jump to `seconds` since the start, without changing whether it's playing. */
Timeline.prototype.Seek = function (seconds) {
  var total = this._totalTime();
  this.Time = Math.max(0, Math.min(Number(seconds) || 0, total === Infinity ? Number(seconds) || 0 : total));
  this._renderTotal(this.Time);
  if (this.PlaybackState === PlaybackState.Completed && this.Time < total) this.PlaybackState = PlaybackState.Paused;
};

/** Go back to the start and play. */
Timeline.prototype.Restart = function () {
  this.Pause();
  this.Seek(0);
  this.PlaybackState = PlaybackState.Paused;
  this.Play();
};

/**
  See what's scheduled when.
    ui false: a table in the browser's console
    ui true:  a panel along the bottom of the page where you can play, pause, slow it
              down, and drag the playhead to scrub through it (it doesn't change your code)
*/
Timeline.prototype.DisplayTimeline = function (ui) {
  if (ui) showTimelinePanel(this);
  else logTimeline(this);
};

/** Stop, and close its panel if it's open. */
Timeline.prototype.Destroy = function () {
  this.Pause();
  this._letGo();
  if (this._panel) this._panel.close();
};

function safeCall(fn, direction) {
  try {
    fn(direction);
  } catch (err) {
    console.error("WebTween: a function in a timeline had an error:", err);
  }
}

Timeline.prototype.schedule = Timeline.prototype.Schedule;
Timeline.prototype.play = Timeline.prototype.Play;
Timeline.prototype.pause = Timeline.prototype.Pause;
Timeline.prototype.seek = Timeline.prototype.Seek;
Timeline.prototype.restart = Timeline.prototype.Restart;
Timeline.prototype.displayTimeline = Timeline.prototype.DisplayTimeline;
Timeline.prototype.destroy = Timeline.prototype.Destroy;
// Roblox style: Timeline.new({ Name: "Intro" })
Timeline["new"] = function (settings) {
  return new Timeline(settings);
};

export { Timeline };
