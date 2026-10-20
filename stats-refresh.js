// Shared "Refresh Weekly USports Stats" button logic, used by index.html,
// players.html and the Canada West scouting hub page.
//
// How the refresh works: stats are written into the pages when Netlify builds
// the site, so the button asks /.netlify/functions/weekly-update to start a
// new Netlify build. The popup reports what really happened: started, or why
// it failed. It never claims the stats are updated before the rebuild runs.
//
// Pages need the #weekly-update-modal popup markup. Any element with the class
// "stats-updated-label" is filled with the date the stats were last refreshed.
(function () {
  function el(id) { return document.getElementById(id); }

  function setModal(opts) {
    var modal = el('weekly-update-modal');
    if (!modal) return;
    if (el('weekly-modal-icon')) el('weekly-modal-icon').textContent = opts.icon;
    if (el('weekly-modal-title')) el('weekly-modal-title').textContent = opts.title;
    if (el('weekly-modal-msg')) el('weekly-modal-msg').innerHTML = opts.msg;
    if (el('weekly-modal-loader')) el('weekly-modal-loader').style.display = opts.loading ? 'flex' : 'none';
    var det = el('weekly-modal-details');
    if (det) {
      det.innerHTML = opts.details || '';
      det.style.display = opts.details ? 'block' : 'none';
    }
    modal.style.display = 'block';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  window.openWeeklyUpdateModal = function () {
    setModal({
      icon: '🔄',
      title: 'Starting stats refresh...',
      msg: 'Asking Netlify to rebuild the site with the latest numbers from usportshoops.ca...',
      loading: true
    });
  };

  window.closeWeeklyUpdateModal = function () {
    try { localStorage.removeItem('hoops-weekly-update-active'); } catch (e) {}
    var modal = el('weekly-update-modal');
    if (modal) modal.style.display = 'none';
  };

  window.showWeeklyUpdateFinished = function (success, info) {
    if (success) {
      var when = info && info.requestedAt ? new Date(info.requestedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
      setModal({
        icon: '✅',
        title: info && info.alreadyRunning ? 'Stats refresh already running' : 'Stats refresh started',
        msg: 'Netlify is rebuilding the site with fresh 2026-27 stats for all 17 Canada West teams. ' +
             '<strong>This takes about 2-3 minutes.</strong> Reload the page after that to see the new numbers.',
        details:
          (when ? '<div>• Started: ' + escapeHtml(when) + '</div>' : '') +
          (info && info.alreadyRunning && info.message ? '<div>• ' + escapeHtml(info.message) + '</div>' : '') +
          '<div>• You can keep browsing while it runs.</div>' +
          '<div style="margin-top:5px; font-size:11px; opacity:0.8;">Note: usportshoops.ca sometimes takes a day to add the latest box scores.</div>'
      });
    } else {
      setModal({
        icon: '⚠️',
        title: 'Stats refresh did not start',
        msg: escapeHtml(info || 'The stats refresh could not be started.'),
        details: '<div>The stats on the site have <strong>not</strong> changed. Try again in a minute, or tell the head coach if this keeps happening.</div>'
      });
    }
  };

  window.updateUSportsWeeklyStats = function () {
    window.openWeeklyUpdateModal();
    fetch('/.netlify/functions/weekly-update', { method: 'POST' })
      .then(function (res) {
        return res.json().catch(function () {
          return { success: false, error: 'Unexpected response from the server (status ' + res.status + ').' };
        });
      })
      .then(function (data) {
        if (data && data.success) window.showWeeklyUpdateFinished(true, data);
        else window.showWeeklyUpdateFinished(false, (data && data.error) || 'The stats refresh could not be started.');
      })
      .catch(function () {
        window.showWeeklyUpdateFinished(false, 'Could not reach the server. Check your internet connection and try again.');
      });
  };

  // "Stats last refreshed: <date>" labels.
  function fillLabels() {
    var labels = document.querySelectorAll('.stats-updated-label');
    if (!labels.length) return;
    fetch('/data/stats-meta.json?t=' + Date.now())
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (meta) {
        if (!meta || !meta.updatedAt) return;
        var d = new Date(meta.updatedAt + (meta.updatedAt.length === 10 ? 'T12:00:00' : ''));
        var text = 'Stats last refreshed: ' + d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        if (typeof meta.macewanGamesPlayed === 'number') {
          text += ' (MacEwan: ' + meta.macewanGamesPlayed + ' game' + (meta.macewanGamesPlayed === 1 ? '' : 's') + ' counted)';
        }
        for (var i = 0; i < labels.length; i++) labels[i].textContent = text;
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fillLabels);
  else fillLabels();
})();
