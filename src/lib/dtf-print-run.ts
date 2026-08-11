import { createAdminClient } from './supabase-admin'
import { DTF_BUCKET } from './dtf-constants'
import {
  buildDtfSheetPdf,
  printFilePath,
  readSheetSnapshot,
  PrintFileError,
} from './dtf-print-file'

/**
 * PROJ-55 Phase 4: Druckdateien für eine bezahlte Bestellung erzeugen.
 *
 * Wird vom Stripe-Webhook nach Zahlungseingang angestoßen und lässt sich aus
 * der Bestellansicht wiederholen. Beides ruft dieselbe Funktion — ein
 * fehlgeschlagener Lauf soll ohne Sonderweg nachholbar sein.
 *
 * Jede Position wird einzeln abgearbeitet und einzeln als fehlgeschlagen
 * markiert. Ein defektes Motiv auf Bogen 2 darf Bogen 1 nicht mitreißen;
 * der Betreiber soll drucken können, was druckbar ist.
 */

export interface PrintRunResult {
  orderId: string
  generated: number
  failed: number
  skipped: number
}

export async function generatePrintFilesForOrder(orderId: string): Promise<PrintRunResult> {
  const admin = createAdminClient()
  const result: PrintRunResult = { orderId, generated: 0, failed: 0, skipped: 0 }

  const { data: order, error } = await admin
    .from('orders')
    .select('id, items')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order) {
    throw new PrintFileError(`Bestellung ${orderId} nicht gefunden`)
  }

  const items = Array.isArray(order.items) ? (order.items as unknown[]) : []

  // Aufräumschutz zuerst, unabhängig davon, ob die PDF gelingt: Die
  // Originale gehören jetzt zu einer bezahlten Bestellung und dürfen nicht
  // nach 30 Tagen verschwinden. Ohne diesen Schritt wäre ein Nachdruck
  // vier Wochen später unmöglich — und ein fehlgeschlagener Lauf ließe
  // sich nicht mehr wiederholen.
  const uploadIds = new Set<string>()
  for (const item of items) {
    const snapshot = readSheetSnapshot(item)
    if (!snapshot) continue
    for (const el of snapshot.elements) uploadIds.add(el.uploadId)
  }
  if (uploadIds.size > 0) {
    const { error: markErr } = await admin
      .from('dtf_uploads')
      .update({ is_ordered: true })
      .in('id', [...uploadIds])
    if (markErr) {
      console.error('[dtf-print] could not mark uploads as ordered:', markErr)
    }
  }

  for (const [index, item] of items.entries()) {
    const snapshot = readSheetSnapshot(item)
    if (!snapshot) {
      result.skipped++
      continue
    }

    // Zeile vorab anlegen. Der Unique-Constraint auf (order_id, item_index)
    // fängt eine doppelte Webhook-Zustellung ab; ein bereits fertiges
    // Ergebnis wird nicht neu erzeugt.
    const { data: existing } = await admin
      .from('dtf_print_files')
      .select('id, status')
      .eq('order_id', orderId)
      .eq('item_index', index)
      .maybeSingle()

    if (existing?.status === 'ready') {
      result.skipped++
      continue
    }

    if (!existing) {
      await admin.from('dtf_print_files').insert({
        order_id: orderId,
        item_index: index,
        status: 'pending',
        sheet_format: snapshot.format,
        quantity: snapshot.quantity,
      })
    } else {
      await admin
        .from('dtf_print_files')
        .update({ status: 'pending', error_message: null })
        .eq('id', existing.id)
    }

    try {
      const bytes = await buildDtfSheetPdf(snapshot)
      const path = printFilePath(orderId, index)

      const { error: upErr } = await admin.storage
        .from(DTF_BUCKET)
        .upload(path, bytes, { contentType: 'application/pdf', upsert: true })

      if (upErr) throw new PrintFileError(upErr.message)

      await admin
        .from('dtf_print_files')
        .update({
          status: 'ready',
          storage_path: path,
          byte_size: bytes.byteLength,
          error_message: null,
        })
        .eq('order_id', orderId)
        .eq('item_index', index)

      result.generated++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[dtf-print] sheet ${index} of order ${orderId} failed:`, message)
      await admin
        .from('dtf_print_files')
        .update({ status: 'failed', error_message: message.slice(0, 500) })
        .eq('order_id', orderId)
        .eq('item_index', index)
      result.failed++
    }
  }

  return result
}
