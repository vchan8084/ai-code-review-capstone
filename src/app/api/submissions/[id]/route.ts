import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/middleware";
import { getDb } from "@/lib/db";
import type { Submission } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const submissionId = parseInt(id, 10);
  if (isNaN(submissionId)) {
    return NextResponse.json(
      { error: "Invalid submission ID" },
      { status: 400 }
    );
  }

  const db = getDb();
  const submission = db
    .prepare("SELECT * FROM submissions WHERE id = ?")
    .get(submissionId) as Submission | undefined;

  if (!submission) {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 }
    );
  }

  if (submission.user_id !== user.id) {
    return NextResponse.json(
      { error: "Access denied" },
      { status: 403 }
    );
  }

  const findings = db
    .prepare(
      "SELECT * FROM findings WHERE submission_id = ? ORDER BY line ASC, severity DESC"
    )
    .all(submissionId);

  return NextResponse.json({
    submission: { ...submission, findings },
  });
}
