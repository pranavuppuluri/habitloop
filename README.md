# Habitloop

A habit tracker in the browser. Check habits off day by day, grouped by time of
day, and watch each streak build. Free to host end to end.

- **Today** — habits grouped into morning / afternoon / evening / any time, with
  a ring you tap to check off. Counted habits (8 glasses of water) fill the ring
  a tap at a time.
- **Streak thread** — every row carries a bar chart of its last twelve days, so
  gaps are as visible as runs.
- **Day rail** — seven days at a glance, each with a meter of how much of that
  day got finished. Past days are editable; future days are not.
- **Per-habit detail** — current streak, best run, completion rate, a month heat
  calendar, and a note per day.
- **Progress** — 30-day completion trend plus a table of every habit.
- Skip a day (keeps the streak alive without counting toward it), archive a
  habit without losing its history, dark and light themes, works down to phone
  width, keyboard accessible.

## Run it locally

```bash
npm install
npm run dev
```

Open the URL it prints. Create an account and start adding habits — no server
setup needed for this part.

## The two modes

The app picks its storage based on whether Supabase keys are present at build
time. Nothing else changes.

| | Device mode (default) | Cloud mode |
|---|---|---|
| Accounts | Stored in this browser | Real Supabase auth |
| Data | `localStorage` | Postgres, per-user |
| Syncs across devices | No | Yes |
| Setup | None | ~10 minutes, free |

Device mode is genuinely useful — the app is fully functional — but the account
and its habits never leave the browser they were created in. Clearing site data
erases them. Passwords are salted and hashed rather than stored in the clear,
but anything in `localStorage` is readable by whoever has the device: treat it
as a convenience lock, not security.

## Switch on real accounts (free)

1. Create a project at [supabase.com](https://supabase.com) — the free tier
   covers 50,000 monthly active users and 500 MB of database.
2. In the SQL editor, paste and run [`supabase/schema.sql`](supabase/schema.sql).
   It creates the three tables and the row-level security policies that scope
   every row to its owner.
3. Under **Authentication → Providers → Email**, decide whether to require email
   confirmation. With it on, a new account has to click a link before it can sign
   in. With it off, sign-up logs straight in — easier while you are testing.
4. Copy **Project Settings → API → Project URL** and the **anon public** key
   into a local `.env` file (see `.env.example`):

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

5. Restart `npm run dev`. The sign-in screen now says "Synced account".

The anon key is meant to be public — it ships inside the JavaScript bundle of
every Supabase site. Row-level security, not key secrecy, is what keeps one
person's habits out of another's. Never put the **service role** key in this
project.

## Publish it free on GitHub Pages

No domain and no hosting bill. You get `https://<your-user>.github.io/habitloop`
with HTTPS included.

```bash
git init
git add .
git commit -m "Habitloop"
git branch -M main
git remote add origin https://github.com/<your-user>/habitloop.git
git push -u origin main
```

Then in the repo on GitHub:

1. **Settings → Pages → Build and deployment → Source:** pick **GitHub Actions**.
2. For cloud mode, add the two values under **Settings → Secrets and variables →
   Actions → Variables** (the *Variables* tab, not Secrets — they are baked into
   a public bundle either way, and Variables is the honest place for that):
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Skip this and the deployed
   site runs in device mode.
3. Push to `main`. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
   builds and publishes on every push; watch it under **Actions**.

`vite.config.ts` sets `base: './'`, so the same build works at a repo subpath,
at a domain root, or opened from disk — you don't have to edit a config when you
move it.

### Do you need a domain or a host?

No, for either mode:

- **Static files** — GitHub Pages serves them free, forever, on your
  `github.io` subdomain. Netlify and Vercel free tiers work the same way if you
  prefer them.
- **Accounts and data** — Pages can't run server code, which is exactly what
  Supabase's free tier provides. It is a separate service, not a server you rent.

A custom domain (roughly ₹700–1,000/year) is the only thing money buys here, and
it is purely cosmetic: point its DNS at GitHub Pages, tick **Enforce HTTPS**, and
nothing else changes.

## Layout

```
src/
  lib/          types, local-date helpers, streak and stats maths
  backend/      one interface, two implementations (localStorage, Supabase)
  components/   UI
supabase/       schema.sql — tables and row-level security
```

Dates are handled as local-calendar `YYYY-MM-DD` strings throughout, never as
UTC instants, so a check-in at 11pm belongs to the day you were actually living
in.
