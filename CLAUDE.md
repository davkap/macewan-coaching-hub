# MacEwan Griffins Coaching Hub: notes for Claude

This repo is the MacEwan Griffins men's basketball coaching website
(https://macewan-coaching-hub.netlify.app), owned by HC David Kapinga (GitHub: davkap).
Several assistant coaches work on it, each with their own Claude. Most of them are
coaches, not programmers: explain changes in plain basketball-staff language, not jargon.

## How changes go live

- `main` is the live site. Netlify builds and deploys every push to `main`.
- **Never push to `main` directly.** Work on a branch, open a pull request, and let
  David (or whoever he names) approve it. Netlify posts a deploy-preview link on each
  pull request. Put that link in your summary so the coach can check the change on a real page.
- Keep each pull request to one topic ("fix shot tracker export", "add Calgary scout notes").

## How the site is built

Netlify runs `npm run update-stats` on every build (see `netlify.toml`):

1. `scripts/update_usports_data.js` scrapes all 17 Canada West teams from usportshoops.ca
   (`scripts/lib/usports-scraper.js`) into `data/usports-rosters-stats.json`, writes
   `data/stats-meta.json` (the "Stats last refreshed" label), rewrites `my-team/roster.md`,
   and regenerates opponent `profile.md` / `scouts/2026-27-scout.md` files
   (`scripts/generate_season_reports.js`). A team that fails to load keeps its previous data.
2. `build_scout_cards.js` regenerates every `opponents/*/scout-cards.html` from the data JSON.
3. `build_canadawest_hub.js` generates `canadawest-scout-2026-27.html` (the big scouting hub
   page) from the opponent markdown files, the data JSON and `data/*-concepts.json`.

The build's output is deployed but **not** committed back to git, so files in the repo can
be older than the live site. That is expected.

## Generated files: don't hand-edit

Edit the source, then regenerate. Hand edits to these get wiped on the next build:

| Generated file | Edit this instead |
|---|---|
| `canadawest-scout-2026-27.html` | `build_canadawest_hub.js`, then run `node build_canadawest_hub.js` |
| `data/usports-rosters-stats.json`, `data/stats-meta.json` | `scripts/update_usports_data.js` / `scripts/lib/usports-scraper.js` |
| `my-team/roster.md`, `opponents/*/profile.md`, `opponents/*/scouts/2026-27-scout.md` | `scripts/update_usports_data.js`, `scripts/generate_season_reports.js` (a "Coach's Note" section in a profile is preserved) |
| `opponents/*/scout-cards.html` | `build_scout_cards.js` |
| `offense-logger.html`, `defense-logger.html`, `lineup-logger.html`, `lineup-tracker.html` | the matching `scripts/build_*.js` |

`build_canadawest_hub.js` uses Windows (CRLF) line endings. Keep them that way when editing.

## Logins and secrets

- `auth-lock.js` is the login screen loaded on every page. Coach/Admin passwords are checked
  server-side by `netlify/functions/verify-access.js` against Netlify environment variables
  `HUB_COACH_PASSWORD` and `HUB_ADMIN_PASSWORD`. **Never put a password, PIN or build hook
  URL in any file in this repo.** Every file here is publicly downloadable from the site.
- Netlify's free plan only builds commits from recognized contributors on a private repo.
  Commits must be authored with an email tied to a GitHub account that is linked in Netlify.
- Player PINs are checked by the Google Apps Script in `offseason-sc-app/tracking-config.js`.
- The login screen only hides pages in the browser. It is not real security: anyone who knows
  a page's address can still load it directly. Don't add anything truly confidential.

## Stats refresh button

`stats-refresh.js` (shared by `index.html`, `players.html` and the hub page) calls
`netlify/functions/weekly-update.js`, which triggers a Netlify build through the
`STATS_BUILD_HOOK_URL` environment variable (5-minute cooldown). New stats appear about
2-3 minutes later. usportshoops.ca itself can lag a day behind box scores.

## Scout card edits

When a coach edits a team's scout cards, `scout-cards-editor.js` saves a snapshot of the cards
to Netlify Blobs and shows it to everyone. On load it puts the freshly built "U Sports" stats
row back into the snapshot (and the "Last 5 Games" row, unless a coach typed it by hand).
Don't bump `data-template-version` in `build_scout_cards.js`: that discards every saved edit.

## Content saved from the site

Scout notes and other edits made in the site's editors are saved to Netlify Blobs through
`netlify/functions/save-content.js` / `get-content.js`, not to this repo. Coaches don't need
GitHub to update that content.

## Other notes

- `.skill/SKILL.md` is the "Griffin" assistant-coach spec for basketball work (scouts,
  practice plans). Follow it for basketball content.
- The many `inspect_*`, `scrape_*`, `test_*` and `check_*` scripts in the root are one-off
  helpers from the original build. They are not part of the site build.
