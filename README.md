# WebTween

Smooth animations for websites that work like Roblox's **TweenService**.
If you've made a tween in Roblox, you already know how to use this.

**What's in it**

- **Tweens:** `TweenService`, `TweenInfo`, `Color3` and `Enum`, working like Roblox's
- **Timeline:** line up tweens and functions, then play, pause, scrub through or slow them down, with a panel to see it all
- **Scrolling:** `ScrollableFrame` (a video that plays as you scroll), `Reveal`, `Parallax`
- **Text:** `TextReveal` (headings rise in word by word), `TextRotator` (a word that keeps changing), `CountUp` (numbers count up)
- **Pictures:** `ImageCard`, `Slideshow`, `Lightbox`, `CompareSlider`, `Hotspots`, `Spin360`, and `Carousel` (a 3D spinning ring)
- **Page pieces:** `Tabs`, `Accordion`, `Marquee`, `Countdown`, `OpeningHours`, `AddToCalendar`, `Card`

[Which pieces to use for a product launch, a product page, a restaurant, an event or a hotel](#building-a-whole-page-which-pieces-to-use).

**Try it:** open [`webTween/components-demo.html`](webTween/components-demo.html) or [`webTween/timeline-demo.html`](webTween/timeline-demo.html) with a local server (see [If the video looks choppy](#scrollableframe--a-video-that-plays-as-you-scroll) for which ones work).

## Getting started

Download [`webTween/webtween.js`](webTween/webtween.js), put it next to your HTML file and add one line:

```html
<script src="webtween.js"></script>
```

Then make a tween in three steps — just like Roblox:

```html
<div id="box"></div>

<script src="webtween.js"></script>
<script>
  // 1. HOW it should move
  const info = new TweenInfo(1, "Quad", "Out")

  // 2. WHAT to move, and WHERE it should end up
  const tween = TweenService.Create("#box", info, {
    X: 200,
    BackgroundColor: "hotpink",
    Transparency: 0.5
  })

  // 3. GO
  tween.Play()
</script>
```


## TweenInfo — how it moves

```js
new TweenInfo(Time, EasingStyle, EasingDirection, RepeatCount, Reverses, DelayTime)
```

| Setting | What it means | Default |
|---|---|---|
| `Time` | How many seconds the animation takes | `1` |
| `EasingStyle` | The "feel" of the movement (see below) | `"Quad"` |
| `EasingDirection` | `"In"` (starts slow), `"Out"` (ends slow), `"InOut"` (both) | `"Out"` |
| `RepeatCount` | How many extra times to play it. `-1` = forever | `0` |
| `Reverses` | `true` makes it go back to the start after each play | `false` |
| `DelayTime` | Seconds to wait before starting | `0` |

You can leave off anything at the end: `new TweenInfo(2)` is a 2-second Quad Out tween.

**Easing styles:** `Linear`, `Sine`, `Quad`, `Cubic`, `Quart`, `Quint`, `Exponential`, `Circular`, `Back`, `Elastic`, `Bounce`

You can write them as text (`"Bounce"`) or the Roblox way (`Enum.EasingStyle.Bounce`). Both work.
`TweenInfo.new(...)` also works if that's what your fingers are used to.

## What can I animate?

**Roblox-style names**

| Name | What it does | Example |
|---|---|---|
| `X`, `Y` | Slide sideways / up-down (in pixels, or `"50%"`) | `X: 100` |
| `Rotation` | Spin, in degrees | `Rotation: 90` |
| `Scale` | Grow or shrink (1 = normal size) | `Scale: 1.5` |
| `Transparency` | 0 = fully visible, 1 = invisible | `Transparency: 1` |
| `BackgroundColor` | Background color | `BackgroundColor: "red"` |
| `TextColor` | Text color | `TextColor: Color3.fromRGB(0, 120, 255)` |

**Any CSS style**, written either way: `Width`, `width`, `BorderRadius`, `borderRadius`, `"border-radius"`, `FontSize`, `Left`, `Top`, `Padding`, `BoxShadow`... and CSS variables like `"--glow"`.

- Plain numbers mean pixels: `Width: 300` is the same as `Width: "300px"`.
- Any unit works: `"50%"`, `"2rem"`, `"calc(100% - 20px)"`, `"auto"`.
- Colors can be names (`"red"`), hex (`"#ff0000"`), `rgb(...)`, or `Color3.fromRGB(255, 0, 0)`.

## Controlling a tween

| Do this | What happens |
|---|---|
| `tween.Play()` | Starts it. If it was paused, it carries on from where it stopped. |
| `tween.Pause()` | Freezes it in place. |
| `tween.Cancel()` | Stops it. Things stay where they are. Playing again starts fresh from there. |
| `tween.PlaybackState` | What it's doing right now: `Begin`, `Delayed`, `Playing`, `Paused`, `Completed` or `Cancelled` |

(Lowercase `play()`, `pause()`, `cancel()` work too.)

## Doing something when it finishes

```js
tween.Completed.Connect(function (state) {
  console.log("Done!", state)   // "Completed", or "Cancelled" if you cancelled it
})
```

To run tweens one after another, wait for each one to finish:

```js
async function sequence() {
  const a = TweenService.Create("#box", new TweenInfo(0.5), { X: 200 })
  a.Play()
  await a.Completed.Wait()

  const b = TweenService.Create("#box", new TweenInfo(0.5), { Y: 100 })
  b.Play()
}
```

`Connect` gives you back a connection — call `.Disconnect()` on it to stop listening.
`Once(...)` listens for just the next time.

## Timeline — line lots of things up

For more than two or three steps, a Timeline is easier than waiting for each tween. Make the tweens (don't `Play()` them), then schedule them:

```js
const intro = new Timeline({ Name: "Intro" })      // Timeline.new(...) works too

intro.Schedule(titleIn)                    // starts at 0
intro.Schedule(photoIn, "+0.2")            // 0.2s after the previous one ends
intro.Schedule(buttonPop, "with")          // at the same time as the previous one
intro.Schedule(sayHi, 2.5)                 // a function, run exactly 2.5s in
intro.Schedule(otherTimeline)              // timelines can go inside timelines

intro.Play()
```

**What you can schedule:** a tween from `TweenService.Create(...)`, a function, or another Timeline.

**When it starts** (the second thing you give `Schedule`, optional):

| You write | It starts |
|---|---|
| nothing | right after the previous thing ends |
| `1.5` | exactly 1.5 seconds from the start |
| `"+0.2"` | 0.2 seconds after the previous thing ends |
| `"-0.2"` | 0.2 seconds *before* the previous thing ends, so they overlap |
| `"with"` | at the same moment as the previous thing |

The third thing is an optional name, shown by `DisplayTimeline`: `intro.Schedule(titleIn, 0, "Title in")`. Things you don't name get one made up, like `#title: Y, opacity`.

Functions are told `"Forward"` or `"Backward"` (like ScrollableFrame's keyframe events), because a timeline can be scrubbed or jumped back past them.

**Settings** (all optional): `new Timeline({ Name, RepeatCount, Reverses, Speed })`. `RepeatCount` and `Reverses` work like TweenInfo's. `Speed` is `1` for normal, `0.5` for half speed, and can be changed while it plays.

| Do this | What happens |
|---|---|
| `intro.Play()` | Plays from where it is (from the start if it's finished) |
| `intro.Pause()` | Freezes it |
| `intro.Restart()` | Back to the start, and plays |
| `intro.Seek(1.5)` | Jumps to 1.5 seconds in, playing or not |
| `intro.Duration` | How long one play takes, in seconds |
| `intro.Completed.Connect(fn)` | Runs when it finishes |
| `intro.GetSchedule()` | A list of everything, with `Name`, `Kind`, `Starts`, `Ends` and `Length` |

### Seeing your timeline

- `intro.DisplayTimeline(false)` prints a table in the browser's console: every scheduled thing, when it starts and ends.
- `intro.DisplayTimeline(true)` opens a panel along the bottom of the page: a bar for each thing, play and pause, slow motion, and a red playhead. **Drag across the bars to scrub through your real page**, frame by frame. Hover a bar for its exact times. It doesn't change your code: when you've found the right timing, change the numbers in your `Schedule` calls.

Each tween starts from wherever things are the moment the timeline reaches it, so two tweens in a row on the same thing carry on from each other. A tween in a timeline belongs to that timeline: don't also `Play()` it on its own.

## Extra tools

- `TweenService.GetValue(0.5, "Quad", "Out")` — the eased value at a point (0 to 1), without animating anything.
- `Color3.fromRGB(255, 0, 0)`, `Color3.new(1, 0, 0)`, `Color3.fromHex("ff0000")` — Roblox-style colors.

## ScrollableFrame — a video that plays as you scroll

The video is pinned to the screen and moves forward as you scroll down, and backward as you scroll up. At the frames you choose, your own functions run, e.g. to make something fly in.

```js
const frame = new ScrollableFrame(
  "videos/intro.mp4",       // the video
  [flyInLogo, showText],    // keyframe events: functions to run...
  [5, 40],                  // keyframe triggers: ...at these frames (flyInLogo at 5, showText at 40)
  { Parent: "#hero", FrameRate: 30 }   // settings (all optional)
)

function flyInLogo(direction) {
  // direction is "Forward" when scrolling down, "Backward" when scrolling back up
  if (direction === "Forward") TweenService.Create("#logo", new TweenInfo(0.5), { X: 0 }).Play()
  else TweenService.Create("#logo", new TweenInfo(0.5), { X: -300 }).Play()
}
```

**Settings**

| Setting | What it means | Default |
|---|---|---|
| `Parent` | Where on the page to put it (an element or `"#selector"`) | end of the page |
| `FrameRate` | Your video's frames per second (browsers can't find this out themselves) | `30` |
| `ScrollLength` | How many screens of scrolling it takes to get through the whole video | `3` |
| `Smoothness` | How quickly the video catches up to the scroll. `1` = instantly, `0.05` = very floaty | `0.15` |
| `StickToLastFrame` | `true` keeps the last frame as the page's background once you scroll past the video. Scroll back up and it plays again. | `false` |
| `SkipButton` | `false` hides the "Skip the animation" button | `true` |
| `SkipText` | What the skip button says | `"Skip the animation"` |
| `StuckFrame` | `true` makes the video the background of the **whole page**. It fills the window the entire time, your page scrolls over it, and scrolling from the top of the page to the bottom plays it start to finish. `ScrollLength` and `StickToLastFrame` don't do anything here; your page's own content decides how long the scroll is. | `false` |

With `StickToLastFrame`, the frame sits *behind* the rest of the page. Sections after it with no background of their own show it through. Sections with a background cover it. Things you put in `frame.Stage` don't come along, only the video does.

**Useful parts**

- `frame.Stage` — the box the video sits in. Put your own things in it (`frame.Stage.append(myLogo)`) and they stay on top of the video while it plays.
- `frame.Frame` — the frame showing right now. `frame.Progress` — how far through, from 0 to 1.
- `frame.FrameChanged.Connect(function (n) { ... })` — runs every time the frame changes.
- `frame.Skip()` — jumps to the end, like pressing the skip button. Every keyframe event on the way still runs (`"Forward"`), and the page scrolls to just after the video. With `StuckFrame` it stays on the last frame until the page is scrolled back to the top.
- `frame.SkipButton` — the skip button itself. It sits at the bottom middle of the video and fades away once there's nothing left to skip. Style `.webtween-skip` in your own CSS to change its looks or where it sits.
- `frame.Destroy()` — removes it from the page.

**If the video looks choppy or stuck when you scroll**, check these two things, in this order:

1. **How the page is served.** To jump around inside a video, the browser asks the server for one piece of the file at a time ("range requests"). Some simple servers, like `python -m http.server`, don't support that, and the video stalls or snaps back. Use VS Code's **Live Server**, `npx http-server` or `npx serve` instead. Real hosting (GitHub Pages, Netlify, Vercel) is fine.
2. **The video file.** Normal videos only store a full picture every few seconds, so jumping around is slow. Re-save it with a full picture on every frame using [ffmpeg](https://ffmpeg.org):

```bash
ffmpeg -i input.mp4 -an -c:v libx264 -g 1 -crf 23 -movflags faststart output.mp4
```

The file gets bigger, but scrolling becomes buttery. (`-an` removes the sound, which isn't used anyway.) For long videos, try `-g 5` instead of `-g 1` for a smaller file.

## Reveal — things fade and rise in as you scroll to them

```js
new Reveal(".fade-in")
```

Everything that matches starts invisible and a little lower down. When it scrolls onto the screen, it fades in and rises into place. Things that come into view together go one after another.

| Setting | What it means | Default |
|---|---|---|
| `Distance` | How far below its spot it starts, in pixels | `28` |
| `Time` | How long the fade and rise take, in seconds | `0.9` |
| `EasingStyle` | How it feels (always `"Out"`, so it slows down as it lands) | `"Quint"` |
| `Stagger` | Seconds between things that appear at the same time | `0.08` |
| `Threshold` | How much of it must be on screen before it comes in. `0.5` = half | `0.15` |

**Useful parts:** `reveal.ShowAll()` brings everything in now. `reveal.Elements` is the list it's looking after.

## Parallax — things drift as you scroll

```js
new Parallax(".photo", { Speed: 0.1 })
new Parallax(".photo", { Speed: [0.05, 0.12, 0.08] })   // a different speed for each one
```

`Speed` is how much each thing drifts as the page scrolls: `0.1` moves it a tenth as far as the page, so it seems to float. Negative speeds drift the other way. Everything is exactly in its normal spot when it's in the middle of the screen. `parallax.Destroy()` puts everything back.

## Slideshow — pictures that fade from one to the next

```js
new Slideshow(["pool.jpg", "lobby.jpg", "room.jpg"], { AspectRatio: "16:9", Parent: "#about" })
```

The slides can be picture paths (each becomes an ImageCard in the `AspectRatio` you give), ImageCards, or any page elements. They're stacked in one spot, and the first slide decides how big it is.

| Setting | What it means | Default |
|---|---|---|
| `Every` | Seconds each slide stays before the next fades in | `6` |
| `FadeTime` | How long a fade takes, in seconds | `1.6` |
| `EasingStyle` | How a fade feels | `"Sine"` |
| `AspectRatio` | The shape, when the slides are picture paths | `1` |
| `Parent` | Where on the page to put it | not on the page |

**Useful parts:** `slideshow.Next()`, `slideshow.Show(2)` (the first slide is `0`), `slideshow.Current`, `slideshow.Slides`, `slideshow.Destroy()`. It waits while the tab isn't being looked at.

**Reveal, Parallax and Slideshow all move things with the element's CSS `transform` or opacity, like tweens do.** So don't use two of them (or a tween on X, Y, Rotation or Scale) on the same element: put one inside the other. If someone's device asks for less motion, Reveal and Parallax don't move anything and Slideshow stays on its first slide.

## Building a whole page: which pieces to use

| Kind of site | Pieces that help |
|---|---|
| Product launch | `TextReveal` and `TextRotator` for the headline, `Countdown` to launch day, `CountUp` for big numbers, `Marquee` for logos or quotes, `Accordion` for questions |
| Product page | `Spin360`, `Hotspots`, `CompareSlider`, `Lightbox` for the photos, `Tabs` for specs, `ScrollableFrame` for a scroll-played film |
| Restaurant or café | `OpeningHours` ("Open now · closes at 22:00"), `Tabs` for the menu, `Lightbox` for the food and the room, `Marquee` for reviews |
| Event | `Countdown`, `Tabs` for each day's schedule, `AddToCalendar`, `Marquee` for sponsors, `Accordion` for questions |
| Hotel or venue | `ScrollableFrame`, `Slideshow`, `Parallax`, `Lightbox`, `OpeningHours` |

Everything below respects people who've asked their device for less motion: things appear instead of moving.

## TextReveal — headings that rise in word by word

```js
new TextReveal("h1")                                       // word by word, when scrolled to
new TextReveal(".title", { By: "Letters", Stagger: 0.02 }) // letter by letter
```

Each word (or letter) slides up from behind an invisible line, one after another. Write your heading normally: bold text, links and line breaks inside it are kept, and screen readers still read the whole sentence.

| Setting | What it means | Default |
|---|---|---|
| `By` | `"Words"` or `"Letters"` | `"Words"` |
| `Time` | How long each piece takes, in seconds | `0.8` |
| `Stagger` | Seconds between one piece and the next | `0.06` (words), `0.025` (letters) |
| `EasingStyle` | How it feels | `"Quint"` |
| `When` | `"Visible"` (when scrolled to), `"Now"`, or `"Never"` (you call `Show()` yourself, e.g. from a Timeline) | `"Visible"` |

**Useful parts:** `reveal.Show()`, and `reveal.Pieces`, every word or letter that moves, if you want to tween them yourself.

## TextRotator — one word that keeps changing

```html
<h1>Websites for <span id="who">designers</span></h1>
```
```js
new TextRotator("#who", ["designers", "developers", "everyone"])
new TextRotator("#who", ["designers", "developers"], { Style: "Type" })   // typed, with a cursor
```

| Setting | What it means | Default |
|---|---|---|
| `Style` | `"Slide"` (each word slides up and out) or `"Type"` (deleted and typed, with a blinking cursor) | `"Slide"` |
| `Every` | Seconds each word stays | `2.5` |

Screen readers hear the whole list once instead of a word that keeps changing. `rotator.Next()` changes it now.

## CountUp — numbers that count up when you reach them

```html
<p class="stat">12,400+</p>  <p class="stat">$4.9M</p>  <p class="stat">98.5%</p>
```
```js
new CountUp(".stat")
```

Write the final number in your HTML, exactly how it should end up. CountUp finds the number in the text, keeps everything around it (`$`, `+`, `%`, `M`...) along with commas and decimals, and counts up the first time it's scrolled onto the screen. Settings: `Time` (seconds, default `2`), `EasingStyle` (default `"Quart"`), `From` (default `0`).

## Marquee — a strip that scrolls sideways forever

```html
<div id="logos"> <img src="a.svg" alt="Acme"> <img src="b.svg" alt="Globex"> ... </div>
```
```js
new Marquee("#logos", { Speed: 60, Direction: "Left" })
```

Whatever's inside becomes one long strip that loops with no gap. It copies the items as many times as it needs to fill the width (the copies are hidden from screen readers), pauses while the mouse is over it, and stops moving while it's off screen.

| Setting | What it means | Default |
|---|---|---|
| `Speed` | Pixels per second | `60` |
| `Direction` | `"Left"` or `"Right"` | `"Left"` |
| `Gap` | Pixels between items | `48` |
| `PauseOnHover` | `false` keeps it moving under the mouse | `true` |

**Useful parts:** `marquee.Pause()`, `marquee.Play()`, `marquee.Destroy()` (puts the items back).

## Countdown — days, hours, minutes and seconds to go

```js
const launch = new Countdown("2026-12-31T18:00:00+01:00", { Parent: "#launch", FinishedText: "We're live!" })
launch.Finished.Connect(function () { ... })
```

Put the time zone on the end of the date (`+01:00`, or `Z` for UTC) so everyone counts down to the same moment wherever they are. Without one, it counts to that time on each visitor's own clock. Each number drops in as it changes.

| Setting | What it means | Default |
|---|---|---|
| `Parent` | Where on the page to put it | not on the page |
| `Units` | Which to show. Leave out `"Days"` and hours count past 24 | `["Days", "Hours", "Minutes", "Seconds"]` |
| `Labels` | Different words under the numbers, like `{ Days: "jours" }` | the unit names |
| `FinishedText` | What to show at zero. Leave it out to keep showing zeros | none |

**Useful parts:** `countdown.Remaining` (seconds to go), `countdown.Finished`. Style `.webtween-countdown-number` and `.webtween-countdown-label` to change the looks.

## OpeningHours — "Open now · closes at 22:00"

```js
new OpeningHours("#hours", {
  TimeZone: "Europe/Rome",
  Hours: {
    Monday: "closed",
    Tuesday: "12:00-15:00, 19:00-23:00",
    Friday: "19:00-02:00",          // past midnight is fine
    Saturday: "12:00-02:00",
    Sunday: "12:00-16:00",
  },
  ShowTable: true,
})
```

Shows whether the place is open right now, in its own time zone (so it's right for visitors anywhere), and when it next opens or closes: "Open now · closes at 23:00", "Closing soon · closes at 15:00", "Closed · opens tomorrow at 12:00". It keeps itself up to date. Days you leave out count as closed, and `Mon`, `Tue`... work too.

| Setting | What it means | Default |
|---|---|---|
| `Hours` | Each day's hours, like `"12:00-22:00"`, several separated by commas, or `"closed"` | required |
| `TimeZone` | Where the place is, like `"Europe/London"` | the visitor's clock |
| `ShowTable` | Also list every day's hours, with today in bold | `false` |
| `Clock` | `24` → "22:00", `12` → "10 pm" | `24` |
| `StartWeek` | The table's first day, `"Monday"` or `"Sunday"` | `"Monday"` |

**Useful parts:** `hours.IsOpen`, and `hours.Changed.Connect(function (isOpen) { ... })` for when it opens or closes.

## AddToCalendar — put your event in their calendar

```js
new AddToCalendar("#add", {
  Title: "Solenne Summer Night",
  Start: "2026-06-12T19:00",
  End: "2026-06-12T23:30",
  TimeZone: "Europe/Rome",
  Location: "Hotel Solenne, 1 Hill Road",
  Description: "Dinner on the lawn, then music until late.",
})
```

Turns the element into a button with a small menu: **Google Calendar**, **Outlook**, and **Apple / other**, which downloads a calendar file most apps open. Write the times as they'd read on a clock where the event happens, and give `TimeZone` so they're right for people anywhere. `End` defaults to an hour after `Start`. `Text` changes the button's words.

**Useful parts:** `calendar.GoogleLink()`, `calendar.OutlookLink()`, `calendar.Download()`, if you want your own buttons.

## Tabs — tabs with a sliding line

```html
<div id="menu">
  <section data-tab="Starters"> ... </section>
  <section data-tab="Mains"> ... </section>
  <section data-tab="Desserts"> ... </section>
</div>
```
```js
new Tabs("#menu")
```

Every child with a `data-tab` name becomes a panel, and the names become the tabs. A line slides under the chosen tab, and the panel rises in. Arrow keys, Home and End work, and screen readers know they're tabs. Without the script, all the panels just show one after another, so nothing is lost.

**Settings:** `Start` (a tab number or name, default the first), `Label` (what screen readers call the row of tabs).
**Useful parts:** `tabs.Show(2)` or `tabs.Show("Desserts")`, `tabs.Current`, `tabs.Changed.Connect(function (index, name) { ... })`.

## Accordion — questions that open smoothly

```html
<div id="faq">
  <details>
    <summary>Can I bring my dog?</summary>
    <p>Yes, on the terrace.</p>
  </details>
  ...
</div>
```
```js
new Accordion("#faq", { OnlyOne: true })
```

Uses the browser's own `<details>` and `<summary>`, so it works with the keyboard and screen readers, and still opens and closes without the script. WebTween makes opening and closing glide instead of jump.

**Settings:** `OnlyOne` (opening one closes the others, default `false`), `Time` (default `0.4`).
**Useful parts:** `faq.Open(0)`, `faq.Close(0)`, `faq.Toggle(0)`, `faq.Toggled.Connect(function (details, isOpen) { ... })`.

## Lightbox — photos that grow to fill the screen

```js
new Lightbox(".gallery img")
```

Click a photo (or Tab to it and press Enter) and it grows from where it is to fill the screen. The arrow keys or the buttons go to the next and previous photo, and Escape, Close or a click outside the photo shrinks it back. Works with ImageCards too: `new Lightbox(myCards)`.

To show a bigger file in the lightbox than on the page, give the image `data-full="big-photo.jpg"`. The caption comes from `data-caption`, or the `alt` text.

**Useful parts:** `lightbox.Open(0)`, `lightbox.Close()`, `lightbox.Next()`, `lightbox.Previous()`, `lightbox.Opened`, `lightbox.Closed`.

## CompareSlider — drag across to compare two pictures

```js
new CompareSlider("#compare", {
  Before: "room-before.jpg",
  After: "room-after.jpg",
  BeforeLabel: "Before",
  AfterLabel: "After",
  AspectRatio: "16:9",
})
```

"Before" is on the left of the line, "after" on the right. Drag anywhere on it, or use the arrow keys: there's a real slider underneath, so keyboards and screen readers can use it too. It nudges itself once the first time it's on screen, so people can see it moves.

**Settings:** `Start` (where the line begins, 0 to 100, default `50`), `Hint` (`false` turns the nudge off), `Label`.
**Useful parts:** `compare.Set(30)`, `compare.Position`, `compare.Changed`.

## Hotspots — dots on a picture that open little cards

```js
new Hotspots("#product", [
  { X: 32, Y: 40, Title: "Brushed aluminium", Text: "One piece, no screws." },
  { X: 70, Y: 65, Title: "USB-C", Text: "Charges in 40 minutes." },
])
```

`X` and `Y` are where each dot goes, in percent of the picture's width and height (`0, 0` is the top left). Click a dot (or Tab to it and press Enter) to open its card, which opens on whichever side has room. Escape or a click elsewhere closes it.

**Useful parts:** `spots.Open(0)`, `spots.Close()`, `spots.Opened.Connect(function (index) { ... })` (`-1` when they all close).

## Spin360 — drag a product round to see every side

```js
// 36 photos, each turned 10° more than the last
const photos = Array.from({ length: 36 }, (_, i) => "shoe/" + (i + 1) + ".jpg")
new Spin360(photos, { Parent: "#shoe", AspectRatio: "1:1", Alt: "Running shoe" })
```

Drag left and right (or use the arrow keys) to turn it. Flick it and it keeps turning for a moment, then slows to a stop. It turns slowly by itself until someone touches it. Photos taken all the way round, 24 to 72 of them, work best.

| Setting | What it means | Default |
|---|---|---|
| `Parent` | Where on the page to put it | not on the page |
| `AspectRatio` | Its shape | `1` |
| `Sensitivity` | Pixels of dragging per photo. Smaller turns faster | `8` |
| `AutoSpin` | `false` stops it turning by itself | `true` |
| `Alt`, `Label`, `HintText` | Words for screen readers, and the "Drag to turn" hint | |

**Useful parts:** `spin.Show(10)`, `spin.Current`, `spin.Changed`.

## Card and Carousel — ready-made pieces

A carousel of cards spinning in a 3D ring, in a few lines:

```js
const cards = [
  new Card({ Title: "Cat", Image: "cat.jpg", Color: "tomato", Description: "Sleeps a lot." }),
  new Card({ Title: "Dog", Color: "royalblue" }),
]
const carousel = new Carousel(cards, { Radius: 300 })
```

You can skip `new Card` and just give the settings: `new Carousel([{ Title: "Cat" }, { Title: "Dog" }])`.

**Card settings** (all optional): `Title`, `Image`, `Description`, `Color`, `TextColor`, `Parent`.
A card only goes on the page when you give it to a Carousel, or give it a `Parent`.

### ImageCard — just a picture, in the shape you want

```js
new ImageCard({ Image: "pool.jpg", AspectRatio: "16:9", Title: "The pool", Parent: "#gallery" })
```

| Setting | What it means | Default |
|---|---|---|
| `Image` | The picture | none |
| `AspectRatio` | Width compared to height. `1` = square, `"16:9"` = wide, `"3:4"` = tall. `"16/9"` or a number like `1.5` work too | `1` |
| `Width` | How wide it is. The height follows from `AspectRatio` | `240` |
| `Title` | A caption over the bottom of the picture (also used as its alt text) | none |
| `Parent` | Where on the page to put it | not on the page |

The picture is cropped to fit the shape, so it never looks stretched. ImageCards can go in a Carousel too, mixed with normal Cards if you like.

**Carousel settings** (all optional)

| Setting | What it means | Default |
|---|---|---|
| `Parent` | Where on the page to put it | end of the page |
| `Radius` | How wide the ring is, in pixels | `250` |
| `EasingStyle` | How a spin feels | `"Back"` |
| `Duration` | How long one spin takes, in seconds | `1` |
| `AutoSpinEvery` | Seconds between spins on its own. `0` = never | `3` |
| `PauseAfterScroll` | Seconds to stop spinning on its own after you scroll | `4` |
| `ScrollSensitivity` | How much scrolling counts as one "click". Bigger = less sensitive | `60` |

You can change any of them later and it takes effect straight away: `carousel.Duration = 0.5`.

**Useful parts:** `carousel.Next()`, `carousel.Previous()`, `carousel.Cards`, `carousel.Destroy()`.

**Changing the looks:** style `.webtween-carousel` (the ring) and `.webtween-card` (each card, plus `img`, `h2` and `p` inside it) and `.webtween-imagecard` (plus `img` and the caption `span`) in your own CSS. Yours wins over WebTween's.

## How the files are laid out

`webTween/webtween.js` is the only file your pages need. It's made from the files in `webTween/src/`:

```
src/
  index.js             the starting point: lists what your page gets
  hidden/              the stuff no one needs to see (easing maths, reading styles, the clock...)
  public/
    animation/         TweenService, TweenInfo, Tween, Timeline, Enum, Color3, ScrollableFrame,
                       Reveal, Parallax, TextReveal, TextRotator, CountUp
    elements/          Card, ImageCard, Countdown, OpeningHours, AddToCalendar: single building blocks
    buildReferences/   Carousel, Slideshow, Marquee, Tabs, Accordion, Lightbox, CompareSlider,
                       Hotspots, Spin360: things built out of elements + animation
```

Each file says at the top what it uses from other files (`import`), and at the bottom what it lets other files use (`export`). Anything a file doesn't export stays private to that file.

**Don't edit `webtween.js` directly.** Change the files in `webTween/src/`, then rebuild. The first time, go into the folder and install the build tool (needs [Node.js](https://nodejs.org)):

```bash
cd webTween
```

```bash
npm install
```

Then build once:

```bash
npm run build
```

Or leave this running and it rebuilds every time you save:

```bash
npm run watch
```

**Adding a new file:** `export` what it makes, `import` it wherever it's used, and if your page should get it, add it to `src/index.js`. The build finds it on its own by following the imports.

## Things that work the same as Roblox

- If you play a new tween on something another tween is already changing, the old tween is cancelled.
- `Cancel()` doesn't snap things back — they stay where they were.
- A `Completed` tween can be played again; it starts from wherever things are now.
- `Reverses` with `RepeatCount` counts each there-and-back as one play.

## Things that are a bit different

- Methods use a dot, not a colon: `tween.Play()` instead of `tween:Play()`.
- `X`, `Y`, `Rotation` and `Scale` take over the element's CSS `transform`. If your stylesheet also sets `transform` on the same element, WebTween's will win.
- CSS `transition`s on an element are paused while a tween is running on it, so they don't fight.
- `Completed.Wait()` needs `await` in front of it.
- Going between two different units doesn't animate. If something is at `X: "-100%"`, tween it to `X: "0%"`, not `X: 0` (a plain number means pixels, and a change of unit starts from 0 in the new unit, so there's nothing to animate).
