// Synergy numbers for the scouting pages (MacEwan's licensed Synergy data).
//
// Kept ONLY here, in the private Blobs store "synergy", never in the public
// repo. Reading needs a Hub pass: a staff pass (verify-access.js) or a
// player's member pass (player-login.js), sent as the X-Hub-Token header.
//
//   GET  ?team=<slug>                     -> { ok, team: <compact data> }
//   GET  ?list=1                          -> { ok, teams: { slug: { pulledAt, gp } } }
//   POST { action: 'put', team, data }    staff pass only
//
// The data comes from scripts/synergy/extract.js, run in a logged-in Synergy
// tab, and is uploaded from synergy.html.
const { getStore, connectLambda } = require('@netlify/blobs');
const staffToken = require('./lib/staff-token');

const memory = global._synergyMemory || (global._synergyMemory = new Map());
const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const reply = (statusCode, body) => ({ statusCode, headers: HEADERS, body: JSON.stringify(body) });
const slugOk = s => /^[a-z0-9-]{2,60}$/.test(String(s || ''));

function store() { try { return getStore('synergy'); } catch (e) { return null; } }
async function get(key) {
  const s = store();
  try { if (s) { const v = await s.get(key); return v ? JSON.parse(v) : null; } } catch (e) {}
  const v = memory.get(key);
  return v ? JSON.parse(v) : null;
}
async function put(key, value) {
  const s = store();
  const v = JSON.stringify(value);
  try { if (s) return await s.set(key, v); } catch (e) {}
  memory.set(key, v);
}

exports.handler = async function (event) {
  try { connectLambda(event); } catch (e) {}
  const h = event.headers || {};
  const token = h['x-hub-token'] || h['X-Hub-Token'] || '';

  if (event.httpMethod === 'GET') {
    if (!staffToken.checkMember(token)) return reply(401, { ok: false, message: 'Log in to the Hub to see Synergy numbers.' });
    const q = event.queryStringParameters || {};
    if (q.list) return reply(200, { ok: true, teams: (await get('index')) || {} });
    if (!slugOk(q.team)) return reply(400, { ok: false, message: 'Pick a team.' });
    return reply(200, { ok: true, team: await get('team_' + q.team) });
  }

  if (event.httpMethod !== 'POST') return reply(405, { ok: false, message: 'Method Not Allowed' });
  if (!staffToken.check(token)) return reply(401, { ok: false, message: 'Staff pass needed to update Synergy numbers.' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return reply(400, { ok: false, message: 'Bad request.' }); }
  if (body.action !== 'put' || !slugOk(body.team)) return reply(400, { ok: false, message: 'Bad request.' });
  const d = body.data || {};
  if (d.v !== 1 || !d.pt || !d.sit) return reply(400, { ok: false, message: 'That does not look like Synergy data from extract.js.' });
  if (JSON.stringify(d).length > 400000) return reply(413, { ok: false, message: 'Too big.' });
  await put('team_' + body.team, d);
  const index = (await get('index')) || {};
  index[body.team] = { pulledAt: d.pulledAt, gp: d.gp, games: (d.games || []).length };
  await put('index', index);
  return reply(200, { ok: true });
};
