import { redis } from './client.js';
import { appError } from '../middleware/errorHandler.js';
import type {
  DealRegistry,
  Stakeholder,
  ConnectionStatus,
  DealStage,
} from '../types/index.js';

export function dealKey(dealId: string): string {
  return `deal:${dealId}`;
}

export async function getDeal(dealId: string): Promise<DealRegistry | null> {
  const deal = await redis.get<DealRegistry>(dealKey(dealId));
  return deal ?? null;
}

export async function dealExists(dealId: string): Promise<boolean> {
  const exists = await redis.exists(dealKey(dealId));
  return exists === 1;
}

export async function saveDeal(deal: DealRegistry): Promise<void> {
  await redis.set(dealKey(deal.dealId), deal);
}

export async function touchActivity(dealId: string): Promise<void> {
  const deal = await getDeal(dealId);
  if (!deal) return;
  deal.lastActivityAt = new Date().toISOString();
  await saveDeal(deal);
}

export async function setStage(dealId: string, stage: DealStage): Promise<DealRegistry> {
  const deal = await getDeal(dealId);
  if (!deal) throw appError(`Deal ${dealId} not found.`, 404);
  deal.stage = stage;
  deal.lastActivityAt = new Date().toISOString();
  await saveDeal(deal);
  return deal;
}

export async function addStakeholder(
  dealId: string,
  stakeholder: Stakeholder
): Promise<DealRegistry> {
  const deal = await getDeal(dealId);
  if (!deal) throw appError(`Deal ${dealId} not found.`, 404);
  deal.stakeholders.push(stakeholder);
  deal.lastActivityAt = new Date().toISOString();
  await saveDeal(deal);
  return deal;
}

export async function updateStakeholder(
  dealId: string,
  participantId: string,
  patch: Partial<Stakeholder>
): Promise<DealRegistry> {
  const deal = await getDeal(dealId);
  if (!deal) throw appError(`Deal ${dealId} not found.`, 404);

  const idx = deal.stakeholders.findIndex(s => s.participantId === participantId);
  if (idx === -1) {
    throw appError(`Stakeholder ${participantId} not found on deal ${dealId}.`, 404);
  }

  deal.stakeholders[idx] = { ...deal.stakeholders[idx], ...patch };
  deal.lastActivityAt = new Date().toISOString();
  await saveDeal(deal);
  return deal;
}

export async function updateConnectionStatus(
  dealId: string,
  participantId: string,
  status: ConnectionStatus
): Promise<DealRegistry> {
  return updateStakeholder(dealId, participantId, { connectionStatus: status });
}

// Pure helper, no Redis call. Use against a DealRegistry already in hand to
// avoid re-fetching when the caller already has the object loaded.
export function findStakeholder(
  deal: DealRegistry,
  predicate: (s: Stakeholder) => boolean
): Stakeholder | undefined {
  return deal.stakeholders.find(predicate);
}

export function findStakeholderByWorkspaceId(
  deal: DealRegistry,
  workspaceId: string
): Stakeholder | undefined {
  return findStakeholder(deal, s => s.workspaceId === workspaceId);
}

// Workspace existence check, required before every /network/request per
// blueprint Section 7 Endpoint 4: a request targeting a workspace that was
// never successfully initialized will fail. This checks our own record of
// initStatus rather than calling Aicoo again, since /agent/init is the only
// call that sets initStatus and we already track its result.
export async function workspaceIsReady(
  dealId: string,
  workspaceId: string
): Promise<boolean> {
  const deal = await getDeal(dealId);
  if (!deal) return false;
  const stakeholder = findStakeholderByWorkspaceId(deal, workspaceId);
  return stakeholder?.initStatus === 'success';
}
