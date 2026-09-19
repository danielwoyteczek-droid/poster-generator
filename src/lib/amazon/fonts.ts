/**
 * PROJ-31: Die Schriftwahl des Käufers gegen die Schriftbibliothek prüfen.
 *
 * Zwei Stellen brauchen das: die Auswertung, die eine Position mit
 * unbekannter Schrift in die Prüfung schickt, und die Editor-Route, die nur
 * setzt, was der Renderer auch laden kann. Beide müssen dieselbe Antwort
 * geben — sonst stünde eine Bestellung auf „Druckfertig", deren Poster
 * im Editor mit der Preset-Schrift aufgeht.
 */

import type { createAdminClient } from '@/lib/supabase-admin'
import { FALLBACK_FONTS } from '@/lib/fonts'

type Supa = ReturnType<typeof createAdminClient>

/**
 * Schriftnamen für den Abgleich vereinheitlichen. Amazon liefert den Namen
 * so, wie ihn der Käufer in der Auswahl gesehen hat („Caviar Dreams"); die
 * Bibliothek führt denselben Schnitt unter seinem CSS-Namen
 * („CaviarDreams"). Ohne diese Angleichung gälte die Schrift als unbekannt.
 */
export function normalizeFamily(value: string): string {
  return value.toLowerCase().replace(/[\s._-]/g, '')
}

/**
 * Normalisierter Name → Name, unter dem der Renderer die Schrift kennt.
 *
 * Die Bibliothek ist die Summe aus den hochgeladenen Schriften (Tabelle
 * `fonts`, PROJ-47) und den fest eingebauten (`FALLBACK_FONTS`) — genau die
 * Menge, die auch der Editor anbietet (`useFonts`). Nur die Tabelle zu
 * fragen hieße, die eingebauten als unbekannt zu melden.
 */
export async function loadFontLibrary(supabase: Supa): Promise<Map<string, string>> {
  const { data: rows } = await supabase
    .from('fonts')
    .select('family_name')
    .eq('status', 'published')
    .limit(200)
  return buildFontLibrary((rows ?? []).map((r) => r.family_name as string))
}

export function buildFontLibrary(uploaded: string[]): Map<string, string> {
  const known = new Map<string, string>()
  const names = [
    ...uploaded,
    ...FALLBACK_FONTS.filter((f) => f.status === 'published').map((f) => f.family_name),
  ]
  for (const name of names) {
    const key = normalizeFamily(name)
    if (!known.has(key)) known.set(key, name)
  }
  return known
}
