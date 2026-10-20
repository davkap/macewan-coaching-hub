const https = require('https');

function fetchUrl(url) {
  return new Promise(resolve => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve(b));
    });
  });
}

(async () => {
  const urls = [
    'https://macewangriffins.ca/sports/mbkb/2026-27/roster',
    'https://macewangriffins.ca/sports/mbkb/2025-26/roster',
    'https://macewangriffins.ca/sports/mbkb/2024-25/roster'
  ];

  for (const u of urls) {
    const html = await fetchUrl(u);
    console.log(u, '=> Length:', html.length);
    // Search for images
    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
    console.log('  Imgs:', imgs.length, imgs.slice(0, 10));
    // Search for photos with .jpg or .png or player names
    const photos = html.match(/[^\s"']+\.(?:jpg|png|webp|jpeg)/gi) || [];
    console.log('  Photos count:', photos.length, photos.filter(p => p.includes('headshot') || p.includes('player') || p.includes('photos')).slice(0, 10));
  }
})();
