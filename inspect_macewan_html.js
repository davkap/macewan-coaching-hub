const https = require('https');
const fs = require('fs');

https.get('https://macewangriffins.ca/sports/mens-basketball/roster', { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
  let html = '';
  res.on('data', c => html += c);
  res.on('end', () => {
    fs.writeFileSync('macewan_roster_raw.html', html);
    console.log('Saved macewan_roster_raw.html, length:', html.length);
    // Find references to Isaac or Brown or player names or sidearm data
    const matches = [...html.matchAll(/(Isaac|Brown|Malik|Cange|McArthur|headshot|player|roster)/gi)];
    console.log('Matches count:', matches.length);
    const sampleSnippets = matches.slice(0, 15).map(m => {
      const idx = m.index;
      return html.substring(Math.max(0, idx - 100), Math.min(html.length, idx + 200));
    });
    console.log('Sample snippets:\n', sampleSnippets.join('\n---\n'));
  });
});
