# PROJ-4: User Authentication

## Status: Approved
**Created:** 2026-04-19
**Last Updated:** 2026-05-13

## Dependencies
- None (unabhängig, aber Voraussetzung für PROJ-5 und PROJ-6)

## User Stories
- Als Gast möchte ich die App ohne Registrierung ausprobieren können
- Als Gast möchte ich mich anmelden können, um meinen Entwurf zu speichern
- Als neuer Nutzer möchte ich mich mit E-Mail und Passwort registrieren können
- Ich möchte auch die Option haben, dass ich mich mit Google anmelden kann
- Als bestehender Nutzer möchte ich mich einloggen können, um meine gespeicherten Projekte zu sehen
- Als eingeloggter Nutzer möchte ich mich ausloggen können
- Als Admin möchte ich nach dem Login automatisch die Admin-Funktionen (kostenloser Export) freigeschaltet bekommen
- Als Admin möchte ich keine Bezahlschranke sehen — weder im Export-Tab noch im Checkout

## Acceptance Criteria
- [ ] Registrierung per E-Mail + Passwort (Supabase Auth)
- [ ] Login per E-Mail + Passwort
- [ ] Google OAuth Login (Supabase Social Login)
- [ ] Passwort-Validierung: mindestens 6 Zeichen
- [ ] Fehlermeldungen bei falschem Passwort, nicht registrierter E-Mail
- [ ] Nach Login: Weiterleitung zur vorherigen Seite
- [ ] Ausgeloggte Nutzer können den Editor nutzen (Guest Mode)
- [ ] Session wird über Browser-Schließung hinaus persistent gespeichert (Supabase Cookie)
- [ ] Login/Register-Seite mit modernem shadcn/ui Design
- [ ] Logout-Button im Header/Dashboard
- [ ] Auth-Status im Header sichtbar (Avatar oder Login-Button)
- [ ] Nutzer-Rolle wird in Supabase `user_metadata` gespeichert (`role: "admin"` oder `role: "user"`)
- [ ] Admin-Rolle wird server-seitig geprüft (nie nur client-seitig)
- [ ] Komponenten und API-Routen die Admin-Rechte erfordern geben 403 zurück wenn kein Admin

## Edge Cases
- Was passiert, wenn die E-Mail bereits registriert ist? → Fehlermeldung "Diese E-Mail ist bereits registriert"
- Was passiert, wenn das Passwort zu kurz ist? → Client-seitige Validierung vor API-Aufruf
- Was passiert, wenn Supabase nicht erreichbar ist? → Fehlermeldung, kein Crash
- Was passiert bei abgelaufener Session? → Automatische Token-Erneuerung via Supabase Middleware
- Was passiert, wenn ein Gast einen Entwurf erstellt hat und sich dann anmeldet? → localStorage-Entwurf wird beim Login als Supabase-Projekt synchronisiert
- Was passiert, wenn jemand versucht die Admin-Rolle client-seitig zu manipulieren? → Server-seitige Prüfung verhindert Zugriff

## Technical Requirements
- Supabase Auth (E-Mail/Passwort)
- Cookie-basierte Session via @supabase/ssr
- Next.js Middleware für automatische Token-Erneuerung
- Geschützte Routen (/private/*) prüfen Auth-Status server-seitig
- Zod-Schema für E-Mail/Passwort-Validierung

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten
```
/login (Seite)
└── LoginForm
    ├── E-Mail + Passwort Felder (shadcn Form + Input)
    ├── "Mit Google anmelden" Button
    └── Link → /signup

/signup (Seite)
└── SignupForm
    ├── E-Mail + Passwort Felder
    ├── "Mit Google registrieren" Button
    └── Link → /login

AppHeader (Layout-Komponente, alle Seiten)
├── (Gast)  "Anmelden"-Button → /login
├── (Nutzer) Avatar + Dropdown
│   ├── Mein Konto
│   ├── Meine Bestellungen
│   └── Logout
└── (Admin)  Avatar + Dropdown
    ├── Mein Konto
    ├── Meine Bestellungen
    ├── Bestellverwaltung → /private/admin/orders
    └── Logout

Next.js Middleware (unsichtbar, läuft auf jeder Route)
├── Session prüfen + Token automatisch erneuern
├── /private/**       → Redirect zu /login wenn nicht eingeloggt
└── /private/admin/** → 403 wenn Rolle ≠ "admin"
```

### Datenmodell
Jeder Nutzer hat:
- **ID** — eindeutig, von Supabase vergeben
- **E-Mail** — Pflichtfeld
- **Rolle** — `"user"` (Standard bei Registrierung) oder `"admin"` — gespeichert in `user_metadata`
- **Session** — HttpOnly Cookie, automatisch von `@supabase/ssr` verwaltet

### Rollen-Verwaltung
Admin-Rechte können jederzeit an beliebig viele Nutzer vergeben werden:
- **Sofort:** Direkt im Supabase Dashboard (User → Metadata bearbeiten)
- **Später (PROJ-9):** Admin-UI zur Nutzerverwaltung ohne Supabase Dashboard-Zugang

Neue Nutzer bekommen immer automatisch `role: "user"` — niemand kann sich selbst zum Admin machen.

### Auth-Fluss
```
Gast besucht /editor
  → Editor funktioniert ohne Login
  → Entwurf in localStorage

Registrierung / Login (E-Mail oder Google)
  → Supabase setzt HttpOnly Cookie
  → role: "user" in user_metadata (Standard)
  → Weiterleitung zur vorherigen Seite

Admin-Login
  → Gleicher Flow, aber role: "admin" bereits in user_metadata hinterlegt
  → AppHeader zeigt Admin-Menü
  → /private/admin/** freigeschaltet

Middleware (läuft auf jeder Seite)
  → Erneuert Session automatisch
  → Rollenprüfung server-seitig aus JWT-Claims (kein DB-Aufruf nötig)
```

### Tech-Entscheidungen
| Entscheidung | Warum |
|---|---|
| Rolle in `user_metadata` statt eigener Tabelle | Im JWT-Token enthalten → server-seitig ohne DB-Abfrage lesbar |
| Admin-Rolle nur manuell setzbar | Verhindert Selbst-Promotion zum Admin |
| Google OAuth via Supabase | Kein extra Package — nur Supabase Dashboard-Konfiguration |
| Rollenprüfung in Middleware + Server Components | Nie nur client-seitig — JS im Browser kann manipuliert werden |

### Packages (bereits vorhanden)
- `@supabase/supabase-js` — Supabase Client
- `@supabase/ssr` — Cookie-basierte Session
- `zod` — E-Mail/Passwort Validierung
- `react-hook-form` — Formular-State

## QA Test Results

**2026-05-13 — Google OAuth aktiviert + Cookie-Bug gefixt**
- Google Cloud OAuth-Client konfiguriert (JS-Origin: localhost:3000 + petite-moment.com; Redirect: `https://statqcmffemzxcerydgw.supabase.co/auth/v1/callback`)
- Supabase Google Provider aktiviert, Client-ID + Secret hinterlegt
- Supabase Redirect URLs: `http://localhost:3000/**` + `https://petite-moment.com/**` (Wildcard nötig wegen `?next=…` im redirectTo)
- **Bugfix in `src/app/auth/callback/route.ts`:** Cookies wurden via `cookies()` aus `next/headers` auf die auto-generierte Response geschrieben, die beim Return eines eigenen `NextResponse.redirect(...)` verworfen wird → Session-Cookie kam nie beim Browser an, Proxy sah keinen User und schickte zu `/login` zurück. Fix: Response zuerst erzeugen, Supabase schreibt Cookies direkt auf das Redirect-Response-Objekt.
- Google-Login End-to-End verifiziert (localhost): Consent-Screen → Callback → Session-Cookie → `/private` erreichbar
- `next=`-Parameter funktioniert wie spezifiziert: Login aus Home-Navi (`next=/de`) führt zurück nach `/de`, direkter Aufruf von `/login` führt zu `/private`

## Deployment
_To be added by /deploy_
