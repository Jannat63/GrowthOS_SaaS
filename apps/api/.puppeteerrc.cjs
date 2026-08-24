// Puppeteer reads this automatically (see node_modules/puppeteer's own install script). Without
// it, a flaky or restricted network turns `pnpm install` into a hang or a hard failure — exactly
// what happened building this repo's own Local Demo Mode — with nothing about it obviously
// connected to Puppeteer unless you already know to look here.
//
// Skipping is the default for everyone, not just Local Demo Mode: PDF export
// (pdf-report-generate.ts) is one feature among many, and no one should have their first
// `pnpm install` blocked on a Chromium download they may not even need yet.
//
// To actually use PDF export locally, either:
//   PUPPETEER_SKIP_DOWNLOAD=false pnpm install        # re-run install, letting it download
// or, without reinstalling anything:
//   npx puppeteer browsers install chrome
const { join } = require("node:path");

module.exports = {
  // Keep the downloaded browser out of node_modules (which pnpm may prune/rebuild) and somewhere
  // stable across installs.
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
  skipDownload: process.env.PUPPETEER_SKIP_DOWNLOAD !== "false",
};
