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

// Explicit MacEwan map
const macewanMap = {
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
  { key: "macewan", urls: [] },
  { key: "alberta-golden-bears", urls: ["https://bearsandpandas.ca/sports/mens-basketball/roster?view=grid", "https://bearsandpandas.ca/sports/mens-basketball/roster"] },
  { key: "brandon-bobcats", urls: ["https://gobobcats.ca/sports/mens-basketball/roster?view=grid", "https://gobobcats.ca/sports/mens-basketball/roster"] },
  { key: "calgary-dinos", urls: ["https://godinos.com/sports/mens-basketball/roster?view=grid", "https://godinos.com/sports/mens-basketball/roster"] },
  { key: "fraser-valley-cascades", urls: ["https://ufvcascades.ca/sports/mens-basketball/roster?view=grid", "https://cascades.ufv.ca/sports/mens-basketball/roster?view=grid"] },
  { key: "lethbridge-pronghorns", urls: ["https://gohorns.ca/sports/mens-basketball/roster?view=grid", "https://gohorns.ca/sports/mens-basketball/roster"] },
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

  // 1. Apply MacEwan directly
  if (data.macewan && data.macewan.roster) {
    for (const p of data.macewan.roster) {
      if (macewanMap[p.name]) {
        p.photo = macewanMap[p.name];
      }
    }
  }

  // 2. Fetch for all other teams
  for (const tc of teams) {
    if (tc.key === "macewan") continue;

    console.log(`Fetching photos for ${tc.key}...`);
    const playerHeadshots = {};

    for (const url of tc.urls) {
      const html = await fetchUrl(url);
      if (!html || html.length < 500) continue;
      const origin = new URL(url).origin;

      // Extract JSON-LD Person blocks
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

      // Regex img tags
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
          // Strip resize params if needed or keep high quality
          src = src.replace(/\?width=\d+&quality=\d+/i, '?width=500&quality=95');
          if (src && alt && !src.includes('placeholder') && !src.includes('logo') && !alt.toLowerCase().includes('logo') && alt.length > 2) {
            playerHeadshots[normalize(alt)] = src;
          }
        }
      }
    }

    // Match against target roster
    const teamObj = data[tc.key];
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
      console.log(`  Matched ${matchedCount} / ${rosterList.length} players for ${tc.key}`);
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log('\nSaved updated usports-rosters-stats.json successfully!');
}

main();
