# Personalized MPU Quiz System — Design and Implementation Plan

Goal: Create an adaptive, exam-like practice environment tailored to each user’s situation using insights extracted from their documents (via the Document Processor + LLM). The system improves preparedness for the MPU interview by targeting knowledge gaps and reflective competencies.

## High-Level Overview

- Input: Normalized “User Case Profile” from extracted document facts (incident type, dates, substance context, behavior change, therapy steps, previous offenses, etc.).
- Engine: Server-side LLM orchestration generates question blueprints and items in German with rubrics and rationales.
- Delivery: 10–15 question sessions mixing MCQs, short answers, and scenario-based prompts; instant feedback and rationales.
- Adaptation: Performance-driven selection that emphasizes weak areas and scales difficulty.

## Phase Plan

### Phase 1: Foundational (MVP)
- Normalize and persist “User Case Profile” after document processing.
- Define question taxonomy: categories (legal/knowledge, insight/behavior, consistency checks, planning/relapse prevention).
- LLM blueprint generation API route: create 10–15 questions with answers/keys/rationales.
- Session execution (single session): present questions, capture answers, auto-score MCQs, rubric-based scoring for free-text via LLM.
- Persistence: store question bank and results; compute simple competency scores.

### Phase 2: Adaptive & Guidance
- Adaptive selection: choose next session items based on historical weak areas + unattempted coverage.
- Guidance: after each session, show “what to study” with links to modules/videos.
- Scheduling: lightweight spaced practice suggestions (e.g., “Next session recommended in 2 days”).

### Phase 3: Rich Scenarios & Coaching
- Deeper scenario prompts (MPU interview simulation snippets) with model answer exemplars.
- Reflection capture and coaching tips (LLM feedback) with safety/bias controls.
- Admin analytics: cohort performance and common gaps.

## Data Model (Mongo/Mongoose)

- `UserCaseProfile` (by userId)
  - `sourceHash`: hash of `documentProcessing.extractedData` to invalidate profile when docs change
  - `facts`: normalized JSON (incident, timeline, declared abstinence, therapy, triggers, etc.)
  - `riskFlags`: array (e.g., alcohol binge, cannabis frequency)

- `QuizBlueprint`
  - `userId`, `generatedAt`, `sourceHash`
  - `categories`: coverage targets and counts
  - `llmMeta`: model and prompt IDs

- `QuizQuestion`
  - `userId`, `blueprintId`, `type` ('mcq'|'short'|'scenario')
  - `prompt`, `choices?`, `correct`, `rationales`, `rubric?`, `difficulty` (1–3), `category`

- `QuizSession`
  - `userId`, `startedAt`, `finishedAt`, `questionIds`, `score`, `durationSeconds`
  - `competencyScores`: per-category rollups

- `QuizResult`
  - `sessionId`, `questionId`, `submitted`, `isCorrect?`, `score`, `timeSpentSec`, `feedback?`

## API Surface

- `POST /api/quiz/profile/sync` — normalize and persist `UserCaseProfile` from `User.documentProcessing`.
- `POST /api/quiz/blueprint` — generate or refresh a blueprint for the current `sourceHash`.
- `GET  /api/quiz/questions?blueprintId=...` — fetch question set for a session.
- `POST /api/quiz/session/start` — create session with selected question IDs.
- `POST /api/quiz/session/answer` — submit answer incrementally; auto-score MCQ server-side, LLM-eval short answers.
- `POST /api/quiz/session/finish` — finalize, compute scores and recommendations.

Notes:
- All LLM calls server-side; cache outputs with TTL to control cost.
- Apply rate limits per user.

## LLM Orchestration

- Prompts: Use system messages to constrain outputs (German, empathetic tone, no legal advice; strictly educational). Provide `facts` and ask for a balanced set of questions (with difficulty levels and categories), including:
  - MCQ (4 options, 1 correct, 3 plausible distractors with rationales)
  - Short answers (expected key points + concise rubric)
  - Scenario responses (model answer outline + rubric)
- Output schema: Strict JSON with validated types; reject and retry if schema invalid.
- Safety: Strip PII from `facts`; map names to placeholders; keep evaluative language neutral.

## UI/UX

- Entry points:
  - Dashboard widget: “Start your practice session (approx. 20 min)”
  - Learn page: “Practice for this module” shortcuts.
- Quiz player:
  - Progress bar, timer (optional), question index
  - MCQ: select => immediate correct/incorrect + rationale
  - Short answer: submit => brief rubric-based feedback
  - Scenario: submit => coach-style feedback; allow retry
  - End screen: summary, competency chart, next recommended materials and session

## Adaptation Logic (Phase 2)

- Mastery per category = weighted recent correctness (decay older sessions)
- Selection algorithm:
  1) Ensure minimum coverage per category
  2) Fill remainder with low-mastery items and unseen items
  3) Adjust difficulty based on streaks

## Security & Privacy

- Use only de-identified summaries in prompts; never send raw documents
- Store minimal PII; encrypt sensitive fields if any
- Server-only LLM calls; add audit logs for prompt/response (redacted)

## Testing & QA

- Unit tests for normalization and schema validation of LLM outputs
- Snapshot tests for prompt builder
- Seed demo blueprint for local testing without LLM

## Rollout Plan

- Feature flag per user or admin-only to pilot
- Start with fixed-size sessions; collect feedback
- Iterate question quality prompts and analytics

## Acceptance Criteria (Phase 1)

- Can generate a question set (>=10) per user from current `documentProcessing` data
- Can run one session, score MCQ, and record results
- Presents rationales and session summary; persists results
- Admin can view (basic) per-user quiz history

