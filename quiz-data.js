// Shared code for Griffin Quizzes (quiz.html) and Game Week (game-week.html):
// loads the scout cards, team scouting reports, stats, Griffin Concepts and the
// coaches' question bank, and builds quiz questions from them.
//
// Every question looks like:
//   { key, kind, source, tags: [...], q, quote?, answer, options: [...], explain?, bankId? }
// "key" is stable for automatic questions, so a coach can hide or replace one.
(function () {
  'use strict';

  const TEAMS = [
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
  const teamBySlug = slug => TEAMS.find(t => t.slug === slug);

  // Suggested tags (coaches can type any tag).
  const TAGS = ['offence', 'defence', 'transition', 'pnr', 'dho', 'closeouts', 'shell', 'post', 'iso',
    'drive & kick', 'core', 'flow', 'split games', 'off-ball screens', '1-on-1', 'rebounding',
    'special situations', 'scouting'];

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const squash = s => String(s || '').replace(/\s+/g, ' ').trim();
  const norm = s => squash(s).toLowerCase();
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const hash = s => { let h = 5381; const t = String(s); for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0; return h.toString(36); };

  // ----------------------------------------------------------- loading ---
  const cache = {};
  function once(key, fn) { return cache[key] || (cache[key] = fn().catch(e => { delete cache[key]; throw e; })); }
  function forget(prefix) { Object.keys(cache).forEach(k => { if (k.indexOf(prefix) === 0) delete cache[k]; }); }

  async function getContent(key) {
    try {
      const r = await fetch('/.netlify/functions/get-content?key=' + encodeURIComponent(key));
      const d = await r.json();
      return d && d.success && d.content ? d.content : '';
    } catch (e) { return ''; }
  }

  // Scout cards are read from the real scout card page (in a hidden frame), so
  // questions use exactly what players see, including coaches' saved edits.
  // (scout-cards-editor.js sets window.__scoutCardsReady once that has loaded.)
  function loadScoutCards(slug) {
    return once('cards:' + slug, () => new Promise((resolve, reject) => {
      const f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true');
      f.tabIndex = -1;
      f.style.cssText = 'position:absolute;left:-5000px;top:0;width:1200px;height:900px;visibility:hidden;border:0';
      const t0 = Date.now();
      let finished = false;
      const done = (cards, err) => { if (finished) return; finished = true; f.remove(); err ? reject(err) : resolve(cards); };
      f.onload = () => {
        const poll = () => {
          let w = null, d = null;
          try { w = f.contentWindow; d = f.contentDocument; } catch (e) {}
          if (!d) return done(null, new Error('Could not open the scout cards.'));
          if (w.__scoutCardsReady || Date.now() - t0 > 9000) {
            try { done(parseCards(d)); } catch (e) { done(null, e); }
          } else setTimeout(poll, 150);
        };
        poll();
      };
      setTimeout(() => done(null, new Error('The scout cards took too long to load.')), 20000);
      f.src = '/opponents/' + slug + '/scout-cards.html';
      document.body.appendChild(f);
    }));
  }

  function parseTags(text) {
    const t = squash(text);
    const re = /(Hand|C\/O|DTRAN|PIN\/DHO|PNR|REBOUND):/g;
    const hits = [];
    let m;
    while ((m = re.exec(t))) hits.push({ label: m[1], start: m.index, end: re.lastIndex });
    const out = {};
    hits.forEach((h, i) => {
      out[h.label] = t.slice(h.end, i + 1 < hits.length ? hits[i + 1].start : t.length).replace(/,\s*$/, '').trim();
    });
    return out;
  }

  function parseCards(doc) {
    return Array.from(doc.querySelectorAll('.card')).map(card => {
      const head = (card.querySelector('.player-header') || {}).textContent || '';
      const parts = head.split('•').map(s => s.trim());
      const rows = card.querySelectorAll('.stats-table tbody tr');
      const cells = tr => tr ? Array.from(tr.querySelectorAll('td')).slice(1).map(td => td.textContent.trim()) : [];
      const notesEl = card.querySelector('.scout-notes');
      const img = card.querySelector('.photo-tile img');
      const src = img ? img.getAttribute('src') || '' : '';
      return {
        num: (parts[0] || '').replace(/^#/, '').trim(),
        name: parts[1] || '',
        pos: parts[2] || '',
        ht: parts[3] || '',
        starter: card.classList.contains('starter'),
        tags: parseTags((card.querySelector('.tactical-tags') || {}).textContent || ''),
        notes: squash(notesEl ? (notesEl.innerText || notesEl.textContent) : ''),
        photo: src && src.indexOf('data:image/svg') !== 0 ? new URL(src, doc.baseURI).href : '',
        season: cells(rows[1])
      };
    }).filter(c => c.name);
  }

  function loadStats() {
    return once('stats', async () => {
      const r = await fetch('/data/usports-rosters-stats.json', { cache: 'no-cache' });
      return r.json();
    });
  }

  // Team scouting report: a coach's saved edit wins over the built file.
  function loadReport(slug, withEdits) {
    return once('report:' + slug + ':' + !!withEdits, async () => {
      let md = withEdits ? await getContent('scout_scout_' + slug) : '';
      if (!md) {
        try {
          const r = await fetch('/opponents/' + slug + '/scouts/2026-27-scout.md');
          md = r.ok ? await r.text() : '';
        } catch (e) { md = ''; }
      }
      return parseReport(md);
    });
  }

  // Drops "[FILL FROM FILM]", "(inferred …)", "TBD" parts and template text.
  function cleanValue(v, minLen) {
    let s = String(v || '')
      .replace(/\*\*/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\((?:[^)]*(?:inferred|verify|carried over)[^)]*)\)/gi, '');
    s = s.split(/\s+-\s+/).filter(p => !/\bTBD\b/i.test(p)).join(' - ');
    s = squash(s)
      .replace(/^OREB% \/ DREB%\s*/i, '')
      .replace(/\s+([.,;:])/g, '$1')
      .replace(/^\((.*)\)\.?$/, '$1')
      .replace(/^[-.;:,\s]+|[-;:,\s]+$/g, '');
    if (s.length < (minLen == null ? 12 : minLen)) return '';
    if ((s.match(/\//g) || []).length >= 3 && s.length < 50) return '';
    return s;
  }

  // { labels: { "Ball-screen coverage": { section, value } }, plan: [{short, full}], keys: [...], practice: [...] }
  function parseReport(md) {
    const out = { labels: {}, plan: [], keys: [], practice: [] };
    if (!md) return out;
    for (const sec of md.split(/\n(?=## )/)) {
      const title = ((sec.match(/^##\s*(?:\d+\.\s*)?(.+)/) || [])[1] || '').trim();
      const lines = sec.split('\n');
      if (/^(Offense|Defense|How we defend their O|Special situations)/i.test(title)) {
        for (const line of lines) {
          const m = line.match(/^\s*-\s*\*\*([^*]+?):?\*\*:?\s*(.*)$/);
          if (!m) continue;
          const value = cleanValue(m[2]);
          if (value) out.labels[m[1].replace(/:$/, '').trim()] = { section: title, value };
        }
      } else if (/^(How we attack their D|Keys to victory|Practice points)/i.test(title)) {
        const list = /^How/i.test(title) ? out.plan : /^Keys/i.test(title) ? out.keys : out.practice;
        for (const line of lines) {
          const m = line.match(/^\s*(?:\d+\.|-)\s+(.*)$/);
          if (!m) continue;
          const bold = m[1].match(/^\*\*(.+?)\*\*/);
          const short = cleanValue(bold ? bold[1] : m[1].split(/(?<=\.)\s/)[0]);
          const full = cleanValue(m[1], 4);
          if (short || full) list.push({ short: (short || full).replace(/\.$/, ''), full: full || short });
        }
      }
    }
    return out;
  }

  function loadConcepts() {
    return once('concepts', async () => {
      const r = await fetch('/griffin-concepts.html');
      const html = await r.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const saved = await getContent('griffin_basketball_concepts_v1');
      const box = doc.getElementById('playbook-data-container');
      if (saved && box) box.innerHTML = saved;
      const read = (tabId, side) => Array.from(doc.querySelectorAll('#' + tabId + ' .concept-card')).map(c => ({
        side,
        title: squash((c.querySelector('.concept-title h2') || {}).textContent),
        slogan: squash((c.querySelector('.concept-meta') || {}).textContent).replace(/^["“”']+|["“”']+$/g, ''),
        beliefs: Array.from(c.querySelectorAll('.playbook-item .editable')).map(e => squash(e.textContent)).filter(Boolean),
        terms: Array.from(c.querySelectorAll('.term-box')).map(t => ({
          name: squash((t.querySelector('.term-name') || {}).textContent),
          desc: squash((t.querySelector('.term-desc') || {}).textContent)
        })).filter(t => t.name && t.desc)
      })).filter(c => c.title);
      return { offense: read('offense-tab', 'offence'), defense: read('defense-tab', 'defence') };
    });
  }

  // Coaches' bank = starter questions in the repo + saved edits / new questions.
  function loadBank() {
    return once('bank', async () => {
      const [seed, live] = await Promise.all([
        fetch('/data/quiz-bank-seed.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => []),
        fetch('/.netlify/functions/quiz-bank', { cache: 'no-store' }).then(r => r.json()).catch(() => ({}))
      ]);
      const byId = {};
      (seed || []).forEach(q => { byId[q.id] = Object.assign({ origin: 'starter' }, q); });
      ((live && live.edits) || []).forEach(q => { byId[q.id] = Object.assign({ origin: byId[q.id] ? 'starter' : 'coach' }, q); });
      const questions = Object.values(byId).filter(q => !q.deleted && q.q && q.answer);
      const hidden = {};
      ((live && live.hidden) || []).forEach(h => { hidden[h.key] = h; });
      return { questions, hidden };
    });
  }

  // ------------------------------------------------------ question making ---
  function makeQ(kind, source, q, correct, pool, extra) {
    const c = squash(correct);
    if (!c) return null;
    const seen = new Set([norm(c)]);
    const distract = [];
    for (const d of shuffle(pool)) {
      const v = squash(d);
      if (!v || seen.has(norm(v))) continue;
      const nv = norm(v), nc = norm(c);
      if (nv.length >= 8 && nc.length >= 8 && (nv.startsWith(nc) || nc.startsWith(nv))) continue;   // look-alikes
      seen.add(nv);
      distract.push(v);
      if (distract.length === 3) break;
    }
    if (distract.length < 2) return null;
    const out = Object.assign({ kind, source, q, answer: c, options: shuffle([c].concat(distract)), tags: [] }, extra || {});
    out.key = out.key || ('a' + hash(kind + '|' + q + '|' + (out.quote || '') + '|' + c));
    return out;
  }

  function fromBank(b, source) {
    const wrong = (b.wrong || []).filter(Boolean);
    if (!wrong.length) return null;
    return { key: 'b' + b.id, bankId: b.id, kind: 'bank-' + b.id, source: source || 'Question bank', tags: b.tags || [],
      q: b.q, quote: b.quote || '', answer: b.answer, options: shuffle([b.answer].concat(wrong)), explain: b.explain || '' };
  }

  // Take N questions, cycling through question kinds so a quiz mixes topics.
  function pickMix(pool, n) {
    const byKind = {};
    pool.filter(Boolean).forEach(q => { (byKind[q.kind] = byKind[q.kind] || []).push(q); });
    const kinds = shuffle(Object.keys(byKind));
    kinds.forEach(k => { byKind[k] = shuffle(byKind[k]); });
    const out = [];
    const used = new Set();
    while (out.length < n && kinds.some(k => byKind[k].length)) {
      for (const k of kinds) {
        const q = byKind[k].shift();
        if (!q) continue;
        const id = q.q + '|' + (q.quote || '');
        if (used.has(id)) continue;
        used.add(id);
        out.push(q);
        if (out.length === n) break;
      }
    }
    return shuffle(out);
  }

  const numTag = c => /^\d+$/.test(c.num) ? '#' + c.num + ' ' : '';
  const pLabel = c => numTag(c) + c.name + (c.pos && c.pos !== 'N/A' ? ' (' + c.pos + ')' : '');
  const shortName = c => numTag(c) + c.name;

  // The stats-based "role" sentence and auto tag are dropped from a note.
  function noteStrengths(c) {
    let note = c.notes.replace(/\(Auto-written from stats\)/g, '').replace(/^Coach note:\s*/i, '');
    note = note.replace(/^(Starter|Rotation player|Comes off the bench|Bench)[^.]*\.\s*/i, '');
    note = note.replace(/^[\d.]+ MPG over \d+ games?\.\s*/i, '');
    return squash(note);
  }

  function cardQuestions(team, cards) {
    const qs = [];
    const T = team.title;
    const src = 'Scout card';
    const base = ['scouting', team.slug];
    const vals = key => cards.map(c => c.tags[key]).filter(Boolean);
    const COS = ['Shaq', 'Rose', 'Book', 'Klay'];
    const COVER = ['Over/Switch', 'Under', 'Over', 'Switch', 'Ice'];
    const add = (q, tags) => { if (q) { q.tags = base.concat(tags || []); qs.push(q); } };

    for (const c of cards) {
      const t = c.tags;
      if (t['C/O']) add(makeQ('co', src, `What is our closeout (C/O) call on ${pLabel(c)}?`, t['C/O'], COS.concat(vals('C/O'))), ['closeouts', 'defence']);
      if (t.PNR) add(makeQ('pnr', src, `How do we guard ${pLabel(c)} in ball screens (PNR)?`, t.PNR, vals('PNR').concat(vals('PIN/DHO'), COVER)), ['pnr', 'defence']);
      if (t['PIN/DHO']) add(makeQ('pin', src, `What is our PIN-down / DHO coverage on ${pLabel(c)}?`, t['PIN/DHO'], vals('PIN/DHO').concat(vals('PNR'), COVER)), ['dho', 'off-ball screens', 'defence']);
      if (/^\d+$/.test(c.num)) {
        add(makeQ('num', src, `What number does ${c.name} wear for ${T}?`, '#' + c.num, cards.filter(o => o !== c && /^\d+$/.test(o.num)).map(o => '#' + o.num)));
      }
      let note = noteStrengths(c);
      c.name.split(/\s+/).filter(w => w.length > 2).forEach(w => {
        note = note.replace(new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), '___');
      });
      if (note.length >= 40 && !/limited role so far|no 2026-27 stats yet/i.test(note)) {
        const others = cards.filter(o => o !== c);
        const samePos = others.filter(o => o.pos && o.pos === c.pos);
        add(makeQ('note', src, `Which ${T} player matches this scouting note?`, shortName(c),
          (samePos.length >= 3 ? samePos : others).map(shortName), { quote: note.length > 420 ? note.slice(0, 417) + '…' : note }));
      }
    }
    const pickOne = (kind, yes, no, q, tags) => yes.forEach(c => add(makeQ(kind, src, q, shortName(c), no.map(shortName)), tags));
    const has = (c, key, re) => re.test(c.tags[key] || '');
    pickOne('locate', cards.filter(c => has(c, 'DTRAN', /locate/i)), cards.filter(c => !c.tags.DTRAN), `In transition defence, which ${T} player do we have to LOCATE?`, ['transition', 'defence']);
    pickOne('box', cards.filter(c => has(c, 'REBOUND', /must/i)), cards.filter(c => c.tags.REBOUND && !has(c, 'REBOUND', /must/i)), `Which ${T} player is a MUST BOX OUT?`, ['rebounding', 'defence']);
    pickOne('klay', cards.filter(c => has(c, 'C/O', /^klay$/i)), cards.filter(c => has(c, 'C/O', /^(shaq|rose)$/i)), `Which ${T} player is a "Klay" (knockdown shooter: no airspace)?`, ['closeouts', 'defence']);
    pickOne('shaq', cards.filter(c => has(c, 'C/O', /^shaq$/i)), cards.filter(c => has(c, 'C/O', /^(book|klay)$/i)), `Which ${T} player is a "Shaq" closeout (not a 3-point threat)?`, ['closeouts', 'defence']);
    pickOne('lefty', cards.filter(c => has(c, 'Hand', /^l/i)), cards.filter(c => has(c, 'Hand', /^r/i)), `Which ${T} player is LEFT-handed?`);
    const starters = cards.filter(c => c.starter);
    if (starters.length && starters.length < cards.length) {
      pickOne('starter', starters, cards.filter(c => !c.starter), `Which of these players is in ${T}'s STARTING group?`);
    }
    return qs;
  }

  function statLeaders(team, stats) {
    const td = stats && stats[team.jsonKey];
    const ps = (td && td.playerStats) || [];
    const n = v => parseFloat(v) || 0;
    const rot = ps.filter(p => n(p.gp) >= 2 && n(p.mpg) >= 8);
    const top = (f) => rot.map(p => ({ p, v: f(p) })).sort((a, b) => b.v - a.v);
    const threes = rot.map(p => {
      const m = String(p.fg3 || '').match(/(\d+)\s*-\s*(\d+)/);
      const made = m ? +m[1] : 0, att = m ? +m[2] : 0;
      return { p, v: att ? made / att : 0, apg: att / Math.max(1, n(p.gp)) };
    });
    return {
      rot,
      ppg: top(p => n(p.ppg)),
      rpg: top(p => n(p.rpg)),
      apg: top(p => n(p.a) / Math.max(1, n(p.gp))),
      three: threes.filter(x => x.apg >= 2).sort((a, b) => b.v - a.v),
      threesAll: threes
    };
  }

  function statQuestions(team, stats) {
    const L = statLeaders(team, stats);
    if (L.rot.length < 4) return [];
    const T = team.title;
    const qs = [];
    const tags = ['scouting', team.slug];
    const leader = (kind, list, q, label) => {
      if (list.length < 3 || list[0].v <= list[1].v) return;
      const x = makeQ(kind, 'Team stats', q, list[0].p.name, list.slice(1).map(y => y.p.name), { explain: `${list[0].p.name}: ${label(list[0])}` });
      if (x) { x.tags = tags; qs.push(x); }
    };
    leader('stat-ppg', L.ppg, `Who is ${T}'s leading scorer?`, x => x.v.toFixed(1) + ' PPG');
    leader('stat-rpg', L.rpg, `Who is ${T}'s leading rebounder?`, x => x.v.toFixed(1) + ' RPG');
    leader('stat-apg', L.apg, `Who leads ${T} in assists?`, x => x.v.toFixed(1) + ' APG');
    if (L.three.length) {
      const best = L.three[0];
      const worse = L.threesAll.filter(x => x !== best && x.p !== best.p && x.v < best.v - 0.05).map(x => x.p.name);
      const x = makeQ('stat-3', 'Team stats', `Who is ${T}'s best 3-point shooter (2+ threes a game)?`, best.p.name, worse,
        { explain: `${best.p.name}: ${(best.v * 100).toFixed(1)}% on ${best.apg.toFixed(1)} a game` });
      if (x) { x.tags = tags.concat('closeouts'); qs.push(x); }
    }
    return qs;
  }

  async function reportQuestions(team) {
    const mine = await loadReport(team.slug, true);
    const others = await Promise.all(TEAMS.filter(t => t.slug !== team.slug).map(t => loadReport(t.slug, false)));
    const T = team.title;
    const src = 'Team scouting report';
    const tags = ['scouting', team.slug];
    const qs = [];
    for (const [label, info] of Object.entries(mine.labels)) {
      let pool = others.map(o => o.labels[label] && o.labels[label].value).filter(Boolean);
      if (pool.length < 3) pool = pool.concat(...others.map(o => Object.values(o.labels).filter(x => x.section === info.section).map(x => x.value)));
      pool = pool.filter(v => norm(v) !== norm(info.value));
      const side = /defen[cs]e$/i.test(info.section) || /defend/i.test(info.section) ? 'defence' : 'offence';
      const q = makeQ('rep-' + label, src, `${T} (${info.section}): what does our report say for "${label}"?`, info.value, pool);
      if (q) { q.tags = tags.concat(side, /ball-screen/i.test(label) ? ['pnr'] : []); qs.push(q); }
    }
    const shorts = list => list.map(x => x.short);
    const otherPlan = [].concat(...others.map(o => shorts(o.plan)));
    const otherKeys = [].concat(...others.map(o => shorts(o.keys)));
    shorts(mine.plan).forEach(p => {
      const q = makeQ('rep-plan', src, `Which of these is part of our plan to attack ${T}'s defence?`, p, otherPlan.filter(x => !mine.plan.some(m => norm(m.short) === norm(x))));
      if (q) { q.tags = tags.concat('offence'); qs.push(q); }
    });
    shorts(mine.keys).forEach(k => {
      const q = makeQ('rep-keys', src, `Which of these is one of our keys to victory vs ${T}?`, k, otherKeys.filter(x => !mine.keys.some(m => norm(m.short) === norm(x))));
      if (q) { q.tags = tags; qs.push(q); }
    });
    return qs;
  }

  // Concept title -> topic tags.
  function conceptTags(title, side) {
    const t = norm(title);
    const tags = [side];
    const map = [
      [/race|d-?trans|transition/, 'transition'], [/pick.*roll|pnr/, 'pnr'], [/dho/, 'dho'], [/closeout/, 'closeouts'],
      [/shell/, 'shell'], [/post/, 'post'], [/iso/, 'iso'], [/off.?ball/, 'off-ball screens'], [/special/, 'special situations'],
      [/drive/, 'drive & kick'], [/flow/, 'flow'], [/core/, 'core'], [/split/, 'split games'], [/1.on.1/, '1-on-1']
    ];
    map.forEach(([re, tag]) => { if (re.test(t)) tags.push(tag); });
    return tags;
  }

  async function conceptQuestions() {
    const data = await loadConcepts();
    const qs = [];
    for (const g of ['offense', 'defense']) {
      const concepts = data[g];
      const allTerms = [].concat(...concepts.map(c => c.terms.map(t => Object.assign({ concept: c.title }, t))));
      const titles = concepts.map(c => c.title);
      const sideName = g === 'offense' ? 'Offence' : 'Defence';
      for (const c of concepts) {
        const tags = conceptTags(c.title, g === 'offense' ? 'offence' : 'defence');
        const src = `Griffin Concepts: ${c.title}`;
        const add = q => { if (q) { q.tags = tags; qs.push(q); } };
        const near = c.terms.map(t => t.desc);
        for (const t of c.terms) {
          const sameCard = near.filter(d => d !== t.desc);
          const pool = sameCard.length >= 3 ? sameCard : sameCard.concat(allTerms.filter(x => x.concept !== c.title).map(x => x.desc));
          add(makeQ('term-' + c.title, src, `${c.title}: what does "${t.name}" mean?`, t.desc, pool));
          const namePool = c.terms.length >= 4 ? c.terms.map(x => x.name) : c.terms.map(x => x.name).concat(allTerms.map(x => x.name));
          add(makeQ('name-' + c.title, src, `${c.title}: which term is this?`, t.name, namePool.filter(x => norm(x) !== norm(t.name)), { quote: t.desc }));
        }
        if (c.slogan && c.slogan.length > 6) add(makeQ('slogan-' + g, `Griffin Concepts (${sideName})`, `Which concept's motto is this?`, c.title, titles, { quote: c.slogan }));
        for (const b of c.beliefs) {
          if (concepts.filter(o => o.beliefs.some(x => norm(x) === norm(b))).length > 1) continue;
          add(makeQ('belief-' + g, `Griffin Concepts (${sideName})`, `This belief belongs to which concept?`, c.title, titles, { quote: b }));
        }
      }
    }
    return qs;
  }

  // Offence / Defence narrow the pick; other tags add to it. So "defence + pnr"
  // = PNR defence questions, and "pnr + dho" = questions on either.
  const SIDES = ['offence', 'defence'];
  const hasAnyTag = (q, tags) => {
    const qt = q.tags || [];
    const sides = tags.filter(t => SIDES.indexOf(t) >= 0);
    const topics = tags.filter(t => SIDES.indexOf(t) < 0);
    return (!sides.length || sides.some(t => qt.indexOf(t) >= 0)) && (!topics.length || topics.some(t => qt.indexOf(t) >= 0));
  };
  const teamTagged = q => (q.tags || []).some(t => teamBySlug(t));

  async function buildScoutQuiz(slug, n) {
    const team = teamBySlug(slug);
    const [cards, stats, rep, bank] = await Promise.all([
      loadScoutCards(slug), loadStats().catch(() => null), reportQuestions(team).catch(() => []), loadBank().catch(() => ({ questions: [], hidden: {} }))
    ]);
    const hidden = bank.hidden;
    const visible = q => q && !hidden[q.key];
    const cardQs = cardQuestions(team, cards).filter(visible);
    const statQs = statQuestions(team, stats).filter(visible);
    const repQs = rep.filter(visible);
    const bankQs = bank.questions.filter(b => (b.tags || []).indexOf(slug) >= 0).map(b => fromBank(b, `Question bank: ${team.title}`)).filter(Boolean);
    // Coaches' own questions first (up to a third), then ~25% report, ~15% stats, rest cards.
    let picked = pickMix(bankQs, Math.min(bankQs.length, Math.ceil(n / 3)));
    picked = picked.concat(pickMix(repQs, Math.min(repQs.length, Math.round(n * 0.25))));
    picked = picked.concat(pickMix(statQs, Math.min(statQs.length, Math.round(n * 0.15))));
    picked = picked.concat(pickMix(cardQs, Math.max(0, n - picked.length)));
    if (picked.length < n) {
      const used = new Set(picked);
      picked = picked.concat(pickMix(bankQs.concat(repQs, statQs).filter(q => !used.has(q)), n - picked.length));
    }
    return { title: `${team.title} scouting report`, quizType: 'scout', quizKey: slug, questions: shuffle(picked.slice(0, n)) };
  }

  // Concepts & topics quiz: automatic Concepts questions + the coaches' bank,
  // filtered by tags (any tag matches). No tags = everything.
  async function topicPool() {
    const [auto, bank] = await Promise.all([conceptQuestions().catch(() => []), loadBank().catch(() => ({ questions: [], hidden: {} }))]);
    const bankQs = bank.questions.filter(b => !teamTagged(b)).map(b => fromBank(b)).filter(Boolean);
    return auto.filter(q => !bank.hidden[q.key]).concat(bankQs);
  }
  const topicKey = tags => 'topics-' + (tags.length ? tags.slice().sort().join('+') : 'all');
  const topicTitle = tags => 'Griffin Concepts: ' + (tags.length ? tags.map(t => t.replace(/\b\w/g, c => c.toUpperCase()).replace(/^Pnr$/, 'PNR').replace(/^Dho$/, 'DHO')).join(', ') : 'Everything');

  async function buildTopicQuiz(tags, n) {
    const pool = (await topicPool()).filter(q => hasAnyTag(q, tags));
    // Coaches' questions get a fair share next to the automatic ones.
    const bankQs = pool.filter(q => q.bankId);
    const autoQs = pool.filter(q => !q.bankId);
    let picked = pickMix(bankQs, Math.min(bankQs.length, Math.ceil(n / 2)));
    picked = picked.concat(pickMix(autoQs, n - picked.length));
    if (picked.length < n) {
      const used = new Set(picked);
      picked = picked.concat(pickMix(bankQs.filter(q => !used.has(q)), n - picked.length));
    }
    return { title: topicTitle(tags), quizType: 'concepts', quizKey: topicKey(tags), questions: shuffle(picked.slice(0, n)) };
  }

  // Old assignments used { type: 'concepts', set: 'offense' | 'defense' | 'both' }.
  function assignmentTags(a) {
    if (!a) return [];
    if (Array.isArray(a.tags)) return a.tags;
    return a.set === 'offense' ? ['offence'] : a.set === 'defense' ? ['defence'] : [];
  }
  const assignmentKey = a => !a ? '' : a.type === 'scout' ? a.team : topicKey(assignmentTags(a));
  const assignmentTitle = a => !a ? '' : a.type === 'scout' ? `${(teamBySlug(a.team) || {}).title || a.team} scouting report` : topicTitle(assignmentTags(a));

  // ---------------------------------------------------------- staff pass ---
  const staffToken = () => { try { return sessionStorage.getItem('griffin_staff_token') || ''; } catch (e) { return ''; } };

  async function bankWrite(body) {
    const r = await fetch('/.netlify/functions/quiz-bank', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Staff-Token': staffToken() }, body: JSON.stringify(body)
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { try { sessionStorage.removeItem('griffin_staff_token'); } catch (e) {} }
    if (!r.ok || !d.ok) { const e = new Error(d.message || 'Could not save.'); e.status = r.status; throw e; }
    forget('bank');
    return d;
  }

  window.GriffinData = {
    TEAMS, TAGS, teamBySlug, esc, squash, norm, shuffle,
    getContent, loadScoutCards, loadStats, loadReport, loadConcepts, loadBank, forget,
    cardQuestions, statQuestions, statLeaders, reportQuestions, conceptQuestions, topicPool, fromBank,
    buildScoutQuiz, buildTopicQuiz, topicKey, topicTitle, assignmentTags, assignmentKey, assignmentTitle,
    noteStrengths, shortName, staffToken, bankWrite, hasAnyTag, teamTagged
  };
})();
