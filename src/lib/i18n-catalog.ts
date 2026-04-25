'use client'

import { useMessages } from 'next-intl'

/**
 * Look up a label in a namespace and fall back to a static value when
 * the key isn't present in the active locale's messages. Lets us put
 * built-in catalog labels (map layouts, map masks, photo masks, photo
 * filters, products) in the locale JSON files while keeping data-driven
 * items (admin-uploaded custom masks, DB palettes) using their own
 * `.label` field as a fallback.
 *
 * Usage in a client component:
 *   const labelOf = useTranslatedLabel('mapLayouts')
 *   <span>{labelOf(`${layout.id}Label`, layout.label)}</span>
 */
export function useTranslatedLabel(namespace: string) {
  const messages = useMessages() as Record<string, Record<string, string> | undefined>
  return (key: string, fallback: string | undefined = undefined) => {
    const ns = messages[namespace]
    if (ns && typeof ns[key] === 'string') return ns[key]
    return fallback ?? key
  }
}
