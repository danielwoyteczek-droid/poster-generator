# PROJ-33: Saisonaler Marketing-Kalender

## Status: Architected
**Created:** 2026-04-29
**Last Updated:** 2026-04-29

## Dependencies
- Requires: PROJ-13 (Content CMS / Sanity) — Kalender lebt als neues Sanity-Schema
- Requires: PROJ-14 (Blog-Publishing-Automatisierung) — Topic-Queue wird vom Kalender befüllt
- Requires: PROJ-20 (Internationalisierung) — Events müssen pro Locale (DE, EN, …) Termine kennen

## Problem & Ziel
Der Blog-Scheduler aus PROJ-14 läuft täglich, aber wenn die Themen-Queue leer ist, passiert nichts. Marketing-relevante Anlässe (Muttertag, Weihnachten, Valentinstag, Hochzeitssaison) bleiben ungenutzt — gerade die sind aber Conversion-Treiber. Manuelles Vor­planen pro Sprache und Saison skaliert nicht.

PROJ-32 führt einen **saisonalen Marketing-Kalender** ein: ein Daten­modell für wiederkehrende Events mit pro-Locale-Daten und Lead-Time. Der Topic-Generator nutzt diesen Kalender, um die Themen-Queue rechtzeitig vor dem Such-Peak mit saisonal passenden Vorschlägen zu füllen — automatisch, mehrsprachig, und mit Operator-Review als Qualitäts-Schranke.

## User Stories
- Als Betreiber will ich saisonale Anlässe einmalig in einem Kalender pflegen (mit Datum oder Wiederkehr-Regel pro Locale), damit ich nicht jedes Jahr neu nachhalten muss, wann Muttertag oder Black Friday ist.
- Als Betreiber will ich, dass die KI rechtzeitig vor jedem Anlass passende Blog-Topics vorschlägt, damit Artikel zum Such-Peak bereits indexiert sind (typisch 4–6 Wochen Vorlauf).
- Als Betreiber will ich KI-Vorschläge im Sanity Studio sichten und mit einem Klick freigeben (oder verwerfen), damit ich Brand-Stimme und SEO-Sinn kontrollieren kann, bevor Artikel generiert werden.
- Als Betreiber will ich pro Event und Locale 2–3 verschiedene Themen-Angles erhalten, damit ein Anlass mit mehreren Artikeln tiefer abgedeckt wird (z.B. Muttertag aus Sicht von Heimatstadt-Poster, Sternenkarte, persönlicher Karte).
- Als Betreiber will ich, dass der Kalender Locale-Unterschiede kennt (Muttertag DE = 2. Sonntag im Mai, UK = 4. Fastensonntag), damit der englische Markt korrekt bedient wird, sobald PROJ-20 produktiv ist.
- Als Betreiber will ich, dass der Kalender bei Auslieferung schon mit ~15 Standard-Events pro Locale befüllt ist, damit ich direkt nach dem Deploy starten kann.
- Als Betreiber will ich, dass evergreen-Themen weiterhin vorgeschlagen werden, wenn gerade kein Event im Publish-Window liegt, damit der Blog kontinuierlich wächst.

## Acceptance Criteria

### Daten­modell
- [ ] Neues Sanity-Schema `marketingEvent` mit Feldern:
  - `name` (string, required) — z.B. „Muttertag", „Valentinstag", „Hochzeitssaison-Start"
  - `slug` (slug, required) — interner Identifier
  - `category` (string, optional) — z.B. „Geschenk-Anlass", „Saison-Start", „Feiertag"
  - `priority` (number 1–5, default 3) — kleinere Zahl = wichtiger, beeinflusst Topic-Reihenfolge in der Queue
  - `topicAnglesPerLocale` (array) — pro Locale 2–3 Stichworte/Angles als Generierungs-Hinweise (z.B. DE: ["Karte für Mama", "Heimatstadt-Poster", "Sternenkarte"]; EN: ["card for mum", "hometown print", "star map"])
  - `localeOccurrences` (array) — Liste von Einträgen mit:
    - `locale` (string, z.B. „de", „en") — required
    - `occurrenceType` (radio: `fixed-date` | `recurring-rule`) — required
    - Wenn `fixed-date`: `month` (1–12), `day` (1–31) — z.B. Valentinstag = 2/14
    - Wenn `recurring-rule`: `rule` (string, definiertes Vokabular wie `"2nd-sunday-of-may"`, `"4th-sunday-before-easter"`, `"last-friday-of-november"`) — KI/Code muss Datum für aktuelles und nächstes Jahr berechnen können
    - `leadTimeWeeks` (number, default 6) — wie viele Wochen vor dem Datum die Topics generiert werden sollen
    - `windowWeeks` (number, default 4) — wie lange das Publish-Window offen bleibt (Topics nur einmal pro Event/Jahr generieren, aber Window definiert Toleranz für Scheduler-Drift)
- [ ] `blogTopic`-Schema (PROJ-14) erhält neuen Status `proposed` (vor `planned`):
  - `proposed` → KI-generiert, wartet auf Operator-Approval
  - `planned` → Operator hat freigegeben, oder manuell angelegt (bestehender Default)
  - Restliche Status (`drafted`, `published`, `skipped`) bleiben unverändert
- [ ] `blogTopic` erhält optionales Feld `sourceEvent` (reference zu `marketingEvent`, weak), damit nachvollziehbar ist, aus welchem Anlass der Vorschlag kam und Duplikate vermieden werden.

### Topic-Generator-Logik (täglich im bestehenden Scheduler)
- [ ] Vor jedem Lauf prüft der Scheduler: „Wie viele `planned`-Topics gibt es in der Queue?"
  - Wenn ≥1 → bestehende Logik (PROJ-14): nimm das Top-Topic, generiere Artikel.
  - Wenn 0 → Refill-Phase startet (siehe nächste Punkte).
- [ ] In der Refill-Phase wird der Marketing-Kalender abgefragt:
  - Berechne für jedes `marketingEvent` × `localeOccurrence` das nächste Vorkommen (heute oder in der Zukunft)
  - Filter: Events, deren Publish-Window aktiv ist (heute liegt zwischen `eventDate − leadTimeWeeks` und `eventDate − leadTimeWeeks + windowWeeks`)
  - Filter: Events, für die in den letzten 12 Monaten noch kein `blogTopic` mit `sourceEvent`-Referenz existiert (egal ob proposed/planned/drafted/published) — verhindert doppelte Vorschläge im selben Jahres-Zyklus.
- [ ] Pro gefiltertem Event × Locale ruft die KI die Generierung mit den `topicAnglesPerLocale`-Hints auf:
  - KI generiert 2–3 Topic-Vorschläge (Topic-Titel + Target-Keyword), wählt selbst den besten basierend auf den Angle-Hints und bekanntem Brand-Kontext
  - Speichert genau 1 `blogTopic` pro Event × Locale mit Status `proposed`, mit `sourceEvent`-Referenz und Locale-Tag.
- [ ] Wenn keine Events im Window liegen UND `planned`-Queue leer ist → Evergreen-Fallback:
  - KI generiert 2–3 Evergreen-Topics aus PRD-Brand-Kontext (Anlässe, Geschenkideen, Heimatorte) als `proposed`, locale = Default (de).
  - Frequenz-Limit: max 3 evergreen-`proposed` pro 7 Tage, damit Operator nicht überflutet wird.

### Operator-Approval-Flow im Studio
- [ ] Im Sanity Studio gibt es eine Liste „Themen-Vorschläge" (gefilterte View `status == "proposed"` aus `blogTopic`-Schema).
- [ ] Operator kann pro Topic:
  - **Approven** → Status wechselt auf `planned`, taucht im nächsten Scheduler-Lauf auf
  - **Verwerfen** → Status wechselt auf `skipped`, wird nicht erneut vorgeschlagen
  - **Editieren** → Topic-Titel, Keyword, Notes anpassen, dann approven
- [ ] Wenn Operator nichts tut: `proposed`-Topics bleiben liegen, blockieren den Scheduler nicht (er prüft nur `planned`).

### Initial-Seed
- [ ] Ein Seed-Skript (z.B. `scripts/blog-automation/seed-events.ts`) legt beim einmaligen Ausführen ~15 marketingEvents an, je mit DE- und EN-Locale-Eintrag:
  - Valentinstag, Muttertag, Vatertag, Ostern, Erntedank, Halloween, Black Friday, Nikolaus (DE), Weihnachten, Silvester/Neujahr, Hochzeitssaison-Start (Mai), Hochzeitssaison-Peak (Juli), Schulanfang (Sept), Geburtstags-Cluster Q1, Geburtstags-Cluster Q3
  - Mit sinnvollen Topic-Angles pro Locale (3–5 Worte je)
  - Mit korrekt berechneten/festgelegten Daten pro Locale
- [ ] Seed-Skript ist idempotent (mehrfaches Ausführen erzeugt keine Duplikate, basiert auf `slug`).

### Notifications
- [ ] Wenn neue `proposed`-Topics erzeugt wurden, erhält der Operator eine E-Mail (via bestehendes Resend-Setup aus PROJ-14) mit:
  - Anzahl neuer Vorschläge
  - Übersicht (Titel + Locale + Source-Event)
  - Link zum Sanity Studio Filter-View
- [ ] Notification-Frequenz: max 1 Mail pro Tag (gebündelt), nicht pro Vorschlag.

## Edge Cases
- **Event mit leerer Locale-Liste**: Schema erzwingt min. 1 Locale-Eintrag per Validation, sonst Save im Studio nicht möglich.
- **Event-Regel kann nicht berechnet werden** (unbekannter Rule-String): Refill-Phase überspringt das Event und loggt eine Warnung; Operator sieht im nächsten Notification-Mail einen „Ignored events"-Block.
- **Lead-Time so groß, dass Window heute schon offen ist, aber Event ist >1 Jahr weg**: theoretisch unmöglich (max Lead = 12 Wochen via Validation), aber Code rechnet defensiv mit der nächstgelegenen Iteration.
- **KI hat für Event×Locale dieses Jahr schon Topics generiert** (z.B. Operator hat alle verworfen, Window noch offen): keine erneute Generierung — `sourceEvent`-Referenz fungiert als Sperre für 12 Monate.
- **Operator löscht ein `marketingEvent` mid-cycle**: bestehende `proposed`/`planned`-Topics bleiben unverändert (weak reference), Scheduler stört das nicht.
- **Mehrere Events gleichzeitig im Window**: alle bedienen, je 1 `proposed` pro Event × Locale entsteht. Queue füllt sich entsprechend; bestehende `priority`-Logik im Scheduler ordnet die Abarbeitung.
- **Operator approved 10 Topics auf einmal**: Scheduler arbeitet sie nacheinander ab (1 pro Tag), Budget-Tracking aus PROJ-14 schützt vor Kosten-Explosion.
- **Locale, das im PROJ-20-Setup noch nicht aktiv ist** (z.B. EN ist im Event eingetragen, aber Site läuft noch nur auf DE): Refill-Phase generiert das Topic trotzdem als `proposed` mit Locale-Tag — der Operator entscheidet, ob er's freigibt oder skippt. Verhindert doppelte Pflege beim späteren EN-Launch.
- **Saisonale Brand-Stimme**: KI bekommt zusätzlich zum Standard-Brand-Prompt aus PROJ-14 einen Hinweis „warm, nicht kitschig, keine Klischees wie 'Mama ist die Beste'" — verhindert Vintage-Touri-Vibes.
- **Recurring-Rule am Schaltjahres-Datum** (z.B. 29.02.): nicht relevant für gewählte Standard-Events, aber Validation muss bei manueller Eingabe `day=29 + month=2` einen Hinweis geben.
- **Notification fällt aus** (Resend down): Topics werden trotzdem erzeugt, Mail-Versand wird mit Retry+Backoff versucht; bei endgültigem Fehler nur Log, kein Abbruch.

## Technical Requirements
- **Sanity-Schema-Erweiterungen** (`src/sanity/schemas/`):
  - Neu: `marketingEvent.ts`
  - Erweitert: `blogTopic.ts` (neuer `proposed`-Status, `sourceEvent`-Referenz)
- **Scheduler-Erweiterung** (`scripts/blog-automation/`):
  - Neue Logik in `generate.ts` oder neuer Refill-Schritt vor `pickNextTopic()`
  - Neue Lib `lib/calendar.ts` mit Datums-Berechnung für `recurring-rule`-Vokabular
  - Neue Lib `lib/seasonal-prompts.ts` mit Saison-spezifischen Brand-Hinweisen
- **Seed-Skript** (`scripts/blog-automation/seed-events.ts`): einmal ausführbar via `npm run blog:seed-calendar`
- **Locale-Quelle**: aus PROJ-20-Konfiguration übernehmen (initial DE + EN), nicht hartcodiert
- **Recurring-Rule-Vokabular**: definierte Liste statt freier Cron-Strings, z.B.:
  - `nth-weekday-of-month` (z.B. „2nd-sunday-of-may")
  - `last-weekday-of-month` (z.B. „last-friday-of-november")
  - `nth-weekday-before-easter` (z.B. „4th-sunday-before-easter")
  - `fixed-month-day` (siehe oben — eigentlich `fixed-date`-Type)
- **Notification-Channel**: bestehender Resend-Setup, neue E-Mail-Template `proposed-topics-digest`
- **Performance**: Refill-Phase darf den Scheduler-Lauf nicht über die GitHub-Action-Time-Limit (10 min) hinaus verlängern → Limit z.B. max 10 Topics/Tag generieren

## Non-Goals
- **Keine Kalender-UI** (Visualisierung als Monats-/Jahres-View) — reines Daten-Modell + Studio-Listen reichen für V1. Eine UI ist V2-Material.
- **Keine A/B-Tests** für Topic-Varianten pro Event — KI wählt einen Angle, fertig.
- **Keine automatische Übersetzung** bestehender Artikel in andere Locales — V1 generiert nur neue Artikel pro Locale.
- **Keine Trend-Daten-Integration** (Google Trends, Pinterest Trends) — V1 ist purer Kalender. Trend-Erweiterung wäre eigenes Feature.
- **Kein Auto-Publish** approved Topics — Workflow bleibt: `proposed` → Operator → `planned` → Scheduler → Artikel-Draft → Operator → Publish (4-Augen-Prinzip auf Topic *und* Artikel).
- **Keine Cross-Locale-Synchronisation** (z.B. „wenn DE-Artikel published, dann EN automatisch") — Locales sind unabhängig.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Gesamtablauf (Flow-Übersicht)

```
[Marketing-Kalender in Sanity]
         |
         v
[Tägl. Scheduler: 06:00 UTC] ────► [Hat Queue planned-Topics?]
         |                              │
         |                              ├─ Ja ──► bestehende PROJ-14-Pipeline
         |                              │
         |                              └─ Nein ▼
         v
[Refill-Phase]
         |
         ├─► Berechne nächstes Datum pro Event × Locale
         │
         ├─► Filter: Events im Publish-Window (heute zwischen
         │           Datum − Lead-Time und Datum − Lead-Time + Window)
         │
         ├─► Filter: Event×Locale, das in den letzten 12 Monaten
         │           noch keinen Topic erzeugt hat
         │
         ├─► Pro überlebendes Event×Locale: Claude generiert
         │   2–3 Angle-Vorschläge, wählt selbst den besten
         │
         ├─► Speichert je 1 blogTopic mit Status "proposed",
         │   verlinkt auf sourceEvent
         │
         ├─► Wenn 0 Events im Window → Evergreen-Fallback
         │   (max 3 vorschläge / 7 Tage)
         │
         └─► Bündelt alle neuen Vorschläge in 1 E-Mail an Operator
                  │
                  v
[Operator öffnet Sanity Studio]
         |
         ├─► Sichtet "Themen-Vorschläge"-Liste
         ├─► Approved → status wird "planned" → Scheduler picks up morgen
         └─► Verwirft → status wird "skipped"
```

### B) Komponenten-Struktur

```
petite-moment Repo
│
├── src/sanity/schemas/
│   ├── marketingEvent.ts             ← NEU: Kalender-Event-Doc
│   └── blogTopic.ts                  ← ERWEITERT: neuer Status "proposed"
│                                        + neue Referenz "sourceEvent"
│
├── scripts/blog-automation/
│   ├── generate.ts                   ← ERWEITERT: ruft Refill-Phase
│   │                                    auf, wenn Queue leer
│   ├── seed-events.ts                ← NEU: legt Standard-Events an
│   └── lib/
│       ├── calendar.ts               ← NEU: berechnet nächstes Datum
│       │                                aus Regeln (z.B. "2. So. im Mai")
│       │                                + filtert Events im Window
│       ├── refill.ts                 ← NEU: Refill-Logik (Claude-Aufruf
│       │                                pro Event×Locale, Anti-Duplicate)
│       └── notify.ts                 ← ERWEITERT: neue Funktion
│                                        notifyProposedTopicsDigest()
│
└── (kein neuer GitHub-Workflow nötig — bestehender
   blog-scheduler.yml triggert die Refill-Phase automatisch
   über den erweiterten generate.ts)
```

**Im Sanity Studio sichtbar** (PM-relevante UI):
- Neuer Menü-Eintrag „Marketing-Kalender" (Liste aller `marketingEvent`-Docs)
- Neuer Filter „Themen-Vorschläge" in der bestehenden „Blog-Themen-Queue" (nur `status == proposed`)

### C) Datenmodell (in Klartext)

**Marketing-Event** (neues Sanity-Doc `marketingEvent`)

Pro Event speichern wir:
- **Name** (z.B. „Muttertag", „Black Friday", „Hochzeitssaison-Start")
- **Slug** (interner Identifier, z.B. `muttertag` — wird vom Seed-Skript für Idempotenz genutzt)
- **Kategorie** (frei wählbar: „Geschenk-Anlass", „Saison", „Feiertag")
- **Priorität** (1–5, kleinere Zahl = wichtiger; vererbt sich an die generierten Topics)
- **Topic-Angles pro Locale**: Liste aus {Locale, 2–3 Stichworte}. Beispiel Muttertag:
  - DE → „Karte für Mama", „Heimatstadt-Poster zum Muttertag", „Sternenkarte vom Geburtstag"
  - EN → „card for mum", „hometown print Mother's Day", „birthday star map"
- **Locale-Vorkommen**: Liste aus {Locale, Datums-Typ, Datums-Daten, Lead-Time, Window}
  - Datums-Typ: entweder `fixed-date` (z.B. Valentinstag = 14. Februar, identisch jedes Jahr) oder `recurring-rule` (z.B. „2. Sonntag im Mai")
  - Lead-Time: Wie viele Wochen *vor* dem Event soll der Artikel-Vorschlag entstehen? Default 6.
  - Window: Wie viele Wochen bleibt das Window aktiv? Default 4. (Schutz gegen verpasste Scheduler-Tage)

**Recurring-Rule-Vokabular** (kontrollierte Liste, nicht freier Cron):
- `nth-weekday-of-month` — z.B. „2. Sonntag im Mai" (Muttertag DE)
- `last-weekday-of-month` — z.B. „letzter Freitag im November" (Black Friday)
- `nth-weekday-before-easter` — z.B. „4. Sonntag vor Ostern" (Mothering Sunday UK)

Warum kontrolliert statt freier Cron-Strings? Weniger Fehler­quellen im Studio, klare Validation, einfacher zu erklären, abdeckt 95% aller Marketing-Events. Exotische Sonderfälle pflegt der Operator über `fixed-date` als Notfall-Override.

**Erweitertes Blog-Topic** (`blogTopic`)

Bestehende Felder bleiben. Neu hinzu:
- **Status `proposed`** (vor `planned` in der Liste): KI-Vorschläge landen hier, blockieren Scheduler nicht
- **Quelle-Event**: optionale Referenz auf das `marketingEvent`, aus dem der Topic entstanden ist. Erfüllt zwei Zwecke: (a) Operator sieht Kontext im Studio, (b) Anti-Duplicate-Check kann nachschauen.

**Wo das Budget-Log lebt** (unverändert): bestehende JSON-Datei aus PROJ-14, Refill-Aufrufe werden mitgezählt.

### D) Tech-Entscheidungen (Warum?)

| Entscheidung | Begründung |
|-------------|-----------|
| **Kalender als Sanity-Schema, nicht als Code-Konstanten** | Operator pflegt eigenständig im Studio (z.B. neuer „Singles' Day"). Konsistent mit `blogTopic`-Pattern aus PROJ-14. Kein Deploy für neue Events. |
| **Ein Event-Doc mit mehreren Locale-Einträgen, nicht Doc pro Locale** | Muttertag DE und Mother's Day UK gehören semantisch zusammen. Eine Quelle der Wahrheit, einfacher Vergleich, weniger Duplikat-Pflege. |
| **Kontrolliertes Recurring-Rule-Vokabular** statt freier Cron-Strings | Operator-freundlich („2. Sonntag im Mai" lesbar vs. `0 0 ? 5 SUN#2`), validierbar, deckt alle Marketing-relevanten Wiederholungs-Muster ab. |
| **Refill-Phase im selben Scheduler, nicht eigener Cron** | Eine Pipeline, ein Logfile, ein Budget. Komplexität bleibt klein. Trigger-Bedingung („Queue leer") ist klar genug, dass keine Scheduler-Konflikte entstehen. |
| **Status `proposed` statt direkt `planned`** | 4-Augen-Prinzip: Operator kontrolliert, ob die KI sinnvolle Themen vorschlägt, *bevor* Token-Budget für den vollen Artikel ausgegeben wird. Schutz vor schlechten Themen plus Kosten-Schutz. |
| **Anti-Duplicate-Sperre über `sourceEvent` + 12 Monate** | Verhindert, dass derselbe Anlass im selben Jahres-Zyklus mehrfach Vorschläge produziert (z.B. wenn Operator alles verworfen hat und Window noch offen ist). 12 Monate, weil Events jährlich wiederkehren. |
| **Locales aus PROJ-20-Konfig, nicht hardcoded** | Wenn PROJ-20 später FR/NL aktiviert, kommt der Kalender automatisch mit. Kein Code-Change in PROJ-33 nötig. Bis dahin pflegt Operator nur DE+EN-Einträge. |
| **Datums-Berechnung als Custom-Lib, kein neues NPM-Package** | Vokabular ist klein (3 Regel-Typen + fixed-date), Algorithmen sind bekannt (Gauss-Easter, Wochentag-Berechnung). Spart eine Dependency, hält die Refill-Phase schnell. |
| **Notification gebündelt als 1 Tages-Digest** | Operator wird nicht überflutet (z.B. wenn Hochzeitssaison + Black Friday + Weihnachten gleichzeitig im Window liegen). Eine Mail pro Tag, kompakte Übersicht, ein Klick zum Studio-Filter. |
| **Seed-Skript idempotent über Slug** | Operator kann das Skript jederzeit erneut ausführen (z.B. nach Schema-Update), ohne Duplikate zu erzeugen. Bestehende Events werden unverändert gelassen, nur fehlende kommen dazu. |

### E) Integration in bestehende Systeme

- **PROJ-13 (Sanity)**: nutzt bestehende Sanity-Infrastruktur, nur neues Schema wird registriert. Kein Migrations-Aufwand für vorhandene Inhalte.
- **PROJ-14 (Blog-Automation)**: erweitert die `generate.ts`-Pipeline um eine Refill-Phase. Bestehende Logik (Topic-Pick, Claude-Generierung, Quality-Check, Sanity-Draft, Notification) bleibt unangetastet. Refill ist additiv, kein Refactor.
- **PROJ-20 (i18n)**: nutzt die zentrale Locale-Liste. Solange PROJ-20 noch nicht alle Sprachen aktiv hat, generiert Refill trotzdem Vorschläge für inaktive Locales als „Vorrat" — Operator entscheidet, ob er sie freigibt.
- **PROJ-29 (Anlass-Landing-Pages)**: starke semantische Nähe — beide arbeiten mit Anlass-Konzepten. Kalender-Event-Slugs *können* (optional, V2) mit `OCCASION_CODES` aus PROJ-29 verlinkt werden, um Cross-Linking im Artikel zu ermöglichen. V1 hält die beiden bewusst getrennt.
- **Resend (bereits aktiv)**: neue E-Mail-Template `proposed-topics-digest`, sonst wie gehabt.
- **GitHub Action**: kein neuer Workflow, der bestehende `blog-scheduler.yml` triggert die erweiterte Pipeline automatisch.

### F) Dependencies (neue Pakete)

**Keine.** Alles wird mit Bordmitteln gebaut:
- Datums-Berechnung: kleine Custom-Lib in `lib/calendar.ts`
- Anthropic SDK, Sanity-Client, Resend: bereits aus PROJ-14 vorhanden

### G) Deployment & Rollout-Reihenfolge

1. **Schema-Erweiterung deployen** (`marketingEvent` + `blogTopic`-Status). Sanity erkennt neues Schema beim nächsten Studio-Build automatisch — keine Migration nötig, weil keine Daten umgezogen werden.
2. **Seed-Skript einmal ausführen** (`npm run blog:seed-calendar`). Legt ~15 Standard-Events an. Idempotent — kann jederzeit wiederholt werden.
3. **Code-Erweiterung in `generate.ts` deployen**. Beim nächsten 06:00-UTC-Lauf prüft die Pipeline automatisch, ob Refill nötig ist.
4. **Erste Operator-Mail** kommt am ersten Lauf, an dem die Queue leer ist UND mind. 1 Event im Publish-Window liegt.
5. **Operator-Workflow** (Sichten → Approven) etabliert sich organisch, wenn die ersten Vorschläge eintrudeln.

### H) Was später kommen könnte (V2+, nicht für V1)

- **Kalender-UI im Sanity Studio** als Monats-/Jahres-Visualisierung (Custom Sanity Plugin) — für V1 reichen die Studio-Standard-Listen.
- **Trend-Daten-Integration** (Google Trends API) als zusätzliche Topic-Quelle neben Kalender + Evergreen.
- **Cross-Locale-Synchronisation**: wenn DE-Artikel zu Muttertag published, automatisch EN-Topic mit Übersetzungs-Hinweis erzeugen.
- **A/B-Tests von Topic-Varianten**: KI generiert 2 Topics pro Event, Operator wählt nicht eins, sondern *beide* werden veröffentlicht und Conversion verglichen.
- **Verlinkung mit PROJ-29 Anlass-Landing-Pages**: Kalender-Events triggern automatisch Cross-Links in den generierten Artikeln zur passenden Anlass-Seite.
- **Multi-Channel** (V3): Kalender-Events können nicht nur Blog-Topics, sondern auch Newsletter-Slots, Social-Posts oder Ads-Kampagnen-Vorschläge erzeugen.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
