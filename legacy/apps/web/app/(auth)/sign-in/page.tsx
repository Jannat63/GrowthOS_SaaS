"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { signIn, storeSession } from "@/lib/api/auth";

export default function SignInPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const auth = await signIn(form);
      storeSession(auth);
      router.push("/growth-hub");
    } catch (e: any) {
      setError(
        e?.status === 401
          ? "Incorrect email or password."
          : "Couldn't sign in — is the backend running? (docker compose up)"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm w-full space-y-5">
      <h1 className="text-heading-1">Welcome back 👋</h1>
      {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}
      <Button variant="secondary" className="w-full" onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/google/login`}>Continue with Google</Button>
      <Input placeholder="Work email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <Button className="w-full" loading={loading} onClick={handleSubmit}>Sign In</Button>
      <p className="text-center text-small text-neutral">
        Don't have an account? <Link href="/sign-up" className="text-primary">Sign up</Link>
      </p>
    </div>
  );
}
