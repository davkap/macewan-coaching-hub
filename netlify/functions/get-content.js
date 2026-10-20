const { getStore, connectLambda } = require('@netlify/blobs');

const globalMemoryStore = global._hubMemoryStore || (global._hubMemoryStore = new Map());

exports.handler = async function(event, context) {
  try {
    connectLambda(event);
  } catch (e) {}
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const key = event.queryStringParameters ? event.queryStringParameters.key : null;

  if (!key) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Key query parameter is required' })
    };
  }

  try {
    let content = null;

    try {
      const store = getStore('coaching-hub-store');
      content = await store.get(key);
    } catch (blobErr) {
      console.warn(`[get-content] Netlify Blobs read notice (${blobErr.message}). Checking memory fallback.`);
    }

    if (content === null || content === undefined) {
      content = globalMemoryStore.get(key) || null;
    }

    if (content !== null && content !== undefined) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          key: key,
          content: content,
          timestamp: new Date().toISOString()
        })
      };
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          key: key,
          message: 'No saved content found for this key'
        })
      };
    }
  } catch (err) {
    console.error('[get-content] Handler Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' })
    };
  }
};
