const https = require('https');

function fetchUrl(url) {
  return new Promise(resolve => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let loc = res.headers.location;
        if (!loc.startsWith('http')) loc = new URL(url).origin + loc;
        return fetchUrl(loc).then(resolve);
      }
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve(b));
    }).on('error', () => resolve(''));
  });
}

(async () => {
  const prestoUrls = [
    'https://macewangriffins.ca/sports/mbball/2026-27/roster',
    'https://macewangriffins.ca/sports/mbball/2026-27/roster?view=grid',
    'https://macewangriffins.ca/sports/mens-basketball/roster?view=grid',
    'https://macewangriffins.ca/sports/mbball/index',
    'https://macewangriffins.ca/sports/mbball/2025-26/roster'
  ];

  for (const u of prestoUrls) {
    const html = await fetchUrl(u);
    console.log(u, '=> Length:', html.length);
    const photos = html.match(/\/sports\/mbball\/[^\s"']+\.(?:jpg|png|webp|jpeg)/gi) || [];
    console.log('  Photos found:', photos.length, photos.slice(0, 5));
    const imgs = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
    console.log('  Imgs count:', imgs.length);
  }
})();
