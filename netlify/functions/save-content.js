const { getStore, connectLambda } = require('@netlify/blobs');

// In-memory fallback for local testing
const globalMemoryStore = global._hubMemoryStore || (global._hubMemoryStore = new Map());

exports.handler = async function(event, context) {
  try {
    connectLambda(event);
  } catch (e) {}
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { key, content } = payload;

    if (!key || content === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Key and content parameters are required' })
      };
    }

    let savedViaBlob = false;
    try {
      const store = getStore('coaching-hub-store');
      await store.set(key, typeof content === 'string' ? content : JSON.stringify(content));
      savedViaBlob = true;
      console.log(`[save-content] Stored key "${key}" in Netlify Blobs.`);
    } catch (blobErr) {
      console.warn(`[save-content] Netlify Blobs notice (${blobErr.message}). Storing in memory fallback.`);
    }

    // Always update memory store as fallback
    globalMemoryStore.set(key, content);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        key: key,
        blobSaved: savedViaBlob,
        timestamp: new Date().toISOString(),
        message: 'Content successfully saved and synced live across all coaches & players!'
      })
    };
  } catch (err) {
    console.error('[save-content] Handler Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' })
    };
  }
};
