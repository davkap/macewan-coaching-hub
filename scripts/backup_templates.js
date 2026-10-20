const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PLANS_DIR = path.join(ROOT, 'practice-plans', 'plans');
const LIST_JSON = path.join(ROOT, 'practice-plans', 'list.json');
const BACKUP_DIR = path.join(ROOT, 'backups', 'draft_templates_backup', 'practice-plans');

function runBackup() {
  console.log('📦 Backing up practice plan templates & drafts...');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Copy list.json
  if (fs.existsSync(LIST_JSON)) {
    fs.copyFileSync(LIST_JSON, path.join(BACKUP_DIR, 'list.json'));
    console.log(`✅ Backed up ${path.relative(ROOT, LIST_JSON)} -> backups/draft_templates_backup/practice-plans/list.json`);
  }

  // Copy plans directory
  const backupPlansDir = path.join(BACKUP_DIR, 'plans');
  if (!fs.existsSync(backupPlansDir)) {
    fs.mkdirSync(backupPlansDir, { recursive: true });
  }

  if (fs.existsSync(PLANS_DIR)) {
    const files = fs.readdirSync(PLANS_DIR);
    for (const f of files) {
      if (f.endsWith('.json')) {
        const src = path.join(PLANS_DIR, f);
        const dest = path.join(backupPlansDir, f);
        fs.copyFileSync(src, dest);
        console.log(`  └─ Saved ${f}`);
      }
    }
  }

  console.log('🎉 Draft practice plan templates successfully backed up!');
}

runBackup();
