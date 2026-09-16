import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { triggerRenderWorker } from '@/lib/render-worker-trigger'

/**
 * Triggers the GitHub Actions Render-Worker workflow_dispatch from the Admin UI
 * so the operator does not have to switch tabs and re-auth on github.com.
 * Configuration: see src/lib/render-worker-trigger.ts.
 */
export async function POST() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const result = await triggerRenderWorker()
  if (!result.ok) {
    return NextResponse.json(
      result.detail ? { error: result.error, detail: result.detail } : { error: result.error },
      { status: result.status },
    )
  }
  return NextResponse.json({ ok: true, runUrl: result.runUrl })
}
