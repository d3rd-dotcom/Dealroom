/* ────────────────────────────────────────────────
   DealRoom TypeScript Types
   All types derived from the blueprint data models
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

export type ConnectionStatus =
  | 'active'
  | 'pending'
  | 'share_link_only'
  | 'not_invited'

export type InitStatus = 'success' | 'pending' | 'failed'

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

/* ─── Stakeholder ─────────────────────────────── */

export interface Stakeholder {
  participantId: string
  workspaceId:   string
  role:          StakeholderRole
  name:          string
  side:          StakeholderSide
  connectionStatus: ConnectionStatus
  shareUrl:      string | null
  shareToken:    string | null
  initStatus:    InitStatus
}

/* ─── Deal Event ──────────────────────────────── */

export interface DealEvent {
  eventId:    string
  timestamp:  string
  from:       string
  category:   EventCategory
  summary:    string
  routedTo:   string
  status:     EventStatus
  rawMessage?: string
  classification?: Classification
  routingDecision?: RoutingDecision
}

/* ─── Classification ──────────────────────────── */

export interface Classification {
  category:        EventCategory
  confidence:      number
  summary:         string
  suggestedAction: string
}

/* ─── Resolved Question ───────────────────────── */

export interface ResolvedQuestion {
  question:   string
  answer:     string
  resolvedBy: string
  resolvedAt: string
}

/* ─── Deal ────────────────────────────────────── */

export interface Deal {
  dealId:          string
  dealName:        string
  prospectCompany: string
  stage:           DealStage
  createdAt:       string
  lastActivityAt:  string
  calendarEnabled: boolean
  groupId:         string
  stakeholders:    Stakeholder[]
}

/* ─── Context Summary ─────────────────────────── */

export interface ContextSummary {
  dealId:            string
  stage:             DealStage
  discoveryNotes:    string
  openQuestions:     string[]
  resolvedQuestions: ResolvedQuestion[]
  dealEvents:        DealEvent[]
  nextActions:       string[]
}

/* ─── Pre Call Brief ──────────────────────────── */

export interface PreCallBrief {
  dealStatus:            string
  openQuestions:         string[]
  lastThreeEvents:       string[]
  suggestedTalkingPoints:string[]
  riskFlags:             string[]
}

/* ─── API Payloads ────────────────────────────── */

export interface CreateDealPayload {
  dealName:        string
  prospectCompany: string
  stage:           DealStage
  participants:    { name: string; role: StakeholderRole }[]
}

export interface SendEventPayload {
  dealId:     string
  message:    string
  senderRole: StakeholderRole
  senderName: string
}

export interface InviteBuyerPayload {
  dealId: string
  name:   string
  role:   StakeholderRole
}

export interface ScheduleMeetingPayload {
  dealId:          string
  title:           string
  startTime:       string
  durationMinutes: number
  attendees:       string[]
}

/* ─── API Responses ───────────────────────────── */

export interface ApiResponse<T> {
  success: boolean
  data?:   T
  error?:  string
}

export interface CreateDealResponse {
  dealId:   string
  deal:     Deal
}

export interface InviteResponse {
  shareUrl:   string
  shareToken: string
}

export interface ClassifyEventResponse {
  classification:  Classification
  routingDecision: RoutingDecision
  routedTo?:       string
  eventId:         string
}

export interface BookingResponse {
  confirmed:  boolean
  meetingId:  string
  calendarUrl:string
}

/* ─── UI State ────────────────────────────────── */

export interface Tab {
  id:    string
  label: string
  count?: number
}
