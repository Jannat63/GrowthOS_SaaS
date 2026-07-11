import { Badge } from "@growthos/ui/components/badge";
import { cn } from "@/lib/utils/cn";

/** Surfaces whether the data on screen came from the live API or a local mock fallback. */
export function DataSourceBadge({
  source,
  className,
}: {
  source: "live" | "mock";
  className?: string;
}) {
  const live = source === "live";
  return (
    <Badge variant={live ? "success" : "muted"} className={className}>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          live ? "bg-success" : "bg-muted-foreground"
        )}
      />
      {live ? "Live data" : "Mock data"}
    </Badge>
  );
}
