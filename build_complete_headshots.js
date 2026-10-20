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

const macewanPhotos = {
  "Owen Hickey": "https://macewangriffins.ca/sports/mbkb/2026-27/photos/0001/MBB_HickeyO_2627.jpg",
  "Jojo Muyo": "https://macewangriffins.ca/sports/mbkb/2026-27/photos/0001/MBB_MuyoJ_2627.jpg",
  "Khushal Shukla": "https://macewangriffins.ca/sports/mbkb/2026-27/photos/0001/MBB_ShuklaK_2627.jpg",
  "Joel Seke": "https://macewangriffins.ca/sports/mbkb/2026-27/photos/0001/MBB_SekeJ_2627.jpg",
  "Elisha Ampofo": "https://macewangriffins.ca/sports/mbkb/2026-27/photos/0001/MBB_AmpofoE_2627.jpg",
  "Diego Presingular": "https://macewangriffins.ca/sports/mbkb/2026-27/photos/0001/MBB_PresingularD_2627.jpg",
  "Noah Simon": "https://macewangriffins.ca/sports/mbkb/2026-27/photos/0001/MBB_SimonN_2627.jpg",
  "Judson Weir": "https://macewangriffins.ca/sports/mbkb/2026-27/photos/0001/MBB_WeirJ_2627.jpg",
  "Dele Osuma": "https://macewangriffins.ca/sports/mbkb/2026-27/photos/0001/MBB_OsumaD_2627.jpg",
  "Ryan Ziolkowski": "https://macewangriffins.ca/sports/mbkb/2026-27/photos/0001/MBB_ZiolkowskiR_2627.jpg",
  "Wol Wol": "https://macewangriffins.ca/sports/mbkb/2026-27/photos/0001/MBB_WolW_2627.jpg",
  "Favour Igbinyemi": "https://macewangriffins.ca/sports/mbkb/2026-27/photos/0001/MBB_IgbinyemiF_2627.jpg",
  "Abdi Musse": "https://macewangriffins.ca/sports/mbkb/2026-27/photos/0001/MBB_MusseA_2627.jpg",
  "Nathan Lefevre": "https://macewangriffins.ca/sports/mbkb/2026-27/photos/0001/MBB_LefevreN_2627.jpg",
  "David Wilmes": "https://macewangriffins.ca/sports/mbkb/2026-27/photos/0001/MBB_WilmesD_2627.jpg",
  "Otis Onink": "https://macewangriffins.ca/sports/mbkb/2026-27/photos/0001/MBB_OninkO_2627.jpg",
  "Peter-Aluk Deng": "https://macewangriffins.ca/sports/mbkb/2025-26/photos/0001/MBB_DengPA_2526.jpg",
  "Freddy Kapinga": "https://macewangriffins.ca/sports/mbkb/2026-27/photos/0001/MBB_KapingaF_2627.jpg"
};

const teams = [
  { key: "macewan", url: "https://macewangriffins.ca/sports/mbkb/2026-27/roster" },
  { key: "alberta-golden-bears", url: "https://bearsandpandas.ca/sports/mens-basketball/roster" },
  { key: "brandon-bobcats", url: "https://gobobcats.ca/sports/mens-basketball/roster" },
  { key: "calgary-dinos", url: "https://godinos.com/sports/mens-basketball/roster" },
  { key: "fraser-valley-cascades", url: "https://ufvcascades.ca/sports/mens-basketball/roster" },
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

  // 1. Apply MacEwan photos (100% 18/18)
  if (data.macewan && data.macewan.roster) {
    for (const p of data.macewan.roster) {
      if (macewanPhotos[p.name]) {
        p.photo = macewanPhotos[p.name];
      }
    }
  }

  // 2. Process all other teams
  for (const t of teams) {
    if (t.key === "macewan") continue;

    console.log(`Processing ${t.key}...`);
    const playerHeadshots = {};

    // Try standard URL and ?view=grid
    for (const targetUrl of [t.url, t.url + "?view=grid"]) {
      const html = await fetchUrl(targetUrl);
      if (!html || html.length < 500) continue;
      const origin = new URL(targetUrl).origin;

      // JSON-LD Person blocks
      const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
      for (const block of jsonLdMatches) {
        try {
          const jsonText = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
          const parsed = JSON.parse(jsonText);
          const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
          for (const item of items) {
            if (item['@type'] === 'Person' || item.name) {
              const name = item.name;
              let img = typeof item.image === 'string' ? item.image : (item.image?.url || item.image?.contentUrl);
              if (name && img) {
                let fullUrl = img.startsWith('/') ? origin + img : img;
                const cleanName = name.replace(/ - View Profile.*/i, '').replace(/headshot/i, '').trim();
                playerHeadshots[normalize(cleanName)] = fullUrl;
              }
            }
          }
        } catch(e) {}
      }

      // Regex img tags src/data-src & alt
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
          src = src.replace(/\?width=\d+&quality=\d+/i, '?width=500&quality=95');
          if (src && alt && !src.includes('placeholder') && !src.includes('logo') && !alt.toLowerCase().includes('logo') && alt.length > 2) {
            playerHeadshots[normalize(alt)] = src;
          }
        }
      }
    }

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
  console.log('\nSaved updated usports-rosters-stats.json successfully!');
}

main();
