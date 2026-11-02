/* ------------------------------------------------------------------ */
/*  Color3 — Roblox-style colors that turn into CSS colors            */
/* ------------------------------------------------------------------ */

var Color3 = {
  fromRGB: function (r, g, b) {
    return "rgb(" + r + ", " + g + ", " + b + ")";
  },
  new: function (r, g, b) {
    return "rgb(" + r * 255 + ", " + g * 255 + ", " + b * 255 + ")";
  },
  fromHex: function (hex) {
    return hex.charAt(0) === "#" ? hex : "#" + hex;
  },
};

export { Color3 };
