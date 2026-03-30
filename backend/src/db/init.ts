import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import config from '../config/index.js';

const dbPath = path.resolve(process.cwd(), config.db.path);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    createTables();
  }
  return db;
}

function createTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schemas (
      id                TEXT PRIMARY KEY,
      zkpass_schema_id  TEXT,
      platform          TEXT NOT NULL,
      category          TEXT NOT NULL,
      title             TEXT NOT NULL,
      description       TEXT,
      condition         TEXT,
      keywords          TEXT,
      aliases           TEXT,
      site_url          TEXT,
      login_config      TEXT,
      navigation        TEXT,
      http_version      TEXT DEFAULT '1.1',
      created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      aliases     TEXT,
      description TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaign_schemas (
      campaign_id    INTEGER NOT NULL,
      schema_id      TEXT NOT NULL,
      display_order  INTEGER DEFAULT 0,
      PRIMARY KEY (campaign_id, schema_id)
    );

    CREATE INDEX IF NOT EXISTS idx_schemas_platform ON schemas(platform);
    CREATE INDEX IF NOT EXISTS idx_schemas_category ON schemas(category);
  `);
}
