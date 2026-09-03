import Link from "next/link";
import { Button } from "@growthos/ui/components/button";
import { Logo } from "@/components/marketing/Logo";

export default function NotFound() {
  return (
    <main className="view-enter flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo />
      <p className="mt-12 font-mono text-[11px] tracking-[0.18em] text-primary">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        That page isn&rsquo;t here
      </h1>
      <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
        The link may be out of date, or the page may have moved. The exchange is still running.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/blog">Read the blog</Link>
        </Button>
      </div>
    </main>
  );
}
