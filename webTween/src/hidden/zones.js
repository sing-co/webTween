/* ------------------------------------------------------------------ */
/*  Dates and times in a particular place ("Europe/Rome")              */
/* ------------------------------------------------------------------ */

import { oops } from "./helpers.js";

// The date and time on a clock in that time zone (or the visitor's own, if none).
// weekday: 0 = Sunday ... 6 = Saturday
function clockIn(date, timeZone) {
  var format;
  try {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone, hourCycle: "h23", weekday: "short",
      year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
    });
  } catch (err) {
    throw oops('"' + timeZone + "\" isn't a time zone. Use one like \"Europe/London\" or \"America/New_York\".");
  }
  var out = {};
  format.formatToParts(date).forEach(function (part) {
    out[part.type] = part.value;
  });
  return {
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(out.weekday),
    year: +out.year, month: +out.month, day: +out.day,
    hour: +out.hour % 24, minute: +out.minute, second: +out.second,
  };
}

// "2026-06-12T09:00" on a clock in that time zone → the exact moment (a Date).
// Text that already ends in a zone (Z, +02:00) is used as it is.
function momentFrom(text, timeZone) {
  if (text instanceof Date) return text;
  var hasZone = /(Z|[+-]\d\d:?\d\d)$/.test(String(text));
  var match = /^(\d{4})-(\d\d)-(\d\d)(?:[T ](\d\d):(\d\d)(?::(\d\d))?)?$/.exec(String(text));
  if (hasZone || !timeZone || !match) {
    var plain = new Date(text);
    if (isNaN(plain)) throw oops('Couldn\'t read the date "' + text + '". Write it like "2026-06-12T09:00".');
    return plain;
  }
  var guess = Date.UTC(+match[1], +match[2] - 1, +match[3], +(match[4] || 0), +(match[5] || 0), +(match[6] || 0));
  // How far that zone's clock is from UTC around then; twice, in case a clock change is near.
  for (var i = 0; i < 2; i++) {
    var c = clockIn(new Date(guess), timeZone);
    var shown = Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute, c.second);
    var wanted = Date.UTC(+match[1], +match[2] - 1, +match[3], +(match[4] || 0), +(match[5] || 0), +(match[6] || 0));
    guess += wanted - shown;
  }
  return new Date(guess);
}

export { clockIn, momentFrom };
