// Synergy reader for the Griffins scouting pages.
//
// Runs INSIDE a logged-in Synergy tab (apps.synergysports.com), pasted or
// injected by Claude. It moves through Synergy's own pages for one team (same
// pages a coach clicks through), reads the tables on screen and returns a
// compact summary. It never calls Synergy's private API directly.
//
//   await window.GriffinSynergy.team('<synergy team id>')  ->  { team, games, situations, playTypes, shotTypes, players }
//
// Output contains NO Synergy credentials. The numbers are MacEwan's licensed
// Synergy data: they are uploaded only to the Hub's private storage
// (netlify/functions/synergy.js), never committed to this public repo.
(function () {
  'use strict';
  const SEASON = '6a7de6ec9654df0a914765ab';          // 2026-27
  const COMP = '54457dce300969b132fcfb37:ALL';          // College Men, all competitions
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const txt = el => (el ? el.innerText : '').replace(/\s+/g, ' ').trim();
  const num = v => { const n = parseFloat(String(v).replace(/[%,]/g, '')); return isNaN(n) ? null : n; };

  function tables() { return Array.from(document.querySelectorAll('main table')); }
  function sig() { return tables().map(t => txt(t).slice(0, 400)).join('#'); }

  // In-app navigation (keeps this script alive), then wait for new tables.
  async function go(path, query) {
    const before = sig();
    const q = new URLSearchParams(Object.assign({ seasonId: SEASON, competitionKey: COMP }, query || {}));
    history.pushState(null, '', path + '?' + q.toString());
    dispatchEvent(new PopStateEvent('popstate', { state: null }));
    const t0 = Date.now();
    await sleep(1200);
    while (Date.now() - t0 < 15000) {
      const s = sig();
      if (s && s !== before && !document.querySelector('main .synergy-spinner, main [class*="spinner"]')) { await sleep(600); if (sig() === s) return true; }
      await sleep(300);
    }
    return !!sig();
  }

  // Main stats table: rows of { name, poss, pct, freqRank, pts, ppp, pppRank, rating, fgPct, efg, to, ft, score, fga3Rate }
  function readMain(t) {
    if (!t) return [];
    const heads = Array.from(t.querySelectorAll('thead th')).map(th => txt(th).toUpperCase());
    const col = name => heads.indexOf(name);
    const C = { poss: col('POSS'), pct: col('%TIME'), freqRank: col('%TIME RANK'), pts: col('PTS'), ppp: col('PPP'), pppRank: col('PPP RANK'),
      rating: col('PPP RATING'), fga: col('FG ATT'), fgPct: col('FG%'), efg: col('EFG%'), to: col('TO%'), ft: col('%FT'), score: col('SCORE%'), tpaRate: col('3PA/FGA') };
    return Array.from(t.querySelectorAll('tbody tr')).map(tr => {
      const cells = Array.from(tr.querySelectorAll('td, th')).map(txt);
      const row = { name: cells[0] };
      Object.entries(C).forEach(([k, i]) => { if (i >= 0) row[k] = k === 'rating' ? (cells[i] && cells[i] !== '-' ? cells[i] : '') : num(cells[i]); });
      return row;
    }).filter(r => r.name && r.poss);
  }

  // Breakdown table (columns = games or players, rows = play types).
  function readBreakdown(t) {
    if (!t) return null;
    const cols = Array.from(t.querySelectorAll('thead th')).slice(1).map(txt);
    const rows = {};
    Array.from(t.querySelectorAll('tbody tr')).forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('td, th')).map(txt);
      if (cells[0]) rows[cells[0]] = cells.slice(1).map(num);
    });
    return { cols, rows };
  }
  // The per-game / per-player table: its column headers are games ("10/18 L @TMU") or players ("#2 D. SMITH").
  const breakdownTable = () => tables().find(t => {
    const h = Array.from(t.querySelectorAll('thead th')).slice(1, 3).map(txt);
    return h.length && h.every(x => /^#?\w*\d+[\s/]/.test(x) || /^\d+\/\d+/.test(x));
  });
  function selectFor(t) {
    let p = t;
    for (let k = 0; k < 8 && p; k++) { p = p.parentElement; const s = p && p.querySelector('ng-select'); if (s) return s; }
    return null;
  }

  // Change the metric shown in the breakdown table (Poss, Pts, FG Att, FG Made…).
  async function metric(code) {
    const t = breakdownTable();
    const sel = t && selectFor(t);
    if (!sel) return false;
    sel.querySelector('.ng-select-container').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await sleep(500);
    const opt = Array.from(document.querySelectorAll('.ng-dropdown-panel .ng-option')).find(o => txt(o).replace(/\s/g, '').toLowerCase().startsWith(code.replace(/\s/g, '').toLowerCase()));
    if (!opt) { document.body.click(); return false; }
    const before = sig();
    opt.click();
    const t0 = Date.now();
    while (Date.now() - t0 < 8000 && sig() === before) await sleep(250);
    await sleep(500);
    return true;
  }

  // Players breakdown with two metrics -> { "#2 D. DUSCHECK": { "Spot Up": { poss, pts }, ... } }
  async function playersBy(path, query, a, b) {
    await go(path, Object.assign({ breakdownView: 'players' }, query));
    const out = {};
    const read = key => {
      const bd = readBreakdown(breakdownTable());
      if (!bd) return;
      bd.cols.forEach((p, i) => {
        if (!p) return;
        Object.entries(bd.rows).forEach(([type, vals]) => {
          const v = vals[i];
          if (v == null) return;
          ((out[p] = out[p] || {})[type] = out[p][type] || {})[key] = v;
        });
      });
    };
    if (await metric(a.code)) read(a.key);
    if (await metric(b.code)) read(b.key);
    return out;
  }

  async function team(id) {
    const base = '/basketball/teams/' + id;
    const r = { synergyId: id, pulledAt: new Date().toISOString() };
    await go(base + '/overall', { offense: 'true' });
    r.team = txt(document.querySelector('main h1, main .text-2xl, main .text-3xl')) || '';
    const head = txt(document.querySelector('main')).match(/GP\s+(\d+)/);
    r.gp = head ? +head[1] : null;
    const gb = readBreakdown(breakdownTable());
    r.games = gb ? gb.cols : [];
    r.situations = { off: readMain(tables()[0]) };
    await go(base + '/overall', { offense: 'false' });
    r.situations.def = readMain(tables()[0]);
    await go(base + '/playtypes', { offense: 'true' });
    r.playTypes = { off: readMain(tables()[0]) };
    await go(base + '/playtypes', { offense: 'false' });
    r.playTypes.def = readMain(tables()[0]);
    await go(base + '/shottypes', { offense: 'true' });
    r.shotTypes = { off: readMain(tables()[0]) };
    await go(base + '/shottypes', { offense: 'false' });
    r.shotTypes.def = readMain(tables()[0]);
    r.players = {
      playTypes: await playersBy(base + '/playtypes', { offense: 'true' }, { code: 'Poss', key: 'poss' }, { code: 'Pts', key: 'pts' }),
      shotTypes: await playersBy(base + '/shottypes', { offense: 'true' }, { code: 'FGAtt', key: 'fga' }, { code: 'FGMade', key: 'fgm' })
    };
    await metric('Pts');   // leave Synergy's table on its usual setting
    return r;
  }

  // Compact form that is uploaded to the Hub (rows as arrays, zeros dropped).
  //  sit/pt/st rows: [name, poss, %time, ppp, pppPercentile, rating, fga, fg%, efg%, to%, %ft, score%]
  //  pp: player -> playType -> [poss, pts]      ps: player -> shotType -> [fga, fgm]
  function compact(r) {
    const row = x => [x.name, x.poss, x.pct, x.ppp, x.pppRank, x.rating || '', x.fga, x.fgPct, x.efg, x.to, x.ft, x.score];
    const rows = o => ({ off: (o.off || []).map(row), def: (o.def || []).map(row) });
    const pairs = (obj, a, b) => {
      const out = {};
      Object.entries(obj || {}).forEach(([p, types]) => {
        const t = {};
        Object.entries(types).forEach(([k, v]) => { if (v[a] || v[b]) t[k] = [v[a] || 0, v[b] || 0]; });
        if (Object.keys(t).length) out[p] = t;
      });
      return out;
    };
    return trim({ v: 1, synergyId: r.synergyId, pulledAt: r.pulledAt, gp: r.gp, games: r.games,
      sit: rows(r.situations), pt: rows(r.playTypes), st: rows(r.shotTypes),
      pp: pairs(r.players.playTypes, 'poss', 'pts'), ps: pairs(r.players.shotTypes, 'fga', 'fgm') });
  }

  // Keep only what synergy-view.js shows: rows -> [name, poss, %time, ppp, percentile, rating, fga, fg%].
  const SIT = ['All Possessions', 'Transition', 'Overall Half Court', 'After Time Outs', 'Last 4 Sec. of Shot Clock', 'Against Zone', 'Press', 'Out of Bounds (Side)', 'Out of Bounds (End)'];
  const SHOT = ['All Field Goal Attempts', 'Catch and Shoot', 'Dribble Jumper', 'At Rim', 'Runner', 'Long 3 pts', 'Short to 17', 'Medium 17 to < 3 Pts'];
  function trim(d) {
    const cut = (rows, keep) => (rows || []).filter(x => !keep || keep.indexOf(x[0]) >= 0).map(x => x.slice(0, 8));
    const side = (o, keep) => ({ off: cut(o.off, keep), def: cut(o.def, keep) });
    const ps = {};
    Object.entries(d.ps || {}).forEach(([p, t]) => {
      const k = {};
      SHOT.forEach(n => { if (t[n]) k[n] = t[n]; });
      if (Object.keys(k).length) ps[p] = k;
    });
    return Object.assign({}, d, { sit: side(d.sit, SIT), pt: side(d.pt), st: side(d.st, SHOT), ps });
  }

  // Pull several teams one after another; results land in window.__syn[slug].
  async function teams(list) {
    window.__syn = window.__syn || {}; window.__synErr = window.__synErr || {};
    for (const [slug, id] of list) {
      try { window.__syn[slug] = compact(await team(id)); } catch (e) { window.__synErr[slug] = String(e); }
    }
    window.__synDone = true;
  }

  window.GriffinSynergy = { team, teams, compact, trim, go, readMain, readBreakdown, metric, tables };
})();
