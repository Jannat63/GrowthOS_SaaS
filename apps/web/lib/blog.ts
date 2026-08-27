import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/**
 * Local MDX, read at build time. No CMS and no database call — posts are files in the repo, so
 * they version with the code and cost nothing to serve. Swap the reader if that ever changes;
 * every consumer goes through these three functions.
 */

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  /** ISO date. */
  date: string;
  tag: string;
  readingMinutes: number;
};

export type Post = PostMeta & { body: string };

function readFileForSlug(slug: string) {
  const full = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

function toMeta(slug: string, raw: string): Post {
  const { data, content } = matter(raw);
  const words = content.trim().split(/\s+/).length;
  return {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ""),
    date: String(data.date ?? ""),
    tag: String(data.tag ?? "Notes"),
    // 220wpm is a reasonable pace for this kind of prose; rounded up so a 30-second read
    // never displays as "0 min".
    readingMinutes: Math.max(1, Math.round(words / 220)),
    body: content,
  };
}

export function getPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

export function getPost(slug: string): Post | null {
  const raw = readFileForSlug(slug);
  return raw ? toMeta(slug, raw) : null;
}

export function getAllPosts(): PostMeta[] {
  return getPostSlugs()
    .map((slug) => getPost(slug))
    .filter((p): p is Post => p !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(({ body: _body, ...meta }) => meta);
}

export function formatPostDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
