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
}
