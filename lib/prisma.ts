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
  Product as DbProduct,
  Order as DbOrder,
  OrderItem as DbOrderItem,
  GuestSession as DbGuestSession,
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
  PlayerLevel,
  RotationKnowledge,
  StoreCategoryId,
  StoreOrder,
  StoreOrderItem,
  StoreProduct,
  TrainingCourse,
  TrainingRegistration,
  countryCodeToFlagEmoji,
  isJerseyCategory,
} from '../src/types';
import { StoredUser, hashPassword, isBcryptHash, verifyPassword } from './security';
import { getDefaultWeeklyScheduleForCourt, normalizeWeeklySchedule, normalizeCourtWeeklySchedule } from '../src/shared/schedule';
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

const databaseUrl = process.env.DATABASE_URL || '';
const isCloudDb =
  databaseUrl.includes('neon.tech') ||
  databaseUrl.includes('sslmode=require') ||
  databaseUrl.includes('supabase.co') ||
  process.env.NODE_ENV === 'production';

// Tối ưu connection pool cho Neon Serverless PostgreSQL
const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 5000, // 5 giây timeout kết nối
  idleTimeoutMillis: 30000, // 30 giây giải phóng kết nối nhàn rỗi trước khi Neon ngắt socket
  max: 10, // Giới hạn 10 kết nối phù hợp với Neon serverless
  keepAlive: true, // Bật TCP keep-alive
  keepAliveInitialDelayMillis: 10000, // Gửi probe keep-alive đầu tiên sau 10 giây
  ...(isCloudDb ? { ssl: { rejectUnauthorized: false } } : {}),
});

// Bắt lỗi idle client để tránh unhandled error làm crash Node.js khi Neon ngắt socket rảnh rỗi
pool.on('error', (err: any) => {
  // Lọc bỏ lỗi ECONNRESET / EPIPE khi Neon Serverless thu hồi kết nối rảnh rỗi
  const isIdleSocketReset =
    err?.code === 'ECONNRESET' ||
    err?.code === 'EPIPE' ||
    err?.message?.includes('ECONNRESET') ||
    err?.message?.includes('Connection terminated unexpectedly');

  if (isIdleSocketReset) {
    // Socket nhàn rỗi đã được ngắt an toàn, pg-pool sẽ tự khởi tạo kết nối mới khi có query tiếp theo.
    // Bỏ qua để tránh spam console log.
    return;
  }

  console.warn('[Database Pool Warning] Idle connection warning:', err?.message || err);
});

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

export { INITIAL_PLAYERS, INITIAL_MEMBER_APPLICATIONS };

export const normalizeSquad = (squad?: any): 'Youth' | 'Junior' | 'Senior' => {
  if (!squad) return 'Youth';
  const s = String(squad).trim().toUpperCase();
  if (s === 'KID' || s === 'YOUTH') return 'Youth';
  if (s === 'JUNIOR') return 'Junior';
  return 'Senior';
};

export function toPlayerDto(p: DbPlayer | any): Player {
  const resolvedCountry = p.countryName || p.country || 'Vietnam';
  const resolvedCode = (p.countryCode || 'VN').toUpperCase();
  const resolvedFlag = p.countryFlag || countryCodeToFlagEmoji(resolvedCode);
  const resolvedJoined = Number(p.joinedYear ?? p.joined) || 2025;
  const rawSquad = (p as any).squad || (p as any).category || (p as any).team || p.level;
  const normalizedSquad = normalizeSquad(rawSquad);
  const normalizedLevel = normalizedSquad.toUpperCase() as PlayerLevel;

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
    bornYear: p.bornYear ?? undefined,
    level: normalizedLevel,
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
  const subCourts = Array.isArray(c.subCourts) && c.subCourts.length > 0
    ? c.subCourts
    : (c.id === 'court-btl' || c.code === 'BTL_TT' ? ['Sân A', 'Sân B'] : undefined);
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

export function toApplicationDto(a: DbMemberApplication | any): MemberApplication {
  const rawSquad = (a as any).squad || (a as any).category || (a as any).team || a.level;
  const normalizedLevel = (normalizeSquad(rawSquad).toUpperCase() as PlayerLevel) || 'YOUTH';

  return {
    id: a.id,
    fullName: a.fullName,
    dob: a.dob,
    position: a.position,
    hometownCountry: a.hometownCountry,
    desiredJerseyNumber: a.desiredJerseyNumber,
    level: normalizedLevel,
    height: a.height,
    weight: a.weight,
    spikeReach: a.spikeReach,
    blockReach: a.blockReach,
    gmail: a.gmail,
    instagram: a.instagram,
    zalo: a.zalo,
    rotationKnowledge: fromRotationEnum(a.rotationKnowledge),
    status: a.status,
    entryFee:
      a.entryFee !== null && a.entryFee !== undefined ? Number(a.entryFee) : 100000,
    approvedAt: a.approvedAt ? safeIsoString(a.approvedAt) : undefined,
    reviewNotes: a.reviewNotes ?? undefined,
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

export function toNewsDto(n: DbNewsPost & { imageUrl?: string | null; image?: string | null; isPinned?: boolean | null }): NewsPost {
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
          weeklySchedule: normalizeCourtWeeklySchedule(
            c.weeklySchedule ?? getDefaultWeeklyScheduleForCourt(c.id),
            c.id,
            c.subCourts ?? (c.id === 'court-btl' || c.code === 'BTL_TT' ? ['Sân A', 'Sân B'] : [])
          ) as any,
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
      const rawSquad = (p as any).squad || (p as any).category || (p as any).team || p.level;
      const normalizedLevel = normalizeSquad(rawSquad).toUpperCase() as 'SENIOR' | 'JUNIOR' | 'YOUTH';
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
          level: normalizedLevel,
          position: p.position || 'OH',
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
          isPinned: Boolean(n.isPinned),
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
  const defaultScriptUrl =
    process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
    process.env.GOOGLE_SCRIPT_URL ||
    '';
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

  // 12. Seed DVA Shop Starter Products (ONLY when products table is empty; never overwrite Admin edits)
  try {
    if ((await prisma.product.count()) === 0) {
      for (const prod of INITIAL_SHOP_PRODUCTS) {
        const sku = prod.sku || prod.id.toUpperCase();
        await prisma.product.upsert({
          where: { sku },
          update: {},
          create: {
            id: prod.id,
            sku,
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
          },
        });
      }
      console.log(`[Bootstrap] Seeded ${INITIAL_SHOP_PRODUCTS.length} initial DVA Shop products into empty PostgreSQL table.`);
    }
  } catch (err: any) {
    console.warn('[Prisma Shop Seed Notice]:', err?.message || err);
  }
}
