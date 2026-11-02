/* Fetches a school's box score page for the Shot Tracker's play-by-play import
   (pbp-import.js reads it in the browser). The browser can't load another
   school's page itself, so this passes it through.

   GET /.netlify/functions/pbp-fetch?url=https://mrucougars.com/sports/mens-basketball/stats/2026-27/macewan-university/boxscore/3142

   Only box score pages are fetched (the address must contain "boxscore"), so
   this can't be used as a general-purpose proxy. Some school sites block
   requests from servers; the tracker then asks the coach to upload the saved
   page instead. */
const MAX_BYTES = 4 * 1024 * 1024;

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const raw = (event.queryStringParameters || {}).url || '';
  let u;
  try { u = new URL(raw); } catch (e) { u = null; }
  if (!u || u.protocol !== 'https:' || !/boxscore/i.test(u.pathname) ||
      /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Paste the link to a game\'s box score page (it has "boxscore" in it).' }) };
  }
  if (!/view=plays/.test(u.search) && /\.xml$/i.test(u.pathname)) u.searchParams.set('view', 'plays');

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(u.toString(), {
      signal: ctl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-CA,en;q=0.9'
      }
    });
    if (!r.ok) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'The school site answered ' + r.status + '. It may block outside requests: save the page and upload it instead.', status: r.status }) };
    }
    const html = await r.text();
    if (html.length > MAX_BYTES) return { statusCode: 502, headers, body: JSON.stringify({ error: 'That page is too large to read.' }) };
    return { statusCode: 200, headers, body: JSON.stringify({ html, url: u.toString() }) };
  } catch (e) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Could not reach the school site (' + (e.name === 'AbortError' ? 'timed out' : e.message) + '). Save the page and upload it instead.' }) };
  } finally {
    clearTimeout(timer);
  }
};
