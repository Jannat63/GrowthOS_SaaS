"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { BRIDGES, CHANNELS, type ChannelId } from "./channels";

/**
 * The Exchange — three stations, six one-way bridges, one signal in transit.
 *
 * Every other element on this page is deliberately quiet so this one can carry the argument.
 * The six arcs are not decoration: they are the six channel-pair bridges the intelligence
 * engine actually implements, so the drawing and the product agree.
 */

const NODE_POS: Record<ChannelId, { x: number; y: number }> = {
  seo: { x: 200, y: 66 },
  google: { x: 330, y: 286 },
  meta: { x: 70, y: 286 },
};

/** Keeps arcs off the node discs so the arrowheads stay readable. */
const CLEAR = 44;
/** How far apart the two opposing lanes bow. Each pair gets an inner and an outer track. */
const BOW = 40;

function edgeGeometry(from: ChannelId, to: ChannelId) {
  const a = NODE_POS[from];
  const b = NODE_POS[to];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  // Right-hand perpendicular, so A→B and B→A bow to opposite sides and never overlap.
  const px = dy / len;
  const py = -dx / len;
  const cx = (a.x + b.x) / 2 + px * BOW;
  const cy = (a.y + b.y) / 2 + py * BOW;

  const pull = (p: { x: number; y: number }) => {
    const vx = cx - p.x;
    const vy = cy - p.y;
    const l = Math.hypot(vx, vy);
    return { x: p.x + (vx / l) * CLEAR, y: p.y + (vy / l) * CLEAR };
  };
  const s = pull(a);
  const e = pull(b);

  // A quadratic Bézier's tangent at t=1 points directly away from its control point.
  const tx = e.x - cx;
  const ty = e.y - cy;
  const tl = Math.hypot(tx, ty);
  const ux = tx / tl;
  const uy = ty / tl;
  const size = 8;
  const tip = { x: e.x + ux * 3, y: e.y + uy * 3 };
  const base = { x: tip.x - ux * size, y: tip.y - uy * size };
  const arrow = [
    `${tip.x.toFixed(1)},${tip.y.toFixed(1)}`,
    `${(base.x - uy * size * 0.52).toFixed(1)},${(base.y + ux * size * 0.52).toFixed(1)}`,
    `${(base.x + uy * size * 0.52).toFixed(1)},${(base.y - ux * size * 0.52).toFixed(1)}`,
  ].join(" ");

  return {
    d: `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}`,
    arrow,
  };
}

const EDGES = BRIDGES.map((b) => ({ ...b, ...edgeGeometry(b.from, b.to) }));

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function ExchangeBoard() {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (reduced || held) return;
    const t = setInterval(() => setActive((i) => (i + 1) % EDGES.length), 3200);
    return () => clearInterval(t);
  }, [reduced, held]);

  const current = EDGES[active];

  return (
    <div className="mx-auto w-full max-w-[27rem]">
      {/* Matches the viewBox exactly. A square box here would leave a band of dead space under
          the graph and float the readout away from it. */}
      <div
        className="relative aspect-[400/380] w-full"
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
      >
        {/* Ambient warmth behind the board. Kept low so the arcs stay the brightest thing. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-6 rounded-full bg-primary/10 blur-3xl"
        />

        <svg
          viewBox="0 0 400 380"
          className="absolute inset-0 h-full w-full overflow-visible"
          role="img"
          aria-label="Three channels connected by six one-way bridges: SEO, Google Ads and Meta Ads."
        >
          {EDGES.map((e, i) => {
            const on = reduced || i === active;
            const colour = CHANNELS[e.from].cssVar;
            return (
              <g key={`${e.from}-${e.to}`}>
                <path
                  d={e.d}
                  fill="none"
                  stroke={colour}
                  strokeOpacity={on ? 0.85 : 0.22}
                  strokeWidth={on ? 2.25 : 1.25}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
                <polygon
                  points={e.arrow}
                  fill={colour}
                  fillOpacity={on ? 0.9 : 0.2}
                  className="transition-all duration-500"
                />
                {on && !reduced && (
                  <circle key={`packet-${active}`} r="4.5" fill={colour}>
                    <animateMotion dur="2.1s" repeatCount="indefinite" path={e.d} />
                  </circle>
                )}
              </g>
            );
          })}

          {(Object.keys(NODE_POS) as ChannelId[]).map((id) => {
            const { x, y } = NODE_POS[id];
            const ch = CHANNELS[id];
            const lit = current.from === id || current.to === id;
            const labelY = id === "seo" ? y - 46 : y + 56;
            return (
              <g key={id} className="transition-opacity duration-500">
                <circle
                  cx={x}
                  cy={y}
                  r="30"
                  fill="var(--card)"
                  stroke={ch.cssVar}
                  strokeOpacity={lit ? 0.9 : 0.3}
                  strokeWidth={lit ? 2 : 1.25}
                  className="transition-all duration-500"
                />
                <text
                  x={x}
                  y={labelY}
                  textAnchor="middle"
                  fill={ch.cssVar}
                  fillOpacity={lit ? 1 : 0.55}
                  className="font-mono text-[13px] tracking-[0.14em] transition-all duration-500"
                >
                  {ch.short}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Icons ride on top as HTML — well inside the arc clearance, so they never collide. */}
        {(Object.keys(NODE_POS) as ChannelId[]).map((id) => {
          const { x, y } = NODE_POS[id];
          const ch = CHANNELS[id];
          const Icon = ch.icon;
          const lit = current.from === id || current.to === id;
          return (
            <span
              key={id}
              aria-hidden="true"
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(x / 400) * 100}%`, top: `${(y / 380) * 100}%` }}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-opacity duration-500",
                  ch.text,
                  lit ? "opacity-100" : "opacity-45"
                )}
              />
            </span>
          );
        })}
      </div>

      {/* The live readout. Without this the board is a pretty diagram; with it, it is a claim. */}
      <div className="mt-2 rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur">
        <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em]">
          <span className={CHANNELS[current.from].text}>{CHANNELS[current.from].short}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          <span className={CHANNELS[current.to].text}>{CHANNELS[current.to].short}</span>
        </p>
        <p aria-live="polite" className="mt-2 text-sm leading-snug">
          <span className="text-muted-foreground">{current.trigger}</span>{" "}
          <span className="text-muted-foreground/50">→</span>{" "}
          <span className="font-medium">{current.result}</span>
        </p>
        <div className="mt-3 flex gap-1" role="tablist" aria-label="Bridges">
          {EDGES.map((e, i) => (
            <button
              key={`${e.from}-${e.to}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`${CHANNELS[e.from].name} to ${CHANNELS[e.to].name}: ${e.result}`}
              onClick={() => setActive(i)}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                i === active ? "bg-primary" : "bg-border hover:bg-muted-foreground/40"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
