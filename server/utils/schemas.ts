import { B, D, E, EM, HttpError, I, N, PH, S, SA, T, U, Rule, Schema } from './validation';
import { DAY_KEYS_BY_JS_DAY, parseSlotLabel } from '../../src/shared/schedule';

export const LEVELS = ['SENIOR', 'JUNIOR', 'YOUTH'] as const;
export const VALID_LEVELS = ['senior', 'junior', 'youth', 'SENIOR', 'JUNIOR', 'YOUTH'] as const;

export const LEVEL_RULE: Rule = (v, k) => {
  if (typeof v !== 'string') throw new HttpError(400, `${k} must be one of: senior, junior, youth`);
  const normalized = v.trim().toUpperCase();
  if (normalized === 'KID') return 'YOUTH';
  if (normalized !== 'SENIOR' && normalized !== 'JUNIOR' && normalized !== 'YOUTH') {
    throw new HttpError(400, `${k} must be one of: senior, junior, youth`);
  }
  return normalized;
};

export const POSITIONS = ['OH', 'OP', 'MB', 'S', 'L'] as const;
export const SKILL_RANKS = ['C', 'B', 'BB', 'A', 'AA', 'OPEN'] as const;
export const OPTIONAL_SKILL_RANK: Rule = (v, k) => {
  if (typeof v !== 'string') throw new HttpError(400, `${k} must be a string`);
  const clean = v.trim().toUpperCase();
  if (clean === '') return null;
  if (!(SKILL_RANKS as readonly string[]).includes(clean)) {
    throw new HttpError(400, `${k} must be one of: ${SKILL_RANKS.join(', ')}`);
  }
  return clean;
};
export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'CANCELLED'] as const;
export const REGISTRATION_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED'] as const;
export const APPLICATION_STATUSES = ['PENDING', 'SCHEDULED', 'RETEST', 'APPROVED', 'REJECTED'] as const;
export const TRYOUT_PAYMENT_STATUSES = ['PENDING', 'PAID', 'FREE'] as const;
export const ROTATIONS = ['5-1', '6-2', '4-2', 'BEGINNER'] as const;
export const MANAGED_ROLES = ['ADMIN', 'STAFF', 'COACH', 'CAPTAIN', 'PLAYER'] as const;

export const LOGIN_SCHEMA: Schema = {
  email: EM,
  password: S(200, 1),
};

export const USER_CREATE_SCHEMA: Schema = {
  email: EM,
  password: S(200, 8),
  fullName: S(100, 2),
  phoneNumber: S(30),
  avatarUrl: S(500),
  role: E(MANAGED_ROLES),
};

export const USER_ROLE_UPDATE_SCHEMA: Schema = {
  role: E(MANAGED_ROLES),
};

export const CHANGE_PASSWORD_SCHEMA: Schema = {
  currentPassword: S(200, 1),
  newPassword: S(200, 8),
};

export const STAFF_RESET_PASSWORD_SCHEMA: Schema = {
  newPassword: S(200, 8),
};

export const SELF_PROFILE_UPDATE_SCHEMA: Schema = {
  fullName: S(100, 2),
  avatarUrl: U,
};

export const STAFF_UPDATE_SCHEMA: Schema = {
  email: EM,
  fullName: S(100, 2),
  avatarUrl: U,
  role: E(MANAGED_ROLES),
  isActive: B,
  forceLogout: B,
};

export const PLAYER_SCHEMA: Schema = {
  fullName: S(100, 2),
  jerseyNumber: I(0, 99),
  height: N(100, 250),
  weight: N(20, 200),
  spikeTouch: N(150, 400),
  blockTouch: N(150, 400),
  hometownCountry: S(100),
  country: S(60),
  countryName: S(60),
  countryCode: S(5),
  countryFlag: S(10),
  bornYear: I(1950, 2030),
  level: LEVEL_RULE,
  skillRank: E(SKILL_RANKS),
  squad: S(50),
  category: S(50),
  team: S(50),
  position: E(POSITIONS),
  avatarUrl: U,
  bio: S(1000),
  isCaptain: B,
  captain: B,
  joined: I(1990, 2100),
  joinedYear: I(1990, 2100),
  isActive: B,
};

export const VISIBILITY_TOGGLE_SCHEMA: Schema = {
  isActive: B,
};

const validateDaySchedule = (src: Record<string, unknown>, path: string): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const dayKey of DAY_KEYS_BY_JS_DAY) {
    const val = src[dayKey];
    if (val === undefined) {
      out[dayKey] = [];
      continue;
    }
    if (!Array.isArray(val)) {
      throw new HttpError(400, `${path}.${dayKey} must be an array of slot strings`);
    }
    out[dayKey] = val
      .map((item) => S(80, 3)(item, `${path}.${dayKey}`))
      .filter((slotStr) => Boolean(parseSlotLabel(slotStr)));
  }
  return out;
};

const WEEKLY_SCHEDULE: Rule = (v, k) => {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) {
    throw new HttpError(400, `${k} must be an object mapping days of week or sub-courts to schedules`);
  }
  const src = v as Record<string, unknown>;
  const keys = Object.keys(src);
  if (keys.length === 0) {
    return validateDaySchedule({}, k);
  }
  const hasDayKeys = keys.some((dayKey) => (DAY_KEYS_BY_JS_DAY as string[]).includes(dayKey));
  if (hasDayKeys) {
    return validateDaySchedule(src, k);
  }
  const nestedOut: Record<string, Record<string, string[]>> = {};
  for (const subCourtKey of keys) {
    const subVal = src[subCourtKey];
    if (subVal === null || typeof subVal !== 'object' || Array.isArray(subVal)) {
      throw new HttpError(400, `${k}.${subCourtKey} must be a schedule object`);
    }
    nestedOut[subCourtKey] = validateDaySchedule(subVal as Record<string, unknown>, `${k}.${subCourtKey}`);
  }
  return nestedOut;
};

export const COURT_STATUSES = ['ACTIVE', 'MAINTENANCE'] as const;

export const COURT_SCHEMA: Schema = {
  name: S(100, 2),
  code: S(40),
  shortName: S(30),
  address: S(300),
  description: S(1000),
  floorType: S(100),
  hourlyRate: N(0, 10_000_000),
  minHours: N(0.5, 12),
  includes: SA(20, 200),
  imageUrl: U,
  status: E(COURT_STATUSES),
  isMaintenance: B,
  isAvailable: B,
  isActive: B,
  subCourts: SA(10, 50),
  weeklySchedule: WEEKLY_SCHEDULE,
};

export const COURT_MAINTENANCE_TOGGLE_SCHEMA: Schema = {
  status: E(COURT_STATUSES),
  isMaintenance: B,
};

export const CLOSED_SLOT_TOGGLE_SCHEMA: Schema = {
  courtId: S(50, 1),
  date: D,
  slotLabel: S(60, 3),
  reason: S(200),
  subCourt: S(50),
};

const ADDONS: Rule = (v, k) => {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new HttpError(400, `${k} must be an object`);
  const a = v as Record<string, unknown>;
  return {
    mineralWaterBottles: a.mineralWaterBottles === undefined ? 0 : I(0, 100)(a.mineralWaterBottles, 'mineralWaterBottles'),
    mikasaBallCrate: a.mikasaBallCrate === undefined ? false : B(a.mikasaBallCrate, 'mikasaBallCrate'),
    certifiedReferee: a.certifiedReferee === undefined ? false : B(a.certifiedReferee, 'certifiedReferee'),
  };
};

export const BOOKING_CREATE_SCHEMA: Schema = {
  courtId: S(50, 1),
  subCourt: S(50),
  customerName: S(100, 2),
  customerEmail: EM,
  customerPhone: PH,
  bookingDate: D,
  startTime: T,
  endTime: T,
  addons: ADDONS,
  notes: S(500),
};

export const BOOKING_ADMIN_EXTRA_SCHEMA: Schema = {
  totalPrice: N(0, 1_000_000_000),
  paymentStatus: E(['PENDING', 'PAID']),
};

export const BOOKING_STATUS_SCHEMA: Schema = {
  paymentStatus: E(PAYMENT_STATUSES),
};

export const BOOKING_UPDATE_SCHEMA: Schema = {
  courtId: S(50, 1),
  subCourt: S(50),
  courtName: S(100),
  customerName: S(100, 2),
  customerEmail: EM,
  customerPhone: PH,
  bookingDate: D,
  startTime: T,
  endTime: T,
  totalHours: N(0.5, 24),
  courtPrice: N(0, 1_000_000_000),
  addons: ADDONS,
  addonsPrice: N(0, 1_000_000_000),
  totalPrice: N(0, 1_000_000_000),
  paymentStatus: E(PAYMENT_STATUSES),
  notes: S(500),
};

export const COURSE_SCHEMA: Schema = {
  title: S(150, 2),
  level: S(50),
  skillRankLabel: S(40),
  coachName: S(100),
  coachTitle: S(100),
  schedule: S(200),
  duration: S(100),
  price: N(0, 1_000_000_000),
  priceUnit: S(50),
  tag: S(50),
  benefits: SA(30, 200),
  description: S(2000),
  targetAudience: S(500),
  curriculum: SA(50, 200),
  maxSlots: I(1, 1000),
  enrolledSlots: I(0, 1000),
  imageUrl: U,
  isActive: B,
};

export const COACH_SCHEMA: Schema = {
  name: S(100, 2),
  role: S(100),
  experience: S(100),
  height: S(30),
  age: I(10, 100),
  bornYear: I(1930, 2030),
  avatarUrl: U,
  specialty: S(200),
  bio: S(1500),
  certifications: SA(20, 200),
};

export const OPTIONAL_DATE: Rule = (v, k) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'string' && v.trim() === '') return undefined;
  if (typeof v !== 'string') throw new HttpError(400, `${k} must be a date string`);
  const trimmed = v.trim();
  const ymd = trimmed.slice(0, 10);
  return D(ymd, k);
};

export const OPTIONAL_TIME: Rule = (v, k) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'string' && v.trim() === '') return undefined;
  return T(v, k);
};

export const NEWS_SCHEMA: Schema = {
  title: S(200, 3),
  slug: S(200),
  excerpt: S(500),
  content: S(20000, 1),
  imageUrl: U,
  image: U,
  thumbnail: U,
  category: S(50),
  authorName: S(100),
  authorRole: S(100),
  publishedAt: OPTIONAL_DATE,
  createdAt: OPTIONAL_DATE,
  readTimeMinutes: I(1, 120),
  featured: B,
  isPinned: B,
};

export const OPTIONAL_EMAIL: Rule = (v, k) => {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string' && v.trim() === '') return '';
  return EM(v, k);
};

export const TRAINING_REGISTER_SCHEMA: Schema = {
  courseId: S(50, 1),
  fullName: S(100, 2),
  email: OPTIONAL_EMAIL,
  phone: PH,
  experienceLevel: S(100),
  preferredTimeSlot: S(200),
  notes: S(1000),
  level: S(100),
  packageName: S(200),
  courseTitle: S(200),
  targetSkill: S(200),
  position: S(100),
  preferredTime: S(200),
  selectedSlots: S(200),
  code: S(100),
  registrationCode: S(100),
  transferContent: S(200),
  amount: N(0, 100000000),
  price: N(0, 100000000),
};

export const TRAINING_REGISTRATION_STATUS_SCHEMA: Schema = {
  status: E(REGISTRATION_STATUSES),
};

export const MEMBER_REGISTER_SCHEMA: Schema = {
  source: S(30),
  fullName: S(100, 2),
  birthYear: I(1950, 2020),
  dob: D,
  position: E(POSITIONS),
  hometownCountry: S(100, 1),
  desiredJerseyNumber: I(0, 99),
  level: LEVEL_RULE,
  height: N(100, 250),
  weight: N(20, 200),
  spikeReach: N(150, 420),
  blockReach: N(140, 400),
  gmail: S(254),
  instagram: S(100),
  zalo: PH,
  rotationKnowledge: E(ROTATIONS),
  experience: S(400),
  preferredDays: S(400),
};

const OPTIONAL_TRYOUT_METRIC = (min: number, max: number): Rule => (v, k) => {
  if (v === undefined || v === null || v === '' || v === 0 || v === '0') return 0;
  return N(min, max)(v, k);
};

export const TRYOUT_REGISTER_SCHEMA: Schema = {
  source: S(30),
  fullName: S(100, 2),
  birthYear: I(1950, 2020),
  dob: OPTIONAL_DATE,
  position: E(POSITIONS),
  level: LEVEL_RULE,
  height: N(100, 250),
  weight: OPTIONAL_TRYOUT_METRIC(20, 220),
  spikeReach: OPTIONAL_TRYOUT_METRIC(140, 420),
  blockReach: OPTIONAL_TRYOUT_METRIC(130, 400),
  hometownCountry: S(100),
  desiredJerseyNumber: I(0, 99),
  gmail: EM,
  instagram: S(100),
  zalo: PH,
  rotationKnowledge: E(ROTATIONS),
  experience: S(400, 1),
  preferredDays: S(400, 1),
};

export const APPLICATION_STATUS_UPDATE_SCHEMA: Schema = {
  status: E(APPLICATION_STATUSES),
  reviewNotes: S(500),
  entryFee: I(0, 100_000_000),
  skillRank: OPTIONAL_SKILL_RANK,
};

export const TRYOUT_PATCH_SCHEMA: Schema = {
  fullName: S(100, 1),
  name: S(100, 1),
  level: LEVEL_RULE,
  skillRank: OPTIONAL_SKILL_RANK,
  status: E(APPLICATION_STATUSES),
  conclusion: E(APPLICATION_STATUSES),
  outcome: E(APPLICATION_STATUSES),
  reviewNotes: S(500),
  coachNotes: S(2000),
  entryFee: I(0, 100_000_000),
};

export const APPLICATION_PAYMENT_STATUS_SCHEMA: Schema = {
  paymentStatus: E(TRYOUT_PAYMENT_STATUSES),
};

export const EVALUATION_SCORES_RULE: Rule = (v, k) => {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) {
    throw new HttpError(400, `${k} must be an object with physical, technique, tactical, attitude`);
  }
  const obj = v as Record<string, unknown>;
  const physical = I(1, 5)(obj.physical, `${k}.physical`);
  const technique = I(1, 5)(obj.technique, `${k}.technique`);
  const tactical = I(1, 5)(obj.tactical, `${k}.tactical`);
  const attitude = I(1, 5)(obj.attitude, `${k}.attitude`);
  return {
    physical,
    technique,
    tactical,
    attitude,
    total: physical + technique + tactical + attitude,
  };
};

export const TRYOUT_EVALUATE_SCHEMA: Schema = {
  scores: EVALUATION_SCORES_RULE,
  coachNotes: S(2000),
  status: E(['APPROVED', 'RETEST', 'REJECTED']),
  level: LEVEL_RULE,
  skillRank: OPTIONAL_SKILL_RANK,
};

export const TRYOUT_SCHEDULE_EMAIL_SCHEMA: Schema = {
  toEmail: OPTIONAL_EMAIL,
  date: D,
  timeSlot: S(80, 3),
  notes: S(1500),
};

export const TRYOUT_UNIFIED_EMAIL_SCHEMA: Schema = {
  kind: E(['SCHEDULE', 'RESULT']),
  toEmail: OPTIONAL_EMAIL,
  date: OPTIONAL_DATE,
  timeSlot: S(80),
  notes: S(1500),
  outcome: E(['APPROVED', 'REJECTED']),
  coachNotes: S(2000),
  scores: EVALUATION_SCORES_RULE,
  level: LEVEL_RULE,
  skillRank: OPTIONAL_SKILL_RANK,
};

// ============================================================================
// DVA SHOP SCHEMAS (PHASE 2)
// ============================================================================
export const SHOP_CATEGORIES_LIST = [
  'SLEEVELESS',
  'SHORT_SLEEVE',
  'WOMEN',
  'KNEE_PADS',
  'SOCKS',
  'JERSEYS',
  'VOLLEYBALLS',
  'TRAINING_GEAR',
  'ACCESSORIES',
] as const;

export const ORDER_STATUSES = ['PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'] as const;

export const DELIVERY_METHODS = ['COURT_PICKUP', 'HOME_DELIVERY'] as const;

export const PRODUCT_SCHEMA: Schema = {
  sku: S(60, 2),
  slug: S(150),
  name: S(200, 2),
  category: E(SHOP_CATEGORIES_LIST),
  originalPrice: N(0, 100_000_000),
  price: N(0, 100_000_000),
  stock: I(0, 100_000),
  frontImage: U,
  backImage: U,
  imageUrl: U,
  sizes: SA(20, 40),
  colors: SA(20, 50),
  badge: S(60),
  allowCustomPrint: B,
  sortOrder: I(-9999, 99999),
  description: S(5000),
  isPaused: B,
  isActive: B,
};

export const PRODUCT_ACTIVE_TOGGLE_SCHEMA: Schema = {
  isActive: B,
};

export const PRODUCT_PAUSED_TOGGLE_SCHEMA: Schema = {
  isPaused: B,
};

const ORDER_ITEM_RULE: Rule = (v, k) => {
  if (!Array.isArray(v)) throw new HttpError(400, `${k} must be an array`);
  return v.slice(0, 20).map((raw, idx) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new HttpError(400, `${k}[${idx}] must be an object`);
    }
    const obj = raw as Record<string, unknown>;
    return {
      productId: S(100, 1)(obj.productId, `${k}[${idx}].productId`),
      quantity: obj.quantity !== undefined ? I(1, 50)(obj.quantity, `${k}[${idx}].quantity`) : 1,
      size: obj.size !== undefined && obj.size !== null ? S(40)(String(obj.size), `${k}[${idx}].size`) : undefined,
      color: obj.color !== undefined && obj.color !== null ? S(50)(String(obj.color), `${k}[${idx}].color`) : undefined,
      height:
        obj.height !== undefined && obj.height !== null && obj.height !== ''
          ? N(80, 250)(obj.height, `${k}[${idx}].height`)
          : undefined,
      weight:
        obj.weight !== undefined && obj.weight !== null && obj.weight !== ''
          ? N(20, 220)(obj.weight, `${k}[${idx}].weight`)
          : undefined,
      customName:
        obj.customName !== undefined && obj.customName !== null
          ? S(40)(String(obj.customName), `${k}[${idx}].customName`)
          : undefined,
      customNumber:
        obj.customNumber !== undefined && obj.customNumber !== null
          ? S(10)(String(obj.customNumber), `${k}[${idx}].customNumber`)
          : undefined,
    };
  });
};

export const ORDER_CREATE_SCHEMA: Schema = {
  productId: S(100, 1),
  quantity: I(1, 100),
  size: S(40),
  color: S(50),
  height: N(80, 250),
  weight: N(20, 220),
  customName: S(40),
  customNumber: S(10),
  customerName: S(100, 2),
  customerPhone: PH,
  phone: PH,
  customerEmail: OPTIONAL_EMAIL,
  email: OPTIONAL_EMAIL,
  socialLink: S(300),
  deliveryMethod: E(DELIVERY_METHODS),
  shippingAddress: S(500),
  notes: S(1000),
  items: ORDER_ITEM_RULE,
};

export const ORDER_STATUS_SCHEMA: Schema = {
  status: E(ORDER_STATUSES),
  paymentStatus: E(ORDER_STATUSES),
  notes: S(1000),
};

export const SHIPPING_EMAIL_SCHEMA: Schema = {
  trackingCode: S(100),
  carrier: S(100),
  shippingNotes: S(1000),
};

// ============================================================================
// VERIFIED CASHFLOW ANALYTICS SCHEMAS (GUEST SESSION & TRYOUT FEE)
// ============================================================================
export const GUEST_SESSION_STATUS_SCHEMA: Schema = {
  paymentStatus: E(PAYMENT_STATUSES),
};

export const GUEST_SESSION_CREATE_SCHEMA: Schema = {
  guestEmail: EM,
  fullName: S(100, 2),
  phone: PH,
  height: N(80, 250),
  weight: N(20, 220),
  position: S(20),
  positionPrivilege: S(30),
  level: S(50),
  sessionDate: S(20, 4),
  sessionTime: S(50, 3),
  courtAddress: S(300),
  amount: N(0, 100_000_000),
  notes: S(1000),
  alreadyPaid: B,
  forceDuplicate: B,
};

export const APPLICATION_ENTRY_FEE_SCHEMA: Schema = {
  entryFee: I(0, 100_000_000),
};

export const VIETQR_GENERATE_SCHEMA: Schema = {
  amount: N(1000, 1_000_000_000),
  bookingCode: S(60),
  description: S(200),
};

export const CLOUDINARY_SIGN_SCHEMA: Schema = {
  folder: S(100),
};

export const SHEETS_CONFIG_SCHEMA: Schema = {
  scriptUrl: S(500),
};

export const SHEETS_SYNC_SCHEMA: Schema = {
  sheetName: S(100),
  tab: S(100),
  data: (v, k) => {
    if (v === null || typeof v !== 'object' || Array.isArray(v)) {
      throw new HttpError(400, `${k} must be an object`);
    }
    return v as Record<string, any>;
  },
  rowData: (v, k) => {
    if (v === null || typeof v !== 'object' || Array.isArray(v)) {
      throw new HttpError(400, `${k} must be an object`);
    }
    return v as Record<string, any>;
  },
};

// ============================================================================
// TOURNAMENTS & LEAGUES SCHEMAS (SPEC 008)
// ============================================================================
export const TOURNAMENT_MODES = ['HOSTED', 'PARTICIPATING'] as const;
export const TOURNAMENT_TRACKING_MODES = ['FULL_BRACKET', 'DVA_FOCUS'] as const;
export const TOURNAMENT_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const;
export const TOURNAMENT_SET_FORMATS = ['BO3', 'BO2', 'BO1_25'] as const;
export const MATCH_STAGES = ['GROUP', 'POOL_A', 'POOL_B', 'QUARTERFINAL', 'SEMIFINAL', 'THIRD_PLACE', 'FINAL'] as const;
export const MATCH_STATUSES = ['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'] as const;
export const OFFICIAL_ROLES = ['MAIN_REFEREE', 'LINE_JUDGE', 'SCORER', 'SUPERVISOR'] as const;

export const TOURNAMENT_PRIZE_MODES = ['HONOR_ONLY', 'CASH_AND_TROPHIES'] as const;
export const PLAYER_ELIGIBILITY_STATUSES = ['PENDING_CHECK', 'VERIFIED', 'FLAGGED', 'REJECTED'] as const;

const OPTIONAL_PRIZE_JSON: Rule = (v, k) => {
  if (!Array.isArray(v)) throw new HttpError(400, `${k} must be an array`);
  return v.slice(0, 12).map((item) => {
    if (!item || typeof item !== 'object') throw new HttpError(400, `${k} item must be an object`);
    const obj = item as Record<string, unknown>;
    const prizeMode =
      obj.prizeMode !== undefined && obj.prizeMode !== null && obj.prizeMode !== ''
        ? (E(TOURNAMENT_PRIZE_MODES)(String(obj.prizeMode).toUpperCase(), `${k}.prizeMode`) as
            | 'HONOR_ONLY'
            | 'CASH_AND_TROPHIES')
        : undefined;
    const rawCash =
      obj.cashAmount !== undefined && obj.cashAmount !== null && obj.cashAmount !== ''
        ? N(0, 1_000_000_000)(obj.cashAmount, `${k}.cashAmount`)
        : 0;
    return {
      rank: S(30, 1)(obj.rank ?? '1ST', `${k}.rank`),
      label: S(100, 1)(obj.label ?? 'Prize', `${k}.label`),
      cashAmount: prizeMode === 'HONOR_ONLY' ? 0 : rawCash,
      nonCashReward: obj.nonCashReward ? S(200)(obj.nonCashReward, `${k}.nonCashReward`) : '',
      ...(prizeMode ? { prizeMode } : {}),
    };
  });
};

const DREAM_TEAM_KEYS = [
  'MVP',
  'BEST_OH_1',
  'BEST_OH_2',
  'BEST_MB_1',
  'BEST_MB_2',
  'BEST_OP',
  'BEST_SETTER',
  'BEST_LIBERO',
] as const;

const OPTIONAL_DREAM_TEAM_JSON: Rule = (v, k) => {
  if (v === null) return null;
  if (typeof v !== 'object' || Array.isArray(v)) throw new HttpError(400, `${k} must be an object`);
  const obj = v as Record<string, unknown>;
  const out: Record<string, string | null> = {};
  for (const key of DREAM_TEAM_KEYS) {
    const raw = obj[key];
    if (raw === undefined || raw === null || raw === '') {
      out[key] = null;
    } else {
      out[key] = S(80, 1)(raw, `${k}.${key}`);
    }
  }
  return out;
};

export const TOURNAMENT_DREAM_TEAM_SCHEMA: Schema = {
  dreamTeam: OPTIONAL_DREAM_TEAM_JSON,
};

const OPTIONAL_PODIUM_JSON: Rule = (v, k) => {
  if (v === null) return null;
  if (typeof v !== 'object' || Array.isArray(v)) throw new HttpError(400, `${k} must be an object`);
  const obj = v as Record<string, unknown>;
  const out: Record<string, any> = {};
  if (obj.firstName !== undefined) out.firstName = S(120)(obj.firstName, `${k}.firstName`);
  if (obj.firstLogo !== undefined) out.firstLogo = U(obj.firstLogo, `${k}.firstLogo`);
  if (obj.secondName !== undefined) out.secondName = S(120)(obj.secondName, `${k}.secondName`);
  if (obj.secondLogo !== undefined) out.secondLogo = U(obj.secondLogo, `${k}.secondLogo`);
  if (obj.thirdName !== undefined) out.thirdName = S(120)(obj.thirdName, `${k}.thirdName`);
  if (obj.thirdLogo !== undefined) out.thirdLogo = U(obj.thirdLogo, `${k}.thirdLogo`);
  if (obj.dreamTeam !== undefined) out.dreamTeam = OPTIONAL_DREAM_TEAM_JSON(obj.dreamTeam, `${k}.dreamTeam`);
  if (Array.isArray(obj.awards)) {
    out.awards = obj.awards.slice(0, 12).map((a: any) => ({
      award: S(60, 1)(a?.award ?? 'MVP', `${k}.awards.award`),
      playerName: S(100, 1)(a?.playerName ?? '', `${k}.awards.playerName`),
      teamName: a?.teamName ? S(100)(a.teamName, `${k}.awards.teamName`) : '',
      jerseyNumber:
        a?.jerseyNumber !== undefined && a?.jerseyNumber !== ''
          ? I(0, 99)(a.jerseyNumber, `${k}.awards.jerseyNumber`)
          : undefined,
    }));
  }
  return out;
};

export const TOURNAMENT_SCHEMA: Schema = {
  slug: S(150),
  name: S(180, 2),
  subtitle: S(300),
  mode: E(TOURNAMENT_MODES),
  trackingMode: E(TOURNAMENT_TRACKING_MODES),
  status: E(TOURNAMENT_STATUSES),
  isActive: B,
  isRegistrationOpen: B,
  isRosterLocked: B,
  requireBirthYear: B,
  maxTeams: I(2, 32),
  registrationDeadline: OPTIONAL_DATE,
  startDate: D,
  endDate: OPTIONAL_DATE,
  startTime: OPTIONAL_TIME,
  endTime: OPTIONAL_TIME,
  location: S(300),
  mapsUrl: S(500),
  bannerUrl: U,
  groupSetFormat: E(TOURNAMENT_SET_FORMATS),
  knockoutSetFormat: E(TOURNAMENT_SET_FORMATS),
  entryFeePerTeam: I(0, 100_000_000),
  internalExpenseNote: S(3000),
  rulesContent: S(30000),
  prizeConfig: OPTIONAL_PRIZE_JSON,
  dvaResultSummary: S(200),
  podiumOverride: OPTIONAL_PODIUM_JSON,
};

export const TOURNAMENT_VISIBILITY_SCHEMA: Schema = {
  isActive: B,
};

export const TOURNAMENT_REGISTRATION_TOGGLE_SCHEMA: Schema = {
  isRegistrationOpen: B,
};

export const TOURNAMENT_ROSTER_LOCK_SCHEMA: Schema = {
  isRosterLocked: B,
};

export const TOURNAMENT_FORCE_ACTION_SCHEMA: Schema = {
  forceReset: B,
  forceOverride: B,
};

export const TOURNAMENT_IMPORT_SQUAD_SCHEMA: Schema = {
  level: LEVEL_RULE,
};

export const TOURNAMENT_TEAM_ADMIN_SCHEMA: Schema = {
  name: S(120, 2),
  shortName: S(12),
  logoUrl: U,
  isDvaTeam: B,
  dvaSquadLevel: LEVEL_RULE,
  pool: S(5),
  seedOrder: I(0, 64),
  manualRankOverride: I(1, 16),
  finalRank: I(1, 32),
  captainName: S(100),
  captainPhone: S(30),
  captainEmail: OPTIONAL_EMAIL,
  paymentStatus: E(PAYMENT_STATUSES),
  entryFeeAmount: I(0, 100_000_000),
  notes: S(1000),
};

const REGISTRATION_PLAYERS_RULE: Rule = (v, k) => {
  if (!Array.isArray(v)) throw new HttpError(400, `${k} must be an array`);
  if (v.length < 6 || v.length > 14) {
    throw new HttpError(400, 'Roster must contain between 6 and 14 players.');
  }
  const seenJerseys = new Set<number>();
  return v.map((item, idx) => {
    if (!item || typeof item !== 'object') throw new HttpError(400, `${k}[${idx}] must be an object`);
    const p = item as Record<string, unknown>;
    const jerseyNumber = I(0, 99)(p.jerseyNumber, `${k}[${idx}].jerseyNumber`);
    if (seenJerseys.has(jerseyNumber)) {
      throw new HttpError(
        400,
        `Duplicate jersey number #${jerseyNumber}. Athletes on the same team must have unique jersey numbers.`
      );
    }
    seenJerseys.add(jerseyNumber);
    return {
      fullName: S(100, 2)(p.fullName, `${k}[${idx}].fullName`),
      jerseyNumber,
      position: E(POSITIONS)(String(p.position || 'OH').toUpperCase(), `${k}[${idx}].position`),
      height: p.height !== undefined && p.height !== null && p.height !== '' ? N(120, 240)(p.height, `${k}[${idx}].height`) : null,
      spikeTouch: p.spikeTouch !== undefined && p.spikeTouch !== null && p.spikeTouch !== '' ? N(150, 400)(p.spikeTouch, `${k}[${idx}].spikeTouch`) : null,
      birthYear:
        p.birthYear !== undefined && p.birthYear !== null && p.birthYear !== ''
          ? I(1960, 2015)(p.birthYear, `${k}[${idx}].birthYear`)
          : null,
      isCaptain: p.isCaptain !== undefined ? Boolean(p.isCaptain) : false,
    };
  });
};

export const TOURNAMENT_PUBLIC_REGISTER_SCHEMA: Schema = {
  name: S(120, 2),
  shortName: S(12),
  captainName: S(100, 2),
  captainPhone: PH,
  captainEmail: OPTIONAL_EMAIL,
  regulationsAccepted: B,
  notes: S(1000),
  players: REGISTRATION_PLAYERS_RULE,
};

const OPTIONAL_STAT = (min: number, max: number): Rule => (v, k) => {
  if (v === undefined || v === null || v === '') return undefined;
  return N(min, max)(v, k);
};

const OPTIONAL_BIRTH_YEAR: Rule = (v, k) => {
  if (v === undefined || v === null || v === '') return undefined;
  return I(1960, 2015)(v, k);
};

export const TOURNAMENT_PLAYER_SCHEMA: Schema = {
  teamId: S(80, 1),
  linkedPlayerId: S(80),
  fullName: S(100, 2),
  jerseyNumber: I(0, 99),
  position: E(POSITIONS),
  height: OPTIONAL_STAT(100, 250),
  spikeTouch: OPTIONAL_STAT(150, 400),
  avatarUrl: U,
  birthYear: OPTIONAL_BIRTH_YEAR,
  eligibilityStatus: E(PLAYER_ELIGIBILITY_STATUSES),
  rejectionReason: S(300),
  isCaptain: B,
  awards: SA(10, 40),
};

export const TOURNAMENT_MATCH_SCHEMA: Schema = {
  matchCode: S(30, 1),
  stage: E(MATCH_STAGES),
  bracketSide: S(20),
  courtName: S(40),
  scheduledTime: S(20),
  matchOrder: I(0, 999),
  status: E(MATCH_STATUSES),
  setFormat: E(TOURNAMENT_SET_FORMATS),
  homeTeamId: S(80),
  awayTeamId: S(80),
  homeLabel: S(120),
  awayLabel: S(120),
  officialId: S(80),
  assistantOfficialIds: SA(10, 80),
  notes: S(1000),
};

const SET_SCORES_RULE: Rule = (v, k) => {
  if (!Array.isArray(v)) throw new HttpError(400, `${k} must be an array`);
  return v.slice(0, 5).map((item, idx) => {
    if (!item || typeof item !== 'object') throw new HttpError(400, `${k}[${idx}] must be an object`);
    const s = item as Record<string, unknown>;
    return {
      set: I(1, 5)(s.set ?? idx + 1, `${k}[${idx}].set`),
      home: I(0, 999)(s.home ?? 0, `${k}[${idx}].home`),
      away: I(0, 999)(s.away ?? 0, `${k}[${idx}].away`),
      isCompleted: Boolean(s.isCompleted),
    };
  });
};

export const TOURNAMENT_MATCH_SCORE_SCHEMA: Schema = {
  matchCode: S(30, 1),
  matchOrder: I(0, 999),
  status: E(MATCH_STATUSES),
  courtName: S(40),
  scheduledTime: S(20),
  setFormat: E(TOURNAMENT_SET_FORMATS),
  setScores: SET_SCORES_RULE,
  homeTeamId: S(80),
  awayTeamId: S(80),
  homeLabel: S(120),
  awayLabel: S(120),
  officialId: S(80),
  assistantOfficialIds: SA(10, 80),
  notes: S(1000),
  forceOverride: B,
};

export const TOURNAMENT_OFFICIAL_SCHEMA: Schema = {
  fullName: S(100, 2),
  role: E(OFFICIAL_ROLES),
  certification: S(150),
  avatarUrl: U,
  phone: S(30),
  sortOrder: I(0, 200),
};

// ============================================================================
// HANOI VOLLEYBALL COURT MAP & CLUB PROFILES SCHEMAS
// ============================================================================

const VENUE_TYPES = ['COMMERCIAL', 'FREE_PUBLIC'] as const;
const VENUE_FEE_TYPES = ['PAID', 'FREE'] as const;
const VENUE_PLAY_STYLES = ['COMPETITIVE', 'FUN_GAME', 'TRAINING'] as const;
const PLAY_STYLE_RULE: Rule = (v, k) => {
  const raw = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : null;
  if (!raw) throw new HttpError(400, `${k} must be a play style string or array`);
  const items = raw.map((x) => String(x).trim().toUpperCase()).filter(Boolean);
  if (!items.length) throw new HttpError(400, 'Chọn ít nhất 1 mục đích chơi');
  for (const s of items) E(VENUE_PLAY_STYLES)(s, k);
  return VENUE_PLAY_STYLES.filter((s) => items.includes(s)).join(',');
};
const VENUE_RECRUITMENT_STATUSES = ['OPEN_RECRUIT', 'CHECK_CAPTAIN', 'FULL'] as const;
const VENUE_CAPACITY_MODES = ['UNLIMITED', 'LIMITED_SLOTS'] as const;
const VENUE_GENDER_RULES = ['MALE_ONLY', 'MIXED', 'FEMALE_ONLY'] as const;

const NEEDED_POSITIONS_RULE: Rule = (v, k) => {
  if (!Array.isArray(v)) throw new HttpError(400, `${k} must be an array of positions`);
  if (v.length > 5) throw new HttpError(400, `${k} cannot exceed 5 positions`);
  return Array.from(new Set(v.map((p) => E(POSITIONS)(String(p).trim().toUpperCase(), k))));
};

const CANCELLED_DATES_RULE: Rule = (v, k) => {
  if (!Array.isArray(v)) throw new HttpError(400, `${k} must be an array of YYYY-MM-DD dates`);
  if (v.length > 31) throw new HttpError(400, `${k} cannot exceed 31 dates`);
  return Array.from(new Set(v.map((item) => D(item, k)))).sort();
};

const DAILY_OVERRIDES_RULE: Rule = (v, k) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new HttpError(400, `${k} must be an object keyed by YYYY-MM-DD`);
  const entries = Object.entries(v as Record<string, unknown>);
  if (entries.length > 62) throw new HttpError(400, `${k} cannot exceed 62 dates`);
  const out: Record<string, { currentPlayers: number; neededPositions: string[] }> = {};
  for (const [rawDate, rawVal] of entries) {
    const dateKey = D(rawDate, `${k}.key`);
    if (!rawVal || typeof rawVal !== 'object' || Array.isArray(rawVal)) continue;
    const obj = rawVal as Record<string, unknown>;
    out[dateKey] = {
      currentPlayers: obj.currentPlayers !== undefined ? I(0, 100)(obj.currentPlayers, `${k}.${dateKey}.currentPlayers`) : 0,
      neededPositions: obj.neededPositions !== undefined ? NEEDED_POSITIONS_RULE(obj.neededPositions, `${k}.${dateKey}.neededPositions`) : [],
    };
  }
  return out;
};

const DAYS_OF_WEEK_INT_ARRAY: Rule = (v, k) => {
  if (!Array.isArray(v)) throw new HttpError(400, `${k} must be an array of integers (0-6)`);
  if (v.length === 0) throw new HttpError(400, `${k} must include at least one day of the week`);
  if (v.length > 7) throw new HttpError(400, `${k} cannot exceed 7 days`);
  const unique = new Set<number>();
  for (const item of v) {
    const day = I(0, 6)(item, k);
    unique.add(day);
  }
  return Array.from(unique);
};

const SUB_COURTS_ARRAY: Rule = (v, k) => {
  if (!Array.isArray(v)) throw new HttpError(400, `${k} must be an array of court names`);
  if (v.length === 0) throw new HttpError(400, `${k} must include at least one sub-court (e.g. Court A)`);
  if (v.length > 12) throw new HttpError(400, `${k} cannot exceed 12 sub-courts`);
  const cleaned = v.map((item) => S(40, 1)(item, k));
  return Array.from(new Set(cleaned));
};

const GALLERY_URLS_RULE: Rule = (v, k) => {
  if (!Array.isArray(v)) throw new HttpError(400, `${k} must be an array of image URLs`);
  if (v.length > 20) throw new HttpError(400, `${k} cannot exceed 20 images`);
  return v
    .map((item) => U(item, k))
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
};

export const VENUE_SCHEMA: Schema = {
  name: S(180, 2),
  slug: S(150),
  address: S(300, 3),
  city: S(80, 2),
  district: S(80, 2),
  latitude: N(-90, 90),
  longitude: N(-180, 180),
  surfaceType: S(100, 2),
  subCourtsCount: I(1, 12),
  venueType: E(VENUE_TYPES),
  rentalPriceInfo: S(200),
  entryNote: S(1500),
  isDvaOfficial: B,
  isFeatured: B,
  isClosed: B,
  closureReason: S(500),
  closedUntil: OPTIONAL_DATE,
  coverUrl: U,
};

export const VENUE_CLUB_SCHEMA: Schema = {
  name: S(150, 2),
  slug: S(150),
  logoUrl: U,
  coverUrl: U,
  galleryUrls: GALLERY_URLS_RULE,
  captainName: S(100, 2),
  captainPhone: PH,
  captainZalo: S(120),
  captainEmail: OPTIONAL_EMAIL,
  captainUserId: S(80),
  playStyle: PLAY_STYLE_RULE,
  tags: SA(15, 60),
  description: S(3000),
  feeType: E(VENUE_FEE_TYPES),
  feeAmount: S(150),
  isActive: B,
};

export const VENUE_SESSION_SCHEMA: Schema = {
  clubId: S(80, 2),
  daysOfWeek: DAYS_OF_WEEK_INT_ARRAY,
  startTime: T,
  endTime: T,
  subCourts: SUB_COURTS_ARRAY,
  recruitmentStatus: E(VENUE_RECRUITMENT_STATUSES),
  isCancelled: B,
  cancelledDates: CANCELLED_DATES_RULE,
  cancelReason: S(300),
  capacityMode: E(VENUE_CAPACITY_MODES),
  currentPlayers: I(0, 100),
  maxPlayers: I(1, 100),
  neededPositions: NEEDED_POSITIONS_RULE,
  dailyOverrides: DAILY_OVERRIDES_RULE,
  genderRule: E(VENUE_GENDER_RULES),
  skillRankLabel: S(40),
  forceOverride: B,
};

const LEADERSHIP_ACCENT_COLORS = ['emerald', 'orange', 'red', 'blue'] as const;

export const LEADERSHIP_MEMBER_SCHEMA: Schema = {
  name: S(120, 2),
  badgeRole: S(120, 2),
  subtitle: S(160, 2),
  bio: S(1500, 5),
  footerRole: S(120, 2),
  avatarUrl: U,
  accentColor: E(LEADERSHIP_ACCENT_COLORS),
  displayOrder: I(0, 999),
  isActive: B,
};
