import Database from "better-sqlite3";
import { hashPassword, signToken } from "@/lib/auth";

export function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");

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
      risk_level      TEXT    DEFAULT 'low',
      category        TEXT,
      confidence      REAL    DEFAULT 0.95,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_findings_submission_id ON findings(submission_id);
  `);

  return db;
}

export async function seedUser(
  db: Database.Database,
  overrides: { email?: string; password?: string; name?: string } = {}
) {
  const email = overrides.email ?? "test@example.com";
  const password = overrides.password ?? "password123";
  const name = overrides.name ?? "Test User";
  const hash = await hashPassword(password);

  const result = db
    .prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)")
    .run(email, hash, name);

  return {
    id: result.lastInsertRowid as number,
    email,
    name,
    password,
  };
}

export async function authenticatedRequest(
  url: string,
  opts: { method: string; body?: object; userId: number; email: string }
) {
  const { NextRequest } = await import("next/server");
  const token = await signToken({ userId: opts.userId, email: opts.email });

  const init: RequestInit & { headers: Record<string, string> } = {
    method: opts.method,
    headers: {
      Cookie: `token=${token}`,
    },
  };

  if (opts.body) {
    init.body = JSON.stringify(opts.body);
    init.headers["Content-Type"] = "application/json";
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}
