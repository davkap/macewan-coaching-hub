const { getStore, connectLambda } = require('@netlify/blobs');

// Returns every Shot Tracker report stored under the "st_report_" prefix.
// Each tracker (phone) saves to its own key, so simultaneous trackers never
// overwrite each other; the MacEwan Database merges them on read.
const globalMemoryStore = global._hubMemoryStore || (global._hubMemoryStore = new Map());
const PREFIX = 'st_report_';

exports.handler = async function(event) {
  try { connectLambda(event); } catch (e) {}
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const reports = [];
  try {
    const store = getStore('coaching-hub-store');
    const { blobs } = await store.list({ prefix: PREFIX });
    const values = await Promise.all((blobs || []).map(b => store.get(b.key)));
    values.forEach((v, i) => {
      if (!v) return;
      try { reports.push(Object.assign({ key: blobs[i].key }, JSON.parse(v))); } catch (e) {}
    });
  } catch (blobErr) {
    globalMemoryStore.forEach((v, k) => {
      if (String(k).indexOf(PREFIX) !== 0) return;
      try { reports.push(Object.assign({ key: k }, typeof v === 'string' ? JSON.parse(v) : v)); } catch (e) {}
    });
  }
  return { statusCode: 200, headers, body: JSON.stringify({ success: true, reports }) };
};
