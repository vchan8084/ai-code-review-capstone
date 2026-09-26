import { analyzeWithEslint } from "./eslint-analyzer";
import type { AnalysisFinding } from "@/types";

export async function analyzeCode(code: string): Promise<AnalysisFinding[]> {
  const eslintFindings = await analyzeWithEslint(code);

  // v2: Add LLM analysis here
  // const llmFindings = await analyzeWithLlm(code);
  // return [...eslintFindings, ...llmFindings];

  return eslintFindings;
}
