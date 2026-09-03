import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "GrowthOS — one loop for SEO, Google Ads & Meta Ads";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a1128",
          backgroundImage: "radial-gradient(circle at 25% 15%, #1e40af55, transparent 55%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              backgroundColor: "#1e40af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "#ffffff" }} />
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, color: "#f8fafc" }}>GrowthOS</div>
        </div>
        <div style={{ marginTop: 28, fontSize: 30, color: "#93a3c9", textAlign: "center", maxWidth: 900 }}>
          One loop for SEO, Google Ads &amp; Meta Ads
        </div>
      </div>
    ),
    { ...size }
  );
}
