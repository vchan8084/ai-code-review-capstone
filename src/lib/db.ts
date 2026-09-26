import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dataDir = path.resolve(process.cwd(), "data");
    fs.mkdirSync(dataDir, { recursive: true });

    const dbPath = path.join(dataDir, "reviews.db");
    db = new Database(dbPath);

    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      name          TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL,
      code          TEXT    NOT NULL,
      language      TEXT    NOT NULL DEFAULT 'javascript',
      status        TEXT    NOT NULL DEFAULT 'pending',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      completed_at  TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS findings (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id   INTEGER NOT NULL,
      source          TEXT    NOT NULL DEFAULT 'eslint',
      rule_id         TEXT,
      severity        INTEGER NOT NULL,
      message         TEXT    NOT NULL,
      line            INTEGER,
      col             INTEGER,
      end_line        INTEGER,
      end_column      INTEGER,
      suggestion      TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_findings_submission_id ON findings(submission_id);
  `);
}
