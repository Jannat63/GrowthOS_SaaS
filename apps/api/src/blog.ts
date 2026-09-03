import { and, asc, count, desc, eq, isNotNull, lte, ne, or, sql } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type {
  BlogPost,
  BlogPostFilter,
  BlogPostInput,
  BlogPostSort,
  BlogPostState,
  BlogPostSummary,
  RichTextDoc,
  RichTextNode,
} from '@growthos/types'
import { AppError } from './errors.js'
import type { Page, Paged } from './pagination.js'

/**
 * Marketing blog queries. Platform content, not workspace content — nothing here takes a
 * workspaceId, and the callers check a platform role rather than membership.
 *
 * See docs/superpowers/specs/2026-09-03-blog-cms-design.md.
 */

type Row = typeof schema.blogPosts.$inferSelect

// ── Derived values ──────────────────────────────────────────────────────────

/**
 * Reading time, from the word count stored on write.
 *
 * 220wpm and the floor of 1 are carried over verbatim from the MDX reader this replaces — a
 * 30-second read displayed as "0 min" was the bug that put the floor there, and changing the pace
 * now would silently restate the reading time on every existing post.
 */
export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 220))
}

/**
 * The publish state, derived from the timestamp and nothing else.
 *
 * There is no status column on purpose: one that could disagree with `published_at` would
 * eventually do so, and then two answers to "is this live" would both be defensible.
 */
export function postState(publishedAt: Date | null): BlogPostState {
  if (!publishedAt) return 'draft'
  return publishedAt.getTime() > Date.now() ? 'scheduled' : 'published'
}

/**
 * Plain text out of a ProseMirror document, for the word count and any future search.
 *
 * Block boundaries become spaces rather than being elided, or the last word of a paragraph and the
 * first of the next would be counted as one.
 */
export function toPlainText(doc: RichTextDoc | RichTextNode): string {
  const parts: string[] = []
  const walk = (node: RichTextNode) => {
    if (typeof node.text === 'string') parts.push(node.text)
    if (Array.isArray(node.content)) {
      for (const child of node.content) walk(child)
      // A block ended: keep its words separate from the next block's.
      parts.push(' ')
    }
  }
  walk(doc as RichTextNode)
  return parts.join('').replace(/\s+/g, ' ').trim()
}

export function countWords(text: string): number {
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

/**
 * URL-safe slug from a title. Latin letters, digits and hyphens only.
 *
 * Deliberately lossy for non-Latin scripts, which would collapse to an empty string — the caller
 * falls back to a generated suffix rather than writing an empty slug, because a post reachable only
 * at /blog/ is not reachable.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    // Strip the combining marks NFKD just split off, so "Zéro" becomes "zero" rather than "z-ro".
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

// ── Shaping ─────────────────────────────────────────────────────────────────

/**
 * The subset of columns a summary needs — every column except `body`, `plain_text` and
 * `created_by_user_id`. Named so the list queries can select exactly this and hand the result
 * straight to `toSummary`, instead of padding a partial row with dummy fields to satisfy `Row`.
 */
type SummaryRow = Omit<Row, 'body' | 'plainText' | 'createdByUserId'>

function toSummary(row: SummaryRow): BlogPostSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    tag: row.tag,
    coverImageUrl: row.coverImageUrl,
    coverImageAlt: row.coverImageAlt,
    author: {
      name: row.authorName,
      role: row.authorRole,
      avatarUrl: row.authorAvatarUrl,
    },
    featured: row.featured,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    state: postState(row.publishedAt),
    wordCount: row.wordCount,
    readingMinutes: readingMinutes(row.wordCount),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toPost(row: Row): BlogPost {
  return { ...toSummary(row), body: row.body as RichTextDoc }
}

/** Everything except the body — so a list query never pulls a document off the wire. */
const summaryColumns = {
  id: schema.blogPosts.id,
  slug: schema.blogPosts.slug,
  title: schema.blogPosts.title,
  description: schema.blogPosts.description,
  tag: schema.blogPosts.tag,
  coverImageUrl: schema.blogPosts.coverImageUrl,
  coverImageAlt: schema.blogPosts.coverImageAlt,
  authorName: schema.blogPosts.authorName,
  authorRole: schema.blogPosts.authorRole,
  authorAvatarUrl: schema.blogPosts.authorAvatarUrl,
  featured: schema.blogPosts.featured,
  publishedAt: schema.blogPosts.publishedAt,
  wordCount: schema.blogPosts.wordCount,
  createdAt: schema.blogPosts.createdAt,
  updatedAt: schema.blogPosts.updatedAt,
}

// ── Public reads ────────────────────────────────────────────────────────────

/**
 * The one condition that separates the public blog from the console's view of it: published, and
 * not in the future. Scheduling needs no worker because this comparison is the whole mechanism.
 */
const isLive = and(
  isNotNull(schema.blogPosts.publishedAt),
  lte(schema.blogPosts.publishedAt, sql`now()`),
)

/**
 * The public index. Featured first, then newest — so pinning a post is what it looks like.
 */
export async function listPublishedPosts(page: Page): Promise<Paged<BlogPostSummary>> {
  const [rows, [total]] = await Promise.all([
    db
      .select(summaryColumns)
      .from(schema.blogPosts)
      .where(isLive)
      .orderBy(desc(schema.blogPosts.featured), desc(schema.blogPosts.publishedAt))
      .limit(page.limit)
      .offset(page.offset),
    db.select({ value: count() }).from(schema.blogPosts).where(isLive),
  ])
  return {
    data: rows.map(toSummary),
    total: total?.value ?? 0,
  }
}

export async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  const [row] = await db
    .select()
    .from(schema.blogPosts)
    .where(and(eq(schema.blogPosts.slug, slug), isLive))
    .limit(1)
  return row ? toPost(row) : null
}

/**
 * "Keep reading" on a post page. Published, not this one, newest first.
 *
 * Done as its own query rather than by fetching the whole index and filtering, which is what the
 * file-based version did — cheap when posts were three files on disk, a full table scan once they
 * are rows.
 */
export async function listRelatedPosts(excludeSlug: string, limit = 2): Promise<BlogPostSummary[]> {
  const rows = await db
    .select(summaryColumns)
    .from(schema.blogPosts)
    .where(and(isLive, ne(schema.blogPosts.slug, excludeSlug)))
    .orderBy(desc(schema.blogPosts.publishedAt))
    .limit(limit)
  return rows.map(toSummary)
}

/** Slugs for `generateStaticParams`, and nothing else — so the build does not fetch every body. */
export async function listPublishedSlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: schema.blogPosts.slug })
    .from(schema.blogPosts)
    .where(isLive)
    .orderBy(desc(schema.blogPosts.publishedAt))
  return rows.map((r) => r.slug)
}

// ── Console reads ───────────────────────────────────────────────────────────

export interface PostListOptions {
  filter?: BlogPostFilter | undefined
  sort?: BlogPostSort | undefined
  search?: string | undefined
}

/**
 * The console list — drafts included, which is the whole difference from the public one.
 *
 * The filters are expressed against `published_at` for the same reason the state is derived from it:
 * "scheduled" is not a flag anyone sets, it is what a future date means.
 */
export async function listAllPosts(page: Page, options: PostListOptions = {}): Promise<Paged<BlogPostSummary>> {
  const conditions = []

  if (options.filter === 'draft') {
    conditions.push(sql`${schema.blogPosts.publishedAt} is null`)
  } else if (options.filter === 'scheduled') {
    conditions.push(and(isNotNull(schema.blogPosts.publishedAt), sql`${schema.blogPosts.publishedAt} > now()`))
  } else if (options.filter === 'published') {
    conditions.push(isLive)
  }

  if (options.search) {
    const term = `%${options.search}%`
    conditions.push(
      or(
        sql`${schema.blogPosts.title} ilike ${term}`,
        sql`${schema.blogPosts.slug} ilike ${term}`,
        sql`${schema.blogPosts.plainText} ilike ${term}`,
      ),
    )
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  // Default is `updated`: the console's list is a workbench, and the post you were last editing is
  // the one you are most likely coming back to. Nulls last on `published` keeps drafts from
  // occupying the top of a list ordered by publication.
  const order =
    options.sort === 'title'
      ? asc(schema.blogPosts.title)
      : options.sort === 'published'
        ? sql`${schema.blogPosts.publishedAt} desc nulls last`
        : desc(schema.blogPosts.updatedAt)

  const [rows, [total]] = await Promise.all([
    db.select(summaryColumns).from(schema.blogPosts).where(where).orderBy(order).limit(page.limit).offset(page.offset),
    db.select({ value: count() }).from(schema.blogPosts).where(where),
  ])

  return {
    data: rows.map(toSummary),
    total: total?.value ?? 0,
  }
}

export async function getPostById(id: string): Promise<BlogPost | null> {
  const [row] = await db.select().from(schema.blogPosts).where(eq(schema.blogPosts.id, id)).limit(1)
  return row ? toPost(row) : null
}

// ── Writes ──────────────────────────────────────────────────────────────────

/**
 * Makes a slug unique by appending -2, -3, … rather than rejecting the save.
 *
 * Two posts can legitimately want the same title; failing the write and asking the writer to invent
 * a different address is making them solve the database's problem.
 */
async function uniqueSlug(desired: string, excludeId?: string): Promise<string> {
  const base = desired || `post-${Date.now().toString(36)}`
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`
    const [clash] = await db
      .select({ id: schema.blogPosts.id })
      .from(schema.blogPosts)
      .where(eq(schema.blogPosts.slug, candidate))
      .limit(1)
    if (!clash || clash.id === excludeId) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

function derived(body: RichTextDoc) {
  const plainText = toPlainText(body)
  return { plainText, wordCount: countWords(plainText) }
}

export async function createPost(input: BlogPostInput, authorFallback: { userId: string; name: string }): Promise<BlogPost> {
  const slug = await uniqueSlug(slugify(input.slug || input.title))
  const [row] = await db
    .insert(schema.blogPosts)
    .values({
      slug,
      title: input.title,
      description: input.description,
      body: input.body,
      ...derived(input.body),
      tag: input.tag ?? 'Notes',
      coverImageUrl: input.coverImageUrl ?? null,
      coverImageAlt: input.coverImageAlt ?? null,
      authorName: input.authorName?.trim() || authorFallback.name,
      authorRole: input.authorRole ?? null,
      authorAvatarUrl: input.authorAvatarUrl ?? null,
      createdByUserId: authorFallback.userId,
    })
    .returning()
  return toPost(row!)
}

export async function updatePost(id: string, input: BlogPostInput): Promise<BlogPost> {
  const existing = await getPostById(id)
  if (!existing) throw new AppError('NOT_FOUND', 'No post with that ID.')

  // Only re-resolve the slug when it actually changed, so an ordinary save cannot walk a post from
  // `my-post` to `my-post-2` by colliding with itself.
  const desired = slugify(input.slug || existing.slug)
  const slug = desired === existing.slug ? existing.slug : await uniqueSlug(desired, id)

  const [row] = await db
    .update(schema.blogPosts)
    .set({
      slug,
      title: input.title,
      description: input.description,
      body: input.body,
      ...derived(input.body),
      tag: input.tag ?? existing.tag,
      coverImageUrl: input.coverImageUrl ?? null,
      coverImageAlt: input.coverImageAlt ?? null,
      authorName: input.authorName?.trim() || existing.author.name,
      authorRole: input.authorRole ?? null,
      authorAvatarUrl: input.authorAvatarUrl ?? null,
      updatedAt: new Date(),
    })
    .where(eq(schema.blogPosts.id, id))
    .returning()
  return toPost(row!)
}

/** `at` in the future schedules; absent means now. */
export async function publishPost(id: string, at?: Date): Promise<BlogPost> {
  const [row] = await db
    .update(schema.blogPosts)
    .set({ publishedAt: at ?? new Date(), updatedAt: new Date() })
    .where(eq(schema.blogPosts.id, id))
    .returning()
  if (!row) throw new AppError('NOT_FOUND', 'No post with that ID.')
  return toPost(row)
}

export async function unpublishPost(id: string): Promise<BlogPost> {
  const [row] = await db
    .update(schema.blogPosts)
    .set({ publishedAt: null, updatedAt: new Date() })
    .where(eq(schema.blogPosts.id, id))
    .returning()
  if (!row) throw new AppError('NOT_FOUND', 'No post with that ID.')
  return toPost(row)
}

/**
 * Pin or unpin. Clearing the previous pin first is required, not tidy: the partial unique index
 * would reject the second featured row, and the operator would get a constraint error for doing the
 * obvious thing.
 */
export async function setFeatured(id: string, featured: boolean): Promise<BlogPost> {
  if (featured) {
    await db
      .update(schema.blogPosts)
      .set({ featured: false })
      .where(and(eq(schema.blogPosts.featured, true), ne(schema.blogPosts.id, id)))
  }
  const [row] = await db
    .update(schema.blogPosts)
    .set({ featured, updatedAt: new Date() })
    .where(eq(schema.blogPosts.id, id))
    .returning()
  if (!row) throw new AppError('NOT_FOUND', 'No post with that ID.')
  return toPost(row)
}

/**
 * Deletes a draft.
 *
 * A published post is refused rather than deleted, and this is the one safety rail on a surface that
 * deliberately has no step-up password (D-B4): every other write here is reversible in a click, but
 * deleting a live post breaks every link to it on the internet. Unpublish first, then delete — two
 * deliberate steps instead of one password prompt that would get typed reflexively.
 */
export async function deletePost(id: string): Promise<void> {
  const existing = await getPostById(id)
  if (!existing) throw new AppError('NOT_FOUND', 'No post with that ID.')
  if (existing.publishedAt) {
    throw new AppError(
      'VALIDATION_ERROR',
      'This post is published. Unpublish it first — deleting it now would break every link to it.',
    )
  }
  await db.delete(schema.blogPosts).where(eq(schema.blogPosts.id, id))
}
