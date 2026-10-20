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

(async () => {
  const testUrls = [
    "https://macewangriffins.ca/sports/mens-basketball/roster/2026-27",
    "https://macewangriffins.ca/sports/mbball/2026-27/roster",
    "https://macewangriffins.ca/sports/mens-basketball/roster?view=grid",
    "https://bearsandpandas.ca/sports/mens-basketball/roster",
    "https://gobears.ca/sports/mens-basketball/roster",
    "https://godinos.com/sports/mens-basketball/roster?view=grid"
  ];

  for (const u of testUrls) {
    const html = await fetchUrl(u);
    console.log(u, '=> Length:', html.length, 'Img tags with data-src or src:', (html.match(/<img[^>]+(data-src|src)=["'][^"']+\/images\/[^"']+/gi) || []).length);
  }
})();
