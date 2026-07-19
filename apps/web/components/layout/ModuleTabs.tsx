import { cn } from "@/lib/utils/cn";

/** In-module sub-navigation. Anchors to sections on the current module page. */
export function ModuleTabs({
  tabs,
  activeHref,
}: {
  tabs: { label: string; href: string }[];
  activeHref: string;
}) {
  return (
    <nav className="flex gap-6 border-b">
      {tabs.map((tab) => {
        const active = tab.href === activeHref;
        return (
          <a
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px border-b-2 py-3 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}
