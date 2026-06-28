import type { ParticipantRole } from '../types/index.js';

// Generates the canonical Aicoo workspace ID for a deal participant.
// Format: deal_{dealId}_{role}
// Example: deal_550e8400e29b_ae
export function workspaceId(dealId: string, role: ParticipantRole): string {
  return `deal_${dealId}_${role}`;
}

// Generates the synchronous RPC target string for direct agent messaging.
// The _coo suffix tells Aicoo to initiate a live reasoning loop and return a response.
// Use this for legal, technical, commercial, and relationship routing.
export function rpcTarget(dealId: string, role: ParticipantRole): string {
  return `deal_${dealId}_${role}_coo`;
}

// Generates the group broadcast target for a deal.
// Used for escalation events that require full team awareness.
// Group broadcast is asynchronous and does not return an agent response.
export function groupTarget(dealId: string): string {
  return `group:deal_${dealId}`;
}

// Returns true if the target string routes to a group rather than a single agent.
// Group targets do not return a synchronous response from agentMessage.
export function isGroupTarget(target: string): boolean {
  return target.startsWith('group:');
}

// Extracts the dealId and role from a workspace ID string.
// Returns null if the format does not match the expected pattern.
export function parseWorkspaceId(
  ws: string
): { dealId: string; role: string } | null {
  const match = ws.match(/^deal_([a-z0-9]+)_([a-z_]+)$/);
  if (!match) return null;
  return { dealId: match[1], role: match[2] };
}
