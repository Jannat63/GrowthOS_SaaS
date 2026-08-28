"use client";
import { useId } from "react";

/**
 * The real marks for the platforms GrowthOS connects to.
 *
 * These replaced three generic lucide glyphs (a magnifier, a cursor, a megaphone) tinted with our
 * own accent. A vendor's own mark is recognised before the label beside it is read, which is the
 * entire job of an icon in a connections list — and an ember megaphone standing in for Meta is a
 * symbol the reader has to decode rather than recognise.
 *
 * **Path data is copied verbatim from the vendors' published SVGs** (via Wikimedia Commons), not
 * redrawn. An approximated trademark is a wrong trademark. Each `viewBox` is the mark's measured
 * bounding box, so the wordmarks that shipped alongside the marks in those files are cropped
 * exactly rather than by eye, and every mark sits flush in its box:
 *
 *   Google Ads      1.4 0.03 248.31 226.88   (the "Google Ads" wordmark below it is dropped)
 *   Search Console  4.48 4.17 31.35 31.35    (the "Google Search Console" lockup is dropped)
 *   Meta            0 0 287.56 191
 *
 * **These hex values are deliberate exceptions to the no-hardcoded-colour rule.** A trademark is not
 * a theme token: Google blue does not become ember under a white-labelled workspace, and it must not
 * shift between light and dark. Everything *around* the mark — the tile, the border — stays on
 * tokens. Do not "fix" these to `var(--…)`.
 *
 * Marks are decorative here: each is rendered beside the platform's name in text, so announcing it
 * again would just repeat the label.
 */

type MarkProps = { className?: string };

const BASE = "shrink-0";

export function GoogleSearchConsoleMark({ className = "h-5 w-5" }: MarkProps) {
  return (
    <svg
      viewBox="4.48 4.17 31.35 31.35"
      className={`${BASE} ${className}`}
      aria-hidden
      focusable="false"
    >
      <path
        fill="#FBBC04"
        d="m11.081 30.527-4.72 4.721a.933.933 0 0 1-1.317 0l-.292-.292a.933.933 0 0 1 0-1.316l4.72-4.721a.933.933 0 0 1 1.318 0l.291.291a.93.93 0 0 1 0 1.317"
      />
      <path
        fill="#4285F4"
        d="M23.75 32.5h6.042a6.04 6.04 0 0 0 6.041-6.042v-16.25a6.04 6.04 0 0 0-6.041-6.041 6.04 6.04 0 0 0-6.042 6.041z"
      />
      <path
        fill="#FBBC04"
        d="M13.75 32.5a6.04 6.04 0 0 0 6.042-6.042 6.04 6.04 0 0 0-6.042-6.041 6.04 6.04 0 0 0-6.042 6.041A6.04 6.04 0 0 0 13.75 32.5"
      />
      <path
        fill="#34A853"
        d="M27.97 32.5h-5.887a6.04 6.04 0 0 1-6.041-6.042v-7.916a6.04 6.04 0 0 1 6.041-6.042 6.04 6.04 0 0 1 6.042 6.042v13.804a.154.154 0 0 1-.154.154z"
      />
      {/* The two overlap shapes that give the mark its depth where the bars cross. */}
      <path
        fill="#1967D2"
        d="M28.125 32.346V18.542a6.04 6.04 0 0 0-4.375-5.807V32.5h4.22a.154.154 0 0 0 .155-.154"
      />
      <path
        fill="#EA4335"
        d="M19.792 26.575a6.04 6.04 0 0 0-3.75-5.59v5.59c0 1.72.72 3.273 1.875 4.373a6.02 6.02 0 0 0 1.875-4.373"
      />
    </svg>
  );
}

export function GoogleAdsMark({ className = "h-5 w-5" }: MarkProps) {
  return (
    <svg
      viewBox="1.4 0.03 248.31 226.88"
      className={`${BASE} ${className}`}
      aria-hidden
      focusable="false"
    >
      <path
        fill="#3C8BD9"
        d="M85.9,28.6c2.4-6.3,5.7-12.1,10.6-16.8c19.6-19.1,52-14.3,65.3,9.7c10,18.2,20.6,36,30.9,54c17.2,29.9,34.6,59.8,51.6,89.8c14.3,25.1-1.2,56.8-29.6,61.1c-17.4,2.6-33.7-5.4-42.7-21c-15.1-26.3-30.3-52.6-45.4-78.8c-0.3-0.6-0.7-1.1-1.1-1.6c-1.6-1.3-2.3-3.2-3.3-4.9c-6.7-11.8-13.6-23.5-20.3-35.2c-4.3-7.6-8.8-15.1-13.1-22.7c-3.9-6.8-5.7-14.2-5.5-22C83.6,36.2,84.1,32.2,85.9,28.6"
      />
      <path
        fill="#FABC04"
        d="M85.9,28.6c-0.9,3.6-1.7,7.2-1.9,11c-0.3,8.4,1.8,16.2,6,23.5C101,82,112,101,122.9,120c1,1.7,1.8,3.4,2.8,5c-6,10.4-12,20.7-18.1,31.1c-8.4,14.5-16.8,29.1-25.3,43.6c-0.4,0-0.5-0.2-0.6-0.5c-0.1-0.8,0.2-1.5,0.4-2.3c4.1-15,0.7-28.3-9.6-39.7c-6.3-6.9-14.3-10.8-23.5-12.1c-12-1.7-22.6,1.4-32.1,8.9c-1.7,1.3-2.8,3.2-4.8,4.2c-0.4,0-0.6-0.2-0.7-0.5c4.8-8.3,9.5-16.6,14.3-24.9C45.5,98.4,65.3,64,85.2,29.7C85.4,29.3,85.7,29,85.9,28.6"
      />
      <path
        fill="#34A852"
        d="M11.8,158c1.9-1.7,3.7-3.5,5.7-5.1c24.3-19.2,60.8-5.3,66.1,25.1c1.3,7.3,0.6,14.3-1.6,21.3c-0.1,0.6-0.2,1.1-0.4,1.7c-0.9,1.6-1.7,3.3-2.7,4.9c-8.9,14.7-22,22-39.2,20.9C20,225.4,4.5,210.6,1.8,191c-1.3-9.5,0.6-18.4,5.5-26.6c1-1.8,2.2-3.4,3.3-5.2C11.1,158.8,10.9,158,11.8,158"
      />
      <path fill="#FABC04" d="M11.8,158c-0.4,0.4-0.4,1.1-1.1,1.2c-0.1-0.7,0.3-1.1,0.7-1.6L11.8,158" />
      <path fill="#E1C025" d="M81.6,201c-0.4-0.7,0-1.2,0.4-1.7c0.1,0.1,0.3,0.3,0.4,0.4L81.6,201" />
    </svg>
  );
}

export function MetaMark({ className = "h-5 w-5" }: MarkProps) {
  // The two gradients are referenced by id. Without a per-instance id, a second Meta mark anywhere
  // on the page would point at the first one's defs — and if that instance ever unmounts, the
  // surviving mark loses its fill and renders black.
  const uid = useId().replace(/:/g, "");
  const g1 = `meta-a-${uid}`;
  const g2 = `meta-b-${uid}`;

  return (
    <svg
      viewBox="0 0 287.56 191"
      className={`${BASE} ${className}`}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={g1} x1="61" y1="117" x2="259" y2="127" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0064e1" offset="0" />
          <stop stopColor="#0064e1" offset="0.4" />
          <stop stopColor="#0073ee" offset="0.83" />
          <stop stopColor="#0082fb" offset="1" />
        </linearGradient>
        <linearGradient id={g2} x1="45" y1="139" x2="45" y2="66" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0082fb" offset="0" />
          <stop stopColor="#0064e0" offset="1" />
        </linearGradient>
      </defs>
      <path
        fill="#0081fb"
        d="m31.06,125.96c0,10.98 2.41,19.41 5.56,24.51 4.13,6.68 10.29,9.51 16.57,9.51 8.1,0 15.51-2.01 29.79-21.76 11.44-15.83 24.92-38.05 33.99-51.98l15.36-23.6c10.67-16.39 23.02-34.61 37.18-46.96 11.56-10.08 24.03-15.68 36.58-15.68 21.07,0 41.14,12.21 56.5,35.11 16.81,25.08 24.97,56.67 24.97,89.27 0,19.38-3.82,33.62-10.32,44.87-6.28,10.88-18.52,21.75-39.11,21.75l0-31.02c17.63,0 22.03-16.2 22.03-34.74 0-26.42-6.16-55.74-19.73-76.69-9.63-14.86-22.11-23.94-35.84-23.94-14.85,0-26.8,11.2-40.23,31.17-7.14,10.61-14.47,23.54-22.7,38.13l-9.06,16.05c-18.2,32.27-22.81,39.62-31.91,51.75-15.95,21.24-29.57,29.29-47.5,29.29-21.27,0-34.72-9.21-43.05-23.09-6.8-11.31-10.14-26.15-10.14-43.06z"
      />
      <path
        fill={`url(#${g1})`}
        d="m24.49,37.3c14.24-21.95 34.79-37.3 58.36-37.3 13.65,0 27.22,4.04 41.39,15.61 15.5,12.65 32.02,33.48 52.63,67.81l7.39,12.32c17.84,29.72 27.99,45.01 33.93,52.22 7.64,9.26 12.99,12.02 19.94,12.02 17.63,0 22.03-16.2 22.03-34.74l27.4-.86c0,19.38-3.82,33.62-10.32,44.87-6.28,10.88-18.52,21.75-39.11,21.75-12.8,0-24.14-2.78-36.68-14.61-9.64-9.08-20.91-25.21-29.58-39.71l-25.79-43.08c-12.94-21.62-24.81-37.74-31.68-45.04-7.39-7.85-16.89-17.33-32.05-17.33-12.27,0-22.69,8.61-31.41,21.78z"
      />
      <path
        fill={`url(#${g2})`}
        d="m82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78-12.33,18.61-19.88,46.33-19.88,72.95 0,10.98 2.41,19.41 5.56,24.51l-26.48,17.44c-6.8-11.31-10.14-26.15-10.14-43.06 0-30.75 8.44-62.8 24.49-87.55 14.24-21.95 34.79-37.3 58.36-37.3z"
      />
    </svg>
  );
}
