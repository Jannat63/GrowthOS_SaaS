"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { cn } from "@/lib/utils/cn";

/**
 * Light/dark switch.
 *
 * Everything that depends on the resolved theme is gated on `mounted`. The server has no idea which
 * theme this visitor picked — `resolvedTheme` is undefined there — so any attribute derived from it
 * renders one way on the server and another after hydration. The icons were already gated; the
 * `aria-label` was not, which is what produced the `Switch to dark mode` / `Switch to light mode`
 * mismatch. Pre-mount it reads as the neutral "Toggle theme", which is accurate in both directions.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn("relative h-9 w-9 text-muted-foreground", className)}
    >
      {mounted && (
        <>
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
        </>
      )}
    </Button>
  );
}
