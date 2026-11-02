/* ------------------------------------------------------------------ */
/*  AddToCalendar — a button that puts your event in their calendar     */
/* ------------------------------------------------------------------ */

import { oops } from "../../hidden/helpers.js";
import { addStyles } from "../../hidden/pageStyles.js";
import { findOne, wantsLessMotion } from "../../hidden/targets.js";
import { momentFrom } from "../../hidden/zones.js";
import { TweenInfo } from "../animation/TweenInfo.js";
import { TweenService } from "../animation/TweenService.js";

/*
  new AddToCalendar("#add", {
    Title: "Solenne Summer Night",
    Start: "2026-06-12T19:00",
    End: "2026-06-12T23:30",
    TimeZone: "Europe/Rome",           // where the event happens
    Location: "Hotel Solenne, 1 Hill Road",
    Description: "Dinner on the lawn, then music until late.",
  })

  Turns the element into a button with a small menu: Google Calendar, Outlook,
  and "Apple / other", which downloads a calendar file most apps can open.
  Times are written as they'd read on a clock where the event is, and TimeZone
  makes them right for visitors anywhere.
*/
function AddToCalendar(thing, settings) {
  if (!(this instanceof AddToCalendar)) return new AddToCalendar(thing, settings);
  settings = settings || {};
  if (!settings.Title || !settings.Start) throw oops("AddToCalendar needs at least a Title and a Start.");
  addStyles("AddToCalendar", CALENDAR_CSS);

  // ===== the event =====
  this.Title = settings.Title;
  this.Start = momentFrom(settings.Start, settings.TimeZone);
  this.End = settings.End ? momentFrom(settings.End, settings.TimeZone) : new Date(this.Start.getTime() + 3600000);
  this.Location = settings.Location || "";
  this.Description = settings.Description || "";
  if (this.End <= this.Start) throw oops("AddToCalendar's End needs to be after its Start.");

  var box = (this.Instance = findOne(thing, "AddToCalendar"));
  box.classList.add("webtween-calendar");
  box.textContent = "";

  var button = (this.Button = document.createElement("button"));
  button.type = "button";
  button.className = "webtween-calendar-button";
  button.textContent = settings.Text || "Add to calendar";
  button.setAttribute("aria-haspopup", "true");
  button.setAttribute("aria-expanded", "false");

  var menu = (this._menu = document.createElement("div"));
  menu.className = "webtween-calendar-menu";
  menu.setAttribute("role", "menu");
  menu.hidden = true;
  var self = this;
  [
    ["Google Calendar", this.GoogleLink()],
    ["Outlook", this.OutlookLink()],
    ["Apple / other (.ics)", null],
  ].forEach(function (choice) {
    var link = document.createElement("a");
    link.setAttribute("role", "menuitem");
    link.textContent = choice[0];
    if (choice[1]) {
      link.href = choice[1];
      link.target = "_blank";
      link.rel = "noopener";
    } else {
      link.href = "#";
      link.addEventListener("click", function (e) {
        e.preventDefault();
        self.Download();
      });
    }
    link.addEventListener("click", function () { self.Close(); });
    menu.appendChild(link);
  });
  box.append(button, menu);

  button.addEventListener("click", function () {
    if (menu.hidden) self.Open();
    else self.Close();
  });
  this._onOutside = function (e) {
    if (!box.contains(e.target)) self.Close();
  };
  this._onKey = function (e) {
    if (e.key === "Escape") {
      self.Close();
      button.focus();
    }
    var items = Array.prototype.slice.call(menu.children);
    var i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus();
    }
  };
}

// 2026-06-12T17:00:00Z → "20260612T170000Z", the way calendars want it
function stamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** A link that opens Google Calendar with the event filled in. */
AddToCalendar.prototype.GoogleLink = function () {
  return "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=" + encodeURIComponent(this.Title) +
    "&dates=" + stamp(this.Start) + "/" + stamp(this.End) +
    "&details=" + encodeURIComponent(this.Description) +
    "&location=" + encodeURIComponent(this.Location);
};

/** A link that opens Outlook on the web with the event filled in. */
AddToCalendar.prototype.OutlookLink = function () {
  return "https://outlook.live.com/calendar/0/action/compose?rru=addevent" +
    "&subject=" + encodeURIComponent(this.Title) +
    "&startdt=" + encodeURIComponent(this.Start.toISOString()) +
    "&enddt=" + encodeURIComponent(this.End.toISOString()) +
    "&body=" + encodeURIComponent(this.Description) +
    "&location=" + encodeURIComponent(this.Location);
};

/** Download a calendar (.ics) file, which Apple Calendar and most other apps open. */
AddToCalendar.prototype.Download = function () {
  function clean(text) {
    return String(text).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }
  var file = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//WebTween//AddToCalendar//EN", "BEGIN:VEVENT",
    "UID:" + stamp(this.Start) + "-" + Math.random().toString(36).slice(2) + "@webtween",
    "DTSTAMP:" + stamp(new Date()),
    "DTSTART:" + stamp(this.Start),
    "DTEND:" + stamp(this.End),
    "SUMMARY:" + clean(this.Title),
    "DESCRIPTION:" + clean(this.Description),
    "LOCATION:" + clean(this.Location),
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  var link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([file], { type: "text/calendar" }));
  link.download = this.Title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() + ".ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
};

/** Open the menu. */
AddToCalendar.prototype.Open = function () {
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

/** Close the menu. */
AddToCalendar.prototype.Close = function () {
  this._menu.hidden = true;
  this.Button.setAttribute("aria-expanded", "false");
  document.removeEventListener("pointerdown", this._onOutside);
  this.Instance.removeEventListener("keydown", this._onKey);
};

AddToCalendar.prototype.Destroy = function () {
  this.Close();
  this.Instance.textContent = "";
};
AddToCalendar.prototype.open = AddToCalendar.prototype.Open;
AddToCalendar.prototype.close = AddToCalendar.prototype.Close;
AddToCalendar.prototype.download = AddToCalendar.prototype.Download;
AddToCalendar.prototype.destroy = AddToCalendar.prototype.Destroy;
AddToCalendar["new"] = function (thing, settings) {
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
  ".webtween-calendar-menu a:hover, .webtween-calendar-menu a:focus-visible { background: #f0efea; outline: none; }",
].join("\n");

export { AddToCalendar };
