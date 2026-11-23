// Canada West team stats, rankings and player stats (David, Nov 2026).
//
// Reads the usportshoops.ca data written by update_usports_data.js:
//   data/usports-rosters-stats.json   rosters + official season lines
//   data/games/<slug>.json            every box score (both teams' totals) + each player's game log
// and writes data/cw-stats.json, which team-stats.html and player.html read.
//
// Team numbers come from the box scores (so opponent stats, pace and ratings can be
// worked out); player season lines are the official usportshoops.ca totals.
// Everything here is public U Sports data. Synergy numbers are NEVER written here:
// they're added in the browser only, for logged-in users (synergy-view.js).
//
//   node scripts/build_cw_stats.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data', 'usports-rosters-stats.json');
const GAMES = path.join(ROOT, 'data', 'games');
const OUT = path.join(ROOT, 'data', 'cw-stats.json');
const PLAYERS_DIR = path.join(ROOT, 'data', 'players');   // splits / highs per team, read by player.html

const NAMES = {
  'macewan': 'MacEwan Griffins', 'alberta-golden-bears': 'Alberta Golden Bears', 'brandon-bobcats': 'Brandon Bobcats',
  'calgary-dinos': 'Calgary Dinos', 'fraser-valley-cascades': 'UFV Cascades', 'lethbridge-pronghorns': 'Lethbridge Pronghorns',
  'manitoba-bisons': 'Manitoba Bisons', 'mount-royal-cougars': 'Mount Royal Cougars', 'regina-cougars': 'Regina Cougars',
  'saskatchewan-huskies': 'Saskatchewan Huskies', 'thompson-rivers-wolfpack': 'Thompson Rivers WolfPack',
  'trinity-western-spartans': 'Trinity Western Spartans', 'ubc-thunderbirds': 'UBC Thunderbirds', 'ubco-heat': 'UBC Okanagan Heat',
  'unbc-timberwolves': 'UNBC Timberwolves', 'victoria-vikes': 'Victoria Vikes', 'winnipeg-wesmen': 'Winnipeg Wesmen'
};

const n = v => { const x = parseFloat(String(v == null ? '' : v).replace(/[^0-9.-]/g, '')); return isNaN(x) ? 0 : x; };
const ma = s => { const m = String(s || '').match(/(\d+)\s*-\s*(\d+)/); return m ? [+m[1], +m[2]] : [0, 0]; };
const r1 = x => (x == null || !isFinite(x) ? null : Math.round(x * 10) / 10);
const r3 = x => (x == null || !isFinite(x) ? null : Math.round(x * 1000) / 1000);
const pct = (m, a) => (a ? 100 * m / a : null);
const wl = s => { const m = String(s || '').match(/(\d+)\s*-\s*(\d+)/); return m ? [+m[1], +m[2]] : [0, 0]; };

// ---- Team metrics ---------------------------------------------------------
// Higher is better unless listed in LOWER.
const TEAM_METRICS = {
  winPct: 'Win %', ppg: 'Points', oppPpg: 'Opp points', margin: 'Point margin',
  fgPct: 'FG%', fg3Pct: '3P%', ftPct: 'FT%', efg: 'eFG%', ts: 'TS%', fg3mPg: '3PM', fg3aRate: '3PA rate', ftRate: 'FT rate',
  rpg: 'Rebounds', orpg: 'Off reb', drpg: 'Def reb', orebPct: 'OREB%', drebPct: 'DREB%',
  apg: 'Assists', astRate: 'AST% (of FGM)', topg: 'Turnovers', tovPct: 'TOV%', astTo: 'AST/TO',
  spg: 'Steals', bpg: 'Blocks', pfpg: 'Fouls',
  pace: 'Pace (poss/40)', ortg: 'Off rating', drtg: 'Def rating', net: 'Net rating',
  oppFgPct: 'Opp FG%', oppFg3Pct: 'Opp 3P%', oppEfg: 'Opp eFG%', oppTovPct: 'Forced TOV%', oppFtRate: 'Opp FT rate', oppFg3aRate: 'Opp 3PA rate'
};
const TEAM_LOWER = new Set(['oppPpg', 'topg', 'tovPct', 'pfpg', 'drtg', 'oppFgPct', 'oppFg3Pct', 'oppEfg', 'oppFtRate']);
const TEAM_NEUTRAL = new Set(['pace', 'fg3aRate', 'oppFg3aRate']);   // ranked high-to-low, but not "good" or "bad"

const KEYS = ['mins', 'fgm', 'fga', 'fg3m', 'fg3a', 'ftm', 'fta', 'oreb', 'dreb', 'reb', 'a', 'to', 'stl', 'blk', 'pf', 'pts'];
function sumGames(games, side) {
  const t = Object.fromEntries(KEYS.map(k => [k, 0]));
  games.forEach(g => KEYS.forEach(k => { t[k] += (g[side] && g[side][k]) || 0; }));
  return t;
}
const possOf = t => t.fga - t.oreb + t.to + 0.44 * t.fta;

function teamLine(allGames) {
  // Only games with both teams' box scores (exhibitions vs NCAA / other teams
  // have just one side on usportshoops.ca).
  const games = allGames.filter(g => g.us && g.them && g.them.fga);
  const gp = games.length;
  if (!gp) return null;
  const us = sumGames(games, 'us'), th = sumGames(games, 'them');
  const wins = games.filter(g => g.us && g.them && g.us.pts > g.them.pts).length;
  const poss = (possOf(us) + possOf(th)) / 2;
  const fortyMinPeriods = (us.mins || gp * 200) / 200;               // team minutes / 200 = 40-minute games
  return {
    gp, w: wins, l: gp - wins, winPct: r3(wins / gp),
    ppg: r1(us.pts / gp), oppPpg: r1(th.pts / gp), margin: r1((us.pts - th.pts) / gp),
    fgPct: r1(pct(us.fgm, us.fga)), fg3Pct: r1(pct(us.fg3m, us.fg3a)), ftPct: r1(pct(us.ftm, us.fta)),
    efg: r1(pct(us.fgm + 0.5 * us.fg3m, us.fga)), ts: r1(pct(us.pts, 2 * (us.fga + 0.44 * us.fta))),
    fg3mPg: r1(us.fg3m / gp), fg3aRate: r1(pct(us.fg3a, us.fga)), ftRate: r1(pct(us.fta, us.fga)),
    rpg: r1(us.reb / gp), orpg: r1(us.oreb / gp), drpg: r1(us.dreb / gp),
    orebPct: r1(pct(us.oreb, us.oreb + th.dreb)), drebPct: r1(pct(us.dreb, us.dreb + th.oreb)),
    apg: r1(us.a / gp), astRate: r1(pct(us.a, us.fgm)), topg: r1(us.to / gp), tovPct: r1(pct(us.to, poss)),
    astTo: us.to ? Math.round(100 * us.a / us.to) / 100 : null,
    spg: r1(us.stl / gp), bpg: r1(us.blk / gp), pfpg: r1(us.pf / gp),
    pace: r1(poss / fortyMinPeriods), ortg: r1(100 * us.pts / poss), drtg: r1(100 * th.pts / poss), net: r1(100 * (us.pts - th.pts) / poss),
    oppFgPct: r1(pct(th.fgm, th.fga)), oppFg3Pct: r1(pct(th.fg3m, th.fg3a)), oppEfg: r1(pct(th.fgm + 0.5 * th.fg3m, th.fga)),
    oppTovPct: r1(pct(th.to, poss)), oppFtRate: r1(pct(th.fta, th.fga)), oppFg3aRate: r1(pct(th.fg3a, th.fga)),
    poss: Math.round(poss / gp)
  };
}

// Rank 1 = best. Ties share a rank.
function rankAll(items, key, lowerIsBetter) {
  const vals = items.filter(it => it.v[key] != null);
  vals.sort((a, b) => (lowerIsBetter ? a.v[key] - b.v[key] : b.v[key] - a.v[key]));
  const out = {};
  vals.forEach((it, i) => {
    const prev = vals[i - 1];
    out[it.id] = prev && prev.v[key] === it.v[key] ? out[prev.id] : i + 1;
  });
  return { ranks: out, count: vals.length };
}

// ---- Player metrics -------------------------------------------------------
const PLAYER_METRICS = {
  ppg: 'Points', rpg: 'Rebounds', apg: 'Assists', spg: 'Steals', bpg: 'Blocks', topg: 'Turnovers', mpg: 'Minutes',
  orpg: 'Off reb', drpg: 'Def reb', fgPct: 'FG%', fg3Pct: '3P%', ftPct: 'FT%', fg3mPg: '3PM', ftaPg: 'FTA',
  efg: 'eFG%', ts: 'TS%', usg: 'Usage %', astPct: 'AST%', orebPct: 'OREB%', drebPct: 'DREB%', stlPct: 'STL%', blkPct: 'BLK%',
  astTo: 'AST/TO', gmsc: 'Game Score', pts40: 'Pts / 40', reb40: 'Reb / 40', ast40: 'Ast / 40', fg3aRate: '3PA rate', ftRate: 'FT rate'
};
const PLAYER_LOWER = new Set(['topg']);
const PLAYER_NEUTRAL = new Set(['fg3aRate', 'ftRate', 'mpg']);
// Shooting % ranks need volume (per game): FG 3 att, 3P 1.5 att, FT 1.5 att.
const PCT_MIN = { fgPct: ['fga', 3], efg: ['fga', 3], ts: ['fga', 3], fg3Pct: ['fg3a', 1.5], ftPct: ['fta', 1.5] };

function playerLine(ps, team, log, fields, games) {
  const gp = n(ps.gp), min = n(ps.mins);
  const [fgm, fga] = ma(ps.fg), [fg3m, fg3a] = ma(ps.fg3), [ftm, fta] = ma(ps.ft), [oreb, dreb] = ma(ps.orebDreb);
  const reb = n(ps.reb), a = n(ps.a), to = n(ps.to), stl = n(ps.stl), blk = n(ps.blk), pf = n(ps.pf), pts = n(ps.pts);
  const per = v => (gp ? r1(v / gp) : null);
  const p40 = v => (min ? r1(40 * v / min) : null);
  const tt = team.teamTotals || {};
  const tMin = n(tt.mins), [tFgm, tFga] = ma(tt.fg), tFta = ma(tt.ft)[1];
  const tTo = n(tt.to);
  const usg = min && tMin ? 100 * (fga + 0.44 * fta + to) * (tMin / 5) / (min * (tFga + 0.44 * tFta + tTo)) : null;
  const astPct = min && tMin ? 100 * a / ((min / (tMin / 5)) * tFgm - fgm) : null;
  const gmsc = gp ? (pts + 0.4 * fgm - 0.7 * fga - 0.4 * (fta - ftm) + 0.7 * oreb + 0.3 * dreb + stl + 0.7 * a + 0.7 * blk - 0.4 * pf - to) / gp : null;
  const out = {
    gp, gs: n(ps.gs), min, mpg: per(min), pts, ppg: per(pts), reb, rpg: per(reb), orpg: per(oreb), drpg: per(dreb),
    a, apg: per(a), to, topg: per(to), stl, spg: per(stl), blk, bpg: per(blk), pf, pfpg: per(pf),
    fgm, fga, fg3m, fg3a, ftm, fta, oreb, dreb,
    fgPct: r1(pct(fgm, fga)), fg3Pct: r1(pct(fg3m, fg3a)), ftPct: r1(pct(ftm, fta)), fg3mPg: per(fg3m), ftaPg: per(fta),
    efg: r1(pct(fgm + 0.5 * fg3m, fga)), ts: r1(pct(pts, 2 * (fga + 0.44 * fta))),
    fg3aRate: r1(pct(fg3a, fga)), ftRate: r1(pct(fta, fga)),
    astTo: to ? Math.round(100 * a / to) / 100 : null,
    usg: r1(usg), astPct: astPct != null && astPct >= 0 ? r1(astPct) : null, gmsc: r1(gmsc),
    pts40: p40(pts), reb40: p40(reb), ast40: p40(a)
  };

  // From the box-score game log: rebound / steal / block rates, splits and highs.
  if (log && log.length && fields && fields.length) {
    const rows = log.map(r => Object.fromEntries(fields.map((f, i) => [f, r[i]])));
    const played = rows.filter(r => r.mins > 0);
    const sum = (list, k) => list.reduce((t, r) => t + (r[k] || 0), 0);
    let tm = 0, pm = 0, tOreb = 0, tDreb = 0, oOreb = 0, oDreb = 0, oPoss = 0, oFga = 0, o3a = 0;
    played.forEach(r => {
      const g = games[r.g];
      if (!g || !g.us || !g.them || !g.them.fga) return;
      pm += r.mins; tm += g.us.mins || 200; tOreb += g.us.oreb; tDreb += g.us.dreb; oOreb += g.them.oreb; oDreb += g.them.dreb;
      oPoss += possOf(g.them); oFga += g.them.fga; o3a += g.them.fg3a;
    });
    if (pm && tm) {
      const share = (tm / 5) / pm;
      out.orebPct = r1(100 * sum(played, 'oreb') * share / (tOreb + oDreb));
      out.drebPct = r1(100 * sum(played, 'dreb') * share / (tDreb + oOreb));
      out.stlPct = r1(100 * sum(played, 'stl') * share / oPoss);
      out.blkPct = r1(100 * sum(played, 'blk') * share / (oFga - o3a));
    }
    const split = list => {
      const k = list.length;
      if (!k) return null;
      const s = key => sum(list, key);
      return {
        g: k, mpg: r1(s('mins') / k), ppg: r1(s('pts') / k), rpg: r1(s('reb') / k), apg: r1(s('a') / k), topg: r1(s('to') / k),
        spg: r1(s('stl') / k), bpg: r1(s('blk') / k), fgPct: r1(pct(s('fgm'), s('fga'))), fg3Pct: r1(pct(s('fg3m'), s('fg3a'))),
        ftPct: r1(pct(s('ftm'), s('fta'))), ts: r1(pct(s('pts'), 2 * (s('fga') + 0.44 * s('fta'))))
      };
    };
    const isConf = r => /league/i.test((games[r.g] || {}).type || '');
    const both = r => { const g = games[r.g]; return !!(g && g.us && g.them && g.them.pts != null); };
    const won = r => both(r) && games[r.g].us.pts > games[r.g].them.pts;
    out.splits = {
      last5: split(played.slice(-5)), conf: split(played.filter(isConf)),
      home: split(played.filter(r => (games[r.g] || {}).home === true)), away: split(played.filter(r => (games[r.g] || {}).home === false)),
      wins: split(played.filter(won)), losses: split(played.filter(r => both(r) && !won(r))),
      starter: split(played.filter(r => r.starter)), bench: split(played.filter(r => !r.starter))
    };
    const high = k => played.reduce((b, r) => (r[k] > (b ? b[k] : -1) ? r : b), null);
    out.highs = {};
    ['pts', 'reb', 'a', 'stl', 'blk', 'fg3m'].forEach(k => {
      const r = high(k);
      if (r && r[k] > 0) { const g = games[r.g] || {}; out.highs[k] = { v: r[k], opp: g.opp || '', date: g.date || '' }; }
    });
    out.doubleDoubles = played.filter(r => [r.pts, r.reb, r.a, r.stl, r.blk].filter(v => v >= 10).length >= 2).length;
  }
  return out;
}

function run() {
  let data;
  try { data = JSON.parse(fs.readFileSync(DATA, 'utf-8')); } catch (e) { console.warn('build_cw_stats: no data file, skipped.'); return; }
  const teams = {};
  const players = [];

  for (const [slug, team] of Object.entries(data)) {
    if (!team || !Array.isArray(team.playerStats)) continue;
    let g = null;
    try { g = JSON.parse(fs.readFileSync(path.join(GAMES, slug + '.json'), 'utf-8')); } catch (e) {}
    const games = (g && g.games) || [];
    const confGames = games.filter(x => /league/i.test(x.type || ''));
    const twoSided = games.filter(x => x.us && x.them && x.them.fga);
    const [cw, cl] = wl(team.recordSummary && team.recordSummary.conf);
    const [ow, ol] = wl(team.recordSummary && team.recordSummary.overall);
    const all = teamLine(games);
    const conf = teamLine(confGames);
    // Win % uses the official records (games without a box score still count).
    if (all) all.winPct = ow + ol ? r3(ow / (ow + ol)) : all.winPct;
    if (conf) conf.winPct = cw + cl ? r3(cw / (cw + cl)) : conf.winPct;
    teams[slug] = {
      name: NAMES[slug] || team.usportsName, short: team.usportsName, coach: team.headCoach || '',
      conf: `${cw}-${cl}`, overall: `${ow}-${ol}`, boxGames: twoSided.length, confBoxGames: confGames.filter(x => x.them && x.them.fga).length,
      scope: { all, conf }
    };
    const rosterBy = new Map((team.roster || []).map(p => [String(p.name).toLowerCase().trim(), p]));
    for (const ps of team.playerStats) {
      const ro = rosterBy.get(String(ps.name).toLowerCase().trim()) || {};
      const log = g && g.logs ? g.logs[ps.name] : null;
      players.push(Object.assign({
        team: slug, name: ps.name, num: ro.number || '', pos: ro.pos || '', ht: ro.ht || '', elig: ro.elig || '',
        hometown: ro.hometown || '', school: ro.school || ''
      }, playerLine(ps, team, log, g && g.fields, games)));
    }
  }

  // Team ranks (all games and conference games), 1 = best in Canada West.
  for (const sc of ['all', 'conf']) {
    const items = Object.entries(teams).filter(([, t]) => t.scope[sc]).map(([id, t]) => ({ id, v: t.scope[sc] }));
    for (const key of Object.keys(TEAM_METRICS)) {
      const { ranks, count } = rankAll(items, key, TEAM_LOWER.has(key));
      items.forEach(it => {
        const t = teams[it.id].scope[sc];
        (t.ranks = t.ranks || {})[key] = ranks[it.id] || null;
        t.rankOf = count;
      });
    }
  }

  // Player ranks among qualified players: played half his team's games, 10+ minutes a game.
  const teamGp = slug => { const t = data[slug] && data[slug].teamTotals; return n(t && t.gp) || Math.max(0, ...data[slug].playerStats.map(p => n(p.gp))); };
  players.forEach(p => { p.qualified = p.gp >= Math.max(1, Math.ceil(teamGp(p.team) / 2)) && (p.mpg || 0) >= 10; });
  const qual = players.filter(p => p.qualified);
  for (const key of Object.keys(PLAYER_METRICS)) {
    const pool = qual.filter(p => !PCT_MIN[key] || (p.gp && p[PCT_MIN[key][0]] / p.gp >= PCT_MIN[key][1]));
    const items = pool.map(p => ({ id: p.team + '|' + p.name, v: p }));
    const { ranks, count } = rankAll(items, key, PLAYER_LOWER.has(key));
    pool.forEach(p => { (p.ranks = p.ranks || {})[key] = [ranks[p.team + '|' + p.name], count]; });
  }
  // Team rank (within his own roster) for the main counting stats.
  for (const slug of Object.keys(teams)) {
    const mine = players.filter(p => p.team === slug && p.gp > 0);
    ['ppg', 'rpg', 'apg', 'spg', 'bpg', 'mpg'].forEach(key => {
      const { ranks } = rankAll(mine.map(p => ({ id: p.name, v: p })), key, false);
      mine.forEach(p => { (p.teamRanks = p.teamRanks || {})[key] = ranks[p.name] || null; });
    });
  }

  // Splits and season highs are only needed on the player page: one small file per team.
  if (!fs.existsSync(PLAYERS_DIR)) fs.mkdirSync(PLAYERS_DIR, { recursive: true });
  for (const slug of Object.keys(teams)) {
    const detail = {};
    players.filter(p => p.team === slug).forEach(p => {
      if (p.splits || p.highs) detail[p.name] = { splits: p.splits, highs: p.highs, doubleDoubles: p.doubleDoubles || 0 };
      delete p.splits; delete p.highs;
    });
    fs.writeFileSync(path.join(PLAYERS_DIR, slug + '.json'), JSON.stringify(detail), 'utf-8');
  }

  const out = {
    updatedAt: new Date().toISOString(),
    season: (data.macewan && data.macewan.season) || '2026-27',
    qualifier: 'Qualified players: played at least half of his team\'s games and 10+ minutes a game. Shooting % ranks also need 3+ FG, 1.5+ 3PT or 1.5+ FT attempts a game.',
    teamMetrics: TEAM_METRICS, teamLower: [...TEAM_LOWER], teamNeutral: [...TEAM_NEUTRAL],
    playerMetrics: PLAYER_METRICS, playerLower: [...PLAYER_LOWER], playerNeutral: [...PLAYER_NEUTRAL],
    teams, players
  };
  fs.writeFileSync(OUT, JSON.stringify(out), 'utf-8');
  console.log(`✅ Wrote ${OUT}: ${Object.keys(teams).length} teams, ${players.length} players (${qual.length} qualified)`);
}

if (require.main === module) run();
module.exports = { run, teamLine, playerLine };
