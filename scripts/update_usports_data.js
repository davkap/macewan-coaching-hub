const fs = require('fs');
const path = require('path');
const { scrapeAllTeams, TEAMS_MAP } = require('./lib/usports-scraper');
const { runGeneration } = require('./generate_season_reports');

const ROOT = path.join(__dirname, '..');
const MYTEAM_ROSTER = path.join(ROOT, 'my-team', 'roster.md');
const DATA_JSON = path.join(ROOT, 'data', 'usports-rosters-stats.json');
const META_JSON = path.join(ROOT, 'data', 'stats-meta.json');

// Roster details that don't come from usportshoops.ca (headshot `photo`
// links, weight, etc. added by the headshot scripts) would be lost when a
// team is re-scraped. Copy them over from the previous data, matching players
// by name.
function keepExtraPlayerFields(fresh, prev) {
  if (!prev || !Array.isArray(prev.roster)) return;
  const byName = new Map(prev.roster.map(p => [String(p.name || '').trim().toLowerCase(), p]));
  for (const player of fresh.roster) {
    const old = byName.get(String(player.name || '').trim().toLowerCase());
    if (!old) continue;
    for (const [key, value] of Object.entries(old)) {
      if (player[key] === undefined || player[key] === '') player[key] = value;
    }
  }
}

// Small summary the pages read for the "Stats last refreshed" label.
function writeStatsMeta(results, failedTeams) {
  const mac = results['macewan'] || {};
  const gp = (mac.playerStats || []).reduce((max, p) => Math.max(max, parseInt(p.gp, 10) || 0), 0);
  const meta = {
    // Full timestamp; the pages show it in the viewer's local time zone.
    updatedAt: new Date().toISOString(),
    season: mac.season || '2026-27',
    teams: Object.keys(results).length,
    macewanGamesPlayed: gp,
    macewanCompletedGames: (mac.completedGames || []).length,
    failedTeams: failedTeams || []
  };
  fs.writeFileSync(META_JSON, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
  console.log(`✅ Wrote ${META_JSON}`);
}

async function run() {
  console.log('🚀 Scraping full USportsHoops 2026-27 statistics, game logs & rosters for Canada West...');
  
  const scraped = await scrapeAllTeams('2026-27');

  // Start from the previous dataset so a team whose page fails to load
  // (usportshoops.ca down, slow, or blocking) keeps its last good data
  // instead of disappearing from the site.
  let previous = {};
  try {
    previous = JSON.parse(fs.readFileSync(DATA_JSON, 'utf-8'));
  } catch (e) {}

  const results = { ...previous };
  const failed = [];
  for (const team of TEAMS_MAP) {
    const fresh = scraped[team.slug];
    // Treat a page without a roster as a failed scrape.
    if (fresh && Array.isArray(fresh.roster) && fresh.roster.length > 0) {
      keepExtraPlayerFields(fresh, previous[team.slug]);
      results[team.slug] = fresh;
    } else {
      failed.push(team.usportsName);
    }
  }

  if (failed.length === TEAMS_MAP.length) {
    console.error('❌ Could not load any team from usportshoops.ca. Keeping the previous stats unchanged.');
    process.exitCode = 1;
    return;
  }
  if (failed.length) {
    console.warn(`⚠️ Kept previous data for ${failed.length} team(s) that failed to load: ${failed.join(', ')}`);
  }

  // Save master JSON dataset
  const dataDir = path.dirname(DATA_JSON);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(DATA_JSON, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`✅ Saved master dataset to ${DATA_JSON}`);

  writeStatsMeta(results, failed);

  // Update MacEwan Roster Markdown
  const macewanData = results['macewan'];
  if (macewanData && macewanData.roster.length > 0) {
    let md = `# MacEwan Griffins — Roster (${macewanData.season})\n\n`;
    md += `**Head Coach:** ${macewanData.headCoach || 'Staff'}\n`;
    if (macewanData.assistants) md += `**Assistant Staff:** ${macewanData.assistants}\n`;
    md += `**Last Updated:** ${macewanData.updatedAt} (source: usportshoops.ca 2026-27)\n\n`;
    md += `## Roster\n\n`;
    md += `| # | Player | Pos | Ht | Yr | Hometown | High School / Prior Team |\n`;
    md += `|---|--------|-----|----|----|----------|--------------------------|\n`;
    for (const p of macewanData.roster) {
      md += `| ${p.number} | ${p.name} | ${p.pos} | ${p.ht} | ${p.elig} | ${p.hometown} | ${p.school} |\n`;
    }

    if (macewanData.recruits && macewanData.recruits.length > 0) {
      md += `\n## Incoming Recruits (${macewanData.season})\n\n`;
      md += `| Player | Pos | Ht | Hometown | High School / Prior Team |\n`;
      md += `|--------|-----|----|----------|--------------------------|\n`;
      for (const r of macewanData.recruits) {
        md += `| ${r.name} | ${r.pos} | ${r.ht} | ${r.hometown} | ${r.prior} |\n`;
      }
    }

    md += `\n## Lineups & Rotation Notes\n`;
    md += `- **Guards:** Owen Hickey, Jojo Muyo, Khushal Shukla, Elisha Ampofo, Diego Presingular, Abdi Musse, Nathan Lefevre, Peter-Aluk Deng, Freddy Kapinga\n`;
    md += `- **Wings:** Joel Seke, Judson Weir, Dele Osuma\n`;
    md += `- **Frontcourt:** Noah Simon, Ryan Ziolkowski, Wol Wol, Favour Igbinyemi, David Wilmes, Otis Onink\n`;

    fs.writeFileSync(MYTEAM_ROSTER, md, 'utf-8');
    console.log(`✅ Updated MacEwan roster in ${MYTEAM_ROSTER}`);
  }

  // Generate 2026-27 season profiles and scouts
  runGeneration();

  console.log('🎉 Weekly Canada West 2026-27 update finished cleanly!');
}

run().catch(err => {
  console.error('Error updating USports data:', err);
});
