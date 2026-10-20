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
- Player PINs are checked by `netlify/functions/player-login.js` and stored only as salted
  scrypt hashes in the Blobs store `player-auth`. Each player's first login after Oct 2026 checks
  his old Google Sheet PIN once (Apps Script `verifyPlayerPin`): 1234 means he must pick his own
  PIN before going in, any other PIN is copied over. 8 wrong PINs lock that name for 15 minutes.
  Coaches reset a forgotten PIN in the Roster Manager (`players.html`, staff pass needed): he then
  logs in with 1234 and picks a new one. Nobody can see a PIN.
- The Google Sheet script still returns every Sheet PIN to anyone who adds `&isAdmin=true` to its
  `getRoster` address. Those Sheet PINs no longer log anyone in, but David should remove the
  `pin` field from that response in the Apps Script (it isn't in this repo).
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

The build fills every card from stats using the staff's rules (`closeoutFor` / `renderCard`
in `build_scout_cards.js`):

- Hand: R for everyone. C/O by 3PT%: under 20% Shaq, 20-32% Rose, 33-38% Book, over 38%
  Klay. Book and Klay need 2+ threes a game; a good % on fewer attempts is Rose.
- Book/Klay: DTRAN Locate, PNR and PIN/DHO Over/Switch. Everyone else: those left blank.
- REBOUND: "Box out", or "MUST BOX OUT" at 6+ RPG.
- The note (`writeNote`) is written from stats by rules, not by an AI service, and ends with
  "(Auto-written from stats)".
- Starters = players who started more than half of the games whose box score marks starters.
  The scraper reads each game's box score on usportshoops.ca (`addBoxScoreStats` in
  `scripts/lib/usports-scraper.js`) for starts and the real "Last 5 Games" row. Without box
  scores it falls back to the top 5 in minutes.

On a saved (coach-edited) version, the editor updates each tag item (Hand, C/O, DTRAN, PNR,
PIN/DHO, REBOUND) and the note only while it still holds the automatic value (remembered in
`data-auto-fields` / `data-auto`), so every stats refresh re-applies the rules to items no
coach has changed, and re-sorts Starters/Bench only if
the saved order is the automatic one (or no coach has written any tags/notes on that team yet).
Anything a coach typed, and any order a coach set on cards they wrote on, is kept.

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

## Griffin Quizzes (`quiz.html`)

Graded quizzes for players. Each quiz is built in the browser from random questions:
- **Scouting report quiz (per opponent):** the scout cards as players see them, loaded from the real
  `opponents/<slug>/scout-cards.html` in a hidden frame so coaches' saved edits count (the page sets
  `window.__scoutCardsReady` when its saved version has loaded). Also the team scouting report
  (Blobs key `scout_scout_<slug>`, falling back to `scouts/2026-27-scout.md`; `[FILL…]` / TBD parts
  are skipped) and team stat leaders from `data/usports-rosters-stats.json`.
- **Griffin Concepts quiz:** terms, mottos and beliefs from `griffin-concepts.html` (plus the saved
  edit in Blobs key `griffin_basketball_concepts_v1`).

- **Question bank:** starter questions in `data/quiz-bank-seed.json` (ids `s-…`, written from the
  Concepts page) plus coaches' questions and edits, saved by `netlify/functions/quiz-bank.js`
  (Blobs store `quiz-bank`; an edit of a starter question is saved under the same id and wins, a
  deleted starter is saved as `{ id, deleted: true }`). Every question has tags (`offence`,
  `pnr`, `transition`…); a team slug tag (e.g. `calgary-dinos`) puts it in that team's scouting
  quiz. "Concepts & topics" quizzes pick by tag from the bank plus automatic Concepts questions
  (`offence`/`defence` narrow the pick, other tags add together: defence + pnr = PNR defence).
  Staff can edit or hide any question while previewing a quiz; editing an automatic question
  saves a copy to the bank and hides the automatic one (hidden keys: `h_<key>` in `quiz-bank`).
- Shared quiz code (loading cards/reports/concepts/bank, building questions) is in `quiz-data.js`,
  used by `quiz.html` and `game-week.html`.
- `game-week.html`: this week's opponent at a glance (keys to victory, how we attack/defend,
  starters' C/O and coverages, stat leaders) from the same sources. Coaches set it on the page
  (Blobs key `game_week`), optionally assigning that team's quiz at the same time.

Players' results go to `netlify/functions/quiz-results.js` (its own Blobs store, `quiz-results`).
Only staff can list or delete them: `verify-access.js` now returns a signed staff pass
(`netlify/functions/lib/staff-token.js`, 14 days, signed with a key derived from the two passwords),
kept in `sessionStorage.griffin_staff_token` and sent as the `X-Staff-Token` header. Coaches who
logged in before this existed are asked for their password once on the Grades tab. The team's
assigned quiz is saved under Blobs key `quiz_assignment`.

## S&C app login

The S&C app (`offseason-sc-app/`) has no login of its own: a player logged into the Hub is logged
in there (auth-lock.js sets `hoops-offseason:current-player`), and staff see the general program.
The Profile tab only sets goal and injuries. The S&C program itself is paused for 2026-27 (new
S&C coach): don't change it unless David asks.

## Content saved from the site

Scout notes and other edits made in the site's editors are saved to Netlify Blobs through
`netlify/functions/save-content.js` / `get-content.js`, not to this repo. Coaches don't need
GitHub to update that content.

## Other notes

- `.skill/SKILL.md` is the "Griffin" assistant-coach spec for basketball work (scouts,
  practice plans). Follow it for basketball content.
- The one-off `inspect_*` / `scrape_*` / `test_*` / `check_*` helpers from the original build were
  removed in Oct 2026 (they're still in git history). `scripts/build_practice_plans.js` rebuilds
  `practice-plans/list.json` from `practice-plans/plans/*.json`.
