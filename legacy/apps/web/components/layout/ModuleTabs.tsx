"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export interface ModuleTabItem {
  label: string;
  href: string;
}

export function ModuleTabs({ items }: { items: ModuleTabItem[] }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-6 overflow-x-auto">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-2.5 text-small font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-neutral hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
