// Player PIN logins.
//
// PINs are checked here, on the server, and stored only as salted scrypt
// hashes in their own Blobs store ("player-auth"). Nobody (coaches included)
// can read a PIN back. The old Google Sheet PINs are only used once per
// player, the first time he logs in after this change:
//   - his PIN is checked against the Google Sheet script (verifyPlayerPin);
//   - if it was the default 1234 he must choose his own PIN before going in;
//   - any other PIN is copied over (hashed) and used from then on.
//
//   POST { action: 'login',  slug, pin }                 -> { ok, mustChange, changeToken, profile }
//   POST { action: 'setPin', slug, changeToken, newPin } -> { ok }
//   GET  (X-Staff-Token)                                 -> { ok, players: { slug: { status, setAt } } }
//   POST { action: 'reset', slug } (X-Staff-Token)       -> next login with 1234, then a new PIN
const { getStore, connectLambda } = require('@netlify/blobs');
const crypto = require('crypto');
const staffToken = require('./lib/staff-token');

const SHEET_API = process.env.PLAYER_SHEET_API_FOR_TESTS || 'https://script.google.com/macros/s/AKfycbyJwh21nik5_gF7Tqq5VOyHCkdu4Yeboazjp0Msx4YI69Fc3OUg_JpeHcHCyGv42qFlOQ/exec';
const DEFAULT_PIN = '1234';
const MAX_FAILS = 8;               // wrong PINs in a row before a 15-minute lock
const LOCK_MS = 15 * 60 * 1000;

const memory = global._playerAuthMemory || (global._playerAuthMemory = new Map());
const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const reply = (statusCode, body) => ({ statusCode, headers: HEADERS, body: JSON.stringify(body) });
const sleep = ms => new Promise(r => setTimeout(r, ms));

function store() {
  try { return getStore('player-auth'); } catch (e) { return null; }
}
async function getRec(slug) {
  const s = store();
  try { if (s) { const v = await s.get('p_' + slug); return v ? JSON.parse(v) : null; } } catch (e) {}
  const v = memory.get('p_' + slug);
  return v ? JSON.parse(v) : null;
}
async function putRec(slug, rec) {
  const s = store();
  const v = JSON.stringify(rec);
  try { if (s) { await s.set('p_' + slug, v); return; } } catch (e) {}
  memory.set('p_' + slug, v);
}
async function listRecs() {
  const out = {};
  const s = store();
  try {
    if (!s) throw new Error('no store');
    const { blobs } = await s.list({ prefix: 'p_' });
    const vals = await Promise.all((blobs || []).map(b => s.get(b.key)));
    vals.forEach((v, i) => { try { out[blobs[i].key.slice(2)] = JSON.parse(v); } catch (e) {} });
  } catch (e) {
    memory.forEach((v, k) => { if (k.indexOf('p_') === 0) try { out[k.slice(2)] = JSON.parse(v); } catch (err) {} });
  }
  return out;
}

function hashPin(pin, salt) {
  return crypto.scryptSync(String(pin), salt, 32).toString('hex');
}
function pinMatches(pin, rec) {
  if (!rec || !rec.hash || !rec.salt) return false;
  const a = Buffer.from(hashPin(pin, rec.salt), 'hex');
  const b = Buffer.from(rec.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Short-lived pass that lets a player who just logged in with 1234 set his PIN.
function changeSecret() {
  return crypto.createHash('sha256').update('pin-change|' + (process.env.HUB_COACH_PASSWORD || '') + '|' + (process.env.HUB_ADMIN_PASSWORD || '') + '|' + (process.env.PLAYER_PIN_SECRET || '')).digest();
}
function makeChangeToken(slug) {
  const exp = Date.now() + 15 * 60 * 1000;
  const sig = crypto.createHmac('sha256', changeSecret()).update(slug + '|' + exp).digest('base64url');
  return exp + '.' + sig;
}
function checkChangeToken(slug, token) {
  const [exp, sig] = String(token || '').split('.');
  if (!exp || !sig || +exp < Date.now()) return false;
  const expected = crypto.createHmac('sha256', changeSecret()).update(slug + '|' + exp).digest('base64url');
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

async function sheet(body) {
  const r = await fetch(SHEET_API, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body), redirect: 'follow' });
  return r.json();
}

// Goal / injuries for the S&C app, from the Google Sheet (best effort).
async function sheetProfile(slug) {
  try {
    const r = await fetch(SHEET_API + '?action=getRoster&isAdmin=true', { redirect: 'follow' });
    const list = await r.json();
    const p = (Array.isArray(list) ? list : []).find(x => x.slug === slug);
    if (!p) return null;
    return { name: p.name, goal: p.goal, injuries: p.injuries, cardioPref: p.cardioPref, pin: p.pin };
  } catch (e) { return null; }
}

const validNewPin = pin => /^\d{4,6}$/.test(pin) && pin !== DEFAULT_PIN && !/^(\d)\1+$/.test(pin);

async function failed(slug, rec) {
  const r = rec || {};
  const now = Date.now();
  r.fails = (r.failAt && now - r.failAt < LOCK_MS ? (r.fails || 0) : 0) + 1;
  r.failAt = now;
  await putRec(slug, r);
  await sleep(500);
  return reply(401, { ok: false, message: r.fails >= MAX_FAILS ? 'Too many wrong PINs. Try again in 15 minutes, or ask a coach to reset your PIN.' : 'Incorrect PIN. Please try again.' });
}

exports.handler = async function (event) {
  try { connectLambda(event); } catch (e) {}
  const h = event.headers || {};
  const staff = staffToken.check(h['x-staff-token'] || h['X-Staff-Token']);

  if (event.httpMethod === 'GET') {
    if (!staff) return reply(401, { ok: false, message: 'Staff login needed.' });
    const recs = await listRecs();
    const players = {};
    Object.entries(recs).forEach(([slug, r]) => {
      players[slug] = { status: r.hash ? 'personal' : (r.reset ? 'reset' : 'none'), setAt: r.setAt || r.resetAt || '' };
    });
    return reply(200, { ok: true, players });
  }
  if (event.httpMethod !== 'POST') return reply(405, { ok: false, message: 'Method Not Allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return reply(400, { ok: false, message: 'Bad request.' }); }
  const slug = String(body.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
  if (!slug) return reply(400, { ok: false, message: 'Pick your name first.' });

  if (body.action === 'login') {
    const pin = String(body.pin || '').trim();
    const rec = await getRec(slug);
    if (rec && rec.fails >= MAX_FAILS && Date.now() - rec.failAt < LOCK_MS) {
      return reply(429, { ok: false, message: 'Too many wrong PINs. Try again in 15 minutes, or ask a coach to reset your PIN.' });
    }
    const clean = r => { if (r) { delete r.fails; delete r.failAt; } return r; };

    if (rec && rec.hash) {
      if (!pinMatches(pin, rec)) return failed(slug, rec);
      await putRec(slug, clean(rec));
      return reply(200, { ok: true, mustChange: false, memberToken: staffToken.issue('player', 14, { slug }), profile: await sheetProfile(slug) });
    }
    if (rec && rec.reset) {
      if (pin !== DEFAULT_PIN) return failed(slug, rec);
      await putRec(slug, clean(rec));
      return reply(200, { ok: true, mustChange: true, changeToken: makeChangeToken(slug), profile: await sheetProfile(slug) });
    }
    // First login since PINs moved here: check the Google Sheet PIN once.
    let res;
    try { res = await sheet({ action: 'verifyPlayerPin', slug, pin }); } catch (e) {
      return reply(503, { ok: false, message: 'Could not reach the login server. Try again in a minute.' });
    }
    if (!res || res.status !== 'success') return failed(slug, rec);
    const p = res.profile || {};
    const profile = { name: p.name, goal: p.goal, injuries: p.injuries, cardioPref: p.cardioPref, pin: p.pin };
    if (pin === DEFAULT_PIN) {
      if (rec) await putRec(slug, clean(rec));
      return reply(200, { ok: true, mustChange: true, changeToken: makeChangeToken(slug), profile });
    }
    const salt = crypto.randomBytes(16).toString('hex');
    await putRec(slug, { hash: hashPin(pin, salt), salt, setAt: new Date().toISOString(), from: 'sheet' });
    return reply(200, { ok: true, mustChange: false, memberToken: staffToken.issue('player', 14, { slug }), profile });
  }

  if (body.action === 'setPin') {
    const newPin = String(body.newPin || '').trim();
    if (!checkChangeToken(slug, body.changeToken)) return reply(401, { ok: false, message: 'That took too long. Log in again with 1234 to set your PIN.' });
    if (!validNewPin(newPin)) return reply(400, { ok: false, message: 'Pick 4 to 6 digits. Not 1234, and not the same digit repeated.' });
    const salt = crypto.randomBytes(16).toString('hex');
    await putRec(slug, { hash: hashPin(newPin, salt), salt, setAt: new Date().toISOString(), from: 'player' });
    return reply(200, { ok: true, memberToken: staffToken.issue('player', 14, { slug }) });
  }

  if (body.action === 'reset') {
    if (!staff) return reply(401, { ok: false, message: 'Staff login needed.' });
    await putRec(slug, { reset: true, resetAt: new Date().toISOString() });
    return reply(200, { ok: true });
  }

  return reply(400, { ok: false, message: 'Unknown action.' });
};
