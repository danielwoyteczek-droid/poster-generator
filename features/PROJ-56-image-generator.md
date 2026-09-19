# PROJ-56: Image Generator (Galerie-/Mockup-Bilder pro Preset)

## Status: Deployed
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

**Stand:** 2026-09-16 · Entscheidung Operator: *Schnellweg + Worker*

### Ausgangslage (was heute schon da ist)

| Baustein | Heute | Nutzen für PROJ-56 |
|---|---|---|
| Poster-Render | Nur im GitHub-Actions-Worker (Headless-Browser). Start nur per Knopf, ~2–3 Min. Anlaufzeit | Bleibt der einzige Ort, an dem Poster gerendert werden |
| Worker-Auslöser | Admin-Knopf ruft GitHub „workflow_dispatch" | Wird künftig **vom Generator selbst** aufgerufen |
| Lokales Compositing | Bildbibliothek `sharp`, läuft im Worker **und** in Admin-Endpunkten | Kann direkt auf dem Server laufen → Schnellweg |
| Dynamic Mockups | Nur im Worker, Ergebnis landet in den Marketing-Renders des Presets | Generator ruft DM **eigenständig** auf, ohne die Marketing-Renders anzufassen |
| Farbklone | PROJ-53 legt pro Palette einen Entwurfs-Preset-Klon an; die Klone tauchen in der Admin-Preset-Übersicht auf | Gleiches Prinzip, aber als verborgene Farbvariante |
| Annotation-Upload | An ein Listing-Image-Set-Item gebunden, muss pixelgenau zur Mockup-Größe passen | Wird zur eigenständigen Overlay-Bibliothek |
| Status-Anzeige | Admin-Seiten fragen alle 3–4 s den Status ab | Gleiches Muster für die Galerie |

### A) Seitenaufbau

```
Admin-Menü „Image Generator"  ─┐
Preset-Übersicht „Bilder generieren" ─┴─►  /private/admin/image-generator?preset=<id>

Image-Generator-Seite
+-- Kopfzeile: Titel, kurze Erklärung
+-- 1 · Preset
|   +-- Ohne Auswahl: Preset-Suche (Dialog mit Raster: Vorschaubild, Name, Produkttyp)
|   +-- Mit Auswahl: Leiste mit Vorschaubild, Name, Ausrichtung, „Ändern"
+-- 2 · Mockups
|   +-- Vorlagen-Leiste: „Vorlage laden ▾" · „Als Vorlage speichern"
|   +-- Gewählte Mockups (geordnete Liste)
|   |   +-- Eintrag: Nr. · Thumbnail · Name · Overlay-Feld (+ / Vorschau / ×) · ↑↓ · entfernen
|   |   +-- Hinweis „nicht verfügbar" bei gelöschten/unpassenden Einträgen aus Vorlage
|   +-- Mockup-Raster (Kacheln mit Thumbnail; Klick fügt hinzu; unpassende Ausrichtung deaktiviert)
+-- Overlay-Dialog
|   +-- Bibliothek (Raster, gefiltert auf Ausrichtung) · PNG hochladen · Name vergeben
+-- 3 · Weitere Farben (eingeklappt; nur für Karten-Presets)
|   +-- Paletten-Chips mit Farbfeldern, Mehrfachauswahl
+-- Erstellen-Leiste
|   +-- „N Bilder werden erzeugt" · Knopf „Erstellen" · Bestätigung ab > 40 Bildern
+-- Galerie dieses Presets
    +-- Werkzeugleiste: „ZIP herunterladen"
    +-- Gruppe pro Farbe (Grundfarbe zuerst)
        +-- Bildkachel: Vorschau/Platzhalter · Status (wartet / wird erstellt / fertig / fehlgeschlagen / veraltet)
            · Lightbox · Löschen · „Erneut versuchen"
    +-- Leerer Zustand
```

Alle Bausteine sind vorhandene shadcn/ui-Komponenten (Dialog, Command für die Suche, Collapsible, Card, Badge, Progress, AlertDialog, Tooltip, Select, Skeleton). Die Seite folgt dem bestehenden Admin-Seiten-Muster (Admin-Check, Nav, Inhalt).

### B) Datenmodell (in Worten)

**Galerie-Bild** (ein Eintrag = ein Bild und gleichzeitig sein Auftrag)
- Basis-Preset
- Farbe: leer = Grundfarbe des Presets, sonst eine Palette
- Mockup
- Overlay (optional)
- Position (Reihenfolge innerhalb der Farbe)
- Status: wartet · wird erstellt · fertig · fehlgeschlagen, plus Fehlertext
- Bild-Adresse, Breite, Höhe, Zeitpunkt der Erstellung
- „Veraltet" wird nicht gespeichert, sondern angezeigt, wenn das Preset nach der Erstellung geändert wurde
- **Eindeutig pro Kombination** Preset + Farbe + Mockup + Overlay → erneutes Erstellen ersetzt statt zu duplizieren

**Overlay** (Bibliothek)
- Name, Ausrichtung (hoch/quer), Bild-Adresse, Breite, Höhe, erstellt am
- Wird beim Compositing auf die Größe des jeweiligen Mockups skaliert → ein Overlay passt zu allen Mockups gleicher Ausrichtung

**Vorlage**
- Name (eindeutig)
- Geordnete Liste von Einträgen: Mockup + optionales Overlay
- Einträge verweisen per ID. Ist ein Mockup/Overlay später gelöscht, bleibt der Eintrag stehen und wird als „nicht mehr verfügbar" angezeigt (kein stilles Wegfallen)

**Farbvariante eines Presets** (Erweiterung bestehender Presets)
- Presets erhalten einen optionalen Verweis „Farbvariante von Preset X" plus die Palette
- Pro Basis-Preset × Palette existiert höchstens eine Farbvariante; sie wird wiederverwendet und bei Änderungen am Basis-Preset aktualisiert
- Farbvarianten sind immer Entwurf, erscheinen nie im Shop und werden in der Admin-Preset-Übersicht ausgeblendet

**Mockup-Ausrichtung**: kein neues Feld. Lokale Mockups gelten als passend, wenn sie ein Overlay für die Ausrichtung des Presets haben. Dynamic-Mockups-Mockups haben keine Ausrichtung und gelten für beide als passend.

**Speicherort:** Supabase-Datenbank (drei neue Tabellen + ein Verweis-Feld an Presets), Zugriff nur Admin/Service. Bilder im bestehenden öffentlichen Bucket `preset-renders` unter einem eigenen Ordner `image-generator/`, Overlays im bestehenden Bucket `mockup-overlays` unter `image-overlays/`.

### C) Ablauf beim Klick auf „Erstellen"

```
Klick „Erstellen"
   │
   ▼
1. Server legt/aktualisiert Galerie-Bild-Einträge (Status „wartet")
   └─ für Zusatzfarben: Farbvariante anlegen/aktualisieren → Poster-Render „ausstehend"
   └─ Grundfarbe ohne fertiges oder mit veraltetem Poster → Poster-Render „ausstehend"
   │
   ▼
2. SCHNELLWEG (sofort, auf dem Server, mit Zeitbudget unter dem 60-s-Limit)
   Bilder, deren Poster fertig ist UND deren Mockup lokal ist
   → Compositing (+ Overlay) → hochladen → „fertig"
   │
   ▼
3. Rest vorhanden? (Poster fehlt, Dynamic Mockups, Zeitbudget aufgebraucht)
   → Worker automatisch anstoßen – aber nur, wenn keiner schon läuft/wartet
   │
   ▼
4. WORKER
   a) rendert ausstehende Poster (bestehende Logik)
   b) arbeitet danach wartende Galerie-Bilder ab:
      lokal → Compositing · Dynamic Mockups → eigener DM-Aufruf → Overlay drüber
   c) Poster-Render fehlgeschlagen → abhängige Bilder „fehlgeschlagen" mit Grund
   │
   ▼
5. Seite fragt alle ~4 s den Status ab (nur solange etwas offen ist)
   → Kacheln füllen sich, auch nach Verlassen und Wiederkommen
```

**Wichtig:** Schnellweg und Worker nutzen **dieselbe** Compositing-Routine. Es gibt keine zweite Logik, nur zwei Orte, an denen sie läuft. Ein Bild wird vor der Bearbeitung „reserviert", damit Schnellweg und Worker nie dasselbe Bild doppelt erzeugen. Hängengebliebene Reservierungen setzt der Worker nach 10 Minuten zurück (wie heute bei Presets).

### D) Technische Entscheidungen (mit Begründung)

| Entscheidung | Warum |
|---|---|
| **Schnellweg auf dem Server + Worker für den Rest** | Häufigster Fall (Preset schon gerendert, lokale Mockups) ist in Sekunden fertig. Poster-Render braucht einen Headless-Browser und bleibt dort, wo er heute schon zuverlässig läuft. |
| **Generator stößt den Worker selbst an** | Erfüllt „ein Klick, kein Worker-Knopf". Doppel-Anstöße werden verhindert, indem vorher geprüft wird, ob schon ein Lauf aktiv ist oder wartet. |
| **Galerie-Bild = Auftrag** (keine separate Job-Tabelle) | Folgt dem bewährten Muster im Projekt (Status direkt am Datensatz, wie Presets, Compositions, City-Renders). Eine Tabelle weniger, Galerie und Fortschritt sind dieselbe Ansicht. |
| **Dynamic Mockups direkt im Generator-Auftrag statt über die Marketing-Renders** | Würde der Generator DM-Mockups an das Preset hängen, tauchten die Bilder in Render-Library und Landing-Pages auf, was die Spec ausdrücklich ausschließt. |
| **Farbvarianten als verborgene Preset-Klone** | Der Worker kann nur Presets rendern. Der Klon-Ansatz ist in PROJ-53 erprobt (Farben fest eingebacken, damit der Headless-Render sie sicher trifft). Neu: Verweis auf das Basis-Preset, damit Klone wiederverwendet und in der Übersicht ausgeblendet werden. |
| **Zusatzfarben in V1 nur für Karten-Presets** | Karten haben eine Paletten-Bibliothek (PROJ-22), aus der man wählen kann. Sternenkarten haben zwar auch Farben (Poster-Hintergrund, Himmel, Sterne + Aquarell-Texturen), aber als freie Farbwähler ohne benannte Farbschemata. Dafür müsste erst eine Auswahl an Sternen-Farbschemata angelegt werden → späterer Schritt. Foto-Poster: Farbvarianten ergeben fachlich keinen Sinn. Der Bereich „Weitere Farben" wird bei Sternen- und Foto-Presets nicht angezeigt. |
| **Overlays werden auf Mockup-Größe skaliert** | Heute muss ein Overlay pixelgenau zum Mockup passen, dann wäre eine Bibliothek über Mockups hinweg praktisch nutzlos. Skalierung macht Overlays wiederverwendbar. Voraussetzung: gleiches Seitenverhältnis, sonst Warnung beim Zuweisen. |
| **Nur A4-Poster als Grundlage** | Mockups zeigen das Poster verkleinert; A4 ist bereits der Standard der Listing-Pipeline und spart Renderzeit. |
| **Altbestand unangetastet** | Listing-Image-Sets und Etsy-Listings behalten ihre Tabellen und Endpunkte. Der Generator teilt nur die Compositing-Grundfunktion. |

### E) Server-Schnittstellen (Überblick, alle Admin-only)
- **Generator-Zustand eines Presets** lesen: Preset-Infos, Galerie-Bilder mit Status, passende Mockups, Overlays, Paletten
- **Erstellen**: Auswahl übergeben → Einträge anlegen, Schnellweg, Worker anstoßen
- **Galerie-Bild** löschen / erneut versuchen
- **ZIP** aller Galerie-Bilder eines Presets
- **Overlays**: auflisten, hochladen, umbenennen, löschen
- **Vorlagen**: auflisten, speichern/überschreiben, umbenennen, löschen
- **Worker-Skript**: neuer Arbeitsschritt „Galerie-Bilder" nach dem Poster-Render
- **Admin-Preset-Übersicht**: Farbvarianten ausblenden, Link „Bilder generieren" pro Preset (Raster- und Listenansicht)
- **Admin-Menü**: Eintrag „Image Generator"

### F) Betroffener geteilter Code (Cross-Cutting)
- **Render-Worker** (`scripts/render-worker.ts`): neuer Schritt; Presets, Compositions und City-Renders müssen danach unverändert weiterlaufen → Regressionstest aller drei.
- **Lokaler Compositor** (`src/lib/local-mockup-processor.ts`): Overlay-Skalierung kommt hinzu. Nutzer: Worker-Marketing-Renders (PROJ-30/52), Mockup-Test-Render, Listing-Image-Sets (PROJ-54). Skalierung nur für den Generator aktivieren, damit bestehende Ausgaben bitgleich bleiben.
- **Admin-Preset-Liste** (`/api/admin/presets` + `AdminPresetsList`): Filter auf Farbvarianten. PROJ-53-Klone sind davon nicht betroffen (die haben keinen Verweis).

### G) Abhängigkeiten (Pakete)
- **Keine neuen Pakete.** `sharp` (Compositing) und `jszip` (ZIP) sind bereits im Einsatz.
- Empfehlung: `sharp` explizit in `package.json` aufnehmen. Es wird heute schon direkt importiert, kommt aber nur indirekt über Next.js ins Projekt.

### H) Risiken & offene Punkte
- **Anlaufzeit Worker (~2–3 Min.)** bei Zusatzfarben/Dynamic Mockups bleibt. Die Galerie zeigt deshalb „wartet auf Render-Worker" statt eines Spinners ohne Erklärung.
- **GitHub-Actions-Minuten:** Automatisches Anstoßen erhöht die Zahl der Läufe. Doppel-Schutz begrenzt das auf einen Lauf gleichzeitig.
- **DM-Kontingent:** Jeder DM-Mockup × Farbe ist ein kostenpflichtiger DM-Aufruf; die Bildanzahl vor dem Klick macht das sichtbar.
- **Mockups ohne Thumbnail** zeigen einen Platzhalter mit Hinweis „Test-Render in Mockup-Sets ausführen".

## Implementation Notes

### Frontend (2026-09-16)

**Seite:** [/private/admin/image-generator](src/app/private/admin/image-generator/page.tsx), Preset per `?preset=<id>` (Deep-Link, Reload-fest).

**Komponenten** in [src/components/admin/image-generator/](src/components/admin/image-generator/):
- `AdminImageGenerator` — Schritte 1–3, Galerie, feste Erstellen-Leiste unten (Bildanzahl, übersprungene Einträge, Bestätigung ab 40 Bildern)
- `PresetPickerDialog` — Suche + Typ-Filter (Tabs), Raster mit Vorschaubild
- `MockupSelection` — geordnete Auswahlliste (↑↓, Duplizieren für zweites Overlay, Entfernen) + Mockup-Kacheln mit Positionsnummern; unpassende Ausrichtung deaktiviert; Probleme aus Vorlagen („nicht mehr verfügbar") und doppelte Kombinationen gelb markiert und beim Erstellen übersprungen
- `OverlayPickerDialog` — Bibliothek gefiltert auf Ausrichtung, Upload mit Name landet direkt in der Bibliothek und wird zugewiesen
- `TemplateBar` — Laden, Speichern (Namenskollision → Überschreiben-Dialog), Überschreiben, Umbenennen, Löschen
- `ExtraColorsSection` — Collapsible mit Paletten-Chips, nur bei Karten-Presets
- `GeneratorGallery` — Gruppen je Farbe, Status-Kacheln (wartet auf Poster-Render / Worker, wird erstellt, fehlgeschlagen mit Grund), „veraltet"-Badge, Lightbox, Löschen, Erneut versuchen, ZIP-Link

**Logik:** [src/lib/image-generator/](src/lib/image-generator/) — `types.ts` (Vertrag mit den Endpunkten), `api.ts` (Client), `helpers.ts` (Kompatibilität, Zählung, Duplikate, veraltet, Gruppierung, Dateinamen; 12 Unit-Tests). Hook [useImageGeneratorState](src/hooks/useImageGeneratorState.ts) lädt den Zustand und fragt alle 4 s ab, solange Bilder offen sind.

**Einstiege:** Admin-Menü „Image Generator" ([LandingNavClient.tsx](src/components/landing/LandingNavClient.tsx)); Link-Icon „Bilder generieren" pro Preset in Raster- und Listenansicht ([AdminPresetsList.tsx](src/components/admin/AdminPresetsList.tsx)).

**Erwartete Endpunkte (für /backend)** — alle Admin-only, Formen siehe `types.ts`:
| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/admin/image-generator/presets/[presetId]` | `{ preset, images }` — `preset.orientation` aus `config_json`, Bilder inkl. `waiting_for` |
| POST | `/api/admin/image-generator/presets/[presetId]/generate` | Body `{ entries, palette_ids }` → `{ images, completed_now, worker_triggered }` |
| GET | `/api/admin/image-generator/presets/[presetId]/zip` | ZIP, Dateinamen über `buildImageFileName` |
| DELETE | `/api/admin/image-generator/images/[imageId]` | Bild löschen |
| POST | `/api/admin/image-generator/images/[imageId]/retry` | `{ image }` — auch für veraltete Bilder |
| GET / POST (multipart `file`, `name`, `orientation`) | `/api/admin/image-generator/overlays` | `{ overlays }` / `{ overlay }` |
| GET / POST | `/api/admin/image-generator/templates` | `{ templates }` / `{ template }` |
| PATCH / DELETE | `/api/admin/image-generator/templates/[id]` | `{ template }` / `{ ok }` |

Bestehend und genutzt: `GET /api/admin/presets?status=all` (Farbvarianten dort ausfiltern!), `GET /api/admin/mockup-sets`, `GET /api/admin/palettes?status=published`.

**Abweichungen / Entscheidungen im Build:**
- Klick auf eine Mockup-Kachel fügt hinzu bzw. entfernt; ist ein Mockup mehrfach gewählt (verschiedene Overlays), wird nur gezielt in der Liste entfernt, damit kein Overlay-Eintrag verloren geht.
- „Erneut versuchen" erscheint auch bei veralteten Bildern („Neu erzeugen").
- Zusatzfarben werden beim Preset-Wechsel geleert, die Mockup-Auswahl bleibt erhalten (praktisch für mehrere Presets hintereinander).

### Backend (2026-09-16)

**Migration** [20260916100000_proj56_image_generator.sql](supabase/migrations/20260916100000_proj56_image_generator.sql) — rein additiv:
- `presets.color_variant_of` + `color_variant_palette_id` (verborgene Farbvarianten, eindeutig pro Basis × Palette, Cascade beim Löschen des Basis-Presets)
- `image_generator_images` — Bild = Auftrag; `UNIQUE NULLS NOT DISTINCT (preset_id, palette_id, mockup_set_id, overlay_id)`; `source_preset_id` (Basis oder Farbvariante), `base_config_hash` für „veraltet"
- `image_overlays`, `image_generator_templates` (Name case-insensitive eindeutig, `entries` als JSON ohne Fremdschlüssel)
- RLS an, keine Policies → nur Service-Role (Muster wie `preset_renders`)

**Bibliothek** [src/lib/image-generator/](src/lib/image-generator/):
- `process.ts` — Bildbau-Routine für Schnellweg **und** Worker (nur relative Importe): Poster-Zustand der Quelle, atomare Reservierung (`pending → rendering`), Compositing lokal (`composeLocalMockup`) bzw. Dynamic Mockups direkt, Overlay per `fit: contain` auf Canvas-Größe skaliert, Upload `preset-renders/image-generator/<preset>/<bild>.jpg`, Reclaim hängender Reservierungen
- `server.ts` — Zustand, Erstellen (Validierung, Quellen sicherstellen, Upsert, Schnellweg mit 40-s-Budget, Worker-Anstoß), Erneut versuchen, Löschen, ZIP
- `config-hash.ts` — Hash mit sortierten Schlüsseln; `palette-bake.ts` — Palette einbacken (jetzt auch von PROJ-53 genutzt)
- [src/lib/render-worker-trigger.ts](src/lib/render-worker-trigger.ts) — GitHub-Dispatch mit `skipIfActive` (kein zweiter Lauf, wenn einer wartet/läuft); der bestehende Knopf „Worker starten" nutzt ihn ohne diese Option

**Endpunkte** unter `/api/admin/image-generator/` wie in der Tabelle oben; alle Admin-only, Zod auf Schreibzugriffen, `.limit()` auf Listen. Overlay-Upload prüft wie Mockup-Overlays (PNG ≤ 5 MB, 800–4000 px) und zusätzlich auf Transparenz.

**Render-Worker** ([scripts/render-worker.ts](scripts/render-worker.ts)):
- schreibt nach jedem Format-Render `render_inputs_hash_<format>` = Konfigurations-Hash
- neuer Schritt 1b nach den Presets: nächstes Galerie-Bild mit fertigem Poster erzeugen; fehlgeschlagenes/fehlendes Poster → Bild „fehlgeschlagen", veraltetes Poster → A4 neu anstoßen
- Reclaim gibt auch hängende Galerie-Bilder nach 10 Min. frei

**Geteilter Code / Cross-Cutting:**
- `GET /api/admin/presets` blendet Farbvarianten aus; `bulk-render` fasst sie nicht an
- `POST /api/admin/etsy-listings/[id]/render` (PROJ-53) nutzt `bakePaletteIntoConfig` statt eigener Kopie — Verhalten unverändert (Tests)
- `POST /api/admin/render-worker/trigger` nutzt die ausgelagerte Trigger-Funktion — Antworten unverändert

**Entscheidungen im Build:**
- **„Veraltet" über Konfigurations-Hash statt `updated_at`**: `updated_at` ändert sich auch beim Veröffentlichen/Taggen. Poster ohne gespeicherten Hash (alle Renders vor PROJ-56) gelten als aktuell.
- **Farbvarianten rendern nur A4**: A3/A2 werden beim Anlegen auf `done` gesetzt, weil der Worker sonst jedes Preset mit offenem Format endlos abholt.
- **Basis-Preset neu rendern** (fehlt, fehlgeschlagen, veraltet) nutzt die normale Pipeline → dabei entstehen auch seine Marketing-Mockups neu (bei DM: Kontingent).
- Overlay-Umbenennen/-Löschen gibt es als Endpunkt noch nicht (Oberfläche bietet es nicht an).

**Nachtrag 2026-09-18: Galerie-Bilder in der Render-Bibliothek.** Auf Operator-Wunsch zeigt `/private/admin/render-library` jetzt beide Quellen in einem Raster: `preset_renders` (Marketing-Renders des Workers) und `image_generator_images`. Umgesetzt in [api/admin/renders/route.ts](src/app/api/admin/renders/route.ts) + [AdminRenderLibrary.tsx](src/components/admin/AdminRenderLibrary.tsx):
- Neuer Filter **Quelle** (Alle / Marketing-Render / Image Generator); der Variante-Filter (Desktop/Mobile) blendet Generator-Bilder aus, weil sie keine Variante haben.
- Generator-IDs werden als `gen:<uuid>` ausgeliefert, damit Auswahl und Löschen über beide Tabellen eindeutig bleiben. DELETE räumt Storage-Datei (`storage_path`) und Zeile ab.
- Kachel-Badge zeigt bei Generator-Bildern Farbe (+ Overlay) statt `desktop`/`mobile`, z. B. „Grundfarbe + Top Qualität (links)".
- Keine Datenmigration, keine Änderung an der Galerie im Image Generator — dieselben Dateien, nur zusätzlich sichtbar.

**Tests:** 43 Unit-/Integrationstests für PROJ-56 (Helfer, Hash, Palette, Poster-Zustand, Overlay-Skalierung, Schnellweg-Auswahl, Endpunkte Generate/Vorlagen/Overlays inkl. 401/403/400/409). Gesamte Vitest-Suite: 335 Tests grün.

## QA Test Results
_To be added by /qa_

## Deployment

**Deployed:** 2026-09-16 · PR #15 (zusammen mit #13 Render-Ausschnitt-Fix PROJ-30 und #14 Kreisform PROJ-1) · Vercel Production grün

- Migration `20260916100000_proj56_image_generator.sql` war vorab live angewendet und per Spalten-Query verifiziert.
- Absicherung auf Wunsch des Operators: Vercel-Preview-Builds aller drei PRs grün, **kein vollständiges `/qa`**. Offen für QA: Zusatzfarben end-to-end, Overlay-Upload, Vorlagen im Browser, 375-px-Ansicht.
- Live-Smoke-Test: Seite leitet ohne Login auf `/de/login`, Endpunkt `/api/admin/image-generator/templates` antwortet 401.
- Worker: Der GitHub-Render-Worker läuft auf `main` und kennt den Galerie-Bild-Schritt ab diesem Deploy.
