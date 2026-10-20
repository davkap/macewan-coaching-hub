const https = require('https');
const fs = require('fs');

https.get('https://usportshoops.ca/history/teamseason.php?Gender=MBB&Season=2026-27&Team=MacEwan', { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    console.log('MacEwan USports Hoops page length:', b.length);
    const imgs = [...b.matchAll(/<img[^>]+>/gi)].map(m => m[0]);
    console.log('Imgs on MacEwan USports Hoops page:', imgs.length);
    imgs.forEach(i => console.log('  ', i));
    const playerLinks = [...b.matchAll(/href=["'](person\.php\?[^"']+)["'][^>]*>([^<]+)/gi)];
    console.log('Player links count:', playerLinks.length);
    playerLinks.slice(0, 5).forEach(p => console.log('  ', p[2], '=>', p[1]));
  });
});
