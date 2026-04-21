const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data.db');

function initializeDatabase(db) {
  try {
    // WAL helps runtime concurrency, but parallel build imports can briefly lock this pragma.
    db.pragma('journal_mode = WAL');
  } catch (error) {
    if (error.code !== 'SQLITE_BUSY') {
      throw error;
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      difficulty TEXT,
      category TEXT,
      tags TEXT DEFAULT '[]',
      imageUrl TEXT,
      hookSize TEXT,
      yarnWeight TEXT,
      timeEstimate TEXT,
      finishedSize TEXT,
      materials TEXT DEFAULT '[]',
      notes TEXT DEFAULT '[]',
      defaultPattern TEXT DEFAULT '[]',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patterns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      templateId TEXT,
      color TEXT,
      size TEXT DEFAULT 'medium',
      steps TEXT NOT NULL,
      difficulty TEXT,
      category TEXT,
      tags TEXT DEFAULT '[]',
      materials TEXT DEFAULT '[]',
      hookSize TEXT,
      yarnWeight TEXT,
      timeEstimate TEXT,
      finishedSize TEXT,
      notes TEXT DEFAULT '[]',
      promptSummary TEXT,
      isAIGenerated INTEGER DEFAULT 0,
      isFallback INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS progress (
      id TEXT PRIMARY KEY,
      patternId TEXT NOT NULL,
      totalSteps INTEGER NOT NULL,
      steps TEXT NOT NULL,
      progressPercentage INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analytics (
      key TEXT PRIMARY KEY,
      value INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_progress_patternId ON progress(patternId);
  `);

  const patternColumns = db.prepare(`PRAGMA table_info(patterns)`).all();
  const existingPatternColumns = new Set(patternColumns.map((column) => column.name));
  const requiredPatternColumns = [
    ['category', "ALTER TABLE patterns ADD COLUMN category TEXT"],
    ['tags', "ALTER TABLE patterns ADD COLUMN tags TEXT DEFAULT '[]'"],
    ['materials', "ALTER TABLE patterns ADD COLUMN materials TEXT DEFAULT '[]'"],
    ['hookSize', "ALTER TABLE patterns ADD COLUMN hookSize TEXT"],
    ['yarnWeight', "ALTER TABLE patterns ADD COLUMN yarnWeight TEXT"],
    ['timeEstimate', "ALTER TABLE patterns ADD COLUMN timeEstimate TEXT"],
    ['finishedSize', "ALTER TABLE patterns ADD COLUMN finishedSize TEXT"],
    ['notes', "ALTER TABLE patterns ADD COLUMN notes TEXT DEFAULT '[]'"],
    ['promptSummary', "ALTER TABLE patterns ADD COLUMN promptSummary TEXT"],
    ['isAIGenerated', "ALTER TABLE patterns ADD COLUMN isAIGenerated INTEGER DEFAULT 0"],
    ['isFallback', "ALTER TABLE patterns ADD COLUMN isFallback INTEGER DEFAULT 0"]
  ];

  for (const [columnName, statement] of requiredPatternColumns) {
    if (!existingPatternColumns.has(columnName)) {
      db.exec(statement);
    }
  }

  const initAnalytics = db.prepare(`
    INSERT OR IGNORE INTO analytics (key, value) VALUES (?, ?)
  `);
  initAnalytics.run('pattern_generations', 0);
  initAnalytics.run('active_users', 0);
}

if (!globalThis.__crochetDb) {
  const db = new Database(dbPath, { timeout: 5000 });
  initializeDatabase(db);
  globalThis.__crochetDb = db;
}

module.exports = globalThis.__crochetDb;
