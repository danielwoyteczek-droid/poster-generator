#!/usr/bin/env tsx
/**
 * PROJ-49 Helper: Baut ein 2x2 Compare-Grid-PNG fuer Etsy-Listings, das die
 * vier verfuegbaren Map-Looks (Original / Dark / Pink / Navy) nebeneinander
 * zeigt — gedacht fuer Listing-Bildslot 3 (siehe docs/etsy/listing-descriptions.md).
 *
 * Eingabe: vier bereits exportierte Poster-PNGs (z. B. aus dem Editor via
 * PROJ-3 Export). Ausgabe: ein quadratisches Composite-PNG, das die Vorlage
 * fuer das Listing-Bild ist.
 *
 * Usage:
 *   npm run etsy:compare-grid -- \
 *     --original=./out/wo-alles-begann-original.png \
 *     --dark=./out/wo-alles-begann-dark.png \
 *     --pink=./out/wo-alles-begann-pink.png \
 *     --navy=./out/wo-alles-begann-navy.png \
 *     --out=./out/etsy-compare-grid.png
 *
 * Optionen:
 *   --size=2000          Quadratische Kantenlaenge (Etsy: min 2000px lange Kante)
 *   --headline="..."     Optionale Headline ueber dem Grid (z. B. „Vier Looks zur Wahl")
 *
 * Voraussetzung: Playwright ist als devDependency installiert (`npx playwright install chromium`).
 */

import { chromium } from 'playwright'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const STYLES = ['original', 'dark', 'pink', 'navy'] as const
type StyleId = (typeof STYLES)[number]

const LABELS: Record<StyleId, string> = {
  original: 'Original',
  dark: 'Dark',
  pink: 'Pink',
  navy: 'Navy',
}

interface Args {
  inputs: Record<StyleId, string>
  out: string
  size: number
  headline: string | null
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const get = (k: string) =>
    argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]

  const inputs = {} as Record<StyleId, string>
  const missing: string[] = []
  for (const s of STYLES) {
    const p = get(s)
    if (!p) {
      missing.push(s)
      continue
    }
    const resolved = path.resolve(p)
    if (!existsSync(resolved)) {
      console.error(`File not found: ${resolved}`)
      process.exit(1)
    }
    inputs[s] = resolved
  }
  if (missing.length > 0) {
    console.error(`Missing input flags: ${missing.map((s) => `--${s}=<path>`).join(', ')}`)
    console.error('Usage: see header of build-etsy-compare-grid.ts')
    process.exit(1)
  }

  return {
    inputs,
    out: path.resolve(get('out') ?? './out/etsy-compare-grid.png'),
    size: Number(get('size') ?? '2000'),
    headline: get('headline') ?? null,
  }
}

async function imageToDataUri(p: string): Promise<string> {
  const buf = await readFile(p)
  return `data:image/png;base64,${buf.toString('base64')}`
}

function buildHtml(
  size: number,
  images: Record<StyleId, string>,
  headline: string | null,
): string {
  const headlineHeight = headline ? 80 : 0
  return `<!doctype html>
<html>
<head><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${size}px;
    height: ${size}px;
    background: #ffffff;
    font-family: -apple-system, 'Inter', 'Segoe UI', sans-serif;
  }
  .container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .headline {
    height: ${headlineHeight}px;
    display: ${headline ? 'flex' : 'none'};
    align-items: center;
    justify-content: center;
    font-size: 42px;
    font-weight: 500;
    color: #1F3A44;
    letter-spacing: 0.02em;
  }
  .grid {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 32px;
    padding: 32px;
  }
  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #fafaf7;
    border-radius: 16px;
    padding: 24px;
    overflow: hidden;
  }
  .cell img {
    width: 100%;
    height: calc(100% - 64px);
    object-fit: contain;
  }
  .label {
    font-size: 38px;
    font-weight: 600;
    color: #1F3A44;
    margin-top: 16px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
</style></head>
<body>
  <div class="container">
    ${headline ? `<div class="headline">${escapeHtml(headline)}</div>` : ''}
    <div class="grid">
${STYLES.map(
  (s) =>
    `      <div class="cell"><img src="${images[s]}"/><div class="label">${LABELS[s]}</div></div>`,
).join('\n')}
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function main() {
  const args = parseArgs()
  console.log(`Building ${args.size}x${args.size} compare grid → ${args.out}`)

  const dataUris = {} as Record<StyleId, string>
  for (const s of STYLES) {
    dataUris[s] = await imageToDataUri(args.inputs[s])
    console.log(`  ✓ loaded ${s}: ${args.inputs[s]}`)
  }

  const html = buildHtml(args.size, dataUris, args.headline)

  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({
      viewport: { width: args.size, height: args.size },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    // Brief paint stabilisation — keine Netzwerk-Requests, daher kurz reicht.
    await page.waitForTimeout(200)
    const buf = await page.screenshot({ type: 'png', omitBackground: false })
    await mkdir(path.dirname(args.out), { recursive: true })
    await writeFile(args.out, buf)
    console.log(`✓ written ${args.out} (${Math.round(buf.byteLength / 1024)} KB)`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
