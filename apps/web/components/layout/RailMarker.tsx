"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type Marker = { top: number; height: number; visible: boolean; moving: boolean };

/**
 * The ember bar on the active rail item — one marker for a whole region, travelling between
 * sections rather than being cut out of one row and pasted into another.
 *
 * This is the signature of the navigation and the only place a route change is allowed to be
 * conspicuous. It works because it answers the click directly: your eye is already on the row you
 * pressed, and the bar leaves where you were and arrives where you are looking. Everything else in
 * the transition — the panel beside it — stays quiet at six pixels.
 *
 * **Usage:** drop it as a child of a `relative` container that pads with `px-3`, and mark the active
 * row with `data-rail-active="true"`. It measures against its own parent, so a rail with a scrolling
 * section list and a pinned footer gets one marker in each: they are separate scroll contexts, and a
 * bar that slid between them would have to cross a border it cannot cross. Moving between the two
 * regions therefore reads as a cross-fade, which is the honest description of what happened.
 *
 * Both rails use it — the customer dashboard's and the console's — for the same reason they already
 * share `useSidebarStore`: an operator moving between the two surfaces should not have to learn a
 * second set of rules for the same furniture.
 */
export function RailMarker() {
  const pathname = usePathname();
  const ref = useRef<HTMLSpanElement>(null);
  const [marker, setMarker] = useState<Marker | null>(null);

  // Where the bar was last time. It drives the travel: with nothing to travel from, it must not
  // travel. Comparing positions rather than counting renders also survives the double-invoked
  // effects of development strict mode, which a "have I run before" flag would not.
  const lastTop = useRef<number | null>(null);

  // Bumped by the observer below so a re-measure is an ordinary dependency change.
  const [revision, setRevision] = useState(0);

  useLayoutEffect(() => {
    const region = ref.current?.parentElement;
    const active = region?.querySelector<HTMLElement>('[data-rail-active="true"]');

    if (!active) {
      // Gone from this region — a detail page, or the other region took the active row. Fade out
      // *where it stands*: dropping the position too would send the bar to the top of the rail
      // mid-fade, which is a movement that answers nothing. Forgetting where it was is enough to
      // make the return trip a fade-in rather than a slide from a stale position.
      setMarker((prev) => (prev ? { ...prev, visible: false, moving: false } : null));
      lastTop.current = null;
      return;
    }

    // offsetTop resolves against the nearest positioned ancestor — the region itself, since the
    // group wrappers in between are static, so the nesting is transparent here.
    const top = active.offsetTop;
    setMarker({
      top,
      height: active.offsetHeight,
      visible: true,
      moving: lastTop.current !== null && lastTop.current !== top,
    });
    lastTop.current = top;
  }, [pathname, revision]);

  // The rail collapses to icons, which drops the group headings and moves every row. Observing the
  // region covers that, plus window resizes and a font landing late, without the collapsed flag
  // having to be threaded down from two rails that store it differently.
  useEffect(() => {
    const region = ref.current?.parentElement;
    if (!region || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setRevision((r) => r + 1));
    observer.observe(region);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn(
        // `left-3` matches the `px-3` both rails pad their regions with: an absolutely positioned
        // child resolves against the padding box, so `left-0` would put the bar against the rail's
        // outer edge rather than against the start of the row it marks — which is where the per-row
        // bar it replaces sat, in both the expanded and the collapsed width.
        "pointer-events-none absolute left-3 w-0.5 rounded-full bg-primary",
        marker?.moving ? "rail-marker-move" : "rail-marker",
        marker?.visible ? "opacity-100" : "opacity-0"
      )}
      // Genuinely dynamic — measured off the row it is marking. The 6px inset top and bottom is the
      // `inset-y-1.5` the per-row bar used, so the bar itself has not changed size or position.
      style={marker ? { top: marker.top + 6, height: Math.max(marker.height - 12, 0) } : undefined}
    />
  );
}
