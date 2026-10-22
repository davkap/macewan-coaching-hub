// Signed "staff pass" handed out by verify-access.js after a correct Coach /
// Admin password. Functions that show private staff data (quiz grades) check
// it, so a player can't load them just by knowing the address.
// The signing key is derived from the two passwords, so changing a password in
// Netlify also cancels every pass that was handed out before.
const crypto = require('crypto');

const DAYS = 14;

function secret() {
  const c = process.env.HUB_COACH_PASSWORD || '';
  const a = process.env.HUB_ADMIN_PASSWORD || '';
  if (!c && !a) return null;
  return crypto.createHash('sha256').update(`griffin-staff|${c}|${a}`).digest();
}

const b64 = s => Buffer.from(s).toString('base64url');

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

// role: 'coach' | 'admin' (staff pass) or 'player' (member pass, from player-login.js).
function issue(role, days, extra) {
  if (!secret()) return null;
  const payload = b64(JSON.stringify(Object.assign({ role, exp: Date.now() + (days || DAYS) * 86400000 }, extra || {})));
  return `${payload}.${sign(payload)}`;
}

// Returns { role } for a valid, unexpired pass whose role is allowed
// (staff only by default), otherwise null.
function check(token, roles) {
  const allowed = roles || ['coach', 'admin'];
  if (!token || !secret()) return null;
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.exp || data.exp < Date.now()) return null;
    if (allowed.indexOf(data.role) < 0) return null;
    return { role: data.role, slug: data.slug };
  } catch (e) {
    return null;
  }
}

// Anyone logged into the Hub: staff or a player.
const checkMember = token => check(token, ['coach', 'admin', 'player']);

module.exports = { issue, check, checkMember };
