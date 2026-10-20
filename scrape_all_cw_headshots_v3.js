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
  { key: "macewan", urls: ["https://macewangriffins.ca/sports/mbkb/2026-27/roster"] },
  { key: "alberta-golden-bears", urls: ["https://bearsandpandas.ca/sports/mens-basketball/roster?view=grid", "https://bearsandpandas.ca/sports/mens-basketball/roster"] },
  { key: "brandon-bobcats", urls: ["https://gobobcats.ca/sports/mens-basketball/roster?view=grid", "https://gobobcats.ca/sports/mens-basketball/roster"] },
  { key: "calgary-dinos", urls: ["https://godinos.com/sports/mens-basketball/roster?view=grid", "https://godinos.com/sports/mens-basketball/roster"] },
  { key: "fraser-valley-cascades", urls: ["https://ufvcascades.ca/sports/mens-basketball/roster?view=grid", "https://cascades.ufv.ca/sports/mens-basketball/roster?view=grid"] },
  { key: "lethbridge-pronghorns", urls: ["https://gopronghorns.ca/sports/mens-basketball/roster?view=grid"] },
  { key: "manitoba-bisons", urls: ["https://gobisons.ca/sports/mens-basketball/roster?view=grid", "https://gobisons.ca/sports/mens-basketball/roster"] },
  { key: "mount-royal-cougars", urls: ["https://mrucougars.com/sports/mens-basketball/roster?view=grid", "https://mrucougars.com/sports/mens-basketball/roster"] },
  { key: "regina-cougars", urls: ["https://reginacougars.com/sports/mens-basketball/roster?view=grid", "https://reginacougars.com/sports/mens-basketball/roster"] },
  { key: "saskatchewan-huskies", urls: ["https://huskies.usask.ca/sports/mens-basketball/roster?view=grid", "https://huskies.usask.ca/sports/mens-basketball/roster"] },
  { key: "thompson-rivers-wolfpack", urls: ["https://gowolfpack.ca/sports/mens-basketball/roster?view=grid", "https://gowolfpack.ca/sports/mens-basketball/roster"] },
  { key: "trinity-western-spartans", urls: ["https://gospartans.ca/sports/mens-basketball/roster?view=grid", "https://gospartans.ca/sports/mens-basketball/roster"] },
  { key: "ubc-thunderbirds", urls: ["https://gothunderbirds.ca/sports/mens-basketball/roster?view=grid", "https://gothunderbirds.ca/sports/mens-basketball/roster"] },
  { key: "ubco-heat", urls: ["https://goheat.ca/sports/mens-basketball/roster?view=grid", "https://goheat.ca/sports/mens-basketball/roster"] },
  { key: "unbc-timberwolves", urls: ["https://unbc.ca/timberwolves/sports/mens-basketball/roster?view=grid", "https://unbc.ca/sports/mens-basketball/roster?view=grid"] },
  { key: "victoria-vikes", urls: ["https://govikes.ca/sports/mens-basketball/roster?view=grid", "https://govikes.ca/sports/mens-basketball/roster"] },
  { key: "winnipeg-wesmen", urls: ["https://wesmen.ca/sports/mens-basketball/roster?view=grid", "https://wesmen.ca/sports/mens-basketball/roster"] }
];

async function main() {
  const jsonPath = path.join(__dirname, 'data/usports-rosters-stats.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  for (const tc of teamConfigs) {
    console.log(`\n========================================`);
    console.log(`Processing ${tc.key} ...`);
    let html = "";
    let fetchedUrl = "";

    for (const url of tc.urls) {
      const resHtml = await fetchUrl(url);
      if (resHtml && resHtml.length > 1000) {
        html = resHtml;
        fetchedUrl = url;
        break;
      }
    }

    if (!html) {
      console.log(`❌ Failed to fetch any URL for ${tc.key}`);
      continue;
    }
    console.log(`Fetched ${html.length} bytes from ${fetchedUrl}`);

    const playerHeadshots = {};
    const origin = new URL(fetchedUrl).origin;

    // Special MacEwan pattern parsing
    if (tc.key === "macewan") {
      const photos = [...new Set(html.match(/\/sports\/mbkb\/[^\s"']+\.(?:jpg|png|webp|jpeg)/gi) || [])];
      for (const p of photos) {
        let fullUrl = origin + p;
        // Filename example: MBB_HickeyO_2627.jpg or MBB_DengPA_2526.jpg
        const match = p.match(/MBB_([A-Za-z]+)([A-Z]{1,2})_\d+\.jpg/i);
        if (match) {
          const lastName = match[1].toLowerCase();
          const firstInit = match[2].toLowerCase();
          playerHeadshots[`macewan_${lastName}_${firstInit}`] = fullUrl;
        }
      }
    }

    // 1. JSON-LD Person parsing
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
              const cleanName = name.replace(/ - View Profile.*/i, '').replace(/headshot/i, '').trim();
              playerHeadshots[normalize(cleanName)] = fullUrl;
            }
          }
        }
      } catch(e) {}
    }

    // 2. Generic Sidearm / Presto img regexes
    const imgRegexes = [
      /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*alt=["']([^"']+)["']/gi,
      /<img[^>]+alt=["']([^"']+)["'][^>]*(?:src|data-src)=["']([^"']+)["']/gi
    ];

    for (const r of imgRegexes) {
      let m;
      while ((m = r.exec(html)) !== null) {
        let src = r.source.startsWith('<img[^>]+alt=') ? m[2] : m[1];
        let alt = r.source.startsWith('<img[^>]+alt=') ? m[1] : m[2];

        alt = alt.replace(/ - View Profile.*/i, '').replace(/headshot/i, '').replace(/View Profile.*/i, '').trim();
        if (src.startsWith('/')) src = origin + src;
        // Clean out thumbnail dimensions or keep full size
        if (src && alt && !src.includes('placeholder') && !src.includes('logo') && !alt.toLowerCase().includes('logo') && alt.length > 2) {
          if (!playerHeadshots[normalize(alt)]) {
            playerHeadshots[normalize(alt)] = src;
          }
        }
      }
    }

    // 3. Sidearm div cards parser
    // E.g. <div class="sidearm-roster-player-image..."> ... <img ...> ... <a ...>First Last</a>
    const cardBlocks = html.match(/<li[^>]*class="[^"]*sidearm-roster-player[^"]*"[\s\S]*?<\/li>/gi) ||
                       html.match(/<div[^>]*class="[^"]*sidearm-roster-player[^"]*"[\s\S]*?<\/div>/gi) || [];
    for (const card of cardBlocks) {
      const imgM = card.match(/(?:src|data-src)=["']([^"']+)["']/i);
      const nameM = card.match(/aria-label=["']([^"']+)["']/i) || card.match(/alt=["']([^"']+)["']/i) || card.match(/<a[^>]*>([^<]+)<\/a>/i);
      if (imgM && nameM) {
        let src = imgM[1];
        let name = nameM[1].replace(/ - View Profile.*/i, '').replace(/headshot/i, '').trim();
        if (src.startsWith('/')) src = origin + src;
        if (name && src && !src.includes('placeholder') && !src.includes('logo')) {
          playerHeadshots[normalize(name)] = src;
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
        let foundImg = null;

        // MacEwan special match
        if (tc.key === "macewan") {
          const parts = (p.name || "").split(/\s+/);
          if (parts.length >= 2) {
            const lastName = parts[parts.length - 1].toLowerCase();
            const firstInit = parts[0][0].toLowerCase();
            foundImg = playerHeadshots[`macewan_${lastName}_${firstInit}`];
          }
        }

        if (!foundImg) {
          const normPName = normalize(p.name);
          foundImg = playerHeadshots[normPName];
        }

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
