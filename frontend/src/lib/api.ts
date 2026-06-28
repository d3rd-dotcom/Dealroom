/* ────────────────────────────────────────────────
   DealRoom API Client
   Every function here calls a route that exists in
   backend/src/routes/deals.ts, connections.ts, or events.ts.
   Base URL, port, and mount prefixes are copied from app.ts.
   ──────────────────────────────────────────────── */

import type {
  ApiResponse,
  Deal,
  CreateDealPayload,
  UpdateContextPayload,
  ToolsResponseData,
  InviteBuyerPayload,
  InviteResponseData,
  BuyerInitPayload,
  BuyerInitResponseData,
  ConnectBuyerPayload,
  ConnectResponseData,
  AcceptConnectionPayload,
  AcceptResponseData,
  SubmitEventPayload,
  SubmitEventResponseData,
  ManualRoutePayload,
  ManualRouteResponseData,
  PreCallBrief,
} from './types'

// The backend listens on PORT 3001 by default (see backend/.env.example).
// Set NEXT_PUBLIC_API_BASE_URL in the frontend .env.local to override for deployment.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'

/* ─── Core fetch wrapper ──────────────────────────
   Every backend route returns { success: true, data } or
   { success: false, message }. This wrapper normalizes both
   into a consistent ApiResponse<T> so callers never touch
   raw fetch or JSON parsing. Network failures are caught and
   converted to the same ApiError shape so the UI never has to
   distinguish a thrown error from a server side failure. */

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })

    const body = await res.json()

    // The backend always sets success explicitly. Trust that field over res.ok,
    // since errorHandler.ts and individual routes both set success: false
    // on the same shape regardless of status code.
    if (body.success) {
      return { success: true, data: body.data as T }
    }
    return { success: false, message: body.message ?? 'Request failed.' }
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? `Network error: ${err.message}. Confirm the backend is running on ${API_BASE_URL}.`
          : 'Unknown network error.',
    }
  }
}

/* ─── Deals: backend/src/routes/deals.ts ──────────── */

export const dealsApi = {
  // POST /api/deals
  // Coordination checkbox 1: provisions one agent workspace per seller participant.
  create(payload: CreateDealPayload) {
    return request<Deal>('/api/deals', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // GET /api/deals/:dealId
  get(dealId: string) {
    return request<Deal>(`/api/deals/${dealId}`)
  },

  // POST /api/deals/:dealId/context
  // Coordination checkbox 4: accumulates discovery notes, transcripts, questions, or actions.
  updateContext(dealId: string, payload: UpdateContextPayload) {
    return request<Record<string, unknown>>(`/api/deals/${dealId}/context`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // GET /api/deals/:dealId/tools
  // Always check calendarEnabled here before rendering any scheduling UI.
  // The calendar namespace must be enabled in the Aicoo dashboard first.
  getTools(dealId: string) {
    return request<ToolsResponseData>(`/api/deals/${dealId}/tools`)
  },

  // GET /api/deals/:dealId/briefing/:workspaceId
  // Coordination checkbox 4: context reuse for a pre call briefing.
  getBriefing(dealId: string, workspaceId: string) {
    return request<PreCallBrief>(
      `/api/deals/${dealId}/briefing/${workspaceId}`
    )
  },
}

/* ─── Buyer onboarding and network connections: backend/src/routes/connections.ts ─── */

export const connectionsApi = {
  // POST /api/deals/:dealId/invite
  // Coordination checkbox 1 plus 3: generates the sandboxed share link.
  // CRITICAL: shareUrl must open in a new tab. Never render it in an iframe.
  invite(dealId: string, payload: InviteBuyerPayload) {
    return request<InviteResponseData>(`/api/deals/${dealId}/invite`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // POST /api/deals/:dealId/buyer-init
  // Coordination checkbox 1: the buyer's own agent workspace, premium path above the share link.
  buyerInit(dealId: string, payload: BuyerInitPayload) {
    return request<BuyerInitResponseData>(`/api/deals/${dealId}/buyer-init`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // POST /api/deals/:dealId/connect
  // Coordination checkbox 2: sends the network connection request.
  // Precondition enforced server side: buyer-init must have succeeded first.
  connect(dealId: string, payload: ConnectBuyerPayload) {
    return request<ConnectResponseData>(`/api/deals/${dealId}/connect`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // POST /api/deals/:dealId/accept
  // Coordination checkbox 2: activates direct agent to agent RPC.
  accept(dealId: string, payload: AcceptConnectionPayload) {
    return request<AcceptResponseData>(`/api/deals/${dealId}/accept`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

/* ─── Event classification and routing: backend/src/routes/events.ts ─────── */

export const eventsApi = {
  // POST /api/events
  // Coordination checkbox 3 plus 5: classifies the message and either auto routes
  // (confidence 0.80 or above), or returns a classification for human review.
  submit(payload: SubmitEventPayload) {
    return request<SubmitEventResponseData>('/api/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // POST /api/events/:eventId/route
  // Coordination checkbox 5: human confirmed or manually selected routing target.
  // dealId is required in the body even though eventId is in the path, since the
  // backend looks up the event inside that deal's event log specifically.
  route(eventId: string, payload: ManualRoutePayload) {
    return request<ManualRouteResponseData>(`/api/events/${eventId}/route`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

/* ─── Health check: backend/src/app.ts ────────────── */

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`)
    return res.ok
  } catch {
    return false
  }
}
