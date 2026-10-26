const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_PATH = path.join(ROOT, 'data', 'usports-rosters-stats.json');
const usportsData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const TEAMS_MAP = [
  { slug: 'macewan-griffins', jsonKey: 'macewan', title: 'MacEwan Griffins' },
  { slug: 'alberta-golden-bears', jsonKey: 'alberta-golden-bears', title: 'Alberta Golden Bears' },
  { slug: 'brandon-bobcats', jsonKey: 'brandon-bobcats', title: 'Brandon Bobcats' },
  { slug: 'calgary-dinos', jsonKey: 'calgary-dinos', title: 'Calgary Dinos' },
  { slug: 'fraser-valley-cascades', jsonKey: 'fraser-valley-cascades', title: 'UFV Cascades' },
  { slug: 'lethbridge-pronghorns', jsonKey: 'lethbridge-pronghorns', title: 'Lethbridge Pronghorns' },
  { slug: 'manitoba-bisons', jsonKey: 'manitoba-bisons', title: 'Manitoba Bisons' },
  { slug: 'mount-royal-cougars', jsonKey: 'mount-royal-cougars', title: 'Mount Royal Cougars' },
  { slug: 'regina-cougars', jsonKey: 'regina-cougars', title: 'Regina Cougars' },
  { slug: 'saskatchewan-huskies', jsonKey: 'saskatchewan-huskies', title: 'Saskatchewan Huskies' },
  { slug: 'thompson-rivers-wolfpack', jsonKey: 'thompson-rivers-wolfpack', title: 'TRU WolfPack' },
  { slug: 'trinity-western-spartans', jsonKey: 'trinity-western-spartans', title: 'Trinity Western Spartans' },
  { slug: 'ubc-thunderbirds', jsonKey: 'ubc-thunderbirds', title: 'UBC Thunderbirds' },
  { slug: 'ubco-heat', jsonKey: 'ubco-heat', title: 'UBCO Heat' },
  { slug: 'unbc-timberwolves', jsonKey: 'unbc-timberwolves', title: 'UNBC Timberwolves' },
  { slug: 'victoria-vikes', jsonKey: 'victoria-vikes', title: 'Victoria Vikes' },
  { slug: 'winnipeg-wesmen', jsonKey: 'winnipeg-wesmen', title: 'Winnipeg Wesmen' }
];

// Specific override data for Calgary Dinos from user prompt screenshot
const CALGARY_OVERRIDES = {
  "Hayden Franson": {
    num: "10", pos: "F", ht: `6'7"`, wt: "218 lbs",
    hand: "R", co: "Brown", dtran: "Locate/Shrink", pnr: "Over/Switch", pinDho: "Over/Switch", rebound: "MUST BOX OUT",
    notes: "Big guard/wing who plays well off mini C/O and in the PNR as roller/pop guy. Very good C&S 3pt shooter (POP THREAT). Will attack rim on bad C/O with straight line drives. If cut off will shoot turnaround.<br><br>WATCH OUT for off ball cutting<br><br>MUST BOX OUT",
    statsLast: ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
    statsUSports: ["12.1", "25.3", "47.1%", "37.0%", "70.0%", "6.8", "1.2", "1.8", "1.2", "1.0"]
  },
  "Aidan Smith": {
    num: "15", pos: "G", ht: `6'5"`, wt: "205 lbs",
    hand: "R", co: "Trae", dtran: "Locate", pnr: "Over/Switch", pinDho: "Over/Switch", rebound: "Box out",
    notes: "Excellent C&S 3pt shooter. Gets a lot of looks of extra's and drive & kick 3's. MUST LOCATE guy.",
    statsLast: ["9.9", "21.5", "47.0%", "36.7%", "100.0%", "3.6", "0.9", "0.7", "1.0", "0.3"],
    statsUSports: ["10.1", "21.7", "47.0%", "39.7%", "80.2%", "3.6", "1.2", "0.9", "1.1", "0.3"]
  },
  "Mrigendra Dhaliwal": {
    num: "3", pos: "G", ht: `6'2"`, wt: "161 lbs",
    hand: "R", co: "Trae", dtran: "Locate", pnr: "Over/Switch", pinDho: "Over/Switch", rebound: "Box out",
    notes: "Excellent 3pt shooting combo guard off the catch and dribble. MUST locate and C/O to the body. Good touch on middies attacking C/O and in PNR/DHO. BE PHYSICAL.<br><br>Attack defensively, does not want to defend, will look to steal the ball to compensate",
    statsLast: ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
    statsUSports: ["11.4", "24.8", "38.6%", "31.0%", "78.1%", "2.0", "1.8", "1.6", "1.5", "0.4"]
  },
  "Dre Francis": {
    num: "23", pos: "F", ht: `6'7"`, wt: "229 lbs",
    hand: "L", co: "Brown", dtran: "Shrink", pnr: "Under", pinDho: "Under", rebound: "Must Box out",
    notes: "Interior post player, strong bodied. His offence comes from punches or as the roll man in PNR. Likes to spin baseline on left block and finish reverse right hand. VERY RIGHT HANDED finisher<br><br>MUST BOX OUT",
    statsLast: ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
    statsUSports: ["9.8", "23.5", "57.1%", "16.7%", "52.2%", "6.6", "1.2", "1.8", "0.5", "1.2"]
  }
};

const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// madeAtt / closeoutFor (staff closeout rules) live in scripts/lib/closeouts.js,
// shared with the scouting report writer.
const { madeAtt, closeoutFor } = require('./scripts/lib/closeouts');

const f1 = n => (Math.round(n * 10) / 10).toFixed(1);
const ordinal = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');

/* Scouting note written automatically from the player's stats: his role
   (starts), then his main strengths, then anything we can attack.
   Ends with AUTO_NOTE_TAG so the site knows it may refresh it; a note a coach
   writes in Edit Cards is never replaced. */
const AUTO_NOTE_TAG = '(Auto-written from stats)';
function writeNote(i, ctx) {
  if (!i.st || !i.gp) {
    return `No 2026-27 stats yet: hasn't played a game with stats this season. ${AUTO_NOTE_TAG}`;
  }
  const out = [];
  const games = `${i.gp} game${i.gp === 1 ? '' : 's'}`;
  if (ctx.startersBasis === 'starts' && i.gs !== null) {
    const of = i.gsGames ? ` of ${i.gsGames} game${i.gsGames === 1 ? '' : 's'}` : '';
    if (i.gsGames && i.gs * 2 > i.gsGames) out.push(`Starter: started ${i.gs}${of}, ${f1(i.mpg)} MPG.`);
    else if (i.gs > 0) out.push(`Rotation player: started ${i.gs}${of}, ${f1(i.mpg)} MPG.`);
    else out.push(`Comes off the bench: ${f1(i.mpg)} MPG over ${games}.`);
  } else {
    out.push(`${f1(i.mpg)} MPG over ${games}.`);
  }

  const strengths = [];
  const ptsRank = ctx.rankOf(i, 'ppg'), rebRank = ctx.rankOf(i, 'rpg'), astRank = ctx.rankOf(i, 'apg');
  if (i.ppg >= 15) strengths.push(`primary scorer at ${f1(i.ppg)} PPG${ptsRank === 1 ? ' (team leader)' : ''}`);
  else if (i.ppg >= 10) strengths.push(`${ptsRank === 1 ? "the team's leading scorer" : `reliable scorer (${ordinal(ptsRank)} on the team)`} at ${f1(i.ppg)} PPG`);
  else if (i.ppg >= 6 && ptsRank <= 3) strengths.push(`${ordinal(ptsRank)}-leading scorer (${f1(i.ppg)} PPG)`);
  if (ctx.co === 'Klay') strengths.push(`knockdown 3PT shooter (${f1(i.fg3Pct)}% on ${f1(i.fg3aPg)} attempts a game)`);
  else if (ctx.co === 'Book') strengths.push(`capable 3PT shooter (${f1(i.fg3Pct)}% on ${f1(i.fg3aPg)} a game)`);
  if (i.fgPct >= 50 && i.fgaPg >= 4) strengths.push(`efficient finisher (${f1(i.fgPct)}% FG)`);
  if (i.rpg >= 8) strengths.push(`dominant rebounder (${f1(i.rpg)} RPG${rebRank === 1 ? ', team best' : ''})`);
  else if (i.rpg >= 6) strengths.push(`strong rebounder (${f1(i.rpg)} RPG)`);
  if (i.orebPg >= 2) strengths.push(`crashes the offensive glass (${f1(i.orebPg)} OREB a game)`);
  if (i.apg >= 4) strengths.push(`primary playmaker (${f1(i.apg)} APG${astRank === 1 ? ', team best' : ''})`);
  else if (i.apg >= 2.5) strengths.push(`secondary playmaker (${f1(i.apg)} APG)`);
  if (i.ftaPg >= 4) strengths.push(`gets to the line (${f1(i.ftaPg)} FTA a game, ${f1(i.ftPct)}%)`);
  if (i.stlpg >= 1.5) strengths.push(`active hands (${f1(i.stlpg)} SPG)`);
  if (i.blkpg >= 1) strengths.push(`rim protector (${f1(i.blkpg)} BPG)`);

  if (strengths.length) {
    const top = strengths.slice(0, 3);
    const list = top.length > 1 ? top.slice(0, -1).join(', ') + ' and ' + top[top.length - 1] : top[0];
    out.push(`Strengths: ${list}.`);
  } else if (i.mpg < 10) {
    out.push('Limited role so far.');
  } else {
    out.push(`Role player: ${f1(i.ppg)} PPG, ${f1(i.rpg)} RPG, ${f1(i.apg)} APG.`);
  }

  const attack = [];
  if (i.topg >= 3) attack.push(`turnover-prone (${f1(i.topg)} TO a game): pressure him`);
  if (i.ftaPg >= 2 && i.ftPct < 60) attack.push(`poor free-throw shooter (${f1(i.ftPct)}%)`);
  if (ctx.co === 'Shaq' && i.fg3aPg >= 1) attack.push(`not a threat from 3 (${f1(i.fg3Pct)}%)`);
  if (attack.length) out.push(`Attack: ${attack.join('; ')}.`);

  if (i.gp < 3) out.push(`Small sample (${games}).`);
  out.push(AUTO_NOTE_TAG);
  return out.join(' ');
}

function generateScoutCardsHtml(teamItem) {
  const teamData = usportsData[teamItem.jsonKey] || { roster: [] };
  const roster = teamData.roster || [];

  const playerStatsList = teamData.playerStats || [];
  const findStats = p => playerStatsList.find(s => s.name.toLowerCase() === p.name.toLowerCase() || p.name.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(p.name.toLowerCase()));
  const teamGames = teamData.boxScoreGames || 0;

  // Per-player numbers used by the card rules, the note and the sorting
  const infos = roster.map((p, idx) => {
    const st = findStats(p);
    const gp = st ? (parseFloat(st.gp) || 0) : 0;
    const per = v => (gp ? (parseFloat(v || 0) / gp) : 0);
    const [fg3m, fg3a] = madeAtt(st && st.fg3);
    const [ftm, fta] = madeAtt(st && st.ft);
    const [fgm, fga] = madeAtt(st && st.fg);
    const [oreb] = madeAtt(st && st.orebDreb);
    return {
      p, idx, st, gp,
      gs: st && st.gs !== undefined ? parseInt(st.gs, 10) || 0 : null,
      gsGames: st && st.gsGames !== undefined ? parseInt(st.gsGames, 10) || 0 : 0,
      mpg: st ? parseFloat(st.mpg) || 0 : 0,
      ppg: st ? parseFloat(st.ppg) || 0 : 0,
      rpg: st ? parseFloat(st.rpg) || 0 : 0,
      fgPct: st ? parseFloat(st.fgPct) || 0 : 0,
      fg3Pct: st ? parseFloat(st.fg3Pct) || 0 : 0,
      ftPct: st ? parseFloat(st.ftPct) || 0 : 0,
      fg3aPg: per(fg3a), fg3m, fg3a, ftaPg: per(fta), fta, fgaPg: per(fga), fga, fgm,
      orebPg: per(oreb), apg: per(st && st.a), topg: per(st && st.to), stlpg: per(st && st.stl), blkpg: per(st && st.blk)
    };
  });

  // Starters = players who started most of the team's games (from box scores).
  // Without box scores yet: the 5 players with the most minutes per game.
  const played = infos.filter(i => i.gp > 0);
  let isStarterInfo;
  let startersBasis;
  // "Started most games" = started more than half of the games he played in
  // where the box score marks the starters (not every box score does).
  if (teamGames > 0 && infos.some(i => i.gs)) {
    isStarterInfo = i => i.gs !== null && i.gsGames > 0 && i.gs * 2 > i.gsGames;
    startersBasis = 'starts';
  } else if (played.length) {
    const top5 = new Set(played.slice().sort((a, b) => b.mpg - a.mpg).slice(0, 5));
    isStarterInfo = i => top5.has(i);
    startersBasis = 'minutes';
  } else {
    isStarterInfo = i => i.idx < 5;
    startersBasis = 'roster';
  }
  const byRole = (a, b) => ((b.gs || 0) - (a.gs || 0)) || (b.mpg - a.mpg) || (a.idx - b.idx);
  const starters = infos.filter(isStarterInfo).sort(byRole).map(i => i.p);
  const bench = infos.filter(i => !isStarterInfo(i)).sort((a, b) => (b.mpg - a.mpg) || (a.idx - b.idx)).map(i => i.p);
  const infoOf = p => infos.find(i => i.p === p);

  // Team ranks (among players who have played) for the note
  const rankOf = (info, key) => 1 + played.filter(o => o[key] > info[key]).length;

  function renderCard(p, isStarter) {
    const override = (teamItem.jsonKey === 'calgary-dinos' && CALGARY_OVERRIDES[p.name]) ? CALGARY_OVERRIDES[p.name] : null;
    const info = infoOf(p);
    const statMatch = info.st;

    // Number, position and height come from the live roster; the hand-entered
    // Calgary overrides are only a fallback for those.
    const liveNum = (p.number !== undefined && p.number !== '' && p.number !== null) ? p.number : '';
    const num = liveNum || (override && override.num) || 'N/A';
    const name = p.name;
    const pos = p.pos || p.position || (override && override.pos) || 'G';
    // Show N/A when we don't actually know a player's height or weight
    const ht = String(p.ht || p.height || '').trim() || (override && override.ht) || 'N/A';
    const wt = override ? override.wt : (p.wt ? p.wt + ' lbs' : 'N/A');

    // ---- Staff rules (HC David Kapinga, Oct 2026) ----
    const hand = (override && override.hand) || 'R';
    const co = closeoutFor(info);
    const shooter = co === 'Book' || co === 'Klay';
    const dtran = shooter ? 'Locate' : '';
    const pnr = shooter ? 'Over/Switch' : '';
    const pinDho = shooter ? 'Over/Switch' : '';
    const rebound = info.rpg >= 6 ? 'MUST BOX OUT' : 'Box out';

    let notes = writeNote(info, { teamGames, startersBasis, isStarter, rankOf, co });
    if (override && override.notes) notes += '<br><br><strong>Coach note:</strong> ' + override.notes;

    let statsUSportsRow;
    let statsLast5Row;
    const dash10 = ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-'];

    // Live usportshoops stats win over the hand-entered override numbers
    // (those were copied from a screenshot and never update).
    if (!statMatch && override && override.statsUSports) {
      statsUSportsRow = override.statsUSports;
      statsLast5Row = override.statsLast5 || override.statsLast || dash10;
    } else if (statMatch) {
      const gp = parseFloat(statMatch.gp || 1) || 1;
      const ppg = statMatch.ppg ? parseFloat(statMatch.ppg).toFixed(1) : '0.0';
      const mpg = statMatch.mpg ? parseFloat(statMatch.mpg).toFixed(1) : '0.0';
      const fgPct = statMatch.fgPct ? `${parseFloat(statMatch.fgPct).toFixed(1)}%` : '0.0%';
      const fg3Pct = statMatch.fg3Pct ? `${parseFloat(statMatch.fg3Pct).toFixed(1)}%` : '0.0%';
      const ftPct = statMatch.ftPct ? `${parseFloat(statMatch.ftPct).toFixed(1)}%` : '0.0%';
      const rpg = statMatch.rpg ? parseFloat(statMatch.rpg).toFixed(1) : '0.0';
      const apg = (parseFloat(statMatch.a || 0) / gp).toFixed(1);
      const topg = (parseFloat(statMatch.to || 0) / gp).toFixed(1);
      const stlpg = (parseFloat(statMatch.stl || 0) / gp).toFixed(1);
      const blkpg = (parseFloat(statMatch.blk || 0) / gp).toFixed(1);

      statsUSportsRow = [ppg, mpg, fgPct, fg3Pct, ftPct, rpg, apg, topg, stlpg, blkpg];
      // Real last-5-games averages from box scores (falls back to the season line)
      const l5 = statMatch.last5;
      statsLast5Row = l5
        ? [l5.ppg, l5.mpg, l5.fgPct + '%', l5.fg3Pct + '%', l5.ftPct + '%', l5.rpg, l5.apg, l5.topg, l5.stlpg, l5.blkpg]
        : statsUSportsRow.slice();
    } else {
      statsUSportsRow = dash10;
      statsLast5Row = dash10;
    }

    // "No photo" placeholder: a grey tile with the jersey number. Fully
    // URL-encoded so its quotes can't break the <img> tag it sits in.
    const fallbackSvg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="140" viewBox="0 0 120 140"><rect width="120" height="140" fill="#e0e0e0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="bold" fill="#555">#${num}</text></svg>`);
    let rawPhoto = p.photo || '';
    if (rawPhoto.includes('gohorns.ca/images/')) {
      rawPhoto = rawPhoto.replace('https://gohorns.ca/images/', 'https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/');
    }
    const photoUrl = rawPhoto || fallbackSvg;

    return `
    <div class="card ${isStarter ? 'starter' : 'key'}">
      <div class="photo-tile">
        <img src="${photoUrl}" alt="${name}" data-fallback="${fallbackSvg}" onerror="this.onerror=null; this.src=this.dataset.fallback;">
      </div>
      <div class="card-info">
        <div class="player-header">#${num} • ${name} • ${pos} • ${ht} • ${wt}</div>
        <div class="header-divider"></div>
        <div class="tactical-tags">
          <strong>Hand:</strong> ${hand}, <strong>C/O:</strong> ${co}, <strong>DTRAN:</strong> ${dtran}
          <br><strong>PNR:</strong> ${pnr}, <strong>PIN/DHO:</strong> ${pinDho}
          <br><strong>REBOUND:</strong> ${rebound}
        </div>
        <div class="scout-notes">
          ${notes}
        </div>
        <table class="stats-table">
          <thead>
            <tr>
              <th></th><th>PTS</th><th>MIN</th><th>FG%</th><th>3P%</th><th>FT%</th><th>REB</th><th>AST</th><th>TO</th><th>STL</th><th>BLK</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Last 5 Games</td>${statsLast5Row.map(s => `<td>${s}</td>`).join('')}
            </tr>
            <tr>
              <td>U Sports</td>${statsUSportsRow.map(s => `<td>${s}</td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
  }

  return `<!doctype html>
<html lang="en">
<head>
  <script src="../../auth-lock.js"></script>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/site-responsive.css">
  <title>${teamItem.title}: Player Scout Cards | MacEwan Griffins</title>
  <style>
    :root {
      --mac-maroon: #98002e;
      --mac-tan: #d1ad7d;
      --mac-black: #111;
      --accent-red: #cc0000;
      --bg: #f4f4f4;
      --card-bg: #ffffff;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: #111;
      margin: 0;
      padding: 20px;
    }
    header.title {
      max-width: 1300px;
      margin: 0 auto 20px;
      padding-bottom: 12px;
      border-bottom: 3px solid var(--mac-maroon);
    }
    header.title h1 {
      margin: 0 0 4px;
      font-size: 26px;
      color: var(--mac-maroon);
    }
    header.title p {
      margin: 0;
      color: #555;
      font-size: 13px;
    }
    .section-banner {
      background: #000000;
      color: #ffffff;
      font-size: 18px;
      font-weight: 800;
      text-align: center;
      padding: 6px 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 24px 0 16px 0;
      border-radius: 4px;
      max-width: 1300px;
      margin-left: auto;
      margin-right: auto;
    }
    .section-basis { max-width: 1300px; margin: -6px auto 12px; font-size: 12px; color: #666; }
    .grid {
      max-width: 1300px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(580px, 1fr));
      gap: 20px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid #ccc;
      border-radius: 6px;
      padding: 14px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.06);
      display: flex;
      gap: 16px;
      position: relative;
      page-break-inside: avoid;
    }
    .card.starter {
      border-left: 6px solid var(--mac-maroon);
    }
    .photo-tile {
      flex: 0 0 120px;
      height: 140px;
      background: #e0e0e0;
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
    }
    .photo-tile img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .card-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .player-header {
      font-size: 16px;
      font-weight: 700;
      color: #111;
      margin-bottom: 3px;
    }
    .header-divider {
      height: 2px;
      background: var(--accent-red);
      width: 100%;
      margin-bottom: 8px;
    }
    .tactical-tags {
      font-size: 12.5px;
      line-height: 1.4;
      color: #111;
      margin-bottom: 8px;
    }
    .tactical-tags strong {
      font-weight: 700;
    }
    .scout-notes {
      font-size: 12.5px;
      line-height: 1.4;
      color: #111;
      margin-bottom: 12px;
      flex: 1;
    }
    .stats-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
      margin-top: auto;
    }
    .stats-table th {
      border-bottom: 1.5px solid var(--accent-red);
      padding: 3px 4px;
      text-align: center;
      font-weight: 700;
      font-size: 10.5px;
      color: #111;
    }
    .stats-table td {
      padding: 3px 4px;
      text-align: center;
      font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      color: #222;
    }
    .stats-table td:first-child, .stats-table th:first-child {
      text-align: left;
      font-family: inherit;
      font-weight: 600;
      width: 80px;
    }
    @media (max-width: 650px) {
      body { padding: 12px; }
      .grid { grid-template-columns: minmax(0, 1fr); }
      .card { flex-direction: column; min-width: 0; }
      .photo-tile { width: 100%; height: 180px; }
      .card-info { min-width: 0; width: 100%; }
      /* 10 stat columns don't fit a phone: let the table scroll sideways */
      .stats-table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; white-space: nowrap; }
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; background: white; }
      .grid { gap: 10px; grid-template-columns: repeat(2, 1fr); }
      .card { break-inside: avoid; border: 1px solid #888; }
    }
  </style>
</head>
<body>

<header class="title">
  <div style="margin-bottom: 12px; font-size: 13px;" class="no-print">
    <a href="../../index.html" style="color: var(--mac-maroon); font-weight: 700; text-decoration: none; margin-right: 15px;">🏠 Coaching Hub</a>
    <a href="../../canadawest-scout-2026-27.html" style="color: #555; font-weight: 700; text-decoration: none;">🏀 Scouting Hub</a>
  </div>
  ${teamItem.slug === 'macewan-griffins' ? '' : `<a class="no-print" href="../../opponent-scout.html?team=${teamItem.slug}&type=scout" style="display:inline-flex;align-items:center;min-height:44px;margin-bottom:10px;padding:0 16px;border-radius:8px;background:var(--mac-maroon);color:#fff;font-weight:700;font-size:14px;text-decoration:none;">📋 Team scouting report →</a>`}
  <h1>${teamItem.title}: Player Scout Cards</h1>
  <p>MacEwan Griffins Men's Basketball &middot; 2026-27 Canada West &middot; Tactical Prep Packet</p>
</header>

<div id="scout-cards-wrapper" data-template-version="2026-10-08-v4" data-roster-order="${esc(roster.map(r => r.name).join('|'))}" data-starters="${esc(starters.map(r => r.name).join('|'))}" data-auto-layout="${esc('S:' + starters.map(r => r.name.toLowerCase()).join('|') + '||B:' + bench.map(r => r.name.toLowerCase()).join('|'))}">
<div class="section-banner">Starters</div>
<p class="section-basis">${startersBasis === 'starts' ? `Players who started most of their games (from ${teamData.startersMarkedGames || teamGames} box score${(teamData.startersMarkedGames || teamGames) === 1 ? '' : 's'} on usportshoops.ca that list starters).` : startersBasis === 'minutes' ? 'No box scores yet: the 5 players with the most minutes per game.' : 'No stats yet: listed in roster order.'}</p>
<div class="grid">
  ${starters.map(p => renderCard(p, true)).join('\n')}
</div>

${bench.length > 0 ? `
<div class="section-banner">Rotational &amp; Bench</div>
<div class="grid">
  ${bench.map(p => renderCard(p, false)).join('\n')}
</div>
` : ''}
</div>

<footer style="max-width:1300px;margin:24px auto 0;font-size:11px;color:#666;border-top:1px solid #ddd;padding-top:8px;">
  Sources: Canada West official rosters, USportsHoops database &middot; Built for MacEwan Coaching Staff &middot; Editable via Edit Cards button.
</footer>

<script src="../../scout-cards-editor.js"></script>
<script src="../../synergy-view.js"></script>
</body>
</html>`;
}

TEAMS_MAP.forEach(t => {
  const dir = path.join(ROOT, 'opponents', t.slug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const html = generateScoutCardsHtml(t);
  const target = path.join(dir, 'scout-cards.html');
  fs.writeFileSync(target, html, 'utf8');
  console.log(`Generated scout cards for ${t.title} -> ${target}`);
});
