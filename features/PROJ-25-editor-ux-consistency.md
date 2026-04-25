# PROJ-25 — Editor UX Consistency Pass

**Status:** Planned
**Created:** 2026-04-25

## Problem

Während der i18n-Arbeit (PROJ-20) und der Mobile-Editor-Anpassungen (PROJ-18) sind mehrere UX-Inkonsistenzen aufgefallen, die einzeln klein, in Summe aber irritierend sind:

1. **Stille Funktionen:** Manche Controls sind sichtbar, tun aber nichts wenn die aktuelle Konfiguration sie nicht unterstützt — statt ausgegraut. Beispiele:
   - "Layout" funktioniert nicht bei der Herz-Maske → bleibt aber bedienbar
   - "Formkontur" macht in Split-Modi nichts → wird zwar schon ausgeblendet, sollte aber einheitlich behandelt werden
   - Zweiter Marker ist nur in Split-Map-Modus sinnvoll → wird ausgeblendet, könnte aber konsistent ausgegraut werden

2. **Desktop/Mobile-Drift:** Verfügbare Optionen unterscheiden sich zwischen den beiden Layouts.
   - Mobile zeigt 4 Maskenformen, Desktop nur 3 (oder umgekehrt — zu prüfen welche Quelle korrekt ist)
   - Vermutlich weitere Drifts in Sidebar-Sektionen aus PROJ-18-Mobile-Bau

3. **Reihenfolge & Hierarchie der Controls:** Aktuelle Reihenfolge ist organisch gewachsen — nicht klar ob sie der natürlichen Bearbeitungsreihenfolge des Kunden entspricht.

## User Stories

- Als Kunde will ich nicht auf Buttons klicken, die nichts bewirken — entweder funktionieren sie oder sie sind sichtbar deaktiviert mit Hinweis warum.
- Als Kunde will ich, dass sich der Editor auf Mobile und Desktop gleich verhält — gleiche Optionen, gleiche Auswirkungen.
- Als Kunde will ich, dass die Reihenfolge der Controls meiner natürlichen Designentscheidung folgt (z.B. erst Ort, dann Stil, dann Form, dann Detail-Tuning).

## Acceptance Criteria

### Audit-Phase
- [ ] Vollständige Liste aller "Funktion-X-erfordert-Bedingung-Y"-Kombinationen aus Render-Logik + Editor-Store
- [ ] Vergleich Desktop ↔ Mobile: Welche Sektionen/Optionen unterscheiden sich? Welche Variante ist die Korrekte?
- [ ] Vorschlag für eine konsistente Control-Reihenfolge mit Begründung

### Implementierungs-Phase
- [ ] Wenn ein Control im aktuellen Zustand nichts bewirkt: `disabled`-Visual + Hover-/Tap-Hinweis warum (z.B. "Nicht verfügbar bei Herz-Form")
- [ ] Statt komplettem Ausblenden bei unpassender Konfiguration konsequent ausgrauen — auch im Split-Modus etc.
- [ ] Desktop und Mobile zeigen dieselbe Menge an Optionen mit identischen Labels (i18n-Keys teilen)
- [ ] Control-Reihenfolge ist auf beiden Layouts identisch
- [ ] **Zweiter Marker-Pin im Split-Map-Modus**: Wenn `splitMode === 'second-map'` aktiv ist, erscheint im Marker-Tab eine zweite Marker-Sektion (analog zum primären Marker — Position, Icon, Farbe, Label) für die zweite Karte. In allen anderen Modi (`none`, `photo`) bleibt die Sektion ausgegraut/ausgeblendet konsistent zur Regel oben. Der Zustand `secondMarker` existiert bereits im Editor-Store, hat aber aktuell keine UI im Split-Modus.

## Edge Cases

- Wenn ein Customer ein Preset lädt, das in einer Konfiguration gespeichert wurde, in der jetzt manche Optionen ausgegraut sind — die geladenen Werte bleiben gültig, nur weiteres Bearbeiten dieser Optionen ist deaktiviert.
- Tooltips auf Mobile: kein Hover, daher Tap-Hint oder Dauer-Visual ("(Nicht verfügbar)")
- Custom-Masken (admin-uploaded): falls die ihre eigenen Layout-Constraints haben, brauchen sie ein Schema-Feld dafür

## Bekannte konkrete Findings (Stand: 2026-04-25)

- Mobile zeigt 4 Maskenformen, Desktop 3 — Quelle prüfen (`MAP_MASK_OPTIONS` Filter unterscheidet sich)
- Layout-Picker bleibt bedienbar bei Herz-Maske, hat aber keine Wirkung
- Innenabstand-Slider wurde in einer separaten Korrektur entfernt (war redundant mit Außenbereich-Margin)
- **Zweiter Marker fehlt im Split-Map-Modus**: Beim Aktivieren der zweiten Karte gibt es kein UI, um einen Marker-Pin auf der zweiten Karte zu setzen. Der `secondMarker`-Zustand existiert im Editor-Store, der Render-Code im Canvas/Export auch — nur die Sidebar-UI fehlt. Findings vom 2026-04-25.

## Dependencies

- Setzt PROJ-18 (Mobile Editor) und PROJ-20 (i18n) voraus, beide abgeschlossen.
- Sollte vor weiteren Editor-Feature-Erweiterungen passieren, sonst wachsen die Inkonsistenzen weiter.
