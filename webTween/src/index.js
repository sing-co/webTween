/* ------------------------------------------------------------------ */
/*  The starting point: hands everything public to your page          */
/* ------------------------------------------------------------------ */

// The build starts here and follows every import to find all the other files.
// Anything not listed here stays hidden inside webtween.js.

import { TweenService } from "./public/animation/TweenService.js";
import { TweenInfo } from "./public/animation/TweenInfo.js";
import { Tween } from "./public/animation/Tween.js";
import { Enum } from "./public/animation/Enum.js";
import { Color3 } from "./public/animation/Color3.js";
import { ScrollableFrame } from "./public/animation/ScrollableFrame.js";
import { Reveal } from "./public/animation/Reveal.js";
import { Parallax } from "./public/animation/Parallax.js";
import { Card } from "./public/elements/Card.js";
import { ImageCard } from "./public/elements/ImageCard.js";
import { Carousel } from "./public/buildReferences/Carousel.js";
import { Slideshow } from "./public/buildReferences/Slideshow.js";

var WebTween = {
  // animation
  TweenService: TweenService,
  TweenInfo: TweenInfo,
  Enum: Enum,
  Color3: Color3,
  Tween: Tween,
  ScrollableFrame: ScrollableFrame,
  Reveal: Reveal,
  Parallax: Parallax,
  // elements
  Card: Card,
  ImageCard: ImageCard,
  // build references
  Carousel: Carousel,
  Slideshow: Slideshow,
};

window.WebTween = WebTween;
[
  "TweenService", "TweenInfo", "Enum", "Color3", "ScrollableFrame", "Reveal", "Parallax",
  "Card", "ImageCard", "Carousel", "Slideshow",
].forEach(function (name) {
  if (window[name] === undefined) window[name] = WebTween[name];
});
