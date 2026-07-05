"use client";

import Link from "next/link";
import { ArrowRight, Repeat } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { Button } from "@growthos/ui/components/button";

export default function WelcomePage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-10 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Repeat className="h-6 w-6" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">
          {firstName ? `Welcome, ${firstName}.` : "Welcome to GrowthOS."}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Let&rsquo;s set up your workspace and connect your first channels. It
          takes about three minutes, and you can change anything later.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="group">
            <Link href="/business-info">
              Set up my workspace
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
