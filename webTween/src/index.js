/* ------------------------------------------------------------------ */
/*  The starting point: hands everything public to your page          */
/* ------------------------------------------------------------------ */

// The build starts here and follows every import to find all the other files.
// Anything not listed here stays hidden inside webtween.js.

import { TweenService } from "./public/animation/TweenService.js";
import { TweenInfo } from "./public/animation/TweenInfo.js";
import { Tween } from "./public/animation/Tween.js";
import { Timeline } from "./public/animation/Timeline.js";
import { Enum } from "./public/animation/Enum.js";
import { Color3 } from "./public/animation/Color3.js";
import { ScrollableFrame } from "./public/animation/ScrollableFrame.js";
import { Reveal } from "./public/animation/Reveal.js";
import { Parallax } from "./public/animation/Parallax.js";
import { TextReveal } from "./public/animation/TextReveal.js";
import { TextRotator } from "./public/animation/TextRotator.js";
import { CountUp } from "./public/animation/CountUp.js";
import { Card } from "./public/elements/Card.js";
import { ImageCard } from "./public/elements/ImageCard.js";
import { Countdown } from "./public/elements/Countdown.js";
import { OpeningHours } from "./public/elements/OpeningHours.js";
import { AddToCalendar } from "./public/elements/AddToCalendar.js";
import { Carousel } from "./public/buildReferences/Carousel.js";
import { Slideshow } from "./public/buildReferences/Slideshow.js";
import { Marquee } from "./public/buildReferences/Marquee.js";
import { Tabs } from "./public/buildReferences/Tabs.js";
import { Accordion } from "./public/buildReferences/Accordion.js";
import { Lightbox } from "./public/buildReferences/Lightbox.js";
import { CompareSlider } from "./public/buildReferences/CompareSlider.js";
import { Hotspots } from "./public/buildReferences/Hotspots.js";
import { Spin360 } from "./public/buildReferences/Spin360.js";

var WebTween = {
  // animation
  TweenService: TweenService,
  TweenInfo: TweenInfo,
  Enum: Enum,
  Color3: Color3,
  Tween: Tween,
  Timeline: Timeline,
  ScrollableFrame: ScrollableFrame,
  Reveal: Reveal,
  Parallax: Parallax,
  TextReveal: TextReveal,
  TextRotator: TextRotator,
  CountUp: CountUp,
  // elements
  Card: Card,
  ImageCard: ImageCard,
  Countdown: Countdown,
  OpeningHours: OpeningHours,
  AddToCalendar: AddToCalendar,
  // build references
  Carousel: Carousel,
  Slideshow: Slideshow,
  Marquee: Marquee,
  Tabs: Tabs,
  Accordion: Accordion,
  Lightbox: Lightbox,
  CompareSlider: CompareSlider,
  Hotspots: Hotspots,
  Spin360: Spin360,
};

window.WebTween = WebTween;
// Everything except Tween (you get those from TweenService.Create) is also available by its own name.
Object.keys(WebTween).forEach(function (name) {
  if (name !== "Tween" && window[name] === undefined) window[name] = WebTween[name];
});
