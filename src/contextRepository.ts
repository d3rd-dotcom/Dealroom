import { redis } from './client.js';
import type { DealContext } from '../types/index.js';

// Architectural note, not in the original Batch 2 description. The seven
// Aicoo endpoints in blueprint Section 7 include agent/accumulate to write
// context but no corresponding read endpoint. Feature 5 (pre call briefing)
// explicitly allows reading "from Aicoo (or from the Redis cached version if
// a cache layer is implemented)", which only makes sense if this backend
// keeps its own mirror of what it last accumulated. This repository is that
// mirror. Every call to agentAccumulate in the route layer should be paired
// with a call here in the same request, so the two never drift far apart.
function contextKey(workspaceId: string): string {
  return `context:${workspaceId}`;
}

export async function getContext(workspaceId: string): Promise<DealContext | null> {
  const context = await redis.get<DealContext>(contextKey(workspaceId));
  return context ?? null;
}

export async function saveContext(workspaceId: string, context: DealContext): Promise<void> {
  await redis.set(contextKey(workspaceId), context);
}

// Merges a partial delta into the cached context. Array fields (openQuestions,
// resolvedQuestions, dealEvents) are appended, matching the delta accumulation
// pattern described for /agent/accumulate in blueprint Section 7 Endpoint 2.
// Scalar fields (discoveryNotes, stage, nextActions) are replaced if present
// in the delta, since those are sent as full replacements, not appends, in
// the blueprint's own example payloads.
export async function mergeContext(
  workspaceId: string,
  delta: Partial<DealContext>
): Promise<DealContext> {
  const existing = await getContext(workspaceId);

  const base: DealContext = existing ?? {
    dealId: delta.dealId ?? '',
    role: delta.role ?? 'ae',
    participantName: delta.participantName ?? '',
    dealName: delta.dealName ?? '',
    prospectCompany: delta.prospectCompany ?? '',
    stage: delta.stage ?? 'Discovery',
    discoveryNotes: '',
    openQuestions: [],
    resolvedQuestions: [],
    dealEvents: [],
    nextActions: [],
    systemDirectives: delta.systemDirectives ?? '',
  };

  const merged: DealContext = {
    ...base,
    ...delta,
    openQuestions: delta.openQuestions
      ? [...base.openQuestions, ...delta.openQuestions]
      : base.openQuestions,
    resolvedQuestions: delta.resolvedQuestions
      ? [...base.resolvedQuestions, ...delta.resolvedQuestions]
      : base.resolvedQuestions,
    dealEvents: delta.dealEvents ? [...base.dealEvents, ...delta.dealEvents] : base.dealEvents,
    nextActions: delta.nextActions ?? base.nextActions,
    discoveryNotes: delta.discoveryNotes ?? base.discoveryNotes,
  };

  await saveContext(workspaceId, merged);
  return merged;
}
