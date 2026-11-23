import crypto from 'crypto';
import bcrypt from 'bcrypt';
import type { RequestHandler } from 'express';
import type { User, UserRole } from '../../src/types';
import { env, isProd, validateEnv } from '../config/env';

/**
 * Auth + access-control primitives:
 *  - bcrypt password hashing (with legacy scrypt verification fallback)
 *  - HS256 JWT sign/verify
 *  - role-based default-deny policy for /api routes
 */

export interface StoredUser extends User {
  passwordHash?: string;
  tokenVersion?: number;
}

export type AuthFailReason = 'SUSPENDED' | 'REVOKED';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: StoredUser;
      tokenInvalidated?: boolean;
      authFailReason?: AuthFailReason;
    }
  }
}

export function getUnauthorizedErrorMessage(req: Express.Request): string {
  if (req.authFailReason === 'SUSPENDED') {
    return 'Tài khoản đã bị tạm khóa. Vui lòng liên hệ Superadmin.';
  }
  if (req.authFailReason === 'REVOKED' || req.tokenInvalidated) {
    return 'Session expired because your account credentials or session changed. Please sign in again.';
  }
  return 'Authentication required.';
}

let cachedSecret: string | null = null;

function getSecret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv) {
    if (isProd() && fromEnv.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
    cachedSecret = fromEnv;
  } else if (isProd()) {
    throw new Error('JWT_SECRET environment variable is required in production');
  } else {
    cachedSecret = crypto.randomBytes(48).toString('hex');
    console.warn('[Security] JWT_SECRET is not set - using an ephemeral secret (all sessions reset on restart).');
  }
  return cachedSecret;
}

/** Call at boot so a misconfigured production deploy fails fast. */
export function assertSecurityConfig(): void {
  validateEnv();
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

export const DUMMY_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

// -------------------------------------------------------------------- JWT
interface TokenPayload {
  sub: string;
  role: UserRole;
  tokenVersion: number;
  iat: number;
  exp: number;
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

export function signToken(user: { id: string; role: UserRole; tokenVersion?: number }): string {
  const ttlHours = env.jwtExpiresInHours;
  const now = Math.floor(Date.now() / 1000);
  const tokenVersion = typeof user.tokenVersion === 'number' ? user.tokenVersion : 1;
  const payload: TokenPayload = {
    sub: user.id,
    role: user.role,
    tokenVersion,
    iat: now,
    exp: now + ttlHours * 3600,
  };
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
  const { passwordHash: _omitPassword, tokenVersion: _omitTokenVersion, ...rest } = user;
  return rest;
}

// ------------------------------------------------------------ middleware
type UserLookupFn = (id: string) => Promise<StoredUser | undefined> | StoredUser | undefined;
let userLookup: UserLookupFn = () => undefined;

export function setUserLookup(fn: UserLookupFn): void {
  userLookup = fn;
}

/**
 * Resolves `req.user` from the Bearer token.
 * Role, `isActive`, and `tokenVersion` are always verified against PostgreSQL
 * (via short-TTL cache invalidated on mutations). Any suspension or `tokenVersion`
 * mismatch rejects the session with 401 so old devices are logged out immediately.
 */
export const attachAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const payload = verifyToken(header.slice(7).trim());
      if (payload) {
        const user = await userLookup(payload.sub);
        if (user) {
          if (user.isActive === false) {
            req.tokenInvalidated = true;
            req.authFailReason = 'SUSPENDED';
          } else {
            const currentVersion = typeof user.tokenVersion === 'number' ? user.tokenVersion : 1;
            if (typeof payload.tokenVersion === 'number' && payload.tokenVersion === currentVersion) {
              req.user = user;
            } else {
              req.tokenInvalidated = true;
              req.authFailReason = 'REVOKED';
            }
          }
        }
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const isStaff = (user?: StoredUser) => !!user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN');
export const isSuperAdmin = (user?: StoredUser) => !!user && user.role === 'SUPERADMIN';

type Rule = { method: string; path: RegExp };
const rule = (method: string, path: RegExp): Rule => ({ method, path });

// Anything not listed here requires ADMIN or SUPERADMIN (default-deny).
const PUBLIC_RULES: Rule[] = [
  rule('GET', /^\/home\/summary\/?$/),
  rule('GET', /^\/players\/?$/),
  rule('GET', /^\/courts\/?$/),
  rule('GET', /^\/courts\/closed-slots\/?$/),
  rule('GET', /^\/news(\/[^/]+)?\/?$/),
  rule('GET', /^\/coaches\/?$/),
  rule('GET', /^\/training\/courses\/?$/),
  rule('GET', /^\/bookings\/?$/),
  rule('POST', /^\/auth\/login\/?$/),
  rule('POST', /^\/auth\/forgot-password\/?$/),
  rule('POST', /^\/auth\/verify-otp\/?$/),
  rule('POST', /^\/bookings\/?$/),
  rule('POST', /^\/courts\/book\/?$/),
  rule('POST', /^\/bookings\/[^/]+\/confirm-payment\/?$/),
  rule('POST', /^\/training\/register\/?$/),
  rule('POST', /^\/members\/(register|apply)\/?$/),
  rule('POST', /^\/vietqr\/generate\/?$/),
  rule('POST', /^\/webhooks\/payment\/?$/),
  rule('GET', /^\/store\/products\/?$/),
  rule('GET', /^\/store\/products\/[^/]+\/?$/),
  rule('POST', /^\/store\/orders\/?$/),
  rule('POST', /^\/store\/orders\/[^/]+\/confirm-payment\/?$/),
  rule('GET', /^\/tournaments\/?$/),
  rule('GET', /^\/tournaments\/[^/]+\/?$/),
  rule('POST', /^\/tournaments\/[^/]+\/register\/?$/),
  rule('POST', /^\/tournaments\/[^/]+\/teams\/[^/]+\/confirm-payment\/?$/),
  rule('GET', /^\/venues\/?$/),
  rule('GET', /^\/venues\/teams\/[^/]+\/?$/),
];

// Explicit allowlist for the restricted ADMIN role (default-deny for all other admin/finance/delete routes).
// SUPERADMIN has full access to all authenticated admin routes; ADMIN is strictly scoped to:
//   1. Overview (non-financial counts only)
//   2. Tournaments (Read-only GET, stripped of contacts & financials)
//   3. News & Media (Create/Update + Cloudinary sign; NO Delete)
//   4. Tryout Applications (Contact- & fee-stripped GET, Scorecard Evaluation, Schedule/Result Email; NO Paid/Waive/Delete)
const ADMIN_ALLOWED_RULES: Rule[] = [
  rule('GET', /^\/admin\/overview-summary\/?$/),
  rule('GET', /^\/members\/applications\/?$/),
  rule('PATCH', /^\/admin\/tryouts\/[^/]+\/?$/),
  rule('PATCH', /^\/members\/applications\/[^/]+\/status\/?$/),
  rule('PATCH', /^\/members\/applications\/[^/]+\/evaluate\/?$/),
  rule('PATCH', /^\/admin\/tryouts\/[^/]+\/evaluate\/?$/),
  rule('POST', /^\/members\/applications\/[^/]+\/schedule-tryout\/?$/),
  rule('POST', /^\/admin\/tryouts\/[^/]+\/send-email\/?$/),
  rule('POST', /^\/news\/?$/),
  rule('PUT', /^\/news\/[^/]+\/?$/),
  rule('POST', /^\/cloudinary\/sign-upload\/?$/),
];

const CAPTAIN_ALLOWED_RULES: Rule[] = [
  rule('GET', /^\/admin\/venues\/?$/),
  rule('PATCH', /^\/admin\/venues\/[^/]+\/clubs\/[^/]+\/?$/),
  rule('PUT', /^\/admin\/venues\/[^/]+\/clubs\/[^/]+\/?$/),
  rule('PATCH', /^\/admin\/venues\/[^/]+\/sessions\/[^/]+\/?$/),
  rule('PUT', /^\/admin\/venues\/[^/]+\/sessions\/[^/]+\/?$/),
  rule('POST', /^\/cloudinary\/sign-upload\/?$/),
];

const matches = (rules: Rule[], method: string, path: string) =>
  rules.some((r) => r.method === method && r.path.test(path));

/** Mounted at `/api`; `req.path` is therefore relative to `/api`. */
export const apiAccessPolicy: RequestHandler = (req, res, next) => {
  const method = req.method.toUpperCase();
  if (method === 'OPTIONS' || method === 'HEAD') return next();
  if (matches(PUBLIC_RULES, method, req.path)) return next();

  if (!req.user) {
    return void res.status(401).json({
      error: getUnauthorizedErrorMessage(req),
    });
  }
  if (
    req.path === '/auth/me' ||
    (method === 'POST' && /^\/admin\/auth\/change-password\/?$/.test(req.path)) ||
    (method === 'PATCH' && /^\/admin\/auth\/profile\/?$/.test(req.path))
  ) {
    return next();
  }

  const role = req.user.role;
  if (role === 'SUPERADMIN') return next();

  if (role === 'ADMIN') {
    if (method === 'DELETE') {
      return void res.status(403).json({ error: 'Delete operations are restricted to SUPERADMIN.' });
    }
    if (!matches(ADMIN_ALLOWED_RULES, method, req.path)) {
      return void res.status(403).json({ error: 'You do not have permission to access this module.' });
    }
    return next();
  }

  if (role === 'CAPTAIN') {
    if (!matches(CAPTAIN_ALLOWED_RULES, method, req.path)) {
      return void res.status(403).json({ error: 'Bạn chỉ có quyền truy cập đội bóng và ca chơi của chính mình.' });
    }
    return next();
  }

  return void res.status(403).json({ error: 'You do not have permission to perform this action.' });
};
