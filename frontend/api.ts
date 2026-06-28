import type {
  Deal,
  ContextSummary,
  PreCallBrief,
  CreateDealPayload,
  CreateDealResponse,
  SendEventPayload,
  ClassifyEventResponse,
  InviteBuyerPayload,
  InviteResponse,
  ScheduleMeetingPayload,
  BookingResponse,
  ApiResponse,
  StakeholderRole,
} from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    const json = await res.json()
    if (!res.ok) {
      return { success: false, error: json.message ?? 'Request failed' }
    }
    return { success: true, data: json }
  } catch (err) {
    return { success: false, error: 'Network error. Check that the backend is running.' }
  }
}

/* ─── Deals ───────────────────────────────────── */

export const dealsApi = {
  create: (payload: CreateDealPayload) =>
    request<CreateDealResponse>('/deals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  get: (dealId: string) =>
    request<Deal>(`/deals/${dealId}`),

  getContext: (dealId: string) =>
    request<ContextSummary>(`/deals/${dealId}/context`),

  addContext: (dealId: string, rawText: string) =>
    request<{ updated: boolean }>(`/deals/${dealId}/context`, {
      method: 'POST',
      body: JSON.stringify({ rawText }),
    }),

  getTools: (dealId: string) =>
    request<{ calendarEnabled: boolean; tools: string[] }>(`/deals/${dealId}/tools`),
}

/* ─── Events ──────────────────────────────────── */

export const eventsApi = {
  send: (payload: SendEventPayload) =>
    request<ClassifyEventResponse>('/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  confirmRouting: (eventId: string, routedTo: string) =>
    request<{ routed: boolean }>(`/events/${eventId}/route`, {
      method: 'POST',
      body: JSON.stringify({ routedTo }),
    }),

  list: (dealId: string) =>
    request<{ events: ClassifyEventResponse[] }>(`/events?dealId=${dealId}`),
}

/* ─── Buyer Coordination ──────────────────────── */

export const buyerApi = {
  invite: (payload: InviteBuyerPayload) =>
    request<InviteResponse>(`/deals/${payload.dealId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ name: payload.name, role: payload.role }),
    }),

  connect: (dealId: string, buyerWorkspaceId: string) =>
    request<{ connectionStatus: string }>(`/deals/${dealId}/connect`, {
      method: 'POST',
      body: JSON.stringify({ buyerWorkspaceId }),
    }),

  acceptConnection: (dealId: string, connectionId: string) =>
    request<{ connectionStatus: string }>(`/deals/${dealId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ connectionId }),
    }),
}

/* ─── Briefing and Scheduling ─────────────────── */

export const coordinationApi = {
  getBrief: (dealId: string, participantRole: StakeholderRole) =>
    request<PreCallBrief>(`/deals/${dealId}/brief?role=${participantRole}`),

  scheduleMeeting: (payload: ScheduleMeetingPayload) =>
    request<BookingResponse>(`/deals/${payload.dealId}/schedule`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
