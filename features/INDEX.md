# Feature Index

> Central tracking for all features. Updated by skills automatically.

## Status Legend
- **Planned** - `/requirements` done, spec written, architecture not yet designed
- **Architected** - `/architecture` done, tech design approved, ready to build
- **In Progress** - `/frontend` or `/backend` active or completed, not yet in QA
- **In Review** - `/qa` active, testing in progress
- **Approved** - `/qa` passed, no critical/high bugs, ready to deploy
- **Deployed** - `/deploy` done, live in production

## Features

| ID | Feature | Status | Spec | Created |
|----|---------|--------|------|---------|
| PROJ-1 | Karten-Editor Core | In Progress | [PROJ-1-map-editor-core.md](PROJ-1-map-editor-core.md) | 2026-04-19 |
| PROJ-2 | Textblock-Editor | Architected | [PROJ-2-text-block-editor.md](PROJ-2-text-block-editor.md) | 2026-04-19 |
| PROJ-3 | Poster-Export (PNG & PDF) | In Progress | [PROJ-3-poster-export.md](PROJ-3-poster-export.md) | 2026-04-19 |
| PROJ-4 | User Authentication | In Review | [PROJ-4-user-authentication.md](PROJ-4-user-authentication.md) | 2026-04-19 |
| PROJ-5 | Projekt-Verwaltung | In Progress | [PROJ-5-project-management.md](PROJ-5-project-management.md) | 2026-04-19 |
| PROJ-6 | Stripe-Bezahlsystem | In Review | [PROJ-6-stripe-payments.md](PROJ-6-stripe-payments.md) | 2026-04-19 |
| PROJ-7 | Stern-Karten-Generator | In Review | [PROJ-7-star-map-generator.md](PROJ-7-star-map-generator.md) | 2026-04-19 |
| PROJ-8 | Design-Presets | In Progress | [PROJ-8-design-presets.md](PROJ-8-design-presets.md) | 2026-04-19 |
| PROJ-9 | Admin-Backend (Preset-Verwaltung) | Planned | — | 2026-04-19 |
| PROJ-10 | Admin-Bestellverwaltung | In Review | [PROJ-10-admin-order-management.md](PROJ-10-admin-order-management.md) | 2026-04-19 |
| PROJ-11 | Homepage (Landing Page) | In Progress | [PROJ-11-homepage.md](PROJ-11-homepage.md) | 2026-04-19 |
| PROJ-12 | Client-Order-Management | In Progress | [PROJ-12-client-order-management.md](PROJ-12-client-order-management.md) | 2026-04-20 |
| PROJ-13 | Content CMS (Sanity) | In Progress | [PROJ-13-content-cms.md](PROJ-13-content-cms.md) | 2026-04-20 |
| PROJ-14 | Blog-Publishing-Automatisierung | In Progress | [PROJ-14-blog-automation.md](PROJ-14-blog-automation.md) | 2026-04-21 |
| PROJ-15 | Dynamische Map-Farbschemen | In Progress | [PROJ-15-dynamic-map-color-schemes.md](PROJ-15-dynamic-map-color-schemes.md) | 2026-04-21 |
| PROJ-16 | Marketing-Infrastruktur | Planned | [PROJ-16-marketing-infrastructure.md](PROJ-16-marketing-infrastructure.md) | 2026-04-21 |
| PROJ-17 | Marketing-Playbook & Kampagnen | Planned | [PROJ-17-marketing-playbook.md](PROJ-17-marketing-playbook.md) | 2026-04-21 |
| PROJ-18 | Mobile-Schnellbestellung via Presets | Planned | [PROJ-18-mobile-editor-optimization.md](PROJ-18-mobile-editor-optimization.md) | 2026-04-21 |
| PROJ-19 | Foto-Integration im Poster | In Progress | [PROJ-19-photo-integration.md](PROJ-19-photo-integration.md) | 2026-04-21 |
| PROJ-20 | Internationalisierung (i18n) | Planned | [PROJ-20-internationalization.md](PROJ-20-internationalization.md) | 2026-04-21 |
| PROJ-21 | Layout-Presets | In Progress | [PROJ-21-layout-presets.md](PROJ-21-layout-presets.md) | 2026-04-24 |
| PROJ-22 | Admin-Paletten-Verwaltung | Planned | [PROJ-22-admin-palette-management.md](PROJ-22-admin-palette-management.md) | 2026-04-24 |

<!-- Add features above this line -->

## Next Available ID: PROJ-23

## Recommended Build Order
1. **PROJ-1** — Karten-Editor Core (Fundament der App)
2. **PROJ-2** — Textblock-Editor (baut auf PROJ-1 auf)
3. **PROJ-3** — Poster-Export (baut auf PROJ-1 + PROJ-2 auf)
4. **PROJ-4** — User Authentication (unabhängig, aber Voraussetzung für 5+6)
5. **PROJ-5** — Projekt-Verwaltung (braucht 1–4)
6. **PROJ-6** — Stripe-Payments (braucht 3–5)
7. **PROJ-7** — Stern-Karten-Generator (baut auf 2+3 auf, kann parallel zu 4–6)
8. **PROJ-8** — Design-Presets (vorgefertigte Kombis aus Form + Rahmen + Stil; braucht PROJ-1–3)
9. **PROJ-9** — Admin-Backend (Preset-Konfiguration & Deployment; braucht PROJ-8 + Supabase)
