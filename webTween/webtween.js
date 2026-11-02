/*
  WebTween — smooth animations for websites, in the style of Roblox's TweenService.

  Add it to your page:
      <script src="webtween.js"></script>

  DON'T EDIT THIS FILE. It's made from the files in src/.
  Change those instead, then run:  npm run build
*/
(() => {
  // src/hidden/helpers.js
  function oops(message) {
    return new Error("WebTween: " + message);
  }
  function pickName(value, list, what) {
    if (typeof value === "string") {
      for (var key in list) {
        if (key.toLowerCase() === value.toLowerCase()) return key;
      }
    }
    throw oops(
      '"' + value + `" isn't a known ` + what + ". Try one of: " + Object.keys(list).join(", ") + "."
    );
  }

  // src/hidden/easing.js
  function bounceOut(t) {
    var n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  }
  var easeIn = {
    Linear: function(t) {
      return t;
    },
    Sine: function(t) {
      return 1 - Math.cos(t * Math.PI / 2);
    },
    Quad: function(t) {
      return t * t;
    },
    Cubic: function(t) {
      return t * t * t;
    },
    Quart: function(t) {
      return t * t * t * t;
    },
    Quint: function(t) {
      return t * t * t * t * t;
    },
    Exponential: function(t) {
      return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
    },
    Circular: function(t) {
      return 1 - Math.sqrt(1 - t * t);
    },
    Back: function(t) {
      return 2.70158 * t * t * t - 1.70158 * t * t;
    },
    Elastic: function(t) {
      if (t === 0 || t === 1) return t;
      return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI / 3));
    },
    Bounce: function(t) {
      return 1 - bounceOut(1 - t);
    }
  };
  function ease(alpha, style, direction) {
    var f = easeIn[style];
    var t = Math.min(1, Math.max(0, alpha));
    if (direction === "In") return f(t);
    if (direction === "Out") return 1 - f(1 - t);
    return t < 0.5 ? f(2 * t) / 2 : 1 - f(2 - 2 * t) / 2;
  }

  // src/public/animation/Enum.js
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
    Bounce: "Bounce"
  };
  var EasingDirection = { In: "In", Out: "Out", InOut: "InOut" };
  var PlaybackState = {
    Begin: "Begin",
    Delayed: "Delayed",
    Playing: "Playing",
    Paused: "Paused",
    Completed: "Completed",
    Cancelled: "Cancelled"
  };
  var Enum = Object.freeze({
    EasingStyle: Object.freeze(EasingStyle),
    EasingDirection: Object.freeze(EasingDirection),
    PlaybackState: Object.freeze(PlaybackState)
  });

  // src/public/animation/TweenInfo.js
  function TweenInfo(time, easingStyle, easingDirection, repeatCount, reverses, delayTime) {
    if (!(this instanceof TweenInfo)) {
      return new TweenInfo(
        time,
        easingStyle,
        easingDirection,
        repeatCount,
        reverses,
        delayTime
      );
    }
    if (time !== null && typeof time === "object") {
      var o = time;
      var get = function(name) {
        return o[name] !== void 0 ? o[name] : o[name.charAt(0).toLowerCase() + name.slice(1)];
      };
      time = get("Time");
      easingStyle = get("EasingStyle");
      easingDirection = get("EasingDirection");
      repeatCount = get("RepeatCount");
      reverses = get("Reverses");
      delayTime = get("DelayTime");
    }
    time = time === void 0 ? 1 : time;
    delayTime = delayTime === void 0 ? 0 : delayTime;
    repeatCount = repeatCount === void 0 ? 0 : repeatCount;
    if (typeof time !== "number" || !(time >= 0))
      throw oops(
        "Time must be a number of seconds, 0 or more. You gave: " + time
      );
    if (typeof delayTime !== "number" || !(delayTime >= 0))
      throw oops(
        "DelayTime must be a number of seconds, 0 or more. You gave: " + delayTime
      );
    if (typeof repeatCount !== "number" || isNaN(repeatCount))
      throw oops(
        "RepeatCount must be a number (use -1 to repeat forever). You gave: " + repeatCount
      );
    this.Time = time;
    this.EasingStyle = pickName(
      easingStyle === void 0 ? "Quad" : easingStyle,
      EasingStyle,
      "easing style"
    );
    this.EasingDirection = pickName(
      easingDirection === void 0 ? "Out" : easingDirection,
      EasingDirection,
      "easing direction"
    );
    this.RepeatCount = repeatCount < 0 ? -1 : Math.floor(repeatCount);
    this.Reverses = !!reverses;
    this.DelayTime = delayTime;
    Object.freeze(this);
  }
  TweenInfo["new"] = function(a, b, c, d, e, f) {
    return new TweenInfo(a, b, c, d, e, f);
  };

  // src/hidden/signal.js
  function Signal() {
    this._listeners = [];
  }
  Signal.prototype.Connect = function(fn) {
    if (typeof fn !== "function")
      throw oops("Connect needs a function to run when the event happens.");
    var listeners = this._listeners;
    var entry = { fn };
    listeners.push(entry);
    var connection = {
      Connected: true,
      Disconnect: function() {
        if (!connection.Connected) return;
        connection.Connected = false;
        var i = listeners.indexOf(entry);
        if (i >= 0) listeners.splice(i, 1);
      }
    };
    connection.disconnect = connection.Disconnect;
    return connection;
  };
  Signal.prototype.Once = function(fn) {
    var connection = this.Connect(function() {
      connection.Disconnect();
      fn.apply(null, arguments);
    });
    return connection;
  };
  Signal.prototype.Wait = function() {
    var self = this;
    return new Promise(function(resolve) {
      self.Once(resolve);
    });
  };
  Signal.prototype._fire = function() {
    var args = arguments;
    this._listeners.slice().forEach(function(entry) {
      try {
        entry.fn.apply(null, args);
      } catch (err) {
        console.error(
          "WebTween: a function connected to an event had an error:",
          err
        );
      }
    });
  };
  Signal.prototype.connect = Signal.prototype.Connect;
  Signal.prototype.once = Signal.prototype.Once;
  Signal.prototype.wait = Signal.prototype.Wait;

  // src/hidden/styles.js
  var ALIASES = {
    backgroundcolor: "background-color",
    backgroundcolor3: "background-color",
    textcolor: "color",
    textcolor3: "color"
  };
  var TRANSFORM_NAMES = {
    x: "X",
    y: "Y",
    rotation: "Rotation",
    rotate: "Rotation",
    scale: "Scale"
  };
  var NO_UNIT = [
    "opacity",
    "z-index",
    "font-weight",
    "line-height",
    "flex-grow",
    "flex-shrink",
    "order",
    "zoom"
  ];
  var NUMBER = /(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)([a-z%]*)/gi;
  function toCssName(name) {
    if (name.indexOf("--") === 0) return name;
    if (ALIASES[name.toLowerCase()]) return ALIASES[name.toLowerCase()];
    return name.replace(/^[A-Z]/, function(c) {
      return c.toLowerCase();
    }).replace(/[A-Z]/g, function(c) {
      return "-" + c.toLowerCase();
    });
  }
  function round(n) {
    return String(Math.round(n * 1e3) / 1e3);
  }
  function sameColorShape(text) {
    return text.replace(/rgba?\(([^)]*)\)/g, function(whole, inside) {
      var nums = inside.match(/-?(?:\d+\.?\d*|\.\d+)/g) || [];
      if (nums.length === 3) nums.push("1");
      return nums.length === 4 ? "rgba(" + nums.join(", ") + ")" : whole;
    });
  }
  function splitNumbers(text) {
    var parts = [], numbers = [], last = 0, match;
    NUMBER.lastIndex = 0;
    while (match = NUMBER.exec(text)) {
      parts.push(text.slice(last, match.index));
      numbers.push({ n: parseFloat(match[1]), unit: match[2] });
      last = match.index + match[0].length;
    }
    parts.push(text.slice(last));
    return { parts, numbers };
  }
  function currentStyle(el, cssName) {
    return getComputedStyle(el).getPropertyValue(cssName).trim();
  }
  function measure(el, cssName, value) {
    var s = el.style;
    var oldValue = s.getPropertyValue(cssName), oldPriority = s.getPropertyPriority(cssName);
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
      name + ' should be a number (like 100) or a size (like "50%"). You gave: ' + value
    );
  }
  function parseAngle(value) {
    if (typeof value === "number") return value;
    var m = typeof value === "string" && value.trim().match(/^(-?(?:\d+\.?\d*|\.\d+))(deg|turn|rad)?$/i);
    if (!m)
      throw oops(
        "Rotation should be a number of degrees (like 90). You gave: " + value
      );
    var n = parseFloat(m[1]), unit = (m[2] || "deg").toLowerCase();
    return unit === "turn" ? n * 360 : unit === "rad" ? n * 180 / Math.PI : n;
  }

  // src/hidden/memory.js
  var elementMemory = /* @__PURE__ */ new WeakMap();
  function memoryOf(el) {
    var m = elementMemory.get(el);
    if (!m) {
      m = {
        move: {
          X: { n: 0, unit: "px" },
          Y: { n: 0, unit: "px" },
          Rotation: 0,
          Scale: 1
        },
        tweens: /* @__PURE__ */ new Set(),
        holds: 0,
        savedTransition: ""
      };
      elementMemory.set(el, m);
    }
    return m;
  }
  function writeMove(el, move) {
    el.style.transform = "translate(" + round(move.X.n) + move.X.unit + ", " + round(move.Y.n) + move.Y.unit + ") rotate(" + round(move.Rotation) + "deg) scale(" + round(move.Scale) + ")";
  }

  // src/hidden/clock.js
  var playing = /* @__PURE__ */ new Set();
  var frameRequest = null;
  function onFrame() {
    frameRequest = null;
    var now = performance.now();
    playing.forEach(function(tween) {
      tween._step(now);
    });
    if (playing.size) frameRequest = requestAnimationFrame(onFrame);
  }
  function startClock() {
    if (frameRequest === null) frameRequest = requestAnimationFrame(onFrame);
  }

  // src/public/animation/Tween.js
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
        "The third thing you give Create should be a list of goals, like { X: 100, Transparency: 0.5 }."
      );
    }
    return Object.keys(goals).map(function(name) {
      var value = goals[name];
      var moveName = TRANSFORM_NAMES[name.toLowerCase()];
      if (moveName) {
        var target = moveName === "Rotation" ? parseAngle(value) : moveName === "Scale" ? Number(value) : parseLength(value, moveName);
        if (moveName === "Scale" && isNaN(target))
          throw oops(
            "Scale should be a number (1 is normal size). You gave: " + value
          );
        return {
          id: "move:" + moveName,
          kind: "move",
          key: moveName,
          target
        };
      }
      var cssName, text;
      if (name.toLowerCase() === "transparency") {
        cssName = "opacity";
        text = String(1 - Number(value));
      } else {
        cssName = toCssName(name);
        if (typeof value === "number") {
          text = NO_UNIT.indexOf(cssName) >= 0 || cssName.indexOf("--") === 0 ? String(value) : value + "px";
        } else if (typeof value === "string") {
          text = value;
        } else {
          throw oops(
            'The goal for "' + name + '" should be a number or text, like 100 or "red".'
          );
        }
      }
      if (cssName.indexOf("--") !== 0 && typeof CSS !== "undefined" && CSS.supports && !CSS.supports(cssName, text)) {
        throw oops(
          `Can't animate "` + name + '" to "' + text + '". Check the spelling of the name and the value.'
        );
      }
      return {
        id: "css:" + cssName,
        kind: "css",
        cssName,
        target: text
      };
    });
  }
  Tween.prototype._isRunning = function() {
    var s = this.PlaybackState;
    return s === "Playing" || s === "Delayed" || s === "Paused";
  };
  Tween.prototype._touchesSameThing = function(other) {
    return this._goals.some(function(a) {
      return other._goals.some(function(b) {
        return a.id === b.id;
      });
    });
  };
  Tween.prototype._hold = function() {
    var m = memoryOf(this.Instance);
    if (m.holds++ === 0) {
      m.savedTransition = this.Instance.style.transition;
      this.Instance.style.transition = "none";
    }
  };
  Tween.prototype._release = function() {
    var el = this.Instance, m = memoryOf(el);
    m.tweens.delete(this);
    if (--m.holds === 0) {
      void getComputedStyle(el).opacity;
      el.style.transition = m.savedTransition;
    }
  };
  Tween.prototype._capture = function() {
    var el = this.Instance, move = memoryOf(el).move;
    this._goals.forEach(function(goal) {
      if (goal.kind === "move") {
        if (goal.key === "X" || goal.key === "Y") {
          var start = move[goal.key];
          goal.start = start.unit === goal.target.unit ? { n: start.n, unit: start.unit } : { n: 0, unit: goal.target.unit };
        } else {
          goal.start = move[goal.key];
        }
        return;
      }
      goal.startText = sameColorShape(currentStyle(el, goal.cssName));
      var endText = sameColorShape(measure(el, goal.cssName, goal.target));
      goal.from = splitNumbers(goal.startText);
      goal.to = splitNumbers(endText);
      goal.canBlend = goal.from.numbers.length === goal.to.numbers.length && goal.to.numbers.length > 0;
      if (!goal.canBlend && goal.startText !== endText) {
        console.warn(
          'WebTween: "' + goal.cssName + `" can't change smoothly from "` + goal.startText + '" to "' + endText + '", so it will switch halfway through.'
        );
      }
    });
  };
  Tween.prototype._apply = function(alpha) {
    var el = this.Instance, m = memoryOf(el), moved = false;
    this._goals.forEach(function(goal) {
      if (goal.kind === "move") {
        moved = true;
        if (goal.key === "X" || goal.key === "Y") {
          m.move[goal.key] = {
            n: goal.start.n + (goal.target.n - goal.start.n) * alpha,
            unit: goal.target.unit
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
          var a = goal.from.numbers[i], b = goal.to.numbers[i];
          if (a.unit === b.unit) {
            text += round(a.n + (b.n - a.n) * alpha) + b.unit;
          } else {
            text += "calc(" + round(a.n * (1 - alpha)) + (a.unit || "px") + " + " + round(b.n * alpha) + (b.unit || "px") + ")";
          }
          text += goal.to.parts[i + 1];
        }
      }
      el.style.setProperty(goal.cssName, text);
    });
    if (moved) writeMove(el, m.move);
  };
  Tween.prototype._applyEnd = function(backAtStart) {
    var el = this.Instance, m = memoryOf(el), moved = false;
    this._goals.forEach(function(goal) {
      if (goal.kind === "move") {
        moved = true;
        m.move[goal.key] = backAtStart ? goal.start : goal.target;
      } else {
        el.style.setProperty(
          goal.cssName,
          backAtStart ? goal.startText : goal.target
        );
      }
    });
    if (moved) writeMove(el, m.move);
  };
  Tween.prototype._totalTime = function() {
    var info = this.TweenInfo;
    if (info.RepeatCount < 0) return Infinity;
    return (info.DelayTime + info.Time * (info.Reverses ? 2 : 1)) * (info.RepeatCount + 1);
  };
  Tween.prototype._progressAt = function(elapsed) {
    var info = this.TweenInfo;
    var oneCycle = info.DelayTime + info.Time * (info.Reverses ? 2 : 1);
    var cycles = info.RepeatCount < 0 ? Infinity : info.RepeatCount + 1;
    var cycle = oneCycle > 0 ? Math.floor(elapsed / oneCycle) : Infinity;
    if (cycle >= cycles) return null;
    var inCycle = elapsed - cycle * oneCycle;
    if (inCycle < info.DelayTime) return { state: PlaybackState.Delayed, alpha: 0, repeating: cycle > 0 };
    var progress = info.Time > 0 ? (inCycle - info.DelayTime) / info.Time : 1;
    if (info.Reverses && progress > 1) progress = 2 - progress;
    return { state: PlaybackState.Playing, alpha: ease(progress, info.EasingStyle, info.EasingDirection) };
  };
  Tween.prototype._step = function(now) {
    var elapsed = this._elapsed = Math.max(0, now - this._startTime) / 1e3;
    var at = this._progressAt(elapsed);
    if (!at) return this._finish();
    this.PlaybackState = at.state;
    if (at.state === PlaybackState.Delayed) {
      if (at.repeating) this._apply(0);
      return;
    }
    this._apply(at.alpha);
  };
  Tween.prototype._renderAt = function(t) {
    if (!this._captured) {
      if (t < 0) return;
      this._capture();
      this._captured = true;
    }
    if (!this._held) {
      this._hold();
      this._held = true;
    }
    var at = t < 0 ? { state: PlaybackState.Begin, alpha: 0 } : this._progressAt(t);
    if (!at) {
      this._applyEnd(this.TweenInfo.Reverses);
      this.PlaybackState = PlaybackState.Completed;
      return;
    }
    this.PlaybackState = at.state;
    this._apply(at.alpha);
  };
  Tween.prototype._letGo = function() {
    if (!this._held) return;
    this._held = false;
    this._release();
  };
  Tween.prototype._finish = function() {
    playing.delete(this);
    this._applyEnd(this.TweenInfo.Reverses);
    this.PlaybackState = PlaybackState.Completed;
    this._release();
    this.Completed._fire(PlaybackState.Completed);
  };
  Tween.prototype.Play = function() {
    var state = this.PlaybackState;
    if (state === "Playing" || state === "Delayed") return;
    var now = performance.now();
    if (state === "Paused") {
      this._startTime = now - this._elapsed * 1e3;
      this.PlaybackState = this._pausedFrom;
      playing.add(this);
      startClock();
      return;
    }
    var self = this, m = memoryOf(this.Instance);
    this._hold();
    m.tweens.forEach(function(other) {
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
  Tween.prototype.Pause = function() {
    var state = this.PlaybackState;
    if (state !== "Playing" && state !== "Delayed") return;
    this._elapsed = (performance.now() - this._startTime) / 1e3;
    this._pausedFrom = state;
    this.PlaybackState = PlaybackState.Paused;
    playing.delete(this);
  };
  Tween.prototype.Cancel = function() {
    if (!this._isRunning()) return;
    playing.delete(this);
    this.PlaybackState = PlaybackState.Cancelled;
    this._release();
    this.Completed._fire(PlaybackState.Cancelled);
  };
  Tween.prototype.play = Tween.prototype.Play;
  Tween.prototype.pause = Tween.prototype.Pause;
  Tween.prototype.cancel = Tween.prototype.Cancel;

  // src/public/animation/TweenService.js
  var TweenService = {
    /**
     * Make a tween.
     *   thing:     an element, or a CSS selector like "#box" or ".card"
     *   tweenInfo: a TweenInfo (or leave it out for the default: 1 second, Quad, Out)
     *   goals:     what it should look like at the end, e.g. { X: 100, Transparency: 0.5 }
     */
    Create: function(thing, tweenInfo, goals) {
      var el = thing;
      if (typeof thing === "string") {
        el = document.querySelector(thing);
        if (!el)
          throw oops(
            `Couldn't find anything on the page matching "` + thing + '".'
          );
      }
      if (!el || el.nodeType !== 1) {
        throw oops(
          'The first thing you give Create should be an element on the page, or a selector like "#box".'
        );
      }
      if (!(tweenInfo instanceof TweenInfo))
        tweenInfo = new TweenInfo(tweenInfo || void 0);
      return new Tween(el, tweenInfo, goals);
    },
    /** Get an eased value between 0 and 1, without animating anything. */
    GetValue: function(alpha, easingStyle, easingDirection) {
      return ease(
        alpha,
        pickName(easingStyle, EasingStyle, "easing style"),
        pickName(easingDirection, EasingDirection, "easing direction")
      );
    }
  };
  TweenService.create = TweenService.Create;

  // src/hidden/pageStyles.js
  var addedStyles = {};
  function addStyles(name, css) {
    if (addedStyles[name]) return;
    addedStyles[name] = true;
    var style = document.createElement("style");
    style.setAttribute("data-webtween", name);
    style.textContent = css;
    var head = document.head || document.documentElement;
    head.insertBefore(style, head.firstChild);
  }
  function findElement(thing, what) {
    if (typeof thing !== "string") return thing;
    var found = document.querySelector(thing);
    if (!found) throw oops(`Couldn't find anything on the page matching "` + thing + '" to put the ' + what + " in.");
    return found;
  }

  // src/hidden/timelinePanel.js
  function seconds(n) {
    return n.toFixed(2) + "s";
  }
  function logTimeline(timeline) {
    console.log('WebTween: timeline "' + timeline.Name + '" lasts ' + seconds(timeline.Duration));
    console.table(
      timeline.GetSchedule().map(function(row) {
        return { Name: row.Name, Kind: row.Kind, Starts: seconds(row.Starts), Ends: seconds(row.Ends), Length: seconds(row.Length) };
      })
    );
  }
  var openPanel = null;
  function showTimelinePanel(timeline) {
    if (openPanel) openPanel.close();
    addStyles("TimelinePanel", PANEL_CSS);
    var rows = timeline.GetSchedule();
    var duration = Math.max(timeline.Duration, 1e-3);
    var panel = make("section", "webtween-timeline");
    panel.setAttribute("aria-label", "Timeline: " + timeline.Name);
    var top = make("div", "wtl-top", panel);
    make("strong", "wtl-name", top).textContent = timeline.Name;
    var playButton = button("Play", top);
    var restartButton = button("Restart", top);
    var speedLabel = make("label", "wtl-speed", top);
    speedLabel.textContent = "Speed ";
    var speed = make("select", "", speedLabel);
    [0.1, 0.25, 0.5, 1, 2].forEach(function(s) {
      var option = make("option", "", speed);
      option.value = s;
      option.textContent = s + "\xD7";
      if (s === timeline.Speed) option.selected = true;
    });
    var clock = make("span", "wtl-clock", top);
    var closeButton = button("Close", top);
    closeButton.classList.add("wtl-close");
    var body = make("div", "wtl-body", panel);
    var names = make("div", "wtl-names", body);
    make("div", "wtl-ruler-space", names);
    var lanes = make("div", "wtl-lanes", body);
    var track = make("div", "wtl-track", lanes);
    var ruler = make("div", "wtl-ruler", track);
    var step = duration <= 2 ? 0.25 : duration <= 5 ? 0.5 : duration <= 12 ? 1 : duration <= 30 ? 2 : 5;
    for (var t = 0; t <= duration + 1e-4; t += step) {
      var tick = make("span", "wtl-tick", ruler);
      tick.style.left = t / duration * 100 + "%";
      tick.textContent = +t.toFixed(2) + "s";
    }
    rows.forEach(function(row) {
      var name = make("div", "wtl-row-name", names);
      name.textContent = row.Name;
      name.title = row.Name;
      var lane = make("div", "wtl-lane", track);
      var mark = make("div", row.Kind === "function" ? "wtl-mark" : "wtl-span wtl-" + row.Kind, lane);
      mark.style.left = row.Starts / duration * 100 + "%";
      if (row.Kind !== "function") mark.style.width = row.Length / duration * 100 + "%";
      mark.title = row.Name + "\n" + (row.Kind === "function" ? "Runs at " + seconds(row.Starts) : "Starts " + seconds(row.Starts) + " \xB7 ends " + seconds(row.Ends) + " \xB7 lasts " + seconds(row.Length));
    });
    var playhead = make("div", "wtl-playhead", track);
    playButton.addEventListener("click", function() {
      if (timeline.PlaybackState === "Playing") timeline.Pause();
      else timeline.Play();
    });
    restartButton.addEventListener("click", function() {
      timeline.Restart();
    });
    speed.addEventListener("change", function() {
      timeline.Speed = Number(speed.value);
    });
    function scrubTo(e) {
      var box = track.getBoundingClientRect();
      var fraction = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
      timeline.Seek(fraction * timeline.Duration + timeline._cycle * timeline.Duration * (timeline.Reverses ? 2 : 1));
    }
    var dragging = false;
    lanes.addEventListener("pointerdown", function(e) {
      dragging = true;
      timeline.Pause();
      try {
        lanes.setPointerCapture(e.pointerId);
      } catch (err) {
      }
      lanes.classList.add("wtl-scrubbing");
      scrubTo(e);
    });
    lanes.addEventListener("pointermove", function(e) {
      if (dragging) scrubTo(e);
    });
    function stopDragging() {
      dragging = false;
      lanes.classList.remove("wtl-scrubbing");
    }
    lanes.addEventListener("pointerup", stopDragging);
    lanes.addEventListener("pointercancel", stopDragging);
    var frameRequest2;
    function update() {
      var local = Math.max(0, timeline._local);
      playhead.style.left = local / duration * 100 + "%";
      clock.textContent = seconds(local) + " / " + seconds(timeline.Duration);
      playButton.textContent = timeline.PlaybackState === "Playing" ? "Pause" : "Play";
      frameRequest2 = requestAnimationFrame(update);
    }
    update();
    document.body.appendChild(panel);
    var savedPadding = document.body.style.paddingBottom;
    document.body.style.paddingBottom = panel.offsetHeight + "px";
    var handle = {
      close: function() {
        cancelAnimationFrame(frameRequest2);
        panel.remove();
        document.body.style.paddingBottom = savedPadding;
        if (openPanel === handle) openPanel = null;
        timeline._panel = null;
      }
    };
    closeButton.addEventListener("click", handle.close);
    openPanel = timeline._panel = handle;
    return handle;
  }
  function make(tag, className, parent) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
    return el;
  }
  function button(text, parent) {
    var b = make("button", "wtl-button", parent);
    b.type = "button";
    b.textContent = text;
    return b;
  }
  var PANEL_CSS = [
    ".webtween-timeline {",
    "  position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483000;",
    "  max-height: 45vh; display: flex; flex-direction: column;",
    "  background: #141416; color: #e9e9e4; font: 13px/1.4 system-ui, sans-serif; text-align: left;",
    "  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35); /* it floats over the page */",
    "}",
    ".webtween-timeline * { box-sizing: border-box; }",
    ".wtl-top { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #1e1e22; }",
    ".wtl-name { margin-right: 8px; font-weight: 600; }",
    ".wtl-button, .wtl-speed select {",
    "  height: 30px; padding: 0 12px; border: 0; border-radius: 6px;",
    "  background: #2c2c33; color: inherit; font: inherit; cursor: pointer;",
    "}",
    ".wtl-button:hover, .wtl-speed select:hover { background: #393941; }",
    ".wtl-button:focus-visible, .wtl-speed select:focus-visible { outline: 2px solid #8ab4ff; outline-offset: 2px; }",
    ".wtl-speed { color: #a9a9a2; }",
    ".wtl-speed select { padding: 0 8px; }",
    ".wtl-clock { font-variant-numeric: tabular-nums; color: #a9a9a2; }",
    ".wtl-close { margin-left: auto; }",
    ".wtl-body { display: flex; overflow: auto; }",
    ".wtl-names { flex: 0 0 200px; }",
    ".wtl-ruler-space, .wtl-ruler { height: 26px; }",
    ".wtl-row-name, .wtl-lane { height: 30px; }",
    ".wtl-row-name { padding: 0 12px; line-height: 30px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
    ".wtl-names > :nth-child(even), .wtl-track > .wtl-lane:nth-child(even) { background: #1a1a1d; }",
    ".wtl-lanes { flex: 1; min-width: 320px; padding: 0 20px; cursor: ew-resize; touch-action: none; user-select: none; }",
    ".wtl-track { position: relative; }",
    ".wtl-ruler { position: relative; color: #8d8d87; font-size: 11px; }",
    ".wtl-tick { position: absolute; top: 6px; transform: translateX(-50%); }",
    ".wtl-lane { position: relative; }",
    ".wtl-span { position: absolute; top: 7px; height: 16px; min-width: 3px; border-radius: 4px; background: #5b8def; }",
    ".wtl-timeline { background: #3fa796; }",
    ".wtl-mark {",
    "  position: absolute; top: 9px; width: 12px; height: 12px; margin-left: -6px;",
    "  border-radius: 2px; background: #f0a35b; transform: rotate(45deg);",
    "}",
    ".wtl-span:hover, .wtl-mark:hover { filter: brightness(1.25); }",
    ".wtl-playhead { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: #ff5c5c; pointer-events: none; }",
    ".wtl-scrubbing .wtl-playhead { width: 3px; }"
  ].join("\n");

  // src/public/animation/Timeline.js
  function Timeline(settings) {
    if (!(this instanceof Timeline)) return new Timeline(settings);
    settings = settings || {};
    this.Name = settings.Name || "Timeline";
    this.RepeatCount = settings.RepeatCount === void 0 ? 0 : settings.RepeatCount;
    this.Reverses = !!settings.Reverses;
    this.Speed = settings.Speed === void 0 ? 1 : settings.Speed;
    this.PlaybackState = PlaybackState.Begin;
    this.Completed = new Signal();
    this.Time = 0;
    this._items = [];
    this._local = 0;
    this._cycle = 0;
    this._prevStart = 0;
    this._prevEnd = 0;
    this._tick = this._tick.bind(this);
  }
  Object.defineProperty(Timeline.prototype, "Duration", {
    get: function() {
      return this._items.reduce(function(most, item) {
        return Math.max(most, item.start + lengthOf(item));
      }, 0);
    }
  });
  function lengthOf(item) {
    return item.kind === "function" ? 0 : item.thing._totalTime();
  }
  Timeline.prototype._totalTime = function() {
    if (this.RepeatCount < 0) return Infinity;
    return this.Duration * (this.Reverses ? 2 : 1) * (this.RepeatCount + 1);
  };
  Timeline.prototype.Schedule = function(thing, at, name) {
    var kind = thing instanceof Tween ? "tween" : thing instanceof Timeline ? "timeline" : typeof thing === "function" ? "function" : null;
    if (!kind) {
      throw oops("Schedule needs a tween (from TweenService.Create), a function, or another Timeline.");
    }
    if (thing === this) throw oops("A timeline can't be scheduled inside itself.");
    if (kind !== "function" && thing._totalTime() === Infinity) {
      throw oops(
        "Something that repeats forever (RepeatCount -1) can't go in a timeline, because it never ends. Give it a RepeatCount, or set RepeatCount on the Timeline instead."
      );
    }
    var item = { kind, thing, start: this._whereToStart(at), name: name || nameOf(kind, thing) };
    this._items.push(item);
    this._prevStart = item.start;
    this._prevEnd = item.start + lengthOf(item);
    return this;
  };
  Timeline.prototype._whereToStart = function(at) {
    if (at === void 0 || at === null) return this._prevEnd;
    if (typeof at === "number" && at >= 0) return at;
    if (at === "with") return this._prevStart;
    if (typeof at === "string" && /^[+-]\s*\d*\.?\d+$/.test(at)) {
      return Math.max(0, this._prevEnd + parseFloat(at.replace(/\s/g, "")));
    }
    throw oops('"' + at + `" isn't a start time. Use a number of seconds like 1.5, or "+0.2", "-0.2" or "with".`);
  };
  function nameOf(kind, thing) {
    if (kind === "timeline") return thing.Name;
    if (kind === "function") return thing.name ? thing.name + "()" : "function";
    var el = thing.Instance;
    var who = el.id ? "#" + el.id : el.classList.length ? "." + el.classList[0] : el.tagName.toLowerCase();
    var what = thing._goals.map(function(goal) {
      return goal.key || goal.cssName;
    });
    return who + ": " + what.join(", ");
  }
  Timeline.prototype.GetSchedule = function() {
    return this._items.map(function(item) {
      var length = lengthOf(item);
      return { Name: item.name, Kind: item.kind, Starts: item.start, Ends: item.start + length, Length: length };
    });
  };
  Timeline.prototype._render = function(t, quiet) {
    var forward = t >= this._local;
    this._local = t;
    var items = this._items.slice().sort(function(a, b) {
      return a.start - b.start;
    });
    if (!forward) items.reverse();
    items.forEach(function(item) {
      var length = lengthOf(item);
      var inside = t - item.start;
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
  Timeline.prototype._renderTotal = function(T, quiet) {
    var one = this.Duration;
    if (T < 0 || one === 0) return this._render(T < 0 ? -1 : 0, quiet);
    var perCycle = one * (this.Reverses ? 2 : 1);
    var cycles = this.RepeatCount < 0 ? Infinity : this.RepeatCount + 1;
    var cycle = Math.min(Math.floor(T / perCycle), cycles - 1);
    var inCycle = Math.min(T - cycle * perCycle, perCycle);
    var local = inCycle > one ? perCycle - inCycle : inCycle;
    if (!this.Reverses && cycle !== this._cycle) {
      this._render(cycle > this._cycle ? one : 0, quiet);
      this._render(cycle > this._cycle ? 0 : one, true);
    }
    this._cycle = cycle;
    this._render(local, quiet);
  };
  Timeline.prototype.Play = function() {
    if (this.PlaybackState === PlaybackState.Playing) return;
    if (this.PlaybackState === PlaybackState.Completed || this.Time >= this._totalTime()) this.Seek(0);
    this.PlaybackState = PlaybackState.Playing;
    this._lastNow = performance.now();
    this._frameRequest = requestAnimationFrame(this._tick);
  };
  Timeline.prototype._tick = function(now) {
    if (this.PlaybackState !== PlaybackState.Playing) return;
    var seconds2 = Math.max(0, (now - this._lastNow) / 1e3) * this.Speed;
    this._lastNow = now;
    var total = this._totalTime();
    this.Time = Math.min(total, this.Time + seconds2);
    this._renderTotal(this.Time);
    if (this.Time >= total) return this._finish();
    this._frameRequest = requestAnimationFrame(this._tick);
  };
  Timeline.prototype._finish = function() {
    this.PlaybackState = PlaybackState.Completed;
    this._letGo();
    this.Completed._fire(PlaybackState.Completed);
  };
  Timeline.prototype._letGo = function() {
    this._items.forEach(function(item) {
      if (item.kind !== "function") item.thing._letGo();
    });
  };
  Timeline.prototype.Pause = function() {
    if (this.PlaybackState !== PlaybackState.Playing) return;
    this.PlaybackState = PlaybackState.Paused;
    cancelAnimationFrame(this._frameRequest);
  };
  Timeline.prototype.Seek = function(seconds2) {
    var total = this._totalTime();
    this.Time = Math.max(0, Math.min(Number(seconds2) || 0, total === Infinity ? Number(seconds2) || 0 : total));
    this._renderTotal(this.Time);
    if (this.PlaybackState === PlaybackState.Completed && this.Time < total) this.PlaybackState = PlaybackState.Paused;
  };
  Timeline.prototype.Restart = function() {
    this.Pause();
    this.Seek(0);
    this.PlaybackState = PlaybackState.Paused;
    this.Play();
  };
  Timeline.prototype.DisplayTimeline = function(ui) {
    if (ui) showTimelinePanel(this);
    else logTimeline(this);
  };
  Timeline.prototype.Destroy = function() {
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
  Timeline["new"] = function(settings) {
    return new Timeline(settings);
  };

  // src/public/animation/Color3.js
  var Color3 = {
    fromRGB: function(r, g, b) {
      return "rgb(" + r + ", " + g + ", " + b + ")";
    },
    new: function(r, g, b) {
      return "rgb(" + r * 255 + ", " + g * 255 + ", " + b * 255 + ")";
    },
    fromHex: function(hex) {
      return hex.charAt(0) === "#" ? hex : "#" + hex;
    }
  };

  // src/public/animation/ScrollableFrame.js
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
        "You gave " + keyframeEvents.length + " keyframe events but " + keyframeTriggers.length + " keyframe triggers. Each event needs one frame number to go with it."
      );
    }
    this._triggers = keyframeTriggers.map(function(frame, i) {
      if (typeof keyframeEvents[i] !== "function") {
        throw oops("Keyframe event number " + (i + 1) + " should be a function.");
      }
      if (typeof frame !== "number" || !(frame >= 0)) {
        throw oops("Keyframe trigger number " + (i + 1) + " should be a frame number, 0 or more. You gave: " + frame);
      }
      return { frame: Math.floor(frame), fn: keyframeEvents[i] };
    });
    this._triggers.sort(function(a, b) {
      return a.frame - b.frame;
    });
    options = options || {};
    var parent = options.Parent || document.body;
    if (typeof parent === "string") {
      var found = document.querySelector(parent);
      if (!found) throw oops(`Couldn't find anything on the page matching "` + parent + '" to put the ScrollableFrame in.');
      parent = found;
    }
    this.FrameRate = options.FrameRate || 30;
    this.ScrollLength = options.ScrollLength || 3;
    this.Smoothness = options.Smoothness === void 0 ? 0.15 : Math.min(1, Math.max(0.01, options.Smoothness));
    this.StickToLastFrame = !!(options.StickToLastFrame || options.stickToLastFrame);
    this.StuckFrame = !!(options.StuckFrame || options.stuckFrame);
    this.Frame = 0;
    this.Progress = 0;
    this.FrameChanged = new Signal();
    var box = document.createElement("div");
    box.className = "webtween-scrollable-frame";
    box.style.position = "relative";
    box.style.height = this.ScrollLength * 100 + "vh";
    var stage = document.createElement("div");
    stage.style.cssText = "position: sticky; top: 0; height: 100vh; overflow: hidden;";
    if (this.StuckFrame) {
      box.style.height = "0";
      stage.style.cssText = "position: fixed; inset: 0; z-index: -1; overflow: hidden;";
    }
    var video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.style.cssText = "width: 100%; height: 100%; object-fit: cover; display: block;";
    stage.appendChild(video);
    box.appendChild(stage);
    parent.appendChild(box);
    this.Instance = box;
    this.Stage = stage;
    this.Video = video;
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
    video.addEventListener("loadedmetadata", function() {
      self._ready = true;
      var lastFrame = Math.floor(video.duration * self.FrameRate);
      self._triggers.forEach(function(t) {
        if (t.frame > lastFrame) {
          console.warn("WebTween: keyframe trigger " + t.frame + " is past the end of the video (about " + lastFrame + " frames).");
        }
      });
      var attempt = video.play();
      if (attempt && attempt.then) {
        attempt.then(function() {
          video.pause();
        }).catch(function() {
        });
      }
    });
    video.addEventListener("error", function() {
      console.error(`WebTween: couldn't load the video "` + src + '". Check that the path is right.');
    });
    this._tick = this._tick.bind(this);
    this._frameRequest = requestAnimationFrame(this._tick);
  }
  ScrollableFrame.prototype._tick = function() {
    this._frameRequest = requestAnimationFrame(this._tick);
    var video = this.Video;
    if (!this._ready || !video.duration) return;
    var distance = this.Instance.offsetHeight - window.innerHeight;
    var scrolled = -this.Instance.getBoundingClientRect().top;
    if (this.StuckFrame) {
      distance = document.documentElement.scrollHeight - window.innerHeight;
      scrolled = window.scrollY;
    }
    this.Progress = distance > 0 ? Math.min(1, Math.max(0, scrolled / distance)) : 0;
    if (this._backdrop) this._setStuck(distance > 0 && scrolled >= distance);
    if (this._skipped && this.Progress === 0) this._skipped = false;
    if (this._skipped) this.Progress = 1;
    if (this.SkipButton) this.SkipButton.classList.toggle("webtween-skip-done", this.Progress >= 0.999);
    var targetTime = this.Progress * video.duration;
    this._shownTime += (targetTime - this._shownTime) * this.Smoothness;
    if (Math.abs(targetTime - this._shownTime) < 1e-3) this._shownTime = targetTime;
    if (!video.seeking && Math.abs(video.currentTime - this._shownTime) > 0.5 / this.FrameRate) {
      video.currentTime = this._shownTime;
    }
    var frame = Math.floor(this._shownTime * this.FrameRate + 1e-6);
    if (frame !== this._lastFrame) {
      this._runTriggers(this._lastFrame, frame);
      this._lastFrame = frame;
      this.Frame = frame;
      this.FrameChanged._fire(frame);
    }
  };
  ScrollableFrame.prototype._runTriggers = function(from, to) {
    var passed;
    if (to > from) {
      passed = this._triggers.filter(function(t) {
        return t.frame > from && t.frame <= to;
      });
      passed.forEach(function(t) {
        safeCall2(t.fn, "Forward");
      });
    } else {
      passed = this._triggers.filter(function(t) {
        return t.frame <= from && t.frame > to;
      });
      passed.reverse().forEach(function(t) {
        safeCall2(t.fn, "Backward");
      });
    }
  };
  ScrollableFrame.prototype._setStuck = function(stuck) {
    if (stuck === this._stuck) return;
    this._stuck = stuck;
    if (stuck) this._backdrop.appendChild(this.Video);
    else this.Stage.insertBefore(this.Video, this.Stage.firstChild);
  };
  function safeCall2(fn, direction) {
    try {
      fn(direction);
    } catch (err) {
      console.error("WebTween: a keyframe event had an error:", err);
    }
  }
  ScrollableFrame.prototype.Skip = function() {
    if (this.StuckFrame) {
      this._skipped = true;
    } else {
      var after = window.scrollY + this.Instance.getBoundingClientRect().bottom;
      window.scrollTo({ top: after, behavior: "instant" });
    }
    if (this.Video.duration) this._shownTime = this.Video.duration;
  };
  ScrollableFrame.prototype.Destroy = function() {
    cancelAnimationFrame(this._frameRequest);
    this._tick = function() {
    };
    this.Instance.remove();
    if (this._backdrop) this._backdrop.remove();
  };
  ScrollableFrame.prototype.destroy = ScrollableFrame.prototype.Destroy;
  ScrollableFrame.prototype.skip = ScrollableFrame.prototype.Skip;
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
    ".webtween-skip.webtween-skip-done { opacity: 0; visibility: hidden; pointer-events: none; }"
  ].join("\n");
  ScrollableFrame["new"] = function(a, b, c, d) {
    return new ScrollableFrame(a, b, c, d);
  };

  // src/hidden/targets.js
  function findAll(things, what) {
    var list;
    if (typeof things === "string") list = Array.prototype.slice.call(document.querySelectorAll(things));
    else if (things && typeof things.length === "number") list = Array.prototype.slice.call(things);
    else if (things) list = [things];
    else list = [];
    list = list.map(function(thing) {
      return thing && thing.Instance instanceof Element ? thing.Instance : thing;
    });
    list.forEach(function(el) {
      if (!(el instanceof Element)) throw oops(what + ' needs page elements, a selector like ".card", or Cards.');
    });
    return list;
  }
  function wantsLessMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function findOne(thing, what) {
    var list = findAll(thing, what);
    if (!list.length) throw oops(`Couldn't find anything on the page matching "` + thing + '" for the ' + what + ".");
    return list[0];
  }
  function whenVisible(el, fn, threshold) {
    if (!window.IntersectionObserver) {
      fn();
      return function() {
      };
    }
    var watcher = new IntersectionObserver(function(entries) {
      if (!entries.some(function(e) {
        return e.isIntersecting;
      })) return;
      watcher.disconnect();
      fn();
    }, { threshold: threshold === void 0 ? 0.2 : threshold });
    watcher.observe(el);
    return function() {
      watcher.disconnect();
    };
  }
  function sameWord(value, fallback) {
    return String(value === void 0 ? fallback : value).toLowerCase();
  }

  // src/public/animation/Reveal.js
  function Reveal(things, settings) {
    if (!(this instanceof Reveal)) return new Reveal(things, settings);
    settings = settings || {};
    this.Distance = pick(settings.Distance, 28);
    this.Time = pick(settings.Time, 0.9);
    this.EasingStyle = pickName(pick(settings.EasingStyle, "Quint"), EasingStyle, "easing style");
    this.Stagger = pick(settings.Stagger, 0.08);
    this.Threshold = pick(settings.Threshold, 0.15);
    this.Elements = findAll(things, "Reveal");
    if (wantsLessMotion() || !window.IntersectionObserver) return;
    var self = this;
    this.Elements.forEach(function(el) {
      TweenService.Create(el, new TweenInfo(0), { Y: self.Distance, Transparency: 1 }).Play();
    });
    this._watcher = new IntersectionObserver(function(entries) {
      var arriving = entries.filter(function(entry) {
        return entry.isIntersecting;
      });
      arriving.forEach(function(entry, i) {
        self._watcher.unobserve(entry.target);
        self._show(entry.target, i * self.Stagger);
      });
    }, { threshold: this.Threshold });
    this.Elements.forEach(function(el) {
      self._watcher.observe(el);
    });
  }
  function pick(value, fallback) {
    return value === void 0 ? fallback : value;
  }
  Reveal.prototype._show = function(el, delay) {
    var info = new TweenInfo(this.Time, this.EasingStyle, "Out", 0, false, delay);
    TweenService.Create(el, info, { Y: 0, Transparency: 0 }).Play();
  };
  Reveal.prototype.ShowAll = function() {
    var self = this;
    if (this._watcher) this._watcher.disconnect();
    this.Elements.forEach(function(el, i) {
      self._show(el, i * self.Stagger);
    });
  };
  Reveal.prototype.Destroy = function() {
    if (this._watcher) this._watcher.disconnect();
  };
  Reveal.prototype.showAll = Reveal.prototype.ShowAll;
  Reveal.prototype.destroy = Reveal.prototype.Destroy;
  Reveal["new"] = function(things, settings) {
    return new Reveal(things, settings);
  };

  // src/public/animation/Parallax.js
  function Parallax(things, settings) {
    if (!(this instanceof Parallax)) return new Parallax(things, settings);
    settings = settings || {};
    this.Speed = settings.Speed === void 0 ? 0.1 : settings.Speed;
    this.Elements = findAll(things, "Parallax");
    this._offsets = this.Elements.map(function() {
      return 0;
    });
    if (wantsLessMotion()) return;
    this._update = this._update.bind(this);
    this._onScroll = function() {
      if (!this._waiting) {
        this._waiting = true;
        requestAnimationFrame(this._update);
      }
    }.bind(this);
    window.addEventListener("scroll", this._onScroll, { passive: true });
    window.addEventListener("resize", this._onScroll);
    this._update();
  }
  Parallax.prototype._speedOf = function(i) {
    return Array.isArray(this.Speed) ? this.Speed[i] || 0 : this.Speed;
  };
  Parallax.prototype._update = function() {
    this._waiting = false;
    var middle = window.innerHeight / 2;
    var self = this;
    this.Elements.forEach(function(el, i) {
      var box = el.getBoundingClientRect();
      var centre = box.top - self._offsets[i] + box.height / 2;
      var offset = (middle - centre) * self._speedOf(i);
      self._offsets[i] = offset;
      el.style.transform = "translateY(" + round(offset) + "px)";
    });
  };
  Parallax.prototype.Destroy = function() {
    if (this._onScroll) {
      window.removeEventListener("scroll", this._onScroll);
      window.removeEventListener("resize", this._onScroll);
    }
    this._update = function() {
    };
    this.Elements.forEach(function(el) {
      el.style.transform = "";
    });
  };
  Parallax.prototype.destroy = Parallax.prototype.Destroy;
  Parallax["new"] = function(things, settings) {
    return new Parallax(things, settings);
  };

  // src/public/animation/TextReveal.js
  function TextReveal(things, settings) {
    if (!(this instanceof TextReveal)) return new TextReveal(things, settings);
    settings = settings || {};
    addStyles("TextReveal", TEXT_REVEAL_CSS);
    this.By = sameWord(settings.By, "Words") === "letters" ? "Letters" : "Words";
    this.Time = settings.Time === void 0 ? 0.8 : settings.Time;
    this.Stagger = settings.Stagger === void 0 ? this.By === "Letters" ? 0.025 : 0.06 : settings.Stagger;
    this.EasingStyle = pickName(settings.EasingStyle || "Quint", EasingStyle, "easing style");
    var when = sameWord(settings.When, "Visible");
    this.Elements = findAll(things, "TextReveal");
    this.Pieces = [];
    var self = this;
    this.Elements.forEach(function(el) {
      var pieces = split(el, self.By);
      el._webtweenPieces = pieces;
      self.Pieces = self.Pieces.concat(pieces);
    });
    if (wantsLessMotion()) return;
    this.Pieces.forEach(function(piece) {
      TweenService.Create(piece, new TweenInfo(0), { Y: "110%" }).Play();
    });
    this._stops = [];
    if (when === "now") this.Show();
    else if (when !== "never") {
      this.Elements.forEach(function(el) {
        self._stops.push(whenVisible(el, function() {
          self._showPieces(el._webtweenPieces);
        }));
      });
    }
  }
  function split(el, by) {
    if (el._webtweenPieces) return el._webtweenPieces;
    if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    var pieces = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function(child) {
        if (child.nodeType === 1) {
          child.setAttribute("aria-hidden", "true");
          walk(child);
          return;
        }
        if (child.nodeType !== 3 || !child.textContent.trim()) return;
        var bits = child.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        bits.forEach(function(bit) {
          if (!bit) return;
          if (/^\s+$/.test(bit)) return frag.appendChild(document.createTextNode(bit));
          var word = document.createElement("span");
          word.className = "webtween-word";
          word.setAttribute("aria-hidden", "true");
          (by === "Letters" ? Array.from(bit) : [bit]).forEach(function(text) {
            var mask = document.createElement("span");
            mask.className = "webtween-mask";
            var piece = document.createElement("span");
            piece.className = "webtween-piece";
            piece.textContent = text;
            mask.appendChild(piece);
            word.appendChild(mask);
            pieces.push(piece);
          });
          frag.appendChild(word);
        });
        node.replaceChild(frag, child);
      });
    })(el);
    return pieces;
  }
  TextReveal.prototype._showPieces = function(pieces) {
    var self = this;
    pieces.forEach(function(piece, i) {
      var info = new TweenInfo(self.Time, self.EasingStyle, "Out", 0, false, i * self.Stagger);
      TweenService.Create(piece, info, { Y: "0%" }).Play();
    });
  };
  TextReveal.prototype.Show = function() {
    if (this._stops) this._stops.forEach(function(stop) {
      stop();
    });
    this._showPieces(this.Pieces);
  };
  TextReveal.prototype.Destroy = function() {
    if (this._stops) this._stops.forEach(function(stop) {
      stop();
    });
  };
  TextReveal.prototype.show = TextReveal.prototype.Show;
  TextReveal.prototype.destroy = TextReveal.prototype.Destroy;
  TextReveal["new"] = function(things, settings) {
    return new TextReveal(things, settings);
  };
  var TEXT_REVEAL_CSS = [
    ".webtween-word { display: inline-block; white-space: nowrap; }",
    "/* a little room below, so letters like g and y aren't clipped */",
    ".webtween-mask { display: inline-block; overflow: hidden; padding-bottom: 0.12em; margin-bottom: -0.12em; vertical-align: top; }",
    ".webtween-piece { display: inline-block; }"
  ].join("\n");

  // src/public/animation/TextRotator.js
  function TextRotator(thing, words, settings) {
    if (!(this instanceof TextRotator)) return new TextRotator(thing, words, settings);
    if (!Array.isArray(words) || words.length < 2) {
      throw oops('TextRotator needs a list of at least two words, like ["designers", "developers"].');
    }
    settings = settings || {};
    addStyles("TextRotator", TEXT_ROTATOR_CSS);
    this.Words = words.map(String);
    this.Style = sameWord(settings.Style, "Slide") === "type" ? "Type" : "Slide";
    this.Every = settings.Every === void 0 ? 2.5 : settings.Every;
    this.EasingStyle = pickName(settings.EasingStyle || "Quint", EasingStyle, "easing style");
    this.Current = 0;
    var host = this.Instance = findOne(thing, "TextRotator");
    host.classList.add("webtween-rotator", "webtween-rotator-" + this.Style.toLowerCase());
    host.textContent = "";
    this._shown = document.createElement("span");
    this._shown.className = "webtween-rotator-word";
    this._shown.setAttribute("aria-hidden", "true");
    this._shown.textContent = this.Words[0];
    var spoken = document.createElement("span");
    spoken.className = "webtween-visually-hidden";
    spoken.textContent = this.Words.join(", ");
    host.append(this._shown, spoken);
    if (wantsLessMotion()) return;
    this._timer = setInterval(this._onTimer.bind(this), this.Every * 1e3);
  }
  TextRotator.prototype._onTimer = function() {
    if (!document.hidden && !this._busy) this.Next();
  };
  TextRotator.prototype.Next = function() {
    this.Current = (this.Current + 1) % this.Words.length;
    var word = this.Words[this.Current];
    if (this.Style === "Type") this._type(word);
    else this._slide(word);
  };
  TextRotator.prototype._slide = function(word) {
    var shown = this._shown, self = this;
    this._busy = true;
    var out = TweenService.Create(shown, new TweenInfo(0.35, this.EasingStyle, "In"), { Y: "-100%", Transparency: 1 });
    out.Completed.Connect(function() {
      shown.textContent = word;
      TweenService.Create(shown, new TweenInfo(0), { Y: "100%", Transparency: 1 }).Play();
      var back = TweenService.Create(shown, new TweenInfo(0.5, self.EasingStyle, "Out"), { Y: "0%", Transparency: 0 });
      back.Completed.Connect(function() {
        self._busy = false;
      });
      back.Play();
    });
    out.Play();
  };
  TextRotator.prototype._type = function(word) {
    var shown = this._shown, self = this;
    this._busy = true;
    var deleting = setInterval(function() {
      if (shown.textContent.length) return shown.textContent = shown.textContent.slice(0, -1);
      clearInterval(deleting);
      var i = 0;
      var typing = setInterval(function() {
        shown.textContent = word.slice(0, ++i);
        if (i >= word.length) {
          clearInterval(typing);
          self._busy = false;
        }
      }, 70);
      self._typing = typing;
    }, 40);
    this._deleting = deleting;
  };
  TextRotator.prototype.Destroy = function() {
    clearInterval(this._timer);
    clearInterval(this._deleting);
    clearInterval(this._typing);
  };
  TextRotator.prototype.next = TextRotator.prototype.Next;
  TextRotator.prototype.destroy = TextRotator.prototype.Destroy;
  TextRotator["new"] = function(thing, words, settings) {
    return new TextRotator(thing, words, settings);
  };
  var TEXT_ROTATOR_CSS = [
    ".webtween-rotator { display: inline-block; vertical-align: bottom; }",
    ".webtween-rotator-slide { overflow: hidden; padding-bottom: 0.12em; margin-bottom: -0.12em; }",
    ".webtween-rotator-word { display: inline-block; }",
    '/* the blinking cursor for Style: "Type" */',
    ".webtween-rotator-type .webtween-rotator-word::after {",
    '  content: ""; display: inline-block; width: 0.06em; height: 0.9em; margin-left: 0.06em;',
    "  vertical-align: -0.08em; background: currentColor; animation: webtween-blink 1s steps(1) infinite;",
    "}",
    "@keyframes webtween-blink { 50% { opacity: 0; } }",
    "@media (prefers-reduced-motion: reduce) { .webtween-rotator-type .webtween-rotator-word::after { animation: none; } }",
    ".webtween-visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }"
  ].join("\n");

  // src/public/animation/CountUp.js
  function CountUp(things, settings) {
    if (!(this instanceof CountUp)) return new CountUp(things, settings);
    settings = settings || {};
    this.Time = settings.Time === void 0 ? 2 : settings.Time;
    this.EasingStyle = pickName(settings.EasingStyle || "Quart", EasingStyle, "easing style");
    this.From = settings.From === void 0 ? 0 : settings.From;
    this.Elements = findAll(things, "CountUp");
    if (wantsLessMotion()) return;
    var self = this;
    this._stops = this.Elements.map(function(el) {
      var number = readNumber(el.textContent);
      if (!number) return function() {
      };
      el.setAttribute("aria-label", el.textContent.trim());
      el.style.fontVariantNumeric = "tabular-nums";
      el.textContent = number.write(self.From);
      return whenVisible(el, function() {
        self._count(el, number);
      }, 0.5);
    });
  }
  function readNumber(text) {
    var match = /-?\d[\d,]*(\.\d+)?/.exec(text);
    if (!match) return null;
    var raw = match[0];
    var decimals = match[1] ? match[1].length - 1 : 0;
    var commas = raw.indexOf(",") >= 0;
    var before = text.slice(0, match.index), after = text.slice(match.index + raw.length);
    return {
      value: parseFloat(raw.replace(/,/g, "")),
      write: function(n) {
        var fixed = n.toFixed(decimals);
        if (commas) {
          var parts = fixed.split(".");
          parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          fixed = parts.join(".");
        }
        return before + fixed + after;
      }
    };
  }
  CountUp.prototype._count = function(el, number) {
    var self = this, start = performance.now();
    (function frame(now) {
      var t = Math.min(1, (now - start) / 1e3 / self.Time);
      var eased = TweenService.GetValue(t, self.EasingStyle, "Out");
      el.textContent = number.write(self.From + (number.value - self.From) * eased);
      if (t < 1) requestAnimationFrame(frame);
    })(start);
  };
  CountUp.prototype.Destroy = function() {
    if (this._stops) this._stops.forEach(function(stop) {
      stop();
    });
  };
  CountUp.prototype.destroy = CountUp.prototype.Destroy;
  CountUp["new"] = function(things, settings) {
    return new CountUp(things, settings);
  };

  // src/public/elements/Card.js
  function Card(settings) {
    if (!(this instanceof Card)) return new Card(settings);
    settings = settings || {};
    addStyles("Card", CARD_CSS);
    this.Instance = document.createElement("div");
    this.Instance.className = "webtween-card";
    if (settings.Color) this.Instance.style.backgroundColor = settings.Color;
    if (settings.TextColor) this.Instance.style.color = settings.TextColor;
    if (settings.Image) {
      this.Image = document.createElement("img");
      this.Image.src = settings.Image;
      this.Image.alt = settings.Title || "";
      this.Instance.appendChild(this.Image);
    }
    if (settings.Title) {
      this.Title = document.createElement("h2");
      this.Title.textContent = settings.Title;
      this.Instance.appendChild(this.Title);
    }
    if (settings.Description) {
      this.Description = document.createElement("p");
      this.Description.textContent = settings.Description;
      this.Instance.appendChild(this.Description);
    }
    if (settings.Parent) findElement(settings.Parent, "Card").appendChild(this.Instance);
  }
  Card.prototype.Destroy = function() {
    this.Instance.remove();
  };
  Card.prototype.destroy = Card.prototype.Destroy;
  Card["new"] = function(settings) {
    return new Card(settings);
  };
  var CARD_CSS = [
    ".webtween-card {",
    "  width: 160px; height: 220px; box-sizing: border-box; padding: 12px;",
    "  border-radius: 16px; background: #444; color: white;",
    "  font: 14px system-ui, sans-serif; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);",
    "}",
    ".webtween-card img {",
    "  display: block; width: 100%; height: 100px; object-fit: cover;",
    "  border-radius: 10px; background: rgba(255, 255, 255, 0.2);",
    "}",
    ".webtween-card h2 { margin: 10px 0 4px; font-size: 20px; }",
    ".webtween-card p { margin: 0; opacity: 0.85; }"
  ].join("\n");

  // src/public/elements/ImageCard.js
  function ImageCard(settings) {
    if (!(this instanceof ImageCard)) return new ImageCard(settings);
    settings = settings || {};
    addStyles("ImageCard", IMAGE_CARD_CSS);
    this.Instance = document.createElement("div");
    this.Instance.className = "webtween-imagecard";
    this.AspectRatio = readAspectRatio(settings.AspectRatio === void 0 ? 1 : settings.AspectRatio);
    this.Instance.style.aspectRatio = String(this.AspectRatio);
    if (settings.Width !== void 0) {
      this.Instance.style.width = typeof settings.Width === "number" ? settings.Width + "px" : settings.Width;
    }
    this.Image = document.createElement("img");
    if (settings.Image) this.Image.src = settings.Image;
    this.Image.alt = settings.Title || "";
    this.Instance.appendChild(this.Image);
    if (settings.Title) {
      this.Title = document.createElement("span");
      this.Title.textContent = settings.Title;
      this.Instance.appendChild(this.Title);
    }
    if (settings.Parent) findElement(settings.Parent, "ImageCard").appendChild(this.Instance);
  }
  function readAspectRatio(value) {
    var ratio2 = value;
    if (typeof value === "string") {
      var parts = value.split(/[:\/]/);
      ratio2 = parts.length === 2 ? parseFloat(parts[0]) / parseFloat(parts[1]) : parseFloat(value);
    }
    if (typeof ratio2 !== "number" || !isFinite(ratio2) || ratio2 <= 0) {
      throw oops('"' + value + `" isn't an aspect ratio. Try something like 1, 1.5, "16:9" or "3/4".`);
    }
    return ratio2;
  }
  ImageCard.prototype.Destroy = function() {
    this.Instance.remove();
  };
  ImageCard.prototype.destroy = ImageCard.prototype.Destroy;
  ImageCard["new"] = function(settings) {
    return new ImageCard(settings);
  };
  var IMAGE_CARD_CSS = [
    ".webtween-imagecard {",
    "  position: relative; width: 240px; overflow: hidden;",
    "  border-radius: 16px; background: #444;",
    "  font: 14px system-ui, sans-serif; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);",
    "}",
    ".webtween-imagecard img {",
    "  display: block; width: 100%; height: 100%; object-fit: cover; /* crop, don't stretch */",
    "}",
    ".webtween-imagecard span {",
    "  position: absolute; left: 0; right: 0; bottom: 0; padding: 24px 12px 10px;",
    "  color: white; background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));",
    "}"
  ].join("\n");

  // src/public/elements/Countdown.js
  function Countdown(when, settings) {
    if (!(this instanceof Countdown)) return new Countdown(when, settings);
    settings = settings || {};
    this.Target = when instanceof Date ? when : new Date(when);
    if (isNaN(this.Target)) {
      throw oops('Countdown needs a date it understands, like "2026-12-31T18:00:00+01:00". You gave: ' + when);
    }
    addStyles("Countdown", COUNTDOWN_CSS);
    this.Units = settings.Units || ["Days", "Hours", "Minutes", "Seconds"];
    this.Labels = settings.Labels || {};
    this.FinishedText = settings.FinishedText || "";
    this.Finished = new Signal();
    this.Instance = document.createElement("div");
    this.Instance.className = "webtween-countdown";
    this.Instance.setAttribute("role", "timer");
    var self = this;
    this._numbers = {};
    this.Units.forEach(function(unit) {
      if (!SECONDS_IN[unit]) throw oops('Countdown units can be "Days", "Hours", "Minutes" or "Seconds". You gave: ' + unit);
      var part = document.createElement("div");
      part.className = "webtween-countdown-part";
      var number = document.createElement("span");
      number.className = "webtween-countdown-number";
      var label = document.createElement("span");
      label.className = "webtween-countdown-label";
      label.textContent = self.Labels[unit] || unit;
      part.append(number, label);
      self.Instance.appendChild(part);
      self._numbers[unit] = number;
    });
    if (settings.Parent) findElement(settings.Parent, "Countdown").appendChild(this.Instance);
    this._calm = wantsLessMotion();
    this._update();
    this._timer = setInterval(this._update.bind(this), 250);
  }
  var SECONDS_IN = { Days: 86400, Hours: 3600, Minutes: 60, Seconds: 1 };
  Countdown.prototype._update = function() {
    var left = Math.max(0, Math.floor((this.Target - Date.now()) / 1e3));
    this.Remaining = left;
    var self = this;
    this.Units.forEach(function(unit) {
      var value = Math.floor(left / SECONDS_IN[unit]);
      left -= value * SECONDS_IN[unit];
      var text = value < 10 ? "0" + value : String(value);
      var number = self._numbers[unit];
      if (number.textContent === text) return;
      var first = number.textContent === "";
      number.textContent = text;
      if (!first && !self._calm) {
        TweenService.Create(number, new TweenInfo(0), { Y: "-40%", Transparency: 1 }).Play();
        TweenService.Create(number, new TweenInfo(0.45, "Quint", "Out"), { Y: "0%", Transparency: 0 }).Play();
      }
    });
    var minute = Math.floor(this.Remaining / 60);
    if (minute !== this._spokenMinute) {
      this._spokenMinute = minute;
      this.Instance.setAttribute("aria-label", describe(this.Remaining));
    }
    if (this.Remaining === 0) {
      clearInterval(this._timer);
      if (this.FinishedText) {
        this.Instance.textContent = this.FinishedText;
        this.Instance.classList.add("webtween-countdown-done");
      }
      this.Finished._fire();
    }
  };
  function describe(seconds2) {
    var days = Math.floor(seconds2 / 86400), hours = Math.floor(seconds2 % 86400 / 3600), minutes = Math.floor(seconds2 % 3600 / 60);
    return days + " days, " + hours + " hours and " + minutes + " minutes to go";
  }
  Countdown.prototype.Destroy = function() {
    clearInterval(this._timer);
    this.Instance.remove();
  };
  Countdown.prototype.destroy = Countdown.prototype.Destroy;
  Countdown["new"] = function(when, settings) {
    return new Countdown(when, settings);
  };
  var COUNTDOWN_CSS = [
    ".webtween-countdown { display: flex; gap: 1.5em; }",
    ".webtween-countdown-part { display: flex; flex-direction: column; align-items: flex-start; overflow: hidden; }",
    ".webtween-countdown-number { display: inline-block; font-size: 2.5em; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }",
    ".webtween-countdown-label { font-size: 0.85em; opacity: 0.75; }"
  ].join("\n");

  // src/hidden/zones.js
  function clockIn(date, timeZone) {
    var format;
    try {
      format = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        weekday: "short",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric"
      });
    } catch (err) {
      throw oops('"' + timeZone + `" isn't a time zone. Use one like "Europe/London" or "America/New_York".`);
    }
    var out = {};
    format.formatToParts(date).forEach(function(part) {
      out[part.type] = part.value;
    });
    return {
      weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(out.weekday),
      year: +out.year,
      month: +out.month,
      day: +out.day,
      hour: +out.hour % 24,
      minute: +out.minute,
      second: +out.second
    };
  }
  function momentFrom(text, timeZone) {
    if (text instanceof Date) return text;
    var hasZone = /(Z|[+-]\d\d:?\d\d)$/.test(String(text));
    var match = /^(\d{4})-(\d\d)-(\d\d)(?:[T ](\d\d):(\d\d)(?::(\d\d))?)?$/.exec(String(text));
    if (hasZone || !timeZone || !match) {
      var plain = new Date(text);
      if (isNaN(plain)) throw oops(`Couldn't read the date "` + text + '". Write it like "2026-06-12T09:00".');
      return plain;
    }
    var guess = Date.UTC(+match[1], +match[2] - 1, +match[3], +(match[4] || 0), +(match[5] || 0), +(match[6] || 0));
    for (var i = 0; i < 2; i++) {
      var c = clockIn(new Date(guess), timeZone);
      var shown = Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute, c.second);
      var wanted = Date.UTC(+match[1], +match[2] - 1, +match[3], +(match[4] || 0), +(match[5] || 0), +(match[6] || 0));
      guess += wanted - shown;
    }
    return new Date(guess);
  }

  // src/public/elements/OpeningHours.js
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function OpeningHours(thing, settings) {
    if (!(this instanceof OpeningHours)) return new OpeningHours(thing, settings);
    settings = settings || {};
    if (!settings.Hours) throw oops('OpeningHours needs Hours, like { Monday: "12:00-22:00", Tuesday: "closed" }.');
    addStyles("OpeningHours", HOURS_CSS);
    this.TimeZone = settings.TimeZone;
    this.Clock = settings.Clock === 12 ? 12 : 24;
    this.ShowTable = !!settings.ShowTable;
    this.StartWeek = settings.StartWeek === "Sunday" ? 0 : 1;
    this.Hours = readHours(settings.Hours);
    this.Changed = new Signal();
    var box = this.Instance = findOne(thing, "OpeningHours");
    box.classList.add("webtween-hours");
    box.textContent = "";
    this._now = document.createElement("p");
    this._now.className = "webtween-hours-now";
    box.appendChild(this._now);
    if (this.ShowTable) {
      this._table = document.createElement("dl");
      this._table.className = "webtween-hours-table";
      box.appendChild(this._table);
    }
    this._update();
    this._timer = setInterval(this._update.bind(this), 3e4);
  }
  function readHours(hours) {
    var week = [[], [], [], [], [], [], []];
    var written = ["", "", "", "", "", "", ""];
    Object.keys(hours).forEach(function(name) {
      var day = DAYS.findIndex(function(d) {
        return d.slice(0, 3).toLowerCase() === name.slice(0, 3).toLowerCase();
      });
      if (day < 0) throw oops('"' + name + `" isn't a day. Use Monday, Tuesday... (or Mon, Tue...).`);
      var text = String(hours[name] || "").trim();
      written[day] = text;
      if (!text || /^closed$/i.test(text)) return;
      text.split(",").forEach(function(range) {
        var m = /^\s*(\d{1,2})(?::(\d\d))?\s*[-–]\s*(\d{1,2})(?::(\d\d))?\s*$/.exec(range);
        if (!m) throw oops(`Couldn't read the hours "` + range.trim() + '" for ' + DAYS[day] + '. Write them like "12:00-22:00".');
        var from = +m[1] * 60 + +(m[2] || 0);
        var to = +m[3] * 60 + +(m[4] || 0);
        if (to <= from) to += 1440;
        week[day].push({ from, to });
      });
    });
    return { week, written };
  }
  OpeningHours.prototype._status = function(day, minute) {
    var week = this.Hours.week;
    var yesterday = (day + 6) % 7;
    var open = null;
    week[day].forEach(function(r) {
      if (minute >= r.from && minute < r.to) open = { closesDay: r.to >= 1440 ? (day + 1) % 7 : day, closesAt: r.to % 1440 };
    });
    week[yesterday].forEach(function(r) {
      if (r.to > 1440 && minute < r.to - 1440) open = { closesDay: day, closesAt: r.to - 1440 };
    });
    if (open) return open;
    for (var ahead = 0; ahead < 8; ahead++) {
      var d = (day + ahead) % 7;
      var next = week[d].filter(function(r) {
        return ahead > 0 || r.from > minute;
      })[0];
      if (next) return { opensDay: d, opensAt: next.from, ahead };
    }
    return { never: true };
  };
  OpeningHours.prototype._time = function(minutes) {
    var h = Math.floor(minutes / 60) % 24, m = minutes % 60;
    if (this.Clock === 24) return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
    var suffix = h < 12 ? " am" : " pm";
    h = h % 12 || 12;
    return h + (m ? ":" + (m < 10 ? "0" : "") + m : "") + suffix;
  };
  OpeningHours.prototype._update = function() {
    var clock = clockIn(/* @__PURE__ */ new Date(), this.TimeZone);
    var minute = clock.hour * 60 + clock.minute;
    var s = this._status(clock.weekday, minute);
    var isOpen = s.closesAt !== void 0;
    var text;
    if (isOpen) {
      var minutesLeft = (s.closesAt - minute + 1440) % 1440;
      text = (minutesLeft <= 60 ? "Closing soon" : "Open now") + " \xB7 closes at " + this._time(s.closesAt);
    } else if (s.never) {
      text = "Closed";
    } else {
      var when = s.ahead === 0 ? "" : s.ahead === 1 ? "tomorrow " : DAYS[s.opensDay] + " ";
      text = "Closed \xB7 opens " + when + "at " + this._time(s.opensAt);
    }
    this._now.textContent = text;
    this._now.setAttribute("data-open", isOpen);
    this.IsOpen = isOpen;
    if (this._wasOpen !== void 0 && this._wasOpen !== isOpen) this.Changed._fire(isOpen);
    this._wasOpen = isOpen;
    if (this._table && this._today !== clock.weekday) this._drawTable(clock.weekday);
  };
  OpeningHours.prototype._drawTable = function(today) {
    this._today = today;
    var table = this._table, self = this;
    table.textContent = "";
    for (var i = 0; i < 7; i++) {
      var day = (i + this.StartWeek) % 7;
      var row = document.createElement("div");
      if (day === today) {
        row.className = "webtween-hours-today";
        row.setAttribute("aria-current", "date");
      }
      var name = document.createElement("dt");
      name.textContent = DAYS[day];
      var hours = document.createElement("dd");
      var ranges = this.Hours.week[day];
      if (!ranges.length) hours.textContent = "Closed";
      ranges.forEach(function(r, n) {
        var range = document.createElement("span");
        range.textContent = self._time(r.from) + "\u2013" + self._time(r.to % 1440) + (n < ranges.length - 1 ? "," : "");
        hours.appendChild(range);
      });
      row.append(name, hours);
      table.appendChild(row);
    }
  };
  OpeningHours.prototype.Destroy = function() {
    clearInterval(this._timer);
  };
  OpeningHours.prototype.destroy = OpeningHours.prototype.Destroy;
  OpeningHours["new"] = function(thing, settings) {
    return new OpeningHours(thing, settings);
  };
  var HOURS_CSS = [
    ".webtween-hours-now { display: flex; align-items: center; gap: 0.5em; margin: 0; font-weight: 600; }",
    '.webtween-hours-now::before { content: ""; width: 0.6em; height: 0.6em; border-radius: 50%; background: #c0392b; flex: none; }',
    '.webtween-hours-now[data-open="true"]::before { background: #2e9e5b; }',
    ".webtween-hours-table { margin: 1em 0 0; }",
    ".webtween-hours-table > div { display: flex; justify-content: space-between; gap: 2em; padding: 0.25em 0; }",
    ".webtween-hours-table dd { margin: 0; display: flex; flex-wrap: wrap; justify-content: flex-end; column-gap: 0.4em; text-align: right; }",
    ".webtween-hours-table dd span { white-space: nowrap; }",
    ".webtween-hours-today { font-weight: 700; }"
  ].join("\n");

  // src/public/elements/AddToCalendar.js
  function AddToCalendar(thing, settings) {
    if (!(this instanceof AddToCalendar)) return new AddToCalendar(thing, settings);
    settings = settings || {};
    if (!settings.Title || !settings.Start) throw oops("AddToCalendar needs at least a Title and a Start.");
    addStyles("AddToCalendar", CALENDAR_CSS);
    this.Title = settings.Title;
    this.Start = momentFrom(settings.Start, settings.TimeZone);
    this.End = settings.End ? momentFrom(settings.End, settings.TimeZone) : new Date(this.Start.getTime() + 36e5);
    this.Location = settings.Location || "";
    this.Description = settings.Description || "";
    if (this.End <= this.Start) throw oops("AddToCalendar's End needs to be after its Start.");
    var box = this.Instance = findOne(thing, "AddToCalendar");
    box.classList.add("webtween-calendar");
    box.textContent = "";
    var button2 = this.Button = document.createElement("button");
    button2.type = "button";
    button2.className = "webtween-calendar-button";
    button2.textContent = settings.Text || "Add to calendar";
    button2.setAttribute("aria-haspopup", "true");
    button2.setAttribute("aria-expanded", "false");
    var menu = this._menu = document.createElement("div");
    menu.className = "webtween-calendar-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    var self = this;
    [
      ["Google Calendar", this.GoogleLink()],
      ["Outlook", this.OutlookLink()],
      ["Apple / other (.ics)", null]
    ].forEach(function(choice) {
      var link = document.createElement("a");
      link.setAttribute("role", "menuitem");
      link.textContent = choice[0];
      if (choice[1]) {
        link.href = choice[1];
        link.target = "_blank";
        link.rel = "noopener";
      } else {
        link.href = "#";
        link.addEventListener("click", function(e) {
          e.preventDefault();
          self.Download();
        });
      }
      link.addEventListener("click", function() {
        self.Close();
      });
      menu.appendChild(link);
    });
    box.append(button2, menu);
    button2.addEventListener("click", function() {
      if (menu.hidden) self.Open();
      else self.Close();
    });
    this._onOutside = function(e) {
      if (!box.contains(e.target)) self.Close();
    };
    this._onKey = function(e) {
      if (e.key === "Escape") {
        self.Close();
        button2.focus();
      }
      var items = Array.prototype.slice.call(menu.children);
      var i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus();
      }
    };
  }
  function stamp(date) {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }
  AddToCalendar.prototype.GoogleLink = function() {
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(this.Title) + "&dates=" + stamp(this.Start) + "/" + stamp(this.End) + "&details=" + encodeURIComponent(this.Description) + "&location=" + encodeURIComponent(this.Location);
  };
  AddToCalendar.prototype.OutlookLink = function() {
    return "https://outlook.live.com/calendar/0/action/compose?rru=addevent&subject=" + encodeURIComponent(this.Title) + "&startdt=" + encodeURIComponent(this.Start.toISOString()) + "&enddt=" + encodeURIComponent(this.End.toISOString()) + "&body=" + encodeURIComponent(this.Description) + "&location=" + encodeURIComponent(this.Location);
  };
  AddToCalendar.prototype.Download = function() {
    function clean(text) {
      return String(text).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
    }
    var file = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//WebTween//AddToCalendar//EN",
      "BEGIN:VEVENT",
      "UID:" + stamp(this.Start) + "-" + Math.random().toString(36).slice(2) + "@webtween",
      "DTSTAMP:" + stamp(/* @__PURE__ */ new Date()),
      "DTSTART:" + stamp(this.Start),
      "DTEND:" + stamp(this.End),
      "SUMMARY:" + clean(this.Title),
      "DESCRIPTION:" + clean(this.Description),
      "LOCATION:" + clean(this.Location),
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    var link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([file], { type: "text/calendar" }));
    link.download = this.Title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() + ".ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function() {
      URL.revokeObjectURL(link.href);
    }, 1e3);
  };
  AddToCalendar.prototype.Open = function() {
    var menu = this._menu;
    menu.hidden = false;
    this.Button.setAttribute("aria-expanded", "true");
    if (!wantsLessMotion()) {
      TweenService.Create(menu, new TweenInfo(0), { Y: -6, Transparency: 1 }).Play();
      TweenService.Create(menu, new TweenInfo(0.25, "Quint", "Out"), { Y: 0, Transparency: 0 }).Play();
    }
    menu.firstChild.focus();
    document.addEventListener("pointerdown", this._onOutside);
    this.Instance.addEventListener("keydown", this._onKey);
  };
  AddToCalendar.prototype.Close = function() {
    this._menu.hidden = true;
    this.Button.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", this._onOutside);
    this.Instance.removeEventListener("keydown", this._onKey);
  };
  AddToCalendar.prototype.Destroy = function() {
    this.Close();
    this.Instance.textContent = "";
  };
  AddToCalendar.prototype.open = AddToCalendar.prototype.Open;
  AddToCalendar.prototype.close = AddToCalendar.prototype.Close;
  AddToCalendar.prototype.download = AddToCalendar.prototype.Download;
  AddToCalendar.prototype.destroy = AddToCalendar.prototype.Destroy;
  AddToCalendar["new"] = function(thing, settings) {
    return new AddToCalendar(thing, settings);
  };
  var CALENDAR_CSS = [
    ".webtween-calendar { position: relative; display: inline-block; }",
    ".webtween-calendar-button { min-height: 44px; padding: 0 1.2em; border: 0; background: #161616; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }",
    ".webtween-calendar-menu {",
    "  position: absolute; left: 0; top: calc(100% + 6px); z-index: 10; min-width: 220px; padding: 6px;",
    "  display: flex; flex-direction: column; background: #fff; color: #161616;",
    "  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18); /* it floats over the page */",
    "}",
    ".webtween-calendar-menu[hidden] { display: none; }",
    ".webtween-calendar-menu a { padding: 10px 12px; color: inherit; text-decoration: none; }",
    ".webtween-calendar-menu a:hover, .webtween-calendar-menu a:focus-visible { background: #f0efea; outline: none; }"
  ].join("\n");

  // src/public/buildReferences/Carousel.js
  function Carousel(cards, settings) {
    if (!(this instanceof Carousel)) return new Carousel(cards, settings);
    if (!Array.isArray(cards) || cards.length === 0) {
      throw oops('Carousel needs a list of cards, like [cat, dog] or [{ Title: "Cat" }].');
    }
    settings = settings || {};
    addStyles("Card", CARD_CSS);
    addStyles("Carousel", CAROUSEL_CSS);
    this.Radius = pick2(settings.Radius, 250);
    this.EasingStyle = pickName(pick2(settings.EasingStyle, "Back"), EasingStyle, "easing style");
    this.Duration = pick2(settings.Duration, 1);
    this.AutoSpinEvery = pick2(settings.AutoSpinEvery, 3);
    this.PauseAfterScroll = pick2(settings.PauseAfterScroll, 4);
    this.ScrollSensitivity = pick2(settings.ScrollSensitivity, 60);
    this.Instance = document.createElement("div");
    this.Instance.className = "webtween-carousel";
    this.Cards = cards.map(function(card) {
      return card instanceof Card || card instanceof ImageCard ? card : new Card(card);
    });
    var ring = this.Instance;
    this.Cards.forEach(function(card) {
      ring.appendChild(card.Instance);
    });
    findElement(settings.Parent || document.body, "Carousel").appendChild(ring);
    this._spin = 0;
    this._from = 0;
    this._to = 0;
    this._startTime = 0;
    this._lastSpinTime = performance.now();
    this._lastScrollTime = -Infinity;
    this._wheelBuildUp = 0;
    this._onWheel = this._onWheel.bind(this);
    ring.addEventListener("wheel", this._onWheel, { passive: false });
    this._everyFrame = this._everyFrame.bind(this);
    this._frameRequest = requestAnimationFrame(this._everyFrame);
  }
  function pick2(value, fallback) {
    return value === void 0 ? fallback : value;
  }
  Carousel.prototype._step = function() {
    return 360 / this.Cards.length;
  };
  Carousel.prototype._spinTo = function(target) {
    this._from = this._spin;
    this._to = target;
    this._startTime = this._lastSpinTime = performance.now();
  };
  Carousel.prototype.Next = function() {
    this._spinTo(this._to - this._step());
  };
  Carousel.prototype.Previous = function() {
    this._spinTo(this._to + this._step());
  };
  Carousel.prototype._everyFrame = function(now) {
    this._frameRequest = requestAnimationFrame(this._everyFrame);
    var quietFor = (now - this._lastScrollTime) / 1e3;
    var sinceSpin = (now - this._lastSpinTime) / 1e3;
    if (this.AutoSpinEvery > 0 && quietFor >= this.PauseAfterScroll && sinceSpin >= this.AutoSpinEvery) {
      this.Next();
    }
    var alpha = this.Duration > 0 ? Math.min(1, (now - this._startTime) / 1e3 / this.Duration) : 1;
    var eased = TweenService.GetValue(alpha, this.EasingStyle, "Out");
    this._spin = this._from + (this._to - this._from) * eased;
    var step = this._step(), spin = this._spin, radius = this.Radius;
    this.Cards.forEach(function(card, i) {
      card.Instance.style.transform = "translate(-50%, -50%) rotateY(" + round(spin + i * step) + "deg) translateZ(" + radius + "px)";
    });
  };
  Carousel.prototype._onWheel = function(e) {
    e.preventDefault();
    this._wheelBuildUp += e.deltaY;
    if (Math.abs(this._wheelBuildUp) < this.ScrollSensitivity) return;
    var down = this._wheelBuildUp > 0;
    this._wheelBuildUp = 0;
    this._lastScrollTime = performance.now();
    if (down) this.Next();
    else this.Previous();
  };
  Carousel.prototype.Destroy = function() {
    cancelAnimationFrame(this._frameRequest);
    this._everyFrame = function() {
    };
    this.Instance.removeEventListener("wheel", this._onWheel);
    this.Instance.remove();
  };
  Carousel.prototype.destroy = Carousel.prototype.Destroy;
  Carousel.prototype.next = Carousel.prototype.Next;
  Carousel.prototype.previous = Carousel.prototype.Previous;
  Carousel["new"] = function(cards, settings) {
    return new Carousel(cards, settings);
  };
  var CAROUSEL_CSS = [
    ".webtween-carousel {",
    "  position: relative; height: 100vh;",
    "  perspective: 1000px; /* how strong the 3D looks: smaller = more dramatic */",
    "  transform-style: preserve-3d; /* lets the browser work out which card is in front */",
    "}",
    "/* div.: beats each card's own .webtween-... styles, whichever got added first */",
    "div.webtween-carousel > * {",
    "  position: absolute; left: 50%; top: 50%; /* centred by the spin, whatever size the card is */",
    "}"
  ].join("\n");

  // src/public/buildReferences/Slideshow.js
  function Slideshow(slides, settings) {
    if (!(this instanceof Slideshow)) return new Slideshow(slides, settings);
    if (!slides || !slides.length) {
      throw oops('Slideshow needs a list of slides, like ["pool.jpg", "lobby.jpg"].');
    }
    settings = settings || {};
    addStyles("Slideshow", SLIDESHOW_CSS);
    this.Every = pick3(settings.Every, 6);
    this.FadeTime = pick3(settings.FadeTime, 1.6);
    this.EasingStyle = pickName(pick3(settings.EasingStyle, "Sine"), EasingStyle, "easing style");
    this.Instance = document.createElement("div");
    this.Instance.className = "webtween-slideshow";
    var ratio2 = settings.AspectRatio;
    this.Slides = Array.prototype.map.call(slides, function(slide) {
      if (typeof slide === "string") return new ImageCard({ Image: slide, AspectRatio: ratio2 }).Instance;
      return findAll(slide, "Slideshow")[0];
    });
    var box = this.Instance;
    this.Slides.forEach(function(el) {
      box.appendChild(el);
    });
    if (settings.Parent) findElement(settings.Parent, "Slideshow").appendChild(box);
    this.Current = 0;
    this._onTop = 1;
    this.Slides.forEach(function(el, i) {
      TweenService.Create(el, new TweenInfo(0), { Transparency: i === 0 ? 0 : 1 }).Play();
    });
    if (!wantsLessMotion() && this.Slides.length > 1) {
      this._timer = setInterval(this._onTimer.bind(this), this.Every * 1e3);
    }
  }
  function pick3(value, fallback) {
    return value === void 0 ? fallback : value;
  }
  Slideshow.prototype._onTimer = function() {
    if (!document.hidden) this.Next();
  };
  Slideshow.prototype.Next = function() {
    this.Show((this.Current + 1) % this.Slides.length);
  };
  Slideshow.prototype.Show = function(n) {
    if (n === this.Current || !this.Slides[n]) return;
    var leaving = this.Slides[this.Current];
    var arriving = this.Slides[n];
    this.Current = n;
    arriving.style.zIndex = ++this._onTop;
    var fade = TweenService.Create(arriving, new TweenInfo(this.FadeTime, this.EasingStyle, "InOut"), { Transparency: 0 });
    fade.Completed.Connect(function(state) {
      if (state === "Completed") TweenService.Create(leaving, new TweenInfo(0), { Transparency: 1 }).Play();
    });
    fade.Play();
  };
  Slideshow.prototype.Destroy = function() {
    clearInterval(this._timer);
    this.Instance.remove();
  };
  Slideshow.prototype.next = Slideshow.prototype.Next;
  Slideshow.prototype.show = Slideshow.prototype.Show;
  Slideshow.prototype.destroy = Slideshow.prototype.Destroy;
  Slideshow["new"] = function(slides, settings) {
    return new Slideshow(slides, settings);
  };
  var SLIDESHOW_CSS = [
    ".webtween-slideshow { position: relative; isolation: isolate; /* the slides' stacking stays inside it */ }",
    "/* div.: beats each slide's own .webtween-... styles */",
    "div.webtween-slideshow > :not(:first-child) { position: absolute; inset: 0; }"
  ].join("\n");

  // src/public/buildReferences/Marquee.js
  function Marquee(thing, settings) {
    if (!(this instanceof Marquee)) return new Marquee(thing, settings);
    settings = settings || {};
    addStyles("Marquee", MARQUEE_CSS);
    this.Speed = settings.Speed === void 0 ? 60 : settings.Speed;
    this.Direction = sameWord(settings.Direction, "Left") === "right" ? "Right" : "Left";
    this.Gap = settings.Gap === void 0 ? 48 : settings.Gap;
    this.PauseOnHover = settings.PauseOnHover !== false;
    var box = this.Instance = findOne(thing, "Marquee");
    box.classList.add("webtween-marquee");
    box.style.setProperty("--webtween-gap", this.Gap + "px");
    this._set = document.createElement("div");
    this._set.className = "webtween-marquee-set";
    while (box.firstChild) this._set.appendChild(box.firstChild);
    this._track = document.createElement("div");
    this._track.className = "webtween-marquee-track";
    this._track.appendChild(this._set);
    box.appendChild(this._track);
    this._offset = 0;
    this._paused = false;
    this._onScreen = true;
    if (wantsLessMotion()) {
      box.classList.add("webtween-marquee-still");
      return;
    }
    var self = this;
    this._fill();
    if (window.ResizeObserver) {
      this._resizeWatcher = new ResizeObserver(function() {
        self._fill();
      });
      this._resizeWatcher.observe(box);
    }
    if (window.IntersectionObserver) {
      this._screenWatcher = new IntersectionObserver(function(entries) {
        self._onScreen = entries[0].isIntersecting;
      });
      this._screenWatcher.observe(box);
    }
    if (this.PauseOnHover) {
      box.addEventListener("mouseenter", function() {
        self._paused = true;
      });
      box.addEventListener("mouseleave", function() {
        self._paused = false;
      });
    }
    this._tick = this._tick.bind(this);
    this._frameRequest = requestAnimationFrame(this._tick);
  }
  Marquee.prototype._fill = function() {
    var track = this._track;
    while (track.children.length > 1) track.removeChild(track.lastChild);
    var setWidth = this._set.offsetWidth + this.Gap;
    if (!setWidth) return;
    var copies = Math.max(1, Math.ceil(this.Instance.offsetWidth * 2 / setWidth));
    for (var i = 0; i < copies; i++) {
      var copy = this._set.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      Array.prototype.forEach.call(copy.querySelectorAll("a, button, input"), function(el) {
        el.tabIndex = -1;
      });
      track.appendChild(copy);
    }
    this._setWidth = setWidth;
  };
  Marquee.prototype._tick = function(now) {
    this._frameRequest = requestAnimationFrame(this._tick);
    var seconds2 = this._last ? Math.min(0.1, (now - this._last) / 1e3) : 0;
    this._last = now;
    if (this._paused || !this._onScreen || document.hidden || !this._setWidth) return;
    this._offset = (this._offset + this.Speed * seconds2) % this._setWidth;
    var x = this.Direction === "Left" ? -this._offset : this._offset - this._setWidth;
    this._track.style.transform = "translateX(" + round(x) + "px)";
  };
  Marquee.prototype.Pause = function() {
    this._paused = true;
  };
  Marquee.prototype.Play = function() {
    this._paused = false;
  };
  Marquee.prototype.Destroy = function() {
    cancelAnimationFrame(this._frameRequest);
    if (this._resizeWatcher) this._resizeWatcher.disconnect();
    if (this._screenWatcher) this._screenWatcher.disconnect();
    var box = this.Instance;
    box.textContent = "";
    while (this._set.firstChild) box.appendChild(this._set.firstChild);
    box.classList.remove("webtween-marquee", "webtween-marquee-still");
  };
  Marquee.prototype.pause = Marquee.prototype.Pause;
  Marquee.prototype.play = Marquee.prototype.Play;
  Marquee.prototype.destroy = Marquee.prototype.Destroy;
  Marquee["new"] = function(thing, settings) {
    return new Marquee(thing, settings);
  };
  var MARQUEE_CSS = [
    ".webtween-marquee { overflow: hidden; }",
    ".webtween-marquee-track { display: flex; width: max-content; gap: var(--webtween-gap); }",
    ".webtween-marquee-set { display: flex; flex: none; align-items: center; gap: var(--webtween-gap); }",
    ".webtween-marquee-set > * { flex: none; }",
    ".webtween-marquee-still .webtween-marquee-track, .webtween-marquee-still .webtween-marquee-set { width: auto; flex-wrap: wrap; }"
  ].join("\n");

  // src/public/buildReferences/Tabs.js
  var made = 0;
  function Tabs(thing, settings) {
    if (!(this instanceof Tabs)) return new Tabs(thing, settings);
    settings = settings || {};
    addStyles("Tabs", TABS_CSS);
    var box = this.Instance = findOne(thing, "Tabs");
    this.Panels = Array.prototype.filter.call(box.children, function(child) {
      return child.hasAttribute("data-tab");
    });
    if (!this.Panels.length) throw oops('Tabs needs children with a data-tab name, like <section data-tab="Starters">.');
    this.Changed = new Signal();
    this._calm = wantsLessMotion();
    box.classList.add("webtween-tabs");
    var list = this._list = document.createElement("div");
    list.className = "webtween-tablist";
    list.setAttribute("role", "tablist");
    if (settings.Label) list.setAttribute("aria-label", settings.Label);
    var id = "webtween-tabs-" + ++made;
    var self = this;
    this.Tabs = this.Panels.map(function(panel, i) {
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "webtween-tab";
      tab.id = id + "-tab-" + i;
      tab.setAttribute("role", "tab");
      tab.textContent = panel.getAttribute("data-tab");
      panel.id = panel.id || id + "-panel-" + i;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      panel.tabIndex = 0;
      tab.setAttribute("aria-controls", panel.id);
      tab.addEventListener("click", function() {
        self.Show(i);
      });
      list.appendChild(tab);
      return tab;
    });
    this._line = document.createElement("span");
    this._line.className = "webtween-tab-line";
    list.appendChild(this._line);
    box.insertBefore(list, box.firstChild);
    list.addEventListener("keydown", function(e) {
      var count = self.Tabs.length, to = null;
      if (e.key === "ArrowRight") to = (self.Current + 1) % count;
      else if (e.key === "ArrowLeft") to = (self.Current + count - 1) % count;
      else if (e.key === "Home") to = 0;
      else if (e.key === "End") to = count - 1;
      if (to === null) return;
      e.preventDefault();
      self.Show(to);
      self.Tabs[to].focus();
    });
    if (window.ResizeObserver) {
      this._resizeWatcher = new ResizeObserver(function() {
        self._moveLine(false);
      });
      this._resizeWatcher.observe(list);
    }
    this.Current = -1;
    this.Show(settings.Start === void 0 ? 0 : settings.Start, true);
  }
  Tabs.prototype.Show = function(which, quietly) {
    var i = typeof which === "number" ? which : this.Panels.findIndex(function(p) {
      return p.getAttribute("data-tab") === which;
    });
    if (i < 0 || i >= this.Panels.length) throw oops(`There's no tab "` + which + '".');
    if (i === this.Current) return;
    var self = this;
    this.Tabs.forEach(function(tab, n) {
      tab.setAttribute("aria-selected", n === i ? "true" : "false");
      tab.tabIndex = n === i ? 0 : -1;
    });
    this.Panels.forEach(function(panel2, n) {
      panel2.hidden = n !== i;
    });
    if (!quietly && !this._calm) {
      var panel = this.Panels[i];
      TweenService.Create(panel, new TweenInfo(0), { Y: 12, Transparency: 1 }).Play();
      TweenService.Create(panel, new TweenInfo(0.45, "Quint", "Out"), { Y: 0, Transparency: 0 }).Play();
    }
    this.Current = i;
    this._moveLine(!quietly);
    if (!quietly) this.Changed._fire(i, this.Panels[i].getAttribute("data-tab"));
  };
  Tabs.prototype._moveLine = function(animate) {
    var tab = this.Tabs[this.Current];
    if (!tab) return;
    var goal = { X: tab.offsetLeft, Width: tab.offsetWidth };
    var time = animate && !this._calm ? 0.4 : 0;
    TweenService.Create(this._line, new TweenInfo(time, "Quint", "Out"), goal).Play();
  };
  Tabs.prototype.Destroy = function() {
    if (this._resizeWatcher) this._resizeWatcher.disconnect();
    this._list.remove();
    this.Panels.forEach(function(panel) {
      panel.hidden = false;
    });
  };
  Tabs.prototype.show = Tabs.prototype.Show;
  Tabs.prototype.destroy = Tabs.prototype.Destroy;
  Tabs["new"] = function(thing, settings) {
    return new Tabs(thing, settings);
  };
  var TABS_CSS = [
    ".webtween-tablist { position: relative; display: flex; gap: 4px; overflow-x: auto; margin-bottom: 1.5em; scrollbar-width: none; }",
    ".webtween-tab {",
    "  flex: none; min-height: 44px; padding: 0 1em; border: 0; background: none;",
    "  color: inherit; font: inherit; opacity: 0.6; cursor: pointer; transition: opacity 0.2s;",
    "}",
    '.webtween-tab:hover, .webtween-tab[aria-selected="true"] { opacity: 1; }',
    ".webtween-tab:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }",
    ".webtween-tab-line { position: absolute; left: 0; bottom: 0; height: 3px; width: 0; background: currentColor; pointer-events: none; }",
    '.webtween-tabs [role="tabpanel"]:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }'
  ].join("\n");

  // src/public/buildReferences/Accordion.js
  function Accordion(things, settings) {
    if (!(this instanceof Accordion)) return new Accordion(things, settings);
    settings = settings || {};
    addStyles("Accordion", ACCORDION_CSS);
    this.OnlyOne = !!settings.OnlyOne;
    this.Time = settings.Time === void 0 ? 0.4 : settings.Time;
    this.Toggled = new Signal();
    var items = [];
    findAll(things, "Accordion").forEach(function(el) {
      if (el.tagName === "DETAILS") items.push(el);
      else items = items.concat(Array.prototype.slice.call(el.querySelectorAll("details")));
    });
    this.Items = items;
    var self = this;
    this._calm = wantsLessMotion();
    items.forEach(function(details) {
      details.classList.add("webtween-accordion");
      var body = document.createElement("div");
      body.className = "webtween-accordion-body";
      Array.prototype.slice.call(details.childNodes).forEach(function(child) {
        if (child.nodeName !== "SUMMARY") body.appendChild(child);
      });
      details.appendChild(body);
      details._webtweenBody = body;
      var summary = details.querySelector("summary");
      if (!summary) return;
      summary.addEventListener("click", function(e) {
        e.preventDefault();
        if (details._webtweenClosing || !details.open) self.Open(details);
        else self.Close(details);
      });
    });
  }
  Accordion.prototype.Open = function(which) {
    var details = typeof which === "number" ? this.Items[which] : which;
    var body = details._webtweenBody, self = this;
    if (this.OnlyOne) {
      this.Items.forEach(function(other) {
        if (other !== details && other.open && !other._webtweenClosing) self.Close(other);
      });
    }
    details._webtweenClosing = false;
    var from = details.open ? body.offsetHeight : 0;
    details.open = true;
    this.Toggled._fire(details, true);
    if (this._calm) return;
    var to = body.scrollHeight;
    TweenService.Create(body, new TweenInfo(0), { Height: from }).Play();
    var grow = TweenService.Create(body, new TweenInfo(this.Time, "Quint", "Out"), { Height: to });
    grow.Completed.Connect(function(state) {
      if (state === "Completed") body.style.height = "";
    });
    grow.Play();
  };
  Accordion.prototype.Close = function(which) {
    var details = typeof which === "number" ? this.Items[which] : which;
    var body = details._webtweenBody;
    this.Toggled._fire(details, false);
    if (this._calm) {
      details.open = false;
      return;
    }
    details._webtweenClosing = true;
    TweenService.Create(body, new TweenInfo(0), { Height: body.offsetHeight }).Play();
    var shrink = TweenService.Create(body, new TweenInfo(this.Time * 0.8, "Quint", "Out"), { Height: 0 });
    shrink.Completed.Connect(function(state) {
      if (state !== "Completed") return;
      details._webtweenClosing = false;
      details.open = false;
      body.style.height = "";
    });
    shrink.Play();
  };
  Accordion.prototype.Toggle = function(which) {
    var details = typeof which === "number" ? this.Items[which] : which;
    if (details.open && !details._webtweenClosing) this.Close(details);
    else this.Open(details);
  };
  Accordion.prototype.open = Accordion.prototype.Open;
  Accordion.prototype.close = Accordion.prototype.Close;
  Accordion.prototype.toggle = Accordion.prototype.Toggle;
  Accordion["new"] = function(things, settings) {
    return new Accordion(things, settings);
  };
  var ACCORDION_CSS = [
    ".webtween-accordion-body { overflow: hidden; }",
    ".webtween-accordion > summary { cursor: pointer; }"
  ].join("\n");

  // src/public/buildReferences/Lightbox.js
  function Lightbox(things, settings) {
    if (!(this instanceof Lightbox)) return new Lightbox(things, settings);
    settings = settings || {};
    addStyles("Lightbox", LIGHTBOX_CSS);
    this.Images = findAll(things, "Lightbox").map(function(el) {
      return el.tagName === "IMG" ? el : el.querySelector("img");
    }).filter(Boolean);
    if (!this.Images.length) throw oops("Lightbox couldn't find any images in what you gave it.");
    this.Opened = new Signal();
    this.Closed = new Signal();
    this.Current = -1;
    this._calm = wantsLessMotion();
    var self = this;
    this.Images.forEach(function(img, i) {
      img.classList.add("webtween-lightbox-thumb");
      if (!img.closest("a, button")) {
        img.tabIndex = 0;
        img.setAttribute("role", "button");
        img.setAttribute("aria-label", "Open photo" + (img.alt ? ": " + img.alt : ""));
      }
      img.addEventListener("click", function(e) {
        e.preventDefault();
        self.Open(i);
      });
      img.addEventListener("keydown", function(e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          self.Open(i);
        }
      });
    });
    var dialog = this._dialog = document.createElement("dialog");
    dialog.className = "webtween-lightbox";
    dialog.setAttribute("aria-label", settings.Label || "Photo");
    dialog.innerHTML = '<figure class="webtween-lightbox-figure"><img alt=""><figcaption></figcaption></figure><button type="button" class="webtween-lightbox-close">Close</button><button type="button" class="webtween-lightbox-previous" aria-label="Previous photo">\u2039</button><button type="button" class="webtween-lightbox-next" aria-label="Next photo">\u203A</button><p class="webtween-lightbox-count" aria-live="polite"></p>';
    document.body.appendChild(dialog);
    this._big = dialog.querySelector("img");
    this._caption = dialog.querySelector("figcaption");
    this._count = dialog.querySelector(".webtween-lightbox-count");
    dialog.querySelector(".webtween-lightbox-close").addEventListener("click", function() {
      self.Close();
    });
    dialog.querySelector(".webtween-lightbox-previous").addEventListener("click", function() {
      self.Previous();
    });
    dialog.querySelector(".webtween-lightbox-next").addEventListener("click", function() {
      self.Next();
    });
    dialog.addEventListener("click", function(e) {
      if (e.target === dialog || e.target.classList.contains("webtween-lightbox-figure")) self.Close();
    });
    dialog.addEventListener("cancel", function(e) {
      e.preventDefault();
      self.Close();
    });
    dialog.addEventListener("keydown", function(e) {
      if (e.key === "ArrowRight") self.Next();
      if (e.key === "ArrowLeft") self.Previous();
    });
    if (this.Images.length < 2) dialog.classList.add("webtween-lightbox-single");
  }
  Lightbox.prototype._fill = function(i) {
    var img = this.Images[i];
    this._big.src = img.getAttribute("data-full") || img.currentSrc || img.src;
    this._big.alt = img.alt || "";
    this._caption.textContent = img.getAttribute("data-caption") || img.alt || "";
    this._count.textContent = this.Images.length > 1 ? i + 1 + " / " + this.Images.length : "";
    this.Current = i;
  };
  Lightbox.prototype._overThumb = function() {
    var small = this.Images[this.Current].getBoundingClientRect();
    var big = this._big.getBoundingClientRect();
    if (!big.width || !small.width) return null;
    return {
      X: small.left + small.width / 2 - (big.left + big.width / 2),
      Y: small.top + small.height / 2 - (big.top + big.height / 2),
      Scale: small.width / big.width
    };
  };
  Lightbox.prototype.Open = function(i) {
    var self = this, dialog = this._dialog;
    this._fill(i);
    this._savedOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    dialog.showModal();
    this.Opened._fire(i);
    if (this._calm) return;
    TweenService.Create(dialog, new TweenInfo(0), { Transparency: 1 }).Play();
    TweenService.Create(dialog, new TweenInfo(0.3, "Sine", "Out"), { Transparency: 0 }).Play();
    function grow() {
      var from = self._overThumb();
      if (!from) return;
      TweenService.Create(self._big, new TweenInfo(0), from).Play();
      TweenService.Create(self._big, new TweenInfo(0.5, "Quint", "Out"), { X: 0, Y: 0, Scale: 1 }).Play();
    }
    if (this._big.complete && this._big.naturalWidth) grow();
    else this._big.addEventListener("load", grow, { once: true });
  };
  Lightbox.prototype.Close = function() {
    var self = this, dialog = this._dialog;
    if (!dialog.open) return;
    function finish() {
      dialog.close();
      document.documentElement.style.overflow = self._savedOverflow;
      var thumb = self.Images[self.Current];
      if (thumb.tabIndex >= 0) thumb.focus();
      self.Closed._fire();
    }
    if (this._calm) return finish();
    var back = this._overThumb();
    if (back) TweenService.Create(this._big, new TweenInfo(0.35, "Quint", "In"), back).Play();
    var fade = TweenService.Create(dialog, new TweenInfo(0.35, "Sine", "In"), { Transparency: 1 });
    fade.Completed.Connect(function(state) {
      if (state === "Completed") finish();
    });
    fade.Play();
  };
  Lightbox.prototype.Next = function() {
    this._swap((this.Current + 1) % this.Images.length);
  };
  Lightbox.prototype.Previous = function() {
    this._swap((this.Current + this.Images.length - 1) % this.Images.length);
  };
  Lightbox.prototype._swap = function(i) {
    if (this.Images.length < 2) return;
    this._fill(i);
    if (this._calm) return;
    TweenService.Create(this._big, new TweenInfo(0), { X: 0, Y: 0, Scale: 0.96, Transparency: 1 }).Play();
    TweenService.Create(this._big, new TweenInfo(0.35, "Quint", "Out"), { Scale: 1, Transparency: 0 }).Play();
  };
  Lightbox.prototype.Destroy = function() {
    if (this._dialog.open) this._dialog.close();
    this._dialog.remove();
  };
  Lightbox.prototype.open = Lightbox.prototype.Open;
  Lightbox.prototype.close = Lightbox.prototype.Close;
  Lightbox.prototype.next = Lightbox.prototype.Next;
  Lightbox.prototype.previous = Lightbox.prototype.Previous;
  Lightbox.prototype.destroy = Lightbox.prototype.Destroy;
  Lightbox["new"] = function(things, settings) {
    return new Lightbox(things, settings);
  };
  var LIGHTBOX_CSS = [
    ".webtween-lightbox-thumb { cursor: zoom-in; }",
    ".webtween-lightbox {",
    "  width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; padding: 0; border: 0;",
    "  background: rgba(12, 12, 12, 0.94); color: #fff; overflow: hidden;",
    "}",
    ".webtween-lightbox::backdrop { background: transparent; }",
    ".webtween-lightbox-figure { height: 100%; margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 64px 72px; box-sizing: border-box; }",
    ".webtween-lightbox-figure img { max-width: 100%; max-height: calc(100% - 40px); object-fit: contain; }",
    ".webtween-lightbox-figure figcaption { font: 15px/1.4 system-ui, sans-serif; opacity: 0.85; text-align: center; }",
    ".webtween-lightbox button { position: absolute; border: 0; background: rgba(255, 255, 255, 0.12); color: #fff; font: 600 15px system-ui, sans-serif; cursor: pointer; }",
    ".webtween-lightbox button:hover { background: rgba(255, 255, 255, 0.24); }",
    ".webtween-lightbox button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }",
    ".webtween-lightbox-close { top: 16px; right: 16px; min-height: 44px; padding: 0 16px; }",
    ".webtween-lightbox-previous, .webtween-lightbox-next { top: 50%; width: 48px; height: 64px; margin-top: -32px; font-size: 32px !important; }",
    ".webtween-lightbox-previous { left: 12px; }",
    ".webtween-lightbox-next { right: 12px; }",
    ".webtween-lightbox-single .webtween-lightbox-previous, .webtween-lightbox-single .webtween-lightbox-next { display: none; }",
    ".webtween-lightbox-count { position: absolute; top: 16px; left: 20px; margin: 0; font: 15px system-ui, sans-serif; opacity: 0.8; }",
    "@media (max-width: 600px) { .webtween-lightbox-figure { padding: 64px 12px; } .webtween-lightbox-previous, .webtween-lightbox-next { top: auto; bottom: 16px; margin: 0; } }"
  ].join("\n");

  // src/public/buildReferences/CompareSlider.js
  function CompareSlider(thing, settings) {
    if (!(this instanceof CompareSlider)) return new CompareSlider(thing, settings);
    settings = settings || {};
    if (!settings.Before || !settings.After) throw oops("CompareSlider needs a Before and an After picture.");
    addStyles("CompareSlider", COMPARE_CSS);
    this.Changed = new Signal();
    var box = this.Instance = findOne(thing, "CompareSlider");
    box.classList.add("webtween-compare");
    box.style.aspectRatio = String(ratio(settings.AspectRatio || "16:9"));
    box.textContent = "";
    function image(src, alt, className) {
      var img = document.createElement("img");
      img.src = src;
      img.alt = alt;
      img.className = className;
      img.draggable = false;
      return img;
    }
    var beforeLabel = settings.BeforeLabel === void 0 ? "Before" : settings.BeforeLabel;
    var afterLabel = settings.AfterLabel === void 0 ? "After" : settings.AfterLabel;
    this._before = image(settings.Before, beforeLabel, "webtween-compare-before");
    var after = image(settings.After, afterLabel, "webtween-compare-after");
    this._handle = document.createElement("div");
    this._handle.className = "webtween-compare-handle";
    this._handle.innerHTML = '<span class="webtween-compare-knob" aria-hidden="true">\u2039 \u203A</span>';
    box.append(after, this._before, this._handle);
    [[beforeLabel, "left"], [afterLabel, "right"]].forEach(function(label) {
      if (!label[0]) return;
      var tag = document.createElement("span");
      tag.className = "webtween-compare-label webtween-compare-label-" + label[1];
      tag.textContent = label[0];
      tag.setAttribute("aria-hidden", "true");
      box.appendChild(tag);
    });
    var input = this._input = document.createElement("input");
    input.type = "range";
    input.min = 0;
    input.max = 100;
    input.step = 0.1;
    input.className = "webtween-compare-input";
    input.setAttribute("aria-label", settings.Label || "Compare " + beforeLabel + " and " + afterLabel);
    box.appendChild(input);
    var self = this;
    input.addEventListener("input", function() {
      self._stopHint = true;
      self.Set(Number(input.value));
    });
    this.Set(settings.Start === void 0 ? 50 : settings.Start);
    if (settings.Hint !== false && !wantsLessMotion()) {
      this._stopWaiting = whenVisible(box, function() {
        self._hint();
      }, 0.5);
    }
  }
  function ratio(value) {
    if (typeof value === "number") return value;
    var parts = String(value).split(/[:\/]/);
    return parts.length === 2 ? parseFloat(parts[0]) / parseFloat(parts[1]) : parseFloat(value) || 16 / 9;
  }
  CompareSlider.prototype.Set = function(position) {
    var p = Math.max(0, Math.min(100, position));
    this.Position = p;
    this._input.value = p;
    this._input.setAttribute("aria-valuetext", Math.round(p) + "% " + this._before.alt);
    this._before.style.clipPath = "inset(0 " + (100 - p) + "% 0 0)";
    this._handle.style.left = p + "%";
    this.Changed._fire(p);
  };
  CompareSlider.prototype._hint = function() {
    var self = this, start = performance.now(), from = this.Position;
    var steps = [from, from - 12, from + 10, from];
    (function frame(now) {
      if (self._stopHint) return;
      var t = Math.min(1, (now - start) / 1600) * (steps.length - 1);
      var leg = Math.min(steps.length - 2, Math.floor(t));
      var eased = TweenService.GetValue(t - leg, "Sine", "InOut");
      self.Set(steps[leg] + (steps[leg + 1] - steps[leg]) * eased);
      if (t < steps.length - 1) requestAnimationFrame(frame);
    })(start);
  };
  CompareSlider.prototype.Destroy = function() {
    this._stopHint = true;
    if (this._stopWaiting) this._stopWaiting();
    this.Instance.textContent = "";
  };
  CompareSlider.prototype.set = CompareSlider.prototype.Set;
  CompareSlider.prototype.destroy = CompareSlider.prototype.Destroy;
  CompareSlider["new"] = function(thing, settings) {
    return new CompareSlider(thing, settings);
  };
  var COMPARE_CSS = [
    ".webtween-compare { position: relative; overflow: hidden; user-select: none; background: #222; }",
    ".webtween-compare img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; }",
    ".webtween-compare-handle { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: #fff; pointer-events: none; }",
    ".webtween-compare-knob {",
    "  position: absolute; top: 50%; left: 50%; width: 44px; height: 44px; margin: -22px 0 0 -22px;",
    "  display: grid; place-items: center; border-radius: 50%; background: #fff; color: #161616;",
    "  font: 700 16px/1 system-ui, sans-serif; letter-spacing: 2px;",
    "}",
    ".webtween-compare-label {",
    "  position: absolute; top: 12px; padding: 4px 10px; background: rgba(0, 0, 0, 0.55); color: #fff;",
    "  font: 600 13px/1.4 system-ui, sans-serif; pointer-events: none;",
    "}",
    ".webtween-compare-label-left { left: 12px; }",
    ".webtween-compare-label-right { right: 12px; }",
    ".webtween-compare-input {",
    "  position: absolute; inset: 0; width: 100%; height: 100%; margin: 0;",
    "  opacity: 0; cursor: ew-resize; touch-action: pan-y; /* phones can still scroll the page up and down */",
    "}",
    ".webtween-compare:has(.webtween-compare-input:focus-visible) .webtween-compare-knob { outline: 3px solid #fff; outline-offset: 3px; }"
  ].join("\n");

  // src/public/buildReferences/Hotspots.js
  var made2 = 0;
  function Hotspots(thing, spots, settings) {
    if (!(this instanceof Hotspots)) return new Hotspots(thing, spots, settings);
    if (!Array.isArray(spots) || !spots.length) {
      throw oops('Hotspots needs a list of spots, like [{ X: 30, Y: 40, Title: "Aluminium body" }].');
    }
    addStyles("Hotspots", HOTSPOTS_CSS);
    this.Opened = new Signal();
    this.Current = -1;
    this._calm = wantsLessMotion();
    var box = this.Instance = findOne(thing, "Hotspots");
    box.classList.add("webtween-hotspots");
    if (getComputedStyle(box).position === "static") box.style.position = "relative";
    var self = this, id = "webtween-hotspots-" + ++made2;
    this.Spots = spots.map(function(spot, i) {
      if (typeof spot.X !== "number" || typeof spot.Y !== "number") {
        throw oops("Hotspot number " + (i + 1) + " needs an X and a Y, in percent.");
      }
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "webtween-spot";
      dot.style.left = spot.X + "%";
      dot.style.top = spot.Y + "%";
      dot.setAttribute("aria-expanded", "false");
      dot.setAttribute("aria-label", spot.Title || "Detail " + (i + 1));
      dot.setAttribute("aria-controls", id + "-" + i);
      var card = document.createElement("div");
      card.className = "webtween-spot-card";
      card.id = id + "-" + i;
      card.hidden = true;
      if (spot.Title) {
        var title = document.createElement("strong");
        title.textContent = spot.Title;
        card.appendChild(title);
      }
      if (spot.Text) {
        var text = document.createElement("p");
        text.textContent = spot.Text;
        card.appendChild(text);
      }
      var left = spot.X > 55, up = spot.Y > 60;
      card.style[left ? "right" : "left"] = (left ? 100 - spot.X : spot.X) + "%";
      card.style[up ? "bottom" : "top"] = (up ? 100 - spot.Y : spot.Y) + "%";
      card.style.margin = up ? "0 0 26px" : "26px 0 0";
      card.style.transformOrigin = (up ? "bottom " : "top ") + (left ? "right" : "left");
      dot.addEventListener("click", function() {
        if (self.Current === i) self.Close();
        else self.Open(i);
      });
      box.append(dot, card);
      return { dot, card };
    });
    this._onOutside = function(e) {
      if (!box.contains(e.target)) self.Close();
    };
    this._onKey = function(e) {
      if (e.key === "Escape" && self.Current >= 0) {
        var dot = self.Spots[self.Current].dot;
        self.Close();
        dot.focus();
      }
    };
    document.addEventListener("pointerdown", this._onOutside);
    document.addEventListener("keydown", this._onKey);
  }
  Hotspots.prototype.Open = function(i) {
    this.Close();
    var spot = this.Spots[i];
    spot.card.hidden = false;
    spot.dot.setAttribute("aria-expanded", "true");
    spot.dot.classList.add("webtween-spot-open");
    this.Current = i;
    this.Opened._fire(i);
    if (this._calm) return;
    TweenService.Create(spot.card, new TweenInfo(0), { Scale: 0.92, Transparency: 1 }).Play();
    TweenService.Create(spot.card, new TweenInfo(0.3, "Back", "Out"), { Scale: 1, Transparency: 0 }).Play();
  };
  Hotspots.prototype.Close = function() {
    if (this.Current < 0) return;
    var spot = this.Spots[this.Current];
    spot.card.hidden = true;
    spot.dot.setAttribute("aria-expanded", "false");
    spot.dot.classList.remove("webtween-spot-open");
    this.Current = -1;
    this.Opened._fire(-1);
  };
  Hotspots.prototype.Destroy = function() {
    document.removeEventListener("pointerdown", this._onOutside);
    document.removeEventListener("keydown", this._onKey);
    this.Spots.forEach(function(spot) {
      spot.dot.remove();
      spot.card.remove();
    });
  };
  Hotspots.prototype.open = Hotspots.prototype.Open;
  Hotspots.prototype.close = Hotspots.prototype.Close;
  Hotspots.prototype.destroy = Hotspots.prototype.Destroy;
  Hotspots["new"] = function(thing, spots, settings) {
    return new Hotspots(thing, spots, settings);
  };
  var HOTSPOTS_CSS = [
    ".webtween-spot {",
    "  position: absolute; z-index: 2; width: 28px; height: 28px; margin: -14px 0 0 -14px; padding: 0;",
    "  border: 3px solid #fff; border-radius: 50%; background: rgba(22, 22, 22, 0.55); cursor: pointer;",
    "}",
    ".webtween-spot::after {",
    '  content: ""; position: absolute; inset: -3px; border-radius: 50%; border: 2px solid #fff;',
    "  animation: webtween-pulse 2s ease-out infinite; pointer-events: none;",
    "}",
    ".webtween-spot-open { background: #fff; }",
    ".webtween-spot:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }",
    "@keyframes webtween-pulse { from { transform: scale(1); opacity: 0.9; } to { transform: scale(2.2); opacity: 0; } }",
    "@media (prefers-reduced-motion: reduce) { .webtween-spot::after { animation: none; } }",
    ".webtween-spot-card {",
    "  position: absolute; z-index: 3; width: max-content; max-width: min(260px, 70%); padding: 12px 14px;",
    "  background: #fff; color: #161616; font: 14px/1.45 system-ui, sans-serif;",
    "  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); /* it floats over the picture */",
    "}",
    ".webtween-spot-card[hidden] { display: none; }",
    ".webtween-spot-card strong { display: block; margin-bottom: 2px; }",
    ".webtween-spot-card p { margin: 0; }"
  ].join("\n");

  // src/public/buildReferences/Spin360.js
  function Spin360(frames, settings) {
    if (!(this instanceof Spin360)) return new Spin360(frames, settings);
    if (!Array.isArray(frames) || frames.length < 2) {
      throw oops('Spin360 needs a list of pictures taken all the way round, like ["1.jpg", "2.jpg", ...].');
    }
    settings = settings || {};
    addStyles("Spin360", SPIN_CSS);
    this.Frames = frames;
    this.Sensitivity = settings.Sensitivity === void 0 ? 8 : settings.Sensitivity;
    this.AutoSpin = settings.AutoSpin !== false && !wantsLessMotion();
    this.Changed = new Signal();
    this.Current = 0;
    var box = this.Instance = document.createElement("div");
    box.className = "webtween-spin";
    box.style.aspectRatio = String(settings.AspectRatio ? ratioOf(settings.AspectRatio) : 1);
    box.tabIndex = 0;
    box.setAttribute("role", "slider");
    box.setAttribute("aria-label", settings.Label || "Turn the product");
    box.setAttribute("aria-valuemin", "0");
    box.setAttribute("aria-valuemax", String(frames.length - 1));
    this._img = document.createElement("img");
    this._img.alt = settings.Alt || "";
    this._img.draggable = false;
    this._hint = document.createElement("span");
    this._hint.className = "webtween-spin-hint";
    this._hint.setAttribute("aria-hidden", "true");
    this._hint.textContent = settings.HintText || "Drag to turn";
    box.append(this._img, this._hint);
    if (settings.Parent) findElement(settings.Parent, "Spin360").appendChild(box);
    this._loaded = frames.map(function(src) {
      var img = new Image();
      img.src = src;
      return img;
    });
    this.Show(0);
    var self = this;
    this._drag = null;
    box.addEventListener("pointerdown", function(e) {
      self._touched();
      try {
        box.setPointerCapture(e.pointerId);
      } catch (err) {
      }
      self._drag = { x: e.clientX, frame: self.Current, lastX: e.clientX, lastTime: e.timeStamp, speed: 0 };
      box.classList.add("webtween-spin-dragging");
    });
    box.addEventListener("pointermove", function(e) {
      var d = self._drag;
      if (!d) return;
      var seconds2 = Math.max(1e-3, (e.timeStamp - d.lastTime) / 1e3);
      d.speed = -(e.clientX - d.lastX) / self.Sensitivity / seconds2;
      d.lastX = e.clientX;
      d.lastTime = e.timeStamp;
      self.Show(d.frame - Math.round((e.clientX - d.x) / self.Sensitivity));
    });
    function letGo() {
      if (!self._drag) return;
      var speed = self._drag.speed;
      self._drag = null;
      box.classList.remove("webtween-spin-dragging");
      if (!wantsLessMotion() && Math.abs(speed) > 4) self._glide(speed);
    }
    box.addEventListener("pointerup", letGo);
    box.addEventListener("pointercancel", letGo);
    box.addEventListener("keydown", function(e) {
      var step = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: 1, ArrowDown: -1 }[e.key];
      if (e.key === "Home") step = -self.Current;
      if (step === void 0) return;
      e.preventDefault();
      self._touched();
      self.Show(self.Current + step);
    });
    if (this.AutoSpin) {
      this._autoTimer = setInterval(function() {
        if (!document.hidden) self.Show(self.Current + 1);
      }, 90);
    }
  }
  function ratioOf(value) {
    if (typeof value === "number") return value;
    var parts = String(value).split(/[:\/]/);
    return parts.length === 2 ? parseFloat(parts[0]) / parseFloat(parts[1]) : parseFloat(value) || 1;
  }
  Spin360.prototype._touched = function() {
    clearInterval(this._autoTimer);
    cancelAnimationFrame(this._glideRequest);
    this._hint.classList.add("webtween-spin-hint-gone");
  };
  Spin360.prototype._glide = function(speed) {
    var self = this, position = this.Current, last = performance.now();
    (function frame(now) {
      var seconds2 = (now - last) / 1e3;
      last = now;
      speed *= Math.pow(0.04, seconds2);
      position += speed * seconds2;
      self.Show(Math.round(position));
      if (Math.abs(speed) > 1) self._glideRequest = requestAnimationFrame(frame);
    })(last);
  };
  Spin360.prototype.Show = function(n) {
    var count = this.Frames.length;
    var i = (Math.round(n) % count + count) % count;
    if (i === this.Current && this._img.getAttribute("src")) return;
    this.Current = i;
    this._img.src = this.Frames[i];
    this.Instance.setAttribute("aria-valuenow", String(i));
    this.Instance.setAttribute("aria-valuetext", Math.round(i / count * 360) + " degrees");
    this.Changed._fire(i);
  };
  Spin360.prototype.Destroy = function() {
    this._touched();
    this.Instance.remove();
  };
  Spin360.prototype.show = Spin360.prototype.Show;
  Spin360.prototype.destroy = Spin360.prototype.Destroy;
  Spin360["new"] = function(frames, settings) {
    return new Spin360(frames, settings);
  };
  var SPIN_CSS = [
    ".webtween-spin { position: relative; cursor: grab; touch-action: pan-y; user-select: none; }",
    ".webtween-spin-dragging { cursor: grabbing; }",
    ".webtween-spin img { display: block; width: 100%; height: 100%; object-fit: contain; pointer-events: none; }",
    ".webtween-spin:focus-visible { outline: 3px solid currentColor; outline-offset: 4px; }",
    ".webtween-spin-hint {",
    "  position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%);",
    "  padding: 6px 12px; background: rgba(0, 0, 0, 0.6); color: #fff;",
    "  font: 600 13px/1.4 system-ui, sans-serif; pointer-events: none; transition: opacity 0.4s;",
    "}",
    ".webtween-spin-hint-gone { opacity: 0; }"
  ].join("\n");

  // src/index.js
  var WebTween = {
    // animation
    TweenService,
    TweenInfo,
    Enum,
    Color3,
    Tween,
    Timeline,
    ScrollableFrame,
    Reveal,
    Parallax,
    TextReveal,
    TextRotator,
    CountUp,
    // elements
    Card,
    ImageCard,
    Countdown,
    OpeningHours,
    AddToCalendar,
    // build references
    Carousel,
    Slideshow,
    Marquee,
    Tabs,
    Accordion,
    Lightbox,
    CompareSlider,
    Hotspots,
    Spin360
  };
  window.WebTween = WebTween;
  Object.keys(WebTween).forEach(function(name) {
    if (name !== "Tween" && window[name] === void 0) window[name] = WebTween[name];
  });
})();
