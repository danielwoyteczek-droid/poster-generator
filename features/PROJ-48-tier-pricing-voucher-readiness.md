# PROJ-48: Tier-Pricing & Voucher-Readiness

## Status: Approved
**Created:** 2026-05-14
**Last Updated:** 2026-05-15

## Implementation Notes (Frontend pass)

### Was abgeschlossen ist (Phase 1 + 2)
- **Produktmodell**: ProductId reduziert auf `'download' | 'poster'`. FRAME_MARKUP_PRICE_IDS als separate Const ([products.ts](../src/lib/products.ts)). Helper `getItemLabelKey` + `getItemFallbackLabel` für Backwards-Compat-Display.
- **Tier-Expansion**: Reine Helper-Funktion [tier-expansion.ts](../src/lib/tier-expansion.ts) — expandiert CartItem zu 1-2 Stripe-Line-Items. Testbar ohne DB/Network.
- **Catalog**: [stripe-catalog.ts](../src/lib/stripe-catalog.ts) liefert `{ products, frameMarkup }`. `/api/products` gibt frameMarkup mit aus. Solange die Markup-Prices in Stripe nicht angelegt sind, ist `frameMarkup={}` — UI blendet die Frame-Checkbox automatisch aus.
- **Cart-Store**: `withFrame: boolean` Feld auf CartItem, Zustand-`migrate`-Callback (version 0 → 1) migriert Legacy `productId='frame'` automatisch zu `productId='poster', withFrame: true` beim Hydrate.
- **UI**: Neue gemeinsame Komponente [ProductTierPicker](../src/components/cart/ProductTierPicker.tsx) — 2 Tier-Radios + Frame-Checkbox + Live-Total. Eingesetzt in allen 3 Editoren (Map / Star-Map / Photo), die jetzt nur noch ihren spezifischen Snapshot-Build-Code halten.
- **Checkout-Route**: Akzeptiert `withFrame` in der CartItem-Schema, expandiert zu Stripe-Line-Items via tier-expansion. `priceCents` wird server-seitig autoritativ aus dem Stripe-Catalog berechnet, nicht aus dem Client-Payload geglaubt.
- **Backwards-Compat-Display**: CartView, OrderView, UserOrdersList, AdminOrderDetail und email.ts rendern Legacy `productId='frame'` und neue `productId='poster' + withFrame=true` identisch ("Gerahmtes Poster (schwarz)").
- **i18n**: Neue Keys (`exportTierPosterLabel`, `exportTierPosterDescription`, `exportTierFrameAddonLabel`, `exportTierFrameAddonDescription`, `products.posterFramedLabel`, `products.posterFramedDescription`) in allen 5 Locale-Files (DE/EN/FR/IT/ES) angelegt.
- **Business-Case-Mapping**: [defaults.ts](../src/lib/business-case/defaults.ts) versteht jetzt beide Shapes (Legacy `frame` + neue `poster+withFrame`) und buckets sie identisch nach `frame_<fmt>`. A2-Support mit ergänzt. Unit-Tests erweitert.
- **Homepage-Pricing-Karten**: [PricingSection](../src/components/landing/PricingSection.tsx) iteriert nicht mehr stumpf `PRODUCTS` (würde nur 2 Karten im 3-Spalten-Grid rendern), sondern baut Cards-Array mit synthetischer dritter Karte „Gerahmtes Poster" — Bundle-Preis = Poster + Frame-Markup, compareAt nur wenn Poster eine Rabattbasis hat. Bundle-Karte wird automatisch ausgeblendet, solange `frameMarkup` aus dem Catalog leer ist (gleicher Defensiv-Pattern wie der Tier-Picker im Editor).

### Manuelle Schritte vor Go-Live (Marketing-Side)
1. 3 Stripe-Prices anlegen (`frame_markup_a4`, `frame_markup_a3`, `frame_markup_a2`) im Stripe-Dashboard
2. Die 3 IDs in [src/lib/products.ts](../src/lib/products.ts) FRAME_MARKUP_PRICE_IDS eintragen
3. Cache invalidieren (`stripe-catalog`-Tag) oder 5 min warten
4. Frame-Checkbox erscheint automatisch im Editor

### Was noch fehlt (Phase 3 — Voucher-Funktionalität)
**Wird im `/backend`-Pass gebaut.** Nicht teil dieser Frontend-Arbeit:
- DB-Migration: `orders.discount_code` + `orders.discount_cents`
- API: `POST /api/voucher/validate` (Stripe-Lookup + Validation + Rate-Limit)
- Cart-Store-Erweiterung: `appliedVoucher`-State (sessionStorage-persisted)
- UI: `<VoucherInput>` im CartView
- Checkout-Route: `discounts`-Parameter an Stripe wenn Voucher gesetzt + `allow_promotion_codes` dynamisch togglen
- Webhook: Discount-Daten in Order persistieren

Stripe's `allow_promotion_codes: true` ist bereits aktiv — Marketing kann erste "Gratis Rahmen"-Promos sofort nach Stripe-Price-Setup über Stripe's natives Checkout-Field laufen lassen, ohne auf Phase 3 zu warten.

## Implementation Notes (Backend pass)

### Was Phase 3 fertig hat
- **DB-Migration** `20260514000020_proj48_orders_discount.sql` (auf Live appliziert via `mcp__supabase__apply_migration`): zwei nullable Spalten `orders.discount_code` + `orders.discount_cents` mit Non-Negative-Check und 100-Zeichen-Cap. Bestandsorders bleiben unangetastet.
- **Rate-Limiter** ([src/lib/rate-limit.ts](../src/lib/rate-limit.ts)): in-memory Sliding-Window pro Vercel-Instance, 10 Versuche / 15 Min auf IP-Basis. 4 Unit-Tests in [rate-limit.test.ts](../src/lib/rate-limit.test.ts) decken Limit, Sliding-Expiry und Bucket-Isolation ab.
- **Voucher-Validation-Lib** ([src/lib/voucher-validation.ts](../src/lib/voucher-validation.ts)): pure Funktion gegen Stripe `PromotionCode`, deckt `not_found`/`expired`/`max_reached`/`min_not_met`/`not_applicable`/`currency_mismatch` ab. 11 Unit-Tests, kein Stripe-Mock nötig (fixtures liefern die Stripe-Shapes direkt). Discount-Vorschau berechnet sich aus `percent_off` × applicable_subtotal oder `amount_off` (capped).
- **Validate-API** `POST /api/voucher/validate` ([route.ts](../src/app/api/voucher/validate/route.ts)): Body via Zod, Rate-Limit BEFORE Stripe-Call, expandiert Cart-Items via `tierToStripeLineItems` zu Stripe-Line-Items + resolved Product-IDs (für `applies_to.products`-Check), Stripe-Promotion-Code-Lookup mit `expand: ['data.promotion.coupon']` (API 2026-03-25 verschachtelt Coupon unter `promotion.coupon`).
- **Voucher-Store** ([src/hooks/useVoucherStore.ts](../src/hooks/useVoucherStore.ts)): separater Zustand-Store mit sessionStorage-Persist — überlebt Reload, stirbt mit Browser-Close (per Architektur-Decision).
- **VoucherInput-Komponente** ([src/components/cart/VoucherInput.tsx](../src/components/cart/VoucherInput.tsx)): Input + Apply-Button → angewendete Pill mit Discount-Anzeige + X-Remove. Enter-Key submitten, Error-Message inline mit `role="alert"`, debounce-frei (User klickt explizit Apply).
- **CartView-Erweiterung**: VoucherInput in Summary-Box gerendert, Discount-Zeile zwischen Subtotal und Total mit Code-Label, Total-Cents wird live mit `Math.max(0, subtotal − discount)` berechnet. Voucher fließt im Checkout-Payload als `{ code, promotionCodeId }` mit.
- **Checkout-Route-Update**: wenn Cart-Voucher gesetzt → `discounts: [{ promotion_code }]` + `allow_promotion_codes: undefined` (Stripe-Field deaktiviert, keine Doppel-Eingabe). Voucher-Code wird beim Order-Insert in `orders.discount_code` persistiert; `discount_cents` bleibt 0 bis der Webhook drüber schreibt.
- **Webhook-Update**: extrahiert `session.total_details.amount_discount` (autoritativ) + resolved `discounts[0].promotion_code` via `stripe.promotionCodes.retrieve` zum Code-Namen, schreibt beides in die Order. Bei Fehler beim Resolve bleibt `discount_code` auf dem Pre-Insert-Wert.
- **OrderView-Erweiterung**: zeigt Streichpreis + Discount-Zeile mit Code-Label, wenn `discount_cents > 0`. Cart und Voucher werden bei `success=1` zusammen geleert (`clearCart()` + voucher `remove()`).
- **i18n**: 12 neue Keys (`voucherPlaceholder`, `voucherApply`, `voucherRemoveAria`, `voucherDiscountApplied`, `discountLabel`, plus 6 `voucherError*`-Reasons + `voucherRateLimited` + `voucherGenericError`) in allen 5 Locales (DE/EN/FR/IT/ES).

### Stripe-API-Side
- `allow_promotion_codes: true` bleibt der Default, wenn kein Cart-Voucher vorliegt — Stripe's native UI greift.
- Voucher-Anlage geht weiter über das Stripe-Dashboard: Coupon erstellen (z. B. 100% off, `applies_to.products: ['prod_UVyVOfpeZPvUyo']` = Frame-Markup-Produkt), dann Promotion Code mit menschlich-lesbarem Namen (z. B. `RAHMEN24`) drüber legen.
- Discount-Berechnung im Checkout ist Stripe-autoritativ — unser Client-Preview kann minimal abweichen (Tax, Edge-Cases), aber der Webhook schreibt den echten Wert.

### Bekannte Punkte (akzeptiert für V1)
- **Rate-Limit pro Vercel-Instance**: bei stark horizontaler Skalierung umgehbar. Wenn Promo-Abuse Realität wird → Upstash-Redis-Limiter als Folge-Feature.
- **Voucher überlebt Cart-Änderungen lokal**: Wenn Customer Items entfernt und damit ein `applies_to`-Coupon nicht mehr greift, zeigt die Pill noch das alte Discount-Preview. Stripe rejects beim eigentlichen Checkout — Akzeptabel für V1, ein „revalidate on cart-change"-Hook ist nachrüstbar wenn relevant.
- **`expand: ['data.promotion.coupon']`** verlangt einen extra Stripe-Roundtrip; bei niedrigem Voucher-Volume vernachlässigbar.



## Dependencies
- **Requires PROJ-6** (Stripe-Bezahlsystem) — refactort dessen Produkt- und Checkout-Flow
- **Berührt PROJ-26** (Versandkosten-Management) — Sanity-Check, dass `product_type='frame'` weiter sauber mappt, wenn Frame nur noch Markup-Item ist
- **Berührt PROJ-3** (Poster-Export) — Download-Tier bleibt der Auslieferungs-Hook
- **Berührt PROJ-10** (Admin-Bestellverwaltung) — Order-Detail-View muss neues Cart-Item-Format anzeigen können (Backwards-Compat zu Bestand-Orders mit `productId='frame'`)

## Problem & Ziel
Heute sind Download, Poster und Rahmen drei sich gegenseitig ausschließende Bundle-SKUs ([products.ts:16-46](../src/lib/products.ts#L16-L46)). Frame enthält Poster + Download als Bundle-Preis. Daraus folgen zwei Probleme:

1. **Voucher-Engpass:** Ein Promo-Coupon "Gratis Rahmen" auf den `frame`-SKU verschenkt den Bundle-Preis komplett (inkl. Poster und Download). Es gibt keine Möglichkeit, *nur* den Rahmen-Anteil mit 0 € auszuweisen — die Granularität fehlt im Produktmodell.
2. **UX-Schwäche im Editor:** Drei nebeneinanderstehende Voll-Bundle-Buttons (€9,90 / €24,90 / €54,90) verlangen vom Kunden, die Preisunterschiede selbst auszurechnen. Eine Tier-Auswahl mit Default ist konversionsstärker als drei vermeintlich gleichberechtigte Alternativen.

**Ziel:** Produktmodell so umbauen, dass (a) der Editor eine klare Tier-Wahl mit Default + Frame-Addon anbietet und (b) Stripe-Coupons granular pro Produkt-Komponente angreifen können — ohne eigene Voucher-Engine bauen zu müssen.

## User Stories

### End-Kunde
- Als Kunde will ich im Editor eine klare Wahl zwischen "Digitaler Download" und "Poster (Download inklusive)" haben, damit ich nicht selbst Bundle-Preise vergleichen muss.
- Als Poster-Kunde will ich mit einer einzigen Checkbox "Mit schwarzem Rahmen +€XX" den Rahmen hinzufügen können, ohne ein anderes Produkt auszuwählen.
- Als Kunde will ich unten in der Produktauswahl sofort den finalen Gesamtpreis sehen, auch wenn ich die Frame-Option umstelle.
- Als Kunde mit Rabattcode will ich den Code bereits im Warenkorb eingeben und die Auswirkung sofort sehen — nicht erst auf der Stripe-Seite.
- Als Kunde will ich, dass bei jedem Poster-Kauf der digitale Download automatisch enthalten ist und nach Zahlung sofort verfügbar wird.

### Marketing / Operator
- Als Marketing will ich gezielte Promos wie "Gratis Rahmen", "10 % auf alle Poster" oder "Versandkostenfrei ab 39 €" über Stripe Coupons fahren, ohne dass dafür neuer Code geschrieben werden muss.
- Als Marketing will ich, dass ein "Gratis Rahmen"-Coupon **nur den Rahmen-Aufpreis** nullt, nicht den gesamten Bestellwert.
- Als Operator will ich, dass Bestandsbestellungen (mit altem `frame`-Bundle-SKU) auf der Order-Detail-Seite weiter sauber angezeigt werden.

## Acceptance Criteria

### Editor-UI (ExportTab)
- [ ] ExportTab zeigt eine **Radio-Gruppe mit zwei Optionen**: "Digitaler Download" und "Poster (Download inklusive)"
- [ ] "Poster" ist **default vorausgewählt** (höhere Konversion + Anker auf physisches Produkt)
- [ ] Wenn "Poster" gewählt: eingerückt darunter erscheint eine **Checkbox** "Mit schwarzem Rahmen +€XX,XX"
- [ ] Wenn "Download" gewählt: Rahmen-Checkbox ist nicht sichtbar (oder disabled mit Hinweis "Rahmen nur in Kombination mit Poster")
- [ ] Format-Wechsel (A4 → A3 → A2) aktualisiert alle Preise inkl. Frame-Markup live
- [ ] **Total-Anzeige** am unteren Rand: "In den Warenkorb · €XX,XX" — updated bei jeder Tier-/Frame-Änderung
- [ ] Beim Klick auf "In den Warenkorb" wird das gewählte Tier + Frame-Flag als **ein** CartItem persistiert (nicht 2 Items)

### Mobile (375 px)
- [ ] Radio-Stack rendert vertikal, Frame-Checkbox bleibt unterhalb Poster eingerückt sichtbar
- [ ] Total + "In den Warenkorb"-Button bleiben in der Tap-Sheet (PROJ-43) sticky am unteren Rand
- [ ] Mobile-first laut [feedback_mobile_first.md] — 375 px Viewport von Anfang an verifiziert, nicht "nachträglich angepasst"

### Datenmodell (Cart + Order)
- [ ] **`CartItem`-Schema-Änderung:** `productId` bleibt `'download' | 'poster'` (Enum von 3 auf 2 reduziert); neues Feld `withFrame: boolean` (default false), nur erlaubt wenn `productId='poster'`
- [ ] **Cart bleibt eine Zeile pro Projekt** — Frame ist keine eigene Cart-Zeile, sondern Eigenschaft des Poster-Items
- [ ] **Order-Schema (`orders.items` JSONB) unverändert** — neue Items haben `{ productId:'poster', withFrame:true }`, Bestands-Items mit `productId:'frame'` bleiben gültig und werden via Display-Mapping weiter korrekt angezeigt
- [ ] **localStorage-Migration:** Beim Hydrate werden alte Cart-Items mit `productId='frame'` zu `productId='poster', withFrame:true` umgeschrieben (transparent, kein Customer-Impact)

### Stripe-Prices
- [ ] **3 neue Stripe-Prices anlegen:** `frame_markup_a4`, `frame_markup_a3`, `frame_markup_a2` — Wert = reiner Rahmen-Aufpreis (Marketing-Entscheidung; Spec-Vorschlag €15 / €20 / €30, finale Pricing entscheidet Marketing)
- [ ] Bestehende `download_*`- und `poster_*`-Prices bleiben **unverändert** in Wert und ID — Poster ist weiter Bundle "Druck + Digital"
- [ ] Alte `frame`-Bundle-Price-IDs werden aus `PRODUCTS` entfernt, aber in Stripe **nicht gelöscht** — Bestandsorders sollen referenzierbar bleiben
- [ ] Neuer A2-Rahmen-Price implizit gefordert (Marketing-Entscheidung pro A2-Rahmen: liefert / lagert oder verzichtet)

### Checkout-Route (Tier → Line-Item-Expansion)
- [ ] `POST /api/checkout` expandiert jedes CartItem zu **1 oder 2 Stripe-Line-Items**:
  - `productId='download'` → 1 Item: `download_<fmt>`
  - `productId='poster', withFrame=false` → 1 Item: `poster_<fmt>`
  - `productId='poster', withFrame=true` → 2 Items: `poster_<fmt>` + `frame_markup_<fmt>`
- [ ] Order-Insert speichert das **CartItem-Format** (mit `withFrame`-Flag), nicht die expandierten Line-Items — Single Source of Truth bleibt das CartItem
- [ ] `total_cents` in der Order entspricht der Summe aller expandierten Line-Item-Preise

### Voucher-Eingabe im Cart-View
- [ ] Cart-View hat ein Input-Feld "Rabattcode eingeben" + "Anwenden"-Button (sichtbar unter der Summary-Box)
- [ ] **Neue API:** `POST /api/voucher/validate` mit Body `{ code, items }` → ruft Stripe API ab und prüft:
  - Promotion Code existiert und ist aktiv
  - Nicht abgelaufen, Max-Redemptions nicht erreicht
  - Mindestbestellwert (falls am Coupon konfiguriert) eingehalten
  - Restriktionen auf bestimmte Price IDs (z. B. nur `frame_markup_*` für "Gratis Rahmen") greifen für die aktuellen Cart-Items
- [ ] Bei **gültigem Code**: Cart zeigt zusätzliche Zeile "Rabatt (CODE): −€X,XX", Total wird angepasst, Code-Pill mit X-Button zum Entfernen
- [ ] Bei **ungültigem Code**: Input bleibt sichtbar, lokalisierte Fehlermeldung darunter ("Code ungültig" / "Mindestbestellwert XX € nicht erreicht" / "Code abgelaufen" / "Nicht für diese Produkte gültig")
- [ ] Code-Anwendung ist **session-state** im Cart-Store, nicht persistiert — schließt der Kunde den Browser, ist der Code weg (Sicherheit + Vermeidung verwaister Codes)
- [ ] Bei Eingabe eines Codes: `allow_promotion_codes: false` an Stripe (Stripe-Field wird unterdrückt, sonst doppelte Code-Eingabe möglich). Ohne Cart-Voucher: `allow_promotion_codes: true` bleibt aktiv als Fallback
- [ ] Stripe-Session-Erstellung übergibt bei gültigem Cart-Voucher: `discounts: [{ coupon: <couponId> }]`

### Order-Detail-Anzeige (Backwards-Compat)
- [ ] Order-View ([OrderView.tsx](../src/components/cart/OrderView.tsx)) mappt Display-Labels:
  - `productId='download'` → "Digitaler Download"
  - `productId='poster', withFrame=false` → "Poster"
  - `productId='poster', withFrame=true` → "Gerahmtes Poster (schwarz)"
  - `productId='frame'` (Legacy) → "Gerahmtes Poster (schwarz)" — Bestandsorders bleiben sauber
- [ ] Order-View zeigt **eine Zeile pro Projekt** (collapsed), nicht die 2 Stripe-Line-Items separat
- [ ] Falls Voucher angewendet wurde, zeigt Order-View die Rabattzeile sichtbar (aus `orders.metadata.discount_code` o. ä. — Stripe-Webhook persistiert das)

### i18n
- [ ] Alle neuen UI-Strings (Tier-Labels, Frame-Checkbox-Text, Voucher-Input-Placeholder, Voucher-Fehlermeldungen) sind über `next-intl` lokalisiert (DE / EN / FR / IT / ES)
- [ ] Voucher-Fehlermeldungen kommen aus Backend mit Locale-Hint, sodass die Übersetzung serverseitig erfolgt

## Edge Cases
- **Customer ändert printFormat von A3 → A2, hat aber Rahmen aktiv**: Wenn A2-Rahmen-Price existiert → Frame-Wahl bleibt aktiv mit neuem Preis. Wenn A2-Rahmen nicht verfügbar (z. B. Price im Stripe-Catalog fehlt) → Frame-Häkchen wird auto-gelöscht mit Toast "Rahmen für A2 nicht verfügbar".
- **Customer entfernt Cart-Items, sodass Mindestbestellwert des angewendeten Codes nicht mehr erreicht**: Code wird automatisch entfernt mit Toast "Rabattcode nicht mehr gültig — Mindestbestellwert XX €".
- **Alter Cart in localStorage mit `productId='frame'`** wird beim Hydrate auf `productId='poster', withFrame:true` migriert. Kein UI-Hint nötig, transparent.
- **Bestandsbestellungen mit `productId='frame'`** auf der Admin-Order-Liste (PROJ-10) und Customer-Order-Detail-Seite rendern weiter "Gerahmtes Poster" — Display-Mapping ist im View-Layer, nicht in der DB.
- **Customer spammt ungültige Codes**: Rate-Limit auf `/api/voucher/validate` (10 Versuche pro IP/15 Min) — verhindert Bruteforce auf Promotion-Code-Namen.
- **Stripe-Coupon mit `applies_to.products = [<frame_markup_a4>]`, aber Customer hat nur Download im Cart**: API antwortet "Code für diese Produkte nicht gültig" — Code wird nicht akzeptiert.
- **Customer entfernt manuell den Code-Pill, wendet dann anderen Code an**: Funktioniert, zweite Validation läuft frisch durch.
- **Promotion-Code ist gültig, aber Stripe-Checkout schlägt fehl (Karte abgelehnt)**: Customer kehrt zum Cart zurück — Code bleibt im Cart-State angewendet (UX: er muss nicht erneut eintippen).
- **Customer entfernt das Poster und behält nur Download im Cart**: `withFrame=true` ist nicht mehr relevant (Frame-Checkbox unsichtbar). Beim Re-Add eines Posters startet Frame-Flag wieder bei false (kein "Sticky"-Frame).
- **Customer kauft Download solo + Poster (anderes Projekt) im selben Checkout**: Stripe-Session hat 2 Line-Items aus 2 CartItems. Voucher "10 % auf Poster" greift nur auf das Poster-Item. Funktioniert mit Stripes `applies_to`-Logik.

## Non-Goals (Out of Scope)
- **Custom Voucher-Tabelle in Supabase**: personalisierte Codes pro Kunde, "erste Bestellung"-Rabatte, Wiederkäufer-Logic → späteres Feature (eigene PROJ-ID, TBD)
- **Geschenkgutscheine mit Guthaben** (Wertkarten, anteilig einlösbar) → späteres Feature
- **Voucher als verkäufliches Produkt** (Geschenkgutschein im Shop) → späteres Feature
- **Multi-Frame-Varianten** (weiß, eiche, …): Aktuell nur schwarz. Wenn weitere Rahmenfarben kommen, wird das Datenmodell um `frame_color` erweitert (eigenes Feature).
- **Refund-Logic für teil-angewendete Coupons**: Refunds laufen heute über Stripe-Dashboard manuell. Coupon-bezogene Refund-Edge-Cases werden ad-hoc behandelt, kein UI-Tooling in V1.
- **Server-seitige Rate-Limit-Persistierung über Memcache/Redis**: V1 nutzt einfachen In-Memory-Counter pro Instance. Wenn Promo-Abuse Realität wird, kann ein robusterer Limiter nachgezogen werden.

## Decisions (vor Architecture festgelegt)
- **Download immer kostenlos bei Poster-Kauf**: Poster-Price ist Bundle "Druck + Digital", kein separates Line-Item für Download bei Poster-Bestellungen. Stripe-Quittung zeigt eine Zeile "Poster A4 – €24,90". Marketing-Sprache: "Digitaler Download inklusive."
- **Frame als Sub-Option unter Poster, nicht als Top-Level-Wahl**: Reduziert die Top-Level-Optionen von 3 auf 2; macht den Frame-Entscheid sequentiell *nach* Poster-Commit (höhere Conversion).
- **CartItem-Modell: `withFrame:boolean`-Flag** statt neuer `productId`-Enum-Wert. Einfacher zu migrieren, klarere Semantik ("Poster mit Rahmen" = Poster-Variante, nicht neues Produkt).
- **A2-Rahmen wird mit angelegt**: Marketing-Entscheidung, akzeptiert dass Lieferant/Lager A2-Rahmen führen muss. Neuer `frame_markup_a2`-Price in Stripe.
- **Voucher-Eingabe im Cart, nicht im Stripe-Checkout-Field**: Bessere UX (sofortige Discount-Vorschau im Cart), aber mehr Code (eigener Validation-Endpoint, Cart-Store-State, Fehler-UX). Stripes `allow_promotion_codes` wird dynamisch deaktiviert, wenn Cart-Voucher bereits gesetzt — keine doppelte Eingabe-Möglichkeit.
- **Cart-Voucher-State in localStorage** (nicht in Supabase persistiert). _QA-Revision 2026-05-15:_ ursprünglich sessionStorage geplant, aber das war tab-lokal (QA Bug #2). Jetzt localStorage — konsistent mit dem Warenkorb selbst, sichtbar über Tabs hinweg. Gegen verwaiste Codes: CartView re-validiert den Voucher beim Mount gegen `/api/voucher/validate` und verwirft ihn still, wenn er nicht mehr greift; OrderView leert ihn nach erfolgreichem Checkout.

## Technical Requirements
- **Performance**: `POST /api/voucher/validate` < 500 ms (Stripe-API-Call zum Promotion-Code-Lookup)
- **Rate-Limit**: 10 Validate-Requests pro IP / 15 Min (Anti-Bruteforce auf Promotion-Code-Namen)
- **Stripe-Konfig**: bestehende Coupons + Promotion Codes als Domain-Konzept; `allow_promotion_codes` opt-out wenn Cart-Voucher gesetzt, opt-in sonst
- **Backwards-Compat**: Order-View und Admin-Order-Liste mappen Legacy-`productId='frame'` korrekt auf "Gerahmtes Poster"
- **i18n**: Alle neuen Strings + Fehlermeldungen über `next-intl` (DE/EN/FR/IT/ES)
- **Mobile-first**: ExportTab + Cart-Voucher-Input ab 375 px Viewport ohne Layout-Bruch
- **Security**: Voucher-Validation rein server-seitig (Stripe-API mit Service-Key, niemals Stripe-Coupon-IDs zum Client leaken außer der Anzeige-Beleg)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Gesamtablauf (3-Phasen-Rollout)

```
Phase 1: Stripe-Konfig + Produktmodell-Refactor (unsichtbar)
   +-- 3 neue Markup-Prices in Stripe Dashboard anlegen (frame_markup_a4/a3/a2)
   +-- PRODUCTS-Katalog in der App umstellen (frame → poster+withFrame-Flag)
   +-- CartItem-Schema-Migration: alte frame-Items in localStorage werden zu poster+withFrame
   +-- Display-Mapping für Bestandsorders (productId='frame' → "Gerahmtes Poster")
             |
             v

Phase 2: Editor-UI-Refactor (sichtbar für Customer)
   +-- ExportTab: Radio-Stack mit 2 Tiers + Frame-Checkbox
   +-- Mobile (Tap-Sheet): selbe Logik, 375px-verifiziert
   +-- Total-Anzeige reagiert live auf Tier-/Frame-Änderung
   +-- Cart-Item-Insert verwendet neues Schema (poster+withFrame)
   +-- Checkout-Route expandiert CartItem zu 1-2 Stripe-Line-Items
             |
             v

Phase 3: Voucher-Funktionalität (Monetarisierungs-Hebel)
   +-- DB: 2 neue Spalten auf orders (discount_code, discount_cents)
   +-- Neue API: POST /api/voucher/validate
   +-- Cart-View: Code-Input + Live-Preview + Pill mit Remove-Button
   +-- Checkout-Route: bei aktivem Code discounts-Parameter an Stripe
   +-- Webhook: Discount-Daten in Order persistieren
   +-- Rate-Limit auf Validate-Endpoint
```

**Wichtige Reihenfolge:** Phase 1 + 2 müssen zusammen rollen (kein "halber Refactor"). Phase 3 ist additiv und kann separat deployt werden — die ersten "Gratis Rahmen"-Promos sind dann ohne Code-Change möglich, sobald Phase 1+2 live ist und Stripes nativer Promo-Code-Field im Checkout reicht. Eigene Cart-Voucher-UI ist Phase 3.

### B) Komponenten-Struktur

```
poster-generator
│
├── supabase/migrations/
│   └── add_discount_to_orders                ← NEU: orders.discount_code + orders.discount_cents
│
├── src/lib/
│   ├── products.ts                           ← MODIFIZIERT: ProductId-Enum auf 'download'|'poster' reduziert,
│   │                                              frame_markup_a4/a3/a2 als separate Stripe-Price-IDs
│   ├── stripe-catalog.ts                     ← MODIFIZIERT: catalog umfasst auch frame_markup-Prices
│   └── tier-expansion.ts                     ← NEU: tierToStripeLineItems(productId, withFrame, format)
│                                                  reine Helper-Funktion ohne DB-Zugriff
│
├── src/app/api/
│   ├── checkout/route.ts                     ← MODIFIZIERT: CartItem → Line-Items expandieren,
│   │                                              Discount-Parameter setzen wenn Cart-Voucher gesetzt
│   ├── voucher/
│   │   └── validate/route.ts                 ← NEU: POST { code, items } → Stripe-API-Lookup + Validation
│   └── stripe/webhook/route.ts               ← MODIFIZIERT: amount_discount + promotion_code
│                                                  aus Session-Daten in orders persistieren
│
├── src/components/sidebar/
│   └── ExportTab.tsx                         ← MODIFIZIERT: Customer-View zeigt
│                                                  2 Radio-Optionen + Frame-Checkbox
│
├── src/components/cart/
│   ├── CartView.tsx                          ← MODIFIZIERT: Voucher-Input-Sektion
│   ├── VoucherInput.tsx                      ← NEU: Code-Eingabe + Validation-Anbindung + Pill
│   └── OrderView.tsx                         ← MODIFIZIERT: Backwards-Compat-Mapping +
│                                                  Discount-Zeile bei eingelöstem Code
│
└── src/hooks/
    ├── useCartStore.ts                       ← MODIFIZIERT: withFrame-Flag, voucher-State,
    │                                              persist-Migration für alte 'frame'-Items
    └── useVoucherValidation.ts               ← NEU: Client-Hook mit Debouncing + Error-Mapping
```

### C) Datenmodell

**`CartItem` (Cart-Store) — Schema-Änderung:**
- `productId` reduziert auf `'download' | 'poster'` (war: `'download' | 'poster' | 'frame'`)
- Neues Feld `withFrame: boolean` (default false, nur valide wenn productId='poster')
- Alle anderen Felder bleiben

**Cart-Store-Erweiterung (Voucher-State):**
- `appliedVoucher: { code: string, couponId: string, discountCents: number } | null`
- Aktionen: `applyVoucher(...)`, `removeVoucher()`, `revalidateVoucher()`

**Wo gespeichert:**
- CartItems: weiter localStorage (Zustand `persist`), Survive-Reload + Browser-Close (heutiges Verhalten)
- Voucher-State: **sessionStorage** (überlebt Reload, stirbt mit Browser-Close — laut Spec-Decision)
- Diese Trennung erlaubt es, dass der Customer weiter seinen Cart sieht, aber den Code beim nächsten Besuch neu eingeben muss

**DB-Änderungen (`orders`-Tabelle):**
- Neue Spalte `discount_code` (text, nullable) — der Promotion-Code-Name wie eingegeben (z. B. "FRAMEFREE")
- Neue Spalte `discount_cents` (integer, default 0) — der tatsächlich abgezogene Betrag aus Stripe
- Beide Spalten werden vom Webhook geschrieben, nicht beim Order-Insert
- RLS: bestehende Order-RLS gilt weiter, keine neue Policy nötig

**Bestands-Items in `orders.items` JSONB:**
- Keine Migration. Alte Items mit `productId='frame'` bleiben unverändert
- View-Layer (OrderView, Admin-Bestellliste) mappt Legacy auf Display-Label

### D) Tech-Entscheidungen (mit Begründung)

| Entscheidung | Begründung |
|--------------|-----------|
| **`withFrame: boolean` statt eigener Enum-Wert** (`poster_framed`) | Ein Rahmen ist eine Variante des Posters, nicht ein eigenes Produkt. Boolean spart einen Migrations-Layer und macht Display-Mapping trivial ("if withFrame then 'Gerahmtes Poster' else 'Poster'"). |
| **Tier-Expansion in einer reinen Helper-Funktion** (`tier-expansion.ts`) | Testbar in Unit-Tests, deterministisch, kein DB-Zugriff. Caller (Checkout-Route) übergibt CartItems, Funktion liefert Stripe-Line-Item-Array. Auch im Cart-Display nutzbar für Preis-Vorschau-Logik. |
| **Voucher-State in sessionStorage** | Hits den Mittelweg: überlebt versehentliche Reloads (kein Frust), stirbt mit Browser-Close (kein "stale-Code-Problem", wenn Customer Tage später wiederkommt). LocalStorage wäre zu sticky, In-Memory-only zu fragil. |
| **Stripe `promotion_code`-Parameter statt `coupon`** | Erlaubt Stripe-Dashboard, die Einlösungen je Code-Name zu tracken (z. B. "FRAMEFREE wurde 47× eingelöst"). Coupon-Parameter würde nur die abstrakte Discount-Definition tracken. Marketing braucht Code-Level-Reporting. |
| **`allow_promotion_codes` dynamisch deaktivieren** wenn Cart-Voucher gesetzt | Vermeidet doppelte Eingabe (im Cart und in Stripe). Wenn kein Cart-Code: Stripe-Field bleibt offen als Fallback. Kein Verlust an Promo-Funktionalität. |
| **In-Memory-Rate-Limit pro Vercel-Instance** für `/api/voucher/validate` | V1-Ausreichend. Vercel skaliert Functions horizontal, also kann ein böser Akteur das Limit umgehen, indem er Glück mit unterschiedlichen Instances hat. Aber: 10/min reichen, um zufällige Brute-Force-Bot-Versuche zu blockieren. Wenn echter Abuse Realität wird → Upstash-Redis-Limiter (Folge-Feature). |
| **localStorage-Migration für alte 'frame'-Cart-Items** via Zustand `persist.migrate`-Callback | Zustand bietet eine eingebaute Versions-Migration-API. Beim Hydrate wird die Schema-Version geprüft; alte Items werden transparent zu neuem Schema gemappt. Customer merkt nichts. |
| **Bestandsorders nicht migrieren**, nur Display-Mapping anpassen | Order-Records sind unveränderlich (Buchhaltungssicht). Display-Mapping ist 3 Zeilen Code, eine DB-Migration wäre Overkill. Pattern bewährt sich bereits in PROJ-7 / PROJ-32. |
| **Keine eigene Voucher-Tabelle** (alles in Stripe) | Stripe Coupons + Promotion Codes decken 90 % der Promo-Use-Cases ohne neue Infrastruktur ab. Eigene Voucher-Tabelle erst, wenn personalisierte Codes/Wertkarten/erste-Bestellung-Logik konkret gebraucht werden. Premature-Abstraction vermeiden. |
| **Voucher-Input mit Debouncing** (300ms) statt Sofort-Validation pro Tastenanschlag | Vermeidet API-Spam beim Tippen ohne dem Customer das Gefühl zu geben, dass nichts passiert. Trigger erst nach Tipp-Pause. |
| **Frame-Markup-Preise sind Marketing-Entscheidung, nicht Code-Entscheidung** | Stripe-Dashboard ist Quelle der Wahrheit. Code zieht die Preise via `getProductCatalog()` (bestehender Mechanismus). Marketing kann jederzeit anpassen ohne Deploy. |

### E) Voucher-Validation-Flow (Server-Logik, plain language)

```
Client sendet { code: "FRAMEFREE", items: [cart-items] }
   |
   v
1. Rate-Limit-Check (10 Versuche / 15 Min pro IP)
   → bei Überschreitung: 429 Too Many Requests
   |
   v
2. Stripe Promotion Code Lookup (filter: code, active=true)
   → wenn nicht gefunden: { valid: false, reason: 'not_found' }
   |
   v
3. Coupon-Restriktionen prüfen:
   - Coupon ablaufdatum: < now → expired
   - Coupon max_redemptions vs. times_redeemed → max_reached
   - Coupon min_amount: cart-subtotal < min → min_not_met
   - Coupon applies_to.products: cart-items haben keine passende Price-ID → not_applicable
   |
   v
4. Discount-Betrag berechnen:
   - %-Coupon: percent_off × applicable_subtotal
   - Fixed-Coupon: fixed_amount, cap auf applicable_subtotal
   - applicable_subtotal = nur die Line-Items, die unter applies_to.products fallen
   |
   v
5. Response:
   {
     valid: true,
     code: "FRAMEFREE",
     couponId: "coupon_xyz",
     promotionCodeId: "promo_abc",
     discountCents: 1500,
     reason: null
   }
   |
   v
Client speichert in cart-store voucher-state, Cart-View rerendert mit Discount-Zeile
```

Wichtig: Die Validation auf dem Server ist **autoritativ**, nicht der Client. Wenn ein böser Client einen Code manipuliert, prüft Stripe beim eigentlichen Checkout nochmal. Wir schreiben den finalen `discount_cents` aus der Stripe-Webhook-Response in die Order — nicht den vom Client gemeldeten Wert.

### F) Stripe-Checkout-Session-Erstellung (Phase 2 + 3)

Beim `POST /api/checkout`:

1. CartItems aus Request validieren
2. Pro CartItem: `tierToStripeLineItems(productId, withFrame, format)` aufrufen → 1 oder 2 Stripe-Line-Items je Cart-Zeile
3. Wenn Request `voucher.promotionCodeId` enthält:
   - `discounts: [{ promotion_code: <promotionCodeId> }]` setzen
   - `allow_promotion_codes: false` setzen
4. Sonst:
   - Kein `discounts`-Parameter
   - `allow_promotion_codes: true` (bestehendes Verhalten)
5. Stripe-Session-Create wie bisher, Session-ID in Order speichern
6. Order-Insert speichert das **rohe CartItem-Format** (productId, withFrame, format) — nicht die expandierten Line-Items. Single Source of Truth ist das Cart-Item.

**Beispiel-Mapping CartItem → Stripe-Line-Items:**

| CartItem | Stripe-Line-Items |
|----------|-------------------|
| `{productId:'download', format:'a4'}` | 1× `download_a4` |
| `{productId:'poster', format:'a4', withFrame:false}` | 1× `poster_a4` |
| `{productId:'poster', format:'a4', withFrame:true}` | 1× `poster_a4` + 1× `frame_markup_a4` |

### G) Webhook-Erweiterung (Phase 3)

Beim `checkout.session.completed`-Event:
- Bisheriges Update läuft weiter (status='paid', shipping_address, etc.)
- **Neu:** `session.total_details.amount_discount` → `orders.discount_cents`
- **Neu:** `session.discounts[0].promotion_code` → resolve via Stripe-API zum Code-Namen → `orders.discount_code`
- Bei fehlenden Feldern (kein Discount): beide bleiben default (null / 0)

### H) Order-View-Display (Backwards-Compat + Discount-Zeile)

Display-Mapping in [OrderView.tsx](../src/components/cart/OrderView.tsx) + [CartView.tsx](../src/components/cart/CartView.tsx):

| Gespeicherter Item-State | Anzeige-Label |
|--------------------------|---------------|
| `productId='download'` | "Digitaler Download" |
| `productId='poster', withFrame=false` (neu) | "Poster" |
| `productId='poster', withFrame=true` (neu) | "Gerahmtes Poster (schwarz)" |
| `productId='frame'` (Legacy-Order vor Phase 1) | "Gerahmtes Poster (schwarz)" |

Discount-Zeile in der Summary-Box:
- Subtotal (vor Rabatt)
- "Rabatt (CODE): -€X,XX" (nur wenn discount_cents > 0)
- Versand (PROJ-26 später)
- Total

### I) Migrations-Strategie

**Cart-LocalStorage (Customer-Side):**
- Zustand `persist`-Middleware unterstützt Versionierung via `version`-Field
- Aktuelle Version (implizit 0) → neue Version 1
- `migrate(oldState, version)`: wenn Item mit `productId='frame'` → wird zu `{ productId: 'poster', withFrame: true }`, alle anderen Felder bleiben
- Beim ersten Cart-Laden nach Deploy passiert die Migration transparent

**DB-Migration:**
- Single Migration-File `add_discount_to_orders` legt 2 nullable Columns an
- Bestandsorders bleiben gültig (alle null bzw. 0)
- Kein Backfill nötig — Discounts gab's vorher nicht

**Stripe-Side:**
- Manuelle Anlage von 3 neuen Prices im Stripe-Dashboard (Marketing-Step, nicht Code-Step)
- Alte `frame`-Bundle-Price-IDs bleiben in Stripe (active), werden aus `PRODUCTS`-Katalog entfernt
- Bestehende Orders mit alten Price-IDs sind referenzierbar (Stripe-Dashboard zeigt sie weiter korrekt)

### J) Abhängige Packages

**Keine neuen Dependencies.** Alle benötigten Libraries sind bereits installiert:
- `stripe` (Server) — Promotion-Code-Lookup, Discount-Validation, Session-Create
- `zustand` + `zustand/middleware` — Cart-Store + Migration
- `zod` — Body-Validation für `/api/voucher/validate`
- `next-intl` — Lokalisierte Fehlermeldungen
- `lucide-react` — Icons (TagIcon für Voucher-UI)
- shadcn/ui — Input, Button, Badge für Voucher-UI

### K) Risiken / Offene Punkte

- **Code-Collision-Risiko:** Wenn Marketing einen Code "DOWNLOAD" anlegt, könnte Customer denken, das ist ein Produktname. Empfehlung: Marketing-Convention für Codes (z. B. immer mit Aktion + Saison, "RAHMEN24" statt "FREE") — keine technische Schutzmaßnahme nötig, nur Style-Guide.
- **Rate-Limit-Bypass über IP-Wechsel:** In-Memory-Limit ist nicht bullet-proof. V1 akzeptiert das Risiko. Wenn Promo-Abuse zum Problem wird → Upstash-Redis-Limiter mit Customer-ID-Anchor (statt nur IP) als Folge-Feature.
- **Discount-Berechnung bei `applies_to.products` und Multi-Cart**: Wenn Cart Download + Poster+Frame enthält und Code nur `frame_markup_*` gilt, wird der Rabatt nur auf den Frame-Anteil angewendet. Stripe rechnet das beim Checkout autoritativ; unser Client-Preview-Wert kann minimal abweichen (z. B. wegen Tax-Sub-Total). Akzeptabel — Webhook-Daten sind die Wahrheit.
- **Webhook-Resolve von Promotion-Code-ID zu Name:** Stripe-Session enthält `discounts[].promotion_code` als ID, nicht als Name. Webhook muss einen zusätzlichen Stripe-API-Call machen, um den Code-Namen zu bekommen. Tradeoff zwischen Webhook-Latenz und Datenqualität; bei niedrigem Order-Volumen V1 vernachlässigbar.
- **i18n für Voucher-Fehlermeldungen:** Backend antwortet mit `reason: 'min_not_met'` etc. — Client mappt das auf lokalisierte Texte via `next-intl`. Single Source of Truth für Reason-Keys ist eine Konstante im API-Code, von beiden Seiten importiert. Wenn neue Restriktionen dazukommen (z. B. "customer_only"), muss der Reason-Key auch in i18n-Files ergänzt werden.
- **Stripe-Test-vs-Live-Mode-Codes:** Test-Coupons funktionieren nur mit Test-Mode-Session, Live mit Live. Bei Dev-Tests im Live-Mode würden Test-Codes als "not_found" zurückkommen. Akzeptabel, Dev-Test-Convention. Marketing sollte beide Modi parallel pflegen oder ein "DEV-only"-Banner sehen.
- **Frame-Verfügbarkeit pro Format:** Spec sagt A2-Rahmen kommt mit. Marketing-Side: A2-Rahmen muss tatsächlich beim Lieferanten/Lager verfügbar sein, sonst kommt es zu Bestellungen ohne Erfüllbarkeit. Operativer Punkt, nicht technischer.

## QA Test Results

**QA-Datum:** 2026-05-15
**Methodik:** Code-Audit gegen Acceptance Criteria, API-Smoke-Tests (curl), Playwright-E2E, Supabase-Security-Advisor-Scan. Voller Browser-E2E des Editor→Cart→Stripe-Flows entfällt (WebGL-Flakiness + externer Stripe-Redirect) — stattdessen Code-Audit + manuelle Verifikation in vorigen Sessions.

### Acceptance Criteria

| Bereich | Status | Nachweis |
|---------|--------|----------|
| Editor: 2 Radio-Tiers, Poster default | ✅ Pass | Code-Audit `ProductTierPicker` (`TIER_ORDER`, `useState('poster')`) |
| Editor: Frame-Checkbox nur bei Poster | ✅ Pass | Code-Audit (`isActive && frameAddonAvailable`) |
| Editor: Live-Total + Format-Wechsel | ✅ Pass | Code-Audit (`useMemo`-Recompute über `basePrice`/`frameMarkupPrice`) |
| Datenmodell: `withFrame`-Flag | ✅ Pass | Code-Audit `CartItem` |
| Datenmodell: localStorage-Migration Legacy `frame` | ✅ Pass | Code-Audit `useCartStore.migrate` v0→1 |
| Stripe: 3 Frame-Markup-Prices A4/A3/A2 | ✅ Pass | Live angelegt, `/api/products` liefert `frameMarkup` |
| Checkout: Tier→1-2 Line-Items | ✅ Pass | Live-Stripe-Session-Inspektion zeigt 2 Line-Items bei Frame-Tier |
| Voucher: Validate-API | ✅ Pass | 8/8 Input-Validierungs-Smokes → 400; `RAHMEN24`-Live-Test korrekt |
| Voucher: `applies_to.products`-Restriktion | ✅ Pass | `RAHMEN24` valid nur mit Frame im Cart, sonst `not_applicable` |
| Voucher: Rate-Limit 10/15min | ✅ Pass | Smoke: ab 11. Hit → HTTP 429 mit `Retry-After` |
| Voucher: `allow_promotion_codes` dynamisch + `discounts`-Param | ✅ Pass | Code-Audit Checkout-Route |
| Webhook: Discount-Persistierung | ✅ Pass | Code-Audit (`total_details.amount_discount` + Code-Resolve) |
| Order-Anzeige: Legacy-`frame`-Mapping + Discount-Zeile | ✅ Pass | Code-Audit `OrderView`/`getItemLabelKey` |
| Cart: Frame als Sub-Zeile | ✅ Pass | Code-Audit `CartView` (Markup-Split aus Catalog) |
| i18n: 5 Locales | ✅ Pass | Alle neuen Keys in DE/EN/FR/IT/ES |
| Mobile 375px verifiziert | ⚠️ Nicht in diesem Pass browser-verifiziert | `ProductTierPicker` ist vertikaler Flex-Stack ohne Fixbreiten, läuft im bestehenden PROJ-43-Tap-Sheet — Risiko niedrig, aber manuelle 375px-Sichtprüfung empfohlen vor Deploy |

### Automatisierte Tests
- **PROJ-48-Unit-Tests:** `voucher-validation.test.ts` (11) + `rate-limit.test.ts` (4) — grün bei isolierter Ausführung.
- **E2E:** `tests/PROJ-48-tier-pricing-voucher.spec.ts` — 7/7 grün (Catalog-Shape, Voucher-API-Validierung).
- **⚠️ Infra-Issue (nicht PROJ-48):** `npm test` (Full-Suite) bricht ab — alle 21 Test-Files scheitern mit `vitest-pool`-Worker-Timeout. Betrifft das gesamte Repo, nicht PROJ-48-Code; PROJ-48-Tests laufen einzeln/gezielt grün. Sollte als eigenes Infra-Ticket behandelt werden.

### Security-Audit
- **Supabase-Advisor:** 0 neue Advisories durch die PROJ-48-Migration. `orders`-Tabelle erscheint nicht in der `rls_enabled_no_policy`-Liste → RLS intakt, neue Discount-Spalten erben die bestehenden Row-Policies.
- **Rate-Limiting:** funktioniert (10/15min pro IP, 429 + `Retry-After`).
- **Client-Trust:** Checkout-Route vertraut der Client-`promotionCodeId`, aber Stripe validiert den Promotion Code autoritativ bei Session-Erstellung — kein Exploit (Worst Case: €0 Discount).
- **XSS:** `discount_code` ist beim Order-Insert Client-Input, wird aber vom Webhook mit dem Stripe-validierten Code-Namen überschrieben; React escaped beim Rendern. Kein Risiko.
- **Secrets:** kein Leak; `STRIPE_SECRET_KEY` bleibt server-seitig.

### Gefundene Bugs

| # | Schwere | Beschreibung | Status |
|---|---------|--------------|--------|
| 1 | Low | **Stale `discount_code` bei 0-Discount.** Wenn eine Order mit Voucher angelegt wird, der Webhook aber `amount_discount=0` empfängt, blieb der beim Insert gespeicherte `discount_code` stehen während `discount_cents=0`. | ✅ **Fixed 2026-05-15** — Webhook nullt `discount_code` explizit, wenn `discount_cents=0`. |
| 2 | Low | **Voucher-State war tab-lokal.** `sessionStorage` ist pro Tab — Cart in neuem Tab zeigte den Code nicht. | ✅ **Fixed 2026-05-15** — Store auf `localStorage` umgestellt; CartView re-validiert den Voucher beim Mount und verwirft ihn still, wenn er nicht mehr greift. |
| 3 | Low / Beobachtung | **Rate-Limit-Bucket pro IP.** Kunden hinter geteilter NAT/Office-IP teilen sich 10 Voucher-Versuche/15min. | ⏭️ **Akzeptiert / Backlog** — "Fix" = verteiltes Rate-Limiting via Upstash Redis (neue kostenpflichtige Dependency). Spec führt das bewusst als Folge-Feature; für Boutique-Traffic unkritisch. |

**Keine Critical- oder High-Bugs.** Bug #1 + #2 im Deploy-Vorlauf gefixt; #3 bewusst als Backlog-Item akzeptiert.

### Production-Ready-Einschätzung: **READY**

Keine Critical/High-Bugs. Bug #1 + #2 behoben und verifiziert (Typecheck clean, Build grün, 15 Unit- + 7 E2E-Tests grün). Vor Deploy empfohlen:
1. **Manuelle 375px-Sichtprüfung** des Tier-Pickers in allen 3 Editoren (AC formal nicht in diesem Pass browser-verifiziert).
2. Optionaler Cleanup: `vitest-pool`-Timeout als eigenes Infra-Ticket aufnehmen.

## Deployment
_To be added by /deploy_
