const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'data/usports-rosters-stats.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log("Team Photo Coverage Summary:");
let totalPlayers = 0;
let totalPhotos = 0;

for (const teamKey of Object.keys(data)) {
  const teamObj = data[teamKey];
  const roster = teamObj.roster || teamObj.players || [];
  let photos = 0;
  for (const p of roster) {
    if (p.photo && !p.photo.includes('placeholder') && p.photo.startsWith('http')) {
      photos++;
    }
  }
  totalPlayers += roster.length;
  totalPhotos += photos;
  console.log(`  ${teamKey.padEnd(26)}: ${photos} / ${roster.length} photos`);
}

console.log(`\nOVERALL: ${totalPhotos} / ${totalPlayers} photos mapped.`);
