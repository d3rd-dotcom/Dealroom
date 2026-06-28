// DealRoom shared type definitions.
// All data models from blueprint Section 10, plus Aicoo API response shapes
// and typed request bodies for every route.

// ─── Domain Enums ────────────────────────────────────────────────────────────

export type DealStage =
  | 'Discovery'
  | 'Technical Evaluation'
  | 'Legal Review'
  | 'Commercial'
  | 'Closed Won'
  | 'Closed Lost';

export type ParticipantRole =
  | 'ae'
  | 'se'
  | 'seller_legal'
  | 'buyer_champion'
  | 'buyer_legal'
  | 'buyer_procurement';

export type ParticipantSide = 'seller' | 'buyer';

export type ConnectionStatus =
  | 'active'
  | 'pending'
  | 'share_link_only'
  | 'failed';

export type InitStatus = 'success' | 'failed' | 'pending';

export type TemplatePreset = 'Minimal' | 'Standard' | 'Complete' | 'Team Leader';

export type EventCategory =
  | 'legal'
  | 'technical'
  | 'commercial'
  | 'relationship'
  | 'escalation';

export type EventStatus =
  | 'pending'
  | 'responded'
  | 'resolved'
  | 'escalated';

export type RoutingDecision =
  | 'auto_routed'
  | 'human_confirmed'
  | 'manual_required';

export type ContextInputType =
  | 'discovery_notes'
  | 'call_transcript'
  | 'open_question'
  | 'next_action';

// ─── Core Data Models ────────────────────────────────────────────────────────

export interface Stakeholder {
  participantId: string;
  workspaceId: string;
  role: ParticipantRole;
  name: string;
  side: ParticipantSide;
  connectionStatus: ConnectionStatus;
  shareUrl: string | null;
  shareToken: string | null;
  initStatus: InitStatus;
}

export interface DealRegistry {
  dealId: string;
  dealName: string;
  prospectCompany: string;
  stage: DealStage;
  createdAt: string;
  lastActivityAt: string;
  calendarEnabled: boolean;
  groupId: string;
  stakeholders: Stakeholder[];
}

export interface ResolvedQuestion {
  question: string;
  answer: string;
  resolvedBy: ParticipantRole;
  resolvedAt: string;
}

export interface DealEvent {
  eventId: string;
  timestamp: string;
  from: string;
  category: EventCategory;
  summary: string;
  routedTo: string;
  status: EventStatus;
}

// Context accumulated into an agent workspace via /agent/accumulate.
// systemDirectives is the persona prompt for the agent.
export interface DealContext {
  dealId: string;
  role: ParticipantRole;
  participantName: string;
  dealName: string;
  prospectCompany: string;
  stage: DealStage;
  discoveryNotes: string;
  openQuestions: string[];
  resolvedQuestions: ResolvedQuestion[];
  dealEvents: DealEvent[];
  nextActions: string[];
  systemDirectives: string;
}

export interface ClassificationResult {
  category: EventCategory;
  confidence: number;
  summary: string;
  suggestedAction: string;
}

export interface EventLogEntry {
  eventId: string;
  timestamp: string;
  rawMessage: string;
  senderWorkspaceId: string;
  classification: ClassificationResult;
  routingDecision: RoutingDecision;
  routedTo: string;
  status: 'pending' | 'responded' | 'resolved';
}

export interface PreCallBrief {
  dealStatus: string;
  openQuestions: string[];
  lastThreeEvents: string[];
  suggestedTalkingPoints: string[];
  riskFlags: string[];
}

// ─── Aicoo API Response Shapes ───────────────────────────────────────────────

export interface AicooInitResponse {
  workspaceId?: string;
  status?: string;
}

export interface AicooShareResponse {
  shareToken: string;
  shareUrl: string;
}

// connectionId from /network/request is required for the subsequent /network/accept call.
export interface AicooNetworkRequestResponse {
  connectionId: string;
  status: string;
}

export interface AicooMessageResponse {
  response: string;
  conversationId: string;
}

export interface AicooTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AicooToolsResponse {
  tools: AicooTool[];
}

// ─── Route Request Body Types ─────────────────────────────────────────────────

export interface CreateDealBody {
  dealName: string;
  prospectCompany: string;
  stage: DealStage;
  participants: Array<{
    name: string;
    role: ParticipantRole;
    participantId?: string;
  }>;
}

export interface UpdateContextBody {
  workspaceId: string;
  rawInput: string;
  inputType: ContextInputType;
}

export interface InviteBuyerBody {
  buyerName: string;
  buyerRole: ParticipantRole;
  buyerParticipantId?: string;
}

export interface BuyerInitBody {
  buyerWorkspaceId: string;
  buyerName: string;
  buyerRole: ParticipantRole;
  buyerCompany?: string;
}

export interface ConnectBuyerBody {
  sellerWorkspaceId: string;
  buyerWorkspaceId: string;
}

export interface AcceptConnectionBody {
  buyerWorkspaceId: string;
  connectionId: string;
}

export interface SubmitEventBody {
  message: string;
  senderWorkspaceId: string;
  senderName: string;
  senderRole: ParticipantRole;
  dealId: string;
  conversationId?: string;
}

export interface ManualRouteBody {
  targetWorkspaceId: string;
  confirmedBy: string;
  dealId: string;
  conversationId?: string;
}

// ─── Standard API Response Wrapper ───────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
