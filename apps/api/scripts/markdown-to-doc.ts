import type { RichTextDoc, RichTextNode } from '@growthos/types'

/**
 * Markdown to a ProseMirror document.
 *
 * Deliberately small and purpose-built rather than a dependency. It covers exactly the constructs
 * the editor's schema and the public renderer support — h2/h3, paragraphs, bullet and ordered
 * lists, fenced code, blockquotes, rules, and bold/italic/code/link inline — which is the same set
 * a post can contain. Anything outside that set has nowhere to render, so parsing it would only
 * produce a document the site silently drops.
 *
 * Used by the scripts that write posts without going through the editor: the one-off MDX import and
 * the blog seed. Not shipped in the API itself.
 */

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

export function parseMarkdown(md: string): RichTextDoc {
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
