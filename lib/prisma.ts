import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
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
} from '@prisma/client';
import {
  Booking,
  BookingAddons,
  ClosedSlot,
  CoachProfile,
  Court,
  MemberApplication,
  NewsPost,
  Player,
  RotationKnowledge,
  TrainingCourse,
  TrainingRegistration,
  countryCodeToFlagEmoji,
} from '../src/types';
import { StoredUser, hashPassword, isBcryptHash, verifyPassword } from './security';
import { getDefaultWeeklyScheduleForCourt, normalizeWeeklySchedule } from '../src/shared/schedule';
import {
  INITIAL_BOOKINGS,
  INITIAL_COACHES,
  INITIAL_COURTS,
  INITIAL_MEMBER_APPLICATIONS,
  INITIAL_NEWS,
  INITIAL_PLAYERS,
  INITIAL_TRAINING_COURSES,
  INITIAL_USERS,
} from '../src/data/mockData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Load .env from project root
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

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
    createdAt: safeIsoString(u.createdAt),
    passwordHash: u.passwordHash,
  };
}

export function toPlayerDto(p: DbPlayer): Player {
  const resolvedCountry = p.countryName || 'Vietnam';
  const resolvedCode = (p.countryCode || 'VN').toUpperCase();
  const resolvedFlag = p.countryFlag || countryCodeToFlagEmoji(resolvedCode);
  const resolvedJoined = p.joinedYear || 2025;
  return {
    id: p.id,
    userId: p.userId ?? undefined,
    fullName: p.fullName,
    jerseyNumber: p.jerseyNumber,
    height: p.height,
    weight: p.weight,
    spikeTouch: p.spikeTouch,
    blockTouch: p.blockTouch,
    hometownCountry: p.hometownCountry,
    country: resolvedCountry,
    countryName: resolvedCountry,
    countryCode: resolvedCode,
    countryFlag: resolvedFlag,
    bornYear: p.bornYear ?? undefined,
    level: p.level,
    position: p.position,
    avatarUrl: p.avatarUrl ?? '',
    bio: p.bio ?? '',
    isCaptain: p.isCaptain,
    captain: p.isCaptain,
    joined: resolvedJoined,
    joinedYear: resolvedJoined,
  };
}

export function toCourtDto(c: DbCourt & { status?: string | null; isMaintenance?: boolean | null }): Court {
  const isMaintenance = Boolean(
    c.isMaintenance === true || c.status === 'MAINTENANCE' || c.isAvailable === false
  );
  return {
    id: c.id,
    code: c.code,
    shortName: c.shortName ?? undefined,
    name: c.name,
    address: c.address ?? 'DVA Sports Center, Hà Nội',
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
    subCourts: Array.isArray(c.subCourts) && c.subCourts.length > 0
      ? c.subCourts
      : (c.id === 'court-btl' || c.code === 'BTL_TT' ? ['Sân A', 'Sân B'] : undefined),
    weeklySchedule: normalizeWeeklySchedule(c.weeklySchedule, c.id || c.code),
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
  const rawAddons = (b.addons && typeof b.addons === 'object' && !Array.isArray(b.addons) ? b.addons : {}) as Record<string, any>;
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
  return {
    id: c.id,
    title: c.title,
    level: c.level,
    coachName: c.coachName,
    coachTitle: c.coachTitle,
    schedule: c.schedule,
    duration: c.duration,
    price: c.price,
    priceUnit: c.priceUnit ?? undefined,
    tag: c.tag ?? undefined,
    benefits: c.benefits,
    description: c.description,
    targetAudience: c.targetAudience,
    curriculum: c.curriculum,
    maxSlots: c.maxSlots,
    enrolledSlots: c.enrolledSlots,
    imageUrl: c.imageUrl ?? undefined,
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

export function toApplicationDto(a: DbMemberApplication | any): MemberApplication {
  return {
    id: a.id,
    fullName: a.fullName,
    dob: a.dob,
    position: a.position,
    hometownCountry: a.hometownCountry,
    desiredJerseyNumber: a.desiredJerseyNumber,
    level: a.level,
    height: a.height,
    weight: a.weight,
    spikeReach: a.spikeReach,
    blockReach: a.blockReach,
    gmail: a.gmail,
    instagram: a.instagram,
    zalo: a.zalo,
    rotationKnowledge: fromRotationEnum(a.rotationKnowledge),
    status: a.status,
    reviewNotes: a.reviewNotes ?? undefined,
    createdAt: safeIsoString(a.createdAt),
  };
}

export function toNewsDto(n: DbNewsPost & { imageUrl?: string | null; image?: string | null }): NewsPost {
  const resolvedImageUrl = (n.imageUrl || n.image || n.thumbnail || '').trim();
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
    publishedAt: n.publishedAt,
    readTimeMinutes: n.readTimeMinutes,
    featured: n.featured,
  };
}

// ============================================================================
// ONE-TIME INITIAL SEEDING (JSON / MockData -> PostgreSQL)
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

/**
 * Bootstraps and ensures the SUPERADMIN account (quocduyhoang42@gmail.com / dva@2025)
 * and default accounts have valid bcrypt password hashes in PostgreSQL.
 */
export async function bootstrapSuperAdminAndUsers(): Promise<void> {
  await prisma.$connect();

  const superAdminEmail = 'quocduyhoang42@gmail.com';
  const superAdminPassword = process.env.SEED_SUPERADMIN_PASSWORD || 'dva@2025';

  // 1. Ensure SUPERADMIN account exists and has a valid bcrypt hash for dva@2025
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

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
    const hasValidBcryptPassword =
      isBcryptHash(existingSuperAdmin.passwordHash) &&
      (await verifyPassword(superAdminPassword, existingSuperAdmin.passwordHash));

    if (!hasValidBcryptPassword || existingSuperAdmin.role !== 'SUPERADMIN') {
      const passwordHash = await hashPassword(superAdminPassword);
      await prisma.user.update({
        where: { email: superAdminEmail },
        data: {
          passwordHash,
          role: 'SUPERADMIN',
        },
      });
      console.log(`[Bootstrap] Updated SUPERADMIN (${superAdminEmail}) passwordHash with bcrypt in PostgreSQL.`);
    }
  }

  // 2. Ensure default ADMIN & PLAYER accounts are seeded and migrated to bcrypt if needed
  const defaultAccounts = [
    {
      id: 'user-admin',
      email: 'admin.dva@gmail.com',
      fullName: 'Tran Minh Tuan',
      phoneNumber: '0987654321',
      role: 'ADMIN' as const,
      password: process.env.SEED_ADMIN_PASSWORD || 'dva@2025',
    },
    {
      id: 'user-player',
      email: 'player.hung@gmail.com',
      fullName: 'Nguyen Van Hung',
      phoneNumber: '0912345678',
      role: 'PLAYER' as const,
      password: process.env.SEED_PLAYER_PASSWORD || 'dva@123',
    },
  ];

  for (const acc of defaultAccounts) {
    const existing = await prisma.user.findUnique({ where: { email: acc.email } });
    if (!existing) {
      const passwordHash = await hashPassword(acc.password);
      await prisma.user.create({
        data: {
          id: acc.id,
          email: acc.email,
          passwordHash,
          fullName: acc.fullName,
          phoneNumber: acc.phoneNumber,
          role: acc.role,
        },
      });
      console.log(`[Bootstrap] Created ${acc.role} (${acc.email}) with bcrypt password hash.`);
    } else if (!isBcryptHash(existing.passwordHash)) {
      const passwordHash = await hashPassword(acc.password);
      await prisma.user.update({
        where: { email: acc.email },
        data: { passwordHash },
      });
      console.log(`[Bootstrap] Re-hashed ${acc.role} (${acc.email}) password with bcrypt in PostgreSQL.`);
    }
  }

  // 3. Migrate any other existing users in PostgreSQL whose passwordHash is not yet bcrypt
  const allUsers = await prisma.user.findMany();
  for (const u of allUsers) {
    if (!isBcryptHash(u.passwordHash)) {
      // If passwordHash was stored as plain text (not scrypt$), hash that plain text; otherwise use default password
      const rawPassword =
        u.passwordHash && !u.passwordHash.startsWith('scrypt$') ? u.passwordHash : 'dva@2025';
      const newHash = await hashPassword(rawPassword);
      await prisma.user.update({
        where: { id: u.id },
        data: { passwordHash: newHash },
      });
      console.log(`[Bootstrap] Migrated user (${u.email}) passwordHash to bcrypt in PostgreSQL.`);
    }
  }
}

/**
 * Ensures PostgreSQL tables have initial seed data if they are empty.
 * Also runs SUPERADMIN & bcrypt password bootstrap on every server start.
 */
export async function ensurePostgreSQLSeeded(): Promise<void> {
  await prisma.$connect();

  // 1. Seed & Bootstrap Users (with bcrypt password hashes)
  await bootstrapSuperAdminAndUsers();

  // 2. Seed Courts
  if ((await prisma.court.count()) === 0) {
    const legacyCourts = readLegacyJsonIfExists<Court[]>('courts.json', INITIAL_COURTS);
    for (const c of legacyCourts) {
      await prisma.court.upsert({
        where: { code: c.code },
        update: {},
        create: {
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
          weeklySchedule: (c.weeklySchedule ?? getDefaultWeeklyScheduleForCourt(c.id)) as any,
        },
      });
    }
  } else {
    // Backfill weeklySchedule or address for any existing court records that do not have them yet
    try {
      const existingCourts = await prisma.court.findMany();
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
              ...((!ec.subCourts || ec.subCourts.length === 0) && (initMatch?.subCourts && initMatch.subCourts.length > 0)
                ? { subCourts: initMatch.subCourts }
                : {}),
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

  // 3. Seed Players
  if ((await prisma.player.count()) === 0) {
    const legacyPlayers = readLegacyJsonIfExists<Player[]>('players.json', INITIAL_PLAYERS);
    for (const p of legacyPlayers) {
      await prisma.player.upsert({
        where: { id: p.id },
        update: {},
        create: {
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
          level: p.level,
          position: p.position,
          avatarUrl: p.avatarUrl ?? '',
          bio: p.bio ?? '',
          isCaptain: Boolean(p.isCaptain ?? p.captain),
          joinedYear: Number(p.joined ?? p.joinedYear) || 2025,
        },
      });
    }
  }

  // 4. Seed Coaches
  if ((await prisma.coachProfile.count()) === 0) {
    const legacyCoaches = readLegacyJsonIfExists<CoachProfile[]>('coaches.json', INITIAL_COACHES);
    for (const c of legacyCoaches) {
      await prisma.coachProfile.upsert({
        where: { id: c.id },
        update: {},
        create: {
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
        },
      });
    }
  }

  // 5. Seed Training Courses
  if ((await prisma.trainingCourse.count()) === 0) {
    const legacyCourses = readLegacyJsonIfExists<TrainingCourse[]>('trainingCourses.json', INITIAL_TRAINING_COURSES);
    for (const c of legacyCourses) {
      await prisma.trainingCourse.upsert({
        where: { id: c.id },
        update: {},
        create: {
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
        },
      });
    }
  }

  // 6. Seed Bookings
  if ((await prisma.booking.count()) === 0) {
    const legacyBookings = readLegacyJsonIfExists<Booking[]>('bookings.json', INITIAL_BOOKINGS);
    for (const b of legacyBookings) {
      const courtExists = await prisma.court.findUnique({ where: { id: b.courtId } });
      if (!courtExists) continue;
      await prisma.booking.upsert({
        where: { bookingCode: b.bookingCode },
        update: {},
        create: {
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
        },
      });
    }
  }

  // 7. Seed Closed Slots
  if ((await prisma.closedSlot.count()) === 0) {
    const legacyClosed = readLegacyJsonIfExists<ClosedSlot[]>('closedSlots.json', []);
    for (const cs of legacyClosed) {
      const courtExists = await prisma.court.findUnique({ where: { id: cs.courtId } });
      if (!courtExists) continue;
      await prisma.closedSlot.upsert({
        where: {
          courtId_date_slotLabel_subCourt: {
            courtId: cs.courtId,
            date: cs.date,
            slotLabel: cs.slotLabel,
            subCourt: cs.subCourt || '',
          },
        },
        update: {},
        create: {
          id: cs.id,
          courtId: cs.courtId,
          courtName: cs.courtName,
          subCourt: cs.subCourt || '',
          date: cs.date,
          slotLabel: cs.slotLabel,
          reason: cs.reason ?? null,
          closedBy: cs.closedBy ?? null,
        },
      });
    }
  }

  // 8. Seed Training Registrations
  if ((await prisma.trainingRegistration.count()) === 0) {
    const legacyRegs = readLegacyJsonIfExists<TrainingRegistration[]>('trainingRegistrations.json', []);
    for (const r of legacyRegs) {
      const courseExists = await prisma.trainingCourse.findUnique({ where: { id: r.courseId } });
      if (!courseExists) continue;
      await prisma.trainingRegistration.upsert({
        where: { id: r.id },
        update: {},
        create: {
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
        },
      });
    }
  }

  // 9. Seed Member Applications
  if ((await prisma.memberApplication.count()) === 0) {
    const legacyApps = readLegacyJsonIfExists<MemberApplication[]>('applications.json', INITIAL_MEMBER_APPLICATIONS);
    for (const a of legacyApps) {
      await prisma.memberApplication.upsert({
        where: { id: a.id },
        update: {},
        create: {
          id: a.id,
          fullName: a.fullName,
          dob: a.dob,
          position: a.position,
          hometownCountry: a.hometownCountry,
          desiredJerseyNumber: Number(a.desiredJerseyNumber) || 0,
          level: a.level,
          height: Number(a.height) || 175,
          weight: Number(a.weight) || 68,
          spikeReach: Number(a.spikeReach) || 295,
          blockReach: Number(a.blockReach) || 280,
          gmail: a.gmail,
          instagram: a.instagram || 'None',
          zalo: a.zalo,
          rotationKnowledge: toRotationEnum(a.rotationKnowledge),
          status: a.status,
          reviewNotes: a.reviewNotes ?? null,
        },
      });
    }
  }

  // 10. Seed News Posts
  if ((await prisma.newsPost.count()) === 0) {
    const legacyNews = readLegacyJsonIfExists<NewsPost[]>('news.json', INITIAL_NEWS);
    for (const n of legacyNews) {
      const resolvedThumb = (n.imageUrl || n.image || n.thumbnail || '').trim();
      await prisma.newsPost.upsert({
        where: { slug: n.slug },
        update: {},
        create: {
          id: n.id,
          title: n.title,
          slug: n.slug,
          excerpt: n.excerpt,
          content: n.content,
          thumbnail: resolvedThumb,
          category: n.category,
          authorName: n.authorName,
          authorRole: n.authorRole,
          publishedAt: n.publishedAt,
          readTimeMinutes: Number(n.readTimeMinutes) || 4,
          featured: Boolean(n.featured),
        },
      });
    }
  } else {
    // Backfill thumbnail for any existing news records that have empty thumbnail
    const legacyNews = readLegacyJsonIfExists<NewsPost[]>('news.json', INITIAL_NEWS);
    const existingNews = await prisma.newsPost.findMany();
    for (const en of existingNews) {
      if (!en.thumbnail || !en.thumbnail.trim()) {
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

  // 11. Seed AppConfig
  const legacyConfig = readLegacyJsonIfExists<{ googleScriptUrl?: string }>('appConfig.json', {
    googleScriptUrl: process.env.GOOGLE_SCRIPT_URL || '',
  });
  await prisma.appConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      googleScriptUrl: legacyConfig.googleScriptUrl || process.env.GOOGLE_SCRIPT_URL || '',
    },
  });
}
