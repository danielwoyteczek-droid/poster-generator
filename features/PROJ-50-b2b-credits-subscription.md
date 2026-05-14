# PROJ-50: B2B Credits-Abo (Subscription mit Usage-Based Overage)

## Status: In Progress
**Created:** 2026-05-14
**Last Updated:** 2026-05-14

## Context & Motivation

Petite-Moment soll neben dem bestehenden B2C-Endkunden-Geschäft (PROJ-6 One-Time Payments) eine zweite Revenue-Säule für **Business-Kunden** bekommen: Druckereien/Copyshops, die das Tool ihren eigenen Kunden anbieten möchten, sowie digitale Kreatoren (Etsy), die aktuell Poster in Illustrator/Photoshop bauen und über das Tool ihren Workflow drastisch verkürzen können.

Das B2B-Angebot ist ein **monatliches Abo mit inkludierten Download-Credits** und Auto-Charge-Overage für Verbrauch darüber hinaus. Eine **Commercial License** ist im Abo enthalten — B2B-Kunden dürfen Exporte weiterverkaufen (z.B. auf Etsy als Sofort-Download).

Diese Spec deckt ausschließlich das **Billing-/Credit-Modell** ab. Die zugehörige Marketing-Landing-Page ist **PROJ-51** (separat, noch nicht angelegt), die abgespeckte Admin-Rolle für B2B-Accounts ist **PROJ-52** (separat, noch nicht angelegt).

## Dependencies

- **Requires:** PROJ-4 (User Authentication) — B2B-Abos sind an Accounts gebunden
- **Requires:** PROJ-6 (Stripe-Bezahlsystem) — Stripe-Integration (Customer, Webhook, Catalog) muss vorhanden sein
- **Requires:** PROJ-3 (Poster-Export) — Credits werden beim Export verbraucht
- **Required by:** PROJ-51 (B2B Landing Page, geplant) — bewirbt die hier definierten Tiers
- **Required by:** PROJ-52 (B2B Pro-User-Rolle, geplant) — schaltet Admin-Bereich für aktive Abonnenten frei

## Scope-Entscheidungen (aus Discovery)

| Dimension | Entscheidung |
|---|---|
| Persona | EINE B2B-Persona (Druckereien + Etsy-Kreatoren bekommen gleichen Funktionsumfang). Kein White-Label, kein Embed auf Kunden-Domain. |
| Tier-Anzahl | **4 Tiers**: **Free Forever** + Starter / Pro / Business (3 zahlende Stufen). Free als Top-of-Funnel, zahlende Stufen für ernsthafte Nutzung. |
| Initial-Volumen | **Free: 3 Credits/Monat (mit Watermark, keine Commercial License)**. Zahlende Tiers konservativ: **25 / 100 / 300 Credits pro Monat** (Final-Werte vor Launch im Stripe-Catalog). |
| Free-Tier-Differenzierung | **Sichtbares Watermark** ("Petite-Moment") dezent auf Free-Exporten + **keine Commercial License** (TOS). Volle Auflösung — kein Render-Quality-Downgrade. Standard-Approach (Canva, Figma). |
| Credit-Burn-Logik | **1 Credit = erstes Export eines Projekts.** Folge-Exporte desselben Projekts (auch Format-Switch, auch Tage später) verbrauchen KEINEN weiteren Credit. Gilt für ALLE Tiers inkl. Free. |
| Reset-Zyklus | **Rolling 30 Tage** ab Sign-up-Datum, pro Kunde individuell. Free-Tier resettet ebenfalls rolling 30 Tage. |
| Carry-Over | **Roll-Over mit Cap = 1 Monat** für zahlende Tiers. Unverbrauchte Credits laufen in Folgemonat über, verfallen nach 1 weiterem Zyklus. **Free-Tier: KEIN Roll-Over** (Free-Credits verfallen am Reset-Tag). |
| Overage-Modell | **Auto-Charge Metered Billing**, Initial-Preis **20 Cent pro zusätzlichem Export-Projekt** (final änderbar via Stripe-Catalog). **Free-Tier hat KEIN Overage** — bei 0 Credits = Block bis Reset oder Upgrade. |
| Trial | **7-Tage-Trial eines zahlenden Tiers** mit 3 Trial-Credits, voll funktional inkl. Commercial License (Watermark weg). Kreditkarte zwingend, Auto-Convert. Free-Tier-User können Trial starten = Pfad ins zahlende Abo. |
| Kündigung | **Bis Periodenende.** Credits bleiben bis Zyklus-Ende nutzbar, keine Pro-Rata-Rückerstattung. Bei Kündigung fällt Account automatisch zurück auf Free-Tier. |
| Failed Payment | **Sofort pausieren bei 1. Fehlschlag.** Account fällt sofort auf Free-Tier-Limits zurück (statt komplett gesperrt). Kunde kann Karte aktualisieren → Reaktivierung. |
| Geo-Scope | **EU + US + UK** mit Multi-Currency (EUR/USD/GBP). USt.-Behandlung pro Region via Stripe Tax. Free-Tier global verfügbar, keine USt.-Relevanz (kein Umsatz). |
| Commercial License | **Inklusive in allen zahlenden Tiers + im Trial.** Free-Tier NICHT. Abuse-Schutz im Trial via 3-Credits-Cap + Stripe-Fingerprint gegen Trial-Wiederholung. |
| Architektur-Scope | **Gleiche Domain** (`petite-moment.com/business` für Landing, Editor bleibt unter `/editor` für alle Tiers). Eine Codebase, eine Supabase, ein Stripe-Account. Subscription-Status am User-Object differenziert B2C/Free/Starter/Pro/Business. Keine Subdomain, keine separate Instanz. |

## User Stories

### Etsy-Kreator (Hauptzielgruppe)
- Als Etsy-Kreator möchte ich ein monatliches Abo abschließen, sodass ich für meinen Shop **planbare Kosten pro Poster** habe statt jeden Export einzeln zu kaufen.
- Als Etsy-Kreator möchte ich die **Commercial License** automatisch im Abo bekommen, sodass ich rechtssicher Sofort-Downloads in meinem Shop anbieten kann.
- Als Etsy-Kreator möchte ich, dass **Re-Downloads desselben Projekts kostenlos** sind, sodass ich ein Design später ohne neue Kosten erneut exportieren kann (z.B. wenn ein Kunde das File verloren hat).
- Als Etsy-Kreator möchte ich bei einem ungeplanten Volumen-Spike **automatisch weiter exportieren können** (Overage), sodass ein Großauftrag nicht von "Credits leer"-Hard-Limits blockiert wird.

### Druckerei/Copyshop
- Als Inhaber eines Copyshops möchte ich das Tool als Zusatzservice für meine Laufkundschaft anbieten, sodass ich **ohne eigene Software-Entwicklung** ein neues Produkt im Sortiment habe.
- Als Inhaber eines Copyshops möchte ich vorhersehen können, wie viele Designs mein Team im Monat erstellen wird, sodass ich den **passenden Tier** wählen kann.

### Plattform-Betreiber (intern)
- Als Betreiber möchte ich die Tier-Preise und Credit-Volumen **im Stripe-Dashboard konfigurieren** (nicht hardcoded), sodass ich ohne Code-Deploy A/B-testen kann.
- Als Betreiber möchte ich eine **Stripe-Webhook-Pipeline**, die Subscription-Events (Aktivierung, Renewal, Cancellation, Failed Payment) in Echtzeit in der Supabase-DB widerspiegelt.
- Als Betreiber möchte ich pro B2B-Account einen **Audit-Log aller Credit-Verbräuche** (Welcher Export, welches Projekt, wann), sodass ich Disputes nachvollziehen kann.

## Acceptance Criteria

### Free-Tier (Top-of-Funnel)
- [ ] Jeder registrierte User (auch B2C-Customer) hat automatisch Zugriff auf den **Free-Tier mit 3 Credits/Monat**, ohne Kreditkarten-Hinterlegung.
- [ ] Free-Exporte tragen ein **dezentes Watermark** ("Petite-Moment" o.ä. in einer Ecke), das in voller Auflösung sichtbar ist.
- [ ] Free-Tier hat **keine Commercial License** (TOS-Erwähnung im Export-Footer / Checkout-Bestätigung).
- [ ] Free-Credits resetten **rolling 30 Tage** ab Account-Erstellung; **keine Roll-Over**, unverbrauchte verfallen.
- [ ] Bei 0 Free-Credits: Export blockiert mit klarem Upgrade-CTA ("Pro werden für unbegrenzte Exporte ohne Watermark").

### Subscription Lifecycle (zahlende Tiers)
- [ ] Ein eingeloggter User (Free oder B2C) kann auf der B2B-Landing-Page (PROJ-51) einen der 3 zahlenden Tiers wählen und über Stripe Checkout abschließen.
- [ ] Bei Abo-Abschluss wird eine **7-tägige Trial-Periode** gestartet; Kreditkarte ist zwingend hinterlegt, aber wird nicht belastet.
- [ ] Während des Trials hat der Kunde Zugriff auf **3 Trial-Credits** mit vollem zahlendem Funktionsumfang (Watermark weg, Commercial License aktiv).
- [ ] Trial-Credits ersetzen für die Trial-Dauer den Free-Tier-Counter; nach Trial-Ende fällt User entweder ins zahlende Abo (Auto-Convert) oder zurück auf Free.
- [ ] Nach Ablauf des Trials erfolgt **automatische Erstabbuchung** des gewählten Tier-Preises, der reguläre 30-Tage-Zyklus beginnt.
- [ ] Bei Renewal werden die **Tier-Credits am Tag X+30 aufgefrischt**; nicht verbrauchte Credits aus Vorperiode bleiben (Roll-Over) sichtbar mit Verfallsdatum.
- [ ] Bei Cancellation läuft das Abo **bis zum Periodenende weiter**; verbleibende Credits sind bis dahin nutzbar. Danach fällt Account automatisch auf **Free-Tier zurück** (NICHT komplett gesperrt).

### Credit-System
- [ ] Beim ersten Export eines Projekts wird **genau 1 Credit verbraucht**; dies wird im `b2b_credit_ledger` mit Project-ID, Timestamp, Export-Format protokolliert.
- [ ] Weitere Exporte desselben Projekts (egal welches Format, egal welcher Zeitraum) verbrauchen **keinen weiteren Credit**, solange das Projekt in einer "Bereits-bezahlt"-Tabelle (`b2b_paid_projects`) gelistet ist.
- [ ] **Roll-Over**: Unverbrauchte Credits werden bei Renewal in einen separaten "Rollover"-Bucket verschoben. Verbrauch nutzt zuerst den Rollover-Bucket (FIFO), dann die neuen Credits.
- [ ] Rollover-Credits, die nicht innerhalb des nächsten Zyklus (= 30 Tage) verbraucht werden, verfallen automatisch.
- [ ] Wenn alle Credits (inkl. Rollover) aufgebraucht sind, schaltet das System automatisch auf **Overage-Modus**: Jeder weitere Export wird via Stripe Metered Billing protokolliert und mit der nächsten Rechnung abgebucht.

### Multi-Currency & Tax
- [ ] B2B-Kunde wählt bei Sign-up sein Land; Stripe Tax bestimmt korrekte USt./VAT-Behandlung (z.B. Reverse-Charge für EU-B2B außerhalb DE bei gültiger USt-IdNr.).
- [ ] Tier-Preise werden in EUR, USD und GBP im Stripe-Catalog hinterlegt; Kunde sieht Preise in seiner Landeswährung.
- [ ] USt.-IdNr.-Feld ist im Checkout-Formular sichtbar (optional für US/UK, validiert für EU).

### Failed Payment & Account-Pause
- [ ] Bei fehlgeschlagener Erstbuchung (z.B. Karten-Limit überschritten, abgelaufene Karte): **Account wird sofort pausiert**, kein Export mehr möglich.
- [ ] Kunde erhält Stripe-Hosted-Email mit Link zur Aktualisierung der Zahlungsmethode.
- [ ] Sobald gültige Zahlungsmethode hinterlegt UND Nachzahlung erfolgreich: Account wird reaktiviert, Credits stehen wieder zur Verfügung.
- [ ] Während Pause: Kunde sieht im Editor eine **Banner-Meldung** "Abo pausiert — bitte Zahlungsmethode aktualisieren" mit Direkt-Link.

### Audit & Transparency
- [ ] B2B-Account-Inhaber kann im Account-Bereich (PROJ-50) sein aktuelles Credit-Guthaben, Rollover-Credits mit Verfallsdatum, Verbrauchs-History und nächstes Renewal-Datum einsehen.
- [ ] Pro Export-Verbrauch wird ein Ledger-Eintrag mit `user_id`, `project_id`, `format`, `credit_source` (regular/rollover/overage), `timestamp` geschrieben.
- [ ] Bei jeder Stripe-Invoice (Renewal + Overage) erhält Kunde **automatisch eine PDF-Rechnung** per Stripe Hosted Invoice.

## Edge Cases

### Free-Tier & Conversion-Pfade
- **Free-User exportiert mit Watermark, will später kommerziell nutzen:** Re-Export desselben Projekts nach Upgrade in zahlendes Abo = OHNE Watermark. Kein Credit-Abzug (Re-Download ist gratis), nur Watermark-Schicht wird beim Render-Zeitpunkt anders entschieden.
- **Free-User hat alle 3 Credits verbraucht und will sofort mehr:** UI bietet 2 Pfade: (1) Trial starten (7 Tage zahlender Tier mit 3 Trial-Credits ohne Watermark), (2) Direkt zahlendes Abo abschließen. Kein One-Time-"Buy 3 More Credits"-Pfad (würde One-Time-Payments-PROJ-6-Flow kannibalisieren).
- **Free-Tier-Abuse via Mehrfach-Accounts:** Pro Email-Adresse + ggf. IP-Heuristik nur 1 Free-Account/Monat. Keine harte Sperre (Privacy-Probleme), aber Watermark macht Abuse ohnehin unattraktiv.

### Trial & Sign-up
- **Trial-Abuse (gleiche Person mehrfach):** Bei Sign-up wird Stripe-Customer-Email + Kreditkarten-Fingerprint geprüft; bereits genutzte Kombinationen erhalten KEINEN weiteren Trial (direkt zahlend ab Tag 1).
- **Bestehender B2C-Customer wird B2B:** Existierende One-Time-Payments (PROJ-6) bleiben unverändert. User-Account wird um B2B-Subscription-Felder erweitert, alte Bestellhistorie bleibt erhalten.
- **Trial bricht ab vor Auto-Convert:** Wenn Kunde nach 5 von 7 Tagen kündigt, bleibt Trial bis Tag 7 aktiv, danach KEINE Belastung, Account fällt zurück auf Free-Tier.
- **Trial-User exportiert 3 Designs in Tag 1 und kündigt sofort:** 3 Exporte mit Commercial License sind das maximale Abuse-Volumen — bewusst akzeptiert. Stripe-Fingerprint verhindert sofortigen Re-Trial mit gleicher Karte.

### Credit-Verbrauch
- **Export schlägt fehl (Server-Error):** Credit wird ERST nach erfolgreichem PDF/PNG-Render abgezogen, nicht beim Klick auf "Exportieren". Idempotenz via Export-Request-ID.
- **Projekt wird gelöscht nach Export:** Eintrag in `b2b_paid_projects` bleibt bestehen — falls Kunde dasselbe Projekt rekonstruiert (z.B. Backup), gilt es NICHT mehr als "bereits bezahlt". Re-Download-Gratis-Regel gilt nur für UNVERÄNDERTE Projekte mit identischer Project-ID.
- **Race Condition (zwei Exports parallel):** Atomare DB-Transaktion mit Row-Lock auf `b2b_subscriptions.credits_remaining`. Zweiter Export wartet oder schlägt sauber fehl.
- **Kunde versucht Export, hat 0 Credits + Overage deaktiviert:** Aktuell nicht relevant (Overage immer an). Falls später Overage-Cap-Feature: klare Fehlermeldung mit Upgrade-Link.

### Subscription State Transitions
- **Tier-Upgrade mid-cycle:** Sofortige Aktivierung neuer Tier, anteilige Berechnung via Stripe Proration. Neue Credit-Differenz wird sofort gutgeschrieben.
- **Tier-Downgrade mid-cycle:** Wird zum Periodenende wirksam. Aktueller Zyklus bleibt im alten Tier mit allen Credits.
- **Pausierung durch Stripe (Dispute, Chargeback):** Account sofort pausieren, gleicher Pfad wie Failed Payment. Manueller Review durch Betreiber.
- **Stripe-Webhook kommt verspätet/doppelt:** Idempotenz via Stripe `event.id`; jeder Event wird nur einmal verarbeitet (Event-Log-Tabelle).

### Geo & Currency
- **Kunde wechselt Wohnsitz (z.B. DE → US):** Aktuelles Abo läuft in EUR weiter bis Zyklus-Ende. Bei Renewal kann Kunde Currency im Stripe-Customer-Portal umstellen.
- **VAT-Validation schlägt fehl:** Sign-up nicht blocken; Kunde zahlt zunächst Brutto, kann Re-Validation später im Account-Portal nachholen.
- **Stripe-Tax-Ausfall:** Fallback auf Default-VAT (DE 19%) mit Banner-Warnung an Kunden + Operator-Alert.

### Cancellation & Refunds
- **Kunde fordert vorzeitige Rückerstattung trotz "Bis Periodenende"-Policy:** Manuelle Operator-Entscheidung, kein Self-Service-Refund.
- **Account-Löschung durch Kunden (DSGVO):** Subscription wird sofort gekündigt, Account-Daten anonymisiert. Ledger-Einträge bleiben (Buchhaltungs-Aufbewahrungspflicht 10 Jahre) mit anonymisierter User-Referenz.

## Non-Goals (explizit NICHT in dieser Spec)

- **White-Label / Custom-Domain für Druckereien** — eigenes Feature später, falls Nachfrage.
- **API-Zugriff für Bulk-Exports** — Etsy-Kreatoren exportieren weiterhin über UI, nicht via REST-API.
- **Team-Accounts / Multi-User pro Abo** — 1 Login = 1 Subscription. Multi-User-Workspaces sind späteres Feature.
- **Annual-Pläne mit Rabatt** — initial nur Monats-Abos, Jahres-Pläne können nachgereicht werden.
- **B2B-Admin-Funktionen** (Verbrauchs-Dashboard, eigene Brand-Settings etc.) — siehe PROJ-52 (geplant).
- **Marketing-Landing-Page** — siehe PROJ-51 (geplant).

## Technical Requirements

- **Architektur:** Gleiche Codebase wie B2C, gleiche Supabase-Instanz, gleiches Stripe-Konto. B2B-Landing unter Pfad `/business` (kein Subdomain). Subscription-Tier als Feld am User-Profil (`free` / `starter` / `pro` / `business` / `trial-X`).
- **Stripe Products:** 3 Subscription-Products (Starter/Pro/Business), je 3 Prices (EUR/USD/GBP). 1 Metered Product für Overage in 3 Currencies (initial 20 Cent EUR-Äquivalent).
- **DB-Schema (neu):**
  - `b2b_subscriptions` (user_id, stripe_subscription_id, tier, status, current_period_start/end, trial_end, credits_remaining, rollover_credits, rollover_expires_at)
  - `b2b_credit_ledger` (id, user_id, project_id, format, credit_source, timestamp, stripe_invoice_item_id?) — protokolliert AUCH Free-Tier-Verbrauch
  - `b2b_paid_projects` (user_id, project_id, first_paid_at, watermarked: bool) — für Gratis-Re-Downloads; Watermark-Flag entscheidet beim Re-Export, ob Watermark gerendert wird (Free-Export = Watermark, Re-Export nach Upgrade = ohne)
  - `free_tier_usage` (user_id, period_start, credits_used) — separate Tabelle für Free-Tier-Counter (vereinfacht Logik)
  - `stripe_event_log` (event_id, type, payload, processed_at) — Idempotenz
- **Watermark-Rendering:** Export-Pipeline (PROJ-3) muss um conditional Watermark-Layer erweitert werden, gesteuert über User-Tier zum Render-Zeitpunkt.
- **Webhooks:** Erweitern bestehenden `/api/stripe/webhook` um Events: `customer.subscription.created/updated/deleted`, `invoice.payment_succeeded/failed`, `customer.subscription.trial_will_end`.
- **Tax:** Stripe Tax aktivieren, USt-IdNr.-Validation via Stripe Customer-Object.
- **Performance:** Credit-Check beim Export < 100 ms (kritischer Pfad).
- **Security:** RLS auf alle B2B-Tabellen, Stripe-Webhook-Signature-Verification, Idempotenz auf allen State-Mutationen.
- **Browser Support:** Wie restliche App (modern evergreen).

## Open Questions (für /architecture-Phase)

- Konkrete Tier-Namen finalisieren (Starter/Pro/Business OK als Platzhalter?).
- Genaue Monats-Preise pro Tier in EUR/USD/GBP — abhängig von Wettbewerbs-Analyse.
- Watermark-Design & -Position: Ecke (welche?) / Mitte / quer über das Poster? Wie groß? Welche Opazität? Logo oder Text "petite-moment.com"?
- Wie wird Free-/Trial-Status visuell im Editor kommuniziert (Persistent Banner? Counter "noch X Credits"? Modal beim 0-Credit-Erreichen?)
- Wie wird der "Re-Export ohne Watermark nach Upgrade"-Flow UX-mäßig gelöst (Auto-Generate aller Watermark-Exporte neu? Oder nur on-demand bei Re-Download?)
- IP-Heuristik für Free-Tier-Mehrfach-Accounts: pragmatischer Cutoff oder vorerst weglassen?

---
<!-- Sections below are added by subsequent skills -->

## Frontend Implementation Notes (2026-05-14)

**Status:** Frontend-Code komplett, in den Editor integriert.

### Neue Components ([src/components/business/](../src/components/business/))

- **[useB2BSubscription](../src/hooks/useB2BSubscription.ts)** — Hook, der `/api/business/subscription-status` polled. Liefert `{ status, loading, error, refresh }`. Skipped fuer Visitor-State.
- **[CreditStatusChip](../src/components/business/CreditStatusChip.tsx)** — persistentes Badge in der Sidebar mit Tier + verbleibende Credits + Rollover-Tooltip. Faerbung: Free=neutral, Paid=brand, Trial=orange, Low=amber, Exhausted=red.
- **[UpgradeModal](../src/components/business/UpgradeModal.tsx)** — drei Tier-Karten mit Trial-CTAs. Variants `free_exhausted` / `watermark_blocker` / `cta` steuern Copy + Default-Highlight. Triggert Stripe Checkout via `/api/business/checkout-session`.
- **[SubscriptionPanel](../src/components/business/SubscriptionPanel.tsx)** — Account-View-Karte: aktueller Plan, Credit-Counter, Rollover, Renewal-Datum, Trial-Ende, Cancel-at-Period-End-Indicator, Past_due-Banner. Stripe-Portal-Button.
- **[UsageLedger](../src/components/business/UsageLedger.tsx)** — Tabelle der letzten 30 Credit-Verbraeuche, liest via RLS direkt aus `b2b_credit_ledger`. Color-coded Credit-Source-Badges.
- **[InvoicesList](../src/components/business/InvoicesList.tsx)** — minimalistischer Stripe-Portal-Link (Stripe hostet die Rechnungs-History).
- **[B2BExportSection](../src/components/business/B2BExportSection.tsx)** — Hot-Path: Klick triggert `/api/business/authorize-export`, ruft dann `renderPreview(format, { watermark })` mit dem Server-Flag, deliver via Browser-Blob-Download. Verzweigt nach Tier: Paid/Trial = direkter Download, Free-mit-Credits = Watermark + Upgrade-CTA, Free-0-Credits = nur Upgrade-CTA, Past_due = Pause-Banner mit Portal-Link.
- **[AccountView](../src/components/business/AccountView.tsx)** + **[UpgradeView](../src/components/business/UpgradeView.tsx)** — Client-Wrapper fuer die Server-Pages (Auth-Gating, Currency-Switcher).

### Neue Pages

- **[/[locale]/account](../src/app/[locale]/account/page.tsx)** — buendelt SubscriptionPanel + UsageLedger + InvoicesList. Auth-Required (auto-redirect zu Login).
- **[/[locale]/business](../src/app/[locale]/business/page.tsx)** — kompakte Pitch-Page mit Hero / Personas (Etsy + Druckerei) / Feature-Highlights / CTA. Vorgriff auf PROJ-51 (Marketing-Funnel).
- **[/[locale]/business/upgrade](../src/app/[locale]/business/upgrade/page.tsx)** — Tier-Vergleich mit Currency-Switcher (EUR/USD/GBP) und Stripe-Checkout-CTAs. Eingehende User ohne Login werden via Redirect-Param zum Login geschickt.

### Editor-Integrationen

- **[EditorLayout.tsx](../src/components/editor/EditorLayout.tsx)** — `CreditStatusChip` oben in der Sidebar persistent eingeblendet. Verschwindet automatisch fuer nicht-eingeloggte Visitor.
- **[ExportTab.tsx](../src/components/sidebar/ExportTab.tsx)** (Map), **[StarMapExportTab.tsx](../src/components/star-map/StarMapExportTab.tsx)**, **[PhotoExportTab.tsx](../src/components/photo-editor/sidebar/PhotoExportTab.tsx)** — alle drei zeigen `B2BExportSection` oben mit "Oder Einzelkauf"-Trenner ueber dem bestehenden `ProductTierPicker` (PROJ-48-B2C-Cart-Flow). User waehlt: Abo-Download oder einmaliger Kauf.

### Wichtige UX-Entscheidungen

- **B2C-Cart-Flow bleibt unveraendert.** Fuer Visitor (nicht eingeloggt) ist nur der Cart-Flow sichtbar, B2BExportSection blendet sich aus. Eingeloggte User sehen BEIDE Pfade — der "richtige" haengt von ihrer Situation ab.
- **Bei fehlendem `projectId`** zeigt B2BExportSection eine Warnung "Bitte speichere dein Projekt zuerst" statt Auto-Save. Force-Save haette UX-Implikationen (Auto-Title, Projekt-Liste-Pollution), wird in /qa-Phase entschieden.
- **PDF-Export im B2B-Flow ist Phase-2.** Der MVP rendert PNG via `renderPreview` und liefert es als Blob; PDF erfordert die bestehende `jsPDF`-Pipeline aus `useMapExport.exportPDF`. Wir bauen das ein, sobald die PNG-Pipeline live ist und getestet wurde (sonst zu viel Risiko in einem Sprung).
- **Watermark wird beim Render-Zeitpunkt entschieden, basierend auf Server-Flag**. Client-side Trust-Boundary akzeptiert (siehe Backend-Notes).
- **Rechnungen via Stripe Customer Portal**, keine eigene Invoice-UI. Spart Engineering ohne Funktionsverlust.

### TypeScript & Tests

- TypeScript: alle neuen Files compilen sauber (`npx tsc --noEmit`). Pre-existing Errors in `useMobileSheet.test.ts` unveraendert.
- Tests: 175 vitest-Tests gruen (inkl. 30 B2B-Backend-Tests). E2E-Suite (Playwright) wird separat via `npm run test:e2e` gefahren und ist out-of-scope hier.

### Bekannte Limitationen (fuer /qa-Phase)

1. **i18n hardcoded auf Deutsch.** Components + Pages haben deutsche Strings inline. Voll-i18n wuerde 5 Locale-JSON-Files aktualisieren — wird beim regulaeren Translation-Pass nachgereicht (oder schneller, je nach Marktstart).
2. **Tier-Preise nicht sichtbar in der UI.** Stripe-Catalog-Lookup analog zu PROJ-6 nutzen, damit die UI die echten Preise von Stripe zieht. Aktuell zeigt UpgradeView nur "Preis siehe Stripe-Checkout".
3. **CreditStatusChip + B2BExportSection-Header zeigen beide Credits.** Bewusst redundant: Chip ist immer sichtbar, Section nur im Export-Tab. Kann spaeter konsolidiert werden.
4. **Kein End-to-End-Test mit Live-Stripe.** /qa muss mit Stripe-Test-Mode den vollen Flow durchspielen: Sign-up → Trial → Export → Renewal-Webhook → Cancel.

### Naechste Schritte

- `/qa` mit Stripe-Test-Mode + lokaler Supabase. Test-Cases: Free-Export mit Watermark, Trial-Sign-up, Tier-Wechsel, Renewal-Webhook, Past_due-Pause, Re-Export.
- Tier-Preise in Stripe anlegen (siehe Backend-Notes: 12 Price-IDs noetig).
- Optional: Volle i18n + konkrete Watermark-Visual-Approval mit Mockups.

## Backend Implementation Notes (2026-05-14)

**Status:** Backend-Code komplett, frontend-UI noch ausstehend (kommt in `/frontend`-Phase).

### Was gebaut wurde

**1. DB-Migration** — [supabase/migrations/20260514000010_proj50_b2b_subscriptions.sql](../supabase/migrations/20260514000010_proj50_b2b_subscriptions.sql)
- 5 Tabellen mit RLS + Admin-Read-Policies: `b2b_subscriptions`, `free_tier_usage`, `b2b_paid_projects`, `b2b_credit_ledger`, `stripe_event_log`
- **SECURITY DEFINER-Function `authorize_export()`** — atomarer Credit-Check + Burn mit Row-Lock auf `b2b_subscriptions`. Behandelt alle 4 Pfade: Re-Export (frei), Rollover (FIFO), Regular Credits, Overage, Free-Tier mit Lazy-Reset. Race-Condition-frei.
- Idempotente Migration (CREATE … IF NOT EXISTS überall).

**2. Lib-Module**
- [src/lib/b2b-subscription.ts](../src/lib/b2b-subscription.ts) — Tier-Konstanten, Stripe-Price-ID-ENV-Resolver (Tier × Currency), Status-Mapping, Trial-Helpers. Single-Source-of-Truth für Tier-Werte.
- [src/lib/b2b-webhook-handlers.ts](../src/lib/b2b-webhook-handlers.ts) — Subscription-Event-Handler (created/updated/deleted/payment_succeeded/payment_failed). Renewal-Logik mit Rollover-Bucket. Metered-Overage-Item-Attachment nach Subscription-Erstellung.
- [src/lib/watermark.ts](../src/lib/watermark.ts) — `applyWatermark(canvas)` Helper, der die Wortmarke "petite-moment.com" unten rechts auf das Canvas zeichnet (Cormorant Garamond, 40% Opazität, Brand-Tiefpetrol).

**3. API-Routen** (alle unter `/api/business/`)
- `POST /checkout-session` — erstellt Stripe Checkout für Tier-Subscription mit 7-Tage-Trial, Stripe-Tax & VAT-ID-Collection, Customer-Reuse für Existing-Customer
- `POST /portal-session` — Stripe Customer Portal Redirect (Plan-Wechsel, Kartenupdate, Kündigung, Rechnungsabruf)
- `POST /authorize-export` — Hot-Path-Endpoint vor jedem Export. Wraps die `authorize_export()` SQL-Function, schickt bei `credit_source='overage'` zusätzlich einen `stripe.billing.meterEvents`-Record. Liefert `{ ok, watermark, isReExport, creditSource, tier, reason }`.
- `GET /subscription-status` — User-Status für UI: tier, credits, rollover, period-end, trial-end, cancel-at-period-end

**4. Webhook-Erweiterung** — [src/app/api/stripe/webhook/route.ts](../src/app/api/stripe/webhook/route.ts)
- Vorne neu: Idempotenz-Check via `stripe_event_log` (Insert-Conflict = Duplikat, frühe 200-Antwort)
- B2B-Dispatcher vor B2C-Logik
- `checkout.session.completed` filtert B2B-Sessions raus (kein Order-Update)

**5. Watermark-Integration** — `useMapExport.ts`, `useStarMapExport.ts`, `usePhotoExport.ts`
- `renderPreview(format, options?)` erweitert um optionales `WatermarkOptions`-Argument
- Headless-Renders (Preset-Worker, City-Renders) lassen options weg → kein Watermark
- Frontend-Export-Flow (kommt in PROJ-50-Frontend) wird `{ watermark: result.watermark }` aus authorize-export-API durchreichen

**6. Tests** — [src/lib/b2b-subscription.test.ts](../src/lib/b2b-subscription.test.ts)
- 30 Unit-Tests für pure Helpers (Tier-Konstanten, ENV-Lookups, Reverse-Mapping, Status-Mapping, Trial-Helpers)
- Alle grün via `npm test -- src/lib/b2b-subscription.test.ts`
- API-Routen + RPC + Webhook-Handler werden in `/qa` mit Live-Stripe-Test-Mode + lokaler Supabase getestet (kein Mocking-Framework etabliert in diesem Repo)

**7. ENV-Variablen** — `.env.local.example`
- 9 Tier-Price-IDs: `STRIPE_PRICE_B2B_<TIER>_<CURRENCY>` × 3 × 3
- 3 Overage-Price-IDs: `STRIPE_PRICE_B2B_OVERAGE_<CURRENCY>` × 3
- Alle leer per Default — leere Tiers liefern 503 mit klarer Fehlermeldung

### Wichtige Architektur-Abweichungen gegenüber der ursprünglichen Tech-Design-Sektion

- **Watermark ist client-side, nicht server-side enforced.** Render-Pipeline läuft im Browser-Canvas (siehe [HeadlessRenderBridge](../src/components/editor/HeadlessRenderBridge.tsx)). Server hat keine Render-Hoheit. Trust-Boundary: Client trusted dem Server-Flag aus `/api/business/authorize-export`. Casual-Abuse-Schutz: gegeben. Reverse-Engineering-Schutz: nicht. Für v1 bewusst akzeptiert (siehe Risiko-Tabelle).
- **Free-Tier "Sofort-Pause bei Failed Payment" implementiert via past_due-Status.** Stripe Smart-Retries laufen weiter; falls einer klappt, `invoice.payment_succeeded`-Handler setzt Status zurück auf `active`. User sieht in der Zwischenzeit Free-Tier-Limits (keine kompletten Sperre — siehe Spec-Update).
- **Metered Overage Subscription-Item wird via `subscription.items.create` im subscription.created-Webhook attached**, nicht direkt im Checkout. Stripe-Limitation: Checkout `mode='subscription'` mischt schlecht recurring + metered im selben Call.

### Stripe-Setup-Schritte für den Betreiber (vor Launch)

1. Stripe-Dashboard → **Products → "Add product"** für jeden Tier (Starter/Pro/Business), je 3 Prices in EUR/USD/GBP, recurring monthly
2. **"Petite-Moment B2B Overage"** Product anlegen, 3 metered Prices in EUR/USD/GBP zu je 20 Cent
3. **Settings → Tax → Enable Stripe Tax** (automatische USt-Behandlung)
4. **Settings → Billing → Customer Portal** aktivieren (Plan-Wechsel, Kündigung, Karten-Update erlauben)
5. Price-IDs in `.env.local` eintragen (siehe `.env.local.example` für die 12 Variablen)
6. Webhook-Endpoint im Stripe-Dashboard für die neuen Subscription-Events:
   - `customer.subscription.created/updated/deleted`
   - `invoice.payment_succeeded/payment_failed`
   - `customer.subscription.trial_will_end`
7. Migration auf Production-Supabase deployen
8. End-to-End-Test in Stripe-Test-Mode (`/qa`-Phase)

### Offen für `/frontend`-Phase

- Editor-Toolbar `CreditStatusChip` (persistent, zeigt verbleibende Credits)
- `UpgradeModal` bei 0 Credits oder bei Trial-CTA
- `/business/upgrade` Tier-Vergleichs-Seite mit Stripe-Checkout-Buttons
- Account-Panel-Komponenten: `SubscriptionPanel`, `UsageLedger`, `InvoicesList`
- Export-Button-Rewiring: vor Render → `POST /api/business/authorize-export` → wenn `ok`, render mit `{ watermark }`-Flag, browser-blob-Download
- Watermark-visual finalisieren + Mockup-Approval

## Tech Design (Solution Architect)

### A) Component-Struktur

**Öffentliche Bereiche (eingeloggt nicht erforderlich)**
```
/business (Landing — wird in PROJ-51 gebaut, hier nur als Verweis)
+-- /business/upgrade (Tier-Vergleich + Checkout-Trigger)
    +-- TierCardGrid (Starter / Pro / Business nebeneinander)
    +-- "Aktueller Plan: Free"-Indicator (für eingeloggte Free-User)
    +-- StripeCheckoutButton (führt zu Stripe Hosted Checkout)
```

**Editor (bestehend, erweitert)**
```
EditorLayout (bestehend)
+-- Toolbar
|   +-- CreditStatusChip (NEU — persistent)
|       +-- Zeigt: "12/25 Credits" + Tier-Badge ("Free", "Pro", "Trial")
|       +-- Bei <20% Credits: Warn-Farbe + "Upgrade"-Mini-CTA
|       +-- Bei 0 Credits + Free: Hard-Block-Indicator
+-- ExportButton (bestehend, erweitert)
|   +-- Vor-Export-Check: Server-Anfrage "darf User exportieren?"
|   +-- Free-Export: Watermark wird in Render-Pipeline aktiviert
|   +-- 0-Credits-Click: öffnet UpgradeModal statt Export
+-- UpgradeModal (NEU, lazy-loaded)
    +-- Aktueller Plan + warum-jetzt-upgraden-Copy
    +-- 3 Tier-Karten
    +-- Trial-CTA ("7 Tage kostenlos testen") nur für Eligible-User
```

**Account-Bereich (bestehend, erweitert)**
```
/account (bestehend)
+-- SubscriptionPanel (NEU)
|   +-- Current-Plan-Karte (Tier-Name, nächstes Renewal, monatliche Kosten)
|   +-- CreditBalance (verfügbar + Rollover mit Verfallsdatum)
|   +-- "Plan ändern / kündigen"-Button → Stripe Customer Portal
+-- UsageLedger (NEU)
|   +-- Tabelle: letzte 30 Tage Exporte (Datum / Projekt-Name / Format / Credit-Quelle)
+-- InvoicesList (NEU)
    +-- Stripe-Hosted-Invoice-Links (PDF-Rechnungen)
```

**Server-Endpoints (neu)**
```
POST /api/business/checkout-session
  -- Erstellt Stripe Checkout Session für gewählten Tier
  -- Setzt success/cancel URLs zurück in den Editor

POST /api/business/portal-session
  -- Redirect zum Stripe Customer Portal (Plan-Wechsel, Kündigung, Karte aktualisieren)

POST /api/business/check-and-burn-credits
  -- DER kritische Endpunkt: läuft synchron VOR jedem Export
  -- Atomar: prüft Credits, bucht ab, gibt OK/NICHT-OK zurück
  -- Bei Free/Trial: liefert auch "watermark: true/false"-Flag an Render-Pipeline

GET /api/business/subscription-status
  -- Liefert aktuellen Tier + Credits + Rollover + Trial-Status für Editor-UI

POST /api/stripe/webhook (BESTEHEND, erweitert)
  -- Neue Event-Handler für:
  -- customer.subscription.created/updated/deleted
  -- invoice.payment_succeeded (löst Credit-Refill aus)
  -- invoice.payment_failed (löst Account-Pause aus)
  -- customer.subscription.trial_will_end (Warn-Email)
```

### B) Datenmodell (plain language)

**Pro User:**
- Aktueller Tier (Free, Starter, Pro, Business, oder Trial-of-X)
- Stripe-Subscription-ID (null bei Free)
- Credit-Counter aktueller Periode + Rollover-Counter aus Vorperiode
- Wann die aktuelle Periode endet
- Wann der Rollover-Bucket verfällt
- Trial-Ende-Datum (falls Trial aktiv)

**Pro Export-Vorgang (Ledger-Eintrag):**
- Wer exportiert hat, wann, welches Projekt, welches Format
- Aus welcher Credit-Quelle gebucht: regulär / Rollover / Overage / Free / Trial
- Bei Overage: Verweis auf Stripe-Invoice-Line-Item

**Pro Projekt-mit-mindestens-einem-Export:**
- Wann das Projekt zum ersten Mal exportiert wurde
- War der erste Export watermarked (User war Free zum Render-Zeitpunkt)?

**Pro Stripe-Webhook-Event (Idempotenz):**
- Stripe-Event-ID + ob er bereits verarbeitet wurde

**Speicherort:** Alles in bestehender Supabase-Postgres-DB. Stripe ist Source-of-Truth für Subscription-State; unsere DB ist eine denormalisierte Spiegelung, die für schnelle Credit-Checks gebraucht wird (sub-100ms-Anforderung).

### C) Tech-Entscheidungen (mit Begründung)

**1. Stripe ist Source-of-Truth für Subscriptions, unsere DB spiegelt nur.**
Wenn Stripe sagt "Abo renewed", feuert ein Webhook, wir aktualisieren unsere DB. Falls die DB jemals out-of-sync läuft, können wir sie aus Stripe rekonstruieren. Verhindert den klassischen "Billing in zwei Systemen, beide falsch"-Fall.

**2. Credit-Check läuft ausschließlich serverseitig, atomar.**
Die Client-UI zeigt den Counter zur Info, aber die echte Abbuchung passiert in einer Datenbank-Transaktion mit Row-Lock. Verhindert: parallele Exports, die beide "noch 1 Credit übrig" sehen und beide durchgehen. Gleiches Pattern wie der bestehende One-Time-Order-Flow.

**3. Watermark wird zum Render-Zeitpunkt entschieden, nicht als separate Datei gespeichert.**
Wir halten KEINE zwei Versionen jedes Exports vor ("mit Watermark" / "ohne"). Stattdessen prüft die Render-Pipeline bei jedem Export den aktuellen User-Tier und rendert entsprechend. Wenn ein Free-User upgradet und einen alten Export erneut runterlädt, erkennt das System "cached file ist watermarked, User ist jetzt Pro" und rendert frisch nach.
**→ Empfehlung für Re-Export-Flow: Lazy / On-Demand**, nicht eager batch-regen. Vermeidet Background-Jobs und Storage-Verdopplung.

**4. Ein Credit = ein Projekt (lifecycle-bound), nicht eine Datei.**
Sobald ein Projekt zum ersten Mal exportiert wurde, sind alle Folge-Exporte gratis. Durchgesetzt über eine "paid projects"-Tabelle — Credit-Abzug findet nur statt, wenn die Projekt-ID dort noch nicht für diesen User drinsteht.

**5. Roll-Over über zwei Buckets, FIFO-Verbrauch.**
Der "Rollover"-Bucket ist eigene Spalte mit eigenem Verfallsdatum. Verbrauch zieht zuerst aus dem Rollover-Bucket, dann aus dem aktuellen. Stripe unterstützt das nicht nativ — wir handeln es in der Webhook-Logik beim Renewal-Event.

**6. Stripe Metered Billing für Overage, nicht eigene Charge-Logik.**
Jeder Export über dem Limit meldet einen Usage-Record an Stripe; Stripe rechnet automatisch bei der nächsten Monatsrechnung ab. Wir starten NIE selbst eine Karten-Abbuchung — das passiert komplett in Stripe.

**7. Free-Tier ist KEIN Stripe-Subscription-Objekt.**
Free heißt einfach: "registrierter User ohne aktives bezahltes Abo". Free-Credits liegen in einer separaten Tabelle mit eigenem Reset-Timer. Spart Stripe-API-Calls für Free-User (die Mehrheit) und macht Free konzeptuell von Paid getrennt.

**8. Credit-Counter-UX: persistent in Editor-Toolbar.**
Nicht erst beim Export-Klick anzeigen. Begründung: Wenn User exportieren will, soll er VORHER wissen "habe noch Credits?", nicht erst am Klick blockiert werden. Gleiches Pattern wie Github Copilot's "X requests left this month" oder Figma's Trial-Counter.

**9. Editor selbst ändert sich NICHT abhängig vom Tier.**
Free, Starter, Pro, Business — alle nutzen denselben Editor mit denselben Features. Nur der Export-Endpoint unterscheidet (Credit-Check, Watermark-Flag, Commercial-License-Flag im Output-Metadata). Das verhindert Editor-Komplexität und macht Upgrade-Conversion-Pfade einfach.

**10. Architektur-Boundary zu PROJ-51 (Landing) und PROJ-52 (Pro-User-Bereich).**
PROJ-50 baut: alle API-Endpoints + Datenmodell + Credit-Status-Chip im Editor + Stripe-Webhook-Erweiterung + Account-Panel-Komponenten (SubscriptionPanel, UsageLedger, InvoicesList).
PROJ-51 wird bauen: die Marketing-Landing `/business` (rein FE) und nutzt `/api/business/checkout-session` von PROJ-50.
PROJ-52 wird bauen: dedizierte Pro-User-Admin-Page mit erweiterten Insights, baut auf den B2B-DB-Tabellen von PROJ-50 auf.

### D) Dependencies (Packages)

Keine neuen NPM-Packages erforderlich:
- `stripe` + `@stripe/stripe-js` — bereits installiert (PROJ-6)
- Watermark-Layer im Render: erweitert bestehende Canvas-Pipeline (`HeadlessRenderBridge`, `poster-from-snapshot.ts`) — kein neues Watermark-Lib
- UI: alle benötigten Komponenten (Card, Badge, Dialog, Toast, Table) bereits via `shadcn/ui` da
- Stripe Tax: keine Library, das ist nur Config im Stripe-Dashboard + Stripe-Customer-Object mit Tax-ID

### E) Risiken & Mitigation

| Risiko | Auswirkung | Mitigation |
|---|---|---|
| Webhook-Ausfall → Subscription-Status veraltet | Kunde zahlt, kriegt aber keine Credits | Stripe-Event-Backfill-Skript (`stripe events list` + Replay), Operator-Alert bei >5 fehlgeschlagenen Webhooks |
| Race-Condition bei parallelem Export | Doppel-Abzug oder Negativ-Credits | DB-Row-Lock + Test mit parallelen Requests vor Launch |
| Watermark-Bypass via Client-Manipulation | Free-User kommt an Clean-Export | Render läuft serverseitig, Client kann Watermark-Flag nicht überschreiben |
| Trial-Abuse mit Mehrfach-Accounts | Mehrere Trials pro Person | Stripe-Customer-Email + Card-Fingerprint-Check; weicher Block (nicht juristisch belastbar, aber praktischer Schutz) |
| Stripe-Tax-Ausfall bei Sign-up | Falsche USt./VAT auf Erstrechnung | Default-Fallback (DE 19%) + Operator-Alert + Re-Validation im Portal |
| Render-Pipeline für Watermark wird zu langsam | Export-Latenz steigt für Free-User | Watermark als simple PNG-Overlay (vorgerendert), kein Live-Compositing der Schrift |

### F) Open Design Decisions (für /frontend zu klären)

Diese Punkte sind bewusst nicht hier architekturiert, weil sie reine Design-/UX-Entscheidungen sind:

- **Watermark-Visual**: Position (welche Ecke?), Größe, Opazität, Text vs. Logo. Empfehlung: kleine Wortmarke "petite-moment.com" unten rechts, ~12 % Opazität, in Brand-Font (Cormorant Garamond) — dezent aber unmissverständlich. Final per Mockup in `/frontend`.
- **Tier-Namen**: "Starter / Pro / Business" als Platzhalter. Kann später durch brand-aligned Namen ersetzt werden (z.B. "Moment / Studio / Atelier"). Beeinflusst nur Stripe-Catalog-Eintrag + UI-Strings.
- **Konkrete Monats-Preise** pro Tier × Currency: blockt nicht die Implementierung (kommt im Stripe-Catalog), aber für PROJ-51 (Landing) nötig.
- **Upgrade-Modal-Copy**: Texte für 0-Credit-Block, Trial-CTA, Watermark-Removal-Pitch — kommt in `/frontend`.
- **IP-Heuristik für Free-Tier-Multi-Accounts**: Empfehlung: vorerst NICHT implementieren (Watermark + Email-Unique-Constraint reichen). Wenn Abuse messbar wird, später nachrüsten.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
