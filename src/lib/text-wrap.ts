/**
 * Wrap a string to fit within a given pixel width on a Canvas 2D context.
 *
 * Mirrors the editor's CSS rendering of TextBlockOverlay, which uses
 * `whiteSpace: 'pre-wrap'` (preserves user-typed `\n`) plus
 * `wordBreak: 'break-word'` (breaks anywhere if a single word overflows).
 *
 * Algorithm:
 * 1. Split on `\n` to honour explicit user line breaks.
 * 2. For each logical line, greedily fill the line with words separated by
 *    spaces; when adding the next word would exceed `maxWidth`, push the
 *    current line and start a new one with that word.
 * 3. If a single word is wider than `maxWidth`, fall back to character-level
 *    breaking — matches `wordBreak: break-word`.
 *
 * Caller must have already set `ctx.font` to the active style; otherwise the
 * `measureText` results don't match the eventual `fillText`.
 */
export function wrapTextToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (!text) return []
  if (maxWidth <= 0) return text.split('\n')
  const out: string[] = []
  for (const logicalLine of text.split('\n')) {
    if (logicalLine === '') { out.push(''); continue }
    const words = logicalLine.split(' ')
    let current = ''
    for (const word of words) {
      const candidate = current === '' ? word : current + ' ' + word
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate
        continue
      }
      // Candidate overflows. Flush current line if non-empty, then handle
      // the word — which itself might overflow `maxWidth`.
      if (current !== '') out.push(current)
      if (ctx.measureText(word).width <= maxWidth) {
        current = word
      } else {
        // Single word too wide → break per character. Greedily fill chars
        // until the next char would overflow.
        let chunk = ''
        for (const ch of word) {
          const next = chunk + ch
          if (ctx.measureText(next).width <= maxWidth) {
            chunk = next
          } else {
            if (chunk !== '') out.push(chunk)
            chunk = ch
          }
        }
        current = chunk
      }
    }
    out.push(current)
  }
  return out
}
