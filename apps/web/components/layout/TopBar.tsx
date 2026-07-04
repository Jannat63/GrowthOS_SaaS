"use client";

import { useEffect, useState } from "react";
import { Bell, Calendar, RefreshCw } from "lucide-react";
import { getStoredUser } from "@/lib/api/auth";

interface TopBarProps {
  greeting?: string;
  subtitle?: string;
  dateRange?: string;
  notificationCount?: number;
}

export function TopBar({
  greeting = "Good morning",
  subtitle,
  dateRange = "May 6 – May 12, 2026",
  notificationCount = 0,
}: TopBarProps) {
  // Reads the real signed-in user (set by sign-up/sign-in via storeSession).
  // Falls back to a demo name if nothing is stored yet (e.g. middleware
  // bypass during local dev without the backend running).
  const [userName, setUserName] = useState("Jannat Rahman");

  useEffect(() => {
    const stored = getStoredUser();
    if (stored?.fullName) setUserName(stored.fullName);
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <h1 className="text-heading-1">{greeting}, {userName.split(" ")[0]} 👋</h1>
        {subtitle && <p className="text-body text-neutral mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 h-9 text-small text-ink">
          <Calendar className="h-4 w-4 text-neutral" />
          {dateRange}
        </button>

        <button
          aria-label="Refresh"
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-neutral hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        <button
          aria-label="Notifications"
          className="relative h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-neutral hover:bg-slate-50"
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-danger text-white text-[10px] flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </button>

        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-small font-medium">
          {userName
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
      </div>
    </header>
  );
}
