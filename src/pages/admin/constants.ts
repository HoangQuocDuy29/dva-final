import {
  Booking,
  CoachProfile,
  Court,
  GuestSessionPayload,
  ManagedUserRole,
  Player,
  TrainingCourse,
} from '../../types';
import { getDefaultWeeklyScheduleForCourt } from '../../shared/schedule';
import { AdminTabId, TabConfig } from './types';

export const VALID_TABS: readonly AdminTabId[] = [
  'OVERVIEW',
  'COURTS',
  'BOOKINGS',
  'APPLICATIONS',
  'PLAYERS',
  'TRAINING',
  'COACHES',
  'NEWS',
  'SHEETS',
  'USERS',
] as const;

export const USER_ROLE_BADGE: Record<string, string> = {
  SUPERADMIN: 'bg-red-950/80 text-red-300 border-red-500/60',
  ADMIN: 'bg-orange-950/80 text-orange-300 border-orange-500/60',
  STAFF: 'bg-sky-950/80 text-sky-300 border-sky-500/60',
  COACH: 'bg-purple-950/80 text-purple-300 border-purple-500/60',
  PLAYER: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60',
  GUEST: 'bg-slate-800 text-slate-300 border-slate-600',
};

export function buildAdminTabs(params: {
  pendingBookingsCount: number;
  pendingApplicationsCount: number;
  playersCount: number;
  coursesCount: number;
  coachesCount: number;
  newsCount: number;
  isSuperAdmin: boolean;
}): TabConfig[] {
  const {
    pendingBookingsCount,
    pendingApplicationsCount,
    playersCount,
    coursesCount,
    coachesCount,
    newsCount,
    isSuperAdmin,
  } = params;

  return [
    { id: 'OVERVIEW', label: 'Overview & Metrics' },
    { id: 'COURTS', label: 'Court Schedule & Slots' },
    {
      id: 'BOOKINGS',
      label: 'Court Bookings & VietQR',
      badge: pendingBookingsCount,
    },
    { id: 'PLAYERS', label: `Squad Roster (${playersCount})` },
    { id: 'TRAINING', label: `Training & Scrimmage (${coursesCount})` },
    { id: 'COACHES', label: `Coaching Staff (${coachesCount})` },
    {
      id: 'APPLICATIONS',
      label: 'Tryout Applications',
      badge: pendingApplicationsCount,
    },
    { id: 'NEWS', label: `News Articles (${newsCount})` },
    { id: 'SHEETS', label: 'Google Sheets Live Sync' },
    ...(isSuperAdmin ? [{ id: 'USERS' as const, label: 'Quản lý Tài Khoản', superAdminOnly: true }] : []),
  ];
}

export function createInitialManageDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function createDefaultUserForm(): {
  name: string;
  email: string;
  password: string;
  role: ManagedUserRole;
} {
  return {
    name: '',
    email: '',
    password: '',
    role: 'STAFF',
  };
}

export function createDefaultGuestForm(): GuestSessionPayload {
  return {
    guestEmail: '',
    fullName: '',
    phone: '',
    height: '',
    weight: '',
    position: 'OH',
    positionPrivilege: 'FIXED',
    level: 'Junior',
    sessionDate: new Date().toISOString().slice(0, 10),
    sessionTime: '19:00 - 21:30',
    courtAddress: '155 Trường Chinh, Thanh Xuân, Hà Nội',
    amount: 70000,
    notes: '',
  };
}

export function createDefaultPlayerForm(jerseyNumber: number = 1): Partial<Player> {
  return {
    fullName: '',
    jerseyNumber,
    height: 185,
    weight: 75,
    spikeTouch: 330,
    blockTouch: 315,
    hometownCountry: 'Hà Nội',
    country: 'Vietnam',
    countryName: 'Vietnam',
    countryCode: 'VN',
    countryFlag: '🇻🇳',
    bornYear: 2005,
    joined: 2025,
    joinedYear: 2025,
    level: 'SENIOR',
    position: 'OH',
    bio: '',
    captain: false,
    isCaptain: false,
  };
}

export function createDefaultBookingForm(): Partial<Booking> {
  return {
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    courtId: 'court-btl',
    courtName: 'Sân Thể Công (Court 1)',
    bookingDate: new Date().toISOString().split('T')[0],
    startTime: '17:30',
    endTime: '19:30',
    totalHours: 2,
    totalPrice: 1000000,
    paymentStatus: 'PAID',
  };
}

export function createDefaultCourseForm(): Partial<TrainingCourse> {
  return {
    title: '',
    level: 'JUNIOR',
    schedule: 'Thứ 3 & Thứ 5 (18:00 - 20:00)',
    duration: '8 tuần (16 buổi)',
    maxSlots: 16,
    enrolledSlots: 0,
    price: 2400000,
    coachName: 'Hoàng Quốc Duy',
    coachTitle: 'Head Coach & Founder',
    description: '',
    curriculum: ['Khởi động chuyên sâu', 'Tấn công biên 4', 'Phòng thủ hàng sau'],
    benefits: ['Áo đấu DVA chính hãng', 'Phân tích video kỹ thuật'],
  };
}

export function createDefaultCoachForm(): Partial<CoachProfile> {
  return {
    name: '',
    role: 'Chuyên Gia Tấn Công Biên',
    experience: '5 năm kinh nghiệm',
    bio: '',
    avatarUrl: '/coaches/duy.png',
    certifications: ['FIVB Level 1 Certified', 'Cựu VĐV Quốc Gia'],
  };
}

export function createDefaultCourtForm(): Partial<Court> {
  return {
    name: '',
    code: '',
    shortName: '',
    address: 'DVA Sports Center, Hà Nội',
    description: 'Sân bóng chuyền tiêu chuẩn FIVB trang bị thảm Taraflex Pro chống chấn thương.',
    floorType: 'Gerflor Taraflex Sport Pro',
    hourlyRate: 500000,
    minHours: 1.5,
    imageUrl: '/courts/btl.png',
    status: 'ACTIVE',
    isMaintenance: false,
    isAvailable: true,
    isActive: true,
    subCourts: [],
    weeklySchedule: getDefaultWeeklyScheduleForCourt(),
  };
}
