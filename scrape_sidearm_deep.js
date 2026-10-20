const fs = require('fs');
const path = require('path');
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

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const remainingTeams = [
  { key: "calgary-dinos", url: "https://godinos.com/sports/mens-basketball/roster" },
  { key: "fraser-valley-cascades", url: "https://ufvcascades.ca/sports/mens-basketball/roster" },
  { key: "lethbridge-pronghorns", url: "https://gopronghorns.ca/sports/mens-basketball/roster" },
  { key: "manitoba-bisons", url: "https://gobisons.ca/sports/mens-basketball/roster" },
  { key: "mount-royal-cougars", url: "https://mrucougars.com/sports/mens-basketball/roster" },
  { key: "thompson-rivers-wolfpack", url: "https://gowolfpack.ca/sports/mens-basketball/roster" },
  { key: "trinity-western-spartans", url: "https://gospartans.ca/sports/mens-basketball/roster" },
  { key: "ubc-thunderbirds", url: "https://gothunderbirds.ca/sports/mens-basketball/roster" },
  { key: "unbc-timberwolves", url: "https://unbc.ca/timberwolves/sports/mens-basketball/roster" },
  { key: "victoria-vikes", url: "https://govikes.ca/sports/mens-basketball/roster" }
];

(async () => {
  const jsonPath = path.join(__dirname, 'data/usports-rosters-stats.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  for (const t of remainingTeams) {
    console.log(`\nDeep scraping ${t.key} from ${t.url}...`);
    const html = await fetchUrl(t.url);
    if (!html) continue;

    const origin = new URL(t.url).origin;
    // Extract ALL image src/data-src strings
    const allImages = [...html.matchAll(/(?:src|data-src)=["']([^"']+\.(?:jpg|png|webp|jpeg)[^"']*)["']/gi)].map(m => m[1]);
    console.log(`  Found ${allImages.length} raw image URLs in HTML`);

    const roster = data[t.key]?.roster || data[t.key]?.players || [];
    let matched = 0;

    for (const p of roster) {
      if (p.photo && p.photo.startsWith('http') && !p.photo.includes('placeholder')) continue;

      const pParts = p.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
      if (pParts.length < 2) continue;
      const firstName = pParts[0];
      const lastName = pParts[pParts.length - 1];

      let found = null;
      for (let imgUrl of allImages) {
        if (imgUrl.includes('logo') || imgUrl.includes('placeholder') || imgUrl.includes('banner')) continue;
        const normImg = imgUrl.toLowerCase();
        if (normImg.includes(firstName) && normImg.includes(lastName)) {
          found = imgUrl;
          break;
        } else if (normImg.includes(lastName) && normImg.includes(firstName[0])) {
          found = imgUrl;
          break;
        }
      }

      if (found) {
        if (found.startsWith('/')) found = origin + found;
        found = found.replace(/\?width=\d+&quality=\d+/i, '?width=500&quality=95');
        p.photo = found;
        matched++;
      }
    }
    console.log(`  Matched ${matched} additional photos for ${t.key}`);
  }

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log('\nSaved deep scrape results!');
})();
