/* ────────────────────────────────────────────────
   DealRoom TypeScript Types
   Mirrors backend/src/types/index.ts exactly.
   Field names and response shapes are copied from the real
   Express routes, not assumed from the blueprint document.
   ──────────────────────────────────────────────── */

export type DealStage =
  | 'Discovery'
  | 'Technical Evaluation'
  | 'Legal Review'
  | 'Commercial'
  | 'Closed Won'
  | 'Closed Lost'

export type StakeholderRole =
  | 'ae'
  | 'se'
  | 'seller_legal'
  | 'buyer_champion'
  | 'buyer_legal'
  | 'buyer_procurement'

export type StakeholderSide = 'seller' | 'buyer'

// Note: the backend's ConnectionStatus has no 'not_invited' member.
// A buyer who has not been invited simply does not exist as a stakeholder yet.
export type ConnectionStatus =
  | 'active'
  | 'pending'
  | 'share_link_only'
  | 'failed'

export type InitStatus = 'success' | 'failed' | 'pending'

export type EventCategory =
  | 'legal'
  | 'technical'
  | 'commercial'
  | 'relationship'
  | 'escalation'

export type EventStatus =
  | 'pending'
  | 'responded'
  | 'resolved'
  | 'escalated'

export type RoutingDecision =
  | 'auto_routed'
  | 'human_confirmed'
  | 'manual_required'

export type ContextInputType =
  | 'discovery_notes'
  | 'call_transcript'
  | 'open_question'
  | 'next_action'

/* ─── Stakeholder ─────────────────────────────── */

export interface Stakeholder {
  participantId: string
  workspaceId: string
  role: StakeholderRole
  name: string
  side: StakeholderSide
  connectionStatus: ConnectionStatus
  shareUrl: string | null
  shareToken: string | null
  initStatus: InitStatus
}

/* ─── Deal Registry. This is the exact shape returned by GET and POST /api/deals ──── */

export interface Deal {
  dealId: string
  dealName: string
  prospectCompany: string
  stage: DealStage
  createdAt: string
  lastActivityAt: string
  calendarEnabled: boolean
  groupId: string
  stakeholders: Stakeholder[]
}

/* ─── Deal Event, as embedded in event log and briefing responses ────────────── */

export interface DealEvent {
  eventId: string
  timestamp: string
  from: string
  category: EventCategory
  summary: string
  routedTo: string
  status: EventStatus
}

export interface Classification {
  category: EventCategory
  confidence: number
  summary: string
  suggestedAction: string
}

export interface ResolvedQuestion {
  question: string
  answer: string
  resolvedBy: string
  resolvedAt: string
}

// Client side aggregate used to render the context summary card.
// The backend does not return this exact shape from a single endpoint today.
// dealEvents is built from GET /api/deals/:dealId/tools plus the local event feed
// accumulated in the dashboard page. See README for the briefing endpoint note.
export interface ContextSummary {
  dealId: string
  stage: DealStage
  discoveryNotes: string
  openQuestions: string[]
  resolvedQuestions: ResolvedQuestion[]
  dealEvents: DealEvent[]
  nextActions: string[]
}

export interface PreCallBrief {
  dealStatus: string
  openQuestions: string[]
  lastThreeEvents: string[]
  suggestedTalkingPoints: string[]
  riskFlags: string[]
}

export interface AicooTool {
  name: string
  description: string
  parameters: Record<string, unknown>
}

/* ─── API Request Payloads. Field names match backend CreateDealBody, etc exactly ─── */

export interface CreateDealPayload {
  dealName: string
  prospectCompany: string
  stage: DealStage
  participants: { name: string; role: StakeholderRole; participantId?: string }[]
}

export interface UpdateContextPayload {
  workspaceId: string
  rawInput: string
  inputType: ContextInputType
}

export interface InviteBuyerPayload {
  buyerName: string
  buyerRole: StakeholderRole
  buyerParticipantId?: string
}

export interface BuyerInitPayload {
  buyerWorkspaceId: string
  buyerName: string
  buyerRole: StakeholderRole
  buyerCompany?: string
}

export interface ConnectBuyerPayload {
  sellerWorkspaceId: string
  buyerWorkspaceId: string
}

export interface AcceptConnectionPayload {
  buyerWorkspaceId: string
  connectionId: string
}

export interface SubmitEventPayload {
  message: string
  senderWorkspaceId: string
  senderName: string
  senderRole: StakeholderRole
  dealId: string
  conversationId?: string
}

export interface ManualRoutePayload {
  targetWorkspaceId: string
  confirmedBy: string
  dealId: string
  conversationId?: string
}

/* ─── API Response Data Shapes. These are the "data" field of ApiResponse<T> ─── */

// POST /api/deals and GET /api/deals/:dealId both return data: Deal directly.
// There is no separate dealId plus deal wrapper. Deal.dealId is the id field.
export type CreateDealResponseData = Deal

export interface ToolsResponseData {
  tools: AicooTool[]
  calendarEnabled: boolean
  calendarAvailable: boolean
  setupRequired: boolean
  setupInstructions: string | null
}

export interface InviteResponseData {
  shareUrl: string | null
  shareToken: string | null
  buyerWorkspaceId: string
  participantId: string
  openInNewTab: true
  note?: string
}

export interface BuyerInitResponseData {
  buyerWorkspaceId: string
  initStatus: 'success'
  message: string
}

export interface ConnectResponseData {
  connectionId: string
  status: 'pending'
  buyerWorkspaceId: string
  message: string
}

export interface AcceptResponseData {
  buyerWorkspaceId: string
  connectionStatus: 'active'
  message: string
}

export interface SubmitEventResponseData {
  eventId: string
  routingDecision: RoutingDecision
  routedTo?: string | null
  suggestedTarget?: string | null
  classification: Classification
  agentResponse?: string | null
  conversationId?: string
  requiresHumanAction?: boolean
  dispatchError?: string
}

export interface ManualRouteResponseData {
  eventId: string
  routedTo: string
  confirmedBy: string
  routingDecision: 'human_confirmed'
  agentResponse: string | null
  conversationId: string
}

/* ─── Generic API Envelope. Matches backend ApiSuccess and ApiError exactly ───── */

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  message: string
  code?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
