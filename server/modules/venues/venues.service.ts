import { prisma } from '../../config/prisma';
import { getOrSetCache, invalidateCache } from '../../utils/cache';
import { HttpError } from '../../utils/validation';

const PUBLIC_TTL_MS = 5 * 60 * 1000;
const DAY_SHORT: Record<number, string> = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 0: 'CN' };

export interface SessionConflictDetail {
  sessionId: string; clubName: string; days: number[]; startTime: string; endTime: string; subCourts: string[];
}

export class SessionConflictError extends HttpError {
  conflicts: SessionConflictDetail[];
  constructor(message: string, conflicts: SessionConflictDetail[]) { super(409, message); this.conflicts = conflicts; }
}

const slugify = (s: string) => (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const parseDate = (v: unknown) => { if (!v) return null; const s = String(v).trim(); const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00+07:00`) : new Date(s); return Number.isNaN(d.getTime()) ? null : d; };
const CAPTAIN_USER_SELECT = { id: true, email: true, fullName: true, role: true, isActive: true } as const;
const QUOTA_30D_MS = 30 * 24 * 60 * 60 * 1000;
const formatVnDate = (ms: number) => new Date(ms).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const stripEmail = <T extends Record<string, any>>(c: T) => { const { captainEmail: _e, captainUserId: _u, captainUser: _cu, coverUpdatedAt: _c, galleryUpdatedAt: _g, ...rest } = c; return rest; };
type Actor = { id: string; role: string };

async function uniqueSlug(model: 'venue' | 'club', raw: string, excludeId?: string): Promise<string> {
  const base = slugify(raw) || `${model}-${Date.now()}`;
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const where = { slug, ...(excludeId ? { id: { not: excludeId } } : {}) };
    const hit = model === 'venue' ? await prisma.volleyballVenue.findFirst({ where, select: { id: true } }) : await prisma.courtClubProfile.findFirst({ where, select: { id: true } });
    if (!hit) return slug;
  }
}

async function findSessionConflicts(p: { venueId: string; daysOfWeek: number[]; startTime: string; endTime: string; subCourts: string[]; excludeId?: string }): Promise<SessionConflictDetail[]> {
  const [ns, ne, days, courts] = [toMin(p.startTime), toMin(p.endTime), new Set(p.daysOfWeek), new Set(p.subCourts.map((c) => c.trim().toLowerCase()))];
  const rows = await prisma.venueSessionSlot.findMany({ where: { venueId: p.venueId, ...(p.excludeId ? { id: { not: p.excludeId } } : {}) }, include: { club: { select: { name: true, isActive: true } } } });
  return rows.reduce<SessionConflictDetail[]>((acc, r) => {
    if (r.club?.isActive === false) return acc;
    const hitDays = r.daysOfWeek.filter((d) => days.has(d));
    const hitCourts = r.subCourts.filter((c) => courts.has(c.trim().toLowerCase()));
    if (hitDays.length && hitCourts.length && ns < toMin(r.endTime) && toMin(r.startTime) < ne) {
      acc.push({ sessionId: r.id, clubName: r.club?.name || 'Đội khác', days: hitDays, startTime: r.startTime, endTime: r.endTime, subCourts: hitCourts });
    }
    return acc;
  }, []);
}

export async function listPublicVenues() {
  return getOrSetCache('venues:public', PUBLIC_TTL_MS, async () => {
    const rows = await prisma.volleyballVenue.findMany({
      orderBy: [{ isDvaOfficial: 'desc' }, { isFeatured: 'desc' }, { name: 'asc' }],
      include: { clubs: { where: { isActive: true }, orderBy: { createdAt: 'asc' } }, sessions: { where: { club: { isActive: true } }, orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }], include: { club: true } } },
    });
    return rows.map((v) => ({ ...v, slug: v.slug || slugify(v.name), coverUrl: v.coverUrl || v.imageUrl || null, clubs: v.clubs.map(stripEmail), sessions: v.sessions.map((s) => ({ ...s, club: s.club ? stripEmail(s.club) : undefined })) }));
  });
}

export async function getPublicClubBySlug(slug: string) {
  const key = slug.trim().toLowerCase();
  return getOrSetCache(`venues:team:${key}`, PUBLIC_TTL_MS, async () => {
    const club = await prisma.courtClubProfile.findFirst({ where: { slug: key, isActive: true }, include: { venue: true, sessions: { orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }] } } });
    if (!club) throw new HttpError(404, 'Không tìm thấy hồ sơ đội bóng chuyền.');
    return { ...stripEmail(club), venue: { ...club.venue, slug: club.venue.slug || slugify(club.venue.name), coverUrl: club.venue.coverUrl || club.venue.imageUrl || null } };
  });
}

export async function listAdminVenues(actor?: Actor) {
  const isCaptain = actor?.role === 'CAPTAIN';
  const rows = await prisma.volleyballVenue.findMany({
    ...(isCaptain ? { where: { clubs: { some: { captainUserId: actor!.id } } } } : {}),
    orderBy: [{ isDvaOfficial: 'desc' }, { isFeatured: 'desc' }, { createdAt: 'desc' }],
    include: {
      clubs: {
        ...(isCaptain ? { where: { captainUserId: actor!.id } } : {}),
        orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
        include: { sessions: { orderBy: { startTime: 'asc' } }, captainUser: { select: CAPTAIN_USER_SELECT } },
      },
      sessions: {
        ...(isCaptain ? { where: { club: { captainUserId: actor!.id } } } : {}),
        orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
        include: { club: true },
      },
    },
  });
  return rows.map((v) => ({ ...v, slug: v.slug || slugify(v.name), coverUrl: v.coverUrl || v.imageUrl || null }));
}

export async function upsertVenue(data: Record<string, any>, id?: string) {
  const existing = id ? await prisma.volleyballVenue.findUnique({ where: { id } }) : null;
  if (id && !existing) throw new HttpError(404, 'Không tìm thấy địa điểm sân.');
  const p: Record<string, any> = {};
  for (const k of ['name', 'address', 'city', 'district', 'surfaceType', 'venueType'] as const) if (data[k] !== undefined) p[k] = data[k];
  for (const k of ['latitude', 'longitude', 'subCourtsCount'] as const) if (data[k] !== undefined) p[k] = Number(data[k]);
  for (const k of ['isDvaOfficial', 'isFeatured', 'isClosed'] as const) if (data[k] !== undefined) p[k] = Boolean(data[k]);
  for (const k of ['rentalPriceInfo', 'entryNote', 'closureReason'] as const) if (data[k] !== undefined) p[k] = data[k] ? String(data[k]) : null;
  if (data.closedUntil !== undefined) p.closedUntil = parseDate(data.closedUntil);
  if (data.coverUrl !== undefined) { const v = data.coverUrl ? String(data.coverUrl) : null; p.coverUrl = v; p.imageUrl = v; }
  if (!id || data.slug !== undefined) p.slug = await uniqueSlug('venue', data.slug || data.name || existing?.name || 'venue', id);
  const include = { clubs: { orderBy: [{ isActive: 'desc' as const }, { createdAt: 'asc' as const }] }, sessions: { orderBy: { startTime: 'asc' as const }, include: { club: true } } };
  const out = id ? await prisma.volleyballVenue.update({ where: { id }, data: p, include }) : await prisma.volleyballVenue.create({ data: p as any, include });
  invalidateCache('venues');
  return out;
}

export async function deleteVenue(id: string) {
  await prisma.volleyballVenue.delete({ where: { id } });
  invalidateCache('venues');
  return { success: true, id };
}

export async function upsertClub(venueId: string, data: Record<string, any>, clubId?: string, actor?: Actor) {
  const isCaptain = actor?.role === 'CAPTAIN';
  if (!(await prisma.volleyballVenue.findUnique({ where: { id: venueId }, select: { id: true } }))) throw new HttpError(isCaptain ? 403 : 404, isCaptain ? 'Bạn chỉ có quyền cập nhật đội bóng của chính mình.' : 'Không tìm thấy sân.');
  const existing = clubId ? await prisma.courtClubProfile.findFirst({ where: { id: clubId, venueId } }) : null;
  if (isCaptain) {
    if (!existing || existing.captainUserId !== actor!.id) throw new HttpError(403, 'Bạn chỉ có quyền cập nhật đội bóng của chính mình.');
  } else if (clubId && !existing) {
    throw new HttpError(404, 'Không tìm thấy CLB tại sân này.');
  }
  const p: Record<string, any> = {};
  const norm = (v: unknown) => (v ? String(v).trim() : null);
  if (isCaptain && existing) {
    if (
      (data.captainPhone !== undefined && norm(data.captainPhone) !== norm(existing.captainPhone)) ||
      (data.captainZalo !== undefined && norm(data.captainZalo) !== norm(existing.captainZalo)) ||
      (data.captainEmail !== undefined && norm(data.captainEmail) !== norm(existing.captainEmail))
    ) throw new HttpError(403, 'Liên hệ Quốc Duy (0768299329) nếu bạn muốn thay đổi SĐT, Zalo hoặc Gmail đội trưởng.');
    if (data.coverUrl !== undefined && norm(data.coverUrl) !== norm(existing.coverUrl)) {
      if (existing.coverUpdatedAt && Date.now() - existing.coverUpdatedAt.getTime() < QUOTA_30D_MS) {
        throw new HttpError(429, `Đã đổi ảnh bìa trong 30 ngày qua. Có thể đổi lại sau ngày ${formatVnDate(existing.coverUpdatedAt.getTime() + QUOTA_30D_MS)}.`);
      }
      p.coverUpdatedAt = new Date();
    }
    if (data.galleryUrls !== undefined) {
      const nextGal = Array.isArray(data.galleryUrls) ? data.galleryUrls : [];
      if (nextGal.length > 5) throw new HttpError(400, 'Thư viện ảnh đội tối đa 5 ảnh.');
      if (JSON.stringify(nextGal) !== JSON.stringify(existing.galleryUrls || [])) {
        if (existing.galleryUpdatedAt && Date.now() - existing.galleryUpdatedAt.getTime() < QUOTA_30D_MS) {
          throw new HttpError(429, `Đã cập nhật Gallery tháng này. Mở lại sau ngày ${formatVnDate(existing.galleryUpdatedAt.getTime() + QUOTA_30D_MS)}.`);
        }
        p.galleryUpdatedAt = new Date();
      }
    }
  }
  for (const k of ['name', 'captainName', 'playStyle', 'feeType'] as const) if (data[k] !== undefined) p[k] = data[k];
  for (const k of ['logoUrl', 'coverUrl', 'description', 'feeAmount'] as const) if (data[k] !== undefined) p[k] = data[k] ? String(data[k]) : null;
  if (!isCaptain) {
    if (data.captainPhone !== undefined) p.captainPhone = data.captainPhone;
    for (const k of ['captainZalo', 'captainEmail'] as const) if (data[k] !== undefined) p[k] = data[k] ? String(data[k]) : null;
  }
  if (data.galleryUrls !== undefined) p.galleryUrls = Array.isArray(data.galleryUrls) ? (isCaptain ? data.galleryUrls.slice(0, 5) : data.galleryUrls) : [];
  if (data.tags !== undefined) p.tags = Array.isArray(data.tags) ? data.tags.filter(Boolean) : [];
  if (!isCaptain && data.isActive !== undefined) p.isActive = Boolean(data.isActive);
  if (!isCaptain && data.captainUserId !== undefined) {
    if (!data.captainUserId) {
      p.captainUserId = null;
    } else {
      const uid = String(data.captainUserId);
      const u = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, role: true } });
      if (!u) throw new HttpError(404, 'Không tìm thấy tài khoản Đội trưởng.');
      if (u.role !== 'CAPTAIN') throw new HttpError(400, 'Tài khoản liên kết phải có vai trò CAPTAIN.');
      const taken = await prisma.courtClubProfile.findFirst({ where: { captainUserId: uid, ...(clubId ? { id: { not: clubId } } : {}) }, select: { name: true } });
      if (taken) throw new HttpError(409, `Tài khoản này đã được gán cho đội "${taken.name}".`);
      p.captainUserId = uid;
    }
  }
  if (!clubId || (!isCaptain && data.slug !== undefined)) p.slug = await uniqueSlug('club', data.slug || data.name || existing?.name || 'club', clubId);
  const include = { sessions: true, captainUser: { select: CAPTAIN_USER_SELECT } };
  const out = clubId ? await prisma.courtClubProfile.update({ where: { id: clubId }, data: p, include }) : await prisma.courtClubProfile.create({ data: { venueId, ...p } as any, include });
  invalidateCache('venues');
  return out;
}

export async function deleteClub(venueId: string, clubId: string) {
  if (!(await prisma.courtClubProfile.findFirst({ where: { id: clubId, venueId }, select: { id: true } }))) throw new HttpError(404, 'Không tìm thấy CLB.');
  await prisma.courtClubProfile.delete({ where: { id: clubId } });
  invalidateCache('venues');
  return { success: true, id: clubId };
}

export async function upsertSession(venueId: string, data: Record<string, any>, sessionId?: string, actor?: Actor) {
  const isCaptain = actor?.role === 'CAPTAIN';
  const existing = sessionId ? await prisma.venueSessionSlot.findFirst({ where: { id: sessionId, venueId }, include: { club: { select: { id: true, captainUserId: true } } } }) : null;
  if (isCaptain) {
    if (!existing || existing.club.captainUserId !== actor!.id) throw new HttpError(403, 'Bạn chỉ có quyền cập nhật ca chơi thuộc đội của chính mình.');
  } else if (sessionId && !existing) {
    throw new HttpError(404, 'Không tìm thấy ca sinh hoạt.');
  }
  const clubId = isCaptain ? existing!.clubId : (data.clubId ?? existing?.clubId);
  if (!(await prisma.courtClubProfile.findFirst({ where: { id: clubId, venueId }, select: { id: true } }))) throw new HttpError(404, 'Không tìm thấy CLB.');
  const [daysOfWeek, startTime, endTime, subCourts] = [data.daysOfWeek ?? existing!.daysOfWeek, data.startTime ?? existing!.startTime, data.endTime ?? existing!.endTime, data.subCourts ?? existing!.subCourts];
  if (toMin(endTime) <= toMin(startTime)) throw new HttpError(400, 'Giờ kết thúc phải lớn hơn giờ bắt đầu.');
  const scheduleChanged = !existing || data.daysOfWeek !== undefined || data.startTime !== undefined || data.endTime !== undefined || data.subCourts !== undefined;
  if (scheduleChanged) {
    const conflicts = await findSessionConflicts({ venueId, daysOfWeek, startTime, endTime, subCourts, excludeId: sessionId });
    if (conflicts.length && !data.forceOverride) {
      throw new SessionConflictError(`Trùng lịch sân con: ${conflicts.map((c) => `${c.clubName} (${c.days.map((d) => DAY_SHORT[d]).join(', ')} ${c.startTime}–${c.endTime} · ${c.subCourts.join(', ')})`).join('; ')}`, conflicts);
    }
  }
  const isCancelled = data.isCancelled !== undefined ? Boolean(data.isCancelled) : Boolean(existing?.isCancelled);
  const cancelledDates = data.cancelledDates !== undefined ? data.cancelledDates : (existing?.cancelledDates ?? []);
  const hasCancel = isCancelled || cancelledDates.length > 0;
  const cancelReason = hasCancel ? (data.cancelReason !== undefined ? (data.cancelReason ? String(data.cancelReason) : null) : existing?.cancelReason ?? null) : null;
  const capacityMode = data.capacityMode ?? existing?.capacityMode ?? 'UNLIMITED';
  const maxPlayers = data.maxPlayers !== undefined ? Math.max(1, Number(data.maxPlayers)) : (existing?.maxPlayers ?? 14);
  const currentPlayers = data.currentPlayers !== undefined ? Math.max(0, Number(data.currentPlayers)) : (existing?.currentPlayers ?? 0);
  const neededPositions = data.neededPositions !== undefined ? data.neededPositions : (existing?.neededPositions ?? []);
  const dailyOverrides = data.dailyOverrides !== undefined ? data.dailyOverrides : ((existing?.dailyOverrides as Record<string, any>) ?? {});
  const genderRule = data.genderRule ?? existing?.genderRule ?? 'MIXED';
  const skillRankLabel = data.skillRankLabel !== undefined ? (data.skillRankLabel ? String(data.skillRankLabel).trim() : null) : (existing?.skillRankLabel ?? null);
  const p = { clubId, daysOfWeek, startTime, endTime, subCourts, recruitmentStatus: data.recruitmentStatus ?? existing?.recruitmentStatus ?? 'CHECK_CAPTAIN', isCancelled, cancelledDates, cancelReason, capacityMode, currentPlayers, maxPlayers, neededPositions, dailyOverrides, genderRule, skillRankLabel };
  const out = sessionId ? await prisma.venueSessionSlot.update({ where: { id: sessionId }, data: p, include: { club: true } }) : await prisma.venueSessionSlot.create({ data: { venueId, ...p }, include: { club: true } });
  invalidateCache('venues');
  return out;
}

export async function deleteSession(venueId: string, sessionId: string) {
  if (!(await prisma.venueSessionSlot.findFirst({ where: { id: sessionId, venueId }, select: { id: true } }))) throw new HttpError(404, 'Không tìm thấy ca sinh hoạt.');
  await prisma.venueSessionSlot.delete({ where: { id: sessionId } });
  invalidateCache('venues');
  return { success: true, id: sessionId };
}
