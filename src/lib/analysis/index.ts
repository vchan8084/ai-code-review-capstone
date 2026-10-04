import { analyzeWithEslint } from "./eslint-analyzer";
import { analyzeWithLlm } from "./llm-analyzer";
import { deduplicateAndScoreFindings } from "./risk-scorer";
import type { AnalysisFinding, AnalysisResult } from "@/types";

export async function analyzeCode(code: string): Promise<AnalysisResult> {
  const [eslintFindings, llmFindings] = await Promise.all([
    analyzeWithEslint(code),
    analyzeWithLlm(code).catch((err) => {
      console.error("LLM analysis failed, continuing with ESLint only:", err);
      return [] as AnalysisFinding[];
    }),
  ]);

  const allFindings = [...eslintFindings, ...llmFindings];
  return deduplicateAndScoreFindings(allFindings);
}
