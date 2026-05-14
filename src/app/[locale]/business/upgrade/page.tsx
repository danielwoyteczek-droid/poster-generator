import { redirect } from 'next/navigation'

/**
 * PROJ-50: /business/upgrade wurde mit /business konsolidiert. Pricing-
 * Tabelle lebt jetzt inline auf /business unter dem #pricing-Anker.
 * Diese Page bleibt als 308-Redirect erhalten, damit alte Links + zuvor
 * gesetzte Stripe-Cancel-URLs nicht 404en.
 */
export default async function UpgradeRedirect({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/business#pricing`)
}
