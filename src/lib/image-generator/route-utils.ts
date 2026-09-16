// PROJ-56: gemeinsame Hilfen der Image-Generator-Endpunkte.

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { GeneratorError } from './server'

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof GeneratorError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  Sentry.captureException(err, { tags: { feature: 'image-generator' } })
  const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
  return NextResponse.json({ error: message }, { status: 500 })
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function invalidId(): NextResponse {
  return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 })
}
