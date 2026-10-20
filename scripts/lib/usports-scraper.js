const fs = require('fs');
const path = require('path');
const https = require('https');

const TEAMS_MAP = [
  { usportsName: 'MacEwan', slug: 'macewan', isMyTeam: true },
  { usportsName: 'Alberta', slug: 'alberta-golden-bears' },
  { usportsName: 'Brandon', slug: 'brandon-bobcats' },
  { usportsName: 'Calgary', slug: 'calgary-dinos' },
  { usportsName: 'UFV', slug: 'fraser-valley-cascades' },
  { usportsName: 'Lethbridge', slug: 'lethbridge-pronghorns' },
  { usportsName: 'Manitoba', slug: 'manitoba-bisons' },
  { usportsName: 'Mount Royal', slug: 'mount-royal-cougars' },
  { usportsName: 'Regina', slug: 'regina-cougars' },
  { usportsName: 'Saskatchewan', slug: 'saskatchewan-huskies' },
  { usportsName: 'Thompson Rivers', slug: 'thompson-rivers-wolfpack' },
  { usportsName: 'Trinity Western', slug: 'trinity-western-spartans' },
  { usportsName: 'UBC', slug: 'ubc-thunderbirds' },
  { usportsName: 'UBCOKN', slug: 'ubco-heat' },
  { usportsName: 'UNBC', slug: 'unbc-timberwolves' },
  { usportsName: 'Victoria', slug: 'victoria-vikes' },
  { usportsName: 'Winnipeg', slug: 'winnipeg-wesmen' }
];

function fetchUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode !== 200) {
        // Drain and close so the socket doesn't hold the build open.
        res.resume();
        req.destroy();
        return resolve('');
      }
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve(body));
    }).on('error', () => resolve(''));
    req.setTimeout(20000, () => req.destroy(new Error('timeout')));
  });
}

function stripTags(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTableRows(tableHtml) {
  const trs = tableHtml.split(/<tr[^>]*>/i).slice(1);
  return trs.map(tr => {
    const inner = tr.split(/<\/tr>/i)[0];
    const cells = inner.split(/<(?:td|th)[^>]*>/i).slice(1).map(c => stripTags(c));
    return cells;
  }).filter(r => r.length > 0 && r.some(c => c.length > 0));
}

function parseUSportsPage(html, usportsName, season = '2026-27') {
  if (!html) return null;

  // Head Coach
  let headCoach = '';
  const hcMatch = html.match(/Head(?:&nbsp;|\s+)Coach:[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/td>|<\/tr>|<tr>)/i);
  if (hcMatch) {
    headCoach = stripTags(hcMatch[1]).replace(/\s*\([^)]*season[^)]*\)/i, '').trim();
  }

  // Staff
  let assistants = '';
  const astMatch = html.match(/Other(?:&nbsp;|\s+)staff:[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/td>|<\/tr>|<tr>)/i);
  if (astMatch) {
    assistants = stripTags(astMatch[1]);
  }

  // Record Summary
  let recordSummary = { conf: '0-0', usports: '0-0', overall: '0-0', ppgFor: '0.0', ppgAgainst: '0.0' };
  const recIdx = html.indexOf('Summary of team record');
  if (recIdx !== -1) {
    const tablePart = html.slice(recIdx).split(/<\/table>/i)[0];
    const rows = parseTableRows(tablePart);
    if (rows.length >= 3) {
      const dataRow = rows[rows.length - 1]; // last row containing numbers
      if (dataRow.length >= 12) {
        recordSummary.conf = dataRow[0] || '0-0';
        recordSummary.usports = dataRow[4] || '0-0';
        recordSummary.overall = dataRow[8] || '0-0';
        const ppgString = dataRow[11] || dataRow[7] || '';
        if (ppgString && ppgString.includes('-')) {
          const parts = ppgString.split('-').map(s => s.trim());
          recordSummary.ppgFor = parts[0] || '0.0';
          recordSummary.ppgAgainst = parts[1] || '0.0';
        }
      }
    }
  }

  // Roster
  const roster = [];
  const rosterIdx = html.indexOf('Player roster');
  if (rosterIdx !== -1) {
    const tablePart = html.slice(rosterIdx).split(/<\/table>/i)[0];
    const rows = parseTableRows(tablePart);
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.length >= 5) {
        roster.push({
          number: r[0] || '',
          name: r[1] || '',
          pos: r[2] || '',
          ht: r[3] || '',
          elig: r[4] || '',
          hometown: r[5] || '',
          school: r[6] || ''
        });
      }
    }
  }

  // Recruits
  const recruits = [];
  const recruitIdx = html.indexOf('Incoming recruits');
  if (recruitIdx !== -1) {
    const tablePart = html.slice(recruitIdx).split(/<\/table>/i)[0];
    const rows = parseTableRows(tablePart);
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.length >= 3) {
        recruits.push({
          name: r[0] || '',
          pos: r[1] || '',
          ht: r[2] || '',
          hometown: r[3] || '',
          prior: r[4] || ''
        });
      }
    }
  }

  // Player Stats (Scoring summary)
  const playerStats = [];
  let teamTotals = null;
  const statsIdx = html.indexOf('Overall scoring summary');
  if (statsIdx !== -1) {
    const tablePart = html.slice(statsIdx).split(/<\/table>/i)[0];
    const rows = parseTableRows(tablePart);
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.length >= 15 && r[0] !== 'Player') {
        const item = {
          name: r[0],
          gp: r[1] || '0',
          mins: r[2] || '0',
          mpg: r[3] || '0.0',
          fg3: r[4] || '0-0',
          fg3Pct: r[5] || '0.0',
          fg: r[6] || '0-0',
          fgPct: r[7] || '0.0',
          ft: r[8] || '0-0',
          ftPct: r[9] || '0.0',
          orebDreb: r[10] || '0-0',
          reb: r[11] || '0',
          rpg: r[12] || '0.0',
          pf: r[13] || '0',
          a: r[14] || '0',
          to: r[15] || '0',
          blk: r[16] || '0',
          stl: r[17] || '0',
          pts: r[18] || '0',
          ppg: r[19] || '0.0'
        };
        if (r[0].toLowerCase().includes('team totals')) {
          teamTotals = item;
        } else {
          playerStats.push(item);
        }
      }
    }
  }

  // Games
  const completedGames = [];
  const upcomingGames = [];
  const gamesIdx = html.indexOf('Game results for the season');
  if (gamesIdx !== -1) {
    const tablePart = html.slice(gamesIdx).split(/<\/table>/i)[0];
    const rows = parseTableRows(tablePart);
    let isUpcoming = false;
    for (const r of rows) {
      if (r.join(' ').includes('Games Yet to Play')) {
        isUpcoming = true;
        continue;
      }
      if (r.length >= 5 && r[0] !== 'Date' && !r[0].includes('Conference Games')) {
        const isMacEwanMatch = r.some(cell => cell.toLowerCase().includes('macewan'));
        if (!isUpcoming && (r[3] === 'Win' || r[3] === 'Loss')) {
          completedGames.push({
            date: r[0],
            location: r[1],
            opponent: r[2],
            result: r[3],
            score: r[4],
            comment: r[5] || '',
            isMacEwanMatch
          });
        } else if (isUpcoming) {
          upcomingGames.push({
            date: r[0],
            location: r[1],
            opponent: r[2],
            comment: r[4] || '',
            isMacEwanMatch
          });
        }
      }
    }
  }

  return {
    usportsName,
    season,
    headCoach,
    assistants,
    recordSummary,
    roster,
    recruits,
    playerStats,
    teamTotals,
    completedGames,
    upcomingGames,
    updatedAt: new Date().toISOString().split('T')[0]
  };
}

async function scrapeTeam(usportsName, season = '2026-27') {
  const url = `https://usportshoops.ca/history/teamseason.php?Gender=MBB&Season=${season}&Team=${encodeURIComponent(usportsName)}`;
  let html = await fetchUrl(url);

  // Fallback to 2025-26 if 2026-27 doesn't have a roster table
  if (!html || !html.includes('Player roster')) {
    const fallbackUrl = `https://usportshoops.ca/history/teamseason.php?Gender=MBB&Season=2025-26&Team=${encodeURIComponent(usportsName)}`;
    const fallbackHtml = await fetchUrl(fallbackUrl);
    if (fallbackHtml && fallbackHtml.includes('Player roster')) {
      html = fallbackHtml;
      season = '2025-26';
    }
  }

  if (!html) return null;
  return parseUSportsPage(html, usportsName, season);
}

async function scrapeAllTeams(season = '2026-27') {
  const results = {};
  for (const item of TEAMS_MAP) {
    console.log(`Scraping ${item.usportsName} (${item.slug})...`);
    const data = await scrapeTeam(item.usportsName, season);
    if (data) {
      results[item.slug] = data;
    }
  }
  return results;
}

module.exports = {
  TEAMS_MAP,
  fetchUrl,
  stripTags,
  parseUSportsPage,
  scrapeTeam,
  scrapeAllTeams
};
