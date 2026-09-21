// Startet den GitHub-Actions-Render-Worker (workflow_dispatch).
// Genutzt vom Admin-Knopf „Worker starten" (PROJ-30) und automatisch vom
// Image Generator (PROJ-56).
//
// Requires:
//  - GITHUB_WORKFLOW_TRIGGER_TOKEN: fine-grained PAT with `Actions: Read and write`
//  - GITHUB_REPO: "owner/repo"

const GITHUB_API = 'https://api.github.com'
const WORKFLOW_FILE = 'render-worker.yml'

export type TriggerRenderWorkerResult =
  | { ok: true; triggered: true; runUrl: string | null }
  | { ok: true; triggered: false; reason: 'already_active'; runUrl: string | null }
  | { ok: false; status: number; error: string; detail?: string }

function githubHeaders(token: string): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function latestRun(repo: string, token: string, status?: 'queued' | 'in_progress'): Promise<{ html_url?: string } | null> {
  const params = new URLSearchParams({ per_page: '1' })
  if (status) params.set('status', status)
  else params.set('event', 'workflow_dispatch')
  const res = await fetch(
    `${GITHUB_API}/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/runs?${params.toString()}`,
    { headers: githubHeaders(token), cache: 'no-store' },
  )
  if (!res.ok) return null
  const data = (await res.json()) as { workflow_runs?: Array<{ html_url?: string }> }
  return data.workflow_runs?.[0] ?? null
}

export async function triggerRenderWorker(opts: { skipIfActive?: boolean } = {}): Promise<TriggerRenderWorkerResult> {
  // .trim() because Vercel preserves trailing newlines that slip in when the
  // value is pasted from a multi-line clipboard buffer (e.g. from .env.local).
  const token = process.env.GITHUB_WORKFLOW_TRIGGER_TOKEN?.trim()
  const repo = process.env.GITHUB_REPO?.trim()

  if (!token || !repo) {
    return {
      ok: false,
      status: 500,
      error: 'GitHub-Trigger nicht konfiguriert. Bitte GITHUB_WORKFLOW_TRIGGER_TOKEN und GITHUB_REPO in den ENV-Variablen setzen.',
    }
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    return { ok: false, status: 500, error: 'GITHUB_REPO muss im Format "owner/repo" sein' }
  }

  if (opts.skipIfActive) {
    try {
      const active = (await latestRun(repo, token, 'queued')) ?? (await latestRun(repo, token, 'in_progress'))
      if (active) return { ok: true, triggered: false, reason: 'already_active', runUrl: active.html_url ?? null }
    } catch {
      // Prüfung ist best-effort — im Zweifel lieber anstoßen.
    }
  }

  const dispatchRes = await fetch(
    `${GITHUB_API}/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: 'POST',
      headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main' }),
    },
  )

  if (!dispatchRes.ok) {
    const message = await dispatchRes.text().catch(() => '')
    return {
      ok: false,
      status: 502,
      error: `GitHub-Trigger fehlgeschlagen (HTTP ${dispatchRes.status})`,
      detail: message.slice(0, 400),
    }
  }

  // workflow_dispatch returns 204 No Content (no run id). Best-effort: query the
  // most recent run for this workflow so the UI can deep-link to the run page.
  let runUrl: string | null = null
  try {
    runUrl = (await latestRun(repo, token))?.html_url ?? null
  } catch {
    // Non-fatal — trigger succeeded, only the deep-link is missing.
  }
  return { ok: true, triggered: true, runUrl }
}
