const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = __dirname;
const DATA_PATH = path.join(ROOT, 'data', 'usports-rosters-stats.json');
const usportsData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const TEAM_ROSTER_URLS = [
  { key: 'macewan', domain: 'https://macewangriffins.ca', url: 'https://macewangriffins.ca/sports/mens-basketball/roster' },
  { key: 'alberta-golden-bears', domain: 'https://gobears.ca', url: 'https://gobears.ca/sports/mens-basketball/roster' },
  { key: 'brandon-bobcats', domain: 'https://gobobcats.ca', url: 'https://gobobcats.ca/sports/mens-basketball/roster' },
  { key: 'calgary-dinos', domain: 'https://godinos.com', url: 'https://godinos.com/sports/mens-basketball/roster' },
  { key: 'fraser-valley-cascades', domain: 'https://cascades.ufv.ca', url: 'https://cascades.ufv.ca/sports/mens-basketball/roster' },
  { key: 'lethbridge-pronghorns', domain: 'https://gopronghorns.ca', url: 'https://gopronghorns.ca/sports/mens-basketball/roster' },
  { key: 'manitoba-bisons', domain: 'https://gobisons.ca', url: 'https://gobisons.ca/sports/mens-basketball/roster' },
  { key: 'mount-royal-cougars', domain: 'https://mrucougars.ca', url: 'https://mrucougars.ca/sports/mens-basketball/roster' },
  { key: 'regina-cougars', domain: 'https://reginacougars.com', url: 'https://reginacougars.com/sports/mens-basketball/roster' },
  { key: 'saskatchewan-huskies', domain: 'https://huskies.usask.ca', url: 'https://huskies.usask.ca/sports/mens-basketball/roster' },
  { key: 'thompson-rivers-wolfpack', domain: 'https://gowolfpack.ca', url: 'https://gowolfpack.ca/sports/mens-basketball/roster' },
  { key: 'trinity-western-spartans', domain: 'https://gospartans.ca', url: 'https://gospartans.ca/sports/mens-basketball/roster' },
  { key: 'ubc-thunderbirds', domain: 'https://gothunderbirds.ca', url: 'https://gothunderbirds.ca/sports/mens-basketball/roster' },
  { key: 'ubco-heat', domain: 'https://goheat.ca', url: 'https://goheat.ca/sports/mens-basketball/roster' },
  { key: 'unbc-timberwolves', domain: 'https://unbc.ca', url: 'https://unbc.ca/timberwolves/sports/mens-basketball/roster' },
  { key: 'victoria-vikes', domain: 'https://govikes.ca', url: 'https://govikes.ca/sports/mens-basketball/roster' },
  { key: 'winnipeg-wesmen', domain: 'https://wesmen.ca', url: 'https://wesmen.ca/sports/mens-basketball/roster' }
];

function fetchUrl(url) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith("https") ? https : http;
      client.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" } }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let loc = res.headers.location;
          if (!loc.startsWith("http")) {
            const u = new URL(url);
            loc = u.origin + loc;
          }
          return fetchUrl(loc).then(resolve);
        }
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => resolve(data));
      }).on("error", () => resolve(""));
    } catch(e) { resolve(""); }
  });
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

async function run() {
  for (const item of TEAM_ROSTER_URLS) {
    console.log(`Scraping headshots for ${item.key}...`);
    const html = await fetchUrl(item.url);
    if (!html) {
      console.log(`Failed to fetch ${item.url}`);
      continue;
    }

    const teamEntry = usportsData[item.key];
    if (!teamEntry || !teamEntry.roster) continue;

    // Match image tags with data-src or src
    const imgMatches = [...html.matchAll(/<img[^>]+(?:data-src|src)="([^"]+)"[^>]*>/gi)];
    const photoUrls = imgMatches
      .map(m => m[1])
      .filter(u => u.includes('/images/') || u.includes('cropped') || u.includes('headshot') || u.includes('roster'));

    let matchedCount = 0;
    teamEntry.roster.forEach(player => {
      const normPlayer = normalizeName(player.name);
      const matchedPhoto = photoUrls.find(url => {
        const normUrl = normalizeName(url);
        // Match player name parts
        const parts = player.name.toLowerCase().split(' ');
        return parts.every(part => normUrl.includes(part));
      });

      if (matchedPhoto) {
        let fullPhoto = matchedPhoto;
        if (!fullPhoto.startsWith('http')) {
          fullPhoto = item.domain + (fullPhoto.startsWith('/') ? '' : '/') + fullPhoto;
        }
        // Clean up query string params for high quality
        fullPhoto = fullPhoto.split('?')[0] + '?width=300';
        player.photo = fullPhoto;
        matchedCount++;
      }
    });

    console.log(`Mapped ${matchedCount}/${teamEntry.roster.length} player photos for ${item.key}`);
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(usportsData, null, 2), 'utf8');
  console.log('Saved updated usports-rosters-stats.json with official player photos!');
}

run();
