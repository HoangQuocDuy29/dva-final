import {
  Booking,
  CoachProfile,
  Court,
  GuestSessionPayload,
  ManagedUserRole,
  Player,
  TrainingCourse,
} from '../../types';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Award,
  ClipboardList,
  CalendarClock,
  CreditCard,
  ShoppingBag,
  Trophy,
  Newspaper,
  Sheet,
  ShieldCheck,
} from 'lucide-react';
import { getDefaultWeeklyScheduleForCourt } from '../../shared/schedule';
import { AdminNavGroup, AdminNavItem, AdminTabId } from './types';

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
  'STORE',
  'TOURNAMENTS',
] as const;

/**
 * Static sidebar registry (Spec 005). Group and item order is contractual —
 * see specs/005-admin-modern-analytics-hub/contracts/admin-ui-contract.md §2.
 */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'OVERVIEW',
    label: 'Overview',
    items: [
      {
        id: 'OVERVIEW',
        label: 'Overview & Analytics',
        icon: LayoutDashboard,
        keywords: ['overview', 'dashboard', 'analytics', 'revenue', 'kpi'],
      },
    ],
  },
  {
    id: 'ATHLETICS',
    label: 'Athletics & Services',
    items: [
      { id: 'PLAYERS', label: 'Squad Roster', icon: Users, keywords: ['players', 'athletes', 'roster', 'squad'] },
      {
        id: 'TRAINING',
        label: 'Training & Scrimmages',
        icon: Dumbbell,
        keywords: ['training', 'courses', 'scrimmage', 'academy', 'students'],
      },
      { id: 'COACHES', label: 'Coaching Staff', icon: Award, keywords: ['coaches', 'staff', 'coaching'] },
      {
        id: 'APPLICATIONS',
        label: 'Tryout Applications',
        icon: ClipboardList,
        keywords: ['applications', 'tryouts', 'recruiting', 'members'],
      },
      {
        id: 'COURTS',
        label: 'Court Schedule & Slots',
        icon: CalendarClock,
        keywords: ['courts', 'schedule', 'slots', 'lock', 'calendar'],
      },
    ],
  },
  {
    id: 'COMMERCE',
    label: 'Commerce & Competition',
    items: [
      {
        id: 'BOOKINGS',
        label: 'Court Bookings & VietQR',
        icon: CreditCard,
        keywords: ['bookings', 'reservations', 'vietqr', 'payments', 'deposit'],
      },
      {
        id: 'STORE',
        label: 'DVA Store',
        icon: ShoppingBag,
        keywords: ['store', 'shop', 'merch', 'products', 'orders'],
        status: 'NEW',
      },
      {
        id: 'TOURNAMENTS',
        label: 'Tournaments',
        icon: Trophy,
        keywords: ['tournaments', 'leagues', 'brackets', 'competition'],
        status: 'SOON',
      },
    ],
  },
  {
    id: 'SYSTEM',
    label: 'System',
    items: [
      { id: 'NEWS', label: 'News & Media', icon: Newspaper, keywords: ['news', 'articles', 'media', 'posts'] },
      { id: 'SHEETS', label: 'Google Sheets Sync', icon: Sheet, keywords: ['sheets', 'google', 'sync', 'export'] },
      {
        id: 'USERS',
        label: 'Staff & Roles',
        icon: ShieldCheck,
        keywords: ['users', 'accounts', 'roles', 'staff', 'permissions'],
        superAdminOnly: true,
      },
    ],
  },
];

/** Returns the nav groups visible to the current role (USERS only for SUPERADMIN). */
export function getVisibleNavGroups(isSuperAdmin: boolean): AdminNavGroup[] {
  return ADMIN_NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.superAdminOnly || isSuperAdmin),
  })).filter((g) => g.items.length > 0);
}

export function findNavItem(id: AdminTabId): AdminNavItem | undefined {
  for (const g of ADMIN_NAV_GROUPS) {
    const item = g.items.find((i) => i.id === id);
    if (item) return item;
  }
  return undefined;
}

export interface AdminNavBadge {
  value: number;
  tone: 'alert' | 'count';
}

/** Sidebar badges: pending items use an alert tone, collection sizes a neutral count tone. */
export function getAdminNavBadges(m: {
  pendingBookingsCount: number;
  pendingApplicationsCount: number;
  pendingTrainingCount: number;
  pendingStoreOrdersCount?: number;
  playersCount: number;
  coachesCount: number;
  newsCount: number;
}): Partial<Record<AdminTabId, AdminNavBadge>> {
  return {
    BOOKINGS: { value: m.pendingBookingsCount, tone: 'alert' },
    APPLICATIONS: { value: m.pendingApplicationsCount, tone: 'alert' },
    TRAINING: { value: m.pendingTrainingCount, tone: 'alert' },
    STORE: { value: m.pendingStoreOrdersCount ?? 0, tone: 'alert' },
    PLAYERS: { value: m.playersCount, tone: 'count' },
    COACHES: { value: m.coachesCount, tone: 'count' },
    NEWS: { value: m.newsCount, tone: 'count' },
  };
}

export const USER_ROLE_BADGE: Record<string, string> = {
  SUPERADMIN: 'bg-red-950/80 text-red-300 border-red-500/60',
  ADMIN: 'bg-orange-950/80 text-orange-300 border-orange-500/60',
  STAFF: 'bg-sky-950/80 text-sky-300 border-sky-500/60',
  COACH: 'bg-purple-950/80 text-purple-300 border-purple-500/60',
  PLAYER: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60',
  GUEST: 'bg-slate-800 text-slate-300 border-slate-600',
};

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
    alreadyPaid: false,
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
