"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "../lib/utils";
import { Dialog, DialogContent, DialogTitle } from "./dialog";

/**
 * A command palette, built on cmdk.
 *
 * The filtering, keyboard model (arrows, enter, escape) and active-item scrolling all come from
 * cmdk; everything here is the house style. `CommandDialog` is the form the admin console uses —
 * the palette is that surface's primary navigation, not a shortcut bolted onto a sidebar.
 */
const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground",
      className
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

/**
 * The palette in a dialog.
 *
 * Three overrides on `DialogContent` earn their keep: `p-0`/`gap-0` because the palette owns its
 * own spacing; `[&>button:last-of-type]:hidden` to drop the dialog's corner close button, since a
 * palette is dismissed with Escape or by clicking away and a close affordance floating over the
 * result list is just clutter; and a top-anchored position rather than dead-centre, because a
 * palette grows downward as results arrive and a vertically centred one would jump on every
 * keystroke.
 *
 * `title` is rendered for screen readers only — Radix requires an accessible name on every dialog,
 * and a visible heading above a search field would be repeating what the placeholder already says.
 */
function CommandDialog({
  children,
  title = "Search",
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  title?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "top-[12vh] max-w-xl translate-y-0 gap-0 overflow-hidden p-0",
          "[&>button:last-of-type]:hidden",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "motion-reduce:animate-none"
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <Command
          // Groups whose items all filter out should disappear with their heading.
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5"
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center gap-2.5 border-b px-3.5">
    <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[60vh] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="px-3.5 py-8 text-center text-sm text-muted-foreground"
    {...props}
  />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn("overflow-hidden py-1.5 text-foreground", className)}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator ref={ref} className={cn("h-px bg-border", className)} {...props} />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2.5 text-sm outline-none",
      "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
      "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
      className
    )}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

/** Right-aligned hint inside an item — a keyboard shortcut, or what kind of thing the row is. */
function CommandShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("ml-auto font-mono text-xs tracking-wide text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
