"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import CodeEditor from "@/components/CodeEditor";
import FindingsTable from "@/components/FindingsTable";
import FindingsCharts from "@/components/FindingsCharts";
import RiskSummary from "@/components/RiskSummary";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";
import type { SubmissionWithFindings, RiskSummary as RiskSummaryType } from "@/types";

export default function SubmissionDetailPage() {
  const { id } = useParams();
  const [submission, setSubmission] = useState<SubmissionWithFindings | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/submissions/${id}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load submission");
        return res.json();
      })
      .then((data) => setSubmission(data.submission))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const riskSummary: RiskSummaryType | null = submission
    ? buildRiskSummary(submission)
    : null;

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="text-sm text-blue-600 hover:underline mb-4 inline-block"
        >
          &larr; Back to Dashboard
        </Link>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : submission ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Submission #{submission.id}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>
                  {new Date(submission.created_at + "Z").toLocaleString()}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    submission.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : submission.status === "error"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {submission.status}
                </span>
              </div>
            </div>

            {riskSummary && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Risk Assessment
                </h2>
                <RiskSummary summary={riskSummary} />
              </div>
            )}

            {submission.findings.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Distribution
                </h2>
                <FindingsCharts findings={submission.findings} />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Submitted Code
                </h2>
                <CodeEditor
                  value={submission.code}
                  readOnly
                  highlightLines={submission.findings
                    .filter((f) => f.line !== null)
                    .map((f) => f.line as number)}
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Findings
                </h2>
                <FindingsTable findings={submission.findings} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}

function buildRiskSummary(submission: SubmissionWithFindings): RiskSummaryType {
  const findings = submission.findings;
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  let eslintCount = 0;
  let llmCount = 0;

  for (const f of findings) {
    const level = f.risk_level ?? "low";
    if (level in counts) counts[level as keyof typeof counts]++;
    if (f.source === "eslint") eslintCount++;
    else llmCount++;
  }

  const overall: RiskSummaryType["overall_risk"] =
    findings.length === 0
      ? "none"
      : counts.critical > 0
        ? "critical"
        : counts.high > 0
          ? "high"
          : counts.medium > 0
            ? "medium"
            : "low";

  return {
    overall_risk: overall,
    critical_count: counts.critical,
    high_count: counts.high,
    medium_count: counts.medium,
    low_count: counts.low,
    total_findings: findings.length,
    eslint_count: eslintCount,
    llm_count: llmCount,
    deduplicated_count: 0,
  };
}
