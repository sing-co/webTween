# WebTween

Smooth animations for websites that work like Roblox's **TweenService**.
If you've made a tween in Roblox, you already know how to use this.

## Getting started

Put `webtween.js` next to your HTML file and add one line:

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

| `StuckFrame` | `true` makes the video the background of the **whole page**. It fills the window the entire time, your page scrolls over it, and scrolling from the top of the page to the bottom plays it start to finish. `ScrollLength` and `StickToLastFrame` don't do anything here; your page's own content decides how long the scroll is. | `false` |

See `scroll-demo.html` for a working example.

With `StickToLastFrame`, the frame sits *behind* the rest of the page. Sections after it with no background of their own show it through. Sections with a background cover it. Things you put in `frame.Stage` don't come along, only the video does.

**Useful parts**

- `frame.Stage` — the box the video sits in. Put your own things in it (`frame.Stage.append(myLogo)`) and they stay on top of the video while it plays.
- `frame.Frame` — the frame showing right now. `frame.Progress` — how far through, from 0 to 1.
- `frame.FrameChanged.Connect(function (n) { ... })` — runs every time the frame changes.
- `frame.Destroy()` — removes it from the page.

**If the video looks choppy when you scroll:** that's the video file, not the code. Normal videos only store a full picture every few seconds, so jumping around is slow. Re-save it with a full picture on every frame using [ffmpeg](https://ffmpeg.org):

```bash
ffmpeg -i input.mp4 -an -c:v libx264 -g 1 -crf 23 -movflags faststart output.mp4
```

The file gets bigger, but scrolling becomes buttery. (`-an` removes the sound, which isn't used anyway.) For long videos, try `-g 5` instead of `-g 1` for a smaller file.


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

**Changing the looks:** style `.webtween-carousel` (the ring) and `.webtween-card` (each card, plus `img`, `h2` and `p` inside it) in your own CSS. Yours wins over WebTween's.

## How the files are laid out

`webtween.js` is the only file your pages need. It's made from the files in `src/`:

```
src/
  index.js             the starting point: lists what your page gets
  hidden/              the stuff no one needs to see (easing maths, reading styles, the clock...)
  public/
    animation/         TweenService, TweenInfo, Tween, Enum, Color3, ScrollableFrame
    elements/          Card: single building blocks
    buildReferences/   Carousel: things built out of elements + animation
```

Each file says at the top what it uses from other files (`import`), and at the bottom what it lets other files use (`export`). Anything a file doesn't export stays private to that file.

**Don't edit `webtween.js` directly.** Change the files in `src/`, then rebuild. The first time, install the build tool (needs [Node.js](https://nodejs.org)):

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
