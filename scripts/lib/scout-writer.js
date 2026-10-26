// Writes the film-style sections of each opponent's 2026-27 scouting report
// (Keys to victory, Offense, Defense, How we attack their D, How we defend their O,
// Special situations, Practice points) from this season's usportshoops.ca stats,
// in our own Griffin Concepts language (closeout tags, coverages, BEN, Hit-Find-Get…).
//
// Rules only, no AI service. Runs on every build, so the report follows the stats.
// Public stats only: Synergy numbers are private and are added in the browser for
// logged-in users (synergy-view.js -> reportBullets), never written here.
//
// Output: { keys, offense, defense, attack, defend, special, practice }, each an
// array of markdown list lines (keys/practice numbered, the rest bullets).

const { madeAtt, closeoutFor } = require('./closeouts');

const f1 = n => (Math.round(n * 10) / 10).toFixed(1);
const pct = n => `${Math.round(n)}%`;
const ord = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
const num = v => parseFloat(v) || 0;
const list = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];

// Team numbers per game from the team totals row.
function teamNumbers(t) {
  const tt = (t && t.teamTotals) || {};
  const gp = num(tt.gp);
  if (!gp) return null;
  const pg = v => v / gp;
  const [fgm, fga] = madeAtt(tt.fg), [fg3m, fg3a] = madeAtt(tt.fg3), [ftm, fta] = madeAtt(tt.ft), [oreb, dreb] = madeAtt(tt.orebDreb);
  const rec = t.recordSummary || {};
  return {
    gp, ppg: num(tt.ppg) || pg(num(tt.pts)), oppPpg: num(rec.ppgAgainst),
    fgPct: fga ? 100 * fgm / fga : 0, fg3Pct: fg3a ? 100 * fg3m / fg3a : 0, ftPct: fta ? 100 * ftm / fta : 0,
    fg3aPg: pg(fg3a), threeRate: fga ? 100 * fg3a / fga : 0, ftRate: fga ? 100 * fta / fga : 0,
    orebPg: pg(oreb), drebPg: pg(dreb), apg: pg(num(tt.a)), astRate: fgm ? 100 * num(tt.a) / fgm : 0,
    topg: pg(num(tt.to)), stlpg: pg(num(tt.stl)), blkpg: pg(num(tt.blk)), pfpg: pg(num(tt.pf))
  };
}

// Players who have played, with per-game numbers, jersey and closeout tag.
function players(t) {
  const roster = (t && t.roster) || [];
  const rows = (t && t.playerStats) || [];
  const rosterOf = s => roster.find(p => p.name.toLowerCase() === s.name.toLowerCase())
    || roster.find(p => p.name.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(p.name.toLowerCase()));
  return rows.filter(s => num(s.gp) > 0 && !/team totals/i.test(s.name)).map(s => {
    const gp = num(s.gp), r = rosterOf(s) || {};
    const [fg3m, fg3a] = madeAtt(s.fg3), [ftm, fta] = madeAtt(s.ft), [fgm, fga] = madeAtt(s.fg), [oreb] = madeAtt(s.orebDreb);
    const i = {
      name: s.name, number: (r.number || '').toString().trim(), pos: r.pos || '', ht: r.ht || '', st: s, gp,
      mpg: num(s.mpg), ppg: num(s.ppg), rpg: num(s.rpg), apg: num(s.a) / gp, topg: num(s.to) / gp,
      stlpg: num(s.stl) / gp, blkpg: num(s.blk) / gp, pfpg: num(s.pf) / gp, orebPg: oreb / gp,
      fg3m, fg3a, fg3aPg: fg3a / gp, fg3Pct: fg3a ? 100 * fg3m / fg3a : 0, fta, ftaPg: fta / gp, ftPct: fta ? 100 * ftm / fta : 0,
      fgPct: fga ? 100 * fgm / fga : 0, fgaPg: fga / gp
    };
    i.co = closeoutFor(i);
    i.label = (/^\d+$/.test(i.number) ? `#${i.number} ` : '') + i.name;
    return i;
  });
}

// Rank of a team among Canada West for a number (1 = highest).
function ranker(allTeams) {
  const nums = Object.values(allTeams).map(teamNumbers).filter(Boolean);
  return (key, value) => 1 + nums.filter(n => n[key] > value).length;
}

function writeScoutSections(team, allTeams) {
  const n = teamNumbers(team);
  const ps = players(team);
  const name = team.usportsName || 'They';
  const out = { keys: [], offense: [], defense: [], attack: [], defend: [], special: [], practice: [] };
  if (!n || !ps.length) {
    const none = '- No 2026-27 games with stats yet. This section fills in automatically after their first games.';
    Object.keys(out).forEach(k => out[k].push(k === 'keys' || k === 'practice' ? none.replace('- ', '1. ') : none));
    return out;
  }
  const rank = ranker(allTeams);
  const teamsCount = Object.values(allTeams).filter(t => teamNumbers(t)).length;
  const hi = (key, v) => rank(key, v) <= 4, lo = (key, v) => rank(key, v) > teamsCount - 4;
  // "3rd in Canada West" for scoring/shooting; "2nd-most in Canada West" for counts.
  const rk = (key, v) => `${ord(rank(key, v))} in Canada West`;
  // Lower half reads the other way: "3rd-fewest" rather than "15th-most".
  const fewest = (key, v, what) => { const r = 1 + teamsCount - rank(key, v); return `the ${r === 1 ? 'fewest' : ord(r) + '-fewest'} ${what} in Canada West`; };
  const most = (key, v, what) => { const r = rank(key, v); return r > Math.ceil(teamsCount / 2) ? fewest(key, v, what) : `the ${r === 1 ? 'most' : ord(r) + '-most'} ${what} in Canada West`; };
  // Team totals include every game so far, exhibitions vs NCAA / non-U Sports teams too.
  const usRec = String((team.recordSummary || {}).usports || '').match(/(\d+)-(\d+)/);
  const usGames = usRec ? +usRec[1] + +usRec[2] : n.gp;
  const sample = n.gp > usGames ? `- **Sample:** ${n.gp} games so far, ${n.gp - usGames} of them vs teams outside U Sports (NCAA exhibitions etc.), which can inflate the numbers.` : null;

  const main = ps.filter(p => p.mpg >= 15 && p.gp >= 2).sort((a, b) => b.ppg - a.ppg);
  const core = (main.length >= 3 ? main : ps.slice().sort((a, b) => b.mpg - a.mpg)).slice(0, 7);
  const scorers = core.slice().sort((a, b) => b.ppg - a.ppg).slice(0, 3);
  const handlers = core.slice().sort((a, b) => b.apg - a.apg).filter(p => p.apg >= 1.5).slice(0, 2);
  const shooters = core.filter(p => p.co === 'Klay' || p.co === 'Book').sort((a, b) => b.fg3aPg - a.fg3aPg);
  const drivers = core.filter(p => p.co === 'Shaq' && p.ppg >= 5);
  const boards = core.filter(p => p.rpg >= 6 || p.orebPg >= 2).sort((a, b) => b.rpg - a.rpg);
  const blockers = core.filter(p => p.blkpg >= 1).sort((a, b) => b.blkpg - a.blkpg);
  const thieves = core.filter(p => p.stlpg >= 1.5).sort((a, b) => b.stlpg - a.stlpg);
  const foulers = core.filter(p => p.pfpg >= 3.2).sort((a, b) => b.pfpg - a.pfpg);
  const loose = core.filter(p => p.topg >= 2.5).sort((a, b) => b.topg - a.topg);
  const top = scorers[0];
  const short = p => p.label;
  const coWord = { Klay: 'Klay (flyby)', Book: 'Book (body)', Rose: 'Rose (square)', Shaq: 'Shaq (absorb the drive)' };

  // ---------------------------------------------------------------- Offense
  if (sample) out.offense.push(sample);
  out.offense.push(`- **Scoring:** ${f1(n.ppg)} PPG (${rk('ppg', n.ppg)}). Top scorers: ${list(scorers.map(p => `${short(p)} (${f1(p.ppg)})`))}.`);
  if (handlers.length) out.offense.push(`- **Ball handlers:** ${list(handlers.map(p => `${short(p)} (${f1(p.apg)} APG, ${f1(p.topg)} TO)`))}.`);
  out.offense.push(`- **3-point shooting:** ${f1(n.fg3aPg)} threes a game (${pct(n.threeRate)} of their shots, ${ord(rank('threeRate', n.threeRate))} in Canada West for how often they shoot 3s) at ${f1(n.fg3Pct)}%.`
    + (shooters.length ? ` Shooters: ${list(shooters.map(p => `${short(p)} (${f1(p.fg3Pct)}% on ${f1(p.fg3aPg)} a game)`))}.` : ' No volume shooter yet (nobody at 33%+ on 2+ threes a game).'));
  if (hi('ftRate', n.ftRate)) out.offense.push(`- **Gets to the line:** ${most('ftRate', n.ftRate, 'free throws per shot')}. They drive and draw contact.`);
  if (hi('orebPg', n.orebPg) || boards.some(p => p.orebPg >= 2)) out.offense.push(`- **Offensive glass:** ${f1(n.orebPg)} offensive rebounds a game (${most('orebPg', n.orebPg, 'offensive rebounds')})${boards.filter(p => p.orebPg >= 2).length ? `. Crashers: ${list(boards.filter(p => p.orebPg >= 2).map(p => `${short(p)} (${f1(p.orebPg)})`))}` : ''}.`);
  if (hi('astRate', n.astRate)) out.offense.push(`- **Ball movement:** assists on ${pct(n.astRate)} of their baskets (${most('astRate', n.astRate, 'assisted baskets')}). They share it: expect cuts and extra passes.`);
  else if (lo('astRate', n.astRate)) out.offense.push(`- **1-on-1 heavy:** assists on only ${pct(n.astRate)} of their baskets (${fewest('astRate', n.astRate, 'assisted baskets')}). Expect isolations and drives: build the wall.`);
  out.offense.push(`- **Ball security:** ${f1(n.topg)} turnovers a game (${most('topg', n.topg, 'turnovers')})${loose.length ? `. Most: ${list(loose.map(p => `${short(p)} (${f1(p.topg)})`))}` : ''}.`);

  // ---------------------------------------------------------------- Defense
  if (sample) out.defense.push(sample);
  out.defense.push(`- **Points allowed:** ${f1(n.oppPpg)} PPG (${fewest('oppPpg', n.oppPpg, 'points allowed')}).`);
  out.defense.push(`- **Pressure:** ${f1(n.stlpg)} steals a game (${most('stlpg', n.stlpg, 'steals')})${thieves.length ? `. Active hands: ${list(thieves.map(p => `${short(p)} (${f1(p.stlpg)} SPG)`))}` : ''}.`);
  out.defense.push(`- **Rim protection:** ${f1(n.blkpg)} blocks a game (${most('blkpg', n.blkpg, 'blocks')})${blockers.length ? `. Shot blockers: ${list(blockers.map(p => `${short(p)} (${f1(p.blkpg)} BPG)`))}` : ''}.`);
  out.defense.push(`- **Fouls:** ${f1(n.pfpg)} a game (${most('pfpg', n.pfpg, 'fouls')})${foulers.length ? `. Foul-prone: ${list(foulers.map(p => `${short(p)} (${f1(p.pfpg)} a game)`))}` : ''}.`);
  out.defense.push(`- **Defensive glass:** ${f1(n.drebPg)} defensive rebounds a game (${most('drebPg', n.drebPg, 'defensive rebounds')}).`);

  // -------------------------------------------------------- How we attack their D
  const att = [];
  if (n.oppPpg >= 80 || hi('oppPpg', n.oppPpg)) att.push(`- **Race:** they give up ${f1(n.oppPpg)} PPG. Keys, 3s and frees in the first 6 seconds; Head Man the ball ahead.`);
  if (hi('stlpg', n.stlpg) || thieves.length) att.push(`- **Value the ball vs their hands:** strong two-hand passes, Deep Outlet and C Cut outlets, no loose dribbles in traffic${thieves.length ? ` around ${list(thieves.map(short))}` : ''}.`);
  if (hi('pfpg', n.pfpg) || foulers.length) att.push(`- **Attack downhill and draw fouls:** paint touches every trip${foulers.length ? `. Put ${list(foulers.map(short))} in ball screens and make them guard` : ''}.`);
  if (blockers.length || hi('blkpg', n.blkpg)) att.push(`- **Don't finish over their shot blockers${blockers.length ? ` (${list(blockers.map(short))})` : ''}:** drive to Engage 2, then kick and swing (Drive Kick Swing). Use Engage Big / Gortat in the PNR to pull the big away.`);
  if (lo('drebPg', n.drebPg)) att.push(`- **Crash the glass:** they get ${fewest('drebPg', n.drebPg, 'defensive rebounds')}. Second shots are there.`);
  att.push('- **Paint touch every possession:** E2 ⇒ .5 decisions. Kick Out Get Out to keep spacing.');
  out.attack = att.slice(0, 5);

  // -------------------------------------------------------- How we defend their O
  const def = [];
  core.slice(0, 6).forEach(p => {
    const parts = [`C/O ${coWord[p.co] || p.co}`];
    const h = handlers.indexOf(p) >= 0;
    if (h) parts.push(p.co === 'Klay' || p.co === 'Book' ? 'on his ball screens: Flat/Grey (shooter), don\'t go under' : p.co === 'Shaq' ? 'on his ball screens: Under/Green, make him shoot' : 'on his ball screens: Drop/Brown, Ball-You-Basket');
    else if (p.co === 'Klay' || p.co === 'Book') parts.push('off-ball screens: Chase, bust over');
    if (p.rpg >= 6 || p.orebPg >= 2) parts.push('MUST BOX OUT');
    if (p.co === 'Shaq' && !h) parts.push('shrink the floor (BEN), make him a jump shooter');
    def.push(`- **${short(p)}** (${f1(p.ppg)} PPG, ${f1(p.rpg)} RPG, ${f1(p.fg3Pct)}% 3PT): ${parts.join('; ')}.`);
  });
  if (n.threeRate >= 40 || hi('threeRate', n.threeRate)) def.push(`- **Team:** they live at the 3-point line. KYP closeouts, Be In to Get Out, stunt and recover. No free 3s.`);
  else if (n.threeRate < 33 || lo('threeRate', n.threeRate)) def.push(`- **Team:** they want the paint. Shrink (Blocks, Elbows, Nail), build the wall, make them shoot over us.`);
  if (hi('orebPg', n.orebPg)) def.push(`- **Glass:** Hit-Find-Get on every shot, gang rebound, Sandwich their weak-side crasher.`);
  out.defend = def;

  // -------------------------------------------------------- Special situations
  const goodFt = core.filter(p => p.fta >= 6 && p.ftPct >= 75).sort((a, b) => b.ftPct - a.ftPct);
  const badFt = core.filter(p => p.fta >= 6 && p.ftPct < 62).sort((a, b) => a.ftPct - b.ftPct);
  out.special.push(`- **Free throws:** they shoot ${f1(n.ftPct)}% as a team (${rk('ftPct', n.ftPct)}).`);
  if (goodFt.length) out.special.push(`- **Late game, don't foul:** ${list(goodFt.slice(0, 3).map(p => `${short(p)} (${f1(p.ftPct)}%)`))}.`);
  if (badFt.length) out.special.push(`- **If we have to foul (Pork) late:** ${list(badFt.slice(0, 2).map(p => `${short(p)} (${f1(p.ftPct)}% FT)`))}.`);
  if (shooters.length) out.special.push(`- **EOG Up 3:** switch before and after the inbound. Know where ${list(shooters.slice(0, 3).map(short))} ${shooters.length === 1 ? 'is' : 'are'} at all times.`);
  out.special.push('- **BLOB (HAT):** inbound defender protects the basket and tracks the inbounder. Fight over every screen, no switches.');
  if (top) out.special.push(`- **End of quarter (Smack/Trap):** their hot hand is usually ${short(top)}. Be ready to double him.`);

  // -------------------------------------------------------- Keys to victory
  const keys = [];
  if (top) keys.push(`Make ${short(top)} (${f1(top.ppg)} PPG) work for everything: ${coWord[top.co] || top.co} closeouts, no easy paint touches.`);
  if (hi('orebPg', n.orebPg) || boards.length >= 2) keys.push(boards.length ? `Win the glass: box out ${list(boards.slice(0, 3).map(short))}. One & done.` : `Win the glass: they get ${most('orebPg', n.orebPg, 'offensive rebounds')}. Everyone hits a body, gang rebound. One & done.`);
  if (n.threeRate >= 40 || hi('threeRate', n.threeRate)) keys.push(`No free 3s: KYP closeouts on ${list(shooters.slice(0, 3).map(short)) || 'their shooters'}.`);
  else keys.push('Shrink the floor: show bodies at the Blocks, Elbows and Nail. Force tough 2s.');
  if (hi('stlpg', n.stlpg)) keys.push(`Take care of the ball: they get ${most('stlpg', n.stlpg, 'steals')}.`);
  if (hi('topg', n.topg)) keys.push(`Turn them over: they commit ${most('topg', n.topg, 'turnovers')}. Pressure the ball, Trace, active hands.`);
  if (hi('pfpg', n.pfpg)) keys.push('Get to the line: attack downhill, they foul a lot.');
  if (hi('ftRate', n.ftRate)) keys.push('Guard without fouling: Chest, show hands, verticality.');
  keys.push('Win D-Trans: no key, free or 3 in their first 6 seconds.');
  out.keys = keys.slice(0, 5).map((k, i) => `${i + 1}. ${k}`);

  // -------------------------------------------------------- Practice points
  const prac = [];
  if (core.length) prac.push(`KYP closeouts vs their personnel: ${list(core.slice(0, 6).map(p => `${short(p)} = ${p.co}`))}.`);
  if (handlers.length) prac.push(`PNR coverage reps vs ${list(handlers.map(short))} (see How we defend their O).`);
  if (boards.length) prac.push(`Box-out / Hit-Find-Get reps: ${list(boards.slice(0, 3).map(short))} crash.`);
  if (n.threeRate < 33 || lo('threeRate', n.threeRate) || drivers.length) prac.push('Shell drill with live drives: shrink to BEN, Stay Rotation (LOW 2nd pass, NAIL 1st pass).');
  if (hi('stlpg', n.stlpg)) prac.push('Press break / pressure handling: Head Man, Deep Outlet, C Cut.');
  if (blockers.length) prac.push('Drive Kick Swing and Engage Big reads vs a rim protector.');
  prac.push('Special situations walkthrough: EOG Up 2 / Up 3, BLOB (HAT), end-of-quarter Smack.');
  out.practice = prac.slice(0, 5).map((k, i) => `${i + 1}. ${k}`);
  return out;
}

module.exports = { writeScoutSections, teamNumbers, players };
