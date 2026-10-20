// "Refresh Weekly USports Stats" button handler.
//
// The site's stats are baked into the pages when Netlify builds the site
// (`npm run update-stats` scrapes usportshoops.ca, then rebuilds the hub).
// So refreshing the stats means asking Netlify for a fresh build. This
// function does that through a Netlify build hook kept on the server, and
// reports honestly whether Netlify accepted the request.
//
// Netlify environment variable (Site configuration > Environment variables):
//   STATS_BUILD_HOOK_URL - the build hook URL from
//                          Site configuration > Build & deploy > Build hooks
//
// Build hooks only work when the Netlify site is connected to the GitHub repo.

const { getStore, connectLambda } = require('@netlify/blobs');

const COOLDOWN_MINUTES = 5;
const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

function reply(statusCode, body) {
  return { statusCode, headers: HEADERS, body: JSON.stringify(body) };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return reply(405, { success: false, error: 'Method Not Allowed' });
  }

  const hookUrl = process.env.STATS_BUILD_HOOK_URL;
  if (!hookUrl) {
    console.error('[weekly-update] STATS_BUILD_HOOK_URL is not set in Netlify.');
    return reply(503, {
      success: false,
      error: 'Stats refresh is not set up yet: the build hook has not been added in Netlify (STATS_BUILD_HOOK_URL).'
    });
  }

  // Cooldown so repeated clicks don't queue a pile of builds.
  let store = null;
  try {
    connectLambda(event);
    store = getStore('coaching-hub-store');
    const last = await store.get('stats-refresh:last-requested');
    if (last) {
      const ageMin = (Date.now() - new Date(last).getTime()) / 60000;
      if (ageMin < COOLDOWN_MINUTES) {
        return reply(200, {
          success: true,
          alreadyRunning: true,
          requestedAt: last,
          message: ageMin < 1
            ? 'A refresh was started less than a minute ago. It takes about 2-3 minutes.'
            : `A refresh was started ${Math.round(ageMin)} min ago. It takes about 2-3 minutes.`
        });
      }
    }
  } catch (e) {
    console.warn('[weekly-update] Cooldown check skipped:', e.message);
  }

  let res;
  try {
    res = await fetch(hookUrl, { method: 'POST' });
  } catch (e) {
    console.error('[weekly-update] Could not reach Netlify build hook:', e);
    return reply(502, { success: false, error: 'Could not reach Netlify to start the rebuild. Try again in a minute.' });
  }

  if (!res.ok) {
    console.error(`[weekly-update] Build hook returned ${res.status}`);
    return reply(502, {
      success: false,
      error: `Netlify refused the rebuild request (status ${res.status}). Check that the site is connected to GitHub and the build hook still exists.`
    });
  }

  const requestedAt = new Date().toISOString();
  if (store) {
    try { await store.set('stats-refresh:last-requested', requestedAt); } catch (e) {}
  }

  return reply(200, { success: true, requestedAt });
};
