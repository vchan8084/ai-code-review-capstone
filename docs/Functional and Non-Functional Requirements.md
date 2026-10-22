# Functional and Non-Functional Requirements

This document lists the capstone deliverable requirements for the **AI-Assisted Code Review and Software Defect Risk Assessment System**. The same functional requirements appear in [Technical Report.md](./Technical%20Report.md) (Section 1.4); this file presents them in a review-ready format with traceability to the implementation.

## Functional requirements

| ID | Requirement | Implementation (repository location) |
|----|-------------|--------------------------------------|
| FR-1 | Provide a web interface to submit JavaScript source code and view analysis results. | `src/app/submit/`, `src/components/CodeEditor.tsx`, `src/app/submissions/[id]/`, `src/components/FindingsTable.tsx` |
| FR-2 | Provide basic user authentication and access control so users can access only their own submissions and results. | `src/lib/auth.ts`, `src/lib/middleware.ts`, `src/app/api/auth/`, `src/components/ProtectedRoute.tsx`; API returns 403 for other users’ submissions |
| FR-3 | Provide a code-analysis service that coordinates static and LLM-based analysis. | `src/lib/analysis/index.ts` (orchestrator) |
| FR-4 | Provide a static-analysis module for defects, code quality, and selected security issues. | `src/lib/analysis/eslint-analyzer.ts`, `data/submission.config.mjs` |
| FR-5 | Provide an LLM-analysis module for additional findings, explanations, and recommendations. | `src/lib/analysis/llm-analyzer.ts` (Claude via AWS Bedrock) |
| FR-6 | Aggregate findings from both analyzers and assign low-, medium-, or high-risk categories. | `src/lib/analysis/risk-scorer.ts`, `src/components/RiskSummary.tsx` |
| FR-7 | Present prioritized findings in a human-readable results dashboard. | `src/app/dashboard/`, `src/app/submissions/[id]/`, `src/app/results/`, `src/components/FindingsCharts.tsx` |
| FR-8 | Provide an evaluation component comparing static-only analysis with the combined approach. | `src/lib/analysis/evaluation.ts`, `src/app/evaluate/`, `POST /api/evaluate` |

### Out of scope (explicit exclusions)

- Training or hosting a custom LLM
- Multi-language analysis (JavaScript only)
- Automatic code fixes or production deployment
- Guarantee that submitted code is defect-free or fully secure
- Replacing human code review

## Non-functional requirements

| ID | Category | Requirement | How the prototype addresses it |
|----|----------|-------------|--------------------------------|
| NFR-1 | Security | Passwords must be stored using a strong one-way hash; sessions must use signed tokens. | bcrypt password hashing; JWT in httpOnly cookies (`src/lib/auth.ts`) |
| NFR-2 | Security | Users must not read or modify other users’ submissions. | Auth middleware on API routes; ownership checks on submission queries |
| NFR-3 | Security | Database access must use parameterized queries to reduce injection risk. | better-sqlite3 prepared statements in `src/lib/db.ts` and API handlers |
| NFR-4 | Privacy | Minimize stored data; avoid using proprietary or confidential code in evaluation datasets. | SQLite stores submissions needed for the demo; evaluation uses dedicated test samples (`src/lib/analysis/evaluation.ts`) |
| NFR-5 | Privacy / transparency | Users should know submitted code may be sent to an external AI service for analysis. | Documented in README and technical report; operators configure AWS Bedrock |
| NFR-6 | Reliability | Analysis should remain usable when the LLM service is unavailable. | Orchestrator falls back to ESLint-only analysis (see README) |
| NFR-7 | Usability | Findings must include severity, explanations, and line-level context where applicable. | Findings model in `src/types/index.ts`; UI components for tables and charts |
| NFR-8 | Maintainability | System must use a modular layered architecture. | UI, application, analysis, and data layers (see architecture diagram and `src/lib/analysis/`) |
| NFR-9 | Performance | Complete analysis within reasonable time for prototype-sized JavaScript samples. | Parallel ESLint and LLM calls in orchestrator; suitable for capstone demo workloads |
| NFR-10 | Testability | Core analysis, scoring, and API behavior must be verifiable by automated tests. | Vitest suites under `src/lib/analysis/__tests__/` and integration helpers |
| NFR-11 | Operability | Dependencies (Node, AWS credentials, Bedrock model ID) must be documented for setup. | Root [README.md](../README.md) |
| NFR-12 | Scalability | Production-scale multi-tenant deployment is not required for the capstone prototype. | Single-instance SQLite; eight-week scope limits infrastructure |

### Known limitations (non-functional)

- LLM finding quality, latency, cost, and availability depend on AWS Bedrock and prompt design.
- Evaluation results apply to the selected JavaScript defect dataset, not all codebases.
- Advanced authentication (OAuth, MFA), long-term retention policies, and enterprise monitoring are out of prototype scope.

## Related deliverables

| Deliverable | Location |
|-------------|----------|
| Application source code | [`src/`](../src/) (Next.js / TypeScript application that analyzes **JavaScript** submissions); ESLint rules in [`data/submission.config.mjs`](../data/submission.config.mjs) |
| Project README | [README.md](../README.md) |
| System architecture diagram | [system diagram.png](./system%20diagram.png) (also referenced in README and [Technical Report.md](./Technical%20Report.md)) |
