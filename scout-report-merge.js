/* Keeps a coach-saved scouting report up to date with the built one.
 *
 * The build (scripts/generate_season_reports.js) writes every automatic section with a
 * "<!-- auto -->" line under its heading. A coach-saved report (Blobs key
 * scout_scout_<slug>) otherwise freezes the whole report, so:
 *   merge(saved, fresh)    -> every saved section that still has the mark (or still says
 *                             "Carried over from 2025-26") is replaced by the fresh one; the
 *                             overview and Sources come from the fresh report; sections the
 *                             coach wrote himself are kept as he wrote them.
 *   markEdits(text, fresh) -> run before saving: a section the coach changed loses its mark,
 *                             so it's never overwritten.
 * Used by opponent-scout.html and quiz-data.js.
 */
(function () {
  'use strict';
  const AUTO = '<!-- auto -->';
  const split = md => {
    const parts = String(md || '').replace(/\r/g, '').split(/\n(?=## )/);
    const pre = /^## /.test(parts[0]) ? '' : parts.shift();
    return { pre, secs: parts };
  };
  const titleOf = s => ((s.match(/^##\s*(?:\d+\.\s*)?([^\n(]+)/) || [])[1] || '').trim().toLowerCase();
  const bodyOf = s => s.replace(/^[^\n]*\n?/, '').replace(AUTO, '').replace(/\s+/g, ' ').trim();
  const isAuto = s => s.indexOf(AUTO) >= 0 || /Carried over from 2025-26/i.test(s);

  function merge(saved, fresh) {
    if (!saved) return fresh || '';
    if (!fresh) return saved;
    const S = split(saved), F = split(fresh);
    const freshBy = {};
    F.secs.forEach(s => { freshBy[titleOf(s)] = s; });
    const used = {};
    const secs = S.secs.map(s => {
      const t = titleOf(s);
      used[t] = true;
      if ((isAuto(s) || t === 'sources') && freshBy[t]) return freshBy[t];
      return s;
    });
    F.secs.forEach(s => { if (!used[titleOf(s)]) secs.push(s); });   // new automatic sections
    const pre = /enters the 2026-27 season under/i.test(S.pre) || !S.pre.trim() ? F.pre : S.pre;
    return (pre ? pre.replace(/\s+$/, '') + '\n\n' : '') + secs.map(s => s.replace(/\s+$/, '')).join('\n\n') + '\n';
  }

  function markEdits(text, fresh) {
    const T = split(text), F = split(fresh);
    const freshBy = {};
    F.secs.forEach(s => { freshBy[titleOf(s)] = s; });
    const secs = T.secs.map(s => {
      if (s.indexOf(AUTO) < 0) return s;
      const f = freshBy[titleOf(s)];
      return f && bodyOf(f) === bodyOf(s) ? s : s.replace(AUTO + '\n', '').replace(AUTO, '');
    });
    return (T.pre ? T.pre.replace(/\s+$/, '') + '\n\n' : '') + secs.map(s => s.replace(/\s+$/, '')).join('\n\n') + '\n';
  }

  window.GriffinScoutMerge = { merge, markEdits, AUTO };
})();
