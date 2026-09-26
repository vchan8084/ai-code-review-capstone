import { ESLint } from "eslint";
import path from "path";
import type { AnalysisFinding } from "@/types";

export async function analyzeWithEslint(
  code: string
): Promise<AnalysisFinding[]> {
  const eslint = new ESLint({
    overrideConfigFile: path.resolve(
      process.cwd(),
      "eslint-config/submission.config.mjs"
    ),
  });

  const results = await eslint.lintText(code, {
    filePath: "submission.js",
  });

  const findings: AnalysisFinding[] = [];

  for (const result of results) {
    for (const msg of result.messages) {
      findings.push({
        source: "eslint",
        rule_id: msg.ruleId ?? null,
        severity: msg.severity,
        message: msg.message,
        line: msg.line ?? null,
        column: msg.column ?? null,
        end_line: msg.endLine ?? null,
        end_column: msg.endColumn ?? null,
        suggestion: msg.fix
          ? `Replace with: ${msg.fix.text}`
          : null,
      });
    }
  }

  return findings;
}
