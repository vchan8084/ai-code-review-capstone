export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
}

export interface SafeUser {
  id: number;
  email: string;
  name: string;
}

export interface Submission {
  id: number;
  user_id: number;
  code: string;
  language: string;
  status: "pending" | "analyzing" | "completed" | "error";
  created_at: string;
  completed_at: string | null;
}

export interface Finding {
  id: number;
  submission_id: number;
  source: "eslint" | "llm";
  rule_id: string | null;
  severity: number;
  message: string;
  line: number | null;
  column: number | null;
  end_line: number | null;
  end_column: number | null;
  suggestion: string | null;
  risk_level: "critical" | "high" | "medium" | "low" | null;
  category: string | null;
  confidence: number | null;
  created_at: string;
}

export interface SubmissionWithFindings extends Submission {
  findings: Finding[];
}

export interface SubmissionWithCount extends Submission {
  finding_count: number;
  error_count: number;
  warning_count: number;
}

export interface AnalysisFinding {
  source: "eslint" | "llm";
  rule_id: string | null;
  severity: number;
  message: string;
  line: number | null;
  column: number | null;
  end_line: number | null;
  end_column: number | null;
  suggestion: string | null;
  risk_level?: "critical" | "high" | "medium" | "low";
  confidence?: number;
  category?: string;
}

export interface AnalysisResult {
  findings: AnalysisFinding[];
  risk_summary: RiskSummary;
}

export interface RiskSummary {
  overall_risk: "critical" | "high" | "medium" | "low" | "none";
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  total_findings: number;
  eslint_count: number;
  llm_count: number;
  deduplicated_count: number;
}

export interface EvaluationTestCase {
  name: string;
  code: string;
  expected_findings: ExpectedFinding[];
}

export interface ExpectedFinding {
  category: string;
  line: number | null;
  description: string;
}

export interface EvaluationMetrics {
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  precision: number;
  recall: number;
  f1_score: number;
}

export interface EvaluationResult {
  test_case: string;
  eslint_only: EvaluationMetrics;
  combined: EvaluationMetrics;
  eslint_findings: AnalysisFinding[];
  combined_findings: AnalysisFinding[];
  expected_count: number;
  llm_finding_count: number;
  llm_error?: string;
  eslint_latency_ms: number;
  llm_latency_ms: number;
  total_latency_ms: number;
}
