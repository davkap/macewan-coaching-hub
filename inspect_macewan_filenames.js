const https = require('https');

https.get('https://macewangriffins.ca/sports/mbkb/2026-27/roster', { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    const photos = [...new Set(b.match(/\/sports\/mbkb\/[^\s"']+\.(?:jpg|png|webp|jpeg)/gi) || [])];
    console.log('MacEwan 2026-27 Photos (Total:', photos.length, '):');
    photos.forEach(p => console.log('  https://macewangriffins.ca' + p));
  });
});
