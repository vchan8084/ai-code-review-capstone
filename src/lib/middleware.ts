import { NextRequest } from "next/server";
import { verifyToken } from "./auth";
import { getDb } from "./db";
import type { SafeUser, User } from "@/types";

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<SafeUser | null> {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const db = getDb();
  const user = db
    .prepare("SELECT id, email, name FROM users WHERE id = ?")
    .get(payload.userId) as Pick<User, "id" | "email" | "name"> | undefined;

  if (!user) return null;

  return { id: user.id, email: user.email, name: user.name };
}
