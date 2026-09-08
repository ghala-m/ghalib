# غالِـب · Ghalib — AI Academic Assistant

Ghalib (غالِـب) is a bilingual (Arabic / English) web app that turns a university student's
paperwork — the major sheet and each course syllabus — into a living academic workspace:
a study plan, a prerequisite map, a calendar, and an AI advisor that knows the student's record.

> Built with [Lovable](https://lovable.dev) · Live: https://ghalib.lovable.app

---

## What it does

### 1. Onboarding from your major sheet
Upload the degree plan (PDF or Word). The AI reads it, extracts every course with its code,
credits, prerequisites and category, then asks you to mark what you have already completed
(with grades and the term), what you are studying now, and what is still ahead.

### 2. Course categories
Every course is classified and colour-coded:
general requirements · college requirements · major requirements · major electives.

### 3. Syllabus extraction per course
Upload a course syllabus and the AI pulls out class meeting times, exam dates, assignments
and grade weights. Anything it could not find is asked back as a few short questions —
never a full re-entry form.

### 4. Prerequisite map
An interactive flow chart on the dashboard: arrows run from a prerequisite to the course it
unlocks, and each node shows whether it is completed, in progress, available now, or locked.
Courses that carry an extra unit-based gate on top of their normal prerequisites (e.g. Capstone 1,
which requires 96+ completed credit hours) stay locked until that's met too. Zoom defaults to
100% and remembers the last zoom level you set, until you hit "reset zoom".

### 5. Calendars — day / week / month
* **Dashboard calendar** — everything across all courses. A button here jumps to the term calendar.
* **Course calendar** — only that course's assignments, quizzes and exams.
* **Term calendar** — a printable month/week grid of the active term (reached from the calendar
  page or from "Edit current term" on the dashboard — no separate sidebar entry).
* Add your own events with browser reminders (10 min / 30 min / 1 hour / 1 day before).

### 6. Terms
Start a new term (name, number, start date, the courses you registered), and close it when it
ends — grades are recorded, current courses move to *completed*, the GPA is recalculated and
you advance to the next term number. If a term's computed GPA lands exactly on 0.0, you're asked
whether it's a no-credit prep term (excluded from the cumulative GPA/credits) or a regular
zero-GPA term.

### 7. AI study tools
Paste text or upload a PDF/Word file and generate: a structured summary, flashcards, a practice
quiz, a plain-language explanation, or a day-by-day study plan.

### 8. AI advisor
A chat that already knows your major, term, GPA, course list, grades and upcoming deadlines —
so you can ask "what should I register next term?" and get a grounded answer.

### 9. Registration simulator & GPA planner
* **Simulator** — pick courses to see what they'd newly unlock, or hit "suggest a combination"
  for a greedy best pick within a credit budget; pressing it again favors a different (equally
  good) combination instead of repeating the same one.
* **GPA planner** — simulate hypothetical grades for the current term, and solve for the average
  you need in your remaining credits to hit a target GPA. This page always starts blank; it does
  not remember what you typed in on a previous visit.
* **GPA trend** — a chart of your GPA across terms once you have two or more with a recorded
  GPA; if you have more terms than that but some are missing a GPA, it prompts you to fill them in.

### 10. Flexibility
Edit or delete any course, change its classification at any time, give it a **nickname**
(the abbreviation students actually use — it works in search), and group interchangeable
courses so that taking one strikes the alternatives through.

### 11. Appearance
Light / dark / system themes and a choice of accent colours, applied across the whole app.
Full RTL support in Arabic.

---

## Tech

| Layer | Choice |
| --- | --- |
| Framework | TanStack Start (React 19, Vite, SSR) |
| Routing | TanStack Router (file-based, `src/routes`) |
| Data | TanStack Query + Lovable Cloud (Postgres, RLS, Auth, Storage) |
| Styling | Tailwind CSS v4 + shadcn/ui, tokens in `src/styles.css` |
| AI | Lovable AI Gateway (Gemini) via server functions |
| Documents | PDFs read natively by the model; Word converted with `mammoth` |

Accepted uploads: **PDF and Word (.doc / .docx) only.**

### Project layout
```
src/
  routes/                 pages (file-based routing)
    _authenticated/       dashboard, calendar, advisor, tools, profile, onboarding, course page
  components/app/         calendar, prerequisite map, dialogs, advisor chat, syllabus panel
  lib/                    queries, i18n, theme, plan graph, AI server functions
```

Every row is protected by row-level security: a student can only ever read and write their own data.

## Development

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

### Optional integrations (`.env`)
Two features are wired to read from `.env` but need real keys to actually work — the app runs
fine without them, those specific features just stay disabled with a translated notice:

| Variable | Enables | Where to get it |
| --- | --- | --- |
| `VITE_VAPID_PUBLIC_KEY` | Real push notifications for reminders | `EMERGENCE.md` → "TASK 2 — Generate and store VAPID keys" |
| `VITE_GOOGLE_MAPS_API_KEY` | Location autocomplete search | `EMERGENCE.md` → Google Maps section |

See `CHANGES.md` for a running, dated log of feature batches applied to this project.
