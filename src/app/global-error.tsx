'use client'

/**
 * App-Router-Top-Level-Error-Boundary. Fängt React-Fehler ab, die nicht in
 * einer untergeordneten error.tsx behandelt wurden, schickt sie an Sentry
 * und zeigt eine minimalistische Fallback-UI. Wird sehr selten getriggert
 * — die meisten Fehler werden von näheren Boundaries oder Next-internen
 * Recovery-Mechanismen aufgefangen.
 */
import * as Sentry from '@sentry/nextjs'
import NextError from 'next/error'
import { useEffect } from 'react'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  )
}
