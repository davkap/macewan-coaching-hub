// Synergy numbers on the scouting pages (MacEwan's licensed Synergy data).
//
// The numbers live in the Hub's private storage (netlify/functions/synergy.js)
// and only load for someone logged into the Hub (staff pass or player member
// pass). This file draws them:
//   - <div data-synergy-team="calgary-dinos"></div>  -> full team panel
//   - scout cards page                               -> a Synergy line on each player card
//   - window.GriffinSynergyView.load(slug) / .teamPanel(data) / .playerSummary(data, card) for other pages
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const token = () => {
    try { return sessionStorage.getItem('griffin_staff_token') || sessionStorage.getItem('griffin_member_token') || localStorage.getItem('griffin_synergy_token') || ''; }
    catch (e) { return ''; }
  };

  const SHORT = {
    'P&R Ball Handler': 'PNR handler', 'P&R Roll Man': 'PNR roller', 'Spot Up': 'Spot up', 'Transition': 'Transition',
    'Isolation': 'ISO', 'Post-Up': 'Post up', 'Off Screen': 'Off screens', 'Handoffs': 'Handoffs (DHO)', 'Cut': 'Cuts',
    'Offensive Rebounds (Put Backs)': 'Putbacks', 'Miscellaneous Plays': 'Misc'
  };
  const short = n => SHORT[n] || n;
  // rows: [name, poss, %time, ppp, pppPercentile, rating, fga, fg%, efg%, to%, %ft, score%]
  const R = { name: 0, poss: 1, pct: 2, ppp: 3, rank: 4, rating: 5, fga: 6, fg: 7, efg: 8, to: 9, ft: 10, score: 11 };
  const f = (v, d) => v == null || v === '' ? '–' : Number(v).toFixed(d == null ? 0 : d);
  const date = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };

  const cache = {};
  async function load(slug) {
    if (cache[slug]) return cache[slug];
    const t = token();
    if (!t) return { error: 'login' };
    try {
      const r = await fetch('/.netlify/functions/synergy?team=' + encodeURIComponent(slug), { headers: { 'X-Hub-Token': t }, cache: 'no-store' });
      if (r.status === 401) return { error: 'login' };
      const d = await r.json();
      return (cache[slug] = d.team ? d.team : { error: 'none' });
    } catch (e) { return { error: 'offline' }; }
  }

  function css() {
    if (document.getElementById('syn-css')) return;
    const s = document.createElement('style');
    s.id = 'syn-css';
    s.textContent = `
      .syn { --syn-bg: #fff; --syn-bg2: #f6f7f9; --syn-line: #e3e6ea; --syn-text: #1e293b; --syn-mute: #64748b; --syn-accent: #98002e;
        font-family: Inter, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--syn-text); }
      .syn.dark { --syn-bg: #181d28; --syn-bg2: #1f2533; --syn-line: rgba(209,173,125,0.22); --syn-text: #f3f4f6; --syn-mute: #9ca3af; --syn-accent: #d1ad7d; }
      .syn-panel { background: var(--syn-bg); border: 1px solid var(--syn-line); border-radius: 12px; padding: 16px; margin: 0 0 18px; }
      .syn-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
      .syn-head h3 { margin: 0; font-size: 16px; letter-spacing: 0.02em; color: var(--syn-text); }
      .syn-head h3 span { color: var(--syn-accent); }
      .syn-meta { font-size: 12px; color: var(--syn-mute); }
      .syn-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      @media (max-width: 760px) { .syn-grid { grid-template-columns: minmax(0, 1fr); } }
      .syn h4 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--syn-mute); }
      .syn-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
      .syn-tbl th { text-align: right; font-size: 11px; color: var(--syn-mute); font-weight: 600; padding: 4px 6px; border-bottom: 1px solid var(--syn-line); white-space: nowrap; }
      .syn-tbl th:first-child, .syn-tbl td:first-child { text-align: left; }
      .syn-tbl td { text-align: right; padding: 5px 6px; border-bottom: 1px solid var(--syn-line); white-space: nowrap; }
      .syn-tbl td:first-child { white-space: normal; }
      .syn-bar { display: inline-block; height: 6px; border-radius: 3px; background: var(--syn-accent); opacity: 0.55; vertical-align: middle; margin-left: 6px; }
      .syn-r { display: inline-block; min-width: 64px; text-align: center; font-size: 11px; font-weight: 700; border-radius: 5px; padding: 1px 5px; }
      .syn-r.ex { background: #dcfce7; color: #166534; } .syn-r.vg { background: #e7f8ee; color: #15803d; } .syn-r.gd { background: #eef6ff; color: #1d4ed8; }
      .syn-r.av { background: #f1f5f9; color: #475569; } .syn-r.ba { background: #fff4e5; color: #b45309; } .syn-r.pr { background: #fee2e2; color: #b91c1c; }
      .syn.dark .syn-r.av { background: rgba(255,255,255,0.08); color: #cbd5e1; }
      .syn-note { font-size: 12px; color: var(--syn-mute); margin: 8px 0 0; }
      .syn-msg { font-size: 13px; color: var(--syn-mute); }
      .syn-box { margin-top: 8px; padding: 7px 9px; background: #f6f7f9; border: 1px solid #e3e6ea; border-radius: 6px; font-size: 12px; line-height: 1.45; color: #1e293b; }
      .syn-box b { color: #98002e; }
      .syn-box .lbl { font-weight: 800; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; margin-right: 4px; }
      @media print { .syn-panel { break-inside: avoid; } }
    `;
    document.head.appendChild(s);
  }

  function ratingClass(r) {
    const t = String(r || '').toLowerCase();
    return t.startsWith('excellent') ? 'ex' : t.startsWith('very good') ? 'vg' : t.startsWith('good') ? 'gd' : t.startsWith('average') ? 'av' : t.startsWith('below') ? 'ba' : t.startsWith('poor') ? 'pr' : 'av';
  }

  function playTypeTable(rows, label) {
    const list = (rows || []).filter(r => r[R.poss] > 0).sort((a, b) => b[R.poss] - a[R.poss]);
    if (!list.length) return `<p class="syn-msg">No ${label} data logged yet.</p>`;
    const max = Math.max(...list.map(r => r[R.pct] || 0)) || 1;
    return `<table class="syn-tbl"><thead><tr><th>Play type</th><th>% of poss</th><th>PPP</th><th>Rating</th></tr></thead><tbody>
      ${list.map(r => `<tr><td>${esc(short(r[R.name]))}</td><td>${f(r[R.pct], 1)}%<span class="syn-bar" style="width:${Math.round(34 * (r[R.pct] || 0) / max)}px"></span></td>
        <td><b>${f(r[R.ppp], 2)}</b></td><td>${r[R.rating] ? `<span class="syn-r ${ratingClass(r[R.rating])}">${esc(r[R.rating])}</span>` : '<span class="syn-meta">small sample</span>'}</td></tr>`).join('')}
    </tbody></table>`;
  }

  const SIT = ['All Possessions', 'Transition', 'Overall Half Court', 'After Time Outs', 'Last 4 Sec. of Shot Clock', 'Against Zone', 'Press', 'Out of Bounds (Side)', 'Out of Bounds (End)'];
  const SIT_LABEL = { 'All Possessions': 'All possessions', 'Overall Half Court': 'Half court', 'After Time Outs': 'After timeouts', 'Last 4 Sec. of Shot Clock': 'Late clock (last 4 sec)', 'Against Zone': 'vs zone', 'Press': 'vs press', 'Out of Bounds (Side)': 'SLOB', 'Out of Bounds (End)': 'BLOB' };
  function situationTable(off, def) {
    const get = (rows, n) => (rows || []).find(r => r[R.name] === n);
    const lines = SIT.map(n => [n, get(off, n), get(def, n)]).filter(x => (x[1] && x[1][R.poss]) || (x[2] && x[2][R.poss]));
    if (!lines.length) return '<p class="syn-msg">No situation data yet.</p>';
    return `<table class="syn-tbl"><thead><tr><th>Situation</th><th>Their O PPP</th><th>Their D PPP allowed</th></tr></thead><tbody>
      ${lines.map(([n, o, d]) => `<tr><td>${esc(SIT_LABEL[n] || n)}</td><td>${o && o[R.poss] ? `<b>${f(o[R.ppp], 2)}</b> <span class="syn-meta">(${o[R.poss]})</span>` : '–'}</td>
        <td>${d && d[R.poss] ? `<b>${f(d[R.ppp], 2)}</b> <span class="syn-meta">(${d[R.poss]})</span>` : '–'}</td></tr>`).join('')}
    </tbody></table><p class="syn-note">Points per possession, (possessions) in brackets.</p>`;
  }

  const SHOTS = [['Catch and Shoot', 'Catch & shoot'], ['Dribble Jumper', 'Off the dribble'], ['At Rim', 'At the rim'], ['Runner', 'Runners / floaters'], ['Long 3 pts', 'Threes'], ['Short to 17', 'Short (<17 ft)'], ['Medium 17 to < 3 Pts', 'Mid-range']];
  function shotTable(off, def) {
    const get = (rows, n) => (rows || []).find(r => r[R.name] === n);
    const allO = get(off, 'All Field Goal Attempts'), allD = get(def, 'All Field Goal Attempts');
    const lines = SHOTS.map(([n, l]) => [l, get(off, n), get(def, n)]).filter(x => (x[1] && x[1][R.fga]) || (x[2] && x[2][R.fga]));
    if (!lines.length) return '<p class="syn-msg">No shot data yet.</p>';
    const share = (r, all) => r && all && all[R.fga] ? Math.round(100 * r[R.fga] / all[R.fga]) + '%' : '–';
    return `<table class="syn-tbl"><thead><tr><th>Shot type</th><th>Their share</th><th>Their FG%</th><th>Allowed FG%</th></tr></thead><tbody>
      ${lines.map(([l, o, d]) => `<tr><td>${esc(l)}</td><td>${share(o, allO)}</td><td><b>${o && o[R.fga] ? f(o[R.fg], 1) + '%' : '–'}</b></td><td>${d && d[R.fga] ? f(d[R.fg], 1) + '%' : '–'}</td></tr>`).join('')}
    </tbody></table>`;
  }

  function teamPanel(d, opts) {
    opts = opts || {};
    const games = (d.games || []).length;
    return `<div class="syn syn-panel${opts.dark ? ' dark' : ''}">
      <div class="syn-head"><h3><span>Synergy</span> ${esc(opts.title || 'play types')}</h3>
        <div class="syn-meta">${games} game${games === 1 ? '' : 's'} logged${d.games && d.games.length ? ' (' + esc(d.games.slice(0, 6).join(', ')) + (d.games.length > 6 ? '…' : '') + ')' : ''} · updated ${esc(date(d.pulledAt))}</div></div>
      ${games < 4 ? '<p class="syn-note" style="margin:-4px 0 10px">Small sample: Synergy has only logged a few of their games so far, so treat ratings as early reads.</p>' : ''}
      <div class="syn-grid">
        <div><h4>How they score (offence)</h4>${playTypeTable(d.pt && d.pt.off, 'offence')}</div>
        <div><h4>What they give up (defence)</h4>${playTypeTable(d.pt && d.pt.def, 'defence')}</div>
        <div><h4>Situations</h4>${situationTable(d.sit && d.sit.off, d.sit && d.sit.def)}</div>
        <div><h4>Shot profile</h4>${shotTable(d.st && d.st.off, d.st && d.st.def)}</div>
      </div>
      <p class="syn-note">Rating compares their points per possession with every Synergy college team (Excellent → Poor). Source: Synergy Sports, MacEwan's subscription. Don't share outside the team.</p>
    </div>`;
  }

  function message(err, dark) {
    const m = err === 'login' ? 'Log in to the Hub again to see Synergy numbers.'
      : err === 'none' ? 'No Synergy numbers for this team yet.'
      : 'Could not load Synergy numbers right now.';
    return `<div class="syn syn-panel${dark ? ' dark' : ''}"><div class="syn-head"><h3><span>Synergy</span> play types</h3></div><p class="syn-msg">${m}</p></div>`;
  }

  // ---- Players: match Synergy names ("#2 D. DUSCHECK") to scout-card players.
  const normName = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  function parseSyn(label) {
    const m = String(label).match(/^#?(\d+)?\s*(.*)$/);
    const rest = normName(m[2]).split(' ');
    return { num: m[1] || '', initial: (rest[0] || '').charAt(0), last: rest.slice(1).join(' ') || rest[0] || '' };
  }
  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  // Same surname, allowing one typo ("DUSCHECK" vs "Ducheck").
  const sameLast = (a, b) => !!a && !!b && (a === b || (a.length >= 4 && b.length >= 4 && lev(a, b) <= 1));
  // -> { "<card name>": { pp: {type: [poss, pts]}, ps: {shot: [fga, fgm]} } }
  function byPlayer(d, cards) {
    const out = {};
    const find = label => {
      const s = parseSyn(label);
      const words = c => normName(c.name).split(' ');
      const lastHit = c => words(c).slice(1).some(w => s.last.split(' ').some(p => sameLast(w, p)));
      const initialHit = c => !s.initial || words(c)[0].charAt(0) === s.initial;
      // Jersey number plus surname or first initial; otherwise surname plus initial.
      const byNum = s.num ? cards.filter(c => String(c.num) === s.num && (lastHit(c) || initialHit(c))) : [];
      if (byNum.length === 1) return byNum[0];
      const byName = cards.filter(c => lastHit(c) && initialHit(c));
      return byName.length === 1 ? byName[0] : null;
    };
    const add = (src, key) => Object.entries(src || {}).forEach(([label, types]) => {
      const c = find(label);
      if (!c) return;
      const p = (out[c.name] = out[c.name] || { pp: {}, ps: {} });
      Object.entries(types).forEach(([t, v]) => {
        const cur = p[key][t] || [0, 0];
        p[key][t] = [cur[0] + v[0], cur[1] + v[1]];
      });
    });
    add(d.pp, 'pp');
    add(d.ps, 'ps');
    return out;
  }

  // One-line summary: top play types + shot profile.
  function playerSummary(p) {
    if (!p) return '';
    const types = Object.entries(p.pp || {}).filter(([, v]) => v[0] > 0).sort((a, b) => b[1][0] - a[1][0]);
    const total = types.reduce((s, [, v]) => s + v[0], 0);
    const top = types.slice(0, 3).map(([t, v]) => `${esc(short(t))} <b>${Math.round(100 * v[0] / total)}%</b> (${(v[1] / v[0]).toFixed(2)} PPP)`);
    const shot = k => p.ps && p.ps[k] && p.ps[k][0] ? `${p.ps[k][1]}/${p.ps[k][0]}` : '';
    const shots = [['Catch and Shoot', 'C&S'], ['Dribble Jumper', 'Off dribble'], ['At Rim', 'Rim'], ['Long 3 pts', '3PT']].map(([k, l]) => shot(k) ? `${l} ${shot(k)}` : '').filter(Boolean);
    if (!top.length && !shots.length) return '';
    return `${top.length ? `<div><span class="lbl">Synergy</span>${top.join(' · ')} <span style="color:#64748b">· ${total} poss</span></div>` : ''}${shots.length ? `<div><span class="lbl">Shots</span>${shots.join(' · ')}</div>` : ''}`;
  }

  // ---- Auto mount -------------------------------------------------------
  async function mountPanels() {
    const els = document.querySelectorAll('[data-synergy-team]');
    for (const el of els) {
      const slug = el.getAttribute('data-synergy-team');
      if (!slug) continue;
      css();
      const dark = el.hasAttribute('data-synergy-dark');
      const d = await load(slug);
      el.innerHTML = d.error ? (d.error === 'none' && el.hasAttribute('data-synergy-quiet') ? '' : message(d.error, dark)) : teamPanel(d, { dark });
    }
  }

  // Scout cards page: add a Synergy line under each player's stats.
  async function mountCards() {
    const m = location.pathname.match(/\/opponents\/([^/]+)\/scout-cards\.html/);
    if (!m) return;
    const t0 = Date.now();
    while (!window.__scoutCardsReady && Date.now() - t0 < 10000) await new Promise(r => setTimeout(r, 200));
    const d = await load(m[1]);
    if (d.error) return;
    css();
    const cardEls = Array.from(document.querySelectorAll('.card'));
    const cards = cardEls.map(el => {
      const parts = ((el.querySelector('.player-header') || {}).textContent || '').split('•').map(s => s.trim());
      return { el, num: (parts[0] || '').replace(/^#/, ''), name: parts[1] || '' };
    }).filter(c => c.name);
    const map = byPlayer(d, cards);
    cards.forEach(c => {
      const html = playerSummary(map[c.name]);
      const old = c.el.querySelector('.synergy-box');
      if (old) old.remove();
      if (!html) return;
      const box = document.createElement('div');
      box.className = 'synergy-box syn-box no-print-hide';
      box.innerHTML = html;
      const after = c.el.querySelector('.stats-table') || c.el.querySelector('.scout-notes');
      if (after) after.insertAdjacentElement('afterend', box); else c.el.appendChild(box);
    });
  }

  window.GriffinSynergyView = { load, teamPanel, message, byPlayer, playerSummary, css, short, R };
  const start = () => { mountPanels(); mountCards(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
