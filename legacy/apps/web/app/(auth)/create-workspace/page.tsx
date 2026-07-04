"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function CreateWorkspacePage() {
  const router = useRouter();
  return (
    <div className="max-w-sm w-full space-y-4">
      <h1 className="text-heading-1">Let's create your workspace</h1>
      <p className="text-small text-neutral">This will be the home for your projects and team.</p>
      <Input placeholder="Workspace name" defaultValue="Acme Marketing" />
      <select className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
        <option>Marketing Agency</option>
        <option>E-commerce Business</option>
        <option>In-house Team</option>
      </select>
      <Button className="w-full" onClick={() => router.push("/connect-accounts")}>Continue</Button>
    </div>
  );
}
