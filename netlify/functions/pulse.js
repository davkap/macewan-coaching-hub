// Basketball Pulse: scores, top performers, starters, team stats, standings and injuries
// for U Sports, NCAA D1 men and the NBA (pulse.html).
//
//   GET ?league=nba|ncaa|usports&view=scores[&date=YYYYMMDD]   games of the day
//   GET ?league=…&view=game&id=<game id>                        box score
//   GET ?league=nba|ncaa&view=injuries                          injury list
//   GET ?league=…&view=table                                    NBA standings / NCAA AP Top 25 /
//                                                               U Sports table built from the scores
//
// Sources: ESPN's public site API for the NBA and NCAA (same data as espn.com), and
// usportshoops.ca for U Sports (the box-score reader in scripts/lib/usports-scraper.js).
// Everything is public data; answers are cached (memory + Blobs store "pulse") so the
// sources aren't hit on every page view. Add a league = add an adapter below
// (EuroLeague later).
const { getStore, connectLambda } = require('@netlify/blobs');
const { parseBoxScore } = require('../../scripts/lib/usports-scraper');

const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' };
const reply = (statusCode, body) => ({ statusCode, headers: HEADERS, body: JSON.stringify(body) });
const memory = global._pulseMemory || (global._pulseMemory = new Map());
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' };

function store() { try { return getStore('pulse'); } catch (e) { return null; } }
// Cached fetch: `ttl` seconds. Falls back to the last good copy if the source is down.
async function cached(key, ttl, make) {
  const now = Date.now();
  const m = memory.get(key);
  if (m && now - m.at < ttl * 1000) return m.data;
  const s = store();
  let saved = null;
  if (s) { try { const v = await s.get(key); if (v) saved = JSON.parse(v); } catch (e) {} }
  if (saved && now - saved.at < ttl * 1000) { memory.set(key, saved); return saved.data; }
  try {
    const data = await make();
    const rec = { at: now, data };
    memory.set(key, rec);
    if (s) { try { await s.set(key, JSON.stringify(rec)); } catch (e) {} }
    return data;
  } catch (e) {
    if (saved) return Object.assign({ stale: true }, saved.data);
    if (m) return m.data;
    throw e;
  }
}
async function getJSON(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error('Source answered ' + r.status);
  return r.json();
}
async function getText(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error('Source answered ' + r.status);
  return r.text();
}
const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '');
// "Today" in Edmonton, so the evening's games don't jump to tomorrow at 6 pm.
const todayLocal = () => ymd(new Date(Date.now() - 6 * 3600 * 1000));

// ------------------------------------------------------------------ ESPN (NBA, NCAA)
const ESPN = { nba: 'basketball/nba', ncaa: 'basketball/mens-college-basketball' };
const site = (lg, p) => `https://site.api.espn.com/apis/site/v2/sports/${ESPN[lg]}/${p}`;

function espnGame(lg, e) {
  const c = (e.competitions || [])[0] || {};
  const st = (e.status || c.status || {}).type || {};
  const team = t => ({
    id: t.team && t.team.id, name: t.team && (t.team.shortDisplayName || t.team.displayName), full: t.team && t.team.displayName,
    abbr: t.team && t.team.abbreviation, logo: t.team && (t.team.logo || (t.team.logos || [])[0] && t.team.logos[0].href),
    score: t.score, record: ((t.records || [])[0] || {}).summary || '', winner: !!t.winner,
    rank: t.curatedRank && t.curatedRank.current && t.curatedRank.current < 99 ? t.curatedRank.current : null
  });
  const comps = c.competitors || [];
  const home = comps.find(t => t.homeAway === 'home') || comps[0] || {};
  const away = comps.find(t => t.homeAway === 'away') || comps[1] || {};
  const leaders = [];
  if (st.state !== 'pre') {
    comps.forEach(t => (t.leaders || []).forEach(l => {
      if (!/^(points|rebounds|assists)$/.test(l.name)) return;
      const x = (l.leaders || [])[0];
      if (x && x.athlete) leaders.push({ stat: l.name, value: x.displayValue, player: x.athlete.displayName || x.athlete.shortName, team: t.team && t.team.abbreviation });
    }));
  }
  const link = ((e.links || []).find(x => (x.rel || []).indexOf('summary') >= 0) || {}).href || '';
  return {
    id: e.id, league: lg, start: e.date, state: st.state || 'pre', detail: st.shortDetail || st.detail || '',
    completed: !!st.completed, home: team(home), away: team(away), leaders,
    venue: c.venue && c.venue.fullName ? c.venue.fullName + (c.venue.address && c.venue.address.city ? ', ' + c.venue.address.city : '') : '',
    tv: ((c.broadcasts || [])[0] || {}).names ? c.broadcasts[0].names.join(', ') : '', note: ((c.notes || [])[0] || {}).headline || '', link
  };
}

async function espnScores(lg, date) {
  const d = date || todayLocal();
  const ttl = d === todayLocal() ? 45 : d < todayLocal() ? 3600 : 900;
  return cached(`${lg}_scores_${d}`, ttl, async () => {
    const j = await getJSON(site(lg, 'scoreboard') + `?dates=${d}` + (lg === 'ncaa' ? '&groups=50&limit=400' : '&limit=100'));
    return { league: lg, date: d, games: (j.events || []).map(e => espnGame(lg, e)) };
  });
}

function espnBox(lg, s) {
  const box = s.boxscore || {};
  const head = ((s.header || {}).competitions || [])[0] || {};
  const st = (head.status || {}).type || {};
  const teams = (box.players || []).map(p => {
    const g = (p.statistics || [])[0] || {};
    const names = g.names || g.labels || [];
    const players = (g.athletes || []).map(a => {
      const row = {};
      names.forEach((n, i) => { row[n] = (a.stats || [])[i]; });
      return { name: a.athlete && a.athlete.displayName, pos: a.athlete && a.athlete.position && a.athlete.position.abbreviation, jersey: a.athlete && a.athlete.jersey,
        starter: !!a.starter, dnp: !!a.didNotPlay, reason: a.reason || '', stats: row };
    });
    return { name: p.team && p.team.displayName, abbr: p.team && p.team.abbreviation, logo: p.team && p.team.logo, columns: names, players };
  });
  const teamStats = (box.teams || []).map(t => ({
    name: t.team && t.team.displayName, abbr: t.team && t.team.abbreviation,
    stats: (t.statistics || []).filter(x => x.displayValue != null).map(x => ({ label: x.label || x.name, value: x.displayValue }))
  }));
  const leaders = [];
  (s.leaders || []).forEach(t => (t.leaders || []).forEach(l => {
    const x = (l.leaders || [])[0];
    if (x && x.athlete && /^(points|rebounds|assists)$/.test(l.name)) leaders.push({ stat: l.name, value: x.displayValue, player: x.athlete.displayName, team: t.team && t.team.abbreviation });
  }));
  const injuries = (s.injuries || []).map(t => ({
    team: t.team && t.team.displayName, abbr: t.team && t.team.abbreviation,
    players: (t.injuries || []).map(i => ({ name: i.athlete && i.athlete.displayName, status: i.status,
      detail: i.details ? [i.details.side, i.details.type, i.details.detail].filter(x => x && x !== 'Not Specified').join(' ') : '',
      returns: i.details && i.details.returnDate || '' }))
  })).filter(t => t.players.length);
  const comps = head.competitors || [];
  const score = comps.map(t => ({ abbr: t.team && t.team.abbreviation, name: t.team && t.team.displayName, score: t.score, homeAway: t.homeAway, winner: !!t.winner,
    lines: (t.linescores || []).map(x => x.displayValue != null ? x.displayValue : x.value) }));
  return { league: lg, id: head.id, state: st.state, detail: st.shortDetail || st.detail, score, teams, teamStats, leaders, injuries };
}

async function espnGameBox(lg, id) {
  return cached(`${lg}_game_${id}`, 60, async () => {
    const s = await getJSON(site(lg, 'summary') + `?event=${encodeURIComponent(id)}`);
    const b = espnBox(lg, s);
    return b;
  }).then(b => b);
}

async function espnInjuries(lg) {
  return cached(`${lg}_injuries`, 1800, async () => {
    const j = await getJSON(site(lg, 'injuries'));
    return {
      league: lg, updated: j.timestamp,
      teams: (j.injuries || []).map(t => ({
        team: t.displayName, logo: t.logo || '',
        players: (t.injuries || []).map(i => ({ name: i.athlete && i.athlete.displayName, pos: i.athlete && i.athlete.position && i.athlete.position.abbreviation,
          status: i.status, comment: i.shortComment || '', date: i.date,
          detail: i.details ? [i.details.side, i.details.type, i.details.detail].filter(x => x && x !== 'Not Specified').join(' ') : '',
          returns: i.details && i.details.returnDate || '' }))
      })).filter(t => t.players.length)
    };
  });
}

async function nbaStandings() {
  return cached('nba_table', 1800, async () => {
    const j = await getJSON('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings');
    const val = (e, n) => { const s = (e.stats || []).find(x => x.name === n || x.type === n); return s ? s.displayValue : ''; };
    return {
      league: 'nba', kind: 'standings',
      groups: (j.children || []).map(g => ({
        name: g.name,
        columns: ['Team', 'W', 'L', 'PCT', 'GB', 'Home', 'Road', 'Last 10', 'Streak', 'PPG', 'OPP PPG'],
        rows: (g.standings.entries || []).slice().sort((a, b) => (+val(a, 'playoffSeed') || 99) - (+val(b, 'playoffSeed') || 99)).map(e => [
          e.team.displayName, val(e, 'wins'), val(e, 'losses'), val(e, 'winPercent'), val(e, 'gamesBehind'), val(e, 'Home'), val(e, 'Road'),
          val(e, 'Last Ten Games'), val(e, 'streak'), val(e, 'avgPointsFor'), val(e, 'avgPointsAgainst')])
      }))
    };
  });
}
async function ncaaRankings() {
  return cached('ncaa_table', 3600, async () => {
    const j = await getJSON(site('ncaa', 'rankings'));
    return {
      league: 'ncaa', kind: 'rankings',
      groups: (j.rankings || []).slice(0, 2).map(r => ({
        name: r.name + (r.type || r.occurrence ? ` · ${((r.occurrence || {}).displayValue || '').trim()}`.replace(/ · $/, '') : ''),
        columns: ['#', 'Team', 'Record', 'Points', 'Prev'],
        rows: (r.ranks || []).map(k => [k.current, (k.team.location || '') + (k.team.name ? ' ' + k.team.name : ''), k.recordSummary || '',
          k.points != null ? k.points + (k.firstPlaceVotes ? ` (${k.firstPlaceVotes})` : '') : '', k.previous || '-'])
      }))
    };
  });
}

// ------------------------------------------------------------------ U Sports (usportshoops.ca)
const US = 'https://usportshoops.ca/history';
const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const strip = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&#039;|&#39;/g, "'").replace(/\s+/g, ' ').trim();
function seasonOf(d) { const y = +d.slice(0, 4), m = +d.slice(4, 6); return m >= 7 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`; }

async function usGames(season) {
  return cached(`usports_list_${season}`, 600, async () => {
    const html = await getText(`${US}/seasongames.php?Gender=MBB&Season=${season}&Sort=DESC`);
    const t = html.split(/<h2>U SPORTS Men's Basketball Games Scores/i)[1] || html;
    const games = [];
    let date = '';
    t.split(/<tr[^>]*>/i).slice(2).forEach(row => {
      const cells = row.split(/<td[^>]*>/i).slice(1).map(c => c.split(/<\/td>/i)[0]);
      if (cells.length < 7) return;
      const dtxt = strip(cells[0]);
      const m = dtxt.match(/([A-Z][a-z]{2}) (\d{1,2}), (\d{4})/);
      if (m) date = `${m[3]}${String(MONTHS[m[1]]).padStart(2, '0')}${String(m[2]).padStart(2, '0')}`;
      const id = (row.match(/Gameid=([A-Za-z0-9]+)/) || [])[1] || '';
      const comment = strip(cells[8] || '') + (strip(cells[7] || '').replace(/Stats/g, '').trim() ? ' ' + strip(cells[7]).replace(/Stats/g, '').replace(/,\s*$/, '').trim() : '');
      games.push({ id, date, location: strip(cells[1]), conf: strip(cells[2]) === '*',
        winner: strip(cells[3]), wScore: +strip(cells[4]) || 0, loser: strip(cells[5]), lScore: +strip(cells[6]) || 0,
        note: comment.trim(), hasBox: !!id });
    });
    return { season, games };
  });
}

async function usBox(id, season) {
  return cached(`usports_game_${id}`, 86400, async () => {
    const html = await getText(`${US}/show-game-report.php?Gender=MBB&Season=${season}&Gameid=${encodeURIComponent(id)}`);
    const secs = parseBoxScore(html);
    if (!secs.length) throw new Error('No box score yet');
    return secs;
  });
}
const pct = (m, a) => a ? (100 * m / a).toFixed(1) : '-';
function usBoxView(id, secs, g) {
  const cols = ['MIN', 'PTS', 'FG', '3PT', 'FT', 'REB', 'OREB', 'AST', 'TO', 'STL', 'BLK', 'PF'];
  const teams = secs.map(s => ({
    name: s.team, columns: cols,
    players: s.players.map(p => ({ name: p.name, starter: p.starter, dnp: !p.mins && !p.pts, stats: {
      MIN: p.mins, PTS: p.pts, FG: `${p.fgm}-${p.fga}`, '3PT': `${p.fg3m}-${p.fg3a}`, FT: `${p.ftm}-${p.fta}`, REB: p.reb, OREB: p.oreb, AST: p.a, TO: p.to, STL: p.stl, BLK: p.blk, PF: p.pf } }))
  }));
  const teamStats = secs.map(s => {
    const t = s.players.reduce((a, p) => { Object.keys(p).forEach(k => { if (typeof p[k] === 'number') a[k] = (a[k] || 0) + p[k]; }); return a; }, {});
    return { name: s.team, stats: [
      { label: 'FG', value: `${t.fgm || 0}-${t.fga || 0}` }, { label: 'Field Goal %', value: pct(t.fgm, t.fga) },
      { label: '3PT', value: `${t.fg3m || 0}-${t.fg3a || 0}` }, { label: 'Three Point %', value: pct(t.fg3m, t.fg3a) },
      { label: 'FT', value: `${t.ftm || 0}-${t.fta || 0}` }, { label: 'Free Throw %', value: pct(t.ftm, t.fta) },
      { label: 'Rebounds', value: t.reb || 0 }, { label: 'Offensive Rebounds', value: t.oreb || 0 }, { label: 'Assists', value: t.a || 0 },
      { label: 'Turnovers', value: t.to || 0 }, { label: 'Steals', value: t.stl || 0 }, { label: 'Blocks', value: t.blk || 0 }, { label: 'Fouls', value: t.pf || 0 }] };
  });
  const leaders = [];
  [['points', 'pts'], ['rebounds', 'reb'], ['assists', 'a']].forEach(([stat, k]) => secs.forEach(s => {
    const best = s.players.slice().sort((a, b) => b[k] - a[k])[0];
    if (best && best[k] > 0) leaders.push({ stat, value: String(best[k]), player: best.name, team: s.team });
  }));
  const score = g ? [{ name: g.winner, score: g.wScore, winner: true }, { name: g.loser, score: g.lScore }] : [];
  return { league: 'usports', id, state: 'post', detail: 'Final', score, teams, teamStats, leaders, injuries: [],
    link: `${US}/show-game-report.php?Gender=MBB&Season=${g ? seasonOf(g.date) : ''}&Gameid=${id}` };
}
function usGameCard(g, secs) {
  const lead = secs ? usBoxView(g.id, secs, g).leaders : [];
  return { id: g.id, league: 'usports', start: g.date, state: 'post', detail: 'Final', completed: true, conf: g.conf,
    away: { name: g.winner, score: String(g.wScore), winner: true }, home: { name: g.loser, score: String(g.lScore) },
    leaders: lead,
    venue: g.location, note: g.note, hasBox: g.hasBox,
    link: g.id ? `${US}/show-game-report.php?Gender=MBB&Season=${seasonOf(g.date)}&Gameid=${g.id}` : '' };
}
async function usScores(date) {
  const season = seasonOf(date || todayLocal());
  const { games } = await usGames(season);
  const dates = Array.from(new Set(games.map(g => g.date))).sort().reverse();
  // No games that day: show the most recent day with games on or before it.
  const want = date || todayLocal();
  const day = dates.indexOf(want) >= 0 ? want : (dates.find(d => d <= want) || dates[dates.length - 1] || want);
  const list = games.filter(g => g.date === day);
  const boxes = await Promise.all(list.map(g => g.hasBox ? usBox(g.id, season).catch(() => null) : null));
  return { league: 'usports', date: day, asked: want, dates: dates.slice(0, 60), games: list.map((g, i) => usGameCard(g, boxes[i])) };
}
async function usTable(season) {
  const { games } = await usGames(season);
  // U Sports teams = teams that have played a conference (*) game; others are exhibition opponents.
  const us = new Set();
  games.filter(g => g.conf).forEach(g => { us.add(g.winner); us.add(g.loser); });
  const rec = {};
  const add = (t, pf, pa, win, conf) => {
    const r = rec[t] || (rec[t] = { team: t, gp: 0, w: 0, l: 0, cw: 0, cl: 0, pf: 0, pa: 0 });
    r.gp++; r.pf += pf; r.pa += pa; if (win) r.w++; else r.l++; if (conf) { if (win) r.cw++; else r.cl++; }
  };
  games.forEach(g => {
    if (us.has(g.winner)) add(g.winner, g.wScore, g.lScore, true, g.conf);
    if (us.has(g.loser)) add(g.loser, g.lScore, g.wScore, false, g.conf);
  });
  const rows = Object.values(rec).sort((a, b) => (b.cw - b.cl) - (a.cw - a.cl) || (b.w / b.gp) - (a.w / a.gp) || (b.pf - b.pa) / b.gp - (a.pf - a.pa) / a.gp);
  return {
    league: 'usports', kind: 'table', note: 'Built from every score on usportshoops.ca (exhibitions included in overall; conference = games marked *). A team appears after its first conference game.',
    groups: [{ name: 'U Sports men · all games so far', columns: ['Team', 'Conf W-L', 'Overall', 'PPG', 'OPP PPG', 'Diff'],
      rows: rows.map(r => [r.team, `${r.cw}-${r.cl}`, `${r.w}-${r.l}`, (r.pf / r.gp).toFixed(1), (r.pa / r.gp).toFixed(1), ((r.pf - r.pa) / r.gp > 0 ? '+' : '') + ((r.pf - r.pa) / r.gp).toFixed(1)]) }]
  };
}

// ------------------------------------------------------------------ handler
exports.handler = async function (event) {
  try { connectLambda(event); } catch (e) {}
  const q = event.queryStringParameters || {};
  const lg = String(q.league || '').toLowerCase();
  const view = String(q.view || 'scores').toLowerCase();
  const date = /^\d{8}$/.test(q.date || '') ? q.date : '';
  const id = String(q.id || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 40);
  try {
    if (lg === 'nba' || lg === 'ncaa') {
      if (view === 'scores') return reply(200, await espnScores(lg, date));
      if (view === 'game' && id) return reply(200, await espnGameBox(lg, id));
      if (view === 'injuries') return reply(200, await espnInjuries(lg));
      if (view === 'table') return reply(200, lg === 'nba' ? await nbaStandings() : await ncaaRankings());
    }
    if (lg === 'usports') {
      const season = seasonOf(date || todayLocal());
      if (view === 'scores') return reply(200, await usScores(date));
      if (view === 'game' && id) {
        const { games } = await usGames(season);
        const g = games.find(x => x.id === id);
        return reply(200, usBoxView(id, await usBox(id, g ? seasonOf(g.date) : season), g));
      }
      if (view === 'table') return reply(200, await usTable(season));
      if (view === 'injuries') return reply(200, { league: 'usports', teams: [], note: 'U Sports teams don\'t publish injury reports.' });
    }
    return reply(400, { ok: false, message: 'Pick a league (usports, ncaa, nba) and a view.' });
  } catch (e) {
    return reply(502, { ok: false, message: 'Could not reach the source right now: ' + e.message });
  }
};
