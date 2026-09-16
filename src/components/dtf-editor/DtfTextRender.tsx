'use client'

import { useEffect, useRef } from 'react'
import { useDtfStore, type DtfTextElement } from '@/hooks/useDtfStore'

/**
 * PROJ-55: Textelement auf dem Bogen.
 *
 * Die Höhe eines Textblocks lässt sich nicht rechnen — sie hängt von
 * Schrift, Zeilenumbruch und Laufweite ab. Deshalb wird sie hier **gemessen**
 * und in den Store zurückgeschrieben. Alles andere im Editor rechnet mit
 * Millimetern und braucht einen verlässlichen Höhenwert: die Begrenzung auf
 * den Druckbereich, die Hüllbox beim Drehen, die Größenanzeige.
 *
 * Die Schriftgröße steht in Millimetern statt in Punkt oder als Bruchteil.
 * Das ist die Einheit, in der der Kunde denkt, wenn er ein Textstück auf
 * einen Bogen legt — und dieselbe Einheit wie überall sonst hier.
 */
export function DtfTextRender({
  element,
  pxPerMm,
}: {
  element: DtfTextElement
  pxPerMm: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const updateElement = useDtfStore((s) => s.updateElement)

  // Nach jeder Änderung neu messen. Ohne das bliebe die Höhe auf dem Stand
  // des vorherigen Textes stehen, und Begrenzung wie Drehung rechneten mit
  // einem falschen Wert.
  useEffect(() => {
    const node = ref.current
    if (!node || pxPerMm <= 0) return
    const heightMm = node.offsetHeight / pxPerMm
    const widthMm = node.offsetWidth / pxPerMm
    // Nur schreiben, wenn es sich spürbar ändert — sonst dreht sich der
    // Effekt im Kreis, weil jede Zustandsänderung ein Neurendern auslöst.
    if (Math.abs(heightMm - element.heightMm) > 0.2 || Math.abs(widthMm - element.widthMm) > 0.2) {
      updateElement(element.id, { heightMm, widthMm } as Partial<DtfTextElement>)
    }
  }, [
    element.id,
    element.text,
    element.fontFamily,
    element.fontSizeMm,
    element.bold,
    element.uppercase,
    element.letterSpacingEm,
    element.widthMm,
    element.heightMm,
    pxPerMm,
    updateElement,
  ])

  return (
    <div
      ref={ref}
      // `whitespace-pre` statt Umbruch: Beim Rastern für den Druck
      // müsste sonst die Umbruchlogik des Browsers nachgebaut werden, und
      // jede Abweichung wäre ein Druck, der nicht der Vorschau entspricht.
      // Zeilen entstehen ausschließlich durch Zeilenumbrüche im Text.
      className="inline-block pointer-events-none whitespace-pre"
      style={{
        fontFamily: `"${element.fontFamily}", system-ui, sans-serif`,
        fontSize: element.fontSizeMm * pxPerMm,
        // Enge Zeilenhöhe: Bei Transferdrucken sitzen Zeilen meist dicht,
        // und der Standardwert des Browsers liesse zu viel Luft.
        lineHeight: 1.15,
        color: element.color,
        textAlign: element.align,
        fontWeight: element.bold ? 700 : 400,
        textTransform: element.uppercase ? 'uppercase' : 'none',
        letterSpacing: `${element.letterSpacingEm}em`,
      }}
    >
      {element.text || ' '}
    </div>
  )
}
