const fs = require('fs');
const path = require('path');
const { TEAMS_MAP } = require('./lib/usports-scraper');

const ROOT = path.join(__dirname, '..');
const OPPONENTS_DIR = path.join(ROOT, 'opponents');
const DATA_JSON = path.join(ROOT, 'data', 'usports-rosters-stats.json');

function generateIdentityParagraph(teamName, oppData) {
  if (!oppData) return `${teamName} is a Canada West MBB program competing in the 2026-27 season.`;

  const rec = oppData.recordSummary || {};
  const stats = oppData.playerStats || [];
  const topScorers = [...stats].sort((a, b) => parseFloat(b.ppg || 0) - parseFloat(a.ppg || 0)).slice(0, 3);
  const topRebounders = [...stats].sort((a, b) => parseFloat(b.rpg || 0) - parseFloat(a.rpg || 0)).slice(0, 2);

  let p = `${teamName} enters the 2026-27 season under Head Coach ${oppData.headCoach || 'Staff'}. `;
  if (rec.overall) {
    p += `They currently hold a ${rec.overall} overall record (${rec.conf || '0-0'} in Canada West play), averaging ${rec.ppgFor || '0.0'} PPG while allowing ${rec.ppgAgainst || '0.0'} PPG. `;
  }

  if (topScorers.length > 0) {
    const leaderStrs = topScorers.map(s => `${s.name} (#${s.ppg} PPG, ${s.fg3Pct}% 3PT, ${s.rpg} RPG)`);
    p += `Offensively, they are led by ${leaderStrs.join(', ')}. `;
  }

  if (topRebounders.length > 0 && topRebounders[0].name !== topScorers[0]?.name) {
    p += `On the glass, ${topRebounders[0].name} provides key interior presence (${topRebounders[0].rpg} RPG). `;
  }

  const macMatch = (oppData.upcomingGames || []).find(g => g.isMacEwanMatch) || (oppData.completedGames || []).find(g => g.isMacEwanMatch);
  if (macMatch) {
    if (macMatch.result) {
      p += `In recent action vs MacEwan, the result was ${macMatch.result} (${macMatch.score}). `;
    } else {
      p += `MacEwan faces ${teamName} next on ${macMatch.date} (${macMatch.location}). `;
    }
  }

  return p.trim();
}

function updateOpponentProfile(slug, oppData) {
  const profilePath = path.join(OPPONENTS_DIR, slug, 'profile.md');
  if (!fs.existsSync(profilePath)) return;

  let existingMd = fs.readFileSync(profilePath, 'utf8');

  const teamTitleMatch = existingMd.match(/^#\s+([^\n]+)/);
  const teamTitle = teamTitleMatch ? teamTitleMatch[1] : `${slug} Opponent Profile`;

  const hcName = oppData.headCoach || 'TBD';
  const assistants = oppData.assistants || 'Staff';
  const rec = oppData.recordSummary || {};
  const rec2627Str = `${rec.overall || '0-0'} overall (${rec.conf || '0-0'} conf, ${rec.ppgFor || '0.0'} PPG / ${rec.ppgAgainst || '0.0'} allowed)`;

  // Generate Auto-Identity
  const identityText = generateIdentityParagraph(oppData.usportsName, oppData);

  // Preserve Coach's Note if present
  let coachNote = '';
  const noteMatch = existingMd.match(/## Coach's Note\s*([\s\S]*?)(?=\n## |$)/i);
  if (noteMatch) {
    coachNote = noteMatch[1].trim();
  }

  // Roster table
  let rosterTable = `| # | Player | Pos | Yr | Ht | Hometown | High School / Prior Team |\n`;
  rosterTable += `|---|--------|-----|----|----|----------|--------------------------|\n`;
  for (const p of (oppData.roster || [])) {
    rosterTable += `| ${p.number} | ${p.name} | ${p.pos} | ${p.elig} | ${p.ht} | ${p.hometown} | ${p.school} |\n`;
  }

  // Build markdown file
  let md = `# ${teamTitle}\n\n`;
  md += `**Conference:** Canada West | **HC:** ${hcName}\n`;
  if (assistants) md += `**Assistants:** ${assistants}\n`;
  md += `**2026-27 record:** ${rec2627Str}\n`;
  
  // Extract old 2025-26 record if present
  const oldRecMatch = existingMd.match(/\*\*2025-26 record:\*\*\s*([^\n]*)/i);
  if (oldRecMatch) {
    md += `**2025-26 record:** ${oldRecMatch[1].trim()}\n`;
  }
  md += `**Last updated:** ${oppData.updatedAt} (source: usportshoops.ca 2026-27)\n\n`;

  md += `## Identity (2026-27)\n`;
  md += `<!-- AUTO:IDENTITY_START -->\n`;
  md += `> ${identityText}\n`;
  md += `<!-- AUTO:IDENTITY_END -->\n\n`;

  md += `## Coach's Note\n`;
  md += `${coachNote || '*Add custom coaching notes here. This section is preserved during weekly stat updates.*'}\n\n`;

  md += `## Roster (USportsHoops 2026-27)\n${rosterTable}\n`;

  // Preserve existing tactical sections if present
  const sysOptMatch = existingMd.match(/## Offensive system[\s\S]*?(?=\n## usportshoops|\n## Sources|$)/i);
  if (sysOptMatch) {
    md += `## ${sysOptMatch[0].trim()}\n\n`;
  }

  // usportshoops section
  md += `## usportshoops.ca\n`;
  md += `Independent stats site for U Sports basketball.\n\n`;
  md += `- **Team Season Page (2026-27):** http://usportshoops.ca/history/teamseason.php?Gender=MBB&Season=2026-27&Team=${encodeURIComponent(oppData.usportsName)}\n`;
  md += `- **Conf Record:** ${rec.conf || '0-0'}\n`;
  md += `- **Overall Record:** ${rec.overall || '0-0'}\n`;
  md += `- **PPG:** ${rec.ppgFor || '0.0'} - ${rec.ppgAgainst || '0.0'}\n`;
  md += `- **Last Updated:** ${oppData.updatedAt}\n\n`;

  fs.writeFileSync(profilePath, md, 'utf-8');
}

function updateOpponentScout(slug, oppData) {
  const scoutsDir = path.join(OPPONENTS_DIR, slug, 'scouts');
  if (!fs.existsSync(scoutsDir)) {
    fs.mkdirSync(scoutsDir, { recursive: true });
  }

  const scout2627Path = path.join(scoutsDir, '2026-27-scout.md');
  const scout2526Path = path.join(scoutsDir, '2025-26-scout.md');

  let oldScoutMd = '';
  if (fs.existsSync(scout2627Path)) {
    oldScoutMd = fs.readFileSync(scout2627Path, 'utf8');
  } else if (fs.existsSync(scout2526Path)) {
    oldScoutMd = fs.readFileSync(scout2526Path, 'utf8');
  }

  const stats = oppData.playerStats || [];
  const rec = oppData.recordSummary || {};

  // Build 2026-27 Personnel Table
  let personnelTable = `| # | Player | Pos | Yr | MPG | PPG | RPG | APG | 3PT% | Role / Notes |\n`;
  personnelTable += `|---|--------|-----|----|-----|-----|-----|-----|------|--------------|\n`;
  for (const p of stats) {
    const mpg = parseFloat(p.mpg || 0);
    const ppg = parseFloat(p.ppg || 0);
    let role = 'Depth';
    if (mpg >= 22 || ppg >= 10) role = 'Starter / Primary';
    else if (mpg >= 12) role = 'Key Rotation';

    // Cross reference roster for # and pos
    const rMatch = (oppData.roster || []).find(r => r.name.toLowerCase() === p.name.toLowerCase());
    const num = rMatch ? rMatch.number : '-';
    const pos = rMatch ? rMatch.pos : 'G/F';
    const yr = rMatch ? rMatch.elig : '-';

    personnelTable += `| ${num} | ${p.name} | ${pos} | ${yr} | ${p.mpg} | ${p.ppg} | ${p.rpg} | ${p.a} | ${p.fg3Pct}% | ${role} |\n`;
  }

  // Games table
  let completedGamesTable = `| Date | Location | Opponent | Result | Score | Notes |\n|---|---|---|---|---|---|\n`;
  for (const g of (oppData.completedGames || [])) {
    completedGamesTable += `| ${g.date} | ${g.location} | ${g.opponent} | ${g.result} | ${g.score} | ${g.comment || ''} |\n`;
  }

  let upcomingGamesTable = `| Date | Location | Opponent | Matchup Notes |\n|---|---|---|---|\n`;
  for (const g of (oppData.upcomingGames || []).slice(0, 8)) {
    upcomingGamesTable += `| ${g.date} | ${g.location} | ${g.opponent} | ${g.comment || ''} |\n`;
  }

  // Build 2026-27 Scout Report Markdown
  let md = `# Scout Report: ${oppData.usportsName} vs MacEwan Griffins (2026-27 Season)\n`;
  md += `**Season:** 2026-27 | **Record:** ${rec.overall || '0-0'} (Conf: ${rec.conf || '0-0'}) | **HC:** ${oppData.headCoach || 'Staff'}\n\n`;

  md += `> **2026-27 Overview:** ${generateIdentityParagraph(oppData.usportsName, oppData)}\n\n`;
  md += `---\n\n`;

  // Preserve Film scouting sections (Carried over from 2025-26 with Option A tag)
  // Order agreed with David (Oct 2026): Keys to victory first, then the film
  // sections, then Personnel / Completed Games / Upcoming Schedule at the end.
  // opponent-scout.html applies the same order to coach-saved versions.
  const filmSections = [
    "Keys to victory",
    "Offense",
    "Defense",
    "How we attack their D",
    "How we defend their O",
    "Special situations",
    "Practice points this week"
  ];

  for (let i = 0; i < filmSections.length; i++) {
    const secTitle = filmSections[i];
    const secNum = i + 1; // 1. Keys to victory, 2. Offense, etc.
    let secBody = `*(Carried over from 2025-26, verify on film)*\n- [FILL FROM FILM]`;

    // Regex match from old scout report
    const re = new RegExp(`##\\s*\\d*\\.?\\s*${secTitle.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}[\\s\\S]*?(?=\\n## |$)`, 'i');
    const m = oldScoutMd.match(re);
    if (m) {
      secBody = m[0].replace(/^##[^\n]*\n/, '').trim();
      if (!secBody.includes('Carried over')) {
        secBody = `*(Carried over from 2025-26, verify on film)*\n${secBody}`;
      }
    }

    md += `## ${secNum}. ${secTitle}\n${secBody}\n\n`;
  }

  const n = filmSections.length;
  md += `## ${n + 1}. Personnel (USportsHoops 2026-27 Stats)\n${personnelTable}\n\n`;
  md += `## ${n + 2}. Completed Games (2026-27)\n${completedGamesTable}\n\n`;
  md += `## ${n + 3}. Upcoming Schedule (2026-27)\n${upcomingGamesTable}\n\n`;

  md += `## Sources\n`;
  md += `- http://usportshoops.ca/history/teamseason.php?Gender=MBB&Season=2026-27&Team=${encodeURIComponent(oppData.usportsName)}\n`;
  md += `- Updated automatically on ${oppData.updatedAt}\n`;

  fs.writeFileSync(scout2627Path, md, 'utf-8');
}

function runGeneration() {
  if (!fs.existsSync(DATA_JSON)) {
    console.error(`Dataset not found at ${DATA_JSON}`);
    return;
  }

  const results = JSON.parse(fs.readFileSync(DATA_JSON, 'utf-8'));
  console.log('Generating 2026-27 opponent profiles and scout reports...');

  for (const item of TEAMS_MAP) {
    if (item.isMyTeam) continue;
    const oppData = results[item.slug];
    if (!oppData) continue;

    updateOpponentProfile(item.slug, oppData);
    updateOpponentScout(item.slug, oppData);
    console.log(`✅ Generated 2026-27 profile & scout for ${item.slug}`);
  }

  console.log('🎉 2026-27 Season Reports Generated Successfully!');
}

if (require.main === module) {
  runGeneration();
}

module.exports = {
  generateIdentityParagraph,
  updateOpponentProfile,
  updateOpponentScout,
  runGeneration
};
