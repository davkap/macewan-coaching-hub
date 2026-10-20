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
  const html = await fetchUrl("https://usportshoops.ca/history/teams.php?Gender=MBB");
  console.log("USports Hoops Teams HTML length:", html.length);
  // Find Canada West section or links to team pages
  const teamLinks = [...html.matchAll(/href=["'](teamseason\.php\?[^"']+)["'][^>]*>([^<]+)/gi)];
  console.log("Found team season links:", teamLinks.length);
  teamLinks.slice(0, 20).forEach(m => console.log(m[2].trim(), "=>", m[1]));

  // Also look for direct external team website links
  const extLinks = [...html.matchAll(/href=["'](http[^"']+)["'][^>]*>(?:Team Website|Roster|Website)/gi)];
  console.log("External site links found:", extLinks.length);
  extLinks.forEach(m => console.log(m[1]));
})();
