const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const htmlContent = `<!doctype html>
<html lang="en">
<head>
  <script src="auth-lock.js"></script>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>MacEwan Griffins: Tactical Offense Logger</title>
  <style>
    :root {
      --mac-maroon: #98002e;
      --mac-maroon-dark: #6e0021;
      --mac-tan: #d1ad7d;
      --mac-gold: #f39c12;
      --mac-black: #111;
      --bg: #090a0d;
      --card-bg: #14161f;
      --card-inner: #1c1e2b;
      --border-color: #272a3b;
      --pos-green: #2ecc71;
      --neg-red: #e74c3c;
      --neutral-gray: #95a5a6;
      --accent-blue: #3498db;
      --purple: #9b59b6;
    }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: #eee;
      margin: 0;
      padding: 12px;
      padding-bottom: 90px;
      user-select: none;
    }

    /* Mobile Sticky Top Header */
    #mobile-header {
      display: none;
      background: #0d0f17;
      color: #fff;
      padding: 10px 14px;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 99990;
      border-bottom: 2px solid var(--mac-maroon);
      margin: -12px -12px 12px -12px;
    }
    .menu-toggle-btn {
      background: var(--card-inner);
      border: 1px solid var(--mac-tan);
      color: #fff;
      font-size: 22px;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      line-height: 1;
    }

    /* Mobile Side Navigation Drawer */
    .drawer-backdrop {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      z-index: 999990;
      backdrop-filter: blur(3px);
    }
    nav.mobile-side-nav {
      position: fixed;
      top: 0;
      left: -300px;
      width: 300px;
      height: 100vh;
      background: #12141d;
      border-right: 2px solid var(--mac-maroon);
      z-index: 999999;
      padding: 20px 16px;
      transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 5px 0 25px rgba(0, 0, 0, 0.7);
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    body.side-open nav.mobile-side-nav { left: 0; }
    body.side-open .drawer-backdrop { display: block; }
    .close-drawer-btn {
      position: absolute;
      top: 14px;
      right: 14px;
      background: none;
      border: none;
      color: var(--mac-tan);
      font-size: 28px;
      cursor: pointer;
    }
    .drawer-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 16px;
    }
    .drawer-brand h2 { margin: 0; font-size: 16px; color: #fff; }
    .drawer-nav-list { list-style: none; padding: 0; margin: 0; }
    .drawer-nav-list li { margin-bottom: 8px; }
    .drawer-nav-list a {
      display: block;
      padding: 10px 12px;
      background: var(--card-inner);
      color: #eee;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13.5px;
      border-left: 3px solid var(--mac-tan);
    }
    .drawer-nav-list a.active {
      background: var(--mac-maroon);
      color: #fff;
      border-left-color: var(--mac-gold);
    }

    header.main-header {
      max-width: 1200px;
      margin: 0 auto 12px;
      border-bottom: 2px solid var(--mac-maroon);
      padding-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .header-title h1 {
      margin: 0;
      font-size: 20px;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-title p {
      margin: 2px 0 0;
      color: var(--mac-tan);
      font-size: 12px;
    }
    .nav-links {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .nav-btn {
      background: var(--card-inner);
      color: var(--mac-tan);
      text-decoration: none;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      border: 1px solid var(--border-color);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }
    .nav-btn:hover { background: var(--mac-maroon); color: #fff; border-color: var(--mac-maroon); }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Access Denied Card */
    #access-denied-card {
      display: none;
      max-width: 500px;
      margin: 60px auto;
      padding: 30px;
      background: var(--card-bg);
      border: 2px solid var(--mac-maroon);
      border-radius: 12px;
      text-align: center;
    }

    /* Live Game Header & Timer Card */
    .game-status-card {
      background: linear-gradient(135deg, #1d0f1b 0%, #14161f 100%);
      border: 1px solid var(--mac-maroon);
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 14px;
    }
    .game-status-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      gap: 8px;
      flex-wrap: wrap;
    }
    .game-name-display {
      font-size: 16px;
      font-weight: 800;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .game-date-badge {
      font-size: 11px;
      background: var(--card-inner);
      color: var(--mac-tan);
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
    }
    
    /* Clock Display Bar */
    .clock-bar {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 12px;
      background: var(--card-inner);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 10px 14px;
    }
    .quarter-selector {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .quarter-selector label { font-size: 10px; color: var(--mac-tan); text-transform: uppercase; font-weight: 700; }
    .period-select {
      background: #090a0d;
      border: 1px solid var(--border-color);
      color: var(--mac-gold);
      padding: 6px 8px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 14px;
    }
    .timer-display-box {
      text-align: center;
    }
    .timer-readout {
      font-family: "Courier New", Courier, monospace;
      font-size: 36px;
      font-weight: 900;
      color: #fff;
      letter-spacing: 2px;
      cursor: pointer;
    }
    .timer-readout.running {
      color: var(--pos-green);
      text-shadow: 0 0 10px rgba(46, 204, 113, 0.4);
    }
    .timer-actions {
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: flex-end;
    }
    .btn-timer-toggle {
      background: var(--pos-green);
      color: #000;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 900;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
    }
    .btn-timer-toggle.paused {
      background: var(--mac-gold);
      box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);
    }
    .nudge-btns {
      display: flex;
      gap: 4px;
    }
    .btn-nudge {
      background: #090a0d;
      border: 1px solid var(--border-color);
      color: #ccc;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 700;
      cursor: pointer;
    }

    /* 3-STEP TACTICAL LOGGING CARD */
    .tactical-box {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 14px;
      position: relative;
    }
    .tactical-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 8px;
    }
    .tactical-header-row h3 {
      margin: 0;
      font-size: 15px;
      color: var(--mac-tan);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* STEP 1: Shooter Selection Chips */
    .step-section {
      margin-bottom: 14px;
    }
    .step-label {
      font-size: 11.5px;
      font-weight: 800;
      color: var(--mac-gold);
      text-transform: uppercase;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
    }
    .shooters-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 6px;
    }
    @media (max-width: 768px) {
      .shooters-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    .shooter-chip {
      background: var(--card-inner);
      border: 1.5px solid var(--border-color);
      border-radius: 8px;
      padding: 8px 6px;
      text-align: center;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 52px;
    }
    .shooter-chip .jersey-num {
      font-size: 11px;
      font-weight: 900;
      color: var(--mac-tan);
    }
    .shooter-chip .p-name {
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .shooter-chip:hover, .shooter-chip:active {
      border-color: var(--mac-tan);
      background: #232638;
    }
    .shooter-chip.selected {
      border-color: var(--mac-gold);
      background: #332615;
      box-shadow: 0 0 10px rgba(243, 156, 18, 0.4);
    }
    .shooter-chip.selected .jersey-num {
      color: var(--mac-gold);
    }

    /* STEP 2: Tactical Action Trigger Tags */
    .triggers-bar {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
    }
    .trigger-tag {
      background: var(--card-inner);
      border: 1px solid var(--border-color);
      color: #ccc;
      padding: 7px 12px;
      border-radius: 20px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .trigger-tag:hover, .trigger-tag:active {
      border-color: var(--mac-tan);
      color: #fff;
      background: #252839;
    }
    .trigger-tag.selected {
      background: var(--mac-maroon);
      border-color: var(--mac-tan);
      color: #fff;
      box-shadow: 0 0 8px rgba(152,0,46,0.6);
    }
    .btn-add-trigger {
      background: none;
      border: 1px dashed var(--mac-tan);
      color: var(--mac-tan);
      padding: 6px 10px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
    }

    /* STEP 3: Shot Zone & Quality Matrix */
    .zone-selection-row {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 6px;
      margin-bottom: 10px;
    }
    @media (max-width: 650px) {
      .zone-selection-row {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    .zone-btn {
      background: var(--card-inner);
      border: 1.5px solid var(--border-color);
      border-radius: 8px;
      padding: 8px 4px;
      text-align: center;
      cursor: pointer;
      transition: all 0.15s;
    }
    .zone-btn .zone-code {
      font-size: 18px;
      font-weight: 900;
      color: #fff;
    }
    .zone-btn .zone-desc {
      font-size: 9.5px;
      color: #888;
      margin-top: 2px;
    }
    .zone-btn:hover, .zone-btn:active {
      border-color: var(--mac-tan);
      background: #222538;
    }
    .zone-btn.selected {
      border-color: var(--accent-blue);
      background: #122238;
      box-shadow: 0 0 10px rgba(52, 152, 219, 0.4);
    }
    .zone-btn.selected .zone-code {
      color: var(--accent-blue);
    }

    /* Contest & Outcome Quick Matrix Buttons */
    .outcomes-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    @media (max-width: 768px) {
      .outcomes-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    .outcome-btn {
      background: var(--card-inner);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 10px 8px;
      text-align: center;
      cursor: pointer;
      transition: transform 0.1s, border-color 0.15s;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 64px;
    }
    .outcome-btn:active { transform: scale(0.96); }
    .outcome-btn .notation-sym {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .outcome-btn .outcome-label {
      font-size: 10.5px;
      color: #aaa;
      font-weight: 700;
    }
    .outcome-btn .pts-pill {
      font-size: 10px;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 4px;
      margin-top: 4px;
    }
    .outcome-btn.make {
      border-color: rgba(46, 204, 113, 0.4);
      background: linear-gradient(180deg, #182820 0%, #151e1b 100%);
    }
    .outcome-btn.make .notation-sym { color: var(--pos-green); }
    .outcome-btn.make .pts-pill { background: rgba(46,204,113,0.2); color: var(--pos-green); }
    
    .outcome-btn.miss {
      border-color: rgba(231, 76, 60, 0.3);
      background: linear-gradient(180deg, #24191c 0%, #1c1619 100%);
    }
    .outcome-btn.miss .notation-sym { color: #e74c3c; }
    .outcome-btn.miss .pts-pill { background: rgba(231,76,60,0.2); color: #e74c3c; }

    .outcome-btn.foul {
      border-color: rgba(243, 156, 18, 0.4);
      background: linear-gradient(180deg, #282117 0%, #1f1b16 100%);
    }
    .outcome-btn.foul .notation-sym { color: var(--mac-gold); }
    .outcome-btn.foul .pts-pill { background: rgba(243,156,18,0.2); color: var(--mac-gold); }

    .outcome-btn.to {
      border-color: rgba(155, 89, 182, 0.4);
      background: linear-gradient(180deg, #22182b 0%, #1c1524 100%);
    }
    .outcome-btn.to .notation-sym { color: var(--purple); }
    .outcome-btn.to .pts-pill { background: rgba(155,89,182,0.2); color: var(--purple); }

    /* Action Preview & Log Trigger Bar */
    .action-preview-banner {
      background: #0b0c10;
      border: 1px solid var(--mac-tan);
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 10px;
    }
    .preview-text {
      font-size: 13px;
      color: #eee;
    }
    .preview-text strong { color: var(--mac-gold); }
    .preview-symbol-badge {
      font-size: 20px;
      font-weight: 900;
      padding: 4px 12px;
      background: var(--card-inner);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      color: #fff;
    }

    /* Substitution & Lineup Cards */
    .lineup-management-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
      margin-bottom: 14px;
    }
    @media (min-width: 850px) {
      .lineup-management-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    .court-card, .bench-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 14px;
    }
    .court-card { border-color: var(--mac-maroon); }
    .court-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .court-card-header h3 {
      margin: 0;
      font-size: 14px;
      color: #fff;
    }
    .on-court-slots {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .court-slot {
      background: var(--card-inner);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 8px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
    }
    .court-slot.selected-target {
      border: 2px solid var(--mac-gold);
      background: #2b2315;
    }
    .player-slot-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .jersey-badge {
      background: var(--mac-maroon);
      color: #fff;
      font-weight: 900;
      font-size: 12px;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .player-name-txt { font-size: 13.5px; font-weight: 700; color: #fff; }
    .player-meta-txt { font-size: 10.5px; color: #888; }
    .btn-sub-out {
      background: none;
      border: 1px solid var(--border-color);
      color: #aaa;
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 10.5px;
    }
    .bench-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 6px;
      max-height: 240px;
      overflow-y: auto;
    }
    .bench-player-item {
      background: var(--card-inner);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .bench-player-item.on-court {
      opacity: 0.35;
      pointer-events: none;
      filter: grayscale(1);
    }

    /* KPI Summary Cards */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    @media (max-width: 800px) {
      .kpi-row { grid-template-columns: repeat(2, 1fr); }
    }
    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    }
    .kpi-title { font-size: 10px; color: #aaa; text-transform: uppercase; font-weight: 700; }
    .kpi-val { font-size: 20px; font-weight: 900; color: #fff; margin-top: 2px; }
    .kpi-sub { font-size: 10px; color: var(--mac-tan); }

    /* Feed Table */
    .feed-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 14px;
    }
    .feed-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }
    .table-container {
      overflow-x: auto;
      max-height: 480px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      text-align: left;
    }
    th {
      background: #0f1118;
      color: var(--mac-tan);
      padding: 8px 10px;
      border-bottom: 2px solid var(--border-color);
      font-weight: 800;
      position: sticky;
      top: 0;
      z-index: 2;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #1f2231;
    }
    tr:hover td { background: #1a1c29; }
    .btn-edit-event, .btn-del-event {
      padding: 3px 6px;
      font-size: 10.5px;
      font-weight: 700;
      border-radius: 4px;
      cursor: pointer;
      border: none;
    }
    .btn-edit-event { background: var(--mac-tan); color: #000; margin-right: 4px; }
    .btn-del-event { background: #5c1818; color: #ff7777; border: 1px solid #7a2222; }

    /* Modals */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.85);
      z-index: 100000;
      align-items: center;
      justify-content: center;
      padding: 14px;
    }
    .modal-content {
      background: #151823;
      border: 1.5px solid var(--mac-maroon);
      border-radius: 12px;
      padding: 20px;
      width: 100%;
      max-width: 480px;
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 8px;
    }
    .modal-header h3 { margin: 0; color: #fff; font-size: 16px; }
    .close-modal { background: none; border: none; font-size: 24px; color: #aaa; cursor: pointer; }
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; font-size: 11.5px; color: var(--mac-tan); margin-bottom: 4px; font-weight: 700; }
    .form-group input, .form-group select {
      width: 100%;
      padding: 8px 10px;
      background: #090a0d;
      border: 1px solid var(--border-color);
      color: #fff;
      border-radius: 6px;
      font-size: 13px;
    }

    /* Fixed Bottom Action Bar */
    .bottom-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: #0d0f17;
      border-top: 2px solid var(--mac-maroon);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      z-index: 9000;
      box-shadow: 0 -4px 15px rgba(0,0,0,0.6);
    }
    .btn-save-game {
      background: #1b2838;
      color: #70a1ff;
      border: 1px solid #2a475e;
      padding: 9px 16px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-save-game:hover {
      background: #23364d;
      border-color: #3b6385;
      color: #fff;
    }
    .btn-end-game {
      background: var(--mac-maroon);
      color: #fff;
      border: 1px solid #bd2130;
      padding: 9px 18px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-end-game:hover {
      background: #b00035;
    }
    .toast-notice {
      position: fixed;
      bottom: 75px;
      right: 20px;
      background: #101924;
      border: 1px solid #2ecc71;
      color: #fff;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 4px 20px rgba(0,0,0,0.7);
      z-index: 99999;
      display: none;
      align-items: center;
      gap: 8px;
      animation: fadeInToast 0.3s ease;
    }
    @keyframes fadeInToast {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 800px) {
      #mobile-header { display: flex; }
      header.main-header { display: none; }
      body { padding-top: 0; }
    }
  </style>
</head>
<body>

<div id="mobile-header">
  <div style="display:flex; align-items:center; gap:8px;">
    <img src="macewan-logo.png" alt="MacEwan" style="width:30px; height:30px; background:#fff; border-radius:4px; padding:2px;">
    <span style="font-weight:700; font-size:0.9em; color:#fff;">Griffins Offense Logger</span>
  </div>
  <button class="menu-toggle-btn" onclick="toggleDrawer(true)">☰</button>
</div>

<div class="drawer-backdrop" onclick="toggleDrawer(false)"></div>
<nav class="mobile-side-nav">
  <button class="close-drawer-btn" onclick="toggleDrawer(false)">&times;</button>
  <div class="drawer-brand">
    <img src="macewan-logo.png" alt="MacEwan" style="width:36px; height:36px; background:#fff; border-radius:6px; padding:3px;">
    <div>
      <h2>Griffins Hoops</h2>
      <span style="font-size:11px; color:var(--mac-tan); font-weight:700;">Tactical Game Hub</span>
    </div>
  </div>
  <ul class="drawer-nav-list">
    <li><a href="index.html">🏠 Coaching Hub Home</a></li>
    <li><a href="offense-logger.html" class="active">🏀 Tactical Offense Logger</a></li>
    <li><a href="defense-logger.html">🛡️ Tactical Defense Logger</a></li>
    <li><a href="lineup-logger.html">📱 Lineup &amp; +/- Logger</a></li>
    <li><a href="lineup-tracker.html?view=offense-ind">📊 MacEwan Database</a></li>
    <li><a href="canadawest-scout-2026-27.html">🏀 CW Scouting Hub</a></li>
    <li><a href="drills.html">🏀 Drill Bank</a></li>
    <li><a href="griffin-concepts.html">⭐ Griffin Concepts</a></li>
    <li><a href="playbook.html">📖 Playbook Links</a></li>
    <li><a href="players.html">👤 Roster Manager</a></li>
  </ul>
</nav>

<header class="main-header">
  <div class="header-title">
    <h1>🏀 Tactical Offense Logger</h1>
    <p>Offensive Coach Tactical Shot Quality &amp; Play Breakdown</p>
  </div>
  <div class="nav-links">
    <a href="lineup-tracker.html?view=offense-ind" class="nav-btn" style="background:#2b2015; color:var(--mac-gold); border-color:#5c432a;">📊 MacEwan Database</a>
    <a href="defense-logger.html" class="nav-btn" style="background:#1b253b; color:#70a1ff; border-color:#2a3b5c;">🛡️ Defense Logger</a>
    <a href="lineup-logger.html" class="nav-btn">📱 Lineup Logger</a>
    <a href="index.html" class="nav-btn">🏠 Hub Home</a>
  </div>
</header>

<div class="container">

  <!-- Access Denied Card -->
  <div id="access-denied-card">
    <h2 style="color:#ff4a4a; margin-top:0;">🔒 Coach Access Restricted</h2>
    <p style="color:#ccc; font-size:14.5px;">The Tactical Offense Logger is restricted to Coaches and Administrators only.</p>
    <a href="index.html" class="nav-btn" style="background:var(--mac-maroon); color:#fff; padding:10px 20px;">Return to Coaching Hub</a>
  </div>

  <!-- Main App Layout -->
  <div id="main-app-content">

    <!-- Game Setup & Period Clock Card -->
    <div class="game-status-card">
      <div class="game-status-top">
        <div class="game-name-display">
          <span id="txt-opponent-name">vs. Select Opponent</span>
          <span class="game-date-badge" id="txt-game-date">2026-10-10</span>
          <span style="font-size:11px; background:#1b3d2b; color:#2ecc71; padding:3px 8px; border-radius:4px; font-weight:700;" id="txt-sync-status">● Table: game_offense_events</span>
        </div>
        <button class="nav-btn" onclick="openSetupModal()">⚙️ Game Setup</button>
      </div>

      <div class="clock-bar">
        <div class="quarter-selector">
          <label>Period</label>
          <select class="period-select" id="sel-period" onchange="onPeriodChange(this.value)">
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
            <option value="OT1">OT1</option>
            <option value="OT2">OT2</option>
          </select>
        </div>

        <div class="timer-display-box">
          <div class="timer-readout" id="clock-display" onclick="promptDirectClockEdit()">10:00</div>
          <div style="font-size:10.5px; color:#aaa;">Click clock to edit directly</div>
        </div>

        <div class="timer-actions">
          <button class="btn-timer-toggle paused" id="btn-timer-toggle" onclick="toggleGameTimer()">▶ START</button>
          <div class="nudge-btns">
            <button class="btn-nudge" onclick="nudgeClock(10)">+10s</button>
            <button class="btn-nudge" onclick="nudgeClock(-10)">-10s</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ⚡ TACTICAL OFFENSE LOGGING ENGINE -->
    <div class="tactical-box">
      <div class="tactical-header-row">
        <h3>⚡ Record Offensive Shot / Possession</h3>
        <span style="font-size:11px; color:#aaa;">Fast 3-Step Touch Sequence</span>
      </div>

      <!-- STEP 1: Shooter Selection (From Active 5 On Court + Team) -->
      <div class="step-section">
        <div class="step-label">
          <span>Step 1: Select Shooter / Primary Ball-Handler</span>
          <span style="color:#aaa; font-weight:normal;" id="lbl-selected-shooter-txt">Selected: None</span>
        </div>
        <div class="shooters-grid" id="shooters-grid-container"></div>
      </div>

      <!-- STEP 2: Action Trigger Selection -->
      <div class="step-section">
        <div class="step-label">
          <span>Step 2: Action Trigger (Tactical Setup)</span>
          <span style="color:#aaa; font-weight:normal;" id="lbl-selected-trigger-txt">Selected: PnR</span>
        </div>
        <div class="triggers-bar" id="triggers-bar-container"></div>
      </div>

      <!-- STEP 3: Shot Zone & Quality Matrix -->
      <div class="step-section">
        <div class="step-label">
          <span>Step 3: Shot Zone &amp; Outcome Matrix (Tap Outcome to Record)</span>
          <span style="color:#aaa; font-weight:normal;" id="lbl-selected-zone-txt">Zone: R (Smile Paint / Rim)</span>
        </div>

        <!-- Zone Selector -->
        <div class="zone-selection-row" id="zone-selection-row">
          <div class="zone-btn selected" onclick="selectShotZone('R')" id="zone-btn-R">
            <div class="zone-code">R</div>
            <div class="zone-desc">Smile Paint (Rim)</div>
          </div>
          <div class="zone-btn" onclick="selectShotZone('P')" id="zone-btn-P">
            <div class="zone-code">P</div>
            <div class="zone-desc">Non-Smile Paint</div>
          </div>
          <div class="zone-btn" onclick="selectShotZone('J')" id="zone-btn-J">
            <div class="zone-code">J</div>
            <div class="zone-desc">Midrange J</div>
          </div>
          <div class="zone-btn" onclick="selectShotZone('C')" id="zone-btn-C">
            <div class="zone-code">C</div>
            <div class="zone-desc">Catch &amp; Shoot 3</div>
          </div>
          <div class="zone-btn" onclick="selectShotZone('D')" id="zone-btn-D">
            <div class="zone-code">D</div>
            <div class="zone-desc">Off Dribble 3</div>
          </div>
          <div class="zone-btn" onclick="recordTurnoverEvent()" id="zone-btn-TO" style="border-color:rgba(155,89,182,0.4);">
            <div class="zone-code" style="color:var(--purple);">TO</div>
            <div class="zone-desc">Turnover (0 PTS)</div>
          </div>
        </div>

        <!-- Outcome Buttons (Dynamically Updates According to Zone) -->
        <div class="outcomes-grid" id="outcomes-grid-container"></div>
      </div>

      <!-- Live Action Preview Banner -->
      <div class="action-preview-banner">
        <div class="preview-text" id="action-preview-desc">
          Ready to log: <strong>Select Shooter, Trigger &amp; tap Outcome above.</strong>
        </div>
        <div class="preview-symbol-badge" id="preview-symbol-badge">—</div>
      </div>
    </div>

    <!-- ACTIVE 5 ON-COURT & BENCH SUBSTITUTIONS -->
    <div class="lineup-management-grid">
      <div class="court-card">
        <div class="court-card-header">
          <h3>🏀 ACTIVE 5 ON COURT (Lineup Context)</h3>
          <span style="font-size:11px; color:var(--mac-tan);">Tap slot to substitute</span>
        </div>
        <div class="on-court-slots" id="court-slots-container"></div>
      </div>

      <div class="bench-card">
        <div class="court-card-header">
          <h3 style="color:var(--mac-tan);">📋 BENCH ROSTER (Tap to substitute into selected slot)</h3>
        </div>
        <div class="bench-grid" id="bench-grid-container"></div>
      </div>
    </div>

    <!-- LIVE OFFENSIVE FEED TABLE & ANALYTICS -->
    <div class="feed-card">
      <div class="tactical-header-row">
        <h3>📊 Live Offensive Shot &amp; Quality Feed (<span id="txt-event-count">0</span>)</h3>
        <div style="display:flex; gap:6px;">
          <a href="lineup-tracker.html?view=offense-ind" class="nav-btn" style="background:#2b2015; color:var(--mac-gold); border-color:#5c432a;">📊 View in MacEwan Database</a>
          <button class="nav-btn" onclick="exportOffenseCSV()">📥 Export CSV</button>
          <button class="nav-btn" onclick="clearCurrentGameEvents()" style="color:#ff6b6b; border-color:#5c1818;">🗑 Clear Game</button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-title">Possessions / Shots</div>
          <div class="kpi-val" id="kpi-total-shots">0</div>
          <div class="kpi-sub" id="kpi-fga-sub">0 FGA • 0 TO</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">Total Points</div>
          <div class="kpi-val" id="kpi-total-pts" style="color:var(--pos-green);">0</div>
          <div class="kpi-sub" id="kpi-ppp-sub">0.00 PTS / Poss</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">FG Made / Miss</div>
          <div class="kpi-val" id="kpi-fg-ratio">0/0</div>
          <div class="kpi-sub" id="kpi-efg-sub">0.0% eFG</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">Paint Attack (R+P)</div>
          <div class="kpi-val" id="kpi-paint-share">0%</div>
          <div class="kpi-sub" id="kpi-paint-sub">0 Paint Shots</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">3PT Share (C+D)</div>
          <div class="kpi-val" id="kpi-three-share">0%</div>
          <div class="kpi-sub" id="kpi-three-sub">0 Three-Pointers</div>
        </div>
      </div>

      <!-- Feed Table -->
      <div class="feed-controls">
        <div style="display:flex; gap:8px; align-items:center;">
          <label style="font-size:11px; color:#aaa;">Filter Qtr:</label>
          <select id="feed-filter-qtr" onchange="renderEventsTable()" style="background:#090a0d; color:#fff; border:1px solid var(--border-color); padding:4px 8px; border-radius:4px; font-size:12px;">
            <option value="ALL">All Periods</option>
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
            <option value="OT1">OT1</option>
            <option value="OT2">OT2</option>
          </select>
        </div>
        <span style="font-size:11px; color:#888;">Writing directly to collection: <code>game_offense_events</code></span>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Clock (Qtr)</th>
              <th>Shooter</th>
              <th>Trigger</th>
              <th>Zone / Quality Notation</th>
              <th>Result &amp; PTS</th>
              <th>5-Man Lineup</th>
              <th style="text-align:center;">Actions</th>
            </tr>
          </thead>
          <tbody id="tbody-offense-events"></tbody>
        </table>
      </div>
    </div>

  </div>
</div>

<!-- Bottom Navigation Bar -->
<div class="bottom-bar">
  <div style="font-size:12px; color:#aaa;">
    Table: <strong style="color:var(--mac-tan);">game_offense_events</strong> • Logged: <strong style="color:#fff;" id="bar-logged-count">0</strong>
    <span id="save-status-indicator" style="margin-left:10px; font-size:11px; color:#2ecc71;"></span>
  </div>
  <div style="display:flex; gap:8px; align-items:center;">
    <a href="defense-logger.html" class="nav-btn" style="background:#1b253b; color:#70a1ff; border-color:#2a3b5c; font-size:12px; padding:7px 10px;">🛡️ Defense</a>
    <button type="button" class="btn-save-game" onclick="saveOffenseGame(true)">💾 SAVE GAME</button>
    <button type="button" class="btn-end-game" onclick="endOffenseGame()">🏁 END GAME</button>
  </div>
</div>
<div id="toast-notification" class="toast-notice"></div>

<!-- Modal 1: Game Setup -->
<div class="modal-overlay" id="modal-game-setup">
  <div class="modal-content">
    <div class="modal-header">
      <h3>📋 Game Setup (Offense Logger)</h3>
      <button class="close-modal" onclick="closeModal('modal-game-setup')">&times;</button>
    </div>
    <form onsubmit="handleSaveGameSetup(event)">
      <div class="form-group">
        <label>Opponent School / Team Name</label>
        <input type="text" id="setup-opponent" placeholder="e.g. Lethbridge Pronghorns, Calgary Dinos" required>
      </div>
      <div class="form-group">
        <label>Game Date</label>
        <input type="date" id="setup-date" required>
      </div>
      <div class="form-group">
        <label>Game Type</label>
        <select id="setup-type">
          <option value="Exhibition Game">Exhibition Game</option>
          <option value="Regular Season">Regular Season (Canada West)</option>
          <option value="Playoffs">Playoffs</option>
        </select>
      </div>
      <div class="form-group">
        <label>Quarter Length (Minutes)</label>
        <select id="setup-q-len">
          <option value="10:00">10 Minutes (FIBA / USports Standard)</option>
          <option value="12:00">12 Minutes (NBA Standard)</option>
          <option value="08:00">8 Minutes (High School Standard)</option>
        </select>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:18px;">
        <button type="button" class="nav-btn" onclick="closeModal('modal-game-setup')" style="background:#272a3b; color:#ddd;">✕ Cancel / Return to Game</button>
        <div style="display:flex; gap:8px;">
          <button type="button" class="nav-btn" onclick="startNewGameFromSetup()" style="background:#27ae60; color:#fff; font-weight:700;">➕ Start New Game</button>
          <button type="submit" class="btn-timer-toggle" style="margin:0; padding:8px 16px;">💾 Save Setup Info</button>
        </div>
      </div>
    </form>
  </div>
</div>

<!-- Modal 2: Add Custom Trigger -->
<div class="modal-overlay" id="modal-add-trigger">
  <div class="modal-content" style="max-width:380px;">
    <div class="modal-header">
      <h3>➕ Add Custom Action Trigger</h3>
      <button class="close-modal" onclick="closeModal('modal-add-trigger')">&times;</button>
    </div>
    <form onsubmit="handleSaveNewTrigger(event)">
      <div class="form-group">
        <label>Trigger Tag Name (Abbreviation / Action)</label>
        <input type="text" id="new-trigger-input" placeholder="e.g. Horns, DHO, Spain, BLOB, Post" required maxlength="12">
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px;">
        <button type="button" class="nav-btn" onclick="closeModal('modal-add-trigger')">Cancel</button>
        <button type="submit" class="btn-timer-toggle">Add Trigger</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal 3: FT Selection Dialog -->
<div class="modal-overlay" id="modal-ft-selection">
  <div class="modal-content" style="max-width:360px;">
    <div class="modal-header">
      <h3>🎯 Foul: How Many Made FTs?</h3>
      <button class="close-modal" onclick="closeModal('modal-ft-selection')">&times;</button>
    </div>
    <p style="font-size:12px; color:#aaa; margin-top:0;">Select made free throws to complete notation:</p>
    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin:14px 0;">
      <button type="button" class="outcome-btn foul" onclick="confirmFoulWithFTs(1)">
        <div class="notation-sym">[1]</div>
        <div class="outcome-label">1 Made FT</div>
      </button>
      <button type="button" class="outcome-btn foul" onclick="confirmFoulWithFTs(2)">
        <div class="notation-sym">[2]</div>
        <div class="outcome-label">2 Made FTs</div>
      </button>
      <button type="button" class="outcome-btn foul" onclick="confirmFoulWithFTs(3)">
        <div class="notation-sym">[3]</div>
        <div class="outcome-label">3 Made FTs</div>
      </button>
    </div>
    <div style="display:flex; justify-content:flex-end;">
      <button type="button" class="nav-btn" onclick="confirmFoulWithFTs(0)">0 Made (Missed All)</button>
    </div>
  </div>
</div>

<!-- Modal 4: Edit Logged Event -->
<div class="modal-overlay" id="modal-edit-event">
  <div class="modal-content" style="max-width:480px;">
    <div class="modal-header">
      <h3>✏️ Correct Offensive Event</h3>
      <button class="close-modal" onclick="closeModal('modal-edit-event')">&times;</button>
    </div>
    <form onsubmit="handleSaveEventEdit(event)">
      <input type="hidden" id="edit-event-id">
      <div class="form-group">
        <label>Shooter / Player</label>
        <select id="edit-event-player"></select>
      </div>
      <div class="form-group">
        <label>Action Trigger</label>
        <input type="text" id="edit-event-trigger" required>
      </div>
      <div class="form-group">
        <label>Shot Zone</label>
        <select id="edit-event-zone">
          <option value="R">R - Smile Paint (Rim)</option>
          <option value="P">P - Non-Smile Paint</option>
          <option value="J">J - Midrange</option>
          <option value="C">C - Catch &amp; Shoot 3</option>
          <option value="D">D - Off Dribble 3</option>
          <option value="TO">TO - Turnover</option>
        </select>
      </div>
      <div class="form-group">
        <label>Contest &amp; Outcome</label>
        <select id="edit-event-outcome">
          <option value="open_make">Open Make</option>
          <option value="contested_make">Contested Make</option>
          <option value="open_miss">Open Miss</option>
          <option value="contested_miss">Contested Miss</option>
          <option value="foul_no_ft">Foul (No FTs)</option>
          <option value="foul_made_ft">Foul + Made FT(s)</option>
          <option value="and_1">And-1 + Made FT</option>
          <option value="turnover">Turnover</option>
        </select>
      </div>
      <div class="form-group">
        <label>Points Scored</label>
        <input type="number" id="edit-event-points" min="0" max="4" required>
      </div>
      <div class="form-group">
        <label>Quarter &amp; Clock</label>
        <div style="display:flex; gap:8px;">
          <input type="text" id="edit-event-qtr" placeholder="Q1" style="width:70px;">
          <input type="text" id="edit-event-clock" placeholder="07:35">
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
        <button type="button" class="nav-btn" onclick="closeModal('modal-edit-event')">Cancel</button>
        <button type="submit" class="btn-timer-toggle">Update Event</button>
      </div>
    </form>
  </div>
</div>

<script>
  function toggleDrawer(open) {
    if (open) {
      document.body.classList.add('side-open');
    } else {
      document.body.classList.remove('side-open');
    }
  }

  var roster = [
    { id: "p0", name: "Owen Hickey", number: "0", short: "Owen", year: 3, exp: true, pos: "G" },
    { id: "p1", name: "Jojo Muyo", number: "1", short: "JoJo", year: 3, exp: true, pos: "G" },
    { id: "p2", name: "Khushal Shukla", number: "2", short: "Khush", year: 2, exp: false, pos: "G" },
    { id: "p3", name: "Joel Seke", number: "3", short: "Joel", year: 3, exp: true, pos: "W" },
    { id: "p4", name: "Elisha Ampofo", number: "4", short: "El", year: 5, exp: true, pos: "G" },
    { id: "p5", name: "Diego Presingular", number: "5", short: "Diego", year: 3, exp: true, pos: "G" },
    { id: "p6", name: "Noah Simon", number: "6", short: "Noah", year: 2, exp: false, pos: "F" },
    { id: "p7", name: "Judson Weir", number: "7", short: "Jud", year: 3, exp: true, pos: "W" },
    { id: "p8", name: "Dele Osuma", number: "8", short: "Dele", year: 4, exp: true, pos: "W" },
    { id: "p9", name: "Ryan Ziolkowski", number: "9", short: "Ryan", year: 3, exp: true, pos: "F" },
    { id: "p10", name: "Wol Wol", number: "10", short: "Wol", year: 2, exp: false, pos: "F" },
    { id: "p11", name: "Favour Igbinyemi", number: "11", short: "Fav", year: 5, exp: true, pos: "F" },
    { id: "p12", name: "Abdi Musse", number: "12", short: "Abdi", year: 1, exp: false, pos: "G" },
    { id: "p13", name: "Nathan Lefevre", number: "13", short: "Nathan", year: 1, exp: false, pos: "G" },
    { id: "p14", name: "David Wilmes", number: "14", short: "David", year: 2, exp: false, pos: "F" },
    { id: "p15", name: "Otis Onink", number: "15", short: "Otis", year: 1, exp: false, pos: "F" },
    { id: "p17", name: "Peter-Aluk Deng", number: "17", short: "Peter", year: 2, exp: false, pos: "G" },
    { id: "p18", name: "Freddy Kapinga", number: "18", short: "Freddy", year: 3, exp: true, pos: "G" }
  ];

  var defaultTriggers = ["PnR", "OBS", "OR", "Cut", "Tran", "Iso", "C/O"];
  var customTriggers = [];

  var gameSetup = {
    opponent: "",
    date: new Date().toISOString().split('T')[0],
    gameType: "Exhibition Game",
    qLen: "10:00"
  };

  var activeOnCourt = ["Elisha Ampofo", "Khushal Shukla", "Dele Osuma", "Judson Weir", "Ryan Ziolkowski"];
  var selectedSlotIndex = null;

  // Tactical logging active state
  var selectedShooterId = "p4";
  var selectedShooterName = "Elisha Ampofo";
  var selectedTrigger = "PnR";
  var selectedZone = "R"; // R, P, J, C, D, TO

  var clockTotalSeconds = 600;
  var isTimerRunning = false;
  var timerInterval = null;

  // Collection: game_offense_events
  var offenseEvents = [];

  function initApp() {
    if (window.isCoachOrAdmin && !window.isCoachOrAdmin()) {
      document.getElementById('main-app-content').style.display = 'none';
      document.getElementById('access-denied-card').style.display = 'block';
      return;
    }

    loadGameSetup();
    loadCustomTriggers();
    renderShooterChips();
    renderTriggersBar();
    renderOutcomesGrid();
    renderCourtSlots();
    renderBenchGrid();
    loadOffenseEvents();
    updateLiveActionPreview();
  }

  function loadGameSetup() {
    var savedSetup = localStorage.getItem('macewan_current_game_setup');
    if (savedSetup) {
      try {
        gameSetup = JSON.parse(savedSetup);
        updateGameHeaderUI();
      } catch(e) { openSetupModal(); }
    } else {
      openSetupModal();
    }
  }

  var toastTimeout = null;
  function showToastNotice(msg) {
    var toast = document.getElementById('toast-notification');
    if (!toast) return;
    toast.innerHTML = '<span>✅</span> <span>' + msg + '</span>';
    toast.style.display = 'flex';
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function() {
      toast.style.display = 'none';
    }, 3500);
  }

  function getActiveGameId() {
    if (!gameSetup.gameId) {
      var d = gameSetup.date || new Date().toISOString().split('T')[0];
      var o = (gameSetup.opponent || 'opponent').toLowerCase().replace(/[^a-z0-9]/g,'');
      gameSetup.gameId = 'game_' + d.replace(/-/g,'') + '_' + o;
      localStorage.setItem('macewan_current_game_setup', JSON.stringify(gameSetup));
    }
    return gameSetup.gameId;
  }

  function deduplicateEvents(list) {
    if (!Array.isArray(list)) return [];
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (item && item.id) {
        if (!seen[item.id]) {
          seen[item.id] = true;
          out.push(item);
        }
      } else if (item) {
        out.push(item);
      }
    }
    return out;
  }

  function ensureGameInLineupGames(setup) {
    try {
      var local = localStorage.getItem('macewan_lineup_games');
      var games = [];
      if (local) {
        try { games = JSON.parse(local); } catch(e) {}
      }
      var gid = getActiveGameId();
      var idx = games.findIndex(function(g) {
        return g.gameId === gid || (g.date === setup.date && g.opponent && g.opponent.toLowerCase() === (setup.opponent || '').toLowerCase());
      });
      if (idx >= 0) {
        games[idx].opponent = setup.opponent || games[idx].opponent;
        games[idx].date = setup.date || games[idx].date;
        games[idx].gameType = setup.gameType || games[idx].gameType;
      } else {
        games.push({
          gameId: gid,
          opponent: setup.opponent || "Opponent",
          date: setup.date || new Date().toISOString().split('T')[0],
          gameType: setup.gameType || "Regular Season",
          location: "MacEwan Gym",
          stints: []
        });
      }
      localStorage.setItem('macewan_lineup_games', JSON.stringify(games));
      fetch('/.netlify/functions/save-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'macewan_lineup_games', content: games })
      }).catch(function(){});
    } catch(err) {
      console.warn('Error syncing game index:', err);
    }
  }

  function openSetupModal() {
    document.getElementById('setup-date').value = gameSetup.date;
    document.getElementById('setup-opponent').value = gameSetup.opponent || '';
    document.getElementById('setup-type').value = gameSetup.gameType || 'Regular Season';
    document.getElementById('setup-q-len').value = gameSetup.qLen || '10:00';
    document.getElementById('modal-game-setup').style.display = 'flex';
  }
  function closeModal(id) {
    document.getElementById(id).style.display = 'none';
  }

  function handleSaveGameSetup(e) {
    if (e) e.preventDefault();
    gameSetup.opponent = document.getElementById('setup-opponent').value.trim();
    gameSetup.date = document.getElementById('setup-date').value;
    gameSetup.gameType = document.getElementById('setup-type').value;
    gameSetup.qLen = document.getElementById('setup-q-len').value;

    localStorage.setItem('macewan_current_game_setup', JSON.stringify(gameSetup));
    updateGameHeaderUI();
    closeModal('modal-game-setup');
    showToastNotice("📋 Game setup details updated!");
  }

  function startNewGameFromSetup() {
    var opp = document.getElementById('setup-opponent').value.trim() || "Opponent";
    var dt = document.getElementById('setup-date').value || new Date().toISOString().split('T')[0];
    var gt = document.getElementById('setup-type').value;
    var ql = document.getElementById('setup-q-len').value;

    var curGid = getActiveGameId();
    var curEvents = offenseEvents.filter(function(e){ return e.gameId === curGid; });
    if (curEvents.length > 0) {
      if (!confirm("⚠️ Start a new game vs " + opp + "?\\n\\nThis will reset the clock and active session events for the new game. (Previous game events remain saved in the database).")) {
        return;
      }
    }

    if (isTimerRunning) toggleGameTimer();

    gameSetup.opponent = opp;
    gameSetup.date = dt;
    gameSetup.gameType = gt;
    gameSetup.qLen = ql;
    gameSetup.gameId = 'game_' + dt.replace(/-/g,'') + '_' + opp.toLowerCase().replace(/[^a-z0-9]/g,'') + '_' + Date.now();
    localStorage.setItem('macewan_current_game_setup', JSON.stringify(gameSetup));

    var parts = ql.split(':');
    clockTotalSeconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    currentPeriod = "Q1";
    document.getElementById('sel-period').value = "Q1";

    ensureGameInLineupGames(gameSetup);
    updateGameHeaderUI();
    updateClockDisplay();
    renderEventsTable();
    closeModal('modal-game-setup');
    showToastNotice("🏀 Started new offensive session vs " + opp + "!");
  }

  function updateGameHeaderUI() {
    document.getElementById('txt-opponent-name').textContent = "vs. " + (gameSetup.opponent || "Select Opponent");
    document.getElementById('txt-game-date').textContent = gameSetup.date + " (" + gameSetup.gameType + ")";
  }

  function toggleGameTimer() {
    isTimerRunning = !isTimerRunning;
    var btn = document.getElementById('btn-timer-toggle');
    var readout = document.getElementById('clock-display');

    if (isTimerRunning) {
      btn.textContent = "⏸ PAUSE";
      btn.classList.remove('paused');
      readout.classList.add('running');

      timerInterval = setInterval(function() {
        if (clockTotalSeconds > 0) {
          clockTotalSeconds--;
          updateClockDisplay();
        } else {
          toggleGameTimer();
        }
      }, 1000);
    } else {
      btn.textContent = "▶ START";
      btn.classList.add('paused');
      readout.classList.remove('running');
      clearInterval(timerInterval);
    }
  }

  function updateClockDisplay() {
    var m = Math.floor(clockTotalSeconds / 60).toString().padStart(2, '0');
    var s = (clockTotalSeconds % 60).toString().padStart(2, '0');
    document.getElementById('clock-display').textContent = m + ":" + s;
  }

  function nudgeClock(secs) {
    clockTotalSeconds = Math.max(0, clockTotalSeconds + secs);
    updateClockDisplay();
  }

  function promptDirectClockEdit() {
    var input = prompt("Enter clock time (mm:ss or seconds):", document.getElementById('clock-display').textContent);
    if (input) {
      if (input.includes(':')) {
        var parts = input.split(':');
        clockTotalSeconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      } else {
        clockTotalSeconds = parseInt(input, 10);
      }
      updateClockDisplay();
    }
  }

  function onPeriodChange(val) {
    var parts = gameSetup.qLen.split(':');
    clockTotalSeconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    updateClockDisplay();
    renderEventsTable();
  }

  /* STEP 1: Shooter Selection */
  function renderShooterChips() {
    var container = document.getElementById('shooters-grid-container');
    container.innerHTML = '';

    for (var i = 0; i < activeOnCourt.length; i++) {
      (function(pName) {
        var pData = roster.find(function(r){ return r.name === pName; }) || { id: "p_" + pName, name: pName, number: "?", short: pName };
        var isSelected = (selectedShooterName === pName);

        var chip = document.createElement('div');
        chip.className = 'shooter-chip ' + (isSelected ? 'selected' : '');
        chip.innerHTML = '<div class="jersey-num">#' + (pData.number || '?') + '</div>' +
                         '<div class="p-name">' + pData.short + '</div>';
        chip.onclick = function() {
          selectedShooterId = pData.id;
          selectedShooterName = pData.name;
          renderShooterChips();
          updateLiveActionPreview();
        };
        container.appendChild(chip);
      })(activeOnCourt[i]);
    }

    // Fallback: [ Team / Unassigned ]
    var isTeamSelected = (selectedShooterName === "Team / Unassigned");
    var teamChip = document.createElement('div');
    teamChip.className = 'shooter-chip ' + (isTeamSelected ? 'selected' : '');
    teamChip.innerHTML = '<div class="jersey-num">👥</div><div class="p-name">Team</div>';
    teamChip.onclick = function() {
      selectedShooterId = "team";
      selectedShooterName = "Team / Unassigned";
      renderShooterChips();
      updateLiveActionPreview();
    };
    container.appendChild(teamChip);

    document.getElementById('lbl-selected-shooter-txt').textContent = "Selected: " + selectedShooterName;
  }

  /* STEP 2: Triggers Bar */
  function loadCustomTriggers() {
    var saved = localStorage.getItem('macewan_custom_offense_triggers');
    if (saved) {
      try { customTriggers = JSON.parse(saved); } catch(e) {}
    }
  }

  function renderTriggersBar() {
    var container = document.getElementById('triggers-bar-container');
    container.innerHTML = '';

    var allTriggers = defaultTriggers.concat(customTriggers);
    allTriggers.forEach(function(trig) {
      var tag = document.createElement('button');
      tag.type = 'button';
      tag.className = 'trigger-tag ' + (selectedTrigger === trig ? 'selected' : '');
      tag.textContent = trig;
      tag.onclick = function() {
        selectedTrigger = trig;
        renderTriggersBar();
        updateLiveActionPreview();
      };
      container.appendChild(tag);
    });

    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn-add-trigger';
    addBtn.innerHTML = '➕ Add Trigger';
    addBtn.onclick = function() {
      document.getElementById('modal-add-trigger').style.display = 'flex';
    };
    container.appendChild(addBtn);

    document.getElementById('lbl-selected-trigger-txt').textContent = "Selected: " + selectedTrigger;
  }

  function handleSaveNewTrigger(e) {
    e.preventDefault();
    var val = document.getElementById('new-trigger-input').value.trim();
    if (val && !defaultTriggers.includes(val) && !customTriggers.includes(val)) {
      customTriggers.push(val);
      localStorage.setItem('macewan_custom_offense_triggers', JSON.stringify(customTriggers));
      selectedTrigger = val;
      renderTriggersBar();
      updateLiveActionPreview();
    }
    document.getElementById('new-trigger-input').value = '';
    closeModal('modal-add-trigger');
  }

  /* STEP 3: Zone & Outcome Matrix */
  function selectShotZone(zone) {
    selectedZone = zone;
    var zoneBtns = document.querySelectorAll('.zone-btn');
    zoneBtns.forEach(function(b){ b.classList.remove('selected'); });
    var target = document.getElementById('zone-btn-' + zone);
    if (target) target.classList.add('selected');

    var zoneNames = {
      'R': 'R (Smile Paint / Rim)',
      'P': 'P (Non-Smile Paint / Float)',
      'J': 'J (Midrange Jump Shot)',
      'C': 'C (Catch & Shoot 3)',
      'D': 'D (Off Dribble 3)'
    };
    document.getElementById('lbl-selected-zone-txt').textContent = "Zone: " + (zoneNames[zone] || zone);
    renderOutcomesGrid();
    updateLiveActionPreview();
  }

  function renderOutcomesGrid() {
    var container = document.getElementById('outcomes-grid-container');
    container.innerHTML = '';

    var z = selectedZone;
    var isThree = (z === 'C' || z === 'D');
    var baseMakePts = isThree ? 3 : 2;
    var and1Pts = baseMakePts + 1;

    var outcomes = [
      { key: 'open_make', sym: '(' + z + ')', label: 'Open Make', pts: baseMakePts, type: 'make', contested: false },
      { key: 'contested_make', sym: '<u>(' + z + ')</u>', label: 'Contested Make', pts: baseMakePts, type: 'make', contested: true },
      { key: 'open_miss', sym: z, label: 'Open Miss', pts: 0, type: 'miss', contested: false },
      { key: 'contested_miss', sym: '<u>' + z + '</u>', label: 'Contested Miss', pts: 0, type: 'miss', contested: true },
      { key: 'foul_no_ft', sym: '[' + z + ']', label: 'Foul (No FTs)', pts: 0, type: 'foul', contested: true },
      { key: 'foul_made_ft', sym: '[' + z + '/]', label: 'Foul + Made FT(s)', pts: '1-3', type: 'foul', contested: true },
      { key: 'and_1', sym: '▲(' + z + ')', label: 'And-1 + Made FT', pts: and1Pts, type: 'make', contested: true }
    ];

    outcomes.forEach(function(opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'outcome-btn ' + opt.type;
      btn.innerHTML = '<div class="notation-sym">' + opt.sym + '</div>' +
                      '<div class="outcome-label">' + opt.label + '</div>' +
                      '<div class="pts-pill">' + (opt.pts > 0 ? '+' + opt.pts : opt.pts) + ' PTS</div>';
      btn.onclick = function() {
        if (opt.key === 'foul_made_ft') {
          promptFoulWithFTs();
        } else {
          recordOffensiveEvent(opt.key, opt.sym, opt.pts, opt.contested);
        }
      };
      container.appendChild(btn);
    });
  }

  function promptFoulWithFTs() {
    document.getElementById('modal-ft-selection').style.display = 'flex';
  }

  function confirmFoulWithFTs(ftCount) {
    closeModal('modal-ft-selection');
    var sym = '[' + selectedZone + '/' + (ftCount > 0 ? ftCount : '') + ']';
    recordOffensiveEvent('foul_made_ft', sym, ftCount, true);
  }

  function recordTurnoverEvent() {
    recordOffensiveEvent('turnover', 'TO', 0, false);
  }

  function recordOffensiveEvent(outcome, symbol, points, isContested) {
    var pData = roster.find(function(r){ return r.name === selectedShooterName; });
    var pId = pData ? pData.id : (selectedShooterId || "p_unassigned");

    var gameId = 'game_' + gameSetup.date.replace(/-/g,'') + '_' + (gameSetup.opponent || 'opponent').toLowerCase().replace(/\\s+/g,'');

    var newEvent = {
      id: "off_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      gameId: gameId,
      opponent: gameSetup.opponent || "Exhibition Opponent",
      date: gameSetup.date,
      quarter: document.getElementById('sel-period').value,
      gameClock: document.getElementById('clock-display').textContent,
      activeLineup: activeOnCourt.slice(),
      playerId: pId,
      playerName: selectedShooterName,
      playTrigger: selectedTrigger,
      shotZone: selectedZone,
      isContested: !!isContested,
      outcome: outcome,
      points: parseInt(points, 10) || 0,
      notationSymbol: symbol,
      createdAt: new Date().toISOString()
    };

    offenseEvents.unshift(newEvent);
    saveAndSyncEvents(false);
    renderEventsTable();
    updateLiveActionPreview();

    if (navigator.vibrate) navigator.vibrate(40);
  }

  function updateLiveActionPreview() {
    var desc = 'Active: <strong>' + selectedShooterName + '</strong> | Trigger: <strong>' + selectedTrigger + '</strong> | Zone: <strong>' + selectedZone + '</strong>';
    document.getElementById('action-preview-desc').innerHTML = desc;
    document.getElementById('preview-symbol-badge').innerHTML = selectedZone;
  }

  /* ACTIVE 5 & BENCH SUBS */
  function renderCourtSlots() {
    var container = document.getElementById('court-slots-container');
    container.innerHTML = '';

    for (var idx = 0; idx < activeOnCourt.length; idx++) {
      (function(slotIdx) {
        var playerName = activeOnCourt[slotIdx];
        var pData = roster.find(function(r){ return r.name === playerName; }) || { number: "?", name: playerName, short: playerName, year: 1 };
        var isSelected = selectedSlotIndex === slotIdx;

        var div = document.createElement('div');
        div.className = 'court-slot ' + (isSelected ? 'selected-target' : '');
        div.innerHTML = '<div class="player-slot-info">' +
          '<div class="jersey-badge">#' + (pData.number || '?') + '</div>' +
          '<div>' +
          '<div class="player-name-txt">' + pData.name + '</div>' +
          '<div class="player-meta-txt">' + pData.short + ' • Year ' + pData.year + '</div>' +
          '</div></div>' +
          '<button class="btn-sub-out">Swap</button>';

        div.onclick = function() {
          selectedSlotIndex = slotIdx;
          renderCourtSlots();
        };

        container.appendChild(div);
      })(idx);
    }
  }

  function renderBenchGrid() {
    var container = document.getElementById('bench-grid-container');
    container.innerHTML = '';

    for (var i = 0; i < roster.length; i++) {
      (function(p) {
        var isOnCourt = activeOnCourt.includes(p.name);
        var div = document.createElement('div');
        div.className = 'bench-player-item ' + (isOnCourt ? 'on-court' : '');
        div.innerHTML = '<div class="jersey-badge" style="width:22px; height:22px; font-size:10px;">#' + p.number + '</div>' +
          '<div><div style="font-size:11.5px; font-weight:700; color:#fff;">' + p.name + '</div>' +
          '<div style="font-size:9.5px; color:#888;">' + p.short + '</div></div>';
        
        div.onclick = function() {
          if (selectedSlotIndex === null) {
            alert("Tap one of the 5 on-court slots first to select who is coming off!");
            return;
          }
          activeOnCourt[selectedSlotIndex] = p.name;
          selectedSlotIndex = null;
          renderCourtSlots();
          renderBenchGrid();
          renderShooterChips();
        };

        container.appendChild(div);
      })(roster[i]);
    }
  }

  /* STORAGE & NETLIFY BLOBS SYNC */
  function loadOffenseEvents() {
    var local = localStorage.getItem('game_offense_events');
    if (local) {
      try { offenseEvents = deduplicateEvents(JSON.parse(local)); } catch(e) {}
    }

    renderEventsTable();

    // Fetch latest from Netlify Blobs & merge without duplicates
    fetch('/.netlify/functions/get-content?key=game_offense_events')
      .then(function(res){ return res.json(); })
      .then(function(data){
        if (data && data.success && data.content) {
          var remote = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
          if (Array.isArray(remote)) {
            var map = new Map();
            remote.forEach(function(ev){ if (ev && ev.id) map.set(ev.id, ev); });
            offenseEvents.forEach(function(ev){ if (ev && ev.id) map.set(ev.id, ev); });
            offenseEvents = Array.from(map.values());
            localStorage.setItem('game_offense_events', JSON.stringify(offenseEvents));
            renderEventsTable();
          }
        }
      }).catch(function(){});
  }

  function saveAndSyncEvents(showNotice) {
    offenseEvents = deduplicateEvents(offenseEvents);
    localStorage.setItem('game_offense_events', JSON.stringify(offenseEvents));

    var payload = {
      key: 'game_offense_events',
      content: offenseEvents
    };

    fetch('/.netlify/functions/save-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(res){
      if (res.ok) {
        document.getElementById('txt-sync-status').textContent = '● Synced to Netlify';
        if (showNotice) showToastNotice("✅ Offense events synced successfully to database!");
      }
    }).catch(function(){
      document.getElementById('txt-sync-status').textContent = '● Saved Locally (Offline)';
    });

    renderEventsTable();
  }

  function saveOffenseGame(showNotice) {
    offenseEvents = deduplicateEvents(offenseEvents);
    saveAndSyncEvents(false);
    ensureGameInLineupGames(gameSetup);

    var now = new Date();
    var timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    var statusEl = document.getElementById('save-status-indicator');
    if (statusEl) statusEl.textContent = "● Saved " + timeStr;

    if (showNotice) {
      var curGid = getActiveGameId();
      var count = offenseEvents.filter(function(e){ return e.gameId === curGid; }).length;
      showToastNotice("💾 Offense game saved (" + count + " events for vs " + (gameSetup.opponent || "Opponent") + ")");
    }
  }

  function endOffenseGame() {
    var curGid = getActiveGameId();
    var curCount = offenseEvents.filter(function(e){ return e.gameId === curGid; }).length;

    if (!confirm("🏁 Are you sure you want to end offensive tracking and push final stats (" + curCount + " events) to the MacEwan Database?")) {
      return;
    }

    offenseEvents = deduplicateEvents(offenseEvents);
    saveAndSyncEvents(false);
    ensureGameInLineupGames(gameSetup);

    if (confirm("✅ Offense game finalized and pushed to MacEwan Database!\\n\\nWould you like to view the offensive analytics in MacEwan Database?")) {
      window.location.href = "lineup-tracker.html?view=offense-ind";
    }
  }

  /* RENDER FEED TABLE & KPIS */
  function renderEventsTable() {
    var tbody = document.getElementById('tbody-offense-events');
    var filterQtr = document.getElementById('feed-filter-qtr').value;

    var filtered = offenseEvents.filter(function(ev){
      return (filterQtr === 'ALL' || ev.quarter === filterQtr);
    });

    document.getElementById('txt-event-count').textContent = filtered.length;
    document.getElementById('bar-logged-count').textContent = offenseEvents.length;

    // Calculate KPIs
    var totalShots = filtered.length;
    var totalPts = 0;
    var fga = 0;
    var fgm = 0;
    var threeFga = 0;
    var threeFgm = 0;
    var paintShots = 0;
    var toCount = 0;

    filtered.forEach(function(ev) {
      totalPts += (ev.points || 0);
      if (ev.outcome === 'turnover') {
        toCount++;
      } else {
        fga++;
        if (ev.outcome.includes('make') || ev.outcome === 'and_1') fgm++;
        if (ev.shotZone === 'C' || ev.shotZone === 'D') {
          threeFga++;
          if (ev.outcome.includes('make') || ev.outcome === 'and_1') threeFgm++;
        }
        if (ev.shotZone === 'R' || ev.shotZone === 'P') {
          paintShots++;
        }
      }
    });

    var efg = fga > 0 ? (((fgm + 0.5 * threeFgm) / fga) * 100).toFixed(1) : "0.0";
    var ppp = totalShots > 0 ? (totalPts / totalShots).toFixed(2) : "0.00";
    var paintPct = fga > 0 ? Math.round((paintShots / fga) * 100) : 0;
    var threePct = fga > 0 ? Math.round((threeFga / fga) * 100) : 0;

    document.getElementById('kpi-total-shots').textContent = totalShots;
    document.getElementById('kpi-fga-sub').textContent = fga + " FGA • " + toCount + " TO";
    document.getElementById('kpi-total-pts').textContent = totalPts;
    document.getElementById('kpi-ppp-sub').textContent = ppp + " PTS / Poss";
    document.getElementById('kpi-fg-ratio').textContent = fgm + "/" + fga;
    document.getElementById('kpi-efg-sub').textContent = efg + "% eFG";
    document.getElementById('kpi-paint-share').textContent = paintPct + "%";
    document.getElementById('kpi-paint-sub').textContent = paintShots + " Paint Shots";
    document.getElementById('kpi-three-share').textContent = threePct + "%";
    document.getElementById('kpi-three-sub').textContent = threeFga + " 3PT Shots";

    // Build Table
    var html = "";
    for (var i = 0; i < filtered.length; i++) {
      var ev = filtered[i];
      var idxInAll = offenseEvents.indexOf(ev);

      var ptsBadge = ev.points > 0 
        ? '<strong style="color:var(--pos-green); font-size:13px;">+' + ev.points + ' PTS</strong>'
        : '<span style="color:#aaa;">0 PTS</span>';

      var lineupPills = (ev.activeLineup || []).map(function(p){
        var found = roster.find(function(r){ return r.name === p; });
        return '<span style="background:#1b1d28; padding:2px 5px; border-radius:4px; font-size:10px; margin:1px; display:inline-block;">' + (found ? found.short : p) + '</span>';
      }).join('');

      html += '<tr>';
      html += '<td><strong>#' + (filtered.length - i) + '</strong></td>';
      html += '<td><span style="font-weight:700; color:var(--mac-gold);">' + ev.quarter + '</span> ' + ev.gameClock + '</td>';
      html += '<td><strong>' + ev.playerName + '</strong></td>';
      html += '<td><span style="background:var(--card-inner); padding:2px 6px; border-radius:4px; border:1px solid #333; font-weight:700;">' + ev.playTrigger + '</span></td>';
      html += '<td style="font-family:monospace; font-size:15px; font-weight:900;">' + ev.notationSymbol + '</td>';
      html += '<td>' + ptsBadge + ' <span style="font-size:10px; color:#888;">(' + ev.outcome.replace(/_/g,' ') + ')</span></td>';
      html += '<td>' + lineupPills + '</td>';
      html += '<td style="text-align:center;">';
      html += '<button class="btn-edit-event" onclick="openEditEventModal(' + idxInAll + ')">Edit</button>';
      html += '<button class="btn-del-event" onclick="deleteEvent(' + idxInAll + ')">Del</button>';
      html += '</td></tr>';
    }

    tbody.innerHTML = html;
  }

  function openEditEventModal(idx) {
    var ev = offenseEvents[idx];
    document.getElementById('edit-event-id').value = idx;

    var sel = document.getElementById('edit-event-player');
    sel.innerHTML = '<option value="team">Team / Unassigned</option>';
    roster.forEach(function(r){
      sel.innerHTML += '<option value="' + r.name + '">' + r.name + ' (#' + r.number + ')</option>';
    });
    sel.value = ev.playerName;

    document.getElementById('edit-event-trigger').value = ev.playTrigger;
    document.getElementById('edit-event-zone').value = ev.shotZone;
    document.getElementById('edit-event-outcome').value = ev.outcome;
    document.getElementById('edit-event-points').value = ev.points;
    document.getElementById('edit-event-qtr').value = ev.quarter;
    document.getElementById('edit-event-clock').value = ev.gameClock;

    document.getElementById('modal-edit-event').style.display = 'flex';
  }

  function handleSaveEventEdit(e) {
    e.preventDefault();
    var idx = parseInt(document.getElementById('edit-event-id').value, 10);
    var ev = offenseEvents[idx];

    var pName = document.getElementById('edit-event-player').value;
    var foundR = roster.find(function(r){ return r.name === pName; });

    ev.playerName = pName;
    ev.playerId = foundR ? foundR.id : "team";
    ev.playTrigger = document.getElementById('edit-event-trigger').value.trim();
    ev.shotZone = document.getElementById('edit-event-zone').value;
    ev.outcome = document.getElementById('edit-event-outcome').value;
    ev.points = parseInt(document.getElementById('edit-event-points').value, 10) || 0;
    ev.quarter = document.getElementById('edit-event-qtr').value.trim();
    ev.gameClock = document.getElementById('edit-event-clock').value.trim();

    // Recompute notation symbol
    if (ev.outcome === 'turnover') {
      ev.notationSymbol = 'TO';
    } else if (ev.outcome === 'open_make') {
      ev.notationSymbol = '(' + ev.shotZone + ')';
    } else if (ev.outcome === 'contested_make') {
      ev.notationSymbol = '<u>(' + ev.shotZone + ')</u>';
    } else if (ev.outcome === 'open_miss') {
      ev.notationSymbol = ev.shotZone;
    } else if (ev.outcome === 'contested_miss') {
      ev.notationSymbol = '<u>' + ev.shotZone + '</u>';
    } else if (ev.outcome === 'foul_no_ft') {
      ev.notationSymbol = '[' + ev.shotZone + ']';
    } else if (ev.outcome === 'foul_made_ft') {
      ev.notationSymbol = '[' + ev.shotZone + '/' + (ev.points > 0 ? ev.points : '') + ']';
    } else if (ev.outcome === 'and_1') {
      ev.notationSymbol = '▲(' + ev.shotZone + ')';
    }

    closeModal('modal-edit-event');
    saveAndSyncEvents(false);
  }

  function deleteEvent(idx) {
    if (confirm("Delete this offensive event?")) {
      offenseEvents.splice(idx, 1);
      saveAndSyncEvents(false);
    }
  }

  function clearCurrentGameEvents() {
    if (confirm("Clear all offensive events for this game? This cannot be undone.")) {
      offenseEvents = [];
      saveAndSyncEvents(false);
    }
  }

  function exportOffenseCSV() {
    if (offenseEvents.length === 0) {
      alert("No events to export.");
      return;
    }
    var headers = ["id", "gameId", "opponent", "date", "quarter", "gameClock", "activeLineup", "playerId", "playerName", "playTrigger", "shotZone", "isContested", "outcome", "points", "notationSymbol", "createdAt"];
    var csv = headers.join(",") + "\\n";

    offenseEvents.forEach(function(row) {
      var line = [
        row.id,
        row.gameId,
        '"' + (row.opponent || '').replace(/"/g, '""') + '"',
        row.date,
        row.quarter,
        row.gameClock,
        '"' + (row.activeLineup || []).join(';') + '"',
        row.playerId,
        '"' + (row.playerName || '').replace(/"/g, '""') + '"',
        '"' + (row.playTrigger || '').replace(/"/g, '""') + '"',
        row.shotZone,
        row.isContested,
        row.outcome,
        row.points,
        '"' + (row.notationSymbol || '').replace(/"/g, '""') + '"',
        row.createdAt
      ];
      csv += line.join(",") + "\\n";
    });

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = "game_offense_events_" + gameSetup.date + ".csv";
    a.click();
  }

  window.onload = initApp;
</script>

</body>
</html>`;

fs.writeFileSync(path.join(ROOT, 'offense-logger.html'), htmlContent, 'utf8');
console.log('✅ Generated offense-logger.html with tactical 3-step sequence!');
