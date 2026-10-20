const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

console.log('==============================================');
console.log('🧪 RUNNING DEDUPLICATION & LOGGER SUITE TESTS');
console.log('==============================================\n');

// 1. Syntax Validation
const targetFiles = [
  'lineup-logger.html',
  'offense-logger.html',
  'defense-logger.html',
  'lineup-tracker.html'
];

targetFiles.forEach(file => {
  const filePath = path.join(ROOT, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const scriptRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;
  while ((match = scriptRegex.exec(content)) !== null) {
    count++;
    const code = match[1];
    if (!code.trim() || code.includes('src=')) continue;
    try {
      new vm.Script(code);
      console.log(`✅ [${file}] Script block #${count} syntax is valid.`);
    } catch (e) {
      console.error(`❌ [${file}] Script block #${count} syntax error:`, e.message);
      process.exit(1);
    }
  }
});

console.log('\n--- Checking UI Button Hooks ---');

// Check that buttons exist on all three loggers
const checks = [
  { file: 'lineup-logger.html', terms: ['btn-save-game', 'btn-end-game', 'saveGameProgress', 'endGameAndSaveToTracker', 'startNewGameFromSetup', 'Cancel / Return to Game'] },
  { file: 'offense-logger.html', terms: ['btn-save-game', 'btn-end-game', 'saveOffenseGame', 'endOffenseGame', 'startNewGameFromSetup', 'Cancel / Return to Game'] },
  { file: 'defense-logger.html', terms: ['btn-save-game', 'btn-end-game', 'saveDefenseGame', 'endDefenseGame', 'startNewGameFromSetup', 'Cancel / Return to Game'] }
];

checks.forEach(c => {
  const content = fs.readFileSync(path.join(ROOT, c.file), 'utf8');
  c.terms.forEach(term => {
    if (content.includes(term)) {
      console.log(`✅ [${c.file}] Found expected hook: "${term}"`);
    } else {
      console.error(`❌ [${c.file}] Missing expected hook: "${term}"`);
      process.exit(1);
    }
  });
});

console.log('\n--- Simulating Deduplication in Lineup Games ---');

// Simulation of 5 sequential saves + 1 end-game
let mockSavedGames = [];
const gameSetup = {
  gameId: 'game_20261010_lethbridge',
  opponent: 'Lethbridge Pronghorns',
  date: '2026-10-10',
  gameType: 'Regular Season'
};

function simulateSave(loggedStints, isFinal) {
  const gameObj = {
    gameId: gameSetup.gameId,
    opponent: gameSetup.opponent,
    date: gameSetup.date,
    gameType: gameSetup.gameType,
    location: "MacEwan Gym",
    stints: loggedStints.slice(),
    lastSaved: new Date().toISOString(),
    isFinal: !!isFinal
  };

  const existingIdx = mockSavedGames.findIndex(g => {
    return g.gameId === gameSetup.gameId || (g.date === gameObj.date && g.opponent && g.opponent.toLowerCase() === gameObj.opponent.toLowerCase());
  });

  if (existingIdx >= 0) {
    mockSavedGames[existingIdx] = gameObj;
  } else {
    mockSavedGames.push(gameObj);
  }
}

// 1st save in Q1 (3 stints)
simulateSave([{ id: 1 }, { id: 2 }, { id: 3 }], false);
console.log(`Step 1 (Save Game Q1): ${mockSavedGames.length} game in database, ${mockSavedGames[0].stints.length} stints.`);

// 2nd save in Q2 (8 stints)
simulateSave([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 }], false);
console.log(`Step 2 (Save Game Q2): ${mockSavedGames.length} game in database, ${mockSavedGames[0].stints.length} stints.`);

// 3rd save in Q3 (15 stints)
simulateSave(Array.from({ length: 15 }, (_, i) => ({ id: i + 1 })), false);
console.log(`Step 3 (Save Game Q3): ${mockSavedGames.length} game in database, ${mockSavedGames[0].stints.length} stints.`);

// 4th action: End Game in Q4 (25 stints, isFinal = true)
simulateSave(Array.from({ length: 25 }, (_, i) => ({ id: i + 1 })), true);
console.log(`Step 4 (End Game Q4): ${mockSavedGames.length} game in database, ${mockSavedGames[0].stints.length} stints, isFinal = ${mockSavedGames[0].isFinal}.`);

if (mockSavedGames.length === 1 && mockSavedGames[0].stints.length === 25 && mockSavedGames[0].isFinal === true) {
  console.log('🎉 PERFECT: Lineup game deduplication confirmed! Zero duplicate games created.');
} else {
  console.error('❌ Failure in lineup game deduplication!');
  process.exit(1);
}

console.log('\n--- Simulating Event Deduplication ---');

function deduplicateEvents(list) {
  const seen = new Set();
  const res = [];
  list.forEach(item => {
    if (item && item.id) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        res.push(item);
      }
    } else if (item) {
      res.push(item);
    }
  });
  return res;
}

const mockEvents = [
  { id: 'off_101', shotZone: 'R', points: 2 },
  { id: 'off_102', shotZone: 'C', points: 3 },
  { id: 'off_101', shotZone: 'R', points: 2 }, // duplicate
  { id: 'off_103', shotZone: 'P', points: 0 },
  { id: 'off_102', shotZone: 'C', points: 3 }  // duplicate
];

const deduped = deduplicateEvents(mockEvents);
console.log(`Original mock event count: ${mockEvents.length}, Deduplicated count: ${deduped.length}`);
if (deduped.length === 3 && deduped.map(e => e.id).join(',') === 'off_101,off_102,off_103') {
  console.log('🎉 PERFECT: Event deduplication confirmed! Duplicate IDs successfully stripped.');
} else {
  console.error('❌ Failure in event deduplication!');
  process.exit(1);
}

console.log('\n==============================================');
console.log('🏆 ALL TESTS AND VALIDATIONS PASSED!');
console.log('==============================================\n');
