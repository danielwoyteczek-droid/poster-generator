# Übergabe an petite-moment — die Empfängerseite

Diese Datei beschreibt, was der Abholer auf `UMOI-SERVER` schickt und was die
Gegenseite damit tun muss. Sie ist dafür gedacht, in der petite-moment-Session
(Repo `D:\dev\poster-generator`) als Vorlage zu dienen.

Stand 15.09.2026. Der Abholer läuft, ist getestet, aber noch nicht scharf
geschaltet — er wartet auf diesen Endpunkt.

---

## 1. Der Datenfluss

```
UMOI-SERVER                      Vercel                      Supabase
┌──────────────┐   HTTPS POST   ┌──────────────┐            ┌──────────────┐
│ collector.js │ ─────────────▶ │ /api/amazon/ │ ─────────▶ │ Tabelle      │
│              │   Bearer-Auth  │   ingest     │            │ + Storage    │
└──────────────┘                └──────────────┘            └──────────────┘
   liest JTL                     nur Durchlauf,               hier liegen
   lokal, nur                    kein Speicher                die Daten
   lesend
```

Wichtig: **Auf Vercel wird nichts gespeichert.** Die Funktion ist zustandslos
und ihr Dateisystem flüchtig. Bild und SVG gehören in Supabase Storage, in die
Tabellenzeile kommt nur der Pfad.

Die JTL-Datenbank ist von außen nicht erreichbar und wird es auch nicht. Der
Verkehr geht ausschließlich in eine Richtung: Server → HTTPS → Vercel.

---

## 2. Der Aufruf

```http
POST https://petite-moment.com/api/amazon/ingest
Authorization: Bearer <AMAZON_INGEST_SECRET>
Content-Type: application/json
```

```jsonc
{
  "source": "jtl",
  "collector_version": "1",
  "items": [ /* 1 bis 10 Einträge, s.u. */ ]
}
```

Bündelgröße ist auf **10** gesetzt. Grund: Vercel begrenzt den Request-Body von
Serverless Functions auf 4,5 MB, und ein Eintrag wiegt mit Vorschaubild rund
80 KB. 10 Einträge sind ~800 KB und lassen Luft. (Falls du auf Edge Runtime
gehst oder die Grenze anders ist: im Abholer ist es `BATCH_SIZE` in der `.env`.)

### Ein Eintrag

```jsonc
{
  "amazon_order_id":  "305-5531288-7707506",
  "order_item_id":    "67684892780682",
  "position":         1,
  "sku":              "LQ-30001-09",
  "asin":             "B0DZ161YB3",
  "marketplace_id":   "A1PA6795UKMFR9",
  "purchase_date":    "2026-09-14T20:38:38.000Z",
  "quantity":         1,
  "order_state":      "open",
  "jtl_position_id":  42818,

  "customization":      { /* Amazon-JSON, unverändert und vollständig */ },
  "customization_item": { /* derselbe Inhalt, ausgepackt — s. Abschnitt 4 */ },
  "customization_source": "jtl_column",

  "assets": {
    "preview_jpg": { "filename": "a732b925-….jpg", "content_base64": "…", "bytes": 39289 },
    "svg":         { "filename": "0c0947e4-….svg", "content_base64": "…", "bytes": 2835  },
    "xml":         { "filename": "67684892780682.xml", "content_base64": "…", "bytes": 8352 }
  },

  "archive_url":    "https://zme-caps.amazon.com/t/…",
  "page_url":       "https://amzn.eu/09C2JAOI",
  "latest_ship_at": null
}
```

| Feld | Typ | Anmerkung |
|---|---|---|
| `amazon_order_id` | string | Amazons Bestellnummer |
| `order_item_id` | string | Amazons Positions-ID, stabil |
| `position` | int | Laufende Nummer innerhalb der Bestellung, ab 1 |
| `sku` | string | Immer `LQ-…` |
| `asin` | string | Aus JTLs Angebotsbestand aufgelöst |
| `marketplace_id` | string | Bisher immer `A1PA6795UKMFR9` (Amazon.de) |
| `purchase_date` | string | ISO-8601 in **UTC** |
| `quantity` | int | |
| `order_state` | enum | `open` \| `cancelled` \| `shipped` |
| `jtl_position_id` | int | JTLs `kAmazonBestellungPos` |
| `customization` | object | unverändert, siehe Abschnitt 4 |
| `customization_item` | object | ausgepackt, siehe Abschnitt 4 |
| `customization_source` | enum | `jtl_column` \| `downloaded_zip` |
| `assets` | object \| null | kann `null` sein, einzelne Felder auch |
| `archive_url` | string \| null | Amazons ZIP |
| `page_url` | string \| null | Amazons Vorschauseite, gut zur Sichtprüfung |
| `latest_ship_at` | string \| null | Amazons spätester Versandtermin, UTC |

**Nicht enthalten und nie enthalten:** Käufername, Empfängername, Adresse,
E-Mail, Telefon, Preise, Steuern, Zahlungsdaten. Die werden gar nicht erst aus
JTL gelesen.

---

## 3. Die Antwort

```jsonc
{
  "ok": true,
  "accepted": 1,
  "skipped_duplicate": 0,
  "failed": 0,
  "errors": []
}
```

- `errors[]` darf Strings oder Objekte enthalten — der Abholer protokolliert
  beides und bricht nicht ab.
- Ein `failed > 0` ist kein Fehler im HTTP-Sinn. Trotzdem `200` antworten.
- Bei `401`/`5xx` wiederholt der Abholer bis zu dreimal (2 s, dann 4 s) und
  protokolliert dann. Beim nächsten Lauf kommt dasselbe Bündel wieder.

### Dubletten

Der Abholer schickt bewusst mehrfach — er prüft bei jedem Lauf zusätzlich ein
Rückschaufenster von 30 Tagen, weil die JTL-Tabellen keine Änderungsspalte
haben und ein nachträglicher Storno sonst nie auffiele.

**Der eindeutige Schlüssel ist `(amazon_order_id, order_item_id)`.** Darauf
gehört ein Unique-Index. Beim zweiten Mal:

- unverändert → `skipped_duplicate++`
- `order_state` hat sich geändert (z. B. `open` → `cancelled`) → **aktualisieren**,
  nicht überspringen. Sonst erfährst du nie von einem Storno.

Für die Druckwarteschlange heißt das: ein `cancelled` muss einen noch nicht
gedruckten Auftrag aus der Queue nehmen.

---

## 4. `customization` vs. `customization_item`

Das ist die eine Stelle, an der es leicht schiefgeht.

`customization` ist das Amazon-JSON **unverändert**, so wie es in JTL steht —
inklusive Antwort-Hülle:

```jsonc
{
  "status": 200,
  "successful": true,
  "data": {
    "pageUrl": "https://amzn.eu/…",
    "orderCustomizationData": [ { /* ←── hier sind die Nutzdaten */ } ],
    "archiveUrl": "https://zme-caps.amazon.com/…"
  },
  "request_id": "…"
}
```

Kommt der Datensatz stattdessen aus dem ZIP (`customization_source ==
"downloaded_zip"`), fehlt diese Hülle — dort liegt der innere Knoten direkt auf
oberster Ebene.

**Damit du nicht zwei Formen unterscheiden musst**, liegt der innere Knoten
zusätzlich immer gleich geformt als `customization_item` daneben:

```jsonc
{
  "orderId": "305-…", "orderItemId": "676…",
  "merchantId": "AMLRAJUDQEZ2Z", "marketplaceId": "A1PA6795UKMFR9",
  "asin": "B0DZ161YB3", "title": "LabelQueen Wo alles begann …",
  "quantity": 1, "vendorCode": null,
  "customizationData": { /* Baum mit Layout, Basisbild, SVG-Name */ },
  "customizationInfo": { "version3.0": { "surfaces": [ … ] } }
}
```

→ **Gegen `customization_item` programmieren.** `customization` nur aufheben,
falls mal etwas nachzusehen ist.

### Wo die getippten Werte stehen

`customization_item.customizationInfo["version3.0"].surfaces[].areas[]`

Jedes `area` hat `name`, `label` und je nach `customizationType`:

- `TextPrinting` → `text`, dazu `fill`, `fontFamily`, `fontUrl`,
  `Dimensions {width,height}`, `Position {x,y}`
- `Options` → `optionValue`, `optionImage`, `priceDelta`

Die `label`-Werte sind stabil und damit der Ankerpunkt für die Preset-Felder:

| `label` | Beispielwert | gehört ins Preset-Feld |
|---|---|---|
| Adresse für die Karte | `Musterstraße 1 12345 Musterstadt` | Kartenort |
| Koordinaten (…) (Optional) | `(49.2118794, 9.2358424)` | Koordinaten, wenn gesetzt |
| Titel | `OTA-Girl & ATA-Boy` | Überschrift |
| Namen | `Lara & Denis` | Namenszeile |
| Stadt und Koordinaten | `Forever <3` | Freitext darunter |
| Größe des Posters | `DIN A4` | Format |
| Bilderrahmen A4 | `Weißer Rahmen` | Rahmen |

> **Achtung, nicht raten:** „Koordinaten" ist als optional gekennzeichnet und
> kann fehlen. „Adresse für die Karte" ist der Ort, den der Käufer abgebildet
> haben will — **nicht** die Lieferadresse. Amazon vergibt die `label` pro
> Listing; wenn du eine neue SKU anlegst, kann sich der Wortlaut ändern. Auf
> `label` matchen, aber einen Fallback auf `name` vorsehen.

Die `surfaces[].name` (hier `Heart`) unterscheidet Varianten innerhalb einer
SKU — potenziell relevant für die Preset-Wahl.

---

## 5. Die Assets

`assets.preview_jpg` und `assets.svg` sind base64. Beide nach **Supabase
Storage**, nicht in die Tabelle.

- **`preview_jpg`** — Amazons gerendertes Vorschaubild. Das ist deine
  Kontrollübersicht: daneben legen, was petite-moment rendert, und vergleichen.
- **`svg`** — die Vektorgrafik, 3200 × 3200, `viewBox="0 0 400 400"`. Noch
  ungeprüft, ob sie direkt verwendbar ist. Wenn ja, spart sie womöglich den
  halben Renderweg.
- **`xml`** — dieselben Daten wie das JSON, nur anders verpackt. Reines Backup,
  kannst du ignorieren.

Jedes dieser Felder kann `null` sein (z. B. wenn Amazons ZIP gerade nicht
erreichbar war). Die Anpassungsdaten kommen dann trotzdem — nur ohne Bild.
**Der Ingest darf daran nicht scheitern.**

Alle vier Dateien liegen zusätzlich auf `UMOI-SERVER` unter
`C:\amazon-collector\archiv\<Bestellnummer>_<Positions-ID>\`. Falls auf der
Vercel-Seite etwas verlorengeht, ist die Quelle noch da.

---

## 6. Vorschlag für die Tabelle

Als Ausgangspunkt, nicht als Vorschrift:

```sql
create table amazon_custom_orders (
  id                    uuid primary key default gen_random_uuid(),

  amazon_order_id       text not null,
  order_item_id         text not null,
  position              int  not null,

  sku                   text not null,
  asin                  text,
  marketplace_id        text,
  purchase_date         timestamptz,
  quantity              int  not null default 1,
  order_state           text not null check (order_state in ('open','cancelled','shipped')),
  jtl_position_id       int,

  customization         jsonb not null,   -- unverändert
  customization_item    jsonb,            -- ausgepackt, hierauf arbeiten
  customization_source  text,

  preview_path          text,             -- Supabase Storage
  svg_path              text,
  archive_url           text,
  page_url              text,
  latest_ship_at        timestamptz,

  -- Queue-Zustand: gehört petite-moment, nicht dem Abholer
  queue_status          text not null default 'neu',
  design_preset         text,
  rendered_at           timestamptz,
  printed_at            timestamptz,

  first_seen_at         timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (amazon_order_id, order_item_id)
);

create index on amazon_custom_orders (queue_status, purchase_date);
```

`queue_status` und alles darunter setzt **nur** petite-moment. Ein erneuter
Ingest darf diese Felder nicht überschreiben — sonst springt ein schon
gedruckter Auftrag beim nächsten Rückschaufenster zurück auf „neu".

Konkret: beim Upsert die Amazon-Felder und `order_state` aktualisieren, die
Queue-Felder unangetastet lassen.

---

## 7. Der Ablauf, den du dir wünschst

1. Ingest legt die Zeile an, `queue_status = 'neu'`.
2. petite-moment wählt anhand der `sku` das Design-Preset.
3. Felder aus `customization_item` in die Preset-Felder füllen.
4. Karte rendern → `queue_status = 'entwurf'`.
5. Du vergleichst mit `preview_path` (Amazons Bild), korrigierst falls nötig.
6. Druckdatei erzeugen, `printed_at` setzen.

### Die SKU→Design-Zuordnung für Schritt 2

Der Abholer schickt nur die `sku`. Welches Design dahintersteht, entscheidet
petite-moment. Das hier ist die Grundlage — Stand 15.09.2026, alle bisher
bestellten `LQ-`Artikel. Die Spalte „Variante" stammt aus dem Artikelnamen bei
Amazon, in Klammern am Ende:

| SKU | ASIN | Variante | bisher bestellt |
|---|---|---|---:|
| `LQ-30001-01` | `B0DVRM8Y83` | Herz | 57 |
| `LQ-30001-02` | `B0DVRLVB2F` | Vollflächig | 238 |
| `LQ-30001-03` | `B0DY5BK6LC` | Karte + Bild im Herz | 2 |
| `LQ-30001-06` | `B0DYZT78R6` | Love Herz | 3 |
| `LQ-30001-07` | `B0DYZVCB6F` | Herz + Karte | 1 |
| `LQ-30001-08` | `B0DYZW2QX8` | Puzzle | 5 |
| `LQ-30001-09` | `B0DZ161YB3` | Puzzle | 4 |
| `LQ-1000-08-HRZ` | `B0DYZ1SRKB` | 2 Herzen HRZ | 6 |
| `LQ-20001-01` | `B0DVRGQGXH` | — | 0 (gelistet, nie bestellt) |
| `LQ-20001-02` | `B0DVRGPXS9` | — | 0 (gelistet, nie bestellt) |

Zwei Dinge, die beim Bauen der Preset-Tabelle auffallen sollten:

- **`LQ-30001-08` und `LQ-30001-09` heißen bei Amazon beide „Puzzle"**, haben
  aber unterschiedliche ASINs. Ob das zwei Designs sind oder eins mit zwei
  Listings, weißt nur du — im Zweifel beide auf dasselbe Preset zeigen lassen.
- **Auf `sku` mappen, nicht auf die ASIN.** Die SKU ist deine eigene Nummer und
  stabil; die ASIN vergibt Amazon und kann bei einem neuen Listing wechseln.
  Die ASIN steht nur zur Kontrolle dabei.

Für unbekannte SKUs einen Rückfall vorsehen: Zeile trotzdem anlegen,
`design_preset` leer lassen, `queue_status` z. B. auf `preset_fehlt`. Sonst
verschwindet eine neu angelegte Artikelnummer stillschweigend.

---

## 8. Zum Testen, bevor der Abholer scharf ist

Neben dieser Datei liegt **`fixture-ingest-beispiel.json`** — ein vollständiger
POST-Rumpf, wie ihn der Abholer schickt, nur anonymisiert. Damit kannst du
Endpunkt, Parser und Preset-Befüllung fertig bauen, ohne dass hier irgendetwas
läuft.

```bash
curl -X POST http://localhost:3000/api/amazon/ingest \
  -H "Authorization: Bearer $AMAZON_INGEST_SECRET" \
  -H "Content-Type: application/json" \
  --data-binary @fixture-ingest-beispiel.json
```

Was gegenüber dem Echtbetrieb ersetzt wurde — **nur Werte, nie Struktur**:

| | Vorlage | Echtbetrieb |
|---|---|---|
| Bestell- und Positions-ID | `111-2222222-3333333` / `99999999999999` | echte Amazon-IDs |
| Adresse für die Karte | `Musterstraße 1 12345 Musterstadt` | echte Anschrift des Käufers |
| Koordinaten | `(52.5200000, 13.4050000)` | echte Koordinaten |
| Titel / Namen / Freitext | `Unser Anfang` / `Anna & Ben` / `Für immer` | echte Eingaben |
| Händler-ID (auch in URLs) | `AXXXXXXXXXXXXX` | echte Verkäufer-ID |
| `preview_jpg` / `svg` / `xml` | winzige Platzhalter | 39 KB / 2,8 KB / 8,4 KB |
| `archive_url` / `page_url` | Platzhalter | echte Amazon-Links |

Alles andere ist unverändert: Feldnamen, Verschachtelung, `label`-Texte,
Schriftarten, Farben, `Dimensions`, `Position`, Optionswerte. Die Datei ist
36 KB und darf ins Repo.

> Der **echte** Datensatz liegt auf `UMOI-SERVER` unter
> `C:\amazon-collector\archiv\305-5531288-7707506_42818\` und bleibt dort.
> Er enthält eine echte Anschrift und Vornamen — nicht auf den
> Entwicklungsrechner kopieren, nicht committen, nicht in Logs.

Wenn der Endpunkt steht:

1. Token in `C:\amazon-collector\.env` als `AMAZON_INGEST_SECRET` eintragen
2. `abholen-trockenlauf.cmd` — zeigt, was rausginge
3. `abholen-jetzt.cmd` — überträgt einmalig, eine Position
4. Ergebnis in Supabase prüfen
5. Nochmal laufen lassen → muss `skipped_duplicate: 1` liefern
6. Erst dann die stündliche Aufgabe einhängen (Befehl in der README)
