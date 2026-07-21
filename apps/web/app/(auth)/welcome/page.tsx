"use client";

import Link from "next/link";
import { ArrowRight, Repeat } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { Button } from "@growthos/ui/components/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function WelcomePage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div className="loop-backdrop relative flex min-h-screen flex-col bg-muted/20">
      <header className="flex h-16 items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary-foreground" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            GrowthOS
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 items-center justify-center px-6 pb-20">
        <div className="w-full max-w-lg animate-rise rounded-2xl border bg-card p-10 text-center shadow-xl shadow-black/[0.04] dark:shadow-black/30">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground ring-8 ring-primary/10">
            <Repeat className="h-7 w-7" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">
            {firstName ? `Welcome, ${firstName}.` : "Welcome to GrowthOS."}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-muted-foreground">
            Let&rsquo;s set up your workspace and connect your first channels. It
            takes about three minutes, and you can change anything later.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="group w-full sm:w-auto">
              <Link href="/business-info">
                Set up my workspace
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
