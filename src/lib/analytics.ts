'use client'

type ConsentState = 'granted' | 'denied'

interface ConsentChoices {
  analytics: ConsentState
  marketing: ConsentState
}

const CONSENT_STORAGE_KEY = 'petite-moment-consent-v1'

export function readConsent(): ConsentChoices | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ConsentChoices
  } catch {
    return null
  }
}

export function writeConsent(choices: ConsentChoices) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(choices))
  applyConsentToGtag(choices)
}

function applyConsentToGtag(choices: ConsentChoices) {
  if (typeof window === 'undefined') return
  const w = window as unknown as {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
  w.dataLayer = w.dataLayer || []
  const consentState = {
    analytics_storage: choices.analytics,
    ad_storage: choices.marketing,
    ad_user_data: choices.marketing,
    ad_personalization: choices.marketing,
  }
  if (typeof w.gtag === 'function') {
    w.gtag('consent', 'update', consentState)
  } else {
    // Fallback if the inline gtag helper is not yet defined
    const tempGtag = (...args: unknown[]) => {
      w.dataLayer!.push(args)
    }
    tempGtag('consent', 'update', consentState)
  }
  w.dataLayer.push({ event: 'consent_update' })
}

function push(event: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const w = window as unknown as { dataLayer?: unknown[] }
  w.dataLayer = w.dataLayer || []
  w.dataLayer.push(event)
}

interface EcommerceItem {
  item_id: string
  item_name: string
  item_category: string
  item_variant?: string
  price: number
  quantity: number
}

export function trackAddToCart(item: {
  id: string
  title: string
  productId: string
  format: string
  priceCents: number
  posterType: 'map' | 'star-map'
}) {
  const gtmItem: EcommerceItem = {
    item_id: item.id,
    item_name: item.title,
    item_category: item.posterType === 'star-map' ? 'Sternenposter' : 'Stadtposter',
    item_variant: `${item.productId}-${item.format}`,
    price: item.priceCents / 100,
    quantity: 1,
  }
  push({ ecommerce: null })
  push({
    event: 'add_to_cart',
    ecommerce: {
      currency: 'EUR',
      value: item.priceCents / 100,
      items: [gtmItem],
    },
  })
}

export function trackBeginCheckout(items: Array<{
  id: string
  title: string
  productId: string
  format: string
  priceCents: number
  posterType: 'map' | 'star-map'
}>) {
  const gtmItems: EcommerceItem[] = items.map((i) => ({
    item_id: i.id,
    item_name: i.title,
    item_category: i.posterType === 'star-map' ? 'Sternenposter' : 'Stadtposter',
    item_variant: `${i.productId}-${i.format}`,
    price: i.priceCents / 100,
    quantity: 1,
  }))
  const valueCents = items.reduce((sum, i) => sum + i.priceCents, 0)
  push({ ecommerce: null })
  push({
    event: 'begin_checkout',
    ecommerce: {
      currency: 'EUR',
      value: valueCents / 100,
      items: gtmItems,
    },
  })
}

export function trackPurchase(input: {
  transactionId: string
  totalCents: number
  items: Array<{
    id: string
    title: string
    productId: string
    format: string
    priceCents: number
    posterType: 'map' | 'star-map'
  }>
}) {
  const gtmItems: EcommerceItem[] = input.items.map((i) => ({
    item_id: i.id,
    item_name: i.title,
    item_category: i.posterType === 'star-map' ? 'Sternenposter' : 'Stadtposter',
    item_variant: `${i.productId}-${i.format}`,
    price: i.priceCents / 100,
    quantity: 1,
  }))
  push({ ecommerce: null })
  push({
    event: 'purchase',
    ecommerce: {
      transaction_id: input.transactionId,
      currency: 'EUR',
      value: input.totalCents / 100,
      items: gtmItems,
    },
  })
}
