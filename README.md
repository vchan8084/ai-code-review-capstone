# AI-Assisted Code Review

A web-based prototype that combines static analysis with AI-based techniques to review JavaScript source code for potential defects, code quality issues, and security vulnerabilities. Built as a capstone project (MSIT 5910) at the University of the People.

Users submit JavaScript code through a web interface, and the system runs both ESLint-based static analysis and LLM-powered analysis (Claude via AWS Bedrock) to identify issues. Findings from both engines are aggregated, deduplicated, and scored for risk. Results are displayed with severity ratings, rule explanations, and line-level annotations.

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Database**: SQLite via better-sqlite3
- **Authentication**: Custom JWT with httpOnly cookies (bcryptjs + jose)
- **Static Analysis**: ESLint 9 (flat config, Node API)
- **LLM Analysis**: Claude via AWS Bedrock

## System Architecture

The system follows a four-layer modular architecture:

```
┌─────────────────────────────────────────────┐
│           User Interface Layer              │
│   Landing Page · Dashboard · Code Editor    │
│     Results View · Evaluation Dashboard     │
├─────────────────────────────────────────────┤
│           Application Layer                 │
│   Authentication    Code Analysis Service   │
│   & Access Control  (orchestrator)          │
├─────────────────────────────────────────────┤
│            Analysis Layer                   │
│   Static Analysis (ESLint)                  │
│   LLM Analysis (Claude via Bedrock)         │
│   Finding Aggregation & Risk Scoring        │
├─────────────────────────────────────────────┤
│         Data & Evaluation Layer             │
│   SQLite (users, submissions, findings)     │
│   Evaluation Module                         │
└─────────────────────────────────────────────┘
```

See `docs/system diagram.png` for the full UML component diagram.

## Getting Started

### Prerequisites

- **Node.js** 18+ (tested on 22.x)
- **npm**
- **AWS CLI** — required for LLM analysis via Bedrock (install from [aws.amazon.com/cli](https://aws.amazon.com/cli/))
- **C++ build tools** — `better-sqlite3` is a native module. On macOS, Xcode Command Line Tools (`xcode-select --install`) are required. On Linux, `build-essential` and `python3` are needed. On Windows, install the [windows-build-tools](https://github.com/nicedoc/windows-build-tools) package or Visual Studio Build Tools.

### Installation

```bash
git clone https://github.com/vchan8084/ai-code-review-capstone.git
cd ai-code-review-capstone
npm install
```

### Environment Setup

Create a `.env.local` file in the project root:

```
JWT_SECRET=your-secret-key-at-least-32-characters
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-20250514-v1:0
```

| Variable | Required | Description |
|----------|:--------:|-------------|
| `JWT_SECRET` | Yes | Secret key for signing JWTs (minimum 32 characters) |
| `AWS_REGION` | Yes | AWS region where Bedrock is enabled |
| `BEDROCK_MODEL_ID` | Yes | Claude model ID on Bedrock |

The LLM analysis layer uses Claude on AWS Bedrock, so you must have valid AWS credentials (e.g., via `aws sso login`) before starting the dev server. If credentials are missing or expired, the system falls back to ESLint-only analysis.

### Running Locally

```bash
npm run dev
```

The app starts at [http://localhost:3000](http://localhost:3000).

The SQLite database (`data/reviews.db`) is created automatically on first request.

### Build and Deploy

```bash
npm run build          # Production build
npm run start          # Start production server (requires build first)
```

### Testing and Linting

```bash
npm run test           # Run tests once (Vitest)
npm run test:watch     # Run tests in watch mode
npm run lint           # Run ESLint
```

## Authentication

The app uses JWT-based authentication with httpOnly cookies. No OAuth or third-party providers — just email/password.

### Register

1. Go to [http://localhost:3000/register](http://localhost:3000/register)
2. Enter your name, email, and a password (minimum 8 characters)
3. You are logged in automatically and redirected to the dashboard

### Log In

1. Go to [http://localhost:3000/login](http://localhost:3000/login)
2. Enter your email and password
3. A JWT is stored as an httpOnly cookie (7-day expiry)

### Access Control

- All submissions and results are scoped to the authenticated user
- Users can only view their own submissions — accessing another user's submission returns a 403
- Unauthenticated requests to protected pages redirect to `/login`

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Log in |
| GET | `/api/auth/me` | Yes | Get current user |
| POST | `/api/auth/logout` | No | Clear session cookie |
| POST | `/api/submissions` | Yes | Submit code for analysis |
| GET | `/api/submissions` | Yes | List your submissions |
| GET | `/api/submissions/:id` | Yes | View submission with findings |
| POST | `/api/evaluate` | Yes | Run evaluation suite against test cases |

## Project Structure

```
src/
  app/                          # Next.js App Router pages and API routes
    api/
      auth/                     # Register, login, logout, me endpoints
      submissions/              # Submit code, list/view submissions
      evaluate/                 # Run evaluation suite
    dashboard/                  # User dashboard
    submit/                     # Code submission page
    submissions/[id]/           # Individual submission results
    evaluate/                   # Evaluation dashboard
    results/                    # Aggregated results view
    login/ register/            # Auth pages
  components/                   # React components
    AuthProvider.tsx             # Client-side auth context
    CodeEditor.tsx              # Syntax-highlighted code input
    FindingsTable.tsx           # Tabular findings display
    FindingsCharts.tsx          # Visual charts (Recharts)
    RiskSummary.tsx             # Risk score breakdown
    Navbar.tsx                  # Navigation bar
    ProtectedRoute.tsx          # Auth guard wrapper
  lib/
    auth.ts                     # Password hashing and JWT utilities
    db.ts                       # SQLite connection and schema initialization
    middleware.ts               # Auth middleware for API routes
    analysis/
      index.ts                  # Analysis orchestrator
      eslint-analyzer.ts        # ESLint programmatic analysis
      llm-analyzer.ts           # Claude (Bedrock) analysis
      risk-scorer.ts            # Finding aggregation and risk scoring
      evaluation.ts             # Evaluation module
      __tests__/                # Unit tests (Vitest)
  types/
    index.ts                    # Shared TypeScript interfaces
data/
  submission.config.mjs         # ESLint rules for analyzing submitted code
  reviews.db                    # SQLite database (created at runtime, gitignored)
docs/
  system diagram.png            # UML component diagram
```
