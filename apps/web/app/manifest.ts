import type { MetadataRoute } from "next";
import { BRAND_EMBER, BRAND_INK } from "@/lib/brand-mark";

/**
 * The installable-app manifest, which is also what supplies the icon and title when someone adds
 * the dashboard to a phone's home screen or pins it in a desktop browser.
 *
 * `start_url` is the dashboard rather than the marketing homepage: nobody installs a landing page.
 * Anyone who lands there without a session is redirected to sign-in by middleware, which is the
 * correct behaviour for an installed app's cold start.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GrowthOS — SEO, Google Ads and Meta Ads on one exchange",
    short_name: "GrowthOS",
    description:
      "One loop across SEO, Google Ads, and Meta Ads, so a win in one channel becomes the next move in another.",
    start_url: "/growth-hub",
    display: "standalone",
    background_color: BRAND_INK,
    theme_color: BRAND_EMBER,
    icons: [
      // One vector, declared as scalable, rather than a ladder of PNGs that would each need
      // regenerating by hand the next time the mark changes.
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
