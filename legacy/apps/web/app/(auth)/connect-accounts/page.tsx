"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, BadgeDollarSign, Instagram, BarChart3, Globe } from "lucide-react";
import { Button } from "@/components/ui/Button";

const platforms = [
  { name: "Google Search Console", icon: Search },
  { name: "Google Ads", icon: BadgeDollarSign },
  { name: "Meta Ads (Facebook)", icon: Instagram },
  { name: "Google Analytics 4", icon: BarChart3 },
  { name: "Website", icon: Globe },
];

export default function ConnectAccountsPage() {
  const router = useRouter();
  const [connected, setConnected] = useState<string[]>([]);

  return (
    <div className="max-w-sm w-full space-y-4">
      <h1 className="text-heading-1">Connect your accounts</h1>
      <p className="text-small text-neutral">You can add more later.</p>
      <div className="space-y-2">
        {platforms.map((p) => {
          const Icon = p.icon;
          const isConnected = connected.includes(p.name);
          return (
            <div key={p.name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm"><Icon className="h-4 w-4 text-neutral" /> {p.name}</div>
              <button
                onClick={() => setConnected((c) => (isConnected ? c.filter((n) => n !== p.name) : [...c, p.name]))}
                className={`text-small font-medium ${isConnected ? "text-success" : "text-primary"}`}
              >
                {isConnected ? "Connected ✓" : "Connect"}
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between pt-2">
        <button className="text-small text-neutral" onClick={() => router.push("/business-info")}>Skip for now</button>
        <Button onClick={() => router.push("/business-info")}>Continue</Button>
      </div>
    </div>
  );
}
