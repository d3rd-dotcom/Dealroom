// Classification and intelligence layer.
// All Anthropic API calls live here. No Aicoo calls. No Redis calls.
// This module is imported by both deals.ts (briefing, summarization)
// and events.ts (classification, routing decision, routing target).

import Anthropic from 'anthropic';
import type {
  EventCategory,
  ClassificationResult,
  RoutingDecision,
  DealContext,
  PreCallBrief,
  ParticipantRole,
} from '../types/index.js';
import { rpcTarget, groupTarget } from '../utils/workspace.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Discovery notes exceeding this character count trigger a summarization pass
// before the next agentAccumulate call. Approximately 2000 tokens at 4 chars per token.
const DISCOVERY_MAX_CHARS = 8000;

// Valid category values for post-classification validation.
const VALID_CATEGORIES: EventCategory[] = [
  'legal',
  'technical',
  'commercial',
  'relationship',
  'escalation',
];

// ─── Classification System Prompt (blueprint Section 8) ──────────────────────

const CLASSIFICATION_SYSTEM_PROMPT = `You are a deal event classifier for a B2B sales coordination system called DealRoom.
Given a message from a deal participant, classify it into exactly one of the following categories and return a JSON object with no preamble, no explanation, and no markdown formatting.

Categories and definitions:
legal: questions or requests involving contracts, agreements, compliance, data privacy, legal review, or signature authority
technical: questions or requests involving product capabilities, integrations, security audits, technical specifications, or architecture
commercial: questions or requests involving pricing, discounts, payment terms, procurement, or contract value
relationship: questions involving stakeholder introductions, deal status check-ins, or progression without a specific domain
escalation: signals of deal risk such as champion departure, mention of a competing vendor, timeline slip, or loss of budget authority

Return format (valid JSON only, no other text):
{
  "category": "legal" | "technical" | "commercial" | "relationship" | "escalation",
  "confidence": number between 0.0 and 1.0,
  "summary": "one sentence summary of the event in plain language",
  "suggestedAction": "one sentence describing what the receiving agent should do"
}

If the message is ambiguous and could belong to more than one category, choose the category that carries the highest risk if misrouted. A legal question misrouted to the AE is higher risk than a relationship message misrouted to the SE.`;

// ─── Event Classification ─────────────────────────────────────────────────────

// Classifies an incoming deal event message into one of five categories.
// Uses the exact classification prompt from blueprint Section 8.
// Validates that category and confidence are within expected bounds before returning.
export async function classifyEvent(
  message: string,
  context: {
    dealName: string;
    stage: string;
    senderRole: ParticipantRole;
    senderName: string;
  }
): Promise<ClassificationResult> {
  const userPrompt = `Deal context:
Deal name: ${context.dealName}
Stage: ${context.stage}
Sender role: ${context.senderRole}
Sender name: ${context.senderName}

Message:
${message}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: CLASSIFICATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const rawText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  // Strip any accidental markdown fences the model may add.
  const cleaned = rawText.replace(/```(?:json)?|```/g, '').trim();

  let parsed: ClassificationResult;
  try {
    parsed = JSON.parse(cleaned) as ClassificationResult;
  } catch {
    throw new Error(
      `Classifier returned invalid JSON. Raw output: ${rawText.slice(0, 200)}`
    );
  }

  if (!VALID_CATEGORIES.includes(parsed.category)) {
    throw new Error(
      `Classifier returned unknown category: ${parsed.category}`
    );
  }

  if (
    typeof parsed.confidence !== 'number' ||
    parsed.confidence < 0 ||
    parsed.confidence > 1
  ) {
    throw new Error(
      `Classifier returned invalid confidence value: ${parsed.confidence}`
    );
  }

  return parsed;
}

// ─── Routing Decision ─────────────────────────────────────────────────────────

// Applies the confidence threshold logic from blueprint Section 8.
// >= 0.80 → auto_routed   (no human review required)
// >= 0.60 → human_confirmed (AE confirms or overrides before message is sent)
// < 0.60  → manual_required (AE selects the target manually from the dashboard)
export function getRoutingDecision(confidence: number): RoutingDecision {
  if (confidence >= 0.8) return 'auto_routed';
  if (confidence >= 0.6) return 'human_confirmed';
  return 'manual_required';
}

// Maps an event category to the correct Aicoo message target string.
// Legal, technical, commercial, and relationship events use direct synchronous RPC.
// Escalation events use group broadcast for full team visibility.
export function getRoutingTarget(
  category: EventCategory,
  dealId: string
): string {
  switch (category) {
    case 'legal':
      return rpcTarget(dealId, 'seller_legal');
    case 'technical':
      return rpcTarget(dealId, 'se');
    case 'commercial':
      return rpcTarget(dealId, 'ae');
    case 'relationship':
      return rpcTarget(dealId, 'ae');
    case 'escalation':
      return groupTarget(dealId);
    default:
      return rpcTarget(dealId, 'ae');
  }
}

// ─── Pre-Call Briefing Generator ─────────────────────────────────────────────

// Generates a structured pre-call briefing for a deal participant.
// Uses the briefing prompt from blueprint Section 8.
// Returns typed PreCallBrief. The frontend renders this as a structured card.
export async function generatePreCallBrief(
  context: Partial<DealContext>,
  participantName: string,
  role: ParticipantRole
): Promise<PreCallBrief> {
  const systemPrompt = `You are a deal briefing assistant for a B2B sales coordination tool.
Based on the accumulated deal context provided, generate a structured pre-call briefing.
Return a JSON object with no preamble and no markdown formatting.

Return format:
{
  "dealStatus": "one sentence current status",
  "openQuestions": ["list of unresolved questions from the context"],
  "lastThreeEvents": ["brief summaries of the last three deal events"],
  "suggestedTalkingPoints": ["three talking points for the upcoming call"],
  "riskFlags": ["any signals of deal risk visible in the context"]
}`;

  const userPrompt = `Generate a pre-call briefing for ${participantName} in their role as ${role} on the ${context.dealName ?? 'this deal'} deal with ${context.prospectCompany ?? 'the prospect'}.

Deal context:
${JSON.stringify(context, null, 2)}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const rawText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  const cleaned = rawText.replace(/```(?:json)?|```/g, '').trim();

  try {
    return JSON.parse(cleaned) as PreCallBrief;
  } catch {
    throw new Error(
      `Briefing generator returned invalid JSON. Raw output: ${rawText.slice(0, 200)}`
    );
  }
}

// ─── Discovery Notes Summarizer ───────────────────────────────────────────────

// Returns the input unchanged if it is within the safe size threshold.
// If the notes exceed DISCOVERY_MAX_CHARS, compresses them to a concise paragraph
// that preserves all key signals: stakeholder names, objections, questions, and timeline.
// Call this before agentAccumulate when updating discoveryNotes.
export async function summarizeDiscoveryNotes(notes: string): Promise<string> {
  if (notes.length <= DISCOVERY_MAX_CHARS) return notes;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: `You are a deal context compressor. Summarize the following discovery notes into a concise paragraph of under 400 words.
Preserve all key facts: stakeholder names, objections raised, open questions, and any timeline signals.
Return only the summary with no preamble or commentary.`,
    messages: [{ role: 'user', content: notes }],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

// ─── Transcript Signal Extractor ──────────────────────────────────────────────

// Extracts structured signals from a raw call transcript.
// Used by the POST /api/deals/:dealId/context route when inputType is call_transcript.
// Returns typed arrays that map cleanly to the DealContext schema.
export async function extractTranscriptSignals(transcript: string): Promise<{
  keyObjections: string[];
  openQuestions: string[];
  stakeholdersMentioned: string[];
  timelineMentions: string[];
  nextActions: string[];
  discoveryNotesSummary: string;
}> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: `You are a sales call transcript analyzer for a B2B deal room.
Extract key signals from the transcript and return a JSON object with no preamble and no markdown.

Format:
{
  "keyObjections": ["string"],
  "openQuestions": ["string"],
  "stakeholdersMentioned": ["string"],
  "timelineMentions": ["string"],
  "nextActions": ["string"],
  "discoveryNotesSummary": "a 2-3 sentence summary of the most important things discussed"
}`,
    messages: [{ role: 'user', content: transcript }],
  });

  const rawText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  const cleaned = rawText.replace(/```(?:json)?|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Transcript extractor returned invalid JSON. Raw output: ${rawText.slice(0, 200)}`
    );
  }
}
