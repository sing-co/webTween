/* ------------------------------------------------------------------ */
/*  OpeningHours — "Open now · closes at 22:00", always up to date      */
/* ------------------------------------------------------------------ */

import { oops } from "../../hidden/helpers.js";
import { addStyles } from "../../hidden/pageStyles.js";
import { Signal } from "../../hidden/signal.js";
import { findOne } from "../../hidden/targets.js";
import { clockIn } from "../../hidden/zones.js";

/*
  new OpeningHours("#hours", {
    TimeZone: "Europe/Rome",
    Hours: {
      Monday: "closed",
      Tuesday: "12:00-15:00, 19:00-23:00",
      Friday: "19:00-02:00",          // past midnight is fine
      ...
    },
    ShowTable: true,
  })

  Shows whether it's open right now, in the place's own time zone (so it's right
  for visitors anywhere), and when it next opens or closes. Change the hours in one
  place and the whole thing follows. Days you leave out count as closed.
*/
var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function OpeningHours(thing, settings) {
  if (!(this instanceof OpeningHours)) return new OpeningHours(thing, settings);
  settings = settings || {};
  if (!settings.Hours) throw oops('OpeningHours needs Hours, like { Monday: "12:00-22:00", Tuesday: "closed" }.');
  addStyles("OpeningHours", HOURS_CSS);

  // ===== settings =====
  this.TimeZone = settings.TimeZone; // where the place is (leave out to use the visitor's clock)
  this.Clock = settings.Clock === 12 ? 12 : 24; // 24 → "22:00", 12 → "10 pm"
  this.ShowTable = !!settings.ShowTable; // also list every day's hours
  this.StartWeek = settings.StartWeek === "Sunday" ? 0 : 1; // the table's first day
  this.Hours = readHours(settings.Hours);
  this.Changed = new Signal(); // fires with true / false when it opens or closes

  var box = (this.Instance = findOne(thing, "OpeningHours"));
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
  this._timer = setInterval(this._update.bind(this), 30000);
}

// { Mon: "12:00-15:00, 19:00-23:00" } → for each day 0-6, a list of { from, to } in minutes
function readHours(hours) {
  var week = [[], [], [], [], [], [], []];
  var written = ["", "", "", "", "", "", ""];
  Object.keys(hours).forEach(function (name) {
    var day = DAYS.findIndex(function (d) {
      return d.slice(0, 3).toLowerCase() === name.slice(0, 3).toLowerCase();
    });
    if (day < 0) throw oops('"' + name + "\" isn't a day. Use Monday, Tuesday... (or Mon, Tue...).");
    var text = String(hours[name] || "").trim();
    written[day] = text;
    if (!text || /^closed$/i.test(text)) return;
    text.split(",").forEach(function (range) {
      var m = /^\s*(\d{1,2})(?::(\d\d))?\s*[-–]\s*(\d{1,2})(?::(\d\d))?\s*$/.exec(range);
      if (!m) throw oops('Couldn\'t read the hours "' + range.trim() + '" for ' + DAYS[day] + '. Write them like "12:00-22:00".');
      var from = +m[1] * 60 + +(m[2] || 0);
      var to = +m[3] * 60 + +(m[4] || 0);
      if (to <= from) to += 1440; // closes after midnight
      week[day].push({ from: from, to: to });
    });
  });
  return { week: week, written: written };
}

// Is it open at this minute of this day? Counts last night's hours that run past midnight.
OpeningHours.prototype._status = function (day, minute) {
  var week = this.Hours.week;
  var yesterday = (day + 6) % 7;
  var open = null;
  week[day].forEach(function (r) {
    if (minute >= r.from && minute < r.to) open = { closesDay: r.to >= 1440 ? (day + 1) % 7 : day, closesAt: r.to % 1440 };
  });
  week[yesterday].forEach(function (r) {
    if (r.to > 1440 && minute < r.to - 1440) open = { closesDay: day, closesAt: r.to - 1440 };
  });
  if (open) return open;

  // closed: look up to a week ahead for the next opening
  for (var ahead = 0; ahead < 8; ahead++) {
    var d = (day + ahead) % 7;
    var next = week[d].filter(function (r) { return ahead > 0 || r.from > minute; })[0];
    if (next) return { opensDay: d, opensAt: next.from, ahead: ahead };
  }
  return { never: true };
};

OpeningHours.prototype._time = function (minutes) {
  var h = Math.floor(minutes / 60) % 24,
    m = minutes % 60;
  if (this.Clock === 24) return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  var suffix = h < 12 ? " am" : " pm";
  h = h % 12 || 12;
  return h + (m ? ":" + (m < 10 ? "0" : "") + m : "") + suffix;
};

OpeningHours.prototype._update = function () {
  var clock = clockIn(new Date(), this.TimeZone);
  var minute = clock.hour * 60 + clock.minute;
  var s = this._status(clock.weekday, minute);
  var isOpen = s.closesAt !== undefined;
  var text;

  if (isOpen) {
    var minutesLeft = (s.closesAt - minute + 1440) % 1440;
    text = (minutesLeft <= 60 ? "Closing soon" : "Open now") + " · closes at " + this._time(s.closesAt);
  } else if (s.never) {
    text = "Closed";
  } else {
    var when = s.ahead === 0 ? "" : s.ahead === 1 ? "tomorrow " : DAYS[s.opensDay] + " ";
    text = "Closed · opens " + when + "at " + this._time(s.opensAt);
  }
  this._now.textContent = text;
  this._now.setAttribute("data-open", isOpen);
  this.IsOpen = isOpen;
  if (this._wasOpen !== undefined && this._wasOpen !== isOpen) this.Changed._fire(isOpen);
  this._wasOpen = isOpen;

  if (this._table && this._today !== clock.weekday) this._drawTable(clock.weekday);
};

OpeningHours.prototype._drawTable = function (today) {
  this._today = today;
  var table = this._table,
    self = this;
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
    ranges.forEach(function (r, n) {
      var range = document.createElement("span"); // each range stays on one line
      range.textContent = self._time(r.from) + "–" + self._time(r.to % 1440) + (n < ranges.length - 1 ? "," : "");
      hours.appendChild(range);
    });
    row.append(name, hours);
    table.appendChild(row);
  }
};

/** Stop updating. */
OpeningHours.prototype.Destroy = function () {
  clearInterval(this._timer);
};
OpeningHours.prototype.destroy = OpeningHours.prototype.Destroy;
OpeningHours["new"] = function (thing, settings) {
  return new OpeningHours(thing, settings);
};

var HOURS_CSS = [
  ".webtween-hours-now { display: flex; align-items: center; gap: 0.5em; margin: 0; font-weight: 600; }",
  ".webtween-hours-now::before { content: \"\"; width: 0.6em; height: 0.6em; border-radius: 50%; background: #c0392b; flex: none; }",
  ".webtween-hours-now[data-open=\"true\"]::before { background: #2e9e5b; }",
  ".webtween-hours-table { margin: 1em 0 0; }",
  ".webtween-hours-table > div { display: flex; justify-content: space-between; gap: 2em; padding: 0.25em 0; }",
  ".webtween-hours-table dd { margin: 0; display: flex; flex-wrap: wrap; justify-content: flex-end; column-gap: 0.4em; text-align: right; }",
  ".webtween-hours-table dd span { white-space: nowrap; }",
  ".webtween-hours-today { font-weight: 700; }",
].join("\n");

export { OpeningHours };
