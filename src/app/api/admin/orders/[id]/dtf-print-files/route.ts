import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { DTF_BUCKET } from '@/lib/dtf-constants'
import { generatePrintFilesForOrder } from '@/lib/dtf-print-run'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * PROJ-55 Phase 4: Druckdateien einer Bestellung.
 *
 * GET  — Liste mit Status und frischen Download-Links.
 * POST — Erzeugung wiederholen. Ruft dieselbe Funktion wie der Webhook,
 *        damit ein fehlgeschlagener Lauf ohne Sonderweg nachholbar ist.
 *
 * Nur für Admins. Die Dateien liegen im privaten Bucket; die Links sind
 * kurzlebig signiert, damit ein versehentlich weitergegebener Link nicht
 * dauerhaft Kundenmotive preisgibt.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DOWNLOAD_TTL_SECONDS = 60 * 30

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await ctx.params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('dtf_print_files')
    .select('item_index, status, storage_path, error_message, sheet_format, quantity, byte_size, updated_at')
    .eq('order_id', id)
    .order('item_index')

  if (error) {
    console.error('[admin/dtf-print-files] list failed:', error)
    return NextResponse.json({ error: 'Konnte Druckdateien nicht laden' }, { status: 500 })
  }

  const rows = data ?? []
  const paths = rows.map((r) => r.storage_path).filter((p): p is string => !!p)

  const signedByPath = new Map<string, string>()
  if (paths.length > 0) {
    const { data: signed } = await admin.storage
      .from(DTF_BUCKET)
      .createSignedUrls(paths, DOWNLOAD_TTL_SECONDS)
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) signedByPath.set(entry.path, entry.signedUrl)
    }
  }

  return NextResponse.json({
    files: rows.map((r) => ({
      itemIndex: r.item_index,
      status: r.status,
      sheetFormat: r.sheet_format,
      quantity: r.quantity,
      byteSize: r.byte_size,
      errorMessage: r.error_message,
      updatedAt: r.updated_at,
      downloadUrl: r.storage_path ? (signedByPath.get(r.storage_path) ?? null) : null,
    })),
  })
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await ctx.params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 })

  try {
    const result = await generatePrintFilesForOrder(id)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erzeugung fehlgeschlagen'
    console.error('[admin/dtf-print-files] regenerate failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
