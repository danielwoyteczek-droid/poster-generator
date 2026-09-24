import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { type ProductId } from '@/lib/products'
import { getProductCatalog } from '@/lib/stripe-catalog'
import { tierToStripeLineItems } from '@/lib/tier-expansion'
import type { PrintFormat } from '@/lib/print-formats'
import type { DtfSheetFormat } from '@/lib/dtf-constants'
import { quoteShipping, SHIPPING_COUNTRIES, DOMESTIC_COUNTRY } from '@/lib/shipping'
import { getUploadOwner } from '@/lib/dtf-guest-session'

const CartItemSchema = z.object({
  productId: z.enum(['download', 'poster', 'dtf']),
  /**
   * PROJ-48: only meaningful when productId='poster'. When true, the
   * checkout route expands the cart item to two Stripe line items
   * (poster_<fmt> + frame_markup_<fmt>).
   */
  withFrame: z.boolean().default(false),
  /**
   * PROJ-55: Poster rechnen nach Papierformat (a4 | a3 | a2), DTF nach
   * Bogenmaß (a4 | a3 | 40x50). `productId` entscheidet, welche Bedeutung
   * gilt — die Prüfung darauf passiert unten beim Bauen der Stripe-Zeilen.
   */
  format: z.enum(['a4', 'a3', 'a2', '40x50']),
  posterType: z.enum(['map', 'star-map', 'photo', 'dtf']),
  /**
   * PROJ-55: Auflage. Poster sind immer Einzelstücke; DTF-Bögen können
   * mehrfach gedruckt werden. Geht als Menge an Stripe, damit der
   * hinterlegte Stückpreis maßgeblich bleibt.
   */
  quantity: z.number().int().min(1).max(99).default(1),
  title: z.string().min(1).max(200),
  projectId: z.string().uuid().nullable().optional(),
  snapshot: z.record(z.string(), z.unknown()),
})

/**
 * Attribution payload from the `__ps_attribution` cookie. Set client-side
 * on the first pageview that arrives with utm_* or gclid in the URL and
 * survives 90 days (Google's conversion window). All fields are optional
 * because direct/non-paid traffic produces no attribution.
 */
const AttributionSchema = z.object({
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  utm_content: z.string().max(200).optional(),
  utm_term: z.string().max(200).optional(),
  gclid: z.string().max(500).optional(),
  landing_page: z.string().max(2000),
  referrer: z.string().max(2000).nullable(),
  first_seen_at: z.string().datetime(),
})

/**
 * PROJ-55: Druckfreigabe und Rechteinhaber-Bestätigung aus dem Dialog, der
 * dem Checkout vorgeschaltet ist. Nur gesetzt, wenn der Warenkorb
 * DTF-Positionen enthält — bei allen anderen Bestellungen fehlt das Feld
 * und die Spalten auf `orders` bleiben NULL.
 */
const DtfApprovalSchema = z.object({
  printApprovedAt: z.string().datetime(),
  rightsConfirmedAt: z.string().datetime(),
})

const CheckoutBodySchema = z.object({
  items: z.array(CartItemSchema).min(1).max(20),
  digitalConsent: z.boolean().optional(),
  dtfApproval: DtfApprovalSchema.optional(),
  /**
   * PROJ-26: Lieferland aus der Warenkorb-Auswahl. Bestimmt Zone und
   * Versandtarif. Muss hier ankommen, weil Stripe `shipping_options` beim
   * Anlegen der Session festnagelt und die Adresse erst danach erfragt.
   */
  shippingCountry: z.enum(SHIPPING_COUNTRIES).optional(),
  attribution: AttributionSchema.optional(),
  /**
   * Active editor locale at checkout time (PROJ-20). Stored on the order
   * so post-purchase mails (confirmation, shipping, review request) go
   * out in the same language the customer bought in. Falls back to the
   * NEXT_LOCALE cookie or 'de' when the client hasn't passed it.
   */
  locale: z.enum(['de', 'en', 'fr', 'it', 'es']).optional(),
  /**
   * PROJ-48: optional voucher (Stripe Promotion Code) applied in the cart.
   * When set, we pass `discounts: [{ promotion_code }]` to the Stripe
   * Session AND switch `allow_promotion_codes` to false so the customer
   * does not enter a second code in Stripe's UI on top of ours.
   * The Stripe Session is the authoritative source for the actual
   * discount amount written to orders.discount_cents (via webhook).
   */
  voucher: z
    .object({
      code: z.string().trim().min(1).max(64),
      promotionCodeId: z.string().trim().min(1),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = CheckoutBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid cart' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Resolve current prices from Stripe (cached) so we can compute the
  // authoritative per-item total (base + frame markup if applicable).
  const catalog = await getProductCatalog()

  // PROJ-48: expand each cart item to its Stripe line items. A single
  // CartItem with productId='poster' + withFrame=true becomes two Stripe
  // line items so a "Free frame" coupon can zero out just the markup.
  type ExpandedItem = {
    productId: ProductId
    withFrame: boolean
    format: PrintFormat | DtfSheetFormat
    posterType: 'map' | 'star-map' | 'photo' | 'dtf'
    quantity: number
    title: string
    projectId?: string | null
    snapshot: Record<string, unknown>
    priceCents: number
    stripeLineItems: Array<{ stripePriceId: string; quantity: number }>
  }

  let expanded: ExpandedItem[]
  try {
    expanded = parsed.data.items.map((item) => {
      // PROJ-55: DTF rechnet nach Bogenmaß und kennt keine Rahmen-Option,
      // deshalb ein eigener Zweig statt einer Erweiterung der
      // Tier-Expansion. Die Auflage geht als Menge an Stripe — so bleibt
      // der im Dashboard gepflegte Stückpreis maßgeblich.
      if (item.productId === 'dtf') {
        const sheetFormat = item.format as DtfSheetFormat
        const price = catalog.dtfSheets[sheetFormat]
        if (!price) {
          throw new Error(`No Stripe price configured for dtf/${item.format}`)
        }
        return {
          ...item,
          priceCents: price.unitAmount * item.quantity,
          stripeLineItems: [
            { stripePriceId: price.stripePriceId, quantity: item.quantity },
          ],
        }
      }

      const posterFormat = item.format as PrintFormat
      const posterProduct = item.productId as Exclude<ProductId, 'dtf'>
      const lineItems = tierToStripeLineItems(posterProduct, item.withFrame, posterFormat)
      const priceCents = lineItems.reduce((sum, li) => {
        const unitAmount =
          catalog.products[posterProduct]?.[posterFormat]?.stripePriceId === li.stripePriceId
            ? (catalog.products[posterProduct]?.[posterFormat]?.unitAmount ?? 0)
            : catalog.frameMarkup[posterFormat]?.stripePriceId === li.stripePriceId
            ? (catalog.frameMarkup[posterFormat]?.unitAmount ?? 0)
            : 0
        return sum + unitAmount * li.quantity
      }, 0)
      return {
        ...item,
        priceCents,
        stripeLineItems: lineItems,
      }
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid product configuration'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const totalCents = expanded.reduce((sum, i) => sum + i.priceCents, 0)
  const hasPhysical = expanded.some((i) => i.productId !== 'download')
  const hasDigital = expanded.some((i) => i.productId === 'download')

  if (hasDigital && !parsed.data.digitalConsent) {
    return NextResponse.json(
      { error: 'Zustimmung zum sofortigen Download-Beginn erforderlich' },
      { status: 400 },
    )
  }

  // PROJ-55: Der Freigabe-Dialog sitzt im Warenkorb, also im Client. Ohne
  // diese Prüfung liesse er sich mit einem direkten Aufruf überspringen —
  // und genau die Freigabe ist der rechtliche Kern des Produkts. Sie hier
  // zu erzwingen, ist die einzige Stelle, an der sie nicht umgehbar ist.
  const hasDtf = expanded.some((i) => i.productId === 'dtf')
  if (hasDtf && !parsed.data.dtfApproval) {
    return NextResponse.json(
      { error: 'Druckfreigabe und Rechteinhaber-Bestätigung erforderlich' },
      { status: 400 },
    )
  }

  /**
   * PROJ-55: Gehoeren die Motive ueberhaupt dem Besteller?
   *
   * Die Bogenbeschreibung kommt als freies JSON aus dem Warenkorb, und die
   * Druck-Pipeline laedt spaeter jede `uploadId` mit der Service-Role --
   * also an RLS vorbei. Ohne diese Pruefung koennte jemand, der eine fremde
   * ID kennt, fremdes Kundenmaterial drucken und sich zuschicken lassen.
   *
   * IDs sind UUIDv4 und werden nirgends an Dritte ausgeliefert; der Weg
   * setzt also ein Leck voraus. Die Pruefung ist trotzdem richtig hier: Es
   * ist die letzte Stelle, an der noch bekannt ist, WER bestellt -- danach
   * laeuft alles unter der Service-Role.
   */
  if (hasDtf) {
    const uploadIds = [
      ...new Set(
        expanded.flatMap((i) => {
          if (i.productId !== 'dtf') return []
          const snap = i.snapshot as { elements?: Array<{ uploadId?: unknown }> }
          return (snap?.elements ?? [])
            .map((el) => el.uploadId)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        }),
      ),
    ]

    if (uploadIds.length > 0) {
      const owner = await getUploadOwner()
      if (!owner) {
        return NextResponse.json(
          { error: 'Motive konnten nicht zugeordnet werden' },
          { status: 400 },
        )
      }

      const ownedQuery = createAdminClient()
        .from('dtf_uploads')
        .select('id')
        .in('id', uploadIds)
        .limit(uploadIds.length)
      const { data: owned, error: ownedErr } =
        owner.kind === 'user'
          ? await ownedQuery.eq('user_id', owner.userId)
          : await ownedQuery.eq('guest_session_id', owner.guestSessionId)

      if (ownedErr) {
        console.error('[checkout] dtf upload ownership check failed:', ownedErr)
        return NextResponse.json({ error: 'Motive konnten nicht geprueft werden' }, { status: 500 })
      }

      // Bewusst ohne Angabe, WELCHE ID fehlt: Aus der Antwort soll sich
      // nicht ablesen lassen, ob eine fremde ID existiert.
      if ((owned?.length ?? 0) !== uploadIds.length) {
        return NextResponse.json(
          { error: 'Der Warenkorb enthaelt Motive, die nicht zu dieser Sitzung gehoeren' },
          { status: 400 },
        )
      }
    }
  }

  /**
   * PROJ-26: Versandtarif bestimmen. Der Client hat dieselbe Rechnung schon
   * für die Anzeige gemacht; hier läuft sie erneut, weil ein Betrag, den
   * der Client berechnet, kein Betrag ist, auf den man sich verlassen kann.
   *
   * Fehlt die Stripe-ID, wird ohne Versandkosten fortgefahren statt die
   * Bestellung abzubrechen: Eine Bestellung ohne Versandkosten ist ein
   * kalkulierbarer Verlust, eine abgebrochene ein sicherer. Der Vorfall
   * gehört aber ins Log.
   */
  // Kein stilles Ausweichen auf Deutschland: Der Versandtarif und die
  // Adressabfrage bei Stripe haengen beide an diesem Land. Geraten hiesse,
  // deutschen Versand zu berechnen und dem Kunden danach nur eine deutsche
  // Adresse zuzulassen -- fuer jemanden ausserhalb Deutschlands eine
  // Sackgasse im Bezahlvorgang. Der Warenkorb fragt das Land ab, bevor er
  // den Knopf freigibt; kommt hier trotzdem keines an, ist das ein Fehler
  // und kein Fall fuer eine Annahme.
  if (hasPhysical && !parsed.data.shippingCountry) {
    return NextResponse.json(
      { error: 'Lieferland fehlt' },
      { status: 400 },
    )
  }
  const shippingCountry = parsed.data.shippingCountry ?? DOMESTIC_COUNTRY
  const shippingQuote = hasPhysical
    ? quoteShipping(
        expanded.map((e) => ({
          productId: e.productId,
          format: e.format,
          withFrame: e.withFrame,
          quantity: e.quantity,
        })),
        shippingCountry,
        // Wert VOR Rabatt — sonst würde ein Gutschein den Versand finanzieren.
        totalCents,
      )
    : null
  const shippingRateId = shippingQuote?.stripeShippingRateId ?? null
  if (shippingQuote && shippingQuote.cents > 0 && !shippingRateId) {
    console.warn('[checkout] no Stripe shipping rate configured', {
      zone: shippingQuote.zone,
      method: shippingQuote.method,
    })
  }

  // Pick locale from explicit body field, then NEXT_LOCALE cookie, then DE
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value
  const locale = parsed.data.locale
    ?? (cookieLocale === 'en' ? 'en' : cookieLocale === 'de' ? 'de' : 'de')

  // Persist the raw cart-item shape (with withFrame), not the expanded
  // line items. orders.items stays the single source of truth for
  // fulfillment, downloads and order display.
  const persistedItems = expanded.map((e) => ({
    productId: e.productId,
    withFrame: e.withFrame,
    format: e.format,
    posterType: e.posterType,
    // PROJ-55: Auflage mitschreiben. Ohne sie wüsste das Fulfillment nicht,
    // wie oft ein Bogen gedruckt werden soll — der Gesamtpreis allein sagt
    // es nicht, sobald sich Preise ändern.
    quantity: e.quantity,
    title: e.title,
    projectId: e.projectId ?? null,
    snapshot: e.snapshot,
    priceCents: e.priceCents,
  }))

  const admin = createAdminClient()
  // PROJ-48: persist the voucher code (not the amount — Stripe is
  // authoritative). discount_cents stays 0 until the webhook reads it
  // from session.total_details.amount_discount.
  // Einmal berechnet: Beide Bestaetigungen fielen im selben Klick, zwei
  // getrennte Aufrufe koennten sich um eine Millisekunde unterscheiden.
  const approvedAt = parsed.data.dtfApproval ? new Date().toISOString() : null
  const attribution = parsed.data.attribution
  const { data: order, error: insertErr } = await admin
    .from('orders')
    .insert({
      user_id: user?.id ?? null,
      status: 'pending',
      total_cents: totalCents,
      currency: 'eur',
      items: persistedItems,
      locale,
      digital_consent_at: hasDigital ? new Date().toISOString() : null,
      discount_code: parsed.data.voucher?.code ?? null,
      utm_source: attribution?.utm_source ?? null,
      utm_medium: attribution?.utm_medium ?? null,
      utm_campaign: attribution?.utm_campaign ?? null,
      utm_content: attribution?.utm_content ?? null,
      utm_term: attribution?.utm_term ?? null,
      gclid: attribution?.gclid ?? null,
      landing_page: attribution?.landing_page ?? null,
      referrer: attribution?.referrer ?? null,
      attribution_at: attribution?.first_seen_at ?? null,
      // PROJ-55: Druckfreigabe und Rechteinhaber-Bestätigung. Nur gesetzt,
      // wenn der Warenkorb DTF enthielt und der Dialog durchlaufen wurde.
      //
      // Der Zeitpunkt kommt vom SERVER, nicht aus dem Rumpf. Der Client
      // schickt seine beiden Zeitstempel weiterhin mit — sie sind der
      // Beleg, dass der Dialog durchlaufen wurde, und ihr Fehlen führt
      // oben zum 400. Als Datum taugen sie nicht: Dieser Eintrag existiert
      // als Nachweis gegenüber dem Kunden, und ein Nachweis, den der
      // Kunde selbst datiert, ist keiner. Der Server weiß ohnehin, wann
      // der Checkout lief.
      dtf_print_approved_at: approvedAt,
      dtf_rights_confirmed_at: approvedAt,
    })
    .select('id, access_token')
    .single()

  if (insertErr || !order) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  const origin = req.headers.get('origin') ?? new URL(req.url).origin

  // Flatten all expanded line items into the Stripe-friendly format.
  const stripeLineItems = expanded.flatMap((e) =>
    e.stripeLineItems.map((li) => ({
      quantity: li.quantity,
      price: li.stripePriceId,
    })),
  )

  // PROJ-48: when a cart-side voucher is applied, pass it to Stripe via
  // the `discounts` parameter and disable the native promotion-code field
  // (Stripe forbids both at once and our cart UX is the entry point).
  // Without a cart voucher, leave the field open as a fallback.
  const hasCartVoucher = !!parsed.data.voucher
  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: 'payment',
    locale,
    line_items: stripeLineItems,
    success_url: `${origin}/${locale}/orders/${order.id}?token=${order.access_token}&success=1`,
    cancel_url: `${origin}/${locale}/cart`,
    customer_email: user?.email,
    allow_promotion_codes: hasCartVoucher ? undefined : true,
    // PROJ-26: Adressabfrage auf das im Warenkorb gewählte Land beschränken,
    // damit Gezahltes und Geliefertes zusammenpassen. Vorher standen hier
    // fest DE/AT/CH und es wurden nie Versandkosten berechnet; die Schweiz
    // ist wegen Zoll und Einfuhrumsatzsteuer nicht mehr dabei.
    shipping_address_collection: hasPhysical
      ? { allowed_countries: [shippingCountry] }
      : undefined,
    shipping_options: shippingRateId
      ? [{ shipping_rate: shippingRateId }]
      : undefined,
    metadata: { order_id: order.id },
  }
  if (hasCartVoucher && parsed.data.voucher) {
    sessionParams.discounts = [{ promotion_code: parsed.data.voucher.promotionCodeId }]
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams)

    await admin
      .from('orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order.id)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    await admin.from('orders').update({ status: 'failed' }).eq('id', order.id)
    const message = err instanceof Error ? err.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
