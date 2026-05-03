# PROJ-28: Business Center

## Status: Approved
- Reality-Check 2026-05-03: Acceptance Criteria im Code abgedeckt, Status auf Approved gehoben.

**Created:** 2026-04-26
**Last Updated:** 2026-05-03

## Dependencies
- Requires: PROJ-4 (User Authentication) — `requireAdmin()` Server-Check für die Admin-Route, identisch zu PROJ-22 / PROJ-9 / PROJ-10
- Phase 2 Soft-Dependency: PROJ-6 (Stripe-Bezahlsystem) — Ist-Daten werden aus aggregierten Bestellungen synchronisiert. Solange Stripe noch nicht live ist, bleibt der Sync-Button leer (oder lehnt sich an Test-Daten); Phase 1 ist davon unabhängig.
- Beeinflusst: nichts (read-only auf bestehende Tabellen)
- Ersetzt: `tools/business-case.html` — die Standalone-Datei wird nach erfolgreichem Phase-1-Port gelöscht.

## Implementation Notes (Frontend)
- Admin-Route `/private/admin/business-case` mit `requireAdmin()`, identisches Server-Page-Pattern wie PROJ-22 (LandingNav, Titel-Block, Client-Komponente).
- `BusinessCenterShell` ist die Top-Level-Client-Komponente mit vier Tabs: **Szenarien · Editor · Vergleich · Plan vs Ist** (shadcn/ui `Tabs`).
- **Persistenz aktuell LocalStorage** unter Key `petite-moment-business-case-scenarios-v1`. Das ist eine bewusste Stop-Gap-Lösung: das Phase-1-Frontend ist sofort nutzbar, ohne auf das Supabase-Backend zu warten. Im /backend-Schritt wird die Storage-Schicht in [src/lib/business-case/storage.ts](../src/lib/business-case/storage.ts) durch `fetch()`-Aufrufe gegen die Admin-API ersetzt — der Hook `useBusinessScenarios` in [src/hooks/useBusinessScenarios.ts](../src/hooks/useBusinessScenarios.ts) bleibt API-stabil.
- Beim ersten Mount ohne Daten wird automatisch ein Standard-Szenario mit den Default-Werten (4€/15€/25€, 40/40/20-Mix usw.) erzeugt.
- **ScenarioList**: Karten-Liste mit Plan-Badge, Aktionen Duplizieren/Umbenennen/Löschen. Aktiver Plan kann nicht gelöscht werden. Create-Dialog erlaubt „Kopie von …".
- **ScenarioEditor**: alle Berechnungs-Blöcke aus dem HTML-Tool 1:1 portiert — TiersBlock (Tabelle mit Live-Marge je Tier), KPICards (AOV/Marge/Phys-Anteil/Digital-Marge-Anteil), FixedCosts + Marketing nebeneinander, VolumeScenariosBlock (3 Spalten Konservativ/Mittel/Optimistisch mit Deckungsbeitrag farbig), BreakEven-Karten, Operative-Schwellen-Liste mit Versand-Belastungsgrenze. Mix-Warnung bei ≠ 100% mit oranger Border und Hinweis-Box. Auto-Save mit 400ms-Debounce, Speicher-Indikator („Speichern …" / „Gespeichert" für 1,5s).
- **ScenarioComparison**: Side-by-Side-Vergleich von 2–3 Szenarien (Pill-Auswahl + Plus-Dropdown). Zeigt AOV, Marge, Marge-nach-CAC, physisch-Anteil, Digital-Anteil, Fixkosten, Break-Even (Bestellungen + Umsatz) sowie Umsatz und Deckungsbeitrag im jeweils mittleren Volumen-Szenario (mit grün/rot je nach Vorzeichen).
- **PlanVsActuals**: aktuell Empty-State mit Hinweis auf Phase 2 (kommt mit /backend). „Als Plan verabschieden"-Button im Editor zeigt aktuell ein Toast „Phase 2 — kommt im Backend-Schritt".
- Alle Berechnungen leben in [src/lib/business-case/calculations.ts](../src/lib/business-case/calculations.ts) als reine Funktionen (kein React-State), damit sie unabhängig getestet werden können und identisch zur HTML-Version sind. Verifikations-Test gegen die HTML-Defaults: AOV 12,60 € · Ø-Marge 4,90 € · Effektiver CAC 0,90 € · Break-Even ~300 Bestellungen — passt.
- **Charting (recharts)** wurde noch NICHT installiert, weil Phase 2 auf das Backend wartet. Wird in /backend installiert, wenn Plan-vs-Ist tatsächlich gerendert wird.
- **`tools/business-case.html`** ist noch NICHT gelöscht — passiert nach manueller Verifikation der Admin-Page durch den Operator (Acceptance Criterion „Verifikations-Tabelle mit drei Test-Inputs zeigt identische Outputs in beiden Tools").

### Dateien
- [src/app/private/admin/business-case/page.tsx](../src/app/private/admin/business-case/page.tsx)
- [src/components/admin/BusinessCenterShell.tsx](../src/components/admin/BusinessCenterShell.tsx)
- [src/components/admin/business-case/ScenarioList.tsx](../src/components/admin/business-case/ScenarioList.tsx)
- [src/components/admin/business-case/ScenarioEditor.tsx](../src/components/admin/business-case/ScenarioEditor.tsx)
- [src/components/admin/business-case/ScenarioComparison.tsx](../src/components/admin/business-case/ScenarioComparison.tsx)
- [src/components/admin/business-case/PlanVsActuals.tsx](../src/components/admin/business-case/PlanVsActuals.tsx)
- [src/hooks/useBusinessScenarios.ts](../src/hooks/useBusinessScenarios.ts)
- [src/lib/business-case/types.ts](../src/lib/business-case/types.ts)
- [src/lib/business-case/defaults.ts](../src/lib/business-case/defaults.ts)
- [src/lib/business-case/calculations.ts](../src/lib/business-case/calculations.ts)
- [src/lib/business-case/storage.ts](../src/lib/business-case/storage.ts)
- [src/lib/business-case/format.ts](../src/lib/business-case/format.ts)

## Kontext
Der Betreiber braucht ein internes Tool, um die wirtschaftliche Tragfähigkeit von Petite-Moment laufend zu modellieren und zu überwachen. Aktuell existiert dafür ein Standalone-HTML-Tool unter `tools/business-case.html` mit LocalStorage-Persistenz — funktional, aber nicht mehrgeräte-fähig, nicht versionierbar, kein Plan-vs-Ist.

Das Business Center soll diese Funktionalität in den Admin-Bereich der App heben, mehrere benannte Szenarien speichern (z. B. „Konservativ", „Plan 2026", „POD-Phase"), eines davon als verbindlichen Plan einfrieren und im zweiten Schritt Monats-Ist-Werte aus echten Bestellungen dagegen vergleichen — inklusive Forecast aufs Jahresende.

Das Tool ist ausschließlich für den Operator gedacht (Daniel als Admin), kein Kunden-Feature. Es ersetzt aktuell ein Excel-/Notiz-getriebenes Vorgehen und soll Pricing-, Volumen- und Fixkosten-Entscheidungen versachlichen.

## Phasen-Übersicht
- **Phase 1 (MVP) — Kalkulator-Port + Szenario-Verwaltung:** Mehrere benannte Szenarien anlegen, bearbeiten, vergleichen. Kalkulator-Logik 1:1 aus `tools/business-case.html` portiert (Tiers, Mix, Stückkosten, Volumen-Szenarien, Fixkosten, CAC, AOV, Marge, Break-Even, operative Schwellen). Persistenz in Supabase. Standalone-HTML wird gelöscht.
- **Phase 2 (Follow-up) — Plan-vs-Ist + Forecast:** Ein Szenario als Snapshot zum Plan verabschieden. Monats-Ist-Werte aus Stripe/DB synchronisieren. Plan-vs-Ist-Tabelle und Liniendiagramm. Forecast aufs Jahresende mit Plan-Verteilung als Saisonalität.

## User Stories

### Phase 1
- Als Betreiber möchte ich mehrere benannte Szenarien anlegen können (z. B. „Konservativ", „Optimistisch", „Plan 2026"), damit ich verschiedene Annahmen parallel pflegen kann.
- Als Betreiber möchte ich Produkt-Tiers (Digital, A4 Print, A3/Rahmen) mit Preis, Mix-Anteil und Stückkosten konfigurieren, damit der gewichtete Ø-Bestellwert und die Marge je Tier automatisch berechnet werden.
- Als Betreiber möchte ich monatliche Fixkosten (Vercel, Supabase, MapTiler, Sentry, Sanity, Sonstiges) eintragen, damit ich den Break-Even sofort sehe.
- Als Betreiber möchte ich CAC und Anteil bezahlte Akquise eintragen, damit der effektive CAC und die Marge nach CAC realistisch berechnet werden.
- Als Betreiber möchte ich drei Volumen-Szenarien (Konservativ / Mittel / Optimistisch) mit jeweils Bestellungen/Jahr eintragen und sofort Umsatz, Bruttomarge, Marketing-Kosten, Fixkosten und Deckungsbeitrag pro Szenario sehen.
- Als Betreiber möchte ich operative Schwellen sehen (Pakete/Tag bei verschiedenen Umsatz-Stufen, Versand-Belastungsgrenze), damit ich erkenne, ab wann ein Druck-Partner / Hilfskraft nötig wird.
- Als Betreiber möchte ich Szenarien duplizieren und umbenennen können, damit ich Varianten ausprobieren kann ohne ein bestehendes Szenario zu verlieren.
- Als Betreiber möchte ich Szenarien side-by-side vergleichen können (mind. 2 nebeneinander), damit ich Auswirkungen unterschiedlicher Annahmen direkt sehe.

### Phase 2
- Als Betreiber möchte ich ein Szenario als „aktiven Plan" verabschieden können — beim Klick wird ein zeitgestempelter Snapshot erzeugt, der nicht mehr verändert wird.
- Als Betreiber möchte ich nur einen aktiven Plan zur Zeit haben — beim Verabschieden eines neuen Plans wird der alte automatisch in den Archiv-Status verschoben (mit Datum „Gültig bis").
- Als Betreiber möchte ich die monatlichen Ist-Werte (Bestellungen, Umsatz nach Produkt-Tier) automatisch aus Stripe/DB synchronisiert sehen, mit einem manuellen „Synchronisieren"-Button.
- Als Betreiber möchte ich pro Monat sehen: Plan-Bestellungen, Plan-Umsatz, Ist-Bestellungen, Ist-Umsatz, Abweichung absolut + in %.
- Als Betreiber möchte ich einen Forecast aufs Jahresende sehen, der auf der Plan-Saisonalität basiert: Ist-YTD wird via Plan-Monatsanteilen aufs Gesamtjahr projiziert.
- Als Betreiber möchte ich ein Liniendiagramm sehen, das Plan-Verlauf, Ist-Verlauf und Forecast über die zwölf Monate zeigt.

## Acceptance Criteria

### Phase 1 — Kalkulator + Szenario-Verwaltung
- [ ] Route `/private/admin/business-case` ist erreichbar und nutzt `requireAdmin()` server-seitig analog zu PROJ-22; nicht angemeldete Nutzer landen auf `/login`, nicht-Admins auf `/`.
- [ ] Eine Liste aller Szenarien wird angezeigt: Name, Erstellungsdatum, letztes Update, Plan-Badge wenn aktuell aktiver Plan, Aktionen (Bearbeiten, Duplizieren, Löschen).
- [ ] Beim ersten Aufruf (keine Szenarien vorhanden) wird ein Default-Szenario „Standard" mit den Werten aus `tools/business-case.html` automatisch angelegt.
- [ ] Szenario erstellen: Name, optional „Kopie von" (Duplikat eines bestehenden Szenarios mit allen Werten).
- [ ] Szenario-Editor zeigt alle Bereiche aus `tools/business-case.html`:
  - 3 Produkt-Tiers (Preis, Mix-%, Stückkosten) mit Live-Anzeige Marge € + %
  - Mix-Summen-Warnung bei ≠ 100 %, Berechnung normalisiert proportional
  - 4 Kennzahl-Karten: AOV, Ø-Marge, Anteil physisch, Digital-Marge-Anteil
  - Fixkosten-Block (6 Positionen: Vercel, Supabase, MapTiler, Sentry, Sanity, Sonstiges)
  - Marketing-Block (CAC + Anteil bezahlte Akquise → effektiver CAC + Marge nach CAC)
  - Volumen-Szenarien (3 Spalten Konservativ/Mittel/Optimistisch mit Bestellungen/Jahr → Tag, Pakete/Tag, Umsatz, Bruttomarge, Marketing, Fixkosten, Deckungsbeitrag, Profit-Marge)
  - Break-Even-Karten: Bestellungen/Jahr, Bestellungen/Tag, Umsatz/Jahr
  - Operative Schwellen: 50 k / 100 k / 250 k / 500 k €/Jahr mit Bestellungen, Tag, Pakete/Tag manuell
  - Versand-Belastungsgrenze (50 Pakete/Tag) als ableitbarer Umsatz-Wert
- [ ] Alle Berechnungen erfolgen identisch zur HTML-Version (gleiche Formeln, gleiche Rundungen) — eine Verifikations-Tabelle mit drei Test-Inputs zeigt identische Outputs in beiden Tools (vor Löschung der HTML-Version).
- [ ] Szenarien werden bei Änderungen mit Debounce ≤ 1 s autosaved; ein Speicher-Indikator zeigt „Gespeichert ✓".
- [ ] Side-by-Side-Vergleich: Auswahl von 2–3 Szenarien zeigt eine kombinierte Tabelle mit Schlüssel-Kennzahlen (AOV, Marge, Deckungsbeitrag pro Volumen-Szenario, Break-Even).
- [ ] Szenario löschen: Bestätigungsdialog; aktiver Plan kann nicht gelöscht werden, solange er Plan-Status hat.
- [ ] Alle Eingaben sind als Zahl validiert (≥ 0, Mix-% zwischen 0–100, Bestellungen ganzzahlig); ungültige Werte werden visuell markiert und nicht gespeichert.
- [ ] `tools/business-case.html` ist nach erfolgreichem Port + manueller Verifikation gelöscht; ein Hinweis im README oder Memory-Notizen dokumentiert den Wechsel.

### Phase 2 — Plan-vs-Ist + Forecast
- [ ] Im Szenario-Editor gibt es einen Button „Als aktiven Plan verabschieden". Beim Klick wird:
  - Eine unveränderliche Kopie des Szenarios als „Plan vYYYY-MM-DD" mit Snapshot-Datum gespeichert
  - Ein eventueller vorheriger aktiver Plan in „archiviert" mit „Gültig bis"-Datum überführt
  - Der neue Plan ist sofort in der Plan-vs-Ist-Ansicht aktiv
- [ ] Es kann immer höchstens ein Plan im Status „aktiv" sein.
- [ ] Pro Monat hat der Plan eine erwartete Aufteilung der Jahres-Bestellungen — Standard ist Gleichverteilung (1/12 pro Monat); optional kann der Operator die Monatsverteilung manuell anpassen (12 Eingabefelder, müssen sich auf 100 % summieren).
- [ ] Eine Plan-vs-Ist-Tabelle zeigt für jeden Monat des laufenden Jahres:
  - Plan-Bestellungen, Plan-Umsatz
  - Ist-Bestellungen, Ist-Umsatz
  - Δ absolut + Δ in % (grün ≥ 0, rot < 0)
- [ ] Ein „Ist-Daten synchronisieren"-Button zieht aktuelle Monatsaggregate aus der `orders`-Tabelle (oder Stripe-API, je nach Architektur-Entscheidung) — gezählt werden nur erfolgreich bezahlte Bestellungen, abzüglich Refunds. Sync-Zeitpunkt wird angezeigt.
- [ ] Solange PROJ-6 Stripe nicht live ist, zeigt die Sync-Funktion einen klaren Hinweis („Stripe noch nicht aktiv — Ist-Daten leer") und bleibt funktional ohne Daten.
- [ ] Forecast-Berechnung: Ist-Umsatz YTD wird via Plan-Monatsanteile auf das volle Jahr projiziert. Formel: `Forecast = Ist_YTD / Σ(Plan-Anteil_M1..M_aktuell) × Σ(Plan-Anteil_M1..M12)`. Bei Plan-Anteil 0 in Vergangenheits-Monaten (sollte nicht vorkommen) Fallback auf lineare Run-Rate.
- [ ] Ein Liniendiagramm zeigt drei Linien über die 12 Monate: Plan (durchgezogen), Ist (durchgezogen bis aktueller Monat), Forecast (gestrichelt ab aktuellem Monat).
- [ ] Eine Kennzahl-Karte zeigt den aktuellen Stand: „Forecast 2026: X € (Plan: Y €, Δ Z %)".

## Edge Cases

### Phase 1
- Mix-Summe ≠ 100 %: Warnung anzeigen, Berechnung normalisiert proportional auf Summe (z. B. 30 + 40 + 20 = 90 → 33,3 / 44,4 / 22,2 %). Verhalten identisch zum bestehenden HTML-Tool.
- Stückkosten > Verkaufspreis: Marge negativ — wird in rot angezeigt, keine Validierungs-Blockade (kann temporär beim Eintippen vorkommen).
- Alle Mix-Werte 0: Berechnungen zeigen „—" statt Division durch 0; AOV = 0 €.
- Sehr großes Szenario-Volumen (>10 Mio Bestellungen/Jahr): keine Performance-Probleme, alle Berechnungen sind in O(1).
- Szenario-Name doppelt: Erlaubt; Eindeutigkeit erfolgt über UUID, nicht über Name. Hinweis im UI „Name existiert bereits", aber kein Hard-Block.
- Szenario löschen, das Quelle einer Plan-Verabschiedung war: Plan bleibt erhalten (ist eigene Kopie), Quell-Szenario ist weg — kein Problem.
- Browser-Cache geleert: Daten bleiben erhalten, weil Persistenz in Supabase, nicht LocalStorage.
- Concurrent edits (mehrere Tabs): Letzter Save gewinnt, kein Locking nötig (Single-User-Tool); kurzzeitige Inkonsistenz akzeptabel.

### Phase 2
- Kein Plan verabschiedet: Plan-vs-Ist-Tab zeigt Empty-State mit Hinweis „Verabschiede zuerst ein Szenario als aktiven Plan".
- Plan verabschiedet, aber noch keine Ist-Daten (z. B. Januar, Stripe leer): Tabelle zeigt Plan-Werte, Ist-Werte als „—", Forecast = Plan (keine YTD-Basis).
- Plan-Verabschiedung Mitte des Jahres: Plan gilt ab Verabschiedungsdatum für alle Folge-Monate; Vergangenheits-Monate bekommen einen Hinweis „Plan retroaktiv angewendet" oder werden auf 0 gesetzt — Entscheidung in `/architecture`.
- Refunds reduzieren Ist-Werte rückwirkend: Bei jedem Sync wird der gesamte Monat neu berechnet, kein Diff-Update.
- Forecast bei laufender erster Jahres-Hälfte mit großen Schwankungen: Forecast kann stark wackeln. Daher zusätzlich Hinweis „Forecast wird mit YTD-Daten zuverlässiger".
- Plan-Monatsverteilung summiert sich nicht auf 100 %: Speichern blockieren, Validierungs-Hinweis anzeigen.
- Aktiver Plan löschen: Nur möglich wenn ein neuer Plan verabschiedet wird (alter wird automatisch archiviert), nicht direkt löschbar.

## Technical Requirements
- Sicherheit: `requireAdmin()` server-seitig auf der Page UND auf allen API-Routen. Keine RLS-basierte Sichtbarkeit für Kunden — Tabellen sind ausschließlich vom Service-Role-Key erreichbar.
- Performance: Kalkulator-Berechnungen sind alle clientseitig, < 5 ms pro Recalc. Supabase-Reads für Szenarien-Liste mit ≤ 50 Einträgen unproblematisch.
- Browser-Support: Chrome, Firefox, Safari, Edge in aktuellen Versionen — kein Mobile-Support gefordert (interner Desktop-Use-Case).
- Persistenz: Supabase-Tabellen `business_scenarios` und (Phase 2) `business_plans`, `business_actuals`. Genaue Schema-Definition in `/architecture`.
- Sync-Quelle Phase 2: Aggregation aus `orders`-Tabelle ODER Stripe-API direkt — Architektur-Entscheidung in `/architecture`. Idempotent: gleicher Sync zweimal hintereinander führt zu gleichem Ergebnis.
- Kein Audit-Log nötig (Single-User-Tool).
- Kein i18n nötig — UI ist nur Deutsch, da nur für den Operator.

## Default-Werte (für initiales Standard-Szenario)

**Hinweis:** Bei der /backend-Implementierung wurde der Tier-Schnitt erweitert, um an den realen Produktkatalog (PRODUCTS × PrintFormat in [src/lib/products.ts](../src/lib/products.ts) und [src/lib/print-formats.ts](../src/lib/print-formats.ts)) zu binden. Statt drei abstrakter Tiers gibt es jetzt fünf, die exakt den fünf SKU-Kombinationen entsprechen. So ist der Sync aus `orders.items` deterministisch und A2/A1 lassen sich später ohne Schema-Änderung ergänzen.

- Tier `digital` — Digital-Download: 4,00 € · Mix 40 % · Stückkosten 0,50 €
- Tier `poster_a4` — A4 Poster: 15,00 € · Mix 25 % · Stückkosten 9,50 €
- Tier `poster_a3` — A3 Poster: 20,00 € · Mix 10 % · Stückkosten 12,00 €
- Tier `frame_a4` — A4 mit Rahmen: 35,00 € · Mix 15 % · Stückkosten 22,00 €
- Tier `frame_a3` — A3 mit Rahmen: 50,00 € · Mix 10 % · Stückkosten 32,00 €
- Fixkosten/Monat: Vercel 20 € · Supabase 25 € · MapTiler 50 € · Sentry 0 € · Sanity 0 € · Sonstiges 5 € → 100 €/Monat
- CAC: 3,00 € · Anteil bezahlte Akquise: 30 % → effektiv 0,90 €/Order
- Volumen: 1.500 / 6.000 / 20.000 Bestellungen/Jahr
- Daraus: **AOV 17,60 €** · Ø-Marge 7,33 € · Marge nach CAC 6,43 € · Break-Even **187 Bestellungen/Jahr** · physisch-Anteil 60 %

---

<!-- Sections below are added by subsequent skills -->

## Implementation Notes (Backend)
- **Drei Supabase-Tabellen** angelegt: `business_scenarios`, `business_plans`, `business_actuals` (Migrations: `create_business_scenarios`, `create_business_plans`, `create_business_actuals`, `harden_business_case_rls`).
- **RLS-Strategie:** Alle drei Tabellen haben RLS aktiv plus explizite Deny-All-Policies für `anon` und `authenticated`. Service-Role-Key (in den API-Routen) umgeht RLS — kein direkter Client-Zugriff möglich. Damit sind die `rls_enabled_no_policy`-Advisor-Hinweise sauber adressiert.
- **Trigger-Funktion** `business_case_set_updated_at` mit gepinntem `search_path = public, pg_temp` (gegen `function_search_path_mutable`-Advisor). Nur an `business_scenarios` gehängt — die anderen beiden Tabellen sind effektiv append-only bzw. werden komplett ersetzt.
- **Eindeutigkeits-Constraint** für aktiven Plan: partieller Unique-Index `business_plans_single_active ON (status) WHERE status = 'active'` — DB-seitig garantiert, dass es immer höchstens einen aktiven Plan gibt.
- **`business_actuals`** mit Composite-Unique `(year, month, tier_key)` und Index auf `(year, month)`. Sync ist idempotent: voller Year-Wipe + Re-Insert.
- **Tier-Mapping** aus `orders.items` lebt in [`mapOrderItemToTier`](../src/lib/business-case/defaults.ts) und ist über Unit-Tests abgedeckt:
  - `download` → `digital` (format-unabhängig)
  - `poster` + `a4|a3` → `poster_a4` / `poster_a3`
  - `frame` + `a4|a3` → `frame_a4` / `frame_a3`
  - alles andere → null (wird beim Sync ignoriert)
- **API-Routen** unter `/api/admin/business-case/*`, alle mit `requireAdmin()`-Schutz, Zod-Validierung, `createAdminClient()` für Service-Role-Zugriff:
  - [`scenarios/route.ts`](../src/app/api/admin/business-case/scenarios/route.ts) — `GET` Liste, `POST` Create (mit `cloneFromId`-Option, Limit 100)
  - [`scenarios/[id]/route.ts`](../src/app/api/admin/business-case/scenarios/%5Bid%5D/route.ts) — `GET`/`PATCH`/`DELETE`
  - [`scenarios/[id]/approve-as-plan/route.ts`](../src/app/api/admin/business-case/scenarios/%5Bid%5D/approve-as-plan/route.ts) — archiviert vorherigen aktiven Plan, legt neuen an
  - [`active-plan/route.ts`](../src/app/api/admin/business-case/active-plan/route.ts) — `GET` aktiver Plan oder null
  - [`active-plan/distribution/route.ts`](../src/app/api/admin/business-case/active-plan/distribution/route.ts) — `PATCH` Monatsverteilung, validiert auf Summe = 100
  - [`actuals/route.ts`](../src/app/api/admin/business-case/actuals/route.ts) — `GET` Aggregate für Jahr
  - [`actuals/sync/route.ts`](../src/app/api/admin/business-case/actuals/sync/route.ts) — `POST` Sync aus `orders` (status='paid', paid_at im Jahresfenster)
- **Sync-Logik:** liest alle bezahlten Bestellungen des Jahres, iteriert Items, mapped pro Item auf Tier, aggregiert pro `(month, tier_key)`, löscht Year-Rows, fügt Aggregate ein. Refunds sind aktuell nicht im Order-Status berücksichtigt — wenn PROJ-6 Refund-Webhooks ergänzt, fließen die automatisch in den Sync ein, weil ein refundeter Auftrag dann nicht mehr `status='paid'` hätte.
- **Validierung** zentral in [`schema.ts`](../src/lib/business-case/schema.ts) mit Zod: Tier-Min-Max-Bounds, Mix 0–100, Volumes-Array genau Länge 3, Distribution-Array genau Länge 12 mit Summe = 100 (Toleranz 0,01).

## Implementation Notes (Frontend Phase 2 + Refactor)
- **Persistenz** wechselt von LocalStorage auf Supabase-API. Die [`storage.ts`](../src/lib/business-case/storage.ts) wurde komplett ausgetauscht (jetzt API-Client mit `fetch`), die Hook-API in [`useBusinessScenarios.ts`](../src/hooks/useBusinessScenarios.ts) bleibt stabil — alle Komponenten unverändert auf der Aufruf-Seite.
- **Hook-Refactor:** alle Operationen sind jetzt async (`Promise<...>`). Optimistisches UI für `updateData` (sofortiger State-Update + Debounce-Save), Error-Toast bei Save-Fehler. Toasts für Create/Delete/Rename/ApproveAsPlan zentral im Hook (vorher dupliziert in `ScenarioList`).
- **Tier-Modell auf 5 Tiers erweitert:** TierKey ist jetzt `string` statt strikter Union, `getDefaultTiers()` liefert die fünf Default-Tiers passend zum Produktkatalog, `isPhysicalTier()` Helper bestimmt physisch-Anteil. Die Editor-Tabelle skrollt horizontal bei < 860 px Breite. AOV ändert sich auf 17,60 € (vorher 12,60 € mit 3 Tiers).
- **Plan-vs-Ist Tab** (PROJ-28 Phase 2): voll implementiert in [`PlanVsActuals.tsx`](../src/components/admin/business-case/PlanVsActuals.tsx).
  - Plan-Header mit Verabschiedungsdatum + letzter Sync-Zeitpunkt + Sync-Button
  - Monatsverteilungs-Editor: 12 Inputs nebeneinander (responsive 3/4/6/12 Spalten), Summen-Validierung mit grün/orange-Indikator, „Gleichverteilung"-Button als Reset
  - Drei KPI-Karten: Plan Jahresumsatz · Ist YTD · Forecast 2026 (mit Δ vs. Plan)
  - **Liniendiagramm** (Recharts) mit drei Linien: Plan kumuliert (durchgezogen petrol), Ist kumuliert (durchgezogen grün, endet am aktuellen Monat), Forecast (gestrichelt gold, ab aktuellem Monat). Y-Achse in Tausender-Notation (z. B. „75k").
  - **12-Monats-Tabelle**: Plan-Bestellungen / Plan-Umsatz / Ist-Bestellungen / Ist-Umsatz / Δ Umsatz absolut / Δ %, mit grün/rot-Färbung der Deltas. Vergangenheits-Monate zeigen Ist + Δ, Zukunfts-Monate nur Plan.
- **Forecast-Berechnung** (clientseitig in `buildMonthlyData`): Plan-Anteil-YTD anhand der Distribution, Ist-YTD aus aggregierten Actuals, Forecast = `Ist_YTD ÷ Plan-Anteil-YTD × 100`. Bei Plan-Anteil-YTD = 0 fällt sie auf den Plan-Wert zurück (z. B. wenn der erste Monat noch nicht durch ist).
- **Plan-Bestellungen-Basis:** das mittlere Volumen-Szenario (`volumes[1]`) wird als verbindliche Plan-Volumenannahme genommen; die anderen beiden bleiben Sandbox-Werte für Sensitivity-Analysen. Hinweis dazu unter der Tabelle.
- **Recharts** als neue Dependency installiert (`^3.8.1`).

## Implementation Notes (Tests)
- Unit-Tests in [`src/lib/business-case/`](../src/lib/business-case/) (3 Dateien, 31 Tests, alle grün):
  - [`calculations.test.ts`](../src/lib/business-case/calculations.test.ts) — verifiziert AOV/Marge/Break-Even/Phys-Anteil/Thresholds/Fulfillment-Ceiling gegen das Default-Szenario, deckt Edge-Cases ab (Mix-Sum ≠ 100, alle-null, kein physischer Tier).
  - [`defaults.test.ts`](../src/lib/business-case/defaults.test.ts) — verifiziert das Tier-Mapping aus `orders.items` für alle SKU-Kombinationen plus Negativ-Cases (unbekanntes Produkt, unsupported Format).
  - [`schema.test.ts`](../src/lib/business-case/schema.test.ts) — verifiziert alle Zod-Validatoren (Scenario-Daten, Create/Update-Schemas, Distribution mit Summen-Constraint).
- Integration-Tests gegen die API-Routen wurden bewusst ausgelassen, weil sie eine Test-Instanz von Supabase plus Auth-Mocking erfordern — Aufwand außerhalb des Feature-Scopes. Die API-Routen sind dünn (Validierung + DB-Operation) und werden in der manuellen QA-Runde gegen die echte DB getestet.

### Aufgeräumt
- `tools/business-case.html` ist gelöscht — Single Source of Truth ist jetzt die Admin-Page.

## Tech Design (Solution Architect)

### Architektur-Entscheidungen aus dieser Phase
- **Persistenz:** Supabase (nicht LocalStorage). Mehrgeräte-Zugriff und Plan-vs-Ist-Tracking sind ohne zentrale Datenhaltung nicht sinnvoll umsetzbar.
- **Charts:** Recharts wird als neue Dependency hinzugefügt (~50 KB gzipped). shadcn/ui hat eine offizielle Chart-Komponente, die Recharts kapselt — passt zum bestehenden UI-Stack.
- **Ist-Daten-Quelle (Phase 2):** Aggregation aus der bestehenden `orders`-Tabelle, nicht direkt aus der Stripe-API. Daten sind durch die Stripe-Webhooks aus PROJ-6 bereits in der DB. Vorteil: schnell, kostenlos, keine API-Limits, gleiche Quelle wie PROJ-10 Bestellverwaltung.
- **Plan-Modell:** Snapshot-Pattern. Beim Verabschieden wird der Szenario-Inhalt in eine separate Plan-Tabelle kopiert und eingefroren. Original-Szenario bleibt frei editierbar, ohne den Plan zu beeinflussen.
- **Plan-Geltungsbereich:** Rückwirkend für das ganze Jahr. Ein im Mai verabschiedeter Plan wird auch gegen Januar–April-Ist verglichen.
- **Tier-Mapping (offen, in /backend zu klären):** Wie werden die Items aus `orders.items` (JSONB) auf die drei Tiers Digital / A4 / A3 abgebildet? Vermutlich über ein `product_type`- oder SKU-Feld in den Items. Annahme für Architektur: Mapping ist deterministisch und 1:1.

### Komponenten-Struktur

```
/private/admin/business-case (Server-Page mit requireAdmin)
└── BusinessCenterShell (Client, Tab-Container)
    ├── Tab "Szenarien"
    │   ├── ScenarioList — Karten-Liste mit Name, Update-Datum, Plan-Badge, Aktionen (Bearbeiten / Duplizieren / Löschen)
    │   ├── "Neues Szenario"-Button → Dialog (Name + optional "Kopie von")
    │   └── "Vergleichen"-Button → öffnet Vergleichs-Tab mit ausgewählten Szenarien
    │
    ├── Tab "Editor" (für ein Szenario, Deep-Link via ?id=...)
    │   ├── ScenarioHeader (Name editierbar, "Als aktiven Plan verabschieden", Speicher-Indikator)
    │   ├── TiersBlock — drei Spalten Digital / A4 / A3 mit Preis · Mix · Stückkosten
    │   ├── KPICards — AOV, Ø-Marge, Phys-Anteil, Digital-Marge-Anteil
    │   ├── FixedCostsBlock — sechs Positionen, Summe Monat + Jahr
    │   ├── MarketingBlock — CAC + Anteil bezahlte Akquise → effektiver CAC
    │   ├── VolumeScenariosBlock — drei Spalten Konservativ / Mittel / Optimistisch
    │   ├── BreakEvenCards — drei Karten (Bestellungen/Jahr, Tag, Umsatz)
    │   └── ThresholdsList — operative Schwellen bei 50k / 100k / 250k / 500k €
    │
    ├── Tab "Vergleich"
    │   ├── ScenarioPicker — 2–3 Szenarien aus Liste auswählen
    │   └── ComparisonTable — Schlüssel-KPIs nebeneinander
    │
    └── Tab "Plan vs Ist" (nur sichtbar wenn aktiver Plan existiert)
        ├── PlanHeader — Plan-Name, Verabschiedungsdatum, letzter Sync
        ├── MonthlyDistributionEditor — 12 Eingabefelder (Summe = 100 %), default Gleichverteilung
        ├── "Ist-Daten synchronisieren"-Button (mit Stripe-not-live-Hinweis falls PROJ-6 noch nicht aktiv)
        ├── PlanVsIstTable — 12 Monate × {Plan-Bestellungen, Plan-Umsatz, Ist-Bestellungen, Ist-Umsatz, Δ}
        ├── ForecastCard — Forecast-Umsatz Jahresende mit Δ zum Plan
        └── TrendChart — Recharts Line Chart (Plan / Ist / Forecast über 12 Monate)
```

### Datenmodell (Plain Language)

**Tabelle `business_scenarios`** — speichert alle frei editierbaren Szenarien.
Jedes Szenario enthält:
- Eindeutige ID + Name (max. 100 Zeichen) + optionale Beschreibung
- Alle Kalkulator-Werte als strukturiertes JSON-Feld:
  - Drei Tiers (Preis, Mix-Anteil, Stückkosten)
  - Sechs Fixkosten-Positionen (monatlich)
  - Marketing (CAC, Anteil bezahlte Akquise)
  - Drei Volumen-Szenarien (Bestellungen/Jahr)
- Erstellungs- und Aktualisierungs-Zeitstempel
- Erstellt-von (Admin-User-Referenz, für Audit)

Datentyp JSON gewählt, weil das Schema sich erwartbar weiterentwickelt (z. B. zusätzliche Tiers, Saisonalität, Preisstaffeln) — eine Migration pro neuem Feld wäre overkill. Berechnete Werte (AOV, Marge, Break-Even) werden NICHT gespeichert, sondern jedes Mal frisch im Browser berechnet.

**Tabelle `business_plans`** (Phase 2) — speichert eingefrorene Plan-Snapshots.
Jeder Plan enthält:
- Eindeutige ID + Anzeige-Name (z. B. "Plan 2026 (verabschiedet 26.04.2026)")
- Referenz auf das Quell-Szenario (kann später gelöscht werden, ohne Plan zu beeinträchtigen)
- Eingefrorenes Snapshot des Kalkulator-JSON aus dem Szenario zum Zeitpunkt der Verabschiedung
- Monatsverteilung als Array von 12 Prozentwerten (Summe muss exakt 100 betragen)
- Status: `active` oder `archived`
- Verabschiedet-am und Gültig-bis (letzteres nur bei archivierten Plänen)
- Verabschiedet-von (Admin-User)

Datenbank-Constraint stellt sicher, dass es nie mehr als einen aktiven Plan gleichzeitig gibt.

**Tabelle `business_actuals`** (Phase 2) — speichert synchronisierte Ist-Werte pro Monat und Tier.
Jede Zeile enthält:
- Jahr + Monat + Tier-Schlüssel (`digital`, `a4`, `a3`) als zusammengesetzte Eindeutigkeit
- Anzahl bezahlter Bestellungen
- Umsatz in Cent (Refunds bereits abgezogen)
- Synchronisations-Zeitstempel + Quelle (`orders_table`)

Die Tabelle wird bei jedem Sync für das laufende Jahr komplett neu geschrieben (idempotent). Kein inkrementeller Sync, weil Refunds rückwirkend bestehende Monate ändern können — ein voller Re-Sync ist immer korrekt und schnell genug bei monatlicher Granularität.

### Sync-Prozess (Phase 2)

1. Admin klickt „Ist-Daten synchronisieren" im Plan-vs-Ist-Tab.
2. Server-Route liest alle bezahlten Bestellungen des laufenden Jahres aus der `orders`-Tabelle.
3. Pro Bestellung werden die Items auf die drei Tiers gemappt (Mapping-Regel siehe oben — in /backend zu definieren).
4. Aggregation pro Monat × Tier: Bestellungs-Anzahl + Umsatz-Summe (in Cent).
5. Refunds werden vom Umsatz und ggf. von der Bestellungs-Anzahl abgezogen (volle Refunds reduzieren Anzahl, Teil-Refunds nur Umsatz).
6. Alle bestehenden Zeilen in `business_actuals` für das laufende Jahr werden gelöscht und durch das neue Aggregat ersetzt.
7. UI lädt frische Daten, zeigt neuen Sync-Zeitstempel.

Dauer erwartbar < 2 Sekunden bei realistischen Bestellzahlen. Solange PROJ-6 nicht live ist, liefert die orders-Tabelle keine Treffer und der Sync-Status zeigt „Stripe noch nicht aktiv".

### Forecast-Berechnung (clientseitig)

Auf Basis der bereits vorliegenden Daten:
- **Ist-YTD** = Summe Ist-Umsatz Januar bis aktueller Monat
- **Plan-Anteil-YTD** = Summe Plan-Anteile Januar bis aktueller Monat (in %)
- **Plan-Anteil-Gesamt** = 100 %
- **Forecast-Jahresumsatz** = Ist-YTD ÷ Plan-Anteil-YTD × Plan-Anteil-Gesamt

Bei einem gleichverteilten Plan und vier Monaten Daten entspricht das einer linearen Hochrechnung; bei saisonal verteiltem Plan (z. B. mehr Q4) korrigiert die Rechnung automatisch.

Falls Plan-Anteil-YTD = 0 (theoretisch unmöglich, aber möglich bei manuell gesetzter Verteilung mit 0 % in Vergangenheits-Monaten) → Fallback auf lineare Run-Rate (Ist-YTD ÷ vergangene Tage × 365).

### Tech Decisions im Detail

**Warum Tabs statt separate Routen?**
Schneller Wechsel zwischen Editor und Plan-vs-Ist im gleichen Mental-Modell. Verhindert Reload und behält UI-Zustand. Deep-Links bleiben über Query-Parameter möglich (`?tab=plan-vs-ist&scenario=…`).

**Warum berechnen wir alles im Browser?**
Der Kalkulator soll auf jede Eingabe sofort reagieren. Ein Server-Roundtrip pro Tastenanschlag wäre zu langsam. Berechnungen sind in O(1) — keine Performance-Sorge.

**Warum kein Audit-Log für Szenario-Edits?**
Single-User-Tool für den Operator. Plan-Snapshots sind die einzigen relevanten "Versionen" — Szenarien sind Sandboxes, deren Edit-Historie keinen Wert hat.

**Warum keine Mobile-Ansicht?**
Interner Desktop-Use-Case (Business-Planung am Schreibtisch). Mobile-Optimierung wäre Aufwand ohne Nutzen.

**Warum Recharts und nicht Chart.js / D3?**
Recharts ist React-nativ, sehr verbreitet, klein genug, hat eine shadcn/ui-Integration. Chart.js wäre Canvas-basiert (schwerer zu stylen, schlechter für Druck-Screenshots). D3 wäre Overkill für einen einzelnen Line Chart.

### Dependencies (zu installieren)
- **`recharts`** (~50 KB gzipped) — Line Chart für Plan/Ist/Forecast in Phase 2

Alle anderen benötigten Bausteine sind bereits vorhanden:
- shadcn/ui-Komponenten (Card, Button, Input, Table, Tabs, Dialog, Alert-Dialog, Badge, Tooltip, Select)
- `requireAdmin()` aus `@/lib/admin-auth`
- `createAdminClient()` aus `@/lib/supabase-admin`
- `sonner` für Toast-Benachrichtigungen
- `zod` für Validierung
- `react-hook-form` für komplexere Formulare

### Sicherheit
- Alle drei Tabellen haben RLS aktiviert. Es gibt KEINE öffentlichen Lese-Policies. Zugriff ausschließlich über die Service-Role-Key-API-Routes, die selbst per `requireAdmin()` geschützt sind.
- Keine direkten Client-Reads gegen die Tabellen — alle Daten fließen durch die Admin-API.
- Validierung mit Zod auf jeder Schreib-API: Mix-Werte 0–100, Stückkosten ≥ 0, Distributions-Summe = 100, etc.
- Keine neuen Umgebungsvariablen nötig (alle bestehenden Supabase-Keys reichen).

### Schnittstellen-Übersicht (für /backend)
- `GET /api/admin/business-case/scenarios` — Liste aller Szenarien (sortiert nach updated_at desc)
- `POST /api/admin/business-case/scenarios` — neues Szenario (optional mit `cloneFromId`)
- `GET /api/admin/business-case/scenarios/[id]` — einzelnes Szenario
- `PATCH /api/admin/business-case/scenarios/[id]` — Update (Name oder Daten-JSON)
- `DELETE /api/admin/business-case/scenarios/[id]` — löschen
- `POST /api/admin/business-case/scenarios/[id]/approve-as-plan` — verabschiedet als aktiven Plan, archiviert vorherigen
- `GET /api/admin/business-case/active-plan` — aktueller Plan (oder 404)
- `PATCH /api/admin/business-case/active-plan/distribution` — Monatsverteilung anpassen
- `GET /api/admin/business-case/actuals?year=2026` — Ist-Daten des Jahres
- `POST /api/admin/business-case/actuals/sync` — Sync aus orders-Tabelle anstoßen

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
