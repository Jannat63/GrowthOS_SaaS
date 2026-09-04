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
//
// `cacheDirectory` is deliberately NOT set, which leaves Puppeteer's own default of
// `~/.cache/puppeteer`. It used to point at `apps/api/.cache/puppeteer`, to keep the download out
// of node_modules — but the home cache is out of node_modules too, and being per-project bought
// nothing while costing a fresh ~180MB download per checkout. Worse, it made an already-installed
// Chrome invisible: `npx puppeteer browsers install chrome` run anywhere else on the machine
// populates the home cache, so a developer with the exact right build sitting on disk still got
// "Could not find Chrome (ver. …)" here, and the API answered the Download PDF button with a 409
// saying Chromium was not installed. It was, just not in this repo.
module.exports = {
  skipDownload: process.env.PUPPETEER_SKIP_DOWNLOAD !== "false",
};
