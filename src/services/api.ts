import { 
  Booking, 
  ClosedSlot,
  Court, 
  MemberApplication, 
  NewsPost, 
  Player, 
  PlayerLevel, 
  TrainingCourse, 
  CoachProfile,
  TrainingRegistration, 
  User, 
  UserRole,
  ManagedUserRole
} from '../types';
import { 
  GUEST_USER,
  INITIAL_USERS,
  INITIAL_COURTS, 
  INITIAL_PLAYERS, 
  INITIAL_COACHES,
  INITIAL_NEWS, 
  INITIAL_TRAINING_COURSES, 
  INITIAL_MEMBER_APPLICATIONS 
} from '../data/mockData';
import { getDefaultWeeklyScheduleForCourt, normalizeCourtWeeklySchedule } from '../shared/schedule';
import { API_BASE_URL, getApiUrl } from '../config/api';

export { API_BASE_URL, getApiUrl };

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

const FALLBACK_CREDENTIALS: Record<string, string> = {
  'quocduyhoang42@gmail.com': 'dva@2025',
  'admin.dva@gmail.com': 'dva@2025',
  'player.hung@gmail.com': 'dva@123',
};

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
    if (res.status === 401 && token) {
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

  logout(): User {
    clearSession();
    return GUEST_USER;
  },

  /** Re-validates the stored session with the server and returns the fresh profile. */
  async me(): Promise<User> {
    const current = this.getCurrentUser();
    const res = await request<{ user: User }>('/auth/me', {}, { user: current });
    this.setCurrentUser(res.user);
    return res.user;
  },

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const res = await request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      localStorage.setItem(TOKEN_KEY, res.token);
      this.setCurrentUser(res.user);
      return res;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 0 || err.status === 404 || err.status >= 500)) {
        const expectedPassword = FALLBACK_CREDENTIALS[normalizedEmail];
        const matchedUser = INITIAL_USERS.find((u) => u.email.toLowerCase() === normalizedEmail);
        if (!matchedUser || !expectedPassword || password !== expectedPassword) {
          throw new ApiError(401, 'Invalid email or password.');
        }
        const token = `dva-local-token-${Date.now()}`;
        localStorage.setItem(TOKEN_KEY, token);
        this.setCurrentUser(matchedUser);
        return { token, user: matchedUser };
      }
      throw err;
    }
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
};

export const playerService = {
  async getPlayers(params?: { level?: string; position?: string; search?: string }): Promise<Player[]> {
    const query = new URLSearchParams(params as any).toString();
    return request<Player[]>(`/players${query ? `?${query}` : ''}`, {}, []);
  },

  async addPlayer(playerData: Partial<Player>): Promise<Player> {
    return request<Player>('/players', {
      method: 'POST',
      body: JSON.stringify(playerData),
    }, {
      ...playerData,
      id: `p-${Date.now()}`,
      avatarUrl: playerData.avatarUrl || '',
    } as Player);
  },

  async updatePlayer(id: string, playerData: Partial<Player>): Promise<Player> {
    return request<Player>(`/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(playerData),
    }, {
      ...playerData,
      id,
    } as Player);
  },

  async updateLevel(id: string, level: PlayerLevel): Promise<Player> {
    return request<Player>(`/players/${id}/level`, {
      method: 'PATCH',
      body: JSON.stringify({ level }),
    }, {
      id,
      level,
    } as Player);
  },

  async deletePlayer(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/players/${id}`, {
      method: 'DELETE',
    }, { success: true });
  }
};

export const courtService = {
  async getCourts(): Promise<Court[]> {
    const saved = localStorage.getItem('dva_courts');
    let fallback: Court[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          fallback = parsed;
        }
      } catch {
        fallback = [];
      }
    }
    const res = await request<Court[]>('/courts', {}, fallback);
    const rawList = Array.isArray(res) ? res : fallback;
    const cleaned = rawList.map((c) => {
      const subs = c.subCourts?.length
        ? c.subCourts
        : (c.id === 'court-btl' || c.code === 'BTL_TT' ? ['Sân A', 'Sân B'] : []);
      return {
        ...c,
        subCourts: subs.length > 0 ? subs : undefined,
        weeklySchedule: normalizeCourtWeeklySchedule(
          c.weeklySchedule,
          c.id,
          subs
        ),
      };
    });
    if (cleaned.length > 0) {
      localStorage.setItem('dva_courts', JSON.stringify(cleaned));
    }
    return cleaned;
  },

  async createCourt(courtData: Partial<Court>): Promise<Court> {
    const id = `court-${Date.now()}`;
    const fallbackCourt: Court = {
      id,
      code: courtData.code || `COURT_${Date.now().toString().slice(-3)}`,
      shortName: courtData.shortName || courtData.name || 'DVA COURT',
      name: courtData.name || 'Sân Mới DVA',
      address: courtData.address || 'DVA Sports Center, Hà Nội',
      description:
        courtData.description ||
        'Sân bóng chuyền tiêu chuẩn trang bị mặt sàn Taraflex Pro chống chấn thương.',
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
      ...(current || { id, name: 'Sân bóng chuyền', code: 'COURT', hourlyRate: 500000, minHours: 1.5, floorType: 'Taraflex', imageUrl: '', address: '', description: '', includes: [] }),
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
      courtName: bookingData.courtName || (bookingData.courtId === 'court-btl' ? 'BTL Thong Tin court' : 'Sân Bóng Chuyền'),
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
  async getCourses(): Promise<TrainingCourse[]> {
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
    const res = await request<TrainingCourse[]>('/training/courses', {}, fallback);
    return Array.isArray(res) ? res : [];
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
    return res;
  },

  async getRegistrations(): Promise<TrainingRegistration[]> {
    return request<TrainingRegistration[]>('/training/registrations', {}, []);
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
  async getCoaches(): Promise<CoachProfile[]> {
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
    const res = await request<CoachProfile[]>('/coaches', {}, fallback);
    return Array.isArray(res) ? res : [];
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
    return res;
  }
};

export const memberService = {
  async register(applicationData: Partial<MemberApplication>): Promise<MemberApplication> {
    return deduplicatedPost<MemberApplication>('/members/register', applicationData, {
      ...applicationData,
      id: `app-${Date.now()}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    } as MemberApplication);
  },

  async getApplications(): Promise<MemberApplication[]> {
    return request<MemberApplication[]>('/members/applications', {}, []);
  },

  async updateStatus(id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED', reviewNotes?: string): Promise<{ application: MemberApplication; promotedPlayer: boolean }> {
    return request<{ application: MemberApplication; promotedPlayer: boolean }>(`/members/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewNotes }),
    }, {
      application: {
        id,
        status,
        reviewNotes,
      } as MemberApplication,
      promotedPlayer: status === 'APPROVED',
    });
  },

  async deleteApplication(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/members/applications/${id}`, {
      method: 'DELETE',
    }, { success: true });
  }
};

function normalizeNewsPost(post: NewsPost): NewsPost {
  const initMatch = INITIAL_NEWS.find((n) => n.id === post.id || n.slug === post.slug);
  const resolvedImageUrl = (
    post.imageUrl ||
    post.image ||
    post.thumbnail ||
    initMatch?.imageUrl ||
    initMatch?.thumbnail ||
    ''
  ).trim();
  return {
    ...post,
    imageUrl: resolvedImageUrl,
    image: resolvedImageUrl,
    thumbnail: resolvedImageUrl,
  };
}

export const newsService = {
  async getNews(params?: { category?: string; search?: string }): Promise<NewsPost[]> {
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
      if (params?.category && item.category !== params.category) return false;
      if (params?.search) {
        const q = params.search.toLowerCase();
        if (!item.title.toLowerCase().includes(q) && !item.excerpt.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    const query = new URLSearchParams(params as any).toString();
    const res = await request<NewsPost[]>(`/news${query ? `?${query}` : ''}`, {}, filteredFallback);
    const normalizedRes = Array.isArray(res) ? res.map(normalizeNewsPost) : [];
    return normalizedRes;
  },

  async getNewsById(id: string): Promise<NewsPost> {
    const saved = localStorage.getItem('dva_news');
    const list: NewsPost[] = saved ? JSON.parse(saved).map(normalizeNewsPost) : [];
    const fallbackPost = list.find((n) => n.id === id || n.slug === id) || ({ id, slug: id, title: '', excerpt: '', content: '', author: '', authorName: '', authorRole: '', thumbnail: '', publishedAt: '', readTimeMinutes: 1, category: 'GENERAL' } as unknown as NewsPost);
    const res = await request<NewsPost>(`/news/${id}`, {}, fallbackPost);
    return normalizeNewsPost(res);
  },

  async createNews(postData: Partial<NewsPost>): Promise<NewsPost> {
    const resolvedImageUrl = (postData.imageUrl || postData.image || postData.thumbnail || '').trim();
    const payload = {
      ...postData,
      imageUrl: resolvedImageUrl,
      image: resolvedImageUrl,
      thumbnail: resolvedImageUrl,
    };
    const created: NewsPost = normalizeNewsPost({
      ...payload,
      id: `news-${Date.now()}`,
      slug: postData.slug || `news-${Date.now()}`,
      publishedAt: new Date().toISOString().split('T')[0],
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
        Training_Registrations: []
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
   * `/api/training/register`, `/api/members/register`), where the Backend acts as
   * the single source of truth to forward webhooks to Google Sheets without duplicates.
   */
  async syncToGoogleSheet(
    _sheetName: 'DatSan' | 'TuyenThanhVien' | 'DangKyKhoaHoc' | 'LienHe',
    _data: Record<string, any>
  ): Promise<{ success: boolean; message?: string }> {
    return {
      success: true,
      message: 'Client-side direct Google Sheets sync is disabled; handled exclusively by Backend.',
    };
  },

  /** Admin-only: ask the server to push a test row to the configured Google Sheets webhook. */
  async testSync(
    sheetName: 'DatSan' | 'Training_Registrations' | 'TuyenThanhVien' | 'DangKyKhoaHoc' | 'LienHe',
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
      bankName: 'Ngân hàng Quân Đội (MB Bank)',
      accountNo: '0002090671521',
      accountName: 'HOANG QUOC DUY',
      amount,
      bookingCode,
      description: description || `Thanh toan ${bookingCode}`,
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
