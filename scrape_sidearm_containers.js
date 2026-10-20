const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

function fetchUrl(url) {
  return new Promise(resolve => {
    try {
      const client = url.startsWith("https") ? https : http;
      const req = client.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let loc = res.headers.location;
          if (!loc.startsWith("http")) loc = new URL(url).origin + loc;
          return fetchUrl(loc).then(resolve);
        }
        let body = "";
        res.on("data", c => body += c);
        res.on("end", () => resolve(body));
      });
      req.on("error", () => resolve(""));
      req.setTimeout(12000, () => { req.destroy(); resolve(""); });
    } catch(e) { resolve(""); }
  });
}

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const teams = [
  { key: "alberta-golden-bears", url: "https://bearsandpandas.ca/sports/mens-basketball/roster" },
  { key: "brandon-bobcats", url: "https://gobobcats.ca/sports/mens-basketball/roster" },
  { key: "calgary-dinos", url: "https://godinos.com/sports/mens-basketball/roster" },
  { key: "fraser-valley-cascades", url: "https://cascades.ufv.ca/sports/mens-basketball/roster" },
  { key: "lethbridge-pronghorns", url: "https://gopronghorns.ca/sports/mens-basketball/roster" },
  { key: "manitoba-bisons", url: "https://gobisons.ca/sports/mens-basketball/roster" },
  { key: "mount-royal-cougars", url: "https://mrucougars.com/sports/mens-basketball/roster" },
  { key: "regina-cougars", url: "https://reginacougars.com/sports/mens-basketball/roster" },
  { key: "saskatchewan-huskies", url: "https://huskies.usask.ca/sports/mens-basketball/roster" },
  { key: "thompson-rivers-wolfpack", url: "https://gowolfpack.ca/sports/mens-basketball/roster" },
  { key: "trinity-western-spartans", url: "https://gospartans.ca/sports/mens-basketball/roster" },
  { key: "ubc-thunderbirds", url: "https://gothunderbirds.ca/sports/mens-basketball/roster" },
  { key: "ubco-heat", url: "https://goheat.ca/sports/mens-basketball/roster" },
  { key: "unbc-timberwolves", url: "https://unbc.ca/timberwolves/sports/mens-basketball/roster" },
  { key: "victoria-vikes", url: "https://govikes.ca/sports/mens-basketball/roster" },
  { key: "winnipeg-wesmen", url: "https://wesmen.ca/sports/mens-basketball/roster" }
];

async function main() {
  const jsonPath = path.join(__dirname, 'data/usports-rosters-stats.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  for (const t of teams) {
    console.log(`\nParsing containers for ${t.key} from ${t.url}...`);
    const html = await fetchUrl(t.url);
    if (!html || html.length < 500) {
      console.log(`  Failed to fetch HTML for ${t.key}`);
      continue;
    }

    const origin = new URL(t.url).origin;
    const playerHeadshots = {};

    // Match all player card blocks (li, tr, div)
    const blocks = html.match(/<(?:li|tr|div)[^>]*class=["'][^"']*sidearm-roster-player[^"']*["'][\s\S]*?<\/(?:li|tr|div)>/gi) ||
                   html.match(/<li[^>]*class=["'][^"']*roster-item[^"']*["'][\s\S]*?<\/li>/gi) || [];

    console.log(`  Found ${blocks.length} player card blocks`);

    for (const b of blocks) {
      // Find image URL
      const imgM = b.match(/(?:src|data-src)=["']([^"']+\.(?:jpg|png|webp|jpeg)[^"']*)["']/i);
      // Find name (from link text or aria-label or title)
      const nameM = b.match(/aria-label=["']([^"']+)["']/i) ||
                    b.match(/title=["']([^"']+)["']/i) ||
                    b.match(/href=["'][^"']*\/roster\/[^"']+["'][^>]*>([^<]+)</i) ||
                    b.match(/<a[^>]*class=["'][^"']*name[^"']*["'][^>]*>([^<]+)</i);

      if (imgM && nameM) {
        let src = imgM[1];
        let name = nameM[1].replace(/ - View Profile.*/i, '').replace(/headshot/i, '').trim();
        if (src.startsWith('/')) src = origin + src;
        src = src.replace(/\?width=\d+&quality=\d+/i, '?width=500&quality=95');
        if (name && src && !src.includes('placeholder') && !src.includes('logo')) {
          playerHeadshots[normalize(name)] = src;
        }
      }
    }

    console.log(`  Extracted ${Object.keys(playerHeadshots).length} headshots from containers`);

    // Match to roster
    const teamObj = data[t.key];
    if (teamObj && (teamObj.roster || teamObj.players)) {
      const rosterList = teamObj.roster || teamObj.players;
      let matchedCount = 0;
      for (const p of rosterList) {
        const normPName = normalize(p.name);
        let foundImg = playerHeadshots[normPName];

        if (!foundImg) {
          const pNameParts = (p.name || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
          if (pNameParts.length >= 2) {
            const first = pNameParts[0];
            const last = pNameParts[pNameParts.length - 1];
            for (const key of Object.keys(playerHeadshots)) {
              if (key.includes(first) && key.includes(last)) {
                foundImg = playerHeadshots[key];
                break;
              }
            }
          }
        }

        if (foundImg) {
          p.photo = foundImg;
          matchedCount++;
        }
      }
      console.log(`  Matched ${matchedCount} / ${rosterList.length} players for ${t.key}`);
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log('\nUpdated data/usports-rosters-stats.json successfully!');
}

main();
