(function() {
  // Inject tracking configuration and tracking script dynamically
  if (!document.querySelector('script[src*="site-tracking.js"]')) {
    const configScript = document.createElement('script');
    configScript.src = '../../offseason-sc-app/tracking-config.js';
    configScript.onload = () => {
      if (!document.querySelector('script[src*="site-tracking.js"]')) {
        const trackingScript = document.createElement('script');
        trackingScript.src = '../../site-tracking.js';
        document.head.appendChild(trackingScript);
      }
    };
    document.head.appendChild(configScript);
  }

  // Extract team slug from URL path
  const pathParts = window.location.pathname.split('/');
  const teamSlug = pathParts.slice(-2, -1)[0] || 'scout-cards';
  const storageKey = `scout_cards_${teamSlug}`;

  function isInvalidCache(html) {
    if (!html) return false;
    // 1. Purge known stale mismatched patterns (e.g. Lethbridge player numbers being #2 Joshua Francis, #3 Nate Hosannah, #4 Kai Gibbons)
    if (html.includes('#2 • Joshua Francis') || html.includes('#3 • Nate Hosannah') || html.includes('#4 • Kai Gibbons')) {
      return true;
    }
    // 2. Check if cache is missing data-template-version or has an older template version
    const wrapper = document.getElementById('scout-cards-wrapper');
    const currentVer = wrapper ? wrapper.getAttribute('data-template-version') : null;
    if (currentVer) {
      if (!html.includes(`data-template-version="${currentVer}"`)) {
        return true;
      }
    }
    return false;
  }

  // --- Keep stats current on edited cards -------------------------------
  // A saved (edited) version of the cards is a snapshot of the whole card,
  // stats included. Without this, a team whose cards were ever edited keeps
  // showing the stats from the day of the edit. So before restoring a saved
  // version we read the fresh stats this page was built with, and put them
  // back into the restored cards:
  //  - the "U Sports" (season) row is always refreshed when fresh numbers exist;
  //  - the "Last 5 Games" row is refreshed only if it was the automatic copy
  //    of the season row (numbers a coach typed in by hand are kept).
  // Notes, tags, photos and card order from the saved version are untouched.
  let freshStats = null;

  function cardPlayerName(card) {
    const h = card.querySelector('.player-header');
    if (!h) return '';
    const parts = h.textContent.split('•');
    return (parts[1] || '').trim().toLowerCase();
  }

  function statCells(tr) {
    return Array.from(tr.querySelectorAll('td')).slice(1).map(td => td.textContent.trim());
  }

  function setStatCells(tr, values) {
    const tds = Array.from(tr.querySelectorAll('td')).slice(1);
    values.forEach((v, i) => { if (tds[i]) tds[i].textContent = v; });
  }

  // Placeholders older versions of the cards used for unknown height/weight.
  const PLACEHOLDER_HEIGHT = `6'3"`;
  const PLACEHOLDER_WEIGHT = '190 lbs';

  function headerParts(card) {
    const h = card.querySelector('.player-header');
    return h ? h.textContent.split('•').map(x => x.trim()) : [];
  }

  function captureFreshStats() {
    const map = {};
    document.querySelectorAll('.card').forEach(card => {
      const name = cardPlayerName(card);
      const rows = card.querySelectorAll('.stats-table tbody tr');
      if (name && rows.length >= 2) {
        const img = card.querySelector('.photo-tile img');
        const tags = card.querySelector('.tactical-tags');
        const notes = card.querySelector('.scout-notes');
        map[name] = { last5: statCells(rows[0]), season: statCells(rows[1]), header: headerParts(card),
          photo: img ? img.getAttribute('src') : '', fallback: img ? img.getAttribute('data-fallback') : '',
          tagsHtml: tags ? tags.innerHTML : '', notesHtml: notes ? notes.innerHTML : '' };
      }
    });
    return map;
  }

  // ---- Automatic tags, notes and Starters/Bench split -----------------------
  // The build fills in each card's tags (C/O, DTRAN, PNR, PIN/DHO, REBOUND) and
  // a stats-based note, and puts players who started most games under
  // "Starters". A saved version of the cards keeps anything a coach wrote:
  // only fields still holding automatic text are updated. We remember the
  // automatic text in a data-auto attribute, so a later edit by a coach (any
  // change to the text) is recognised and kept.
  const squash = s => String(s || '').replace(/\s+/g, ' ').trim();
  const OLD_DEFAULT_TAGS = /^Hand: [RL], C\/O: (Trae|Brown), DTRAN: Locate PNR: Over\/Switch, PIN\/DHO: Over\/Switch REBOUND: (Box out|MUST BOX OUT)$/;
  const isAutoNote = t => /\[Scouting note editable via Edit Cards\]/.test(t);

  function applyAutoField(el, freshHtml, looksLikeOldDefault) {
    if (!el || !freshHtml) return;
    if (isAutoText(el, looksLikeOldDefault)) {
      el.innerHTML = freshHtml;
      el.setAttribute('data-auto', squash(el.textContent));
    } else {
      el.removeAttribute('data-auto');
    }
  }

  // Tags are merged one item at a time (Hand, C/O, DTRAN, PNR, PIN/DHO,
  // REBOUND), so a coach can set PNR for one player and his C/O still follows
  // his shooting every stats refresh. data-auto-fields remembers what the
  // automatic value of each item was; an item that still shows it is updated.
  const TAG_LABELS = ['Hand', 'C/O', 'DTRAN', 'PNR', 'PIN/DHO', 'REBOUND'];
  function parseTags(text) {
    const t = squash(text);
    const re = /(Hand|C\/O|DTRAN|PIN\/DHO|PNR|REBOUND):/g;
    const hits = [];
    let m;
    while ((m = re.exec(t))) hits.push({ label: m[1], start: m.index, end: re.lastIndex });
    if (!hits.length) return null;
    const out = {};
    hits.forEach((h, i) => {
      const v = t.slice(h.end, i + 1 < hits.length ? hits[i + 1].start : t.length);
      out[h.label] = v.replace(/,\s*$/, '').trim();
    });
    // Anything that isn't one of the six items: treat the tags as free text.
    if (t.slice(0, hits[0].start).trim()) return null;
    return out;
  }
  function renderTags(f) {
    const v = k => (f[k] || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    return `\n          <strong>Hand:</strong> ${v('Hand')}, <strong>C/O:</strong> ${v('C/O')}, <strong>DTRAN:</strong> ${v('DTRAN')}` +
      `\n          <br><strong>PNR:</strong> ${v('PNR')}, <strong>PIN/DHO:</strong> ${v('PIN/DHO')}` +
      `\n          <br><strong>REBOUND:</strong> ${v('REBOUND')}\n        `;
  }
  function applyFreshTags(el, freshHtml) {
    if (!el || !freshHtml) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = freshHtml;
    const freshF = parseTags(tmp.textContent);
    if (!freshF) return;
    const text = squash(el.textContent);
    let autoF = null;
    try { autoF = JSON.parse(el.getAttribute('data-auto-fields') || 'null'); } catch (e) {}
    if (!autoF && (OLD_DEFAULT_TAGS.test(text) ||
        (el.hasAttribute('data-auto') && el.getAttribute('data-auto') === text))) {
      autoF = parseTags(text);       // whole field was automatic: every item is
    }
    const saved = parseTags(text);
    if (!autoF || !saved) { el.removeAttribute('data-auto'); return; }   // coach's own text: keep
    const merged = {};
    TAG_LABELS.forEach(k => {
      const s = saved[k] || '';
      merged[k] = (s === (autoF[k] || '')) ? (freshF[k] || '') : s;
    });
    el.innerHTML = renderTags(merged);
    el.setAttribute('data-auto-fields', JSON.stringify(freshF));
    el.removeAttribute('data-auto');
  }

  function applyFreshTagsAndNotes(card, fresh) {
    applyFreshTags(card.querySelector('.tactical-tags'), fresh.tagsHtml);
    applyAutoField(card.querySelector('.scout-notes'), fresh.notesHtml, isAutoNote);
  }

  // Mark the freshly built (unsaved) cards' fields as automatic, so a save
  // made without touching them still counts as automatic next time.
  function markFreshAuto() {
    document.querySelectorAll('.card .scout-notes').forEach(el => {
      el.setAttribute('data-auto', squash(el.textContent));
    });
    document.querySelectorAll('.card .tactical-tags').forEach(el => {
      const f = parseTags(el.textContent);
      if (f) el.setAttribute('data-auto-fields', JSON.stringify(f));
    });
  }

  function layoutOf(container) {
    const s = [], b = [];
    container.querySelectorAll('.card').forEach(card => {
      (card.classList.contains('starter') ? s : b).push(cardPlayerName(card));
    });
    return { s, b, key: 'S:' + s.join('|') + '||B:' + b.join('|') };
  }

  // The saved split is automatic if it is exactly what the build produced when
  // it was saved, or the old rule (first 5 on the roster are starters).
  function savedLayoutIsAuto(savedHtml, container) {
    const lay = layoutOf(container);
    const autoKey = (savedHtml.match(/data-auto-layout="([^"]*)"/) || [])[1];
    const tmp = document.createElement('textarea');
    if (autoKey) { tmp.innerHTML = autoKey; if (tmp.value === lay.key) return true; }
    const rosterAttr = (savedHtml.match(/data-roster-order="([^"]*)"/) || [])[1] ||
      (getCardsContainer().getAttribute('data-roster-order') || '');
    tmp.innerHTML = rosterAttr;
    const roster = tmp.value.split('|').map(n => n.trim().toLowerCase()).filter(Boolean);
    if (roster.length) {
      const order = lay.s.concat(lay.b);
      if (lay.s.length === Math.min(5, roster.length) && order.join('|') === roster.join('|')) return true;
    }
    // A version saved before any coach wrote tags or notes (e.g. only photos
    // were added) gets the automatic split too.
    return noCoachText(container);
  }

  function isAutoText(el, looksLikeOldDefault) {
    if (!el) return true;
    const text = squash(el.textContent);
    return (el.hasAttribute('data-auto') && el.getAttribute('data-auto') === text) || looksLikeOldDefault(text);
  }

  function tagsAreAuto(el) {
    if (!el || isAutoText(el, t => OLD_DEFAULT_TAGS.test(t))) return true;
    let autoF = null;
    try { autoF = JSON.parse(el.getAttribute('data-auto-fields') || 'null'); } catch (e) {}
    const saved = parseTags(el.textContent);
    return !!(autoF && saved && TAG_LABELS.every(k => (saved[k] || '') === (autoF[k] || '')));
  }

  function noCoachText(container) {
    if (!freshStats) return false;
    const cards = Array.from(container.querySelectorAll('.card'));
    return cards.length > 0 && cards.every(card => freshStats[cardPlayerName(card)] &&
      tagsAreAuto(card.querySelector('.tactical-tags')) &&
      isAutoText(card.querySelector('.scout-notes'), isAutoNote));
  }

  // Rebuild the fresh Starters/Bench layout, dropping each saved card into the
  // slot of the same player (players new to the roster get their fresh card).
  function resection(container, freshSkeleton) {
    const saved = {};
    container.querySelectorAll('.card').forEach(card => { saved[cardPlayerName(card)] = card; });
    container.innerHTML = freshSkeleton;
    container.querySelectorAll('.card').forEach(slot => {
      const card = saved[cardPlayerName(slot)];
      if (!card) return;
      const isStarter = slot.classList.contains('starter');
      card.classList.toggle('starter', isStarter);
      card.classList.toggle('key', !isStarter);
      slot.replaceWith(card);
    });
  }
  let freshSkeleton = '';

  // A saved card's "no photo" placeholder may be the old broken markup. Use
  // the freshly built photo/placeholder unless a real photo was saved.
  function applyFreshPhoto(card, fresh) {
    const img = card.querySelector('.photo-tile img');
    if (!img || !fresh.fallback) return;
    const src = img.getAttribute('src') || '';
    const isPlaceholder = !src || src.indexOf('data:image/svg') === 0;
    if (isPlaceholder && fresh.photo) img.setAttribute('src', fresh.photo);
    img.setAttribute('data-fallback', fresh.fallback);
    img.setAttribute('onerror', 'this.onerror=null; this.src=this.dataset.fallback;');
    img.onerror = function () { img.onerror = null; img.src = fresh.fallback; };
  }

  // Swap old made-up height/weight placeholders in a saved card for the
  // freshly built value (a real height, or N/A). Values a coach typed stay.
  function applyFreshHeader(card, fresh) {
    const parts = headerParts(card);
    if (parts.length < 5 || !fresh.header || fresh.header.length < 5) return;
    let changed = false;
    if (parts[3] === PLACEHOLDER_HEIGHT && fresh.header[3] !== parts[3]) { parts[3] = fresh.header[3]; changed = true; }
    if (parts[4] === PLACEHOLDER_WEIGHT && fresh.header[4] !== parts[4]) { parts[4] = fresh.header[4]; changed = true; }
    if (changed) card.querySelector('.player-header').textContent = parts.join(' • ');
  }

  function applyFreshStats(container) {
    if (!freshStats) return;
    container.querySelectorAll('.card').forEach(card => {
      const fresh = freshStats[cardPlayerName(card)];
      if (!fresh) return;
      applyFreshHeader(card, fresh);
      applyFreshPhoto(card, fresh);
      applyFreshTagsAndNotes(card, fresh);
      if (fresh.season.every(v => v === '-' || v === '')) return;
      const rows = card.querySelectorAll('.stats-table tbody tr');
      if (rows.length < 2) return;
      const savedLast5 = statCells(rows[0]);
      const savedSeason = statCells(rows[1]);
      const last5WasAutoCopy = savedLast5.join('|') === savedSeason.join('|') ||
        savedLast5.every(v => v === '-' || v === '');
      setStatCells(rows[1], fresh.season);
      if (last5WasAutoCopy) setStatCells(rows[0], fresh.last5);
    });
  }

  // Initialize on DOM loaded
  window.addEventListener('DOMContentLoaded', () => {
    freshStats = captureFreshStats();
    markFreshAuto();
    freshSkeleton = getCardsContainer().innerHTML;
    injectStyles();

    // Check if edited version exists in local storage
    const savedHtml = localStorage.getItem(storageKey);
    if (savedHtml) {
      if (isInvalidCache(savedHtml)) {
        console.log('Purging outdated/invalid local storage cache for', storageKey);
        localStorage.removeItem(storageKey);
      } else {
        restoreCardsHTML(savedHtml);
      }
    }

    // Fetch live published version from cloud endpoint so all coaches and players see edits
    fetch(`/.netlify/functions/get-content?key=${encodeURIComponent(storageKey)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.content) {
          if (isInvalidCache(data.content)) {
            console.log('Ignoring outdated/invalid cloud content for', storageKey);
            localStorage.removeItem(storageKey);
          } else {
            restoreCardsHTML(data.content);
            localStorage.setItem(storageKey, data.content);
            const btnReset = document.getElementById('btn-cards-reset');
            if (btnReset) btnReset.style.display = 'inline-flex';
          }
        }
      })
      .catch(err => console.log('Cloud sync fetch note:', err));

    // Create Toast Container
    const toast = document.createElement('div');
    toast.className = 'editor-toast';
    toast.id = 'editor-toast';
    document.body.appendChild(toast);

    // Create Editor Bar
    createEditorBar();

    // Create Profile Modal
    createModalContainer();
  });

  let editMode = false;

  function injectStyles() {
    const css = `
      .editor-bar {
        background: #111;
        color: white;
        padding: 12px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 3px solid #98002e;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        margin-bottom: 24px;
        border-radius: 8px;
        max-width: 1300px;
        margin-left: auto;
        margin-right: auto;
      }
      @media (max-width: 650px) {
        .editor-bar { flex-direction: column; align-items: stretch; gap: 10px; padding: 12px 14px; }
        .editor-actions { gap: 8px; }
        .editor-btn { min-height: 40px; display: inline-flex; align-items: center; }
      }
      .editor-bar h4 {
        margin: 0;
        color: #d1ad7d;
        font-size: 15px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .editor-actions {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
      }
      .editor-btn {
        background: transparent;
        border: 1px solid rgba(255,255,255,0.4);
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .editor-btn:hover {
        background: rgba(255,255,255,0.1);
        border-color: white;
      }
      .editor-btn-primary {
        background: #98002e;
        border-color: #98002e;
      }
      .editor-btn-primary:hover {
        background: #b30036;
        border-color: #b30036;
      }
      .editor-btn-accent {
        background: #d1ad7d;
        color: #111;
        border-color: #d1ad7d;
      }
      .editor-btn-accent:hover {
        background: #dfbe91;
        border-color: #dfbe91;
      }
      .editor-btn-danger {
        background: #c0392b;
        border-color: #c0392b;
      }
      .editor-btn-danger:hover {
        background: #e74c3c;
        border-color: #e74c3c;
      }
      
      /* Photo Tile Upload Button */
      .photo-tile {
        position: relative !important;
      }
      .photo-upload-overlay {
        position: absolute;
        bottom: 4px;
        left: 4px;
        right: 4px;
        background: rgba(17, 17, 17, 0.88);
        color: #d1ad7d;
        border: 1px solid #d1ad7d;
        font-size: 10px;
        font-weight: bold;
        padding: 4px 2px;
        border-radius: 4px;
        cursor: pointer;
        text-align: center;
        z-index: 10;
        transition: all 0.15s ease;
      }
      .photo-upload-overlay:hover {
        background: #98002e;
        color: white;
        border-color: #98002e;
      }

      /* Edit Profile Button on Card */
      .edit-profile-btn {
        position: absolute;
        bottom: 8px;
        right: 8px;
        background: #1565c0;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        transition: background 0.15s ease;
      }
      .edit-profile-btn:hover {
        background: #0d47a1;
      }

      /* Editable fields styling */
      [contenteditable="true"] {
        outline: 1.5px dashed #d1ad7d;
        background: rgba(209, 173, 125, 0.08) !important;
        padding: 1px 3px;
        border-radius: 3px;
      }
      [contenteditable="true"]:focus {
        outline: 1.5px solid #98002e;
        background: rgba(152, 0, 46, 0.08) !important;
      }
      
      /* Delete Button on card */
      .delete-card-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        background: #c0392b;
        color: white;
        border: none;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        transition: background 0.15s ease;
      }
      .delete-card-btn:hover {
        background: #e74c3c;
      }
      
      /* Toggle Role Starter/Bench Button */
      .role-toggle-btn {
        position: absolute;
        top: 8px;
        right: 36px;
        background: #444;
        color: #ddd;
        border: none;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        transition: all 0.15s ease;
      }
      .role-toggle-btn:hover {
        background: #555;
        color: #fff;
      }
      .role-toggle-btn.starter {
        background: #98002e;
        color: #fff;
      }
      .role-toggle-btn.starter:hover {
        background: #b30036;
      }
      
      .editor-toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #2ecc71;
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: bold;
        z-index: 99999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        transform: translateY(150%);
        transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .editor-toast.show {
        transform: translateY(0);
      }

      /* Modal Styling */
      .profile-modal-overlay {
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }
      .profile-modal-overlay.open {
        opacity: 1;
        pointer-events: auto;
      }
      .profile-modal {
        background: #18181c;
        color: #fff;
        width: 90%;
        max-width: 650px;
        max-height: 90vh;
        overflow-y: auto;
        border-radius: 12px;
        border: 1px solid rgba(209, 173, 125, 0.3);
        box-shadow: 0 20px 50px rgba(0,0,0,0.6);
        padding: 24px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .profile-modal h3 {
        margin-top: 0;
        color: #d1ad7d;
        border-bottom: 2px solid #98002e;
        padding-bottom: 8px;
        font-size: 18px;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .form-group.full {
        grid-column: span 2;
      }
      .form-group label {
        font-size: 11px;
        font-weight: 700;
        color: #d1ad7d;
        text-transform: uppercase;
      }
      .form-group input, .form-group textarea, .form-group select {
        background: #24242b;
        border: 1px solid #3a3a46;
        color: white;
        padding: 8px 10px;
        border-radius: 6px;
        font-size: 13px;
      }
      .form-group input:focus, .form-group textarea:focus {
        border-color: #98002e;
        outline: none;
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 20px;
        border-top: 1px solid #3a3a46;
        padding-top: 14px;
      }

      @media print {
        .editor-bar, .delete-card-btn, .role-toggle-btn, .photo-upload-overlay, .edit-profile-btn, .editor-toast, .profile-modal-overlay {
          display: none !important;
        }
        [contenteditable="true"] {
          outline: none !important;
          background: transparent !important;
        }
      }
    `;
    const style = document.createElement('style');
    style.innerHTML = css;
    document.head.appendChild(style);
  }

  function getCardsContainer() {
    let wrapper = document.getElementById('scout-cards-wrapper') || document.getElementById('cards-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'scout-cards-wrapper';
      const topHeader = document.querySelector('header.title');
      if (topHeader) {
        const elementsToWrap = [];
        let next = topHeader.nextElementSibling;
        while (next) {
          const current = next;
          next = current.nextElementSibling;
          if (current.classList && (current.classList.contains('section-banner') || current.classList.contains('grid') || current.classList.contains('card'))) {
            elementsToWrap.push(current);
          }
        }
        if (elementsToWrap.length > 0) {
          topHeader.parentNode.insertBefore(wrapper, elementsToWrap[0]);
          elementsToWrap.forEach(el => wrapper.appendChild(el));
        }
      }
    }
    return wrapper || document.body;
  }

  function restoreCardsHTML(htmlContent) {
    if (!htmlContent) return;
    const container = getCardsContainer();
    if (container) {
      if (htmlContent.includes('id="scout-cards-wrapper"')) {
        const match = htmlContent.match(/<div id="scout-cards-wrapper"[^>]*>([\s\S]*?)<\/div>$/i);
        if (match) {
          container.innerHTML = match[1];
        } else {
          container.innerHTML = htmlContent;
        }
      } else {
        container.innerHTML = htmlContent;
      }
      if (freshSkeleton && savedLayoutIsAuto(htmlContent, container)) resection(container, freshSkeleton);
      container.querySelectorAll('.card').forEach(card => {
        card.style.position = 'relative';
      });
      applyFreshStats(container);
      const isCoachOrAdmin = typeof window.isCoachOrAdmin === 'function' ? window.isCoachOrAdmin() : (sessionStorage.getItem('griffin_hub_admin') === 'true' || sessionStorage.getItem('griffin_coaches_authorized') === 'true' || sessionStorage.getItem('griffin_hub_role') === 'coach' || sessionStorage.getItem('griffin_hub_role') === 'admin');
      if (!isCoachOrAdmin) {
        container.querySelectorAll('.delete-card-btn, .role-toggle-btn, .card-reorder-group, .photo-upload-overlay, .edit-profile-btn').forEach(el => el.remove());
        container.querySelectorAll('[contenteditable]').forEach(el => el.setAttribute('contenteditable', 'false'));
      }
    }
  }

  function getCleanCardsHTML() {
    const container = getCardsContainer();
    if (!container) return '';
    const clone = container.cloneNode(true);
    clone.querySelectorAll('.delete-card-btn, .role-toggle-btn, .card-reorder-group, .photo-upload-overlay, .edit-profile-btn').forEach(el => el.remove());
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    return clone.outerHTML;
  }

  function createEditorBar() {
    const topHeader = document.querySelector('header.title');
    if (!topHeader) return;

    const isCoachOrAdmin = typeof window.isCoachOrAdmin === 'function' ? window.isCoachOrAdmin() : (sessionStorage.getItem('griffin_hub_admin') === 'true' || sessionStorage.getItem('griffin_coaches_authorized') === 'true' || sessionStorage.getItem('griffin_hub_role') === 'coach' || sessionStorage.getItem('griffin_hub_role') === 'admin');

    if (!isCoachOrAdmin) {
      // Render Read-Only View Bar for Players
      const bar = document.createElement('div');
      bar.className = 'editor-bar no-print';
      bar.id = 'editor-bar';

      const info = document.createElement('h4');
      info.style.color = '#d1ad7d';
      info.innerHTML = '🔒 Player View (Read-Only Mode)';
      bar.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'editor-actions';

      const hubLink = document.createElement('a');
      hubLink.href = '../../index.html';
      hubLink.className = 'editor-btn';
      hubLink.innerText = '🏠 Dashboard';
      actions.appendChild(hubLink);

      bar.appendChild(actions);
      topHeader.parentNode.insertBefore(bar, topHeader.nextSibling);

      // Disable editing on all cards
      document.querySelectorAll('.scout-notes').forEach(n => n.setAttribute('contenteditable', 'false'));
      return;
    }

    const bar = document.createElement('div');
    bar.className = 'editor-bar no-print';
    bar.id = 'editor-bar';

    const info = document.createElement('h4');
    info.innerText = 'Player Scout Cards Admin Control';
    bar.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'editor-actions';

    // Dashboard link
    const hubLink = document.createElement('a');
    hubLink.href = '../../index.html';
    hubLink.className = 'editor-btn';
    hubLink.innerText = '🏠 Dashboard';
    actions.appendChild(hubLink);

    // Edit Toggle
    const btnEdit = document.createElement('button');
    btnEdit.className = 'editor-btn editor-btn-accent';
    btnEdit.innerText = '✏️ Edit Cards';
    btnEdit.id = 'btn-cards-edit';
    btnEdit.onclick = toggleEditMode;
    actions.appendChild(btnEdit);

    // Add Card (Hidden initially)
    const btnAdd = document.createElement('button');
    btnAdd.className = 'editor-btn';
    btnAdd.innerText = '➕ Add Player Card';
    btnAdd.id = 'btn-cards-add';
    btnAdd.style.display = 'none';
    btnAdd.onclick = addBlankCard;
    actions.appendChild(btnAdd);

    // Save (Hidden initially)
    const btnSave = document.createElement('button');
    btnSave.className = 'editor-btn editor-btn-primary';
    btnSave.innerText = '💾 Save';
    btnSave.id = 'btn-cards-save';
    btnSave.style.display = 'none';
    btnSave.onclick = saveCards;
    actions.appendChild(btnSave);

    // Cancel (Hidden initially)
    const btnCancel = document.createElement('button');
    btnCancel.className = 'editor-btn';
    btnCancel.innerText = '❌ Cancel';
    btnCancel.id = 'btn-cards-cancel';
    btnCancel.style.display = 'none';
    btnCancel.onclick = cancelEdits;
    actions.appendChild(btnCancel);

    // Reset (Hidden if no storage)
    const btnReset = document.createElement('button');
    btnReset.className = 'editor-btn editor-btn-danger';
    btnReset.innerText = '🔄 Revert';
    btnReset.id = 'btn-cards-reset';
    btnReset.style.display = localStorage.getItem(storageKey) ? 'inline-flex' : 'none';
    btnReset.onclick = resetCards;
    actions.appendChild(btnReset);

    // Upload JSON / Bulk update
    const btnUploadJSON = document.createElement('button');
    btnUploadJSON.className = 'editor-btn';
    btnUploadJSON.innerText = '📤 Upload JSON';
    btnUploadJSON.id = 'btn-cards-upload-json';
    btnUploadJSON.onclick = uploadCardsJSON;
    actions.appendChild(btnUploadJSON);

    // Download HTML
    const btnDownload = document.createElement('button');
    btnDownload.className = 'editor-btn editor-btn-accent';
    btnDownload.innerText = '📥 Download HTML';
    btnDownload.id = 'btn-cards-download';
    btnDownload.onclick = downloadHTML;
    actions.appendChild(btnDownload);

    bar.appendChild(actions);
    
    // Insert right before the header title
    topHeader.parentNode.insertBefore(bar, topHeader);
  }

  function toggleEditMode() {
    editMode = !editMode;
    
    document.getElementById('btn-cards-edit').style.display = editMode ? 'none' : 'inline-flex';
    document.getElementById('btn-cards-download').style.display = editMode ? 'none' : 'inline-flex';
    document.getElementById('btn-cards-upload-json').style.display = editMode ? 'none' : 'inline-flex';
    
    document.getElementById('btn-cards-add').style.display = editMode ? 'inline-flex' : 'none';
    document.getElementById('btn-cards-save').style.display = editMode ? 'inline-flex' : 'none';
    document.getElementById('btn-cards-cancel').style.display = editMode ? 'inline-flex' : 'none';

    if (editMode) {
      makeEditable(true);
      addEditorControls();
    } else {
      makeEditable(false);
      removeEditorControls();
    }
  }

  function makeEditable(editable) {
    const targets = document.querySelectorAll(
      '.name, .meta, .role, .num-tile, .num-overlay, .body section p, .stats span, ' +
      '.notesHeaders, .key, .player-header, .tactical-tags, .scout-notes, ' +
      '.stats-table td, .stats-table th, .section-banner, .card-info'
    );
    
    targets.forEach(t => {
      t.contentEditable = editable ? "true" : "false";
    });
  }

  function addEditorControls() {
    document.querySelectorAll('.card').forEach(card => {
      card.style.position = 'relative';

      // 1. Add Delete button
      if (!card.querySelector('.delete-card-btn')) {
        const btnDel = document.createElement('button');
        btnDel.className = 'delete-card-btn no-print';
        btnDel.innerHTML = '×';
        btnDel.title = 'Delete Player Card';
        btnDel.onclick = function(e) {
          e.stopPropagation();
          if (confirm('Delete this player card?')) {
            card.remove();
          }
        };
        card.appendChild(btnDel);
      }

      // 2. Add Starter/Bench toggle button
      if (!card.querySelector('.role-toggle-btn')) {
        const btnToggle = document.createElement('button');
        btnToggle.className = 'role-toggle-btn no-print';
        
        const isStarter = card.classList.contains('starter');
        btnToggle.innerText = isStarter ? '⭐ Starter' : 'Bench';
        if (isStarter) btnToggle.classList.add('starter');

        btnToggle.onclick = function(e) {
          e.stopPropagation();
          const starter = card.classList.contains('starter');
          const grids = document.querySelectorAll('.grid');
          const startersGrid = grids[0];
          let benchGrid = grids[1];

          if (!benchGrid && starter) {
            const banner = document.createElement('div');
            banner.className = 'section-banner';
            banner.innerText = 'Rotational & Bench';
            benchGrid = document.createElement('div');
            benchGrid.className = 'grid';

            const container = startersGrid.parentNode;
            container.appendChild(banner);
            container.appendChild(benchGrid);
          }

          if (starter) {
            card.classList.remove('starter');
            card.classList.add('key');
            btnToggle.innerText = 'Bench';
            btnToggle.classList.remove('starter');
            if (benchGrid) benchGrid.appendChild(card);
            showToast('Moved player to Rotational & Bench section');
          } else {
            card.classList.remove('key');
            card.classList.add('starter');
            btnToggle.innerText = '⭐ Starter';
            btnToggle.classList.add('starter');
            if (startersGrid) startersGrid.appendChild(card);
            showToast('Moved player to Starters section');
          }
        };
        card.appendChild(btnToggle);
      }

      // 3. Add Photo Upload Overlay on photo tile
      const photoTile = card.querySelector('.photo-tile');
      if (photoTile && !photoTile.querySelector('.photo-upload-overlay')) {
        const uploadOverlay = document.createElement('button');
        uploadOverlay.className = 'photo-upload-overlay no-print';
        uploadOverlay.innerHTML = '📷 Upload Photo';
        uploadOverlay.onclick = function(e) {
          e.stopPropagation();
          triggerPhotoUpload(card);
        };
        photoTile.appendChild(uploadOverlay);
      }

      // 4. Add Full Profile Edit Modal button on card
      if (!card.querySelector('.edit-profile-btn')) {
        const btnModal = document.createElement('button');
        btnModal.className = 'edit-profile-btn no-print';
        btnModal.innerHTML = '📝 Edit Profile';
        btnModal.onclick = function(e) {
          e.stopPropagation();
          openProfileModal(card);
        };
        card.appendChild(btnModal);
      }

      // 5. Add Reorder Up/Down buttons
      if (!card.querySelector('.card-reorder-group')) {
        const reorderGrp = document.createElement('div');
        reorderGrp.className = 'card-reorder-group no-print';
        reorderGrp.style.position = 'absolute';
        reorderGrp.style.top = '8px';
        reorderGrp.style.right = '90px';
        reorderGrp.style.display = 'flex';
        reorderGrp.style.gap = '3px';

        const btnUp = document.createElement('button');
        btnUp.className = 'card-reorder-btn no-print';
        btnUp.style.cssText = 'background:#333;color:#fff;border:none;width:22px;height:22px;border-radius:4px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.2);';
        btnUp.innerHTML = '▲';
        btnUp.title = 'Move Card Up';
        btnUp.onclick = function(e) {
          e.stopPropagation();
          const prev = card.previousElementSibling;
          if (prev && prev.classList.contains('card')) {
            card.parentNode.insertBefore(card, prev);
          }
        };

        const btnDown = document.createElement('button');
        btnDown.className = 'card-reorder-btn no-print';
        btnDown.style.cssText = 'background:#333;color:#fff;border:none;width:22px;height:22px;border-radius:4px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.2);';
        btnDown.innerHTML = '▼';
        btnDown.title = 'Move Card Down';
        btnDown.onclick = function(e) {
          e.stopPropagation();
          const next = card.nextElementSibling;
          if (next && next.classList.contains('card')) {
            card.parentNode.insertBefore(next, card);
          }
        };

        reorderGrp.appendChild(btnUp);
        reorderGrp.appendChild(btnDown);
        card.appendChild(reorderGrp);
      }
    });
  }

  function removeEditorControls() {
    document.querySelectorAll('.delete-card-btn, .role-toggle-btn, .card-reorder-group, .photo-upload-overlay, .edit-profile-btn').forEach(btn => btn.remove());
  }

  function compressImageFile(file, callback) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      const tempImg = new Image();
      tempImg.onload = function() {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 350;
        let width = tempImg.width;
        let height = tempImg.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(tempImg, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        callback(dataUrl);
      };
      tempImg.onerror = function() {
        callback(evt.target.result);
      };
      tempImg.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }

  function triggerPhotoUpload(card) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = function(e) {
      const file = e.target.files[0];
      if (file) {
        showToast('Optimizing player photo...');
        compressImageFile(file, function(dataUrl) {
          const img = card.querySelector('.photo-tile img');
          if (img) {
            img.src = dataUrl;
            img.removeAttribute('onerror');
            showToast('Player photo updated & saved!');
            saveCardsSilently();
          }
        });
      }
    };
    fileInput.click();
  }

  function createModalContainer() {
    if (document.getElementById('profile-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'profile-modal-overlay no-print';
    overlay.id = 'profile-modal-overlay';
    overlay.innerHTML = `
      <div class="profile-modal">
        <h3>📝 Edit Player Profile &amp; Scout Card</h3>
        <form id="profile-edit-form">
          <div class="form-grid">
            <div class="form-group">
              <label>Number (#)</label>
              <input type="text" id="m-number" placeholder="0">
            </div>
            <div class="form-group">
              <label>Player Name</label>
              <input type="text" id="m-name" placeholder="Full Name">
            </div>
            <div class="form-group">
              <label>Position</label>
              <input type="text" id="m-pos" placeholder="Guard / Forward">
            </div>
            <div class="form-group">
              <label>Height</label>
              <input type="text" id="m-ht" placeholder="6'3&quot;">
            </div>
            <div class="form-group">
              <label>Weight</label>
              <input type="text" id="m-wt" placeholder="190 lbs">
            </div>
            <div class="form-group">
              <label>Photo URL / Upload</label>
              <div style="display:flex; gap:6px;">
                <input type="text" id="m-photo" placeholder="https://..." style="flex:1;">
                <button type="button" class="editor-btn editor-btn-accent" id="m-photo-btn">📷 File</button>
              </div>
            </div>
            <div class="form-group full">
              <label>Tactical Tags (Hand, Closeout, DTRAN, PNR, PIN/DHO, Rebound)</label>
              <input type="text" id="m-tactical" placeholder="Hand: R, C/O: Closeout, DTRAN: Locate...">
            </div>
            <div class="form-group full">
              <label>Scouting Notes / Tendencies</label>
              <textarea id="m-notes" rows="4" placeholder="Enter player tendencies and scouting breakdown..."></textarea>
            </div>
            <div class="form-group full">
              <label>Role Group</label>
              <select id="m-role">
                <option value="starter">⭐ Starter</option>
                <option value="key">Rotational &amp; Bench</option>
              </select>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="editor-btn" id="m-cancel">Cancel</button>
            <button type="submit" class="editor-btn editor-btn-primary">💾 Save Profile</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('m-cancel').onclick = () => {
      overlay.classList.remove('open');
    };

    let activeCard = null;

    window.openProfileModal = function(card) {
      activeCard = card;
      const headerText = card.querySelector('.player-header')?.innerText || '';
      const parts = headerText.split('•').map(s => s.trim());

      document.getElementById('m-number').value = (parts[0] || '').replace('#', '');
      document.getElementById('m-name').value = parts[1] || '';
      document.getElementById('m-pos').value = parts[2] || '';
      document.getElementById('m-ht').value = parts[3] || '';
      document.getElementById('m-wt').value = parts[4] || '';

      const img = card.querySelector('.photo-tile img');
      document.getElementById('m-photo').value = img ? img.src : '';
      
      const tactical = card.querySelector('.tactical-tags')?.innerText || '';
      document.getElementById('m-tactical').value = tactical.replace(/\n/g, ' ');

      const notes = card.querySelector('.scout-notes')?.innerHTML || '';
      document.getElementById('m-notes').value = notes.trim();

      document.getElementById('m-role').value = card.classList.contains('starter') ? 'starter' : 'key';

      overlay.classList.add('open');
    };

    document.getElementById('m-photo-btn').onclick = function() {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
          compressImageFile(file, function(dataUrl) {
            document.getElementById('m-photo').value = dataUrl;
          });
        }
      };
      fileInput.click();
    };

    document.getElementById('profile-edit-form').onsubmit = function(e) {
      e.preventDefault();
      if (!activeCard) return;

      const num = document.getElementById('m-number').value || '0';
      const name = document.getElementById('m-name').value || 'Player';
      const pos = document.getElementById('m-pos').value || 'G';
      const ht = document.getElementById('m-ht').value || `6'3"`;
      const wt = document.getElementById('m-wt').value || '190 lbs';

      const headerEl = activeCard.querySelector('.player-header');
      if (headerEl) headerEl.innerText = `#${num} • ${name} • ${pos} • ${ht} • ${wt}`;

      const photoUrl = document.getElementById('m-photo').value;
      const img = activeCard.querySelector('.photo-tile img');
      if (img && photoUrl) img.src = photoUrl;

      const tacticalEl = activeCard.querySelector('.tactical-tags');
      if (tacticalEl) tacticalEl.innerText = document.getElementById('m-tactical').value;

      const notesEl = activeCard.querySelector('.scout-notes');
      if (notesEl) notesEl.innerHTML = document.getElementById('m-notes').value;

      const newRole = document.getElementById('m-role').value;
      if (newRole === 'starter' && !activeCard.classList.contains('starter')) {
        activeCard.classList.remove('key');
        activeCard.classList.add('starter');
        const startersGrid = document.querySelectorAll('.grid')[0];
        if (startersGrid) startersGrid.appendChild(activeCard);
      } else if (newRole === 'key' && activeCard.classList.contains('starter')) {
        activeCard.classList.remove('starter');
        activeCard.classList.add('key');
        let benchGrid = document.querySelectorAll('.grid')[1];
        if (benchGrid) benchGrid.appendChild(activeCard);
      }

      overlay.classList.remove('open');
      showToast('Profile updated!');
      saveCardsSilently();
    };
  }

  function addBlankCard() {
    const grid = document.querySelector('.grid');
    if (!grid) return;

    const card = document.createElement('div');
    card.className = 'card key';
    card.style.position = 'relative';
    card.innerHTML = `
      <div class="photo-tile">
        <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='140'><rect width='120' height='140' fill='%23e0e0e0'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23555'>No Photo</text></svg>" alt="New Player">
      </div>
      <div class="card-info">
        <div class="player-header">#0 • NEW PLAYER • Pos • Ht • Wt</div>
        <div class="header-divider"></div>
        <div class="tactical-tags">
          <strong>Hand:</strong> R, <strong>C/O:</strong> Closeout, <strong>DTRAN:</strong> Locate
          <br><strong>PNR:</strong> Over/Switch, <strong>PIN/DHO:</strong> Over/Switch
          <br><strong>REBOUND:</strong> Box Out
        </div>
        <div class="scout-notes">
          Type player scouting notes, offensive/defensive tendencies, and key calls here...
        </div>
        <table class="stats-table">
          <thead>
            <tr>
              <th></th><th>PTS</th><th>MIN</th><th>FG%</th><th>3P%</th><th>FT%</th><th>REB</th><th>AST</th><th>TO</th><th>STL</th><th>BLK</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Last 5 Games</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
            </tr>
            <tr>
              <td>U Sports</td><td>0.0</td><td>0.0</td><td>0.0%</td><td>0.0%</td><td>0.0%</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    grid.appendChild(card);
    makeEditable(true);
    addEditorControls();
    showToast('New player card added!');
  }

  function syncToCloud(key, content) {
    fetch('/.netlify/functions/save-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, content })
    })
    .then(res => res.json())
    .then(data => {
      if (data && data.success) {
        showToast('Saved & synced live to all coaches & players!');
      }
    })
    .catch(err => console.error('Cloud sync save error:', err));
  }

  function saveCardsSilently() {
    const content = getCleanCardsHTML();
    if (content) {
      localStorage.setItem(storageKey, content);
      syncToCloud(storageKey, content);
    }
  }

  function saveCards() {
    makeEditable(false);
    removeEditorControls();

    const content = getCleanCardsHTML();
    if (content) {
      localStorage.setItem(storageKey, content);
      const btnReset = document.getElementById('btn-cards-reset');
      if (btnReset) btnReset.style.display = 'inline-flex';
      showToast('Scout cards saved & syncing live...');
      syncToCloud(storageKey, content);
    }

    editMode = false;
    document.getElementById('btn-cards-edit').style.display = 'inline-flex';
    document.getElementById('btn-cards-download').style.display = 'inline-flex';
    document.getElementById('btn-cards-upload-json').style.display = 'inline-flex';
    
    document.getElementById('btn-cards-add').style.display = 'none';
    document.getElementById('btn-cards-save').style.display = 'none';
    document.getElementById('btn-cards-cancel').style.display = 'none';
  }

  function cancelEdits() {
    if (confirm('Discard your unsaved edits?')) {
      window.location.reload();
    }
  }

  function resetCards() {
    if (confirm('Reset cards layout to original template? This will reset edits for all users.')) {
      localStorage.removeItem(storageKey);
      syncToCloud(storageKey, '');
      window.location.reload();
    }
  }

  function uploadCardsJSON() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.onchange = function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          try {
            const parsed = JSON.parse(evt.target.result);
            if (parsed.htmlContent) {
              restoreCardsHTML(parsed.htmlContent);
              const content = getCleanCardsHTML();
              localStorage.setItem(storageKey, content);
              syncToCloud(storageKey, content);
              showToast('Scout cards restored from JSON file!');
            } else {
              showToast('Invalid JSON file format.');
            }
          } catch(err) {
            showToast('Failed to parse JSON file.');
          }
        };
        reader.readAsText(file);
      }
    };
    fileInput.click();
  }

  function downloadHTML() {
    const docClone = document.documentElement.cloneNode(true);
    
    const bar = docClone.querySelector('#editor-bar');
    if (bar) bar.remove();
    
    const toast = docClone.querySelector('#editor-toast');
    if (toast) toast.remove();

    const overlay = docClone.querySelector('#profile-modal-overlay');
    if (overlay) overlay.remove();
    
    const editorScript = docClone.querySelector('script[src*="scout-cards-editor.js"]');
    if (editorScript) editorScript.remove();
    
    docClone.querySelectorAll('[contenteditable]').forEach(el => {
      el.removeAttribute('contenteditable');
    });
    
    docClone.querySelectorAll('.delete-card-btn, .role-toggle-btn, .card-reorder-group, .photo-upload-overlay, .edit-profile-btn').forEach(el => {
      el.remove();
    });

    const fullHTML = '<!doctype html>\n' + docClone.outerHTML;

    const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${teamSlug}-scout-cards.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Downloading HTML page...');
  }

  function showToast(msg) {
    const toast = document.getElementById('editor-toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }
})();
