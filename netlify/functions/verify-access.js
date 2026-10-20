// Checks the Coach / Admin passwords on the server so they never appear in
// the website's public code.
//
// The passwords live in Netlify environment variables (Netlify dashboard >
// Site configuration > Environment variables):
//   HUB_COACH_PASSWORD  - password for "Coach / Staff"
//   HUB_ADMIN_PASSWORD  - password for "Admin / Head Coach"
// Changing a password there takes effect after the next deploy.

const crypto = require('crypto');
const staffToken = require('./lib/staff-token');

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store'
};

// Compare without leaking how many characters matched.
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function reply(statusCode, body) {
  return { statusCode, headers: HEADERS, body: JSON.stringify(body) };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return reply(405, { ok: false, message: 'Method Not Allowed' });
  }

  let role = '';
  let password = '';
  try {
    const body = JSON.parse(event.body || '{}');
    role = String(body.role || '');
    password = String(body.password || '');
  } catch (e) {
    return reply(400, { ok: false, message: 'Bad request.' });
  }

  const expected = {
    coach: process.env.HUB_COACH_PASSWORD,
    admin: process.env.HUB_ADMIN_PASSWORD
  }[role];

  if (role !== 'coach' && role !== 'admin') {
    return reply(400, { ok: false, message: 'Unknown role.' });
  }

  if (!expected) {
    console.error(`[verify-access] ${role === 'coach' ? 'HUB_COACH_PASSWORD' : 'HUB_ADMIN_PASSWORD'} is not set in Netlify.`);
    return reply(503, {
      ok: false,
      message: 'Login is not set up yet: the password has not been added in Netlify. Ask the head coach.'
    });
  }

  if (!password || !safeEqual(password, expected)) {
    // Small delay to slow down guessing.
    await new Promise((r) => setTimeout(r, 400));
    return reply(401, {
      ok: false,
      message: role === 'admin'
        ? 'Incorrect admin password. Please try again.'
        : 'Incorrect access password. Please try again.'
    });
  }

  // A signed staff pass, used to open staff-only data such as quiz grades.
  return reply(200, { ok: true, role, token: staffToken.issue(role) });
};
