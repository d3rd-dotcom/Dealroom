# DealRoom

**Every deal has a room. Every room has an agent.**

DealRoom gives every stakeholder in a B2B deal their own Aicoo agent identity, routes each deal event to the right person automatically using AI classification, and accumulates full deal context across every touchpoint so nothing is lost and no deal stalls from coordination failure.

Built for the Aicoo Hackathon 2026. Powered by the Aicoo platform and Anthropic Claude.

---

## The Problem

Account executives at B2B software companies lose deals because stakeholder coordination is fragmented across Slack, email, and CRM notes with no routing intelligence. A legal question sent to the wrong person sits unanswered for 48 hours. A new AE inherits a deal and starts from zero. Buyer contacts have no structured channel with the seller team. The root cause is coordination failure, not product fit failure.

---

## How DealRoom Works

A seller creates a deal room. Every participant on both the seller side and the buyer side receives their own Aicoo agent workspace. When the buyer champion sends a message, the classification layer identifies it as a legal, technical, commercial, relationship, or escalation event and routes it directly to the correct agent. The legal contact sees the routed question with full deal context already loaded. They respond. The answer accumulates into the deal context. The AE dashboard reflects the resolution. The deal moves forward.

No question sits in a shared Slack channel without an owner. No context is lost when a new stakeholder joins. No meeting starts from zero.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 with React Server Components, Tailwind CSS |
| Backend | Node.js 22 with Express 4, TypeScript |
| State store | Upstash Redis (serverless, low latency) |
| Agent platform | Aicoo (api.aicoo.io/api/v1) |
| AI classification | Anthropic Claude (claude-sonnet-4-6) |
| Frontend hosting | Vercel |
| Backend hosting | Render or Railway |

---

## Prerequisites

Node.js 18 or higher is required for native fetch support and ESNext module resolution.

You need active accounts and API keys for three services before running the project:
Aicoo platform account with a valid AICOO_API_KEY.
Upstash Redis database with REST URL and token.
Anthropic API account with a valid ANTHROPIC_API_KEY.

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-team/dealroom.git
cd dealroom
```

### 2. Configure the backend environment

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in all six values:

```
AICOO_API_KEY=your_aicoo_api_key_here
AICOO_BASE_URL=https://www.aicoo.io/api/v1
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Install backend dependencies and start the server

```bash
npm install
npm run dev
```

The backend starts on `http://localhost:3001`. Confirm the health check returns OK:

```bash
curl http://localhost:3001/health
```

Expected response: `{"status":"ok","timestamp":"..."}`

### 4. Verify Aicoo API connectivity

Before building the frontend, confirm your API key works against the live Aicoo platform:

```bash
curl -X POST https://www.aicoo.io/api/v1/agent/init \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"test_verify_001","templatePreset":"Standard"}'
```

A 200 response confirms the key is valid. If you see a 401, re-check the key value in .env.

### 5. Configure the frontend environment

Open a new terminal:

```bash
cd frontend
```

Create a `.env.local` file:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 6. Install frontend dependencies and start the dev server

```bash
npm install
npm run dev
```

The frontend starts on `http://localhost:3000`.

---

## Environment Variables Reference

### Backend (.env)

| Variable | Required | Description |
|---|---|---|
| AICOO_API_KEY | Yes | Aicoo platform API key. Found in the Aicoo dashboard under API settings. |
| AICOO_BASE_URL | Yes | Aicoo REST base URL. Use `https://www.aicoo.io/api/v1` for production. |
| UPSTASH_REDIS_REST_URL | Yes | Upstash Redis REST endpoint. Found in the Upstash console under your database. |
| UPSTASH_REDIS_REST_TOKEN | Yes | Upstash Redis REST token. Found alongside the REST URL in the Upstash console. |
| ANTHROPIC_API_KEY | Yes | Anthropic API key for Claude classification and briefing generation. |
| PORT | No | Backend server port. Defaults to 3001. |
| NODE_ENV | No | Runtime environment. Use `development` locally, `production` on Railway or Render. |
| FRONTEND_URL | No | Allowed CORS origin. Defaults to `http://localhost:3000`. Set to your Vercel URL in production. |

### Frontend (.env.local)

| Variable | Required | Description |
|---|---|---|
| NEXT_PUBLIC_API_URL | Yes | Backend base URL. Use `http://localhost:3001` locally. Set to your Railway or Render URL in production. |

---

## API Endpoint Reference

All endpoints are prefixed with the backend base URL (default: `http://localhost:3001`).

### Deal Lifecycle

| Method | Path | Description |
|---|---|---|
| POST | /api/deals | Create a deal. Provisions agent workspaces for all seller participants and queries the tools list. |
| GET | /api/deals/:dealId | Returns the full deal registry including stakeholder status cards. |
| POST | /api/deals/:dealId/context | Accumulates raw input (discovery notes, call transcript, question, or next action) into an agent workspace. |
| GET | /api/deals/:dealId/tools | Returns the cached tools list and the calendar availability flag. |
| GET | /api/deals/:dealId/briefing/:workspaceId | Generates a structured pre-call briefing for the specified participant. |

### Buyer Coordination

| Method | Path | Description |
|---|---|---|
| POST | /api/deals/:dealId/invite | Generates a sandboxed share link for a buyer contact. Returns a redirect URL. Never embed in an iframe. |
| POST | /api/deals/:dealId/buyer-init | Provisions a buyer agent workspace after the buyer opts in to direct coordination. |
| POST | /api/deals/:dealId/connect | Sends a network connection request from the seller AE agent to the buyer agent. |
| POST | /api/deals/:dealId/accept | Accepts a pending connection request, activating direct agent to agent communication. |

### Event Routing

| Method | Path | Description |
|---|---|---|
| POST | /api/events | Classifies an incoming deal event and routes it based on confidence threshold. |
| POST | /api/events/:eventId/route | Human confirmed routing: dispatches a classified event to a manually selected target. |

---

## Project Structure

```
dealroom/
├── HEARTBEAT.md              AI COO monitoring checklist
├── SUBMISSION.md             Devpost submission copy
├── README.md                 This file
├── backend/
│   ├── .env.example          Environment variable template
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── app.ts            Express server entry point with env validation
│       ├── types/
│       │   └── index.ts      All shared TypeScript type definitions
│       ├── utils/
│       │   └── workspace.ts  Workspace ID, RPC target, and group target helpers
│       ├── middleware/
│       │   └── errorHandler.ts   Global error handler
│       ├── lib/
│       │   ├── aicoo.ts      Aicoo API client wrapper (all 7 endpoints)
│       │   ├── redis.ts      Upstash Redis data access layer
│       │   ├── classifier.ts Classification, routing, briefing, and summarization
│       │   └── personas.ts   Agent persona directive generator for all six roles
│       └── routes/
│           ├── deals.ts      Deal lifecycle routes
│           ├── connections.ts    Buyer onboarding and network connection routes
│           └── events.ts     Event classification and routing routes
└── frontend/
    ├── .env.local            Frontend environment variables (not committed)
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.js
    └── app/
        ├── globals.css
        ├── layout.tsx
        └── ...               Frontend pages and components (Batches 7 to 10)
```

---

## Aicoo Coordination Checkboxes

The five coordination criteria DealRoom addresses:

**Checkbox 1: User identity and agent entry point.**
Every deal participant on both the seller side and the buyer side is provisioned a unique agent workspace via POST /agent/init with the namespace `deal_{dealId}_{role}`. Demonstrated the moment the AE creates a deal and the status card grid shows each workspace as green or red.

**Checkbox 2: Agent to agent connection and communication.**
The seller AE agent sends a formal network connection request to the buyer champion agent via POST /network/request. The buyer accepts via POST /network/accept. Demonstrated when the buyer invitation card transitions from "Share link only" to "Connected."

**Checkbox 3: Request routing to the right person or team.**
Incoming deal events are classified by Claude with a category and confidence score. Legal events route to seller_legal_coo. Technical events route to se_coo. Escalation events broadcast to group:deal_{id}. Demonstrated when the buyer's DPA question routes directly to the legal contact without AE intervention.

**Checkbox 4: Context saving and reuse across workflows.**
Initial context is seeded via POST /agent/accumulate at workspace creation. Resolved events accumulate as deltas after each routing step. The pre-call briefing draws on the accumulated event history. Demonstrated when a new stakeholder joins a deal and their agent is fully briefed from context.

**Checkbox 5: Human and agent collaboration to move work forward.**
Agents with confidence below 0.80 never dispatch autonomously. Medium confidence events surface a confirmation card. Low confidence events require full manual routing. Final actions such as calendar booking and external messaging always require human approval. Demonstrated at every routing step in the event feed.

---

## Known Platform Constraints

**Share links cannot be embedded in iframes.**
The shareUrl returned by /share/create uses Aicoo security headers that block iframe rendering. The buyer invitation UI must use a redirect button or a copyable link. An iframe tag will produce a blank panel with no error message.

**Calendar namespace must be enabled before tools query.**
The tool `calendar.schedule_meeting` only appears in the GET /tools response if the calendar namespace has been explicitly enabled in the Aicoo dashboard before the workspace was initialized. The scheduling UI is gated on `calendarEnabled: true` from GET /api/deals/:dealId/tools. If the flag is false, a setup alert with dashboard instructions is shown instead.

**Network connection requires buyer workspace initialization first.**
POST /api/deals/:dealId/connect guards against sending a network request to an uninitialized workspace using `checkWorkspaceReady()`. The buyer must call POST /api/deals/:dealId/buyer-init and return `initStatus: success` before the connect route will proceed.

**Token depletion in long context runs.**
If discovery notes accumulate beyond approximately 8000 characters, the `summarizeDiscoveryNotes` function in classifier.ts compresses them before the next accumulate call. Monitor context size in production deployments with many deal events.

---

## AI COO Team Collaboration

The team used AI COO throughout the build for task tracking, context sync, and proactive blocker detection.

Before the hackathon, each team member initialized their personal AI COO with their technical background and role. The discover skill was used to confirm alignment on the product direction. Network connection requests were sent between team agents to confirm the roster before the event.

During the build, the todos skill tracked all development tasks with priority assignments. At the start of each work session, the team lead called POST /agent/accumulate on the shared team workspace with the current project state: completed tasks, active blockers, and the next build target. The HEARTBEAT.md at the project root ran on a 15-minute interval to monitor for overdue tasks, failed API calls, and Redis connectivity issues.

---

## Responsible AI

**Risk:** The classification layer may route a message to the wrong stakeholder if the event text is ambiguous, potentially exposing commercial terms to the buyer side or routing an internal concern externally.

**Mitigation:** All events with confidence below 0.60 are held for manual review on the AE dashboard. Events with confidence between 0.60 and 0.79 require AE confirmation before dispatch. Only events with confidence at or above 0.80 are dispatched automatically. All low confidence events are logged for prompt improvement review.

**Human control:** Agents never execute a calendar booking, send an external message, or share a document without explicit human confirmation at every step. Agent personas explicitly prohibit sharing pricing, contract terms, or confidential details without prior approval from the human stakeholder they represent. The buyer side agent has no write access to seller context cells.

---

## Demo Video

[Insert Loom or YouTube link here after recording]

The core demo flow runs in under 90 seconds:
1. AE creates a deal room. Three seller agent workspaces provision in real time.
2. Buyer champion receives a share link and opens it in a new tab.
3. Buyer sends a DPA question. The classification card shows 92% confidence, category: legal.
4. The question routes automatically to the legal contact agent. Not the AE.
5. The legal contact sees the question with full deal context already loaded.
6. Legal contact approves a response. The agent sends it. The deal event accumulates.
7. AE dashboard shows the legal event resolved. Calendar booking initiated.

---

## Deployment

### Backend on Railway

Connect the `/backend` directory as the root. Set all environment variables from the .env reference table above. Railway detects the `npm run dev` script. Change to `npm run build && npm start` for production.

### Frontend on Vercel

Connect the `/frontend` directory as the root. Set `NEXT_PUBLIC_API_URL` to your Railway backend URL. Vercel detects Next.js automatically. No additional configuration is required.
