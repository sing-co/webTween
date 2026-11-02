/* ------------------------------------------------------------------ */
/*  ImageCard — a card that's just a picture, in the shape you choose */
/* ------------------------------------------------------------------ */

import { oops } from "../../hidden/helpers.js";
import { addStyles, findElement } from "../../hidden/pageStyles.js";

/*
  new ImageCard({ Image: "pool.jpg", AspectRatio: "16:9" })

  AspectRatio is width compared to height: 1 is square, "16:9" is wide,
  "3:4" is tall. You can also write "16/9" or a plain number like 1.5.
  The picture is cropped to fit, so it never looks stretched.

  Like a Card, it isn't on the page until you give it to a Carousel, or give
  it a Parent: new ImageCard({ Image: "pool.jpg", Parent: "#gallery" })
*/
function ImageCard(settings) {
  if (!(this instanceof ImageCard)) return new ImageCard(settings);
  settings = settings || {};
  addStyles("ImageCard", IMAGE_CARD_CSS);

  // the card itself
  this.Instance = document.createElement("div");
  this.Instance.className = "webtween-imagecard";
  this.AspectRatio = readAspectRatio(settings.AspectRatio === undefined ? 1 : settings.AspectRatio);
  this.Instance.style.aspectRatio = String(this.AspectRatio);
  if (settings.Width !== undefined) {
    this.Instance.style.width = typeof settings.Width === "number" ? settings.Width + "px" : settings.Width;
  }

  // the picture
  this.Image = document.createElement("img");
  if (settings.Image) this.Image.src = settings.Image;
  this.Image.alt = settings.Title || "";
  this.Instance.appendChild(this.Image);

  // a caption over the bottom of the picture (only if you gave a Title)
  if (settings.Title) {
    this.Title = document.createElement("span");
    this.Title.textContent = settings.Title;
    this.Instance.appendChild(this.Title);
  }

  if (settings.Parent) findElement(settings.Parent, "ImageCard").appendChild(this.Instance);
}

// Turns 1.5, "16:9", "16/9" or "16 / 9" into a number (width ÷ height).
function readAspectRatio(value) {
  var ratio = value;
  if (typeof value === "string") {
    var parts = value.split(/[:\/]/);
    ratio = parts.length === 2 ? parseFloat(parts[0]) / parseFloat(parts[1]) : parseFloat(value);
  }
  if (typeof ratio !== "number" || !isFinite(ratio) || ratio <= 0) {
    throw oops('"' + value + "\" isn't an aspect ratio. Try something like 1, 1.5, \"16:9\" or \"3/4\".");
  }
  return ratio;
}

/** Remove it from the page. */
ImageCard.prototype.Destroy = function () {
  this.Instance.remove();
};
ImageCard.prototype.destroy = ImageCard.prototype.Destroy;
ImageCard["new"] = function (settings) {
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
  "}",
].join("\n");

export { ImageCard };
