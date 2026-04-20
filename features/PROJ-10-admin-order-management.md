# PROJ-10: Admin-Bestellverwaltung

## Status: In Review
**Created:** 2026-04-19
**Last Updated:** 2026-04-19

## Dependencies
- Requires: PROJ-4 (User Authentication) — Admin-Rolle erforderlich
- Requires: PROJ-6 (Stripe-Bezahlsystem) — Bestellungen kommen aus Stripe Webhook

## User Stories
- Als Admin möchte ich alle eingehenden Bestellungen in einer Übersicht sehen können
- Als Admin möchte ich bei einer neuen physischen Bestellung (Poster, Bilderrahmen) sofort per E-Mail benachrichtigt werden
- Als Admin möchte ich Bestelldetails sehen: Produkt, Größe, Kunde, Lieferadresse, Bestelldatum, Zahlungsstatus
- Als Admin möchte ich den Poster-Export einer Bestellung herunterladen können, um ihn zu drucken
- Als Admin möchte ich eine physische Bestellung als "In Produktion", "Versendet" oder "Abgeschlossen" markieren können
- Als Admin möchte ich bei "Versendet" eine Sendungsnummer eintragen können, die dem Kunden per E-Mail geschickt wird

## Acceptance Criteria
- [ ] Admin-Dashboard zeigt alle Bestellungen in einer Tabelle (neueste zuerst)
- [ ] Tabellenfelder: Bestell-ID, Datum, Kunde (Name/E-Mail), Produkt, Größe, Preis, Status
- [ ] Bestellungen filterbar nach Status (Alle, Offen, In Produktion, Versendet, Abgeschlossen)
- [ ] Klick auf Bestellung öffnet Detailansicht mit Lieferadresse und Poster-Vorschau
- [ ] Detailansicht zeigt Download-Button für den Poster-Export (PNG/PDF) zum Drucken
- [ ] Status einer Bestellung kann geändert werden (Dropdown oder Buttons)
- [ ] Bei Status "Versendet": Eingabefeld für Sendungsnummer + Speichern-Button
- [ ] Kunde erhält automatische E-Mail wenn Status auf "Versendet" gesetzt wird (inkl. Sendungsnummer)
- [ ] Admin erhält E-Mail bei jeder neuen bezahlten Bestellung (Betreff: "Neue Bestellung #ID")
- [ ] Nur Admins haben Zugriff auf diese Seite (403 für alle anderen)

## Edge Cases
- Was passiert, wenn der Admin versehentlich den falschen Status setzt? → Status kann zurückgesetzt werden (außer "Abgeschlossen")
- Was passiert, wenn die E-Mail-Benachrichtigung an den Kunden fehlschlägt? → Fehler wird geloggt, Status-Änderung bleibt trotzdem gespeichert
- Was passiert, wenn ein digitaler Download in der Bestellübersicht erscheint? → Kein "Versenden"-Status, direkt "Abgeschlossen" nach Zahlung
- Was passiert, wenn der Poster-Export-Download aus der Bestellübersicht fehlschlägt? → Fehlermeldung, Admin kann es erneut versuchen

## Technical Requirements
- Nur für Admins zugänglich (`role: "admin"` in Supabase user_metadata)
- Liest aus Supabase `orders` + `order_items` Tabellen (aus PROJ-6)
- E-Mail-Versand via Resend oder Supabase Edge Function
- Poster-Export wird serverseitig aus gespeichertem Poster-Snapshot generiert (oder aus Supabase Storage geladen)
- Route: `/private/admin/orders`

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
