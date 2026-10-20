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
        input.placeholder = 'Enter PIN (default: 1234)';
      }
      input.focus();
    });

    // Initialize placeholder
    if (select.value === 'coach') {
      input.placeholder = 'Enter Access Password';
    } else if (select.value === 'admin') {
      input.placeholder = 'Enter Admin Password';
    } else if (select.value) {
      input.placeholder = 'Enter PIN (default: 1234)';
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
        // Player login: query Google Apps Script if online, otherwise use local storage fallback
        if (apiURL) {
          const originalText = submitBtn.innerText;
          submitBtn.innerText = "Verifying PIN...";
          submitBtn.disabled = true;

          fetch(apiURL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: 'verifyPlayerPin',
              slug: val,
              pin: passVal
            })
          })
          .then(res => res.json())
          .then(resData => {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;

            if (resData && resData.status === "success") {
              const p = resData.profile;
              const playerProfile = {
                name: p.name,
                pin: p.pin,
                goal: p.goal || 'hypertrophy',
                injuries: p.injuries || { knee: false, shoulder: false, back: false, ankle: false },
                cardioPref: p.cardioPref || 'court'
              };
              localStorage.setItem(`hoops-offseason:profile:${val}`, JSON.stringify(playerProfile));
              localStorage.setItem('hoops-offseason:current-player', val);
              sessionStorage.setItem('griffin_hub_authorized', 'true');
              sessionStorage.setItem('griffin_hub_role', 'player');
              sessionStorage.setItem('griffin_hub_player', 'true'); sessionStorage.removeItem('griffin_staff_token');
              sessionStorage.removeItem('griffin_hub_admin');
              sessionStorage.removeItem('griffin_hub_coach');
              sessionStorage.removeItem('griffin_coaches_authorized');
              sessionStorage.setItem('hoops-hub:tracking-player-name', p.name);
              style.remove();
              overlay.remove();
              window.location.reload();
            } else {
              errorDiv.innerText = resData.message || 'Incorrect PIN. Please try again.';
              errorDiv.style.display = 'block';
              input.value = '';
              input.focus();
            }
          })
          .catch(err => {
            console.error("Server-side PIN verification error:", err);
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
            
            // Offline/Local fallback
            executeLocalLogin(val, passVal);
          });
        } else {
          executeLocalLogin(val, passVal);
        }
      }
    });

    function executeLocalLogin(val, passVal) {
      const localKey = `hoops-offseason:profile:${val}`;
      let playerProfile = null;
      try {
        playerProfile = JSON.parse(localStorage.getItem(localKey));
      } catch(err) {}

      if (!playerProfile) {
        if (passVal === '1234') {
          const playerName = players.find(n => toSlug(n) === val);
          playerProfile = {
            name: playerName,
            pin: '1234',
            goal: 'hypertrophy',
            injuries: { knee: false, shoulder: false, back: false, ankle: false },
            cardioPref: 'court'
          };
          localStorage.setItem(localKey, JSON.stringify(playerProfile));
          
          localStorage.setItem('hoops-offseason:current-player', val);
          sessionStorage.setItem('griffin_hub_authorized', 'true');
          sessionStorage.setItem('griffin_hub_role', 'player');
          sessionStorage.setItem('griffin_hub_player', 'true'); sessionStorage.removeItem('griffin_staff_token');
          sessionStorage.removeItem('griffin_hub_admin');
          sessionStorage.removeItem('griffin_hub_coach');
          sessionStorage.removeItem('griffin_coaches_authorized');
          sessionStorage.setItem('hoops-hub:tracking-player-name', playerName);
          style.remove();
          overlay.remove();
          window.location.reload();
        } else {
          errorDiv.innerText = 'Incorrect PIN. The default PIN for new profiles is 1234.';
          errorDiv.style.display = 'block';
          input.value = '';
          input.focus();
        }
      } else {
        if (playerProfile.pin === passVal) {
          localStorage.setItem('hoops-offseason:current-player', val);
          sessionStorage.setItem('griffin_hub_authorized', 'true');
          sessionStorage.setItem('griffin_hub_role', 'player');
          sessionStorage.setItem('griffin_hub_player', 'true'); sessionStorage.removeItem('griffin_staff_token');
          sessionStorage.removeItem('griffin_hub_admin');
          sessionStorage.removeItem('griffin_hub_coach');
          sessionStorage.removeItem('griffin_coaches_authorized');
          sessionStorage.setItem('hoops-hub:tracking-player-name', playerProfile.name);
          style.remove();
          overlay.remove();
          window.location.reload();
        } else {
          errorDiv.innerText = 'Incorrect PIN. Please try again.';
          errorDiv.style.display = 'block';
          input.value = '';
          input.focus();
        }
      }
    }
  });

  // The old stats-refresh popup stored a fake "updated" state here and showed it
  // on every page. The refresh status now lives in /stats-refresh.js, so clear
  // any leftover state from browsers that used the old version.
  try { localStorage.removeItem('hoops-weekly-update-active'); } catch (e) {}
})();
