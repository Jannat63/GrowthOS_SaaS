import { ImageResponse } from "next/og";
import { MARK_DATA_URI } from "@/lib/brand-mark";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const alt = "GrowthOS";

/**
 * The home-screen icon. iOS ignores transparency and applies its own corner mask, so this is a
 * full-bleed ember field with the mark inset — the tile's own rounded corners are left off rather
 * than being rounded twice.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ce4218",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MARK_DATA_URI} width={112} height={112} alt="" />
      </div>
    ),
    { ...size }
  );
}
