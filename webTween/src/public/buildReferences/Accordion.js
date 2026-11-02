/* ------------------------------------------------------------------ */
/*  Accordion — questions that open smoothly to show their answers     */
/* ------------------------------------------------------------------ */

import { addStyles } from "../../hidden/pageStyles.js";
import { Signal } from "../../hidden/signal.js";
import { findAll, wantsLessMotion } from "../../hidden/targets.js";
import { TweenInfo } from "../animation/TweenInfo.js";
import { TweenService } from "../animation/TweenService.js";

/*
  <div id="faq">
    <details>
      <summary>Can I bring my dog?</summary>
      <p>Yes, on the terrace.</p>
    </details>
    ...
  </div>
  new Accordion("#faq", { OnlyOne: true })

  Uses the browser's own <details> and <summary>, so it works with the keyboard and
  screen readers, and still opens and closes without the script. WebTween just
  makes the opening and closing glide instead of jump.
*/
function Accordion(things, settings) {
  if (!(this instanceof Accordion)) return new Accordion(things, settings);
  settings = settings || {};
  addStyles("Accordion", ACCORDION_CSS);

  // ===== settings (all optional) =====
  this.OnlyOne = !!settings.OnlyOne; // opening one closes the others
  this.Time = settings.Time === undefined ? 0.4 : settings.Time;
  this.Toggled = new Signal(); // fires with (details, isOpen)

  // every <details> in what you gave (or the <details> themselves)
  var items = [];
  findAll(things, "Accordion").forEach(function (el) {
    if (el.tagName === "DETAILS") items.push(el);
    else items = items.concat(Array.prototype.slice.call(el.querySelectorAll("details")));
  });
  this.Items = items;

  var self = this;
  this._calm = wantsLessMotion();
  items.forEach(function (details) {
    details.classList.add("webtween-accordion");
    // everything after the <summary> goes in one box that can shrink to nothing
    var body = document.createElement("div");
    body.className = "webtween-accordion-body";
    Array.prototype.slice.call(details.childNodes).forEach(function (child) {
      if (child.nodeName !== "SUMMARY") body.appendChild(child);
    });
    details.appendChild(body);
    details._webtweenBody = body;

    var summary = details.querySelector("summary");
    if (!summary) return;
    summary.addEventListener("click", function (e) {
      e.preventDefault(); // we open and close it ourselves, smoothly
      if (details._webtweenClosing || !details.open) self.Open(details);
      else self.Close(details);
    });
  });
}

/** Open one (a <details>, or its number: the first is 0). */
Accordion.prototype.Open = function (which) {
  var details = typeof which === "number" ? this.Items[which] : which;
  var body = details._webtweenBody,
    self = this;
  if (this.OnlyOne) {
    this.Items.forEach(function (other) {
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
  grow.Completed.Connect(function (state) {
    if (state === "Completed") body.style.height = ""; // back to its natural height
  });
  grow.Play();
};

/** Close one (a <details>, or its number). */
Accordion.prototype.Close = function (which) {
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
  shrink.Completed.Connect(function (state) {
    if (state !== "Completed") return; // opened again halfway through
    details._webtweenClosing = false;
    details.open = false;
    body.style.height = "";
  });
  shrink.Play();
};

/** Open or close one. */
Accordion.prototype.Toggle = function (which) {
  var details = typeof which === "number" ? this.Items[which] : which;
  if (details.open && !details._webtweenClosing) this.Close(details);
  else this.Open(details);
};
Accordion.prototype.open = Accordion.prototype.Open;
Accordion.prototype.close = Accordion.prototype.Close;
Accordion.prototype.toggle = Accordion.prototype.Toggle;
Accordion["new"] = function (things, settings) {
  return new Accordion(things, settings);
};

var ACCORDION_CSS = [
  ".webtween-accordion-body { overflow: hidden; }",
  ".webtween-accordion > summary { cursor: pointer; }",
].join("\n");

export { Accordion };
