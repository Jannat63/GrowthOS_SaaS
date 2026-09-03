import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Marketing blog posts, written and published from the Super Admin console.
 *
 * These were MDX files in `apps/web/content/blog/`, read with `fs` at build time. Publishing meant a
 * commit and a deploy. This table is the source of truth now; the files are gone rather than kept as
 * a fallback, because two copies of the same post would drift — the exact failure CLAUDE.md
 * documents for the seeded demo figures.
 *
 * **Platform content, not workspace content.** There is deliberately no `workspaceId` and no tenancy
 * guard: a post belongs to GrowthOS, not to a customer, and the routes that write here check a
 * platform role rather than workspace membership.
 *
 * See docs/superpowers/specs/2026-09-03-blog-cms-design.md.
 */
export const blogPosts = pgTable(
  'blog_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** The public URL segment: /blog/<slug>. Unique, and the only stable public identifier. */
    slug: text('slug').notNull(),

    /** Rendered as the page's h1 — which is why the editor's schema has no h1 of its own. */
    title: text('title').notNull(),
    /** The dek under the title, and the meta description. One field, because they should not differ. */
    description: text('description').notNull(),

    /**
     * The post body as a ProseMirror document, NOT as HTML.
     *
     * HTML would mean `dangerouslySetInnerHTML` on the highest-traffic public page in the product,
     * and it would let a post's styling escape the design system. Stored as a document, the body is
     * rendered by a React walker that emits the marketing site's own prose components, so published
     * type is on-brand by construction rather than by an author's discipline. See D-B1 in the spec.
     */
    body: jsonb('body').notNull(),

    /**
     * Plain-text projection of `body`, written on every save.
     *
     * Exists so nothing has to walk a document to count words or to search: the list endpoint reads
     * `word_count`, and a future search reads this. Derived data, never edited directly.
     */
    plainText: text('plain_text').notNull().default(''),
    /** Reading time is `ceil(word_count / 220)`, computed where it is displayed, not stored twice. */
    wordCount: integer('word_count').notNull().default(0),

    /** Single tag, as the MDX frontmatter had. Free text, title-cased for display. */
    tag: text('tag').notNull().default('Notes'),

    /**
     * Absolute `https://…` URL or a site-relative `/blog/…` path pointing at a file committed to
     * `apps/web/public/blog/`. There is no blob storage in this project yet; when there is, it will
     * produce a URL and write to this same column — no schema change, no re-migration.
     */
    coverImageUrl: text('cover_image_url'),
    coverImageAlt: text('cover_image_alt'),

    /** Defaults to the writing admin's name, but stays editable — a byline is not an audit trail. */
    authorName: text('author_name').notNull(),
    authorRole: text('author_role'),
    authorAvatarUrl: text('author_avatar_url'),

    /** At most one, enforced by the partial unique index below rather than by the console hoping. */
    featured: boolean('featured').notNull().default(false),

    /**
     * One timestamp carries all three publish states: NULL is a draft, a future value is scheduled,
     * a past value is live. The public query is `published_at <= now()`, so scheduling costs no cron
     * job and no worker — and there is no status enum that can disagree with the date.
     */
    publishedAt: timestamp('published_at', { withTimezone: true }),

    /**
     * No foreign key, deliberately — same rule as `admin_audit_log`. Authorship of a published post
     * has to outlive the staff account that wrote it; deleting an employee must not delete the
     * record of who wrote the blog.
     */
    createdByUserId: text('created_by_user_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('idx_blog_posts_slug').on(t.slug),
    index('idx_blog_posts_published').on(t.publishedAt.desc()),
    // At most one featured post, guaranteed by the database. A UI that merely clears the previous
    // pin before setting a new one is one failed request away from two.
    uniqueIndex('idx_blog_posts_featured').on(t.featured).where(sql`${t.featured}`),
  ],
);
