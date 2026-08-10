# Etsy Listing-Feld-Konventionen

> Naming-Standard für Personalisierungs- und Variations-Felder beim Anlegen von Etsy-Listings.
> Ziel: Käufer-Eingaben landen 1:1 in unserem Parser-Schema, ohne `manual_review`.

## Warum das wichtig ist

Unser Order-Importer ([src/lib/etsy/personalization-parser.ts](../../src/lib/etsy/personalization-parser.ts)) bekommt pro Listing-Group ein **Schema** mit erwarteten Keys. Je näher die Etsy-Feldnamen an den Schema-Keys liegen, desto seltener landet eine Bestellung in der manuellen Prüfung.

Beispiel: Wenn das Schema `key: "stadt"` erwartet, aber das Etsy-Feld "City Name" heißt, muss der Käufer trotz "Liste der Optionen" beim Tippen treffen — oder unser Parser braucht einen Fallback-Eintrag. Konsistente Namen sparen uns beides.

## Etsy-Feldtypen — wann welcher?

| Etsy-Typ                | Wann verwenden                                                                 | Pro / Contra                                              |
| ----------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| **Variationen**         | Größe (A4/A3/A2). **Nur** wenn der Preis sich ändert.                          | Pflicht für Preis-Tier; max 2 Variation-Properties total. |
| **Personalisierung: Liste der Optionen** | Vordefinierte Auswahl (Stadt, Motiv, Farbschema). Kein Preis-Einfluss. | Null Tippfehler-Risiko, kein Inventory-Limit. **Bevorzugt** wo möglich. |
| **Personalisierung: Textfeld** | Echter Freitext (Titel, Untertitel, Datum, Namen).                       | Käufer kann tippen was er will — Parser-Risiko. Nur wenn echt nötig. |

**Faustregel:** Wenn die Werte aufzählbar sind (Städte, Anlässe, Stile) → **Liste der Optionen**. Wenn der Käufer wirklich seinen eigenen Text schreibt (Liebeserklärung, Hochzeitsdatum, Initialen) → **Textfeld**.

## Naming-Regeln

1. **Deutsche Labels**, weil Hauptmarkt DE/AT/CH ist. Englische Aliase deklarieren wir im Schema (`labelEn`), nicht im Etsy-Label selbst.
2. **Keine Umlaute oder Sonderzeichen** im Etsy-Label (Käufer-Browser-Encoding kann Etsy-API verwirren). "Untertitel" → ok, "Größe" → bei Variationen ok, bei Personalisierungs-Feldern lieber "Groesse" wenn unsicher.
3. **Kurz und eindeutig** (max 30 Zeichen): "Titel" statt "Bitte gib hier den oberen Titel ein".
4. **Bei "Liste der Optionen": Option-Namen exakt so wie unser Preset-Namen**. Wenn unser Preset im Admin "Berlin" heißt, dann Etsy-Option "Berlin", nicht "Berlin, Deutschland" oder "Berlin (Hauptstadt)".

## Konzept "Look" — kuratierte Stil+Farbe-Kombis

Wir haben intern mehrere orthogonale Design-Dimensionen: **Kartenstil** (Minimal, Vintage, Detailliert), **Kartenfarbe / Palette** (Schwarz-Weiß, Warm-Sand, Tiefpetrol, …) und je nach Typ noch Layout-Varianten. Das wären drei Auswahllisten für den Käufer — aber Etsy limitiert uns auf 5 Personalisierungs-Felder gesamt, und nicht jede Stil×Farbe-Kombi sieht gut aus.

**Lösung:** Operator kuratiert pro Listing eine Liste von **Looks**. Ein Look = ein konkreter Preset-Eintrag aus unserer DB, der Stil + Farbe + Layout bereits fest verbindet. Beispiele:

- "Minimal Mono" — minimaler Kartenstil + Schwarz-Weiß-Palette
- "Vintage Sand" — Vintage-Stil + Warm-Sand-Palette
- "Tiefpetrol Modern" — moderner Stil + Tiefpetrol-Palette

Das spiegelt **1:1 unser internes Preset-System** und entspricht der `feedback_low_friction_editor`-Doktrin: Käufer = Konfigurator, nicht Designer. Du behältst die Kontrolle, welche Stil+Farbe-Kombis verkauft werden, ohne dass jede mathematisch mögliche Kombi geprüft werden muss.

## Kanonisches Feld-Katalog

Diese Schema-Keys sind über alle Listing-Typen hinweg konsistent. Wenn du ein neues Feld brauchst, das hier nicht steht, ergänze es hier zuerst, damit Parser-Schemas einheitlich bleiben.

| Schema-Key   | Etsy-Label (DE)       | Feld-Typ          | Pflicht | Typischer Inhalt                            |
| ------------ | --------------------- | ----------------- | ------- | ------------------------------------------- |
| `look`       | Design / Look         | Liste der Optionen | ja      | "Minimal Mono", "Vintage Sand" — kuratierte Stil+Farbe-Kombi (1:1 unsere Presets) |
| `stadt`      | Stadt                 | Liste der Optionen | ja*     | "Berlin", "Hamburg", "München" (\*nur stadt-basierte Poster) |
| `motiv`      | Motiv                 | Liste der Optionen | ja      | "Stadtkarte", "Sternenhimmel", "Hochzeit"  |
| `titel`      | Titel                 | Textfeld          | ja      | "Unser Zuhause", "Heimat", …               |
| `untertitel` | Untertitel            | Textfeld          | nein    | "Seit 2018", Daten, kurze Zusätze          |
| `datum`      | Datum                 | Textfeld          | nein    | "12.05.2024", "Mai 2024"                   |
| `koordinaten`| Koordinaten           | Textfeld          | nein    | "52.52, 13.40" — i.d.R. über Geocoding aus `stadt` abgeleitet, nur als Override |
| `vorname1`   | Vorname Person 1      | Textfeld          | ja*     | "Anna" (\*nur Hochzeitsposter)             |
| `vorname2`   | Vorname Person 2      | Textfeld          | ja*     | "Tom"                                       |
| `hochzeitsort` | Hochzeitsort        | Textfeld          | ja*     | Falls keine Stadt-Liste passt              |
| `geburtstag` | Geburtsdatum + Uhrzeit| Textfeld          | ja*     | "12.05.1990 14:30" — für Sternenkarte      |
| `geburtsort` | Geburtsort            | Textfeld          | ja*     | "Berlin, Deutschland" (\*nur Sternenkarte)  |

`*` = nur bei den dafür vorgesehenen Listing-Typen erforderlich.

**Wichtig zum `look`-Feld:** Die Option-Namen müssen **exakt** den Preset-Namen aus unserer `presets`-Tabelle entsprechen. Bei der ersten Etsy-Synchronisierung mappt der Importer den vom Käufer gewählten Look-String direkt auf `etsy_listing_group_members.preset_id`.

## Listing-Templates pro Typ

### Stadt-Poster (alle Looks)

```
Variationen:
  Größe (Pflicht)        A4 / A3 / A2

Personalisierung (4 von 5 Feldern):
  1. Design / Look       Liste der Optionen — Pflicht
                         Optionen: kuratierte Stil+Farbe-Kombis (1:1 Preset-Namen)
                         z.B. "Minimal Mono", "Vintage Sand", "Tiefpetrol Modern"
  2. Stadt               Liste der Optionen — Pflicht
                         Optionen: Berlin, Hamburg, München, Köln, Frankfurt, …
                         (exakte Preset-Namen-Erweiterung, ASCII bevorzugt)
  3. Titel               Textfeld — Pflicht, max 40 Zeichen
                         Hinweis-Text: "z.B. 'Unser Zuhause' oder 'Heimat'"
  4. Untertitel          Textfeld — optional, max 40 Zeichen
                         Hinweis-Text: "z.B. Datum oder kurzer Zusatz"
```

Schema in `etsy_listing_groups.personalization_schema`:

```json
[
  { "key": "look", "label": "Design", "labelEn": "Design", "required": true, "positional": false, "fallbacks": ["stil", "style"] },
  { "key": "stadt", "label": "Stadt", "labelEn": "City", "required": true, "positional": false, "fallbacks": ["city"] },
  { "key": "titel", "label": "Titel", "labelEn": "Title", "required": true, "positional": true, "fallbacks": ["headline"] },
  { "key": "untertitel", "label": "Untertitel", "labelEn": "Subtitle", "required": false, "positional": true, "fallbacks": ["subtitle"] }
]
```

### Hochzeitsposter (PROJ-45 Multi-Map)

```
Variationen:
  Größe (Pflicht)        A4 / A3 / A2

Personalisierung (5 von 5 Feldern):
  1. Design / Look       Liste der Optionen — Pflicht
                         Optionen: Look-Presets (Stil+Farbe-Kombi für Hochzeit)
                         z.B. "Minimal Mono Wedding", "Vintage Sand Wedding"
  2. Vorname Person 1    Textfeld — Pflicht, max 30 Zeichen
  3. Vorname Person 2    Textfeld — Pflicht, max 30 Zeichen
  4. Hochzeitsort        Textfeld — Pflicht, max 60 Zeichen
                         Hinweis: "Stadt, Land — z.B. 'Lissabon, Portugal'"
  5. Datum               Textfeld — Pflicht, max 20 Zeichen
                         Hinweis: "Format frei, z.B. '12.05.2024' oder 'Mai 2024'"
```

Schema:

```json
[
  { "key": "look", "label": "Design", "labelEn": "Design", "required": true, "positional": false, "fallbacks": ["stil", "style"] },
  { "key": "vorname1", "label": "Vorname Person 1", "labelEn": "First Name 1", "required": true, "positional": true, "fallbacks": ["name1", "vorname"] },
  { "key": "vorname2", "label": "Vorname Person 2", "labelEn": "First Name 2", "required": true, "positional": true, "fallbacks": ["name2"] },
  { "key": "hochzeitsort", "label": "Hochzeitsort", "labelEn": "Wedding Location", "required": true, "positional": true, "fallbacks": ["ort", "location"] },
  { "key": "datum", "label": "Datum", "labelEn": "Date", "required": true, "positional": true, "fallbacks": ["date"] }
]
```

### Sternenkarte

```
Variationen:
  Größe (Pflicht)        A4 / A3 / A2

Personalisierung (3 von 5 Feldern):
  1. Design / Look       Liste der Optionen — Pflicht
                         Optionen: Look-Presets (Stil+Farbe-Kombi für Sternenkarte)
                         z.B. "Aquarell Nachtblau", "Minimal Mono", "Vintage Sepia"
  2. Geburtsdatum + Uhrzeit  Textfeld — Pflicht, max 25 Zeichen
                             Hinweis: "Format: DD.MM.YYYY HH:MM, z.B. 12.05.1990 14:30"
  3. Geburtsort          Textfeld — Pflicht, max 60 Zeichen
                         Hinweis: "Stadt, Land — z.B. 'Berlin, Deutschland'"
```

Schema:

```json
[
  { "key": "look", "label": "Design", "labelEn": "Design", "required": true, "positional": false, "fallbacks": ["stil", "style"] },
  { "key": "geburtstag", "label": "Geburtsdatum + Uhrzeit", "labelEn": "Birth Date + Time", "required": true, "positional": true, "fallbacks": ["birthday", "geburt"], "regex": "^\\d{1,2}[./-]\\d{1,2}[./-]\\d{2,4}.*$" },
  { "key": "geburtsort", "label": "Geburtsort", "labelEn": "Birth Location", "required": true, "positional": true, "fallbacks": ["ort", "location"] }
]
```

## Hinweis-Texte pro Feld

Etsy zeigt dem Käufer einen **Hinweistext** pro Personalisierungs-Feld. Ein guter Hinweis spart `manual_review`-Fälle:

- **Konkretes Beispiel** statt abstrakter Beschreibung → "z.B. 'Berlin, Deutschland'" schlägt "Bitte Stadt eingeben"
- **Format vorgeben** bei strukturierten Daten → "Format: DD.MM.YYYY HH:MM"
- **Zeichen-Limit erwähnen** → "Max 30 Zeichen"
- **Auf Konsequenzen hinweisen** wenn relevant → "Wir nutzen diese Stadt für die Karte, bitte exakt schreiben"

## Was du NICHT tun solltest

- ❌ Felder anlegen, die unser Render-Code gar nicht verarbeitet ("Bitte Lieblingsfarbe nennen") — verwirrt Käufer, landet als Müll im Parser
- ❌ Koordinaten als Pflichtfeld machen — Geocoding via MapTiler löst das automatisch aus `stadt`/`ort`
- ❌ Variations für Design-Auswahl (z.B. "Stadt als Variation") nutzen, wenn der Preis sich nicht ändert — verschwendet die 2-Variation-Quote und macht Inventory-Matrix unnötig komplex
- ❌ Listing-Typen mischen (z.B. Stadt-Poster + Sternenkarte in einer Listing-Group) — Käufer erwartet konsistente Felder pro Listing

## Konsequenzen für unsere Listing-Group-Tabelle

Mit der "Liste der Optionen"-Strategie und kuratierten Looks wird das ursprüngliche 140-Inventory-Limit fast irrelevant — eine Group bündelt jetzt:

- Variationen: nur Größe (A4/A3/A2) → 3 Inventory-Combos
- Personalisierung: Look-Liste (z.B. 8 Looks) × Stadt-Liste (z.B. 50 Städte) → keine Inventory-Combos

Damit passt **ein einziges Listing pro Listing-Typ** — z.B. "Stadt-Poster" mit allen Looks und allen Städten, oder "Hochzeitsposter" mit allen Wedding-Looks. Statt 40+ Einzel-Listings.

**Wichtige Mapping-Implikation:** Ein Käufer wählt (Look, Stadt). Beim Order-Import muss `etsy_listing_group_members.preset_id` über **Look-Name → Preset-ID** aufgelöst werden, NICHT über Variation-Value-ID. Phase 2.5 ergänzt diese Auflösung in `resolveMapping()` in [src/lib/etsy/order-pull.ts](../../src/lib/etsy/order-pull.ts).

## Workflow beim Anlegen eines neuen Etsy-Listings

1. **Im Admin** (PROJ-49 Phase 3, kommt noch) eine Listing-Group anlegen, die N Presets bündelt
2. **Liste der Optionen** für Etsy generieren: exakte Preset-Namen, ASCII-bereinigt
3. **Hinweistext pro Textfeld** mit konkretem Beispiel
4. **Schema in `personalization_schema`** speichern — Keys + Fallbacks
5. Erst Listing in Etsy mit "Draft" anlegen, prüfen wie es aussieht, dann publishen

## Offene Fragen (sobald App approved)

- Wie liefert Etsy die "Liste der Optionen"-Werte im API-Response? Im `transaction.personalization`-String konkateniert oder als separate `variations`-Entries?
- Maximale Anzahl Optionen pro Personalisierungs-Liste (vermutlich ~70 analog zu Variationen, muss verifiziert werden)
- Verhält sich das Feature in `getShopReceipts` genauso wie in `getShopReceiptTransactions`?

Diese Fragen klären wir bei der ersten Test-Bestellung. Bis dahin ist `etsy_orders.raw_receipt_payload` (JSONB) unser Daten-Sicherungs-Netz.
