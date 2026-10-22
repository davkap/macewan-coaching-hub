(function() {
  // Coach / Admin passwords are checked on the server by
  // /.netlify/functions/verify-access (they are set as Netlify environment
  // variables), so they never appear in this public file.

  // Roster players database (2026-27 season)
  const ROSTER_PLAYERS = [
    "Owen Hickey",
    "Jojo Muyo",
    "Khushal Shukla",
    "Joel Seke",
    "Elisha Ampofo",
    "Diego Presingular",
    "Noah Simon",
    "Judson Weir",
    "Dele Osuma",
    "Ryan Ziolkowski",
    "Wol Wol",
    "Favour Igbinyemi",
    "Abdi Musse",
    "Nathan Lefevre",
    "David Wilmes",
    "Otis Onink",
    "Peter-Aluk Deng",
    "Freddy Kapinga"
  ];

  function toSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  // Define global logout function
  window.logoutHub = function() {
    if (confirm("Are you sure you want to log out of the Coaching Hub?")) {
      sessionStorage.removeItem('griffin_hub_authorized');
      sessionStorage.removeItem('griffin_hub_admin');
      sessionStorage.removeItem('griffin_hub_coach');
      sessionStorage.removeItem('griffin_hub_player');
      sessionStorage.removeItem('griffin_hub_role');
      sessionStorage.removeItem('griffin_coaches_authorized');
      sessionStorage.removeItem('griffin_staff_token');
      sessionStorage.removeItem('griffin_member_token');
      sessionStorage.removeItem('hoops-hub:tracking-session-id');
      sessionStorage.removeItem('hoops-hub:tracking-player-name');
      sessionStorage.removeItem('hoops-hub:tracking-accumulated-seconds');
      localStorage.removeItem('hoops-offseason:current-player');
      window.location.reload();
    }
  };

  // Global role permissions helpers
  window.isCoachOrAdmin = function() {
    const role = sessionStorage.getItem('griffin_hub_role');
    const isAdmin = sessionStorage.getItem('griffin_hub_admin') === 'true';
    const isCoachAuth = sessionStorage.getItem('griffin_coaches_authorized') === 'true';
    const isCoachRole = sessionStorage.getItem('griffin_hub_coach') === 'true' || role === 'coach';
    return isAdmin || isCoachAuth || isCoachRole || role === 'admin';
  };

  window.isAdminOnly = function() {
    const role = sessionStorage.getItem('griffin_hub_role');
    const isAdmin = sessionStorage.getItem('griffin_hub_admin') === 'true';
    return isAdmin || role === 'admin';
  };

  window.isPlayerOnly = function() {
    return !window.isCoachOrAdmin();
  };

  // If already authenticated, apply player read-only mode class if applicable
  if (sessionStorage.getItem('griffin_hub_authorized') === 'true') {
    const applyReadOnly = () => {
      if (window.isPlayerOnly() && document.body) {
        document.body.classList.add('player-read-only');
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyReadOnly);
    } else {
      applyReadOnly();
    }
    return; // Already authenticated
  }
  
  // Dynamic path prefix detection
  let prefix = '';
  const path = window.location.pathname.toLowerCase();
  
  // Check nesting levels
  if (path.includes('/opponents/') && (path.includes('/scout-cards.html') || path.includes('/scouts/'))) {
    prefix = '../../';
  } else if (path.includes('/offseason-sc-app/') || path.includes('/practice-plans/')) {
    prefix = '../';
  }

  // Inject CSS immediately to hide page contents
  const style = document.createElement('style');
  style.id = 'griffin-lock-style';
  style.innerHTML = `
    #griffin-lock-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: #98002e; /* MacEwan Maroon */
      color: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 20px;
      box-sizing: border-box;
    }
    #griffin-lock-card {
      background: #000000;
      border: 2px solid #d1ad7d; /* MacEwan Gold */
      padding: 35px 30px;
      border-radius: 12px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    #griffin-lock-logo {
      width: 80px;
      height: 80px;
      margin-bottom: 20px;
      background: #ffffff;
      border-radius: 10px;
      padding: 5px;
      object-fit: contain;
    }
    #griffin-lock-title {
      margin: 0 0 8px 0;
      font-size: 1.6em;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    #griffin-lock-subtitle {
      margin: 0 0 24px 0;
      font-size: 0.85em;
      color: #d1ad7d;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-weight: 600;
    }
    #griffin-lock-select {
      width: 100%;
      padding: 12px 16px;
      font-size: 16px;
      border: 1px solid #d1ad7d;
      border-radius: 6px;
      background: #1c1c1c;
      color: #ffffff;
      margin-bottom: 16px;
      outline: none;
      box-sizing: border-box;
      cursor: pointer;
      text-align-last: center;
    }
    #griffin-lock-select option {
      background: #000000;
      color: #ffffff;
    }
    #griffin-lock-input {
      width: 100%;
      padding: 12px 16px;
      font-size: 16px;
      border: 1px solid #d1ad7d;
      border-radius: 6px;
      background: #1c1c1c;
      color: #ffffff;
      margin-bottom: 16px;
      text-align: center;
      outline: none;
      box-sizing: border-box;
    }
    #griffin-lock-input:focus, #griffin-lock-select:focus {
      border-color: #ffffff;
      box-shadow: 0 0 0 2px rgba(209,173,125,0.4);
    }
    #griffin-lock-button {
      width: 100%;
      padding: 12px;
      background: #98002e;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
    }
    #griffin-lock-button:hover {
      background: #b30036;
    }
    #griffin-lock-error {
      color: #ff4a4a;
      font-size: 0.88em;
      margin-top: 12px;
      display: none;
      font-weight: 500;
    }
    body > :not(#griffin-lock-overlay) {
      display: none !important;
    }
  `;
  document.head.appendChild(style);

  // When DOM is ready, show overlay
  document.addEventListener('DOMContentLoaded', function() {
    let players = [...ROSTER_PLAYERS];
    
    // Load Roster from public cache
    try {
      const cached = JSON.parse(localStorage.getItem('hoops-hub:cached-roster'));
      const isNewRoster = cached && Array.isArray(cached) && cached.some(p => p.name === 'Owen Hickey' || p.name === 'Freddy Kapinga' || p.name === 'Jojo Muyo');
      if (isNewRoster) {
        players = cached.map(p => p.name);
      } else {
        if (cached && !isNewRoster) {
          localStorage.removeItem('hoops-hub:cached-roster');
        }
        const custom = JSON.parse(localStorage.getItem('hoops-offseason:custom-players') || '[]');
        custom.forEach(name => {
          if (!players.includes(name)) players.push(name);
        });
      }
    } catch(e) {}

    const savedSlug = localStorage.getItem('hoops-offseason:current-player');
    
    function buildOptions(currentVal) {
      let html = '<option value="">-- Select Profile / Role --</option>';
      html += `<option value="coach" ${currentVal === 'coach' ? 'selected' : ''}>Coach / Staff</option>`;
      html += `<option value="admin" ${currentVal === 'admin' ? 'selected' : ''}>Admin / Head Coach</option>`;
      players.forEach(name => {
        const slug = toSlug(name);
        const selected = (slug === currentVal) ? 'selected' : '';
        html += `<option value="${slug}" ${selected}>${name}</option>`;
      });
      return html;
    }

    const overlay = document.createElement('div');
    overlay.id = 'griffin-lock-overlay';
    
    const logoSrc = prefix + 'macewan-logo.png';
    
    overlay.innerHTML = `
      <div id="griffin-lock-card">
        <img id="griffin-lock-logo" src="${logoSrc}" alt="MacEwan logo">
        <h2 id="griffin-lock-title">Coaching Hub Access</h2>
        <p id="griffin-lock-subtitle">MacEwan Griffins Basketball</p>
        <form id="griffin-lock-form">
          <select id="griffin-lock-select" required>
            ${buildOptions(savedSlug)}
          </select>
          <input type="password" id="griffin-lock-input" placeholder="Enter PIN or Password" autofocus required autocomplete="current-password">
          <button type="submit" id="griffin-lock-button">Unlock Hub</button>
          <div id="griffin-lock-error">Incorrect password. Please try again.</div>
        </form>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    const form = document.getElementById('griffin-lock-form');
    const select = document.getElementById('griffin-lock-select');
    const input = document.getElementById('griffin-lock-input');
    const errorDiv = document.getElementById('griffin-lock-error');
    const submitBtn = document.getElementById('griffin-lock-button');
    
    // Background fetch to sync roster cache and refresh dropdown in real-time
    const apiURL = typeof window.TRACKING_API_URL !== 'undefined' ? window.TRACKING_API_URL : (typeof TRACKING_API_URL !== 'undefined' ? TRACKING_API_URL : '');
    if (apiURL) {
      fetch(apiURL + "?action=getRoster")
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data) && data.length > 0) {
            localStorage.setItem('hoops-hub:cached-roster', JSON.stringify(data));
            players = data.map(p => p.name);
            const currentVal = select.value;
            select.innerHTML = buildOptions(currentVal);
          }
        })
        .catch(err => console.error("Lock-screen roster sync error:", err));
    }
    
    // Change placeholder depending on selection
    select.addEventListener('change', function() {
      if (select.value === 'coach') {
        input.placeholder = 'Enter Access Password';
      } else if (select.value === 'admin') {
        input.placeholder = 'Enter Admin Password';
      } else {
        input.placeholder = 'Enter your PIN';
      }
      input.focus();
    });

    // Initialize placeholder
    if (select.value === 'coach') {
      input.placeholder = 'Enter Access Password';
    } else if (select.value === 'admin') {
      input.placeholder = 'Enter Admin Password';
    } else if (select.value) {
      input.placeholder = 'Enter your PIN';
    }
    
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const val = select.value;
      const passVal = input.value;

      if (!val) {
        alert("Please select your profile / role.");
        return;
      }

      if (val === 'coach' || val === 'admin') {
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'Checking password...';
        submitBtn.disabled = true;
        errorDiv.style.display = 'none';

        fetch('/.netlify/functions/verify-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: val, password: passVal })
        })
        .then(res => res.json().catch(() => ({ ok: false, message: 'Unexpected server response (status ' + res.status + ').' })))
        .then(resData => {
          submitBtn.innerText = originalText;
          submitBtn.disabled = false;

          if (resData && resData.ok) {
            sessionStorage.setItem('griffin_hub_authorized', 'true');
            sessionStorage.setItem('griffin_hub_role', val);
            sessionStorage.setItem('griffin_hub_coach', 'true');
            sessionStorage.setItem('griffin_coaches_authorized', 'true');
            // Signed staff pass for staff-only data (quiz grades).
            if (resData.token) sessionStorage.setItem('griffin_staff_token', resData.token);
            else sessionStorage.removeItem('griffin_staff_token');
            if (val === 'admin') {
              sessionStorage.setItem('griffin_hub_admin', 'true');
              sessionStorage.setItem('hoops-hub:tracking-player-name', 'Admin');
            } else {
              sessionStorage.removeItem('griffin_hub_admin');
              sessionStorage.setItem('hoops-hub:tracking-player-name', 'Coach Access');
            }
            style.remove();
            overlay.remove();
            window.location.reload();
          } else {
            errorDiv.innerText = (resData && resData.message) || 'Incorrect password. Please try again.';
            errorDiv.style.display = 'block';
            input.value = '';
            input.focus();
          }
        })
        .catch(err => {
          console.error('Password check error:', err);
          submitBtn.innerText = originalText;
          submitBtn.disabled = false;
          errorDiv.innerText = 'Could not reach the login server. Check your internet connection and try again.';
          errorDiv.style.display = 'block';
        });
      } else {
        playerLogin(val, passVal);
      }
    });

    // ---- Player login: PINs are checked by netlify/functions/player-login.js
    function playerName(val) {
      return players.find(n => toSlug(n) === val) || val;
    }

    function finishPlayerLogin(val, prof, memberToken) {
      // Member pass: lets the player load private team data (Synergy numbers).
      if (memberToken) sessionStorage.setItem('griffin_member_token', memberToken);
      const name = (prof && prof.name) || playerName(val);
      let cached = null;
      try { cached = JSON.parse(localStorage.getItem(`hoops-offseason:profile:${val}`)); } catch (e) {}
      const playerProfile = {
        name: name,
        goal: (prof && prof.goal) || (cached && cached.goal) || 'hypertrophy',
        injuries: (prof && prof.injuries) || (cached && cached.injuries) || { knee: false, shoulder: false, back: false, ankle: false },
        cardioPref: (prof && prof.cardioPref) || (cached && cached.cardioPref) || 'court'
      };
      // The Google Sheet's copy of the PIN is only kept so the S&C app can keep
      // syncing goals/injuries to the Sheet; it is not used to log in any more.
      if (prof && prof.pin) playerProfile.pin = String(prof.pin);
      localStorage.setItem(`hoops-offseason:profile:${val}`, JSON.stringify(playerProfile));
      localStorage.setItem('hoops-offseason:current-player', val);
      sessionStorage.setItem('griffin_hub_authorized', 'true');
      sessionStorage.setItem('griffin_hub_role', 'player');
      sessionStorage.setItem('griffin_hub_player', 'true');
      sessionStorage.removeItem('griffin_staff_token');
      sessionStorage.removeItem('griffin_hub_admin');
      sessionStorage.removeItem('griffin_hub_coach');
      sessionStorage.removeItem('griffin_coaches_authorized');
      sessionStorage.setItem('hoops-hub:tracking-player-name', name);
      style.remove();
      overlay.remove();
      window.location.reload();
    }

    function showError(msg) {
      errorDiv.innerText = msg;
      errorDiv.style.display = 'block';
    }

    function playerLogin(val, passVal) {
      const originalText = submitBtn.innerText;
      submitBtn.innerText = 'Checking PIN...';
      submitBtn.disabled = true;
      errorDiv.style.display = 'none';
      fetch('/.netlify/functions/player-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', slug: val, pin: passVal })
      })
        .then(res => res.json().catch(() => ({ ok: false, message: 'Unexpected server response (status ' + res.status + ').' })))
        .then(d => {
          submitBtn.innerText = originalText;
          submitBtn.disabled = false;
          if (d && d.ok && d.mustChange) return showSetPin(val, d.changeToken, d.profile);
          if (d && d.ok) return finishPlayerLogin(val, d.profile, d.memberToken);
          showError((d && d.message) || 'Incorrect PIN. Please try again.');
          input.value = '';
          input.focus();
        })
        .catch(() => {
          submitBtn.innerText = originalText;
          submitBtn.disabled = false;
          showError('Could not reach the login server. Check your internet connection and try again.');
        });
    }

    // First login with the default PIN: the player picks his own.
    function showSetPin(val, changeToken, prof) {
      const card = document.getElementById('griffin-lock-card');
      card.innerHTML = `
        <img id="griffin-lock-logo" src="${logoSrc}" alt="MacEwan logo">
        <h2 id="griffin-lock-title">Choose your own PIN</h2>
        <p id="griffin-lock-subtitle" style="text-transform:none;letter-spacing:0;font-size:0.95em;">Hi ${playerName(val).split(' ')[0]}! 1234 is the team's starter PIN. Pick 4 to 6 digits only you know.</p>
        <form id="griffin-pin-form">
          <input type="password" id="griffin-new-pin" class="griffin-pin" placeholder="New PIN" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="new-password" required>
          <input type="password" id="griffin-new-pin2" class="griffin-pin" placeholder="Type it again" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="new-password" required>
          <button type="submit" id="griffin-lock-button">Save PIN and go in</button>
          <div id="griffin-lock-error"></div>
        </form>`;
      card.querySelectorAll('.griffin-pin').forEach(el => { el.style.cssText = 'width:100%;padding:12px 16px;font-size:16px;border:1px solid #d1ad7d;border-radius:6px;background:#1c1c1c;color:#fff;margin-bottom:12px;text-align:center;box-sizing:border-box;'; });
      const err = card.querySelector('#griffin-lock-error');
      const btn = card.querySelector('#griffin-lock-button');
      card.querySelector('#griffin-new-pin').focus();
      card.querySelector('#griffin-pin-form').addEventListener('submit', e => {
        e.preventDefault();
        const a = card.querySelector('#griffin-new-pin').value.trim();
        const b = card.querySelector('#griffin-new-pin2').value.trim();
        const fail = m => { err.innerText = m; err.style.display = 'block'; };
        if (!/^\d{4,6}$/.test(a)) return fail('Use 4 to 6 digits.');
        if (a === '1234' || /^(\d)\1+$/.test(a)) return fail('Pick something harder to guess than ' + a + '.');
        if (a !== b) return fail("The two PINs don't match.");
        btn.disabled = true; btn.innerText = 'Saving...';
        fetch('/.netlify/functions/player-login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'setPin', slug: val, changeToken, newPin: a })
        })
          .then(r => r.json().catch(() => ({ ok: false })))
          .then(d => {
            if (d && d.ok) return finishPlayerLogin(val, prof, d.memberToken);
            btn.disabled = false; btn.innerText = 'Save PIN and go in';
            fail((d && d.message) || 'Could not save your PIN. Try again.');
          })
          .catch(() => { btn.disabled = false; btn.innerText = 'Save PIN and go in'; fail('Could not reach the server. Try again.'); });
      });
    }
  });

  // The old stats-refresh popup stored a fake "updated" state here and showed it
  // on every page. The refresh status now lives in /stats-refresh.js, so clear
  // any leftover state from browsers that used the old version.
  try { localStorage.removeItem('hoops-weekly-update-active'); } catch (e) {}
})();
