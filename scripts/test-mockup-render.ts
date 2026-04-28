/**
 * Smoke-Test für PROJ-30 Phase 3: Dynamic Mockups Client.
 *
 * Schickt ein Demo-Poster-PNG an Dynamic Mockups, holt das Composite zurück
 * und schreibt's nach `tmp/mockup-test-<timestamp>.png`.
 *
 * Aufruf:
 *   npm run render:test-mockup -- <template-uuid> <smart-object-uuid> [asset-url]
 *
 * Defaults:
 *   asset-url = https://dynamicmockups.com/logo.png  (offizielles Demo-Asset)
 *
 * Voraussetzungen:
 *   - .env.local enthält DYNAMIC_MOCKUPS_API_KEY
 *   - Dynamic Mockups Account hat freie Render-Credits
 */

import { config as loadEnv } from 'dotenv'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { renderMockup, fetchCompositeBuffer, DynamicMockupsApiError } from '../src/lib/dynamic-mockups-client'

loadEnv({ path: '.env.local' })

const DEFAULT_ASSET_URL = 'https://dynamicmockups.com/logo.png'

async function main() {
  const [, , templateUuid, smartObjectUuid, assetUrlArg] = process.argv

  if (!templateUuid || !smartObjectUuid) {
    console.error('Usage: npm run render:test-mockup -- <template-uuid> <smart-object-uuid> [asset-url]')
    console.error('       asset-url default: https://dynamicmockups.com/logo.png')
    process.exit(1)
  }

  const assetUrl = assetUrlArg ?? DEFAULT_ASSET_URL

  console.log(`[mockup-test] template_uuid:     ${templateUuid}`)
  console.log(`[mockup-test] smart_object_uuid: ${smartObjectUuid}`)
  console.log(`[mockup-test] asset_url:         ${assetUrl}`)
  console.log(`[mockup-test] Sende POST /api/v1/renders ...`)

  const t0 = Date.now()
  let exportPath: string
  try {
    const result = await renderMockup({
      templateUuid,
      smartObjectUuid,
      assetUrl,
    })
    exportPath = result.exportPath
    console.log(`[mockup-test] ✓ API-Antwort in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
    console.log(`[mockup-test]   export_path: ${exportPath}`)
    if (result.exportLabel) console.log(`[mockup-test]   export_label: ${result.exportLabel}`)
  } catch (err) {
    if (err instanceof DynamicMockupsApiError) {
      console.error(`[mockup-test] ✗ API-Fehler (HTTP ${err.status}): ${err.message}`)
      if (err.responseBody) console.error('[mockup-test]   Body:', JSON.stringify(err.responseBody, null, 2))
    } else {
      console.error('[mockup-test] ✗ Unerwarteter Fehler:', err)
    }
    process.exit(1)
  }

  console.log(`[mockup-test] Lade Composite herunter ...`)
  const tDownload = Date.now()
  const buffer = await fetchCompositeBuffer(exportPath)
  console.log(`[mockup-test] ✓ Download in ${((Date.now() - tDownload) / 1000).toFixed(1)}s (${(buffer.length / 1024).toFixed(0)} KB)`)

  const tmpDir = join(process.cwd(), 'tmp')
  await mkdir(tmpDir, { recursive: true })
  const outPath = join(tmpDir, `mockup-test-${Date.now()}.png`)
  await writeFile(outPath, buffer)

  console.log(`[mockup-test] ✓ Gespeichert: ${outPath}`)
}

main().catch((err) => {
  console.error('[mockup-test] Fatal:', err)
  process.exit(1)
})
