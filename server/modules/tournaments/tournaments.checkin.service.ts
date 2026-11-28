import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { invalidateCache } from '../../utils/cache';
import { HttpError } from '../../utils/validation';
import {
  buildPositionMatrix,
  isCheckInDeadlinePassed,
  isValidVnPhone,
  normalizeCheckInPhone,
  normalizePositionQuotas,
} from '../../../src/shared/tournaments';
import type {
  PlayerGender,
  PlayerLevel,
  PublicCheckInAttendee,
  PublicCheckInSquadOption,
  SkillRank,
  TournamentCheckIn,
  TournamentCheckInAdminResponse,
  TournamentCheckInPublicResponse,
  TournamentCheckInStatus,
  TournamentCheckInSubmitResponse,
  TournamentMode,
  TournamentStatus,
  VolleyballPosition,
} from '../../../src/types';

function toAdminCheckInDto(row: any): TournamentCheckIn {
  return {
    id: row.id,
    tournamentId: row.tournamentId,
    playerId: row.playerId ?? null,
    isGuest: row.playerId == null,
    fullName: row.fullName,
    birthYear: Number(row.birthYear),
    gender: (row.gender === 'FEMALE' ? 'FEMALE' : 'MALE') as PlayerGender,
    position: row.position as VolleyballPosition,
    skillRank: row.skillRank as SkillRank,
    spikeTouch: row.spikeTouch !== null && row.spikeTouch !== undefined ? Number(row.spikeTouch) : null,
    blockTouch: row.blockTouch !== null && row.blockTouch !== undefined ? Number(row.blockTouch) : null,
    jerseyNumber: row.jerseyNumber !== null && row.jerseyNumber !== undefined ? Number(row.jerseyNumber) : null,
    phone: row.phone,
    status: (row.status === 'RESERVE' ? 'RESERVE' : 'CONFIRMED') as TournamentCheckInStatus,
    note: row.note ?? null,
    isPaid: Boolean(row.isPaid),
    paidAt: row.paidAt instanceof Date ? row.paidAt.toISOString() : row.paidAt ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

function toPublicAttendeeDto(row: {
  id: string;
  playerId: string | null;
  fullName: string;
  position: string;
  jerseyNumber: number | null;
  status: string;
}): PublicCheckInAttendee {
  return {
    id: row.id,
    fullName: row.fullName,
    position: row.position as VolleyballPosition,
    jerseyNumber: row.jerseyNumber !== null && row.jerseyNumber !== undefined ? Number(row.jerseyNumber) : null,
    status: (row.status === 'RESERVE' ? 'RESERVE' : 'CONFIRMED') as TournamentCheckInStatus,
    isGuest: row.playerId == null,
  };
}

/**
 * Public check-in view payload: tournament info, live position counts, active Squad picker,
 * and safe public attendees list (strictly NO phone numbers, notes, birthYear, or payment state).
 */
export async function getPublicTournamentCheckIn(
  slugOrId: string
): Promise<TournamentCheckInPublicResponse | null> {
  const tournament = await prisma.tournament.findFirst({
    where: {
      OR: [{ id: slugOrId }, { slug: slugOrId }],
      isActive: true,
      status: { not: 'CANCELLED' },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      subtitle: true,
      mode: true,
      status: true,
      startDate: true,
      endDate: true,
      startTime: true,
      endTime: true,
      location: true,
      mapsUrl: true,
      registrationDeadline: true,
      registrationDeadlineTime: true,
      isRegistrationOpen: true,
      isRosterLocked: true,
      positionQuotas: true,
      quotaHardLock: true,
      feePerPlayer: true,
    },
  });

  if (!tournament) return null;

  const positionQuotas = normalizePositionQuotas(tournament.positionQuotas);
  const checkInEnabled = tournament.mode === 'PARTICIPATING' && positionQuotas !== null;
  const isExpired = isCheckInDeadlinePassed(
    tournament.registrationDeadline,
    tournament.registrationDeadlineTime
  );
  const canSubmit =
    checkInEnabled &&
    tournament.isRegistrationOpen &&
    !tournament.isRosterLocked &&
    tournament.status === 'UPCOMING' &&
    !isExpired;

  // Public query strictly selects ONLY safe columns (never phone, note, isPaid, birthYear)
  const [checkIns, players] = await Promise.all([
    prisma.tournamentCheckIn.findMany({
      where: { tournamentId: tournament.id },
      select: {
        id: true,
        playerId: true,
        fullName: true,
        position: true,
        jerseyNumber: true,
        status: true,
      },
      orderBy: [{ createdAt: 'asc' }],
    }),
    prisma.player.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        jerseyNumber: true,
        position: true,
        level: true,
        bornYear: true,
        gender: true,
        skillRank: true,
        spikeTouch: true,
        blockTouch: true,
        user: { select: { phoneNumber: true } },
      },
      orderBy: [{ level: 'asc' }, { isCaptain: 'desc' }, { jerseyNumber: 'asc' }, { fullName: 'asc' }],
    }),
  ]);

  const attendees = checkIns.map(toPublicAttendeeDto);
  const matrix = buildPositionMatrix(positionQuotas, attendees);
  const checkedInPlayerIds = new Set(
    checkIns.map((c) => c.playerId).filter((pid): pid is string => Boolean(pid))
  );

  const squadOptions: PublicCheckInSquadOption[] = players.map((p) => {
    const rawUserPhone = p.user?.phoneNumber || '';
    const hasAccountPhone = Boolean(rawUserPhone && isValidVnPhone(normalizeCheckInPhone(rawUserPhone)));
    return {
      id: p.id,
      fullName: p.fullName,
      jerseyNumber: Number(p.jerseyNumber) || 0,
      position: p.position as VolleyballPosition,
      level: p.level as PlayerLevel,
      bornYear: p.bornYear ?? null,
      gender: p.gender === 'MALE' || p.gender === 'FEMALE' ? (p.gender as PlayerGender) : null,
      skillRank: (p.skillRank as SkillRank | null) ?? null,
      spikeTouch: p.spikeTouch !== null && p.spikeTouch !== undefined ? Number(p.spikeTouch) : null,
      blockTouch: p.blockTouch !== null && p.blockTouch !== undefined ? Number(p.blockTouch) : null,
      hasAccountPhone,
      alreadyCheckedIn: checkedInPlayerIds.has(p.id),
    };
  });

  return {
    tournament: {
      id: tournament.id,
      slug: tournament.slug,
      name: tournament.name,
      subtitle: tournament.subtitle ?? undefined,
      mode: tournament.mode as TournamentMode,
      status: tournament.status as TournamentStatus,
      startDate: tournament.startDate,
      endDate: tournament.endDate ?? undefined,
      startTime: tournament.startTime ?? undefined,
      endTime: tournament.endTime ?? undefined,
      location: tournament.location,
      mapsUrl: tournament.mapsUrl ?? undefined,
      registrationDeadline: tournament.registrationDeadline ?? undefined,
      registrationDeadlineTime: tournament.registrationDeadlineTime ?? undefined,
      isRegistrationOpen: Boolean(tournament.isRegistrationOpen),
      isRosterLocked: Boolean(tournament.isRosterLocked),
      positionQuotas,
      quotaHardLock: Boolean(tournament.quotaHardLock),
      feePerPlayer: Math.max(0, Number(tournament.feePerPlayer) || 0),
    },
    checkInEnabled,
    isExpired,
    canSubmit,
    counts: matrix.counts,
    totals: {
      confirmed: matrix.totalConfirmed,
      reserve: matrix.totalReserve,
      totalQuota: matrix.totalQuota,
    },
    attendees,
    squadOptions,
  };
}

/**
 * Public check-in submission (Squad or Guest) with serializable quota enforcement,
 * automatic hard-lock downgrade to RESERVE, and deduplication on (tournamentId, playerId) & (tournamentId, phone).
 */
export async function submitPublicTournamentCheckIn(
  slugOrId: string,
  data: Record<string, any>
): Promise<TournamentCheckInSubmitResponse> {
  const tournament = await prisma.tournament.findFirst({
    where: {
      OR: [{ id: slugOrId }, { slug: slugOrId }],
      isActive: true,
      status: { not: 'CANCELLED' },
    },
  });

  if (!tournament) {
    throw new HttpError(404, 'Không tìm thấy giải đấu hoặc giải đã bị ẩn.');
  }

  const positionQuotas = normalizePositionQuotas(tournament.positionQuotas);
  if (tournament.mode !== 'PARTICIPATING' || !positionQuotas) {
    throw new HttpError(400, 'Giải đấu này chưa bật tính năng điểm danh giải mời.');
  }

  if (tournament.status !== 'UPCOMING' || !tournament.isRegistrationOpen || tournament.isRosterLocked) {
    throw new HttpError(403, 'Cổng điểm danh giải đấu hiện đang đóng hoặc đã khóa danh sách.');
  }

  if (isCheckInDeadlinePassed(tournament.registrationDeadline, tournament.registrationDeadlineTime)) {
    throw new HttpError(403, 'Đã quá thời hạn điểm danh cho giải đấu này.');
  }

  const rawPlayerId = typeof data.playerId === 'string' && data.playerId.trim() ? data.playerId.trim() : null;
  const requestedStatus: TournamentCheckInStatus = data.status === 'RESERVE' ? 'RESERVE' : 'CONFIRMED';
  const note = typeof data.note === 'string' && data.note.trim() ? data.note.trim().slice(0, 200) : null;

  let playerId: string | null = null;
  let fullName: string;
  let birthYear: number;
  let gender: PlayerGender;
  let position: VolleyballPosition;
  let skillRank: SkillRank;
  let spikeTouch: number | null = null;
  let blockTouch: number | null = null;
  let jerseyNumber: number | null = null;
  let normalizedPhone: string;

  if (rawPlayerId) {
    const squadPlayer = await prisma.player.findFirst({
      where: { id: rawPlayerId, isActive: true },
      include: { user: { select: { phoneNumber: true } } },
    });
    if (!squadPlayer) {
      throw new HttpError(404, 'Không tìm thấy VĐV trong danh sách Squad hiện có.');
    }

    playerId = squadPlayer.id;
    fullName = squadPlayer.fullName;
    birthYear =
      squadPlayer.bornYear && squadPlayer.bornYear >= 1950
        ? squadPlayer.bornYear
        : typeof data.birthYear === 'number'
          ? data.birthYear
          : 2000;
    gender =
      squadPlayer.gender === 'MALE' || squadPlayer.gender === 'FEMALE'
        ? (squadPlayer.gender as PlayerGender)
        : data.gender === 'FEMALE'
          ? 'FEMALE'
          : 'MALE';
    position = (data.position || squadPlayer.position) as VolleyballPosition;
    skillRank = (squadPlayer.skillRank || data.skillRank || 'B') as SkillRank;
    spikeTouch =
      squadPlayer.spikeTouch !== null && squadPlayer.spikeTouch !== undefined
        ? Number(squadPlayer.spikeTouch)
        : null;
    blockTouch =
      squadPlayer.blockTouch !== null && squadPlayer.blockTouch !== undefined
        ? Number(squadPlayer.blockTouch)
        : null;
    jerseyNumber =
      squadPlayer.jerseyNumber !== null && squadPlayer.jerseyNumber !== undefined
        ? Number(squadPlayer.jerseyNumber)
        : null;

    const rawPhone =
      typeof data.phone === 'string' && data.phone.trim()
        ? data.phone.trim()
        : squadPlayer.user?.phoneNumber || '';
    normalizedPhone = normalizeCheckInPhone(rawPhone);
    if (!isValidVnPhone(normalizedPhone)) {
      throw new HttpError(400, 'Vui lòng nhập Số Zalo / SĐT hợp lệ (10 số bắt đầu bằng 0).');
    }
  } else {
    if (!data.fullName || typeof data.fullName !== 'string' || data.fullName.trim().length < 2) {
      throw new HttpError(400, 'Vui lòng nhập Họ và tên (tối thiểu 2 ký tự).');
    }
    if (typeof data.birthYear !== 'number' || data.birthYear < 1950 || data.birthYear > 2016) {
      throw new HttpError(400, 'Vui lòng nhập Năm sinh hợp lệ (1950–2016).');
    }
    if (data.gender !== 'MALE' && data.gender !== 'FEMALE') {
      throw new HttpError(400, 'Vui lòng chọn Giới tính.');
    }
    if (!data.position) {
      throw new HttpError(400, 'Vui lòng chọn Vị trí thi đấu.');
    }
    if (!data.skillRank) {
      throw new HttpError(400, 'Vui lòng chọn Phân hạng trình độ USAV.');
    }
    normalizedPhone = normalizeCheckInPhone(String(data.phone || ''));
    if (!isValidVnPhone(normalizedPhone)) {
      throw new HttpError(400, 'Vui lòng nhập Số Zalo / SĐT hợp lệ (10 số bắt đầu bằng 0).');
    }

    fullName = data.fullName.trim();
    birthYear = data.birthYear;
    gender = data.gender as PlayerGender;
    position = data.position as VolleyballPosition;
    skillRank = data.skillRank as SkillRank;
    spikeTouch = typeof data.spikeTouch === 'number' ? data.spikeTouch : null;
    blockTouch = typeof data.blockTouch === 'number' ? data.blockTouch : null;
    jerseyNumber = typeof data.jerseyNumber === 'number' ? data.jerseyNumber : null;
  }

  const runCheckInTx = async () => {
    return prisma.$transaction(
      async (tx) => {
        if (playerId) {
          const dupPlayer = await tx.tournamentCheckIn.findUnique({
            where: { tournamentId_playerId: { tournamentId: tournament.id, playerId } },
            select: { id: true, status: true, position: true },
          });
          if (dupPlayer) {
            const label = dupPlayer.status === 'CONFIRMED' ? 'Chắc chắn tham gia' : 'Dự bị';
            throw new HttpError(
              409,
              `Bạn đã điểm danh cho giải này rồi (Vị trí ${dupPlayer.position} · ${label}).`
            );
          }
        }

        const dupPhone = await tx.tournamentCheckIn.findUnique({
          where: { tournamentId_phone: { tournamentId: tournament.id, phone: normalizedPhone } },
          select: { id: true, fullName: true, status: true, position: true },
        });
        if (dupPhone) {
          const label = dupPhone.status === 'CONFIRMED' ? 'Chắc chắn tham gia' : 'Dự bị';
          throw new HttpError(
            409,
            `Số Zalo / SĐT này đã được dùng để điểm danh (${dupPhone.fullName} · ${dupPhone.position} · ${label}).`
          );
        }

        const confirmedCount = await tx.tournamentCheckIn.count({
          where: {
            tournamentId: tournament.id,
            status: 'CONFIRMED',
            position,
          },
        });

        const posQuota = Math.max(0, Number(positionQuotas[position]) || 0);
        let finalStatus: TournamentCheckInStatus = requestedStatus;
        let downgraded = false;

        if (tournament.quotaHardLock && requestedStatus === 'CONFIRMED' && confirmedCount >= posQuota) {
          finalStatus = 'RESERVE';
          downgraded = true;
        }

        const created = await tx.tournamentCheckIn.create({
          data: {
            tournamentId: tournament.id,
            playerId,
            fullName,
            birthYear,
            gender,
            position,
            skillRank,
            spikeTouch,
            blockTouch,
            jerseyNumber,
            phone: normalizedPhone,
            status: finalStatus,
            note,
          },
          select: {
            id: true,
            playerId: true,
            fullName: true,
            position: true,
            jerseyNumber: true,
            status: true,
          },
        });

        return { created, finalStatus, downgraded };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  };

  let txResult: {
    created: {
      id: string;
      playerId: string | null;
      fullName: string;
      position: string;
      jerseyNumber: number | null;
      status: string;
    };
    finalStatus: TournamentCheckInStatus;
    downgraded: boolean;
  };

  try {
    txResult = await runCheckInTx();
  } catch (err: any) {
    // Retry once on Serializable write conflict (P2034)
    if (err?.code === 'P2034') {
      try {
        txResult = await runCheckInTx();
      } catch (retryErr: any) {
        if (retryErr?.code === 'P2002') {
          throw new HttpError(409, 'Bạn hoặc Số Zalo / SĐT này đã điểm danh cho giải đấu này rồi.');
        }
        throw retryErr;
      }
    } else if (err?.code === 'P2002') {
      throw new HttpError(409, 'Bạn hoặc Số Zalo / SĐT này đã điểm danh cho giải đấu này rồi.');
    } else {
      throw err;
    }
  }

  // Non-blocking soft hint if Guest matches an active Squad player (same name + birthYear)
  let squadMatchHint: string | null = null;
  if (!playerId) {
    try {
      const matched = await prisma.player.findFirst({
        where: {
          isActive: true,
          fullName: { equals: fullName, mode: 'insensitive' },
          bornYear: birthYear,
        },
        select: { fullName: true, level: true },
      });
      if (matched) {
        squadMatchHint = `Tên và năm sinh của bạn khớp với thành viên ${matched.fullName} (Squad ${matched.level}). Lần sau bạn có thể chọn nhanh ở tab "Đã có trong Squad".`;
      }
    } catch {
      // ignore non-critical hint lookup failure
    }
  }

  invalidateCache('tournaments');

  return {
    checkIn: toPublicAttendeeDto(txResult.created),
    status: txResult.finalStatus,
    downgraded: txResult.downgraded,
    squadMatchHint,
  };
}

/**
 * SUPERADMIN only: full list of check-ins (Squad + Guests with phone & metrics) + position matrix & fee totals.
 */
export async function listAdminTournamentCheckIns(
  tournamentId: string
): Promise<TournamentCheckInAdminResponse> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      slug: true,
      name: true,
      positionQuotas: true,
      quotaHardLock: true,
      feePerPlayer: true,
      registrationDeadline: true,
      registrationDeadlineTime: true,
      isRegistrationOpen: true,
    },
  });

  if (!tournament) {
    throw new HttpError(404, 'Tournament not found.');
  }

  const rows = await prisma.tournamentCheckIn.findMany({
    where: { tournamentId },
    orderBy: [{ createdAt: 'asc' }],
  });

  const checkIns = rows.map(toAdminCheckInDto);
  const positionQuotas = normalizePositionQuotas(tournament.positionQuotas);
  const matrix = buildPositionMatrix(positionQuotas, checkIns);
  const feePerPlayer = Math.max(0, Number(tournament.feePerPlayer) || 0);
  const paidCount = checkIns.filter((c) => c.isPaid).length;

  return {
    tournamentId: tournament.id,
    slug: tournament.slug,
    name: tournament.name,
    positionQuotas,
    quotaHardLock: Boolean(tournament.quotaHardLock),
    feePerPlayer,
    registrationDeadline: tournament.registrationDeadline ?? undefined,
    registrationDeadlineTime: tournament.registrationDeadlineTime ?? undefined,
    isRegistrationOpen: Boolean(tournament.isRegistrationOpen),
    checkIns,
    counts: matrix.counts,
    summary: {
      totalConfirmed: matrix.totalConfirmed,
      totalReserve: matrix.totalReserve,
      totalQuota: matrix.totalQuota,
      paidCount,
      collectedAmount: paidCount * feePerPlayer,
      expectedAmount: matrix.totalConfirmed * feePerPlayer,
      isReadyToAccept: matrix.isReadyToAccept,
      missingPositions: matrix.missingPositions,
    },
  };
}

/**
 * SUPERADMIN only: update check-in status (CONFIRMED <-> RESERVE), payment flag, position, jerseyNumber, or note.
 */
export async function updateAdminTournamentCheckIn(
  checkInId: string,
  data: Record<string, any>,
  rawBody: Record<string, any>
): Promise<TournamentCheckIn> {
  const existing = await prisma.tournamentCheckIn.findUnique({ where: { id: checkInId } });
  if (!existing) {
    throw new HttpError(404, 'Check-in record not found.');
  }

  const updatePayload: Record<string, any> = {};
  if (data.status === 'CONFIRMED' || data.status === 'RESERVE') {
    updatePayload.status = data.status;
  }
  if (data.position) {
    updatePayload.position = data.position;
  }
  if (typeof data.isPaid === 'boolean') {
    updatePayload.isPaid = data.isPaid;
    updatePayload.paidAt = data.isPaid ? existing.paidAt ?? new Date() : null;
  }
  if (rawBody && Object.prototype.hasOwnProperty.call(rawBody, 'note')) {
    updatePayload.note =
      rawBody.note === null || String(rawBody.note).trim() === ''
        ? null
        : (data.note ?? String(rawBody.note).trim().slice(0, 200));
  }
  if (rawBody && Object.prototype.hasOwnProperty.call(rawBody, 'jerseyNumber')) {
    updatePayload.jerseyNumber =
      rawBody.jerseyNumber === null || rawBody.jerseyNumber === ''
        ? null
        : data.jerseyNumber;
  }

  const updated = await prisma.tournamentCheckIn.update({
    where: { id: checkInId },
    data: updatePayload,
  });

  invalidateCache('tournaments');
  return toAdminCheckInDto(updated);
}

/**
 * SUPERADMIN only: delete a check-in record.
 */
export async function deleteAdminTournamentCheckIn(checkInId: string): Promise<{ success: boolean }> {
  const existing = await prisma.tournamentCheckIn.findUnique({
    where: { id: checkInId },
    select: { id: true },
  });
  if (!existing) {
    throw new HttpError(404, 'Check-in record not found.');
  }

  await prisma.tournamentCheckIn.delete({ where: { id: checkInId } });
  invalidateCache('tournaments');
  return { success: true };
}
