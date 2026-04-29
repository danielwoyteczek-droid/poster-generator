import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

const GITHUB_API = 'https://api.github.com'
const WORKFLOW_FILE = 'render-worker.yml'

/**
 * Triggers the GitHub Actions Render-Worker workflow_dispatch from the Admin UI
 * so the operator does not have to switch tabs and re-auth on github.com.
 *
 * Requires:
 *  - GITHUB_WORKFLOW_TRIGGER_TOKEN: fine-grained PAT with `Actions: Read and write`
 *  - GITHUB_REPO: "owner/repo" (e.g. "danielwoyteczek-droid/poster-generator")
 */
export async function POST() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const token = process.env.GITHUB_WORKFLOW_TRIGGER_TOKEN
  const repo = process.env.GITHUB_REPO

  if (!token || !repo) {
    return NextResponse.json(
      {
        error:
          'GitHub-Trigger nicht konfiguriert. Bitte GITHUB_WORKFLOW_TRIGGER_TOKEN und GITHUB_REPO in den ENV-Variablen setzen.',
      },
      { status: 500 },
    )
  }

  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    return NextResponse.json({ error: 'GITHUB_REPO muss im Format "owner/repo" sein' }, { status: 500 })
  }

  const dispatchRes = await fetch(
    `${GITHUB_API}/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    },
  )

  if (!dispatchRes.ok) {
    const message = await dispatchRes.text().catch(() => '')
    return NextResponse.json(
      {
        error: `GitHub-Trigger fehlgeschlagen (HTTP ${dispatchRes.status})`,
        detail: message.slice(0, 400),
      },
      { status: 502 },
    )
  }

  // workflow_dispatch returns 204 No Content (no run id). Best-effort: query the
  // most recent run for this workflow so the UI can deep-link to the run page.
  let runUrl: string | null = null
  try {
    const runsRes = await fetch(
      `${GITHUB_API}/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/runs?event=workflow_dispatch&per_page=1`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        cache: 'no-store',
      },
    )
    if (runsRes.ok) {
      const data = (await runsRes.json()) as { workflow_runs?: Array<{ html_url?: string }> }
      runUrl = data.workflow_runs?.[0]?.html_url ?? null
    }
  } catch {
    // Non-fatal — trigger succeeded, only the deep-link is missing.
  }

  return NextResponse.json({ ok: true, runUrl })
}
