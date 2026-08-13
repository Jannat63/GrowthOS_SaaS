"use client";
import { Badge } from "@growthos/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@growthos/ui/components/tooltip";
import { cn } from "@/lib/utils/cn";
import {
  useDataProvenance,
  type DataProvenance,
  type ProvenancePlatform,
} from "@/lib/hooks/useDataProvenance";

/**
 * Says where the numbers beside it came from.
 *
 * Pass `platform` on anything backed by an external provider. Without it the badge can only report
 * whether the API answered, which is what previously let seeded data render as "Live data" — see
 * useDataProvenance for the full reasoning.
 */
const COPY: Record<
  DataProvenance,
  { label: string; explain: string; dot: string; variant: "success" | "warning" | "muted" }
> = {
  live: {
    label: "Live data",
    explain: "Synced from your connected account.",
    dot: "bg-success",
    variant: "success",
  },
  sample: {
    label: "Sample data",
    explain:
      "Demonstration figures, not your account. Connect this channel in Settings to see your own numbers.",
    dot: "bg-warning",
    variant: "warning",
  },
  offline: {
    label: "Offline estimate",
    explain:
      "The server could not be reached, so this was calculated locally from example data. It is not your account.",
    dot: "bg-muted-foreground",
    variant: "muted",
  },
};

export function DataSourceBadge({
  source,
  platform,
  className,
}: {
  source: "live" | "mock" | undefined;
  /**
   * The provider(s) this view's data comes from — use `MODULE_PLATFORMS` rather than a literal.
   * Omit only for views with no external source (settings, billing, activity).
   */
  platform?: ProvenancePlatform | readonly ProvenancePlatform[];
  className?: string;
}) {
  const provenance = useDataProvenance(source, platform);
  const { label, explain, dot, variant } = COPY[provenance];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={variant} className={cn("cursor-help", className)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-[16rem]">{explain}</TooltipContent>
    </Tooltip>
  );
}
