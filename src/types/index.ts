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
  entryFee?: number;
  approvedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt?: string;
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
