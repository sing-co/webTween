/* ------------------------------------------------------------------ */
/*  Little helpers used everywhere                                    */
/* ------------------------------------------------------------------ */

// Makes an error message that says it came from WebTween.
function oops(message) {
  return new Error("WebTween: " + message);
}

// Lets people write "quad", "Quad" or Enum.EasingStyle.Quad and get the same thing.
function pickName(value, list, what) {
  if (typeof value === "string") {
    for (var key in list) {
      if (key.toLowerCase() === value.toLowerCase()) return key;
    }
  }
  throw oops(
    '"' +
      value +
      "\" isn't a known " +
      what +
      ". Try one of: " +
      Object.keys(list).join(", ") +
      ".",
  );
}

export { oops, pickName };
