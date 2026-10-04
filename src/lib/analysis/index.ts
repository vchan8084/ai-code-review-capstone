import { analyzeWithEslint } from "./eslint-analyzer";
import { analyzeWithLlm } from "./llm-analyzer";
import { deduplicateAndScoreFindings } from "./risk-scorer";
import type { AnalysisResult } from "@/types";

export async function analyzeCode(code: string): Promise<AnalysisResult> {
  const [eslintFindings, llmFindings] = await Promise.all([
    analyzeWithEslint(code),
    analyzeWithLlm(code),
  ]);

  const allFindings = [...eslintFindings, ...llmFindings];
  return deduplicateAndScoreFindings(allFindings);
}
