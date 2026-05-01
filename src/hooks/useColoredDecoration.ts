import { useEffect, useState } from 'react'
import { fetchDecorationSvgText, recolorSvg, svgTextToDataUrl } from '@/lib/decoration-color'

/**
 * Resolve a decoration SVG URL to a data URL where the stroke/fill colour is
 * rewritten to `color`. Returns `null` while loading or when no URL is given,
 * so the caller can simply skip rendering until ready.
 *
 * The underlying SVG fetch is deduped + cached at module scope, so multiple
 * components asking for the same URL only network once.
 */
export function useColoredDecoration(url: string | null, color: string): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!url) {
      setDataUrl(null)
      return
    }
    let cancelled = false
    fetchDecorationSvgText(url)
      .then((text) => {
        if (cancelled) return
        setDataUrl(svgTextToDataUrl(recolorSvg(text, color)))
      })
      .catch(() => {
        if (cancelled) return
        // Fall back to the original URL — at worst the decoration shows in its
        // baked colour, which is still better than no decoration at all.
        setDataUrl(url)
      })
    return () => { cancelled = true }
  }, [url, color])

  return dataUrl
}
