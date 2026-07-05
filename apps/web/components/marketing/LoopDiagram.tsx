import { Search, MousePointerClick, Megaphone } from "lucide-react";

type Node = {
  label: string;
  metric: string;
  icon: typeof Search;
  tone: "primary" | "success";
  pos: string; // absolute positioning classes for the chip center
};

const NODES: Node[] = [
  {
    label: "SEO",
    metric: "+18% organic clicks",
    icon: Search,
    tone: "success",
    pos: "left-1/2 top-[12%]",
  },
  {
    label: "Google Ads",
    metric: "12 new search terms",
    icon: MousePointerClick,
    tone: "primary",
    pos: "left-[82%] top-[69%]",
  },
  {
    label: "Meta Ads",
    metric: "fatigue caught early",
    icon: Megaphone,
    tone: "primary",
    pos: "left-[18%] top-[69%]",
  },
];

export function LoopDiagram() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[30rem]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 rounded-full bg-primary/10 blur-3xl" />

      {/* Loop rings + spokes */}
      <svg
        viewBox="0 0 320 320"
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden="true"
      >
        {/* faint outer ring, slow reverse drift */}
        <circle
          cx="160"
          cy="160"
          r="120"
          fill="none"
          stroke="var(--color-primary)"
          strokeOpacity="0.15"
          strokeWidth="1"
        />
        {/* the insight loop — data flowing clockwise */}
        <circle
          cx="160"
          cy="160"
          r="120"
          fill="none"
          stroke="var(--color-primary)"
          strokeOpacity="0.55"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="2 12"
          className="loop-flow"
        />
        {/* spokes to the hub */}
        {[
          [160, 40],
          [263.9, 220],
          [56.1, 220],
        ].map(([x, y], i) => (
          <line
            key={i}
            x1="160"
            y1="160"
            x2={x}
            y2={y}
            stroke="var(--color-primary)"
            strokeOpacity="0.18"
            strokeWidth="1.5"
          />
        ))}
        {/* node anchor dots */}
        {[
          [160, 40, "var(--color-success)"],
          [263.9, 220, "var(--color-primary)"],
          [56.1, 220, "var(--color-primary)"],
        ].map(([x, y, c], i) => (
          <circle key={i} cx={x as number} cy={y as number} r="4" fill={c as string} />
        ))}
      </svg>

      {/* Central hub */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center rounded-2xl border bg-card px-5 py-4 text-center shadow-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <span className="h-3 w-3 rounded-sm bg-primary-foreground" />
          </div>
          <p className="mt-2 font-display text-sm font-semibold tracking-tight">
            GrowthOS
          </p>
          <p className="text-xs text-muted-foreground">one insight loop</p>
        </div>
      </div>

      {/* Channel nodes */}
      {NODES.map(({ label, metric, icon: Icon, tone, pos }) => (
        <div
          key={label}
          className={`absolute ${pos} -translate-x-1/2 -translate-y-1/2`}
        >
          <div className="w-40 rounded-xl border bg-card px-3 py-2.5 shadow-md">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  tone === "success"
                    ? "bg-success/10 text-success"
                    : "bg-primary/10 text-primary"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold">{label}</span>
            </div>
            <p
              className={`mt-1.5 text-xs font-medium ${
                tone === "success" ? "text-success" : "text-muted-foreground"
              }`}
            >
              {metric}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
