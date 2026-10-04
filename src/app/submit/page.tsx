"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import CodeEditor from "@/components/CodeEditor";

export default function SubmitPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter some JavaScript code");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Submission failed");
      }

      const data = await res.json();
      router.push(`/submissions/${data.submission.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Submit Code for Review
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Paste your JavaScript code below. It will be analyzed using ESLint
          static analysis and Claude AI to identify potential bugs, code quality
          issues, and security vulnerabilities with risk-level scoring.
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <CodeEditor value={code} onChange={setCode} />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Only JavaScript code is supported.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Analyzing..." : "Submit for Review"}
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
