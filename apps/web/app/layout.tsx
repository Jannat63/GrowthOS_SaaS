import type { Metadata, Viewport } from "next";
import { Inter, Archivo, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "@/components/Providers";
import { BRAND_EMBER, BRAND_INK } from "@/lib/brand-mark";
import { SITE_URL } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Display face. Archivo is a grotesque cut for signage — wide, flat-sided, and
// confident at large sizes, which suits a product whose signature is a routing
// board. Feeds --font-display, so every existing `font-display` usage inherits it.
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["500", "600", "700"],
  display: "swap",
});

// Data face. Metrics, channel codes, and the bridge notation are read as columns,
// not prose — they need real tabular figures rather than the stock mono stack.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
  display: "swap",
});

const SITE_NAME = "GrowthOS";
const TITLE = "GrowthOS — SEO, Google Ads and Meta Ads on one exchange";
const DESCRIPTION =
  "Most teams run SEO, Google Ads, and Meta in three tabs that disagree. GrowthOS connects them with six working bridges, so a win in one channel becomes the next move in another.";
const SOCIAL_DESCRIPTION =
  "Six bridges between your three channels. A converting search term becomes a content brief; a fatiguing hook becomes next week's article.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: TITLE,
    // Every page below sets its own short `title` and gets " · GrowthOS" appended automatically,
    // rather than every browser tab and search result sharing one identical title.
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: TITLE,
    description: SOCIAL_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: SOCIAL_DESCRIPTION,
  },
  robots: {
    // The marketing site should be indexed; the authenticated app routes have nothing for a
    // crawler to index anyway, and robots.ts disallows them explicitly, so indexing is a safe
    // platform-wide default rather than something each route has to opt into.
    index: true,
    follow: true,
  },
};

/**
 * The colour the browser paints its own chrome with — Android's address bar, Safari's toolbar, the
 * window frame on an installed app. Split by scheme so the chrome matches the page it frames
 * rather than glowing ember above a graphite page.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND_EMBER },
    { media: "(prefers-color-scheme: dark)", color: BRAND_INK },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${archivo.variable} ${jetbrainsMono.variable}`}
    >
      {/* Browser extensions stamp attributes onto <body> before React hydrates — ColorZilla's
          `cz-shortcut-listen`, Grammarly's `data-gr-*`, and others — which the server HTML has no
          way to predict, so hydration reports a mismatch for markup we did not write. This flag is
          scoped to this element's own attributes and does not extend to children, so real
          mismatches inside the app still surface. Same reason <html> carries it above. */}
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
