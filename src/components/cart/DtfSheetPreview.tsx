'use client'

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
      {[...elements]
        .filter(isImageElement)
        .sort((a, b) => a.z - b.z)
        .map((el) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={el.id}
            src={el.previewUrl}
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
        ))}
    </div>
  )
}
