import crypto from 'crypto';
import { env } from '../../config/env';
import {
  normalizeSquad,
  prisma,
  toTournamentDto,
  toTournamentFinanceSummaryDto,
  toTournamentMatchDto,
  toTournamentOfficialDto,
  toTournamentPlayerDto,
  toTournamentTeamDto,
} from '../../config/prisma';
import { getOrSetCache, invalidateCache } from '../../utils/cache';
import { HttpError } from '../../utils/validation';
import {
  buildBookingVietQrUrl,
  generateTournamentTransferContent,
  sendAdminNotification,
  sendTournamentRegistrationEmail,
} from '../../utils/email.service';
import {
  BracketSlotPlan,
  DREAM_TEAM_AWARD_CODES,
  DREAM_TEAM_SLOTS,
  buildFinalsSlotPlans,
  buildGroupStage12MatchPlan,
  buildQuarterfinalSlotPlans,
  buildSemifinalSlotPlans,
  computeSetTotals,
  getSetTargetPoints,
  isVolleyballSetWon,
  normalizeTournamentCourtName,
  slugifyTournamentName,
} from '../../utils/standings.engine';
import type { TournamentSetFormat } from '../../../src/types';

export const TOURNAMENT_FULL_INCLUDE = {
  teams: {
    orderBy: [{ pool: 'asc' as const }, { seedOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  players: {
    orderBy: [{ isCaptain: 'desc' as const }, { jerseyNumber: 'asc' as const }],
  },
  matches: {
    orderBy: [{ matchOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  officials: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
};

async function generateUniqueTournamentSlug(raw: string, excludeId?: string): Promise<string> {
  const base = slugifyTournamentName(raw);
  let candidate = base;
  for (let i = 0; i < 6; i++) {
    const existing = await prisma.tournament.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${crypto.randomInt(100, 999)}`;
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

async function generateUniqueTournamentTransferMemo(teamShortOrName: string): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const candidate = generateTournamentTransferContent(teamShortOrName);
    const exists = await prisma.tournamentTeam.findUnique({
      where: { transferContent: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  return `${generateTournamentTransferContent(teamShortOrName)} ${crypto.randomInt(10, 99)}`;
}

export async function getTournamentFinanceSummary() {
  const rows = await prisma.tournament.findMany({
    where: { mode: 'HOSTED' },
    include: {
      teams: {
        select: {
          id: true,
          name: true,
          paymentStatus: true,
          entryFeeAmount: true,
          paidAt: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
  });
  return rows.map(toTournamentFinanceSummaryDto);
}

export async function listTournaments(opts: { isStaffUser: boolean; includeContacts: boolean }) {
  const { isStaffUser, includeContacts } = opts;

  if (!isStaffUser) {
    return getOrSetCache('tournaments:public:list', 30_000, async () => {
      const rows = await prisma.tournament.findMany({
        where: { isActive: true, status: { not: 'CANCELLED' } },
        include: TOURNAMENT_FULL_INCLUDE,
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      });
      return rows.map((row) => toTournamentDto(row, false, false));
    });
  }

  const rows = await prisma.tournament.findMany({
    include: TOURNAMENT_FULL_INCLUDE,
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
  });
  return rows.map((row) => toTournamentDto(row, true, includeContacts));
}

export async function getTournamentBySlugOrId(
  slugOrId: string,
  opts: { isStaffUser: boolean; includeContacts: boolean }
): Promise<{ status: string; dto: ReturnType<typeof toTournamentDto> } | null> {
  const { isStaffUser, includeContacts } = opts;

  if (!isStaffUser) {
    return getOrSetCache(`tournaments:public:detail:${slugOrId}`, 30_000, async () => {
      const row = await prisma.tournament.findFirst({
        where: {
          OR: [{ id: slugOrId }, { slug: slugOrId }],
          isActive: true,
          status: { not: 'CANCELLED' },
        },
        include: TOURNAMENT_FULL_INCLUDE,
      });
      if (!row) return null;
      return {
        status: row.status,
        dto: toTournamentDto(row, false, false),
      };
    });
  }

  const row = await prisma.tournament.findFirst({
    where: {
      OR: [{ id: slugOrId }, { slug: slugOrId }],
    },
    include: TOURNAMENT_FULL_INCLUDE,
  });
  if (!row) return null;

  return {
    status: row.status,
    dto: toTournamentDto(row, true, includeContacts),
  };
}

export async function registerTeamPublic(slugOrId: string, data: Record<string, any>) {
  if (data.regulationsAccepted !== true) {
    throw new HttpError(400, 'Captain must accept the athlete eligibility & tournament regulations pledge.');
  }

  const result = await prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.findFirst({
      where: {
        OR: [{ id: slugOrId }, { slug: slugOrId }],
        isActive: true,
      },
    });
    if (!tournament) {
      throw new HttpError(404, 'Tournament not found or currently unavailable.');
    }
    if (tournament.mode !== 'HOSTED') {
      throw new HttpError(400, 'Public registration is only enabled for DVA Hosted tournaments.');
    }
    if (tournament.isRosterLocked) {
      throw new HttpError(403, 'Official rosters are locked for this tournament. Contact the Organizing Committee.');
    }
    if (tournament.status !== 'UPCOMING' || !tournament.isRegistrationOpen) {
      throw new HttpError(400, 'Registration for this tournament is currently closed.');
    }
    if (tournament.requireBirthYear) {
      const missingBirthYear = (data.players as any[]).find(
        (pl) => pl.birthYear === undefined || pl.birthYear === null
      );
      if (missingBirthYear) {
        throw new HttpError(
          400,
          `Birth year (1960–2015) is required for athlete "${missingBirthYear.fullName}".`
        );
      }
    }

    const [paidCount, existingTeamsCount, duplicateTeam] = await Promise.all([
      tx.tournamentTeam.count({
        where: { tournamentId: tournament.id, paymentStatus: 'PAID' },
      }),
      tx.tournamentTeam.count({
        where: { tournamentId: tournament.id },
      }),
      tx.tournamentTeam.findFirst({
        where: {
          tournamentId: tournament.id,
          paymentStatus: { not: 'CANCELLED' },
          name: { equals: data.name, mode: 'insensitive' },
        },
        select: { id: true },
      }),
    ]);

    if (paidCount >= tournament.maxTeams) {
      throw new HttpError(
        409,
        `Tournament slots are already full (${paidCount}/${tournament.maxTeams} confirmed teams).`
      );
    }
    if (duplicateTeam) {
      throw new HttpError(409, `A team named "${data.name}" has already registered for this tournament.`);
    }

    const entryFeeAmount = Math.max(0, Number(tournament.entryFeePerTeam) || 0);
    const shortName =
      (data.shortName || data.name)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6) || 'TEAM';
    const transferContent = await generateUniqueTournamentTransferMemo(shortName);

    const isFree = entryFeeAmount === 0;
    const now = new Date();
    const createdTeam = await tx.tournamentTeam.create({
      data: {
        id: `tt-${crypto.randomUUID()}`,
        tournamentId: tournament.id,
        name: data.name,
        shortName,
        logoUrl: null,
        isDvaTeam: false,
        seedOrder: existingTeamsCount + 1,
        captainName: data.captainName,
        captainPhone: data.captainPhone,
        captainEmail: data.captainEmail || null,
        paymentStatus: isFree ? 'PAID' : 'PENDING',
        entryFeeAmount,
        transferContent,
        paidAt: isFree ? now : null,
        notes: data.notes || null,
      },
    });

    // Batch insert roster in 1 query (prevents N+1 pool saturation)
    const playersPayload = (data.players as any[]).map((pl) => ({
      id: `tp-${crypto.randomUUID()}`,
      teamId: createdTeam.id,
      tournamentId: tournament.id,
      fullName: pl.fullName,
      jerseyNumber: Number(pl.jerseyNumber),
      position: pl.position || 'OH',
      height: pl.height ?? null,
      spikeTouch: pl.spikeTouch ?? null,
      birthYear: pl.birthYear ?? null,
      eligibilityStatus: 'PENDING_CHECK' as const,
      isCaptain: Boolean(pl.isCaptain),
      awards: [] as string[],
    }));

    if (playersPayload.length > 0) {
      await tx.tournamentPlayer.createMany({ data: playersPayload });
    }

    const createdPlayers = playersPayload.map((pl) => ({ ...pl, createdAt: now }));
    return { tournament, createdTeam, createdPlayers, entryFeeAmount, transferContent };
  });

  invalidateCache('tournaments');

  const { tournament, createdTeam, createdPlayers, entryFeeAmount, transferContent } = result;
  const qrUrl = buildBookingVietQrUrl(entryFeeAmount, transferContent);

  if (createdTeam.captainEmail) {
    void sendTournamentRegistrationEmail({
      tournamentName: tournament.name,
      tournamentSlug: tournament.slug,
      startDate: tournament.startDate,
      endDate: tournament.endDate ?? undefined,
      startTime: tournament.startTime ?? undefined,
      endTime: tournament.endTime ?? undefined,
      location: tournament.location,
      teamName: createdTeam.name,
      captainName: createdTeam.captainName || data.captainName,
      captainEmail: createdTeam.captainEmail,
      captainPhone: createdTeam.captainPhone || data.captainPhone,
      playerCount: createdPlayers.length,
      entryFeeAmount,
      transferContent,
    });
  }

  void sendAdminNotification({
    type: 'TOURNAMENT',
    title: `Đăng Ký Giải Đấu Mới: ${tournament.name}`,
    code: transferContent,
    customerName: `${createdTeam.name} (Capt: ${createdTeam.captainName})`,
    phone: createdTeam.captainPhone || data.captainPhone,
    email: createdTeam.captainEmail || undefined,
    amount: entryFeeAmount,
    transferContent,
    details: `Số VĐV: ${createdPlayers.length} | Trạng thái: ${createdTeam.paymentStatus}`,
  }).catch((err: any) => console.warn('[Tournament Admin Notify Error]:', err?.message || err));

  return {
    team: toTournamentTeamDto({ ...createdTeam, players: createdPlayers }, false),
    teamId: createdTeam.id,
    payment: {
      bankId: env.bank.id,
      bankName: 'MB Bank (Military Commercial Joint Stock Bank)',
      accountNo: env.bank.accountNo,
      accountName: env.bank.accountName,
      amount: entryFeeAmount,
      transferContent,
      qrUrl,
    },
  };
}

export async function confirmTeamPaymentPublic(slugOrId: string, teamId: string) {
  const tournament = await prisma.tournament.findFirst({
    where: { OR: [{ id: slugOrId }, { slug: slugOrId }], isActive: true },
  });
  if (!tournament) {
    throw new HttpError(404, 'Tournament not found.');
  }
  const team = await prisma.tournamentTeam.findFirst({
    where: { id: teamId, tournamentId: tournament.id },
  });
  if (!team) {
    throw new HttpError(404, 'Team registration not found.');
  }

  const updated = await prisma.tournamentTeam.update({
    where: { id: team.id },
    data: {
      customerConfirmedAt: team.customerConfirmedAt ?? new Date(),
    },
  });

  invalidateCache('tournaments');

  void sendAdminNotification({
    type: 'TOURNAMENT',
    title: `Đội Báo Đã CK Lệ Phí Giải (${tournament.name})`,
    code: updated.transferContent || updated.id,
    customerName: `${updated.name} (Capt: ${updated.captainName || 'N/A'})`,
    phone: updated.captainPhone || '',
    email: updated.captainEmail || undefined,
    amount: updated.entryFeeAmount,
    transferContent: updated.transferContent || undefined,
    details: 'Đội trưởng xác nhận đã chuyển khoản lệ phí giải. Vui lòng đối soát và duyệt PAID trong Admin Hub.',
  }).catch((err: any) => console.warn('[Tournament Confirm Admin Alert]:', err?.message || err));

  return {
    success: true,
    paymentStatus: updated.paymentStatus,
    customerConfirmedAt: updated.customerConfirmedAt?.toISOString(),
  };
}

export async function createTournament(data: Record<string, any>) {
  const mode = (data.mode || 'HOSTED') as 'HOSTED' | 'PARTICIPATING';
  const trackingMode = mode === 'HOSTED' ? 'FULL_BRACKET' : (data.trackingMode || 'FULL_BRACKET');
  const slug = await generateUniqueTournamentSlug(data.slug || data.name);

  const created = await prisma.tournament.create({
    data: {
      id: `tour-${crypto.randomUUID()}`,
      slug,
      name: data.name,
      subtitle: data.subtitle ?? null,
      mode,
      trackingMode,
      status: data.status || 'UPCOMING',
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      isRegistrationOpen:
        mode === 'HOSTED'
          ? data.isRegistrationOpen !== undefined
            ? Boolean(data.isRegistrationOpen)
            : true
          : false,
      isRosterLocked: Boolean(data.isRosterLocked),
      requireBirthYear: Boolean(data.requireBirthYear),
      maxTeams: data.maxTeams ?? 8,
      registrationDeadline: data.registrationDeadline ?? null,
      startDate: data.startDate,
      endDate: data.endDate ?? data.startDate,
      startTime: data.startTime ?? '07:30',
      endTime: data.endTime ?? null,
      location: data.location || '155 Truong Chinh, Thanh Xuan, Hanoi (DVA Court - BTL Thong Tin)',
      mapsUrl: data.mapsUrl ?? null,
      bannerUrl: data.bannerUrl ?? null,
      groupSetFormat: data.groupSetFormat || 'BO3',
      knockoutSetFormat: data.knockoutSetFormat || 'BO3',
      entryFeePerTeam: mode === 'HOSTED' ? Math.max(0, Number(data.entryFeePerTeam) || 0) : 0,
      internalExpenseNote: data.internalExpenseNote ?? null,
      rulesContent: data.rulesContent ?? null,
      prizeConfig: (data.prizeConfig ?? []) as any,
      dvaResultSummary: data.dvaResultSummary ?? null,
      podiumOverride: (data.podiumOverride ?? null) as any,
    },
    include: TOURNAMENT_FULL_INCLUDE,
  });

  invalidateCache('tournaments');
  return toTournamentDto(created, true);
}

export async function updateTournament(id: string, data: Record<string, any>, rawBody: Record<string, any>) {
  const existing = await prisma.tournament.findUnique({
    where: { id },
    include: { teams: true },
  });
  if (!existing) {
    throw new HttpError(404, 'Tournament not found.');
  }

  const nextMode = data.mode ?? existing.mode;
  if (existing.mode === 'HOSTED' && nextMode === 'PARTICIPATING') {
    const hasPaidRevenue = existing.teams.some(
      (tm) => tm.paymentStatus === 'PAID' && (Number(tm.entryFeeAmount) || 0) > 0
    );
    if (hasPaidRevenue) {
      throw new HttpError(
        400,
        'Cannot switch to PARTICIPATING mode while PAID team entry fees exist. Cancel/refund PAID teams first.'
      );
    }
  }

  let nextSlug: string | undefined;
  if (data.slug !== undefined && data.slug.trim() && data.slug.trim() !== existing.slug) {
    nextSlug = await generateUniqueTournamentSlug(data.slug, id);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.tournament.update({
      where: { id },
      data: {
        ...data,
        ...(nextSlug ? { slug: nextSlug } : {}),
        ...(nextMode === 'PARTICIPATING'
          ? { entryFeePerTeam: 0, isRegistrationOpen: false }
          : data.mode === 'HOSTED'
            ? { trackingMode: 'FULL_BRACKET' }
            : {}),
        ...(rawBody?.registrationDeadline === null || rawBody?.registrationDeadline === ''
          ? { registrationDeadline: null }
          : {}),
        ...(rawBody?.startTime === null || rawBody?.startTime === '' ? { startTime: null } : {}),
        ...(rawBody?.endTime === null || rawBody?.endTime === '' ? { endTime: null } : {}),
        ...(rawBody?.podiumOverride === null ? { podiumOverride: null as any } : {}),
      },
    });

    if (data.groupSetFormat && data.groupSetFormat !== existing.groupSetFormat) {
      await tx.tournamentMatch.updateMany({
        where: {
          tournamentId: id,
          stage: { in: ['POOL_A', 'POOL_B', 'GROUP'] },
          status: 'SCHEDULED',
        },
        data: { setFormat: data.groupSetFormat },
      });
    }

    if (data.knockoutSetFormat && data.knockoutSetFormat !== existing.knockoutSetFormat) {
      await tx.tournamentMatch.updateMany({
        where: {
          tournamentId: id,
          stage: { in: ['QUARTERFINAL', 'SEMIFINAL', 'THIRD_PLACE', 'FINAL'] },
          status: 'SCHEDULED',
        },
        data: { setFormat: data.knockoutSetFormat },
      });
    }

    return tx.tournament.findUnique({
      where: { id },
      include: TOURNAMENT_FULL_INCLUDE,
    });
  });

  invalidateCache('tournaments');
  return toTournamentDto(updated, true);
}

export async function toggleTournamentVisibility(id: string, isActive?: boolean) {
  const existing = await prisma.tournament.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Tournament not found.');
  const nextActive = typeof isActive === 'boolean' ? isActive : !existing.isActive;
  const updated = await prisma.tournament.update({
    where: { id },
    data: { isActive: nextActive },
    include: TOURNAMENT_FULL_INCLUDE,
  });
  invalidateCache('tournaments');
  return toTournamentDto(updated, true);
}

export async function toggleTournamentRegistration(id: string, isRegistrationOpen?: boolean) {
  const existing = await prisma.tournament.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Tournament not found.');
  const nextOpen =
    typeof isRegistrationOpen === 'boolean' ? isRegistrationOpen : !existing.isRegistrationOpen;
  const updated = await prisma.tournament.update({
    where: { id },
    data: { isRegistrationOpen: nextOpen },
    include: TOURNAMENT_FULL_INCLUDE,
  });
  invalidateCache('tournaments');
  return toTournamentDto(updated, true);
}

export async function toggleTournamentRosterLock(id: string, isRosterLocked?: boolean) {
  const existing = await prisma.tournament.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Tournament not found.');
  const nextLocked =
    typeof isRosterLocked === 'boolean' ? isRosterLocked : !existing.isRosterLocked;
  const updated = await prisma.tournament.update({
    where: { id },
    data: { isRosterLocked: nextLocked },
    include: TOURNAMENT_FULL_INCLUDE,
  });
  invalidateCache('tournaments');
  return toTournamentDto(updated, true);
}

export async function deleteTournament(id: string) {
  const existing = await prisma.tournament.findUnique({
    where: { id },
    include: { teams: { select: { paymentStatus: true, entryFeeAmount: true } } },
  });
  if (!existing) throw new HttpError(404, 'Tournament not found.');

  if (existing.mode === 'HOSTED') {
    const paidSum = existing.teams
      .filter((t) => t.paymentStatus === 'PAID')
      .reduce((sum, t) => sum + (Number(t.entryFeeAmount) || 0), 0);
    if (paidSum > 0) {
      throw new HttpError(
        400,
        `Cannot delete tournament with ${paidSum.toLocaleString('vi-VN')} đ of PAID entry fees. Cancel paid teams first.`
      );
    }
  }

  await prisma.tournament.delete({ where: { id } });
  invalidateCache('tournaments');
  return { success: true };
}

export async function createTournamentTeam(
  tournamentId: string,
  data: Record<string, any>,
  importDvaSquad: boolean
) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new HttpError(404, 'Tournament not found.');

  const created = await prisma.$transaction(async (tx) => {
    const count = await tx.tournamentTeam.count({ where: { tournamentId } });
    const paymentStatus = (
      data.paymentStatus || (tournament.mode === 'PARTICIPATING' ? 'PAID' : 'PENDING')
    ) as 'PENDING' | 'PAID' | 'CANCELLED';
    const entryFeeAmount =
      tournament.mode === 'HOSTED'
        ? data.entryFeeAmount !== undefined
          ? Number(data.entryFeeAmount)
          : tournament.entryFeePerTeam
        : 0;
    const shortName =
      (data.shortName || data.name).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'TEAM';
    const transferContent =
      tournament.mode === 'HOSTED' ? await generateUniqueTournamentTransferMemo(shortName) : null;

    const team = await tx.tournamentTeam.create({
      data: {
        id: `tt-${crypto.randomUUID()}`,
        tournamentId,
        name: data.name,
        shortName,
        logoUrl: data.logoUrl || null,
        isDvaTeam: Boolean(data.isDvaTeam),
        dvaSquadLevel: data.isDvaTeam && data.dvaSquadLevel ? data.dvaSquadLevel : null,
        pool: data.pool && (data.pool === 'A' || data.pool === 'B') ? data.pool : null,
        seedOrder: data.seedOrder ?? count + 1,
        manualRankOverride: data.manualRankOverride ?? null,
        finalRank: data.finalRank ?? null,
        captainName: data.captainName ?? null,
        captainPhone: data.captainPhone ?? null,
        captainEmail: data.captainEmail || null,
        paymentStatus,
        entryFeeAmount,
        transferContent,
        paidAt: paymentStatus === 'PAID' ? new Date() : null,
        notes: data.notes ?? null,
      },
    });

    if (importDvaSquad && team.isDvaTeam && team.dvaSquadLevel) {
      const clubPlayers = await tx.player.findMany({
        where: { level: team.dvaSquadLevel, isActive: true },
        orderBy: [{ isCaptain: 'desc' }, { jerseyNumber: 'asc' }],
        take: 14,
      });
      if (clubPlayers.length > 0) {
        await tx.tournamentPlayer.createMany({
          data: clubPlayers.map((cp) => ({
            id: `tp-${crypto.randomUUID()}`,
            teamId: team.id,
            tournamentId,
            linkedPlayerId: cp.id,
            fullName: cp.fullName,
            jerseyNumber: cp.jerseyNumber,
            position: cp.position,
            height: cp.height,
            spikeTouch: cp.spikeTouch,
            avatarUrl: cp.avatarUrl || null,
            birthYear: cp.bornYear && cp.bornYear >= 1960 && cp.bornYear <= 2015 ? cp.bornYear : null,
            eligibilityStatus: 'VERIFIED' as const,
            isCaptain: cp.isCaptain,
            awards: [] as string[],
          })),
        });
      }
    }

    return team;
  });

  invalidateCache('tournaments');
  return toTournamentTeamDto(created, true);
}

export async function updateTournamentTeam(
  tournamentId: string,
  teamId: string,
  data: Record<string, any>,
  rawBody: Record<string, any>
) {
  const existing = await prisma.tournamentTeam.findFirst({
    where: { id: teamId, tournamentId },
    include: { tournament: true },
  });
  if (!existing) throw new HttpError(404, 'Team not found.');

  const nextStatus = data.paymentStatus ?? existing.paymentStatus;
  let nextPaidAt = existing.paidAt;
  if (data.paymentStatus === 'PAID') {
    nextPaidAt = existing.paidAt ?? new Date();
  } else if (data.paymentStatus === 'PENDING' || data.paymentStatus === 'CANCELLED') {
    nextPaidAt = null;
  }

  const rawPool = rawBody?.pool;
  const resolvedPool =
    rawPool === null || rawPool === ''
      ? null
      : data.pool === 'A' || data.pool === 'B'
        ? data.pool
        : undefined;

  const updated = await prisma.tournamentTeam.update({
    where: { id: teamId },
    data: {
      ...data,
      ...(resolvedPool !== undefined ? { pool: resolvedPool } : {}),
      ...(rawBody?.manualRankOverride === null || rawBody?.manualRankOverride === ''
        ? { manualRankOverride: null }
        : {}),
      ...(rawBody?.finalRank === null || rawBody?.finalRank === '' ? { finalRank: null } : {}),
      ...(rawBody?.dvaSquadLevel === null || rawBody?.dvaSquadLevel === '' ? { dvaSquadLevel: null } : {}),
      ...(rawBody?.logoUrl === null || rawBody?.logoUrl === '' ? { logoUrl: null } : {}),
      ...(existing.tournament.mode === 'PARTICIPATING' ? { entryFeeAmount: 0 } : {}),
      paymentStatus: nextStatus,
      paidAt: nextPaidAt,
    },
  });

  invalidateCache('tournaments');
  return toTournamentTeamDto(updated, true);
}

export async function importDvaSquadToTeam(
  tournamentId: string,
  teamId: string,
  levelInput?: string
) {
  const team = await prisma.tournamentTeam.findFirst({
    where: { id: teamId, tournamentId },
  });
  if (!team) throw new HttpError(404, 'Team not found.');

  const targetLevel = normalizeSquad(levelInput || team.dvaSquadLevel || 'SENIOR').toUpperCase() as
    | 'SENIOR'
    | 'JUNIOR'
    | 'YOUTH';

  const [clubPlayers, existingRoster] = await Promise.all([
    prisma.player.findMany({
      where: { level: targetLevel, isActive: true },
      orderBy: [{ isCaptain: 'desc' }, { jerseyNumber: 'asc' }],
      take: 14,
    }),
    prisma.tournamentPlayer.findMany({
      where: { teamId: team.id },
      select: { linkedPlayerId: true },
    }),
  ]);

  const alreadyLinked = new Set(existingRoster.map((r) => r.linkedPlayerId).filter(Boolean));
  const now = new Date();
  const toInsert = clubPlayers
    .filter((cp) => !alreadyLinked.has(cp.id))
    .map((cp) => ({
      id: `tp-${crypto.randomUUID()}`,
      teamId: team.id,
      tournamentId,
      linkedPlayerId: cp.id,
      fullName: cp.fullName,
      jerseyNumber: cp.jerseyNumber,
      position: cp.position,
      height: cp.height,
      spikeTouch: cp.spikeTouch,
      avatarUrl: cp.avatarUrl || null,
      birthYear: cp.bornYear && cp.bornYear >= 1960 && cp.bornYear <= 2015 ? cp.bornYear : null,
      eligibilityStatus: 'VERIFIED' as const,
      isCaptain: cp.isCaptain,
      awards: [] as string[],
    }));

  await prisma.$transaction(async (tx) => {
    if (toInsert.length > 0) {
      await tx.tournamentPlayer.createMany({ data: toInsert });
    }
    await tx.tournamentTeam.update({
      where: { id: team.id },
      data: { isDvaTeam: true, dvaSquadLevel: targetLevel },
    });
  });

  invalidateCache('tournaments');
  return {
    importedCount: toInsert.length,
    players: toInsert.map((row) => toTournamentPlayerDto({ ...row, createdAt: now }, true)),
  };
}

export async function verifyTeamRoster(tournamentId: string, teamId: string) {
  const team = await prisma.tournamentTeam.findFirst({ where: { id: teamId, tournamentId } });
  if (!team) throw new HttpError(404, 'Team not found.');

  const result = await prisma.tournamentPlayer.updateMany({
    where: {
      teamId: team.id,
      tournamentId,
      eligibilityStatus: { not: 'REJECTED' },
    },
    data: {
      eligibilityStatus: 'VERIFIED',
      rejectionReason: null,
    },
  });

  invalidateCache('tournaments');
  return { verifiedCount: result.count };
}

export async function deleteTournamentTeam(tournamentId: string, teamId: string) {
  const existing = await prisma.tournamentTeam.findFirst({
    where: { id: teamId, tournamentId },
    include: { tournament: true },
  });
  if (!existing) throw new HttpError(404, 'Team not found.');

  if (
    existing.tournament.mode === 'HOSTED' &&
    existing.paymentStatus === 'PAID' &&
    (Number(existing.entryFeeAmount) || 0) > 0
  ) {
    throw new HttpError(
      400,
      'Cannot delete a PAID team directly. Change payment status to CANCELLED first to keep financial audit intact.'
    );
  }

  await prisma.tournamentTeam.delete({ where: { id: teamId } });
  invalidateCache('tournaments');
  return { success: true };
}

export async function createTournamentPlayer(tournamentId: string, data: Record<string, any>) {
  const team = await prisma.tournamentTeam.findFirst({
    where: { id: data.teamId, tournamentId },
  });
  if (!team) throw new HttpError(404, 'Team not found in tournament.');

  const duplicateJersey = await prisma.tournamentPlayer.findFirst({
    where: { teamId: team.id, jerseyNumber: data.jerseyNumber },
  });
  if (duplicateJersey) {
    throw new HttpError(
      400,
      `Jersey number #${data.jerseyNumber} is already assigned to ${duplicateJersey.fullName} on this team.`
    );
  }

  const nextStatus = data.eligibilityStatus || 'VERIFIED';
  const created = await prisma.tournamentPlayer.create({
    data: {
      id: `tp-${crypto.randomUUID()}`,
      teamId: team.id,
      tournamentId,
      linkedPlayerId: data.linkedPlayerId || null,
      fullName: data.fullName,
      jerseyNumber: Number(data.jerseyNumber),
      position: data.position || 'OH',
      height: data.height ?? null,
      spikeTouch: data.spikeTouch ?? null,
      avatarUrl: data.avatarUrl || null,
      birthYear: data.birthYear ?? null,
      eligibilityStatus: nextStatus,
      rejectionReason: nextStatus === 'VERIFIED' ? null : (data.rejectionReason || null),
      isCaptain: Boolean(data.isCaptain),
      awards: Array.isArray(data.awards) ? data.awards : [],
    },
  });

  invalidateCache('tournaments');
  return toTournamentPlayerDto(created, true);
}

export async function updateTournamentPlayer(
  tournamentId: string,
  playerId: string,
  data: Record<string, any>,
  rawBody: Record<string, any>
) {
  const existing = await prisma.tournamentPlayer.findFirst({
    where: { id: playerId, tournamentId },
  });
  if (!existing) throw new HttpError(404, 'Player not found.');

  if (data.jerseyNumber !== undefined) {
    const duplicateJersey = await prisma.tournamentPlayer.findFirst({
      where: {
        teamId: existing.teamId,
        jerseyNumber: data.jerseyNumber,
        id: { not: playerId },
      },
    });
    if (duplicateJersey) {
      throw new HttpError(
        400,
        `Jersey number #${data.jerseyNumber} is already assigned to ${duplicateJersey.fullName} on this team.`
      );
    }
  }

  const { teamId: _ignore, ...rest } = data;
  const updated = await prisma.tournamentPlayer.update({
    where: { id: playerId },
    data: {
      ...rest,
      ...(rawBody?.height === null || rawBody?.height === '' ? { height: null } : {}),
      ...(rawBody?.spikeTouch === null || rawBody?.spikeTouch === '' ? { spikeTouch: null } : {}),
      ...(rawBody?.avatarUrl === null || rawBody?.avatarUrl === '' ? { avatarUrl: null } : {}),
      ...(rawBody?.birthYear === null || rawBody?.birthYear === '' ? { birthYear: null } : {}),
      ...(data.eligibilityStatus === 'VERIFIED' ||
      rawBody?.rejectionReason === null ||
      rawBody?.rejectionReason === ''
        ? { rejectionReason: null }
        : {}),
    },
  });

  invalidateCache('tournaments');
  return toTournamentPlayerDto(updated, true);
}

export async function deleteTournamentPlayer(tournamentId: string, playerId: string) {
  const existing = await prisma.tournamentPlayer.findFirst({
    where: { id: playerId, tournamentId },
  });
  if (!existing) throw new HttpError(404, 'Player not found.');

  await prisma.$transaction(async (tx) => {
    await tx.tournamentPlayer.delete({ where: { id: playerId } });
    const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
    const ov =
      tournament?.podiumOverride &&
      typeof tournament.podiumOverride === 'object' &&
      !Array.isArray(tournament.podiumOverride)
        ? (tournament.podiumOverride as Record<string, any>)
        : null;
    if (ov?.dreamTeam && typeof ov.dreamTeam === 'object') {
      let changed = false;
      const nextDream = { ...ov.dreamTeam };
      for (const slot of DREAM_TEAM_SLOTS) {
        if (nextDream[slot.slotKey] === playerId) {
          nextDream[slot.slotKey] = null;
          changed = true;
        }
      }
      if (changed) {
        await tx.tournament.update({
          where: { id: tournamentId },
          data: { podiumOverride: { ...ov, dreamTeam: nextDream } as any },
        });
      }
    }
  });

  invalidateCache('tournaments');
  return { success: true };
}

export async function saveDreamTeam(tournamentId: string, dreamTeam: Record<string, string | null> | null) {
  const normalizedDream = (dreamTeam || {}) as Record<string, string | null>;

  if (
    normalizedDream.BEST_OH_1 &&
    normalizedDream.BEST_OH_2 &&
    normalizedDream.BEST_OH_1 === normalizedDream.BEST_OH_2
  ) {
    throw new HttpError(400, 'Cannot select the same athlete for both Best Outside Hitter slots.');
  }
  if (
    normalizedDream.BEST_MB_1 &&
    normalizedDream.BEST_MB_2 &&
    normalizedDream.BEST_MB_1 === normalizedDream.BEST_MB_2
  ) {
    throw new HttpError(400, 'Cannot select the same athlete for both Best Middle Blocker slots.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: { teams: true, players: true },
    });
    if (!tournament) throw new HttpError(404, 'Tournament not found.');

    const teamMap = new Map(tournament.teams.map((tm) => [tm.id, tm]));
    const playerMap = new Map(tournament.players.map((pl) => [pl.id, pl]));
    const awardsByPlayerId = new Map<string, Set<string>>();
    const derivedAwards: Array<{ award: string; playerName: string; teamName?: string; jerseyNumber?: number }> = [];

    for (const slot of DREAM_TEAM_SLOTS) {
      const pid = normalizedDream[slot.slotKey];
      if (!pid) continue;
      const player = playerMap.get(pid);
      if (!player) {
        throw new HttpError(400, `Selected athlete for ${slot.label} does not belong to this tournament.`);
      }
      if ((player.eligibilityStatus || 'VERIFIED') !== 'VERIFIED') {
        throw new HttpError(
          400,
          `Athlete "${player.fullName}" must be VERIFIED before receiving "${slot.label}".`
        );
      }
      const existingSet = awardsByPlayerId.get(pid) ?? new Set<string>();
      existingSet.add(slot.awardCode);
      awardsByPlayerId.set(pid, existingSet);

      const tm = teamMap.get(player.teamId);
      derivedAwards.push({
        award: slot.awardCode,
        playerName: player.fullName,
        teamName: tm?.name || '',
        jerseyNumber: player.jerseyNumber,
      });
    }

    const pendingUpdates: Array<{ id: string; awards: string[] }> = [];
    for (const pl of tournament.players) {
      const currentAwards = Array.isArray(pl.awards) ? pl.awards : [];
      const customAwards = currentAwards.filter((code) => !DREAM_TEAM_AWARD_CODES.has(code));
      const newDreamCodes = Array.from(awardsByPlayerId.get(pl.id) ?? []);
      const nextAwards = Array.from(new Set([...newDreamCodes, ...customAwards]));

      const isEqual =
        currentAwards.length === nextAwards.length &&
        currentAwards.every((val, idx) => val === nextAwards[idx]);
      if (!isEqual) {
        pendingUpdates.push({ id: pl.id, awards: nextAwards });
      }
    }

    for (const item of pendingUpdates) {
      await tx.tournamentPlayer.update({
        where: { id: item.id },
        data: { awards: item.awards },
      });
    }

    const existingOverride =
      tournament.podiumOverride &&
      typeof tournament.podiumOverride === 'object' &&
      !Array.isArray(tournament.podiumOverride)
        ? (tournament.podiumOverride as Record<string, any>)
        : {};

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        podiumOverride: {
          ...existingOverride,
          dreamTeam: normalizedDream,
          awards: derivedAwards,
        } as any,
      },
    });

    return tx.tournament.findUnique({
      where: { id: tournamentId },
      include: TOURNAMENT_FULL_INCLUDE,
    });
  });

  invalidateCache('tournaments');
  return toTournamentDto(updated, true);
}

export async function createTournamentOfficial(tournamentId: string, data: Record<string, any>) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new HttpError(404, 'Tournament not found.');
  const created = await prisma.tournamentOfficial.create({
    data: {
      id: `off-${crypto.randomUUID()}`,
      tournamentId,
      fullName: data.fullName,
      role: data.role || 'MAIN_REFEREE',
      certification: data.certification || null,
      avatarUrl: data.avatarUrl || null,
      phone: data.phone || null,
      sortOrder: data.sortOrder ?? 0,
    },
  });
  invalidateCache('tournaments');
  return toTournamentOfficialDto(created, true);
}

export async function updateTournamentOfficial(
  officialId: string,
  data: Record<string, any>,
  rawBody: Record<string, any>,
  tournamentId?: string
) {
  const existing = await prisma.tournamentOfficial.findFirst({
    where: tournamentId ? { id: officialId, tournamentId } : { id: officialId },
  });
  if (!existing) throw new HttpError(404, 'Official not found.');

  if (Object.prototype.hasOwnProperty.call(rawBody || {}, 'fullName') && rawBody.fullName === null) {
    throw new HttpError(400, 'fullName cannot be empty.');
  }

  const updated = await prisma.tournamentOfficial.update({
    where: { id: officialId },
    data: {
      ...data,
      ...(rawBody?.certification === null || rawBody?.certification === '' ? { certification: null } : {}),
      ...(rawBody?.avatarUrl === null || rawBody?.avatarUrl === '' ? { avatarUrl: null } : {}),
      ...(rawBody?.phone === null || rawBody?.phone === '' ? { phone: null } : {}),
    },
  });
  invalidateCache('tournaments');
  return toTournamentOfficialDto(updated, true);
}

export async function deleteTournamentOfficial(tournamentId: string, officialId: string) {
  const existing = await prisma.tournamentOfficial.findFirst({
    where: { id: officialId, tournamentId },
  });
  if (!existing) throw new HttpError(404, 'Official not found.');
  await prisma.tournamentOfficial.delete({ where: { id: officialId } });
  invalidateCache('tournaments');
  return { success: true };
}

export async function generateGroupStageSchedule(tournamentId: string, forceReset: boolean) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { teams: true, matches: true },
  });
  if (!tournament) throw new HttpError(404, 'Tournament not found.');

  const poolA = tournament.teams
    .filter((t) => t.pool === 'A' && t.paymentStatus !== 'CANCELLED')
    .sort((a, b) => a.seedOrder - b.seedOrder)
    .map((t) => toTournamentTeamDto(t, true));
  const poolB = tournament.teams
    .filter((t) => t.pool === 'B' && t.paymentStatus !== 'CANCELLED')
    .sort((a, b) => a.seedOrder - b.seedOrder)
    .map((t) => toTournamentTeamDto(t, true));

  if (poolA.length < 4 || poolB.length < 4) {
    throw new HttpError(
      400,
      `Pool A (${poolA.length}/4) and Pool B (${poolB.length}/4) must each have 4 teams assigned before generating the 12-match Group Stage schedule.`
    );
  }

  const existingGroupMatches = tournament.matches.filter(
    (m) => m.stage === 'POOL_A' || m.stage === 'POOL_B' || m.stage === 'GROUP'
  );
  const hasActiveOrFinishedMatches = tournament.matches.some(
    (m) => m.status === 'LIVE' || m.status === 'COMPLETED'
  );
  if ((existingGroupMatches.length > 0 || hasActiveOrFinishedMatches) && !forceReset) {
    throw new HttpError(
      409,
      'Group Stage matches already exist (or matches are already LIVE/COMPLETED). Confirm reset (forceReset=true) before regenerating.'
    );
  }

  const templates = buildGroupStage12MatchPlan(
    poolA,
    poolB,
    (tournament.groupSetFormat as TournamentSetFormat) || 'BO3'
  );

  await prisma.$transaction(async (tx) => {
    if (forceReset) {
      await tx.tournamentTeam.updateMany({
        where: { tournamentId },
        data: { finalRank: null },
      });
      await tx.tournamentMatch.deleteMany({ where: { tournamentId } });
    }
    await tx.tournamentMatch.createMany({
      data: templates.map((tpl) => ({
        id: `tm-${crypto.randomUUID()}`,
        tournamentId,
        matchCode: tpl.matchCode,
        stage: tpl.stage,
        bracketSide: tpl.bracketSide,
        courtName: tpl.courtName,
        scheduledTime: tpl.scheduledTime,
        matchOrder: tpl.matchOrder,
        status: 'SCHEDULED' as const,
        setFormat: tpl.setFormat,
        homeTeamId: tpl.homeTeamId,
        awayTeamId: tpl.awayTeamId,
        homeLabel: tpl.homeLabel,
        awayLabel: tpl.awayLabel,
        setScores: [] as any,
      })),
    });
  });

  const refreshed = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: TOURNAMENT_FULL_INCLUDE,
  });
  invalidateCache('tournaments');
  return toTournamentDto(refreshed, true);
}

async function upsertBracketSlotsTx(
  tx: any,
  tournament: { id: string; knockoutSetFormat?: string | null },
  rawMatches: any[],
  slots: BracketSlotPlan[],
  forceOverride: boolean
): Promise<{ seededCodes: string[]; skipped: string[] }> {
  const seededCodes: string[] = [];
  const skipped: string[] = [];
  const toCreate: any[] = [];

  for (const slot of slots) {
    const existingMatch = rawMatches.find(
      (m: any) =>
        String(m.matchCode || '').toUpperCase() === slot.matchCode.toUpperCase() ||
        ((slot.stage === 'THIRD_PLACE' || slot.stage === 'FINAL') && m.stage === slot.stage)
    );

    if (existingMatch) {
      if (existingMatch.status !== 'SCHEDULED' && !forceOverride) {
        skipped.push(`${slot.matchCode} (${existingMatch.status})`);
        continue;
      }
      await tx.tournamentMatch.update({
        where: { id: existingMatch.id },
        data: {
          homeTeamId: slot.homeTeamId,
          awayTeamId: slot.awayTeamId,
          homeLabel: slot.homeLabel,
          awayLabel: slot.awayLabel,
        },
      });
      seededCodes.push(slot.matchCode);
    } else {
      toCreate.push({
        id: `tm-${crypto.randomUUID()}`,
        tournamentId: tournament.id,
        matchCode: slot.matchCode,
        stage: slot.stage,
        bracketSide: slot.bracketSide,
        courtName: slot.courtName,
        scheduledTime: slot.scheduledTime,
        matchOrder: slot.matchOrder,
        status: 'SCHEDULED',
        setFormat: tournament.knockoutSetFormat || 'BO3',
        homeTeamId: slot.homeTeamId,
        awayTeamId: slot.awayTeamId,
        homeLabel: slot.homeLabel,
        awayLabel: slot.awayLabel,
        setScores: [],
      });
      seededCodes.push(slot.matchCode);
    }
  }

  if (toCreate.length > 0) {
    await tx.tournamentMatch.createMany({ data: toCreate });
  }

  return { seededCodes, skipped };
}

async function seedQuarterfinalsFromStandingsTx(
  tx: any,
  tournamentId: string,
  forceOverride: boolean
): Promise<{
  seededCodes: string[];
  skipped: string[];
  insufficientPools: boolean;
  poolACount: number;
  poolBCount: number;
}> {
  const [tournament, rawTeams, rawMatches] = await Promise.all([
    tx.tournament.findUnique({ where: { id: tournamentId } }),
    tx.tournamentTeam.findMany({ where: { tournamentId } }),
    tx.tournamentMatch.findMany({ where: { tournamentId } }),
  ]);

  const teamsDto = rawTeams.map((t: any) => toTournamentTeamDto(t, true));
  const matchesDto = rawMatches.map((m: any) => toTournamentMatchDto(m, true));
  const plan = buildQuarterfinalSlotPlans(teamsDto, matchesDto, rawMatches);

  if (plan.insufficientPools || !tournament) {
    return {
      seededCodes: [],
      skipped: [],
      insufficientPools: true,
      poolACount: plan.poolACount,
      poolBCount: plan.poolBCount,
    };
  }

  const { seededCodes, skipped } = await upsertBracketSlotsTx(
    tx,
    tournament,
    rawMatches,
    plan.slots,
    forceOverride
  );

  return {
    seededCodes,
    skipped,
    insufficientPools: false,
    poolACount: plan.poolACount,
    poolBCount: plan.poolBCount,
  };
}

export async function seedQuarterfinals(tournamentId: string, forceOverride: boolean) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new HttpError(404, 'Tournament not found.');

  const { seededCodes, skipped, insufficientPools, poolACount, poolBCount } =
    await prisma.$transaction((tx) => seedQuarterfinalsFromStandingsTx(tx, tournamentId, forceOverride));

  if (insufficientPools) {
    throw new HttpError(
      400,
      `Both Pool A (${poolACount}/4) and Pool B (${poolBCount}/4) need 4 teams to seed Quarterfinals (QF1–QF4). / Cần đủ 4 đội ở cả Bảng A và Bảng B để xếp cặp Tứ kết.`
    );
  }

  const refreshed = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: TOURNAMENT_FULL_INCLUDE,
  });
  invalidateCache('tournaments');

  return {
    tournament: toTournamentDto(refreshed, true),
    seededCodes,
    skipped,
    warnings:
      skipped.length > 0
        ? [`Skipped ${skipped.join(', ')} because match is already LIVE or COMPLETED.`]
        : [],
  };
}

export async function seedSemifinals(tournamentId: string, forceOverride: boolean) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new HttpError(404, 'Tournament not found.');

  const { seededCodes, skipped, pendingSources } = await prisma.$transaction(async (tx) => {
    const [rawTeams, rawMatches] = await Promise.all([
      tx.tournamentTeam.findMany({ where: { tournamentId } }),
      tx.tournamentMatch.findMany({ where: { tournamentId } }),
    ]);
    const plan = buildSemifinalSlotPlans(rawTeams, rawMatches);
    const resUpsert = await upsertBracketSlotsTx(tx, tournament, rawMatches, plan.slots, forceOverride);
    return { ...resUpsert, pendingSources: plan.pendingSources };
  });

  const warnings: string[] = [];
  if (pendingSources.length > 0) {
    warnings.push(
      `Các trận ${pendingSources.join(', ')} chưa COMPLETED — đã điền sẵn đội thắng hiện có và giữ placeholder (Winner QFx) cho nhánh còn lại.`
    );
  }
  if (skipped.length > 0) {
    warnings.push(`Skipped ${skipped.join(', ')} because match is already LIVE or COMPLETED.`);
  }

  const refreshed = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: TOURNAMENT_FULL_INCLUDE,
  });
  invalidateCache('tournaments');

  return {
    tournament: toTournamentDto(refreshed, true),
    seededCodes,
    pendingSources,
    skipped,
    warnings,
  };
}

export async function seedFinals(tournamentId: string, forceOverride: boolean) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new HttpError(404, 'Tournament not found.');

  const { seededCodes, skipped, pendingSources } = await prisma.$transaction(async (tx) => {
    const [rawTeams, rawMatches] = await Promise.all([
      tx.tournamentTeam.findMany({ where: { tournamentId } }),
      tx.tournamentMatch.findMany({ where: { tournamentId } }),
    ]);
    const plan = buildFinalsSlotPlans(rawTeams, rawMatches);
    const resUpsert = await upsertBracketSlotsTx(tx, tournament, rawMatches, plan.slots, forceOverride);
    return { ...resUpsert, pendingSources: plan.pendingSources };
  });

  const warnings: string[] = [];
  if (pendingSources.length > 0) {
    warnings.push(
      `Các trận ${pendingSources.join(', ')} chưa COMPLETED — đã điền sẵn đội đã xác định và giữ placeholder (Winner/Loser SFx) cho nhánh còn lại.`
    );
  }
  if (skipped.length > 0) {
    warnings.push(`Skipped ${skipped.join(', ')} because match is already LIVE or COMPLETED.`);
  }

  const refreshed = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: TOURNAMENT_FULL_INCLUDE,
  });
  invalidateCache('tournaments');

  return {
    tournament: toTournamentDto(refreshed, true),
    seededCodes,
    pendingSources,
    skipped,
    warnings,
  };
}

export async function createTournamentMatch(tournamentId: string, data: Record<string, any>) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new HttpError(404, 'Tournament not found.');

  const count = await prisma.tournamentMatch.count({ where: { tournamentId } });

  const created = await prisma.tournamentMatch.create({
    data: {
      id: `tm-${crypto.randomUUID()}`,
      tournamentId,
      matchCode: data.matchCode.trim().toUpperCase(),
      stage: data.stage || 'GROUP',
      bracketSide: data.bracketSide || null,
      courtName: normalizeTournamentCourtName(data.courtName || 'Court A'),
      scheduledTime: data.scheduledTime || null,
      matchOrder: data.matchOrder ?? count + 1,
      status: data.status || 'SCHEDULED',
      setFormat: data.setFormat || tournament.groupSetFormat || 'BO3',
      homeTeamId: data.homeTeamId || null,
      awayTeamId: data.awayTeamId || null,
      homeLabel: data.homeLabel || null,
      awayLabel: data.awayLabel || null,
      officialId: data.officialId || null,
      assistantOfficialIds: Array.isArray(data.assistantOfficialIds) ? data.assistantOfficialIds : [],
      notes: data.notes || null,
    },
  });

  invalidateCache('tournaments');
  return toTournamentMatchDto(created, true);
}

export async function deleteTournamentMatch(tournamentId: string, matchId: string) {
  const existing = await prisma.tournamentMatch.findFirst({
    where: { id: matchId, tournamentId },
  });
  if (!existing) throw new HttpError(404, 'Match not found.');
  await prisma.tournamentMatch.delete({ where: { id: matchId } });
  invalidateCache('tournaments');
  return { success: true };
}

export async function updateTournamentMatchScore(
  matchId: string,
  data: Record<string, any>,
  rawBody: Record<string, any>,
  tournamentId?: string
) {
  const existing = await prisma.tournamentMatch.findFirst({
    where: tournamentId ? { id: matchId, tournamentId } : { id: matchId },
  });
  if (!existing) throw new HttpError(404, 'Match not found.');
  const id = existing.tournamentId;

  if (Object.prototype.hasOwnProperty.call(rawBody || {}, 'matchCode') && rawBody.matchCode === null) {
    throw new HttpError(400, 'matchCode cannot be empty.');
  }

  const forceOverride = Boolean(data.forceOverride);
  const nextMatchCode = data.matchCode !== undefined ? data.matchCode.trim().toUpperCase() : undefined;
  const nextStatus = (data.status ?? existing.status) as 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  const nextFormat = (data.setFormat ?? existing.setFormat) as TournamentSetFormat;
  const nextHomeId =
    rawBody?.homeTeamId === null || rawBody?.homeTeamId === ''
      ? null
      : (data.homeTeamId ?? existing.homeTeamId);
  const nextAwayId =
    rawBody?.awayTeamId === null || rawBody?.awayTeamId === ''
      ? null
      : (data.awayTeamId ?? existing.awayTeamId);
  const nextOfficialId =
    rawBody?.officialId === null || rawBody?.officialId === ''
      ? null
      : (data.officialId ?? existing.officialId);

  const rawScores = data.setScores !== undefined ? data.setScores : existing.setScores;
  const computed = computeSetTotals(rawScores, nextFormat, nextHomeId, nextAwayId, nextStatus);

  if (
    nextStatus === 'COMPLETED' &&
    (data.setScores !== undefined || (data.status === 'COMPLETED' && existing.status !== 'COMPLETED'))
  ) {
    if (String(nextFormat).toUpperCase() === 'BO1_25') {
      const s1 = computed.setScores[0];
      if (!s1 || !isVolleyballSetWon(s1.home, s1.away, 25)) {
        throw new HttpError(
          400,
          'BO1_25 match requires Set 1 to reach at least 25 points with a minimum 2-point lead.'
        );
      }
    } else {
      const invalidCompletedSet = computed.setScores.find(
        (s) =>
          s.isCompleted &&
          (s.home > 0 || s.away > 0) &&
          !isVolleyballSetWon(s.home, s.away, getSetTargetPoints(s.set, nextFormat))
      );
      if (invalidCompletedSet) {
        const target = getSetTargetPoints(invalidCompletedSet.set, nextFormat);
        throw new HttpError(
          400,
          `Set ${invalidCompletedSet.set} has not met the win-by-2 requirement (minimum ${target} points and 2-point lead).`
        );
      }
      if (computed.homeSetsWon === 0 && computed.awaySetsWon === 0) {
        throw new HttpError(400, 'Completed match requires at least one valid winning set score.');
      }
    }
  }

  const warnings: string[] = [];
  let autoSeededQuarterfinals = false;

  await prisma.$transaction(async (tx) => {
    const updatedMatch = await tx.tournamentMatch.update({
      where: { id: matchId },
      data: {
        ...(nextMatchCode !== undefined ? { matchCode: nextMatchCode } : {}),
        ...(data.matchOrder !== undefined ? { matchOrder: data.matchOrder } : {}),
        status: nextStatus,
        setFormat: nextFormat,
        ...(data.courtName !== undefined
          ? { courtName: normalizeTournamentCourtName(data.courtName) }
          : {}),
        ...(data.scheduledTime !== undefined ? { scheduledTime: data.scheduledTime } : {}),
        homeTeamId: nextHomeId,
        awayTeamId: nextAwayId,
        ...(data.homeLabel !== undefined ? { homeLabel: data.homeLabel } : {}),
        ...(data.awayLabel !== undefined ? { awayLabel: data.awayLabel } : {}),
        officialId: nextOfficialId,
        ...(data.assistantOfficialIds !== undefined
          ? { assistantOfficialIds: data.assistantOfficialIds }
          : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        setScores: computed.setScores as any,
        homeSetsWon: computed.homeSetsWon,
        awaySetsWon: computed.awaySetsWon,
        homePointsTotal: computed.homePointsTotal,
        awayPointsTotal: computed.awayPointsTotal,
        winnerTeamId: nextStatus === 'COMPLETED' ? computed.winnerTeamId : null,
      },
    });

    if (updatedMatch.status !== 'COMPLETED') {
      if (updatedMatch.matchCode === 'FINAL' || updatedMatch.stage === 'FINAL') {
        await tx.tournamentTeam.updateMany({
          where: { tournamentId: id, finalRank: { in: [1, 2] } },
          data: { finalRank: null },
        });
      }
      if (updatedMatch.matchCode === '3RD' || updatedMatch.stage === 'THIRD_PLACE') {
        await tx.tournamentTeam.updateMany({
          where: { tournamentId: id, finalRank: { in: [3, 4] } },
          data: { finalRank: null },
        });
      }
    }

    // Fetch all matches & teams ONCE inside transaction to eliminate per-slot findFirst/count queries
    const [allMatches, teams] = await Promise.all([
      tx.tournamentMatch.findMany({ where: { tournamentId: id } }),
      updatedMatch.status === 'COMPLETED' && updatedMatch.winnerTeamId
        ? tx.tournamentTeam.findMany({ where: { tournamentId: id } })
        : Promise.resolve([]),
    ]);
    const matchByCode = new Map(allMatches.map((m) => [String(m.matchCode || '').toUpperCase(), m]));

    if (updatedMatch.status === 'COMPLETED' && updatedMatch.winnerTeamId) {
      const teamMap = new Map(teams.map((t) => [t.id, t]));
      const winner = teamMap.get(updatedMatch.winnerTeamId);
      const loserId =
        updatedMatch.homeTeamId && updatedMatch.awayTeamId
          ? updatedMatch.winnerTeamId === updatedMatch.homeTeamId
            ? updatedMatch.awayTeamId
            : updatedMatch.homeTeamId
          : null;
      const loser = loserId ? teamMap.get(loserId) : undefined;

      const advanceSlot = async (
        targetCode: string,
        slotSide: 'HOME' | 'AWAY',
        teamObj: typeof winner
      ) => {
        if (!teamObj) return;
        const target = matchByCode.get(targetCode.toUpperCase());
        if (!target) return;
        if (target.status !== 'SCHEDULED' && !forceOverride) {
          warnings.push(
            `Downstream match ${targetCode} is already ${target.status}; slot was not overwritten automatically.`
          );
          return;
        }
        await tx.tournamentMatch.update({
          where: { id: target.id },
          data:
            slotSide === 'HOME'
              ? { homeTeamId: teamObj.id, homeLabel: teamObj.name }
              : { awayTeamId: teamObj.id, awayLabel: teamObj.name },
        });
      };

      if (updatedMatch.matchCode === 'QF1') await advanceSlot('SF1', 'HOME', winner);
      if (updatedMatch.matchCode === 'QF3') await advanceSlot('SF1', 'AWAY', winner);
      if (updatedMatch.matchCode === 'QF2') await advanceSlot('SF2', 'HOME', winner);
      if (updatedMatch.matchCode === 'QF4') await advanceSlot('SF2', 'AWAY', winner);

      if (updatedMatch.matchCode === 'SF1') {
        await advanceSlot('FINAL', 'HOME', winner);
        await advanceSlot('3RD', 'HOME', loser);
      }
      if (updatedMatch.matchCode === 'SF2') {
        await advanceSlot('FINAL', 'AWAY', winner);
        await advanceSlot('3RD', 'AWAY', loser);
      }

      if (updatedMatch.matchCode === 'FINAL' || updatedMatch.stage === 'FINAL') {
        await tx.tournamentTeam.update({
          where: { id: updatedMatch.winnerTeamId },
          data: { finalRank: 1 },
        });
        if (loserId) {
          await tx.tournamentTeam.update({
            where: { id: loserId },
            data: { finalRank: 2 },
          });
        }
      }

      if (updatedMatch.matchCode === '3RD' || updatedMatch.stage === 'THIRD_PLACE') {
        await tx.tournamentTeam.update({
          where: { id: updatedMatch.winnerTeamId },
          data: { finalRank: 3 },
        });
        if (loserId) {
          await tx.tournamentTeam.update({
            where: { id: loserId },
            data: { finalRank: 4 },
          });
        }
      }
    }

    if (updatedMatch.stage === 'POOL_A' || updatedMatch.stage === 'POOL_B') {
      const poolMatches = allMatches.filter((pm) => pm.stage === 'POOL_A' || pm.stage === 'POOL_B');
      const allPoolCompleted =
        poolMatches.length > 0 && poolMatches.every((pm) => pm.status === 'COMPLETED');

      if (allPoolCompleted) {
        const autoRes = await seedQuarterfinalsFromStandingsTx(tx, id, forceOverride);
        if (autoRes.seededCodes.length > 0) {
          autoSeededQuarterfinals = true;
        }
        if (autoRes.skipped.length > 0) {
          warnings.push(
            `Pool score updated while Knockout matches (${autoRes.skipped.join(', ')}) are already LIVE/COMPLETED. Review Quarterfinal pairings manually if rankings changed.`
          );
        }
      } else if (updatedMatch.status === 'COMPLETED') {
        const liveOrDoneKnockout = allMatches.some(
          (km) =>
            ['QUARTERFINAL', 'SEMIFINAL', 'THIRD_PLACE', 'FINAL'].includes(km.stage) &&
            ['LIVE', 'COMPLETED'].includes(km.status)
        );
        if (liveOrDoneKnockout) {
          warnings.push(
            'Pool score updated while Knockout matches are already LIVE/COMPLETED. Review Quarterfinal pairings manually if rankings changed.'
          );
        }
      }
    }
  });

  // Immediately purge public cache so Live Scores appear instantaneously on refresh/poll
  invalidateCache('tournaments');

  const refreshed = await prisma.tournament.findUnique({
    where: { id },
    include: TOURNAMENT_FULL_INCLUDE,
  });

  return {
    tournament: toTournamentDto(refreshed, true),
    warnings,
    autoSeededQuarterfinals,
  };
}
