import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "@/components/Providers";

// Single family for both body and display text — one voice across marketing, auth, and the
// data-dense dashboard, rather than pairing a body font with a separate display face.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growthos.app";
const SITE_NAME = "GrowthOS";
const DEFAULT_DESCRIPTION =
  "GrowthOS turns SEO, Google Ads, and Meta Ads into a single insight loop, so every channel compounds instead of competing.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — one loop for SEO, Google Ads & Meta Ads`,
    // Every page below sets its own `title` (a short string) and gets " | GrowthOS" appended
    // automatically, rather than every browser tab/search result sharing one identical title.
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — one loop for SEO, Google Ads & Meta Ads`,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — one loop for SEO, Google Ads & Meta Ads`,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    // The marketing site should be indexed; individual authenticated app routes have nothing
    // for a crawler to usefully index anyway (they 401 without a session), so this default is
    // fine platform-wide rather than needing a per-route override.
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={jakarta.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
