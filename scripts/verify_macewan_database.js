const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = '/Users/davidkapinga/.gemini/antigravity/scratch/macewan-coaching-hub';

function extractAndTestScripts(filename) {
  const filePath = path.join(ROOT, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  const scriptRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;
  while ((match = scriptRegex.exec(content)) !== null) {
    count++;
    const code = match[1];
    // Ignore external scripts or empty ones
    if (!code.trim() || code.includes('src=')) continue;
    try {
      new vm.Script(code);
      console.log(`✅ [${filename}] Script block #${count} syntax is valid.`);
    } catch (e) {
      console.error(`❌ [${filename}] Script block #${count} syntax error:`, e.message);
      process.exit(1);
    }
  }
}

console.log('--- Testing HTML Script Blocks ---');
['lineup-tracker.html', 'lineup-logger.html', 'shot-tracker.html', 'index.html', 'players.html'].forEach(extractAndTestScripts);

console.log('\n--- Verifying Lethbridge Stints Preservation ---');
const trackerHtml = fs.readFileSync(path.join(ROOT, 'lineup-tracker.html'), 'utf8');
if (!trackerHtml.includes('Lethbridge Pronghorns')) {
  console.error('❌ Lethbridge Pronghorns game missing from lineup-tracker.html!');
  process.exit(1);
}
// Count stints in INITIAL_GAMES_DATA
const matchStints = trackerHtml.match(/"opponent":\s*"Lethbridge Pronghorns"/g);
console.log(`✅ Lethbridge opponent references found: ${matchStints ? matchStints.length : 0}`);

// Check 10 view tabs in lineup-tracker.html
const expectedViews = [
  'stints', 'aggregated', 'players', 'duos', 'trios',
  'offense-ind', 'offense-lineup', 'defense-ind', 'defense-lineup', 'event-log'
];
expectedViews.forEach(v => {
  if (trackerHtml.includes(`id="tab-${v}"`) && trackerHtml.includes(`onclick="switchView('${v}')"`)) {
    console.log(`✅ View tab [${v}] present and wired in lineup-tracker.html`);
  } else {
    console.error(`❌ View tab [${v}] MISSING in lineup-tracker.html!`);
    process.exit(1);
  }
});

// Check MacEwan Database title and headers
if (trackerHtml.includes('MacEwan Database') && trackerHtml.includes('<h1>MacEwan Database 📊</h1>')) {
  console.log('✅ Title and header correctly renamed to MacEwan Database.');
} else {
  console.error('❌ MacEwan Database title or header missing!');
  process.exit(1);
}

// Check search and filter pills
if (trackerHtml.includes('id="lineup-search"') && trackerHtml.includes('class="pill-filter-btn')) {
  console.log('✅ Search input and filter pills present.');
} else {
  console.error('❌ Search input or filter pills missing!');
  process.exit(1);
}

// Check tactical offense & defense events in tracker
if (trackerHtml.includes('SEED_OFFENSE_EVENTS') && trackerHtml.includes('SEED_DEFENSE_EVENTS')) {
  console.log('✅ Seed tactical event collections present.');
} else {
  console.error('❌ Seed tactical events missing!');
  process.exit(1);
}

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
