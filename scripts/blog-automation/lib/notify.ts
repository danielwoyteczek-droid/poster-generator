import { Resend } from 'resend'
import { env } from './env'

const resend = new Resend(env.resendApiKey)

export async function notifyDraftReady(input: {
  title: string
  excerpt: string
  costUsd: number
  monthlySpend: number
  monthlyCap: number
}): Promise<void> {
  const studioUrl = `${env.appUrl}/studio/structure/blogPost`
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;">
      <h1 style="font-size:20px;color:#111;margin:0 0 12px;">Neuer Blog-Draft bereit</h1>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 12px;">
        Der Blog-Automat hat einen neuen Draft erstellt. Bitte gegenlesen und veröffentlichen.
      </p>
      <div style="background:#f5f5f4;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.05em;">Titel</p>
        <p style="margin:0;font-size:15px;color:#111;font-weight:600;">${escapeHtml(input.title)}</p>
      </div>
      <p style="font-size:13px;color:#666;margin:16px 0;line-height:1.6;">
        ${escapeHtml(input.excerpt)}
      </p>
      <a href="${studioUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px;">
        Im Studio öffnen
      </a>
      <p style="font-size:11px;color:#aaa;margin-top:24px;">
        Kosten dieses Artikels: $${input.costUsd.toFixed(3)} · Monatsverbrauch: $${input.monthlySpend.toFixed(2)} / $${input.monthlyCap.toFixed(2)}
      </p>
    </div>
  `
  await resend.emails.send({
    from: 'petite-moment Blog-Automat <noreply@petite-moment.com>',
    to: env.adminEmail,
    subject: `Blog-Draft: ${input.title}`,
    html,
  })
}

export async function notifyBudgetExceeded(spent: number, cap: number): Promise<void> {
  await resend.emails.send({
    from: 'petite-moment Blog-Automat <noreply@petite-moment.com>',
    to: env.adminEmail,
    subject: 'Blog-Automat: Monatsbudget erreicht',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="color:#111;">Monatsbudget erreicht</h2>
        <p style="color:#555;">Der Blog-Automat hat das Monats-Budget erreicht und überspringt heutige Generierung.</p>
        <p style="color:#555;">Verbraucht: $${spent.toFixed(2)} / $${cap.toFixed(2)}</p>
        <p style="color:#888;font-size:13px;">Limit anpassen via Env-Variable BLOG_AUTOMATION_MONTHLY_BUDGET_USD.</p>
      </div>
    `,
  })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
