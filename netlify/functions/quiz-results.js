// Griffin Quizzes: stores players' quiz results and shows them to staff.
//
//   POST   { action: 'submit', result }          anyone logged in (players)
//   GET    ?                                      staff only: every result
//   POST   { action: 'delete', id }               staff only
//
// Staff requests carry the signed pass from verify-access.js in the
// "X-Staff-Token" header. Results live in their own Blobs store
// ("quiz-results"), separate from the site's editable content, so the public
// get-content / save-content functions can't read or overwrite them.
const { getStore, connectLambda } = require('@netlify/blobs');
const crypto = require('crypto');
const staffToken = require('./lib/staff-token');

const memory = global._quizMemoryStore || (global._quizMemoryStore = new Map());
const PREFIX = 'result_';

const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const reply = (statusCode, body) => ({ statusCode, headers: HEADERS, body: JSON.stringify(body) });

function store() {
  try { return getStore('quiz-results'); } catch (e) { return null; }
}

const str = (v, max) => String(v == null ? '' : v).slice(0, max);

// Keep only the fields the results page uses, with sane sizes.
function cleanResult(r) {
  const questions = Array.isArray(r.questions) ? r.questions.slice(0, 60) : [];
  const total = Math.max(0, Math.min(60, parseInt(r.total, 10) || questions.length));
  const score = Math.max(0, Math.min(total, parseInt(r.score, 10) || 0));
  return {
    player: str(r.player, 80),
    playerSlug: str(r.playerSlug, 80).toLowerCase().replace(/[^a-z0-9-]/g, ''),
    quizType: r.quizType === 'concepts' ? 'concepts' : 'scout',
    quizKey: str(r.quizKey, 80),
    quizTitle: str(r.quizTitle, 120),
    score,
    total,
    startedAt: str(r.startedAt, 40),
    finishedAt: new Date().toISOString(),
    questions: questions.map(q => ({
      q: str(q.q, 600),
      source: str(q.source, 80),
      chosen: str(q.chosen, 400),
      correct: str(q.correct, 400),
      ok: !!q.ok
    }))
  };
}

function headerToken(event) {
  const h = event.headers || {};
  return h['x-staff-token'] || h['X-Staff-Token'] || '';
}

exports.handler = async function (event) {
  try { connectLambda(event); } catch (e) {}
  const s = store();

  if (event.httpMethod === 'GET') {
    if (!staffToken.check(headerToken(event))) {
      return reply(401, { success: false, message: 'Staff login needed to see quiz grades.' });
    }
    const results = [];
    try {
      if (!s) throw new Error('no store');
      const { blobs } = await s.list({ prefix: PREFIX });
      const values = await Promise.all((blobs || []).map(b => s.get(b.key)));
      values.forEach((v, i) => {
        if (!v) return;
        try { results.push(Object.assign({ id: blobs[i].key }, JSON.parse(v))); } catch (e) {}
      });
    } catch (e) {
      memory.forEach((v, k) => { try { results.push(Object.assign({ id: k }, JSON.parse(v))); } catch (err) {} });
    }
    results.sort((a, b) => String(b.finishedAt).localeCompare(String(a.finishedAt)));
    return reply(200, { success: true, results });
  }

  if (event.httpMethod !== 'POST') return reply(405, { success: false, message: 'Method Not Allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return reply(400, { success: false, message: 'Bad request.' }); }

  if (body.action === 'submit') {
    const result = cleanResult(body.result || {});
    if (!result.player || !result.total) return reply(400, { success: false, message: 'Missing player or questions.' });
    const id = `${PREFIX}${result.finishedAt.replace(/[^0-9]/g, '')}_${result.playerSlug || 'player'}_${crypto.randomBytes(4).toString('hex')}`;
    const value = JSON.stringify(result);
    try {
      if (!s) throw new Error('no store');
      await s.set(id, value);
    } catch (e) {
      memory.set(id, value);
    }
    return reply(200, { success: true, id });
  }

  if (body.action === 'delete') {
    if (!staffToken.check(headerToken(event))) return reply(401, { success: false, message: 'Staff login needed.' });
    const id = str(body.id, 200);
    if (id.indexOf(PREFIX) !== 0) return reply(400, { success: false, message: 'Bad id.' });
    try {
      if (!s) throw new Error('no store');
      await s.delete(id);
    } catch (e) {
      memory.delete(id);
    }
    return reply(200, { success: true });
  }

  return reply(400, { success: false, message: 'Unknown action.' });
};
