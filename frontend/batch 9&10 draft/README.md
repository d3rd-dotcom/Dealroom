# Batch 9 and 10 Draft Material

These three files were generated before Batch 7 and 8 were reconciled into a
real Next.js src structure. They are real, usable component code, not
placeholders, but they reference things that do not exist yet:

- `index (2).tsx`: the EventFeed component (Batch 9). Imports from `../ui`,
  needs to move to `src/components/events/index.tsx` and import from
  `@/components/ui` instead. Also references `DealEvent.classification` and
  `DealEvent.routingDecision`, which are not on the real `DealEvent` type in
  `src/lib/types.ts`. The real event log entry shape with those fields is
  `SubmitEventResponseData` (one event) or the backend's `EventLogEntry`
  (the full log). Decide whether to extend `DealEvent` or have EventFeed
  consume `EventLogEntry` instead before wiring this in.

- `index (3).tsx`: BuyerInvitePanel, ConnectionStatusPanel, PreCallBriefing,
  CalendarBooking (Batch 10). Same `../ui` import fix needed. These call into
  a `buyerApi` and `coordinationApi` that do not exist in `src/lib/api.ts`.
  The real equivalents are `connectionsApi.invite`, `.buyerInit`, `.connect`,
  `.accept` from Batch 6. The four step real flow (invite, buyer-init,
  connect, accept) is more granular than what this draft assumes (a two
  step invite and accept), so the panel logic needs rewriting, not just an
  import fix.

- `page (2).tsx`: the full tabbed deal dashboard (Overview, Agent Network,
  Events, Coordination), built against the two files above plus a
  `MOCK_DEAL` and `MOCK_CONTEXT` fallback. Once EventFeed and the buyer
  panels are reconciled, merge this with the real
  `src/app/deals/[dealId]/page.tsx` from Batch 8, which currently only
  renders the Overview and Agent Network equivalents. Remove the mock data
  fallback once the real event submission and buyer flows are wired to
  `eventsApi.submit` and `connectionsApi`.

None of these were deleted. They were moved here, and excluded from the
TypeScript build via `tsconfig.json`, so the Batch 7 and 8 deliverable
compiles cleanly while this work waits for its own session.
