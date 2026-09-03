"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";
import { cn } from "@/lib/utils/cn";

/**
 * An image address, with the thumbnail that proves it resolved.
 *
 * Both forms are first-class, and the help text says so: an absolute `https://…` URL, or a
 * site-relative `/blog/…` path pointing at a file committed to `apps/web/public/blog/`. The second
 * is the one that costs nothing and needs no account, and a field that only mentioned URLs would
 * hide it.
 *
 * The preview is the point. A pasted address is a string that either works or silently does not,
 * and finding out on the published page is finding out too late.
 */

/** Same shape PostBody will accept. Anything else will not render, so it must not look accepted. */
export function isUsableImageAddress(value: string): boolean {
  const url = value.trim();
  if (url === "") return false;
  if (url.startsWith("/")) return true;
  return /^https?:\/\/\S+$/i.test(url);
}

export function ImageAddressField({
  id,
  label,
  value,
  onChange,
  optional,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const usable = isUsableImageAddress(value);
  const touched = value.trim().length > 0;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {optional && <span className="text-muted-foreground"> — optional</span>}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setBroken(false);
        }}
        placeholder="https://… or /blog/hero.jpg"
        aria-invalid={touched && !usable}
      />

      {touched && !usable && (
        <p className="text-xs text-destructive">
          Use a full https:// address, or a path starting with / for a file in public/.
        </p>
      )}

      {usable && (
        <div
          className={cn(
            "mt-2 flex h-28 items-center justify-center overflow-hidden rounded-lg border bg-muted/30",
            broken && "border-dashed"
          )}
        >
          {broken ? (
            <p className="flex items-center gap-2 px-3 text-xs text-muted-foreground">
              <ImageOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Nothing loaded from that address.
            </p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value.trim()}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setBroken(true)}
            />
          )}
        </div>
      )}
    </div>
  );
}
