const https = require('https');
const fs = require('fs');

https.get('https://usportshoops.ca/history/teams.php?Gender=MBB', { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    fs.writeFileSync('teams_page.html', b);
    console.log('Saved teams_page.html, length:', b.length);
    const links = [...b.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1]);
    console.log('Total links:', links.length);
    const teamLinks = links.filter(l => l.includes('team') || l.includes('Team') || l.includes('.php'));
    console.log('Team / PHP links:', teamLinks.slice(0, 40));
  });
});
