import { Redis } from '@upstash/redis';

// Singleton Redis client. Upstash's client talks over REST/HTTP, so there is
// no connection pool to manage. One instance is safe to import and reuse
// across every route handler and repository module.
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
