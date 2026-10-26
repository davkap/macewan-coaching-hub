/* PDF downloads for the Coaching Hub (scouting reports, scout cards, Database and
 * Shot Tracker exports). Built in the browser with pdf-lib (vendor/pdf-lib.min.js,
 * MIT licence, kept on the site so it works offline at games).
 *
 *   GriffinPDF.markdown(md, { title, subtitle, filename })          report-style document
 *   GriffinPDF.table({ title, subtitle, head, rows, filename })     data table (landscape)
 *   GriffinPDF.blocks(blocks, { title, subtitle, filename, landscape })
 *     blocks: { type: 'h1'|'h2'|'h3'|'p'|'li'|'oli'|'quote'|'hr'|'table'|'space'|'keep', … }
 *     text uses **bold** and *italic*.
 */
(function () {
  'use strict';
  const MAROON = [0.596, 0, 0.180], TAN = [0.820, 0.678, 0.490], INK = [0.11, 0.11, 0.13], MUTE = [0.42, 0.45, 0.5];

  let libPromise = null;
  function lib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (!libPromise) libPromise = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = '/vendor/pdf-lib.min.js';
      s.onload = () => res(window.PDFLib);
      s.onerror = () => { libPromise = null; rej(new Error('Could not load the PDF maker. Check the internet connection and try again.')); };
      document.head.appendChild(s);
    });
    return libPromise;
  }

  // The built-in PDF fonts only know Western characters: swap the rest.
  const SWAP = { '➔': '->', '→': '->', '⇒': '=>', '⟶': '->', '←': '<-', '≥': '>=', '≤': '<=', '★': '*', '•': '-', '·': '-', '✓': 'v',
    ' ': ' ', ' ': ' ', ' ': ' ', '‑': '-', '−': '-', '×': 'x', '½': '1/2' };
  const clean = s => String(s == null ? '' : s)
    .replace(/[←-⇿☀-➿⬀-⯿✀-➿•·★✓≥≤×½   ‑−⟶]/g, c => SWAP[c] != null ? SWAP[c] : '')
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[^\x09\x0a\x0d\x20-\x7e¡-ÿ–—‘’‚“”„†‡•…‰€™ŒœŠšŸŽžƒ]/g, '');

  // "**bold** and *italic*" -> [{ t, b, i }]
  function runs(text) {
    const out = [];
    const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let last = 0, m;
    const s = clean(text);
    while ((m = re.exec(s))) {
      if (m.index > last) out.push({ t: s.slice(last, m.index) });
      if (m[2] != null) out.push({ t: m[2], b: true }); else out.push({ t: m[3], i: true });
      last = re.lastIndex;
    }
    if (last < s.length) out.push({ t: s.slice(last) });
    return out;
  }

  async function blocksToPdf(blocks, opts) {
    const P = await lib();
    const doc = await P.PDFDocument.create();
    doc.setTitle(clean(opts.title || 'MacEwan Griffins'));
    doc.setAuthor('MacEwan Griffins Coaching Hub');
    const F = {
      r: await doc.embedFont(P.StandardFonts.Helvetica),
      b: await doc.embedFont(P.StandardFonts.HelveticaBold),
      i: await doc.embedFont(P.StandardFonts.HelveticaOblique)
    };
    const fontOf = r => r.b ? F.b : r.i ? F.i : F.r;
    const [W, H] = opts.landscape ? [792, 612] : [612, 792];
    const M = 40, TOP = 62, BOTTOM = 40, CW = W - 2 * M;
    const rgb = a => P.rgb(a[0], a[1], a[2]);
    let page, y;

    function newPage() {
      page = doc.addPage([W, H]);
      page.drawRectangle({ x: 0, y: H - 34, width: W, height: 34, color: rgb(MAROON) });
      page.drawRectangle({ x: 0, y: H - 37, width: W, height: 3, color: rgb(TAN) });
      const t = clean(opts.title || '');
      let size = 13;
      while (size > 8 && F.b.widthOfTextAtSize(t, size) > CW - 150) size -= 0.5;
      page.drawText(t, { x: M, y: H - 23, size, font: F.b, color: P.rgb(1, 1, 1) });
      const brand = 'MACEWAN GRIFFINS';
      page.drawText(brand, { x: W - M - F.b.widthOfTextAtSize(brand, 8), y: H - 21, size: 8, font: F.b, color: rgb(TAN) });
      y = H - TOP;
    }
    const need = h => { if (y - h < BOTTOM) newPage(); };

    // Lay out runs into lines that fit `width`.
    function wrap(rs, size, width) {
      const words = [];
      rs.forEach(r => r.t.split(/(\s+)/).forEach(w => { if (w) words.push({ t: w, b: r.b, i: r.i }); }));
      const lines = [[]];
      let lw = 0;
      for (const w of words) {
        const f = fontOf(w);
        let ww = f.widthOfTextAtSize(w.t, size);
        if (/^\s+$/.test(w.t)) { if (lines[lines.length - 1].length) { lines[lines.length - 1].push(w); lw += ww; } continue; }
        if (lw + ww > width && lines[lines.length - 1].length) {
          const cur = lines[lines.length - 1];
          while (cur.length && /^\s+$/.test(cur[cur.length - 1].t)) cur.pop();
          lines.push([]); lw = 0;
        }
        // a single word longer than the line: cut it
        while (ww > width) {
          let k = w.t.length;
          while (k > 1 && f.widthOfTextAtSize(w.t.slice(0, k), size) > width) k--;
          lines[lines.length - 1].push({ t: w.t.slice(0, k), b: w.b, i: w.i });
          lines.push([]); lw = 0;
          w.t = w.t.slice(k); ww = f.widthOfTextAtSize(w.t, size);
        }
        lines[lines.length - 1].push(w); lw += ww;
      }
      return lines.filter((l, i) => l.length || i === 0);
    }
    function drawLine(line, x, yy, size, color) {
      let cx = x;
      for (const w of line) {
        const f = fontOf(w);
        page.drawText(w.t, { x: cx, y: yy, size, font: f, color: rgb(color || INK) });
        cx += f.widthOfTextAtSize(w.t, size);
      }
    }
    function text(rs, { size = 10, indent = 0, color, lead = 1.35, before = 0, after = 4, marker } = {}) {
      const lines = wrap(rs, size, CW - indent);
      y -= before;
      lines.forEach((l, i) => {
        need(size * lead);
        if (i === 0 && marker) page.drawText(marker, { x: M + indent - (marker.length > 2 ? 16 : 11), y: y - size, size, font: F.b, color: rgb(MAROON) });
        drawLine(l, M + indent, y - size, size, color);
        y -= size * lead;
      });
      y -= after;
    }

    function table(head, rows, { size } = {}) {
      const cols = Math.max(head.length, ...rows.map(r => r.length));
      size = size || (cols > 10 ? 7 : cols > 7 ? 7.5 : 8.5);
      const pad = 3;
      const cell = v => clean(v == null ? '' : String(v));
      // Column widths from content, squeezed to fit the page.
      const want = [];
      for (let c = 0; c < cols; c++) {
        let w = F.b.widthOfTextAtSize(cell(head[c]), size);
        rows.slice(0, 300).forEach(r => { w = Math.max(w, F.r.widthOfTextAtSize(cell(r[c]), size)); });
        want.push(Math.max(30, Math.min(w + 2 * pad + 4, 220)));
      }
      let total = want.reduce((a, b) => a + b, 0);
      const widths = total > CW ? want.map(w => Math.max(28, w * CW / total)) : want;
      total = widths.reduce((a, b) => a + b, 0);
      if (total > CW) { const k = CW / total; widths.forEach((w, i) => { widths[i] = w * k; }); }
      const lineH = size * 1.25;
      const layout = (vals, font) => vals.map((v, c) => wrap([{ t: cell(v), b: font === F.b }], size, widths[c] - 2 * pad + 0.5));
      const drawRow = (vals, isHead, zebra) => {
        const ls = layout(vals, isHead ? F.b : F.r);
        const h = Math.max(...ls.map(l => l.length)) * lineH + 2 * pad;
        if (y - h < BOTTOM) { newPage(); if (!isHead) drawRow(head, true); }
        let x = M;
        if (isHead) page.drawRectangle({ x: M, y: y - h, width: total, height: h, color: rgb(MAROON) });
        else if (zebra) page.drawRectangle({ x: M, y: y - h, width: total, height: h, color: P.rgb(0.965, 0.955, 0.94) });
        ls.forEach((l, c) => {
          l.forEach((line, k) => drawLine(line, x + pad, y - pad - size - k * lineH + 1, size, isHead ? [1, 1, 1] : INK));
          x += widths[c];
        });
        page.drawLine({ start: { x: M, y: y - h }, end: { x: M + total, y: y - h }, thickness: 0.4, color: P.rgb(0.85, 0.85, 0.85) });
        y -= h;
      };
      need(lineH * 3);
      if (head.length) drawRow(head, true);
      rows.forEach((r, i) => drawRow(r, false, i % 2 === 1));
      y -= 8;
    }

    newPage();
    if (opts.subtitle) text(runs(opts.subtitle), { size: 9, color: MUTE, after: 8 });
    let n = 0;
    for (const bl of blocks) {
      if (bl.type !== 'oli') n = 0;
      switch (bl.type) {
        case 'h1': need(40); text(runs(bl.text), { size: 17, before: 4, after: 6, color: MAROON }); break;
        case 'h2':
          need(50);
          y -= 8;
          text(runs(bl.text), { size: 13, after: 2, color: MAROON });
          page.drawLine({ start: { x: M, y: y }, end: { x: M + CW, y: y }, thickness: 0.8, color: rgb(TAN) });
          y -= 6;
          break;
        case 'h3': need(30); text(runs(bl.text), { size: 11, before: 4, after: 3 }); break;
        case 'p': text(runs(bl.text), { size: bl.size || 10 }); break;
        case 'quote': text(runs(bl.text), { size: 9.5, indent: 10, color: [0.2, 0.22, 0.27], after: 6 }); break;
        case 'li': text(runs(bl.text), { indent: 18 + (bl.level || 0) * 14, marker: '-', after: 2 }); break;
        case 'oli': n = bl.num || n + 1; text(runs(bl.text), { indent: 20, marker: n + '.', after: 2 }); break;
        case 'hr': need(12); y -= 4; page.drawLine({ start: { x: M, y }, end: { x: M + CW, y }, thickness: 0.5, color: P.rgb(0.8, 0.8, 0.8) }); y -= 8; break;
        case 'table': table(bl.head || [], bl.rows || [], bl); break;
        case 'space': y -= bl.h || 8; break;
        case 'keep': need(bl.h || 100); break;
      }
    }

    // Footer on every page
    const pages = doc.getPages();
    const stamp = clean('Downloaded ' + new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' from the MacEwan Griffins Coaching Hub');
    pages.forEach((pg, i) => {
      pg.drawText(stamp, { x: M, y: 22, size: 7, font: F.r, color: rgb(MUTE) });
      const pn = `Page ${i + 1} of ${pages.length}`;
      pg.drawText(pn, { x: W - M - F.r.widthOfTextAtSize(pn, 7), y: 22, size: 7, font: F.r, color: rgb(MUTE) });
    });
    return doc.save();
  }

  function save(bytes, filename) {
    const base = String(filename || 'macewan').replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s*-\s*-+\s*|\s{2,}/g, ' ').trim();
    const name = base + '.pdf';
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  // Markdown (the scouting reports / profiles) -> blocks.
  function mdBlocks(md) {
    const lines = String(md || '').replace(/\r/g, '').replace(/<!--[\s\S]*?-->/g, '').split('\n');
    const out = [];
    const link = s => s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
    let para = [];
    const flush = () => { if (para.length) { out.push({ type: 'p', text: link(para.join(' ')) }); para = []; } };
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      let m;
      if (/^\s*$/.test(l)) { flush(); continue; }
      if (/^\s*\|.*\|\s*$/.test(l)) {
        flush();
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map(c => link(c.trim()).replace(/\*\*/g, ''));
          if (!cells.every(c => /^:?-+:?$/.test(c))) rows.push(cells);
          i++;
        }
        i--;
        out.push({ type: 'table', head: rows[0] || [], rows: rows.slice(1) });
        continue;
      }
      if ((m = l.match(/^(#{1,4})\s+(.*)$/))) { flush(); out.push({ type: m[1].length === 1 ? 'h1' : m[1].length === 2 ? 'h2' : 'h3', text: m[2] }); continue; }
      if (/^\s*-{3,}\s*$/.test(l)) { flush(); out.push({ type: 'hr' }); continue; }
      if ((m = l.match(/^>\s?(.*)$/))) { flush(); out.push({ type: 'quote', text: link(m[1]) }); continue; }
      if ((m = l.match(/^(\s*)[-*]\s+(.*)$/))) { flush(); out.push({ type: 'li', text: link(m[2]), level: m[1].length >= 2 ? 1 : 0 }); continue; }
      if ((m = l.match(/^\s*(\d+)\.\s+(.*)$/))) { flush(); out.push({ type: 'oli', text: link(m[2]), num: +m[1] }); continue; }
      para.push(l.trim());
    }
    flush();
    return out;
  }

  const fileName = s => String(s || 'macewan').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'macewan';

  async function markdown(md, opts) {
    const bytes = await blocksToPdf(mdBlocks(md), opts || {});
    save(bytes, opts.filename || fileName(opts.title));
  }
  async function table(o) {
    const bytes = await blocksToPdf([{ type: 'table', head: o.head, rows: o.rows }], { title: o.title, subtitle: o.subtitle, landscape: o.landscape !== false });
    save(bytes, o.filename || fileName(o.title));
  }
  async function blocks(bl, opts) {
    const bytes = await blocksToPdf(bl, opts || {});
    save(bytes, opts.filename || fileName(opts.title));
  }

  window.GriffinPDF = { markdown, table, blocks, mdBlocks, fileName, clean };
})();
