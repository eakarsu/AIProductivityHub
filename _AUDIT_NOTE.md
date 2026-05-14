# Audit Note — AIProductivityHub

Source: `/Users/erolakarsu/projects/_AUDIT/reports/batch_06.md` section #34.

## Original Recommendations

### Gaps — AI Counterparts
- `/goal-progress-predict` (added)
- `/habit-auto-adjust`
- `/focus-boost-recommend`
- `/usage-anomaly-detect` (added)

### Gaps — Non-AI Features
- Calendar integration
- Email/Slack integration
- AI-powered task prioritization
- Team/collaboration features
- Fitness/health integration

### Custom Feature Suggestions
1. Agentic goal orchestration
2. Distraction detector
3. Digital wellbeing coach
4. Weekly autopilot
5. Cross-tool optimization

## Implemented (Mechanical)
- `POST /api/ai/goal-progress-predict` — added in `backend/routes/ai.js`. Pulls user's goals (and optional `goal_id`) plus recent focus sessions; returns completion probability, predicted completion date, blockers, recommended actions per goal. Persists via `persistAIResult` + `logAIUsage`.
- `POST /api/ai/usage-anomaly-detect` — added in `backend/routes/ai.js`. Pulls 30-day `screen_time` data and returns anomalies (spikes/drops/night-creep/new apps) with severity and wellness recommendations.

Both follow existing `callOpenRouter`/`parseAIJson`/`authMiddleware`/`aiRateLimiter` style.

## Backlog (deferred)

### NEEDS-CREDS / NEW-DEPS
- Calendar integration (Google/Outlook OAuth).
- Email/Slack OAuth integrations.
- Health/fitness integration (Apple HealthKit, Google Fit).

### NEEDS-PRODUCT-DECISION
- `/habit-auto-adjust` — needs habit-difficulty schema decision.
- Team/collaboration features (multi-user data model).
- Cross-tool unified workday view (significant UX scope).

### TOO-RISKY
- Real-time distraction detector (continuous client-side monitoring).
- Agentic weekly autopilot (background job framework).

## Apply pass 3 (frontend)

- **Stack:** Express + React (CRA) under `frontend/`.
- **Action:** LEFT-AS-IS (FE already wired).
- **Verification:** `frontend/src/App.js` registers a route for every `backend/routes/ai.js` endpoint. Pages: `Dashboard` (dashboard-insights), `CrossInsights`, `WeeklyDigest`, `FocusTimer` (focus-analysis), `GoalProgressPredict`, `UsageAnomalyDetect`, plus `query`/`history` consumed via existing helpers. JWT bearer comes from `frontend/src/services/api.js` which reads `localStorage.getItem('token')`.
- **Files modified:** none.

## Apply pass 4 (mechanical backlog)

- **Action:** IMPLEMENTED (1 feature).
- **Features added:**
  1. `POST /api/ai/focus-boost-recommend` — added in `backend/routes/ai.js`. Pulls user's last 10 focus sessions and 7-day screen-time data; returns 3 immediate interventions, recommended session length, distraction apps to silence, and an energy strategy. Uses existing `callOpenRouter` + `parseAIJson` + `aiRateLimiter` + `authMiddleware`; persists via `persistAIResult` + `logAIUsage`. Short-circuits with HTTP 503 when `OPENROUTER_API_KEY` is missing.
  - Frontend page: `frontend/src/pages/FocusBoostRecommend.js` with form (current task, energy 1-10, time-of-day) + JWT bearer; route registered in `frontend/src/App.js`; sidebar entry added in `frontend/src/components/Sidebar.js` (AI Tools section).
- **Backlog deferred:**
  - `/habit-auto-adjust` — NEEDS-PRODUCT-DECISION (habit-difficulty schema decision unresolved).
  - Calendar / Email / Slack / health-fitness OAuth integrations — NEEDS-CREDS.
  - Team / collaboration features — NEEDS-PRODUCT-DECISION (multi-user data model).
  - Real-time distraction detector + agentic weekly autopilot — TOO-RISKY (continuous client-side monitoring / background-job framework).
- **Smoke test:** PASS — registered fresh user, called endpoint with bearer JWT, received structured 200 response (boosts, recommended session length, distractions, energy strategy, summary). Server cleaned up after.
- **Files modified:** `backend/routes/ai.js`, `frontend/src/App.js`, `frontend/src/components/Sidebar.js`, plus new `frontend/src/pages/FocusBoostRecommend.js`.
