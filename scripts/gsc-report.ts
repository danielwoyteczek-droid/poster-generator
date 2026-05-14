#!/usr/bin/env tsx
/**
 * Google Search Console Weekly Report.
 *
 * Zieht Top-Queries, Low-CTR-Pages, Ranking-Opportunities (Pos. 8–20),
 * Indexierungs-Status für kuratierte URLs (scripts/gsc-report.config.ts)
 * und Sitemap-Status. Schreibt das Ergebnis als Markdown nach reports/gsc/.
 *
 * Usage:
 *   npm run gsc:report
 *
 * Voraussetzungen (Einmal-Setup):
 *   1. GCP Console → APIs aktivieren: "Google Search Console API"
 *      https://console.cloud.google.com/apis/library/searchconsole.googleapis.com
 *   2. OAuth-Credentials erstellen (Typ: "Desktop App")
 *      → JSON nach .gsc/client_secret.json speichern
 *   3. In der GSC die Property mit demselben Google-Account als Inhaber/Nutzer
 *   4. Erstaufruf: Browser öffnet sich → Zugriff erlauben →
 *      Token landet automatisch in .gsc/token.json (gitignored)
 *
 * Env-Vars (optional, .env.local):
 *   GSC_PROPERTY  Default: sc-domain:petite-moment.com
 */

import { google, type searchconsole_v1 } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import { config as loadEnv } from 'dotenv'
import { promises as fs } from 'node:fs'
import * as http from 'node:http'
import * as path from 'node:path'
import { INSPECT_URLS } from './gsc-report.config'

loadEnv({ path: '.env.local' })

const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']
const CLIENT_SECRET_PATH = path.resolve('.gsc/client_secret.json')
const TOKEN_PATH = path.resolve('.gsc/token.json')
const PROPERTY = process.env.GSC_PROPERTY ?? 'sc-domain:petite-moment.com'
const REPORT_DIR = path.resolve('reports/gsc')
const OAUTH_PORT = 53682 // Fester Port für den Loopback-Redirect

// GSC liefert Daten mit 2–3 Tagen Lag; Fenster endet 3 Tage in der Vergangenheit.
const DAYS_LAG = 3
const WINDOW_DAYS = 28

// API-Quota: urlInspection 600/min — 150ms Pause hält uns mit Puffer drunter.
const INSPECT_DELAY_MS = 150

type Sc = searchconsole_v1.Searchconsole
type Row = searchconsole_v1.Schema$ApiDataRow

interface ClientSecret {
  client_id: string
  client_secret: string
}

async function readClientSecret(): Promise<ClientSecret> {
  const raw = await fs.readFile(CLIENT_SECRET_PATH, 'utf8')
  const keys = JSON.parse(raw)
  const key = keys.installed ?? keys.web
  if (!key?.client_id || !key?.client_secret) {
    throw new Error(`Ungültige client_secret.json — fehlende client_id/secret`)
  }
  return { client_id: key.client_id, client_secret: key.client_secret }
}

async function loadSavedToken(): Promise<OAuth2Client | null> {
  try {
    const raw = await fs.readFile(TOKEN_PATH, 'utf8')
    const creds = JSON.parse(raw)
    return google.auth.fromJSON(creds) as unknown as OAuth2Client
  } catch {
    return null
  }
}

async function persistToken(secret: ClientSecret, refreshToken: string) {
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: secret.client_id,
    client_secret: secret.client_secret,
    refresh_token: refreshToken,
  })
  await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true })
  await fs.writeFile(TOKEN_PATH, payload, 'utf8')
}

async function waitForOAuthCallback(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url ?? '/', `http://localhost:${port}`)
        const code = reqUrl.searchParams.get('code')
        const error = reqUrl.searchParams.get('error')
        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(`<h1>OAuth-Fehler</h1><p>${error}</p><p>Tab kann zu.</p>`)
          server.close()
          reject(new Error(`OAuth error: ${error}`))
          return
        }
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(
            `<h1>✓ Authentifizierung erfolgreich</h1>` +
              `<p>Du kannst diesen Tab schließen und zum Terminal zurückkehren.</p>`,
          )
          server.close()
          resolve(code)
          return
        }
        res.writeHead(400)
        res.end('Missing code parameter')
      } catch (err) {
        server.close()
        reject(err)
      }
    })
    server.on('error', reject)
    server.listen(port, '127.0.0.1')
  })
}

async function runOAuthFlow(): Promise<OAuth2Client> {
  const secret = await readClientSecret()
  const redirectUri = `http://localhost:${OAUTH_PORT}`
  const oauth2 = new google.auth.OAuth2(secret.client_id, secret.client_secret, redirectUri)

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })

  console.log('\n┌─ OAuth-Consent erforderlich ─────────────────────────────────')
  console.log('│')
  console.log('│ Diese URL im Browser öffnen und mit dem Google-Account einloggen,')
  console.log('│ der Inhaber der GSC-Property ist:')
  console.log('│')
  console.log('│', authUrl)
  console.log('│')
  console.log(`│ Lokaler Callback-Server lauscht auf ${redirectUri}`)
  console.log('└──────────────────────────────────────────────────────────────\n')

  const code = await waitForOAuthCallback(OAUTH_PORT)
  const { tokens } = await oauth2.getToken(code)
  oauth2.setCredentials(tokens)

  if (tokens.refresh_token) {
    await persistToken(secret, tokens.refresh_token)
    console.log(`✓ Token gespeichert: ${TOKEN_PATH}`)
  } else {
    console.warn(
      '⚠ Kein refresh_token erhalten. Vermutlich war der Account schon autorisiert.\n' +
        '  → https://myaccount.google.com/permissions Zugriff der App entziehen, dann nochmal.',
    )
  }
  return oauth2 as unknown as OAuth2Client
}

async function getAuthClient(): Promise<OAuth2Client> {
  const saved = await loadSavedToken()
  if (saved) return saved

  try {
    await fs.access(CLIENT_SECRET_PATH)
  } catch {
    console.error(
      `\n[gsc-report] Fehlt: ${CLIENT_SECRET_PATH}\n` +
        `→ In GCP Console OAuth-Credentials (Desktop App) anlegen und JSON dorthin kopieren.\n` +
        `   https://console.cloud.google.com/apis/credentials\n`,
    )
    process.exit(1)
  }
  return runOAuthFlow()
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getDateRange() {
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - DAYS_LAG)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - WINDOW_DAYS + 1)
  return { startDate: fmtDate(start), endDate: fmtDate(end) }
}

async function querySearchAnalytics(
  sc: Sc,
  range: { startDate: string; endDate: string },
  dimensions: string[],
  rowLimit: number,
  orderBy: 'clicks' | 'impressions' = 'clicks',
): Promise<Row[]> {
  const res = await sc.searchanalytics.query({
    siteUrl: PROPERTY,
    requestBody: {
      ...range,
      dimensions,
      rowLimit,
      // orderBy ist nicht offiziell in der API — sortieren wir client-side.
    },
  })
  const rows = res.data.rows ?? []
  rows.sort((a, b) => (b[orderBy] ?? 0) - (a[orderBy] ?? 0))
  return rows
}

async function inspectUrl(sc: Sc, url: string) {
  try {
    const res = await sc.urlInspection.index.inspect({
      requestBody: { inspectionUrl: url, siteUrl: PROPERTY },
    })
    const status = res.data.inspectionResult?.indexStatusResult
    return {
      url,
      verdict: status?.verdict ?? 'UNKNOWN',
      coverage: status?.coverageState ?? '-',
      lastCrawl: status?.lastCrawlTime?.slice(0, 10) ?? '-',
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { url, verdict: 'ERROR', coverage: msg.slice(0, 80), lastCrawl: '-' }
  }
}

async function fetchSitemaps(sc: Sc) {
  try {
    const res = await sc.sitemaps.list({ siteUrl: PROPERTY })
    return res.data.sitemap ?? []
  } catch {
    return []
  }
}

const fmt = (n?: number | null) => (n == null ? '-' : n.toLocaleString('de-DE'))
const fmtCtr = (n?: number | null) => (n == null ? '-' : (n * 100).toFixed(1) + '%')
const fmtPos = (n?: number | null) => (n == null ? '-' : n.toFixed(1))

function verdictEmoji(v: string): string {
  switch (v) {
    case 'PASS':
      return '✅'
    case 'PARTIAL':
      return '⚠️'
    case 'FAIL':
      return '❌'
    case 'NEUTRAL':
      return '➖'
    case 'ERROR':
      return '🔴'
    default:
      return '❓'
  }
}

function escape(s: string | undefined | null): string {
  return (s ?? '').replace(/\|/g, '\\|')
}

interface ReportData {
  range: { startDate: string; endDate: string }
  queries: Row[]
  pages: Row[]
  opportunities: Row[]
  inspections: Awaited<ReturnType<typeof inspectUrl>>[]
  sitemaps: searchconsole_v1.Schema$WmxSitemap[]
}

function renderMarkdown(d: ReportData): string {
  const { range, queries, pages, opportunities, inspections, sitemaps } = d
  const lines: string[] = []

  lines.push(`# GSC Report — ${PROPERTY}`)
  lines.push('')
  lines.push(`**Zeitraum:** ${range.startDate} → ${range.endDate} (${WINDOW_DAYS} Tage)`)
  lines.push(`**Generiert:** ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`)
  lines.push('')

  // Summary totals
  const totals = queries.reduce<{ clicks: number; impressions: number }>(
    (acc, r) => ({
      clicks: acc.clicks + (r.clicks ?? 0),
      impressions: acc.impressions + (r.impressions ?? 0),
    }),
    { clicks: 0, impressions: 0 },
  )
  lines.push('## Übersicht')
  lines.push('')
  lines.push(`- **Top-50-Queries gesamt:** ${fmt(totals.clicks)} Clicks · ${fmt(totals.impressions)} Impressions`)
  lines.push('')

  // Top queries
  lines.push(`## Top-Queries (nach Klicks)`)
  lines.push('')
  lines.push('| # | Query | Clicks | Impr. | CTR | Pos. |')
  lines.push('|---|-------|-------:|------:|----:|-----:|')
  queries.slice(0, 50).forEach((r, i) => {
    lines.push(
      `| ${i + 1} | ${escape(r.keys?.[0])} | ${fmt(r.clicks)} | ${fmt(r.impressions)} | ${fmtCtr(r.ctr)} | ${fmtPos(r.position)} |`,
    )
  })
  lines.push('')

  // Low-CTR opportunities
  const lowCtr = pages
    .filter((p) => (p.impressions ?? 0) >= 100 && (p.ctr ?? 0) < 0.02)
    .sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))
    .slice(0, 20)
  lines.push('## Low-CTR-Opportunities (Impr. ≥ 100, CTR < 2%)')
  lines.push('')
  if (lowCtr.length === 0) {
    lines.push('_Keine Funde._')
  } else {
    lines.push('| Page | Impr. | CTR | Pos. |')
    lines.push('|------|------:|----:|-----:|')
    lowCtr.forEach((p) => {
      lines.push(
        `| ${escape(p.keys?.[0])} | ${fmt(p.impressions)} | ${fmtCtr(p.ctr)} | ${fmtPos(p.position)} |`,
      )
    })
  }
  lines.push('')

  // Ranking opportunities (pos 8-20)
  const opps = opportunities
    .filter(
      (r) =>
        (r.position ?? 0) >= 8 &&
        (r.position ?? 0) <= 20 &&
        (r.impressions ?? 0) >= 10,
    )
    .sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))
    .slice(0, 30)
  lines.push('## Ranking-Opportunities (Position 8–20, Impr. ≥ 10)')
  lines.push('')
  if (opps.length === 0) {
    lines.push('_Keine Funde._')
  } else {
    lines.push('| Query | Page | Impr. | Pos. |')
    lines.push('|-------|------|------:|-----:|')
    opps.forEach((r) => {
      lines.push(
        `| ${escape(r.keys?.[0])} | ${escape(r.keys?.[1])} | ${fmt(r.impressions)} | ${fmtPos(r.position)} |`,
      )
    })
  }
  lines.push('')

  // URL inspections
  lines.push('## Indexierungs-Status')
  lines.push('')
  if (inspections.length === 0) {
    lines.push('_Keine URLs konfiguriert (siehe scripts/gsc-report.config.ts)._')
  } else {
    lines.push('| URL | Verdict | Coverage | Last Crawl |')
    lines.push('|-----|---------|----------|------------|')
    inspections.forEach((r) => {
      lines.push(
        `| ${escape(r.url)} | ${verdictEmoji(r.verdict)} ${r.verdict} | ${escape(r.coverage)} | ${r.lastCrawl} |`,
      )
    })
  }
  lines.push('')

  // Sitemaps
  lines.push('## Sitemaps')
  lines.push('')
  if (sitemaps.length === 0) {
    lines.push('_Keine Sitemaps registriert._')
  } else {
    lines.push('| Path | Submitted | Last Read | Errors | Warnings | URLs |')
    lines.push('|------|-----------|-----------|-------:|---------:|-----:|')
    sitemaps.forEach((s) => {
      const submittedUrls = s.contents?.[0]?.submitted ?? '-'
      lines.push(
        `| ${escape(s.path)} | ${s.lastSubmitted?.slice(0, 10) ?? '-'} | ${s.lastDownloaded?.slice(0, 10) ?? '-'} | ${s.errors ?? 0} | ${s.warnings ?? 0} | ${submittedUrls} |`,
      )
    })
  }
  lines.push('')

  return lines.join('\n')
}

async function main() {
  console.log(`GSC Report für ${PROPERTY}`)
  const auth = await getAuthClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- googleapis/local-auth version drift
  const sc = google.searchconsole({ version: 'v1', auth: auth as any })

  const range = getDateRange()
  console.log(`Zeitraum: ${range.startDate} → ${range.endDate}`)

  console.log('Hole Search-Analytics + Sitemap-Status…')
  const [queries, pages, opportunities, sitemaps] = await Promise.all([
    querySearchAnalytics(sc, range, ['query'], 50, 'clicks'),
    querySearchAnalytics(sc, range, ['page'], 200, 'impressions'),
    querySearchAnalytics(sc, range, ['query', 'page'], 1000, 'impressions'),
    fetchSitemaps(sc),
  ])
  console.log(`  queries=${queries.length} pages=${pages.length} opps=${opportunities.length} sitemaps=${sitemaps.length}`)

  console.log(`Prüfe Indexierung für ${INSPECT_URLS.length} URLs…`)
  const inspections: Awaited<ReturnType<typeof inspectUrl>>[] = []
  for (const url of INSPECT_URLS) {
    inspections.push(await inspectUrl(sc, url))
    process.stdout.write('.')
    await new Promise((r) => setTimeout(r, INSPECT_DELAY_MS))
  }
  process.stdout.write('\n')

  const md = renderMarkdown({ range, queries, pages, opportunities, inspections, sitemaps })

  await fs.mkdir(REPORT_DIR, { recursive: true })
  const reportPath = path.join(REPORT_DIR, `${fmtDate(new Date())}.md`)
  await fs.writeFile(reportPath, md, 'utf8')

  console.log('\n' + md)
  console.log(`\n✓ Gespeichert: ${reportPath}`)
}

main().catch((err) => {
  console.error('fatal:', err instanceof Error ? (err.stack ?? err.message) : err)
  process.exit(1)
})
