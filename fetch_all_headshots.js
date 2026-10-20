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
      req.setTimeout(10000, () => { req.destroy(); resolve(""); });
    } catch(e) { resolve(""); }
  });
}

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const teams = [
  { key: "macewan", url: "https://macewangriffins.ca/sports/mens-basketball/roster" },
  { key: "alberta-golden-bears", url: "https://gobears.ca/sports/mens-basketball/roster" },
  { key: "brandon-bobcats", url: "https://gobobcats.ca/sports/mens-basketball/roster" },
  { key: "calgary-dinos", url: "https://godinos.com/sports/mens-basketball/roster" },
  { key: "fraser-valley-cascades", url: "https://cascades.ufv.ca/sports/mens-basketball/roster" },
  { key: "lethbridge-pronghorns", url: "https://gopronghorns.ca/sports/mens-basketball/roster" },
  { key: "manitoba-bisons", url: "https://gobisons.ca/sports/mens-basketball/roster" },
  { key: "mount-royal-cougars", url: "https://mrucougars.ca/sports/mens-basketball/roster" },
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

  for (const teamInfo of teams) {
    console.log(`\nFetching ${teamInfo.key} from ${teamInfo.url}...`);
    const html = await fetchUrl(teamInfo.url);
    if (!html) {
      console.log(`  Failed to fetch ${teamInfo.url}`);
      continue;
    }

    const playerHeadshots = {};

    // Strategy 1: JSON-LD Person blocks
    // Many Sidearm Sports sites output JSON-LD blocks containing {"@type": "Person", "name": "...", "image": {"url": "..."}}
    // Or stringified objects with image and name properties.
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
              playerHeadshots[normalize(name)] = img;
            }
          }
        }
      } catch(e) {}
    }

    // Strategy 2: Regex for sidearm roster elements
    // E.g. data-src="/images/..." or src="/images/..." or background-image:url(...)
    // Sidearm player cards: <div class="sidearm-roster-player-image"> <img src="..." alt="Player Name"> ...
    // or <img data-src="..." alt="Player Name">
    const imgRegex = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*alt=["']([^"']+)["']/gi;
    let m;
    while ((m = imgRegex.exec(html)) !== null) {
      const src = m[1];
      const alt = m[2];
      if (src && alt && !src.includes('placeholder') && !src.includes('logo') && !alt.toLowerCase().includes('logo')) {
        let fullUrl = src;
        if (src.startsWith('/')) {
          const origin = new URL(teamInfo.url).origin;
          fullUrl = origin + src;
        }
        playerHeadshots[normalize(alt)] = fullUrl;
      }
    }

    // Alt regex with alt first then src
    const imgRegexAltFirst = /<img[^>]+alt=["']([^"']+)["'][^>]*(?:src|data-src)=["']([^"']+)["']/gi;
    while ((m = imgRegexAltFirst.exec(html)) !== null) {
      const alt = m[1];
      const src = m[2];
      if (src && alt && !src.includes('placeholder') && !src.includes('logo') && !alt.toLowerCase().includes('logo')) {
        let fullUrl = src;
        if (src.startsWith('/')) {
          const origin = new URL(teamInfo.url).origin;
          fullUrl = origin + src;
        }
        if (!playerHeadshots[normalize(alt)]) {
          playerHeadshots[normalize(alt)] = fullUrl;
        }
      }
    }

    // Strategy 3: Sidearm player link/image pattern
    // e.g. images.sidearmsports.com / images/2024/... / images/2025/... / images/2026/...
    const sidearmImgRegex = /(https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp))/gi;
    // Also look for names near images in HTML if needed

    console.log(`  Found ${Object.keys(playerHeadshots).length} mapped headshots for ${teamInfo.key}`);

    // Update roster data
    const teamObj = data[teamInfo.key];
    if (teamObj && (teamObj.roster || teamObj.players)) {
      const rosterList = teamObj.roster || teamObj.players;
      let matchedCount = 0;
      for (const p of rosterList) {
        const normPName = normalize(p.name);
        let foundImg = playerHeadshots[normPName];

        // If direct match failed, try fuzzy matching name (e.g. first + last name)
        if (!foundImg) {
          const pNameParts = (p.name || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
          for (const key of Object.keys(playerHeadshots)) {
            if (pNameParts.length >= 2 && key.includes(pNameParts[0]) && key.includes(pNameParts[pNameParts.length - 1])) {
              foundImg = playerHeadshots[key];
              break;
            }
          }
        }

        if (foundImg) {
          p.photo = foundImg;
          matchedCount++;
        }
      }
      console.log(`  Matched ${matchedCount} / ${rosterList.length} players for ${teamInfo.key}`);
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log('\nUpdated data/usports-rosters-stats.json successfully!');
}

main();
