/**
 * Convert simple markdown to Sanity Portable Text blocks.
 * Supports: # / ## / ### headings, paragraphs, **bold**, [link](/path).
 * No nested lists, no images — the Claude prompt only emits these constructs.
 */

interface Span {
  _type: 'span'
  _key: string
  text: string
  marks: string[]
}

interface MarkDef {
  _key: string
  _type: 'link'
  href: string
}

interface Block {
  _type: 'block'
  _key: string
  style: 'normal' | 'h1' | 'h2' | 'h3'
  children: Span[]
  markDefs: MarkDef[]
}

function key(): string {
  return Math.random().toString(36).slice(2, 14)
}

function parseInline(text: string, markDefs: MarkDef[]): Span[] {
  const spans: Span[] = []
  // First split by links, then within each chunk process bold
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  let lastIndex = 0
  const chunks: Array<{ text: string; link?: string }> = []
  let m: RegExpExecArray | null
  while ((m = linkRegex.exec(text)) !== null) {
    if (m.index > lastIndex) chunks.push({ text: text.slice(lastIndex, m.index) })
    chunks.push({ text: m[1], link: m[2] })
    lastIndex = linkRegex.lastIndex
  }
  if (lastIndex < text.length) chunks.push({ text: text.slice(lastIndex) })

  for (const chunk of chunks) {
    let linkKey: string | undefined
    if (chunk.link) {
      linkKey = key()
      markDefs.push({ _key: linkKey, _type: 'link', href: chunk.link })
    }
    const boldRegex = /\*\*([^*]+)\*\*/g
    let last = 0
    let b: RegExpExecArray | null
    while ((b = boldRegex.exec(chunk.text)) !== null) {
      if (b.index > last) {
        spans.push({
          _type: 'span',
          _key: key(),
          text: chunk.text.slice(last, b.index),
          marks: linkKey ? [linkKey] : [],
        })
      }
      spans.push({
        _type: 'span',
        _key: key(),
        text: b[1],
        marks: linkKey ? [linkKey, 'strong'] : ['strong'],
      })
      last = boldRegex.lastIndex
    }
    if (last < chunk.text.length) {
      spans.push({
        _type: 'span',
        _key: key(),
        text: chunk.text.slice(last),
        marks: linkKey ? [linkKey] : [],
      })
    }
  }
  return spans.filter((s) => s.text.length > 0)
}

export function markdownToPortableText(markdown: string): Block[] {
  const blocks: Block[] = []
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const paragraphBuffer: string[] = []

  const flush = () => {
    if (paragraphBuffer.length === 0) return
    const text = paragraphBuffer.join(' ').trim()
    paragraphBuffer.length = 0
    if (!text) return
    const markDefs: MarkDef[] = []
    const spans = parseInline(text, markDefs)
    blocks.push({
      _type: 'block',
      _key: key(),
      style: 'normal',
      children: spans,
      markDefs,
    })
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line === '') {
      flush()
      continue
    }
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line)
    if (headingMatch) {
      flush()
      const level = headingMatch[1].length
      const text = headingMatch[2].trim()
      const markDefs: MarkDef[] = []
      const spans = parseInline(text, markDefs)
      blocks.push({
        _type: 'block',
        _key: key(),
        style: level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3',
        children: spans,
        markDefs,
      })
      continue
    }
    paragraphBuffer.push(line)
  }
  flush()
  return blocks
}

export function wordCount(markdown: string): number {
  return markdown
    .replace(/[#*_`\[\]()!]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0).length
}

export function countInternalLinks(markdown: string): number {
  const internal = markdown.match(/\[[^\]]+\]\((\/[^)]+)\)/g)
  return internal ? internal.length : 0
}

export function countHeadingLevel(markdown: string, level: 1 | 2 | 3): number {
  const prefix = '#'.repeat(level)
  const regex = new RegExp(`^${prefix}\\s+`, 'gm')
  const matches = markdown.match(regex)
  return matches ? matches.length : 0
}
