"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";
import type { EvaluationResult } from "@/types";

interface AggregateMetrics {
  precision: number;
  recall: number;
  f1_score: number;
}

export default function EvaluatePage() {
  const [results, setResults] = useState<EvaluationResult[] | null>(null);
  const [aggregate, setAggregate] = useState<{
    eslint_only: AggregateMetrics;
    combined: AggregateMetrics;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runEval = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Evaluation failed");
      const data = await res.json();
      setResults(data.results);
      setAggregate(data.aggregate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="text-sm text-blue-600 hover:underline mb-4 inline-block"
        >
          &larr; Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Analysis Evaluation
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Compare ESLint-only vs. combined (ESLint + AI) analysis against
              known-defect test cases.
            </p>
          </div>
          <button
            onClick={runEval}
            disabled={loading}
            className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Running..." : "Run Evaluation"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && <LoadingSpinner />}

        {aggregate && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Aggregate Results
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricCard
                title="ESLint Only"
                metrics={aggregate.eslint_only}
                color="gray"
              />
              <MetricCard
                title="Combined (ESLint + AI)"
                metrics={aggregate.combined}
                color="indigo"
              />
            </div>
          </div>
        )}

        {results && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Per-Test Results
            </h2>
            <div className="space-y-4">
              {results.map((r) => (
                <div
                  key={r.test_case}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <h3 className="font-medium text-gray-900 mb-3">
                    {r.test_case}
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({r.expected_count} expected finding
                      {r.expected_count !== 1 ? "s" : ""})
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        ESLint Only
                      </div>
                      <MetricRow metrics={r.eslint_only} />
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-3">
                      <div className="text-sm font-medium text-indigo-700 mb-2">
                        Combined (ESLint + AI)
                      </div>
                      <MetricRow metrics={r.combined} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function MetricCard({
  title,
  metrics,
  color,
}: {
  title: string;
  metrics: AggregateMetrics;
  color: "gray" | "indigo";
}) {
  const bg = color === "indigo" ? "bg-indigo-50 border-indigo-200" : "bg-gray-50 border-gray-200";
  const text = color === "indigo" ? "text-indigo-800" : "text-gray-800";

  return (
    <div className={`rounded-lg border ${bg} p-4`}>
      <h3 className={`font-semibold ${text} mb-3`}>{title}</h3>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className={`text-2xl font-bold ${text}`}>
            {(metrics.precision * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">Precision</div>
        </div>
        <div>
          <div className={`text-2xl font-bold ${text}`}>
            {(metrics.recall * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">Recall</div>
        </div>
        <div>
          <div className={`text-2xl font-bold ${text}`}>
            {(metrics.f1_score * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">F1 Score</div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ metrics }: { metrics: AggregateMetrics & { true_positives?: number; false_positives?: number; false_negatives?: number } }) {
  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-600">Precision</span>
        <span className="font-medium">{(metrics.precision * 100).toFixed(1)}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Recall</span>
        <span className="font-medium">{(metrics.recall * 100).toFixed(1)}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">F1 Score</span>
        <span className="font-medium">{(metrics.f1_score * 100).toFixed(1)}%</span>
      </div>
      {"true_positives" in metrics && (
        <div className="flex justify-between text-xs text-gray-500 pt-1 border-t border-gray-200 mt-1">
          <span>TP: {metrics.true_positives}</span>
          <span>FP: {metrics.false_positives}</span>
          <span>FN: {metrics.false_negatives}</span>
        </div>
      )}
    </div>
  );
}
