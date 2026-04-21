# PROJ-14: Blog-Publishing-Automatisierung

## Status: Planned
**Created:** 2026-04-21
**Last Updated:** 2026-04-21

## Dependencies
- Requires: PROJ-13 (Content CMS / Sanity) — schreibt in bestehende Sanity-Schemas (`blogPost`)

## Problem & Ziel
petite-moment will SEO-Traffic über regelmäßige Blog-Artikel aufbauen. Manuelles Schreiben + Einpflegen in Sanity skaliert nicht. PROJ-14 automatisiert den Content-Prozess: Themen rein, fertige Artikel raus, direkt publiziert.

## User Stories
- Als Betreiber will ich ein Thema angeben und damit einen fertigen SEO-Artikel erhalten, damit ich keine Stunden mit Recherche und Schreiben verbringen muss.
- Als Betreiber will ich Artikel in einer Warteschlange planen (z. B. "zwei pro Woche"), damit der Blog kontinuierlich wächst ohne manuelles Zutun.
- Als Betreiber will ich jeden generierten Artikel vor Publikation prüfen und editieren können, damit Qualität und Marken­stimme stimmen.
- Als Betreiber will ich, dass Artikel automatisch mit passenden internen Links (`/map`, `/star-map`, verwandte Blog-Posts) versehen werden, damit die SEO-interne Verlinkung stark bleibt.
- Als Betreiber will ich SEO-Metadaten (Slug, Meta-Description, Tags) automatisch vorgeschlagen bekommen, damit jeder Artikel Google-ready ist.

## Acceptance Criteria
- [ ] CLI-Command `npm run blog:generate -- --topic "..."` erzeugt einen vollständigen Artikel-Entwurf (Titel, Slug, Excerpt, Tags, Body als Portable Text) und legt ihn als **Draft** in Sanity an.
- [ ] CLI-Command `npm run blog:publish -- --id <docId>` veröffentlicht einen bestehenden Draft (oder Flag `--auto` bei `generate` publisht direkt).
- [ ] Artikelinhalt wird mit der Claude-API (Model: Opus 4.7 oder vergleichbar) generiert.
- [ ] Generierte Artikel haben mindestens: 600–1000 Wörter, 3–5 H2-Überschriften, min. 2 interne Links auf relevante Unterseiten, 3–5 Tags, eine 140–160-Zeichen-Meta-Description.
- [ ] Marken­stimme wird durch einen zentralen System-Prompt sichergestellt (warm, nicht kitschig, Du-Ansprache, keine Vintage-Touri-Vibes — analog zu About-Seite).
- [ ] Themen-Warteschlange (YAML/JSON oder Sanity-Collection) mit Status `planned / drafted / published` ist abfragbar.
- [ ] Scheduled Run (GitHub Action oder Vercel Cron): 1× täglich prüft Queue, erzeugt nächsten Entwurf, Betreiber bekommt E-Mail-Notification zur Review.
- [ ] Doppelten Content vermeiden: vor Generierung wird geprüft, dass kein Artikel mit identischem oder sehr ähnlichem Titel existiert.
- [ ] Sicher vs. Draft: jeder Artikel ist standardmäßig **Draft** und muss menschlich freigegeben werden, bevor er live geht (Opt-in für Auto-Publish).

## Edge Cases
- Claude-API liefert Content, der gegen Markenregeln verstößt oder zu kurz ist → Skript wiederholt mit schärferen Constraints max. 2×, dann Abbruch mit Fehler.
- Sanity-API ist nicht erreichbar → Retry mit exponential backoff; bei endgültigem Fehler Artikel als `.md`-Datei lokal speichern.
- Themen-Warteschlange ist leer → Script beendet sich still, kein Fehler.
- Bild für Cover fehlt → Artikel wird trotzdem publiziert (Blog-Template arbeitet ohne Titelbild).
- Claude-API-Kosten laufen aus dem Ruder → Monats-Budget im Script konfigurierbar, Script bricht ab bei Überschreitung.
- Tokengrenze des Modells überschritten → Artikel in Blöcken generieren oder Modell-Variante mit größerem Kontext wählen.

## Non-Goals
- Keine automatische Bildgenerierung (kein DALL·E/Stable Diffusion) in V1 — Cover-Bilder pflegt der Betreiber manuell oder per Stockfoto-API später.
- Keine vollautomatische Publikation ohne manuelle Freigabe in V1.
- Kein Multi-Language — deutsche Artikel only, i18n später.
- Keine KI-gestützte Content-Optimierung bestehender Artikel — V1 ist Erstellungs-Fokus.

## Technische Anforderungen
- **Claude-API:** Anthropic SDK (`@anthropic-ai/sdk`), Model `claude-opus-4-7` oder `claude-sonnet-4-6` (Sonnet günstiger, ausreichend für Blog-Content).
- **Sanity-Client:** `@sanity/client` mit Write-Token (im env als `SANITY_API_WRITE_TOKEN`).
- **Monats-Budget-Tracking:** einfache Kostenberechnung anhand von Token-Counts in SQLite/JSON.
- **Scheduler:** GitHub Action (einfacher) oder Vercel Cron (falls UI-Trigger später gewünscht).
- **Wo der Code lebt:** In diesem Repo unter `/scripts/blog-automation/` ODER als separates Sub-Repo `petite-moment-blog-tools`. Entscheidung beim Architecture-Schritt.
- **ENV-Variablen neu:**
  - `ANTHROPIC_API_KEY`
  - `SANITY_API_WRITE_TOKEN`
  - `BLOG_AUTOMATION_MONTHLY_BUDGET_USD`

## Kosten-Schätzung
- Claude Opus 4.7 für einen ~800-Wörter-Artikel: ~4.000–6.000 Input-Token + ~1.500 Output-Token ≈ 0,15–0,25 USD pro Artikel.
- Claude Sonnet 4.6 für denselben Artikel: ~0,03–0,05 USD pro Artikel.
- Bei 2 Artikeln/Woche mit Opus: ~1–2 USD/Monat. Vernachlässigbar.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Gesamtablauf (Flow-Übersicht)

```
[Themen-Queue in Sanity]
          |
          v
[Scheduler (GitHub Action, 1×/Tag)]
          |
          v
[Themen-Picker: "welches Thema ist als nächstes dran?"]
          |
          v
[Claude-API: schreibt Artikel mit Markenstimme]
          |
          v
[Qualitätsprüfung: Wortzahl, Struktur, interne Links, Duplikat-Check]
          |
          +----------- [Qualität zu schlecht] -----> [Retry max. 2x → sonst Fehler-Log]
          |
          v
[Sanity: Artikel als DRAFT speichern]
          |
          v
[Resend: Betreiber-E-Mail "Neuer Draft fertig, bitte prüfen"]
          |
          v
[Betreiber öffnet Sanity Studio → Review → Publish-Button]
```

### B) Komponenten-Struktur

```
petite-moment (dieses Repo)
│
├── scripts/blog-automation/       ← das neue Tool
│   ├── Themen-Picker              (liest Queue, wählt nächstes Thema)
│   ├── Artikel-Generator          (ruft Claude-API, baut Artikel)
│   ├── Qualitätsprüfer            (Wortzahl, Links, Duplikate)
│   ├── Sanity-Publisher           (speichert Draft in Sanity)
│   ├── Budget-Tracker             (monatliche Claude-Kosten im Auge behalten)
│   └── Notification-Sender        (E-Mail an Betreiber via Resend)
│
├── .github/workflows/
│   └── blog-scheduler.yml         (täglicher Scheduler-Job)
│
└── src/sanity/schemas/
    └── blogTopic.ts               (NEUES Sanity-Schema für die Themen-Queue)
```

Beim CLI-Aufruf manuell (z. B. `npm run blog:generate -- --topic "Hochzeitstag 5 Jahre"`) wird derselbe Pipeline-Ablauf genutzt, nur ohne Scheduler-Schritt.

### C) Datenmodell (in Klartext)

**Themen-Queue (neues Sanity-Schema `blogTopic`)**

Pro Thema speichern wir:
- Thema/Titel-Idee (kurzer Text, z. B. "5 Jahre Hochzeitstag: Geschenkideen")
- Ziel-Keyword (SEO, z. B. "hochzeitstag 5 jahre geschenk")
- Kategorie (z. B. Hochzeit, Geburt, Jubiläum)
- Status: `geplant` / `entworfen` / `veröffentlicht` / `übersprungen`
- Priorität (Zahl 1–5, zum Sortieren)
- Datum erstellt
- Verknüpfter Blog-Artikel (wenn generiert)

**Warum Sanity statt JSON-Datei?** Du kannst Themen bequem im Studio hinzufügen, ohne Git-Commit. Dein "Content-Manager"-Zukunfts-Ich will das einfach.

**Budget-Log (lokale JSON-Datei oder Sanity)**

Pro Generierung:
- Zeitstempel
- Thema
- Claude-Model (Opus oder Sonnet)
- Input/Output-Token
- Kosten in USD

Vorschlag: **lokale JSON-Datei** im Scripts-Ordner, vom GitHub Action als Artifact aufbewahrt. Minimaler Overhead.

**Blog-Artikel (Output)**

Unverändert — nutzt das bestehende `blogPost`-Schema aus PROJ-13.

### D) Tech-Entscheidungen (Warum?)

| Entscheidung | Begründung |
|-------------|-----------|
| **Code lebt in diesem Repo** unter `/scripts/blog-automation/` | Kein Overhead für separates Repo. Sanity-Credentials und Content-Setup sind hier. Bei Bedarf später trennbar. |
| **Claude Opus 4.7 als primäres Modell**, Sonnet als Fallback | Opus liefert deutlich bessere Markenstimme und SEO-Struktur. Kosten sind bei 2 Artikeln/Woche vernachlässigbar (~2 USD/Monat). |
| **GitHub Action als Scheduler** | Kostenlos, versionskontrolliert, läuft ohne Extra-Infrastruktur. Vercel Cron wäre Alternative, braucht aber Pro-Plan. |
| **CLI-first, Admin-UI später** | Du bist tech-affin genug, Terminal-Command ist der direkteste Weg. Admin-UI kann in einer Folge-Story kommen wenn nicht-technische Mitarbeiter dazustoßen. |
| **Drafts-per-Default, kein Auto-Publish** | Markenschutz: jeder Artikel wird menschlich gegengelesen bevor er live geht. Auto-Publish erst wenn du der Qualität traust (Config-Flag). |
| **Resend für Notifications** | Bereits eingebunden, Absender ist verifizierte Domain. |
| **Themen-Queue in Sanity** | Einfache Pflege im Studio, keine Code-Commits für neue Themen. |

### E) Integration in bestehende Systeme

- **Sanity (PROJ-13)**: liest + schreibt Dokumente. Braucht einen Write-Token (neu in Environment).
- **Claude-API (neu)**: benötigt `ANTHROPIC_API_KEY` (auch neu). Kosten laufen über Anthropic-Konto.
- **Resend (bereits aktiv)**: verschickt Review-Benachrichtigungen.
- **GitHub Actions**: neue Workflow-Datei, läuft in der GitHub-Infrastruktur. Secrets (API-Keys) liegen in den GitHub-Repo-Secrets.

### F) Dependencies (neue Pakete)

- `@anthropic-ai/sdk` — offizielles Claude-SDK für Node.js
- `yaml` oder `zod` — nur falls wir Topic-Files parsen (sonst nicht nötig, da Sanity alles abdeckt)

Alles andere (`@sanity/client`, `resend`) ist bereits installiert.

### G) Deployment & Scheduler

- **Manuelle CLI-Runs**: lokal oder via GitHub Action mit `workflow_dispatch` (Button in GitHub-UI).
- **Automatischer Lauf**: täglich um z. B. 06:00 UTC, pickt ein Thema aus der Queue, generiert, speichert als Draft, schickt Mail. Frequenz konfigurierbar.
- **Monats-Limit**: vor jedem Lauf prüft das Script das Budget-Log. Wenn Limit erreicht → Run wird übersprungen + Notification an Betreiber.

### H) Ausblick (V2+, nicht für V1)

- Admin-UI in `/private/admin/blog/` mit Drag-and-Drop-Queue und Generate-Button
- Stock-Bild-Integration (Unsplash/Pexels API) für automatische Cover-Bilder
- Mehrsprachigkeit (EN/FR) wenn i18n landet
- A/B-Testing von Titeln
- Auto-Interlinking basierend auf semantischer Ähnlichkeit zu bestehenden Artikeln

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
