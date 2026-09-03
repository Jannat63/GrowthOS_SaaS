/**
 * One-off: import the three MDX blog posts into `blog_posts`, then the files can go.
 *
 *   pnpm --filter @growthos/api exec tsx --env-file=.env scripts/migrate-blog-mdx.ts
 *
 * Idempotent — a slug already in the table is skipped, so running it twice is safe and running it
 * after someone has edited a migrated post in the console will not overwrite their work.
 *
 * Markdown parsing lives in ./markdown-to-doc.ts, shared with the blog seed.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db, schema } from '@growthos/db'
import { eq } from 'drizzle-orm'
import { countWords, toPlainText } from '../src/blog.js'
import { parseMarkdown } from './markdown-to-doc.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const BLOG_DIR = path.resolve(HERE, '../../web/content/blog')

/** Migrated posts get the house byline; there was no author in the frontmatter to carry over. */
const DEFAULT_AUTHOR = 'The GrowthOS team'

// ── Frontmatter ─────────────────────────────────────────────────────────────

interface Frontmatter {
  title: string
  description: string
  date: string
  tag: string
}

function parseFrontmatter(raw: string): { data: Frontmatter; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!match) throw new Error('No frontmatter block')
  const data: Record<string, string> = {}
  for (const line of match[1]!.split(/\r?\n/)) {
    const kv = /^(\w+):\s*(.*)$/.exec(line)
    if (!kv) continue
    // Strip one layer of surrounding quotes; the three files quote every value.
    data[kv[1]!] = kv[2]!.trim().replace(/^["'](.*)["']$/s, '$1')
  }
  return {
    data: {
      title: data.title ?? '',
      description: data.description ?? '',
      date: data.date ?? '',
      tag: data.tag ?? 'Notes',
    },
    body: raw.slice(match[0].length),
  }
}

// ── Run ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(BLOG_DIR)) {
    console.log(`Nothing to migrate — ${BLOG_DIR} does not exist.`)
    return
  }

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'))
  if (files.length === 0) {
    console.log('Nothing to migrate — no .mdx files found.')
    return
  }

  let imported = 0
  let skipped = 0

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, '')
    const [existing] = await db
      .select({ id: schema.blogPosts.id })
      .from(schema.blogPosts)
      .where(eq(schema.blogPosts.slug, slug))
      .limit(1)

    if (existing) {
      console.log(`  skip  ${slug} (already imported)`)
      skipped++
      continue
    }

    const { data, body } = parseFrontmatter(fs.readFileSync(path.join(BLOG_DIR, file), 'utf8'))
    const doc = parseMarkdown(body)
    const plainText = toPlainText(doc)
    const publishedAt = data.date ? new Date(data.date) : new Date()

    await db.insert(schema.blogPosts).values({
      slug,
      title: data.title || slug,
      description: data.description,
      body: doc,
      plainText,
      wordCount: countWords(plainText),
      tag: data.tag,
      authorName: DEFAULT_AUTHOR,
      publishedAt: Number.isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
    })

    console.log(`  ok    ${slug} — ${countWords(plainText)} words, ${doc.content?.length ?? 0} blocks`)
    imported++
  }

  console.log(`\nImported ${imported}, skipped ${skipped}.`)
  if (imported > 0) {
    console.log('The MDX files can now be deleted; blog_posts is the source of truth.')
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
