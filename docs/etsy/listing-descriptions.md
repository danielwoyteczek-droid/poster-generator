# Etsy Listing-Beschreibungen

> Drafting-Ground für Etsy-Produktbeschreibungen, bevor der Group-Editor (PROJ-49 Phase 3) gebaut ist.
> Zielort in der DB: `etsy_listing_groups.etsy_description` (TEXT, max. 13.000 Zeichen).
> Etsy rendert **kein Markdown** — Zeilenumbrüche bleiben, Formatierung nicht. Symbole (▶ ✨ 🧡) werden 1:1 angezeigt.

## Compliance-Leitplanken (siehe Memory `feedback_haftbare_marketing_claims`)

Keine dieser Begriffe verwenden:
- konkrete Papier-Grammaturen (z.B. „250 g/m²")
- „klimaneutral", FSC, „nachhaltig produziert" ohne Beleg
- „Made in Germany / EU" ohne Audit
- exakte Lieferzeit-Versprechen („1-2 Werktage", „in 99% der Fälle")
- Spitzenstellungs-Claims („höchste Qualität", „professionelles Fotolabor", „Nr. 1")
- „Massivholzrahmen" — petite-moment-Rahmen ist Aluminium (siehe Memory `project_frame_material`)

Erlaubt: „Premium", „hochwertig", „hochwertiger Aluminiumrahmen", DIN A4/A3/A2, „zügig".

---

## Generische Basis-Beschreibung (Stand 2026-05-14)

Verwendbar für die meisten Listing-Groups (Stadt-Poster, Koordinaten-Poster, Hochzeits-Map). Pro Group ggf. den Hook-Absatz oben tauschen.

```
Wo alles begann. Wo ihr euch das erste Mal getroffen habt. Wo aus „Vielleicht" ein „Für immer" wurde.

Aus diesem einen Ort wird ein persönliches Wandposter — individuell beschriftet, in deiner Lieblings-Farbpalette. Das ideale Geschenk zum Jahrestag, Hochzeitstag, Verlobungstag, Geburtstag oder Valentinstag. 🧡

BITTE VOR DEM KAUF LESEN ☀️
▶ Vorschau per E-Mail vor dem Druck
▶ Versand mit Sendungsverfolgung
▶ Zügige Bearbeitung
▶ Gerahmte Poster kommen montiert und versandsicher verpackt an
▶ Premium-Qualität, optional mit hochwertigem Aluminiumrahmen

SO ENTSTEHT DEIN POSTER
1. Du bestellst und gibst im Personalisierungs-Feld an:
   • Ort (Stadt, Land oder Adresse)
   • Titel (z.B. „Berlin")
   • Untertitel (z.B. „Wo unsere Geschichte begann · 12.08.2018")
   • Farbe/Stil (siehe Bilder 3–7): „Original", „Dark", „Pink" oder „Navy"
   • Optional: Koordinaten, falls du den Punkt selbst setzen möchtest
2. Ich setze die Karte, platziere den Marker an die richtige Stelle und schicke dir einen Entwurf per E-Mail zur Freigabe.
3. Nach deinem OK geht das Poster in den Druck.

Bitte regelmäßig E-Mails (auch Spam-Ordner) und Etsy-Nachrichten checken — sonst verzögert sich dein Druck. 😊

VARIANTEN

▶ DIGITALE DATEI
Wähle „Download" und du bekommst das Motiv als hochauflösende PDF/PNG-Datei per E-Mail. Bitte das Wunschformat (DIN A4, A3 oder A2) im Personalisierungs-Feld angeben.

▶ POSTER (DRUCK)
Premium-Druck in den Formaten:
• DIN A4 (21 × 29,7 cm)
• DIN A3 (29,7 × 42 cm)
• DIN A2 (42 × 59,4 cm)

▶ POSTER MIT RAHMEN
Optional bestellst du dein Motiv direkt gerahmt — im hochwertigen Aluminiumrahmen in Schwarz. Schlank, modern, zeitlos: ein Rahmen, der die Karte wirken lässt, statt mit ihr zu konkurrieren. Passt zu jedem Einrichtungsstil, vom Altbau bis zum Boho-Schlafzimmer. Du erhältst dein Poster bereits eingerahmt und versandsicher verpackt — sofort aufhängen, kein eigenes Rahmen-Shopping.

BEARBEITUNGS- UND LIEFERZEIT
Nach deiner Freigabe geht es zügig in Produktion. Die voraussichtliche Lieferzeit zeigt dir Etsy im Checkout pro Region an. Digitale Dateien gehen nach deiner Freigabe per E-Mail an dich raus.

WICHTIGE INFOS
• Farben können je nach Monitor und Druckprozess minimal variieren.
• Das Produkt ist für den privaten Gebrauch lizenziert (keine kommerzielle Nutzung).

Sollte etwas nicht passen, schreib mir einfach — wir finden eine Lösung. ❤️
```

---

## Änderungen gegenüber Original (ArtowerStudio-Vorlage)

| Original | Neu | Grund |
|---|---|---|
| „Massivholzrahmen, Schwarz/Weiß/Natur" | „hochwertiger Aluminiumrahmen in Schwarz — schlank, modern, zeitlos" | petite-moment-Produktrealität; Alu als Verkaufsargument ausgespielt |
| „250 g/m²" | (gestrichen) | UWG-Risiko bei Charge-Abweichung |
| „höchste Qualität / professionelles Fotolabor" | „Premium-Qualität" | Spitzenstellungs-Claim → soft formuliert |
| „1-2 Werktage Lieferzeit, in 99% der Fälle" | „voraussichtliche Lieferzeit zeigt Etsy im Checkout an" | exakte Versprechen = abmahnfähig |
| „andere Formate möglich, schreib mir" | (gestrichen) | nicht skalierbar für Auto-Pipeline |
| Konkurrenz-Shop-Link | (gestrichen) | n/a |
| Freitext-Personalisierung | strukturiertes Schema (Ort/Titel/Untertitel/Koord.) | matcht PROJ-49 Parser-Schema |

---

## Personalization-Schema „Wo alles begann"

JSON für `etsy_listing_groups.personalization_schema` (oder `presets.etsy_personalization_schema`). Matcht den Parser in [src/lib/etsy/personalization-parser.ts](../../src/lib/etsy/personalization-parser.ts) — Tests in `personalization-parser.test.ts` decken das Schema ab.

```json
[
  {
    "key": "ort",
    "label": "Ort",
    "labelEn": "Location",
    "required": true,
    "fallbacks": ["stadt", "city", "place"],
    "positional": true
  },
  {
    "key": "titel",
    "label": "Titel",
    "labelEn": "Title",
    "required": true,
    "fallbacks": ["headline"],
    "positional": true
  },
  {
    "key": "untertitel",
    "label": "Untertitel",
    "labelEn": "Subtitle",
    "required": false,
    "fallbacks": ["subtitle", "untertext"],
    "positional": true
  },
  {
    "key": "farbe",
    "label": "Farbe/Stil",
    "labelEn": "Color/Style",
    "required": true,
    "fallbacks": ["farbe", "stil", "color", "style", "palette"],
    "positional": true,
    "regex": "^(?:original|dark|pink|navy)$",
    "regexFlags": "i"
  },
  {
    "key": "koordinaten",
    "label": "Koordinaten",
    "labelEn": "Coordinates",
    "required": false,
    "fallbacks": ["coords", "gps"],
    "positional": false,
    "regex": "^-?\\d+\\.\\d+,\\s*-?\\d+\\.\\d+$"
  }
]
```

**Erlaubte Werte für „Farbe/Stil":** `Original`, `Dark`, `Pink`, `Navy` (case-insensitive — `pink` und `PINK` matchen auch).

**Etsy-Personalisierungs-Hinweistext (Buyer-facing):**

```
Bitte fülle pro Zeile aus:
Ort: <z.B. Berlin, Deutschland>
Titel: <z.B. Berlin>
Untertitel: <optional, z.B. Wo alles begann · 12.08.2018>
Farbe/Stil: <Original, Dark, Pink oder Navy — siehe Bilder 3–7>
Koordinaten: <optional, falls Punkt exakt gesetzt werden soll>
```

---

## Listing-Bilder bauen (Compare-Grid)

Für Slot 3 des Listings (siehe Tabelle weiter oben) wird ein 2×2-Compare-Grid generiert, das alle 4 Looks nebeneinander zeigt.

**Workflow:**

1. Im Editor (`/de/map`) ein Sample-Poster bauen — gleicher Ort, Titel, Untertitel.
2. Durch die 4 Stile schalten und je ein PNG via PROJ-3 Export herunterladen:
   - `wo-alles-begann-original.png`
   - `wo-alles-begann-dark.png`
   - `wo-alles-begann-pink.png`
   - `wo-alles-begann-navy.png`
3. Compare-Grid bauen:

   ```bash
   npm run etsy:compare-grid -- \
     --original=./out/wo-alles-begann-original.png \
     --dark=./out/wo-alles-begann-dark.png \
     --pink=./out/wo-alles-begann-pink.png \
     --navy=./out/wo-alles-begann-navy.png \
     --out=./out/etsy-compare-grid.png \
     --headline="Vier Looks zur Wahl"
   ```

   Output: 2000×2000 PNG mit allen 4 Stilen + Labels (ORIGINAL/DARK/PINK/NAVY). Headline optional.

Script: [scripts/build-etsy-compare-grid.ts](../../scripts/build-etsy-compare-grid.ts) — nutzt Playwright (bereits installiert), keine zusätzlichen Dependencies.

---

## Group-spezifische Varianten (Platzhalter für später)

### Hochzeitsposter (Multi-Map, PROJ-45)
_TODO: Hook anpassen — „Wo ihr Ja gesagt habt" + Multi-Map-Hinweis (Kennenlernort + Verlobungsort + Hochzeitsort)._

### Sternenposter (PROJ-7)
_TODO: Hook anpassen — „Der Himmel über diesem Moment" + Hinweis auf Datum statt Ort als Hauptpersonalisierung._
