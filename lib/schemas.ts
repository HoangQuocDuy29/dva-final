import { B, D, E, EM, HttpError, I, N, PH, S, SA, T, U, Rule, Schema } from './validation';

export const LEVELS = ['KID', 'JUNIOR', 'SENIOR'] as const;
export const POSITIONS = ['OH', 'OP', 'MB', 'S', 'L'] as const;
export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'CANCELLED'] as const;
export const REGISTRATION_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED'] as const;
export const APPLICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const ROTATIONS = ['5-1', '6-2', '4-2', 'BEGINNER'] as const;

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
  level: E(LEVELS),
  position: E(POSITIONS),
  avatarUrl: U,
  bio: S(1000),
  isCaptain: B,
  captain: B,
  joined: I(1990, 2100),
  joinedYear: I(1990, 2100),
};

export const COURT_SCHEMA: Schema = {
  name: S(100, 2),
  shortName: S(30),
  description: S(1000),
  floorType: S(100),
  hourlyRate: N(0, 10_000_000),
  minHours: N(0.5, 12),
  includes: SA(20, 200),
  imageUrl: U,
  isAvailable: B,
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

/** Fields a customer may send when creating a booking (prices are NEVER accepted from customers). */
export const BOOKING_CREATE_SCHEMA: Schema = {
  courtId: S(50, 1),
  customerName: S(100, 2),
  customerEmail: EM,
  customerPhone: PH,
  bookingDate: D,
  startTime: T,
  endTime: T,
  addons: ADDONS,
  notes: S(500),
};

/** Extra fields only staff may set when creating a booking manually. */
export const BOOKING_ADMIN_EXTRA_SCHEMA: Schema = {
  totalPrice: N(0, 1_000_000_000),
  paymentStatus: E(['PENDING', 'PAID']),
};

export const BOOKING_UPDATE_SCHEMA: Schema = {
  courtId: S(50, 1),
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

export const NEWS_SCHEMA: Schema = {
  title: S(200, 3),
  slug: S(200),
  excerpt: S(500),
  content: S(20000, 1),
  thumbnail: U,
  category: S(50),
  authorName: S(100),
  authorRole: S(100),
  readTimeMinutes: I(1, 120),
  featured: B,
};

export const TRAINING_REGISTER_SCHEMA: Schema = {
  courseId: S(50, 1),
  fullName: S(100, 2),
  email: EM,
  phone: PH,
  experienceLevel: S(100),
  preferredTimeSlot: S(200),
  notes: S(1000),
};

export const MEMBER_REGISTER_SCHEMA: Schema = {
  fullName: S(100, 2),
  dob: D,
  position: E(POSITIONS),
  hometownCountry: S(100, 1),
  desiredJerseyNumber: I(0, 99),
  level: E(LEVELS),
  height: N(100, 250),
  weight: N(20, 200),
  spikeReach: N(150, 420),
  blockReach: N(140, 400),
  gmail: EM,
  instagram: S(100),
  zalo: PH,
  rotationKnowledge: E(ROTATIONS),
};
