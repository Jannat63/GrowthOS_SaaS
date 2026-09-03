"use client";

import { useEffect } from "react";

/**
 * The last boundary. It catches what `app/error.tsx` cannot: a failure in the root layout itself,
 * or in the providers it mounts.
 *
 * It replaces the entire document — which is why it has to render its own `<html>` and `<body>`,
 * and why it cannot use anything from the app. The theme provider is gone, so the CSS variables
 * every component reads are gone with it; `@growthos/ui` primitives, the fonts, `cn()` and the
 * token classes would all resolve to nothing here. So this one file styles itself inline, and it
 * is the only place in apps/web where a hex belongs in a component.
 *
 * Without it, this case fell through to Next's own unstyled error page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Fatal application error:", error);
  }, [error]);

  return (
    // `lang` and the colour scheme are set here too: the real <html> never rendered.
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "1.5rem",
          textAlign: "center",
          backgroundColor: "#0b0f14",
          color: "#f4f5f7",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        {/* The mark, drawn inline — there is no component tree left to import it from. */}
        <svg width="40" height="40" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="9" fill="#ff6b41" />
          <path
            d="M16 9 L23 21 L9 21 Z"
            fill="none"
            stroke="#1a0a04"
            strokeOpacity="0.5"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="9" r="3" fill="#1a0a04" />
          <circle cx="23" cy="21" r="3" fill="#1a0a04" />
          <circle cx="9" cy="21" r="3" fill="#1a0a04" />
        </svg>

        <h1 style={{ margin: "1.25rem 0 0", fontSize: "1.5rem", fontWeight: 700 }}>
          GrowthOS didn&rsquo;t start
        </h1>
        <p style={{ margin: 0, maxWidth: "26rem", lineHeight: 1.65, color: "#9aa6b4" }}>
          Something failed before the app could render. Nothing was being saved. Reloading usually
          clears it; if it doesn&rsquo;t, send us the reference below.
        </p>

        <button
          onClick={reset}
          style={{
            marginTop: "1.25rem",
            padding: "0.5rem 1.1rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: 500,
            backgroundColor: "#ff6b41",
            color: "#1a0a04",
          }}
        >
          Reload
        </button>

        {error.digest && (
          <p
            style={{
              marginTop: "1.5rem",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "0.6875rem",
              letterSpacing: "0.12em",
              color: "#9aa6b4",
            }}
          >
            Reference {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
