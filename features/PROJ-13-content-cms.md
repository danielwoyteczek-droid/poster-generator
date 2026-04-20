# PROJ-13: Content CMS (Sanity) für Legal, Blog, About, FAQ

## Status: In Progress
**Created:** 2026-04-20
**Last Updated:** 2026-04-20

## Dependencies
- Requires: PROJ-4 (User Authentication) — Admin-Rolle für Studio-Zugang
- Requires: PROJ-11 (Homepage) — Footer integriert Legal-Links

## User Stories

### Betreiber (Admin)
- Als Admin möchte ich rechtliche Seiten (Impressum, Datenschutz, AGB, Widerruf, Cookie-Richtlinie) im CMS pflegen
- Als Admin möchte ich Blog-Artikel schreiben und veröffentlichen (SEO-optimiert)
- Als Admin möchte ich FAQs erstellen, gruppieren und sortieren
- Als Admin möchte ich die About-Seite verwalten
- Als Admin möchte ich im Studio mit einem Rich-Text-Editor (Portable Text) arbeiten — mit Standardblöcken wie Überschriften, Listen, Links, Bildern, Trennlinien

### Besucher / Kunde
- Als Besucher möchte ich über den Footer jederzeit auf rechtliche Seiten zugreifen können
- Als Besucher möchte ich im Blog stöbern und einzelne Artikel lesen können (mit SEO-Titeln, Metadaten, Open Graph)
- Als Besucher möchte ich eine FAQ-Seite haben, die meine Fragen beantwortet (auch für KI-Suche / structured data optimiert)

## Acceptance Criteria
- [ ] Sanity Studio embedded unter `/studio` (Zugang über Sanity-Auth)
- [ ] Content-Typen: `legalPage`, `blogPost`, `aboutPage`, `faqItem`, `siteSettings`
- [ ] Public-Routen: `/impressum`, `/datenschutz`, `/agb`, `/widerrufsbelehrung`, `/cookie-richtlinie`, `/about`, `/blog`, `/blog/[slug]`, `/faq`
- [ ] FAQ-Seite enthält Schema.org FAQPage structured data (für KI + Google Rich Results)
- [ ] Blog-Artikel mit Open Graph + Twitter Card Metadaten
- [ ] Footer mit Links zu allen Legal-Seiten + Blog + FAQ + About, auf allen Seiten sichtbar
- [ ] Portable Text Renderer mit Custom-Blöcken: Headings, Listen, Links, Bilder (responsive), Zitate, Trennlinien
- [ ] Sitemap beinhaltet alle public Sanity-Seiten automatisch

## Edge Cases
- Legal-Seite fehlt noch in Sanity → 404 statt Build-Error
- Blog-Slug existiert nicht → 404
- Studio ohne Admin-Login → Sanity zeigt eigenen Login-Dialog
- Build ohne gesetzte Sanity-Env-Variablen → Seiten geben sichtbaren Hinweis "CMS nicht konfiguriert"

## Technical Requirements
- Packages: `next-sanity`, `sanity`, `@sanity/vision`, `@sanity/image-url`, `@portabletext/react`
- Env-Variablen:
  - `NEXT_PUBLIC_SANITY_PROJECT_ID`
  - `NEXT_PUBLIC_SANITY_DATASET` (default: `production`)
  - `SANITY_API_TOKEN` (optional, für private Drafts / Preview)
- Singletons: `aboutPage`, `siteSettings` (nur eine Instanz)
- Portable Text Bilder via `@sanity/image-url` mit Lazy-Loading via Next.js `<Image>`

---

## Tech Design
_Entfällt — direkt während Implementation geklärt_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
