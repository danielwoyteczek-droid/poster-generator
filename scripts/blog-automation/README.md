# Blog-Automation (PROJ-14)

Generates SEO-ready blog articles via Claude and saves them as drafts in Sanity.

## Setup

1. Install dependencies (done at repo root): `npm install`
2. Add the following env vars to `.env.local` (not committed):
   - `ANTHROPIC_API_KEY` — from https://console.anthropic.com/
   - `SANITY_API_WRITE_TOKEN` — from Sanity → Manage → API → Tokens (Editor role or higher)
   - `BLOG_AUTOMATION_MONTHLY_BUDGET_USD` — safety cap, e.g. `5`
   - `BLOG_AUTOMATION_MODEL` — `claude-opus-4-7` (default) or `claude-sonnet-4-6`
3. Make sure `NEXT_PUBLIC_SANITY_PROJECT_ID`, `RESEND_API_KEY`, `ADMIN_EMAIL`, `NEXT_PUBLIC_APP_URL` are already present (they are for the main app).

## Commands

### Generate an article

Pick the next planned topic from the Sanity queue:
```
npm run blog:generate -- --from-queue
```

Manual run without queue:
```
npm run blog:generate -- --topic "5 Jahre Hochzeitstag: Geschenkideen" --keyword "hochzeitstag 5 jahre geschenk"
```

Optional flags: `--category`, `--notes`, `--model`.

### Publish a draft

```
npm run blog:publish -- --id <draftId>
```

## Topic queue

New document type `blogTopic` lives in Sanity Studio under "Blog-Themen-Queue". Each entry has:
- Topic/title idea
- Target SEO keyword
- Category, priority, notes
- Status: `planned` → `drafted` → `published`

Populate the queue directly in Studio. The generator picks the next planned topic with the lowest priority number.

## Budget guard

Every Claude call is logged in `scripts/blog-automation/.budget.json` with token counts and USD cost. Before each run, the script checks the current month's spend against the cap; if exceeded, it aborts and emails you.

## Scheduled runs

A GitHub Action in `.github/workflows/blog-scheduler.yml` runs daily at 06:00 UTC and generates the next queued article. It can also be triggered manually from the GitHub UI with an optional topic override.

For the Action to work, add these as GitHub repo secrets: `ANTHROPIC_API_KEY`, `SANITY_API_WRITE_TOKEN`, `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `RESEND_API_KEY`, `ADMIN_EMAIL`, `NEXT_PUBLIC_APP_URL`, optional `BLOG_AUTOMATION_MONTHLY_BUDGET_USD`, `BLOG_AUTOMATION_MODEL`.

## Draft-first safety

All generated articles land in Sanity as **drafts**. You must review and publish them manually in the Studio. There is no auto-publish path in V1.

## Quality checks

Before saving a draft, the script verifies:
- Word count 500–1400
- At least 2 H2 headings
- At least 1 internal link (`/path`)
- Excerpt length 80–180 chars
- Valid slug (a–z, 0–9, hyphen)
- At least 2 tags
- Title not already used in an existing blog post

If checks fail, it retries up to 2× with a fresh generation. After that, the topic is marked with the error and skipped.
