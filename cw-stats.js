// Canada West team stats, rankings and player-page links (David, Nov 2026).
//
// Reads data/cw-stats.json (built by scripts/build_cw_stats.js from usportshoops.ca
// box scores on every site build). Public U Sports numbers only: Synergy is added
// on the player page by synergy-view.js, for logged-in users.
//
//   GriffinCW.load()                    -> the cw-stats.json data (cached)
//   GriffinCW.playerUrl(slug, name)     -> link to that player's full stats page
//   GriffinCW.teamPanel(slug, data)     -> "Team stats & Canada West ranks" panel HTML
//   GriffinCW.rank(rank, count, kind)   -> small coloured "3rd" chip
//
// Auto-mounts:
//   <div data-cw-team="calgary-dinos"></div>   team panel (add data-cw-dark on dark pages)
//   opponents/<slug>/scout-cards.html          "Full stats" link on every player card
(function () {
  'use strict';
  let cache = null;

  // The data file calls MacEwan "macewan"; the opponents folder and Synergy use "macewan-griffins".
  const canon = s => (s === 'macewan-griffins' ? 'macewan' : String(s || ''));
  const folder = s => (canon(s) === 'macewan' ? 'macewan-griffins' : canon(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function load() {
    if (!cache) {
      cache = fetch('/data/cw-stats.json', { cache: 'no-cache' })
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null);
    }
    return cache;
  }

  const playerUrl = (slug, name) => `/player.html?team=${encodeURIComponent(canon(slug))}&p=${encodeURIComponent(name)}`;
  const teamUrl = slug => (canon(slug) === 'macewan' ? '/opponents/macewan-griffins/scout-cards.html' : `/opponent-scout.html?team=${encodeURIComponent(canon(slug))}&type=scout`);

  const PCT = /pct|efg|^ts$|rate|usg|Pct$/i;
  function fmt(key, v) {
    if (v == null || v === '' || (typeof v === 'number' && !isFinite(v))) return '–';
    if (key === 'winPct') return (+v).toFixed(3).replace(/^0/, '');
    if (key === 'astTo') return (+v).toFixed(2);
    if (PCT.test(key)) return (+v).toFixed(1) + '%';
    if (key === 'margin' || key === 'net') return (v > 0 ? '+' : '') + (+v).toFixed(1);
    return typeof v === 'number' ? (Number.isInteger(v) && !/pg$|^pace$|rtg$|40$|gmsc/.test(key) ? String(v) : v.toFixed(1)) : esc(v);
  }

  const ord = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  // kind: 'neutral' = no good/bad colour (pace, 3PA rate…)
  function rank(r, count, kind) {
    if (!r) return '';
    const third = Math.max(1, Math.round((count || 17) / 3));
    const cls = kind === 'neutral' ? 'nt' : r <= 3 ? 'top' : r <= third ? 'good' : r > (count || 17) - third ? 'low' : 'mid';
    return `<span class="cw-rk ${cls}" title="${ord(r)} of ${count || 17} in Canada West">${ord(r)}</span>`;
  }

  function css() {
    if (document.getElementById('cw-css')) return;
    const s = document.createElement('style');
    s.id = 'cw-css';
    s.textContent = `
      .cw-rk { display: inline-block; font: 700 10.5px/1.5 Inter, -apple-system, "Segoe UI", sans-serif; padding: 0 5px; border-radius: 4px; margin-left: 4px; vertical-align: 1px; white-space: nowrap; }
      .cw-rk.top { background: #dcfce7; color: #15803d; } .cw-rk.good { background: #eef6ff; color: #1d4ed8; }
      .cw-rk.mid { background: #f1f5f9; color: #475569; } .cw-rk.low { background: #fee2e2; color: #b91c1c; } .cw-rk.nt { background: #f1f5f9; color: #475569; }
      .cw-dark .cw-rk.top { background: rgba(46,204,113,0.18); color: #6ee7a0; } .cw-dark .cw-rk.good { background: rgba(96,165,250,0.16); color: #93c5fd; }
      .cw-dark .cw-rk.mid, .cw-dark .cw-rk.nt { background: rgba(255,255,255,0.08); color: #cbd5e1; } .cw-dark .cw-rk.low { background: rgba(255,94,94,0.16); color: #fca5a5; }
      .cw-panel { border: 1px solid #e1e3e6; border-radius: 10px; padding: 14px 16px; margin: 16px 0; background: #fff; }
      .cw-panel.cw-dark { background: #181d28; border-color: rgba(209,173,125,0.22); color: #f3f4f6; }
      .cw-panel h3 { margin: 0; font-size: 16px; } .cw-panel h3 span { color: #98002e; } .cw-dark h3 span { color: #d1ad7d; }
      .cw-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
      .cw-meta { font-size: 12px; color: #64748b; } .cw-dark .cw-meta { color: #9ca3af; }
      .cw-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
      .cw-stat { background: #f6f7f9; border-radius: 8px; padding: 8px 10px; min-width: 0; } .cw-dark .cw-stat { background: #1f2533; }
      .cw-stat .l { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; } .cw-dark .cw-stat .l { color: #9ca3af; }
      .cw-stat .v { font-size: 18px; font-weight: 800; margin-top: 2px; }
      .cw-panel .cw-foot { font-size: 12px; color: #64748b; margin: 10px 0 0; } .cw-dark .cw-foot { color: #9ca3af; }
      .cw-panel a { color: #98002e; font-weight: 700; } .cw-dark a { color: #d1ad7d; }
      a.cw-link { display: inline-flex; align-items: center; gap: 4px; margin-top: 8px; padding: 6px 10px; min-height: 32px; border-radius: 6px; background: #98002e; color: #fff !important; font: 700 12px Inter, -apple-system, "Segoe UI", sans-serif; text-decoration: none; }
      a.cw-link:hover { background: #b30036; }
      @media (pointer: coarse) { a.cw-link { min-height: 44px; } }
      @media print { a.cw-link { display: none; } .cw-panel { break-inside: avoid; } }
    `;
    document.head.appendChild(s);
  }

  // The panel on each team's scouting report: record + key numbers with Canada West ranks.
  const PANEL = [
    ['ppg', 'Points'], ['oppPpg', 'Opp points'], ['net', 'Net rating'], ['ortg', 'Off rating'], ['drtg', 'Def rating'], ['pace', 'Pace'],
    ['efg', 'eFG%'], ['oppEfg', 'Opp eFG%'], ['fg3Pct', '3P%'], ['fg3aRate', '3PA rate'], ['tovPct', 'TOV%'], ['oppTovPct', 'Forced TOV%'],
    ['orebPct', 'OREB%'], ['drebPct', 'DREB%'], ['ftRate', 'FT rate'], ['apg', 'Assists']
  ];
  function teamPanel(slug, data, opts) {
    opts = opts || {};
    const t = data && data.teams && data.teams[canon(slug)];
    const dark = opts.dark ? ' cw-dark' : '';
    if (!t || !t.scope || !t.scope.all) return `<div class="cw-panel${dark}"><div class="cw-head"><h3><span>Canada West</span> team stats</h3></div><p class="cw-meta">No box scores for this team yet.</p></div>`;
    const sc = opts.scope === 'conf' && t.scope.conf ? 'conf' : 'all';
    const s = t.scope[sc];
    const neutral = new Set(data.teamNeutral || []);
    return `<div class="cw-panel${dark}">
      <div class="cw-head"><h3><span>Canada West</span> team stats &amp; ranks</h3>
        <div class="cw-meta">${esc(t.conf)} Canada West · ${esc(t.overall)} overall · ${s.gp} game${s.gp === 1 ? '' : 's'} with box scores${sc === 'conf' ? ' (conference)' : ''}</div></div>
      <div class="cw-grid">${PANEL.map(([k, l]) => `<div class="cw-stat"><div class="l">${esc(l)}</div><div class="v">${fmt(k, s[k])}${rank(s.ranks && s.ranks[k], s.rankOf, neutral.has(k) ? 'neutral' : '')}</div></div>`).join('')}</div>
      <p class="cw-foot">Rank among the ${s.rankOf} Canada West teams (1st = best; for pace and 3PA rate, 1st = most). From usportshoops.ca box scores. <a href="/team-stats.html">All teams, rankings &amp; player stats ➔</a></p>
    </div>`;
  }

  async function mountPanels() {
    const els = document.querySelectorAll('[data-cw-team]');
    if (!els.length) return;
    css();
    const data = await load();
    els.forEach(el => {
      const slug = el.getAttribute('data-cw-team');
      if (!slug) return;
      el.innerHTML = data ? teamPanel(slug, data, { dark: el.hasAttribute('data-cw-dark') }) : '';
    });
  }

  // Scout cards: a "Full stats" link on each player's card (added live, never saved:
  // scout-cards-editor.js strips .cw-link before saving a coach's edit).
  async function mountCards() {
    const m = location.pathname.match(/\/opponents\/([^/]+)\/scout-cards\.html/);
    if (!m) return;
    const t0 = Date.now();
    while (!window.__scoutCardsReady && Date.now() - t0 < 10000) await new Promise(r => setTimeout(r, 200));
    const data = await load();
    if (!data) return;
    css();
    const slug = canon(m[1]);
    const mine = (data.players || []).filter(p => p.team === slug);
    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
    const add = () => document.querySelectorAll('.card').forEach(card => {
      if (card.querySelector('.cw-link')) return;
      const parts = ((card.querySelector('.player-header') || {}).textContent || '').split('•').map(s => s.trim());
      const num = (parts[0] || '').replace(/^#/, ''), name = parts[1] || '';
      if (!name) return;
      const p = mine.find(x => norm(x.name) === norm(name)) || mine.find(x => x.num && x.num === num && norm(x.name).slice(-4) === norm(name).slice(-4));
      const a = document.createElement('a');
      a.className = 'cw-link';
      a.href = playerUrl(slug, p ? p.name : name);
      a.textContent = 'Full stats & Synergy ➔';
      const info = card.querySelector('.card-info') || card;
      info.appendChild(a);
    });
    add();
    // Cards can be redrawn (edit mode, reorder, a saved version loading late): keep links on them.
    const box = document.querySelector('.card') && document.querySelector('.card').parentElement;
    if (box && window.MutationObserver) {
      let t = null;
      new MutationObserver(() => { clearTimeout(t); t = setTimeout(add, 300); }).observe(box.parentElement || box, { childList: true, subtree: true });
    }
  }

  window.GriffinCW = { load, canon, folder, playerUrl, teamUrl, teamPanel, rank, fmt, ord, css, esc };
  const start = () => { mountPanels(); mountCards(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
