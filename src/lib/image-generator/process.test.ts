// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { configHash } from './config-hash'
import { fitOverlayToCanvas, orientationOf, runFastPath, sourcePosterState, type ImageRow, type SourceRow } from './process'

function source(over: Partial<SourceRow> = {}): SourceRow {
  return {
    id: 's1',
    config_json: { paletteId: 'mint' },
    render_status_a4: 'done',
    render_error_a4: null,
    preview_image_url_a4: 'https://cdn.example/a4.jpg',
    render_inputs_hash_a4: null,
    ...over,
  }
}

describe('sourcePosterState', () => {
  it('fertiges Poster ohne Hash gilt als aktuell (Renders vor PROJ-56)', () => {
    expect(sourcePosterState(source())).toBe('ready')
  })
  it('fertiges Poster mit passendem Hash ist bereit', () => {
    expect(sourcePosterState(source({ render_inputs_hash_a4: configHash({ paletteId: 'mint' }) }))).toBe('ready')
  })
  it('fertiges Poster für ältere Konfiguration ist veraltet', () => {
    expect(sourcePosterState(source({ render_inputs_hash_a4: configHash({ paletteId: 'alt' }) }))).toBe('stale')
  })
  it('wartet bei offenem Render oder fehlender URL', () => {
    expect(sourcePosterState(source({ render_status_a4: 'pending' }))).toBe('waiting')
    expect(sourcePosterState(source({ render_status_a4: 'rendering' }))).toBe('waiting')
    expect(sourcePosterState(source({ preview_image_url_a4: null }))).toBe('waiting')
  })
  it('meldet fehlgeschlagene und fehlende Quellen', () => {
    expect(sourcePosterState(source({ render_status_a4: 'failed' }))).toBe('failed')
    expect(sourcePosterState(undefined)).toBe('missing')
  })
})

describe('orientationOf', () => {
  it('ist Hochformat, außer ausdrücklich quer', () => {
    expect(orientationOf({ orientation: 'landscape' })).toBe('landscape')
    expect(orientationOf({})).toBe('portrait')
    expect(orientationOf(null)).toBe('portrait')
  })
})

describe('fitOverlayToCanvas', () => {
  it('bringt das Overlay unverzerrt auf die Canvas-Größe', async () => {
    const overlay = await sharp({ create: { width: 800, height: 800, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } }).png().toBuffer()
    const out = await fitOverlayToCanvas(overlay, 1000, 1500)
    const meta = await sharp(out).metadata()
    expect([meta.width, meta.height, meta.hasAlpha]).toEqual([1000, 1500, true])
    // Ecke oben links liegt außerhalb des (zentrierten, quadratischen) Overlays → transparent
    const { data } = await sharp(out).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true })
    expect(data[3]).toBe(0)
  })
})

describe('runFastPath', () => {
  function image(over: Partial<ImageRow>): ImageRow {
    return {
      id: 'i1', preset_id: 'p1', palette_id: null, mockup_set_id: 'local', overlay_id: null, position: 1,
      source_preset_id: 's1', status: 'pending', error: null, storage_path: null, image_url: null,
      width: null, height: null, base_config_hash: null, claimed_at: null, rendered_at: null, created_at: 'now',
      ...over,
    }
  }

  function fakeSupabase(sources: SourceRow[]) {
    const claimed: string[] = []
    const client = {
      from: (table: string) => {
        if (table === 'mockup_sets') {
          return { select: () => ({ in: () => Promise.resolve({ data: [{ id: 'local', provider: 'local' }, { id: 'dm', provider: 'dynamic_mockups' }] }) }) }
        }
        if (table === 'presets') {
          return { select: () => ({ in: () => Promise.resolve({ data: sources }) }) }
        }
        // image_generator_images: Reservierung schlägt bewusst fehl → es wird nichts gerendert,
        // aber wir sehen, welche Bilder der Schnellweg versucht hätte.
        return {
          update: () => {
            const chain = {
              eq: (col: string, val: string) => { if (col === 'id') claimed.push(val); return chain },
              select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
            }
            return chain
          },
        }
      },
    }
    return { client, claimed }
  }

  it('versucht nur lokale Mockups mit fertigem Poster', async () => {
    const { client, claimed } = fakeSupabase([source({ id: 's1' }), source({ id: 's2', render_status_a4: 'pending' })])
    const done = await runFastPath(client as never, [
      image({ id: 'ok' }),
      image({ id: 'dm', mockup_set_id: 'dm' }),
      image({ id: 'wartet', source_preset_id: 's2' }),
      image({ id: 'fertig', status: 'done' }),
    ], { budgetMs: 10_000 })
    expect(done).toBe(0)
    expect(claimed).toEqual(['ok'])
  })

  it('hält das Zeitbudget ein', async () => {
    const { client, claimed } = fakeSupabase([source()])
    const now = vi.fn().mockReturnValueOnce(0).mockReturnValue(99_999)
    await runFastPath(client as never, [image({ id: 'a' }), image({ id: 'b' })], { budgetMs: 1000, now })
    expect(claimed).toEqual([])
  })
})
