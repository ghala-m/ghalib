# EMERGENCE.md

> Format note: this file is written for an AI coding agent (e.g. Claude Code) to read and
> execute against, not for a human to parse manually. Every section is a discrete, actionable
> task with explicit inputs/outputs. If you are an AI agent with terminal + Supabase CLI access
> to this repository, work through the tasks below in order.

## Context

This repo (Ghalib) has two features whose **code is complete and committed**, but which cannot
go live without external credentials and a deployment step that the assistant that wrote this
code did not have access to (no Supabase project credentials, no network access to
supabase.com, no ability to generate paid API keys on the owner's behalf).

Nothing below requires further coding unless a task explicitly says so — this is a
provisioning + deployment checklist.

---

## TASK 1 — Apply the pending migration

```
supabase db push
```
This applies `supabase/migrations/20260830100000_push_and_briefing.sql`, which creates:
`push_subscriptions`, `briefing_log`, and adds columns to `profiles` / `calendar_events` /
`course_items`.

**Verify:** `supabase db diff` should show no pending changes after this runs.

---

## TASK 2 — Generate and store VAPID keys (required for ALL push notifications)

```
npx web-push generate-vapid-keys
```
This prints a `Public Key` and a `Private Key`. Then:

```
supabase secrets set VAPID_PUBLIC_KEY="<public key>"
supabase secrets set VAPID_PRIVATE_KEY="<private key>"
supabase secrets set VAPID_SUBJECT="mailto:<owner's real email>"
```

Then add the public key to the **client** build env (not a Supabase secret — this one is
public by design and must be readable by the browser):
```
# in .env at the repo root
VITE_VAPID_PUBLIC_KEY="<the same public key>"
```

**Without this task, push notifications silently no-op** (`src/lib/push.ts` logs a console
warning and returns `false`; `supabase/functions/_shared/push.ts` logs a warning and skips
sending). No user-facing crash, but nothing is ever delivered.

---

## TASK 3 — Set the cron trigger secret

```
supabase secrets set CRON_SECRET="<generate any long random string, e.g. `openssl rand -hex 32`>"
```
Both edge functions reject any request whose `Authorization: Bearer <token>` header doesn't
match this value — this is what stops the internet at large from triggering them.

---

## TASK 4 — Deploy the two edge functions

```
supabase functions deploy send-reminders
supabase functions deploy morning-briefing
```

---

## TASK 5 — Schedule them with pg_cron

Run in the Supabase SQL editor (or via `supabase db push` if you add this as a migration —
recommended once you've confirmed the exact project ref below):

```sql
-- Requires the pg_cron and pg_net extensions (enable in Database > Extensions if not already on).
select cron.schedule(
  'send-reminders-every-10-min',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET value from Task 3>'),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'morning-briefing-every-10-min',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/morning-briefing',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET value from Task 3>'),
    body := '{}'::jsonb
  );
  $$
);
```
Replace `<PROJECT_REF>` with this project's ref (from `.env` -> `VITE_SUPABASE_PROJECT_ID`) and
`<CRON_SECRET value from Task 3>` with the literal value set in Task 3.

**Why every 10 minutes:** the "morning briefing" trigger window in
`supabase/functions/morning-briefing/index.ts` is 15 minutes wide specifically so a 10-minute
cron cadence can't miss it. If you change the cron interval, widen/narrow that window
(`nowLocal.minutes - triggerAt > 15`) to match — the window must stay wider than the interval.

---

## TASK 6 — Google Maps API key (morning briefing traffic ETA + university location search)

Two separate uses, same API key works for both if you enable both APIs on it:

**6a. Traffic-aware ETA (server-side, Distance Matrix API).** Without this, the morning
briefing still sends (class count, exam warning, weather) — it just omits the "leave by X:XX"
line.

**6b. University location search (client-side, Places API).** Without this, the university
location field in profile settings shows a "location search needs a Google Maps key" message
instead of a working search box.

1. Create/select a project at https://console.cloud.google.com
2. Enable **Distance Matrix API** and **Places API**
3. Create an API key. For safety, create it as **two separate restricted keys** rather than one
   unrestricted key:
   - A server key restricted to Distance Matrix API, with no HTTP referrer restriction (used
     from the edge function, not a browser) → `supabase secrets set GOOGLE_MAPS_API_KEY="<key>"`
   - A browser key restricted to Places API + HTTP referrer restriction (your domain) → add to
     `.env` as `VITE_GOOGLE_MAPS_API_KEY="<key>"` (this one is public by design, embedded in the
     client bundle — the HTTP referrer restriction is what keeps it safe to expose)
4. Enable billing (Google requires it even within the free tier for both APIs)

No further code change needed — both integration points already read these env vars and
degrade gracefully if either is absent.

---

## TASK 7 — Weather

**No action needed.** `morning-briefing` uses Open-Meteo (`api.open-meteo.com`), a free public
API with no key requirement.

---

## Non-blocking, optional follow-ups (not required for the above to work)

- `profiles.timezone` defaults to `'Asia/Kuwait'` for every student. If the target user base
  spans multiple timezones, add a timezone picker to the profile settings UI (the column and
  all server-side math already support any IANA zone string — see
  `supabase/functions/_shared/time.ts`).
- University location is currently entered as manual lat/lng (see `universityLocationHint` in
  `src/lib/i18n.tsx` — the UI tells the student to long-press the location in Google Maps and
  paste the coordinates). A geocoding API key (Google Geocoding API or similar) would let them
  type an address instead — deliberately not required for v1 to avoid a second paid API
  dependency.
