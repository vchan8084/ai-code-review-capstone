# AI-Assisted Code Review

A web-based prototype that combines static analysis with AI-based techniques to review JavaScript source code for potential defects, code quality issues, and security vulnerabilities. Built as a capstone project (MSIT 5910) at the University of the People.

Users submit JavaScript code through a web interface, and the system runs ESLint-based static analysis to identify issues. Results are displayed with severity ratings, rule explanations, and line-level annotations.

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
│              Results View                   │
├─────────────────────────────────────────────┤
│           Application Layer                 │
│   Authentication    Code Analysis Service   │
│   & Access Control  (orchestrator)          │
├─────────────────────────────────────────────┤
│            Analysis Layer                   │
│   Static Analysis Module (ESLint)           │
│   [v2: LLM Analysis Module]                │
│   [v2: Finding Aggregation & Risk Scoring]  │
├─────────────────────────────────────────────┤
│         Data & Evaluation Layer             │
│   SQLite (users, submissions, findings)     │
│   [v2: Evaluation Module]                   │
└─────────────────────────────────────────────┘
```

See `docs/system diagram.png` for the full UML component diagram.

## Getting Started

### Prerequisites

- Node.js 18+
- npm

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

The LLM analysis layer uses Claude on AWS Bedrock, so you must have valid AWS credentials (e.g., via `aws sso login`) before starting the dev server. If credentials are missing or expired, the system falls back to ESLint-only analysis.

### Running Locally

```bash
npm run dev
```

The app starts at [http://localhost:3000](http://localhost:3000).

The SQLite database (`data/reviews.db`) is created automatically on first request.

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

## Project Structure

```
src/
  app/                        # Next.js App Router pages and API routes
  components/                 # React components (Navbar, CodeEditor, FindingsTable, etc.)
  lib/
    auth.ts                   # Password hashing and JWT utilities
    db.ts                     # SQLite connection and schema initialization
    middleware.ts             # Auth middleware for API routes
    analysis/
      index.ts                # Analysis orchestrator
      eslint-analyzer.ts      # ESLint programmatic analysis
  types/
    index.ts                  # Shared TypeScript interfaces
eslint-config/
  submission.config.mjs       # ESLint rules for analyzing submitted code
data/
  reviews.db                  # SQLite database (created at runtime, gitignored)
docs/
  system diagram.png          # UML component diagram
  V1 Implementation Plan.md   # Detailed implementation plan
```
