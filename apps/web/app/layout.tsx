import type { Metadata } from "next";
import { Inter, Archivo, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "@/components/Providers";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://growthos.app"),
  title: {
    default: "GrowthOS — SEO, Google Ads and Meta Ads on one exchange",
    template: "%s · GrowthOS",
  },
  description:
    "Most teams run SEO, Google Ads, and Meta in three tabs that disagree. GrowthOS connects them with six working bridges, so a win in one channel becomes the next move in another.",
  openGraph: {
    type: "website",
    siteName: "GrowthOS",
    title: "GrowthOS — SEO, Google Ads and Meta Ads on one exchange",
    description:
      "Six bridges between your three channels. A converting search term becomes a content brief; a fatiguing hook becomes next week's article.",
  },
  twitter: { card: "summary_large_image" },
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
