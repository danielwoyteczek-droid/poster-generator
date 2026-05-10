# PROJ-41 — Mask-Thumbnail-Polish (Labels weg, Couple-Fill konsistent)

**Status:** Planned
**Created:** 2026-05-10

## Problem

Im Form-Picker des Karten-Editors (Sidebar → "Form") werden die Maskenformen heute als 3-Spalten-Grid mit Thumbnail + Textlabel darunter dargestellt. Zwei kleine, aber sichtbare Probleme:

1. **Labels fressen Höhe.** Jede Mask-Zelle trägt unter dem Icon ein Textlabel (`Kreis`, `Herz`, `Couple 1`, `Custom-Hochzeit-2026` etc.) bei `text-[9px]`. Bei vielen Masks und der schmalen 288 px-Sidebar nimmt das in Summe deutlich mehr Vertikalplatz weg als der Erkennungswert rechtfertigt — die Form selbst ist visuell selbsterklärend, der Text wirkt redundant. Auf mobilen Layouts wird das Problem noch sichtbarer.

2. **Couple-1 + Couple-2 sind nicht schwarz gefüllt.** Anders als alle anderen Mask-Thumbnails (Kreis, Herz, House, Hearts-Curved/Diagonal etc., die als schwarze Silhouette gerendert werden) zeigen `couple-1.svg` und `couple-2.svg` einen abweichenden Fill — vermutlich weiß auf weißem Grund oder Outline-Only. Das bricht die visuelle Reihe und macht beide Masks im Picker schwer erkennbar.

## User Stories

- Als Kunde sehe ich auf einen Blick alle verfügbaren Formen, ohne durch eine Liste mit Textlabels lesen zu müssen — die Silhouette ist die Information.
- Als Kunde erwarte ich, dass alle Mask-Thumbnails optisch konsistent dargestellt sind (gleicher Fill, gleicher Kontrast) und nicht zwei Ausreißer in der Liste hervorstechen ohne erkennbaren Grund.
- Als Operator-/Admin möchte ich keinen extra Schritt beim Anlegen neuer Custom-Masks haben — die Konsistenz soll aus der Render-Logik kommen, nicht aus per-Mask-Pflege.

## Acceptance Criteria

### Labels entfernen
- [ ] Im Form-Picker (Karten-Editor Desktop + Mobile, sowie Sternenposter sobald PROJ-40 landet) werden die Textlabels unter den Mask-Thumbnails entfernt.
- [ ] Mask-Name bleibt als `aria-label` + `title`-Attribut erhalten — Accessibility und Hover-Tooltip funktionieren weiter.
- [ ] Die freigewordene Vertikal-Höhe wird genutzt, um die Thumbnails leicht größer zu rendern (z.B. 8×8 px → 10×10 px) oder die Sidebar-Sektion kompakter wirken zu lassen — Entscheidung in Architecture/Frontend-Phase.
- [ ] Auf Mobile bleibt die Touch-Trefferfläche ≥ 44 px (WCAG-Touch-Target), notfalls Padding statt Größe steuern.

### Couple-1 + Couple-2 schwarz gefüllt
- [ ] `public/masks/couple-1.svg` und `public/masks/couple-2.svg` werden so überarbeitet (oder beim Render eingefärbt), dass die Thumbnails identisch zur restlichen Mask-Reihe als schwarze Silhouette auf transparentem Grund erscheinen.
- [ ] Das eigentliche Render-Verhalten (Karten-Clipping zur Silhouette) bleibt unverändert — der Fix betrifft nur die Thumbnail-Darstellung im Picker, nicht die Maske selbst.
- [ ] Wenn die Lösung darin besteht, die Thumbnails zur Render-Zeit einzufärben (CSS `filter` oder SVG `fill` override), sollte das systematisch für **alle** built-in Masks gelten — damit zukünftige neue Masks ohne Pflegeaufwand automatisch konsistent sind.

## Edge Cases

- Custom-Masks (admin-uploaded via PROJ-35): tragen heute beliebige Fills aus dem hochgeladenen SVG. Entscheiden, ob die Re-Color-Logik auch Custom-Masks erfasst (Konsistenz) oder die Original-Optik der Custom-Masks erhalten bleibt (Operator-Kontrolle). Empfehlung: erfassen — gleiches Picker-Erlebnis für Customer.
- Decoration-Layer (PROJ-35): Decoration-SVG hat eigenen Fill, darf nicht miteingefärbt werden — Re-Color sollte sich auf das Mask-Thumbnail beschränken, nicht auf die Decoration.

## Dependencies

- Setzt PROJ-1 (Karten-Editor) und PROJ-35 (Custom-Masks) voraus.
- Berührt PROJ-25 (UX Consistency Pass) — Polish in derselben Sidebar-Sektion. Kann auch als Teil-Lieferung von PROJ-25 verstanden werden, ist hier aber als eigenes Mini-Feature getrackt damit es nicht im großen Pass untergeht.
- Berührt PROJ-40 (Star-Map Masks): sobald der Sternenposter denselben Picker bekommt, gelten dieselben Polish-Regeln.
