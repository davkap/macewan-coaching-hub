const https = require('https');

function fetchUrl(url) {
  return new Promise(resolve => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, res => {
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
  const urls = [
    'https://cascades.ufv.ca/sports/mens-basketball/roster',
    'https://gopronghorns.ca/sports/mens-basketball/roster',
    'https://govikes.ca/sports/mens-basketball/roster',
    'https://gobisons.ca/sports/mens-basketball/roster',
    'https://gowolfpack.ca/sports/mens-basketball/roster',
    'https://gothunderbirds.ca/sports/mens-basketball/roster',
    'https://unbc.ca/timberwolves/sports/mens-basketball/roster'
  ];

  for (const u of urls) {
    const html = await fetchUrl(u);
    console.log(u, '=> Length:', html.length);
    if (html.length > 0) {
      const imgs = html.match(/<img[^>]+>/gi) || [];
      console.log('  Total imgs:', imgs.length);
      const playerImgs = imgs.filter(i => i.includes('images/') || i.includes('sidearm') || i.includes('cropped') || i.includes('headshot') || i.includes('data-src'));
      console.log('  Player img tags:', playerImgs.length);
      if (playerImgs.length > 0) {
        console.log('  Sample:', playerImgs.slice(0, 3));
      }
    }
  }
})();
