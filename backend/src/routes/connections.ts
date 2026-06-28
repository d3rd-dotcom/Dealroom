// Buyer onboarding and agent network connection routes.
// Covers the full buyer coordination path: share link generation, workspace provisioning,
// network request handshake, and connection acceptance.
//
// Coordination checkboxes covered:
//   #1  Identity: buyer agents provisioned via agentInit with scoped persona directives.
//   #2  Connection: cross-organization handshake via networkRequest and networkAccept.
//   #3  Routing: share link as fallback channel when connection is pending or declined.

import { Router } from 'express';
import type { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import type {
  InviteBuyerBody,
  BuyerInitBody,
  ConnectBuyerBody,
  AcceptConnectionBody,
  Stakeholder,
  DealContext,
} from '../types/index.js';
import {
  getDeal,
  setDeal,
  updateStakeholder,
  updateStakeholderStatus,
  checkWorkspaceReady,
  redis,
} from '../lib/redis.js';
import {
  shareCreate,
  agentInit,
  agentAccumulate,
  networkRequest,
  networkAccept,
} from '../lib/aicoo.js';
import { workspaceId as wsId } from '../utils/workspace.js';
import { getPersonaDirective } from '../lib/personas.js';

const router = Router();

// Redis TTL for pending connection tokens: 24 hours in seconds.
// If a buyer has not accepted a connection request within this window,
// the token is expired and a new networkRequest must be sent.
const PENDING_CONN_TTL_SECONDS = 86400;

// Key for storing pending connection IDs in Redis.
// Keyed by dealId and buyer workspaceId for unambiguous retrieval at accept time.
function pendingConnKey(dealId: string, buyerWorkspaceId: string): string {
  return `conn:pending:${dealId}:${buyerWorkspaceId}`;
}

// ─── POST /api/deals/:dealId/invite ──────────────────────────────────────────
// Generates a public sandboxed share link that allows a buyer contact to interact
// with the seller AE agent without exposing credentials or requiring an Aicoo account.
//
// CRITICAL: The returned shareUrl must be opened in a new browser tab via redirect.
// Never embed it in an iframe. Aicoo security headers block iframe rendering.
//
// This route adds the buyer as a stakeholder with initStatus: pending and
// connectionStatus: share_link_only. The buyer is fully operational via the share link
// even if they never upgrade to a direct agent connection.
router.post(
  '/:dealId/invite',
  async (
    req: Request<{ dealId: string }, object, InviteBuyerBody>,
    res: Response
  ): Promise<void> => {
    const { dealId } = req.params;
    const { buyerName, buyerRole, buyerParticipantId } = req.body;

    if (!buyerName || !buyerRole) {
      res.status(400).json({
        success: false,
        message: 'buyerName and buyerRole are required.',
      });
      return;
    }

    const deal = await getDeal(dealId);
    if (!deal) {
      res.status(404).json({
        success: false,
        message: `Deal ${dealId} not found.`,
      });
      return;
    }

    // The share link is generated from the AE workspace.
    // Permissions are read-only: the buyer can query the AE agent but cannot
    // modify the workspace or trigger tools beyond what the allowTools list permits.
    const aeStakeholder = deal.stakeholders.find(
      (s) => s.role === 'ae' && s.initStatus === 'success'
    );
    if (!aeStakeholder) {
      res.status(400).json({
        success: false,
        message:
          'AE workspace must be successfully initialized before inviting a buyer. ' +
          'Check the deal status card for failed init entries and retry.',
      });
      return;
    }

    // Check if this buyer role is already present in the deal to avoid duplicate stakeholders.
    const existingBuyer = deal.stakeholders.find((s) => s.role === buyerRole && s.side === 'buyer');
    if (existingBuyer) {
      // Return the existing share link rather than generating a duplicate.
      res.json({
        success: true,
        data: {
          shareUrl: existingBuyer.shareUrl,
          shareToken: existingBuyer.shareToken,
          buyerWorkspaceId: existingBuyer.workspaceId,
          participantId: existingBuyer.participantId,
          openInNewTab: true,
          note: 'Existing share link returned. Generate a new invite to rotate the token.',
        },
      });
      return;
    }

    let shareResponse;
    try {
      shareResponse = await shareCreate(
        aeStakeholder.workspaceId,
        `DealRoom: ${deal.dealName} Evaluation`,
        { notesAccess: 'read', allowTools: [] }
      );
    } catch (err) {
      res.status(500).json({
        success: false,
        message: `Share link creation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
      return;
    }

    const participantId = buyerParticipantId ?? uuid();
    const buyerWorkspaceId = wsId(dealId, buyerRole);

    const newStakeholder: Stakeholder = {
      participantId,
      workspaceId: buyerWorkspaceId,
      role: buyerRole,
      name: buyerName,
      side: 'buyer',
      connectionStatus: 'share_link_only',
      shareUrl: shareResponse.shareUrl,
      shareToken: shareResponse.shareToken,
      initStatus: 'pending',
    };

    deal.stakeholders.push(newStakeholder);
    deal.lastActivityAt = new Date().toISOString();
    await setDeal(deal);

    res.status(201).json({
      success: true,
      data: {
        shareUrl: shareResponse.shareUrl,
        shareToken: shareResponse.shareToken,
        buyerWorkspaceId,
        participantId,
        // Remind the frontend: redirect button only, never iframe.
        openInNewTab: true,
      },
    });
  }
);

// ─── POST /api/deals/:dealId/buyer-init ──────────────────────────────────────
// Called when a buyer champion opts in to create their own Aicoo agent workspace.
// This is the premium coordination path above share-link-only access.
//
// After this route succeeds, the seller calls POST /:dealId/connect to initiate
// the cross-organization agent handshake.
//
// Coordination checkpoint: #1 (buyer agent identity provisioned with role persona).
router.post(
  '/:dealId/buyer-init',
  async (
    req: Request<{ dealId: string }, object, BuyerInitBody>,
    res: Response
  ): Promise<void> => {
    const { dealId } = req.params;
    const { buyerWorkspaceId, buyerName, buyerRole, buyerCompany } = req.body;

    if (!buyerWorkspaceId || !buyerName || !buyerRole) {
      res.status(400).json({
        success: false,
        message: 'buyerWorkspaceId, buyerName, and buyerRole are required.',
      });
      return;
    }

    const deal = await getDeal(dealId);
    if (!deal) {
      res.status(404).json({
        success: false,
        message: `Deal ${dealId} not found.`,
      });
      return;
    }

    // Use Standard preset for buyer agents: no terminal execution or browser automation.
    // Buyers need calendar access (for scheduling) and web search only.
    try {
      await agentInit(buyerWorkspaceId, 'Standard');
    } catch (err) {
      await updateStakeholderStatus(dealId, buyerWorkspaceId, 'failed');
      res.status(500).json({
        success: false,
        message: `Buyer workspace init failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
      return;
    }

    const resolvedCompany = buyerCompany ?? deal.prospectCompany;

    const initialContext: Partial<DealContext> = {
      dealId,
      role: buyerRole,
      participantName: buyerName,
      dealName: deal.dealName,
      prospectCompany: resolvedCompany,
      stage: deal.stage,
      discoveryNotes: '',
      openQuestions: [],
      resolvedQuestions: [],
      dealEvents: [],
      nextActions: [],
      systemDirectives: getPersonaDirective(buyerRole, {
        participantName: buyerName,
        buyerCompany: resolvedCompany,
        dealName: deal.dealName,
      }),
    };

    try {
      await agentAccumulate(buyerWorkspaceId, initialContext);
    } catch (err) {
      // Accumulate failure is not fatal: the workspace exists but has no context.
      // Log and continue so the connection handshake can still proceed.
      console.error(
        `Buyer workspace ${buyerWorkspaceId} accumulate failed. Workspace exists but has no context:`,
        err instanceof Error ? err.message : err
      );
    }

    await updateStakeholderStatus(dealId, buyerWorkspaceId, 'success', 'pending');

    res.json({
      success: true,
      data: {
        buyerWorkspaceId,
        initStatus: 'success',
        message:
          'Buyer workspace provisioned. Call POST /:dealId/connect to send the network connection request.',
      },
    });
  }
);

// ─── POST /api/deals/:dealId/connect ──────────────────────────────────────────
// Sends a formal network connection request from the seller AE agent to the buyer agent.
// The returned connectionId is stored in Redis and is required for the accept call.
//
// PRECONDITION: The buyer workspace must be successfully initialized via buyer-init
// before this route is called. checkWorkspaceReady() guards this requirement.
//
// Coordination checkpoint: #2 (cross-organization connection initiated).
router.post(
  '/:dealId/connect',
  async (
    req: Request<{ dealId: string }, object, ConnectBuyerBody>,
    res: Response
  ): Promise<void> => {
    const { dealId } = req.params;
    const { sellerWorkspaceId, buyerWorkspaceId } = req.body;

    if (!sellerWorkspaceId || !buyerWorkspaceId) {
      res.status(400).json({
        success: false,
        message: 'sellerWorkspaceId and buyerWorkspaceId are required.',
      });
      return;
    }

    const deal = await getDeal(dealId);
    if (!deal) {
      res.status(404).json({
        success: false,
        message: `Deal ${dealId} not found.`,
      });
      return;
    }

    // Guard: buyer workspace must exist and be successfully initialized.
    // Sending a networkRequest to an uninitialized workspace will fail with an Aicoo error.
    const buyerReady = await checkWorkspaceReady(dealId, buyerWorkspaceId);
    if (!buyerReady) {
      res.status(400).json({
        success: false,
        message:
          `Buyer workspace ${buyerWorkspaceId} is not ready. ` +
          `Call POST /:dealId/buyer-init first and confirm initStatus is success.`,
      });
      return;
    }

    let connectionResponse;
    try {
      connectionResponse = await networkRequest(
        sellerWorkspaceId,
        buyerWorkspaceId,
        `Connecting deal room agents for direct coordination on the ${deal.dealName} evaluation with ${deal.prospectCompany}.`
      );
    } catch (err) {
      res.status(500).json({
        success: false,
        message: `Network connection request failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
      return;
    }

    // Persist the connectionId so the accept route can retrieve it without
    // requiring the frontend to pass it back in the request body.
    // TTL matches the blueprint's 24-hour acceptance window.
    await redis.set(
      pendingConnKey(dealId, buyerWorkspaceId),
      connectionResponse.connectionId,
      { ex: PENDING_CONN_TTL_SECONDS }
    );

    await updateStakeholder(dealId, buyerWorkspaceId, {
      connectionStatus: 'pending',
    });

    res.json({
      success: true,
      data: {
        connectionId: connectionResponse.connectionId,
        status: 'pending',
        buyerWorkspaceId,
        message:
          'Connection request sent. Awaiting buyer acceptance. ' +
          'If the buyer does not accept within 24 hours, the share link channel remains active.',
      },
    });
  }
);

// ─── POST /api/deals/:dealId/accept ───────────────────────────────────────────
// Approves a pending network connection request, activating the direct
// agent-to-agent communication channel between the seller and buyer agents.
//
// connectionId can be supplied in the request body (if the frontend stores it
// from the /connect response) or retrieved automatically from Redis.
//
// After this call, agentMessage can be sent between seller and buyer workspaces
// using the _coo RPC suffix without going through the share link.
//
// Coordination checkpoint: #2 (connection active, cross-organization RPC enabled).
router.post(
  '/:dealId/accept',
  async (
    req: Request<{ dealId: string }, object, AcceptConnectionBody>,
    res: Response
  ): Promise<void> => {
    const { dealId } = req.params;
    const { buyerWorkspaceId, connectionId: bodyConnectionId } = req.body;

    if (!buyerWorkspaceId) {
      res.status(400).json({
        success: false,
        message: 'buyerWorkspaceId is required.',
      });
      return;
    }

    const deal = await getDeal(dealId);
    if (!deal) {
      res.status(404).json({
        success: false,
        message: `Deal ${dealId} not found.`,
      });
      return;
    }

    // Resolve connectionId: prefer the body value, fall back to Redis lookup.
    let connectionId = bodyConnectionId;

    if (!connectionId) {
      const stored = await redis.get<string>(
        pendingConnKey(dealId, buyerWorkspaceId)
      );
      if (!stored) {
        res.status(400).json({
          success: false,
          message:
            `No pending connection found for workspace ${buyerWorkspaceId}. ` +
            `The connection request may have expired (24-hour TTL). ` +
            `Call POST /:dealId/connect again to issue a new request.`,
        });
        return;
      }
      connectionId = stored;
    }

    try {
      await networkAccept(buyerWorkspaceId, connectionId);
    } catch (err) {
      res.status(500).json({
        success: false,
        message: `networkAccept call failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
      return;
    }

    // Remove the pending token from Redis: connection is now active.
    await redis.del(pendingConnKey(dealId, buyerWorkspaceId));

    await updateStakeholder(dealId, buyerWorkspaceId, {
      connectionStatus: 'active',
    });

    res.json({
      success: true,
      data: {
        buyerWorkspaceId,
        connectionStatus: 'active',
        message:
          'Connection accepted. Direct agent-to-agent communication is now active. ' +
          'Use the _coo RPC suffix to route messages directly to this buyer agent.',
      },
    });
  }
);

export default router;
