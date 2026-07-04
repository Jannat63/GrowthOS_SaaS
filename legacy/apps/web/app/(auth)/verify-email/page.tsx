"use client";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function VerifyEmailPage() {
  const router = useRouter();
  return (
    <div className="max-w-sm w-full text-center space-y-4">
      <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
        <Mail className="h-6 w-6" />
      </div>
      <h1 className="text-heading-1">Verify your email</h1>
      <p className="text-small text-neutral">We've sent a verification link to your inbox. Click it to continue.</p>
      <Button className="w-full" onClick={() => router.push("/create-workspace")}>I've verified — Continue</Button>
    </div>
  );
}
