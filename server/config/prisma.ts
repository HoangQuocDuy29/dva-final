import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  RotationKnowledge as PrismaRotation,
  User as DbUser,
  Player as DbPlayer,
  Court as DbCourt,
  ClosedSlot as DbClosedSlot,
  Booking as DbBooking,
  TrainingCourse as DbTrainingCourse,
  TrainingRegistration as DbTrainingRegistration,
  CoachProfile as DbCoachProfile,
  MemberApplication as DbMemberApplication,
  NewsPost as DbNewsPost,
  Product as DbProduct,
  Order as DbOrder,
  OrderItem as DbOrderItem,
  GuestSession as DbGuestSession,
  Tournament as DbTournament,
  TournamentTeam as DbTournamentTeam,
  TournamentPlayer as DbTournamentPlayer,
  TournamentMatch as DbTournamentMatch,
  TournamentOfficial as DbTournamentOfficial,
} from '@prisma/client';
import {
  Booking,
  BookingAddons,
  ClosedSlot,
  CoachProfile,
  Court,
  DeliveryMethod,
  GuestSessionRecord,
  MemberApplication,
  NewsPost,
  OrderStatus,
  Player,
  PlayerGender,
  PlayerLevel,
  RotationKnowledge,
  StoreCategoryId,
  StoreOrder,
  StoreOrderItem,
  StoreProduct,
  Tournament,
  TournamentFinanceSummary,
  TournamentMatch,
  TournamentMatchStage,
  TournamentMatchStatus,
  TournamentMode,
  TournamentOfficial,
  TournamentOfficialRole,
  TournamentPlayer,
  TournamentPodiumOverride,
  TournamentPrizeTier,
  TournamentSetFormat,
  TournamentStatus,
  TournamentTeam,
  TournamentTrackingMode,
  TrainingCourse,
  TrainingRegistration,
  countryCodeToFlagEmoji,
  isJerseyCategory,
} from '../../src/types';
import { normalizeSkillRank } from '../../src/shared/skillRanks';
import { normalizeSetScores, normalizeTournamentCourtName } from '../../src/shared/tournaments';
import {
  getDefaultWeeklyScheduleForCourt,
  normalizeCourtWeeklySchedule,
} from '../../src/shared/schedule';
import {
  INITIAL_BOOKINGS,
  INITIAL_COACHES,
  INITIAL_COURTS,
  INITIAL_MEMBER_APPLICATIONS,
  INITIAL_NEWS,
  INITIAL_PLAYERS,
  INITIAL_TRAINING_COURSES,
} from '../../src/data/mockData';
import { env, ROOT_DIR } from './env';
import {
  createDatabaseCircuitBreaker,
  isDatabaseUnavailableError,
} from '../utils/bookingHolds';
import {
  StoredUser,
  hashPassword,
  isBcryptHash,
  setUserLookup,
} from '../middlewares/auth.middleware';

export { INITIAL_PLAYERS, INITIAL_MEMBER_APPLICATIONS };

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

const databaseUrl = env.databaseUrl;
const sslDisabled = databaseUrl.includes('sslmode=disable');
const isLocalDb =
  databaseUrl.includes('localhost') ||
  databaseUrl.includes('127.0.0.1') ||
  databaseUrl.includes('::1');
const isCloudDb =
  !sslDisabled &&
  (databaseUrl.includes('neon.tech') ||
    databaseUrl.includes('render.com') ||
    databaseUrl.includes('supabase.co') ||
    databaseUrl.includes('supabase.com') ||
    databaseUrl.includes('sslmode=require') ||
    (!isLocalDb && env.nodeEnv === 'production'));

function createPgPool(): Pool {
  // Supabase Free Nano / Session & Transaction Pooler protection: cap pool at 5, release idle after 10s
  const newPool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: env.pgPoolIdleTimeoutMs,
    max: env.pgPoolMax,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    ...(isCloudDb ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  newPool.on('error', (err: any) => {
    const isIdleSocketReset =
      err?.code === 'ECONNRESET' ||
      err?.code === 'EPIPE' ||
      err?.message?.includes('ECONNRESET') ||
      err?.message?.includes('Connection terminated unexpectedly');

    if (isIdleSocketReset) return;
    console.warn('[Database Pool Warning] Idle connection warning:', err?.message || err);
  });

  return newPool;
}

export const pool = globalForPrisma.pool ?? createPgPool();
const adapter = new PrismaPg(pool, { disposeExternalPool: true });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.nodeEnv !== 'production') {
  globalForPrisma.pool = pool;
  globalForPrisma.prisma = prisma;
}

export const dbCircuitBreaker = createDatabaseCircuitBreaker({
  transientOpenMs: 20_000,
  quotaOpenMs: 60_000,
});

// ----------------------------------------------------------------------------
// Auth User Lookup Cache (5s TTL + single-flight coalescing)
// ----------------------------------------------------------------------------
const USER_LOOKUP_TTL_MS = 5_000;
const userLookupCache = new Map<string, { user?: StoredUser; expiresAt: number }>();
const userLookupInFlight = new Map<string, Promise<StoredUser | undefined>>();

export function invalidateUserLookupCache(id: string): void {
  userLookupCache.delete(id);
}

setUserLookup(async (id) => {
  const now = Date.now();
  const cached = userLookupCache.get(id);
  if (cached && now < cached.expiresAt) {
    return cached.user;
  }

  const pending = userLookupInFlight.get(id);
  if (pending) return pending;

  const lookupPromise = (async (): Promise<StoredUser | undefined> => {
    try {
      const dbUser = await prisma.user.findUnique({ where: { id } });
      const resolved = dbUser ? toStoredUser(dbUser) : undefined;
      userLookupCache.set(id, { user: resolved, expiresAt: Date.now() + USER_LOOKUP_TTL_MS });
      return resolved;
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        throw error;
      }
      console.error('[Auth Lookup Error]:', error);
      return undefined;
    } finally {
      userLookupInFlight.delete(id);
    }
  })();

  userLookupInFlight.set(id, lookupPromise);
  return lookupPromise;
});

// ============================================================================
// DTO MAPPERS (Prisma Record <-> API / Frontend Types)
// ============================================================================

export function safeIsoString(val: any): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') return val;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export function toStoredUser(u: DbUser | any): StoredUser {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    phoneNumber: u.phoneNumber ?? undefined,
    avatarUrl: u.avatarUrl ?? undefined,
    isActive: u.isActive !== false,
    lastLoginAt: u.lastLoginAt ? safeIsoString(u.lastLoginAt) : undefined,
    createdAt: safeIsoString(u.createdAt),
    passwordHash: u.passwordHash,
    tokenVersion: typeof u.tokenVersion === 'number' ? u.tokenVersion : 1,
  };
}

export const normalizeSquad = (squad?: any): 'Youth' | 'Junior' | 'Senior' => {
  if (!squad) return 'Youth';
  const s = String(squad).trim().toUpperCase();
  if (s === 'KID' || s === 'YOUTH') return 'Youth';
  if (s === 'JUNIOR') return 'Junior';
  return 'Senior';
};

export function extractBirthYearFromDob(dob?: unknown): number | null {
  if (typeof dob !== 'string') return null;
  const trimmed = dob.trim();
  if (!trimmed) return null;
  const isoMatch = /^(\d{4})(?:[-/]|$)/.exec(trimmed);
  const dmyMatch = !isoMatch ? /(\d{4})$/.exec(trimmed) : null;
  const year = Number((isoMatch ?? dmyMatch)?.[1]);
  return Number.isInteger(year) && year >= 1950 && year <= 2030 ? year : null;
}

export function resolveApplicationBirthYear(app: {
  birthYear?: unknown;
  bornYear?: unknown;
  dob?: unknown;
}): number | null {
  for (const candidate of [app.birthYear, app.bornYear]) {
    if (candidate !== undefined && candidate !== null && candidate !== '') {
      const year = Number(candidate);
      if (Number.isInteger(year) && year >= 1950 && year <= 2030) return year;
    }
  }
  return extractBirthYearFromDob(app.dob);
}

export function normalizeGender(val?: unknown): PlayerGender | null {
  if (typeof val !== 'string') return null;
  const clean = val.trim().toUpperCase();
  return clean === 'MALE' || clean === 'FEMALE' ? clean : null;
}

export function toPlayerDto(p: DbPlayer | any): Player {
  const resolvedCountry = p.countryName || p.country || 'Vietnam';
  const resolvedCode = (p.countryCode || 'VN').toUpperCase();
  const resolvedFlag = p.countryFlag || countryCodeToFlagEmoji(resolvedCode);
  const resolvedJoined = Number(p.joinedYear ?? p.joined) || 2025;
  const rawSquad = (p as any).squad || (p as any).category || (p as any).team || p.level;
  const normalizedSquad = normalizeSquad(rawSquad);
  const normalizedLevel = normalizedSquad.toUpperCase() as PlayerLevel;
  const rawBornYear = p.bornYear ?? (p as any).birthYear;
  const resolvedBornYear =
    rawBornYear !== undefined && rawBornYear !== null && Number.isInteger(Number(rawBornYear)) && Number(rawBornYear) > 0
      ? Number(rawBornYear)
      : undefined;

  return {
    id: p.id,
    userId: p.userId ?? undefined,
    fullName: p.fullName,
    jerseyNumber: Number(p.jerseyNumber) || 0,
    height: Number(p.height) || 180,
    weight: Number(p.weight) || 70,
    spikeTouch: Number(p.spikeTouch) || 300,
    blockTouch: Number(p.blockTouch) || 290,
    hometownCountry: p.hometownCountry || 'Vietnam',
    country: resolvedCountry,
    countryName: resolvedCountry,
    countryCode: resolvedCode,
    countryFlag: resolvedFlag,
    bornYear: resolvedBornYear,
    level: normalizedLevel,
    skillRank: normalizeSkillRank(p.skillRank),
    gender: normalizeGender(p.gender),
    position: p.position || 'OH',
    avatarUrl: p.avatarUrl ?? '',
    bio: p.bio ?? '',
    isCaptain: Boolean(p.isCaptain ?? p.captain),
    captain: Boolean(p.isCaptain ?? p.captain),
    joined: resolvedJoined,
    joinedYear: resolvedJoined,
    isActive: p.isActive !== false,
  };
}

export function toCourtDto(c: DbCourt & { status?: string | null; isMaintenance?: boolean | null }): Court {
  const isMaintenance = Boolean(
    c.isMaintenance === true || c.status === 'MAINTENANCE' || c.isAvailable === false
  );
  const subCourts =
    Array.isArray(c.subCourts) && c.subCourts.length > 0
      ? c.subCourts
      : c.id === 'court-btl' || c.code === 'BTL_TT'
        ? ['Sân A', 'Sân B']
        : undefined;
  return {
    id: c.id,
    code: c.code,
    shortName: c.shortName ?? undefined,
    name: c.name,
    address: c.address ?? 'DVA Sports Center, Hanoi',
    description: c.description,
    floorType: c.floorType,
    hourlyRate: c.hourlyRate,
    minHours: c.minHours,
    includes: c.includes,
    imageUrl: c.imageUrl,
    status: isMaintenance ? 'MAINTENANCE' : 'ACTIVE',
    isMaintenance,
    isAvailable: !isMaintenance,
    isActive: c.isActive !== false,
    subCourts,
    weeklySchedule: normalizeCourtWeeklySchedule(c.weeklySchedule, c.id || c.code, subCourts),
  };
}

export function toClosedSlotDto(cs: DbClosedSlot | any): ClosedSlot {
  return {
    id: cs.id,
    courtId: cs.courtId,
    courtName: cs.courtName,
    subCourt: cs.subCourt || undefined,
    date: cs.date,
    slotLabel: cs.slotLabel,
    reason: cs.reason ?? undefined,
    closedBy: cs.closedBy ?? undefined,
    createdAt: safeIsoString(cs.createdAt),
  };
}

export function toBookingDto(b: DbBooking | any): Booking {
  const rawAddons = (
    b.addons && typeof b.addons === 'object' && !Array.isArray(b.addons) ? b.addons : {}
  ) as Record<string, any>;
  const addons: BookingAddons = {
    mineralWaterBottles: Number(rawAddons.mineralWaterBottles) || 0,
    mikasaBallCrate: Boolean(rawAddons.mikasaBallCrate),
    certifiedReferee: Boolean(rawAddons.certifiedReferee),
  };

  return {
    id: b.id,
    courtId: b.courtId,
    courtName: b.courtName,
    subCourt: b.subCourt ?? undefined,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    customerPhone: b.customerPhone,
    bookingDate: b.bookingDate,
    startTime: b.startTime,
    endTime: b.endTime,
    totalHours: b.totalHours,
    courtPrice: b.courtPrice,
    addons,
    addonsPrice: b.addonsPrice,
    totalPrice: b.totalPrice,
    paymentStatus: b.paymentStatus,
    bookingCode: b.bookingCode,
    transferContent: b.transferContent ?? undefined,
    createdAt: safeIsoString(b.createdAt),
    notes: b.notes ?? undefined,
    ...(b.customerConfirmedAt ? { customerConfirmedAt: safeIsoString(b.customerConfirmedAt) } : {}),
    ...(b.holdExpiresAt ? { holdExpiresAt: safeIsoString(b.holdExpiresAt) } : {}),
  };
}

export function toCourseDto(c: DbTrainingCourse): TrainingCourse {
  let normalizedTitle = c.title;
  if (normalizedTitle && normalizedTitle.includes('Học 1-1 với coach kèm từ cơ bản')) {
    normalizedTitle = '1-on-1 Private Coaching & Fundamentals';
  }
  let normalizedPriceUnit = c.priceUnit ?? undefined;
  if (normalizedPriceUnit) {
    const u = normalizedPriceUnit.toLowerCase();
    if (u.includes('người') && u.includes('buổi')) normalizedPriceUnit = '/ player / session';
    else if (u.includes('buổi')) normalizedPriceUnit = '/ player / session';
    else if (u.includes('tháng')) normalizedPriceUnit = '/ month';
    else if (u.includes('năm')) normalizedPriceUnit = '/ year';
    else if (u.includes('khóa')) normalizedPriceUnit = '/ course';
  }
  return {
    id: c.id,
    title: normalizedTitle,
    level: c.level,
    skillRankLabel: c.skillRankLabel ?? undefined,
    coachName: c.coachName,
    coachTitle: c.coachTitle,
    schedule: c.schedule,
    duration: c.duration,
    price: c.price,
    priceUnit: normalizedPriceUnit,
    tag: c.tag ?? undefined,
    benefits: c.benefits,
    description: c.description,
    targetAudience: c.targetAudience,
    curriculum: c.curriculum,
    maxSlots: c.maxSlots,
    enrolledSlots: c.enrolledSlots,
    imageUrl: c.imageUrl ?? undefined,
    isActive: c.isActive !== false,
  };
}

export function toRegistrationDto(r: DbTrainingRegistration | any): TrainingRegistration {
  return {
    id: r.id,
    courseId: r.courseId,
    courseTitle: r.courseTitle,
    fullName: r.fullName,
    email: r.email,
    phone: r.phone,
    experienceLevel: r.experienceLevel,
    preferredTimeSlot: r.preferredTimeSlot,
    notes: r.notes ?? undefined,
    status: r.status,
    createdAt: safeIsoString(r.createdAt),
  };
}

export function toCoachDto(c: DbCoachProfile): CoachProfile {
  return {
    id: c.id,
    name: c.name,
    role: c.role,
    experience: c.experience,
    height: c.height,
    age: c.age,
    bornYear: c.bornYear,
    avatarUrl: c.avatarUrl,
    specialty: c.specialty,
    bio: c.bio,
    certifications: c.certifications,
  };
}

export function toRotationEnum(val?: string): PrismaRotation {
  switch (val) {
    case '5-1':
    case 'ROTATION_5_1':
      return 'ROTATION_5_1';
    case '6-2':
    case 'ROTATION_6_2':
      return 'ROTATION_6_2';
    case '4-2':
    case 'ROTATION_4_2':
      return 'ROTATION_4_2';
    default:
      return 'BEGINNER';
  }
}

export function fromRotationEnum(val: PrismaRotation): RotationKnowledge {
  switch (val) {
    case 'ROTATION_5_1':
      return '5-1';
    case 'ROTATION_6_2':
      return '6-2';
    case 'ROTATION_4_2':
      return '4-2';
    default:
      return 'BEGINNER';
  }
}

/**
 * Maps MemberApplication DB record to API DTO.
 * When `includeSensitive` is false (ADMIN / non-SUPERADMIN), strips ALL contact PII
 * (`gmail`, `instagram`, `zalo`, `hometownCountry`, `toEmail` in email history) AND financial fields (`entryFee`, `paidAt`).
 */
export function toApplicationDto(
  a: DbMemberApplication | any,
  includeSensitive: boolean = true
): MemberApplication {
  const rawSquad = (a as any).squad || (a as any).category || (a as any).team || a.level;
  const normalizedLevel = (normalizeSquad(rawSquad).toUpperCase() as PlayerLevel) || 'YOUTH';
  const rawPay = String(a.paymentStatus || 'PENDING').toUpperCase();
  const normalizedPaymentStatus: MemberApplication['paymentStatus'] =
    rawPay === 'PAID' ? 'PAID' : rawPay === 'FREE' ? 'FREE' : 'PENDING';

  const birthYear = resolveApplicationBirthYear(a) ?? undefined;

  const evalScores =
    a.evaluationScores && typeof a.evaluationScores === 'object' && !Array.isArray(a.evaluationScores)
      ? {
          physical: Number(a.evaluationScores.physical) || 0,
          technique: Number(a.evaluationScores.technique) || 0,
          tactical: Number(a.evaluationScores.tactical) || 0,
          attitude: Number(a.evaluationScores.attitude) || 0,
          total: Number(a.evaluationScores.total) || 0,
          ...(a.evaluationScores.evaluatedBy ? { evaluatedBy: String(a.evaluationScores.evaluatedBy) } : {}),
          ...(a.evaluationScores.evaluatedAt ? { evaluatedAt: String(a.evaluationScores.evaluatedAt) } : {}),
        }
      : undefined;

  const sanitizeHistory = (hist: unknown) =>
    Array.isArray(hist)
      ? hist.map((item: any) => {
          if (!item || typeof item !== 'object') return item;
          if (includeSensitive) return item;
          const { toEmail: _omit, ...rest } = item;
          return rest;
        })
      : undefined;

  return {
    id: a.id,
    fullName: a.fullName,
    dob: a.dob,
    ...(birthYear ? { birthYear } : {}),
    position: a.position,
    ...(includeSensitive ? { hometownCountry: a.hometownCountry } : {}),
    desiredJerseyNumber: a.desiredJerseyNumber,
    level: normalizedLevel,
    skillRank: normalizeSkillRank(a.skillRank),
    gender: normalizeGender(a.gender),
    height: a.height,
    weight: a.weight,
    spikeReach: a.spikeReach,
    blockReach: a.blockReach,
    ...(includeSensitive
      ? {
          gmail: a.gmail,
          instagram: a.instagram,
          zalo: a.zalo,
        }
      : {}),
    rotationKnowledge: fromRotationEnum(a.rotationKnowledge),
    status: a.status,
    paymentStatus: normalizedPaymentStatus,
    ...(includeSensitive
      ? {
          paidAt: a.paidAt ? safeIsoString(a.paidAt) : undefined,
          entryFee:
            normalizedPaymentStatus === 'FREE'
              ? 0
              : a.entryFee !== null && a.entryFee !== undefined
                ? Number(a.entryFee)
                : 100000,
        }
      : {}),
    approvedAt: a.approvedAt ? safeIsoString(a.approvedAt) : undefined,
    reviewNotes: a.reviewNotes ?? undefined,
    experience: a.experience ?? undefined,
    preferredDays: a.preferredDays ?? undefined,
    preferredSchedule: a.preferredDays ?? undefined,
    scores: evalScores,
    evaluationScores: evalScores,
    coachNotes: a.coachNotes ?? undefined,
    scheduledAt: a.scheduledAt ? safeIsoString(a.scheduledAt) : undefined,
    scheduledDate: a.scheduledDate ?? undefined,
    scheduledDayLabel: a.scheduledDayLabel ?? undefined,
    scheduledTime: a.scheduledTime ?? undefined,
    scheduledNotes: a.scheduledNotes ?? undefined,
    scheduledEmailSentAt: a.scheduledEmailSentAt ? safeIsoString(a.scheduledEmailSentAt) : undefined,
    scheduleHistory: sanitizeHistory(a.scheduleHistory),
    resultEmailSentAt: a.resultEmailSentAt ? safeIsoString(a.resultEmailSentAt) : undefined,
    resultEmailHistory: sanitizeHistory(a.resultEmailHistory),
    createdAt: safeIsoString(a.createdAt),
    updatedAt: a.updatedAt ? safeIsoString(a.updatedAt) : undefined,
  };
}

export function toGuestSessionDto(g: DbGuestSession | any): GuestSessionRecord {
  return {
    id: g.id,
    guestName: g.guestName,
    guestEmail: g.guestEmail,
    phone: g.phone ?? undefined,
    position: g.position || 'OH',
    positionPrivilege: g.positionPrivilege || 'FIXED',
    level: g.level || 'Junior',
    sessionDate: g.sessionDate,
    sessionTime: g.sessionTime,
    courtAddress: g.courtAddress ?? undefined,
    amount: Number(g.amount) || 0,
    transferContent: g.transferContent,
    paymentStatus: (g.paymentStatus || 'PENDING') as GuestSessionRecord['paymentStatus'],
    notes: g.notes ?? undefined,
    paidAt: g.paidAt ? safeIsoString(g.paidAt) : undefined,
    emailSentAt: safeIsoString(g.emailSentAt),
    createdAt: safeIsoString(g.createdAt),
    updatedAt: safeIsoString(g.updatedAt),
  };
}

export function toNewsDto(
  n: DbNewsPost & { imageUrl?: string | null; image?: string | null; isPinned?: boolean | null }
): NewsPost {
  const resolvedImageUrl = (n.imageUrl || n.image || n.thumbnail || '').trim();
  const resolvedPublishedAt =
    (typeof n.publishedAt === 'string' && n.publishedAt.trim()) ||
    safeIsoString(n.createdAt).slice(0, 10);
  return {
    id: n.id,
    title: n.title,
    slug: n.slug,
    excerpt: n.excerpt,
    content: n.content,
    imageUrl: resolvedImageUrl,
    image: resolvedImageUrl,
    thumbnail: resolvedImageUrl,
    category: n.category,
    authorName: n.authorName,
    authorRole: n.authorRole,
    publishedAt: resolvedPublishedAt,
    createdAt: safeIsoString(n.createdAt),
    readTimeMinutes: n.readTimeMinutes,
    featured: Boolean(n.featured),
    isPinned: Boolean(n.isPinned),
  };
}

export function toProductDto(p: DbProduct | any): StoreProduct {
  const frontImage = (p.frontImage || p.imageUrl || '').trim();
  const backImage = p.backImage ? String(p.backImage).trim() : undefined;
  return {
    id: p.id,
    sku: p.sku,
    slug: p.slug ? String(p.slug).trim() : undefined,
    name: p.name,
    category: (p.category || 'SHORT_SLEEVE') as StoreCategoryId,
    originalPrice: p.originalPrice !== null && p.originalPrice !== undefined ? Number(p.originalPrice) : undefined,
    price: Number(p.price) || 0,
    stock: Number(p.stock) || 0,
    frontImage,
    backImage: backImage || undefined,
    imageUrl: frontImage,
    sizes: Array.isArray(p.sizes) ? p.sizes : ['S', 'M', 'L', 'XL', '2XL'],
    colors: Array.isArray(p.colors) ? p.colors : [],
    badge: p.badge ? String(p.badge).trim() : undefined,
    allowCustomPrint: p.allowCustomPrint !== false,
    sortOrder: Number(p.sortOrder) || 0,
    description: p.description ?? undefined,
    isPaused: Boolean(p.isPaused),
    isActive: p.isActive !== false,
    createdAt: safeIsoString(p.createdAt),
    updatedAt: safeIsoString(p.updatedAt),
  };
}

export function toOrderItemDto(item: DbOrderItem | any): StoreOrderItem {
  const unitPrice = Number(item.unitPrice ?? item.price) || 0;
  return {
    id: item.id,
    orderId: item.orderId,
    productId: item.productId,
    productName: item.productName,
    category: item.category ?? undefined,
    sku: item.sku,
    size: item.size ?? undefined,
    color: item.color ?? undefined,
    quantity: Number(item.quantity) || 1,
    unitPrice,
    price: unitPrice,
    height: item.height !== null && item.height !== undefined ? Number(item.height) : undefined,
    weight: item.weight !== null && item.weight !== undefined ? Number(item.weight) : undefined,
    customName: item.customName ?? undefined,
    customNumber: item.customNumber ?? undefined,
  };
}

export function toOrderDto(o: (DbOrder & { items?: DbOrderItem[] }) | any): StoreOrder {
  const status = (o.status || o.paymentStatus || 'PENDING') as OrderStatus;
  const deliveryMethod = (o.deliveryMethod || 'COURT_PICKUP') as DeliveryMethod;
  const rawItems: any[] = Array.isArray(o.items) ? o.items : [];
  const items: StoreOrderItem[] = rawItems.map(toOrderItemDto);
  const customerPhone = o.customerPhone || o.phone || '';
  const customerEmail = o.customerEmail || o.email || undefined;
  const productName =
    items.map((it: StoreOrderItem) => `${it.productName}${it.quantity > 1 ? ` (x${it.quantity})` : ''}`).join(' + ') ||
    'DVA Merchandise';
  const size = items.map((it: StoreOrderItem) => it.size || 'M').join(', ') || 'M';
  const customName = items.map((it: StoreOrderItem) => it.customName).filter(Boolean).join(', ') || undefined;
  const customNumber = items.map((it: StoreOrderItem) => it.customNumber).filter(Boolean).join(', ') || undefined;

  return {
    id: o.id,
    orderCode: o.orderCode,
    customerName: o.customerName,
    customerPhone,
    phone: customerPhone,
    customerEmail,
    email: customerEmail,
    socialLink: o.socialLink ?? undefined,
    deliveryMethod,
    shippingAddress: o.shippingAddress ?? undefined,
    items,
    productName,
    size,
    customName,
    customNumber,
    quantity: Number(o.quantity) || items.reduce((sum, it) => sum + (it.quantity || 1), 0) || 1,
    totalAmount: Number(o.totalAmount) || 0,
    status,
    paymentStatus: status,
    transferContent: o.transferContent || `DVA JSY ${o.orderCode?.slice(-6) || ''}`.trim(),
    ...(o.customerConfirmedAt ? { customerConfirmedAt: safeIsoString(o.customerConfirmedAt) } : {}),
    ...(o.shippingEmailSentAt ? { shippingEmailSentAt: safeIsoString(o.shippingEmailSentAt) } : {}),
    notes: o.notes ?? undefined,
    createdAt: safeIsoString(o.createdAt),
    updatedAt: safeIsoString(o.updatedAt),
  };
}

// ============================================================================
// TOURNAMENTS MODULE DTO MAPPERS (Strict RBAC Stripping for Public & ADMIN)
// ============================================================================

export function toTournamentPlayerDto(
  p: DbTournamentPlayer | any,
  includeSensitive: boolean = false
): TournamentPlayer {
  return {
    id: p.id,
    teamId: p.teamId,
    tournamentId: p.tournamentId,
    linkedPlayerId: p.linkedPlayerId ?? undefined,
    fullName: p.fullName,
    jerseyNumber: Number(p.jerseyNumber) || 0,
    position: (p.position || 'OH') as TournamentPlayer['position'],
    height: p.height !== null && p.height !== undefined ? Number(p.height) : undefined,
    spikeTouch: p.spikeTouch !== null && p.spikeTouch !== undefined ? Number(p.spikeTouch) : undefined,
    avatarUrl: p.avatarUrl ?? undefined,
    ...(includeSensitive
      ? {
          birthYear: p.birthYear !== null && p.birthYear !== undefined ? Number(p.birthYear) : undefined,
          rejectionReason: p.rejectionReason ?? undefined,
        }
      : {}),
    eligibilityStatus: (p.eligibilityStatus || 'VERIFIED') as TournamentPlayer['eligibilityStatus'],
    isCaptain: Boolean(p.isCaptain),
    awards: Array.isArray(p.awards) ? p.awards.map(String) : [],
    createdAt: p.createdAt ? safeIsoString(p.createdAt) : undefined,
  };
}

export function toTournamentTeamDto(
  t: (DbTournamentTeam & { players?: DbTournamentPlayer[] }) | any,
  includePrivate: boolean = false,
  includeSensitive: boolean = includePrivate
): TournamentTeam {
  return {
    id: t.id,
    tournamentId: t.tournamentId,
    name: t.name,
    shortName: t.shortName ?? undefined,
    logoUrl: t.logoUrl ?? undefined,
    isDvaTeam: Boolean(t.isDvaTeam),
    dvaSquadLevel: t.dvaSquadLevel ?? undefined,
    pool: t.pool ?? null,
    seedOrder: Number(t.seedOrder) || 0,
    manualRankOverride:
      t.manualRankOverride !== null && t.manualRankOverride !== undefined
        ? Number(t.manualRankOverride)
        : null,
    finalRank: t.finalRank !== null && t.finalRank !== undefined ? Number(t.finalRank) : null,
    captainName: t.captainName ?? undefined,
    // Strictly only SUPERADMIN (`includeSensitive === true`) receives captain PII & financial transfer details
    ...(includeSensitive
      ? {
          captainPhone: t.captainPhone ?? undefined,
          captainEmail: t.captainEmail ?? undefined,
          transferContent: t.transferContent ?? undefined,
          entryFeeAmount: Number(t.entryFeeAmount) || 0,
          notes: t.notes ?? undefined,
          customerConfirmedAt: t.customerConfirmedAt ? safeIsoString(t.customerConfirmedAt) : undefined,
          paidAt: t.paidAt ? safeIsoString(t.paidAt) : undefined,
        }
      : {
          entryFeeAmount: 0,
        }),
    paymentStatus: (t.paymentStatus || 'PENDING') as TournamentTeam['paymentStatus'],
    ...(Array.isArray(t.players)
      ? {
          players: (includePrivate
            ? t.players
            : t.players.filter((pl: any) => pl.eligibilityStatus !== 'REJECTED')
          ).map((pl: any) => toTournamentPlayerDto(pl, includeSensitive)),
        }
      : {}),
    createdAt: t.createdAt ? safeIsoString(t.createdAt) : undefined,
    updatedAt: t.updatedAt ? safeIsoString(t.updatedAt) : undefined,
  };
}

export function toTournamentOfficialDto(
  o: DbTournamentOfficial | any,
  _includePrivate: boolean = false,
  includeSensitive: boolean = false
): TournamentOfficial {
  return {
    id: o.id,
    tournamentId: o.tournamentId,
    fullName: o.fullName,
    role: (o.role || 'MAIN_REFEREE') as TournamentOfficialRole,
    certification: o.certification ?? undefined,
    avatarUrl: o.avatarUrl ?? undefined,
    ...(includeSensitive && o.phone ? { phone: o.phone } : {}),
    sortOrder: Number(o.sortOrder) || 0,
    createdAt: o.createdAt ? safeIsoString(o.createdAt) : undefined,
  };
}

export function toTournamentMatchDto(
  m: DbTournamentMatch | any,
  includeSensitive: boolean = false
): TournamentMatch {
  return {
    id: m.id,
    tournamentId: m.tournamentId,
    matchCode: m.matchCode,
    stage: (m.stage || 'POOL_A') as TournamentMatchStage,
    bracketSide: m.bracketSide ?? null,
    courtName: normalizeTournamentCourtName(m.courtName || 'Court A'),
    scheduledTime: m.scheduledTime ?? undefined,
    matchOrder: Number(m.matchOrder) || 0,
    status: (m.status || 'SCHEDULED') as TournamentMatchStatus,
    setFormat: (m.setFormat || 'BO3') as TournamentSetFormat,
    homeTeamId: m.homeTeamId ?? null,
    awayTeamId: m.awayTeamId ?? null,
    homeLabel: m.homeLabel ?? undefined,
    awayLabel: m.awayLabel ?? undefined,
    setScores: normalizeSetScores(m.setScores),
    homeSetsWon: Number(m.homeSetsWon) || 0,
    awaySetsWon: Number(m.awaySetsWon) || 0,
    homePointsTotal: Number(m.homePointsTotal) || 0,
    awayPointsTotal: Number(m.awayPointsTotal) || 0,
    winnerTeamId: m.winnerTeamId ?? null,
    officialId: m.officialId ?? null,
    assistantOfficialIds: Array.isArray(m.assistantOfficialIds) ? m.assistantOfficialIds.map(String) : [],
    ...(includeSensitive && m.notes ? { notes: m.notes } : {}),
    createdAt: m.createdAt ? safeIsoString(m.createdAt) : undefined,
    updatedAt: m.updatedAt ? safeIsoString(m.updatedAt) : undefined,
  };
}

export function toTournamentDto(
  t: (DbTournament & {
    teams?: DbTournamentTeam[];
    players?: DbTournamentPlayer[];
    matches?: DbTournamentMatch[];
    officials?: DbTournamentOfficial[];
  }) | any,
  includePrivate: boolean = false,
  includeSensitive: boolean = includePrivate
): Tournament {
  const mode = (t.mode || 'HOSTED') as TournamentMode;
  const rawTeams: any[] = Array.isArray(t.teams) ? t.teams : [];
  const paidTeamsCount = rawTeams.filter((tm) => tm.paymentStatus === 'PAID').length;
  const pendingTeamsCount = rawTeams.filter((tm) => tm.paymentStatus === 'PENDING').length;

  const visibleTeamsRaw = includePrivate
    ? rawTeams
    : mode === 'HOSTED'
      ? rawTeams.filter((tm) => tm.paymentStatus === 'PAID')
      : rawTeams.filter((tm) => tm.paymentStatus !== 'CANCELLED');

  const visibleTeamIds = new Set(visibleTeamsRaw.map((tm) => tm.id));
  const rawPlayers: any[] = Array.isArray(t.players) ? t.players : [];
  const visiblePlayersRaw = includePrivate
    ? rawPlayers
    : rawPlayers.filter((pl) => visibleTeamIds.has(pl.teamId) && pl.eligibilityStatus !== 'REJECTED');

  const rawMatches: any[] = Array.isArray(t.matches) ? t.matches : [];
  const rawOfficials: any[] = Array.isArray(t.officials) ? t.officials : [];

  const prizeConfig: TournamentPrizeTier[] = Array.isArray(t.prizeConfig)
    ? t.prizeConfig.map((p: any) => {
        const prizeMode =
          p?.prizeMode === 'HONOR_ONLY' || p?.prizeMode === 'CASH_AND_TROPHIES'
            ? p.prizeMode
            : undefined;
        return {
          rank: String(p?.rank || '1ST'),
          label: String(p?.label || ''),
          cashAmount:
            prizeMode === 'HONOR_ONLY' ? 0 : p?.cashAmount !== undefined ? Number(p.cashAmount) || 0 : 0,
          nonCashReward: p?.nonCashReward ? String(p.nonCashReward) : '',
          ...(prizeMode ? { prizeMode } : {}),
        };
      })
    : [];

  const podiumOverride: TournamentPodiumOverride | null =
    t.podiumOverride && typeof t.podiumOverride === 'object' && !Array.isArray(t.podiumOverride)
      ? (t.podiumOverride as TournamentPodiumOverride)
      : null;

  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    subtitle: t.subtitle ?? undefined,
    mode,
    trackingMode: (t.trackingMode || 'FULL_BRACKET') as TournamentTrackingMode,
    status: (t.status || 'UPCOMING') as TournamentStatus,
    isActive: t.isActive !== false,
    isRegistrationOpen: Boolean(t.isRegistrationOpen),
    isRosterLocked: Boolean(t.isRosterLocked),
    requireBirthYear: Boolean(t.requireBirthYear),
    maxTeams: Number(t.maxTeams) || 8,
    registrationDeadline: t.registrationDeadline ?? undefined,
    startDate: t.startDate,
    endDate: t.endDate ?? undefined,
    startTime: t.startTime ?? undefined,
    endTime: t.endTime ?? undefined,
    location: t.location || '155 Truong Chinh, Thanh Xuan, Hanoi (DVA Court - BTL Thong Tin)',
    mapsUrl: t.mapsUrl ?? undefined,
    bannerUrl: t.bannerUrl ?? undefined,
    groupSetFormat: (t.groupSetFormat || 'BO3') as TournamentSetFormat,
    knockoutSetFormat: (t.knockoutSetFormat || 'BO3') as TournamentSetFormat,
    // Strictly hide financial entryFeePerTeam & internalExpenseNote from ADMIN and non-SUPERADMIN
    entryFeePerTeam: includeSensitive && mode === 'HOSTED' ? Number(t.entryFeePerTeam) || 0 : 0,
    ...(includeSensitive && t.internalExpenseNote ? { internalExpenseNote: t.internalExpenseNote } : {}),
    rulesContent: t.rulesContent ?? undefined,
    prizeConfig,
    dvaResultSummary: t.dvaResultSummary ?? undefined,
    podiumOverride,
    teams: visibleTeamsRaw.map((tm) => toTournamentTeamDto(tm, includePrivate, includeSensitive)),
    players: visiblePlayersRaw.map((pl) => toTournamentPlayerDto(pl, includeSensitive)),
    matches: rawMatches.map((m) => toTournamentMatchDto(m, includeSensitive)),
    officials: rawOfficials.map((o) => toTournamentOfficialDto(o, includePrivate, includeSensitive)),
    paidTeamsCount,
    pendingTeamsCount,
    createdAt: safeIsoString(t.createdAt),
    updatedAt: safeIsoString(t.updatedAt),
  };
}

export function toTournamentFinanceSummaryDto(
  t: (DbTournament & { teams?: DbTournamentTeam[] }) | any
): TournamentFinanceSummary {
  const mode = (t.mode || 'HOSTED') as TournamentMode;
  const rawTeams: any[] = Array.isArray(t.teams) ? t.teams : [];
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    mode,
    status: (t.status || 'UPCOMING') as TournamentStatus,
    startDate: t.startDate,
    entryFeePerTeam: mode === 'HOSTED' ? Number(t.entryFeePerTeam) || 0 : 0,
    maxTeams: Number(t.maxTeams) || 8,
    teams: rawTeams.map((tm) => ({
      id: tm.id,
      name: tm.name,
      paymentStatus: (tm.paymentStatus || 'PENDING') as TournamentTeam['paymentStatus'],
      entryFeeAmount: Number(tm.entryFeeAmount) || 0,
      paidAt: tm.paidAt ? safeIsoString(tm.paidAt) : undefined,
      createdAt: tm.createdAt ? safeIsoString(tm.createdAt) : undefined,
    })),
  };
}

export const INITIAL_SHOP_PRODUCTS: Omit<StoreProduct, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'prod-jsy-short-red',
    sku: 'DVA-JSY-SH-01',
    slug: 'dva-2026-official-match-jersey-short-sleeve',
    name: 'DVA 2026 Official Match Jersey — Short Sleeve (Home Red)',
    category: 'SHORT_SLEEVE',
    originalPrice: 420000,
    price: 350000,
    stock: 60,
    sortOrder: 90,
    badge: 'BEST SELLER',
    allowCustomPrint: true,
    frontImage: 'https://images.unsplash.com/photo-1580087433295-ab2600c1030e?auto=format&fit=crop&w=900&q=80',
    backImage: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=900&q=80',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    colors: ['Crimson Red'],
    description:
      'Official DVA Volleyball Club 2026 Home Match Kit. Breathable pro-mesh fabric with moisture-wicking technology and custom sublimated player name printing.',
    isPaused: false,
    isActive: true,
  },
  {
    id: 'prod-jsy-sleeveless-dark',
    sku: 'DVA-JSY-SLV-01',
    slug: 'dva-pro-sleeveless-training-tank',
    name: 'DVA Pro Sleeveless Training & Scrimmage Tank (Obsidian Black)',
    category: 'SLEEVELESS',
    originalPrice: 350000,
    price: 290000,
    stock: 50,
    sortOrder: 80,
    badge: 'PRO KIT',
    allowCustomPrint: true,
    frontImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
    backImage: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    colors: ['Obsidian Black', 'Flame Orange'],
    description:
      'High-mobility sleeveless volleyball jersey engineered for intense spike approach and overhead reach. Includes custom back player name sublimation.',
    isPaused: false,
    isActive: true,
  },
  {
    id: 'prod-jsy-women-elite',
    sku: 'DVA-JSY-WMN-01',
    slug: 'dva-womens-elite-competition-jersey',
    name: "DVA Women's Elite Competition Jersey (Sunset Orange/Gold)",
    category: 'WOMEN',
    originalPrice: 400000,
    price: 350000,
    stock: 45,
    sortOrder: 70,
    badge: 'NEW RELEASE',
    allowCustomPrint: true,
    frontImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    backImage: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=80',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    colors: ['Sunset Orange', 'Pearl White'],
    description:
      "Tailored athletic silhouette designed for DVA women's squad athletes. Ultra-light 4-way stretch polyester with custom back player name printing.",
    isPaused: false,
    isActive: true,
  },
  {
    id: 'prod-pad-pro-knee',
    sku: 'DVA-PAD-KP-01',
    slug: 'dva-impact-shield-pro-knee-pads',
    name: 'DVA Impact-Shield Pro Volleyball Knee Pads (Pair)',
    category: 'KNEE_PADS',
    originalPrice: 300000,
    price: 250000,
    stock: 80,
    sortOrder: 50,
    badge: 'ESSENTIAL',
    allowCustomPrint: false,
    frontImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',
    backImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Black', 'White'],
    description:
      'High-density EVA shock-absorbing foam knee pads built for Taraflex court dives and defensive floor recoveries.',
    isPaused: false,
    isActive: true,
  },
  {
    id: 'prod-sck-crew-01',
    sku: 'DVA-SCK-CRW-01',
    slug: 'dva-cushioned-mid-crew-court-socks',
    name: 'DVA Cushioned Mid-Crew Court Socks (Anti-Slip Grip)',
    category: 'SOCKS',
    originalPrice: 150000,
    price: 120000,
    stock: 120,
    sortOrder: 40,
    badge: 'GRIP LOCK',
    allowCustomPrint: false,
    frontImage: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=900&q=80',
    backImage: 'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&w=900&q=80',
    sizes: ['M (36-40)', 'L (41-45)'],
    colors: ['White/Red', 'Black/Orange'],
    description:
      'Reinforced heel and forefoot cushioning with arch compression band to prevent blistering during explosive jumps.',
    isPaused: false,
    isActive: true,
  },
  {
    id: 'prod-ball-mikasa-v200w',
    sku: 'MIKASA-V200W',
    slug: 'official-mikasa-v200w-match-volleyball',
    name: 'Official Mikasa V200W Match Volleyball (FIVB Approved)',
    category: 'VOLLEYBALLS',
    originalPrice: 2200000,
    price: 1950000,
    stock: 50,
    sortOrder: 100,
    badge: 'OFFICIAL MATCH',
    allowCustomPrint: false,
    frontImage: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=900&q=80',
    backImage: 'https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=900&q=80',
    sizes: ['Size 5'],
    colors: ['Yellow / Royal Blue'],
    description:
      'Bóng thi đấu chính thức tiêu chuẩn FIVB với thiết kế 18 múi khí động học cân bằng hoàn hảo, bề mặt da vi sợi Microfiber cao cấp công nghệ lõi kép Double Dimple chống trơn trượt mồ hôi. Chuẩn Size 5 thi đấu Olympic và các giải bóng chuyền chuyên nghiệp quốc tế.',
    isPaused: false,
    isActive: true,
  },
];

// ============================================================================
// ONE-TIME INITIAL SEEDING (JSON / MockData -> PostgreSQL, Optimized Batching)
// ============================================================================

export function readLegacyJsonIfExists<T>(filename: string, fallback: T): T {
  const filePath = path.join(ROOT_DIR, 'data', filename);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    }
  } catch {
    // ignore corrupt legacy json
  }
  return fallback;
}

export async function bootstrapSuperAdminAndUsers(): Promise<void> {
  await prisma.$connect();

  const superAdminEmail = 'quocduyhoang42@gmail.com';
  const superAdminPassword = process.env.SEED_SUPERADMIN_PASSWORD || 'dva@2025';

  // Single findMany instead of N+1 per-account findUnique queries
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, role: true, passwordHash: true },
  });
  const byEmail = new Map(allUsers.map((u) => [u.email, u]));

  const existingSuperAdmin = byEmail.get(superAdminEmail);
  if (!existingSuperAdmin) {
    const passwordHash = await hashPassword(superAdminPassword);
    await prisma.user.create({
      data: {
        id: 'user-superadmin',
        email: superAdminEmail,
        passwordHash,
        fullName: 'Hoang Quoc Duy',
        phoneNumber: '0902090671',
        role: 'SUPERADMIN',
      },
    });
    console.log(`[Bootstrap] Created SUPERADMIN (${superAdminEmail}) with bcrypt password hash.`);
  } else {
    const needsRehash = !isBcryptHash(existingSuperAdmin.passwordHash);
    const needsRoleFix = existingSuperAdmin.role !== 'SUPERADMIN';

    if (needsRehash || needsRoleFix) {
      const data: { passwordHash?: string; role?: 'SUPERADMIN' } = {};
      if (needsRehash) data.passwordHash = await hashPassword(superAdminPassword);
      if (needsRoleFix) data.role = 'SUPERADMIN';
      await prisma.user.update({
        where: { email: superAdminEmail },
        data,
      });
      console.log(`[Bootstrap] Ensured SUPERADMIN (${superAdminEmail}) role/hash integrity in PostgreSQL.`);
    }
  }

  // Migrate any remaining legacy non-bcrypt user hashes
  for (const u of allUsers) {
    if (u.email === superAdminEmail || isBcryptHash(u.passwordHash)) continue;
    const rawPassword = u.passwordHash && !u.passwordHash.startsWith('scrypt$') ? u.passwordHash : 'dva@2025';
    const newHash = await hashPassword(rawPassword);
    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: newHash },
    });
    console.log(`[Bootstrap] Migrated user (${u.email}) passwordHash to bcrypt in PostgreSQL.`);
  }
}

export async function ensurePostgreSQLSeeded(): Promise<void> {
  await prisma.$connect();

  await bootstrapSuperAdminAndUsers();

  // Check table counts in bounded batches so cold-start seed is fast and gentle on Supabase pooler
  const [courtCount, playerCount, coachCount, courseCount, bookingCount] = await Promise.all([
    prisma.court.count(),
    prisma.player.count(),
    prisma.coachProfile.count(),
    prisma.trainingCourse.count(),
    prisma.booking.count(),
  ]);

  if (courtCount === 0) {
    const legacyCourts = readLegacyJsonIfExists<Court[]>('courts.json', INITIAL_COURTS);
    await prisma.court.createMany({
      skipDuplicates: true,
      data: legacyCourts.map((c) => ({
        id: c.id,
        code: c.code,
        shortName: c.shortName ?? null,
        name: c.name,
        address: c.address ?? 'DVA Sports Center, Hà Nội',
        description: c.description,
        floorType: c.floorType,
        hourlyRate: Math.round(Number(c.hourlyRate)),
        minHours: Number(c.minHours),
        includes: Array.isArray(c.includes) ? c.includes : [],
        imageUrl: c.imageUrl || '',
        isAvailable: c.isAvailable !== false,
        isActive: c.isActive !== false,
        subCourts: c.subCourts ?? (c.id === 'court-btl' || c.code === 'BTL_TT' ? ['Sân A', 'Sân B'] : []),
        weeklySchedule: normalizeCourtWeeklySchedule(
          c.weeklySchedule ?? getDefaultWeeklyScheduleForCourt(c.id),
          c.id,
          c.subCourts ?? (c.id === 'court-btl' || c.code === 'BTL_TT' ? ['Sân A', 'Sân B'] : [])
        ) as any,
      })),
    });
  } else {
    try {
      const existingCourts = await prisma.court.findMany({
        select: { id: true, code: true, weeklySchedule: true, address: true, subCourts: true },
      });
      for (const ec of existingCourts) {
        if (!ec.weeklySchedule || !ec.address || !ec.subCourts || ec.subCourts.length === 0) {
          const initMatch = INITIAL_COURTS.find((ic) => ic.id === ec.id || ic.code === ec.code);
          await prisma.court.update({
            where: { id: ec.id },
            data: {
              ...(ec.weeklySchedule
                ? {}
                : { weeklySchedule: (initMatch?.weeklySchedule ?? getDefaultWeeklyScheduleForCourt(ec.id)) as any }),
              ...(ec.address ? {} : { address: initMatch?.address ?? 'DVA Sports Center, Hà Nội' }),
              ...(!ec.subCourts?.length && initMatch?.subCourts?.length ? { subCourts: initMatch.subCourts } : {}),
            },
          });
        }
      }
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (err?.code === 'P2021' || err?.code === 'P2022' || /does not exist/i.test(msg)) {
        console.warn("[Prisma Warning] DB schema out of sync. Please run 'npx prisma db push'");
      } else {
        throw err;
      }
    }
  }

  if (playerCount === 0) {
    const legacyPlayers = readLegacyJsonIfExists<Player[]>('players.json', INITIAL_PLAYERS);
    await prisma.player.createMany({
      skipDuplicates: true,
      data: legacyPlayers.map((p) => {
        const rawSquad = (p as any).squad || (p as any).category || (p as any).team || p.level;
        const normalizedLevel = normalizeSquad(rawSquad).toUpperCase() as 'SENIOR' | 'JUNIOR' | 'YOUTH';
        return {
          id: p.id,
          fullName: p.fullName,
          jerseyNumber: Number(p.jerseyNumber) || 0,
          height: Number(p.height) || 180,
          weight: Number(p.weight) || 70,
          spikeTouch: Number(p.spikeTouch) || 300,
          blockTouch: Number(p.blockTouch) || 290,
          hometownCountry: p.hometownCountry || 'Việt Nam',
          countryName: p.country ?? p.countryName ?? 'Vietnam',
          countryCode: (p.countryCode || 'VN').toUpperCase(),
          countryFlag: p.countryFlag ?? countryCodeToFlagEmoji(p.countryCode || 'VN'),
          bornYear: p.bornYear ?? null,
          level: normalizedLevel,
          position: p.position || 'OH',
          avatarUrl: p.avatarUrl ?? '',
          bio: p.bio ?? '',
          isCaptain: Boolean(p.isCaptain ?? p.captain),
          joinedYear: Number(p.joined ?? p.joinedYear) || 2025,
        };
      }),
    });
  }

  if (coachCount === 0) {
    const legacyCoaches = readLegacyJsonIfExists<CoachProfile[]>('coaches.json', INITIAL_COACHES);
    await prisma.coachProfile.createMany({
      skipDuplicates: true,
      data: legacyCoaches.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        experience: c.experience,
        height: c.height,
        age: Number(c.age) || 20,
        bornYear: Number(c.bornYear) || 2005,
        avatarUrl: c.avatarUrl || '',
        specialty: c.specialty || '',
        bio: c.bio || '',
        certifications: Array.isArray(c.certifications) ? c.certifications : [],
      })),
    });
  }

  if (courseCount === 0) {
    const legacyCourses = readLegacyJsonIfExists<TrainingCourse[]>('trainingCourses.json', INITIAL_TRAINING_COURSES);
    await prisma.trainingCourse.createMany({
      skipDuplicates: true,
      data: legacyCourses.map((c) => ({
        id: c.id,
        title: c.title,
        level: c.level,
        tag: c.tag ?? null,
        targetAudience: c.targetAudience || '',
        price: Math.round(Number(c.price) || 0),
        priceUnit: c.priceUnit ?? null,
        schedule: c.schedule || '',
        duration: c.duration || '',
        coachName: c.coachName || '',
        coachTitle: c.coachTitle || '',
        description: c.description || '',
        benefits: Array.isArray(c.benefits) ? c.benefits : [],
        curriculum: Array.isArray(c.curriculum) ? c.curriculum : [],
        maxSlots: Number(c.maxSlots) || 16,
        enrolledSlots: Number(c.enrolledSlots) || 0,
        imageUrl: c.imageUrl ?? null,
      })),
    });
  }

  if (bookingCount === 0) {
    const legacyBookings = readLegacyJsonIfExists<Booking[]>('bookings.json', INITIAL_BOOKINGS);
    if (legacyBookings.length > 0) {
      const validCourtIds = new Set(
        (await prisma.court.findMany({ select: { id: true } })).map((c) => c.id)
      );
      const validBookings = legacyBookings.filter((b) => validCourtIds.has(b.courtId));
      if (validBookings.length > 0) {
        await prisma.booking.createMany({
          skipDuplicates: true,
          data: validBookings.map((b) => ({
            id: b.id,
            bookingCode: b.bookingCode,
            courtId: b.courtId,
            courtName: b.courtName,
            subCourt: b.subCourt ?? null,
            customerName: b.customerName,
            customerEmail: b.customerEmail,
            customerPhone: b.customerPhone,
            bookingDate: b.bookingDate,
            startTime: b.startTime,
            endTime: b.endTime,
            totalHours: Number(b.totalHours) || 1.5,
            courtPrice: Math.round(Number(b.courtPrice) || 0),
            addons: (b.addons ?? { mineralWaterBottles: 0, mikasaBallCrate: false, certifiedReferee: false }) as any,
            addonsPrice: Math.round(Number(b.addonsPrice) || 0),
            totalPrice: Math.round(Number(b.totalPrice) || 0),
            paymentStatus: b.paymentStatus,
            transferContent: b.transferContent ?? null,
            notes: b.notes ?? null,
            customerConfirmedAt: b.customerConfirmedAt ? new Date(b.customerConfirmedAt) : null,
            holdExpiresAt: b.holdExpiresAt ? new Date(b.holdExpiresAt) : null,
          })),
        });
      }
    }
  }

  const [closedSlotCount, regCount, appCount, newsCount, productCount] = await Promise.all([
    prisma.closedSlot.count(),
    prisma.trainingRegistration.count(),
    prisma.memberApplication.count(),
    prisma.newsPost.count(),
    prisma.product.count(),
  ]);

  if (closedSlotCount === 0) {
    const legacyClosed = readLegacyJsonIfExists<ClosedSlot[]>('closedSlots.json', []);
    if (legacyClosed.length > 0) {
      const validCourtIds = new Set(
        (await prisma.court.findMany({ select: { id: true } })).map((c) => c.id)
      );
      const validClosed = legacyClosed.filter((cs) => validCourtIds.has(cs.courtId));
      if (validClosed.length > 0) {
        await prisma.closedSlot.createMany({
          skipDuplicates: true,
          data: validClosed.map((cs) => ({
            id: cs.id,
            courtId: cs.courtId,
            courtName: cs.courtName,
            subCourt: cs.subCourt || '',
            date: cs.date,
            slotLabel: cs.slotLabel,
            reason: cs.reason ?? null,
            closedBy: cs.closedBy ?? null,
          })),
        });
      }
    }
  }

  if (regCount === 0) {
    const legacyRegs = readLegacyJsonIfExists<TrainingRegistration[]>('trainingRegistrations.json', []);
    if (legacyRegs.length > 0) {
      const validCourseIds = new Set(
        (await prisma.trainingCourse.findMany({ select: { id: true } })).map((c) => c.id)
      );
      const validRegs = legacyRegs.filter((r) => validCourseIds.has(r.courseId));
      if (validRegs.length > 0) {
        await prisma.trainingRegistration.createMany({
          skipDuplicates: true,
          data: validRegs.map((r) => ({
            id: r.id,
            courseId: r.courseId,
            courseTitle: r.courseTitle,
            fullName: r.fullName,
            email: r.email,
            phone: r.phone,
            experienceLevel: r.experienceLevel,
            preferredTimeSlot: r.preferredTimeSlot,
            notes: r.notes ?? null,
            status: r.status,
          })),
        });
      }
    }
  }

  if (appCount === 0) {
    const legacyApps = readLegacyJsonIfExists<MemberApplication[]>('applications.json', INITIAL_MEMBER_APPLICATIONS);
    await prisma.memberApplication.createMany({
      skipDuplicates: true,
      data: legacyApps.map((a) => ({
        id: a.id,
        fullName: a.fullName,
        dob: a.dob,
        position: a.position,
        hometownCountry: a.hometownCountry || 'Vietnam',
        desiredJerseyNumber: Number(a.desiredJerseyNumber) || 0,
        level: a.level,
        height: Number(a.height) || 175,
        weight: Number(a.weight) || 68,
        spikeReach: Number(a.spikeReach) || 295,
        blockReach: Number(a.blockReach) || 280,
        gmail: a.gmail || '',
        instagram: a.instagram || 'None',
        zalo: a.zalo || '',
        rotationKnowledge: toRotationEnum(a.rotationKnowledge),
        status: a.status,
        reviewNotes: a.reviewNotes ?? null,
      })),
    });
  }

  if (newsCount === 0) {
    const legacyNews = readLegacyJsonIfExists<NewsPost[]>('news.json', INITIAL_NEWS);
    await prisma.newsPost.createMany({
      skipDuplicates: true,
      data: legacyNews.map((n) => ({
        id: n.id,
        title: n.title,
        slug: n.slug,
        excerpt: n.excerpt,
        content: n.content,
        thumbnail: (n.imageUrl || n.image || n.thumbnail || '').trim(),
        category: n.category,
        authorName: n.authorName,
        authorRole: n.authorRole,
        publishedAt: n.publishedAt,
        readTimeMinutes: Number(n.readTimeMinutes) || 4,
        featured: Boolean(n.featured),
        isPinned: Boolean(n.isPinned),
      })),
    });
  } else {
    const missingThumbs = await prisma.newsPost.findMany({
      where: { thumbnail: '' },
      select: { id: true, slug: true },
    });
    if (missingThumbs.length > 0) {
      const legacyNews = readLegacyJsonIfExists<NewsPost[]>('news.json', INITIAL_NEWS);
      for (const en of missingThumbs) {
        const match =
          legacyNews.find((ln) => ln.id === en.id || ln.slug === en.slug) ||
          INITIAL_NEWS.find((inw) => inw.id === en.id || inw.slug === en.slug);
        const fallbackImg = (match?.imageUrl || match?.image || match?.thumbnail || '').trim();
        if (fallbackImg) {
          await prisma.newsPost.update({
            where: { id: en.id },
            data: { thumbnail: fallbackImg },
          });
        }
      }
    }
  }

  const defaultScriptUrl = env.googleSheetsWebhookUrl;
  const legacyConfig = readLegacyJsonIfExists<{ googleScriptUrl?: string }>('appConfig.json', {
    googleScriptUrl: defaultScriptUrl,
  });
  await prisma.appConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      googleScriptUrl: legacyConfig.googleScriptUrl || defaultScriptUrl,
    },
  });

  if (productCount === 0) {
    try {
      await prisma.product.createMany({
        skipDuplicates: true,
        data: INITIAL_SHOP_PRODUCTS.map((prod) => ({
          id: prod.id,
          sku: prod.sku || prod.id.toUpperCase(),
          slug: prod.slug,
          name: prod.name,
          category: prod.category,
          price: prod.price,
          originalPrice: prod.originalPrice,
          stock: prod.stock,
          sortOrder: prod.sortOrder ?? 0,
          badge: prod.badge ?? null,
          allowCustomPrint: prod.allowCustomPrint ?? isJerseyCategory(prod.category),
          frontImage: prod.frontImage,
          backImage: prod.backImage ?? null,
          sizes: prod.sizes ?? ['Size 5'],
          colors: prod.colors ?? [],
          description: prod.description ?? null,
          isPaused: Boolean(prod.isPaused),
          isActive: prod.isActive !== false,
        })),
      });
      console.log(`[Bootstrap] Seeded ${INITIAL_SHOP_PRODUCTS.length} initial DVA Shop products into empty PostgreSQL table.`);
    } catch (err: any) {
      console.warn('[Prisma Shop Seed Notice]:', err?.message || err);
    }
  }

  await ensureVenuesSeeded();
}

export async function ensureVenuesSeeded(): Promise<void> {
  try {
    if ((await prisma.volleyballVenue.count()) > 0) return;

    const btl = await prisma.volleyballVenue.create({
      data: {
        id: 'venue-btl-thong-tin',
        name: 'Nhà thi đấu BTL Thông Tin',
        slug: 'nha-thi-dau-btl-thong-tin',
        address: '155 Trường Chinh, Thanh Xuân, Hà Nội',
        district: 'Thanh Xuân',
        latitude: 21.0005,
        longitude: 105.8294,
        surfaceType: 'Sàn thảm PVC',
        subCourtsCount: 2,
        venueType: 'COMMERCIAL',
        rentalPriceInfo: '550.000đ / giờ / sân',
        entryNote: 'Gửi xe cổng 155 Trường Chinh. Nhà thi đấu trong nhà gồm 2 sân tiêu chuẩn Court A & Court B.',
        isDvaOfficial: true,
        isFeatured: true,
        coverUrl: '/courts/btl.png',
        imageUrl: '/courts/btl.png',
      },
    });

    const clubs = [
      {
        id: 'club-dva-volleyball',
        name: 'DVA Volleyball Club',
        slug: 'dva-volleyball-club',
        logoUrl: '/logo.png',
        coverUrl: '/courts/btl.png',
        galleryUrls: ['/courts/btl.png', '/courts/thecong.png'],
        captainName: 'Hoàng Quốc Duy',
        captainPhone: '0968155247',
        captainZalo: '0968155247',
        captainEmail: 'duy.dva@dvavolleyball.com',
        playStyle: 'COMPETITIVE',
        tags: ['5-1 Chuẩn FIVB', 'Kèo trình độ', 'Mikasa V200W', 'DVA Official'],
        description: 'Đội hình chính thức CLB DVA Hà Nội. Đánh 5-1 chuẩn luật FIVB, áp dụng chặt lỗi chạm lưới & bước 1.',
        feeType: 'PAID',
        feeAmount: '70k–80k/buổi',
        sessions: [{ daysOfWeek: [1, 3, 6], startTime: '19:00', endTime: '21:30', subCourts: ['Court A'], recruitmentStatus: 'CHECK_CAPTAIN' }],
      },
      {
        id: 'club-dva-middle',
        name: 'DVA Middle',
        slug: 'dva-middle',
        logoUrl: '/logo.png',
        coverUrl: '/courts/btl.png',
        galleryUrls: ['/courts/btl.png', '/courts/mydinh.png'],
        captainName: 'HLV Trần Tuấn Anh',
        captainPhone: '0975155889',
        captainZalo: '0975155889',
        captainEmail: 'tuananh.coach@dvavolleyball.com',
        playStyle: 'TRAINING',
        tags: ['Tập luyện', 'Middle Focus', '5-1 Chuẩn FIVB', 'Tuyển vãng lai'],
        description: 'Ca tập luyện chuyên sâu kỹ thuật đánh nhanh, chắn bóng giữa lưới, bước 1 và ghép chiến thuật.',
        feeType: 'PAID',
        feeAmount: '70k–100k/buổi',
        sessions: [
          { daysOfWeek: [5], startTime: '19:00', endTime: '21:30', subCourts: ['Court A'], recruitmentStatus: 'OPEN_RECRUIT' },
          { daysOfWeek: [0], startTime: '15:00', endTime: '17:00', subCourts: ['Court A', 'Court B'], recruitmentStatus: 'OPEN_RECRUIT' },
        ],
      },
      {
        id: 'club-gevc',
        name: 'GEVC',
        slug: 'gevc',
        coverUrl: '/courts/btl.png',
        galleryUrls: ['/courts/btl.png'],
        captainName: 'Nguyễn Quang Minh',
        captainPhone: '0982345155',
        captainZalo: '0982345155',
        captainEmail: 'gevc.hanoi@gmail.com',
        playStyle: 'FUN_GAME',
        tags: ['Giao lưu', 'Tuyển vãng lai', 'Hòa đồng'],
        description: 'CLB GEVC sinh hoạt đều tối T2, T4, T6 tại Court B. Không khí thân thiện, cởi mở sau giờ làm.',
        feeType: 'PAID',
        feeAmount: '65k–75k/buổi',
        sessions: [{ daysOfWeek: [1, 3, 5], startTime: '19:00', endTime: '21:30', subCourts: ['Court B'], recruitmentStatus: 'OPEN_RECRUIT' }],
      },
      {
        id: 'club-bvc',
        name: 'BVC',
        slug: 'bvc',
        coverUrl: '/courts/btl.png',
        galleryUrls: ['/courts/btl.png'],
        captainName: 'Phạm Đức Mạnh',
        captainPhone: '0912889456',
        captainZalo: '0912889456',
        captainEmail: 'bvc.captain@gmail.com',
        playStyle: 'COMPETITIVE',
        tags: ['Đấu set 25 điểm', '5-1 Tốc độ cao'],
        description: 'Đội BVC đánh tối T3 & T5 tại Court A. Lối chơi chắc tay, giữ kỷ luật đội hình.',
        feeType: 'PAID',
        feeAmount: '70k/buổi',
        sessions: [{ daysOfWeek: [2, 4], startTime: '19:00', endTime: '21:30', subCourts: ['Court A'], recruitmentStatus: 'CHECK_CAPTAIN' }],
      },
      {
        id: 'club-tat',
        name: 'TAT',
        slug: 'tat',
        coverUrl: '/courts/btl.png',
        galleryUrls: ['/courts/btl.png'],
        captainName: 'Vũ Quang Huy',
        captainPhone: '0936778123',
        captainZalo: '0936778123',
        captainEmail: 'tat.volley@gmail.com',
        playStyle: 'FUN_GAME',
        tags: ['Giao lưu', 'Cởi mở', 'Tuyển vãng lai'],
        description: 'CLB TAT sinh hoạt tối T3 & T5 tại Court B. Chia kèo cân bằng, vui vẻ cho cả nam & nữ.',
        feeType: 'PAID',
        feeAmount: '60k–70k/buổi',
        sessions: [{ daysOfWeek: [2, 4], startTime: '19:00', endTime: '21:30', subCourts: ['Court B'], recruitmentStatus: 'OPEN_RECRUIT' }],
      },
      {
        id: 'club-nippon',
        name: 'Nippon',
        slug: 'nippon',
        coverUrl: '/courts/btl.png',
        galleryUrls: ['/courts/btl.png', '/courts/thecong.png'],
        captainName: 'Kenji / Đặng Bảo Long',
        captainPhone: '0945112908',
        captainZalo: '0945112908',
        captainEmail: 'nippon.hanoi@gmail.com',
        playStyle: 'COMPETITIVE',
        tags: ['Giao lưu Quốc tế', 'Phòng thủ bền bỉ', '5-1 Chuẩn FIVB'],
        description: 'CLB Nippon kết nối cộng đồng bóng chuyền Việt – Nhật với bước 1 chắc và phòng thủ hàng sau bền bỉ.',
        feeType: 'PAID',
        feeAmount: '70k/buổi',
        sessions: [
          { daysOfWeek: [6], startTime: '19:00', endTime: '21:30', subCourts: ['Court B'], recruitmentStatus: 'CHECK_CAPTAIN' },
          { daysOfWeek: [0], startTime: '19:00', endTime: '21:30', subCourts: ['Court A', 'Court B'], recruitmentStatus: 'OPEN_RECRUIT' },
        ],
      },
    ];

    for (const { sessions, ...clubData } of clubs) {
      await prisma.courtClubProfile.create({
        data: {
          ...clubData,
          venueId: btl.id,
          sessions: { create: sessions.map((s) => ({ ...s, venueId: btl.id })) },
        },
      });
    }
    console.log('[Bootstrap] Seeded BTL Thong Tin venue with 6 real clubs.');
  } catch (err: any) {
    console.warn('[Prisma Venues Seed Notice]:', err?.message || err);
  }
}
