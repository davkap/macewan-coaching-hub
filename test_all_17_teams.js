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

const teamConfigs = [
  { key: "macewan", url: "https://macewangriffins.ca/sports/mbkb/2026-27/roster" },
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

  for (const tc of teamConfigs) {
    console.log(`\n========================================`);
    console.log(`Processing ${tc.key} ...`);
    const html = await fetchUrl(tc.url);
    if (!html) {
      console.log(`❌ Failed to fetch ${tc.url}`);
      continue;
    }
    console.log(`Fetched ${html.length} bytes`);

    const playerHeadshots = {};
    const origin = new URL(tc.url).origin;

    // 1. JSON-LD @type: Person
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const block of jsonLdMatches) {
      try {
        const jsonText = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
        const parsed = JSON.parse(jsonText);
        const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
        for (const item of items) {
          if (item['@type'] === 'Person' || item.name) {
            const name = item.name;
            let img = '';
            if (typeof item.image === 'string') img = item.image;
            else if (item.image && item.image.url) img = item.image.url;
            else if (item.image && item.image.contentUrl) img = item.image.contentUrl;

            if (name && img) {
              let fullUrl = img.startsWith('/') ? origin + img : img;
              playerHeadshots[normalize(name)] = fullUrl;
            }
          }
        }
      } catch(e) {}
    }

    // 2. PrestoSports table rows / photos (MacEwan)
    // E.g. <tr ...> ... <a href="...">Player Name</a> ... <img src="/sports/mbkb/2026-27/photos/..." alt="...">
    // Or <td class="photo"> <img src="..." alt="Player Name">
    const prestoPhotos = html.match(/<img[^>]+src=["']([^"']+\.(?:jpg|png|webp|jpeg))["'][^>]*alt=["']([^"']+)["']/gi) || [];
    for (const pImg of prestoPhotos) {
      const srcM = pImg.match(/src=["']([^"']+)["']/i);
      const altM = pImg.match(/alt=["']([^"']+)["']/i);
      if (srcM && altM) {
        let src = srcM[1];
        let name = altM[1].replace(/ - View Profile.*/i, '').replace(/headshot/i, '').trim();
        if (src.startsWith('/')) src = origin + src;
        if (name && !src.includes('logo') && !src.includes('placeholder')) {
          playerHeadshots[normalize(name)] = src;
        }
      }
    }

    // 3. Sidearm Sports roster image patterns
    // E.g. <img class="lazyload" data-src="/images/2025/10/10/Player_Name.jpg..." alt="Player Name - View Profile">
    const imgRegex = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*alt=["']([^"']+)["']/gi;
    let m;
    while ((m = imgRegex.exec(html)) !== null) {
      let src = m[1];
      let alt = m[2].replace(/ - View Profile.*/i, '').replace(/headshot/i, '').trim();
      if (src.startsWith('/')) src = origin + src;
      if (src && alt && !src.includes('placeholder') && !src.includes('logo') && !alt.toLowerCase().includes('logo')) {
        playerHeadshots[normalize(alt)] = src;
      }
    }

    const imgRegexAltFirst = /<img[^>]+alt=["']([^"']+)["'][^>]*(?:src|data-src)=["']([^"']+)["']/gi;
    while ((m = imgRegexAltFirst.exec(html)) !== null) {
      let alt = m[1].replace(/ - View Profile.*/i, '').replace(/headshot/i, '').trim();
      let src = m[2];
      if (src.startsWith('/')) src = origin + src;
      if (src && alt && !src.includes('placeholder') && !src.includes('logo') && !alt.toLowerCase().includes('logo')) {
        if (!playerHeadshots[normalize(alt)]) {
          playerHeadshots[normalize(alt)] = src;
        }
      }
    }

    console.log(`  Extracted ${Object.keys(playerHeadshots).length} headshots mapping keys.`);

    // Match against target roster
    const teamObj = data[tc.key];
    if (teamObj && (teamObj.roster || teamObj.players)) {
      const rosterList = teamObj.roster || teamObj.players;
      let matchedCount = 0;
      for (const p of rosterList) {
        const normPName = normalize(p.name);
        let foundImg = playerHeadshots[normPName];

        if (!foundImg) {
          // Fuzzy match on first + last name
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
          // Store clean photo URL
          p.photo = foundImg;
          matchedCount++;
        }
      }
      console.log(`  Matched ${matchedCount} / ${rosterList.length} players for ${tc.key}`);
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log('\nUpdated data/usports-rosters-stats.json successfully!');
}

main();
