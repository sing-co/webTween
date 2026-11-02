// Bundles src/ into webtween.js, the one file your pages load.
//
//   npm run build    build it once
//   npm run watch    rebuild every time you save a file in src/
//
// esbuild starts at src/index.js, follows every `import`, and glues
// all the files it finds into one, in the right order.

import * as esbuild from "esbuild";

const options = {
  entryPoints: ["src/index.js"],
  bundle: true,
  format: "iife", // wrap it all up so the hidden stuff stays hidden
  outfile: "webtween.js",
  banner: {
    js: `/*
  WebTween — smooth animations for websites, in the style of Roblox's TweenService.

  Add it to your page:
      <script src="webtween.js"></script>

  DON'T EDIT THIS FILE. It's made from the files in src/.
  Change those instead, then run:  npm run build
*/`,
  },
};

if (process.argv.includes("--watch")) {
  const context = await esbuild.context(options);
  await context.watch();
  console.log("Watching src/ — webtween.js rebuilds every time you save. Ctrl+C to stop.");
} else {
  await esbuild.build(options);
  console.log("Built webtween.js");
}
