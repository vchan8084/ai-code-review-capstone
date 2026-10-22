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

beforeEach(() => {
  vi.stubEnv("JWT_SECRET", "test-secret-for-integration");
  db = createTestDb();
});

describe("POST /api/auth/register", () => {
  async function register(body: object) {
    const { POST } = await import("@/app/api/auth/register/route");
    const req = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    return POST(req);
  }

  it("creates a new user and sets a token cookie", async () => {
    const res = await register({
      email: "new@example.com",
      password: "securepass123",
      name: "New User",
    });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.user.email).toBe("new@example.com");
    expect(json.user.name).toBe("New User");
    expect(res.cookies.get("token")?.value).toBeTruthy();

    const row = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get("new@example.com") as { email: string };
    expect(row).toBeTruthy();
  });

  it("rejects duplicate email", async () => {
    await seedUser(db, { email: "dup@example.com" });

    const res = await register({
      email: "dup@example.com",
      password: "securepass123",
      name: "Dup User",
    });
    expect(res.status).toBe(409);
  });

  it("rejects missing fields", async () => {
    const res = await register({ email: "a@b.com" });
    expect(res.status).toBe(400);
  });

  it("rejects short password", async () => {
    const res = await register({
      email: "a@b.com",
      password: "short",
      name: "Test",
    });
    expect(res.status).toBe(400);
  });

  it("rejects invalid email", async () => {
    const res = await register({
      email: "not-an-email",
      password: "securepass123",
      name: "Test",
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  async function login(body: object) {
    const { POST } = await import("@/app/api/auth/login/route");
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    return POST(req);
  }

  it("logs in with correct credentials", async () => {
    await seedUser(db, {
      email: "login@example.com",
      password: "correctpass1",
    });

    const res = await login({
      email: "login@example.com",
      password: "correctpass1",
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.user.email).toBe("login@example.com");
    expect(res.cookies.get("token")?.value).toBeTruthy();
  });

  it("rejects wrong password", async () => {
    await seedUser(db, { email: "user@example.com", password: "realpass123" });

    const res = await login({
      email: "user@example.com",
      password: "wrongpass123",
    });
    expect(res.status).toBe(401);
  });

  it("rejects non-existent user", async () => {
    const res = await login({
      email: "ghost@example.com",
      password: "anything123",
    });
    expect(res.status).toBe(401);
  });

  it("rejects missing fields", async () => {
    const res = await login({ email: "a@b.com" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("returns user when authenticated", async () => {
    const user = await seedUser(db);
    const req = await authenticatedRequest("/api/auth/me", {
      method: "GET",
      userId: user.id,
      email: user.email,
    });

    const { GET } = await import("@/app/api/auth/me/route");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.user.email).toBe(user.email);
    expect(json.user.name).toBe(user.name);
  });

  it("rejects unauthenticated request", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/me");

    const { GET } = await import("@/app/api/auth/me/route");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
