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
    var ratio = value;
    if (typeof value === "string") {
      var parts = value.split(/[:\/]/);
      ratio = parts.length === 2 ? parseFloat(parts[0]) / parseFloat(parts[1]) : parseFloat(value);
    }
    if (typeof ratio !== "number" || !isFinite(ratio) || ratio <= 0) {
      throw oops('"' + value + `" isn't an aspect ratio. Try something like 1, 1.5, "16:9" or "3/4".`);
    }
    return ratio;
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
    var ratio = settings.AspectRatio;
    this.Slides = Array.prototype.map.call(slides, function(slide) {
      if (typeof slide === "string") return new ImageCard({ Image: slide, AspectRatio: ratio }).Instance;
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
    // elements
    Card,
    ImageCard,
    // build references
    Carousel,
    Slideshow
  };
  window.WebTween = WebTween;
  [
    "TweenService",
    "TweenInfo",
    "Enum",
    "Color3",
    "Timeline",
    "ScrollableFrame",
    "Reveal",
    "Parallax",
    "Card",
    "ImageCard",
    "Carousel",
    "Slideshow"
  ].forEach(function(name) {
    if (window[name] === void 0) window[name] = WebTween[name];
  });
})();
