import { Resend } from 'resend'
import { PRINT_FORMAT_OPTIONS } from './print-formats'
import { PRODUCTS, formatPrice } from './products'

const FROM = 'petite-moment <noreply@petite-moment.com>'

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY ist nicht gesetzt')
  return new Resend(key)
}

interface OrderItemInput {
  productId: 'download' | 'poster' | 'frame'
  format: 'a4' | 'a3' | 'a2'
  posterType: 'map' | 'star-map'
  title: string
  priceCents: number
}

interface OrderConfirmationInput {
  to: string
  orderId: string
  accessToken: string
  items: OrderItemInput[]
  totalCents: number
  origin: string
}

function productLabel(id: string) {
  return PRODUCTS.find((p) => p.id === id)?.label ?? id
}
function formatLabel(id: string) {
  return PRINT_FORMAT_OPTIONS.find((f) => f.id === id)?.label ?? id.toUpperCase()
}

function renderHtml(input: OrderConfirmationInput): string {
  const orderUrl = `${input.origin}/orders/${input.orderId}?token=${input.accessToken}`
  const hasDigital = input.items.some((i) => i.productId === 'download')
  const hasPhysical = input.items.some((i) => i.productId !== 'download')

  const rows = input.items
    .map((item) => {
      const typeLabel = item.posterType === 'star-map' ? 'Sternenposter' : 'Stadtposter'
      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #eee;">
            <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.05em;">${typeLabel}</div>
            <div style="font-size:14px;color:#111;font-weight:600;margin-top:2px;">${item.title}</div>
            <div style="font-size:12px;color:#666;margin-top:2px;">${productLabel(item.productId)} · ${formatLabel(item.format)}</div>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #eee;text-align:right;font-size:14px;color:#111;font-weight:600;vertical-align:top;">
            ${formatPrice(item.priceCents)}
          </td>
        </tr>
      `
    })
    .join('')

  const cta = [
    hasDigital
      ? '<p style="margin:16px 0 0 0;font-size:14px;color:#444;">Deine digitalen Dateien (PNG + PDF) stehen auf der Bestellseite zum Download bereit.</p>'
      : '',
    hasPhysical
      ? '<p style="margin:8px 0 0 0;font-size:14px;color:#444;">Physische Produkte werden innerhalb von 3–5 Werktagen versendet.</p>'
      : '',
  ].join('')

  return `<!doctype html>
<html lang="de">
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee;">
      <div style="padding:32px 24px 16px;">
        <h1 style="margin:0;font-size:20px;color:#111;">Vielen Dank für deinen Kauf!</h1>
        <p style="margin:12px 0 0;font-size:14px;color:#555;line-height:1.5;">
          Deine Bestellung ist eingegangen. Du kannst sie jederzeit über den Link unten einsehen.
        </p>
      </div>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;">
        ${rows}
        <tr>
          <td style="padding:14px 16px;font-size:14px;color:#111;font-weight:600;">Gesamt</td>
          <td style="padding:14px 16px;text-align:right;font-size:14px;color:#111;font-weight:700;">
            ${formatPrice(input.totalCents)}
          </td>
        </tr>
      </table>
      <div style="padding:24px;text-align:center;">
        <a href="${orderUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
          Zur Bestellung
        </a>
        ${cta}
      </div>
    </div>
    <p style="margin:24px 0 0;text-align:center;font-size:12px;color:#999;">
      Bei Fragen einfach auf diese E-Mail antworten.
    </p>
  </div>
</body>
</html>`
}

interface ShipmentNotificationInput {
  to: string
  orderId: string
  accessToken: string
  trackingNumber: string
  origin: string
}

interface AdminNotificationInput {
  to: string
  orderId: string
  items: OrderItemInput[]
  totalCents: number
  email: string
  shippingAddress?: Record<string, unknown> | null
  hasPhysical: boolean
  origin: string
}

function renderShipmentHtml(input: ShipmentNotificationInput): string {
  const orderUrl = `${input.origin}/orders/${input.orderId}?token=${input.accessToken}`
  return `<!doctype html>
<html lang="de">
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:12px;padding:32px 24px;border:1px solid #eee;">
      <h1 style="margin:0;font-size:20px;color:#111;">Deine Bestellung ist unterwegs!</h1>
      <p style="margin:12px 0 0;font-size:14px;color:#555;line-height:1.6;">
        Dein Paket wurde versendet. Mit folgender Sendungsnummer kannst du es verfolgen:
      </p>
      <div style="margin:20px 0;padding:16px;background:#f5f5f4;border-radius:8px;font-family:monospace;font-size:16px;color:#111;font-weight:600;letter-spacing:0.03em;">
        ${input.trackingNumber}
      </div>
      <div style="text-align:center;margin-top:8px;">
        <a href="${orderUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
          Zur Bestellung
        </a>
      </div>
    </div>
  </div>
</body>
</html>`
}

function renderAdminHtml(input: AdminNotificationInput): string {
  const rows = input.items
    .map((item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">
          ${item.posterType === 'star-map' ? 'Sternenposter' : 'Stadtposter'} · ${item.title}
          <br><span style="color:#888;">${productLabel(item.productId)} · ${formatLabel(item.format)}</span>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:right;">
          ${formatPrice(item.priceCents)}
        </td>
      </tr>
    `)
    .join('')

  const address = input.shippingAddress
    ? `<p style="margin:16px 0 0;font-size:13px;color:#444;"><strong>Lieferadresse:</strong><br>${Object.values(input.shippingAddress).filter(Boolean).join(', ')}</p>`
    : ''

  const adminUrl = `${input.origin}/private/admin/orders/${input.orderId}`

  return `<!doctype html>
<html lang="de">
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #eee;">
      <div style="display:inline-block;background:${input.hasPhysical ? '#fef3c7' : '#dbeafe'};color:${input.hasPhysical ? '#92400e' : '#1e40af'};font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;">
        ${input.hasPhysical ? 'Physisch · Versand nötig' : 'Nur Digital'}
      </div>
      <h1 style="margin:12px 0 0;font-size:18px;color:#111;">Neue Bestellung #${input.orderId.slice(0, 8)}</h1>
      <p style="margin:8px 0 16px;font-size:13px;color:#666;">Kunde: ${input.email}</p>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;">${rows}</table>
      <p style="margin:16px 0 0;font-size:14px;color:#111;"><strong>Gesamt: ${formatPrice(input.totalCents)}</strong></p>
      ${address}
      <div style="margin-top:20px;">
        <a href="${adminUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:8px;">
          Bestellung öffnen
        </a>
      </div>
    </div>
  </div>
</body>
</html>`
}

export async function sendShipmentNotification(input: ShipmentNotificationInput) {
  const result = await getResend().emails.send({
    from: FROM,
    to: input.to,
    subject: `Deine Bestellung ist unterwegs – ${input.trackingNumber}`,
    html: renderShipmentHtml(input),
  })
  if (result.error) throw new Error(result.error.message || 'Shipment email failed')
  return result.data
}

export async function sendAdminNewOrderNotification(input: AdminNotificationInput) {
  const result = await getResend().emails.send({
    from: FROM,
    to: input.to,
    subject: `Neue Bestellung #${input.orderId.slice(0, 8)}${input.hasPhysical ? ' (Versand nötig)' : ''}`,
    html: renderAdminHtml(input),
  })
  if (result.error) throw new Error(result.error.message || 'Admin email failed')
  return result.data
}

export async function sendOrderConfirmation(input: OrderConfirmationInput) {
  const html = renderHtml(input)
  const result = await getResend().emails.send({
    from: FROM,
    to: input.to,
    subject: 'Deine Bestellung bei petite-moment',
    html,
  })
  if (result.error) {
    console.error('Resend error:', result.error)
    throw new Error(result.error.message || 'E-Mail-Versand fehlgeschlagen')
  }
  return result.data
}
