"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import CodeEditor from "@/components/CodeEditor";
import FindingsTable from "@/components/FindingsTable";
import FindingSeverityBadge from "@/components/FindingSeverityBadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";
import type { SubmissionWithFindings } from "@/types";

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

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Summary
              </h2>
              <div className="flex gap-4">
                {[2, 1].map((sev) => {
                  const count = submission.findings.filter(
                    (f) => f.severity === sev
                  ).length;
                  return (
                    <div
                      key={sev}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2"
                    >
                      <FindingSeverityBadge severity={sev} />
                      <span className="text-lg font-semibold text-gray-900">
                        {count}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2">
                  <span className="text-sm text-gray-500">Total</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {submission.findings.length}
                  </span>
                </div>
              </div>
            </div>

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
