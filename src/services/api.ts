import { 
  Booking, 
  ClosedSlot,
  Court, 
  MemberApplication,
  ApplicationStatus,
  TryoutPaymentStatus,
  TryoutApplicationRegisterPayload,
  TryoutScheduleEmailPayload,
  TryoutEvaluatePayload,
  TryoutUnifiedSendEmailPayload,
  AdminOverviewSummary,
  NewsPost, 
  Player, 
  PlayerLevel, 
  TrainingCourse, 
  CoachProfile,
  TrainingRegistration, 
  User, 
  UserRole,
  ManagedUserRole,
  GuestSessionPayload,
  GuestSessionRecord,
  OrderStatus,
  PaymentStatus,
  StoreProduct,
  StoreOrder,
  StoreOrderCreatePayload,
  Tournament,
  TournamentDreamTeamSelection,
  TournamentFinanceSummary,
  TournamentMatch,
  TournamentOfficial,
  TournamentOfficialPayload,
  TournamentPlayer,
  TournamentPublicRegistrationPayload,
  TournamentTeam,
  VolleyballVenue,
  CourtClubProfile,
  VenueSessionSlot,
  VenueClubDetailResponse,
  VenuePayload,
  VenueClubPayload,
  VenueSessionPayload,
  getShopCategoryCode
} from '../types';
import { 
  GUEST_USER,
} from '../data/mockData';
import { getDefaultWeeklyScheduleForCourt, normalizeCourtWeeklySchedule } from '../shared/schedule';
import { API_BASE_URL, getApiUrl } from '../config/api';
import { createSwrCache, invalidateAllSwrCaches } from '../utils/swrCache';

export { API_BASE_URL, getApiUrl };

export interface HomeSummaryPayload {
  courts: Court[];
  players: Player[];
  news: NewsPost[];
}

const homeSummaryCache = createSwrCache<HomeSummaryPayload>({
  storagePrefix: 'dva_home_summary_v1:',
  freshMs: 60_000,
  staleMs: 300_000,
});

const playersCache = createSwrCache<Player[]>({
  storagePrefix: 'dva_players_public_v1:',
  freshMs: 60_000,
  staleMs: 300_000,
  validate: Array.isArray,
});

const courtsCache = createSwrCache<Court[]>({
  storagePrefix: 'dva_courts_public_v1:',
  freshMs: 120_000,
  staleMs: 600_000,
  validate: Array.isArray,
});

const coachesCache = createSwrCache<CoachProfile[]>({
  storagePrefix: 'dva_coaches_public_v1:',
  freshMs: 120_000,
  staleMs: 600_000,
  validate: Array.isArray,
});

const coursesCache = createSwrCache<TrainingCourse[]>({
  storagePrefix: 'dva_courses_public_v1:',
  freshMs: 60_000,
  staleMs: 300_000,
  validate: Array.isArray,
});

const newsCache = createSwrCache<NewsPost[]>({
  storagePrefix: 'dva_news_public_v1:',
  freshMs: 60_000,
  staleMs: 300_000,
  validate: Array.isArray,
});

const newsDetailCache = createSwrCache<NewsPost>({
  storagePrefix: 'dva_news_detail_v1:',
  freshMs: 60_000,
  staleMs: 300_000,
});

const storeProductsCache = createSwrCache<StoreProduct[]>({
  storagePrefix: 'dva_store_products_v1:',
  freshMs: 60_000,
  staleMs: 300_000,
  validate: Array.isArray,
});

const tournamentsCache = createSwrCache<Tournament[]>({
  storagePrefix: 'dva_tournaments_public_v1:',
  freshMs: 30_000,
  staleMs: 180_000,
  validate: Array.isArray,
});

const tournamentDetailCache = createSwrCache<Tournament>({
  storagePrefix: 'dva_tournament_detail_v1:',
  freshMs: 15_000,
  staleMs: 120_000,
});

const venuesCache = createSwrCache<VolleyballVenue[]>({
  storagePrefix: 'dva_venues_public_v2:',
  freshMs: 60_000,
  staleMs: 300_000,
  validate: Array.isArray,
});

const venueClubDetailCache = createSwrCache<VenueClubDetailResponse>({
  storagePrefix: 'dva_venue_club_detail_v1:',
  freshMs: 60_000,
  staleMs: 300_000,
});

const TOKEN_KEY = 'dva_token';
const CURRENT_USER_KEY = 'dva_current_user';

/** In-flight POST deduplication map to prevent duplicate submissions on rapid double-clicks. */
const inflightSubmissions = new Map<string, Promise<any>>();

function deduplicatedPost<T>(endpoint: string, payload: unknown, fallbackData?: T): Promise<T> {
  const key = `${endpoint}:${JSON.stringify(payload ?? {})}`;
  const existing = inflightSubmissions.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  const promise = request<T>(
    endpoint,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    fallbackData
  ).finally(() => {
    inflightSubmissions.delete(key);
  });
  inflightSubmissions.set(key, promise);
  return promise;
}

/** Error carrying the HTTP status and the server's human readable message. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
  invalidateAllSwrCaches();
}

/**
 * Request wrapper.
 * - Attaches the JWT.
 * - Throws ApiError for every failed response (409 slot conflicts, 400 validation, 401/403 auth...).
 * - Falls back cleanly when the /api backend is unreachable or returns 404/5xx (e.g. standalone Vite or static hosting).
 */
async function request<T>(endpoint: string, options?: RequestInit, fallbackData?: T): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const url = getApiUrl(endpoint);

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      credentials: options?.credentials || 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
  } catch (err) {
    if (fallbackData !== undefined) {
      console.warn(`[API] Server unreachable for ${endpoint}, showing offline fallback.`, err);
      return fallbackData;
    }
    throw new ApiError(0, 'Cannot reach the server. Please check your connection and try again.');
  }

  if (!res.ok) {
    let message = `Request failed (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
      else if (body?.error) message = body.error;
    } catch {
      // non-JSON error body
    }
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (
      res.status === 401 &&
      token &&
      endpoint !== '/auth/login' &&
      currentToken === token
    ) {
      clearSession();
      window.dispatchEvent(new Event('dva:session-expired'));
    }
    if ((res.status === 404 || res.status >= 500) && fallbackData !== undefined) {
      console.warn(`[API] ${endpoint} failed with ${res.status}, showing offline fallback.`);
      return fallbackData;
    }
    throw new ApiError(res.status, message);
  }
  return await res.json();
}

export const authService = {
  getCurrentUser(): User {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    // A stored profile without a token is never trusted
    if (saved && localStorage.getItem(TOKEN_KEY)) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role) return parsed;
      } catch (e) {
        // ignore
      }
    }
    // Default to unauthenticated GUEST visitor
    return GUEST_USER;
  },

  setCurrentUser(user: User): void {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  },

  hasToken(): boolean {
    return Boolean(localStorage.getItem(TOKEN_KEY));
  },

  logout(): User {
    clearSession();
    return GUEST_USER;
  },

  /** Re-validates the stored session with the server and returns the fresh profile. */
  async me(): Promise<User> {
    const tokenAtCall = localStorage.getItem(TOKEN_KEY);
    if (!tokenAtCall) return GUEST_USER;
    const current = this.getCurrentUser();
    const res = await request<{ user: User }>('/auth/me', {}, { user: current });
    if (localStorage.getItem(TOKEN_KEY) === tokenAtCall) {
      this.setCurrentUser(res.user);
    }
    return res.user;
  },

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const normalizedEmail = email.trim().toLowerCase();
    const res = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: normalizedEmail, password }),
    });
    invalidateAllSwrCaches();
    localStorage.setItem(TOKEN_KEY, res.token);
    this.setCurrentUser(res.user);
    return res;
  },

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string; token: string; user: User }> {
    const res = await request<{ success: boolean; message: string; token: string; user: User }>(
      '/admin/auth/change-password',
      {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }
    );
    if (res.token) {
      localStorage.setItem(TOKEN_KEY, res.token);
    }
    if (res.user) {
      this.setCurrentUser(res.user);
    }
    return res;
  },

  async updateProfile(data: {
    name?: string;
    fullName?: string;
    avatarUrl?: string | null;
  }): Promise<{ success: boolean; user: User }> {
    const res = await request<{ success: boolean; user: User }>('/admin/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (res.user) {
      this.setCurrentUser(res.user);
    }
    return res;
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyOtp(email: string, otp: string, newPassword?: string): Promise<{ success: boolean; message: string }> {
    return request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    });
  }
};

export const userService = {
  async getUsers(): Promise<User[]> {
    return request<User[]>('/users');
  },

  async createUser(data: { name: string; email: string; password: string; role: ManagedUserRole }): Promise<User> {
    return request<User>('/users', {
      method: 'POST',
      body: JSON.stringify({ ...data, fullName: data.name }),
    });
  },

  async updateUserRole(id: string, role: ManagedUserRole): Promise<User> {
    return request<User>(`/users/${encodeURIComponent(id)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  async deleteUser(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async resetPassword(
    id: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string; user?: User }> {
    return request<{ success: boolean; message: string; user?: User }>(
      `/admin/staff/${encodeURIComponent(id)}/reset-password`,
      {
        method: 'PATCH',
        body: JSON.stringify({ newPassword }),
      }
    );
  },

  async updateStaff(
    id: string,
    data: {
      name?: string;
      fullName?: string;
      avatarUrl?: string | null;
      role?: ManagedUserRole;
      isActive?: boolean;
      forceLogout?: boolean;
    }
  ): Promise<{ success: boolean; user: User; sessionRevoked?: boolean }> {
    return request<{ success: boolean; user: User; sessionRevoked?: boolean }>(
      `/admin/staff/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  },
};

function normalizeCourtRecord(c: Court): Court {
  const subs = c.subCourts?.length
    ? c.subCourts
    : c.id === 'court-btl' || c.code === 'BTL_TT'
      ? ['Sân A', 'Sân B']
      : [];
  return {
    ...c,
    subCourts: subs.length > 0 ? subs : undefined,
    weeklySchedule: normalizeCourtWeeklySchedule(c.weeklySchedule, c.id, subs),
  };
}

function buildPlayersCacheKey(params?: { level?: string; position?: string; search?: string }): string {
  return `${params?.level || 'ALL'}:${params?.position || 'ALL'}:${params?.search || ''}`;
}

export const homeService = {
  getCachedSummary() {
    return homeSummaryCache.get('default');
  },

  async getSummary(opts?: { forceRefresh?: boolean }): Promise<HomeSummaryPayload> {
    return homeSummaryCache.fetch({
      key: 'default',
      forceRefresh: opts?.forceRefresh,
      fetcher: async () => {
        const res = await request<HomeSummaryPayload>('/home/summary', undefined, {
          courts: [],
          players: [],
          news: [],
        });
        const cleanedCourts = Array.isArray(res?.courts) ? res.courts.map(normalizeCourtRecord) : [];
        const players = Array.isArray(res?.players) ? res.players : [];
        const news = Array.isArray(res?.news) ? res.news.map(normalizeNewsPost) : [];
        const payload: HomeSummaryPayload = {
          courts: cleanedCourts,
          players,
          news,
        };
        if (cleanedCourts.length > 0) {
          courtsCache.set('default', cleanedCourts);
        }
        if (players.length > 0) {
          playersCache.set('ALL:ALL:', players);
        }
        return payload;
      },
    });
  },
};

export const playerService = {
  getCachedPlayers(params?: { level?: string; position?: string; search?: string }) {
    return playersCache.get(buildPlayersCacheKey(params));
  },

  async getPlayers(params?: {
    level?: string;
    position?: string;
    search?: string;
    adminMode?: boolean;
    forceRefresh?: boolean;
  }): Promise<Player[]> {
    const cleanParams: Record<string, string> = {};
    if (params?.level) cleanParams.level = params.level;
    if (params?.position) cleanParams.position = params.position;
    if (params?.search) cleanParams.search = params.search;
    const query = new URLSearchParams(cleanParams).toString();
    const endpoint = `/players${query ? `?${query}` : ''}`;

    if (params?.adminMode) {
      return request<Player[]>(endpoint, { cache: 'no-store' }, []);
    }

    return playersCache.fetch({
      key: buildPlayersCacheKey(params),
      forceRefresh: params?.forceRefresh,
      fetcher: async () => {
        const rows = await request<Player[]>(endpoint, {}, []);
        return Array.isArray(rows) ? rows : [];
      },
    });
  },

  async addPlayer(playerData: Partial<Player>): Promise<Player> {
    const res = await request<Player>('/players', {
      method: 'POST',
      body: JSON.stringify(playerData),
    }, {
      ...playerData,
      id: `p-${Date.now()}`,
      avatarUrl: playerData.avatarUrl || '',
    } as Player);
    playersCache.invalidate();
    homeSummaryCache.invalidate();
    return res;
  },

  async updatePlayer(id: string, playerData: Partial<Player>): Promise<Player> {
    const res = await request<Player>(`/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(playerData),
    }, {
      ...playerData,
      id,
    } as Player);
    playersCache.invalidate();
    homeSummaryCache.invalidate();
    return res;
  },

  async updateLevel(id: string, level: PlayerLevel): Promise<Player> {
    const res = await request<Player>(`/players/${id}/level`, {
      method: 'PATCH',
      body: JSON.stringify({ level }),
    }, {
      id,
      level,
    } as Player);
    playersCache.invalidate();
    homeSummaryCache.invalidate();
    return res;
  },

  async toggleVisibility(id: string, isActive: boolean): Promise<Player> {
    const res = await request<Player>(`/players/${id}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }, {
      id,
      isActive,
    } as Player);
    playersCache.invalidate();
    homeSummaryCache.invalidate();
    return res;
  },

  async deletePlayer(id: string): Promise<{ success: boolean }> {
    const res = await request<{ success: boolean }>(`/players/${id}`, {
      method: 'DELETE',
    }, { success: true });
    playersCache.invalidate();
    homeSummaryCache.invalidate();
    return res;
  }
};

export const courtService = {
  getCachedCourts() {
    return courtsCache.get('default');
  },

  async getCourts(opts?: { adminMode?: boolean; forceRefresh?: boolean }): Promise<Court[]> {
    const fetchAndNormalize = async (): Promise<Court[]> => {
      const saved = localStorage.getItem('dva_courts');
      let fallback: Court[] = [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) fallback = parsed;
        } catch {
          fallback = [];
        }
      }
      const res = await request<Court[]>(
        '/courts',
        opts?.adminMode ? { cache: 'no-store' } : undefined,
        fallback
      );
      const rawList = Array.isArray(res) ? res : fallback;
      const cleaned = rawList.map(normalizeCourtRecord);
      if (cleaned.length > 0) {
        localStorage.setItem('dva_courts', JSON.stringify(cleaned));
      }
      return cleaned;
    };

    if (opts?.adminMode) {
      return fetchAndNormalize();
    }
    return courtsCache.fetch({
      key: 'default',
      forceRefresh: opts?.forceRefresh,
      fetcher: fetchAndNormalize,
    });
  },

  async createCourt(courtData: Partial<Court>): Promise<Court> {
    const id = `court-${Date.now()}`;
    const fallbackCourt: Court = {
      id,
      code: courtData.code || `COURT_${Date.now().toString().slice(-3)}`,
      shortName: courtData.shortName || courtData.name || 'DVA COURT',
      name: courtData.name || 'New DVA Court',
      address: courtData.address || 'DVA Sports Center, Hanoi',
      description:
        courtData.description ||
        'Standard indoor volleyball court equipped with injury-preventing Taraflex Pro flooring.',
      floorType: courtData.floorType || 'Gerflor Taraflex Sport Pro',
      hourlyRate: Number(courtData.hourlyRate) || 500000,
      minHours: Number(courtData.minHours) || 1.5,
      includes: courtData.includes || ['1 Free Official Mikasa V200W Match Ball', 'Airflow cooling & locker rooms'],
      imageUrl: courtData.imageUrl || '/courts/btl.png',
      isAvailable: courtData.isAvailable !== false,
      isActive: true,
      subCourts: courtData.subCourts,
      weeklySchedule: courtData.weeklySchedule || (courtData.subCourts && courtData.subCourts.length > 1
        ? normalizeCourtWeeklySchedule(getDefaultWeeklyScheduleForCourt(id), id, courtData.subCourts)
        : getDefaultWeeklyScheduleForCourt(id)),
    };

    const res = await request<Court>(
      '/courts',
      {
        method: 'POST',
        body: JSON.stringify(courtData),
      },
      fallbackCourt
    );

    const saved = localStorage.getItem('dva_courts');
    const list: Court[] = saved ? JSON.parse(saved) : [];
    localStorage.setItem('dva_courts', JSON.stringify([...list, res]));
    courtsCache.invalidate();
    homeSummaryCache.invalidate();
    return res;
  },

  async updateCourt(id: string, courtData: Partial<Court>): Promise<Court> {
    const res = await request<Court>(
      `/courts/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(courtData),
      },
      { id, ...courtData } as Court
    );

    const saved = localStorage.getItem('dva_courts');
    if (saved) {
      const list: Court[] = JSON.parse(saved);
      localStorage.setItem(
        'dva_courts',
        JSON.stringify(list.map((c) => (c.id === id ? { ...c, ...res } : c)))
      );
    }
    courtsCache.invalidate();
    homeSummaryCache.invalidate();
    return res;
  },

  async toggleMaintenance(id: string, isMaintenance?: boolean): Promise<Court> {
    const saved = localStorage.getItem('dva_courts');
    const list: Court[] = saved ? JSON.parse(saved) : [];
    const current = list.find((c) => c.id === id);
    const nextMaint =
      typeof isMaintenance === 'boolean'
        ? isMaintenance
        : !(current?.isMaintenance === true || current?.status === 'MAINTENANCE' || current?.isAvailable === false);
    const fallbackCourt: Court = {
      ...(current || { id, name: 'Volleyball Court', code: 'COURT', hourlyRate: 500000, minHours: 1.5, floorType: 'Taraflex', imageUrl: '', address: '', description: '', includes: [] }),
      id,
      status: nextMaint ? 'MAINTENANCE' : 'ACTIVE',
      isMaintenance: nextMaint,
      isAvailable: !nextMaint,
    };

    const res = await request<{ success?: boolean; court?: Court } & Partial<Court>>(
      `/courts/${id}/toggle-maintenance`,
      {
        method: 'PATCH',
        body: JSON.stringify(
          typeof isMaintenance === 'boolean'
            ? { isMaintenance, status: isMaintenance ? 'MAINTENANCE' : 'ACTIVE' }
            : {}
        ),
      },
      { success: true, court: fallbackCourt }
    );

    const updatedCourt: Court = res?.court ? res.court : ({ ...fallbackCourt, ...res } as Court);
    localStorage.setItem(
      'dva_courts',
      JSON.stringify(list.map((c) => (c.id === id ? { ...c, ...updatedCourt } : c)))
    );
    courtsCache.invalidate();
    homeSummaryCache.invalidate();
    return updatedCourt;
  },

  async deleteCourt(id: string): Promise<{ success: boolean; softDeleted?: boolean; message?: string }> {
    const res = await request<{ success: boolean; softDeleted?: boolean; message?: string }>(
      `/courts/${id}`,
      {
        method: 'DELETE',
      },
      { success: true, softDeleted: true }
    );

    const saved = localStorage.getItem('dva_courts');
    if (saved) {
      const list: Court[] = JSON.parse(saved);
      localStorage.setItem('dva_courts', JSON.stringify(list.filter((c) => c.id !== id)));
    }
    courtsCache.invalidate();
    homeSummaryCache.invalidate();
    return res;
  },

  async getClosedSlots(courtId?: string, date?: string, subCourt?: string): Promise<ClosedSlot[]> {
    const query = new URLSearchParams({
      ...(courtId ? { courtId } : {}),
      ...(date ? { date } : {}),
      ...(subCourt ? { subCourt } : {}),
    }).toString();
    return request<ClosedSlot[]>(`/courts/closed-slots${query ? `?${query}` : ''}`, {}, []);
  },

  async toggleClosedSlot(payload: { courtId: string; date: string; slotLabel: string; reason?: string; closedBy?: string; subCourt?: string }): Promise<{ success: boolean; action: 'CLOSED' | 'REOPENED'; slot: ClosedSlot }> {
    return request<{ success: boolean; action: 'CLOSED' | 'REOPENED'; slot: ClosedSlot }>('/courts/closed-slots/toggle', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, {
      success: true,
      action: 'CLOSED',
      slot: {
        id: `cs-${Date.now()}`,
        courtId: payload.courtId,
        courtName: payload.courtId,
        subCourt: payload.subCourt,
        date: payload.date,
        slotLabel: payload.slotLabel,
        reason: payload.reason,
        createdAt: new Date().toISOString(),
      }
    });
  }
};

export const bookingService = {
  /** Public visitors receive anonymised availability only; staff receive full records. */
  async getBookings(params?: { date?: string; courtId?: string; subCourt?: string }): Promise<Booking[]> {
    const query = new URLSearchParams(params as any).toString();
    return request<Booking[]>(`/bookings${query ? `?${query}` : ''}`, {}, []);
  },

  /** Creates a new court booking (with fallback support when server is offline). */
  async createBooking(bookingData: Partial<Booking>): Promise<Booking> {
    const fallbackBooking: Booking = {
      id: `b-${Date.now()}`,
      courtId: bookingData.courtId || 'court-btl',
      courtName: bookingData.courtName || (bookingData.courtId === 'court-btl' ? 'BTL Thong Tin court' : 'DVA Volleyball Court'),
      subCourt: bookingData.subCourt,
      customerName: bookingData.customerName || 'Customer',
      customerEmail: bookingData.customerEmail || '',
      customerPhone: bookingData.customerPhone || '',
      bookingDate: bookingData.bookingDate || '',
      startTime: bookingData.startTime || '17:30',
      endTime: bookingData.endTime || '19:00',
      totalHours: bookingData.totalHours || 1.5,
      courtPrice: bookingData.courtPrice || 825000,
      addons: bookingData.addons || { mineralWaterBottles: 0, mikasaBallCrate: false, certifiedReferee: false },
      addonsPrice: bookingData.addonsPrice || 0,
      totalPrice: bookingData.totalPrice || 825000,
      paymentStatus: 'PENDING',
      bookingCode: `DVA-${bookingData.courtId === 'court-btl' ? (bookingData.subCourt?.includes('B') ? 'BTL-B' : 'BTL-A') : 'BTL'}-${Date.now().toString().slice(-6)}`,
      transferContent: `DVA BTL ${bookingData.subCourt ? bookingData.subCourt.toUpperCase() + ' ' : ''}${bookingData.startTime?.replace(':', 'H') || '17H30'} ${bookingData.endTime?.replace(':', 'H') || '19H00'}`.toUpperCase(),
      createdAt: new Date().toISOString(),
      notes: bookingData.notes,
    };
    return deduplicatedPost<Booking>('/bookings', bookingData, fallbackBooking);
  },

  async updateBooking(id: string, updateData: Partial<Booking>): Promise<Booking> {
    return request<Booking>(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    }, {
      id,
      ...updateData,
    } as Booking);
  },

  async deleteBooking(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/bookings/${id}`, {
      method: 'DELETE',
    });
  },

  async updateStatus(id: string, paymentStatus: 'PENDING' | 'PAID' | 'CANCELLED'): Promise<Booking> {
    return request<Booking>(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentStatus }),
    });
  },

  /** Customer reports a completed transfer. The booking stays PENDING until staff verify it. */
  async confirmPayment(id: string): Promise<{ success: boolean; booking: Booking }> {
    return request<{ success: boolean; booking: Booking }>(`/bookings/${id}/confirm-payment`, {
      method: 'POST',
    });
  }
};

export const trainingService = {
  getCachedCourses() {
    return coursesCache.get('default');
  },

  async getCourses(opts?: { adminMode?: boolean; forceRefresh?: boolean }): Promise<TrainingCourse[]> {
    const fetchCourses = async (): Promise<TrainingCourse[]> => {
      const saved = localStorage.getItem('dva_courses');
      let fallback: TrainingCourse[] = [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) fallback = parsed;
        } catch {
          fallback = [];
        }
      }
      const res = await request<TrainingCourse[]>(
        '/training/courses',
        opts?.adminMode ? { cache: 'no-store' } : undefined,
        fallback
      );
      return Array.isArray(res) ? res : [];
    };

    if (opts?.adminMode) {
      return fetchCourses();
    }
    return coursesCache.fetch({
      key: 'default',
      forceRefresh: opts?.forceRefresh,
      fetcher: fetchCourses,
    });
  },

  async createCourse(courseData: Partial<TrainingCourse>): Promise<TrainingCourse> {
    const newCourse: TrainingCourse = {
      ...courseData,
      id: `tc-${Date.now()}`,
      curriculum: courseData.curriculum || [],
      benefits: courseData.benefits || [],
      maxSlots: courseData.maxSlots || 20,
      enrolledSlots: courseData.enrolledSlots || 0,
    } as TrainingCourse;

    const res = await request<TrainingCourse>('/training/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    }, newCourse);

    const saved = localStorage.getItem('dva_courses');
    const list: TrainingCourse[] = saved ? JSON.parse(saved) : [];
    localStorage.setItem('dva_courses', JSON.stringify([res, ...list]));
    coursesCache.invalidate();
    return res;
  },

  async updateCourse(id: string, courseData: Partial<TrainingCourse>): Promise<TrainingCourse> {
    const res = await request<TrainingCourse>(`/training/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    }, { id, ...courseData } as TrainingCourse);

    const saved = localStorage.getItem('dva_courses');
    if (saved) {
      const list: TrainingCourse[] = JSON.parse(saved);
      localStorage.setItem('dva_courses', JSON.stringify(list.map(c => c.id === id ? { ...c, ...res } : c)));
    }
    coursesCache.invalidate();
    return res;
  },

  async deleteCourse(id: string): Promise<{ success: boolean }> {
    const res = await request<{ success: boolean }>(`/training/courses/${id}`, {
      method: 'DELETE',
    }, { success: true });

    const saved = localStorage.getItem('dva_courses');
    if (saved) {
      const list: TrainingCourse[] = JSON.parse(saved);
      localStorage.setItem('dva_courses', JSON.stringify(list.filter(c => c.id !== id)));
    }
    coursesCache.invalidate();
    return res;
  },

  async toggleVisibility(id: string, isActive: boolean): Promise<TrainingCourse> {
    const res = await request<TrainingCourse>(`/training/courses/${id}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }, { id, isActive } as TrainingCourse);

    const saved = localStorage.getItem('dva_courses');
    if (saved) {
      const list: TrainingCourse[] = JSON.parse(saved);
      localStorage.setItem('dva_courses', JSON.stringify(list.map(c => c.id === id ? { ...c, ...res } : c)));
    }
    coursesCache.invalidate();
    return res;
  },

  async getRegistrations(): Promise<TrainingRegistration[]> {
    return request<TrainingRegistration[]>('/training/registrations', { cache: 'no-store' }, []);
  },

  async register(data: Partial<TrainingRegistration>): Promise<TrainingRegistration> {
    return deduplicatedPost<TrainingRegistration>('/training/register', data, {
      ...data,
      id: `tr-${Date.now()}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    } as TrainingRegistration);
  },

  async updateStatus(id: string, status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'): Promise<TrainingRegistration> {
    return request<TrainingRegistration>(`/training/registrations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, {
      id,
      status,
    } as TrainingRegistration);
  },

  async deleteRegistration(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/training/registrations/${id}`, {
      method: 'DELETE',
    }, { success: true });
  }
};

export const coachService = {
  getCachedCoaches() {
    return coachesCache.get('default');
  },

  async getCoaches(opts?: { adminMode?: boolean; forceRefresh?: boolean }): Promise<CoachProfile[]> {
    const fetchCoaches = async (): Promise<CoachProfile[]> => {
      const saved = localStorage.getItem('dva_coaches');
      let fallback: CoachProfile[] = [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) fallback = parsed;
        } catch {
          fallback = [];
        }
      }
      const res = await request<CoachProfile[]>(
        '/coaches',
        opts?.adminMode ? { cache: 'no-store' } : undefined,
        fallback
      );
      return Array.isArray(res) ? res : [];
    };

    if (opts?.adminMode) {
      return fetchCoaches();
    }
    return coachesCache.fetch({
      key: 'default',
      forceRefresh: opts?.forceRefresh,
      fetcher: fetchCoaches,
    });
  },

  async addCoach(coachData: Partial<CoachProfile>): Promise<CoachProfile> {
    const newCoach: CoachProfile = {
      ...coachData,
      id: `coach-${Date.now()}`,
      avatarUrl: coachData.avatarUrl || '/coaches/duy.png',
      certifications: coachData.certifications || [],
    } as CoachProfile;

    const res = await request<CoachProfile>('/coaches', {
      method: 'POST',
      body: JSON.stringify(coachData),
    }, newCoach);

    const saved = localStorage.getItem('dva_coaches');
    const list: CoachProfile[] = saved ? JSON.parse(saved) : [];
    localStorage.setItem('dva_coaches', JSON.stringify([res, ...list]));
    coachesCache.invalidate();
    return res;
  },

  async updateCoach(id: string, coachData: Partial<CoachProfile>): Promise<CoachProfile> {
    const res = await request<CoachProfile>(`/coaches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(coachData),
    }, { id, ...coachData } as CoachProfile);

    const saved = localStorage.getItem('dva_coaches');
    if (saved) {
      const list: CoachProfile[] = JSON.parse(saved);
      localStorage.setItem('dva_coaches', JSON.stringify(list.map(c => c.id === id ? { ...c, ...res } : c)));
    }
    coachesCache.invalidate();
    return res;
  },

  async deleteCoach(id: string): Promise<{ success: boolean }> {
    const res = await request<{ success: boolean }>(`/coaches/${id}`, {
      method: 'DELETE',
    }, { success: true });

    const saved = localStorage.getItem('dva_coaches');
    if (saved) {
      const list: CoachProfile[] = JSON.parse(saved);
      localStorage.setItem('dva_coaches', JSON.stringify(list.filter(c => c.id !== id)));
    }
    coachesCache.invalidate();
    return res;
  }
};

export const memberService = {
  async register(
    applicationData: TryoutApplicationRegisterPayload | Partial<MemberApplication>
  ): Promise<MemberApplication> {
    return deduplicatedPost<MemberApplication>('/members/register', applicationData, {
      ...applicationData,
      id: `app-${Date.now()}`,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      createdAt: new Date().toISOString(),
    } as MemberApplication);
  },

  async getApplications(): Promise<MemberApplication[]> {
    return request<MemberApplication[]>('/members/applications', {}, []);
  },

  async updateStatus(
    id: string,
    status: ApplicationStatus,
    reviewNotes?: string,
    entryFee?: number
  ): Promise<{ application: MemberApplication; promotedPlayer: boolean }> {
    const res = await request<{ application: MemberApplication; promotedPlayer: boolean }>(`/members/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewNotes, ...(entryFee !== undefined ? { entryFee } : {}) }),
    }, {
      application: {
        id,
        status,
        reviewNotes,
        ...(entryFee !== undefined ? { entryFee } : {}),
      } as MemberApplication,
      promotedPlayer: status === 'APPROVED',
    });
    if (res.promotedPlayer || status === 'APPROVED') {
      playersCache.invalidate();
      homeSummaryCache.invalidate();
    }
    return res;
  },

  async updateEntryFee(id: string, entryFee: number): Promise<MemberApplication> {
    return request<MemberApplication>(`/members/applications/${id}/entry-fee`, {
      method: 'PATCH',
      body: JSON.stringify({ entryFee }),
    });
  },

  async updatePaymentStatus(
    id: string,
    paymentStatus: TryoutPaymentStatus
  ): Promise<MemberApplication> {
    return request<MemberApplication>(`/members/applications/${id}/payment-status`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentStatus }),
    });
  },

  async updateTryout(
    id: string,
    payload: {
      fullName?: string;
      level?: PlayerLevel;
      status?: ApplicationStatus;
      reviewNotes?: string;
      coachNotes?: string;
      entryFee?: number;
    }
  ): Promise<MemberApplication> {
    const res = await request<MemberApplication>(`/admin/tryouts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (
      payload.status === 'APPROVED' ||
      (payload.fullName !== undefined && res.status === 'APPROVED')
    ) {
      playersCache.invalidate();
      homeSummaryCache.invalidate();
    }
    return res;
  },

  async evaluate(
    id: string,
    payload: TryoutEvaluatePayload
  ): Promise<MemberApplication> {
    return request<MemberApplication>(`/admin/tryouts/${id}/evaluate`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async sendTryoutEmail(
    id: string,
    payload: TryoutUnifiedSendEmailPayload
  ): Promise<{
    success: boolean;
    emailSent: boolean;
    emailError?: string;
    message: string;
    application: MemberApplication;
  }> {
    return request<{
      success: boolean;
      emailSent: boolean;
      emailError?: string;
      message: string;
      application: MemberApplication;
    }>(`/admin/tryouts/${id}/send-email`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async scheduleTryout(
    id: string,
    payload: TryoutScheduleEmailPayload
  ): Promise<{
    success: boolean;
    emailSent: boolean;
    emailError?: string;
    message: string;
    application: MemberApplication;
  }> {
    return this.sendTryoutEmail(id, {
      kind: 'SCHEDULE',
      ...payload,
    });
  },

  async deleteApplication(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/members/applications/${id}`, {
      method: 'DELETE',
    }, { success: true });
  }
};

function normalizeNewsPost(post: NewsPost): NewsPost {
  const resolvedImageUrl = (
    post.imageUrl ||
    post.image ||
    post.thumbnail ||
    ''
  ).trim();
  return {
    ...post,
    imageUrl: resolvedImageUrl,
    image: resolvedImageUrl,
    thumbnail: resolvedImageUrl,
    isPinned: Boolean(post.isPinned),
  };
}

function buildNewsCacheKey(params?: { category?: string; search?: string }): string {
  const cat =
    params?.category && params.category.trim() !== '' && params.category.trim().toUpperCase() !== 'ALL'
      ? params.category.trim().toUpperCase()
      : 'ALL';
  const search = params?.search ? params.search.trim().toLowerCase() : '';
  return `${cat}:${search}`;
}

export const newsService = {
  getCachedNews(params?: { category?: string; search?: string }) {
    return newsCache.get(buildNewsCacheKey(params));
  },

  getCachedNewsById(id: string) {
    const direct = newsDetailCache.get(id);
    if (direct) return direct;
    const listCached = newsCache.get('ALL:');
    if (listCached) {
      const hit = listCached.data.find((n) => n.id === id || n.slug === id);
      if (hit) return { data: hit, isStale: listCached.isStale };
    }
    return null;
  },

  async getNews(params?: {
    category?: string;
    search?: string;
    adminMode?: boolean;
    forceRefresh?: boolean;
  }): Promise<NewsPost[]> {
    const categoryParam =
      params?.category && params.category.trim() !== '' && params.category.trim().toUpperCase() !== 'ALL'
        ? params.category.trim()
        : undefined;
    const searchParam = params?.search && params.search.trim() !== '' ? params.search.trim() : undefined;

    const cleanParams: Record<string, string> = {};
    if (categoryParam) cleanParams.category = categoryParam;
    if (searchParam) cleanParams.search = searchParam;
    const query = new URLSearchParams(cleanParams).toString();
    const endpoint = `/news${query ? `?${query}` : ''}`;

    const fetchFromApi = async (): Promise<NewsPost[]> => {
      const saved = localStorage.getItem('dva_news');
      let fullFallback: NewsPost[] = [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) fullFallback = parsed.map(normalizeNewsPost);
        } catch {
          fullFallback = [];
        }
      }
      const filteredFallback = fullFallback.filter((item) => {
        if (categoryParam && item.category !== categoryParam) return false;
        if (searchParam) {
          const q = searchParam.toLowerCase();
          if (!item.title.toLowerCase().includes(q) && !item.excerpt.toLowerCase().includes(q)) return false;
        }
        return true;
      });
      const res = await request<NewsPost[]>(
        endpoint,
        params?.adminMode ? { cache: 'no-store' } : undefined,
        filteredFallback
      );
      return Array.isArray(res) ? res.map(normalizeNewsPost) : [];
    };

    if (params?.adminMode) {
      return fetchFromApi();
    }

    return newsCache.fetch({
      key: buildNewsCacheKey(params),
      forceRefresh: params?.forceRefresh,
      fetcher: fetchFromApi,
    });
  },

  async getNewsById(id: string, opts?: { forceRefresh?: boolean }): Promise<NewsPost> {
    return newsDetailCache.fetch({
      key: id,
      forceRefresh: opts?.forceRefresh,
      fetcher: async () => {
        const saved = localStorage.getItem('dva_news');
        const list: NewsPost[] = saved ? JSON.parse(saved).map(normalizeNewsPost) : [];
        const fallbackPost = list.find((n) => n.id === id || n.slug === id) || ({ id, slug: id, title: '', excerpt: '', content: '', author: '', authorName: '', authorRole: '', thumbnail: '', publishedAt: '', readTimeMinutes: 1, category: 'GENERAL' } as unknown as NewsPost);
        const res = await request<NewsPost>(`/news/${id}`, {}, fallbackPost);
        return normalizeNewsPost(res);
      },
    });
  },

  async createNews(postData: Partial<NewsPost>): Promise<NewsPost> {
    const resolvedImageUrl = (postData.imageUrl || postData.image || postData.thumbnail || '').trim();
    const resolvedPublishedAt =
      (postData.publishedAt && postData.publishedAt.trim()) ||
      new Date().toISOString().split('T')[0];
    const payload = {
      ...postData,
      publishedAt: resolvedPublishedAt,
      imageUrl: resolvedImageUrl,
      image: resolvedImageUrl,
      thumbnail: resolvedImageUrl,
    };
    const created: NewsPost = normalizeNewsPost({
      ...payload,
      id: `news-${Date.now()}`,
      slug: postData.slug || `news-${Date.now()}`,
      publishedAt: resolvedPublishedAt,
      readTimeMinutes: 4,
    } as NewsPost);

    const res = normalizeNewsPost(
      await request<NewsPost>(
        '/news',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        created
      )
    );

    const saved = localStorage.getItem('dva_news');
    const list: NewsPost[] = saved ? JSON.parse(saved).map(normalizeNewsPost) : [];
    localStorage.setItem('dva_news', JSON.stringify([res, ...list.filter((n) => n.id !== res.id)]));
    newsCache.invalidate();
    newsDetailCache.invalidate();
    homeSummaryCache.invalidate();
    return res;
  },

  async updateNews(id: string, postData: Partial<NewsPost>): Promise<NewsPost> {
    const resolvedImageUrl = (postData.imageUrl || postData.image || postData.thumbnail || '').trim();
    const payload = {
      ...postData,
      ...(resolvedImageUrl
        ? {
            imageUrl: resolvedImageUrl,
            image: resolvedImageUrl,
            thumbnail: resolvedImageUrl,
          }
        : {}),
    };
    const res = normalizeNewsPost(
      await request<NewsPost>(
        `/news/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
        { id, ...payload } as NewsPost
      )
    );

    const saved = localStorage.getItem('dva_news');
    const list: NewsPost[] = saved ? JSON.parse(saved).map(normalizeNewsPost) : [];
    localStorage.setItem(
      'dva_news',
      JSON.stringify(list.map((n) => (n.id === id ? normalizeNewsPost({ ...n, ...res }) : n)))
    );
    newsCache.invalidate();
    newsDetailCache.invalidate();
    homeSummaryCache.invalidate();
    return res;
  },

  async deleteNews(id: string): Promise<{ success: boolean }> {
    const res = await request<{ success: boolean }>(`/news/${id}`, {
      method: 'DELETE',
    }, { success: true });

    const saved = localStorage.getItem('dva_news');
    if (saved) {
      const list: NewsPost[] = JSON.parse(saved);
      localStorage.setItem('dva_news', JSON.stringify(list.filter(n => n.id !== id)));
    }
    newsCache.invalidate();
    newsDetailCache.invalidate();
    homeSummaryCache.invalidate();
    return res;
  }
};

export const sheetsService = {
  async getSheetsData(): Promise<any> {
    return request('/sheets/data', {}, {
      spreadsheetId: '1dVa-Volleyball-Club-Sync-Spreadsheet-2026',
      spreadsheetTitle: 'DVA Volleyball Club - Master Data Sheet (Google Sheets v4 API)',
      tabs: {
        Member_Registrations: [],
        Court_Bookings: [],
        Training_Registrations: [],
        Store_Orders: []
      }
    });
  },

  async syncRow(tab: string, rowData: Record<string, any>): Promise<{ success: boolean }> {
    return request('/sheets/sync', {
      method: 'POST',
      body: JSON.stringify({ tab, rowData }),
    }, { success: true });
  }
};

export const googleScriptSyncService = {
  getScriptUrl(): string {
    return localStorage.getItem('dva_google_script_url') || '';
  },
  async fetchConfig(): Promise<string> {
    try {
      const json = await request<{ scriptUrl: string }>('/sheets/config');
      if (json.scriptUrl) {
        localStorage.setItem('dva_google_script_url', json.scriptUrl);
        return json.scriptUrl;
      }
    } catch (e) {
      // not permitted / offline
    }
    return this.getScriptUrl();
  },
  /** SUPERADMIN only. Throws if the server rejects the URL. */
  async setScriptUrl(url: string) {
    const cleanUrl = url.trim();
    await request('/sheets/config', {
      method: 'POST',
      body: JSON.stringify({ scriptUrl: cleanUrl }),
    });
    localStorage.setItem('dva_google_script_url', cleanUrl);
  },
  /**
   * Client-side direct Google Apps Script sync is strictly disabled (no-op).
   * All form submissions must only go to internal Backend APIs (`/api/bookings`,
   * `/api/training/register`, `/api/members/register`, `/api/store/orders`), where the Backend acts as
   * the single source of truth to forward webhooks to Google Sheets without duplicates.
   */
  async syncToGoogleSheet(
    _sheetName: 'DatSan' | 'TuyenThanhVien' | 'DangKyKhoaHoc' | 'DonHang_Shop' | 'LienHe',
    _data: Record<string, any>
  ): Promise<{ success: boolean; message?: string }> {
    return {
      success: true,
      message: 'Client-side direct Google Sheets sync is disabled; handled exclusively by Backend.',
    };
  },

  /** Admin-only: ask the server to push a test row to the configured Google Sheets webhook. */
  async testSync(
    sheetName: 'DatSan' | 'Training_Registrations' | 'TuyenThanhVien' | 'DangKyKhoaHoc' | 'DonHang_Shop' | 'LienHe',
    data: Record<string, any>
  ): Promise<{ success: boolean; message?: string }> {
    return request('/sheets/sync', {
      method: 'POST',
      body: JSON.stringify({ sheetName, data }),
    });
  },
};

export const vietQrService = {
  async generateQr(amount: number, bookingCode: string, description?: string): Promise<{
    bankId: string;
    bankName: string;
    accountNo: string;
    accountName: string;
    amount: number;
    bookingCode: string;
    description: string;
    qrUrl: string;
  }> {
    return request('/vietqr/generate', {
      method: 'POST',
      body: JSON.stringify({ amount, bookingCode, description }),
    }, {
      bankId: 'MB',
      bankName: 'MB Bank (Military Bank)',
      accountNo: '0002090671521',
      accountName: 'HOANG QUOC DUY',
      amount,
      bookingCode,
      description: description || `Payment ${bookingCode}`,
      qrUrl: `https://img.vietqr.io/image/MB-0002090671521-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(bookingCode)}&accountName=HOANG%20QUOC%20DUY`
    });
  }
};

export const cloudinaryService = {
  async getSignedUploadUrl(folder: string = 'dva_assets'): Promise<any> {
    return request('/cloudinary/sign-upload', {
      method: 'POST',
      body: JSON.stringify({ folder }),
    }, {
      cloudName: 'dsezvx7xf',
      uploadUrl: 'https://api.cloudinary.com/v1_1/dsezvx7xf/image/upload',
      uploadPreset: 'dva_sports',
    });
  },

  async uploadImage(file: File, folder: string = 'dva_uploads'): Promise<string> {
    const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || 'dsezvx7xf';
    const uploadPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || 'dva_sports';

    if (cloudName && uploadPreset) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', folder);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.secure_url) return data.secure_url;
        }
      } catch (e) {
        console.warn('Cloudinary upload error, using local fallback:', e);
      }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > maxDim) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            }
          } else {
            if (h > maxDim) {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = reject;
        img.src = loadEvt.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};

export const adminService = {
  getOverviewSummary: () =>
    request<AdminOverviewSummary | null>('/admin/overview-summary', { cache: 'no-store' }, null),

  sendGuestSessionEmail: (payload: GuestSessionPayload) =>
    request<{ success: boolean; message: string; guestSession?: GuestSessionRecord }>(
      '/admin/send-guest-session-email',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getGuestSessions: (status?: string) => {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    return request<GuestSessionRecord[]>(`/admin/guest-sessions${query}`, undefined, []);
  },

  updateGuestSessionStatus: (id: string, paymentStatus: PaymentStatus) =>
    request<GuestSessionRecord>(`/admin/guest-sessions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentStatus }),
    }),

  deleteGuestSession: (id: string) =>
    request<{ success: boolean }>(`/admin/guest-sessions/${id}`, {
      method: 'DELETE',
    }),
};

function buildStoreProductsCacheKey(params?: { category?: string; activeOnly?: boolean }): string {
  const category = params?.category && params.category !== 'ALL' ? params.category : 'ALL';
  return `${params?.activeOnly ? 'active' : 'all'}:${category}`;
}

/**
 * DVA Store API Client.
 * Connects directly to PostgreSQL `/api/store/products` & `/api/store/orders`.
 */
export const storeService = {
  getCachedProducts(params?: { category?: string; activeOnly?: boolean }): { data: StoreProduct[]; isStale: boolean } | null {
    if (!params?.activeOnly) return null;
    return storeProductsCache.get(buildStoreProductsCacheKey(params));
  },

  invalidateProductsCache(): void {
    storeProductsCache.invalidate();
  },

  async getProducts(params?: { category?: string; activeOnly?: boolean; forceRefresh?: boolean }): Promise<StoreProduct[]> {
    const query = new URLSearchParams({
      ...(params?.category && params.category !== 'ALL' ? { category: params.category } : {}),
      ...(params?.activeOnly ? { activeOnly: 'true' } : {}),
    }).toString();
    const endpoint = `/store/products${query ? `?${query}` : ''}`;

    if (!params?.activeOnly) {
      return request<StoreProduct[]>(endpoint, { cache: 'no-store' }, []);
    }

    const cacheKey = buildStoreProductsCacheKey(params);
    try {
      return await storeProductsCache.fetch({
        key: cacheKey,
        forceRefresh: params.forceRefresh,
        fetcher: async () => {
          const data = await request<StoreProduct[]>(endpoint);
          return Array.isArray(data) ? data : [];
        },
      });
    } catch (err) {
      console.warn('[API] Failed fetching store products, showing empty fallback.', err);
      return [];
    }
  },

  async getProduct(idOrSlug: string): Promise<StoreProduct> {
    return request<StoreProduct>(`/store/products/${encodeURIComponent(idOrSlug)}`);
  },

  async createProduct(productData: Partial<StoreProduct>): Promise<StoreProduct> {
    const created = await request<StoreProduct>('/store/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
    storeProductsCache.invalidate();
    return created;
  },

  async updateProduct(productId: string, productData: Partial<StoreProduct>): Promise<StoreProduct> {
    const updated = await request<StoreProduct>(`/store/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
    storeProductsCache.invalidate();
    return updated;
  },

  async deleteProduct(productId: string): Promise<{ success: boolean; softDeleted?: boolean; product?: StoreProduct }> {
    const res = await request<{ success: boolean; softDeleted?: boolean; product?: StoreProduct }>(
      `/store/products/${productId}`,
      { method: 'DELETE' }
    );
    storeProductsCache.invalidate();
    return res;
  },

  async toggleProductActive(
    productId: string,
    isActive: boolean
  ): Promise<StoreProduct> {
    const updated = await request<StoreProduct>(
      `/store/products/${productId}/active`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }
    );
    storeProductsCache.invalidate();
    return updated;
  },

  async toggleProductPaused(
    productId: string,
    isPaused: boolean
  ): Promise<StoreProduct> {
    const updated = await request<StoreProduct>(
      `/store/products/${productId}/paused`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isPaused }),
      }
    );
    storeProductsCache.invalidate();
    return updated;
  },

  async getOrders(status?: string): Promise<StoreOrder[]> {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    return request<StoreOrder[]>(`/store/orders${query}`, undefined, []);
  },

  async createOrder(payload: StoreOrderCreatePayload): Promise<{
    order: StoreOrder;
    payment: {
      bankId: string;
      bankName: string;
      accountNo: string;
      accountName: string;
      amount: number;
      transferContent: string;
      qrUrl: string;
    };
  }> {
    const items = payload.items || [];
    const suffix = Date.now().toString().slice(-4);
    const catCode = getShopCategoryCode(items[0]?.category || 'SHORT_SLEEVE');
    const transferContent = `DVA ${catCode} ${suffix}`;
    const totalAmount = items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
    const resolvedPhone = payload.phone || payload.customerPhone || '';
    const resolvedEmail = payload.email || payload.customerEmail || '';
    const fallbackOrder: StoreOrder = {
      id: `ord-${Date.now()}`,
      orderCode: `DVA-SHOP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${suffix}`,
      customerName: payload.customerName,
      customerPhone: resolvedPhone,
      phone: resolvedPhone,
      customerEmail: resolvedEmail,
      email: resolvedEmail,
      socialLink: payload.socialLink || null,
      deliveryMethod: payload.deliveryMethod,
      shippingAddress: payload.shippingAddress || null,
      totalAmount,
      transferContent,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      productName: items.map((it) => it.productName || 'DVA Gear').join(' + '),
      size: items.map((it) => it.size || 'M').join(', '),
      customName: items[0]?.customName || undefined,
      customNumber: items[0]?.customNumber || undefined,
      items: items.map((it, idx) => ({
        id: `item-${idx}`,
        orderId: `ord-${Date.now()}`,
        productId: it.productId,
        productName: it.productName || 'DVA Gear',
        category: (it.category as any) || 'SHORT_SLEEVE',
        unitPrice: Number(it.price) || 0,
        price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 1,
        size: it.size,
        height: it.height ?? null,
        weight: it.weight ?? null,
        customName: it.customName ?? null,
        customNumber: it.customNumber ?? null,
      })),
    };
    return deduplicatedPost('/store/orders', payload, {
      order: fallbackOrder,
      payment: {
        bankId: 'MB',
        bankName: 'MB Bank (Ngân hàng Quân Đội)',
        accountNo: '0002090671521',
        accountName: 'HOANG QUOC DUY',
        amount: totalAmount,
        transferContent,
        qrUrl: `https://img.vietqr.io/image/MB-0002090671521-compact2.png?amount=${totalAmount}&addInfo=${encodeURIComponent(transferContent)}&accountName=HOANG%20QUOC%20DUY`,
      },
    });
  },

  async confirmOrderPayment(orderId: string): Promise<{ success: boolean; message: string; order: StoreOrder }> {
    return request<{ success: boolean; message: string; order: StoreOrder }>(
      `/store/orders/${orderId}/confirm-payment`,
      { method: 'POST' }
    );
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus | PaymentStatus,
    notes?: string
  ): Promise<StoreOrder> {
    return request<StoreOrder>(
      `/store/orders/${orderId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, paymentStatus: status, ...(notes !== undefined ? { notes } : {}) }),
      }
    );
  },

  async sendShippingUpdateEmail(
    orderId: string,
    payload?: { trackingCode?: string; carrier?: string; shippingNotes?: string }
  ): Promise<{
    success: boolean;
    emailSent: boolean;
    message: string;
    order: StoreOrder;
  }> {
    return request<{
      success: boolean;
      emailSent: boolean;
      message: string;
      order: StoreOrder;
    }>(`/store/orders/${orderId}/shipping-email`, {
      method: 'POST',
      body: payload ? JSON.stringify(payload) : undefined,
    });
  },

  async deleteOrder(
    orderId: string
  ): Promise<{ success: boolean; deletedOrderId: string; orderCode: string; message: string }> {
    return request<{ success: boolean; deletedOrderId: string; orderCode: string; message: string }>(
      `/store/orders/${encodeURIComponent(orderId)}`,
      { method: 'DELETE' }
    );
  },
};

// ============================================================================
// TOURNAMENTS & LEAGUES API CLIENT (SPEC 008)
// ============================================================================

function invalidateTournamentsCache(): void {
  tournamentsCache.invalidate();
  tournamentDetailCache.invalidate();
}

export const tournamentService = {
  getCachedTournaments(): { data: Tournament[]; isStale: boolean } | null {
    return tournamentsCache.get('default');
  },

  getCachedTournament(slugOrId: string): { data: Tournament; isStale: boolean } | null {
    return tournamentDetailCache.get(slugOrId);
  },

  invalidateCache(): void {
    invalidateTournamentsCache();
  },

  async getTournaments(opts?: { forceRefresh?: boolean; adminMode?: boolean }): Promise<Tournament[]> {
    if (opts?.adminMode) {
      const rows = await request<Tournament[]>('/tournaments', { cache: 'no-store' }, []);
      return Array.isArray(rows) ? rows : [];
    }
    return tournamentsCache.fetch({
      key: 'default',
      forceRefresh: opts?.forceRefresh,
      fetcher: async () => {
        const rows = await request<Tournament[]>(
          '/tournaments',
          opts?.forceRefresh ? { cache: 'no-store' } : {},
          []
        );
        return Array.isArray(rows) ? rows : [];
      },
    });
  },

  async getTournament(slugOrId: string, opts?: { noCache?: boolean }): Promise<Tournament> {
    if (opts?.noCache) {
      return request<Tournament>(`/tournaments/${encodeURIComponent(slugOrId)}`, { cache: 'no-store' });
    }
    return tournamentDetailCache.fetch({
      key: slugOrId,
      fetcher: () => request<Tournament>(`/tournaments/${encodeURIComponent(slugOrId)}`),
    });
  },

  async getFinanceSummary(): Promise<TournamentFinanceSummary[]> {
    return request<TournamentFinanceSummary[]>('/admin/tournaments/finance-summary', { cache: 'no-store' }, []);
  },

  async registerTeam(
    slugOrId: string,
    payload: TournamentPublicRegistrationPayload
  ): Promise<{
    team: TournamentTeam;
    teamId: string;
    payment: {
      bankId: string;
      bankName: string;
      accountNo: string;
      accountName: string;
      amount: number;
      transferContent: string;
      qrUrl: string;
    };
  }> {
    const res = await deduplicatedPost<any>(
      `/tournaments/${encodeURIComponent(slugOrId)}/register`,
      payload
    );
    invalidateTournamentsCache();
    return res;
  },

  async confirmTeamPayment(
    slugOrId: string,
    teamId: string
  ): Promise<{ success: boolean; paymentStatus: PaymentStatus; customerConfirmedAt?: string }> {
    return request(
      `/tournaments/${encodeURIComponent(slugOrId)}/teams/${encodeURIComponent(teamId)}/confirm-payment`,
      { method: 'POST' }
    );
  },

  async createTournament(payload: Partial<Tournament>): Promise<Tournament> {
    const created = await request<Tournament>('/tournaments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    invalidateTournamentsCache();
    return created;
  },

  async updateTournament(id: string, payload: Partial<Tournament>): Promise<Tournament> {
    const updated = await request<Tournament>(`/tournaments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    invalidateTournamentsCache();
    return updated;
  },

  async toggleVisibility(id: string, isActive: boolean): Promise<Tournament> {
    const updated = await request<Tournament>(`/tournaments/${encodeURIComponent(id)}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    invalidateTournamentsCache();
    return updated;
  },

  async toggleRegistration(id: string, isRegistrationOpen: boolean): Promise<Tournament> {
    const updated = await request<Tournament>(`/tournaments/${encodeURIComponent(id)}/registration`, {
      method: 'PATCH',
      body: JSON.stringify({ isRegistrationOpen }),
    });
    invalidateTournamentsCache();
    return updated;
  },

  async toggleRosterLock(id: string, isRosterLocked: boolean): Promise<Tournament> {
    const updated = await request<Tournament>(`/tournaments/${encodeURIComponent(id)}/roster-lock`, {
      method: 'PATCH',
      body: JSON.stringify({ isRosterLocked }),
    });
    invalidateTournamentsCache();
    return updated;
  },

  async verifyTeamRoster(tournamentId: string, teamId: string): Promise<{ verifiedCount: number }> {
    const res = await request<{ verifiedCount: number }>(
      `/tournaments/${encodeURIComponent(tournamentId)}/teams/${encodeURIComponent(teamId)}/verify-roster`,
      { method: 'POST' }
    );
    invalidateTournamentsCache();
    return res;
  },

  async deleteTournament(id: string): Promise<{ success: boolean }> {
    const res = await request<{ success: boolean }>(`/tournaments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    invalidateTournamentsCache();
    return res;
  },

  async addTeam(
    tournamentId: string,
    payload: Partial<TournamentTeam> & { importDvaSquad?: boolean }
  ): Promise<TournamentTeam> {
    const created = await request<TournamentTeam>(
      `/tournaments/${encodeURIComponent(tournamentId)}/teams`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    invalidateTournamentsCache();
    return created;
  },

  async updateTeam(
    tournamentId: string,
    teamId: string,
    payload: Partial<TournamentTeam>
  ): Promise<TournamentTeam> {
    const updated = await request<TournamentTeam>(
      `/tournaments/${encodeURIComponent(tournamentId)}/teams/${encodeURIComponent(teamId)}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    );
    invalidateTournamentsCache();
    return updated;
  },

  async deleteTeam(tournamentId: string, teamId: string): Promise<{ success: boolean }> {
    const res = await request<{ success: boolean }>(
      `/tournaments/${encodeURIComponent(tournamentId)}/teams/${encodeURIComponent(teamId)}`,
      { method: 'DELETE' }
    );
    invalidateTournamentsCache();
    return res;
  },

  async importDvaSquad(
    tournamentId: string,
    teamId: string,
    level: PlayerLevel
  ): Promise<{ importedCount: number; players: TournamentPlayer[] }> {
    const res = await request<{ importedCount: number; players: TournamentPlayer[] }>(
      `/tournaments/${encodeURIComponent(tournamentId)}/teams/${encodeURIComponent(teamId)}/import-dva-squad`,
      { method: 'POST', body: JSON.stringify({ level }) }
    );
    invalidateTournamentsCache();
    return res;
  },

  async addPlayer(tournamentId: string, payload: Partial<TournamentPlayer>): Promise<TournamentPlayer> {
    const created = await request<TournamentPlayer>(
      `/tournaments/${encodeURIComponent(tournamentId)}/players`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    invalidateTournamentsCache();
    return created;
  },

  async updatePlayer(
    tournamentId: string,
    playerId: string,
    payload: Partial<TournamentPlayer>
  ): Promise<TournamentPlayer> {
    const updated = await request<TournamentPlayer>(
      `/tournaments/${encodeURIComponent(tournamentId)}/players/${encodeURIComponent(playerId)}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    );
    invalidateTournamentsCache();
    return updated;
  },

  async deletePlayer(tournamentId: string, playerId: string): Promise<{ success: boolean }> {
    const res = await request<{ success: boolean }>(
      `/tournaments/${encodeURIComponent(tournamentId)}/players/${encodeURIComponent(playerId)}`,
      { method: 'DELETE' }
    );
    invalidateTournamentsCache();
    return res;
  },

  async addOfficial(tournamentId: string, payload: Partial<TournamentOfficial>): Promise<TournamentOfficial> {
    const created = await request<TournamentOfficial>(
      `/tournaments/${encodeURIComponent(tournamentId)}/officials`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    invalidateTournamentsCache();
    return created;
  },

  async updateOfficial(
    officialId: string,
    payload: Partial<TournamentOfficialPayload>
  ): Promise<TournamentOfficial> {
    const updated = await request<TournamentOfficial>(
      `/admin/tournaments/officials/${encodeURIComponent(officialId)}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
    invalidateTournamentsCache();
    return updated;
  },

  async deleteOfficial(tournamentId: string, officialId: string): Promise<{ success: boolean }> {
    const res = await request<{ success: boolean }>(
      `/tournaments/${encodeURIComponent(tournamentId)}/officials/${encodeURIComponent(officialId)}`,
      { method: 'DELETE' }
    );
    invalidateTournamentsCache();
    return res;
  },

  async generateGroupSchedule(tournamentId: string, forceReset = false): Promise<Tournament> {
    const res = await request<Tournament>(
      `/admin/tournaments/${encodeURIComponent(tournamentId)}/generate-schedule`,
      { method: 'POST', body: JSON.stringify({ forceReset }) }
    );
    invalidateTournamentsCache();
    return res;
  },

  async generateSchedule(tournamentId: string, forceReset = false): Promise<Tournament> {
    return this.generateGroupSchedule(tournamentId, forceReset);
  },

  async seedQuarterfinals(
    tournamentId: string,
    forceOverride = false
  ): Promise<{ tournament: Tournament; seededCodes?: string[]; skipped: string[]; warnings: string[] }> {
    const res = await request<{
      tournament: Tournament;
      seededCodes?: string[];
      skipped: string[];
      warnings: string[];
    }>(
      `/admin/tournaments/${encodeURIComponent(tournamentId)}/seed-quarterfinals`,
      { method: 'POST', body: JSON.stringify({ forceOverride }) }
    );
    invalidateTournamentsCache();
    return res;
  },

  async seedSemifinals(
    tournamentId: string,
    forceOverride = false
  ): Promise<{
    tournament: Tournament;
    seededCodes?: string[];
    pendingSources?: string[];
    skipped: string[];
    warnings: string[];
  }> {
    const res = await request<{
      tournament: Tournament;
      seededCodes?: string[];
      pendingSources?: string[];
      skipped: string[];
      warnings: string[];
    }>(
      `/admin/tournaments/${encodeURIComponent(tournamentId)}/seed-semifinals`,
      { method: 'POST', body: JSON.stringify({ forceOverride }) }
    );
    invalidateTournamentsCache();
    return res;
  },

  async seedFinals(
    tournamentId: string,
    forceOverride = false
  ): Promise<{
    tournament: Tournament;
    seededCodes?: string[];
    pendingSources?: string[];
    skipped: string[];
    warnings: string[];
  }> {
    const res = await request<{
      tournament: Tournament;
      seededCodes?: string[];
      pendingSources?: string[];
      skipped: string[];
      warnings: string[];
    }>(
      `/admin/tournaments/${encodeURIComponent(tournamentId)}/seed-finals`,
      { method: 'POST', body: JSON.stringify({ forceOverride }) }
    );
    invalidateTournamentsCache();
    return res;
  },

  async seedKnockout(
    tournamentId: string,
    forceOverride = false
  ): Promise<{ tournament: Tournament; seededCodes?: string[]; skipped: string[]; warnings: string[] }> {
    return this.seedQuarterfinals(tournamentId, forceOverride);
  },

  async createMatch(tournamentId: string, payload: Partial<TournamentMatch>): Promise<TournamentMatch> {
    const created = await request<TournamentMatch>(
      `/tournaments/${encodeURIComponent(tournamentId)}/matches`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    invalidateTournamentsCache();
    return created;
  },

  async deleteMatch(tournamentId: string, matchId: string): Promise<{ success: boolean }> {
    const res = await request<{ success: boolean }>(
      `/tournaments/${encodeURIComponent(tournamentId)}/matches/${encodeURIComponent(matchId)}`,
      { method: 'DELETE' }
    );
    invalidateTournamentsCache();
    return res;
  },

  async updateMatchScore(
    tournamentId: string,
    matchId: string,
    payload: Partial<TournamentMatch> & { forceOverride?: boolean }
  ): Promise<{ tournament: Tournament; warnings: string[]; autoSeededQuarterfinals?: boolean }> {
    const res = await request<{
      tournament: Tournament;
      warnings: string[];
      autoSeededQuarterfinals?: boolean;
    }>(
      `/tournaments/${encodeURIComponent(tournamentId)}/matches/${encodeURIComponent(matchId)}/score`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
    invalidateTournamentsCache();
    return res;
  },

  async saveDreamTeam(
    tournamentId: string,
    dreamTeam: TournamentDreamTeamSelection
  ): Promise<Tournament> {
    const res = await request<Tournament>(
      `/tournaments/${encodeURIComponent(tournamentId)}/dream-team`,
      { method: 'PUT', body: JSON.stringify({ dreamTeam }) }
    );
    invalidateTournamentsCache();
    return res;
  },
};

export const venueService = {
  getCachedVenues(): VolleyballVenue[] | null {
    return venuesCache.get('public')?.data ?? null;
  },

  async getPublicVenues(opts: { forceRefresh?: boolean } = {}): Promise<VolleyballVenue[]> {
    return venuesCache.fetch({
      key: 'public',
      fetcher: () => request<VolleyballVenue[]>('/venues'),
      forceRefresh: opts.forceRefresh,
    });
  },

  async getClubBySlug(
    slug: string,
    opts: { forceRefresh?: boolean } = {}
  ): Promise<VenueClubDetailResponse> {
    const clean = slug.trim().toLowerCase();
    return venueClubDetailCache.fetch({
      key: clean,
      fetcher: () => request<VenueClubDetailResponse>(`/venues/teams/${encodeURIComponent(clean)}`),
      forceRefresh: opts.forceRefresh,
    });
  },

  async getAdminVenues(): Promise<VolleyballVenue[]> {
    return request<VolleyballVenue[]>('/admin/venues');
  },

  async createVenue(payload: VenuePayload): Promise<VolleyballVenue> {
    const created = await request<VolleyballVenue>('/admin/venues', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    venuesCache.invalidate();
    venueClubDetailCache.invalidate();
    return created;
  },

  async updateVenue(id: string, payload: Partial<VenuePayload>): Promise<VolleyballVenue> {
    const updated = await request<VolleyballVenue>(`/admin/venues/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    venuesCache.invalidate();
    venueClubDetailCache.invalidate();
    return updated;
  },

  async deleteVenue(id: string): Promise<{ success: boolean; id: string }> {
    const res = await request<{ success: boolean; id: string }>(`/admin/venues/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    venuesCache.invalidate();
    venueClubDetailCache.invalidate();
    return res;
  },

  async createClub(venueId: string, payload: VenueClubPayload): Promise<CourtClubProfile> {
    const created = await request<CourtClubProfile>(
      `/admin/venues/${encodeURIComponent(venueId)}/clubs`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    venuesCache.invalidate();
    venueClubDetailCache.invalidate();
    return created;
  },

  async updateClub(
    venueId: string,
    clubId: string,
    payload: Partial<VenueClubPayload>
  ): Promise<CourtClubProfile> {
    const updated = await request<CourtClubProfile>(
      `/admin/venues/${encodeURIComponent(venueId)}/clubs/${encodeURIComponent(clubId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
    venuesCache.invalidate();
    venueClubDetailCache.invalidate();
    return updated;
  },

  async deleteClub(venueId: string, clubId: string): Promise<{ success: boolean; id: string }> {
    const res = await request<{ success: boolean; id: string }>(
      `/admin/venues/${encodeURIComponent(venueId)}/clubs/${encodeURIComponent(clubId)}`,
      {
        method: 'DELETE',
      }
    );
    venuesCache.invalidate();
    venueClubDetailCache.invalidate();
    return res;
  },

  async createSession(venueId: string, payload: VenueSessionPayload): Promise<VenueSessionSlot> {
    const created = await request<VenueSessionSlot>(
      `/admin/venues/${encodeURIComponent(venueId)}/sessions`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    venuesCache.invalidate();
    venueClubDetailCache.invalidate();
    return created;
  },

  async updateSession(
    venueId: string,
    sessionId: string,
    payload: Partial<VenueSessionPayload>
  ): Promise<VenueSessionSlot> {
    const updated = await request<VenueSessionSlot>(
      `/admin/venues/${encodeURIComponent(venueId)}/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
    venuesCache.invalidate();
    venueClubDetailCache.invalidate();
    return updated;
  },

  async deleteSession(venueId: string, sessionId: string): Promise<{ success: boolean; id: string }> {
    const res = await request<{ success: boolean; id: string }>(
      `/admin/venues/${encodeURIComponent(venueId)}/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: 'DELETE',
      }
    );
    venuesCache.invalidate();
    venueClubDetailCache.invalidate();
    return res;
  },
};

