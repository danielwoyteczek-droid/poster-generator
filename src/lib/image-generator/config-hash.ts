// PROJ-56: Fingerabdruck einer Preset-Konfiguration. Wird vom Render-Worker
// (render_inputs_hash_a4) und vom Image Generator (base_config_hash) genutzt,
// um veraltete Poster und Galerie-Bilder zu erkennen.
//
// Nur relative/Node-Importe: wird auch von scripts/render-worker.ts geladen.

import crypto from 'node:crypto'

/**
 * Stabiler JSON-String mit sortierten Schlüsseln. jsonb liefert Schlüssel zwar
 * schon normalisiert, aber im Worker oder Tests kann ein Objekt auch aus
 * Code stammen — Sortieren macht den Hash unabhängig davon.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
}

export function configHash(config: unknown): string {
  return crypto.createHash('sha256').update(stableStringify(config ?? {})).digest('hex')
}
