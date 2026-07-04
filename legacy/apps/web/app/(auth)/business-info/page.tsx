"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function BusinessInfoPage() {
  const router = useRouter();
  return (
    <div className="max-w-sm w-full space-y-4">
      <h1 className="text-heading-1">Tell us about your business</h1>
      <select className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
        <option>E-commerce</option>
        <option>SaaS</option>
        <option>Local Service Business</option>
        <option>Agency</option>
      </select>
      <Input placeholder="Business website (https://...)" />
      <select className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
        <option>Monthly ad spend: $1,000 – $5,000</option>
        <option>Monthly ad spend: $5,000 – $20,000</option>
        <option>Monthly ad spend: $20,000+</option>
      </select>
      <Button className="w-full" onClick={() => router.push("/onboarding-complete")}>Continue</Button>
    </div>
  );
}
