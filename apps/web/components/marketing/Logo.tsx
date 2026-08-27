import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { LogoMark } from "@/components/brand/LogoMark";

export { LogoMark };

export function Logo({
  className,
  href = "/",
  wordmarkClassName,
}: {
  className?: string;
  href?: string | null;
  wordmarkClassName?: string;
}) {
  const content = (
    <>
      <LogoMark />
      <span
        className={cn(
          "font-display text-[1.0625rem] font-bold tracking-tight",
          wordmarkClassName
        )}
      >
        GrowthOS
      </span>
    </>
  );

  if (href === null) {
    return <span className={cn("inline-flex items-center gap-2.5", className)}>{content}</span>;
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      {content}
    </Link>
  );
}
