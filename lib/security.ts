import crypto from 'crypto';
import bcrypt from 'bcrypt';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { User, UserRole } from '../src/types';

/**
 * Auth + access-control primitives:
 *  - bcrypt password hashing (with legacy scrypt verification fallback)
 *  - HS256 JWT sign/verify
 *  - role based access policy (default-deny for every non-public write)
 *  - in-memory rate limiter & security headers
 */

export interface StoredUser extends User {
  passwordHash?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: StoredUser;
    }
  }
}

// ---------------------------------------------------------------- secrets
const IS_PROD = () => process.env.NODE_ENV === 'production';
let cachedSecret: string | null = null;

function getSecret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv) {
    if (IS_PROD() && fromEnv.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
    cachedSecret = fromEnv;
  } else if (IS_PROD()) {
    throw new Error('JWT_SECRET environment variable is required in production');
  } else {
    cachedSecret = crypto.randomBytes(48).toString('hex');
    console.warn('[Security] JWT_SECRET is not set - using an ephemeral secret (all sessions reset on restart).');
  }
  return cachedSecret;
}

/** Call at boot so a misconfigured production deploy fails fast. */
export function assertSecurityConfig() {
  getSecret();
}

// -------------------------------------------------------------- passwords
export const BCRYPT_SALT_ROUNDS = 10;
const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$.{53}$/;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

export function isBcryptHash(value?: string | null): boolean {
  return typeof value === 'string' && BCRYPT_HASH_REGEX.test(value);
}

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, SCRYPT_PARAMS, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  if (isBcryptHash(stored)) {
    return bcrypt.compare(password, stored);
  }
  if (stored.startsWith('scrypt$')) {
    const [scheme, saltB64, keyB64] = stored.split('$');
    if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;
    const expected = Buffer.from(keyB64, 'base64');
    const actual = await scrypt(password, Buffer.from(saltB64, 'base64'));
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }
  return false;
}

// Used to keep login timing similar whether or not the email exists.
export const DUMMY_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

// -------------------------------------------------------------------- JWT
interface TokenPayload {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

export function signToken(user: { id: string; role: UserRole }): string {
  const ttlHours = Number(process.env.JWT_EXPIRES_IN_HOURS) || 24;
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = { sub: user.id, role: user.role, iat: now, exp: now + ttlHours * 3600 };
  const body = `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify(payload))}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = crypto.createHmac('sha256', getSecret()).update(`${h}.${p}`).digest();
  const given = Buffer.from(s, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const header = JSON.parse(Buffer.from(h, 'base64url').toString());
    if (header.alg !== 'HS256') return null;
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString()) as TokenPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function publicUser(user: StoredUser): User {
  const { passwordHash: _omit, ...rest } = user;
  return rest;
}

// ------------------------------------------------------------ middleware
type UserLookupFn = (id: string) => Promise<StoredUser | undefined> | StoredUser | undefined;
let userLookup: UserLookupFn = () => undefined;
export function setUserLookup(fn: UserLookupFn) {
  userLookup = fn;
}

/** Resolves `req.user` from the Bearer token. The role is read from the PostgreSQL user table, not the token. */
export const attachAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const payload = verifyToken(header.slice(7));
      if (payload) req.user = await userLookup(payload.sub);
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const isStaff = (user?: StoredUser) => !!user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN');

type Rule = { method: string; path: RegExp };
const rule = (method: string, path: RegExp): Rule => ({ method, path });

// Anything not listed here requires ADMIN (default-deny).
const PUBLIC_RULES: Rule[] = [
  rule('GET', /^\/players\/?$/),
  rule('GET', /^\/courts\/?$/),
  rule('GET', /^\/courts\/closed-slots\/?$/),
  rule('GET', /^\/news(\/[^/]+)?\/?$/),
  rule('GET', /^\/coaches\/?$/),
  rule('GET', /^\/training\/courses\/?$/),
  rule('GET', /^\/bookings\/?$/), // handler strips personal data for non-staff
  rule('POST', /^\/auth\/login\/?$/),
  rule('POST', /^\/auth\/forgot-password\/?$/),
  rule('POST', /^\/auth\/verify-otp\/?$/),
  rule('POST', /^\/bookings\/?$/),
  rule('POST', /^\/bookings\/[^/]+\/confirm-payment\/?$/),
  rule('POST', /^\/training\/register\/?$/),
  rule('POST', /^\/members\/register\/?$/),
  rule('POST', /^\/vietqr\/generate\/?$/),
  rule('POST', /^\/webhooks\/payment\/?$/),
];

const SUPERADMIN_RULES: Rule[] = [rule('GET', /^\/sheets\/config\/?$/), rule('POST', /^\/sheets\/config\/?$/)];

const matches = (rules: Rule[], method: string, path: string) =>
  rules.some((r) => r.method === method && r.path.test(path));

/** Mounted at `/api`; `req.path` is therefore relative to it. */
export const apiAccessPolicy: RequestHandler = (req, res, next) => {
  const method = req.method.toUpperCase();
  if (method === 'OPTIONS' || method === 'HEAD') return next();
  if (matches(PUBLIC_RULES, method, req.path)) return next();

  if (!req.user) return void res.status(401).json({ error: 'Authentication required.' });
  if (req.path === '/auth/me') return next();

  const required: UserRole = matches(SUPERADMIN_RULES, method, req.path) ? 'SUPERADMIN' : 'ADMIN';
  const role = req.user.role;
  const allowed = required === 'SUPERADMIN' ? role === 'SUPERADMIN' : role === 'ADMIN' || role === 'SUPERADMIN';
  if (!allowed) return void res.status(403).json({ error: 'You do not have permission to perform this action.' });
  next();
};

// ----------------------------------------------------------- rate limiting
export function rateLimit(opts: { windowMs: number; max: number; key?: (req: Request) => string; message?: string }): RequestHandler {
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

export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (IS_PROD()) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
};
