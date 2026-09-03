/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@growthos/ui", "@growthos/logic"],

  // Dev and production builds get separate output directories on purpose. They used to share
  // `.next`, so running `pnpm build` while `pnpm dev` was up corrupted the running server —
  // twice, in two different ways: the production build overwrote the dev CSS (page rendered with
  // zero styles), and later the dev server recompiled onto production chunks and every request
  // died with `__webpack_modules__[moduleId] is not a function`. Both look like application bugs
  // and neither is. Next sets NODE_ENV from the command (`next dev` → development,
  // `next build` → production), so the split is automatic.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",

  // The dev-tools disc defaults to bottom-left, which is exactly where the sidebar's Settings link
  // sits — it reads as a z-index bug in our own layout. Dev-only; nothing ships to production.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
