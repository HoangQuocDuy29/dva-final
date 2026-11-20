import zlib from 'zlib';
import type { CorsOptions } from 'cors';
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { env, isProd } from '../config/env';
import { HttpError } from '../utils/validation';
import { dbCircuitBreaker } from '../config/prisma';

/** Async route helper: forwards rejected promises to Express global error handler. */
export const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => any): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/** Helmet-equivalent HTTP security headers (dependency-free). */
export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (isProd()) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
};

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'https://dvavolleyball.com',
];

const allowedOrigins = Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...env.clientUrls]));

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.trim().replace(/\/+$/, '');
    const isWhitelisted = allowedOrigins.includes(cleanOrigin) || /\.vercel\.app$/.test(cleanOrigin);
    const isLocalDev = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin);
    if (isWhitelisted || isLocalDev) {
      return callback(null, true);
    }
    console.warn(`[CORS Blocked] Origin rejected: ${origin}`);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200,
};

/**
 * Dependency-free HTTP compression middleware (Brotli + Gzip via Node `zlib`).
 * Compresses JSON/text responses >= 1024 bytes while preserving headers & streaming behavior.
 */
export const compressionMiddleware: RequestHandler = (req, res, next) => {
  if (req.method === 'HEAD') return next();
  const acceptEncoding = String(req.headers['accept-encoding'] || '').toLowerCase();
  const useBr = acceptEncoding.includes('br');
  const useGzip = !useBr && acceptEncoding.includes('gzip');
  if (!useBr && !useGzip) return next();

  const origJson = res.json.bind(res);
  const origSend = res.send.bind(res);

  const sendCompressed = (body: string | Buffer, fallback: (data: any) => Response): Response => {
    if (res.headersSent || res.getHeader('Content-Encoding')) {
      return fallback(body);
    }
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf-8');
    if (buf.length < 1024) {
      return fallback(body);
    }
    try {
      const compressed = useBr
        ? zlib.brotliCompressSync(buf, {
            params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 },
          })
        : zlib.gzipSync(buf, { level: 6 });

      res.removeHeader('Content-Length');
      res.setHeader('Content-Encoding', useBr ? 'br' : 'gzip');
      res.vary('Accept-Encoding');
      res.setHeader('Content-Length', String(compressed.length));
      return origSend(compressed);
    } catch {
      return fallback(body);
    }
  };

  res.json = ((payload: any) => {
    if (res.headersSent || res.getHeader('Content-Encoding')) {
      return origJson(payload);
    }
    const serialized = JSON.stringify(payload);
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    return sendCompressed(serialized, () => origJson(payload));
  }) as typeof res.json;

  res.send = ((body?: any) => {
    if (res.headersSent || res.getHeader('Content-Encoding')) {
      return origSend(body);
    }
    if (typeof body === 'string') {
      const ct = String(res.getHeader('Content-Type') || '');
      if (!ct || /text|json|javascript|xml|svg/i.test(ct)) {
        return sendCompressed(body, origSend);
      }
    }
    return origSend(body);
  }) as typeof res.send;

  next();
};

/** In-memory sliding-window rate limiter. */
export function rateLimit(opts: {
  windowMs: number;
  max: number;
  key?: (req: Request) => string;
  message?: string;
}): RequestHandler {
  const hits = new Map<string, { count: number; reset: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, Math.min(opts.windowMs, 60_000)).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = opts.key ? opts.key(req) : req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      hits.set(key, { count: 1, reset: now + opts.windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > opts.max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return void res.status(429).json({ error: opts.message || 'Too many requests. Please try again later.' });
    }
    next();
  };
}

export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  key: (req) => `${req.ip}|${String(req.body?.email || '').toLowerCase()}`,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

export const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  key: (req) => `${req.ip}|${req.user?.id || 'anon'}`,
  message: 'Too many password change attempts. Please try again in 15 minutes.',
});

export const publicWriteLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: 30,
  message: 'Too many submissions. Please slow down.',
});

export const vietQrLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: 60,
  message: 'Too many QR generation requests. Please slow down.',
});

export const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  message: 'Too many webhook requests.',
});

/** Short-circuit /api requests while DB circuit breaker is OPEN. */
export const circuitBreakerGuard: RequestHandler = (_req, res, next) => {
  const attempt = dbCircuitBreaker.canAttempt();
  if (!attempt.allowed) {
    res.setHeader('Retry-After', String(attempt.retryAfterSec));
    return void res.status(503).json({
      error: 'Database is temporarily unavailable. Please try again shortly.',
    });
  }
  if (attempt.wasHalfOpen) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        dbCircuitBreaker.markSuccess();
      }
    });
  }
  next();
};

export const notFoundApiHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
};

export const globalErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof HttpError) {
    return void res.status(err.status).json({ error: err.message });
  }
  if (err?.type === 'entity.parse.failed') {
    return void res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err?.type === 'entity.too.large') {
    return void res.status(413).json({ error: 'Request body too large' });
  }
  if (typeof err?.message === 'string' && err.message.startsWith('[CORS Blocked]')) {
    return void res.status(403).json({ error: err.message });
  }
  // Common Prisma integrity errors -> clean 4xx JSON without leaking DB internals
  if (err?.code === 'P2002') {
    return void res.status(409).json({ error: 'A record with this unique value already exists.' });
  }
  if (err?.code === 'P2003') {
    return void res.status(409).json({ error: 'Operation violates a reference constraint.' });
  }
  if (err?.code === 'P2025') {
    return void res.status(404).json({ error: 'Requested record was not found.' });
  }

  if (dbCircuitBreaker.trip(err)) {
    const attempt = dbCircuitBreaker.canAttempt();
    if (!attempt.allowed) {
      res.setHeader('Retry-After', String(attempt.retryAfterSec));
    }
    return void res.status(503).json({
      error: 'Database is temporarily unavailable due to quota or connection limit. Please try again shortly.',
    });
  }

  if (isProd()) {
    console.error('[Server Error]', err?.message || err);
  } else {
    console.error('[Server Error]', err);
  }
  res.status(500).json({ error: 'Internal server error' });
};
