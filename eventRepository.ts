import { redis } from './client.js';
import { appError } from '../middleware/errorHandler.js';
import type { EventLogEntry } from '../types/index.js';

function eventsKey(dealId: string): string {
  return `events:${dealId}`;
}

export async function getEvents(dealId: string): Promise<EventLogEntry[]> {
  const events = await redis.get<EventLogEntry[]>(eventsKey(dealId));
  return events ?? [];
}

export async function getEvent(
  dealId: string,
  eventId: string
): Promise<EventLogEntry | null> {
  const events = await getEvents(dealId);
  return events.find(e => e.eventId === eventId) ?? null;
}

export async function appendEvent(dealId: string, entry: EventLogEntry): Promise<void> {
  const events = await getEvents(dealId);
  events.push(entry);
  await redis.set(eventsKey(dealId), events);
}

export async function updateEventStatus(
  dealId: string,
  eventId: string,
  status: EventLogEntry['status'],
  routedTo?: string
): Promise<EventLogEntry> {
  const events = await getEvents(dealId);
  const idx = events.findIndex(e => e.eventId === eventId);

  if (idx === -1) {
    throw appError(`Event ${eventId} not found on deal ${dealId}.`, 404);
  }

  events[idx] = {
    ...events[idx],
    status,
    ...(routedTo ? { routedTo } : {}),
  };

  await redis.set(eventsKey(dealId), events);
  return events[idx];
}
