export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'STAFF' | 'COACH' | 'PLAYER' | 'GUEST';

/** Roles a SUPERADMIN may assign to managed accounts. */
export type ManagedUserRole = 'ADMIN' | 'STAFF' | 'COACH' | 'PLAYER';
export const MANAGED_USER_ROLES: ManagedUserRole[] = ['ADMIN', 'STAFF', 'COACH', 'PLAYER'];

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  phoneNumber?: string;
  createdAt: string;
}

export type PlayerLevel = 'SENIOR' | 'JUNIOR' | 'YOUTH';

export type VolleyballPosition = 'OH' | 'OP' | 'MB' | 'S' | 'L';

export const POSITION_LABELS: Record<VolleyballPosition, { code: VolleyballPosition; nameVi: string; nameEn: string }> = {
  OH: { code: 'OH', nameVi: 'Chủ công', nameEn: 'Outside Hitter' },
  OP: { code: 'OP', nameVi: 'Đối chuyền', nameEn: 'Opposite Hitter' },
  MB: { code: 'MB', nameVi: 'Phụ công', nameEn: 'Middle Blocker' },
  S: { code: 'S', nameVi: 'Chuyền hai', nameEn: 'Setter' },
  L: { code: 'L', nameVi: 'Libero', nameEn: 'Libero' },
};

export type { CountryOption } from '../data/countries';

export function countryCodeToFlagEmoji(countryCode?: string): string {
  if (!countryCode || typeof countryCode !== 'string') return '🇻🇳';
  const clean = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(clean)) return '🇻🇳';
  return String.fromCodePoint(...clean.split('').map((c) => 127397 + c.charCodeAt(0)));
}

export interface Player {
  id: string;
  userId?: string;
  fullName: string;
  jerseyNumber: number;
  height: number; // in cm
  weight: number; // in kg
  spikeTouch: number; // reach in cm
  blockTouch: number; // block touch in cm
  hometownCountry: string; // e.g. "Hà Nội"
  country?: string; // e.g. "Vietnam", "Russia", "Japan", "United States"
  countryName?: string; // e.g. "Vietnam" or "Australia"
  countryCode?: string; // e.g. "VN", "RU", "JP", "US"
  countryFlag?: string; // e.g. "🇻🇳" or "🇦🇺"
  bornYear?: number; // e.g. 2006
  level: PlayerLevel;
  position: VolleyballPosition;
  avatarUrl?: string;
  bio?: string;
  isCaptain?: boolean;
  captain?: boolean;
  joined?: string | number; // e.g. "2025", 2025
  joinedYear?: number;
}

export type DayOfWeekKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type WeeklySchedule = Record<DayOfWeekKey, string[]>;

export type SubCourtWeeklySchedule = Record<string, WeeklySchedule>;

export type CourtWeeklySchedule = WeeklySchedule | SubCourtWeeklySchedule;

export const DAYS_OF_WEEK: { key: DayOfWeekKey; labelVi: string; shortVi: string; labelEn: string }[] = [
  { key: 'monday', labelVi: 'Thứ 2', shortVi: 'T2', labelEn: 'Monday' },
  { key: 'tuesday', labelVi: 'Thứ 3', shortVi: 'T3', labelEn: 'Tuesday' },
  { key: 'wednesday', labelVi: 'Thứ 4', shortVi: 'T4', labelEn: 'Wednesday' },
  { key: 'thursday', labelVi: 'Thứ 5', shortVi: 'T5', labelEn: 'Thursday' },
  { key: 'friday', labelVi: 'Thứ 6', shortVi: 'T6', labelEn: 'Friday' },
  { key: 'saturday', labelVi: 'Thứ 7', shortVi: 'T7', labelEn: 'Saturday' },
  { key: 'sunday', labelVi: 'Chủ Nhật', shortVi: 'CN', labelEn: 'Sunday' },
];

export type CourtStatus = 'ACTIVE' | 'MAINTENANCE';

export interface Court {
  id: string;
  name: string;
  shortName?: string;
  code: string; // 'BTL_TT' | 'THE_CONG' | 'MY_DINH'
  address?: string;
  description: string;
  floorType: string; // e.g. 'Taraflex Pro Elite'
  hourlyRate: number; // 550,000 VND
  minHours: number; // 1.5
  includes: string[];
  imageUrl: string;
  status?: CourtStatus; // 'ACTIVE' | 'MAINTENANCE'
  isMaintenance?: boolean;
  isAvailable: boolean;
  isActive?: boolean;
  weeklySchedule?: CourtWeeklySchedule;
  subCourts?: string[]; // e.g. ['Sân A', 'Sân B']
}

export type PaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface BookingAddons {
  mineralWaterBottles: number; // 15,000 VND each
  mikasaBallCrate: boolean; // 100,000 VND per session
  certifiedReferee: boolean; // 200,000 VND per match
}

export interface Booking {
  id: string;
  courtId: string;
  courtName: string;
  subCourt?: string; // 'Sân A' | 'Sân B'
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  totalHours: number;
  courtPrice: number;
  addons: BookingAddons;
  addonsPrice: number;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  bookingCode: string; // e.g. DVA-BTL-17H30-19H-YYYYMMDD
  transferContent?: string; // e.g. DVA BTL TT 17H30 19H00 20261020
  createdAt: string;
  notes?: string;
  /** Set when the customer reports they transferred the money (staff still must verify before PAID). */
  customerConfirmedAt?: string;
  /** Online bookings auto-cancel at this time unless the customer reports payment. */
  holdExpiresAt?: string;
}

export interface ClosedSlot {
  id: string;
  courtId: string;
  courtName: string;
  subCourt?: string; // 'Sân A' | 'Sân B'
  date: string; // YYYY-MM-DD
  slotLabel: string; // e.g. "17:30 - 19:00"
  reason?: string;
  closedBy?: string;
  createdAt: string;
}

export interface TrainingCourse {
  id: string;
  title: string;
  level: string;
  coachName: string;
  coachTitle: string;
  schedule: string;
  duration: string;
  price: number;
  priceUnit?: string;
  tag?: string;
  benefits?: string[];
  description: string;
  targetAudience: string;
  curriculum: string[];
  maxSlots: number;
  enrolledSlots: number;
  imageUrl?: string;
}

export interface CoachProfile {
  id: string;
  name: string;
  role: string;
  experience: string;
  height: string;
  age: number;
  bornYear: number;
  avatarUrl: string;
  specialty: string;
  bio: string;
  certifications: string[];
}

export interface TrainingRegistration {
  id: string;
  courseId: string;
  courseTitle: string;
  fullName: string;
  email: string;
  phone: string;
  experienceLevel: string;
  preferredTimeSlot: string;
  notes?: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  // Standardized fields for Training & Scrimmage workflow
  code?: string;
  registrationCode?: string;
  packageName?: string;
  level?: string;
  targetSkill?: string;
  position?: string;
  preferredTime?: string;
  selectedSlots?: string;
  amount?: number;
  price?: number;
  transferContent?: string;
}

export type RotationKnowledge = '5-1' | '6-2' | '4-2' | 'BEGINNER';

export interface MemberApplication {
  id: string;
  fullName: string;
  dob: string;
  position: VolleyballPosition;
  hometownCountry: string;
  desiredJerseyNumber: number;
  level: PlayerLevel;
  height: number;
  weight: number;
  spikeReach: number;
  blockReach: number;
  gmail: string;
  instagram: string; // or "None"
  zalo: string;
  rotationKnowledge: RotationKnowledge;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNotes?: string;
  createdAt: string;
}

export interface NewsPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  image?: string;
  thumbnail: string;
  category: 'TOURNAMENT' | 'CLUB_EVENT' | 'TECHNIQUE' | 'TRYOUT' | string;
  authorName: string;
  authorRole: string;
  publishedAt: string;
  readTimeMinutes: number;
  featured?: boolean;
}

export interface GoogleSheetsSyncLog {
  id: string;
  tabName: 'Member_Registrations' | 'Court_Bookings' | 'Training_Registrations';
  action: 'APPEND_ROW';
  rowData: Record<string, any>;
  timestamp: string;
  status: 'SUCCESS' | 'QUEUED';
}

export interface GuestSessionPayload {
  guestEmail: string;
  fullName: string;
  phone: string;
  height?: number | string;
  weight?: number | string;
  position: 'OH' | 'MB' | 'OP' | 'S' | 'L' | string;
  positionPrivilege: 'FIXED' | 'RANDOM' | string;
  level: string;
  sessionDate: string;
  sessionTime: string;
  courtAddress?: string;
  amount: number;
  notes?: string;
}
