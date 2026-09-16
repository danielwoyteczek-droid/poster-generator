# PROJ-56: Image Generator (Galerie-/Mockup-Bilder pro Preset)

## Status: Planned
**Created:** 2026-09-16
**Last Updated:** 2026-09-16

## Dependencies
- **Requires PROJ-8** (Design-Presets): Ausgangspunkt jeder Generierung ist ein bestehendes Preset.
- **Requires PROJ-30** (Preset-Render-Pipeline): erzeugt das flache Poster, auf das die Mockups gelegt werden.
- **Requires PROJ-52** (Local-Mockup-Provider): Compositing lokaler Mockups inkl. optionalem Overlay-Layer.
- **Requires PROJ-22** (Admin-Paletten-Verwaltung): Quelle der optional wählbaren Zusatzfarben.
- **Löst ab (später):** PROJ-54 (Listing-Image-Sets) und den Bild-Teil von PROJ-53 (Etsy Mass-Listings). Beide Seiten bleiben in V1 unverändert bestehen; das Entfernen ist ein eigener, späterer Schritt.

## Problem & Ziel

Heute braucht der Operator für Galerie-Bilder eines Presets 3 Admin-Seiten (Mockup-Sets, Listing-Image-Sets, Etsy-Listings) und 5 manuell nacheinander ausgelöste Schritte (Render starten → Worker starten → warten → Listing-Bilder → ZIP). Mockups werden an zwei Stellen gewählt, Dateinamen/Labels/Palette-Modus von Hand gepflegt, die Auswahl passiert in Textlisten ohne Bilder, und Farbvarianten sind Pflicht, auch wenn nur das Preset selbst gebraucht wird.

**Ziel:** Eine Seite, eine Journey: **Preset wählen → Mockups wählen → „Erstellen"**. Alle Bilder entstehen automatisch, ohne Zwischenschritte. Der Name ist bewusst kanal-neutral („Image Generator"), nicht Etsy-spezifisch.

**Grundprinzip gegen Bilder-Wildwuchs:** Standardmäßig entsteht **ein Bild pro gewähltem Mockup**, im Preset in seiner eigenen Farbe. Zusatzfarben sind ein optionales Opt-in, nicht vorausgewählt.

```
Preset „Berlin"  +  Mockups [Wand-Rahmen, Closeup (+ Overlay „Pfeil")]
        │
        ├─ ohne Zusatzfarben ─────────►  2 Bilder
        │
        └─ + Zusatzfarben [Salbei, Sand] ─►  2 + (2 × 2) = 6 Bilder
```

## User Stories

1. Als Operator möchte ich den Image Generator über einen eigenen Admin-Menüpunkt öffnen und dort ein Preset suchen und auswählen, damit ich ohne Umweg über Etsy-Listings Bilder erzeugen kann.
2. Als Operator möchte ich in der Preset-Übersicht pro Preset einen Link „Bilder generieren" haben, der den Generator mit diesem Preset vorausgewählt öffnet, damit ich direkt aus meinem gewohnten Arbeitsbereich starte.
3. Als Operator möchte ich Mockups visuell (mit Vorschaubild) auswählen, in der gewünschten Reihenfolge, damit ich sehe, was entsteht, und keine Slugs lesen muss.
4. Als Operator möchte ich pro gewähltem Mockup optional ein Text-Overlay (Pfeil, Erklärtext) aus einer wiederverwendbaren Overlay-Bibliothek wählen oder neu hochladen, damit ich Erklärbilder ohne Photoshop erstelle.
5. Als Operator möchte ich optional Zusatzfarben (Paletten) wählen, für die dann alle gewählten Mockups zusätzlich erzeugt werden, damit ich Farbvarianten nur bei Bedarf erzeuge.
6. Als Operator möchte ich mit einem einzigen Klick auf „Erstellen" alle Bilder erzeugen lassen und den Fortschritt pro Bild sehen, damit ich keine Worker- oder Render-Schritte manuell anstoßen muss.
7. Als Operator möchte ich meine Mockup-Auswahl (inkl. Overlays und Reihenfolge) als Vorlage speichern und bei einem anderen Preset wieder laden, damit ich wiederkehrende Kombinationen nicht jedes Mal neu zusammenklicke.
8. Als Operator möchte ich pro Preset eine Galerie aller bisher erzeugten Bilder sehen, einzelne Bilder löschen und alles als ZIP herunterladen, damit ich die Bilder in Listings hochladen kann.

## Acceptance Criteria

### Einstieg
- [ ] Im Admin-Menü gibt es einen Punkt „Image Generator".
- [ ] Die Generator-Seite zeigt ohne vorausgewähltes Preset eine durchsuchbare Preset-Auswahl mit Vorschaubild, Name und Produkttyp.
- [ ] In der Preset-Übersicht hat jedes Preset einen Link „Bilder generieren", der den Generator mit diesem Preset vorausgewählt öffnet (Deep-Link, z. B. per URL-Parameter; Reload behält die Auswahl).
- [ ] Das gewählte Preset ist jederzeit sichtbar und über „Ändern" wechselbar.

### Mockup-Auswahl
- [ ] Mockups werden als Kacheln mit Vorschaubild und Namen angezeigt; lokale und Dynamic-Mockups-Mockups erscheinen in derselben Liste ohne technische Präfixe wie `[DM]`/`[local]`.
- [ ] Nur Mockups, die zur Ausrichtung des Presets passen (Hoch-/Querformat), sind wählbar; unpassende sind ausgeblendet oder deaktiviert mit Hinweis.
- [ ] Ein Klick wählt ein Mockup aus bzw. ab; die Auswahlreihenfolge ist als Nummer auf der Kachel sichtbar und bestimmt die Reihenfolge der Bilder.
- [ ] Die Reihenfolge der gewählten Mockups lässt sich nachträglich ändern.
- [ ] Label/Dateiname und Anzeige-Name werden automatisch aus Position und Mockup-Name erzeugt; der Operator muss nichts davon eintippen.
- [ ] „Erstellen" ist deaktiviert, solange kein Mockup gewählt ist.

### Text-Overlays
- [ ] Pro gewähltem Mockup kann optional genau ein Overlay zugewiesen werden, aus einer Overlay-Bibliothek (mit Vorschaubild) oder per PNG-Upload direkt an dieser Stelle; ein Upload landet automatisch in der Bibliothek.
- [ ] Overlays in der Bibliothek sind über Presets und Vorlagen hinweg wiederverwendbar.
- [ ] Es wird nur die zur Ausrichtung des Presets passende Overlay-Variante verlangt (kein paralleles Hoch- und Querformat-Upload-Feld).
- [ ] Dasselbe Mockup kann mehrfach gewählt werden, jeweils mit anderem (oder ohne) Overlay, z. B. „Wand-Rahmen" und „Wand-Rahmen + Pfeil".
- [ ] Ein Overlay kann pro Mockup wieder entfernt werden.

### Zusatzfarben (optional)
- [ ] Zusatzfarben sind standardmäßig **nicht** gewählt und in einem einklappbaren Bereich „Weitere Farben" untergebracht.
- [ ] Zusatzfarben gibt es in V1 nur für Karten-Presets; wählbar sind veröffentlichte Karten-Paletten. Bei Sternen- und Foto-Presets wird der Bereich nicht angezeigt.
- [ ] Für jede gewählte Zusatzfarbe werden **alle** gewählten Mockups (inkl. ihrer Overlays) erzeugt.
- [ ] Vor dem Erstellen zeigt die Seite die Gesamtzahl der Bilder an (Mockups × (1 + Zusatzfarben)).
- [ ] Die Grundfarbe des Presets selbst wird nie verändert; Zusatzfarben erzeugen keine sichtbaren neuen Presets in der Preset-Übersicht oder im Shop.

### Erstellen & Fortschritt
- [ ] Ein Klick auf „Erstellen" stößt alles an, was nötig ist (Poster-Render der Grund- und Zusatzfarben, Vorrendern von Dynamic-Mockups-Mockups, Compositing inkl. Overlay). Es gibt keinen separaten „Worker starten"- oder „Listing-Bilder"-Schritt.
- [ ] Bereits vorhandene, aktuelle Poster-Renders werden wiederverwendet statt neu gerendert.
- [ ] Die Seite zeigt pro erwartetem Bild einen Platzhalter mit Status (wartet / wird erstellt / fertig / fehlgeschlagen); fertige Bilder erscheinen als Vorschau, ohne dass die Seite neu geladen werden muss.
- [ ] Der Operator kann die Seite während der Generierung verlassen; beim erneuten Öffnen desselben Presets ist der aktuelle Fortschritt sichtbar und die Generierung lief weiter.
- [ ] Fehlgeschlagene Bilder zeigen eine verständliche Fehlermeldung und lassen sich einzeln erneut anstoßen.

### Galerie pro Preset
- [ ] Jedes Preset hat genau eine Galerie mit allen dafür erzeugten Bildern, gruppiert nach Farbe (Grundfarbe zuerst) und in Mockup-Reihenfolge.
- [ ] Eine erneute Generierung derselben Kombination (Mockup + Overlay + Farbe) **ersetzt** das vorhandene Bild; neue Kombinationen **kommen hinzu**; nicht erneut gewählte Bilder bleiben erhalten.
- [ ] Einzelne Bilder lassen sich löschen (mit Bestätigung).
- [ ] Ein Klick auf ein Bild öffnet es in voller Größe.
- [ ] „ZIP herunterladen" liefert alle Galerie-Bilder des Presets mit sprechenden Dateinamen (Reihenfolge, Mockup, ggf. Farbe, ggf. Overlay).
- [ ] Umsortieren oder Löschen in der Galerie wirkt nur auf dieses Preset, nie auf Vorlagen oder andere Presets.

### Vorlagen
- [ ] Die aktuelle Mockup-Auswahl (Mockups, Reihenfolge, Overlays) lässt sich unter einem Namen als Vorlage speichern. Zusatzfarben gehören nicht zur Vorlage.
- [ ] „Vorlage laden" füllt die Mockup-Auswahl vor; danach ist sie frei änderbar, ohne dass die Vorlage verändert wird.
- [ ] Eine bestehende Vorlage kann mit der aktuellen Auswahl überschrieben, umbenannt oder gelöscht werden.
- [ ] Beim Laden einer Vorlage auf ein Preset anderer Ausrichtung werden unpassende Mockups sichtbar als „nicht verfügbar" markiert statt still weggelassen.

### Zugriff & Abgrenzung
- [ ] Seite, Galerie, Overlay-Bibliothek und Vorlagen sind ausschließlich für Admins zugänglich.
- [ ] Erzeugte Bilder erscheinen **nicht** automatisch auf Landing-Pages, in der Inspiration/Galerie des Shops oder in der Render-Library (diese Marketing-Pfade bleiben unverändert).
- [ ] Listing-Image-Sets- und Etsy-Listings-Seite funktionieren unverändert weiter.

### Layout
- [ ] Die Seite ist auf Desktop (1440 px) für den Hauptworkflow optimiert und auf 375 px ohne horizontales Scrollen bedienbar (Auswahl, Erstellen, Galerie ansehen, ZIP).

## Edge Cases
- **Preset hat noch nie gerendert oder der letzte Render ist fehlgeschlagen:** „Erstellen" rendert es mit; schlägt der Poster-Render fehl, werden alle davon abhängigen Bilder als fehlgeschlagen mit Grund angezeigt.
- **Preset wird geändert, nachdem Bilder erzeugt wurden:** Bestehende Galerie-Bilder bleiben, werden aber als „veraltet" markiert; „Erstellen" rendert das Poster neu.
- **Mockup-Set oder Overlay wird gelöscht / deaktiviert:** Bestehende Galerie-Bilder bleiben erhalten; in Vorlagen wird der Eintrag als „nicht mehr verfügbar" angezeigt und beim Erstellen übersprungen.
- **Palette wird entfernt oder unveröffentlicht:** Nicht mehr als Zusatzfarbe wählbar; bestehende Bilder in dieser Farbe bleiben in der Galerie.
- **Zweimal „Erstellen" für dasselbe Preset, während die erste Generierung noch läuft:** Die zweite Auslösung erzeugt keine doppelten Jobs; bereits laufende Kombinationen werden nicht erneut gestartet.
- **Sehr große Auswahl** (z. B. 8 Mockups × 10 Farben = 88 Bilder): Die Gesamtzahl ist vor dem Klick sichtbar; ab einer Schwelle (z. B. > 40 Bilder) erscheint eine Bestätigung.
- **Overlay-PNG mit falscher Größe oder ohne Transparenz:** Upload wird mit klarer Meldung abgelehnt bzw. gewarnt, bevor ein fehlerhaftes Bild entsteht.
- **Doppelter Vorlagen-Name:** Speichern fragt, ob die bestehende Vorlage überschrieben werden soll.
- **Dynamic-Mockups-Kontingent erschöpft oder Dienst nicht erreichbar:** Betroffene Bilder schlagen einzeln mit Grund fehl; lokale Mockups werden trotzdem fertig.
- **Galerie leer:** Leerer Zustand mit kurzem Hinweis „Wähle Mockups und klicke Erstellen".

## Nicht in V1 (bewusst)
- **Compare-Grid** (mehrere Farben in einem Bild): eigener zweiter Schritt, sinnvoll erst mit mehreren Farben.
- **Mehrere Presets in einem Lauf** (Bulk über viele Städte).
- **Ablösung** von Listing-Image-Sets und dem Bild-Teil von Etsy-Listings; Anbindung der Galerie-Bilder an Vela-CSV.
- **Unterschiedliche Mockup-Auswahl pro Zusatzfarbe**: V1 erzeugt immer alle gewählten Mockups pro Farbe.
- **Zusatzfarben für Sternenkarten**: brauchen zuerst benannte Sternen-Farbschemata (Poster-Hintergrund, Himmel, Sterne, ggf. Textur). Foto-Poster bekommen grundsätzlich keine Zusatzfarben.
- Veröffentlichen der Bilder auf Shop-/Marketing-Seiten.

## Technical Requirements (optional)
- **Security:** Admin-only auf allen Seiten und Endpunkten; kein Customer-Zugriff auf Galerie, Overlays oder Vorlagen.
- **Robustheit:** Generierung darf nicht an einer offenen Browser-Seite oder einem einzelnen Request-Timeout hängen.
- **Performance:** Auswahl-Seite lädt Preset-, Mockup- und Overlay-Vorschauen als kleine Thumbnails, nicht als Vollbilder.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
