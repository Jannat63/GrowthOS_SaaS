"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ThemeProvider } from "next-themes";
import { toast } from "sonner";
import { Toaster } from "@growthos/ui/components/sonner";
import { TooltipProvider } from "@growthos/ui/components/tooltip";
import { initAnalytics } from "@/lib/analytics";
import { ApiError } from "@/lib/api/client";

/**
 * Surfaces API failures to the user, once, wherever they happen.
 *
 * `liveOrMock` no longer answers a 4xx with fabricated data, so those errors now reach the query
 * layer — and a query that errors leaves its page on a loading skeleton, which tells the user
 * nothing. Reporting centrally through the query and mutation caches means every screen gets the
 * server's actual message ("You've reached your starter plan's limit…") without each of the dozen
 * dashboard pages growing its own error branch.
 *
 * Only ApiError is reported. A network failure is already handled by falling back to mock data, and
 * toasting that on every offline render would be noise.
 */
function reportError(err: unknown) {
  if (!(err instanceof ApiError)) return;

  if (err.code === "UNAUTHORIZED") {
    toast.error("Your session has expired. Please sign in again.");
    return;
  }
  toast.error(err.message);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: reportError }),
        mutationCache: new MutationCache({ onError: reportError }),
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            // Never retry a refusal. A 402 or 403 will be refused identically the second time; the
            // only effect is delaying the message the user needs to see.
            retry: (failureCount, err) =>
              err instanceof ApiError && err.isClientError ? false : failureCount < 1,
          },
        },
      })
  );
  useEffect(() => {
    initAnalytics();
  }, []);
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={client}>
        {/* Radix requires a provider above any Tooltip. Mounted once at the root rather than per
            usage — DataSourceBadge renders a tooltip and appears on nearly every dashboard page. */}
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster position="top-center" richColors />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
