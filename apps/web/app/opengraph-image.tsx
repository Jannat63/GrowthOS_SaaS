import { ImageResponse } from "next/og";
import { BRAND_EMBER_ON_INK, BRAND_INK, MARK_TILE_DATA_URI } from "@/lib/brand-mark";

export const runtime = "edge";
export const alt = "GrowthOS — a win in one channel becomes the next move in another";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card every share of growthos.app renders as, and — because Next falls back to it — the card
 * for any page that does not supply its own.
 *
 * Signal, not the pre-rebrand blue it sat on until now: cold graphite ground, one ember glow off
 * the top-left where the mark sits, and the channel triad stated in the footer because the three
 * names are what a reader is scanning for. The claim is the same sentence as the H1, so a link
 * preview and the page it opens do not introduce the product twice, differently.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: BRAND_INK,
          backgroundImage: `radial-gradient(circle at 18% 0%, #ce421833, transparent 55%)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK_TILE_DATA_URI} width={64} height={64} alt="" />
          <div style={{ fontSize: 38, fontWeight: 700, color: "#f4f5f7", letterSpacing: -0.5 }}>
            GrowthOS
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 700,
            color: "#f4f5f7",
            lineHeight: 1.12,
            letterSpacing: -1.5,
            maxWidth: 940,
          }}
        >
          A win in one channel becomes the next move in another.
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 24 }}>
          <div style={{ color: "#9aa6b4" }}>SEO</div>
          <div style={{ color: "#232e3b" }}>/</div>
          <div style={{ color: "#9aa6b4" }}>Google Ads</div>
          <div style={{ color: "#232e3b" }}>/</div>
          <div style={{ color: "#9aa6b4" }}>Meta Ads</div>
          <div style={{ color: "#232e3b" }}>·</div>
          <div style={{ color: BRAND_EMBER_ON_INK }}>Six bridges between them</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
