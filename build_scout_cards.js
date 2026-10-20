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

function generateScoutCardsHtml(teamItem) {
  const teamData = usportsData[teamItem.jsonKey] || { roster: [] };
  const roster = teamData.roster || [];

  // Group starters (first 5) and bench/rotational
  const starters = [];
  const bench = [];

  roster.forEach((p, idx) => {
    if (idx < 5) starters.push(p);
    else bench.push(p);
  });

  function renderCard(p, isStarter) {
    const override = (teamItem.jsonKey === 'calgary-dinos' && CALGARY_OVERRIDES[p.name]) ? CALGARY_OVERRIDES[p.name] : null;

    const num = override ? override.num : (p.number !== undefined && p.number !== '' && p.number !== null ? p.number : 'N/A');
    const name = p.name;
    const pos = override ? override.pos : (p.pos || p.position || 'G');
    const ht = override ? override.ht : (p.ht || p.height || `6'3"`);
    const wt = override ? override.wt : (p.wt ? p.wt + ' lbs' : '190 lbs');
    
    const hand = override ? override.hand : (pos.includes('G') ? 'R' : 'R');
    const co = override ? override.co : (pos.includes('G') ? 'Trae' : 'Brown');
    const dtran = override ? override.dtran : 'Locate';
    const pnr = override ? override.pnr : 'Over/Switch';
    const pinDho = override ? override.pinDho : 'Over/Switch';
    const rebound = override ? override.rebound : (pos.includes('F') || pos.includes('C') ? 'MUST BOX OUT' : 'Box out');

    const notes = override ? override.notes : `${pos} (${ht}, ${p.hometown || 'Canada'}). Key member of Canada West rotation. [Scouting note editable via Edit Cards]`;

    const playerStatsList = teamData.playerStats || [];
    const statMatch = playerStatsList.find(s => s.name.toLowerCase() === p.name.toLowerCase() || p.name.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(p.name.toLowerCase()));

    let statsUSportsRow;
    let statsLast5Row;

    // Live usportshoops stats win over the hand-entered override numbers
    // (those were copied from a screenshot and never update). The override's
    // numbers are only a fallback when the player has no live stats yet.
    if (!statMatch && override && override.statsUSports) {
      statsUSportsRow = override.statsUSports;
      statsLast5Row = override.statsLast5 || override.statsLast || ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-'];
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
      statsLast5Row = [ppg, mpg, fgPct, fg3Pct, ftPct, rpg, apg, topg, stlpg, blkpg];
    } else {
      statsUSportsRow = ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-'];
      statsLast5Row = ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-'];
    }

    const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="140" viewBox="0 0 120 140"><rect width="120" height="140" fill="%23e0e0e0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="bold" fill="%23555">#${encodeURIComponent(num)}</text></svg>`;
    let rawPhoto = p.photo || '';
    if (rawPhoto.includes('gohorns.ca/images/')) {
      rawPhoto = rawPhoto.replace('https://gohorns.ca/images/', 'https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/');
    }
    const photoUrl = rawPhoto || fallbackSvg;

    return `
    <div class="card ${isStarter ? 'starter' : 'key'}">
      <div class="photo-tile">
        <img src="${photoUrl}" alt="${name}" onerror="this.onerror=null; this.src='${fallbackSvg}';">
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
      .grid { grid-template-columns: 1fr; }
      .card { flex-direction: column; }
      .photo-tile { width: 100%; height: 180px; }
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
  <h1>${teamItem.title}: Player Scout Cards</h1>
  <p>MacEwan Griffins Men's Basketball &middot; 2026-27 Canada West &middot; Tactical Prep Packet</p>
</header>

<div id="scout-cards-wrapper" data-template-version="2026-10-08-v4">
<div class="section-banner">Starters</div>
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
