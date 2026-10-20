const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'usports-rosters-stats.json');
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// Photos for Lethbridge players from gohorns.ca (except Cashton Mah per user request)
const lethbridgePhotos = {
  "Brady Baines": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-77.jpg",
  "Mason Hoffman": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-71.jpg",
  "Kymani Pollard": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-65.jpg",
  "Joseph Lemieux": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-73.jpg",
  "Jaxen Perrett": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-83.jpg",
  "Sebastian Perez": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-69.jpg",
  "Cole Steele": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-87.jpg",
  "Bryce Solis": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-60.jpg",
  "Jaiten Bains": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-81.jpg",
  "Karter Fry": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-75.jpg",
  "Lu Dalil": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-63.jpg",
  "Parker Fleming": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-67.jpg",
  "Manny Biden": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-79.jpg",
  "Dray Walburger": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-77.jpg",
  "Joshua Francis": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-73.jpg",
  "Nate Hosannah": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-75.jpg",
  "Kai Gibbons": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-60.jpg",
  "Benedict Agyei": "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-63.jpg"
  // Cashton Mah explicitly excluded per prompt ("except for Cashton")
};

// Exact statistics from the attached image for Lethbridge Pronghorns
const lethbridgeExactStats = [
  {
    name: "Dray Walburger", gp: "4", mins: "95", mpg: "23.8",
    fg3: "10-26", fg3Pct: "38.5", fg: "21-47", fgPct: "44.7", ft: "4-4", ftPct: "100.0",
    orebDreb: "3-22", reb: "25", rpg: "6.2", pf: "8", a: "7", to: "8", blk: "1", stl: "3", pts: "56", ppg: "14.0"
  },
  {
    name: "Joshua Francis", gp: "4", mins: "106", mpg: "26.5",
    fg3: "1-4", fg3Pct: "25.0", fg: "20-33", fgPct: "60.6", ft: "6-17", ftPct: "35.3",
    orebDreb: "5-12", reb: "17", rpg: "4.2", pf: "9", a: "9", to: "4", blk: "3", stl: "0", pts: "47", ppg: "11.8"
  },
  {
    name: "Nate Hosannah", gp: "4", mins: "85", mpg: "21.2",
    fg3: "7-15", fg3Pct: "46.7", fg: "16-34", fgPct: "47.1", ft: "8-16", ftPct: "50.0",
    orebDreb: "3-10", reb: "13", rpg: "3.2", pf: "6", a: "7", to: "7", blk: "0", stl: "3", pts: "47", ppg: "11.8"
  },
  {
    name: "Kai Gibbons", gp: "4", mins: "79", mpg: "19.8",
    fg3: "3-12", fg3Pct: "25.0", fg: "14-35", fgPct: "40.0", ft: "2-2", ftPct: "100.0",
    orebDreb: "3-6", reb: "9", rpg: "2.2", pf: "6", a: "7", to: "10", blk: "0", stl: "1", pts: "33", ppg: "8.2"
  },
  {
    name: "Joseph Lemieux", gp: "4", mins: "106", mpg: "26.5",
    fg3: "0-2", fg3Pct: "0.0", fg: "10-22", fgPct: "45.5", ft: "7-10", ftPct: "70.0",
    orebDreb: "6-17", reb: "23", rpg: "5.8", pf: "10", a: "7", to: "8", blk: "0", stl: "3", pts: "27", ppg: "6.8"
  },
  {
    name: "Cole Steele", gp: "3", mins: "49", mpg: "16.3",
    fg3: "2-5", fg3Pct: "40.0", fg: "7-13", fgPct: "53.8", ft: "3-4", ftPct: "75.0",
    orebDreb: "1-9", reb: "10", rpg: "3.3", pf: "3", a: "5", to: "6", blk: "3", stl: "2", pts: "19", ppg: "6.3"
  },
  {
    name: "Cashton Mah", gp: "4", mins: "63", mpg: "15.8",
    fg3: "5-7", fg3Pct: "71.4", fg: "9-15", fgPct: "60.0", ft: "2-2", ftPct: "100.0",
    orebDreb: "2-8", reb: "10", rpg: "2.5", pf: "6", a: "8", to: "6", blk: "0", stl: "4", pts: "25", ppg: "6.2"
  },
  {
    name: "Benedict Agyei", gp: "4", mins: "56", mpg: "14.0",
    fg3: "2-4", fg3Pct: "50.0", fg: "9-14", fgPct: "64.3", ft: "2-2", ftPct: "100.0",
    orebDreb: "4-1", reb: "5", rpg: "1.2", pf: "1", a: "1", to: "4", blk: "1", stl: "4", pts: "22", ppg: "5.5"
  },
  {
    name: "Brady Baines", gp: "4", mins: "70", mpg: "17.5",
    fg3: "6-17", fg3Pct: "35.3", fg: "7-19", fgPct: "36.8", ft: "1-1", ftPct: "100.0",
    orebDreb: "1-8", reb: "9", rpg: "2.2", pf: "7", a: "0", to: "3", blk: "0", stl: "2", pts: "21", ppg: "5.2"
  },
  {
    name: "Mason Hoffman", gp: "4", mins: "91", mpg: "22.8",
    fg3: "2-7", fg3Pct: "28.6", fg: "6-12", fgPct: "50.0", ft: "0-0", ftPct: "0.0",
    orebDreb: "0-3", reb: "3", rpg: "0.8", pf: "5", a: "13", to: "10", blk: "0", stl: "1", pts: "14", ppg: "3.5"
  }
];

const lethbridgePlayersMeta = {
  "Dray Walburger": { number: "N/A", pos: "G", ht: "6-4", elig: "4", hometown: "Lethbridge, AB", school: "Lethbridge Collegiate / Magrath High" },
  "Joshua Francis": { number: "N/A", pos: "F", ht: "6-11", elig: "3", hometown: "Calgary, AB", school: "Edge School for Athletes" },
  "Nate Hosannah": { number: "N/A", pos: "G", ht: "6-4", elig: "3", hometown: "Tacoma, WA", school: "Charles Wright Academy" },
  "Kai Gibbons": { number: "N/A", pos: "G", ht: "5-10", elig: "1", hometown: "Vancouver, BC", school: "Edge School for Athletes" },
  "Joseph Lemieux": { number: "4", pos: "F", ht: "6-5", elig: "2", hometown: "Edmonton, AB", school: "Strathcona Composite High", photo: "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-73.jpg" },
  "Cole Steele": { number: "8", pos: "F", ht: "6-9", elig: "2", hometown: "Kelowna, BC", school: "Edge School for Athletes", photo: "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-87.jpg" },
  "Cashton Mah": { number: "N/A", pos: "G", ht: "6-1", elig: "1", hometown: "Edmonton, AB", school: "Archbishop O'Leary High" },
  "Benedict Agyei": { number: "N/A", pos: "F", ht: "6-6", elig: "1", hometown: "Edmonton, AB", school: "CTA West Prep" },
  "Brady Baines": { number: "1", pos: "G", ht: "6-3", elig: "2", hometown: "Raymond, AB", school: "Raymond High", photo: "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-77.jpg" },
  "Mason Hoffman": { number: "2", pos: "G", ht: "6-1", elig: "2", hometown: "Magrath, AB", school: "Magrath High", photo: "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gohorns.ca/images/2025/10/9/MBB-71.jpg" }
};

const lethbridgeObj = data["lethbridge-pronghorns"];
if (lethbridgeObj) {
  lethbridgeObj.playerStats = lethbridgeExactStats;

  const rosterList = [];
  lethbridgeExactStats.forEach((st) => {
    const meta = lethbridgePlayersMeta[st.name] || {};
    rosterList.push({
      number: meta.number || "0",
      name: st.name,
      pos: meta.pos || "G/F",
      ht: meta.ht || "6'3\"",
      elig: meta.elig || "1",
      hometown: meta.hometown || "Canada",
      school: meta.school || "Prior Team",
      photo: meta.photo // Undefined for Cashton Mah
    });
  });

  lethbridgeObj.roster = rosterList;
  console.log(`✅ Set exact statistics and jersey numbers/photos for ${rosterList.length} Lethbridge players.`);
}

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log('✅ Updated data/usports-rosters-stats.json');
