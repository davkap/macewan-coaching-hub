const fs = require('fs');
const https = require('https');

function fetchUrl(url) {
  return new Promise(resolve => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(body));
    }).on('error', () => resolve(''));
  });
}

(async () => {
  const urls = [
    'https://macewangriffins.ca/sports/mens-basketball/roster',
    'https://gobears.ca/sports/mens-basketball/roster',
    'https://godinos.com/sports/mens-basketball/roster'
  ];

  for (const url of urls) {
    const html = await fetchUrl(url);
    console.log('=== URL:', url, 'Length:', html.length);
    // Print all img tags with src or data-src or background-image
    const matches = html.match(/<img[^>]+>/gi) || [];
    console.log('Total img tags:', matches.length);
    for (const m of matches.slice(0, 10)) {
      console.log('  ', m.substring(0, 150));
    }
    // Search for player name links or roster entries
    const rosterEntries = html.match(/class="[^"]*roster[^"]*"/gi) || [];
    console.log('Roster class matches:', rosterEntries.length, rosterEntries.slice(0, 5));
    // Search for image URLs with sidearm or images/
    const imgUrls = html.match(/(https?:[^\s"']+\.(?:jpg|png|jpeg|webp)|[^\s"']+\/images\/[^\s"']+\.(?:jpg|png|jpeg|webp))/gi) || [];
    console.log('Image URLs found:', imgUrls.length);
    if (imgUrls.length > 0) {
      console.log('Sample image URLs:', imgUrls.slice(0, 5));
    }
  }
})();
