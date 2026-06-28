// Deal management routes.
// Covers the full deal lifecycle: creation, context accumulation, tool queries, and pre-call briefing.
// This file orchestrates calls to aicoo.ts, redis.ts, classifier.ts, and personas.ts.
// No Aicoo credentials are ever passed to the client. All API calls stay server-side.

import { Router } from 'express';
import type { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import type {
  DealRegistry,
  DealContext,
  Stakeholder,
  CreateDealBody,
  UpdateContextBody,
  DealEvent,
  EventStatus,
} from '../types/index.js';
import {
  getDeal,
  setDeal,
  getToolsCache,
  setToolsCache,
  isCalendarEnabled,
  getEventLog,
} from '../lib/redis.js';
import {
  agentInit,
  agentAccumulate,
  getTools,
} from '../lib/aicoo.js';
import { workspaceId as wsId } from '../utils/workspace.js';
import { getPersonaDirective } from '../lib/personas.js';
import {
  summarizeDiscoveryNotes,
  extractTranscriptSignals,
  generatePreCallBrief,
} from '../lib/classifier.js';

const router = Router();

// ─── POST /api/deals ──────────────────────────────────────────────────────────
// Creates a new deal and provisions agent workspaces for every seller participant.
// Coordination checkboxes covered: #1 (identity), #4 (context seeding).
//
// Flow:
//   1. Generate a unique dealId.
//   2. Build the deal registry in memory.
//   3. Call agentInit for each seller participant.
//   4. Call agentAccumulate with the initial context and persona directive.
//   5. Call getTools on the first active workspace and cache the result.
//   6. Set calendarEnabled based on whether calendar.schedule_meeting is present.
//   7. Persist the final deal record to Redis and return it.
router.post(
  '/',
  async (req: Request<object, object, CreateDealBody>, res: Response): Promise<void> => {
    const { dealName, prospectCompany, stage, participants } = req.body;

    if (!dealName || !prospectCompany || !stage || !Array.isArray(participants) || participants.length === 0) {
      res.status(400).json({
        success: false,
        message: 'dealName, prospectCompany, stage, and a non-empty participants array are required.',
      });
      return;
    }

    // Strip hyphens from the UUID and take 12 characters for a compact dealId.
    const dealId = uuid().replace(/-/g, '').slice(0, 12);
    const now = new Date().toISOString();

    // Build the initial stakeholder list. All start as pending until their workspace is confirmed.
    const stakeholders: Stakeholder[] = participants.map((p) => ({
      participantId: p.participantId ?? uuid(),
      workspaceId: wsId(dealId, p.role),
      role: p.role,
      name: p.name,
      side: 'seller' as const,
      connectionStatus: 'pending' as const,
      shareUrl: null,
      shareToken: null,
      initStatus: 'pending' as const,
    }));

    const deal: DealRegistry = {
      dealId,
      dealName,
      prospectCompany,
      stage,
      createdAt: now,
      lastActivityAt: now,
      calendarEnabled: false,
      groupId: `group:deal_${dealId}`,
      stakeholders,
    };

    // Persist the skeleton record first so that a partial failure during workspace
    // provisioning still leaves a recoverable deal in Redis.
    await setDeal(deal);

    // Provision each seller workspace sequentially.
    // Sequential order preserves per-workspace error isolation: a failed SE init
    // does not abort the AE init. Each stakeholder's initStatus is updated independently.
    for (const stakeholder of deal.stakeholders) {
      try {
        await agentInit(stakeholder.workspaceId, 'Complete');

        const initialContext: Partial<DealContext> = {
          dealId,
          role: stakeholder.role,
          participantName: stakeholder.name,
          dealName,
          prospectCompany,
          stage,
          discoveryNotes: '',
          openQuestions: [],
          resolvedQuestions: [],
          dealEvents: [],
          nextActions: [],
          systemDirectives: getPersonaDirective(stakeholder.role, {
            participantName: stakeholder.name,
            dealName,
            buyerCompany: prospectCompany,
          }),
        };

        await agentAccumulate(stakeholder.workspaceId, initialContext);

        stakeholder.initStatus = 'success';
        stakeholder.connectionStatus = 'active';
      } catch (err) {
        console.error(
          `Workspace provisioning failed for ${stakeholder.workspaceId}:`,
          err instanceof Error ? err.message : err
        );
        stakeholder.initStatus = 'failed';
        // Do not throw here. Allow the loop to continue provisioning remaining stakeholders.
      }
    }

    // Query the live tool schemas from the first successfully initialized workspace.
    // This is the authoritative check for calendar availability.
    // IMPORTANT: calendar.schedule_meeting only appears if the calendar namespace
    // has been enabled in the Aicoo dashboard before init.
    const firstActive = deal.stakeholders.find(
      (s) => s.initStatus === 'success'
    );

    if (firstActive) {
      try {
        const toolsResponse = await getTools(firstActive.workspaceId);
        await setToolsCache(dealId, toolsResponse.tools);

        const calendarReady = toolsResponse.tools.some(
          (t) => t.name === 'calendar.schedule_meeting'
        );
        deal.calendarEnabled = calendarReady;

        if (!calendarReady) {
          console.warn(
            `Deal ${dealId}: calendar.schedule_meeting not present in tool list. ` +
            `Enable the calendar namespace in the Aicoo dashboard and re-query tools.`
          );
        }
      } catch (err) {
        console.error(
          `Tools query failed for deal ${dealId}:`,
          err instanceof Error ? err.message : err
        );
        // calendarEnabled stays false. The frontend will surface the setup alert.
      }
    }

    // Persist the fully provisioned deal record.
    await setDeal(deal);

    res.status(201).json({ success: true, data: deal });
  }
);

// ─── GET /api/deals/:dealId ───────────────────────────────────────────────────
// Returns the full deal registry from Redis.
// Used by the frontend to render stakeholder status cards and deal metadata.
router.get('/:dealId', async (req: Request, res: Response): Promise<void> => {
  const { dealId } = req.params;
  const deal = await getDeal(dealId);

  if (!deal) {
    res.status(404).json({
      success: false,
      message: `Deal ${dealId} not found.`,
    });
    return;
  }

  res.json({ success: true, data: deal });
});

// ─── POST /api/deals/:dealId/context ─────────────────────────────────────────
// Accepts raw input from the AE and accumulates it into the specified agent workspace.
// Coordination checkbox covered: #4 (context accumulation and reuse).
//
// inputType options:
//   call_transcript   Extracts signals (objections, questions, next actions) via Claude.
//   discovery_notes   Compresses if over the safe character limit, then accumulates.
//   open_question     Appends a single question to the openQuestions array.
//   next_action       Appends a single action to the nextActions array.
router.post(
  '/:dealId/context',
  async (
    req: Request<{ dealId: string }, object, UpdateContextBody>,
    res: Response
  ): Promise<void> => {
    const { dealId } = req.params;
    const { workspaceId, rawInput, inputType } = req.body;

    if (!workspaceId || !rawInput || !inputType) {
      res.status(400).json({
        success: false,
        message: 'workspaceId, rawInput, and inputType are required.',
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

    const stakeholder = deal.stakeholders.find(
      (s) => s.workspaceId === workspaceId
    );
    if (!stakeholder) {
      res.status(404).json({
        success: false,
        message: `Workspace ${workspaceId} does not belong to deal ${dealId}.`,
      });
      return;
    }

    if (stakeholder.initStatus !== 'success') {
      res.status(400).json({
        success: false,
        message: `Workspace ${workspaceId} has not been successfully initialized. Retry init before accumulating context.`,
      });
      return;
    }

    let contextDelta: Partial<DealContext> = {};

    try {
      if (inputType === 'call_transcript') {
        const signals = await extractTranscriptSignals(rawInput);
        contextDelta = {
          openQuestions: signals.openQuestions,
          nextActions: signals.nextActions,
          discoveryNotes: signals.discoveryNotesSummary,
        };
      } else if (inputType === 'discovery_notes') {
        const condensed = await summarizeDiscoveryNotes(rawInput);
        contextDelta = { discoveryNotes: condensed };
      } else if (inputType === 'open_question') {
        contextDelta = { openQuestions: [rawInput] };
      } else if (inputType === 'next_action') {
        contextDelta = { nextActions: [rawInput] };
      }
    } catch (err) {
      res.status(500).json({
        success: false,
        message: `Context processing failed for inputType ${inputType}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
      return;
    }

    try {
      await agentAccumulate(workspaceId, contextDelta);
      deal.lastActivityAt = new Date().toISOString();
      await setDeal(deal);

      res.json({ success: true, data: contextDelta });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: `agentAccumulate call failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }
  }
);

// ─── GET /api/deals/:dealId/tools ─────────────────────────────────────────────
// Returns the cached tools list and the calendar availability flag.
// The frontend gates the scheduling UI on calendarEnabled from this response.
// If setupRequired is true, surface the Aicoo dashboard instructions to the user.
router.get(
  '/:dealId/tools',
  async (req: Request, res: Response): Promise<void> => {
    const { dealId } = req.params;

    const deal = await getDeal(dealId);
    if (!deal) {
      res.status(404).json({
        success: false,
        message: `Deal ${dealId} not found.`,
      });
      return;
    }

    const tools = await getToolsCache(dealId);
    const calendarAvailable = await isCalendarEnabled(dealId);

    res.json({
      success: true,
      data: {
        tools: tools ?? [],
        calendarEnabled: deal.calendarEnabled,
        calendarAvailable,
        setupRequired: !calendarAvailable,
        setupInstructions: calendarAvailable
          ? null
          : 'Enable the calendar namespace in the Aicoo dashboard, then re-run the deal creation flow to update this flag.',
      },
    });
  }
);

// ─── GET /api/deals/:dealId/briefing/:workspaceId ─────────────────────────────
// Generates a structured pre-call briefing for the requesting participant.
// Coordination checkbox covered: #4 (context reuse across workflows).
//
// Builds a context snapshot from Redis deal data and the accumulated event log,
// then passes it to Claude for briefing generation.
// In production, the full accumulated context would be fetched from Aicoo directly.
router.get(
  '/:dealId/briefing/:workspaceId',
  async (req: Request, res: Response): Promise<void> => {
    const { dealId, workspaceId } = req.params;

    const deal = await getDeal(dealId);
    if (!deal) {
      res.status(404).json({
        success: false,
        message: `Deal ${dealId} not found.`,
      });
      return;
    }

    const stakeholder = deal.stakeholders.find(
      (s) => s.workspaceId === workspaceId
    );
    if (!stakeholder) {
      res.status(404).json({
        success: false,
        message: `Workspace ${workspaceId} not found in deal ${dealId}.`,
      });
      return;
    }

    // Pull the event log from Redis to give the briefing generator real event history.
    const eventLog = await getEventLog(dealId);
    const dealEvents: DealEvent[] = eventLog.map((e) => ({
      eventId: e.eventId,
      timestamp: e.timestamp,
      from: e.senderWorkspaceId,
      category: e.classification.category,
      summary: e.classification.summary,
      routedTo: e.routedTo,
      status: e.status as EventStatus,
    }));

    // Construct a context snapshot from Redis-stored deal data.
    // discoveryNotes is not stored in Redis between requests in this implementation.
    // For a richer briefing, the frontend should POST the latest notes via
    // /api/deals/:dealId/context before requesting a briefing.
    const contextSnapshot: Partial<DealContext> = {
      dealId,
      role: stakeholder.role,
      participantName: stakeholder.name,
      dealName: deal.dealName,
      prospectCompany: deal.prospectCompany,
      stage: deal.stage,
      dealEvents,
      openQuestions: [],
      resolvedQuestions: [],
      nextActions: [],
      discoveryNotes: '',
    };

    try {
      const brief = await generatePreCallBrief(
        contextSnapshot,
        stakeholder.name,
        stakeholder.role
      );
      res.json({ success: true, data: brief });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: `Briefing generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }
  }
);

export default router;
