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

function issue(role) {
  if (!secret()) return null;
  const payload = b64(JSON.stringify({ role, exp: Date.now() + DAYS * 86400000 }));
  return `${payload}.${sign(payload)}`;
}

// Returns { role } for a valid, unexpired pass, otherwise null.
function check(token) {
  if (!token || !secret()) return null;
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.exp || data.exp < Date.now()) return null;
    if (data.role !== 'coach' && data.role !== 'admin') return null;
    return { role: data.role };
  } catch (e) {
    return null;
  }
}

module.exports = { issue, check };
