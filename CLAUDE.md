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
4. `scripts/build_library_pages.js` generates `systems/index.html` and `templates/index.html`.

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
| `systems/index.html`, `templates/index.html` | `scripts/build_library_pages.js` |
| `lineup-logger.html` | `scripts/build_lineup_logger.js` |

**Exception: `lineup-tracker.html` (the MacEwan Database) is edited by hand.** Its generator
`scripts/build_lineup_tracker.js` is out of date (it predates the Shot Tracker connection) and
refuses to run without `--force`. Never regenerate the Database from it.

`build_canadawest_hub.js` uses Windows (CRLF) line endings. Keep them that way when editing.

## Logins and secrets

- `auth-lock.js` is the login screen loaded on every page. Coach/Admin passwords are checked
  server-side by `netlify/functions/verify-access.js` against Netlify environment variables
  `HUB_COACH_PASSWORD` and `HUB_ADMIN_PASSWORD`. **Never put a password, PIN or build hook
  URL in any file in this repo.** Every file here is publicly downloadable from the site.
- The repo is public so every coach's commits build on Netlify's free plan (it blocks
  unrecognized contributors only on private repos). Never commit anything private.
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

## Shot Tracker → MacEwan Database

The staff tracks games with `shot-tracker.html` (both ends) and `lineup-logger.html`. The old
Offense/Defense Loggers were removed in Oct 2026; their saved events still load in the Database
(Blobs keys `game_offense_events` / `game_defense_events`), and their old addresses redirect
to the Shot Tracker. After every logged play the tracker saves a report for its phone under the Blobs key
`st_report_<gameId>__<trackerId>` (pending reports retry until the server confirms them).
`lineup-tracker.html` loads them through `netlify/functions/list-reports.js` and combines the
phones per game. The bridge (`bridgeToMacEwanDatabase` in `shot-tracker.html`) converts plays
into the Database's event format (the format the old loggers used) so every view works:

- zones: R rim, P paint, J mid-range, C catch-and-shoot 3, D off-the-dribble 3
- offence outcomes: open/contested make/miss, and_1, turnover, foul_made_ft, foul_no_ft
- defence outcomes: stop_open/contested_miss, opp_open/contested_make, forced_to,
  foul_committed, foul_committed_fts
- play types map to the Database triggers (PNR BH/SC → PnR, OFB → OBS, ORB → OR, CUT → Cut,
  TRANS → Tran, ISO → Iso); the original type is kept in `playType`
- defence is credited to the player marked as guarding the shot (or who got the steal),
  otherwise to "Team Defense"

If you change either side, keep these names in sync or the Database will count plays wrong.

## Pages, navigation and phones

- Every page loads `/site-responsive.css` (shared phone/tablet fixes: no sideways scrolling
  with the slide-out menu, 44px tap targets on touch). Add it to any new page, next to a
  `<meta name="viewport" content="width=device-width, initial-scale=1">` tag.
- Every page needs a visible way back to `index.html` (the Coaching Hub).
- Never link to a raw `.md` file: link to `/doc.html?f=<path>.md`, which shows it as a page
  (phones otherwise download or show raw text). `.skill/` isn't served by Netlify at all.
- Before publishing a layout change, check it at phone (390px), tablet (820px) and laptop
  (1366px) widths.

## Content saved from the site

Scout notes and other edits made in the site's editors are saved to Netlify Blobs through
`netlify/functions/save-content.js` / `get-content.js`, not to this repo. Coaches don't need
GitHub to update that content.

## Other notes

- `.skill/SKILL.md` is the "Griffin" assistant-coach spec for basketball work (scouts,
  practice plans). Follow it for basketball content.
- The many `inspect_*`, `scrape_*`, `test_*` and `check_*` scripts in the root are one-off
  helpers from the original build. They are not part of the site build.
