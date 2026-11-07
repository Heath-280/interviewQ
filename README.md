# InterviewIQ

AI-powered mock interview and career-preparation platform. Upload a resume, describe the role you
are targeting, and run realistic technical, HR and behavioral interviews with instant, per-question
feedback, skill analytics and downloadable PDF reports.

Built as an npm-workspaces monorepo:

- **`server`** — Express + TypeScript + MongoDB (Mongoose), JWT auth, resume extraction, AI services,
  PDF report generation. 57 Jest tests.
- **`client`** — React + Vite + TypeScript + Tailwind + shadcn-style UI, Recharts analytics.

## Features

- Email/password auth with short-lived access tokens (in-memory) and rotating refresh tokens in
  httpOnly cookies. Role-based access (`user` / `admin`).
- Resume upload (PDF / DOCX / TXT) with server-side text + skill extraction.
- AI-generated interview questions tailored to role, company, job description and resume.
- Per-question AI evaluation: score, summary, strengths, weaknesses, suggested answer and tips.
- Optional AI follow-up questions you can answer for deeper practice.
- Overall scoring, skill breakdown (technical, communication, problem-solving, confidence),
  strengths/weaknesses/recommendations, and a downloadable PDF report.
- Progress analytics: score trend, category performance and skill averages.
- Admin area for managing users and roles.

## AI provider

The backend talks to any **OpenAI-compatible Chat Completions API** (OpenAI, OpenRouter, Groq,
Together, Azure OpenAI, local Ollama, …). Configure it with server env vars — the API key never
reaches the browser.

- If `AI_API_KEY` is set, real AI is used.
- If it is **unset**:
  - with `AI_DEV_MODE=true`, the server returns **clearly labelled deterministic template content**
    (`generationSource: "dev-template"`, plus a warning banner in the UI) so the whole flow works
    offline. It is never presented as real AI.
  - with `AI_DEV_MODE=false`, AI endpoints return a clear `503` configuration message.

## Getting started

### Prerequisites

- Node.js >= 18 (tested on Node 24)
- A MongoDB instance (MongoDB Atlas or a local `mongod`)

### Install

```bash
npm install
```

### Configure

```bash
cp server/.env.example server/.env
# edit server/.env: set MONGODB_URI, JWT secrets, and optionally AI_* values

cp client/.env.example client/.env   # optional; defaults are fine for local dev
```

### Run (development)

```bash
npm run dev
```

- API: http://localhost:5000
- Web: http://localhost:5173 (proxies `/api` to the API)

### Seed an admin (optional)

```bash
npm run seed
```

### Tests, lint, typecheck

```bash
npm test          # server Jest suite (uses mongodb-memory-server)
npm run lint
npm run typecheck
```

### Build & run for production

```bash
npm run build
npm start         # serves the built API from server/dist
```

## Project scripts

| Script              | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Run API and web app concurrently                       |
| `npm run build`     | Build server then client                               |
| `npm start`         | Start the built server                                 |
| `npm test`          | Run the server test suite                              |
| `npm run lint`      | Lint server and client                                 |
| `npm run typecheck` | Type-check server and client                           |
| `npm run seed`      | Create/reset the admin account from `ADMIN_*` env vars |

## Repository layout

```
server/
  src/
    config/        env + database
    models/        User, Resume, Interview
    middleware/    auth, validation, upload, rate limiting, errors
    modules/       auth, users, resumes, interviews, progress, ai
    services/      ai (provider abstraction), extraction, report
    __tests__/     Jest integration tests
client/
  src/
    components/    ui (shadcn-style), layout, charts, common, interviews
    context/       AuthContext
    hooks/         useAsyncData, useAIStatus, useDebounce
    lib/           api client, formatters, utils
    pages/         Landing, auth, Dashboard, Interviews, Resumes, Progress, Profile, Admin
```

## Security notes

- Secrets live only on the server; keys are never exposed to the client bundle.
- Access tokens are held in memory; refresh tokens are httpOnly, `SameSite`, rotating and hashed at
  rest in MongoDB.
- Helmet, CORS allow-list, request rate limiting, input validation (zod) and centralized error
  handling are enabled by default.
- Production refuses insecure JWT secrets and `AI_DEV_MODE=true`.
