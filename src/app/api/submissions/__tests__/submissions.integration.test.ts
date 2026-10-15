import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import {
  createTestDb,
  seedUser,
  authenticatedRequest,
} from "@/lib/__tests__/integration-helpers";

let db: Database.Database;

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => db),
}));

vi.mock("@/lib/analysis/llm-analyzer", () => ({
  analyzeWithLlm: vi.fn(async () => []),
}));

beforeEach(() => {
  vi.stubEnv("JWT_SECRET", "test-secret-for-integration");
  db = createTestDb();
});

describe("POST /api/submissions", () => {
  it("creates a submission and returns findings from ESLint", async () => {
    const user = await seedUser(db);
    const req = await authenticatedRequest("/api/submissions", {
      method: "POST",
      userId: user.id,
      email: user.email,
      body: { code: "var x = 1;\neval('code');" },
    });

    const { POST } = await import("@/app/api/submissions/route");
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.submission.status).toBe("completed");
    expect(json.submission.findings.length).toBeGreaterThan(0);

    const dbSubmission = db
      .prepare("SELECT * FROM submissions WHERE id = ?")
      .get(json.submission.id);
    expect(dbSubmission).toBeTruthy();

    const dbFindings = db
      .prepare("SELECT * FROM findings WHERE submission_id = ?")
      .all(json.submission.id);
    expect(dbFindings.length).toBe(json.submission.findings.length);
  });

  it("rejects unauthenticated requests", async () => {
    const req = new NextRequest("http://localhost:3000/api/submissions", {
      method: "POST",
      body: JSON.stringify({ code: "const x = 1;" }),
      headers: { "Content-Type": "application/json" },
    });

    const { POST } = await import("@/app/api/submissions/route");
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("rejects empty code", async () => {
    const user = await seedUser(db);
    const req = await authenticatedRequest("/api/submissions", {
      method: "POST",
      userId: user.id,
      email: user.email,
      body: { code: "" },
    });

    const { POST } = await import("@/app/api/submissions/route");
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects missing code field", async () => {
    const user = await seedUser(db);
    const req = await authenticatedRequest("/api/submissions", {
      method: "POST",
      userId: user.id,
      email: user.email,
      body: {},
    });

    const { POST } = await import("@/app/api/submissions/route");
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/submissions", () => {
  it("lists submissions for the authenticated user", async () => {
    const user = await seedUser(db);

    db.prepare(
      "INSERT INTO submissions (user_id, code, status) VALUES (?, ?, 'completed')"
    ).run(user.id, "const a = 1;");
    db.prepare(
      "INSERT INTO submissions (user_id, code, status) VALUES (?, ?, 'completed')"
    ).run(user.id, "const b = 2;");

    const req = await authenticatedRequest("/api/submissions", {
      method: "GET",
      userId: user.id,
      email: user.email,
    });

    const { GET } = await import("@/app/api/submissions/route");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.submissions).toHaveLength(2);
  });

  it("does not return other users submissions", async () => {
    const user1 = await seedUser(db, { email: "user1@example.com" });
    const user2 = await seedUser(db, { email: "user2@example.com" });

    db.prepare(
      "INSERT INTO submissions (user_id, code, status) VALUES (?, ?, 'completed')"
    ).run(user1.id, "const a = 1;");
    db.prepare(
      "INSERT INTO submissions (user_id, code, status) VALUES (?, ?, 'completed')"
    ).run(user2.id, "const b = 2;");

    const req = await authenticatedRequest("/api/submissions", {
      method: "GET",
      userId: user1.id,
      email: user1.email,
    });

    const { GET } = await import("@/app/api/submissions/route");
    const res = await GET(req);
    const json = await res.json();

    expect(json.submissions).toHaveLength(1);
  });

  it("rejects unauthenticated requests", async () => {
    const req = new NextRequest("http://localhost:3000/api/submissions");

    const { GET } = await import("@/app/api/submissions/route");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/submissions/[id]", () => {
  it("returns a submission with findings", async () => {
    const user = await seedUser(db);
    const sub = db
      .prepare(
        "INSERT INTO submissions (user_id, code, status) VALUES (?, ?, 'completed')"
      )
      .run(user.id, "var x = 1;");
    const subId = sub.lastInsertRowid as number;

    db.prepare(
      "INSERT INTO findings (submission_id, source, severity, message, line) VALUES (?, 'eslint', 1, 'test warning', 1)"
    ).run(subId);

    const req = await authenticatedRequest(`/api/submissions/${subId}`, {
      method: "GET",
      userId: user.id,
      email: user.email,
    });

    const { GET } = await import("@/app/api/submissions/[id]/route");
    const res = await GET(req, { params: Promise.resolve({ id: String(subId) }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.submission.id).toBe(subId);
    expect(json.submission.findings).toHaveLength(1);
  });

  it("denies access to another users submission", async () => {
    const owner = await seedUser(db, { email: "owner@example.com" });
    const other = await seedUser(db, { email: "other@example.com" });

    const sub = db
      .prepare(
        "INSERT INTO submissions (user_id, code, status) VALUES (?, ?, 'completed')"
      )
      .run(owner.id, "const x = 1;");
    const subId = sub.lastInsertRowid as number;

    const req = await authenticatedRequest(`/api/submissions/${subId}`, {
      method: "GET",
      userId: other.id,
      email: other.email,
    });

    const { GET } = await import("@/app/api/submissions/[id]/route");
    const res = await GET(req, { params: Promise.resolve({ id: String(subId) }) });
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent submission", async () => {
    const user = await seedUser(db);
    const req = await authenticatedRequest("/api/submissions/9999", {
      method: "GET",
      userId: user.id,
      email: user.email,
    });

    const { GET } = await import("@/app/api/submissions/[id]/route");
    const res = await GET(req, { params: Promise.resolve({ id: "9999" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid ID", async () => {
    const user = await seedUser(db);
    const req = await authenticatedRequest("/api/submissions/abc", {
      method: "GET",
      userId: user.id,
      email: user.email,
    });

    const { GET } = await import("@/app/api/submissions/[id]/route");
    const res = await GET(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });
});
