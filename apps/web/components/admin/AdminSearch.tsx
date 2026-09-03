"use client";
import { Search } from "lucide-react";
import { Input } from "@growthos/ui/components/input";

/**
 * The search box shared by the workspace and user tables — previously a hand-rolled `<input>`
 * duplicated in both, each carrying its own copy of shadcn's focus-ring classes.
 */
export function AdminSearch({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="relative max-w-sm">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="pl-9"
      />
    </div>
  );
}
