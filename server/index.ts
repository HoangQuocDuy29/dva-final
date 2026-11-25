import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { ROOT_DIR, env } from './config/env';
import { dbCircuitBreaker, ensurePostgreSQLSeeded, prisma } from './config/prisma';
import { apiAccessPolicy, assertSecurityConfig, attachAuth } from './middlewares/auth.middleware';
import {
  circuitBreakerGuard,
  compressionMiddleware,
  corsOptions,
  globalErrorHandler,
  notFoundApiHandler,
  securityHeaders,
} from './middlewares/error.middleware';
import { extractConciseErrorMessage } from './utils/bookingHolds';
import { authRouter } from './modules/auth/auth.routes';
import { playersRouter } from './modules/players/players.routes';
import { tryoutsRouter } from './modules/tryouts/tryouts.routes';
import { tournamentsRouter } from './modules/tournaments/tournaments.routes';
import { bookingsRouter } from './modules/bookings/bookings.routes';
import { storeRouter } from './modules/store/store.routes';
import { contentRouter } from './modules/content/content.routes';
import { integrationsRouter } from './modules/integrations/sheets.routes';
import { venuesRouter } from './modules/venues/venues.routes';
import { leadershipRouter } from './modules/leadership/leadership.routes';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
assertSecurityConfig();

export const app = express();

if (env.trustProxy) {
  app.set('trust proxy', Number(env.trustProxy) || env.trustProxy);
}
app.disable('x-powered-by');
app.use(securityHeaders);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(compressionMiddleware);
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Health Check Endpoint (Cloud uptime monitor — intentionally DB-free)
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    database: dbCircuitBreaker.isOpen() ? 'degraded' : 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Unified /api pipeline: circuit breaker -> JWT attach -> default-deny RBAC policy -> domain routers
app.use('/api', circuitBreakerGuard, attachAuth, apiAccessPolicy);
app.use('/api', authRouter);
app.use('/api', playersRouter);
app.use('/api', tryoutsRouter);
app.use('/api', tournamentsRouter);
app.use('/api', bookingsRouter);
app.use('/api', storeRouter);
app.use('/api', contentRouter);
app.use('/api', integrationsRouter);
app.use('/api', venuesRouter);
app.use('/api', leadershipRouter);

app.use('/api', notFoundApiHandler);
app.use(globalErrorHandler);

async function setupViteOrStatic(): Promise<void> {
  if (env.nodeEnv !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/data/**', '**/*.json', '**/public/assets/**', '**/dist/**', '**/node_modules/**'],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Server] Vite middleware mounted in dev mode');
    return;
  }

  const distPath = fs.existsSync(path.resolve(__dirname, 'index.html'))
    ? __dirname
    : path.resolve(ROOT_DIR, 'dist');
  app.use(express.static(distPath, { maxAge: '7d', etag: true }));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

async function startServer(): Promise<void> {
  await prisma.$connect().catch((err) => {
    dbCircuitBreaker.trip(err);
    console.warn('[Database] Initial PostgreSQL connection warning:', extractConciseErrorMessage(err));
  });

  await setupViteOrStatic();

  const httpServer = app.listen(env.port, '0.0.0.0', () => {
    console.log(`[BACKEND] DVA Volleyball Club Server running on port ${env.port}`);
    console.log(`[Database] PostgreSQL (Prisma ORM) | Pool max=${env.pgPoolMax}`);
    void ensurePostgreSQLSeeded().catch((err) => {
      dbCircuitBreaker.trip(err);
      console.warn('[Database] Background seed warning:', extractConciseErrorMessage(err));
    });
  });

  const shutdown = () => {
    httpServer.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(0), 1500).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
});

if (process.env.NO_LISTEN !== '1') {
  void startServer().catch((err) => {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  });
}
