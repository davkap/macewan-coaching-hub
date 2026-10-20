// Build MacEwan Griffins Canada West opponent hub.
// Reads opponents/<team>/profile.md and opponents/<team>/scouts/2025-26-scout.md
// and emits canadawest-scout-2025-26.html (single self-contained file).

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OPP = path.join(ROOT, 'opponents');
const MYTEAM = path.join(ROOT, 'my-team');
const SYSTEMS = path.join(ROOT, 'systems');
const OUT = path.join(ROOT, 'canadawest-scout-2026-27.html');
const LOGO = path.join(ROOT, 'macewan-logo.png');

const PRAIRIE = [
  'alberta-golden-bears', 'brandon-bobcats', 'calgary-dinos',
  'lethbridge-pronghorns', 'manitoba-bisons', 'mount-royal-cougars',
  'regina-cougars', 'saskatchewan-huskies', 'winnipeg-wesmen'
];
const PACIFIC = [
  'fraser-valley-cascades', 'thompson-rivers-wolfpack',
  'trinity-western-spartans', 'ubc-thunderbirds', 'ubco-heat',
  'unbc-timberwolves', 'victoria-vikes'
];

// ---------- helpers ----------
function killEmDash(s){
  if(!s) return s;
  // Replace em/en dashes with comma (spec: no em dashes).
  return s.replace(/\s*[\u2014\u2013]\s*/g, ', ');
}
function esc(s){
  if(s == null) return '';
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function inline(s){
  if(s == null) return '';
  let t = killEmDash(s);
  t = esc(t);
  // inline code
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  // links [text](url)
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(_, txt, url){
    return '<a href="'+url+'" target="_blank" rel="noopener">'+txt+'</a>';
  });
  // bold **x**
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // italic *x* (avoid bullets — already split lines before this)
  t = t.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
  return t;
}
// Convert a markdown sub-block (no level-2 headings) into HTML.
function mdToHtml(md){
  if(!md) return '';
  const lines = md.replace(/\r/g,'').split('\n');
  const out = [];
  let i = 0;
  function isTableSep(l){ return /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(l); }
  function splitRow(l){
    let s = l.trim();
    if(s.startsWith('|')) s = s.slice(1);
    if(s.endsWith('|')) s = s.slice(0,-1);
    return s.split('|').map(c=>c.trim());
  }
  while(i < lines.length){
    const line = lines[i];
    // blank
    if(/^\s*$/.test(line)){ i++; continue; }
    // table
    if(line.includes('|') && i+1 < lines.length && isTableSep(lines[i+1])){
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while(i < lines.length && lines[i].includes('|') && !/^\s*$/.test(lines[i]) && !/^#{1,6}\s/.test(lines[i])){
        rows.push(splitRow(lines[i])); i++;
      }
      out.push('<div class="tbl-wrap"><table><thead><tr>'
        + head.map(h=>'<th>'+inline(h)+'</th>').join('')
        + '</tr></thead><tbody>'
        + rows.map(r=>'<tr>'+r.map(c=>'<td>'+inline(c)+'</td>').join('')+'</tr>').join('')
        + '</tbody></table></div>');
      continue;
    }
    // headings (within a section: ### or deeper)
    let h = line.match(/^(#{3,6})\s+(.*)$/);
    if(h){
      const lvl = h[1].length;
      out.push('<h'+lvl+'>'+inline(h[2])+'</h'+lvl+'>');
      i++; continue;
    }
    // blockquote (group consecutive)
    if(/^\s*>\s?/.test(line)){
      const buf = [];
      while(i < lines.length && /^\s*>\s?/.test(lines[i])){
        buf.push(lines[i].replace(/^\s*>\s?/,''));
        i++;
      }
      out.push('<blockquote><p>'+inline(buf.join(' '))+'</p></blockquote>');
      continue;
    }
    // unordered list
    if(/^\s*[-*]\s+/.test(line)){
      const items = [];
      while(i < lines.length && /^\s*[-*]\s+/.test(lines[i])){
        let item = lines[i].replace(/^\s*[-*]\s+/, '');
        // continuation lines (indented)
        i++;
        while(i < lines.length && /^\s{2,}\S/.test(lines[i])){
          item += ' ' + lines[i].trim(); i++;
        }
        items.push('<li>'+inline(item)+'</li>');
      }
      out.push('<ul>'+items.join('')+'</ul>');
      continue;
    }
    // ordered list
    if(/^\s*\d+\.\s+/.test(line)){
      const items = [];
      while(i < lines.length && /^\s*\d+\.\s+/.test(lines[i])){
        let item = lines[i].replace(/^\s*\d+\.\s+/, '');
        i++;
        while(i < lines.length && /^\s{2,}\S/.test(lines[i])){
          item += ' ' + lines[i].trim(); i++;
        }
        items.push('<li>'+inline(item)+'</li>');
      }
      out.push('<ol>'+items.join('')+'</ol>');
      continue;
    }
    // paragraph (gather until blank/heading/list/table)
    const buf = [line];
    i++;
    while(i < lines.length){
      const nxt = lines[i];
      if(/^\s*$/.test(nxt)) break;
      if(/^#{1,6}\s/.test(nxt)) break;
      if(/^\s*[-*]\s+/.test(nxt)) break;
      if(/^\s*\d+\.\s+/.test(nxt)) break;
      if(/^\s*>\s?/.test(nxt)) break;
      if(nxt.includes('|') && i+1 < lines.length && isTableSep(lines[i+1])) break;
      buf.push(nxt); i++;
    }
    out.push('<p>'+inline(buf.join(' '))+'</p>');
  }
  return out.join('\n');
}

// Split markdown by ## headings into a map name->body (excludes the heading line).
function splitByH2(md){
  const lines = md.replace(/\r/g,'').split('\n');
  const sections = []; // {title, body[]}
  let head = null; let body = [];
  let preamble = [];
  for(const l of lines){
    const m = l.match(/^##\s+(.*)$/);
    if(m){
      if(head !== null){ sections.push({title: head, body: body.join('\n')}); }
      else { /* preamble before first ## */ }
      head = m[1].trim(); body = [];
    } else {
      if(head === null) preamble.push(l);
      else body.push(l);
    }
  }
  if(head !== null) sections.push({title: head, body: body.join('\n')});
  return {preamble: preamble.join('\n'), sections};
}

// Parse profile.md into structured fields.
function parseProfile(md, slug){
  const {preamble, sections} = splitByH2(md);
  const lines = preamble.replace(/\r/g,'').split('\n');
  // First line: # Team Name (...) - or : Opponent Profile
  let teamName = slug;
  for(const l of lines){
    const m = l.match(/^#\s+(.*)$/);
    if(m){
      let t = m[1].trim();
      // strip trailing ": Opponent Profile" or "- Opponent Profile" or "Opponent Profile"
      t = t.replace(/[:\-\u2014\u2013]\s*Opponent\s*Profile\s*$/i, '').trim();
      t = t.replace(/\s+Opponent\s*Profile\s*$/i, '').trim();
      teamName = t;
      break;
    }
  }
  // Strip parenthetical school name like "(University of Alberta)"
  const teamShort = teamName.replace(/\s*\([^)]+\)\s*$/, '').trim();

  // Collect bold-key fields from preamble
  const fields = {};
  const blob = preamble;
  function grab(key){
    // matches **Key:** value (until next ** or newline)
    const re = new RegExp('\\*\\*'+key.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')+':\\*\\*\\s*([^\\n]*?)(?=(?:\\s*\\*\\*[A-Za-z][^*]*?:\\*\\*)|$)','i');
    const m = blob.match(re);
    return m ? m[1].trim() : '';
  }
  fields.conference = grab('Conference') || 'Canada West';
  fields.division   = grab('Division');
  fields.hc         = grab('HC');
  fields.assistants = grab('Assistants');
  fields.arena      = grab('Home arena');
  fields.rec2627 = grab('2026-27 record')
                || grab('2026-27 Canada West record')
                || grab('2026-27 record / status')
                || '';
  fields.rec2526 = grab('2025-26 record')
                || grab('2025-26 Canada West record')
                || grab('2025-26 record / status')
                || '';
  fields.rec2425 = grab('2024-25 record')
                || grab('2024-25 record / finish')
                || '';
  fields.updated = grab('Last updated');

  // Identity: blockquote in section "Identity (1 paragraph)" or "Identity"
  let identity = '';
  for(const s of sections){
    if(/^Identity/i.test(s.title)){
      // strip leading "> " from each line
      identity = s.body.replace(/\r/g,'').split('\n')
        .filter(l=>/^\s*>/.test(l))
        .map(l=>l.replace(/^\s*>\s?/,''))
        .join(' ').trim();
      if(!identity){
        // fallback: first paragraph of body
        identity = s.body.trim().split(/\n\s*\n/)[0] || '';
      }
      break;
    }
  }

  // Coach's Note section
  let coachNote = '';
  for(const s of sections){
    if(/^Coach's Note/i.test(s.title)){
      coachNote = s.body.trim();
      break;
    }
  }

  // Roster section
  let rosterMd = '';
  for(const s of sections){
    if(/^Roster\b/i.test(s.title)){ rosterMd = s.body; break; }
  }

  // usportshoops section
  let usportsMd = '';
  for(const s of sections){
    if(/usportshoops/i.test(s.title)){ usportsMd = s.body; break; }
  }

  // Sources section
  let sourcesMd = '';
  for(const s of sections){
    if(/^Sources\b/i.test(s.title)){ sourcesMd = s.body; break; }
  }

  return {teamName: teamShort, raw: teamName, fields, identity, coachNote, rosterMd, usportsMd, sourcesMd, sections};
}

// Parse scout.md, return map of section number -> body
function parseScout(md){
  const {sections} = splitByH2(md);
  const out = {};
  let sources = '';
  for(const s of sections){
    const m = s.title.match(/^(\d+)\.\s*(.*)$/);
    if(m){ out[Number(m[1])] = {title: m[2].trim(), body: s.body}; }
    else if(/^Sources\b/i.test(s.title)){ sources = s.body; }
  }
  return {sections: out, sources};
}

// ---------- assemble ----------
async function build() {
  const logoB64 = fs.readFileSync(LOGO).toString('base64');
  const logoDataUri = 'data:image/png;base64,'+logoB64;

const TAB_LABELS = [
  {n:1, label:'Personnel'},
  {n:2, label:'Offense'},
  {n:3, label:'Defense'},
  {n:4, label:'How we attack'},
  {n:5, label:'How we defend'},
  {n:6, label:'Special situations'},
  {n:7, label:'Keys to victory'},
  {n:8, label:'Practice points'}
];

// ---------- MacEwan (Our Team) ----------
function readOpt(p){ try { return fs.readFileSync(p, 'utf8'); } catch(e){ return ''; } }

function buildOurTeamCard(){
  const teamId = 'macewan-griffins';
  const team = 'MacEwan Griffins';

  const identityMd = readOpt(path.join(MYTEAM, 'identity.md'));
  const rosterMd   = readOpt(path.join(MYTEAM, 'roster.md'));
  const setsMd     = readOpt(path.join(MYTEAM, 'sets.md'));
  const seasonMd   = readOpt(path.join(MYTEAM, 'season-log.md'));

  // Helper: drop the leading H1 line from a markdown file so we don't double up titles.
  function stripH1(md){
    return md.replace(/\r/g,'').replace(/^#\s+[^\n]*\n/, '');
  }
  // Heuristic: a file is "blank" if it has no real content beyond placeholders.
  function isBlank(md, kind){
    if(!md) return true;
    const stripped = stripH1(md).trim();
    if(!stripped) return true;
    // sets.md ships with a one-line placeholder description and nothing else
    if(kind === 'sets' && /^Document your offensive sets/i.test(stripped)) return true;
    // season-log ships as just the table header with one empty row
    if(kind === 'season' && /^\|\s*Date\s*\|/i.test(stripped) && !/\d{4}/.test(stripped)) return true;
    // roster: header table with no body rows
    if(kind === 'roster' && /\|\s*#\s*\|\s*Player/i.test(stripped)){
      // count non-empty data rows after the separator
      const lines = stripped.split('\n').filter(l => /\|/.test(l));
      // first line is header, second is sep; remaining rows
      const dataRows = lines.slice(2).filter(l => l.replace(/[|\s\-]/g,'').length > 0);
      if(dataRows.length === 0) return true;
    }
    return false;
  }

  // Parse identity.md
  let identityContentHtml = '';
  if(identityMd){
    const parsedId = splitByH2(identityMd);
    for(const s of parsedId.sections){
      if(/Who we are/i.test(s.title)){
        identityContentHtml += '<blockquote><p>' + inline(s.body.trim()) + '</p></blockquote>';
      } else if(s.title && s.body.trim()) {
        identityContentHtml += '<h4>' + esc(s.title) + '</h4>' + mdToHtml(s.body);
      }
    }
  } else {
    identityContentHtml = '<p class="thin">my-team/identity.md is missing.</p>';
  }
  const identitySectionHtml = '<div class="sec identity"><h3>Identity</h3>' + identityContentHtml + '</div>';

  // Parse roster.md
  let rosterContentHtml = '';
  const rosterBlank = isBlank(rosterMd, 'roster');
  if(rosterBlank){
    rosterContentHtml = '<p class="thin">Roster to be filled by HC Kapinga in <code>my-team/roster.md</code>. The file ships with the column headers (#, Player, Pos, Ht, Yr, Hand, Role, Strengths, Weaknesses) and a "Lineups we like" section ready for entry.</p>';
  } else {
    const parsedRoster = splitByH2(rosterMd);
    let rosterContent = '';
    let lineupsContent = '';
    for(const s of parsedRoster.sections){
      if(/^Roster/i.test(s.title)){
        rosterContent = s.body;
      } else if(/Lineups/i.test(s.title)){
        lineupsContent = s.body;
      }
    }
    rosterContentHtml = mdToHtml(rosterContent) + (lineupsContent ? '<h4>Lineups we like</h4>' + mdToHtml(lineupsContent) : '');
  }
  const rosterSectionHtml = '<div class="sec roster"><h3>Roster</h3>' + rosterContentHtml + '</div>';

  // Sets / Playbook tab
  const setsBlank = isBlank(setsMd, 'sets');
  const setsHtml = setsBlank
    ? '<p class="thin">Playbook to be filled by HC Kapinga in <code>my-team/sets.md</code>. Document offensive sets, ATOs, BLOBs, SLOBs, press break, and zone offense here.</p>'
    : mdToHtml(stripH1(setsMd));

  // Season log tab
  const seasonBlank = isBlank(seasonMd, 'season');
  const seasonHtml = seasonBlank
    ? '<p class="thin">Season log to be filled by HC Kapinga in <code>my-team/season-log.md</code>. The table is ready: Date, Opponent, Result, Key takeaways. Add a row per game.</p>'
    : mdToHtml(stripH1(seasonMd));

  // S&C program tab
  const scExists = fs.existsSync(path.join(ROOT, 'offseason-sc-app', 'index.html'));
  const scHtml = scExists
    ? '<p>The MacEwan offseason strength and conditioning app is a self-contained web tool that prescribes daily lifts, conditioning blocks, mobility, and load tracking for players during the offseason. Open it in a browser to view the current program, log sessions, and review weekly summaries. The file lives at <code>offseason-sc-app/index.html</code>.</p>'
      + '<p class="cards-link"><a href="offseason-sc-app/index.html" target="_blank" rel="noopener">Open the S and C app</a></p>'
    : '<p class="thin">offseason-sc-app/index.html not found.</p>';

  // Systems library tab: walk systems/<folder>/<file>.md
  let systemsHtml = '';
  if(fs.existsSync(SYSTEMS)){
    const folders = fs.readdirSync(SYSTEMS, {withFileTypes:true})
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort();
    const blocks = [];
    let totalFiles = 0;
    for(const folder of folders){
      const dir = path.join(SYSTEMS, folder);
      const files = fs.readdirSync(dir).filter(f => /\.md$/i.test(f)).sort();
      if(!files.length) continue;
      totalFiles += files.length;
      const items = files.map(f => {
        const rel = 'systems/' + folder + '/' + f;
        const label = f.replace(/\.md$/i,'').replace(/-/g,' ');
        return '<li><a href="'+rel+'" target="_blank" rel="noopener">'+esc(label)+'</a> <span class="muted">'+esc(rel)+'</span></li>';
      }).join('');
      const nice = folder.charAt(0).toUpperCase() + folder.slice(1).replace(/-/g,' ');
      blocks.push('<h4>'+esc(nice)+' ('+files.length+')</h4><ul>'+items+'</ul>');
    }
    systemsHtml = '<p>Concept and system library, '+totalFiles+' files across '+blocks.length+' folders. Each link opens the raw markdown file in a new tab.</p>' + blocks.join('');
  } else {
    systemsHtml = '<p class="thin">systems/ folder not found.</p>';
  }

  // Load offensive concepts cards dynamically
  let offConceptsHtml = '';
  const offConceptsPath = path.join(ROOT, 'data', 'offensive-concepts.json');
  if (fs.existsSync(offConceptsPath)) {
    try {
      const offData = JSON.parse(fs.readFileSync(offConceptsPath, 'utf8'));
      const cardsHtml = offData.map(c => {
        const pillarList = c.pillars && c.pillars.length > 0
          ? `<div class="concept-pillars">${c.pillars.map(p => `<span class="concept-pillar-badge">${esc(p)}</span>`).join('')}</div>`
          : '';
        const termItems = c.terms.map(t => `
          <div class="concept-term-item">
            <strong>${esc(t.name)}</strong>
            <span>${esc(t.description)}</span>
          </div>
        `).join('');
        const playBtn = c.playLink
          ? `<div class="concept-card-footer"><a href="${esc(c.playLink)}" target="_blank" class="concept-play-btn" rel="noopener">🎥 Watch Play Diagram</a></div>`
          : '';
        return `
          <div class="concept-card">
            <div class="concept-card-header">
              <div class="concept-card-title">${esc(c.title)}</div>
              ${c.slogan ? `<div class="concept-card-slogan">"${esc(c.slogan)}"</div>` : ''}
            </div>
            <div class="concept-card-body">
              ${pillarList ? `<div class="concept-section-title">Core Spots & Pillars</div>${pillarList}` : ''}
              <div class="concept-section-title">Terminology & Rules</div>
              <div class="concept-terms-grid">${termItems}</div>
            </div>
            ${playBtn}
          </div>
        `;
      }).join('');
      offConceptsHtml = `<div class="concept-grid">${cardsHtml}</div>`;
    } catch(e) {
      offConceptsHtml = `<p class="thin">Error loading offensive concepts: ${esc(e.message)}</p>`;
    }
  } else {
    offConceptsHtml = '<p class="thin">Offensive concepts file not found.</p>';
  }

  // Load defensive concepts cards dynamically
  let defConceptsHtml = '';
  const defConceptsPath = path.join(ROOT, 'data', 'defensive-concepts.json');
  if (fs.existsSync(defConceptsPath)) {
    try {
      const defData = JSON.parse(fs.readFileSync(defConceptsPath, 'utf8'));
      const cardsHtml = defData.map(c => {
        const pillarList = c.pillars && c.pillars.length > 0
          ? `<div class="concept-pillars">${c.pillars.map(p => `<span class="concept-pillar-badge">${esc(p)}</span>`).join('')}</div>`
          : '';
        const termItems = c.terms.map(t => `
          <div class="concept-term-item">
            <strong>${esc(t.name)}</strong>
            <span>${esc(t.description)}</span>
          </div>
        `).join('');
        const playBtn = c.playLink
          ? `<div class="concept-card-footer"><a href="${esc(c.playLink)}" target="_blank" class="concept-play-btn" rel="noopener">🎥 Watch Play Diagram</a></div>`
          : '';
        return `
          <div class="concept-card">
            <div class="concept-card-header">
              <div class="concept-card-title">${esc(c.title)}</div>
              ${c.slogan ? `<div class="concept-card-slogan">"${esc(c.slogan)}"</div>` : ''}
            </div>
            <div class="concept-card-body">
              ${pillarList ? `<div class="concept-section-title">Core Spots & Pillars</div>${pillarList}` : ''}
              <div class="concept-section-title">Terminology & Rules</div>
              <div class="concept-terms-grid">${termItems}</div>
            </div>
            ${playBtn}
          </div>
        `;
      }).join('');
      defConceptsHtml = `<div class="concept-grid">${cardsHtml}</div>`;
    } catch(e) {
      defConceptsHtml = `<p class="thin">Error loading defensive concepts: ${esc(e.message)}</p>`;
    }
  } else {
    defConceptsHtml = '<p class="thin">Defensive concepts file not found.</p>';
  }

  const tabs = [
    {id:'sets',         label:'Playbook (Sets)',    html: setsHtml},
    {id:'off-concepts', label:'Offensive Concepts', html: offConceptsHtml},
    {id:'def-concepts', label:'Defensive Concepts', html: defConceptsHtml},
    {id:'season',       label:'Season log',         html: seasonHtml},
    {id:'sc',           label:'S and C program',    html: scHtml},
    {id:'systems',      label:'Systems library',    html: systemsHtml},
  ];

  const tabBtns = tabs.map((t,idx) => {
    const cls = 'tab-btn'+(idx===0?' is-active':'');
    return '<button class="'+cls+'" role="tab" data-target="'+teamId+'-tab-'+t.id+'">'+esc(t.label)+'</button>';
  }).join('');
  const tabPanes = tabs.map((t,idx) => {
    const cls = 'tab-pane'+(idx===0?' is-active':'');
    return '<div id="'+teamId+'-tab-'+t.id+'" class="'+cls+'">'
      + '<h3 class="print-only">'+esc(t.label)+'</h3>'
      + t.html + '</div>';
  }).join('');

  const meta = [
    '<span><strong>HC:</strong> David Kapinga</span>',
    '<span><strong>Home:</strong> Edmonton, AB</span>',
    '<span><strong>Conf:</strong> Canada West</span>',
    '<span><strong>Div:</strong> Prairie</span>',
  ];
  const chips = [
    '<span class="chip chip-us">Our Team</span>',
    '<span class="chip chip-conf">Canada West</span>',
    '<span class="chip chip-div">PRAIRIE</span>',
    '<span class="chip">Edmonton, AB</span>',
  ];

  return `
<article id="${teamId}" class="team-card us">
  <header class="team-banner us-banner">
    <h2>${esc(team)} (Our Team)</h2>
    <div class="banner-meta">${meta.join(' ')}</div>
  </header>
  <div class="chips">${chips.join('')}</div>
  <div class="card-pad">${identitySectionHtml}</div>
  <div class="card-pad">${rosterSectionHtml}</div>
  <div class="tabs" data-tabs>
    <div class="tab-buttons" role="tablist">${tabBtns}</div>
    ${tabPanes}
  </div>
</article>`;
}

function buildTeamCard(slug, division){
  const profilePath = path.join(OPP, slug, 'profile.md');
  let scoutPath = path.join(OPP, slug, 'scouts', '2026-27-scout.md');
  if (!fs.existsSync(scoutPath)) {
    scoutPath = path.join(OPP, slug, 'scouts', '2025-26-scout.md');
  }
  const profile = parseProfile(fs.readFileSync(profilePath,'utf8'), slug);
  const scout = parseScout(fs.readFileSync(scoutPath,'utf8'));

  const teamId = slug;
  const team = profile.teamName;
  const f = profile.fields;

  // Banner meta line
  const meta = [];
  if(f.hc)     meta.push('<span><strong>HC:</strong> '+inline(f.hc)+'</span>');
  if(f.arena)  meta.push('<span><strong>Arena:</strong> '+inline(f.arena)+'</span>');
  meta.push('<span><strong>Conf:</strong> Canada West</span>');
  if(division) meta.push('<span><strong>Div:</strong> '+division+'</span>');

  const recordRow = [];
  if(f.rec2627) recordRow.push('<span><strong>2026-27:</strong> '+inline(f.rec2627)+'</span>');
  if(f.rec2526) recordRow.push('<span><strong>2025-26:</strong> '+inline(f.rec2526)+'</span>');
  if(f.rec2425) recordRow.push('<span><strong>2024-25:</strong> '+inline(f.rec2425)+'</span>');

  // Chips
  const chips = [];
  chips.push('<span class="chip chip-div">'+division.toUpperCase()+'</span>');
  chips.push('<span class="chip chip-conf">Canada West</span>');
  if(f.updated) chips.push('<span class="chip">Updated '+inline(f.updated)+'</span>');

  // Identity block (paragraph from blockquote)
  const identityHtml = profile.identity
    ? '<div class="sec identity"><h3>Identity (2026-27)</h3><blockquote><p>'+inline(profile.identity)+'</p></blockquote></div>'
    : '';

  // Coach's Note block
  const coachNoteHtml = (profile.coachNote && !profile.coachNote.includes('Add custom coaching notes here'))
    ? '<div class="sec coach-note" style="background:rgba(209,173,125,0.08); border-left:4px solid #d1ad7d; padding:12px 16px; margin:12px 0; border-radius:6px;"><h4 style="margin:0 0 6px 0; color:#d1ad7d; font-size:0.9em; text-transform:uppercase; letter-spacing:0.5px;">📋 Coach\'s Note</h4><p style="margin:0; font-size:0.95em;">'+inline(profile.coachNote)+'</p></div>'
    : '';

  // Roster table block
  const rosterHtml = profile.rosterMd
    ? '<div class="sec roster"><h3>Roster</h3>'+mdToHtml(profile.rosterMd)+'</div>'
    : '';

  // Tabs
  const tabBtns = TAB_LABELS.map((t,idx) => {
    const cls = 'tab-btn'+(idx===0?' is-active':'');
    return '<button class="'+cls+'" role="tab" data-target="'+teamId+'-tab-'+t.n+'">'+esc(t.label)+'</button>';
  }).join('');
  const tabPanes = TAB_LABELS.map((t,idx) => {
    const cls = 'tab-pane'+(idx===0?' is-active':'');
    const sec = scout.sections[t.n];
    const body = sec ? mdToHtml(sec.body) : '<p class="thin">No content captured.</p>';
    return '<div id="'+teamId+'-tab-'+t.n+'" class="'+cls+'">'
      + '<h3 class="print-only">'+esc(t.label)+'</h3>'
      + body + '</div>';
  }).join('');

  // usportshoops block
  const usportsHtml = profile.usportsMd
    ? '<details class="collapse"><summary>usportshoops.ca, records and top scorers</summary><div class="collapse-body">'+mdToHtml(profile.usportsMd)+'</div></details>'
    : '';

  // Per-team scout-cards link
  const cardsRel = 'opponents/'+slug+'/scout-cards.html';
  const cardsExists = fs.existsSync(path.join(ROOT, cardsRel));
  const cardsHtml = cardsExists
    ? '<p class="cards-link"><a href="'+cardsRel+'" target="_blank" rel="noopener">Open photo scout cards (separate page)</a></p>'
    : '';

  // Sources
  const profileSrc = profile.sourcesMd ? mdToHtml(profile.sourcesMd) : '';
  const scoutSrc = scout.sources ? mdToHtml(scout.sources) : '';
  const sourcesHtml = (profileSrc || scoutSrc)
    ? '<details class="collapse"><summary>Sources</summary><div class="collapse-body">'
        + (profileSrc ? '<p><strong>Profile sources:</strong></p>'+profileSrc : '')
        + (scoutSrc ? '<p><strong>Scout sources:</strong></p>'+scoutSrc : '')
        + '</div></details>'
    : '';

  return `
<article id="${teamId}" class="team-card">
  <header class="team-banner">
    <h2>${esc(team)}</h2>
    <div class="banner-meta">${meta.join(' ')}</div>
    ${recordRow.length ? '<div class="banner-meta record-meta">'+recordRow.join(' ')+'</div>' : ''}
  </header>
  <div class="chips">${chips.join('')}</div>
  ${identityHtml ? '<div class="card-pad">'+identityHtml+coachNoteHtml+'</div>' : ''}
  ${rosterHtml ? '<div class="card-pad">'+rosterHtml+'</div>' : ''}
  <div class="tabs" data-tabs>
    <div class="tab-buttons" role="tablist">${tabBtns}</div>
    ${tabPanes}
  </div>
  ${cardsHtml ? '<div class="card-pad">'+cardsHtml+'</div>' : ''}
  ${usportsHtml}
  ${sourcesHtml}
</article>`;
}

// Track thinness: count [FILL FROM ...] and [VERIFY ...] markers
function thinnessReport(){
  const report = [];
  for(const slug of [...PRAIRIE, ...PACIFIC]){
    const pf = fs.readFileSync(path.join(OPP, slug, 'profile.md'),'utf8');
    let scoutFile = path.join(OPP, slug, 'scouts', '2026-27-scout.md');
    if (!fs.existsSync(scoutFile)) scoutFile = path.join(OPP, slug, 'scouts', '2025-26-scout.md');
    const sc = fs.readFileSync(scoutFile,'utf8');
    const both = pf+'\n'+sc;
    const fills = (both.match(/\[FILL FROM[^\]]*\]/gi) || []).length;
    const verify = (both.match(/\[VERIFY[^\]]*\]/gi) || []).length;
    const sourceLines = (pf.match(/^- https?:\/\//gm) || []).length;
    report.push({slug, fills, verify, sourceLines, totalChars: both.length});
  }
  return report;
}

const allTeams = [...PRAIRIE.map(s=>({slug:s,div:'Prairie'})), ...PACIFIC.map(s=>({slug:s,div:'Pacific'}))];

// Resolve team display names by quickly parsing profiles
const teamDisplay = {};
for(const t of allTeams){
  const md = fs.readFileSync(path.join(OPP, t.slug, 'profile.md'),'utf8');
  const p = parseProfile(md, t.slug);
  teamDisplay[t.slug] = p.teamName;
}

// Sidebar
const navPrairie = PRAIRIE.map(s=>'<li><a href="#'+s+'">'+esc(teamDisplay[s])+'</a></li>').join('');
const navPacific = PACIFIC.map(s=>'<li><a href="#'+s+'">'+esc(teamDisplay[s])+'</a></li>').join('');

const cards = allTeams.map(t => buildTeamCard(t.slug, t.div)).join('\n');
const ourTeamCard = buildOurTeamCard();

const today = new Date().toISOString().slice(0,10);

const html = `<!doctype html>
<html lang="en">
<head>
<script src="auth-lock.js"></script>
<script src="offseason-sc-app/tracking-config.js"></script>
<script src="site-tracking.js"></script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Canada West Men&#39;s Basketball, MacEwan Griffins Coaching Hub 2026-27</title>
<style>
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
     color:#1c1c1c;background:#f4f5f7;line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:#98002e;text-decoration:none}
a:hover{text-decoration:underline}
code{background:#eef0f2;padding:1px 5px;border-radius:3px;font-size:.92em}

#mobile-header {
  display: none;
  background: #000;
  color: #fff;
  padding: 10px 16px;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 1000;
  border-bottom: 2px solid #98002e;
}
.menu-toggle {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}
.drawer-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1005;
  backdrop-filter: blur(2px);
}
.close-drawer {
  display: none;
  position: absolute;
  top: 14px;
  right: 16px;
  background: transparent;
  border: none;
  color: #d1ad7d;
  font-size: 28px;
  cursor: pointer;
  line-height: 1;
}

/* Layout */
.layout{display:grid;grid-template-columns:240px 1fr;min-height:100vh}
nav.side{position:sticky;top:0;align-self:start;height:100vh;overflow:auto;
         background:#000;color:#fff;padding:20px 16px;font-size:.92em;border-right:3px solid #98002e}
nav.side h2{font-size:.9em;margin:18px 0 10px;text-transform:uppercase;letter-spacing:.06em;color:#d1ad7d}
nav.side h2:first-child{margin-top:0}
nav.side ol{list-style:none;margin:0;padding:0;counter-reset:nav}
nav.side ol.pacific{counter-reset:nav 9}
nav.side li{counter-increment:nav;margin:2px 0}
nav.side li a{display:block;padding:6px 10px;color:#E6E7E9;border-radius:4px;font-size:.92em}
nav.side li a:hover{background:rgba(209,173,125,.15);text-decoration:none;color:#fff}
nav.side li a::before{content:counter(nav) ". ";color:#d1ad7d;font-weight:600;margin-right:4px}
nav.side .nav-foot{margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.18);
                   font-size:.78em;color:#B8BCC2;line-height:1.4}

main{padding:28px 36px 80px;max-width:1100px}

/* Cover */
.cover{position:relative;overflow:hidden;background:#98002e;color:#fff;
       padding:36px 32px;border-radius:10px;margin-bottom:32px;
       box-shadow:0 1px 3px rgba(0,0,0,.08)}
.cover-inner{display:flex;align-items:center;gap:24px}
.cover-logo{flex-shrink:0;width:96px;height:96px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;padding:10px;box-shadow:0 4px 12px rgba(0,0,0,.4)}
.cover-logo img{width:100%;height:auto;display:block}
.cover-text{flex:1;min-width:0}
.cover::before{content:"";position:absolute;top:0;right:0;bottom:0;width:6px;background:#d1ad7d}
@media(max-width:600px){.cover-inner{flex-direction:column;align-items:flex-start}.cover-logo{width:72px;height:72px}}
.cover h1{margin:0 0 8px;font-size:1.8em;letter-spacing:.01em}
.cover p{margin:4px 0;opacity:.92}
.cover .author{color:#d1ad7d;font-weight:700;letter-spacing:.04em}

/* Team card */
.team-card{background:#fff;border-radius:10px;margin-bottom:28px;
           box-shadow:0 1px 3px rgba(0,0,0,.08);overflow:hidden;border-top:4px solid #d1ad7d}
.team-banner{color:#fff;padding:18px 22px;background:#98002e;border-bottom:3px solid #000}
.team-banner h2{margin:0;font-size:1.45em}
.banner-meta{margin-top:6px;font-size:.92em;opacity:.95}
.banner-meta span{margin-right:16px;display:inline-block}
.record-meta{margin-top:4px;color:#f6e6cf}

.chips{padding:10px 22px 0;display:flex;flex-wrap:wrap;gap:6px}
.chip{display:inline-block;font-size:.78em;padding:3px 9px;border-radius:11px;
      background:#eef0f2;color:#333;border:1px solid #dde0e3}
.chip-conf{background:#f7efe2;border-color:#d1ad7d;color:#000}
.chip-div{background:#000;color:#d1ad7d;border-color:#000;font-weight:600;letter-spacing:.04em}
.chip-us{background:#98002e;color:#fff;border-color:#98002e;font-weight:700;letter-spacing:.03em}

/* Our Team accent (visually distinct from opponents) */
.team-card.us{border-top:6px solid #d1ad7d;box-shadow:0 2px 6px rgba(152,0,46,.18)}
.team-card.us .team-banner.us-banner{
  background:linear-gradient(90deg,#98002e 0,#98002e 78%,#d1ad7d 78%,#d1ad7d 100%);
  border-bottom:3px solid #d1ad7d;
}
.team-card.us .team-banner.us-banner h2{color:#fff}

nav.side .us-block{margin:0 0 18px;padding:10px 12px;background:rgba(209,173,125,.12);border-left:3px solid #d1ad7d;border-radius:4px}
nav.side .us-block h2{margin:0 0 6px;color:#d1ad7d;font-size:.78em}
nav.side .us-block a{display:block;padding:6px 8px;color:#fff;font-weight:700;border-radius:4px}
nav.side .us-block a:hover{background:rgba(209,173,125,.25);text-decoration:none}
nav.side .us-block .badge{display:inline-block;font-size:.7em;padding:1px 6px;background:#d1ad7d;color:#000;border-radius:8px;margin-left:6px;font-weight:700;letter-spacing:.04em}

nav.side .sync-block{margin:18px 0;padding:10px 12px;background:rgba(209,173,125,.06);border-left:3px solid #98002e;border-radius:4px}
nav.side .sync-block h2{margin:0 0 6px;color:#d1ad7d;font-size:.78em}
.sync-btn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:8px 12px;background:#98002e;color:#fff;border:0;border-radius:4px;font-weight:700;font-size:0.85em;cursor:pointer;transition:background 0.2s;}
.sync-btn:hover{background:#b8003a;}

.card-pad{padding:6px 22px 0}

/* Tabs */
.tabs{padding:12px 22px 0}
.tab-buttons{display:flex;gap:4px;border-bottom:2px solid #e6e8eb;margin-bottom:14px;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:6px}
.tab-btn{flex:0 0 auto;appearance:none;background:none;border:0;padding:9px 14px;font:inherit;
         font-weight:600;color:#5c6470;cursor:pointer;border-bottom:3px solid transparent;
         margin-bottom:-2px;transition:color .15s,border-color .15s}
.tab-btn:hover{color:#98002e}
.tab-btn.is-active{color:#98002e;border-color:#98002e}
.tab-pane{display:none}
.tab-pane.is-active{display:block}
.print-only{display:none}

/* Sections */
.sec{margin-bottom:14px}
.sec h3{margin:8px 0 6px;font-size:1.05em;color:#98002e}
.sec p,.sec li{font-size:.95em}
.sec ul,.sec ol{padding-left:22px;margin:6px 0}
.sec li{margin:2px 0}
.sec.identity blockquote{border-left:4px solid #d1ad7d;background:#faf6ee;border-radius:0 6px 6px 0;padding:10px 14px;margin:6px 0;color:#1c1c1c}
.sec.identity blockquote p{margin:0}
.tab-pane h3{margin:8px 0 6px;font-size:1.05em;color:#98002e}
.tab-pane h4{margin:10px 0 4px;font-size:.98em;color:#222}
.tab-pane p,.tab-pane li{font-size:.95em}
.tab-pane ul,.tab-pane ol{padding-left:22px;margin:6px 0}
.tab-pane li{margin:2px 0}
.tab-pane blockquote{margin:6px 0;padding:10px 14px;border-left:4px solid #98002e;
                background:#FAFAFA;border-radius:0 6px 6px 0;color:#234}
.tab-pane blockquote p{margin:0}

.tbl-wrap{overflow-x:auto;margin:8px 0}
table{border-collapse:collapse;width:100%;font-size:.88em;background:#fff}
th,td{border:1px solid #e1e3e6;padding:6px 9px;text-align:left;vertical-align:top}
th{background:#f4f6f7;font-weight:600;color:#333}

/* Collapsibles */
.collapse{margin:8px 22px 14px;border:1px solid #e1e3e6;border-radius:6px;background:#fafbfc}
.collapse summary{cursor:pointer;padding:10px 14px;font-weight:600;color:#98002e;list-style:none;
                  display:flex;justify-content:space-between;align-items:center;user-select:none}
.collapse summary::-webkit-details-marker{display:none}
.collapse summary::after{content:"\\25B8";font-size:.8em;color:#999;transition:transform .15s}
.collapse[open] summary::after{transform:rotate(90deg)}
.collapse-body{padding:0 14px 12px;font-size:.93em}
.collapse-body table{font-size:.85em}
.muted{color:#6a7079;font-weight:400;font-size:.85em}

.cards-link a{display:inline-block;padding:6px 12px;background:#000;color:#d1ad7d;border-radius:4px;font-weight:600;font-size:.9em}
.cards-link a:hover{background:#98002e;color:#fff;text-decoration:none}

.thin{color:#888;font-style:italic}

/* Concept Cards (Offensive & Defensive) */
.concept-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 15px;
}
.concept-card {
  border: 1px solid #e1e3e6;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,.05);
  display: flex;
  flex-direction: column;
}
.concept-card-header {
  background: #98002e;
  color: #fff;
  padding: 12px 16px;
  border-bottom: 2px solid #d1ad7d;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.concept-card-title {
  font-size: 1.1em;
  font-weight: 700;
  letter-spacing: .03em;
}
.concept-card-slogan {
  font-size: 0.85em;
  color: #d1ad7d;
  font-style: italic;
  font-weight: 600;
}
.concept-card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.concept-section-title {
  font-size: 0.8em;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: .05em;
  margin-bottom: 4px;
  border-bottom: 1px solid #eee;
  padding-bottom: 2px;
}
.concept-pillars {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.concept-pillar-badge {
  background: #fbf7f1;
  border: 1px solid #d1ad7d;
  color: #98002e;
  font-size: 0.8em;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 600;
}
.concept-terms-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
@media (max-width: 768px) {
  .concept-terms-grid {
    grid-template-columns: 1fr;
  }
}
.concept-term-item {
  background: #fdfdfd;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.88em;
  line-height: 1.4;
}
.concept-term-item strong {
  display: block;
  color: #98002e;
  font-weight: 700;
  margin-bottom: 2px;
}
.concept-card-footer {
  background: #fafbfc;
  padding: 10px 16px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
}
.concept-play-btn {
  display: inline-block;
  background: #000;
  color: #d1ad7d;
  padding: 6px 12px;
  font-size: 0.85em;
  font-weight: 600;
  border-radius: 4px;
  text-decoration: none;
  transition: background 0.15s;
}
.concept-play-btn:hover {
  background: #98002e;
  color: #fff;
  text-decoration: none;
}

/* Mobile */
@media (max-width: 850px){
  .layout{grid-template-columns:1fr}
  #mobile-header {
    display: flex;
  }
  nav.side {
    position: fixed;
    top: 0;
    left: -280px;
    width: 280px;
    height: 100vh;
    max-height: 100vh;
    z-index: 999999;
    background: #000;
    transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 5px 0 25px rgba(0, 0, 0, 0.8);
    border-bottom: none;
    border-right: 3px solid #98002e;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .side-open nav.side {
    left: 0;
  }
  .side-open .drawer-backdrop {
    display: block;
    z-index: 999990;
  }
  .close-drawer {
    display: block;
  }
  main{padding:20px 14px 60px}
  .team-banner{padding:14px 16px}
  .chips,.tabs,.card-pad{padding-left:16px;padding-right:16px}
  .collapse{margin-left:16px;margin-right:16px}
}

/* Print */
@media print{
  body{background:#fff;color:#000;font-size:11pt}
  nav.side{display:none}
  .layout{display:block}
  main{max-width:none;padding:0}
  .cover{box-shadow:none;border-radius:0;padding:24px}
  .team-card{box-shadow:none;border:1px solid #ccc;page-break-before:always;break-before:page;border-radius:0}
  .team-card:first-of-type{page-break-before:auto;break-before:auto}
  .tab-buttons{display:none}
  .tab-pane{display:block !important;border-top:1px dashed #bbb;margin-top:10px;padding-top:6px}
  .tab-pane:first-of-type{border-top:0;margin-top:0;padding-top:0}
  .print-only{display:block;font-size:1.1em;color:#98002e;margin:6px 0 4px}
  .collapse{border:0;background:#fff;margin:8px 0}
  .collapse summary{padding:6px 0}
  .collapse summary::after{display:none}
  .collapse > .collapse-body{display:block !important;padding:0}
  details:not([open]) > .collapse-body{display:block !important}
  a{color:#000;text-decoration:none}
  .concept-card{page-break-inside:avoid;break-inside:avoid;margin-bottom:12px}
}
</style>
</head>
<body>
<div id="mobile-header">
  <div style="display:flex; align-items:center; gap:8px;">
    <img src="${logoDataUri}" alt="MacEwan" style="width:32px; height:32px; background:#fff; border-radius:4px; padding:2px;">
    <span style="font-weight:700; font-size:0.9em; letter-spacing:0.3px; color:#fff;">Scouting Hub</span>
  </div>
  <button class="menu-toggle" onclick="toggleDrawer(true)">☰</button>
</div>
<div class="drawer-backdrop" id="backdrop" onclick="toggleDrawer(false)"></div>
<div class="layout">
  <nav class="side" aria-label="Team navigation">
    <button class="close-drawer" onclick="toggleDrawer(false)">×</button>
    <div style="margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.15);" class="no-print">
      <a href="index.html" style="display: flex; align-items: center; gap: 8px; color: #d1ad7d; font-weight: 700; font-size: 0.9em; text-decoration: none; margin-bottom: 8px;">
        <span>🏠</span> Coaching Hub Dashboard
      </a>
      <a href="lineup-tracker.html" style="display: flex; align-items: center; gap: 8px; color: #fff; font-weight: 700; font-size: 0.88em; text-decoration: none; margin-bottom: 6px;">
        <span>📊</span> MacEwan Database
      </a>
      <a href="lineup-logger.html" style="display: flex; align-items: center; gap: 8px; color: #2ecc71; font-weight: 600; font-size: 0.84em; text-decoration: none; margin-bottom: 6px;">
        <span>📱</span> Lineup &amp; +/- Logger
      </a>
      <a href="offense-logger.html" style="display: flex; align-items: center; gap: 8px; color: #ff9f43; font-weight: 600; font-size: 0.84em; text-decoration: none; margin-bottom: 6px;">
        <span>🏀</span> Tactical Offense Logger
      </a>
      <a href="defense-logger.html" style="display: flex; align-items: center; gap: 8px; color: #70a1ff; font-weight: 600; font-size: 0.84em; text-decoration: none;">
        <span>🛡️</span> Tactical Defense Logger
      </a>
    </div>
    <div class="us-block">
      <h2>Our Team</h2>
      <a href="#macewan-griffins">MacEwan Griffins<span class="badge">HOME</span></a>
    </div>
    <div class="sync-block no-print">
      <h2>Admin Control</h2>
      <button class="sync-btn" style="background:#1565c0;" onclick="updateUSportsWeeklyStats()">🏀 Update Weekly USports Stats</button>
<div class="stats-updated-label" style="font-size:0.75em; opacity:0.75; margin-top:6px;"></div>
    </div>
    <h2>Prairie Division</h2>
    <ol class="prairie">${navPrairie}</ol>
    <h2>Pacific Division</h2>
    <ol class="pacific">${navPacific}</ol>
    <div class="nav-foot">
      MacEwan Griffins, HC David Kapinga<br>Built ${today}
    </div>
  </nav>
  <main>
    <header class="cover">
      <div class="cover-inner">
        <div class="cover-logo"><img src="${logoDataUri}" alt="MacEwan Griffins logo"></div>
        <div class="cover-text">
          <h1>Canada West Men&#39;s Basketball, MacEwan Coaching Hub 2026-27</h1>
          <p class="author">MacEwan Griffins, built for HC David Kapinga and staff</p>
          <p>Generated ${today}, 17 teams (MacEwan + 16 opponents: 9 Prairie, 7 Pacific), self-contained (offline-friendly)</p>
          <p style="font-size:.85em;opacity:.85;margin-top:10px">
            The first card is MacEwan (Our Team) with our identity, roster, playbook, season log, S and C program, and systems library. Each opponent card opens with identity and roster, then 8 tabs from the scout report (Personnel, Offense, Defense, How we attack, How we defend, Special situations, Keys to victory, Practice points). When printed, all tabs and collapsed sections expand automatically.
          </p>
        </div>
      </div>
    </header>
    ${ourTeamCard}
    ${cards}
  </main>
</div>
<script>
(function(){
  // Mobile drawer logic
  window.toggleDrawer = function(open) {
    if (open) {
      document.body.classList.add('side-open');
    } else {
      document.body.classList.remove('side-open');
    }
  };

  document.addEventListener('DOMContentLoaded', function() {
    var toggles = document.querySelectorAll('.menu-toggle');
    toggles.forEach(function(btn) {
      btn.addEventListener('click', function(e) { e.preventDefault(); toggleDrawer(true); });
      btn.addEventListener('touchstart', function(e) { e.preventDefault(); toggleDrawer(true); }, { passive: false });
    });

    var backdrops = document.querySelectorAll('.drawer-backdrop, .close-drawer');
    backdrops.forEach(function(el) {
      el.addEventListener('click', function(e) { e.preventDefault(); toggleDrawer(false); });
      el.addEventListener('touchstart', function(e) { e.preventDefault(); toggleDrawer(false); }, { passive: false });
    });
  });

  // Close drawer on clicking side nav links
  document.querySelectorAll('nav.side a').forEach(function(link) {
    link.addEventListener('click', function() {
      toggleDrawer(false);
    });
  });

  document.querySelectorAll('[data-tabs]').forEach(function(group){
    var btns = group.querySelectorAll('.tab-btn');
    btns.forEach(function(btn){
      btn.addEventListener('click', function(){
        var targetId = btn.getAttribute('data-target');
        btns.forEach(function(b){ b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        group.querySelectorAll('.tab-pane').forEach(function(p){
          p.classList.toggle('is-active', p.id === targetId);
        });
      });
    });
  });
  window.addEventListener('beforeprint', function(){
    document.querySelectorAll('details').forEach(function(d){ d._wasOpen = d.open; d.open = true; });
  });
  window.addEventListener('afterprint', function(){
    document.querySelectorAll('details').forEach(function(d){ if(!d._wasOpen) d.open = false; });
  });
})();
</script>

<script src="/stats-refresh.js"></script>
<!-- Non-Blocking Weekly Update Floating Corner Popup (Requires pressing × to dismiss) -->
<div id="weekly-update-modal" style="display:none; position:fixed; bottom:24px; right:24px; z-index:999999; width:380px; max-width:calc(100vw - 32px); background:#151822; border:2px solid #d1ad7d; border-radius:12px; box-shadow:0 12px 40px rgba(0,0,0,0.85); overflow:hidden; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#eee; pointer-events:auto; animation:weeklySlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
  <div style="background:linear-gradient(135deg, #1c0f1b 0%, #151822 100%); padding:12px 16px; border-bottom:1px solid #2a2d3c; display:flex; justify-content:space-between; align-items:center;">
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="font-size:20px;" id="weekly-modal-icon">🔄</span>
      <h3 style="margin:0; font-size:14px; color:#fff; font-weight:800;" id="weekly-modal-title">Syncing USports Stats...</h3>
    </div>
    <button onclick="closeWeeklyUpdateModal()" style="background:none; border:none; color:#d1ad7d; font-size:24px; cursor:pointer; line-height:1; padding:0 4px; font-weight:bold;" title="Close popup" aria-label="Close notification">×</button>
  </div>
  <div style="padding:14px 16px;">
    <p style="margin:0 0 10px; font-size:12.5px; line-height:1.45; color:#ddd;" id="weekly-modal-msg">
      Syncing 2026-27 rosters and Canada West statistics in background... You can freely browse and navigate the website.
    </p>
    <div id="weekly-modal-loader" style="display:flex; align-items:center; gap:8px; color:#d1ad7d; font-size:12px; margin-bottom:10px;">
      <span style="display:inline-block; width:14px; height:14px; border:2px solid #d1ad7d; border-top-color:transparent; border-radius:50%; animation:weeklySpin 0.8s linear infinite;"></span>
      <span>Contacting Netlify...</span>
    </div>
    <div id="weekly-modal-details" style="display:none; background:#0c0d12; border:1px solid #272a3b; border-radius:8px; padding:10px; font-size:11.5px; color:#bbb; margin-bottom:12px; line-height:1.45;"></div>
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:11px; color:#888;">💡 Press × to dismiss</span>
      <button onclick="closeWeeklyUpdateModal()" style="background:#d1ad7d; color:#000; font-weight:800; border:none; padding:6px 14px; border-radius:6px; cursor:pointer; font-size:12px;">✕ Close</button>
    </div>
  </div>
</div>
<style>
  @keyframes weeklySpin { to { transform: rotate(360deg); } }
  @keyframes weeklySlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @media (max-width: 600px) {
    #weekly-update-modal {
      bottom: 12px !important;
      right: 12px !important;
      left: 12px !important;
      width: auto !important;
      max-width: none !important;
    }
  }
</style>
</body>
</html>`;

fs.writeFileSync(OUT, html, 'utf8');
const stat = fs.statSync(OUT);
console.log('Wrote', OUT, '(', stat.size, 'bytes )');

// Write redirect from 2025-26 URL to 2026-27 URL
const REDIRECT_OUT = path.join(ROOT, 'canadawest-scout-2025-26.html');
const redirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=canadawest-scout-2026-27.html">
  <title>Redirecting to 2026-27 Coaching Hub...</title>
  <script>
    window.location.href = "canadawest-scout-2026-27.html";
  </script>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; background:#141418; color:#fff; display:flex; height:100vh; align-items:center; justify-content:center; text-align:center;">
  <div style="padding: 30px; background:#1e1e24; border-radius:12px; border-left: 5px solid #d1ad7d; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
    <h2 style="margin-top:0; color:#d1ad7d;">🏀 Canada West Coaching Hub 2026-27</h2>
    <p>Redirecting to the live 2026-27 season hub...</p>
    <p><a href="canadawest-scout-2026-27.html" style="color:#64b5f6; font-weight:bold;">Click here if not redirected automatically</a></p>
  </div>
</body>
</html>`;
fs.writeFileSync(REDIRECT_OUT, redirectHtml, 'utf8');
console.log('Wrote redirect page to', REDIRECT_OUT);

console.log('\nThinness report (per opponent):');
const rep = thinnessReport();
rep.sort((a,b)=>(b.fills+b.verify)-(a.fills+a.verify));
for(const r of rep){
  console.log('  '+r.slug.padEnd(28)+' FILL='+String(r.fills).padStart(2)
    +' VERIFY='+String(r.verify).padStart(2)
    +' src='+String(r.sourceLines).padStart(2)
    +' chars='+r.totalChars);
}
console.log('\nTotal teams:', PRAIRIE.length+PACIFIC.length+1, '(MacEwan + '+PRAIRIE.length+' Prairie + '+PACIFIC.length+' Pacific)');
}

build().then(() => {
  // Exit as soon as the page is written; don't wait on idle network sockets.
  process.exit(0);
}).catch(e => {
  console.error('Fatal build error:', e);
  process.exit(1);
});
