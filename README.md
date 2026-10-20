# 🏀 Griffin — MacEwan Griffins Basketball Brain

A living basketball repository for the MacEwan Griffins men's basketball program. Systems library + opponent intel + practice plans + handouts, all assistant-coach generated.

Originally built for the MacEwan Griffins by Kurtis McGeachy, gifted and updated for David Kapinga and the MacEwan staff for Canada West / U Sports use.

## How to use it
You drive the agent with natural language in Clawpilot (or any compatible AI assistant pointed at this folder). No slash commands. Examples:
- "scout calgary for our next game"
- "what do we run vs the 1-3-1"
- "build a Tuesday practice"
- "update my roster — added a 6'8 freshman"
- "we lost to UBC 81-74, here's what happened..."

The agent reads .skill/SKILL.md for its operating spec.

## Folders
| Folder | What lives here |
|---|---|
| `my-team/` | Identity, roster, sets, season log |
| `opponents/<team>/` | Per-opponent profile, scouts, games |
| `systems/` | Curated X&O library — offense, defense, transition, special situations, concepts |
| `practice-plans/` | One .md per practice (YYYY-MM-DD-*.md) |
| `handouts/` | Staff and player handouts |
| `templates/` | Markdown / HTML / DOCX templates the agent fills in |
| `sources/` | Bibliography of trusted basketball sources |
| `data/` | Structured opponent JSON |
| `.skill/SKILL.md` | Agent operating spec |

## First-run checklist
1. Open `my-team/identity.md` — write your identity, style, must-win categories
2. Open `my-team/roster.md` — paste current roster
3. Open `opponents/` — drop a folder per Canada West team you'll play
4. Open `.skill/SKILL.md` — adjust the public-site / publish step if you're not deploying to Netlify

## Conference context
Canada West (U Sports) Men's Basketball. The systems library is conference-agnostic; the opponents are not. Empty opponent list seeded for you to fill.

## Working on the website (staff)
The live site is https://macewan-coaching-hub.netlify.app and it publishes automatically from the
`main` branch of this repo. To change the site, ask your Claude to work on a branch and open a pull
request; Netlify posts a preview link on it, and the head coach approves it before it goes live.
See `CLAUDE.md` for the rules every Claude session follows.
