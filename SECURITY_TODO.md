# Security Hardening TODO

This document lists all recommended security fixes and hardening steps to schedule and implement. Prioritize top to bottom.

## Critical (Blocker before public demo)

- Mux webhooks: Implement real signature verification
  - Verify `mux-signature` using Mux HMAC with `MUX_WEBHOOK_SECRET`
  - Reject requests with invalid/missing signatures (401)
  - Avoid logging raw payloads; redact IDs when possible

- Mux playback: Switch to signed playback
  - Use `playback_policy: ['signed']` for assets
  - Generate short‑lived signed playback tokens server-side
  - Remove public playback IDs from client if not strictly required

- Mux direct upload CORS
  - Replace `cors_origin: '*'` with explicit allowed origin(s)
  - Consider environment-based allowlist for dev/prod

- Admin bootstrap endpoint
  - Remove or disable `POST /api/admin/init` in production
  - If kept for setup, protect with: one-time install token (env), IP allowlist, strong env-only credentials (no defaults)

- UploadThing authentication
  - Require authenticated session in router middleware
  - Pass `userId` in metadata; reject anonymous uploads
  - Enforce file type/size on server and log MIME sniff results

- Rate limiting (public endpoints)
  - Add robust rate limits (e.g., Upstash) for:
    - `/api/signup-request` (POST)
    - `/api/documents/proxy` (GET)
    - `/api/verification/*` (GET/POST)
    - `/api/auth/*` (login)
    - UploadThing endpoints
    - Mux webhook (basic burst controls)

- AI HTML output safety (PDF report)
  - Sanitize returned HTML (e.g., DOMPurify server-side) before sending to client
  - Apply restrictive CSP on print/download view (no inline scripts)
  - Avoid logging generated HTML in production

## High Priority

- Standardize session validation
  - Use `getServerSession(authOptions)` consistently across all API routes
  - Add centralized helper for admin-role enforcement

- Security headers
  - Define global headers (Next `headers()` or Vercel config):
    - Content-Security-Policy (start as Report-Only)
    - Strict-Transport-Security: `max-age=31536000; includeSubDomains; preload`
    - X-Frame-Options: `DENY`
    - X-Content-Type-Options: `nosniff`
    - Referrer-Policy: `no-referrer`
    - Permissions-Policy: least-privilege (camera, microphone, geolocation, etc.)

- Document proxy tightening
  - Keep UploadThing domain allowlist
  - Require auth for proxy if feasible, or tokenized access
  - Remove `Access-Control-Allow-Origin: '*'` (use precise origins)
  - Add small response caching (e.g., `Cache-Control: private, max-age=60`)

- Logging hygiene
  - Replace `console.log` with structured logger and levels
  - Redact PII (emails, names, tokens, signatures) from logs
  - Disable verbose logs in production

## Medium Priority

- OpenAI API correctness and limits
  - Replace unsupported `gpt-5-mini` with supported models (e.g., `gpt-4o`)
  - Replace `max_completion_tokens` with `max_tokens`
  - Validate input size; batch images if needed and handle timeouts

- Mux env validation
  - Avoid throwing at module import time if envs missing; defer checks to usage points

- Input validation
  - Add `zod` schemas for all request bodies and query params
  - Centralize error responses and validation failures

- DB indexes and integrity
  - Add indexes for `verificationToken`, `video.chapterId`, progress collections
  - Ensure unique constraints where applicable

## Low Priority / Nice-to-Have

- Observability & tracing
  - Add request metrics and error rates (Vercel Analytics/OTel)
  - Track upload/processing durations and failure causes

- Robots / sitemap
  - Ensure non-public routes aren’t inadvertently indexed

## Deployment Checklist

- Ensure all required environment variables are set (no dev defaults)
- Rotate any previously exposed/public credentials
- Enable HTTPS only; redirect HTTP → HTTPS
- Verify rate-limits and CSP in production
- Conduct manual pen-test on public endpoints (auth flows, uploads, webhook)