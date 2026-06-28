# DealRoom: Devpost Submission Copy

Paste each section into the corresponding Devpost field.
No dashes are used in any prose below per hackathon submission formatting rules.
No superlatives are used. Statistics cited reflect real platform data from the Aicoo executive summary.

---

## Project Name

DealRoom

---

## Tagline

Every deal has a room. Every room has an agent.

---

## One Sentence Summary

DealRoom gives every stakeholder in a B2B deal their own Aicoo agent identity, routes each deal event to the right person automatically using AI classification, and accumulates full deal context across every touchpoint so nothing is lost and no deal stalls from coordination failure.

---

## The Problem and Who It Affects

Account executives at B2B software companies lose deals because stakeholder coordination is fragmented across Slack, email, and CRM notes with no routing intelligence. A legal question sent into a shared channel goes unanswered because three reps all see it and none of them own it. A new AE inherits a deal and starts from zero because the context lives in someone else's inbox. A buyer's procurement contact sends a question and waits four days for an answer that should have taken four minutes.

Current CRM systems fail because they store static notes that no one reads and have no routing intelligence. Email is unstructured. Slack has no deal context. No existing tool gives the buyer side an interactive agent entry point into the deal.

The root cause is always the same: coordination failure, not product fit failure. DealRoom replaces fragmented, ownerless coordination with structured agent routing. Every question goes to the right person. Every answer accumulates. Every stakeholder is always in context.

Target user: account executives and sales engineers at B2B software companies with deal cycles longer than 30 days and more than three buying stakeholders.

---

## What We Built

DealRoom is a decentralized B2B deal coordination platform. It uses Aicoo to provision a unique agent workspace for every deal stakeholder on both the seller side and the buyer side. When a deal event arrives (a question, a blocker, an objection), a classification layer built on Anthropic Claude reads the message, identifies its category (legal, technical, commercial, relationship, or escalation), and routes it to the correct agent workspace using Aicoo's synchronous RPC or group broadcast capabilities.

The seller's legal contact receives a routed legal question with the full deal context already loaded. They do not need a briefing. They draft a response and approve it. The agent sends it. The answer accumulates into the deal context via Aicoo's agent accumulate endpoint. The AE dashboard reflects the resolution. The deal moves forward.

For buyer contacts who have not yet created an Aicoo workspace, DealRoom generates a sandboxed share link via POST /share/create. The buyer interacts with the sandboxed AE agent through the share link. When they opt into direct coordination, DealRoom provisions their agent workspace and completes the cross-organization network handshake via POST /network/request and POST /network/accept.

---

## How We Used the Aicoo Platform

Every feature in DealRoom depends on an Aicoo API call. Aicoo is not an add-on. It is the product. Without it there is no agent identity, no cross-organization connection, no context memory, and no routing.

**Agent identity provisioning via POST /agent/init.**
Called for every deal stakeholder on both the seller side and the buyer side. Workspace IDs follow the pattern `deal_{dealId}_{role}` to guarantee uniqueness across concurrent deals. The AE, SE, legal contact, buyer champion, buyer legal contact, and buyer procurement contact each receive isolated workspaces.

**Structured context accumulation via POST /agent/accumulate.**
Called immediately after each workspace is initialized with the role persona directive and initial deal context. Called again after each resolved event as a delta update containing the event summary, category, routing target, and resolution status. The AE workspace accumulates every deal event so the pre-call briefing always reflects the full history.

**Public sandboxed share links via POST /share/create.**
Called during buyer onboarding for contacts who do not yet have an Aicoo account. The returned URL is opened in a new browser tab. It is never embedded in an iframe. The buyer interacts with the sandboxed AE agent through the share link until they choose to upgrade to a direct connection.

**Cross-organization agent network connections via POST /network/request and POST /network/accept.**
Called when the buyer champion creates their own workspace and the seller initiates the direct coordination handshake. The returned connectionId is stored in Redis with a 24-hour TTL and retrieved at accept time. After acceptance, direct RPC between seller and buyer agents is active.

**Direct agent RPC routing via the _coo suffix notation.**
Every classified deal event that routes to a specific stakeholder uses the format `deal_{dealId}_{role}_coo` as the `to` field in POST /agent/message. This initiates a synchronous reasoning loop in the target agent and returns a structured response.

**Group broadcast via group:deal_{dealId} for escalation events.**
Events classified as escalation signals (champion departure, competing vendor mention, timeline slip, budget loss) broadcast to the full deal team via the group target. Group broadcasts are asynchronous and do not return a response loop.

**Tool schema verification via GET /tools.**
Called immediately after each workspace is initialized. The result is cached in Redis. The calendar namespace check gates the scheduling UI: `calendar.schedule_meeting` must be present in the live tool list before any booking step is attempted. If it is absent, a setup alert with Aicoo dashboard instructions is surfaced to the AE.

---

## The Key Role Aicoo Plays

Aicoo is the coordination infrastructure that currently does not exist in any CRM, email client, or Slack workspace. It gives DealRoom three capabilities that no other platform provides simultaneously:

Agent identity across organizational boundaries. Both the seller team and the buyer team have live agents that represent them in the deal. Neither side exposes private credentials. Neither side requires the other to use the same software stack.

Context persistence across the deal lifecycle. Every interaction accumulates. A stakeholder who joins a deal midway is immediately briefed from context. No onboarding meeting required.

Secure cross-organization routing. Direct RPC between seller and buyer agents is gated behind an explicit network handshake. The buyer must accept the connection. The buyer agent has read-only access to the seller's shared context. No data crosses organizational boundaries without explicit authorization.

---

## Technical Implementation

**Stack:** Next.js 14 frontend, Node.js with Express backend proxy, Upstash Redis state store, Anthropic Claude for classification and briefing, Aicoo for agent identity and coordination.

**Classification layer:** Incoming deal events are classified by Claude using a five-category system with confidence scoring. Auto-routing fires at confidence 0.80 and above. Human confirmation is required between 0.60 and 0.79. Manual routing is required below 0.60. All low confidence events are logged for prompt improvement.

**Context accumulation:** Initial context is seeded at workspace creation with the role persona directive and deal metadata. Delta accumulation runs after each resolved event. Discovery notes exceeding approximately 8000 characters trigger a summarization pass before the next accumulate call to stay within payload limits.

**Workspace namespacing:** All workspace IDs follow the pattern `deal_{dealId}_{role}`. RPC targets append the `_coo` suffix. Group targets use the `group:deal_{dealId}` format. These helpers live in `src/utils/workspace.ts` and are imported by every route that makes an Aicoo API call.

**Human approval gates:** No agent dispatches an external message, books a calendar slot, or shares a document without explicit human confirmation at every step. The backend enforces this by returning classification results for human review on all sub-0.80 confidence events before any agentMessage call is made.

---

## AI COO Team Collaboration

The team used AI COO throughout the build for task tracking, context sync, and proactive blocker detection.

Before the hackathon, each team member initialized their personal AI COO with their technical background and role assignment. The discover skill confirmed alignment on the product direction and matched team members to technical areas. Network connection requests connected team agents before the build began.

During the build, the todos skill tracked all development tasks with priority assignments. The team lead called POST /agent/accumulate on the shared team workspace at the start of each session with the current project state: completed tasks, active blockers, and the next build target.

The HEARTBEAT.md at the project root ran on a 15-minute interval. It scanned for overdue tasks, failed Aicoo API calls, Redis connectivity issues, and classification errors. When blockers were detected, the heartbeat posted a summary to the team workspace channel and named the specific failing task. When everything was clear, it responded with HEARTBEAT_OK and stayed silent.

---

## Responsible AI Statement

**Risk identified:** The classification layer may route a message to the wrong stakeholder if the event text is ambiguous. For example, a commercial question framed as a technical question might route to the SE instead of the AE, potentially exposing pricing context to the wrong person. An even higher risk scenario is a legal question misrouted to the buyer side agent.

**Mitigation implemented:** All events with confidence below 0.60 are held for manual review on the AE dashboard and are never dispatched automatically. Events between 0.60 and 0.79 confidence surface a confirmation card that the AE must approve or override before the message is sent. Only events at or above 0.80 confidence are auto-routed. Every low confidence event is logged with a `manual_required` flag for post-hackathon prompt improvement review.

**Human control preserved:** Agent personas explicitly prohibit sharing pricing, contract terms, procurement thresholds, or confidential details without prior approval from the human stakeholder they represent. The buyer side agent has no write access to seller context cells. Calendar bookings and external message sends require human confirmation before execution. At every routing step, the final action belongs to a human.

---

## What is Next

Post-hackathon priorities:

A full buyer-side interface where buyer contacts can submit questions and receive responses through their own agent without a seller share link.

Deal inactivity detection via the heartbeat loop: if no deal event accumulates in five business days, the AE agent proactively suggests a check-in action.

Deal retrospective generation: when a deal closes, all accumulated context across every workspace is synthesized into a structured document the AE can reference in future deals with the same account.

Multi-deal discovery on the Aicoo Square network: AEs and buyer contacts find each other through the discover skill before a deal room is even created.

---

## Checklist Before Submission

Problem is understandable in under 10 seconds from the demo opening line: Yes.
Target user is specific: Yes. Account executives at B2B software companies with complex stakeholder deals.
Failure of current solutions is stated explicitly: Yes. CRM, Slack, and email have no routing intelligence.

POST /agent/init called for every deal stakeholder (minimum three in the demo): Yes.
POST /agent/accumulate called with a structured typed payload: Yes.
POST /share/create demonstrated for buyer onboarding: Yes.
POST /network/request and POST /network/accept demonstrated: Yes.
Agent RPC routing with _coo suffix demonstrated with a live classification result: Yes.
GET /tools called and result verified before building the calendar step: Yes.

The magic moment (auto-routing of a legal question) is visible and explainable in 20 seconds: Yes.
A judge can understand the demo without reading the codebase: Yes.

No fabricated statistics in submission copy: Yes.
Tech stack in README matches what was built: Yes.
AI tools used (Anthropic Claude, Aicoo) disclosed by name: Yes.
GitHub repository is public with a working README and setup instructions: Confirm before submitting.
Demo video is 2 to 5 minutes and includes the 90-second core flow: Confirm before submitting.
All five Aicoo coordination checkboxes addressed in the submission: Yes.
No dashes used in submission copy: Yes.
No superlatives used: Yes.

One specific risk named: Yes. Misrouting due to low classification confidence.
One specific mitigation named: Yes. Confidence threshold gating with human review below 0.80.
One decision explicitly left to humans: Yes. All final actions require human approval before execution.
