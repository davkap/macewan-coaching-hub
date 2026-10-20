(function() {
  const isCoachOrAdmin = function() {
    if (typeof window.isCoachOrAdmin === 'function') {
      return window.isCoachOrAdmin();
    }
    const role = sessionStorage.getItem('griffin_hub_role');
    const isAdmin = sessionStorage.getItem('griffin_hub_admin') === 'true';
    const isCoachAuth = sessionStorage.getItem('griffin_coaches_authorized') === 'true';
    const isCoachRole = sessionStorage.getItem('griffin_hub_coach') === 'true' || role === 'coach';
    return isAdmin || isCoachAuth || isCoachRole || role === 'admin';
  };

  // If Coach or Admin, no lock overlay needed
  if (isCoachOrAdmin()) {
    return;
  }

  // If Player logged in, allow view in Read-Only Mode
  const applyPlayerView = function() {
    document.body.classList.add('player-read-only');

    // Add notification banner at top of practice plan page
    const banner = document.createElement('div');
    banner.className = 'player-readonly-banner';
    banner.style.cssText = 'background:#1a233a; color:#d1ad7d; text-align:center; padding:10px 16px; font-weight:600; font-size:13px; border-bottom:1px solid #2d3748; letter-spacing:0.02em; display:flex; align-items:center; justify-center:center; gap:8px;';
    banner.innerHTML = '🔒 <span><strong>Player View (Read-Only Mode)</strong> — Practice plan creation & editing is restricted to Coaches & Admin.</span>';

    const header = document.querySelector('header') || document.querySelector('.header') || document.body.firstChild;
    if (header && header.parentNode) {
      header.parentNode.insertBefore(banner, header);
    } else {
      document.body.prepend(banner);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyPlayerView);
  } else {
    applyPlayerView();
  }
})();
