// Event classification and routing routes.
// This is the core intelligence layer of DealRoom.
// Every message that arrives in a deal flows through this file.
//
// Coordination checkboxes covered:
//   #3  Routing: events classified by Claude and sent to the correct agent via Aicoo RPC.
//   #4  Context: resolved events accumulated into the AE workspace as a deal event delta.
//   #5  Human in the loop: medium and low confidence events surface to the AE for review
//       before any message is dispatched. Agents never send without human sign-off below 0.80.

import { Router } from 'express';
import type { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import type {
  SubmitEventBody,
  ManualRouteBody,
  EventLogEntry,
  DealEvent,
} from '../types/index.js';
import {
  getDeal,
  appendEventLog,
  getEventLog,
  updateEventStatus,
  touchDeal,
} from '../lib/redis.js';
import { agentMessage, agentAccumulate } from '../lib/aicoo.js';
import {
  classifyEvent,
  getRoutingDecision,
  getRoutingTarget,
} from '../lib/classifier.js';
import { workspaceId as wsId, isGroupTarget } from '../utils/workspace.js';

const router = Router();

// ─── POST /api/events ─────────────────────────────────────────────────────────
// Receives a deal event message, classifies it with Claude, and routes it
// according to the confidence threshold logic from blueprint Section 8.
//
// Confidence >= 0.80: auto_routed.
//   The message is dispatched to the correct agent immediately with no AE review.
//   The agent response is returned and the event is accumulated into deal context.
//
// Confidence 0.60 to 0.79: human_confirmed.
//   The classification result and suggested routing target are returned to the frontend.
//   The AE approves or overrides before any message is sent.
//   Call POST /api/events/:eventId/route to complete the routing after confirmation.
//
// Confidence < 0.60: manual_required.
//   No suggested target is provided. The raw event surfaces on the AE dashboard.
//   Call POST /api/events/:eventId/route with the AE-selected target to dispatch.
router.post(
  '/',
  async (
    req: Request<object, object, SubmitEventBody>,
    res: Response
  ): Promise<void> => {
    const {
      message,
      senderWorkspaceId,
      senderName,
      senderRole,
      dealId,
      conversationId,
    } = req.body;

    if (!message || !senderWorkspaceId || !senderName || !senderRole || !dealId) {
      res.status(400).json({
        success: false,
        message:
          'message, senderWorkspaceId, senderName, senderRole, and dealId are all required.',
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

    // Generate a short, readable event ID for tracking across the frontend and logs.
    const eventId = `evt_${uuid().replace(/-/g, '').slice(0, 8)}`;
    const timestamp = new Date().toISOString();

    // Step 1: Classify the event with Claude.
    // This uses the exact classification system prompt from blueprint Section 8.
    let classification;
    try {
      classification = await classifyEvent(message, {
        dealName: deal.dealName,
        stage: deal.stage,
        senderRole,
        senderName,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: `Event classification failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
      return;
    }

    // Step 2: Apply the confidence threshold to determine the routing path.
    const routingDecision = getRoutingDecision(classification.confidence);

    // Step 3: Resolve the correct Aicoo message target from the category.
    // Legal, technical, commercial, and relationship events use direct synchronous RPC (_coo suffix).
    // Escalation events use group broadcast (no _coo suffix, asynchronous, no response loop).
    const routingTarget = getRoutingTarget(classification.category, dealId);

    // Build the log entry and persist it before attempting any dispatch.
    // This ensures the event is recoverable even if the agentMessage call fails.
    const logEntry: EventLogEntry = {
      eventId,
      timestamp,
      rawMessage: message,
      senderWorkspaceId,
      classification,
      routingDecision,
      routedTo: routingTarget,
      status: 'pending',
    };

    await appendEventLog(dealId, logEntry);

    // Step 4: Act on the routing decision.
    if (routingDecision === 'auto_routed') {
      const routingMessage = buildRoutingMessage(
        message,
        classification,
        deal.dealName,
        deal.stage
      );

      const convId = conversationId ?? `conv_${dealId}_${eventId}`;

      try {
        // Dispatch to the target agent.
        // For group targets (escalation), agentMessage is asynchronous and the
        // response body will not contain a meaningful agent response.
        const agentResponse = await agentMessage(
          routingTarget,
          routingMessage,
          convId
        );

        // Accumulate the resolved event into the AE workspace as a delta.
        // The AE context stays current without any manual intervention.
        await accumulateEventDelta(dealId, {
          eventId,
          timestamp,
          from: senderWorkspaceId,
          category: classification.category,
          summary: classification.summary,
          routedTo: routingTarget,
          status: 'responded',
        });

        await updateEventStatus(dealId, eventId, 'responded');

        res.json({
          success: true,
          data: {
            eventId,
            routingDecision: 'auto_routed',
            routedTo: routingTarget,
            classification,
            // For group targets, agentResponse.response will be empty.
            // isGroupTarget distinguishes this in the frontend.
            agentResponse: isGroupTarget(routingTarget)
              ? null
              : agentResponse.response,
            conversationId: convId,
          },
        });
        return;
      } catch (err) {
        // Dispatch failed. Downgrade to manual_required so the AE can intervene.
        console.error(
          `Auto-routing dispatch failed for event ${eventId}:`,
          err instanceof Error ? err.message : err
        );

        res.json({
          success: true,
          data: {
            eventId,
            routingDecision: 'manual_required',
            routedTo: null,
            classification,
            requiresHumanAction: true,
            dispatchError:
              'Auto-routing failed during agentMessage dispatch. Manual routing required.',
          },
        });
        return;
      }
    }

    // human_confirmed and manual_required: return the classification result.
    // No message has been sent yet. The AE reviews and calls POST /:eventId/route.
    res.json({
      success: true,
      data: {
        eventId,
        routingDecision,
        // For human_confirmed, include the suggested target so the AE can confirm it in one click.
        // For manual_required, suggestedTarget is null and the AE picks from a dropdown.
        suggestedTarget:
          routingDecision === 'human_confirmed' ? routingTarget : null,
        classification,
        requiresHumanAction: true,
      },
    });
  }
);

// ─── POST /api/events/:eventId/route ──────────────────────────────────────────
// Human-confirmed routing path.
// Called when the AE confirms the suggested target (human_confirmed)
// or manually selects a target (manual_required) from the dashboard.
//
// This is the explicit human-approval gate required by coordination checkpoint #5.
// No message is dispatched to an agent until a human has reviewed and confirmed
// the routing decision for any event with confidence below 0.80.
router.post(
  '/:eventId/route',
  async (
    req: Request<
      { eventId: string },
      object,
      ManualRouteBody
    >,
    res: Response
  ): Promise<void> => {
    const { eventId } = req.params;
    const { targetWorkspaceId, confirmedBy, dealId, conversationId } = req.body;

    if (!targetWorkspaceId || !confirmedBy || !dealId) {
      res.status(400).json({
        success: false,
        message: 'targetWorkspaceId, confirmedBy, and dealId are all required.',
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

    // Retrieve the original event from the log to get the raw message and classification.
    const eventLog = await getEventLog(dealId);
    const event = eventLog.find((e) => e.eventId === eventId);

    if (!event) {
      res.status(404).json({
        success: false,
        message:
          `Event ${eventId} not found in the log for deal ${dealId}. ` +
          `Confirm the eventId is correct and belongs to this deal.`,
      });
      return;
    }

    if (event.status === 'responded' || event.status === 'resolved') {
      res.status(409).json({
        success: false,
        message:
          `Event ${eventId} has already been routed (status: ${event.status}). ` +
          `Routing the same event twice would send a duplicate message to the target agent.`,
      });
      return;
    }

    const routingMessage = buildRoutingMessage(
      event.rawMessage,
      event.classification,
      deal.dealName,
      deal.stage
    );

    const convId =
      conversationId ?? `conv_${dealId}_${eventId}`;

    let agentResponse;
    try {
      agentResponse = await agentMessage(
        targetWorkspaceId,
        routingMessage,
        convId
      );
    } catch (err) {
      res.status(500).json({
        success: false,
        message: `agentMessage dispatch failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
      return;
    }

    // Accumulate the human-confirmed event into the AE workspace context.
    await accumulateEventDelta(dealId, {
      eventId,
      timestamp: event.timestamp,
      from: event.senderWorkspaceId,
      category: event.classification.category,
      summary: event.classification.summary,
      routedTo: targetWorkspaceId,
      status: 'responded',
    });

    await updateEventStatus(dealId, eventId, 'responded');
    await touchDeal(dealId);

    res.json({
      success: true,
      data: {
        eventId,
        routedTo: targetWorkspaceId,
        confirmedBy,
        routingDecision: 'human_confirmed',
        agentResponse: isGroupTarget(targetWorkspaceId)
          ? null
          : agentResponse.response,
        conversationId: convId,
      },
    });
  }
);

// ─── Internal Utilities ───────────────────────────────────────────────────────

// Builds the structured routing message sent to the receiving agent.
// Includes classification context so the receiving agent is pre-informed
// of the event type, summary, and suggested action without reading the full context.
function buildRoutingMessage(
  originalMessage: string,
  classification: EventLogEntry['classification'],
  dealName: string,
  stage: string
): string {
  return `Routed deal event requiring your attention.

Deal: ${dealName}
Stage: ${stage}
Category: ${classification.category}
Summary: ${classification.summary}
Suggested action: ${classification.suggestedAction}

Original message:
${originalMessage}`;
}

// Accumulates a single resolved deal event as a delta into the AE workspace.
// The AE agent maintains running context of all deal events, enabling the
// pre-call briefing to reflect the full deal history without manual updates.
// Silently swallows accumulate errors to avoid blocking the event routing response.
async function accumulateEventDelta(
  dealId: string,
  dealEvent: DealEvent
): Promise<void> {
  const aeWorkspaceId = wsId(dealId, 'ae');
  try {
    await agentAccumulate(aeWorkspaceId, {
      dealEvents: [dealEvent],
    });
  } catch (err) {
    // Accumulate failure is not fatal: the event is already in the Redis log.
    // The AE context may lag by one event, but routing has succeeded.
    console.error(
      `Delta accumulate to ${aeWorkspaceId} failed for event ${dealEvent.eventId}:`,
      err instanceof Error ? err.message : err
    );
  }
}

export default router;
