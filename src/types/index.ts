export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'STAFF' | 'COACH' | 'CAPTAIN' | 'PLAYER' | 'GUEST';

/** Roles a SUPERADMIN may assign to managed accounts. */
export type ManagedUserRole = 'ADMIN' | 'STAFF' | 'COACH' | 'CAPTAIN' | 'PLAYER';
export const MANAGED_USER_ROLES: ManagedUserRole[] = ['ADMIN', 'STAFF', 'COACH', 'CAPTAIN', 'PLAYER'];

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  phoneNumber?: string;
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  issuedPassword?: string;
}

export type PlayerLevel = 'SENIOR' | 'JUNIOR' | 'YOUTH';

export type VolleyballPosition = 'OH' | 'OP' | 'MB' | 'S' | 'L';

export type PlayerEligibilityStatus = 'PENDING_CHECK' | 'VERIFIED' | 'FLAGGED' | 'REJECTED';

export const POSITION_LABELS: Record<VolleyballPosition, { code: VolleyballPosition; nameVi: string; nameEn: string }> = {
  OH: { code: 'OH', nameVi: 'Outside Hitter', nameEn: 'Outside Hitter' },
  OP: { code: 'OP', nameVi: 'Opposite Spiker', nameEn: 'Opposite Spiker' },
  MB: { code: 'MB', nameVi: 'Middle Blocker', nameEn: 'Middle Blocker' },
  S: { code: 'S', nameVi: 'Setter', nameEn: 'Setter' },
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
  isActive?: boolean;
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
  isActive?: boolean;
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

export type ApplicationStatus = 'PENDING' | 'SCHEDULED' | 'RETEST' | 'APPROVED' | 'REJECTED';
export type TryoutPaymentStatus = 'PENDING' | 'PAID' | 'FREE';

export interface TryoutEvaluationScores {
  physical: number;  // 1-5: Thể lực & Sức bật
  technique: number; // 1-5: Kỹ thuật cơ bản (Đệm/Chuyền/Phát)
  tactical: number;  // 1-5: Tư duy chiến thuật & Vị trí sở trường
  attitude: number;  // 1-5: Thái độ & Tinh thần đồng đội
  total: number;     // 4-20
  evaluatedBy?: string;
  evaluatedAt?: string;
}

export interface TryoutScheduleHistoryEntry {
  date: string;
  dayLabel: string;
  timeSlot: string;
  notes?: string;
  toEmail?: string; // Stripped for non-SUPERADMIN roles
  sentAt: string;
  sentBy?: string;
  emailSent?: boolean;
}

export interface TryoutResultEmailHistoryEntry {
  outcome: 'APPROVED' | 'REJECTED';
  coachNotes?: string;
  toEmail?: string; // Stripped for non-SUPERADMIN roles
  sentAt: string;
  sentBy?: string;
  emailSent?: boolean;
}

export interface MemberApplication {
  id: string;
  fullName: string;
  dob: string;
  birthYear?: number;
  position: VolleyballPosition;
  hometownCountry?: string;
  desiredJerseyNumber: number;
  level: PlayerLevel;
  height: number;
  weight: number;
  spikeReach: number;
  blockReach: number;
  // Sensitive contact fields (stripped by backend when requester is not SUPERADMIN)
  gmail?: string;
  instagram?: string;
  zalo?: string;
  rotationKnowledge: RotationKnowledge;
  status: ApplicationStatus;
  paymentStatus: TryoutPaymentStatus;
  paidAt?: string;
  entryFee?: number;
  approvedAt?: string;
  reviewNotes?: string;
  experience?: string;
  preferredDays?: string;
  preferredSchedule?: string;
  scores?: TryoutEvaluationScores;
  evaluationScores?: TryoutEvaluationScores;
  coachNotes?: string;
  scheduledAt?: string;
  scheduledDate?: string;
  scheduledDayLabel?: string;
  scheduledTime?: string;
  scheduledNotes?: string;
  scheduledEmailSentAt?: string;
  scheduleHistory?: TryoutScheduleHistoryEntry[];
  resultEmailSentAt?: string;
  resultEmailHistory?: TryoutResultEmailHistoryEntry[];
  createdAt: string;
  updatedAt?: string;
}

export interface TryoutApplicationRegisterPayload {
  source?: 'TRYOUT_PAGE' | 'MEMBER_REGISTER';
  fullName: string;
  birthYear?: number;
  dob?: string;
  position: VolleyballPosition;
  level?: PlayerLevel;
  height: number;
  weight?: number;
  spikeReach?: number;
  blockReach?: number;
  hometownCountry?: string;
  desiredJerseyNumber?: number;
  gmail: string;
  instagram?: string;
  zalo: string;
  rotationKnowledge?: RotationKnowledge;
  experience?: string;
  preferredDays?: string;
}

export interface TryoutScheduleEmailPayload {
  toEmail?: string;
  date: string;
  timeSlot: string;
  notes?: string;
}

export interface TryoutEvaluatePayload {
  scores: TryoutEvaluationScores;
  coachNotes?: string;
  status: 'APPROVED' | 'RETEST' | 'REJECTED';
  level?: PlayerLevel;
}

export interface TryoutUnifiedSendEmailPayload {
  kind: 'SCHEDULE' | 'RESULT';
  toEmail?: string;
  date?: string;
  timeSlot?: string;
  notes?: string;
  outcome?: 'APPROVED' | 'REJECTED';
  coachNotes?: string;
  scores?: TryoutEvaluationScores;
  level?: PlayerLevel;
}

export interface AdminOverviewMonthlyPoint {
  monthKey: string;
  label: string;
  court: number;
  training: number;
  store: number;
  guest: number;
  tryout: number;
  tournament: number;
}

export interface AdminOverviewSummary {
  restrictedFinance?: boolean;
  totalBookingsCount?: number;
  paidBookingsCount?: number;
  pendingBookingsCount?: number;
  totalStoreOrdersCount?: number;
  paidStoreOrdersCount?: number;
  pendingStoreOrdersCount?: number;
  totalGuestSessionsCount?: number;
  paidGuestSessionsCount?: number;
  pendingGuestSessionsCount?: number;
  totalTrainingRegsCount?: number;
  confirmedTrainingCount?: number;
  pendingTrainingCount?: number;
  playersCount: number;
  activePlayersCount: number;
  coursesCount: number;
  coachesCount: number;
  newsCount: number;
  storeProductsCount?: number;
  tournamentsCount?: number;
  hostedTournamentsCount?: number;
  paidTournamentTeamsCount?: number;
  pendingTournamentFeesCount?: number;
  applicationsCount?: number;
  pendingApplicationsCount?: number;
  scheduledApplicationsCount?: number;
  approvedTryoutsCount?: number;
  paidTryoutsCount?: number;
  courtRevenue?: number;
  trainingRevenue?: number;
  storeRevenue?: number;
  guestSessionRevenue?: number;
  tryoutRevenue?: number;
  tournamentRevenue?: number;
  monthlyRevenue?: AdminOverviewMonthlyPoint[];
  recentBookings?: Booking[];
  recentTrainingRegs?: TrainingRegistration[];
  guestSessions?: GuestSessionRecord[];
}

export type NewsCategoryId =
  | 'TOURNAMENT'
  | 'TECHNIQUE'
  | 'TRYOUT'
  | 'CLUB_EVENT'
  | 'TACTICAL'
  | 'COMMUNITY'
  | 'PARTNERSHIP';

export const NEWS_CATEGORIES: { id: NewsCategoryId; label: string; optionLabel: string }[] = [
  { id: 'TOURNAMENT', label: 'Tournaments & Matches', optionLabel: 'TOURNAMENT (Tournaments & Matches)' },
  { id: 'TECHNIQUE', label: 'Technique & Biomechanics', optionLabel: 'TECHNIQUE (Technique & Biomechanics)' },
  { id: 'TRYOUT', label: 'Tryouts & Recruiting', optionLabel: 'TRYOUT (Tryouts & Recruiting)' },
  { id: 'CLUB_EVENT', label: 'Club Events', optionLabel: 'CLUB_EVENT (Club Events)' },
  { id: 'TACTICAL', label: 'Tactics & Strategy', optionLabel: 'TACTICAL (Tactics & Strategy)' },
  { id: 'COMMUNITY', label: 'Community & Activities', optionLabel: 'COMMUNITY (Community & Activities)' },
  { id: 'PARTNERSHIP', label: 'Partnerships & Sponsors', optionLabel: 'PARTNERSHIP (Partnerships & Sponsors)' },
];

export interface NewsPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  image?: string;
  thumbnail: string;
  category: NewsCategoryId | string;
  authorName: string;
  authorRole: string;
  publishedAt: string;
  createdAt?: string;
  readTimeMinutes: number;
  featured?: boolean;
  isPinned?: boolean;
}

export interface GoogleSheetsSyncLog {
  id: string;
  tabName: 'Member_Registrations' | 'Court_Bookings' | 'Training_Registrations' | 'Store_Orders';
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
  alreadyPaid?: boolean;
  forceDuplicate?: boolean;
}

export interface GuestSessionRecord {
  id: string;
  guestName: string;
  guestEmail: string;
  phone?: string;
  position: string;
  positionPrivilege: string;
  level: string;
  sessionDate: string;
  sessionTime: string;
  courtAddress?: string;
  amount: number;
  transferContent: string;
  paymentStatus: PaymentStatus;
  notes?: string;
  paidAt?: string;
  emailSentAt: string;
  createdAt: string;
  updatedAt: string;
}

export type StoreCategoryId =
  | 'SLEEVELESS'
  | 'SHORT_SLEEVE'
  | 'WOMEN'
  | 'KNEE_PADS'
  | 'SOCKS'
  | 'JERSEYS'
  | 'VOLLEYBALLS'
  | 'TRAINING_GEAR'
  | 'ACCESSORIES';

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';

export type DeliveryMethod = 'COURT_PICKUP' | 'HOME_DELIVERY';

export type StoreSubView = 'PRODUCTS' | 'ORDERS' | 'CATEGORIES';

export interface ShopCategoryMeta {
  id: StoreCategoryId;
  label: string;
  labelVi: string;
  catCode: 'JSY' | 'PAD' | 'SCK' | 'BAL' | 'GER' | 'ACC';
  code?: string;
  isJersey: boolean;
}

export const SHOP_CATEGORIES: ShopCategoryMeta[] = [
  { id: 'SLEEVELESS', label: 'Sleeveless Jersey', labelVi: 'Áo Sát Nách (Sleeveless)', catCode: 'JSY', code: 'JSY', isJersey: true },
  { id: 'SHORT_SLEEVE', label: 'Short Sleeve Jersey', labelVi: 'Áo Có Tay (Short Sleeve)', catCode: 'JSY', code: 'JSY', isJersey: true },
  { id: 'WOMEN', label: "Women's Jersey", labelVi: 'Áo Nữ (Women Fit)', catCode: 'JSY', code: 'JSY', isJersey: true },
  { id: 'KNEE_PADS', label: 'Knee Pads', labelVi: 'Bó Gối (Knee Pads)', catCode: 'PAD', code: 'PAD', isJersey: false },
  { id: 'SOCKS', label: 'Athletic Socks', labelVi: 'Tất Thi Đấu (Socks)', catCode: 'SCK', code: 'SCK', isJersey: false },
  { id: 'VOLLEYBALLS', label: 'Volleyballs & Gear', labelVi: 'Bóng & Thiết Bị (Gear)', catCode: 'BAL', code: 'BAL', isJersey: false },
];

export function isJerseyCategory(category?: string): boolean {
  const c = (category || '').toUpperCase().trim();
  return c === 'SLEEVELESS' || c === 'SHORT_SLEEVE' || c === 'WOMEN' || c === 'JERSEYS';
}

export function isBallProduct(productOrCategory?: any): boolean {
  if (!productOrCategory) return false;
  const category = (
    typeof productOrCategory === 'string'
      ? productOrCategory
      : productOrCategory.category || ''
  ).toUpperCase().trim();
  if (category === 'VOLLEYBALLS' || category === 'BALL' || category === 'BALLS') return true;
  const name = (
    typeof productOrCategory === 'object' && productOrCategory.name ? productOrCategory.name : ''
  ).toLowerCase();
  return name.includes('mikasa') || (name.includes('volleyball') && !name.includes('jersey'));
}

export function productRequiresSizeSelection(product?: any): boolean {
  if (!product) return false;
  if (isBallProduct(product)) return false;
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  if (sizes.length <= 1) return false;
  return true;
}

export function getShopCategoryCode(category?: string): string {
  const c = (category || '').toUpperCase().trim();
  if (c === 'SLEEVELESS' || c === 'SHORT_SLEEVE' || c === 'WOMEN' || c === 'JERSEYS') return 'JSY';
  if (c === 'KNEE_PADS') return 'PAD';
  if (c === 'SOCKS') return 'SCK';
  if (c === 'VOLLEYBALLS') return 'BAL';
  if (c === 'TRAINING_GEAR') return 'GER';
  return 'ACC';
}

export function getShopCategoryLabel(category?: string, lang: 'en' | 'vi' = 'en'): string {
  const c = (category || '').toUpperCase().trim();
  const found = SHOP_CATEGORIES.find((item) => item.id === c);
  if (found) return lang === 'vi' ? found.labelVi : found.label;
  if (c === 'JERSEYS') return lang === 'vi' ? 'Áo Đấu CLB (Jerseys)' : 'Official Jerseys';
  if (c === 'VOLLEYBALLS') return lang === 'vi' ? 'Bóng Thi Đấu' : 'Volleyballs';
  if (c === 'TRAINING_GEAR') return lang === 'vi' ? 'Phụ Kiện Tập Luyện' : 'Training Gear';
  if (c === 'ACCESSORIES') return lang === 'vi' ? 'Phụ Kiện Khác' : 'Accessories';
  return category || 'Gear';
}

export function getCategoryUrlSlug(category?: string): string {
  const c = (category || '').toUpperCase().trim();
  if (c === 'SLEEVELESS') return 'mens-sleeveless';
  if (c === 'SHORT_SLEEVE') return 'short-sleeve';
  if (c === 'WOMEN') return 'womens-jersey';
  if (c === 'KNEE_PADS') return 'knee-pads';
  if (c === 'SOCKS') return 'athletic-socks';
  if (c === 'JERSEYS') return 'jerseys';
  if (c === 'VOLLEYBALLS') return 'volleyballs';
  if (c === 'TRAINING_GEAR') return 'training-gear';
  if (c === 'ACCESSORIES') return 'accessories';
  return 'gear';
}

export function getCategoryFromUrlSlug(slug?: string): StoreCategoryId | undefined {
  const s = (slug || '').toLowerCase().trim();
  if (s === 'mens-sleeveless' || s === 'sleeveless') return 'SLEEVELESS';
  if (s === 'short-sleeve') return 'SHORT_SLEEVE';
  if (s === 'womens-jersey' || s === 'women') return 'WOMEN';
  if (s === 'knee-pads') return 'KNEE_PADS';
  if (s === 'athletic-socks' || s === 'socks') return 'SOCKS';
  if (s === 'jerseys') return 'JERSEYS';
  if (s === 'volleyballs' || s === 'gear') return 'VOLLEYBALLS';
  if (s === 'training-gear') return 'TRAINING_GEAR';
  if (s === 'accessories') return 'ACCESSORIES';
  return undefined;
}

export function slugifyProductName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'product';
}

export function getProductUrlPath(product: { category: string; slug?: string; id: string; name?: string }): string {
  const catSlug = getCategoryUrlSlug(product.category);
  const prodSlug = product.slug?.trim() || slugifyProductName(product.name || product.id);
  return `/shop/${catSlug}/${prodSlug}`;
}

export interface StoreProduct {
  id: string;
  sku?: string;
  slug?: string;
  name: string;
  category: StoreCategoryId;
  originalPrice?: number;
  price: number;
  stock: number;
  frontImage: string;
  backImage?: string;
  imageUrl?: string; // alias of frontImage for backward compatibility
  sizes?: string[];
  colors?: string[];
  badge?: string;
  allowCustomPrint?: boolean;
  sortOrder?: number;
  description?: string;
  isPaused?: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreOrderItem {
  id?: string;
  orderId?: string;
  productId: string;
  productName: string;
  category?: string;
  sku?: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice?: number;
  price?: number;
  height?: number | null;
  weight?: number | null;
  customName?: string | null;
  customNumber?: string | null;
}

export interface StoreOrder {
  id: string;
  orderCode: string; // e.g. DVA-SHOP-20261110-849201
  customerName: string;
  customerPhone: string;
  phone?: string;
  customerEmail?: string;
  email?: string;
  socialLink?: string | null;
  deliveryMethod: DeliveryMethod;
  shippingAddress?: string | null;
  quantity?: number;
  items: StoreOrderItem[];
  productName?: string;
  size?: string;
  customName?: string;
  customNumber?: string;
  totalAmount: number;
  status: OrderStatus;
  /** Alias for backward compatibility with existing UI components */
  paymentStatus: OrderStatus;
  transferContent: string;
  vietqrUrl?: string;
  customerConfirmedAt?: string;
  shippingEmailSentAt?: string;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface StoreOrderCreatePayload {
  productId?: string;
  quantity?: number;
  size?: string;
  color?: string;
  height?: number;
  weight?: number;
  customName?: string;
  customNumber?: string;
  customerName: string;
  customerPhone?: string;
  phone?: string;
  customerEmail?: string;
  email?: string;
  socialLink?: string;
  deliveryMethod: DeliveryMethod;
  shippingAddress?: string;
  notes?: string;
  items?: Array<{
    productId: string;
    productName?: string;
    category?: string;
    price?: number;
    quantity: number;
    size?: string;
    color?: string;
    height?: number;
    weight?: number;
    customName?: string;
    customNumber?: string;
  }>;
}

// ============================================================================
// TOURNAMENTS & LEAGUES MODULE (SPEC 008)
// ============================================================================

export type TournamentMode = 'HOSTED' | 'PARTICIPATING';
export type TournamentTrackingMode = 'FULL_BRACKET' | 'DVA_FOCUS';
export type TournamentStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type TournamentSetFormat = 'BO3' | 'BO2' | 'BO1_25';

export type TournamentMatchStage =
  | 'GROUP'
  | 'POOL_A'
  | 'POOL_B'
  | 'QUARTERFINAL'
  | 'SEMIFINAL'
  | 'THIRD_PLACE'
  | 'FINAL';

export type TournamentMatchStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

export type TournamentOfficialRole = 'MAIN_REFEREE' | 'LINE_JUDGE' | 'SCORER' | 'SUPERVISOR';

export type DreamTeamSlotKey =
  | 'MVP'
  | 'BEST_OH_1'
  | 'BEST_OH_2'
  | 'BEST_MB_1'
  | 'BEST_MB_2'
  | 'BEST_OP'
  | 'BEST_SETTER'
  | 'BEST_LIBERO';

export type TournamentIndividualAward =
  | 'MVP'
  | 'BEST_OUTSIDE_HITTER'
  | 'BEST_MIDDLE_BLOCKER'
  | 'BEST_OPPOSITE'
  | 'BEST_SETTER'
  | 'BEST_LIBERO'
  | 'BEST_SPIKER';

export const TOURNAMENT_AWARD_LABELS: Record<TournamentIndividualAward, string> = {
  MVP: 'MVP',
  BEST_OUTSIDE_HITTER: 'Best Outside Hitter',
  BEST_MIDDLE_BLOCKER: 'Best Middle Blocker',
  BEST_OPPOSITE: 'Best Opposite Spiker',
  BEST_SETTER: 'Best Setter',
  BEST_LIBERO: 'Best Libero',
  BEST_SPIKER: 'Best Spiker',
};

export interface TournamentDreamTeamSelection {
  MVP?: string | null;
  BEST_OH_1?: string | null;
  BEST_OH_2?: string | null;
  BEST_MB_1?: string | null;
  BEST_MB_2?: string | null;
  BEST_OP?: string | null;
  BEST_SETTER?: string | null;
  BEST_LIBERO?: string | null;
}

export const OFFICIAL_ROLE_LABELS: Record<TournamentOfficialRole, string> = {
  MAIN_REFEREE: '1st Referee',
  LINE_JUDGE: 'Line Judge',
  SCORER: 'Match Scorer',
  SUPERVISOR: 'Tournament Supervisor',
};

export type TournamentPrizeMode = 'HONOR_ONLY' | 'CASH_AND_TROPHIES';

export interface TournamentPrizeTier {
  rank: string; // '1ST' | '2ND' | '3RD' | 'MVP' | etc.
  label: string;
  cashAmount?: number;
  nonCashReward?: string;
  prizeMode?: TournamentPrizeMode;
}

export interface TournamentPodiumAwardEntry {
  award: TournamentIndividualAward | string;
  playerName: string;
  teamName?: string;
  jerseyNumber?: number;
}

export interface TournamentPodiumOverride {
  firstName?: string;
  firstLogo?: string;
  secondName?: string;
  secondLogo?: string;
  thirdName?: string;
  thirdLogo?: string;
  dreamTeam?: TournamentDreamTeamSelection | null;
  awards?: TournamentPodiumAwardEntry[];
}

export interface TournamentSetScore {
  set: number;
  home: number;
  away: number;
  isCompleted: boolean;
}

export interface TournamentPlayer {
  id: string;
  teamId: string;
  tournamentId: string;
  linkedPlayerId?: string;
  fullName: string;
  jerseyNumber: number;
  position: VolleyballPosition;
  height?: number | null;
  spikeTouch?: number | null;
  avatarUrl?: string | null;
  birthYear?: number | null;
  eligibilityStatus: PlayerEligibilityStatus;
  rejectionReason?: string | null;
  isCaptain: boolean;
  awards: string[];
  createdAt?: string;
}

export interface TournamentTeam {
  id: string;
  tournamentId: string;
  name: string;
  shortName?: string;
  logoUrl?: string | null;
  isDvaTeam: boolean;
  dvaSquadLevel?: PlayerLevel;
  pool?: 'A' | 'B' | string | null;
  seedOrder: number;
  manualRankOverride?: number | null;
  finalRank?: number | null;
  captainName?: string;
  captainPhone?: string;
  captainEmail?: string;
  paymentStatus: PaymentStatus;
  entryFeeAmount: number;
  transferContent?: string;
  customerConfirmedAt?: string;
  paidAt?: string;
  notes?: string;
  players?: TournamentPlayer[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TournamentOfficial {
  id: string;
  tournamentId: string;
  fullName: string;
  role: TournamentOfficialRole;
  certification?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  sortOrder: number;
  createdAt?: string;
}

export type TournamentOfficialPayload = Omit<TournamentOfficial, 'id' | 'tournamentId' | 'createdAt'>;

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  matchCode: string;
  stage: TournamentMatchStage;
  bracketSide?: 'LEFT' | 'RIGHT' | 'CENTER' | string | null;
  courtName: string;
  scheduledTime?: string;
  matchOrder: number;
  status: TournamentMatchStatus;
  setFormat: TournamentSetFormat | string;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  homeLabel?: string;
  awayLabel?: string;
  setScores: TournamentSetScore[];
  homeSetsWon: number;
  awaySetsWon: number;
  homePointsTotal: number;
  awayPointsTotal: number;
  winnerTeamId?: string | null;
  officialId?: string | null;
  assistantOfficialIds: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TournamentStandingRow {
  rank: number;
  teamId: string;
  teamName: string;
  shortName?: string;
  logoUrl?: string;
  isDvaTeam: boolean;
  pool: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  fivbPoints: number;
  setsWon: number;
  setsLost: number;
  setRatio: number;
  pointsFor: number;
  pointsAgainst: number;
  pointRatio: number;
  manualRankOverride?: number | null;
  hasTieWarning?: boolean;
}

export interface Tournament {
  id: string;
  slug: string;
  name: string;
  subtitle?: string;
  mode: TournamentMode;
  trackingMode: TournamentTrackingMode;
  status: TournamentStatus;
  isActive: boolean;
  isRegistrationOpen: boolean;
  isRosterLocked: boolean;
  requireBirthYear: boolean;
  maxTeams: number;
  registrationDeadline?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location: string;
  mapsUrl?: string;
  bannerUrl?: string;
  groupSetFormat: TournamentSetFormat;
  knockoutSetFormat: TournamentSetFormat;
  entryFeePerTeam: number;
  internalExpenseNote?: string;
  rulesContent?: string;
  prizeConfig: TournamentPrizeTier[];
  dvaResultSummary?: string;
  podiumOverride?: TournamentPodiumOverride | null;
  teams: TournamentTeam[];
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  officials: TournamentOfficial[];
  paidTeamsCount?: number;
  pendingTeamsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentFinanceSummary {
  id: string;
  name: string;
  slug: string;
  mode: TournamentMode;
  status: TournamentStatus;
  startDate: string;
  entryFeePerTeam: number;
  maxTeams: number;
  teams: Array<{
    id: string;
    name: string;
    paymentStatus: PaymentStatus;
    entryFeeAmount: number;
    paidAt?: string;
    createdAt?: string;
  }>;
}

export interface TournamentPublicRegistrationPayload {
  name: string;
  shortName?: string;
  captainName: string;
  captainPhone: string;
  captainEmail?: string;
  regulationsAccepted: boolean;
  notes?: string;
  players: Array<{
    fullName: string;
    jerseyNumber: number;
    position: VolleyballPosition;
    height?: number;
    spikeTouch?: number;
    birthYear?: number;
    isCaptain?: boolean;
  }>;
}

// ============================================================================
// HANOI VOLLEYBALL COURT MAP & CLUB PROFILES MODULE
// ============================================================================

export type VenuePlayStyle = 'COMPETITIVE' | 'FUN_GAME' | 'TRAINING';

export type VenueRecruitmentStatus = 'OPEN_RECRUIT' | 'CHECK_CAPTAIN' | 'FULL';

export type VenueType = 'COMMERCIAL' | 'FREE_PUBLIC';

export type VenueFeeType = 'PAID' | 'FREE';

export type VenueCapacityMode = 'UNLIMITED' | 'LIMITED_SLOTS';

export type VenueGenderRule = 'MALE_ONLY' | 'MIXED' | 'FEMALE_ONLY';

export interface SessionDailyOverride {
  currentPlayers: number;
  neededPositions: VolleyballPosition[];
}
export type SessionDailyOverridesMap = Record<string, SessionDailyOverride>;

export interface CourtClubProfile {
  id: string;
  venueId: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  galleryUrls: string[];
  coverUpdatedAt?: string | null;
  galleryUpdatedAt?: string | null;
  captainName: string;
  captainPhone: string;
  captainZalo?: string | null;
  captainEmail?: string | null;
  captainUserId?: string | null;
  captainUser?: { id: string; email: string; fullName: string; role: UserRole; isActive?: boolean } | null;
  playStyle: VenuePlayStyle;
  tags: string[];
  description?: string | null;
  feeType: VenueFeeType;
  feeAmount?: string | null;
  isActive: boolean;
  sessions?: VenueSessionSlot[];
  createdAt?: string;
  updatedAt?: string;
}

export interface VenueSessionSlot {
  id: string;
  venueId: string;
  clubId: string;
  daysOfWeek: number[]; // 1=T2, 2=T3, ..., 6=T7, 0=CN
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  subCourts: string[]; // e.g. ["Court A"], ["Court B"], ["Court A", "Court B"]
  recruitmentStatus: VenueRecruitmentStatus;
  isCancelled?: boolean;
  cancelledDates?: string[];
  cancelReason?: string | null;
  capacityMode?: VenueCapacityMode;
  currentPlayers?: number;
  maxPlayers?: number;
  neededPositions?: VolleyballPosition[];
  dailyOverrides?: SessionDailyOverridesMap;
  genderRule?: VenueGenderRule;
  club?: CourtClubProfile;
  createdAt?: string;
  updatedAt?: string;
}

export interface VolleyballVenue {
  id: string;
  name: string;
  slug: string;
  address: string;
  city?: string;
  district: string;
  latitude: number;
  longitude: number;
  surfaceType: string;
  subCourtsCount: number;
  venueType: VenueType;
  rentalPriceInfo?: string | null;
  entryNote?: string | null;
  isDvaOfficial: boolean;
  isFeatured: boolean;
  isClosed: boolean;
  closureReason?: string | null;
  closedUntil?: string | null;
  coverUrl?: string | null;
  imageUrl?: string | null;
  clubs: CourtClubProfile[];
  sessions: VenueSessionSlot[];
  createdAt?: string;
  updatedAt?: string;
}

export interface VenueClubDetailResponse extends CourtClubProfile {
  venue: Omit<VolleyballVenue, 'clubs' | 'sessions'>;
  sessions: VenueSessionSlot[];
}

export interface SessionConflictDetail {
  sessionId: string;
  clubName: string;
  days: number[];
  startTime: string;
  endTime: string;
  subCourts: string[];
}

export type VenuePayload = {
  name: string;
  slug?: string;
  address: string;
  city?: string;
  district: string;
  latitude: number;
  longitude: number;
  surfaceType: string;
  subCourtsCount: number;
  venueType: VenueType;
  rentalPriceInfo?: string | null;
  entryNote?: string | null;
  isDvaOfficial: boolean;
  isFeatured: boolean;
  isClosed?: boolean;
  closureReason?: string | null;
  closedUntil?: string | null;
  coverUrl?: string | null;
};

export type VenueClubPayload = {
  name: string;
  slug?: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  galleryUrls: string[];
  coverUpdatedAt?: string | null;
  galleryUpdatedAt?: string | null;
  captainName: string;
  captainPhone: string;
  captainZalo?: string | null;
  captainEmail?: string | null;
  captainUserId?: string | null;
  playStyle: VenuePlayStyle;
  tags: string[];
  description?: string | null;
  feeType: VenueFeeType;
  feeAmount?: string | null;
  isActive: boolean;
};

export type VenueSessionPayload = {
  clubId: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  subCourts: string[];
  recruitmentStatus: VenueRecruitmentStatus;
  isCancelled?: boolean;
  cancelledDates?: string[];
  cancelReason?: string | null;
  capacityMode?: VenueCapacityMode;
  currentPlayers?: number;
  maxPlayers?: number;
  neededPositions?: VolleyballPosition[];
  dailyOverrides?: SessionDailyOverridesMap;
  genderRule?: VenueGenderRule;
  forceOverride?: boolean;
};
