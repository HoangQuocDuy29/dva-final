import { Router } from 'express';
import { isStaff, isSuperAdmin } from '../../middlewares/auth.middleware';
import { requireSuperAdmin } from '../../middlewares/rbac.middleware';
import { ah, publicWriteLimiter } from '../../middlewares/error.middleware';
import { applyPublicCacheHeaders } from '../../utils/cache';
import { sanitize } from '../../utils/validation';
import {
  TOURNAMENT_CHECKIN_ADMIN_SCHEMA,
  TOURNAMENT_CHECKIN_PUBLIC_SCHEMA,
  TOURNAMENT_DREAM_TEAM_SCHEMA,
  TOURNAMENT_FORCE_ACTION_SCHEMA,
  TOURNAMENT_IMPORT_SQUAD_SCHEMA,
  TOURNAMENT_MATCH_SCHEMA,
  TOURNAMENT_MATCH_SCORE_SCHEMA,
  TOURNAMENT_OFFICIAL_SCHEMA,
  TOURNAMENT_PLAYER_SCHEMA,
  TOURNAMENT_PUBLIC_REGISTER_SCHEMA,
  TOURNAMENT_REGISTRATION_TOGGLE_SCHEMA,
  TOURNAMENT_ROSTER_LOCK_SCHEMA,
  TOURNAMENT_SCHEMA,
  TOURNAMENT_TEAM_ADMIN_SCHEMA,
  TOURNAMENT_VISIBILITY_SCHEMA,
} from '../../utils/schemas';
import {
  confirmTeamPaymentPublic,
  createTournament,
  createTournamentMatch,
  createTournamentOfficial,
  createTournamentPlayer,
  createTournamentTeam,
  deleteTournament,
  deleteTournamentMatch,
  deleteTournamentOfficial,
  deleteTournamentPlayer,
  deleteTournamentTeam,
  generateGroupStageSchedule,
  getTournamentBySlugOrId,
  getTournamentFinanceSummary,
  importDvaSquadToTeam,
  listTournaments,
  registerTeamPublic,
  saveDreamTeam,
  seedFinals,
  seedQuarterfinals,
  seedSemifinals,
  toggleTournamentRegistration,
  toggleTournamentRosterLock,
  toggleTournamentVisibility,
  updateTournament,
  updateTournamentMatchScore,
  updateTournamentOfficial,
  updateTournamentPlayer,
  updateTournamentTeam,
  verifyTeamRoster,
} from './tournaments.service';
import {
  deleteAdminTournamentCheckIn,
  getPublicTournamentCheckIn,
  listAdminTournamentCheckIns,
  submitPublicTournamentCheckIn,
  updateAdminTournamentCheckIn,
} from './tournaments.checkin.service';

export const tournamentsRouter = Router();

// Admin Finance Summary (SUPERADMIN only — blocked for ADMIN & public)
tournamentsRouter.get(
  '/admin/tournaments/finance-summary',
  requireSuperAdmin,
  ah(async (_req, res) => {
    const summary = await getTournamentFinanceSummary();
    res.json(summary);
  })
);

// Public & Staff tournament list (strips captain/official PII & financials unless SUPERADMIN)
tournamentsRouter.get(
  '/tournaments',
  ah(async (req, res) => {
    const isStaffUser = isStaff(req.user);
    const includeContacts = isSuperAdmin(req.user);
    applyPublicCacheHeaders(res, isStaffUser, { maxAgeSec: 60, swrSec: 300 });
    const list = await listTournaments({ isStaffUser, includeContacts });
    res.json(list);
  })
);

// Public & Staff single tournament lookup by id or slug
tournamentsRouter.get(
  '/tournaments/:slugOrId',
  ah(async (req, res) => {
    const isStaffUser = isStaff(req.user);
    const includeContacts = isSuperAdmin(req.user);
    const result = await getTournamentBySlugOrId(req.params.slugOrId, {
      isStaffUser,
      includeContacts,
    });
    if (!result) {
      return res.status(404).json({ error: 'Tournament not found.' });
    }
    applyPublicCacheHeaders(
      res,
      isStaffUser,
      result.status === 'ONGOING'
        ? { maxAgeSec: 5, swrSec: 15 }
        : { maxAgeSec: 60, swrSec: 300 }
    );
    return res.json(result.dto);
  })
);

// Public Team Captain Registration (1 unified form -> VietQR)
tournamentsRouter.post(
  '/tournaments/:slugOrId/register',
  publicWriteLimiter,
  ah(async (req, res) => {
    const data = sanitize(req.body, TOURNAMENT_PUBLIC_REGISTER_SCHEMA, {
      required: ['name', 'captainName', 'captainPhone', 'regulationsAccepted', 'players'],
    });
    const payload = await registerTeamPublic(req.params.slugOrId, data);
    res.status(201).json(payload);
  })
);

// Public 1-way captain confirmation ("I Have Completed Payment Transfer")
tournamentsRouter.post(
  '/tournaments/:slugOrId/teams/:teamId/confirm-payment',
  publicWriteLimiter,
  ah(async (req, res) => {
    const payload = await confirmTeamPaymentPublic(req.params.slugOrId, req.params.teamId);
    res.json(payload);
  })
);

// Public Invitational Tournament Check-In (Live Position Quotas + Public Attendees, strictly NO phones)
tournamentsRouter.get(
  '/tournaments/:slugOrId/checkin',
  ah(async (req, res) => {
    const isStaffUser = isStaff(req.user);
    const payload = await getPublicTournamentCheckIn(req.params.slugOrId);
    if (!payload) {
      return res.status(404).json({ error: 'Tournament not found.' });
    }
    applyPublicCacheHeaders(res, isStaffUser, { maxAgeSec: 5, swrSec: 10 });
    return res.json(payload);
  })
);

// Public Invitational Check-In Submit (Squad or Guest — no image upload)
tournamentsRouter.post(
  '/tournaments/:slugOrId/checkin',
  publicWriteLimiter,
  ah(async (req, res) => {
    const data = sanitize(req.body, TOURNAMENT_CHECKIN_PUBLIC_SCHEMA, {
      required: ['position'],
    });
    const payload = await submitPublicTournamentCheckIn(req.params.slugOrId, data);
    res.status(201).json(payload);
  })
);

// Admin (SUPERADMIN only): Invitational Check-In Roster, Matrix & Fee Tracking
tournamentsRouter.get(
  '/admin/tournaments/:id/checkins',
  requireSuperAdmin,
  ah(async (req, res) => {
    const payload = await listAdminTournamentCheckIns(req.params.id);
    res.json(payload);
  })
);

tournamentsRouter.patch(
  '/admin/tournaments/checkins/:checkInId',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body, TOURNAMENT_CHECKIN_ADMIN_SCHEMA, { partial: true });
    const updated = await updateAdminTournamentCheckIn(req.params.checkInId, data, req.body || {});
    res.json(updated);
  })
);

tournamentsRouter.delete(
  '/admin/tournaments/checkins/:checkInId',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deleteAdminTournamentCheckIn(req.params.checkInId);
    res.json(result);
  })
);

// Admin: Create / Update / Visibility / Registration / Roster Lock / Delete Tournament
tournamentsRouter.post(
  '/tournaments',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body, TOURNAMENT_SCHEMA, {
      required: ['name', 'startDate'],
    });
    const created = await createTournament(data);
    res.status(201).json(created);
  })
);

tournamentsRouter.put(
  '/tournaments/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body, TOURNAMENT_SCHEMA, { partial: true });
    const updated = await updateTournament(req.params.id, data, req.body || {});
    res.json(updated);
  })
);

tournamentsRouter.patch(
  '/tournaments/:id/visibility',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body ?? {}, TOURNAMENT_VISIBILITY_SCHEMA, { partial: true });
    const updated = await toggleTournamentVisibility(req.params.id, data.isActive);
    res.json(updated);
  })
);

tournamentsRouter.patch(
  '/tournaments/:id/registration',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body ?? {}, TOURNAMENT_REGISTRATION_TOGGLE_SCHEMA, { partial: true });
    const updated = await toggleTournamentRegistration(req.params.id, data.isRegistrationOpen);
    res.json(updated);
  })
);

tournamentsRouter.patch(
  '/tournaments/:id/roster-lock',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body ?? {}, TOURNAMENT_ROSTER_LOCK_SCHEMA, { partial: true });
    const updated = await toggleTournamentRosterLock(req.params.id, data.isRosterLocked);
    res.json(updated);
  })
);

tournamentsRouter.delete(
  '/tournaments/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deleteTournament(req.params.id);
    res.json(result);
  })
);

// Admin: Teams CRUD & Roster Verification / Squad Import
tournamentsRouter.post(
  '/tournaments/:id/teams',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body, TOURNAMENT_TEAM_ADMIN_SCHEMA, { required: ['name'] });
    const importDvaSquad = Boolean(req.body?.importDvaSquad);
    const created = await createTournamentTeam(req.params.id, data, importDvaSquad);
    res.status(201).json(created);
  })
);

tournamentsRouter.put(
  '/tournaments/:id/teams/:teamId',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body, TOURNAMENT_TEAM_ADMIN_SCHEMA, { partial: true });
    const updated = await updateTournamentTeam(req.params.id, req.params.teamId, data, req.body || {});
    res.json(updated);
  })
);

tournamentsRouter.post(
  '/tournaments/:id/teams/:teamId/import-dva-squad',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body ?? {}, TOURNAMENT_IMPORT_SQUAD_SCHEMA, { partial: true });
    const result = await importDvaSquadToTeam(req.params.id, req.params.teamId, data.level);
    res.json(result);
  })
);

tournamentsRouter.post(
  '/tournaments/:id/teams/:teamId/verify-roster',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await verifyTeamRoster(req.params.id, req.params.teamId);
    res.json(result);
  })
);

tournamentsRouter.delete(
  '/tournaments/:id/teams/:teamId',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deleteTournamentTeam(req.params.id, req.params.teamId);
    res.json(result);
  })
);

// Admin: Players CRUD & FIVB Dream Team
tournamentsRouter.post(
  '/tournaments/:id/players',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body, TOURNAMENT_PLAYER_SCHEMA, {
      required: ['teamId', 'fullName', 'jerseyNumber'],
    });
    const created = await createTournamentPlayer(req.params.id, data);
    res.status(201).json(created);
  })
);

tournamentsRouter.put(
  '/tournaments/:id/players/:playerId',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body, TOURNAMENT_PLAYER_SCHEMA, { partial: true });
    const updated = await updateTournamentPlayer(req.params.id, req.params.playerId, data, req.body || {});
    res.json(updated);
  })
);

tournamentsRouter.delete(
  '/tournaments/:id/players/:playerId',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deleteTournamentPlayer(req.params.id, req.params.playerId);
    res.json(result);
  })
);

tournamentsRouter.put(
  '/tournaments/:id/dream-team',
  requireSuperAdmin,
  ah(async (req, res) => {
    const { dreamTeam } = sanitize(req.body, TOURNAMENT_DREAM_TEAM_SCHEMA, {
      required: ['dreamTeam'],
    });
    const updated = await saveDreamTeam(req.params.id, dreamTeam);
    res.json(updated);
  })
);

// Admin: Tournament Officials CRUD
const handleCreateOfficial = ah(async (req, res) => {
  const data = sanitize(req.body, TOURNAMENT_OFFICIAL_SCHEMA, { required: ['fullName'] });
  const created = await createTournamentOfficial(req.params.id, data);
  res.status(201).json(created);
});

const handleUpdateOfficial = (scopedToTournament: boolean) =>
  ah(async (req, res) => {
    const data = sanitize(req.body, TOURNAMENT_OFFICIAL_SCHEMA, { partial: true });
    const updated = await updateTournamentOfficial(
      req.params.officialId,
      data,
      req.body || {},
      scopedToTournament ? req.params.id : undefined
    );
    res.json(updated);
  });

tournamentsRouter.post('/tournaments/:id/officials', requireSuperAdmin, handleCreateOfficial);
tournamentsRouter.post('/admin/tournaments/:id/officials', requireSuperAdmin, handleCreateOfficial);
tournamentsRouter.patch('/admin/tournaments/officials/:officialId', requireSuperAdmin, handleUpdateOfficial(false));
tournamentsRouter.put('/tournaments/:id/officials/:officialId', requireSuperAdmin, handleUpdateOfficial(true));
tournamentsRouter.patch('/tournaments/:id/officials/:officialId', requireSuperAdmin, handleUpdateOfficial(true));

tournamentsRouter.delete(
  '/tournaments/:id/officials/:officialId',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deleteTournamentOfficial(req.params.id, req.params.officialId);
    res.json(result);
  })
);

// Admin: Group Stage Schedule & Knockout Bracket Seeding
const handleGenerateSchedule = ah(async (req, res) => {
  const data = sanitize(req.body ?? {}, TOURNAMENT_FORCE_ACTION_SCHEMA, { partial: true });
  const tournament = await generateGroupStageSchedule(req.params.id, Boolean(data.forceReset));
  res.json(tournament);
});

const handleSeedQuarterfinals = ah(async (req, res) => {
  const data = sanitize(req.body ?? {}, TOURNAMENT_FORCE_ACTION_SCHEMA, { partial: true });
  const result = await seedQuarterfinals(req.params.id, Boolean(data.forceOverride));
  res.json(result);
});

const handleSeedSemifinals = ah(async (req, res) => {
  const data = sanitize(req.body ?? {}, TOURNAMENT_FORCE_ACTION_SCHEMA, { partial: true });
  const result = await seedSemifinals(req.params.id, Boolean(data.forceOverride));
  res.json(result);
});

const handleSeedFinals = ah(async (req, res) => {
  const data = sanitize(req.body ?? {}, TOURNAMENT_FORCE_ACTION_SCHEMA, { partial: true });
  const result = await seedFinals(req.params.id, Boolean(data.forceOverride));
  res.json(result);
});

tournamentsRouter.post('/admin/tournaments/:id/generate-schedule', requireSuperAdmin, handleGenerateSchedule);
tournamentsRouter.post('/tournaments/:id/generate-schedule', requireSuperAdmin, handleGenerateSchedule);
tournamentsRouter.post('/admin/tournaments/:id/seed-quarterfinals', requireSuperAdmin, handleSeedQuarterfinals);
tournamentsRouter.post('/tournaments/:id/seed-knockout', requireSuperAdmin, handleSeedQuarterfinals);
tournamentsRouter.post('/admin/tournaments/:id/seed-semifinals', requireSuperAdmin, handleSeedSemifinals);
tournamentsRouter.post('/admin/tournaments/:id/seed-finals', requireSuperAdmin, handleSeedFinals);

// Admin: Matches CRUD & Courtside Live Scorer
tournamentsRouter.post(
  '/tournaments/:id/matches',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body, TOURNAMENT_MATCH_SCHEMA, { required: ['matchCode'] });
    const created = await createTournamentMatch(req.params.id, data);
    res.status(201).json(created);
  })
);

tournamentsRouter.delete(
  '/tournaments/:id/matches/:matchId',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deleteTournamentMatch(req.params.id, req.params.matchId);
    res.json(result);
  })
);

const handlePatchMatch = (scopedToTournament: boolean) =>
  ah(async (req, res) => {
    const data = sanitize(req.body, TOURNAMENT_MATCH_SCORE_SCHEMA, { partial: true });
    const result = await updateTournamentMatchScore(
      req.params.matchId,
      data,
      req.body || {},
      scopedToTournament ? req.params.id : undefined
    );
    res.json(result);
  });

tournamentsRouter.patch('/tournaments/:id/matches/:matchId/score', requireSuperAdmin, handlePatchMatch(true));
tournamentsRouter.patch('/admin/tournaments/matches/:matchId', requireSuperAdmin, handlePatchMatch(false));
