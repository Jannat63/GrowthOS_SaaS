"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../lib/utils";

const Tabs = TabsPrimitive.Root;

/**
 * The track wraps instead of running off the side of the screen.
 *
 * It was `inline-flex h-10` with nowrap triggers, so a strip of six — SEO's "Rank tracker /
 * Clusters / Organic traffic / Site audit / Schema markup / Internal links" comes to roughly
 * 560px — simply ran past the edge, and the last two tabs could not be reached at all. That is
 * not only a phone problem: at 768-870px the sidebar takes more width than the viewport gains,
 * so the strip overflows there too, on a screen nobody would think to test.
 *
 * Wrapping over scrolling, because a scrollable strip needs an affordance to be discoverable and
 * has none here; wrapped rows are always visible and need nothing explained. `max-w-full` is what
 * makes it possible — an inline-flex box is max-content wide by default and would keep overflowing
 * however the items were told to wrap. `gap-y-1` separates the rows without moving a single tab
 * horizontally, so a strip that already fits looks exactly as it did.
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex min-h-10 max-w-full flex-wrap items-center justify-start gap-y-1 rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all data-[state=inactive]:hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "tab-enter mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
