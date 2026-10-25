import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  DUMMY_HASH,
  apiAccessPolicy,
  assertSecurityConfig,
  attachAuth,
  hashPassword,
  isStaff,
  publicUser,
  rateLimit,
  securityHeaders,
  setUserLookup,
  signToken,
  verifyPassword,
} from './lib/security';
import { EM, HttpError, E, S, N, D, sanitize } from './lib/validation';
import {
  APPLICATION_STATUSES,
  BOOKING_ADMIN_EXTRA_SCHEMA,
  BOOKING_CREATE_SCHEMA,
  BOOKING_UPDATE_SCHEMA,
  COACH_SCHEMA,
  COURSE_SCHEMA,
  COURT_SCHEMA,
  LEVELS,
  LEVEL_RULE,
  MEMBER_REGISTER_SCHEMA,
  NEWS_SCHEMA,
  PAYMENT_STATUSES,
  PLAYER_SCHEMA,
  POSITIONS,
  REGISTRATION_STATUSES,
  TRAINING_REGISTER_SCHEMA,
} from './lib/schemas';
import {
  ADDON_PRICES,
  getDefaultWeeklyScheduleForCourt,
  getScheduleSlotsForCourtAndDate,
  normalizeWeeklySchedule,
  normalizeCourtWeeklySchedule,
  parseSlotLabel,
  rangesOverlap,
  toMinutes,
} from './src/shared/schedule';
import {
  INITIAL_MEMBER_APPLICATIONS,
  INITIAL_PLAYERS,
  ensurePostgreSQLSeeded,
  fromRotationEnum,
  normalizeSquad,
  prisma,
  toApplicationDto,
  toBookingDto,
  toClosedSlotDto,
  toCoachDto,
  toCourseDto,
  toCourtDto,
  toNewsDto,
  toPlayerDto,
  toRegistrationDto,
  toRotationEnum,
  toStoredUser,
} from './lib/prisma';
import { countryCodeToFlagEmoji } from './src/types';
import { sendBookingConfirmationEmail } from './lib/mailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
assertSecurityConfig();

export const app = express();
const PORT = process.env.PORT || 4000;

// Required when running behind a reverse proxy (Render, Railway, Vercel...) so req.ip is the real client.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
app.disable('x-powered-by');
app.use(securityHeaders);

app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Bank details used for VietQR (override via env in production)
const BANK = {
  id: process.env.BANK_ID || process.env.VIETQR_BANK_ID || 'MB',
  accountNo: process.env.BANK_ACCOUNT_NO || process.env.VIETQR_ACCOUNT_NO || '0002090671521',
  accountName: process.env.BANK_ACCOUNT_NAME || process.env.VIETQR_ACCOUNT_NAME || 'HOANG QUOC DUY',
};
const BANK_BENEFICIARY_LABEL = `${BANK.id} Bank - ${BANK.accountNo} (${BANK.accountName})`;
const HOLD_MINUTES = Number(process.env.BOOKING_HOLD_MINUTES) || 15;

// Async route helper: forwards rejected promises to the error middleware
const ah = (fn: (req: express.Request, res: express.Response) => any): express.RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

const DATA_DIR = path.join(__dirname, 'data');

export function readJsonFileSafe<T>(filename: string, fallback: T): T {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return parsed as T;
    }
  } catch (err) {
    console.warn(`[JSON Fallback] Could not read data/${filename}:`, err);
  }
  return fallback;
}

export function writeJsonFileSafe(filename: string, data: any): void {
  try {
    const filePath = path.join(DATA_DIR, filename);
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[JSON Fallback] Could not write data/${filename}:`, err);
  }
}

export function getGooglePrivateKey(): string | undefined {
  return process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
}

// Resolve authenticated user directly from PostgreSQL on every Bearer token request
setUserLookup(async (id) => {
  try {
    const dbUser = await prisma.user.findUnique({ where: { id } });
    if (dbUser) return toStoredUser(dbUser);
  } catch (error) {
    console.error("[API ERROR] setUserLookup:", error);
  }
  const fileUsers = readJsonFileSafe<any[]>('users.json', []);
  const found = fileUsers.find((u) => u.id === id);
  return found ? toStoredUser(found) : undefined;
});

const isAllowedScriptUrl = (url: string) => /^https:\/\/script\.google(usercontent)?\.com\//i.test(url);

async function getGoogleScriptUrl(): Promise<string> {
  try {
    const cfg = await prisma.appConfig.findUnique({ where: { id: 'default' } });
    return cfg?.googleScriptUrl || process.env.GOOGLE_SCRIPT_URL || '';
  } catch (error) {
    console.error("[API ERROR] getGoogleScriptUrl:", error);
    return process.env.GOOGLE_SCRIPT_URL || '';
  }
}

async function forwardToGoogleSheetsWebhook(
  sheetName: string,
  payloadOrData: Record<string, any>
) {
  try {
    const url = await getGoogleScriptUrl();
    if (!url) {
      return;
    }
    // Server-side fetch of an admin-supplied URL: restrict to Google Apps Script (SSRF protection)
    if (!isAllowedScriptUrl(url)) {
      console.warn('[Google Sheets Remote Webhook] Blocked non-Google Apps Script URL');
      return;
    }
    const resolvedSheetName =
      typeof payloadOrData?.sheetName === 'string' && payloadOrData.sheetName.trim()
        ? payloadOrData.sheetName.trim()
        : sheetName;
    const resolvedData =
      payloadOrData &&
      typeof payloadOrData.data === 'object' &&
      payloadOrData.data !== null &&
      !Array.isArray(payloadOrData.data)
        ? payloadOrData.data
        : payloadOrData;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          sheetName: resolvedSheetName,
          data: resolvedData,
          timestamp: new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
        }),
        signal: controller.signal,
      });
      console.log(`[Google Sheets Remote Webhook] Forwarded to sheet: "${resolvedSheetName}", status: ${response.status}`);
    } finally {
      clearTimeout(timeout);
    }
  } catch (err: any) {
    console.warn(`[Google Sheets Remote Webhook Notice] ${err?.message || err}`);
  }
}

async function logGoogleSheetsSync(
  tabName: 'Member_Registrations' | 'Court_Bookings' | 'Training_Registrations',
  rowData: Record<string, any>
) {
  try {
    await prisma.googleSheetsSyncLog.create({
      data: {
        tabName,
        action: 'APPEND_ROW',
        rowData: rowData as any,
        status: 'SUCCESS',
      },
    });
  } catch (err) {
    console.warn('[Google Sheets Sync Log] Could not write sync log:', err);
  }
}

/**
 * Fire-and-forget Google Sheets webhook dispatcher.
 * Runs asynchronously in the background with full try/catch isolation so slow
 * Google Apps Script responses or network errors never block or fail client API requests.
 */
function dispatchGoogleSheetsWebhookAsync(
  tabName: 'Member_Registrations' | 'Court_Bookings' | 'Training_Registrations',
  sheetName: 'DatSan' | 'TuyenThanhVien' | 'DangKyKhoaHoc',
  rowData: Record<string, any>
): void {
  void (async () => {
    try {
      await logGoogleSheetsSync(tabName, rowData);
      await forwardToGoogleSheetsWebhook(sheetName, rowData);
    } catch (err: any) {
      console.warn(`[Google Sheets Webhook Fire-and-Forget] Error syncing to ${sheetName}:`, err?.message || err);
    }
  })();
}

// ==========================================
// API ROUTES (100% PostgreSQL via Prisma)
// ==========================================

// Authentication, then default-deny authorization for every /api route (see lib/security.ts)
app.use('/api', attachAuth, apiAccessPolicy);

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  key: (req) => `${req.ip}|${String(req.body?.email || '').toLowerCase()}`,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});
const publicWriteLimiter = rateLimit({ windowMs: 10 * 60_000, max: 30, message: 'Too many submissions. Please slow down.' });
app.use('/api/bookings', (req, res, next) => (req.method === 'POST' ? publicWriteLimiter(req, res, next) : next()));
app.use('/api/training/register', publicWriteLimiter);
app.use('/api/members/register', publicWriteLimiter);

// 1. Auth, Users & RBAC
app.post('/api/auth/login', loginLimiter, ah(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password || password.length > 200) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const dbUser = await prisma.user.findUnique({ where: { email } });
  // Always run a hash comparison so response time does not reveal whether the email exists
  const valid = await verifyPassword(password, dbUser?.passwordHash || DUMMY_HASH);
  if (!dbUser || !dbUser.passwordHash || !valid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const user = toStoredUser(dbUser);
  return res.json({ token: signToken(user), user: publicUser(user) });
}));

app.get('/api/auth/me', (req, res) => {
  res.json({ user: publicUser(req.user!) });
});

// ---- User management (SUPERADMIN only; also enforced by apiAccessPolicy) ----
const MANAGED_ROLES = ['ADMIN', 'STAFF', 'COACH', 'PLAYER'] as const;

const requireSuperAdmin: express.RequestHandler = (req, res, next) => {
  if (!req.user) return void res.status(401).json({ error: 'Authentication required.' });
  if (req.user.role !== 'SUPERADMIN') {
    return void res.status(403).json({ error: 'Only SUPERADMIN can manage user accounts.' });
  }
  next();
};

app.get('/api/users', requireSuperAdmin, ah(async (_req, res) => {
  const dbUsers = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  // publicUser strips passwordHash
  res.json(dbUsers.map((u) => publicUser(toStoredUser(u))));
}));

app.post('/api/users', requireSuperAdmin, ah(async (req, res) => {
  // Accept `name` as an alias of `fullName`
  const body = req.body && typeof req.body === 'object' ? { ...req.body } : {};
  if (body.fullName === undefined && body.name !== undefined) body.fullName = body.name;
  delete body.name;

  const data = sanitize(
    body,
    {
      email: EM,
      password: S(200, 8),
      fullName: S(100, 2),
      phoneNumber: S(30),
      avatarUrl: S(500),
      role: E(MANAGED_ROLES),
    },
    { required: ['email', 'password', 'fullName'] }
  );

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await hashPassword(data.password); // bcrypt.hash(password, 10)
  const created = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber ?? null,
      avatarUrl: data.avatarUrl ?? null,
      role: data.role || 'PLAYER',
    },
  });

  res.status(201).json(publicUser(toStoredUser(created)));
}));

app.patch('/api/users/:id/role', requireSuperAdmin, ah(async (req, res) => {
  const { id } = req.params;
  const { role } = sanitize(req.body, { role: E(MANAGED_ROLES) }, { required: ['role'] });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.id === req.user!.id || target.role === 'SUPERADMIN') {
    return res.status(403).json({ error: 'SUPERADMIN accounts cannot be demoted.' });
  }

  const updated = await prisma.user.update({ where: { id }, data: { role } });
  res.json(publicUser(toStoredUser(updated)));
}));

app.delete('/api/users/:id', requireSuperAdmin, ah(async (req, res) => {
  const { id } = req.params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.id === req.user!.id || target.role === 'SUPERADMIN') {
    return res.status(403).json({ error: 'SUPERADMIN accounts cannot be deleted.' });
  }
  try {
    await prisma.user.delete({ where: { id } });
  } catch (err: any) {
    if (err?.code === 'P2003') {
      return res.status(409).json({ error: 'Account is still referenced by other records and cannot be deleted.' });
    }
    throw err;
  }
  res.json({ success: true });
}));

// Password reset needs an email provider; until one is configured the endpoints neither leak nor fake OTPs.
app.post('/api/auth/forgot-password', (_req, res) => {
  return res.json({
    success: true,
    message: 'If this email is registered, please contact the club administrator to reset your password.',
  });
});

app.post('/api/auth/verify-otp', (_req, res) => {
  return res.status(501).json({ success: false, error: 'Self-service password reset is not available yet.' });
});

// 2. Players API
app.get('/api/players', ah(async (req, res) => {
  try {
    const { level, position, search } = req.query;
    const where: Record<string, any> = {};

    if (typeof level === 'string') {
      const normalizedLevel = normalizeSquad(level).toUpperCase();
      if (LEVELS.includes(normalizedLevel as any)) {
        where.level = normalizedLevel;
      }
    }
    if (typeof position === 'string' && POSITIONS.includes(position.toUpperCase() as any)) {
      where.position = position.toUpperCase();
    }
    if (typeof search === 'string' && search.trim()) {
      const q = search.trim();
      const num = Number(q);
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { hometownCountry: { contains: q, mode: 'insensitive' } },
        ...(Number.isInteger(num) ? [{ jerseyNumber: num }] : []),
      ];
    }

    const dbPlayers = await prisma.player.findMany({
      where,
      orderBy: [{ level: 'asc' }, { jerseyNumber: 'asc' }],
    });
    return res.json(dbPlayers.map(toPlayerDto));
  } catch (error) {
    console.error('[API /players Error]:', error);
    let fallbackPlayers = readJsonFileSafe<any[]>('players.json', INITIAL_PLAYERS);
    if (!Array.isArray(fallbackPlayers) || fallbackPlayers.length === 0) {
      fallbackPlayers = INITIAL_PLAYERS;
    }
    let mapped = fallbackPlayers.map(toPlayerDto);

    const { level, position, search } = req.query;
    if (typeof level === 'string') {
      const targetLevel = normalizeSquad(level).toUpperCase();
      mapped = mapped.filter((p) => p.level === targetLevel);
    }
    if (typeof position === 'string' && POSITIONS.includes(position.toUpperCase() as any)) {
      const targetPos = position.toUpperCase();
      mapped = mapped.filter((p) => p.position === targetPos);
    }
    if (typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      mapped = mapped.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.hometownCountry.toLowerCase().includes(q) ||
          String(p.jerseyNumber) === q
      );
    }
    return res.json(mapped);
  }
}));

app.post('/api/players', ah(async (req, res) => {
  try {
    const rawBody = req.body && typeof req.body === 'object' ? { ...req.body } : {};
    if (rawBody.level) {
      rawBody.level = normalizeSquad(rawBody.level).toUpperCase();
    } else if (rawBody.squad || rawBody.category || rawBody.team) {
      rawBody.level = normalizeSquad(rawBody.squad || rawBody.category || rawBody.team).toUpperCase();
    }
    const data = sanitize(rawBody, PLAYER_SCHEMA, { required: ['fullName', 'jerseyNumber', 'level', 'position'] });
    const resolvedCountryName = data.country ?? data.countryName ?? 'Vietnam';
    const resolvedCountryCode = (data.countryCode || 'VN').toUpperCase();
    const resolvedCountryFlag = data.countryFlag || countryCodeToFlagEmoji(resolvedCountryCode);
    const resolvedJoinedYear = data.joined ?? data.joinedYear ?? new Date().getFullYear();

    const created = await prisma.player.create({
      data: {
        id: `p-${crypto.randomUUID()}`,
        fullName: data.fullName,
        jerseyNumber: data.jerseyNumber,
        height: data.height ?? 185,
        weight: data.weight ?? 75,
        spikeTouch: data.spikeTouch ?? 325,
        blockTouch: data.blockTouch ?? 310,
        hometownCountry: data.hometownCountry || 'Việt Nam',
        countryName: resolvedCountryName,
        countryCode: resolvedCountryCode,
        countryFlag: resolvedCountryFlag,
        bornYear: data.bornYear ?? null,
        level: data.level,
        position: data.position,
        avatarUrl: data.avatarUrl || '',
        bio: data.bio || '',
        isCaptain: Boolean(data.isCaptain ?? data.captain),
        joinedYear: Number(resolvedJoinedYear) || new Date().getFullYear(),
      },
    });
    return res.status(201).json(toPlayerDto(created));
  } catch (error) {
    console.error('[API /players Error] POST:', error);
    throw error;
  }
}));

const handleUpdatePlayer = ah(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.player.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Player not found' });
  }
  const rawBody = req.body && typeof req.body === 'object' ? { ...req.body } : {};
  if (rawBody.level) {
    rawBody.level = normalizeSquad(rawBody.level).toUpperCase();
  } else if (rawBody.squad || rawBody.category || rawBody.team) {
    rawBody.level = normalizeSquad(rawBody.squad || rawBody.category || rawBody.team).toUpperCase();
  }
  const data = sanitize(rawBody, PLAYER_SCHEMA, { partial: true });
  const { captain, country, joined, squad, category, team, ...rest } = data;
  const resolvedCountryName = rest.countryName ?? country;
  const resolvedCountryCode = rest.countryCode ? rest.countryCode.toUpperCase() : undefined;
  const resolvedCountryFlag =
    rest.countryFlag ?? (resolvedCountryCode ? countryCodeToFlagEmoji(resolvedCountryCode) : undefined);
  const resolvedJoinedYear = rest.joinedYear ?? joined;

  const updated = await prisma.player.update({
    where: { id },
    data: {
      ...rest,
      ...(resolvedCountryName !== undefined ? { countryName: resolvedCountryName } : {}),
      ...(resolvedCountryCode !== undefined ? { countryCode: resolvedCountryCode } : {}),
      ...(resolvedCountryFlag !== undefined ? { countryFlag: resolvedCountryFlag } : {}),
      ...(resolvedJoinedYear !== undefined ? { joinedYear: Number(resolvedJoinedYear) } : {}),
      ...(captain !== undefined && rest.isCaptain === undefined ? { isCaptain: Boolean(captain) } : {}),
    },
  });
  res.json(toPlayerDto(updated));
});

app.put('/api/players/:id', handleUpdatePlayer);
app.patch('/api/players/:id', handleUpdatePlayer);

app.delete('/api/players/:id', ah(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.player.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Player not found' });
  }
  await prisma.player.delete({ where: { id } });
  res.json({ success: true, message: 'Player deleted' });
}));

// Quick level promote/demote (youth <-> junior <-> senior)
app.patch('/api/players/:id/level', ah(async (req, res) => {
  const { id } = req.params;
  const rawBody = req.body && typeof req.body === 'object' ? { ...req.body } : {};
  if (rawBody.level) {
    rawBody.level = normalizeSquad(rawBody.level).toUpperCase();
  } else if (rawBody.squad || rawBody.category || rawBody.team) {
    rawBody.level = normalizeSquad(rawBody.squad || rawBody.category || rawBody.team).toUpperCase();
  }
  const { level } = sanitize(rawBody, { level: LEVEL_RULE }, { required: ['level'] });
  const existing = await prisma.player.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Player not found' });
  }
  const updated = await prisma.player.update({
    where: { id },
    data: { level },
  });
  res.json(toPlayerDto(updated));
}));

// 3. Courts API
app.get('/api/courts', ah(async (_req, res) => {
  try {
    const dbCourts = await prisma.court.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return res.json(dbCourts.map(toCourtDto));
  } catch (error) {
    console.error('[API ERROR] GET /api/courts:', error);
    const fileCourts = readJsonFileSafe<any[]>('courts.json', []);
    return res.json(fileCourts.filter((c: any) => c.isActive !== false).map(toCourtDto));
  }
}));

app.post('/api/courts', ah(async (req, res) => {
  const data = sanitize(req.body, COURT_SCHEMA, { required: ['name'] });
  const courtId = `court-${crypto.randomUUID().slice(0, 8)}`;
  const rawCode = (data.code || data.shortName || data.name)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
  let uniqueCode = rawCode || `COURT_${Date.now().toString().slice(-4)}`;
  while (await prisma.court.findUnique({ where: { code: uniqueCode } })) {
    uniqueCode = `${rawCode || 'COURT'}_${crypto.randomInt(100, 999)}`;
  }

  const rawSubCourts = Array.isArray(data.subCourts) ? data.subCourts : undefined;
  const defaultSchedule = getDefaultWeeklyScheduleForCourt(courtId);
  const resolvedSchedule = data.weeklySchedule
    ? normalizeCourtWeeklySchedule(data.weeklySchedule, courtId, rawSubCourts)
    : (rawSubCourts && rawSubCourts.length > 1
        ? normalizeCourtWeeklySchedule(defaultSchedule, courtId, rawSubCourts)
        : defaultSchedule);

  const created = await prisma.court.create({
    data: {
      id: courtId,
      code: uniqueCode,
      shortName: data.shortName || uniqueCode.replace(/_/g, ' ').slice(0, 16),
      name: data.name,
      address: data.address || 'DVA Sports Center, Hà Nội',
      description:
        data.description ||
        'Sân bóng chuyền tiêu chuẩn thi đấu FIVB trang bị thảm Taraflex Pro chống chấn thương và hệ thống chiếu sáng tiêu chuẩn.',
      floorType: data.floorType || 'Gerflor Taraflex Sport Pro',
      hourlyRate: data.hourlyRate !== undefined ? Math.round(Number(data.hourlyRate)) : 500000,
      minHours: data.minHours !== undefined ? Number(data.minHours) : 1.5,
      includes:
        Array.isArray(data.includes) && data.includes.length > 0
          ? data.includes
          : [
              '1 Free Official Mikasa V200W Match Ball',
              'Manual/Electronic scoreboard & referee whistle',
              'Airflow cooling & locker rooms',
            ],
      imageUrl: data.imageUrl || '/courts/btl.png',
      status: data.status === 'MAINTENANCE' || data.isMaintenance === true || data.isAvailable === false ? 'MAINTENANCE' : 'ACTIVE',
      isMaintenance: Boolean(data.status === 'MAINTENANCE' || data.isMaintenance === true || data.isAvailable === false),
      isAvailable: !(data.status === 'MAINTENANCE' || data.isMaintenance === true || data.isAvailable === false),
      isActive: true,
      subCourts: rawSubCourts || [],
      weeklySchedule: resolvedSchedule as any,
    },
  });

  res.status(201).json(toCourtDto(created));
}));

app.put('/api/courts/:id', ah(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.court.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Court not found' });
  }
  const data = sanitize(req.body, COURT_SCHEMA, { partial: true });
  const { weeklySchedule, status, isMaintenance, isAvailable, ...rest } = data;

  let nextMaintenance: boolean | undefined;
  if (status !== undefined) {
    nextMaintenance = status === 'MAINTENANCE';
  } else if (isMaintenance !== undefined) {
    nextMaintenance = Boolean(isMaintenance);
  } else if (isAvailable !== undefined) {
    nextMaintenance = !isAvailable;
  }

  const updated = await prisma.court.update({
    where: { id },
    data: {
      ...rest,
      ...(rest.hourlyRate !== undefined ? { hourlyRate: Math.round(Number(rest.hourlyRate)) } : {}),
      ...(nextMaintenance !== undefined
        ? {
            status: nextMaintenance ? 'MAINTENANCE' : 'ACTIVE',
            isMaintenance: nextMaintenance,
            isAvailable: !nextMaintenance,
          }
        : {}),
      ...(weeklySchedule !== undefined
        ? { weeklySchedule: normalizeCourtWeeklySchedule(weeklySchedule, id, rest.subCourts ?? existing.subCourts) as any }
        : {}),
    },
  });
  res.json(toCourtDto(updated));
}));

app.patch('/api/courts/:id/toggle-maintenance', ah(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.court.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Court not found' });
  }

  const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
  const currentlyMaintenance = Boolean(
    existing.isMaintenance === true || existing.status === 'MAINTENANCE' || existing.isAvailable === false
  );

  let nextMaintenance: boolean;
  if (rawBody.status === 'MAINTENANCE' || rawBody.status === 'ACTIVE') {
    nextMaintenance = rawBody.status === 'MAINTENANCE';
  } else if (typeof rawBody.isMaintenance === 'boolean') {
    nextMaintenance = rawBody.isMaintenance;
  } else {
    nextMaintenance = !currentlyMaintenance;
  }

  const updated = await prisma.court.update({
    where: { id },
    data: {
      status: nextMaintenance ? 'MAINTENANCE' : 'ACTIVE',
      isMaintenance: nextMaintenance,
      isAvailable: !nextMaintenance,
    },
  });

  res.json({
    success: true,
    status: nextMaintenance ? 'MAINTENANCE' : 'ACTIVE',
    isMaintenance: nextMaintenance,
    court: toCourtDto(updated),
  });
}));

app.delete('/api/courts/:id', ah(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.court.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Court not found' });
  }

  const bookingCount = await prisma.booking.count({ where: { courtId: id } });
  if (bookingCount > 0) {
    const softDeleted = await prisma.court.update({
      where: { id },
      data: {
        isActive: false,
        isAvailable: false,
      },
    });
    return res.json({
      success: true,
      softDeleted: true,
      message: 'Court has linked bookings and has been archived (isActive = false).',
      court: toCourtDto(softDeleted),
    });
  }

  await prisma.court.delete({ where: { id } });
  return res.json({
    success: true,
    softDeleted: false,
    message: 'Court permanently deleted.',
  });
}));

// Closed / Blocked Slots API
app.get('/api/courts/closed-slots', ah(async (req, res) => {
  const courtId = typeof req.query.courtId === 'string' ? req.query.courtId : undefined;
  const date = typeof req.query.date === 'string' ? req.query.date : undefined;
  const subCourt = typeof req.query.subCourt === 'string' ? req.query.subCourt : undefined;
  try {
    const dbSlots = await prisma.closedSlot.findMany({
      where: {
        ...(courtId ? { courtId } : {}),
        ...(date ? { date } : {}),
        ...(subCourt ? { subCourt } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(dbSlots.map(toClosedSlotDto));
  } catch (error) {
    console.error('[API ERROR] GET /api/courts/closed-slots:', error);
    const fileSlots = readJsonFileSafe<any[]>('closedSlots.json', []);
    const filtered = fileSlots.filter((cs: any) => {
      if (courtId && cs.courtId !== courtId) return false;
      if (date && cs.date !== date) return false;
      if (subCourt && cs.subCourt !== subCourt) return false;
      return true;
    });
    return res.json(filtered.map(toClosedSlotDto));
  }
}));

app.post('/api/courts/closed-slots/toggle', ah(async (req, res) => {
  const { courtId, date, slotLabel, reason, subCourt } = sanitize(
    req.body,
    { courtId: S(50, 1), date: D, slotLabel: S(60, 3), reason: S(200), subCourt: S(50) },
    { required: ['courtId', 'date', 'slotLabel'] }
  );
  const closedBy = req.user?.fullName || 'Admin';

  let targetCourt: any = null;
  try {
    targetCourt = await prisma.court.findUnique({ where: { id: courtId } });
  } catch (err) {
    console.error('[API ERROR] POST /api/courts/closed-slots/toggle court lookup:', err);
    const fileCourts = readJsonFileSafe<any[]>('courts.json', []);
    targetCourt = fileCourts.find((c: any) => c.id === courtId);
  }

  if (!targetCourt) {
    return res.status(400).json({ error: 'Unknown court' });
  }
  if (!parseSlotLabel(slotLabel)) {
    return res.status(400).json({ error: 'slotLabel must contain a "HH:mm - HH:mm" range' });
  }

  const resolvedSubCourt = subCourt || '';
  try {
    const existing = await prisma.closedSlot.findUnique({
      where: {
        courtId_date_slotLabel_subCourt: {
          courtId,
          date,
          slotLabel,
          subCourt: resolvedSubCourt,
        },
      },
    });

    if (existing) {
      await prisma.closedSlot.delete({ where: { id: existing.id } });
      return res.json({ success: true, action: 'REOPENED', slot: toClosedSlotDto(existing) });
    } else {
      const created = await prisma.closedSlot.create({
        data: {
          id: `cs-${crypto.randomUUID()}`,
          courtId,
          courtName: targetCourt.name,
          subCourt: resolvedSubCourt,
          date,
          slotLabel,
          reason: reason || (resolvedSubCourt ? `Reserved / Maintenance (${resolvedSubCourt}) by Admin` : 'Reserved / Maintenance by Admin'),
          closedBy,
        },
      });
      return res.json({ success: true, action: 'CLOSED', slot: toClosedSlotDto(created) });
    }
  } catch (error) {
    console.error('[API ERROR] POST /api/courts/closed-slots/toggle:', error);
    const fileSlots = readJsonFileSafe<any[]>('closedSlots.json', []);
    const idx = fileSlots.findIndex((cs: any) =>
      cs.courtId === courtId && cs.date === date && cs.slotLabel === slotLabel && (cs.subCourt || '') === resolvedSubCourt
    );
    if (idx >= 0) {
      const [removed] = fileSlots.splice(idx, 1);
      writeJsonFileSafe('closedSlots.json', fileSlots);
      return res.json({ success: true, action: 'REOPENED', slot: toClosedSlotDto(removed) });
    } else {
      const created = {
        id: `cs-${crypto.randomUUID()}`,
        courtId,
        courtName: targetCourt.name,
        subCourt: resolvedSubCourt,
        date,
        slotLabel,
        reason: reason || (resolvedSubCourt ? `Reserved / Maintenance (${resolvedSubCourt}) by Admin` : 'Reserved / Maintenance by Admin'),
        closedBy,
        createdAt: new Date().toISOString(),
      };
      fileSlots.push(created);
      writeJsonFileSafe('closedSlots.json', fileSlots);
      return res.json({ success: true, action: 'CLOSED', slot: toClosedSlotDto(created) });
    }
  }
}));

// 4. Bookings API
const todayVN = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const nowMinutesVN = () => {
  const [h, m] = new Date()
    .toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hourCycle: 'h23' })
    .split(':')
    .map(Number);
  return h * 60 + m;
};

/** Cancels unpaid online bookings whose 15-minute hold ran out, freeing the slot in PostgreSQL. */
async function releaseExpiredHolds(): Promise<void> {
  try {
    await prisma.booking.updateMany({
      where: {
        paymentStatus: 'PENDING',
        holdExpiresAt: { lte: new Date() },
      },
      data: {
        paymentStatus: 'CANCELLED',
        holdExpiresAt: null,
      },
    });
  } catch (err) {
    console.warn('[Bookings] Failed to release expired holds:', err);
  }
}
setInterval(() => {
  void releaseExpiredHolds();
}, 60_000).unref();

async function hasBookingConflict(
  courtId: string,
  date: string,
  start: string,
  end: string,
  subCourt?: string | null,
  ignoreId?: string
): Promise<boolean> {
  const now = new Date();
  try {
    const activeBookings = await prisma.booking.findMany({
      where: {
        courtId,
        bookingDate: date,
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
        OR: [
          { paymentStatus: 'PAID' },
          {
            paymentStatus: 'PENDING',
            OR: [
              { holdExpiresAt: { gt: now } },
              { holdExpiresAt: null },
            ],
          },
        ],
      },
      select: { startTime: true, endTime: true, paymentStatus: true, holdExpiresAt: true, subCourt: true },
    });
    return activeBookings.some((b) => {
      // If checking a specific sub-court (e.g. Sân A), bookings for a different sub-court (e.g. Sân B) do NOT conflict
      if (subCourt && b.subCourt && b.subCourt !== subCourt) {
        return false;
      }
      const status = String(b.paymentStatus).toUpperCase();
      const isBookedOrHolding =
        status === 'PAID' ||
        status === 'CONFIRMED' ||
        ((status === 'HOLDING' || status === 'PENDING') && (!b.holdExpiresAt || b.holdExpiresAt > now));
      return isBookedOrHolding && rangesOverlap(start, end, b.startTime, b.endTime);
    });
  } catch (error) {
    console.error('[API ERROR] hasBookingConflict:', error);
    const fileBookings = readJsonFileSafe<any[]>('bookings.json', []);
    return fileBookings.some((b: any) => {
      if (b.courtId !== courtId || b.bookingDate !== date) return false;
      if (ignoreId && b.id === ignoreId) return false;
      if (subCourt && b.subCourt && b.subCourt !== subCourt) return false;
      const status = String(b.paymentStatus).toUpperCase();
      if (status === 'CANCELLED') return false;
      return rangesOverlap(start, end, b.startTime, b.endTime);
    });
  }
}

async function hasClosedSlotConflict(
  courtId: string,
  date: string,
  start: string,
  end: string,
  subCourt?: string | null
): Promise<boolean> {
  try {
    const slots = await prisma.closedSlot.findMany({
      where: { courtId, date },
      select: { slotLabel: true, subCourt: true },
    });
    return slots.some((cs) => {
      // If closed slot specifies a subCourt, it only affects that specific sub-court
      if (subCourt && cs.subCourt && cs.subCourt !== subCourt) {
        return false;
      }
      const range = parseSlotLabel(cs.slotLabel);
      return !!range && rangesOverlap(start, end, range.start, range.end);
    });
  } catch (error) {
    console.error('[API ERROR] hasClosedSlotConflict:', error);
    const fileSlots = readJsonFileSafe<any[]>('closedSlots.json', []);
    return fileSlots.some((cs: any) => {
      if (cs.courtId !== courtId || cs.date !== date) return false;
      if (subCourt && cs.subCourt && cs.subCourt !== subCourt) return false;
      const range = parseSlotLabel(cs.slotLabel);
      return !!range && rangesOverlap(start, end, range.start, range.end);
    });
  }
}

app.get('/api/bookings', ah(async (req, res) => {
  try {
    await releaseExpiredHolds();
  } catch (error) {
    console.error('[API ERROR] releaseExpiredHolds in GET /api/bookings:', error);
  }
  const date = typeof req.query.date === 'string' ? req.query.date : undefined;
  const courtId = typeof req.query.courtId === 'string' ? req.query.courtId : undefined;

  let dbBookings: any[] = [];
  try {
    dbBookings = await prisma.booking.findMany({
      where: {
        ...(date ? { bookingDate: date } : {}),
        ...(courtId ? { courtId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('[API ERROR] GET /api/bookings:', error);
    const fileBookings = readJsonFileSafe<any[]>('bookings.json', []);
    dbBookings = fileBookings.filter((b: any) => {
      if (date && b.bookingDate !== date) return false;
      if (courtId && b.courtId !== courtId) return false;
      return true;
    });
  }

  // Public visitors only learn which slots are taken - never customer names, phones or emails.
  if (!isStaff(req.user)) {
    return res.json(
      dbBookings
        .filter((b) => b.paymentStatus !== 'CANCELLED')
        .map(({ id, courtId: cId, subCourt, bookingDate, startTime, endTime, paymentStatus }) => ({
          id,
          courtId: cId,
          subCourt,
          bookingDate,
          startTime,
          endTime,
          paymentStatus,
        }))
    );
  }
  return res.json(dbBookings.map(toBookingDto));
}));

app.post('/api/bookings', ah(async (req, res) => {
  await releaseExpiredHolds();
  const staff = isStaff(req.user);

  // Normalize timeSlot / date aliases if sent by client, and strictly ignore any client-supplied price fields
  const rawBody = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const parsedTimeSlot = typeof rawBody.timeSlot === 'string' ? parseSlotLabel(rawBody.timeSlot) : null;
  const sanitizedInput = {
    courtId: rawBody.courtId,
    subCourt: rawBody.subCourt,
    customerName: rawBody.customerName,
    customerEmail: rawBody.customerEmail,
    customerPhone: rawBody.customerPhone,
    bookingDate: rawBody.bookingDate ?? rawBody.date,
    startTime: rawBody.startTime ?? parsedTimeSlot?.start,
    endTime: rawBody.endTime ?? parsedTimeSlot?.end,
    addons: rawBody.addons,
    notes: rawBody.notes,
  };

  const data = sanitize(sanitizedInput, BOOKING_CREATE_SCHEMA, {
    required: ['courtId', 'customerName', 'customerEmail', 'customerPhone', 'bookingDate', 'startTime', 'endTime'],
  });
  const { courtId, bookingDate, startTime, endTime } = data;

  // 1. Lookup actual Court in PostgreSQL via Prisma to get real hourlyRate (prevent Price Tampering)
  const targetCourt = await prisma.court.findUnique({ where: { id: courtId } });
  if (!targetCourt) return res.status(400).json({ error: 'Unknown court.' });
  if (
    targetCourt.status === 'MAINTENANCE' ||
    targetCourt.isMaintenance === true ||
    targetCourt.isAvailable === false
  ) {
    const maintenanceMsg = 'Sân hiện đang trong thời gian bảo trì, vui lòng chọn sân khác hoặc quay lại sau.';
    return res.status(400).json({
      success: false,
      error: maintenanceMsg,
      message: maintenanceMsg,
    });
  }
  if (targetCourt.isActive === false && !staff) {
    return res.status(409).json({ error: 'This court is currently unavailable for booking.' });
  }
  if (toMinutes(endTime) <= toMinutes(startTime)) {
    return res.status(400).json({ error: 'End time must be after start time.' });
  }

  // Resolve sub-court for court clusters like BTL Thông Tin
  const courtHasSubCourts = (Array.isArray(targetCourt.subCourts) && targetCourt.subCourts.length > 0) ||
    courtId === 'court-btl' ||
    targetCourt.code === 'BTL_TT';
  const resolvedSubCourt = data.subCourt || (courtHasSubCourts ? 'Sân A' : undefined);

  if (!staff) {
    const today = todayVN();
    if (bookingDate < today || (bookingDate === today && toMinutes(endTime) <= nowMinutesVN())) {
      return res.status(400).json({ error: 'This time slot is in the past. Please choose a future slot.' });
    }
  }

  // The slot must be one the club actually offers (customers cannot invent time ranges)
  const scheduleSlots = getScheduleSlotsForCourtAndDate(
    courtId,
    bookingDate,
    targetCourt.weeklySchedule as any,
    resolvedSubCourt
  );
  const scheduleSlot = scheduleSlots.find(
    (s) => s.start === startTime && s.end === endTime
  );
  if (!scheduleSlot && !staff) {
    return res.status(400).json({ error: 'The selected time is not an available session for this court and date.' });
  }

  // 2. Double Booking Prevention: check PostgreSQL for PAID, CONFIRMED, or active HOLDING/PENDING on this subCourt
  if (await hasBookingConflict(courtId, bookingDate, startTime, endTime, resolvedSubCourt)) {
    return res.status(409).json({
      success: false,
      message: `Ca sân ${resolvedSubCourt ? `(${resolvedSubCourt}) ` : ''}này vừa có người giữ chỗ hoặc đã được đặt!`,
    });
  }
  if (await hasClosedSlotConflict(courtId, bookingDate, startTime, endTime, resolvedSubCourt)) {
    return res.status(409).json({
      success: false,
      message: `Ca sân ${resolvedSubCourt ? `(${resolvedSubCourt}) ` : ''}này hiện đang đóng hoặc bảo trì!`,
    });
  }

  // Server-side pricing calculation: NEVER trust courtPrice, addonsPrice, or totalPrice from req.body
  const hourlyRate = Number(targetCourt.hourlyRate);
  const totalHours = scheduleSlot?.durationHours ?? (toMinutes(endTime) - toMinutes(startTime)) / 60;
  const addons = data.addons || { mineralWaterBottles: 0, mikasaBallCrate: false, certifiedReferee: false };
  const addonsPrice =
    Number(addons.mineralWaterBottles || 0) * ADDON_PRICES.mineralWaterBottle +
    (addons.mikasaBallCrate ? ADDON_PRICES.mikasaBallCrate : 0) +
    (addons.certifiedReferee ? ADDON_PRICES.certifiedReferee : 0);
  const courtPrice = Math.round(hourlyRate * totalHours);
  const totalPrice = courtPrice + addonsPrice;

  const slotLabel = `${startTime} - ${endTime}`;
  const courtShort = targetCourt.shortName || (courtId === 'court-btl' ? 'BTL TT' : courtId === 'court-thecong' ? 'THE CONG' : 'MY DINH');
  const slotClean = `${startTime.replace(':', 'H')} ${endTime.replace(':', 'H')}`.toUpperCase();
  const dateNum = bookingDate.replace(/-/g, '');

  const subTag = resolvedSubCourt ? (resolvedSubCourt.toUpperCase().includes('B') ? 'B' : 'A') : '';
  const courtTag = courtId === 'court-btl' ? (subTag ? `BTL-${subTag}` : 'BTL') : courtId === 'court-thecong' ? 'TC' : 'MD';
  let bookingCode = '';
  do {
    bookingCode = `DVA-${courtTag}-${dateNum}-${crypto.randomInt(1000, 10000)}`;
  } while (await prisma.booking.findUnique({ where: { bookingCode } }));

  const subMemo = resolvedSubCourt ? ` ${resolvedSubCourt.replace(/\s+/g, ' ').toUpperCase()}` : '';
  const transferContent = `${bookingCode} ${courtShort}${subMemo} ${slotClean}`.toUpperCase();

  // 3. Assign 15-minute hold expiration and HOLDING (PENDING) status
  const paymentStatus = 'PENDING';
  const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const createdBooking = await prisma.booking.create({
    data: {
      id: `b-${crypto.randomUUID()}`,
      bookingCode,
      courtId,
      courtName: targetCourt.name,
      subCourt: resolvedSubCourt ?? null,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      bookingDate,
      startTime,
      endTime,
      totalHours,
      courtPrice,
      addons: addons as any,
      addonsPrice,
      totalPrice,
      paymentStatus,
      transferContent,
      notes: data.notes ?? null,
      holdExpiresAt,
    },
  });

  const dto = toBookingDto(createdBooking);

  // Format addons list for Vietnamese Google Sheets "Ghi chú" fallback
  const addonsList: string[] = Array.isArray(rawBody.addons)
    ? rawBody.addons.map(String).filter(Boolean)
    : [
        ...(addons.mineralWaterBottles > 0 ? [`Nước khoáng (${addons.mineralWaterBottles} chai)`] : []),
        ...(addons.mikasaBallCrate ? ['Thùng bóng Mikasa'] : []),
        ...(addons.certifiedReferee ? ['Trọng tài chuẩn FIVB'] : []),
      ];

  const booking = {
    ...dto,
    date: bookingDate,
    timeSlot: slotLabel,
    addons: addonsList,
  };
  const courtName = targetCourt.name;
  const courtDisplayName = resolvedSubCourt ? `${courtName} - ${resolvedSubCourt}` : courtName;

  // Chuẩn hóa payload khớp chính xác với tiêu đề cột tiếng Việt trên Google Sheet tab 'DatSan'
  const sheetPayload = {
    sheetName: 'DatSan',
    data: {
      'Mã đặt sân': booking.bookingCode || booking.id,
      'Tên sân': courtDisplayName, // Tên hiển thị thực tế của sân kèm sân con
      'Ngày đặt': booking.date,
      'Khung giờ': booking.timeSlot,
      'Tổng số giờ': totalHours || 1.5,
      'Họ tên khách': booking.customerName,
      'Số điện thoại': booking.customerPhone,
      'Email': booking.customerEmail || '',
      'Tổng tiền (VNĐ)': booking.totalPrice,
      'Trạng thái': booking.paymentStatus || 'PENDING',
      'Ghi chú': booking.notes || (booking.addons && booking.addons.length ? booking.addons.join(', ') : 'Không có'),
    },
  };
  dispatchGoogleSheetsWebhookAsync('Court_Bookings', 'DatSan', sheetPayload.data);

  res.status(201).json(dto);
}));

app.patch('/api/bookings/:id/status', ah(async (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = sanitize(req.body, { paymentStatus: E(PAYMENT_STATUSES) }, { required: ['paymentStatus'] });
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  // Re-activating a cancelled booking must not collide with someone who took the slot meanwhile
  if (
    booking.paymentStatus === 'CANCELLED' &&
    paymentStatus !== 'CANCELLED' &&
    (await hasBookingConflict(booking.courtId, booking.bookingDate, booking.startTime, booking.endTime, booking.id))
  ) {
    return res.status(409).json({ error: 'This slot has been booked by someone else in the meantime.' });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      paymentStatus,
      holdExpiresAt: null,
    },
    include: {
      court: true,
    },
  });

  if (paymentStatus === 'PAID' && booking.paymentStatus !== 'PAID') {
    await sendBookingConfirmationEmail(
      {
        ...updated,
        timeSlot: `${updated.startTime} - ${updated.endTime}`,
      },
      updated.court
    );
  }

  res.json(toBookingDto(updated));
}));

// Customer reports they have transferred the money via VietQR.
app.post('/api/bookings/:id/confirm-payment', ah(async (req, res) => {
  await releaseExpiredHolds();
  const { id } = req.params;
  let booking = await prisma.booking.findUnique({
    where: { id },
    include: { court: true },
  });
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  if (booking.paymentStatus === 'CANCELLED') {
    return res.status(409).json({ error: 'This reservation hold has expired or was cancelled. Please create a new booking.' });
  }

  const wasAlreadyConfirmed = Boolean(booking.customerConfirmedAt);
  if (booking.paymentStatus === 'PENDING' && !booking.customerConfirmedAt) {
    booking = await prisma.booking.update({
      where: { id },
      data: {
        customerConfirmedAt: new Date(),
        holdExpiresAt: null, // keep the slot reserved until staff verify the transfer
      },
      include: { court: true },
    });
  }

  // Send confirmation email immediately when customer confirms transfer on the UI
  if (!wasAlreadyConfirmed) {
    await sendBookingConfirmationEmail(
      {
        ...booking,
        timeSlot: `${booking.startTime} - ${booking.endTime}`,
      },
      booking.court
    );
  }

  res.json({ success: true, booking: toBookingDto(booking) });
}));

app.put('/api/bookings/:id', ah(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Booking not found' });
  const data = sanitize(req.body, BOOKING_UPDATE_SCHEMA, { partial: true });

  const nextCourtId = data.courtId ?? existing.courtId;
  const nextDate = data.bookingDate ?? existing.bookingDate;
  const nextStart = data.startTime ?? existing.startTime;
  const nextEnd = data.endTime ?? existing.endTime;
  const nextStatus = data.paymentStatus ?? existing.paymentStatus;
  const nextSubCourt = data.subCourt !== undefined ? data.subCourt : existing.subCourt;

  if (toMinutes(nextEnd) <= toMinutes(nextStart)) {
    return res.status(400).json({ error: 'End time must be after start time.' });
  }
  if (
    nextStatus !== 'CANCELLED' &&
    (await hasBookingConflict(nextCourtId, nextDate, nextStart, nextEnd, nextSubCourt, existing.id))
  ) {
    return res.status(409).json({ error: 'This court session slot overlaps with another booking.' });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      ...data,
      ...(data.courtPrice !== undefined ? { courtPrice: Math.round(Number(data.courtPrice)) } : {}),
      ...(data.addonsPrice !== undefined ? { addonsPrice: Math.round(Number(data.addonsPrice)) } : {}),
      ...(data.totalPrice !== undefined ? { totalPrice: Math.round(Number(data.totalPrice)) } : {}),
      ...(data.paymentStatus && data.paymentStatus !== 'PENDING' ? { holdExpiresAt: null } : {}),
    },
  });
  res.json(toBookingDto(updated));
}));

app.delete('/api/bookings/:id', ah(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Booking not found' });
  await prisma.booking.delete({ where: { id } });
  res.json({ success: true, message: 'Booking deleted' });
}));

// 5. Training & Academy API
app.get('/api/training/courses', ah(async (_req, res) => {
  const dbCourses = await prisma.trainingCourse.findMany({ orderBy: { createdAt: 'asc' } });
  res.json(dbCourses.map(toCourseDto));
}));

app.post('/api/training/courses', ah(async (req, res) => {
  const data = sanitize(req.body, COURSE_SCHEMA, { required: ['title'] });
  const created = await prisma.trainingCourse.create({
    data: {
      id: `tc-${crypto.randomUUID()}`,
      title: data.title,
      level: data.level || 'JUNIOR',
      tag: data.tag ?? null,
      targetAudience: data.targetAudience || '',
      price: Math.round(Number(data.price) || 0),
      priceUnit: data.priceUnit ?? null,
      schedule: data.schedule || '',
      duration: data.duration || '',
      coachName: data.coachName || '',
      coachTitle: data.coachTitle || '',
      description: data.description || '',
      benefits: data.benefits || [],
      curriculum: data.curriculum || [],
      maxSlots: data.maxSlots || 20,
      enrolledSlots: data.enrolledSlots || 0,
      imageUrl: data.imageUrl ?? null,
    },
  });
  res.status(201).json(toCourseDto(created));
}));

app.put('/api/training/courses/:id', ah(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.trainingCourse.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Course not found' });
  const data = sanitize(req.body, COURSE_SCHEMA, { partial: true });
  const updated = await prisma.trainingCourse.update({
    where: { id },
    data: {
      ...data,
      ...(data.price !== undefined ? { price: Math.round(Number(data.price)) } : {}),
    },
  });
  res.json(toCourseDto(updated));
}));

app.delete('/api/training/courses/:id', ah(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.trainingCourse.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Course not found' });
  await prisma.trainingCourse.delete({ where: { id } });
  res.json({ success: true, message: 'Course deleted' });
}));

app.get('/api/training/registrations', ah(async (_req, res) => {
  const dbRegs = await prisma.trainingRegistration.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(dbRegs.map(toRegistrationDto));
}));

app.post('/api/training/register', ah(async (req, res) => {
  const data = sanitize(req.body, TRAINING_REGISTER_SCHEMA, { required: ['courseId', 'fullName', 'email', 'phone'] });
  const { courseId, fullName, email, phone, notes } = data;
  let course = await prisma.trainingCourse.findUnique({ where: { id: courseId } });
  if (!course) {
    course = await prisma.trainingCourse.findFirst({ orderBy: { createdAt: 'asc' } });
  }

  const courseTitle =
    typeof req.body.courseTitle === 'string' && req.body.courseTitle.trim()
      ? req.body.courseTitle.trim().slice(0, 200)
      : course?.title || 'Khóa học bóng chuyền DVA';
  const coursePrice =
    typeof req.body.price === 'number' && Number.isFinite(req.body.price)
      ? Math.round(req.body.price)
      : course?.price ?? 1500000;
  const experienceLevel = data.experienceLevel || 'Cơ bản';
  const preferredTimeSlot = data.preferredTimeSlot || 'Buổi tối';

  const created = course
    ? await prisma.trainingRegistration.create({
        data: {
          id: `tr-${crypto.randomUUID()}`,
          courseId: course.id,
          courseTitle,
          fullName,
          email,
          phone,
          experienceLevel,
          preferredTimeSlot,
          notes: notes ?? null,
          status: 'PENDING',
        },
      })
    : {
        id: `tr-${crypto.randomUUID()}`,
        courseId,
        courseTitle,
        fullName,
        email,
        phone,
        experienceLevel,
        preferredTimeSlot,
        notes: notes ?? null,
        status: 'PENDING' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

  // Auto Sync to Google Sheets Tab "DangKyKhoaHoc" (fire-and-forget, non-blocking)
  const coursePrefix = (courseId || 'TC').replace('tc-', '').toUpperCase().slice(0, 8);
  const regCode =
    typeof req.body.registrationCode === 'string' && req.body.registrationCode.trim()
      ? req.body.registrationCode.trim()
      : `DVA-TR-${coursePrefix}-${crypto.randomInt(1000, 10000)}`;
  const cleanPhone = phone.replace(/\D/g, '');
  const trainingTransferContent =
    typeof req.body.transferContent === 'string' && req.body.transferContent.trim()
      ? req.body.transferContent.trim()
      : `DVA ${regCode} ${cleanPhone.slice(-6)}`;

  const trainingSheetPayload = {
    'Mã đăng ký': regCode,
    'Gói tập / Khóa học': courseTitle,
    'Họ và tên học viên': fullName,
    'Số điện thoại': phone,
    'Email': email || '',
    'Trình độ hiện tại': experienceLevel,
    'Khung giờ mong muốn': preferredTimeSlot,
    'Mức học phí (VNĐ)': coursePrice,
    'Nội dung chuyển khoản': trainingTransferContent,
    'Trạng thái': 'CHỜ THANH TOÁN (PENDING)',
    'Ghi chú': notes || 'Không có',
    'Thời gian đăng ký': new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  };
  dispatchGoogleSheetsWebhookAsync('Training_Registrations', 'DangKyKhoaHoc', trainingSheetPayload);

  res.status(201).json(toRegistrationDto(created));
}));

app.patch('/api/training/registrations/:id/status', ah(async (req, res) => {
  const { id } = req.params;
  const { status } = sanitize(req.body, { status: E(REGISTRATION_STATUSES) }, { required: ['status'] });
  const existing = await prisma.trainingRegistration.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Registration not found' });
  }
  const updated = await prisma.trainingRegistration.update({
    where: { id },
    data: { status },
  });
  res.json(toRegistrationDto(updated));
}));

app.delete('/api/training/registrations/:id', ah(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.trainingRegistration.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Registration not found' });
  await prisma.trainingRegistration.delete({ where: { id } });
  res.json({ success: true, message: 'Registration deleted' });
}));

// Coaches API
app.get('/api/coaches', ah(async (_req, res) => {
  const dbCoaches = await prisma.coachProfile.findMany({ orderBy: { createdAt: 'asc' } });
  res.json(dbCoaches.map(toCoachDto));
}));

app.post('/api/coaches', ah(async (req, res) => {
  const data = sanitize(req.body, COACH_SCHEMA, { required: ['name'] });
  const created = await prisma.coachProfile.create({
    data: {
      id: `coach-${crypto.randomUUID()}`,
      name: data.name,
      role: data.role || '',
      experience: data.experience || '',
      height: data.height || '',
      age: data.age ?? 25,
      bornYear: data.bornYear ?? 2000,
      avatarUrl: data.avatarUrl || '',
      specialty: data.specialty || '',
      bio: data.bio || '',
      certifications: data.certifications || [],
    },
  });
  res.status(201).json(toCoachDto(created));
}));

app.put('/api/coaches/:id', ah(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.coachProfile.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Coach not found' });
  const data = sanitize(req.body, COACH_SCHEMA, { partial: true });
  const updated = await prisma.coachProfile.update({
    where: { id },
    data,
  });
  res.json(toCoachDto(updated));
}));

app.delete('/api/coaches/:id', ah(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.coachProfile.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Coach not found' });
  await prisma.coachProfile.delete({ where: { id } });
  res.json({ success: true, message: 'Coach deleted' });
}));

// 6. Member Application & Auto-Player Promotion
app.get('/api/members/applications', ah(async (_req, res) => {
  try {
    const dbApps = await prisma.memberApplication.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(dbApps.map(toApplicationDto));
  } catch (error) {
    console.error('[API /members/applications Error]:', error);
    let fallbackApps = readJsonFileSafe<any[]>('applications.json', INITIAL_MEMBER_APPLICATIONS);
    if (!Array.isArray(fallbackApps) || fallbackApps.length === 0) {
      fallbackApps = INITIAL_MEMBER_APPLICATIONS;
    }
    return res.json(fallbackApps.map(toApplicationDto));
  }
}));

app.post('/api/members/register', ah(async (req, res) => {
  const data = sanitize(req.body, MEMBER_REGISTER_SCHEMA, {
    required: ['fullName', 'dob', 'position', 'hometownCountry', 'level', 'height', 'weight', 'spikeReach', 'blockReach', 'gmail', 'zalo'],
  });

  const created = await prisma.memberApplication.create({
    data: {
      id: `app-${crypto.randomUUID()}`,
      fullName: data.fullName,
      dob: data.dob,
      position: data.position,
      hometownCountry: data.hometownCountry,
      desiredJerseyNumber: data.desiredJerseyNumber ?? 0,
      level: data.level,
      height: data.height,
      weight: data.weight,
      spikeReach: data.spikeReach,
      blockReach: data.blockReach,
      gmail: data.gmail,
      instagram: data.instagram || 'None',
      zalo: data.zalo,
      rotationKnowledge: toRotationEnum(data.rotationKnowledge),
      status: 'PENDING',
    },
  });

  const dto = toApplicationDto(created);

  // Auto Sync to Google Sheets Tab "TuyenThanhVien" (fire-and-forget, non-blocking)
  const memberSheetPayload = {
    'Họ và tên': dto.fullName,
    'Ngày sinh': dto.dob,
    'Vị trí': dto.position,
    'Cấp độ':
      dto.level === 'SENIOR'
        ? 'Senior (Advanced, 3+ yrs)'
        : dto.level === 'JUNIOR'
        ? 'Junior (Intermediate)'
        : 'Youth',
    'Số áo mong muốn': dto.desiredJerseyNumber,
    'Chiều cao (cm)': dto.height,
    'Cân nặng (kg)': dto.weight,
    'Bật đập (cm)': dto.spikeReach,
    'Bật chắn (cm)': dto.blockReach,
    'Số Zalo': dto.zalo,
    'Email': dto.gmail || '',
    'Instagram': dto.instagram || 'None',
    'Chiến thuật 5-1': dto.rotationKnowledge,
    'Quê quán': dto.hometownCountry,
    'Thời gian gửi': new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
  };
  dispatchGoogleSheetsWebhookAsync('Member_Registrations', 'TuyenThanhVien', memberSheetPayload);

  res.status(201).json(dto);
}));

app.patch('/api/members/applications/:id/status', ah(async (req, res) => {
  const { id } = req.params;
  const { status, reviewNotes } = sanitize(
    req.body,
    { status: E(APPLICATION_STATUSES), reviewNotes: S(500) },
    { required: ['status'] }
  );
  const existing = await prisma.memberApplication.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const alreadyApproved = existing.status === 'APPROVED';

  const updated = await prisma.$transaction(async (tx) => {
    const appUpdated = await tx.memberApplication.update({
      where: { id },
      data: {
        status,
        ...(reviewNotes ? { reviewNotes } : {}),
      },
    });

    // Auto Promote to Player if APPROVED (only once - re-approving must not duplicate the athlete)
    if (status === 'APPROVED' && !alreadyApproved) {
      await tx.player.create({
        data: {
          id: `p-${crypto.randomUUID()}`,
          fullName: existing.fullName,
          jerseyNumber: existing.desiredJerseyNumber || Math.floor(Math.random() * 50) + 1,
          height: existing.height || 185,
          weight: existing.weight || 75,
          spikeTouch: existing.spikeReach || 325,
          blockTouch: existing.blockReach || 310,
          hometownCountry: existing.hometownCountry || 'Việt Nam',
          countryName: 'Vietnam',
          countryCode: 'VN',
          countryFlag: '🇻🇳',
          level: existing.level || 'JUNIOR',
          position: existing.position || 'OH',
          avatarUrl: '',
          bio: `Tân binh DVA gia nhập qua đợt tuyển chọn thành viên 2026. Am hiểu sơ đồ ${fromRotationEnum(existing.rotationKnowledge)}.`,
          joinedYear: new Date().getFullYear(),
        },
      });
      console.log(`[DVA Member Approved] Auto-created player profile for ${existing.fullName} in PostgreSQL!`);
    }

    return appUpdated;
  });

  res.json({ application: toApplicationDto(updated), promotedPlayer: status === 'APPROVED' });
}));

app.delete('/api/members/applications/:id', ah(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.memberApplication.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Application not found' });
  await prisma.memberApplication.delete({ where: { id } });
  res.json({ success: true, message: 'Application deleted' });
}));

// 7. News API
const NEWS_JSON_PATH = path.join(__dirname, 'data', 'news.json');
const DEFAULT_NEWS_IMAGE_URL =
  'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80';

function readNewsJsonFile(): any[] {
  try {
    if (fs.existsSync(NEWS_JSON_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(NEWS_JSON_PATH, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[News JSON] Could not read data/news.json:', err);
  }
  return [];
}

function writeNewsJsonFile(items: any[]): void {
  try {
    fs.mkdirSync(path.dirname(NEWS_JSON_PATH), { recursive: true });
    fs.writeFileSync(NEWS_JSON_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[News JSON] Could not write data/news.json:', err);
  }
}

app.get('/api/news', ah(async (req, res) => {
  const { category, search } = req.query;
  const where: Record<string, any> = {};

  if (typeof category === 'string' && category.trim()) {
    where.category = { equals: category.trim(), mode: 'insensitive' };
  }
  if (typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { excerpt: { contains: q, mode: 'insensitive' } },
    ];
  }

  try {
    const dbNews = await prisma.newsPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return res.json(dbNews.map(toNewsDto));
  } catch {
    const fileNews = readNewsJsonFile().map((n) => toNewsDto(n));
    const filtered = fileNews.filter((item) => {
      if (typeof category === 'string' && category.trim()) {
        if (String(item.category).toUpperCase() !== category.trim().toUpperCase()) return false;
      }
      if (typeof search === 'string' && search.trim()) {
        const q = search.trim().toLowerCase();
        if (!item.title.toLowerCase().includes(q) && !item.excerpt.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    return res.json(filtered);
  }
}));

app.get('/api/news/:id', ah(async (req, res) => {
  const { id } = req.params;
  try {
    const post = await prisma.newsPost.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!post) {
      return res.status(404).json({ error: 'News post not found' });
    }
    return res.json(toNewsDto(post));
  } catch {
    const fileNews = readNewsJsonFile();
    const post = fileNews.find((n) => n.id === id || n.slug === id);
    if (!post) {
      return res.status(404).json({ error: 'News post not found' });
    }
    return res.json(toNewsDto(post));
  }
}));

app.post('/api/news', ah(async (req, res) => {
  const data = sanitize(req.body, NEWS_SCHEMA, { required: ['title', 'content'] });
  const slugBase = (data.slug || data.title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const resolvedImageUrl =
    (data.imageUrl && data.imageUrl.trim()) ||
    (data.image && data.image.trim()) ||
    (data.thumbnail && data.thumbnail.trim()) ||
    DEFAULT_NEWS_IMAGE_URL;

  const newRecord = {
    id: `news-${crypto.randomUUID()}`,
    title: data.title,
    slug: `${slugBase || 'post'}-${Date.now().toString(36)}`,
    excerpt: data.excerpt || '',
    content: data.content,
    thumbnail: resolvedImageUrl,
    category: data.category || 'CLUB_EVENT',
    authorId: req.user?.id ?? null,
    authorName: data.authorName || req.user?.fullName || 'DVA',
    authorRole: data.authorRole || 'Club Administration',
    publishedAt: new Date().toISOString().split('T')[0],
    readTimeMinutes: data.readTimeMinutes || 4,
    featured: Boolean(data.featured),
  };

  try {
    const created = await prisma.newsPost.create({ data: newRecord });
    const dto = toNewsDto(created);
    const currentFile = readNewsJsonFile();
    writeNewsJsonFile([dto, ...currentFile.filter((n) => n.id !== dto.id)]);
    return res.status(201).json(dto);
  } catch {
    const dto = toNewsDto(newRecord as any);
    const currentFile = readNewsJsonFile();
    writeNewsJsonFile([dto, ...currentFile.filter((n) => n.id !== dto.id)]);
    return res.status(201).json(dto);
  }
}));

app.put('/api/news/:id', ah(async (req, res) => {
  const { id } = req.params;
  const data = sanitize(req.body, NEWS_SCHEMA, { partial: true });
  const { imageUrl, image, thumbnail, ...restData } = data;
  const incomingImageUrl =
    (imageUrl && imageUrl.trim()) ||
    (image && image.trim()) ||
    (thumbnail && thumbnail.trim()) ||
    '';

  try {
    const existing = await prisma.newsPost.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!existing) {
      return res.status(404).json({ error: 'News post not found' });
    }
    const resolvedImageUrl = incomingImageUrl || existing.thumbnail || DEFAULT_NEWS_IMAGE_URL;
    const updated = await prisma.newsPost.update({
      where: { id: existing.id },
      data: {
        ...restData,
        thumbnail: resolvedImageUrl,
      },
    });
    const dto = toNewsDto(updated);
    const currentFile = readNewsJsonFile();
    if (currentFile.length > 0) {
      writeNewsJsonFile(currentFile.map((n) => (n.id === existing.id || n.slug === id ? dto : n)));
    }
    return res.json(dto);
  } catch {
    const currentFile = readNewsJsonFile();
    const idx = currentFile.findIndex((n) => n.id === id || n.slug === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'News post not found' });
    }
    const existing = currentFile[idx];
    const resolvedImageUrl =
      incomingImageUrl ||
      existing.imageUrl ||
      existing.image ||
      existing.thumbnail ||
      DEFAULT_NEWS_IMAGE_URL;
    const merged = {
      ...existing,
      ...restData,
      imageUrl: resolvedImageUrl,
      image: resolvedImageUrl,
      thumbnail: resolvedImageUrl,
    };
    const dto = toNewsDto(merged);
    currentFile[idx] = dto;
    writeNewsJsonFile(currentFile);
    return res.json(dto);
  }
}));

app.delete('/api/news/:id', ah(async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.newsPost.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'News post not found' });
    await prisma.newsPost.delete({ where: { id } });
    const currentFile = readNewsJsonFile();
    if (currentFile.length > 0) {
      writeNewsJsonFile(currentFile.filter((n) => n.id !== id));
    }
    return res.json({ success: true, message: 'News post deleted' });
  } catch {
    const currentFile = readNewsJsonFile();
    const exists = currentFile.some((n) => n.id === id);
    if (!exists) return res.status(404).json({ error: 'News post not found' });
    writeNewsJsonFile(currentFile.filter((n) => n.id !== id));
    return res.json({ success: true, message: 'News post deleted' });
  }
}));

// 8. Google Sheets Multi-Tab Live Inspector & Sync API (staff only; config is SUPERADMIN only)
app.get('/api/sheets/config', ah(async (_req, res) => {
  try {
    const scriptUrl = await getGoogleScriptUrl();
    res.json({ scriptUrl });
  } catch (error) {
    console.error('[API ERROR] GET /api/sheets/config:', error);
    res.json({ scriptUrl: process.env.GOOGLE_SCRIPT_URL || '' });
  }
}));

app.post('/api/sheets/config', ah(async (req, res) => {
  const scriptUrl = typeof req.body?.scriptUrl === 'string' ? req.body.scriptUrl.trim() : '';
  if (scriptUrl && !isAllowedScriptUrl(scriptUrl)) {
    return res.status(400).json({ error: 'URL must be a Google Apps Script web app URL (https://script.google.com/...).' });
  }
  try {
    const saved = await prisma.appConfig.upsert({
      where: { id: 'default' },
      update: { googleScriptUrl: scriptUrl },
      create: { id: 'default', googleScriptUrl: scriptUrl },
    });
    console.log(`[Google Sheets] Webhook URL updated in PostgreSQL by ${req.user?.email}`);
    res.json({ success: true, scriptUrl: saved.googleScriptUrl });
  } catch (error) {
    console.error('[API ERROR] POST /api/sheets/config:', error);
    res.json({ success: true, scriptUrl });
  }
}));

app.get('/api/sheets/data', ah(async (_req, res) => {
  let apps: any[] = [];
  let bookingsList: any[] = [];
  let regs: any[] = [];

  try {
    [apps, bookingsList, regs] = await Promise.all([
      prisma.memberApplication.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.booking.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.trainingRegistration.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);
  } catch (error) {
    console.error('[API ERROR] GET /api/sheets/data:', error);
    apps = readJsonFileSafe<any[]>('applications.json', INITIAL_MEMBER_APPLICATIONS).slice(0, 100);
    bookingsList = readJsonFileSafe<any[]>('bookings.json', []).slice(0, 100);
    regs = readJsonFileSafe<any[]>('trainingRegistrations.json', []).slice(0, 100);
  }

  const formatTimestamp = (d: any) => {
    if (!d) return new Date().toISOString().replace('T', ' ').substring(0, 19);
    if (d instanceof Date) return d.toISOString().replace('T', ' ').substring(0, 19);
    return String(d).replace('T', ' ').substring(0, 19);
  };

  const spreadsheetId =
    process.env.SPREADSHEET_ID ||
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';

  res.json({
    spreadsheetId,
    spreadsheetTitle: 'DVA Volleyball Club - Master Data Sheet (Live Sync)',
    tabs: {
      Member_Registrations: apps.map((a) => ({
        Timestamp: formatTimestamp(a.createdAt),
        Application_ID: a.id,
        Full_Name: a.fullName,
        DOB: a.dob,
        Position: a.position,
        Level: normalizeSquad(a.level).toUpperCase(),
        Height_cm: a.height,
        Weight_kg: a.weight,
        Spike_Reach_cm: a.spikeReach,
        Block_Reach_cm: a.blockReach,
        Gmail: a.gmail,
        Zalo: a.zalo,
        Instagram: a.instagram,
        Rotation_Knowledge: fromRotationEnum(a.rotationKnowledge),
        Status: a.status,
      })),
      Court_Bookings: bookingsList.map((b) => ({
        Timestamp: formatTimestamp(b.createdAt),
        Booking_Code: b.bookingCode,
        Court_Name: b.courtName,
        Customer_Name: b.customerName,
        Phone: b.customerPhone,
        Email: b.customerEmail,
        Date: b.bookingDate,
        Time_Slot: `${b.startTime} - ${b.endTime}`,
        Total_Hours: b.totalHours,
        Total_VND: b.totalPrice,
        Payment_Status:
          b.paymentStatus === 'PENDING' && b.customerConfirmedAt
            ? 'PENDING (Customer reported transfer)'
            : b.paymentStatus,
        Bank_Beneficiary: BANK_BENEFICIARY_LABEL,
      })),
      Training_Registrations: regs.map((r) => ({
        Timestamp: formatTimestamp(r.createdAt),
        Course: r.courseTitle,
        Full_Name: r.fullName,
        Email: r.email,
        Phone: r.phone,
        Experience: r.experienceLevel,
        Status: r.status,
      })),
    },
  });
}));

app.post('/api/sheets/sync', ah(async (req, res) => {
  try {
    const { sheetName, tab, data, rowData } = req.body ?? {};
    const targetTab = String(sheetName || tab || 'DatSan');
    const targetData = data || rowData || {};
    if (typeof targetData !== 'object' || Array.isArray(targetData)) {
      return res.status(400).json({ error: 'data must be an object' });
    }

    if (
      targetTab === 'Member_Registrations' ||
      targetTab === 'Court_Bookings' ||
      targetTab === 'Training_Registrations'
    ) {
      await logGoogleSheetsSync(targetTab, targetData);
    }

    await forwardToGoogleSheetsWebhook(targetTab, targetData);
    return res.json({ success: true, message: `Dispatched to ${targetTab}` });
  } catch (error) {
    console.error('[API ERROR] POST /api/sheets/sync:', error);
    return res.status(500).json({ error: 'Failed to sync to Google Sheets' });
  }
}));

// 9. Cloudinary signed upload parameters (staff only). Real SHA-1 signature, no hardcoded credentials.
app.post('/api/cloudinary/sign-upload', (req, res) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(501).json({ error: 'Cloudinary signing is not configured on the server.' });
  }
  const { folder } = sanitize(req.body ?? {}, { folder: S(100) });
  const safeFolder = (folder || 'dva_assets').replace(/[^a-zA-Z0-9_\-/]/g, '');
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`folder=${safeFolder}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex');

  res.json({
    cloudName,
    apiKey,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    folder: safeFolder,
    signature,
    timestamp,
  });
});

// 10. VietQR Generation API
app.post('/api/vietqr/generate', (req, res) => {
  const { amount, bookingCode, description } = sanitize(
    req.body,
    { amount: N(1000, 1_000_000_000), bookingCode: S(60), description: S(200) },
    { required: ['amount'] }
  );
  const code = bookingCode || `DVA-TT-${Date.now().toString().slice(-4)}`;

  // Real VietQR API endpoint image URL
  const qrUrl = `https://img.vietqr.io/image/${BANK.id}-${BANK.accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(BANK.accountName)}`;

  res.json({
    bankId: BANK.id,
    bankName: 'Ngân hàng Quân Đội (MB Bank)',
    accountNo: BANK.accountNo,
    accountName: BANK.accountName,
    amount,
    bookingCode: code,
    description: description || `Thanh toán đặt sân ${code}`,
    qrUrl,
  });
});

// 11. Bank Payment Webhook (SePay / Casso / MB Bank Automated Reconciliation)
app.post('/api/webhooks/payment', ah(async (req, res) => {
  const expectedApiKey = (
    process.env.PAYMENT_WEBHOOK_API_KEY ||
    process.env.SEPAY_API_KEY ||
    process.env.CASSO_API_KEY ||
    ''
  ).trim();

  // Xác thực tính hợp lệ của request qua Header Authorization hoặc API Token từ SePay/Casso
  const authHeader = String(req.headers.authorization || '').trim();
  const headerToken = authHeader.replace(/^(Bearer|Apikey|Token)\s+/i, '').trim();
  const altToken = String(
    req.headers['secure-token'] ||
      req.headers['x-api-key'] ||
      req.headers['api-key'] ||
      ''
  ).trim();
  const providedToken = headerToken || altToken;

  if (expectedApiKey) {
    const expectedBuf = Buffer.from(expectedApiKey);
    const providedBuf = Buffer.from(providedToken);
    const isTokenValid =
      expectedBuf.length === providedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, providedBuf);

    if (!providedToken || !isTokenValid) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized webhook token',
      });
    }
  }

  // Hỗ trợ cả payload trực tiếp { content, amount, transactionDate } và định dạng chuẩn của SePay / Casso
  const rawPayload =
    Array.isArray(req.body?.data) && req.body.data.length > 0
      ? req.body.data[0]
      : (req.body ?? {});

  const content = String(
    rawPayload.content ?? rawPayload.description ?? rawPayload.addInfo ?? ''
  ).trim();
  const amount = Number(
    rawPayload.amount ?? rawPayload.transferAmount ?? 0
  );
  const transactionDate =
    rawPayload.transactionDate ?? rawPayload.when ?? new Date().toISOString();

  // Tìm kiếm mã đơn đặt sân (dạng Regex tìm chuỗi 'DVA-...' hoặc mã bị ngân hàng lược bỏ dấu '-' hoặc nội dung CK DVA) bên trong content
  const hyphenMatch = content.match(/DVA-[A-Z0-9]+(?:-[A-Z0-9]+)*/i);
  const spacedCodeMatch = content.match(/DVA[\s-]*([A-Z]{2,3})[\s-]*(\d{8})[\s-]*(\d{4})/i);
  const extractedBookingCode = spacedCodeMatch
    ? `DVA-${spacedCodeMatch[1].toUpperCase()}-${spacedCodeMatch[2]}-${spacedCodeMatch[3]}`
    : hyphenMatch
    ? hyphenMatch[0].toUpperCase()
    : null;

  const hasDvaKeyword = /\bDVA\b/i.test(content) || Boolean(extractedBookingCode);
  if (!hasDvaKeyword) {
    return res.status(200).json({
      success: true,
      message: 'Transaction ignored',
    });
  }

  // Tra cứu bản ghi trong bảng Booking qua Prisma
  let booking = extractedBookingCode
    ? await prisma.booking.findFirst({
        where: {
          bookingCode: {
            equals: extractedBookingCode,
            mode: 'insensitive',
          },
        },
        include: {
          court: true,
        },
      })
    : null;

  // Fallback: Nếu ngân hàng tự động xóa dấu '-' hoặc khách dùng nội dung transferContent (VD: "DVA BTL TT 17H30 19H30 20261023")
  if (!booking) {
    const normalizedContent = content.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const pendingBookings = await prisma.booking.findMany({
      where: { paymentStatus: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { court: true },
    });

    booking =
      pendingBookings.find((b) => {
        const cleanCode = b.bookingCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const cleanTransfer = (b.transferContent || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return (
          (cleanCode && normalizedContent.includes(cleanCode)) ||
          (cleanTransfer && normalizedContent.includes(cleanTransfer))
        );
      }) ?? null;
  }

  if (!booking) {
    return res.status(200).json({
      success: true,
      message: 'Transaction ignored',
    });
  }

  // Nếu booking.paymentStatus === 'PAID': Bỏ qua (tránh xử lý trùng)
  if (booking.paymentStatus === 'PAID') {
    return res.status(200).json({
      success: true,
      message: 'Booking already paid, transaction ignored',
    });
  }

  // Kiểm tra số tiền chuyển khoản: Nếu amount >= booking.totalPrice
  if (!Number.isFinite(amount) || amount < booking.totalPrice) {
    return res.status(200).json({
      success: false,
      message: 'Insufficient payment amount',
    });
  }

  const parsedTxDate = transactionDate ? new Date(transactionDate) : new Date();
  const confirmedAt = Number.isNaN(parsedTxDate.getTime()) ? new Date() : parsedTxDate;

  // Cập nhật trạng thái booking thành PAID trong PostgreSQL
  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      paymentStatus: 'PAID',
      holdExpiresAt: null,
      customerConfirmedAt: booking.customerConfirmedAt ?? confirmedAt,
    },
  });

  // Gọi hàm sendBookingConfirmationEmail (đã bọc try/catch bất đồng bộ bên trong và tại nơi gọi)
  try {
    await sendBookingConfirmationEmail(
      {
        ...updatedBooking,
        timeSlot: `${updatedBooking.startTime} - ${updatedBooking.endTime}`,
      },
      booking.court
    );
  } catch (mailErr: any) {
    console.error('[Webhook Mailer Warning]', mailErr?.message || mailErr);
  }

  return res.status(200).json({
    success: true,
    message: 'Payment processed and email sent',
  });
}));

// Unknown /api routes must answer with JSON (not the SPA index.html)
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Central error handler: validation errors -> 4xx, everything else -> generic 500 (details only in server log)
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(err);
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Vite Middleware Integration for Development & Production
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
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
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }
}

ensurePostgreSQLSeeded()
  .catch((err) => {
    console.warn('[Database] Initial PostgreSQL connection/seed warning:', err?.message || err);
  })
  .then(() => setupViteOrStatic())
  .then(() => {
    const httpServer = app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`=================================================`);
      console.log(`🏐 DVA Volleyball Club Platform Server Running`);
      console.log(`⚡ Port: ${PORT}`);
      console.log(`🗄️  Database: PostgreSQL (Prisma ORM)`);
      console.log(`💳 Bank: ${BANK.id} ${BANK.accountNo} (${BANK.accountName})`);
      console.log(`📊 Google Sheets v4 API Sync: ONLINE`);
      console.log(`=================================================`);
    });

    const shutdown = () => {
      httpServer.close(() => {
        void prisma.$disconnect().finally(() => process.exit(0));
      });
      setTimeout(() => process.exit(0), 1500).unref();
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch((err) => {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  });
