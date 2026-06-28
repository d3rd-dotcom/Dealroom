# DealRoom Team Coordination Heartbeat

## Check Interval: Every 15 minutes during active build hours

---

## Team Coordination Check

Scan the todos list for any tasks marked overdue or blocked.

Check the Express server process for failed API calls in the last 15 minutes. Look for 500 responses on /agent/init, /agent/accumulate, /share/create, /network/request, and /agent/message.

Verify the Upstash Redis connection is returning OK. A failed Redis connection will break deal registry reads, event log appends, tools cache lookups, and connection status checks simultaneously.

Check for unresolved classification errors in the routing event log. Look for events where routingDecision is manual_required that have been sitting in pending status for more than 30 minutes without a human route call.

Check for any failed /agent/init calls with initStatus "failed" in the deal registry. A stakeholder with a failed workspace cannot receive routed events and will silently drop all messages addressed to them.

Check for any missing tools cache entries for active deals. If getToolsCache returns null for a deal, the calendar availability flag cannot be confirmed and the scheduling UI will be stuck in the setup alert state.

Confirm the ANTHROPIC_API_KEY and AICOO_API_KEY environment variables are loaded. A missing key causes every classification call and every Aicoo API call to throw on the auth header check before any network request is made.

---

## Blocker Response

If any blocker is detected: post a summary to the team workspace channel, name the specific failing task, name the affected route or module, and propose one concrete next action to unblock.

If all checks are clear: respond with HEARTBEAT_OK

---

## Priority Flags

CRITICAL: Any failed /agent/init that blocks a demo stakeholder workspace. Retry init immediately and re-run accumulate with the initial context payload.

HIGH: Redis connection failure. All routes that read from or write to Redis will return 500. Confirm UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.

HIGH: Classification returning invalid JSON. The POST /api/events route will 500 on every incoming event. Check the system prompt in classifier.ts and confirm the model is not prepending markdown fences.

MEDIUM: Calendar namespace absent from tools list after deal creation. Surface the setup alert in the frontend and note the Aicoo dashboard step required before the scheduling demo step will work.

LOW: Delta accumulate failure after event routing. The event is already in the Redis log. The AE context lags by one event but routing has succeeded. Log the error and continue.

---

## Build Progress Snapshot

Update this section at each phase transition during the hackathon build.

Hours 0 to 2: Environment verified, /agent/init returns 200, GET /tools returns tool list.
Hours 2 to 4: POST /api/deals provisions stakeholders end to end, POST /api/events classifies and routes.
Hours 4 to 6: Frontend forms render, deal creation flow works in the browser.
Hours 6 to 7: Full demo flow runs from deal creation to event routing to context accumulation.
Hours 7 to 8: Demo recorded, README complete, submission copy finalized.
