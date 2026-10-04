import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { hashPassword, verifyPassword, signToken, verifyToken } from "../auth";

describe("auth", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", "test-secret-key-for-unit-tests");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("hashPassword / verifyPassword", () => {
    it("verifies a correct password", async () => {
      const hash = await hashPassword("my-password");
      const valid = await verifyPassword("my-password", hash);
      expect(valid).toBe(true);
    });

    it("rejects a wrong password", async () => {
      const hash = await hashPassword("my-password");
      const valid = await verifyPassword("wrong-password", hash);
      expect(valid).toBe(false);
    });

    it("produces different hashes for the same password (salt uniqueness)", async () => {
      const hash1 = await hashPassword("my-password");
      const hash2 = await hashPassword("my-password");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("signToken / verifyToken", () => {
    it("roundtrips a token with correct payload", async () => {
      const payload = { userId: 42, email: "test@example.com" };
      const token = await signToken(payload);
      const result = await verifyToken(token);
      expect(result).toMatchObject(payload);
    });

    it("returns null for a garbage token", async () => {
      const result = await verifyToken("not.a.valid.jwt");
      expect(result).toBeNull();
    });

    it("returns null for a token signed with a different secret", async () => {
      const payload = { userId: 1, email: "a@b.com" };
      const token = await signToken(payload);

      vi.stubEnv("JWT_SECRET", "different-secret");
      const result = await verifyToken(token);
      expect(result).toBeNull();
    });
  });

  describe("missing JWT_SECRET", () => {
    it("throws when JWT_SECRET is not set", async () => {
      delete process.env.JWT_SECRET;
      await expect(signToken({ userId: 1, email: "a@b.com" })).rejects.toThrow(
        "JWT_SECRET environment variable is required"
      );
    });
  });
});
