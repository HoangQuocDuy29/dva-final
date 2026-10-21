export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'PLAYER' | 'GUEST';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  phoneNumber?: string;
  createdAt: string;
}

export type PlayerLevel = 'SENIOR' | 'JUNIOR' | 'KID';

export type VolleyballPosition = 'OH' | 'OP' | 'MB' | 'S' | 'L';

export const POSITION_LABELS: Record<VolleyballPosition, { code: VolleyballPosition; nameVi: string; nameEn: string }> = {
  OH: { code: 'OH', nameVi: 'Chủ công', nameEn: 'Outside Hitter' },
  OP: { code: 'OP', nameVi: 'Đối chuyền', nameEn: 'Opposite Hitter' },
  MB: { code: 'MB', nameVi: 'Phụ công', nameEn: 'Middle Blocker' },
  S: { code: 'S', nameVi: 'Chuyền hai', nameEn: 'Setter' },
  L: { code: 'L', nameVi: 'Libero', nameEn: 'Libero' },
};

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
  countryName?: string; // e.g. "Vietnam" or "Australia"
  countryCode?: string; // e.g. "VN" or "AU"
  countryFlag?: string; // e.g. "🇻🇳" or "🇦🇺"
  bornYear?: number; // e.g. 2006
  level: PlayerLevel;
  position: VolleyballPosition;
  avatarUrl?: string;
  bio?: string;
  isCaptain?: boolean;
  joinedYear?: number;
}

export interface Court {
  id: string;
  name: string;
  shortName?: string;
  code: string; // 'BTL_TT' | 'THE_CONG' | 'MY_DINH'
  description: string;
  floorType: string; // e.g. 'Taraflex Pro Elite'
  hourlyRate: number; // 550,000 VND
  minHours: number; // 1.5
  includes: string[];
  imageUrl: string;
  isAvailable: boolean;
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
}

export interface ClosedSlot {
  id: string;
  courtId: string;
  courtName: string;
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
