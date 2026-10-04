import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type { AnalysisFinding } from "@/types";

const ANALYSIS_PROMPT = `You are a senior code reviewer. Analyze the following JavaScript code for:
1. **Bugs**: Logic errors, null/undefined risks, off-by-one errors, unreachable code, type coercion issues
2. **Security vulnerabilities**: Injection risks, eval usage, prototype pollution, unsafe data handling
3. **Code quality**: Poor patterns, missing error handling, code smells, maintainability concerns

For each issue found, respond with a JSON array of objects with these exact fields:
- "rule_id": a short kebab-case identifier (e.g., "unsafe-eval", "null-deref-risk", "missing-error-handling")
- "severity": 1 for warnings (code quality, minor), 2 for errors (bugs, security)
- "message": clear one-sentence explanation of the issue
- "line": the 1-based line number where the issue occurs (or null if not line-specific)
- "column": the 1-based column number (or null)
- "suggestion": a brief suggestion for how to fix the issue (or null)
- "category": one of "bug", "security", "quality"

Respond ONLY with valid JSON — no markdown fencing, no explanation. If no issues are found, respond with an empty array [].`;

interface LlmFinding {
  rule_id: string;
  severity: number;
  message: string;
  line: number | null;
  column: number | null;
  suggestion: string | null;
  category: string;
}

export async function analyzeWithLlm(
  code: string
): Promise<AnalysisFinding[]> {
  const region = process.env.AWS_REGION ?? "us-east-1";
  const modelId =
    process.env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-sonnet-4-20250514-v1:0";

  const client = new BedrockRuntimeClient({ region });

  let text: string;
  try {
    const res = await client.send(
      new ConverseCommand({
        modelId,
        system: [{ text: ANALYSIS_PROMPT }],
        messages: [
          {
            role: "user",
            content: [
              {
                text: `Code to review:\n\`\`\`javascript\n${code}\n\`\`\``,
              },
            ],
          },
        ],
        inferenceConfig: { maxTokens: 2048 },
      })
    );

    const blocks = res.output?.message?.content ?? [];
    text = blocks
      .filter((b): b is { text: string } => "text" in b && typeof b.text === "string")
      .map((b) => b.text)
      .join("");
  } catch (err) {
    console.error("Bedrock call failed, skipping LLM analysis:", err);
    return [];
  }

  if (!text) return [];

  const cleaned = text.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();

  let parsed: LlmFinding[];
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse LLM response:", cleaned.slice(0, 200));
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.map((f) => ({
    source: "llm" as const,
    rule_id: f.rule_id ?? null,
    severity: f.severity === 2 ? 2 : 1,
    message: f.message ?? "Issue detected by AI analysis",
    line: typeof f.line === "number" ? f.line : null,
    column: typeof f.column === "number" ? f.column : null,
    end_line: null,
    end_column: null,
    suggestion: f.suggestion ?? null,
    category: f.category ?? "quality",
  }));
}
