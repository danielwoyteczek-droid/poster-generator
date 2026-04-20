# PROJ-2: Textblock-Editor

## Status: Architected
**Created:** 2026-04-19
**Last Updated:** 2026-04-19

## Dependencies
- Requires: PROJ-1 (Karten-Editor Core) — Textblöcke werden über der Karte positioniert

## User Stories
- Als Nutzer möchte ich einen Stadtnamen/Titel auf dem Poster platzieren können, damit der Ort klar erkennbar ist
- Als Nutzer möchte ich Schriftart, Größe, Farbe und Ausrichtung des Texts anpassen können
- Als Nutzer möchte ich Textblöcke per Drag & Drop verschieben können, um die Position zu verfeinern
- Als Nutzer möchte ich die Breite von Textblöcken anpassen können (Resize-Handle)
- Als Nutzer möchte ich GPS-Koordinaten automatisch als Textblock vorausgefüllt bekommen
- Als Nutzer möchte ich Textblöcke sperren können, um versehentliches Verschieben zu verhindern
- Als Nutzer möchte ich neue Textblöcke hinzufügen und bestehende löschen können

## Acceptance Criteria
- [ ] Mindestens 4 vordefinierte Textblöcke: Titel, Untertitel, Ortsname, Koordinaten
- [ ] Mindestens 4 Schriftarten zur Auswahl (Amsterdam, Cathalia, Caviar Dreams, Arial)
- [ ] Schriftgröße per Slider oder Direkteingabe (8–220px)
- [ ] Textfarbe per Colorpicker (Hex-Eingabe oder Farbpalette)
- [ ] Textausrichtung: links, zentriert, rechts
- [ ] Fett/Uppercase Toggle pro Textblock
- [ ] Textblöcke sind per Maus draggable auf dem Poster
- [ ] Resize-Handle an der Seite des Textblocks zum Anpassen der Breite
- [ ] Pfeil-Tasten verschieben den selektierten Block um 1px (+ Shift = 10px)
- [ ] Backspace löscht den selektierten Block (wenn nicht in Texteingabe)
- [ ] Snap-to-Grid (Schwellwert 10px) beim Verschieben
- [ ] Koordinaten werden automatisch aus Karten-ViewState berechnet (DMS-Format: 48° 08' 15" N)
- [ ] Sperr-Icon pro Block verhindert versehentliches Verschieben
- [ ] Neuer Textblock kann mit Button hinzugefügt werden

## Edge Cases
- Was passiert, wenn ein Textblock außerhalb des Poster-Bereichs gezogen wird? → Nicht über den Rand hinaus ziehen lassen
- Was passiert bei sehr kleiner Schriftgröße (<10px)? → Mindestgröße 8px erzwingen
- Was passiert bei sehr langen Texten? → Textblock kann mehrzeilig werden
- Was passiert, wenn alle Textblöcke gelöscht wurden? → Mindestens ein leerer Block bleibt, oder Hinweistext erscheint
- Was passiert bei unterschiedlichen Bildschirmgrößen? → Positionen skalieren proportional zur Vorschaugröße

## Technical Requirements
- Textblock-Positionen als normalisierte Werte (0–1) speichern, nicht als absolute Pixel
- Skalierung beim Export: Position × Export-Auflösung
- Schriften müssen sowohl im Browser-Canvas als auch im PDF korrekt gerendert werden
- Font-Loading via CSS @font-face + Canvas measureText()-Offset-Korrekturen

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten
```
Sidebar › TextTab
├── TextBlockList       (Liste aller Blöcke, Klick = selektieren)
│   └── TextBlockItem   (Label + Sperr-Icon + Löschen-Button)
├── TextBlockEditor     (Steuerung für selektierten Block)
│   ├── FontFamilySelect
│   ├── FontSizeInput   (Slider + Direkteingabe)
│   ├── ColorPicker     (Hex-Input + Farbpalette)
│   ├── AlignToggle     (links / mitte / rechts)
│   ├── BoldToggle + UppercaseToggle
│   └── TextInput       (Textarea für Blockinhalt)
└── AddBlockButton

PosterCanvas › TextBlockOverlay
└── TextBlock (je ein Block)
    ├── Drag-Handle     (mousedown → move-Modus)
    ├── Resize-Handle   (rechte Kante → width-resize-Modus)
    └── Text-Inhalt     (contenteditable oder Input)
```

### State
- Zustand Store: `textBlocks[]` (id, text, x, y, width, fontFamily, fontSize, color, align, bold, uppercase, locked)
- Positionen als normalisierte 0–1 Werte (relativ zur Canvas-Größe)
- `selectedBlockId` im Store für Sidebar-Sync

### Koordinaten-Berechnung
- DMS-Format aus lng/lat des MapStores automatisch berechnet
- Koordinaten-Block wird bei Karten-Bewegung automatisch aktualisiert

### Keine neuen Packages nötig
- Drag & Drop: native Pointer Events (kein externe DnD-Library)
- Fonts: CSS @font-face in globals.css

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
