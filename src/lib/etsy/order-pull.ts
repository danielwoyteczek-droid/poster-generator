/**
 * PROJ-49: Reusable "pull Etsy orders" core, extracted so both the cron
 * route (Bearer-secret auth) and the admin "Sync now" button (admin-auth)
 * can share the same logic.
 *
 * Returns a summary that the caller can present as JSON. Side-effects:
 *   - Upserts receipts into etsy_orders.
 *   - Inserts an etsy_sync_runs row (one per call) and updates it on completion.
 *   - Never throws on Etsy errors — instead captures them into summary.errors.
 *
 * Note: this is the Phase 1+2 scope. It does NOT yet materialize parsed
 * items into rows on `orders` and does NOT trigger PROJ-30 renders. Phase 2.5
 * will add a separate worker for that step.
 */

import { createAdminClient } from '@/lib/supabase-admin'
import {
  EtsyApiError,
  EtsyAuthError,
  EtsyRateLimitError,
  createEtsyClient,
  getLastSeenRateLimit,
} from '@/lib/etsy/client'
import {
  type EtsyReceipt,
  type EtsyReceiptsResponse,
  type EtsyTransaction,
  getPersonalizationText,
  getReceiptShippingAddress,
} from '@/lib/etsy/types'
import {
  type PersonalizationSchema,
  PersonalizationSchemaSchema,
  parsePersonalization,
} from '@/lib/etsy/personalization-parser'

export interface PullSummary {
  fetched: number
  upserted: number
  parsed_ok: number
  parsed_manual_review: number
  parsed_no_mapping: number
  failed: number
  errors: string[]
}

interface ListingMapping {
  group_id: string
  preset_id: string
  schema: PersonalizationSchema
}

interface ParsedItem {
  position: number
  transaction_id: number
  listing_id: number
  preset_id: string | null
  group_id: string | null
  parsed: Record<string, string> | null
  raw: string | null
  status: 'ok' | 'manual_review' | 'no_mapping'
  missing?: string[]
  invalid?: Array<{ key: string; value: string; reason: string }>
}

async function loadShopId(): Promise<{ shop_id: number } | { error: string }> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('etsy_oauth_tokens')
    .select('shop_id')
    .eq('id', 'singleton')
    .maybeSingle()
  if (error) return { error: `Token read failed: ${error.message}` }
  if (!data?.shop_id) {
    return {
      error:
        'No shop_id stored. Run /api/etsy/oauth/start to authorize and capture the shop.',
    }
  }
  return { shop_id: data.shop_id as number }
}

async function getMinLastModifiedUnix(): Promise<number> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('etsy_orders')
    .select('last_synced_at')
    .order('last_synced_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const fallback = Math.floor(Date.now() / 1000) - 24 * 60 * 60
  if (!data?.last_synced_at) return fallback
  const lastMs = new Date(data.last_synced_at).getTime()
  return Math.floor(lastMs / 1000) - 5 * 60
}

function parseSchemaOrEmpty(raw: unknown): PersonalizationSchema {
  if (!raw) return []
  const result = PersonalizationSchemaSchema.safeParse(raw)
  return result.success ? result.data : []
}

async function resolveMapping(tx: EtsyTransaction): Promise<ListingMapping | null> {
  const supabase = createAdminClient()
  const { data: group } = await supabase
    .from('etsy_listing_groups')
    .select('id, personalization_schema')
    .eq('etsy_listing_id', tx.listing_id)
    .maybeSingle()
  if (!group) return null

  const variationValueIds = (tx.variations ?? [])
    .map((v) => v.value_id)
    .filter((v): v is number => typeof v === 'number')

  if (variationValueIds.length === 0) {
    const { data: members } = await supabase
      .from('etsy_listing_group_members')
      .select('preset_id')
      .eq('group_id', group.id)
      .limit(2)
    if (members && members.length === 1) {
      return {
        group_id: group.id,
        preset_id: members[0].preset_id,
        schema: parseSchemaOrEmpty(group.personalization_schema),
      }
    }
    return null
  }

  const { data: member } = await supabase
    .from('etsy_listing_group_members')
    .select('preset_id')
    .eq('group_id', group.id)
    .in('etsy_variation_value_id', variationValueIds)
    .maybeSingle()

  if (!member) return null
  return {
    group_id: group.id,
    preset_id: member.preset_id,
    schema: parseSchemaOrEmpty(group.personalization_schema),
  }
}

async function processReceipt(r: EtsyReceipt, summary: PullSummary): Promise<void> {
  const supabase = createAdminClient()
  const transactions: EtsyTransaction[] = r.transactions ?? []
  const parsedItems: ParsedItem[] = []

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    const raw = getPersonalizationText(tx)
    const mapping = await resolveMapping(tx)

    if (!mapping) {
      parsedItems.push({
        position: i + 1,
        transaction_id: tx.transaction_id,
        listing_id: tx.listing_id,
        preset_id: null,
        group_id: null,
        parsed: null,
        raw,
        status: 'no_mapping',
      })
      continue
    }

    const result = parsePersonalization(raw, mapping.schema)
    if (result.ok) {
      parsedItems.push({
        position: i + 1,
        transaction_id: tx.transaction_id,
        listing_id: tx.listing_id,
        preset_id: mapping.preset_id,
        group_id: mapping.group_id,
        parsed: result.parsed,
        raw,
        status: 'ok',
      })
    } else {
      parsedItems.push({
        position: i + 1,
        transaction_id: tx.transaction_id,
        listing_id: tx.listing_id,
        preset_id: mapping.preset_id,
        group_id: mapping.group_id,
        parsed: result.parsed,
        raw,
        status: 'manual_review',
        missing: result.missing,
        invalid: result.invalid,
      })
    }
  }

  let status: string
  if (parsedItems.length === 0) status = 'manual_review'
  else if (parsedItems.some((i) => i.status === 'no_mapping')) status = 'pending_mapping'
  else if (parsedItems.some((i) => i.status === 'manual_review')) status = 'manual_review'
  else status = 'pending_render'

  if (r.was_canceled) status = 'cancelled'

  const purchaseDate = new Date(
    (r.created_timestamp ?? r.create_timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
  ).toISOString()

  const { error } = await supabase.from('etsy_orders').upsert(
    {
      etsy_receipt_id: r.receipt_id,
      etsy_shop_id: r.shop_id,
      purchase_date: purchaseDate,
      was_paid: Boolean(r.was_paid ?? r.is_paid),
      was_shipped: Boolean(r.was_shipped ?? r.is_shipped),
      was_canceled: Boolean(r.was_canceled),
      status,
      raw_receipt_payload: r,
      raw_transactions_payload: transactions,
      parsed_items: parsedItems,
      shipping_address: getReceiptShippingAddress(r),
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: 'etsy_receipt_id' },
  )

  if (error) {
    summary.failed += 1
    summary.errors.push(`Receipt ${r.receipt_id} upsert failed: ${error.message}`)
    return
  }
  summary.upserted += 1
  if (status === 'pending_render') summary.parsed_ok += 1
  else if (status === 'pending_mapping') summary.parsed_no_mapping += 1
  else if (status === 'manual_review') summary.parsed_manual_review += 1
}

export async function runOrderPull(): Promise<{
  ok: boolean
  summary: PullSummary
  /** etsy_sync_runs row id — admin UI can link to it. */
  run_id: string | null
  /** Status returned to caller. 412 means "config missing", 500 = unexpected. */
  http_status: number
}> {
  const supabase = createAdminClient()
  const summary: PullSummary = {
    fetched: 0,
    upserted: 0,
    parsed_ok: 0,
    parsed_manual_review: 0,
    parsed_no_mapping: 0,
    failed: 0,
    errors: [],
  }

  const { data: runRow } = await supabase
    .from('etsy_sync_runs')
    .insert({ kind: 'order_pull', started_at: new Date().toISOString() })
    .select('id')
    .single()
  const runId = (runRow?.id as string | undefined) ?? null

  const shopResult = await loadShopId()
  if ('error' in shopResult) {
    summary.errors.push(shopResult.error)
    if (runId) {
      await supabase
        .from('etsy_sync_runs')
        .update({
          completed_at: new Date().toISOString(),
          items_failed: 1,
          error_log: shopResult.error,
        })
        .eq('id', runId)
    }
    return { ok: false, summary, run_id: runId, http_status: 412 }
  }

  try {
    const etsy = await createEtsyClient()
    const minLastModified = await getMinLastModifiedUnix()
    const pageSize = 100
    let offset = 0
    let totalSeen = 0
    while (true) {
      const page = await etsy.get<EtsyReceiptsResponse>(
        `/shops/${shopResult.shop_id}/receipts`,
        {
          was_paid: 'true',
          min_last_modified: minLastModified,
          limit: pageSize,
          offset,
        },
      )
      const receipts = page.results ?? []
      summary.fetched += receipts.length
      for (const r of receipts) {
        await processReceipt(r, summary)
      }
      totalSeen += receipts.length
      if (receipts.length < pageSize) break
      offset += pageSize
      if (totalSeen >= 1000) break
    }
  } catch (e) {
    if (e instanceof EtsyAuthError) summary.errors.push(`Auth: ${e.message}`)
    else if (e instanceof EtsyRateLimitError)
      summary.errors.push(`Rate-limit: ${e.message}`)
    else if (e instanceof EtsyApiError)
      summary.errors.push(`API: ${e.message} body=${e.body.slice(0, 200)}`)
    else summary.errors.push(`Unknown: ${(e as Error).message}`)
  }

  const rateLimit = getLastSeenRateLimit()
  if (runId) {
    await supabase
      .from('etsy_sync_runs')
      .update({
        completed_at: new Date().toISOString(),
        items_processed: summary.fetched,
        items_succeeded: summary.upserted,
        items_failed: summary.failed,
        error_log: summary.errors.length > 0 ? summary.errors.join('\n') : null,
        rate_limit_remaining: rateLimit.remaining,
        rate_limit_reset_at: rateLimit.resetAt?.toISOString() ?? null,
      })
      .eq('id', runId)
  }

  return { ok: summary.errors.length === 0, summary, run_id: runId, http_status: 200 }
}
