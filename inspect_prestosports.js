const fs = require('fs');

const html = fs.readFileSync('macewan_roster_raw.html', 'utf8');

// Search for images on prestosports or /sports/mbball/ or /images/
const imgMatches = html.match(/<img[^>]+>/gi) || [];
console.log('Total img tags in macewan_roster_raw.html:', imgMatches.length);
imgMatches.forEach((img, i) => console.log(`${i}:`, img));

// Search for links to player bio pages e.g. /sports/mbball/2026-27/bios/... or /sports/mbball/.../bios/...
const bioLinks = html.match(/href=["'](\/sports\/mbball\/[^"']+)["']/gi) || [];
console.log('Bio links:', bioLinks.length, bioLinks.slice(0, 10));

// Search for table rows or player cards
const trs = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
console.log('Table rows count:', trs.length);
if (trs.length > 0) {
  console.log('Sample TR:', trs[1] || trs[0]);
}
