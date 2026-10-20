(function () {
  const view = document.getElementById('view');
  const tabs = document.getElementById('tabs');
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalVideo = document.getElementById('modalVideo');
  const modalCues = document.getElementById('modalCues');
  const profileTabBtn = document.getElementById('profileTabBtn');
  
  document.getElementById('modalClose').onclick = closeModal;
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // Roster database
  const ROSTER_PLAYERS = [
    "Marcus Love-Moore",
    "Nathanael Ntumba",
    "Khushal Shukla",
    "Sam Richardson",
    "Elisha Ampofo",
    "Diego Presingular",
    "Quinn Boyington",
    "Judson Weir",
    "Dele Osuma",
    "Mawien Mondyhar",
    "Hugo Alonso",
    "Favour Igbinyemi",
    "Job Janda",
    "Milan Jaksic",
    "Damilola Osuma",
    "Joel Seke",
    "Justace Byam"
  ];

  function getAllPlayers() {
    try {
      const cached = JSON.parse(localStorage.getItem('hoops-hub:cached-roster'));
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return cached.map(p => p.name);
      }
    } catch(e) {}
    
    let custom = [];
    try {
      custom = JSON.parse(localStorage.getItem('hoops-offseason:custom-players') || '[]');
    } catch (e) {}
    const combined = [...ROSTER_PLAYERS];
    custom.forEach(name => {
      if (!combined.includes(name)) {
        combined.push(name);
      }
    });
    return combined;
  }

  function openVideo(name, ytId, cues) {
    modalTitle.textContent = name;
    modalVideo.src = ytEmbed(ytId);
    modalCues.textContent = cues || '';
    modal.classList.remove('hidden');
  }
  function closeModal() {
    modal.classList.add('hidden');
    modalVideo.src = '';
  }

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function renderExerciseRow(it) {
    const isModClass = it.isMod ? 'style="border-color:var(--accent2); background:rgba(209,173,125,0.04)"' : '';
    const modBadge = it.isMod ? '<span class="mod-badge">Injury Mod</span>' : '';
    const row = el(`
      <div class="exercise" role="button" tabindex="0" ${isModClass}>
        <div>
          <div class="name">${it.ex} ${modBadge}</div>
          <div class="meta">${it.cues || ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="sets">${it.sets}</div>
          <div class="play" title="Watch demo">▶</div>
        </div>
      </div>`);
    const open = () => openVideo(it.ex.replace(' ⚠️', ''), it.yt, it.cues);
    row.addEventListener('click', open);
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    return row;
  }

  function renderWorkout(w) {
    const wrap = document.createElement('div');
    wrap.appendChild(el(`<h2>${w.title}</h2>`));
    wrap.appendChild(el(`<p class="lead">Tap any exercise for the demo video and form cues.</p>`));
    w.blocks.forEach(block => {
      if (typeof block === 'object' && block.name) {
        const card = el(`<div class="card"><h3>${block.name}</h3></div>`);
        block.items.forEach(it => card.appendChild(renderExerciseRow(it)));
        wrap.appendChild(card);
      }
    });
    if (w.notes) wrap.appendChild(el(`<div class="card"><h3>📝 Coach's Note</h3><p class="cues">${w.notes}</p></div>`));
    const inlineNotes = w.blocks.find(b => b && b.notes);
    if (inlineNotes) wrap.appendChild(el(`<div class="card"><h3>📝 Coach's Note</h3><p class="cues">${inlineNotes.notes}</p></div>`));
    return wrap;
  }

  // Profile persistence logic
  function toSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  function getActivePlayerSlug() {
    return localStorage.getItem('hoops-offseason:current-player');
  }

  function getActiveProfile() {
    const slug = getActivePlayerSlug();
    if (!slug) return null;
    try {
      return JSON.parse(localStorage.getItem(`hoops-offseason:profile:${slug}`));
    } catch {
      return null;
    }
  }

  function saveProfile(slug, profile) {
    localStorage.setItem(`hoops-offseason:profile:${slug}`, JSON.stringify(profile));
    
    // Server Sync
    const apiURL = typeof window.TRACKING_API_URL !== 'undefined' ? window.TRACKING_API_URL : '';
    if (apiURL) {
      fetch(apiURL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'updatePlayerProfile',
          slug: slug,
          profile: profile
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.status !== "success") {
          console.error("Profile sync error on server:", data.message);
        }
      })
      .catch(err => console.error("Profile sync failed:", err));
    }
  }

  // Update Profile Tab Button text
  function updateProfileBtnLabel() {
    const profile = getActiveProfile();
    if (profile) {
      profileTabBtn.textContent = `👤 ${profile.name.split(' ')[0]}`;
    } else {
      profileTabBtn.textContent = `👤 Login`;
    }
  }

  // Workout adaptation logic
  function adaptWorkout(baseWorkout, profile) {
    if (!profile) return baseWorkout;
    
    // Deep clone base workout
    const w = JSON.parse(JSON.stringify(baseWorkout));
    
    w.blocks.forEach(block => {
      if (block.items) {
        block.items = block.items.map(item => {
          let adapted = { ...item };
          let replaced = false;
          let notes = [];

          // 1. KNEE INJURY MODS
          if (profile.injuries.knee) {
            if (adapted.ex === "Back Squat") {
              adapted.ex = "Leg Press (knee-friendly angle)";
              adapted.yt = YT.legPress;
              notes.push("Knee friendly leg press.");
              replaced = true;
            } else if (adapted.ex === "Bulgarian Split Squat" || adapted.ex === "Reverse Lunge") {
              adapted.ex = "Goblet Squat (light, chest upright)";
              adapted.yt = YT.frontSquat;
              notes.push("Supported Goblet Squat.");
              replaced = true;
            } else if (adapted.ex === "Box Jump" || adapted.ex === "Broad Jump") {
              adapted.ex = "Step-Up (controlled, high density)";
              adapted.yt = YT.walkingLunge;
              notes.push("Impact-free step ups.");
              replaced = true;
            }
          }

          // 2. SHOULDER INJURY MODS
          if (profile.injuries.shoulder) {
            if (adapted.ex === "Overhead Press" || adapted.ex === "Push Press") {
              adapted.ex = "Landmine Press (neutral grip)";
              adapted.yt = YT.inclineDB;
              notes.push("Rotator-friendly landmine press.");
              replaced = true;
            } else if (adapted.ex === "Bench Press") {
              adapted.ex = "Floor Press (restricted range)";
              adapted.yt = YT.benchPress;
              notes.push("Shoulder-friendly floor press.");
              replaced = true;
            } else if (adapted.ex === "Dips") {
              adapted.ex = "Push-up (hands elevated)";
              adapted.yt = YT.pushup;
              notes.push("Shoulder-friendly push-up.");
              replaced = true;
            }
          }

          // 3. BACK INJURY MODS
          if (profile.injuries.back) {
            if (adapted.ex === "Back Squat") {
              adapted.ex = "Front Squat / Goblet Squat";
              adapted.yt = YT.frontSquat;
              notes.push("Reduced compression load.");
              replaced = true;
            } else if (adapted.ex === "Trap Bar Deadlift") {
              adapted.ex = "Hip Thrust (heavy hold)";
              adapted.yt = YT.hipThrust;
              notes.push("Hip thrust replaces deadlift.");
              replaced = true;
            } else if (adapted.ex === "Romanian Deadlift") {
              adapted.ex = "Leg Curl (eccentric focus)";
              adapted.yt = YT.legCurl;
              notes.push("Glute/ham isolation without spinal loading.");
              replaced = true;
            }
          }

          // 4. ANKLE INJURY MODS
          if (profile.injuries.ankle) {
            if (adapted.ex === "Suicides (full court)" || adapted.ex === "17s (sideline to sideline)") {
              adapted.ex = "Air Bike Intervals";
              adapted.yt = YT.airBike;
              notes.push("Low impact conditioning.");
              replaced = true;
            } else if (adapted.ex === "Box Jump" || adapted.ex === "Broad Jump") {
              adapted.ex = "Medicine Ball Slam";
              adapted.yt = YT.airBike; // neutral video
              notes.push("No impact power drills.");
              replaced = true;
            }
          }

          if (replaced) {
            adapted.cues = (adapted.cues ? adapted.cues + " | " : "") + notes.join(" ");
            adapted.ex = adapted.ex + " ⚠️";
            adapted.isMod = true;
          }

          // Goal Adjustments
          if (profile.goal === "strength") {
            if (adapted.ex.includes("Back Squat") || adapted.ex.includes("Deadlift") || adapted.ex.includes("Bench Press") || adapted.ex.includes("Press")) {
              if (!adapted.isMod) {
                adapted.sets = "5 x 3 (Heavy)";
                adapted.cues = (adapted.cues ? adapted.cues + " | " : "") + "Strength Goal: Lift heavy, focus on mechanical tension.";
              }
            }
          } else if (profile.goal === "conditioning") {
            if (!adapted.isMod && (adapted.sets.includes("3 x 8") || adapted.sets.includes("3 x 10") || adapted.sets.includes("3 x 12"))) {
              adapted.sets = "3 x 15";
              adapted.cues = (adapted.cues ? adapted.cues + " | " : "") + "Conditioning Goal: Higher volume, short rest.";
            }
          }

          return adapted;
        });
      }
    });

    // Cardio pref logic
    if (profile.cardioPref === "lowImpact" && w.title.includes("Cardio")) {
      w.blocks.forEach(block => {
        if (block.name && block.name.includes("Main Work")) {
          block.items = block.items.map(item => {
            if (item.ex.includes("Suicides") || item.ex.includes("17s") || item.ex.includes("Shuttle")) {
              return {
                ex: "Air Bike / Rower Intervals ⚠️",
                sets: "10 x 30s on / 90s off",
                yt: YT.airBike,
                cues: "Cardio Pref: Low-impact active. Max effort sprints."
              };
            }
            return item;
          });
        }
      });
    }

    return w;
  }

  // ---- Player choice persistence (Tue/Thu cardio-or-rest, Sat/Sun sport-or-rest)
  const CHOICE_KEY = 'hoops-offseason:choices';
  function loadChoices() {
    try { return JSON.parse(localStorage.getItem(CHOICE_KEY) || '{}'); } catch { return {}; }
  }
  function saveChoice(dayKey, optionId) {
    const c = loadChoices();
    c[dayKey] = optionId;
    localStorage.setItem(CHOICE_KEY, JSON.stringify(c));
  }
  function choiceKeyFor(dayObj) {
    const d = new Date();
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    return `${d.getFullYear()}W${week}-${dayObj.day}`;
  }

  function renderChoiceSelector(dayObj, onPick) {
    const wrap = document.createElement('div');
    wrap.appendChild(el(`<h2>${dayObj.day} — ${dayObj.title}</h2>`));
    wrap.appendChild(el(`<p class="lead">Pick what you're doing today. Tap a card.</p>`));
    const grid = el(`<div class="day-grid"></div>`);
    dayObj.options.forEach(opt => {
      const tile = el(`<button class="day-tile">
        <div class="d">${opt.label.toUpperCase()}</div>
        <div class="t"><span class="tag ${opt.tag}">${opt.tagText}</span></div>
      </button>`);
      tile.addEventListener('click', () => {
        saveChoice(choiceKeyFor(dayObj), opt.id);
        onPick(opt);
      });
      grid.appendChild(tile);
    });
    wrap.appendChild(grid);
    wrap.appendChild(el(`<p class="lead" style="margin-top:14px;opacity:.7;font-size:13px">Your pick is remembered for this week. You can change it any time.</p>`));
    return wrap;
  }

  function renderChosenWorkout(dayObj, optionId) {
    const wrap = document.createElement('div');
    const opt = dayObj.options.find(o => o.id === optionId);
    const switchBar = el(`<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div><b>${dayObj.day}</b> — you picked <span class="tag ${opt.tag}">${opt.tagText}</span></div>
      <button class="day-tile" style="max-width:140px;margin:0" id="changePick">Change pick</button>
    </div>`);
    wrap.appendChild(switchBar);
    
    // Adapt chosen workout
    const profile = getActiveProfile();
    const adaptedWorkout = adaptWorkout(PROGRAM.workouts[optionId], profile);
    wrap.appendChild(renderWorkout(adaptedWorkout));
    return wrap;
  }

  function todayIndex() {
    const js = new Date().getDay();
    return js === 0 ? 6 : js - 1;
  }

  function showInjuryAlert(profile) {
    if (!profile) return '';
    const activeInjuries = Object.keys(profile.injuries).filter(k => profile.injuries[k]);
    if (activeInjuries.length === 0) return '';
    
    return `
      <div class="alert-box">
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <strong>Injury Modification Active:</strong> Program adjusted for <strong>${activeInjuries.join(', ')}</strong> injury/limitations. Focus on clean forms and pain-free movements.
        </div>
      </div>
    `;
  }

  function viewToday() {
    view.innerHTML = '';
    const idx = todayIndex();
    const today = PROGRAM.week[idx];
    const profile = getActiveProfile();

    // Prompt to log in on mobile/desktop if not logged in
    if (!profile) {
      const loginPrompt = el(`<div class="card" style="border-color:var(--accent2); background:rgba(209,173,125,0.06); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:12px; padding:16px 20px;">
        <div style="flex:1; min-width:200px;">
          <h3 style="color:var(--accent2); margin:0; font-size:16px; display:flex; align-items:center; gap:6px;">🔒 Personalized Program</h3>
          <p style="margin:4px 0 0; font-size:13px; color:var(--mute); line-height:1.4;">Log in to load your custom S&C plan and log goals/injuries.</p>
        </div>
        <button id="promptLoginBtn" class="btn-sc" style="flex:0 0 auto; padding:8px 16px; font-size:13px; width:100%; max-width:120px;">Log In</button>
      </div>`);
      view.appendChild(loginPrompt);
      
      loginPrompt.querySelector('#promptLoginBtn').addEventListener('click', () => {
        // Switch tab to profile
        [...tabs.querySelectorAll('button')].forEach(x => x.classList.remove('active'));
        const profileBtn = document.getElementById('profileTabBtn');
        profileBtn.classList.add('active');
        viewProfile();
        window.scrollTo(0,0);
      });
    }

    const titleForBanner = today.title;
    const banner = el(`<div class="banner">
      <h2>${today.day} — ${titleForBanner}</h2>
      <p>${PROGRAM.meta.name} • Week-by-week</p>
    </div>`);
    view.appendChild(banner);

    // Show injury warning box if active
    const injuryAlertHtml = showInjuryAlert(profile);
    if (injuryAlertHtml) {
      view.appendChild(el(injuryAlertHtml));
    }

    // Always show daily mobility prompt at top
    view.appendChild(el(`<div class="card" style="border-color:rgba(255,106,0,.4)">
      <h3>🧘 Daily Mobility <span class="tag hot">EVERY DAY</span></h3>
      <p class="lead" style="margin:6px 0 0">10–15 min. Hit the Mobility tab. Hips and ankles win games.</p>
    </div>`));

    if (today.type === 'choice') {
      const key = choiceKeyFor(today);
      const picked = loadChoices()[key];
      const renderForChoice = (optId) => {
        const container = view.querySelector('#choiceContainer');
        container.innerHTML = '';
        container.appendChild(renderChosenWorkout(today, optId));
        container.querySelector('#changePick').addEventListener('click', () => {
          const c = loadChoices(); delete c[key];
          localStorage.setItem(CHOICE_KEY, JSON.stringify(c));
          container.innerHTML = '';
          container.appendChild(renderChoiceSelector(today, (opt) => renderForChoice(opt.id)));
        });
      };
      const container = el(`<div id="choiceContainer"></div>`);
      view.appendChild(container);
      if (picked && PROGRAM.workouts[picked]) {
        renderForChoice(picked);
      } else {
        container.appendChild(renderChoiceSelector(today, (opt) => renderForChoice(opt.id)));
      }
      return;
    }

    const targetWorkoutId = today.type === 'rest' ? 'rest' : today.id;
    const adapted = adaptWorkout(PROGRAM.workouts[targetWorkoutId], profile);
    view.appendChild(renderWorkout(adapted));
  }

  function viewWeek() {
    view.innerHTML = '';
    const profile = getActiveProfile();
    
    view.appendChild(el(`<h2>The Week</h2>`));
    view.appendChild(el(`<p class="lead">${PROGRAM.meta.split} • ${PROGRAM.meta.weeks}-week block</p>`));

    const injuryAlertHtml = showInjuryAlert(profile);
    if (injuryAlertHtml) {
      view.appendChild(el(injuryAlertHtml));
    }

    const grid = el(`<div class="day-grid"></div>`);
    PROGRAM.week.forEach((d, i) => {
      const cls = d.type === 'rest' ? 'day-tile rest' : 'day-tile';
      const subtitle = d.type === 'choice'
        ? d.options.map(o => o.label).join(' / ')
        : d.title;
      const tile = el(`<button class="${cls}">
        <div class="d">${d.day.slice(0,3)}</div>
        <div class="t">${subtitle}</div>
      </button>`);
      tile.addEventListener('click', () => {
        view.innerHTML = '';
        view.appendChild(el(`<button class="day-tile" style="margin-bottom:14px;max-width:140px" id="back">← All days</button>`));
        document.getElementById('back').addEventListener('click', viewWeek);
        if (d.type === 'choice') {
          const wrap = document.createElement('div');
          wrap.appendChild(el(`<h2>${d.day} — ${d.title}</h2>`));
          wrap.appendChild(el(`<p class="lead">Player picks. Both options below — preview either one.</p>`));
          d.options.forEach(opt => {
            wrap.appendChild(el(`<h3 style="margin-top:18px">${opt.label} <span class="tag ${opt.tag}">${opt.tagText}</span></h3>`));
            wrap.appendChild(renderWorkout(adaptWorkout(PROGRAM.workouts[opt.id], profile)));
          });
          view.appendChild(wrap);
        } else {
          view.appendChild(renderWorkout(adaptWorkout(PROGRAM.workouts[d.id], profile)));
        }
        window.scrollTo(0,0);
      });
      grid.appendChild(tile);
    });
    view.appendChild(grid);

    view.appendChild(el(`<div class="card">
      <h3>🎯 The Goal</h3>
      <p class="cues">${PROGRAM.meta.goal}</p>
      <div class="kv">
        <span>Mass</span><span>3 progressive sets in the 6–12 rep range</span>
        <span>Hips</span><span>Daily mobility — non-negotiable</span>
        <span>Speed</span><span>Conditioning 2x/week, no more</span>
        <span>Rest</span><span>2–3 min between heavy sets</span>
      </div>
    </div>`));
  }

  function viewMobility() {
    view.innerHTML = '';
    const m = PROGRAM.mobility;
    view.appendChild(el(`<h2>${m.title}</h2>`));
    view.appendChild(el(`<p class="lead">${m.intro}</p>`));
    
    // Adapt mobility exercises (ankle focus)
    const profile = getActiveProfile();
    const itemsCloned = JSON.parse(JSON.stringify(m.items));
    const items = itemsCloned.map(it => {
      if (profile && profile.injuries.ankle && it.ex === "Ankle Mobility") {
        return {
          ...it,
          ex: "Ankle Mobility ⚠️",
          isMod: true,
          cues: "Ankle Mod: Double the duration. Perform circles, writing alphabet with toes. Keep movements pain-free."
        };
      }
      return it;
    });

    const card = el(`<div class="card"><h3>Daily Routine <span class="tag hot">10–15 MIN</span></h3></div>`);
    items.forEach(it => card.appendChild(renderExerciseRow(it)));
    view.appendChild(card);
    view.appendChild(el(`<div class="card"><h3>📝 Why It Matters</h3><p class="cues">${m.notes}</p></div>`));
  }

  function viewConditioning() {
    view.innerHTML = '';
    const c = PROGRAM.conditioning;
    view.appendChild(el(`<h2>${c.title}</h2>`));
    view.appendChild(el(`<p class="lead">${c.intro}</p>`));
    
    // Adapt conditioning library based on profile injuries and preferences
    const profile = getActiveProfile();
    const itemsCloned = JSON.parse(JSON.stringify(c.items));
    const items = itemsCloned.map(it => {
      if (profile) {
        if (profile.injuries.ankle) {
          if (it.ex === "Suicides" || it.ex === "17s" || it.ex === "Hill Sprints") {
            return {
              ex: it.ex + " ⚠️",
              isMod: true,
              sets: "Stationary Alternative",
              yt: YT.airBike,
              cues: "Ankle Mod: Replace with Air Bike or Rower Sprint intervals to remove landing impact."
            };
          }
          if (it.ex === "Box Jumps") {
            return {
              ex: "Medicine Ball Slam ⚠️",
              isMod: true,
              sets: "5 x 8",
              yt: YT.airBike,
              cues: "Ankle Mod: Power movement without jumps. Slam hard, engage core."
            };
          }
        } else if (profile.cardioPref === "lowImpact") {
          if (it.ex === "Suicides" || it.ex === "17s") {
            return {
              ex: it.ex + " ⚠️",
              isMod: true,
              sets: "Air Bike Preferred",
              yt: YT.airBike,
              cues: "Cardio Pref: Shifted from high impact running to Air Bike or Rower. 10 rounds of 30s sprints."
            };
          }
        }
      }
      return it;
    });

    const card = el(`<div class="card"><h3>Conditioning Menu <span class="tag cool">2x / WEEK</span></h3></div>`);
    items.forEach(it => card.appendChild(renderExerciseRow(it)));
    view.appendChild(card);
    view.appendChild(el(`<div class="card"><h3>📝 The Rule</h3><p class="cues">${c.notes}</p></div>`));
  }

  function viewAbout() {
    view.innerHTML = '';
    view.appendChild(el(`<h2>About This Program</h2>`));
    view.appendChild(el(`<p class="lead">Built for offseason gains: muscle mass, hip mobility, and basketball-ready conditioning.</p>`));
    view.appendChild(el(`<div class="card">
      <h3>How To Use</h3>
      <ol class="cues" style="padding-left:18px;line-height:1.7">
        <li>Go to the <b>Login</b> tab to select your name and configure injuries, goals, or cardio preferences.</li>
        <li>Open the <b>Today</b> tab — it shows the workout for the current day, customized for your limitations.</li>
        <li>Tap any exercise to see a demo video and form cues.</li>
        <li>Hit the <b>Mobility</b> tab every single day — even rest days.</li>
        <li>Use the <b>Week</b> tab to preview tomorrow or any other day.</li>
      </ol>
    </div>`));
    view.appendChild(el(`<div class="card">
      <h3>Progression — 8 Week Block</h3>
      <div class="kv">
        <span>Wk 1–2</span><span>Learn the lifts. Light load. Perfect form.</span>
        <span>Wk 3–5</span><span>Add weight every session you complete all reps clean.</span>
        <span>Wk 6–7</span><span>Push hardest. PR territory on big lifts.</span>
        <span>Wk 8</span><span>Deload — drop volume 40%. Then restart heavier.</span>
      </div>
    </div>`));
  }

  // --- Profile Page rendering ---
  function viewProfile() {
    view.innerHTML = '';
    const profile = getActiveProfile();

    if (!profile) {
      renderLoginPanel();
    } else {
      renderProfilePanel(profile);
    }
  }

  function renderLoginPanel() {
    const card = el(`
      <div class="card">
        <h3>👤 Player Login</h3>
        <p class="lead">Select your name to load your S&C profile. Default PIN is 1234.</p>
        
        <form id="loginForm">
          <div class="form-group">
            <label for="playerSelect">Player Name</label>
            <select id="playerSelect" class="form-control">
              <option value="">-- Choose Roster Player --</option>
              ${getAllPlayers().map(name => `<option value="${toSlug(name)}">${name}</option>`).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label for="playerPin">PIN Code</label>
            <input type="password" id="playerPin" class="form-control" placeholder="••••" maxlength="6" pattern="[0-9]*" inputmode="numeric">
          </div>
          
          <button type="submit" class="btn-sc btn-block">Log In</button>
        </form>
        
        <div style="margin-top: 20px; border-top: 1px dashed var(--line); padding-top: 14px; text-align: center;">
          <a href="#" id="showRegisterBtn" style="font-size: 13px; font-weight: 600; text-decoration: underline; color: var(--accent);">New player? Add name to roster ➔</a>
        </div>
      </div>
    `);

    view.appendChild(card);

    card.querySelector('#showRegisterBtn').addEventListener('click', (e) => {
      e.preventDefault();
      view.innerHTML = '';
      renderRegisterPanel();
    });

    card.querySelector('#loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const slug = card.querySelector('#playerSelect').value;
      const pin = card.querySelector('#playerPin').value;

      if (!slug) {
        alert("Please select your player profile.");
        return;
      }
      if (!pin) {
        alert("Please enter your PIN.");
        return;
      }

      const submitBtn = card.querySelector('button[type="submit"]');
      const origText = submitBtn.innerText;
      submitBtn.innerText = "Verifying...";
      submitBtn.disabled = true;

      const apiURL = typeof window.TRACKING_API_URL !== 'undefined' ? window.TRACKING_API_URL : '';
      if (apiURL) {
        fetch(apiURL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'verifyPlayerPin',
            slug: slug,
            pin: pin
          })
        })
        .then(res => res.json())
        .then(resData => {
          submitBtn.innerText = origText;
          submitBtn.disabled = false;
          if (resData.status === "success") {
            const p = resData.profile;
            const playerProfile = {
              name: p.name,
              pin: p.pin,
              goal: p.goal || 'hypertrophy',
              injuries: p.injuries || { knee: false, shoulder: false, back: false, ankle: false },
              cardioPref: p.cardioPref || 'court'
            };
            localStorage.setItem(`hoops-offseason:profile:${slug}`, JSON.stringify(playerProfile));
            localStorage.setItem('hoops-offseason:current-player', slug);
            updateProfileBtnLabel();
            viewProfile();
            startTrackingSession(playerProfile.name);
          } else {
            alert(resData.message || "Incorrect PIN. Please try again.");
          }
        })
        .catch(err => {
          console.error("Server-side verification failed, falling back to local:", err);
          submitBtn.innerText = origText;
          submitBtn.disabled = false;
          executeLocalLogin(slug, pin);
        });
      } else {
        submitBtn.innerText = origText;
        submitBtn.disabled = false;
        executeLocalLogin(slug, pin);
      }
    });

    function executeLocalLogin(slug, pin) {
      const localKey = `hoops-offseason:profile:${slug}`;
      let playerProfile = null;
      try {
        playerProfile = JSON.parse(localStorage.getItem(localKey));
      } catch (err) {}

      if (!playerProfile) {
        const playerName = getAllPlayers().find(n => toSlug(n) === slug);
        if (pin === "1234") {
          playerProfile = {
            name: playerName,
            pin: "1234",
            goal: "hypertrophy",
            injuries: { knee: false, shoulder: false, back: false, ankle: false },
            cardioPref: "court"
          };
          localStorage.setItem(localKey, JSON.stringify(playerProfile));
        } else {
          alert("Incorrect PIN. The default PIN for new profiles is 1234.");
          return;
        }
      } else {
        if (playerProfile.pin !== pin) {
          alert("Incorrect PIN. Please try again.");
          return;
        }
      }

      localStorage.setItem('hoops-offseason:current-player', slug);
      updateProfileBtnLabel();
      viewProfile();
      startTrackingSession(playerProfile.name);
    }
  }

  function renderRegisterPanel() {
    const card = el(`
      <div class="card">
        <h3>👤 Add Player to Roster</h3>
        <p class="lead">Add your name to the S&C roster and set your login PIN.</p>
        
        <form id="registerForm">
          <div class="form-group">
            <label for="regName">Full Name</label>
            <input type="text" id="regName" class="form-control" placeholder="e.g. John Doe" required>
          </div>
          
          <div class="form-group">
            <label for="regPin">Choose PIN Code</label>
            <input type="password" id="regPin" class="form-control" placeholder="••••" maxlength="6" pattern="[0-9]*" inputmode="numeric" required>
          </div>
          
          <button type="submit" class="btn-sc btn-block">Add and Log In</button>
        </form>
        
        <div style="margin-top: 20px; border-top: 1px dashed var(--line); padding-top: 14px; text-align: center;">
          <a href="#" id="showLoginBtn" style="font-size: 13px; font-weight: 600; text-decoration: underline; color: var(--accent);">← Back to Player Login</a>
        </div>
      </div>
    `);

    view.appendChild(card);

    card.querySelector('#showLoginBtn').addEventListener('click', (e) => {
      e.preventDefault();
      viewProfile();
    });

    card.querySelector('#registerForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = card.querySelector('#regName').value.trim();
      const pin = card.querySelector('#regPin').value.trim();

      if (!name) {
        alert("Please enter your name.");
        return;
      }
      if (!pin) {
        alert("Please enter a PIN.");
        return;
      }

      const slug = toSlug(name);
      
      const submitBtn = card.querySelector('button[type="submit"]');
      const origText = submitBtn.innerText;
      submitBtn.innerText = "Registering...";
      submitBtn.disabled = true;

      const playerProfile = {
        name: name,
        pin: pin,
        goal: "hypertrophy",
        injuries: { knee: false, shoulder: false, back: false, ankle: false },
        cardioPref: "court"
      };

      const apiURL = typeof window.TRACKING_API_URL !== 'undefined' ? window.TRACKING_API_URL : '';
      if (apiURL) {
        fetch(apiURL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'saveRosterPlayer',
            player: {
              number: "0",
              name: name,
              position: "",
              height: "",
              year: "",
              hometown: "",
              slug: slug,
              pin: pin,
              goal: "hypertrophy",
              injuries: { knee: false, shoulder: false, back: false, ankle: false },
              cardioPref: "court"
            }
          })
        })
        .then(res => res.json())
        .then(resData => {
          submitBtn.innerText = origText;
          submitBtn.disabled = false;
          if (resData.status === "success") {
            localStorage.setItem(`hoops-offseason:profile:${slug}`, JSON.stringify(playerProfile));
            localStorage.setItem('hoops-offseason:current-player', slug);
            updateProfileBtnLabel();
            viewProfile();
            startTrackingSession(playerProfile.name);
          } else {
            alert("Error registering player on server: " + resData.message);
          }
        })
        .catch(err => {
          console.error("Server registration failed, falling back to local:", err);
          submitBtn.innerText = origText;
          submitBtn.disabled = false;
          executeLocalRegister(slug, name, pin, playerProfile);
        });
      } else {
        submitBtn.innerText = origText;
        submitBtn.disabled = false;
        executeLocalRegister(slug, name, pin, playerProfile);
      }
    });

    function executeLocalRegister(slug, name, pin, playerProfile) {
      // Save name to custom list
      let custom = [];
      try {
        custom = JSON.parse(localStorage.getItem('hoops-offseason:custom-players') || '[]');
      } catch (err) {}
      
      if (!custom.includes(name) && !ROSTER_PLAYERS.includes(name)) {
        custom.push(name);
        localStorage.setItem('hoops-offseason:custom-players', JSON.stringify(custom));
      }

      // Save initial profile
      localStorage.setItem(`hoops-offseason:profile:${slug}`, JSON.stringify(playerProfile));

      // Log in
      localStorage.setItem('hoops-offseason:current-player', slug);
      updateProfileBtnLabel();
      viewProfile();
      startTrackingSession(playerProfile.name);
    }
  }

  function renderProfilePanel(profile) {
    const activeSlug = getActivePlayerSlug();
    const card = el(`
      <div class="card">
        <h3>👤 ${profile.name} <span class="tag">Active</span></h3>
        <p class="lead">Modify your goals, log injuries to adapt exercises, or reset your login PIN.</p>
        
        <form id="profileForm">
          <div class="form-group">
            <label>Personal Training Goal</label>
            <div class="choice-row">
              <button type="button" class="choice-btn ${profile.goal === 'hypertrophy' ? 'selected' : ''}" data-goal="hypertrophy">Mass Gain (Default)</button>
              <button type="button" class="choice-btn ${profile.goal === 'strength' ? 'selected' : ''}" data-goal="strength">Strength & Power</button>
              <button type="button" class="choice-btn ${profile.goal === 'conditioning' ? 'selected' : ''}" data-goal="conditioning">Conditioning / Trim</button>
            </div>
          </div>
          
          <div class="form-group" style="margin-top: 24px;">
            <label>Injuries & Limitations (Adapts Program)</label>
            <p class="lead" style="margin-bottom: 8px;">Check any joints with pain or injury. Exercises will adjust automatically.</p>
            <div class="checkbox-grid">
              <div class="checkbox-card ${profile.injuries.knee ? 'selected' : ''}" data-injury="knee">
                <input type="checkbox" id="inj-knee" ${profile.injuries.knee ? 'checked' : ''}>
                <div>
                  <span class="checkbox-text">Knee Injury / Pain</span>
                  <span class="checkbox-desc">Replaces Back Squats & Jumps</span>
                </div>
              </div>
              
              <div class="checkbox-card ${profile.injuries.shoulder ? 'selected' : ''}" data-injury="shoulder">
                <input type="checkbox" id="inj-shoulder" ${profile.injuries.shoulder ? 'checked' : ''}>
                <div>
                  <span class="checkbox-text">Shoulder Injury</span>
                  <span class="checkbox-desc">Replaces Overhead barbell lifts</span>
                </div>
              </div>
              
              <div class="checkbox-card ${profile.injuries.back ? 'selected' : ''}" data-injury="back">
                <input type="checkbox" id="inj-back" ${profile.injuries.back ? 'checked' : ''}>
                <div>
                  <span class="checkbox-text">Lower Back Injury</span>
                  <span class="checkbox-desc">Removes heavy spine compression</span>
                </div>
              </div>
              
              <div class="checkbox-card ${profile.injuries.ankle ? 'selected' : ''}" data-injury="ankle">
                <input type="checkbox" id="inj-ankle" ${profile.injuries.ankle ? 'checked' : ''}>
                <div>
                  <span class="checkbox-text">Ankle Sprain / Soreness</span>
                  <span class="checkbox-desc">Replaces high impact suicides</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="form-group" style="margin-top: 24px;">
            <label for="cardioSelect">Cardio Preference</label>
            <select id="cardioSelect" class="form-control">
              <option value="court" ${profile.cardioPref === 'court' ? 'selected' : ''}>Court Running (Suicides, 17s)</option>
              <option value="lowImpact" ${profile.cardioPref === 'lowImpact' ? 'selected' : ''}>Low Impact (Air Bike, Rower)</option>
            </select>
          </div>
          
          <div class="form-group" style="margin-top: 24px; border-top: 1px dashed var(--line); padding-top: 16px;">
            <label for="newPin">Change PIN Code</label>
            <input type="password" id="newPin" class="form-control" placeholder="••••" maxlength="6" value="${profile.pin}">
          </div>
          
          <div class="choice-row" style="margin-top: 24px;">
            <button type="submit" class="btn-sc" style="flex: 2;">Save Profile</button>
            <button type="button" id="logoutBtn" class="btn-sc btn-sc-secondary" style="flex: 1;">Log Out</button>
          </div>
        </form>
      </div>
    `);

    view.appendChild(card);

    // Goal buttons toggle selector
    let selectedGoal = profile.goal;
    const goalBtns = card.querySelectorAll('.choice-btn');
    goalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        goalBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedGoal = btn.dataset.goal;
      });
    });

    // Checkbox cards click wrapper
    const checkCards = card.querySelectorAll('.checkbox-card');
    checkCards.forEach(cc => {
      cc.addEventListener('click', (e) => {
        const checkbox = cc.querySelector('input[type="checkbox"]');
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }
        if (checkbox.checked) {
          cc.classList.add('selected');
        } else {
          cc.classList.remove('selected');
        }
      });
    });

    // Logout
    card.querySelector('#logoutBtn').addEventListener('click', () => {
      stopTrackingSession(true);
      localStorage.removeItem('hoops-offseason:current-player');
      updateProfileBtnLabel();
      viewProfile();
    });

    // Form submit save
    card.querySelector('#profileForm').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const pinCode = card.querySelector('#newPin').value.trim();
      if (!pinCode) {
        alert("PIN code cannot be empty.");
        return;
      }

      const updatedProfile = {
        name: profile.name,
        pin: pinCode,
        goal: selectedGoal,
        injuries: {
          knee: card.querySelector('#inj-knee').checked,
          shoulder: card.querySelector('#inj-shoulder').checked,
          back: card.querySelector('#inj-back').checked,
          ankle: card.querySelector('#inj-ankle').checked
        },
        cardioPref: card.querySelector('#cardioSelect').value
      };

      saveProfile(activeSlug, updatedProfile);
      updateProfileBtnLabel();
      alert("Profile updated successfully! Program adapted.");
      viewToday();
      
      // Update active tab selector
      [...tabs.querySelectorAll('button')].forEach(x => x.classList.remove('active'));
      tabs.querySelector('button[data-tab="today"]').classList.add('active');
    });
  }

  const VIEWS = {
    today: viewToday,
    week: viewWeek,
    mobility: viewMobility,
    conditioning: viewConditioning,
    about: viewAbout,
    profile: viewProfile
  };

  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    [...tabs.querySelectorAll('button')].forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    VIEWS[b.dataset.tab]();
    window.scrollTo(0,0);
  });

  // --- PLAYER ACTIVITY TRACKING ---
  let trackingSessionId = null;
  let trackingActiveStartTime = null;
  let trackingInterval = null;
  let trackingAccumulatedSeconds = 0;
  let isTrackingActive = false;

  function sendTrackingEvent(payload) {
    const apiURL = typeof window.TRACKING_API_URL !== 'undefined' ? window.TRACKING_API_URL : (typeof TRACKING_API_URL !== 'undefined' ? TRACKING_API_URL : '');
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

  function startTrackingSession(playerName) {
    const apiURL = typeof window.TRACKING_API_URL !== 'undefined' ? window.TRACKING_API_URL : (typeof TRACKING_API_URL !== 'undefined' ? TRACKING_API_URL : '');
    if (!apiURL || apiURL.trim() === '') return;
    if (isTrackingActive) return;

    trackingSessionId = sessionStorage.getItem('hoops-offseason:tracking-session-id');
    if (!trackingSessionId) {
      trackingSessionId = Date.now() + '_' + Math.floor(Math.random() * 10000);
      sessionStorage.setItem('hoops-offseason:tracking-session-id', trackingSessionId);
      sessionStorage.setItem('hoops-offseason:tracking-player-name', playerName);
      sessionStorage.setItem('hoops-offseason:tracking-accumulated-seconds', '0');

      sendTrackingEvent({
        action: 'login',
        sessionId: trackingSessionId,
        playerName: playerName,
        timestamp: new Date().toISOString()
      });
    } else {
      trackingAccumulatedSeconds = parseInt(sessionStorage.getItem('hoops-offseason:tracking-accumulated-seconds') || '0', 10);
    }

    isTrackingActive = true;
    trackingActiveStartTime = Date.now();

    if (trackingInterval) clearInterval(trackingInterval);
    trackingInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const delta = Math.floor((now - trackingActiveStartTime) / 1000);
        trackingActiveStartTime = now;

        trackingAccumulatedSeconds += delta;
        sessionStorage.setItem('hoops-offseason:tracking-accumulated-seconds', trackingAccumulatedSeconds.toString());

        sendTrackingEvent({
          action: 'heartbeat',
          sessionId: trackingSessionId,
          playerName: playerName,
          durationSeconds: trackingAccumulatedSeconds
        });
      } else {
        trackingActiveStartTime = Date.now();
      }
    }, 30000); // 30 seconds heartbeat
  }

  function stopTrackingSession(isLogout = false) {
    if (!isTrackingActive) return;

    const now = Date.now();
    const delta = Math.floor((now - trackingActiveStartTime) / 1000);
    trackingAccumulatedSeconds += delta;

    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
    }

    const playerName = sessionStorage.getItem('hoops-offseason:tracking-player-name');
    const finalSessionId = trackingSessionId;

    sessionStorage.removeItem('hoops-offseason:tracking-session-id');
    sessionStorage.removeItem('hoops-offseason:tracking-player-name');
    sessionStorage.removeItem('hoops-offseason:tracking-accumulated-seconds');
    isTrackingActive = false;
    trackingSessionId = null;
    trackingAccumulatedSeconds = 0;

    const apiURL = typeof window.TRACKING_API_URL !== 'undefined' ? window.TRACKING_API_URL : (typeof TRACKING_API_URL !== 'undefined' ? TRACKING_API_URL : '');
    if (apiURL && apiURL.trim() !== '') {
      sendTrackingEvent({
        action: 'logout',
        sessionId: finalSessionId,
        playerName: playerName,
        durationSeconds: trackingAccumulatedSeconds
      });
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (isTrackingActive) {
      if (document.visibilityState === 'visible') {
        trackingActiveStartTime = Date.now();
      } else {
        const now = Date.now();
        const delta = Math.floor((now - trackingActiveStartTime) / 1000);
        trackingAccumulatedSeconds += delta;
        sessionStorage.setItem('hoops-offseason:tracking-accumulated-seconds', trackingAccumulatedSeconds.toString());

        sendTrackingEvent({
          action: 'heartbeat',
          sessionId: trackingSessionId,
          playerName: sessionStorage.getItem('hoops-offseason:tracking-player-name'),
          durationSeconds: trackingAccumulatedSeconds
        });
      }
    }
  });

  window.addEventListener('pagehide', () => {
    stopTrackingSession(false);
  });
  window.addEventListener('beforeunload', () => {
    stopTrackingSession(false);
  });

  // Sync roster cache on startup
  function syncRosterFromServer() {
    const apiURL = typeof window.TRACKING_API_URL !== 'undefined' ? window.TRACKING_API_URL : '';
    if (!apiURL) return;
    fetch(apiURL + "?action=getRoster")
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data) && data.length > 0) {
          localStorage.setItem('hoops-hub:cached-roster', JSON.stringify(data));
          // Update login dropdown if visible
          const playerSelect = document.getElementById('playerSelect');
          if (playerSelect && !getActivePlayerSlug()) {
            const currentVal = playerSelect.value;
            let optionsHtml = '<option value="">-- Choose Roster Player --</option>';
            data.forEach(p => {
              optionsHtml += `<option value="${p.slug}" ${p.slug === currentVal ? 'selected' : ''}>${p.name}</option>`;
            });
            playerSelect.innerHTML = optionsHtml;
          }
        }
      })
      .catch(err => console.error("Roster sync failed:", err));
  }
  syncRosterFromServer();

  // Initial render
  updateProfileBtnLabel();
  viewToday();

  // Resume tracking session if already logged in on startup
  const startupProfile = getActiveProfile();
  if (startupProfile) {
    startTrackingSession(startupProfile.name);
  }
})();
