import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { cn } from "@/lib/utils/cn";

/**
 * The trial offer, at the top of a page rather than the bottom of it.
 *
 * Every secondary page used to hold its call to action in a bordered box below the last section,
 * which meant a reader who was already convinced by the headline had to scroll past the entire
 * argument to act on it. This sits directly under the dek — one button and the three facts that
 * answer the objection it raises.
 *
 * Deliberately the same button, the same words and the same microcopy as the Hero: an action keeps
 * its name across the whole site, and "Start free" appearing as "Get started" one page over is how
 * a reader loses track of whether they are being offered the same thing.
 */
export function InlineCTA({ className }: { className?: string }) {
  return (
    <div className={cn("mt-8 flex flex-wrap items-center gap-x-5 gap-y-3", className)}>
      <Button asChild>
        <Link href="/sign-up">
          Start free
          <ArrowRight />
        </Link>
      </Button>
      <p className="font-mono text-[11px] tracking-[0.1em] text-muted-foreground">
        14-DAY GROWTH TRIAL <span className="text-border">·</span> NO CARD{" "}
        <span className="text-border">·</span> READ-ONLY CONNECTIONS
      </p>
    </div>
  );
}
