/**
 * One-off: import the three MDX blog posts into `blog_posts`, then the files can go.
 *
 *   pnpm --filter @growthos/api exec tsx --env-file=.env scripts/migrate-blog-mdx.ts
 *
 * Idempotent — a slug already in the table is skipped, so running it twice is safe and running it
 * after someone has edited a migrated post in the console will not overwrite their work.
 *
 * The Markdown parser below is deliberately small and purpose-built rather than a dependency. It
 * covers exactly the constructs the three files use (h2, h3, paragraphs, bullet and ordered lists,
 * fenced code, blockquotes, rules, and bold/italic/code/link inline), which is the same set the
 * editor's schema and the public renderer support. It runs once, against known input, and is then
 * dead code we delete — pulling `marked` plus an HTML-to-ProseMirror bridge into the API's
 * dependency tree for that would be a poor trade.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db, schema } from '@growthos/db'
import { eq } from 'drizzle-orm'
import type { RichTextDoc, RichTextNode } from '@growthos/types'
import { countWords, toPlainText } from '../src/blog.js'

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

// ── Inline ──────────────────────────────────────────────────────────────────

type Mark = { type: string; attrs?: Record<string, unknown> }

/**
 * Inline marks, matched earliest-first so nesting resolves left to right.
 *
 * Code is listed first and returns its content unparsed: `**` inside a code span is two asterisks,
 * not emphasis, and a parser that misses that mangles the one construct where literal characters
 * matter most.
 */
const INLINE_PATTERNS: Array<{ re: RegExp; build: (m: RegExpExecArray) => { text: string; mark: Mark; raw: true } | { text: string; mark: Mark } }> = [
  { re: /`([^`]+)`/, build: (m) => ({ text: m[1]!, mark: { type: 'code' }, raw: true }) },
  { re: /\[([^\]]+)\]\(([^)\s]+)\)/, build: (m) => ({ text: m[1]!, mark: { type: 'link', attrs: { href: m[2]! } } }) },
  { re: /\*\*([^*]+)\*\*/, build: (m) => ({ text: m[1]!, mark: { type: 'bold' } }) },
  { re: /(?<![*\w])\*([^*\n]+)\*(?!\*)/, build: (m) => ({ text: m[1]!, mark: { type: 'italic' } }) },
  { re: /(?<![_\w])_([^_\n]+)_(?!\w)/, build: (m) => ({ text: m[1]!, mark: { type: 'italic' } }) },
]

function inline(text: string, marks: Mark[] = []): RichTextNode[] {
  if (!text) return []

  let best: { index: number; match: RegExpExecArray; pattern: (typeof INLINE_PATTERNS)[number] } | null = null
  for (const pattern of INLINE_PATTERNS) {
    const match = pattern.re.exec(text)
    if (match && (best === null || match.index < best.index)) {
      best = { index: match.index, match, pattern }
    }
  }

  if (!best) return [textNode(text, marks)]

  const { match, pattern } = best
  const built = pattern.build(match)
  const nested = [...marks, built.mark]

  return [
    ...inline(text.slice(0, match.index), marks),
    ...('raw' in built ? [textNode(built.text, nested)] : inline(built.text, nested)),
    ...inline(text.slice(match.index + match[0].length), marks),
  ]
}

function textNode(text: string, marks: Mark[]): RichTextNode {
  const node: RichTextNode = { type: 'text', text }
  if (marks.length > 0) node.marks = marks
  return node
}

// ── Blocks ──────────────────────────────────────────────────────────────────

function paragraph(text: string): RichTextNode {
  return { type: 'paragraph', content: inline(text) }
}

function listItem(text: string): RichTextNode {
  return { type: 'listItem', content: [paragraph(text)] }
}

function parseMarkdown(md: string): RichTextDoc {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const content: RichTextNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!

    if (line.trim() === '') {
      i++
      continue
    }

    // Fenced code. The closing fence is optional so an unterminated block still imports.
    if (/^```/.test(line.trim())) {
      const language = line.trim().slice(3).trim() || null
      const buffer: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i]!.trim())) buffer.push(lines[i++]!)
      i++
      content.push({
        type: 'codeBlock',
        attrs: language ? { language } : {},
        content: buffer.length > 0 ? [{ type: 'text', text: buffer.join('\n') }] : [],
      })
      continue
    }

    const heading = /^(#{2,3})\s+(.*)$/.exec(line)
    if (heading) {
      content.push({
        type: 'heading',
        attrs: { level: heading[1]!.length },
        content: inline(heading[2]!.trim()),
      })
      i++
      continue
    }

    if (/^(---|\*\*\*|___)\s*$/.test(line)) {
      content.push({ type: 'horizontalRule' })
      i++
      continue
    }

    if (/^>\s?/.test(line)) {
      const buffer: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i]!)) buffer.push(lines[i++]!.replace(/^>\s?/, ''))
      content.push({ type: 'blockquote', content: [paragraph(buffer.join(' ').trim())] })
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: RichTextNode[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]!)) {
        items.push(listItem(lines[i++]!.replace(/^\s*[-*]\s+/, '')))
      }
      content.push({ type: 'bulletList', content: items })
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: RichTextNode[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i]!)) {
        items.push(listItem(lines[i++]!.replace(/^\s*\d+\.\s+/, '')))
      }
      content.push({ type: 'orderedList', attrs: { start: 1 }, content: items })
      continue
    }

    // A paragraph runs until a blank line or the start of another block.
    const buffer: string[] = []
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      !/^(#{2,3}\s|>|```|\s*[-*]\s|\s*\d+\.\s|---\s*$)/.test(lines[i]!)
    ) {
      buffer.push(lines[i++]!.trim())
    }
    content.push(paragraph(buffer.join(' ')))
  }

  return { type: 'doc', content }
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
