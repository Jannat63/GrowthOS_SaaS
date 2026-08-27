import { MDXRemote } from "next-mdx-remote/rsc";

/**
 * Prose styling for post bodies.
 *
 * Done as a component map rather than by adding @tailwindcss/typography: the plugin ships an
 * opinionated colour scale of its own that would need overriding token by token to respect the
 * theme, which is more work than the eight elements a post actually uses.
 */
const components = {
  h2: (props: React.ComponentProps<"h2">) => (
    <h2
      className="mt-12 scroll-mt-24 font-display text-2xl font-bold tracking-tight"
      {...props}
    />
  ),
  h3: (props: React.ComponentProps<"h3">) => (
    <h3 className="mt-9 font-display text-lg font-semibold tracking-tight" {...props} />
  ),
  p: (props: React.ComponentProps<"p">) => (
    <p className="mt-5 leading-[1.75] text-muted-foreground" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul className="mt-5 space-y-2.5 pl-5 text-muted-foreground [&>li]:list-disc" {...props} />
  ),
  ol: (props: React.ComponentProps<"ol">) => (
    <ol className="mt-5 space-y-2.5 pl-5 text-muted-foreground [&>li]:list-decimal" {...props} />
  ),
  li: (props: React.ComponentProps<"li">) => <li className="leading-[1.7] pl-1.5" {...props} />,
  strong: (props: React.ComponentProps<"strong">) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  a: (props: React.ComponentProps<"a">) => (
    <a className="text-primary underline underline-offset-4" {...props} />
  ),
  blockquote: (props: React.ComponentProps<"blockquote">) => (
    <blockquote
      className="mt-6 border-l-2 border-primary pl-5 italic text-muted-foreground"
      {...props}
    />
  ),
  code: (props: React.ComponentProps<"code">) => (
    <code
      className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
      {...props}
    />
  ),
  pre: (props: React.ComponentProps<"pre">) => (
    <pre
      className="mt-6 overflow-x-auto rounded-xl border bg-muted/50 p-5 font-mono text-sm [&>code]:bg-transparent [&>code]:p-0"
      {...props}
    />
  ),
  hr: () => <hr className="mt-10 border-t" />,
};

export function MdxContent({ source }: { source: string }) {
  return <MDXRemote source={source} components={components} />;
}
