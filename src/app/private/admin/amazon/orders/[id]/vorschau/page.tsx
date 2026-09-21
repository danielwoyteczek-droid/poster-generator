import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AmazonOrderPreview } from '@/components/admin/AmazonOrderPreview'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Vorschau | Poster Generator',
  // Eine nackte Seite für den Rahmen in der Queue — nicht für Suchmaschinen.
  robots: { index: false, follow: false },
}

/**
 * PROJ-31: Nackte Seite mit dem Poster einer Bestellung.
 *
 * Ohne Navigation und ohne Rahmen, weil die Queue sie einbettet. Der eigene
 * Seitenaufruf ist Absicht: Der Editor-Store, den die Vorschau befüllt,
 * bleibt damit in dieser Seite und färbt nicht auf die Admin-Oberfläche ab.
 * Direkt aufrufbar ist sie trotzdem, wenn man das Bild groß sehen will.
 */
export default async function AmazonOrderPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    if (auth.status === 401) redirect('/login')
    redirect('/')
  }

  const { id } = await params

  return (
    <div className="h-screen bg-muted">
      <AmazonOrderPreview orderId={id} />
    </div>
  )
}
