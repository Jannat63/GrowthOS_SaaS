import { Construction } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function SkeletonPlaceholder({ pageName }: { pageName: string }) {
  return (
    <Card className="flex flex-col items-center justify-center text-center py-16">
      <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
        <Construction className="h-5 w-5" />
      </div>
      <div className="text-heading-2 mb-1">{pageName}</div>
      <p className="text-body text-neutral max-w-sm">
        This page is scaffolded and reachable, but not built out yet — skeleton stage.
        Real layout and logic come in a later pass.
      </p>
    </Card>
  );
}
