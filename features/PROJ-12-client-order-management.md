# PROJ-12: Client-Order-Management

## Status: Approved
- Reality-Check 2026-05-03: Acceptance Criteria im Code abgedeckt, Status auf Approved gehoben.

**Created:** 2026-04-20
**Last Updated:** 2026-05-03

## Dependencies
- Requires: PROJ-4 (User Authentication)
- Requires: PROJ-5 (Projekt-Verwaltung)
- Requires: PROJ-6 (Stripe-Bezahlsystem)

## User Stories
- Als eingeloggter Kunde möchte ich eine Übersicht meiner bezahlten Bestellungen sehen (`/private/orders`)
- Als Kunde möchte ich digitale Exporte (PNG/PDF) aus vergangenen Bestellungen erneut herunterladen können
- Als Kunde möchte ich meine offenen (noch nicht gekauften) Projekte weiter bearbeiten können
- Als Kunde möchte ich ein bereits gekauftes Projekt nicht mehr versehentlich verändern können
- Als Kunde möchte ich ein gekauftes Projekt als Basis für ein neues Projekt duplizieren können

## Acceptance Criteria
- [ ] Neue Seite `/private/orders` mit Liste aller bezahlten Bestellungen (neueste zuerst)
- [ ] Pro Bestellung: Datum, Gesamtpreis, Item-Titel, Download-Buttons für digitale Dateien
- [ ] Download nutzt bestehende Signed-URL-API (`/api/orders/[id]/exports/[exportId]/download`)
- [ ] Projekte, die in einer bezahlten Bestellung stecken, sind in der DB als `is_locked = true` markiert
- [ ] Im `ProjectDashboard` zeigen gekaufte Projekte ein Schloss-Icon
- [ ] Gekaufte Projekte haben "Duplizieren" statt "Öffnen" → erzeugt editierbare Kopie
- [ ] Link zwischen Projekt und Bestellung wird beim Warenkorb-Add hergestellt (falls Projekt gespeichert)

## Edge Cases
- Anonymer Editor-Stand (kein gespeichertes Projekt) → kein Lock, keine Projekt-Referenz
- User kauft mehrmals das gleiche Projekt → Projekt bleibt locked (idempotent)
- Projekt wird gelöscht nach Kauf → Bestellung bleibt, Projekt-Referenz wird null

## Technical Requirements
- Migration: `projects.is_locked BOOLEAN DEFAULT false`
- Cart-Item trägt optional `projectId` (aus `useEditorStore`)
- Checkout-API propagiert `project_id` in `order.items[n]`
- Webhook setzt `is_locked = true` auf allen Projekten, die in der bezahlten Order referenziert sind
- Route: `/private/orders` (authentifiziert, User sieht nur eigene Orders via RLS)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_Entfällt — während der Umsetzung direkt geklärt_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
