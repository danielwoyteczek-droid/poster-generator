'use client'

import { useEffect, useState } from 'react'
import { DTF_SHEET_FORMATS, type DtfSheetFormat } from '@/lib/dtf-constants'
import { elementHeightMm, isImageElement, type DtfElement } from '@/hooks/useDtfStore'

/**
 * PROJ-55: Statische Bogenvorschau für Warenkorb und Freigabe-Dialog.
 *
 * Zeichnet aus derselben Bogenbeschreibung wie der Editor und später die
 * Druckdatei — Millimeter, ein Umrechnungsfaktor, sonst nichts. Das ist bei
 * diesem Produkt keine Formsache: Der Kunde erteilt die Druckfreigabe auf
 * Basis dessen, was er hier sieht. Ein zweiter, eigener Zeichenweg könnte
 * abweichen, und dann hätte er etwas freigegeben, das er nie gesehen hat.
 *
 * Karomuster als Hintergrund, weil der Bogen Folie ist: Weiße Flächen im
 * Motiv werden gedruckt und müssen von „nichts" unterscheidbar bleiben.
 *
 * Die Bilder holt die Vorschau über die `uploadId` frisch, statt sich auf
 * eine mitgespeicherte URL zu verlassen. Eine solche URL überlebt den
 * Warenkorb nicht: `blob:` stirbt mit der Seite, eine signierte läuft ab.
 * Gerade hier darf das nicht passieren — der Freigabe-Dialog benutzt
 * dieselbe Komponente, und eine leere Vorschau wäre eine Freigabe auf
 * nichts.
 */
export function DtfSheetPreview({
  format,
  elements,
  widthPx = 120,
}: {
  format: DtfSheetFormat
  elements: DtfElement[]
  /** Darstellungsbreite. Die Höhe folgt dem Seitenverhältnis des Bogens. */
  widthPx?: number
}) {
  const sheet = DTF_SHEET_FORMATS[format]
  const pxPerMm = widthPx / sheet.widthMm
  const heightPx = sheet.heightMm * pxPerMm

  const imageElements = [...elements].filter(isImageElement).sort((a, b) => a.z - b.z)
  const resolved = useResolvedPreviewUrls(imageElements.map((el) => el.uploadId))

  return (
    <div
      className="shrink-0 rounded-sm ring-1 ring-border relative overflow-hidden"
      style={{
        width: widthPx,
        height: heightPx,
        backgroundColor: '#fff',
        backgroundImage:
          'linear-gradient(45deg,#eee 25%,transparent 25%),linear-gradient(-45deg,#eee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eee 75%),linear-gradient(-45deg,transparent 75%,#eee 75%)',
        backgroundSize: '10px 10px',
        backgroundPosition: '0 0,0 5px,5px -5px,-5px 0',
      }}
    >
      {/* Text ist zu diesem Zeitpunkt bereits gerastert und damit ein
          Bildelement. Der Filter ist die Absicherung dagegen, dass ein
          nicht gerastertes Textelement still verschwindet. */}
      {imageElements.map((el) => {
        // Frisch signierte URL bevorzugt; `previewUrl` deckt nur den
        // Moment ab, in dem das Motiv gerade im Editor erzeugt wurde.
        const src = resolved[el.uploadId] ?? el.previewUrl
        if (!src) return null
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={el.id}
            src={src}
            alt=""
            draggable={false}
            className="absolute object-fill"
            style={{
              left: el.xMm * pxPerMm,
              top: el.yMm * pxPerMm,
              width: el.widthMm * pxPerMm,
              height: elementHeightMm(el) * pxPerMm,
              transform: `rotate(${el.rotationDeg}deg)`,
            }}
          />
        )
      })}
    </div>
  )
}

/**
 * Signierte Vorschau-URLs zu einer Liste von Uploads.
 *
 * Bewusst ohne Zwischenspeicher über Komponentengrenzen: Der Warenkorb
 * zeigt wenige Bögen, und eine abgelaufene URL aus einem Cache wäre genau
 * der Fehler, den diese Funktion beheben soll.
 */
function useResolvedPreviewUrls(uploadIds: string[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({})
  // Als String, damit der Effekt nicht bei jeder neuen Array-Instanz läuft.
  const key = uploadIds.filter(Boolean).sort().join(',')

  useEffect(() => {
    const ids = key ? key.split(',') : []
    if (ids.length === 0) return
    let abgebrochen = false

    void (async () => {
      try {
        const res = await fetch('/api/dtf/uploads/preview-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        })
        if (!res.ok) return
        const payload = (await res.json()) as { urls?: Record<string, string> }
        if (!abgebrochen && payload.urls) setUrls(payload.urls)
      } catch {
        // Ohne frische URL bleibt die mitgespeicherte — besser als nichts.
      }
    })()

    return () => { abgebrochen = true }
  }, [key])

  return urls
}
