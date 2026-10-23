// Griffin Quizzes question bank: coaches' own questions, edits, and hidden
// automatic questions.
//
//   GET                                            anyone logged in: { edits, hidden }
//   POST { action: 'save', question }   staff      add or update a question
//   POST { action: 'delete', id }       staff      delete a bank question
//   POST { action: 'hide', key, q }     staff      stop an automatic question from appearing
//   POST { action: 'unhide', key }      staff
//
// The starter questions live in data/quiz-bank-seed.json (in the repo). A coach's
// edit of a starter question is saved here under the same id and wins; deleting
// one saves { id, deleted: true }. Staff requests carry the signed pass from
// verify-access.js in the "X-Staff-Token" header.
const { getStore, connectLambda } = require('@netlify/blobs');
const crypto = require('crypto');
const staffToken = require('./lib/staff-token');

const memory = global._quizBankMemory || (global._quizBankMemory = new Map());
const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const reply = (statusCode, body) => ({ statusCode, headers: HEADERS, body: JSON.stringify(body) });
const str = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);

function store() { try { return getStore('quiz-bank'); } catch (e) { return null; } }
async function put(key, value) {
  const s = store();
  try { if (s) return await s.set(key, JSON.stringify(value)); } catch (e) {}
  memory.set(key, JSON.stringify(value));
}
async function del(key) {
  const s = store();
  try { if (s) return await s.delete(key); } catch (e) {}
  memory.delete(key);
}
async function all(prefix) {
  const out = [];
  const s = store();
  try {
    if (!s) throw new Error('no store');
    const { blobs } = await s.list({ prefix });
    const vals = await Promise.all((blobs || []).map(b => s.get(b.key)));
    vals.forEach(v => { try { out.push(JSON.parse(v)); } catch (e) {} });
  } catch (e) {
    memory.forEach((v, k) => { if (k.indexOf(prefix) === 0) try { out.push(JSON.parse(v)); } catch (err) {} });
  }
  return out;
}

const safeId = id => String(id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60);

function cleanQuestion(q) {
  const wrong = (Array.isArray(q.wrong) ? q.wrong : []).map(w => str(w, 300)).filter(Boolean).slice(0, 3);
  const tags = [...new Set((Array.isArray(q.tags) ? q.tags : []).map(t => str(t, 40).toLowerCase()).filter(Boolean))].slice(0, 12);
  return {
    id: safeId(q.id) || ('c-' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex')),
    q: str(q.q, 400),
    quote: str(q.quote, 600),
    answer: str(q.answer, 300),
    wrong,
    tags,
    explain: str(q.explain, 400),
    updatedAt: new Date().toISOString(),
    by: str(q.by, 40)
  };
}

exports.handler = async function (event) {
  try { connectLambda(event); } catch (e) {}
  if (event.httpMethod === 'GET') {
    const edits = await all('q_');
    const hidden = await all('h_');
    return reply(200, { ok: true, edits, hidden });
  }
  if (event.httpMethod !== 'POST') return reply(405, { ok: false, message: 'Method Not Allowed' });
  const h = event.headers || {};
  const staff = staffToken.check(h['x-staff-token'] || h['X-Staff-Token']);
  if (!staff) return reply(401, { ok: false, message: 'Staff login needed to change the question bank.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return reply(400, { ok: false, message: 'Bad request.' }); }

  if (body.action === 'save') {
    const q = cleanQuestion(body.question || {});
    if (!q.q || !q.answer || !q.wrong.length) return reply(400, { ok: false, message: 'A question needs the question, the right answer and at least one wrong answer.' });
    if (q.wrong.some(w => w.toLowerCase() === q.answer.toLowerCase())) return reply(400, { ok: false, message: 'A wrong answer is the same as the right answer.' });
    if (!q.tags.length) return reply(400, { ok: false, message: 'Add at least one tag (for example "offence" or "pnr").' });
    await put('q_' + q.id, q);
    return reply(200, { ok: true, question: q });
  }
  if (body.action === 'delete') {
    const id = safeId(body.id);
    if (!id) return reply(400, { ok: false, message: 'Bad id.' });
    // Starter questions (from the repo) need a "deleted" marker; coach questions are just removed.
    if (/^[sc]-/.test(id)) await put('q_' + id, { id, deleted: true, updatedAt: new Date().toISOString() });
    else await del('q_' + id);
    return reply(200, { ok: true });
  }
  if (body.action === 'hide') {
    const key = safeId(body.key);
    if (!key) return reply(400, { ok: false, message: 'Bad key.' });
    await put('h_' + key, { key, q: str(body.q, 400), at: new Date().toISOString() });
    return reply(200, { ok: true });
  }
  if (body.action === 'unhide') {
    const key = safeId(body.key);
    if (!key) return reply(400, { ok: false, message: 'Bad key.' });
    await del('h_' + key);
    return reply(200, { ok: true });
  }
  return reply(400, { ok: false, message: 'Unknown action.' });
};
