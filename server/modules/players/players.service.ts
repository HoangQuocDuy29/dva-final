import crypto from 'crypto';
import { readJsonFileSafe } from '../../config/env';
import {
  extractBirthYearFromDob,
  normalizeSquad,
  prisma,
  toCoachDto,
  toPlayerDto,
} from '../../config/prisma';
import { getOrSetCache, invalidateCache } from '../../utils/cache';
import { HttpError } from '../../utils/validation';
import { LEVELS, POSITIONS } from '../../utils/schemas';
import { countryCodeToFlagEmoji } from '../../../src/types';

export interface PlayerQueryFilters {
  level?: string;
  position?: string;
  search?: string;
  all?: string;
  isActive?: string;
  staff: boolean;
}

async function enrichMissingBornYears(
  dbPlayers: Array<Record<string, any> & { user?: { email?: string | null } | null }>
): Promise<void> {
  const missing = dbPlayers.filter((p) => !p.bornYear || Number(p.bornYear) <= 0);
  if (missing.length === 0) return;

  const normalizeName = (v: unknown) => String(v || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const uniqueNames = Array.from(new Set(missing.map((p) => String(p.fullName || '').trim()).filter(Boolean)));
  const uniqueEmails = Array.from(
    new Set(missing.map((p) => String(p.user?.email || '').trim().toLowerCase()).filter(Boolean))
  );
  if (uniqueNames.length === 0 && uniqueEmails.length === 0) return;

  const orConditions: Record<string, any>[] = [
    ...uniqueNames.map((name) => ({ fullName: { equals: name, mode: 'insensitive' } })),
    ...uniqueEmails.map((email) => ({ gmail: { equals: email, mode: 'insensitive' } })),
  ];

  try {
    const matchedApps = await prisma.memberApplication.findMany({
      where: { OR: orConditions },
      select: { fullName: true, gmail: true, dob: true, status: true, approvedAt: true, createdAt: true },
      orderBy: [{ approvedAt: 'desc' }, { createdAt: 'desc' }],
    });
    if (matchedApps.length === 0) return;

    // Prefer APPROVED applications first, then most recent
    const sortedApps = [...matchedApps].sort((a, b) => {
      const statusDiff = (b.status === 'APPROVED' ? 1 : 0) - (a.status === 'APPROVED' ? 1 : 0);
      if (statusDiff !== 0) return statusDiff;
      const bTime = (b.approvedAt ?? b.createdAt)?.getTime?.() ?? 0;
      const aTime = (a.approvedAt ?? a.createdAt)?.getTime?.() ?? 0;
      return bTime - aTime;
    });

    const yearByEmail = new Map<string, number>();
    const yearByName = new Map<string, number>();
    for (const app of sortedApps) {
      const year = extractBirthYearFromDob(app.dob);
      if (!year) continue;
      const emailKey = String(app.gmail || '').trim().toLowerCase();
      const nameKey = normalizeName(app.fullName);
      if (emailKey && !yearByEmail.has(emailKey)) yearByEmail.set(emailKey, year);
      if (nameKey && !yearByName.has(nameKey)) yearByName.set(nameKey, year);
    }

    for (const player of missing) {
      const emailKey = String(player.user?.email || '').trim().toLowerCase();
      const nameKey = normalizeName(player.fullName);
      const fallbackYear = (emailKey ? yearByEmail.get(emailKey) : undefined) ?? yearByName.get(nameKey);
      if (fallbackYear) {
        player.bornYear = fallbackYear;
      }
    }
  } catch (err) {
    console.warn('[Players Service] Failed to fallback bornYear from MemberApplication:', err);
  }
}

export async function listPlayers(filters: PlayerQueryFilters) {
  const { level, position, search, all, isActive, staff } = filters;

  const queryDb = async () => {
    const where: Record<string, any> = {};
    if (typeof level === 'string') {
      const normalizedLevel = normalizeSquad(level).toUpperCase();
      if (LEVELS.includes(normalizedLevel as any)) {
        where.level = normalizedLevel;
      }
    }
    if (typeof position === 'string' && POSITIONS.includes(position.toUpperCase() as any)) {
      where.position = position.toUpperCase();
    }
    if (typeof search === 'string' && search.trim()) {
      const q = search.trim();
      const num = Number(q);
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { hometownCountry: { contains: q, mode: 'insensitive' } },
        ...(Number.isInteger(num) ? [{ jerseyNumber: num }] : []),
      ];
    }

    if (!staff || all === 'false') {
      where.isActive = true;
    } else if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    try {
      const dbPlayers = await prisma.player.findMany({
        where,
        include: { user: { select: { email: true } } },
        orderBy: [{ level: 'asc' }, { isCaptain: 'desc' }, { jerseyNumber: 'asc' }],
      });
      await enrichMissingBornYears(dbPlayers);
      return dbPlayers.map(toPlayerDto);
    } catch (error) {
      console.error('[API /players Error]:', error);
      const fallbackPlayers = readJsonFileSafe<any[]>('players.json', []);
      let mapped = (fallbackPlayers || []).map(toPlayerDto);

      if (typeof level === 'string') {
        const targetLevel = normalizeSquad(level).toUpperCase();
        mapped = mapped.filter((p) => p.level === targetLevel);
      }
      if (typeof position === 'string' && POSITIONS.includes(position.toUpperCase() as any)) {
        const targetPos = position.toUpperCase();
        mapped = mapped.filter((p) => p.position === targetPos);
      }
      if (typeof search === 'string' && search.trim()) {
        const q = search.trim().toLowerCase();
        mapped = mapped.filter(
          (p) =>
            p.fullName.toLowerCase().includes(q) ||
            p.hometownCountry.toLowerCase().includes(q) ||
            String(p.jerseyNumber) === q
        );
      }
      if (!staff || all === 'false') {
        mapped = mapped.filter((p) => p.isActive !== false);
      } else if (isActive !== undefined) {
        const activeFilter = isActive === 'true';
        mapped = mapped.filter((p) => (p.isActive !== false) === activeFilter);
      }
      const levelRank = (lvl: string) => {
        const idx = LEVELS.indexOf(lvl as any);
        return idx === -1 ? LEVELS.length : idx;
      };
      mapped.sort(
        (a, b) =>
          levelRank(a.level) - levelRank(b.level) ||
          Number(Boolean(b.isCaptain)) - Number(Boolean(a.isCaptain)) ||
          a.jerseyNumber - b.jerseyNumber
      );
      return mapped;
    }
  };

  if (!staff || all === 'false') {
    const cacheKey = `players:public:${level || 'all'}:${position || 'all'}:${(search || '').trim().toLowerCase()}`;
    return getOrSetCache(cacheKey, 90_000, queryDb);
  }
  return queryDb();
}

export async function createPlayer(data: Record<string, any>) {
  const resolvedCountryName = data.country ?? data.countryName ?? 'Vietnam';
  const resolvedCountryCode = (data.countryCode || 'VN').toUpperCase();
  const resolvedCountryFlag = data.countryFlag || countryCodeToFlagEmoji(resolvedCountryCode);
  const resolvedJoinedYear = data.joined ?? data.joinedYear ?? new Date().getFullYear();

  const created = await prisma.player.create({
    data: {
      id: `p-${crypto.randomUUID()}`,
      fullName: data.fullName,
      jerseyNumber: data.jerseyNumber,
      height: data.height ?? 185,
      weight: data.weight ?? 75,
      spikeTouch: data.spikeTouch ?? 325,
      blockTouch: data.blockTouch ?? 310,
      hometownCountry: data.hometownCountry || 'Việt Nam',
      countryName: resolvedCountryName,
      countryCode: resolvedCountryCode,
      countryFlag: resolvedCountryFlag,
      bornYear: data.bornYear ?? null,
      level: data.level,
      skillRank: data.skillRank ?? null,
      position: data.position,
      avatarUrl: data.avatarUrl || '',
      bio: data.bio || '',
      isCaptain: Boolean(data.isCaptain ?? data.captain),
      joinedYear: Number(resolvedJoinedYear) || new Date().getFullYear(),
    },
  });
  invalidateCache(['players', 'home']);
  return toPlayerDto(created);
}

export async function updatePlayer(id: string, data: Record<string, any>) {
  const existing = await prisma.player.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Player not found');

  const { captain, country, joined, squad: _s, category: _c, team: _t, ...rest } = data;
  const resolvedCountryName = rest.countryName ?? country;
  const resolvedCountryCode = rest.countryCode ? rest.countryCode.toUpperCase() : undefined;
  const resolvedCountryFlag =
    rest.countryFlag ?? (resolvedCountryCode ? countryCodeToFlagEmoji(resolvedCountryCode) : undefined);
  const resolvedJoinedYear = rest.joinedYear ?? joined;

  const updated = await prisma.player.update({
    where: { id },
    data: {
      ...rest,
      ...(resolvedCountryName !== undefined ? { countryName: resolvedCountryName } : {}),
      ...(resolvedCountryCode !== undefined ? { countryCode: resolvedCountryCode } : {}),
      ...(resolvedCountryFlag !== undefined ? { countryFlag: resolvedCountryFlag } : {}),
      ...(resolvedJoinedYear !== undefined ? { joinedYear: Number(resolvedJoinedYear) } : {}),
      ...(captain !== undefined && rest.isCaptain === undefined ? { isCaptain: Boolean(captain) } : {}),
    },
  });
  invalidateCache(['players', 'home']);
  return toPlayerDto(updated);
}

export async function deletePlayer(id: string) {
  const existing = await prisma.player.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Player not found');
  await prisma.player.delete({ where: { id } });
  invalidateCache(['players', 'home']);
  return { success: true, message: 'Player deleted' };
}

export async function updatePlayerLevel(id: string, level: 'SENIOR' | 'JUNIOR' | 'YOUTH') {
  const existing = await prisma.player.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Player not found');
  const updated = await prisma.player.update({ where: { id }, data: { level } });
  invalidateCache(['players', 'home']);
  return toPlayerDto(updated);
}

export async function togglePlayerVisibility(id: string, requestedIsActive?: boolean) {
  const existing = await prisma.player.findUnique({ where: { id }, select: { id: true, isActive: true } });
  if (!existing) throw new HttpError(404, 'Player not found');
  const targetIsActive = typeof requestedIsActive === 'boolean' ? requestedIsActive : !existing.isActive;
  const updated = await prisma.player.update({ where: { id }, data: { isActive: targetIsActive } });
  invalidateCache(['players', 'home']);
  return toPlayerDto(updated);
}

// ----------------------------------------------------------------------------
// Coaches
// ----------------------------------------------------------------------------
export async function listCoaches(staff: boolean) {
  const loader = async () => {
    const dbCoaches = await prisma.coachProfile.findMany({ orderBy: { createdAt: 'asc' } });
    return dbCoaches.map(toCoachDto);
  };
  if (!staff) {
    return getOrSetCache('coaches:public', 120_000, loader);
  }
  return loader();
}

export async function createCoach(data: Record<string, any>) {
  const created = await prisma.coachProfile.create({
    data: {
      id: `coach-${crypto.randomUUID()}`,
      name: data.name,
      role: data.role || '',
      experience: data.experience || '',
      height: data.height || '',
      age: data.age ?? 25,
      bornYear: data.bornYear ?? 2000,
      avatarUrl: data.avatarUrl || '',
      specialty: data.specialty || '',
      bio: data.bio || '',
      certifications: data.certifications || [],
    },
  });
  invalidateCache('coaches');
  return toCoachDto(created);
}

export async function updateCoach(id: string, data: Record<string, any>) {
  const existing = await prisma.coachProfile.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Coach not found');
  const updated = await prisma.coachProfile.update({ where: { id }, data });
  invalidateCache('coaches');
  return toCoachDto(updated);
}

export async function deleteCoach(id: string) {
  const existing = await prisma.coachProfile.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Coach not found');
  await prisma.coachProfile.delete({ where: { id } });
  invalidateCache('coaches');
  return { success: true, message: 'Coach deleted' };
}
