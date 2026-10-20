const fs = require('fs');
const path = require('path');

const plansDir = path.join(__dirname, 'practice-plans', 'plans');
const listPath = path.join(__dirname, 'practice-plans', 'list.json');

console.log('Generating practice plans index...');

if (!fs.existsSync(plansDir)) {
  fs.mkdirSync(plansDir, { recursive: true });
}

// Read all JSON files in the plans directory
const files = fs.readdirSync(plansDir).filter(f => f.endsWith('.json'));
const list = [];

files.forEach(file => {
  const filePath = path.join(plansDir, file);
  try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const plan = JSON.parse(rawData);
    
    // Extract metadata
    list.push({
      filename: file,
      season: plan.season || '2025-26',
      week: plan.week || '',
      day: plan.day || '',
      date: plan.date || '',
      startTime: plan.startTime || '',
      timeRange: plan.timeRange || '',
      objective: plan.objective || ''
    });
  } catch (e) {
    console.error(`Error reading ${file}:`, e.message);
  }
});

// Sort by date descending
list.sort((a, b) => {
  return new Date(b.date) - new Date(a.date);
});

fs.writeFileSync(listPath, JSON.stringify(list, null, 2), 'utf8');
console.log(`Wrote ${list.length} plans to ${listPath}`);
