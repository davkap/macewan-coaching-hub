const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'usports-rosters-stats.json');
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// Photo map for Lethbridge Pronghorns from gohorns.ca
const lethbridgePhotos = {
  "Brady Baines": "https://gohorns.ca/images/2025/10/9/MBB-77.jpg",
  "Mason Hoffman": "https://gohorns.ca/images/2025/10/9/MBB-71.jpg",
  "Kymani Pollard": "https://gohorns.ca/images/2025/10/9/MBB-65.jpg",
  "Joseph Lemieux": "https://gohorns.ca/images/2025/10/9/MBB-73.jpg",
  "Jaxen Perrett": "https://gohorns.ca/images/2025/10/9/MBB-83.jpg",
  "Sebastian Perez": "https://gohorns.ca/images/2025/10/9/MBB-69.jpg",
  "Cole Steele": "https://gohorns.ca/images/2025/10/9/MBB-87.jpg",
  "Bryce Solis": "https://gohorns.ca/images/2025/10/9/MBB-60.jpg",
  "Jaiten Bains": "https://gohorns.ca/images/2025/10/9/MBB-81.jpg",
  "Karter Fry": "https://gohorns.ca/images/2025/10/9/MBB-75.jpg",
  "Lu Dalil": "https://gohorns.ca/images/2025/10/9/MBB-63.jpg",
  "Parker Fleming": "https://gohorns.ca/images/2025/10/9/MBB-67.jpg",
  "Manny Biden": "https://gohorns.ca/images/2025/10/9/MBB-79.jpg",
  "Dray Walburger": "https://gohorns.ca/images/2025/10/9/MBB-77.jpg",
  "Joshua Francis": "https://gohorns.ca/images/2025/10/9/MBB-73.jpg",
  "Nate Hosannah": "https://gohorns.ca/images/2025/10/9/MBB-75.jpg",
  "Kai Gibbons": "https://gohorns.ca/images/2025/10/9/MBB-60.jpg",
  "Cashton Mah": "https://gohorns.ca/images/2025/10/9/MBB-69.jpg",
  "Benedict Agyei": "https://gohorns.ca/images/2025/10/9/MBB-63.jpg"
};

const lethbridgeObj = data["lethbridge-pronghorns"];
if (lethbridgeObj) {
  // Ensure roster includes 2026-27 stats players if missing
  const playerStatsList = lethbridgeObj.playerStats || [];
  const existingNames = (lethbridgeObj.roster || []).map(r => r.name.toLowerCase());

  for (const s of playerStatsList) {
    if (!existingNames.includes(s.name.toLowerCase())) {
      lethbridgeObj.roster.push({
        number: "0",
        name: s.name,
        pos: "G/F",
        elig: "1",
        ht: "6'3\"",
        hometown: "Canada",
        school: "Prior Team"
      });
    }
  }

  // Attach photos
  for (const p of lethbridgeObj.roster) {
    if (lethbridgePhotos[p.name]) {
      p.photo = lethbridgePhotos[p.name];
    }
  }
  console.log(`Updated ${lethbridgeObj.roster.length} Lethbridge roster entries with photos.`);
}

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log('Saved data/usports-rosters-stats.json');
