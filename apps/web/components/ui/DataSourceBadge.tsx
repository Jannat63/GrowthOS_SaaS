import { Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function DataSourceBadge({ source }: { source: "live" | "mock" | undefined }) {
  if (!source) return null;
  return source === "live" ? (
    <Badge tone="success" className="inline-flex items-center gap-1">
      <Wifi className="h-3 w-3" /> Live backend
    </Badge>
  ) : (
    <Badge tone="neutral" className="inline-flex items-center gap-1">
      <WifiOff className="h-3 w-3" /> Local fallback — backend not running
    </Badge>
  );
}
