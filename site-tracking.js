(function() {
  // --- PLAYER ACTIVITY TRACKING FOR MAIN HUB & SUBPAGES ---
  let hubSessionId = null;
  let hubActiveStartTime = null;
  let hubInterval = null;
  let hubAccumulatedSeconds = 0;
  let isHubTrackingActive = false;

  // Determine page category based on document title / url path
  let pageName = document.title || window.location.pathname;
  if (pageName.includes("Practice Plan Builder")) {
    pageName = "Practice Plan Builder";
  } else if (pageName.includes("Canada West") || pageName.includes("canadawest-scout")) {
    pageName = "Canada West Scout Hub";
  } else if (pageName.includes("Drills")) {
    pageName = "Drills Database";
  } else if (pageName.includes("Scout Cards Editor") || pageName.includes("Opponent Scout")) {
    pageName = "Scout Cards Editor";
  } else if (pageName.includes("Coaching Hub") || pageName.includes("Griffins Men's Basketball")) {
    pageName = "Main Dashboard Hub";
  }

  function getApiURL() {
    return typeof window.TRACKING_API_URL !== 'undefined' ? window.TRACKING_API_URL : (typeof TRACKING_API_URL !== 'undefined' ? TRACKING_API_URL : '');
  }

  function sendHubTrackingEvent(payload) {
    const apiURL = getApiURL();
    if (!apiURL || apiURL.trim() === '') return;
    
    fetch(apiURL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(e => console.error("Tracking error:", e));
  }

  function startHubTracking() {
    const apiURL = getApiURL();
    if (!apiURL || apiURL.trim() === '') return;
    if (isHubTrackingActive) return;

    // Retrieve player name from shared S&C local storage (if logged in on this browser)
    let playerName = "Guest / Coach";
    try {
      const slug = localStorage.getItem('hoops-offseason:current-player');
      if (slug) {
        const profile = JSON.parse(localStorage.getItem(`hoops-offseason:profile:${slug}`));
        if (profile && profile.name) {
          playerName = profile.name;
        }
      }
    } catch(e) {}

    // Check if session already exists in sessionStorage (keeps session unified across page transitions)
    hubSessionId = sessionStorage.getItem('hoops-hub:tracking-session-id');
    if (!hubSessionId) {
      hubSessionId = Date.now() + '_hub_' + Math.floor(Math.random() * 10000);
      sessionStorage.setItem('hoops-hub:tracking-session-id', hubSessionId);
      sessionStorage.setItem('hoops-hub:tracking-player-name', playerName);
      sessionStorage.setItem('hoops-hub:tracking-accumulated-seconds', '0');

      sendHubTrackingEvent({
        action: 'hub_login',
        sessionId: hubSessionId,
        playerName: playerName,
        page: pageName,
        timestamp: new Date().toISOString()
      });
    } else {
      hubAccumulatedSeconds = parseInt(sessionStorage.getItem('hoops-hub:tracking-accumulated-seconds') || '0', 10);
      
      // Update page name since they transitioned to a new subpage in the same session
      sendHubTrackingEvent({
        action: 'hub_heartbeat',
        sessionId: hubSessionId,
        playerName: playerName,
        page: pageName,
        durationSeconds: hubAccumulatedSeconds
      });
    }

    isHubTrackingActive = true;
    hubActiveStartTime = Date.now();

    if (hubInterval) clearInterval(hubInterval);
    hubInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const delta = Math.floor((now - hubActiveStartTime) / 1000);
        hubActiveStartTime = now;

        hubAccumulatedSeconds += delta;
        sessionStorage.setItem('hoops-hub:tracking-accumulated-seconds', hubAccumulatedSeconds.toString());

        sendHubTrackingEvent({
          action: 'hub_heartbeat',
          sessionId: hubSessionId,
          playerName: playerName,
          page: pageName,
          durationSeconds: hubAccumulatedSeconds
        });
      } else {
        hubActiveStartTime = Date.now();
      }
    }, 30000); // 30 seconds heartbeat
  }

  function stopHubTracking() {
    if (!isHubTrackingActive) return;

    const now = Date.now();
    const delta = Math.floor((now - hubActiveStartTime) / 1000);
    hubAccumulatedSeconds += delta;

    if (hubInterval) {
      clearInterval(hubInterval);
      hubInterval = null;
    }

    const playerName = sessionStorage.getItem('hoops-hub:tracking-player-name');
    const finalSessionId = hubSessionId;

    // Save the accumulated seconds in sessionStorage before unloading so the next page knows the starting duration
    sessionStorage.setItem('hoops-hub:tracking-accumulated-seconds', hubAccumulatedSeconds.toString());

    isHubTrackingActive = false;
    hubSessionId = null;

    const apiURL = getApiURL();
    if (apiURL && apiURL.trim() !== '') {
      sendHubTrackingEvent({
        action: 'hub_logout',
        sessionId: finalSessionId,
        playerName: playerName,
        page: pageName,
        durationSeconds: hubAccumulatedSeconds
      });
    }
  }

  // Handle page visibility changes (pauses timer when tab is hidden)
  document.addEventListener('visibilitychange', () => {
    if (isHubTrackingActive) {
      if (document.visibilityState === 'visible') {
        hubActiveStartTime = Date.now();
      } else {
        const now = Date.now();
        const delta = Math.floor((now - hubActiveStartTime) / 1000);
        hubAccumulatedSeconds += delta;
        sessionStorage.setItem('hoops-hub:tracking-accumulated-seconds', hubAccumulatedSeconds.toString());

        sendHubTrackingEvent({
          action: 'hub_heartbeat',
          sessionId: hubSessionId,
          playerName: sessionStorage.getItem('hoops-hub:tracking-player-name'),
          page: pageName,
          durationSeconds: hubAccumulatedSeconds
        });
      }
    }
  });

  // Helper for tracking clicks on external links
  window.trackExternalClick = function(linkLabel, targetUrl) {
    const apiURL = getApiURL();
    if (!apiURL || apiURL.trim() === '') return;
    
    let playerName = "Guest / Coach";
    try {
      const slug = localStorage.getItem('hoops-offseason:current-player');
      if (slug) {
        const profile = JSON.parse(localStorage.getItem(`hoops-offseason:profile:${slug}`));
        if (profile && profile.name) {
          playerName = profile.name;
        }
      }
    } catch(e) {}

    // Fallback to Session storage name if coach/admin
    if (playerName === "Guest / Coach") {
      const savedName = sessionStorage.getItem('hoops-hub:tracking-player-name');
      if (savedName) {
        playerName = savedName;
      }
    }

    const sessionId = sessionStorage.getItem('hoops-hub:tracking-session-id') || (Date.now() + '_hub_' + Math.floor(Math.random() * 10000));

    sendHubTrackingEvent({
      action: 'hub_click',
      sessionId: sessionId,
      playerName: playerName,
      page: pageName,
      timestamp: new Date().toISOString(),
      clickTarget: linkLabel,
      clickUrl: targetUrl
    });
  };

  // Handle page unloads
  window.addEventListener('pagehide', () => {
    stopHubTracking();
  });
  window.addEventListener('beforeunload', () => {
    stopHubTracking();
  });

  // Start tracking session automatically
  // Run on window load to ensure all configs (TRACKING_API_URL) are initialized first
  if (document.readyState === 'complete') {
    startHubTracking();
  } else {
    window.addEventListener('load', startHubTracking);
  }
})();
