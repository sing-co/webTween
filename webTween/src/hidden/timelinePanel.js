/* ------------------------------------------------------------------ */
/*  DisplayTimeline: a table in the console, or a panel on the page    */
/* ------------------------------------------------------------------ */

import { addStyles } from "./pageStyles.js";

function seconds(n) {
  return n.toFixed(2) + "s";
}

// ===== in the console =====

function logTimeline(timeline) {
  console.log('WebTween: timeline "' + timeline.Name + '" lasts ' + seconds(timeline.Duration));
  console.table(
    timeline.GetSchedule().map(function (row) {
      return { Name: row.Name, Kind: row.Kind, Starts: seconds(row.Starts), Ends: seconds(row.Ends), Length: seconds(row.Length) };
    }),
  );
}

// ===== on the page =====

var openPanel = null; // only one panel at a time

function showTimelinePanel(timeline) {
  if (openPanel) openPanel.close();
  addStyles("TimelinePanel", PANEL_CSS);

  var rows = timeline.GetSchedule();
  var duration = Math.max(timeline.Duration, 0.001);

  var panel = make("section", "webtween-timeline");
  panel.setAttribute("aria-label", "Timeline: " + timeline.Name);

  // the bar along the top: name, buttons, speed, time, close
  var top = make("div", "wtl-top", panel);
  make("strong", "wtl-name", top).textContent = timeline.Name;
  var playButton = button("Play", top);
  var restartButton = button("Restart", top);
  var speedLabel = make("label", "wtl-speed", top);
  speedLabel.textContent = "Speed ";
  var speed = make("select", "", speedLabel);
  [0.1, 0.25, 0.5, 1, 2].forEach(function (s) {
    var option = make("option", "", speed);
    option.value = s;
    option.textContent = s + "×";
    if (s === timeline.Speed) option.selected = true;
  });
  var clock = make("span", "wtl-clock", top);
  var closeButton = button("Close", top);
  closeButton.classList.add("wtl-close");

  // names on the left, bars on the right
  var body = make("div", "wtl-body", panel);
  var names = make("div", "wtl-names", body);
  make("div", "wtl-ruler-space", names);
  var lanes = make("div", "wtl-lanes", body);
  var track = make("div", "wtl-track", lanes); // everything inside lines up with the time

  // the ruler, with a tick every half second (or whatever fits)
  var ruler = make("div", "wtl-ruler", track);
  var step = duration <= 2 ? 0.25 : duration <= 5 ? 0.5 : duration <= 12 ? 1 : duration <= 30 ? 2 : 5;
  for (var t = 0; t <= duration + 0.0001; t += step) {
    var tick = make("span", "wtl-tick", ruler);
    tick.style.left = (t / duration) * 100 + "%";
    tick.textContent = +t.toFixed(2) + "s";
  }

  rows.forEach(function (row) {
    var name = make("div", "wtl-row-name", names);
    name.textContent = row.Name;
    name.title = row.Name;
    var lane = make("div", "wtl-lane", track);
    var mark = make("div", row.Kind === "function" ? "wtl-mark" : "wtl-span wtl-" + row.Kind, lane);
    mark.style.left = (row.Starts / duration) * 100 + "%";
    if (row.Kind !== "function") mark.style.width = (row.Length / duration) * 100 + "%";
    mark.title =
      row.Name + "\n" +
      (row.Kind === "function"
        ? "Runs at " + seconds(row.Starts)
        : "Starts " + seconds(row.Starts) + " · ends " + seconds(row.Ends) + " · lasts " + seconds(row.Length));
  });

  var playhead = make("div", "wtl-playhead", track);

  // ===== controls =====
  playButton.addEventListener("click", function () {
    if (timeline.PlaybackState === "Playing") timeline.Pause();
    else timeline.Play();
  });
  restartButton.addEventListener("click", function () {
    timeline.Restart();
  });
  speed.addEventListener("change", function () {
    timeline.Speed = Number(speed.value);
  });

  // drag anywhere on the bars to scrub through the real page
  function scrubTo(e) {
    var box = track.getBoundingClientRect();
    var fraction = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    timeline.Seek(fraction * timeline.Duration + timeline._cycle * timeline.Duration * (timeline.Reverses ? 2 : 1));
  }
  var dragging = false;
  lanes.addEventListener("pointerdown", function (e) {
    dragging = true;
    timeline.Pause();
    try {
      lanes.setPointerCapture(e.pointerId); // keep getting moves even off the panel
    } catch (err) {}
    lanes.classList.add("wtl-scrubbing");
    scrubTo(e);
  });
  lanes.addEventListener("pointermove", function (e) {
    if (dragging) scrubTo(e);
  });
  function stopDragging() {
    dragging = false;
    lanes.classList.remove("wtl-scrubbing");
  }
  lanes.addEventListener("pointerup", stopDragging);
  lanes.addEventListener("pointercancel", stopDragging);

  // keep the playhead, the clock and the play button up to date
  var frameRequest;
  function update() {
    var local = Math.max(0, timeline._local);
    playhead.style.left = (local / duration) * 100 + "%";
    clock.textContent = seconds(local) + " / " + seconds(timeline.Duration);
    playButton.textContent = timeline.PlaybackState === "Playing" ? "Pause" : "Play";
    frameRequest = requestAnimationFrame(update);
  }
  update();

  // ===== open and close =====
  document.body.appendChild(panel);
  var savedPadding = document.body.style.paddingBottom;
  document.body.style.paddingBottom = panel.offsetHeight + "px"; // so it doesn't cover the end of the page

  var handle = {
    close: function () {
      cancelAnimationFrame(frameRequest);
      panel.remove();
      document.body.style.paddingBottom = savedPadding;
      if (openPanel === handle) openPanel = null;
      timeline._panel = null;
    },
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
  ".wtl-scrubbing .wtl-playhead { width: 3px; }",
].join("\n");

export { logTimeline, showTimelinePanel };
