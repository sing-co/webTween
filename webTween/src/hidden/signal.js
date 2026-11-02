/* ------------------------------------------------------------------ */
/*  Events — tween.Completed.Connect(function (state) { ... })        */
/* ------------------------------------------------------------------ */

import { oops } from "./helpers.js";

function Signal() {
  this._listeners = [];
}
Signal.prototype.Connect = function (fn) {
  if (typeof fn !== "function")
    throw oops("Connect needs a function to run when the event happens.");
  var listeners = this._listeners;
  var entry = { fn: fn };
  listeners.push(entry);
  var connection = {
    Connected: true,
    Disconnect: function () {
      if (!connection.Connected) return;
      connection.Connected = false;
      var i = listeners.indexOf(entry);
      if (i >= 0) listeners.splice(i, 1);
    },
  };
  connection.disconnect = connection.Disconnect;
  return connection;
};
Signal.prototype.Once = function (fn) {
  var connection = this.Connect(function () {
    connection.Disconnect();
    fn.apply(null, arguments);
  });
  return connection;
};
// JavaScript can't pause like Roblox's :Wait(), so this gives you something to `await`.
Signal.prototype.Wait = function () {
  var self = this;
  return new Promise(function (resolve) {
    self.Once(resolve);
  });
};
Signal.prototype._fire = function () {
  var args = arguments;
  this._listeners.slice().forEach(function (entry) {
    try {
      entry.fn.apply(null, args);
    } catch (err) {
      console.error(
        "WebTween: a function connected to an event had an error:",
        err,
      );
    }
  });
};
Signal.prototype.connect = Signal.prototype.Connect;
Signal.prototype.once = Signal.prototype.Once;
Signal.prototype.wait = Signal.prototype.Wait;

export { Signal };
