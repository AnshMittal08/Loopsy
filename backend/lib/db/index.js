const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { validateConfig } = require('../config');

validateConfig();

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

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
      userId TEXT,
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
      userId TEXT,
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

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      skillLevel TEXT DEFAULT 'beginner',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL UNIQUE,
      plan TEXT NOT NULL DEFAULT 'free',
      status TEXT NOT NULL DEFAULT 'active',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_usage (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      month TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(userId, type, month)
    );

    CREATE TABLE IF NOT EXISTS designs (
      id TEXT PRIMARY KEY,
      userId TEXT,
      name TEXT NOT NULL,
      spec TEXT NOT NULL,
      patternId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      bucket TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      windowStart TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      actorId TEXT,
      action TEXT NOT NULL,
      resource TEXT,
      resourceId TEXT,
      meta TEXT,
      ip TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_tokens (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      tokenHash TEXT NOT NULL UNIQUE,
      expiresAt TEXT NOT NULL,
      usedAt TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_progress_patternId ON progress(patternId);
    CREATE INDEX IF NOT EXISTS idx_patterns_userId ON patterns(userId);
    CREATE INDEX IF NOT EXISTS idx_progress_userId ON progress(userId);
    CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_patterns_templateId ON patterns(templateId);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_user_type_month ON ai_usage(userId, type, month);
    CREATE INDEX IF NOT EXISTS idx_designs_userId ON designs(userId);
    CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actorId);
    CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource, resourceId);
    CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens(userId, type);
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
    ['isFallback', "ALTER TABLE patterns ADD COLUMN isFallback INTEGER DEFAULT 0"],
    ['userId', "ALTER TABLE patterns ADD COLUMN userId TEXT"],
    ['verified', "ALTER TABLE patterns ADD COLUMN verified INTEGER DEFAULT 0"],
    ['isExperimental', "ALTER TABLE patterns ADD COLUMN isExperimental INTEGER DEFAULT 0"],
    ['deletedAt', "ALTER TABLE patterns ADD COLUMN deletedAt TEXT"]
  ];

  // Idempotent migration: the column guard can still lose a race when several
  // Next build workers initialise the same DB file at once, so swallow the
  // "duplicate column" error rather than crash the build.
  const addColumnIfMissing = (existing, columnName, statement) => {
    if (existing.has(columnName)) return;
    try {
      db.exec(statement);
    } catch (error) {
      if (!/duplicate column name/i.test(error.message)) throw error;
    }
  };

  for (const [columnName, statement] of requiredPatternColumns) {
    addColumnIfMissing(existingPatternColumns, columnName, statement);
  }

  const progressColumns = db.prepare(`PRAGMA table_info(progress)`).all();
  const existingProgressColumns = new Set(progressColumns.map((column) => column.name));
  addColumnIfMissing(existingProgressColumns, 'userId', "ALTER TABLE progress ADD COLUMN userId TEXT");

  const designColumns = db.prepare(`PRAGMA table_info(designs)`).all();
  const existingDesignColumns = new Set(designColumns.map((column) => column.name));
  addColumnIfMissing(existingDesignColumns, 'deletedAt', "ALTER TABLE designs ADD COLUMN deletedAt TEXT");

  const userColumns = db.prepare(`PRAGMA table_info(users)`).all();
  const existingUserColumns = new Set(userColumns.map((column) => column.name));
  addColumnIfMissing(existingUserColumns, 'emailVerified', "ALTER TABLE users ADD COLUMN emailVerified INTEGER DEFAULT 0");

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
