"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { signUp } from "@/lib/api/auth";
import { storeSession } from "@/lib/api/auth";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const auth = await signUp({ fullName: form.name, email: form.email, password: form.password });
      storeSession(auth);
      router.push("/create-workspace");
    } catch (e: any) {
      setError(
        e?.status === 409
          ? "An account with this email already exists."
          : "Couldn't create your account — is the backend running? (docker compose up)"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm w-full space-y-5">
      <div>
        <h1 className="text-heading-1">Create your GrowthOS account</h1>
        <p className="text-small text-neutral">Start your 14-day free trial. No credit card required.</p>
      </div>
      {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}
      <Button variant="secondary" className="w-full" disabled>Sign up with Google (not wired yet)</Button>
      <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input placeholder="Work email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <Button className="w-full" loading={loading} onClick={handleSubmit}>Create Account</Button>
      <p className="text-center text-small text-neutral">
        Already have an account? <Link href="/sign-in" className="text-primary">Sign in</Link>
      </p>
    </div>
  );
}
