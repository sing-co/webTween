/* ------------------------------------------------------------------ */
/*  Card — a ready-made card with a picture, a title and some text    */
/* ------------------------------------------------------------------ */

import { addStyles, findElement } from "../../hidden/pageStyles.js";

/*
  new Card({ Title: "Cat", Image: "cat.jpg", Color: "tomato", Description: "Sleeps a lot." })

  Every setting is optional. A card isn't on the page until you give it to a
  Carousel, or give it a Parent: new Card({ Title: "Hi", Parent: "#box" })
*/
function Card(settings) {
  if (!(this instanceof Card)) return new Card(settings);
  settings = settings || {};
  addStyles("Card", CARD_CSS);

  // the card itself
  this.Instance = document.createElement("div");
  this.Instance.className = "webtween-card";
  if (settings.Color) this.Instance.style.backgroundColor = settings.Color;
  if (settings.TextColor) this.Instance.style.color = settings.TextColor;

  // the parts inside it (only the ones you asked for)
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

/** Remove it from the page. */
Card.prototype.Destroy = function () {
  this.Instance.remove();
};
Card.prototype.destroy = Card.prototype.Destroy;
Card["new"] = function (settings) {
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
  ".webtween-card p { margin: 0; opacity: 0.85; }",
].join("\n");

export { Card, CARD_CSS };
