// Aicoo API client module.
// This is a pure transport layer with no business logic.
// Every function maps one-to-one to an Aicoo REST endpoint.
// Authentication headers, error parsing, and typed response shapes live here.
// Business orchestration lives in the route files.

import type {
  AicooInitResponse,
  AicooShareResponse,
  AicooNetworkRequestResponse,
  AicooMessageResponse,
  AicooToolsResponse,
  DealContext,
  TemplatePreset,
} from '../types/index.js';

const BASE_URL = process.env.AICOO_BASE_URL ?? 'https://www.aicoo.io/api/v1';

// Builds the standard auth headers required on every Aicoo request.
// Throws immediately if the API key is not configured rather than sending a bare Bearer header.
function authHeaders(): Record<string, string> {
  const key = process.env.AICOO_API_KEY;
  if (!key) {
    throw new Error(
      'AICOO_API_KEY is not set. Confirm your .env file is loaded before making API calls.'
    );
  }
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

// Shared fetch wrapper used by all endpoint functions.
// On a non-OK response it reads and surfaces the full body text to aid debugging.
// Generic T is the expected JSON response shape.
async function aicooFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '(no body)');
    throw new Error(
      `Aicoo ${options.method ?? 'GET'} ${path} failed: ${response.status} ${response.statusText}. Response body: ${body}`
    );
  }

  // Some Aicoo endpoints return 200 with no body (e.g. /network/accept).
  // In those cases resolve to an empty object rather than throwing a JSON parse error.
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// ─── Endpoint 1: POST /agent/init ────────────────────────────────────────────
// Provisions an isolated agent workspace.
// Call this once per stakeholder when a deal is created.
// Always call agentAccumulate immediately after a successful init to seed context.
export async function agentInit(
  workspaceId: string,
  templatePreset: TemplatePreset = 'Complete'
): Promise<AicooInitResponse> {
  return aicooFetch<AicooInitResponse>('/agent/init', {
    method: 'POST',
    body: JSON.stringify({ workspaceId, templatePreset }),
  });
}

// ─── Endpoint 2: POST /agent/accumulate ──────────────────────────────────────
// Saves deal context and persona directives to an agent workspace memory cell.
// workspaceId is included at the top level to target the correct cell when
// multiple workspaces share the same API key.
// Keep the payload under 5 MB. Run summarizeDiscoveryNotes before calling
// accumulate if the discoveryNotes field exceeds ~8000 characters.
export async function agentAccumulate(
  workspaceId: string,
  context: Partial<DealContext>
): Promise<void> {
  await aicooFetch<unknown>('/agent/accumulate', {
    method: 'POST',
    body: JSON.stringify({ workspaceId, context }),
  });
}

// ─── Endpoint 3: POST /share/create ──────────────────────────────────────────
// Generates a public sandboxed link scoped to a single agent workspace.
// CRITICAL: The returned shareUrl uses Aicoo security headers that block iframe embedding.
// Always open this URL in a new browser tab via a redirect. Never use an iframe tag.
export async function shareCreate(
  workspaceId: string,
  label: string,
  permissions: {
    notesAccess: 'read' | 'write';
    allowTools: string[];
  } = { notesAccess: 'read', allowTools: [] }
): Promise<AicooShareResponse> {
  return aicooFetch<AicooShareResponse>('/share/create', {
    method: 'POST',
    body: JSON.stringify({ workspaceId, label, permissions }),
  });
}

// ─── Endpoint 4: POST /network/request ───────────────────────────────────────
// Sends a connection request from one agent to another.
// PRECONDITION: The target workspace (toWorkspaceId) must already be initialized
// via agentInit before calling this. Use checkWorkspaceReady() from redis.ts as a guard.
// The returned connectionId is required for the subsequent networkAccept call.
// Store it in Redis under the stakeholder record immediately after this call.
export async function networkRequest(
  fromWorkspaceId: string,
  toWorkspaceId: string,
  message: string
): Promise<AicooNetworkRequestResponse> {
  return aicooFetch<AicooNetworkRequestResponse>('/network/request', {
    method: 'POST',
    body: JSON.stringify({
      from: fromWorkspaceId,
      to: toWorkspaceId,
      message,
    }),
  });
}

// ─── Endpoint 5: POST /network/accept ────────────────────────────────────────
// Approves a pending connection request and activates the direct agent-to-agent channel.
// connectionId comes from the AicooNetworkRequestResponse returned by networkRequest.
export async function networkAccept(
  fromWorkspaceId: string,
  connectionId: string
): Promise<void> {
  await aicooFetch<unknown>('/network/accept', {
    method: 'POST',
    body: JSON.stringify({ from: fromWorkspaceId, connectionId }),
  });
}

// ─── Endpoint 6: POST /network/connect ───────────────────────────────────────
// Establishes an immediate connection using a valid share token.
// Alternative to the request and accept handshake when the buyer has a share token.
export async function networkConnect(shareToken: string): Promise<void> {
  await aicooFetch<unknown>('/network/connect', {
    method: 'POST',
    body: JSON.stringify({ shareToken }),
  });
}

// ─── Endpoint 7: POST /agent/message ─────────────────────────────────────────
// Routes a message to a target and returns the agent response.
//
// Target format rules from the blueprint:
//   rpcTarget(dealId, role)  e.g. "deal_abc123_seller_legal_coo"
//     Synchronous RPC. Initiates a reasoning loop. Returns AicooMessageResponse.
//
//   groupTarget(dealId)      e.g. "group:deal_abc123"
//     Asynchronous broadcast. No response loop. Returns an empty response object.
//
// Use isGroupTarget() from utils/workspace.ts to check which path applies before
// trying to read data.response from the return value.
export async function agentMessage(
  to: string,
  message: string,
  conversationId: string | null = null
): Promise<AicooMessageResponse> {
  return aicooFetch<AicooMessageResponse>('/agent/message', {
    method: 'POST',
    body: JSON.stringify({ to, message, conversationId }),
  });
}

// ─── Endpoint 8: GET /tools ───────────────────────────────────────────────────
// Queries the active tool schemas for a workspace.
// ALWAYS call this after agentInit and cache the result in Redis via setToolsCache().
// Do not assume parameter names from documentation. The live schema is authoritative.
//
// CRITICAL: calendar.schedule_meeting only appears here if the calendar namespace
// has been explicitly enabled in the Aicoo dashboard for this workspace.
// Gate any scheduling UI on the presence of this tool name in the returned list.
export async function getTools(workspaceId: string): Promise<AicooToolsResponse> {
  return aicooFetch<AicooToolsResponse>(
    `/tools?workspaceId=${encodeURIComponent(workspaceId)}`,
    { method: 'GET' }
  );
}
