import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';

// Validate required environment variables before starting the server.
// A missing key at startup is much easier to debug than a runtime 401.
const REQUIRED_ENV = [
  'AICOO_API_KEY',
  'AICOO_BASE_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'ANTHROPIC_API_KEY',
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(
      `Missing required environment variable: ${key}. Copy .env.example to .env and fill in all values.`
    );
  }
}

// Routes are imported after env validation so that module-level clients
// (Redis, Anthropic, Aicoo) are initialized with confirmed credentials.
const { default: dealsRouter } = await import('./routes/deals.js');
const { default: connectionsRouter } = await import('./routes/connections.js');
const { default: eventsRouter } = await import('./routes/events.js');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// CORS: restrict to the Next.js frontend in production.
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Parse JSON bodies up to 10 MB to accommodate large transcript inputs.
app.use(express.json({ limit: '10mb' }));

// Health check. Used by Railway and Render for uptime monitoring.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route mounting.
// Both dealsRouter and connectionsRouter mount at /api/deals.
// Express resolves them independently: dealsRouter owns /, /:dealId, /:dealId/context, /:dealId/tools, /:dealId/briefing/:workspaceId.
// connectionsRouter owns /:dealId/invite, /:dealId/buyer-init, /:dealId/connect, /:dealId/accept.
app.use('/api/deals', dealsRouter);
app.use('/api/deals', connectionsRouter);
app.use('/api/events', eventsRouter);

// Global error handler must be the last middleware registered.
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`DealRoom backend running on port ${PORT} in ${process.env.NODE_ENV} mode.`);
});

export default app;
