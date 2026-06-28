import { redis } from './client.js';
import type { AicooTool } from '../types/index.js';

function toolsKey(dealId: string): string {
  return `deal:${dealId}:tools`;
}

// Must match the tool name exactly as returned by GET /tools. Per blueprint
// Section 7 Endpoint 7, this namespace must be explicitly enabled per
// workspace in the Aicoo dashboard before it appears in that response, so its
// absence is an expected, normal state, not an error.
export const CALENDAR_TOOL_NAME = 'calendar.schedule_meeting';

export function hasCalendarTool(tools: AicooTool[]): boolean {
  return tools.some(t => t.name === CALENDAR_TOOL_NAME);
}

// Stores the live tool list and returns whether the calendar tool was present,
// so callers can set DealRegistry.calendarEnabled in the same pass.
export async function setToolsCache(dealId: string, tools: AicooTool[]): Promise<boolean> {
  await redis.set(toolsKey(dealId), tools);
  return hasCalendarTool(tools);
}

export async function getToolsCache(dealId: string): Promise<AicooTool[] | null> {
  const tools = await redis.get<AicooTool[]>(toolsKey(dealId));
  return tools ?? null;
}
