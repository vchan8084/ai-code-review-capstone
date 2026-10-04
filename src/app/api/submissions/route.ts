import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/middleware";
import { getDb } from "@/lib/db";
import { analyzeCode } from "@/lib/analysis";
import type { AnalysisResult, Submission } from "@/types";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { code } = body;

  if (!code || typeof code !== "string" || code.trim().length === 0) {
    return NextResponse.json(
      { error: "Code is required" },
      { status: 400 }
    );
  }

  const db = getDb();

  const insertSubmission = db.prepare(
    "INSERT INTO submissions (user_id, code, status) VALUES (?, ?, 'analyzing')"
  );
  const result = insertSubmission.run(user.id, code);
  const submissionId = result.lastInsertRowid as number;

  let analysisResult: AnalysisResult = {
    findings: [],
    risk_summary: {
      overall_risk: "none",
      critical_count: 0,
      high_count: 0,
      medium_count: 0,
      low_count: 0,
      total_findings: 0,
      eslint_count: 0,
      llm_count: 0,
      deduplicated_count: 0,
    },
  };
  let status: string = "completed";

  try {
    analysisResult = await analyzeCode(code);

    const insertFinding = db.prepare(
      `INSERT INTO findings (submission_id, source, rule_id, severity, message, line, col, end_line, end_column, suggestion, risk_level, category, confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const insertMany = db.transaction(
      (items: AnalysisResult["findings"]) => {
        for (const f of items) {
          insertFinding.run(
            submissionId,
            f.source,
            f.rule_id,
            f.severity,
            f.message,
            f.line,
            f.column,
            f.end_line,
            f.end_column,
            f.suggestion,
            f.risk_level ?? "low",
            f.category ?? null,
            f.confidence ?? 0.95
          );
        }
      }
    );

    insertMany(analysisResult.findings);
  } catch {
    status = "error";
  }

  db.prepare(
    "UPDATE submissions SET status = ?, completed_at = datetime('now') WHERE id = ?"
  ).run(status, submissionId);

  const submission = db
    .prepare("SELECT * FROM submissions WHERE id = ?")
    .get(submissionId) as Submission;

  const savedFindings = db
    .prepare("SELECT * FROM findings WHERE submission_id = ?")
    .all(submissionId);

  return NextResponse.json(
    {
      submission: {
        ...submission,
        findings: savedFindings,
        risk_summary: analysisResult.risk_summary,
      },
    },
    { status: 201 }
  );
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const db = getDb();
  const submissions = db
    .prepare(
      `SELECT s.*,
        COUNT(f.id) as finding_count,
        SUM(CASE WHEN f.severity = 2 THEN 1 ELSE 0 END) as error_count,
        SUM(CASE WHEN f.severity = 1 THEN 1 ELSE 0 END) as warning_count
      FROM submissions s
      LEFT JOIN findings f ON f.submission_id = s.id
      WHERE s.user_id = ?
      GROUP BY s.id
      ORDER BY s.created_at DESC`
    )
    .all(user.id);

  return NextResponse.json({ submissions });
}
