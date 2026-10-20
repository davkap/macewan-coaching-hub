const https = require('https');

https.get('https://usportshoops.ca/history/teamseason.php?Gender=MBB&Season=2026-27&Team=MacEwan', { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    console.log('MacEwan teamseason length:', b.length);
    // Find all links
    const links = [...b.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1]);
    console.log('Links count:', links.length);
    console.log('Sample links:', links.slice(0, 30));
  });
});
