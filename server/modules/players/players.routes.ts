import { Router } from 'express';
import { isStaff } from '../../middlewares/auth.middleware';
import { requireSuperAdmin } from '../../middlewares/rbac.middleware';
import { ah } from '../../middlewares/error.middleware';
import { normalizeSquad } from '../../config/prisma';
import { applyPublicCacheHeaders } from '../../utils/cache';
import { sanitize } from '../../utils/validation';
import {
  COACH_SCHEMA,
  LEVEL_RULE,
  PLAYER_SCHEMA,
  VISIBILITY_TOGGLE_SCHEMA,
} from '../../utils/schemas';
import {
  createCoach,
  createPlayer,
  deleteCoach,
  deletePlayer,
  listCoaches,
  listPlayers,
  togglePlayerVisibility,
  updateCoach,
  updatePlayer,
  updatePlayerLevel,
} from './players.service';

export const playersRouter = Router();

function normalizePlayerBody(raw: unknown): Record<string, any> {
  const rawBody = raw && typeof raw === 'object' ? { ...(raw as Record<string, any>) } : {};
  if (rawBody.level) {
    rawBody.level = normalizeSquad(rawBody.level).toUpperCase();
  } else if (rawBody.squad || rawBody.category || rawBody.team) {
    rawBody.level = normalizeSquad(rawBody.squad || rawBody.category || rawBody.team).toUpperCase();
  }
  if (rawBody.bornYear === undefined && rawBody.birthYear !== undefined) {
    rawBody.bornYear = rawBody.birthYear;
  }
  if (rawBody.skillRank !== undefined) {
    if (rawBody.skillRank === null || (typeof rawBody.skillRank === 'string' && rawBody.skillRank.trim() === '')) {
      rawBody.skillRank = null;
    } else if (typeof rawBody.skillRank === 'string') {
      rawBody.skillRank = rawBody.skillRank.trim().toUpperCase();
    }
  }
  return rawBody;
}

playersRouter.get(
  '/players',
  ah(async (req, res) => {
    const staff = isStaff(req.user);
    applyPublicCacheHeaders(res, staff, { maxAgeSec: 60, swrSec: 180 });
    const players = await listPlayers({
      level: typeof req.query.level === 'string' ? req.query.level : undefined,
      position: typeof req.query.position === 'string' ? req.query.position : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      all: typeof req.query.all === 'string' ? req.query.all : undefined,
      isActive: typeof req.query.isActive === 'string' ? req.query.isActive : undefined,
      staff,
    });
    res.json(players);
  })
);

playersRouter.post(
  '/players',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(normalizePlayerBody(req.body), PLAYER_SCHEMA, {
      required: ['fullName', 'jerseyNumber', 'level', 'position'],
    });
    const created = await createPlayer(data);
    res.status(201).json(created);
  })
);

const handleUpdatePlayer = ah(async (req, res) => {
  const normalized = normalizePlayerBody(req.body);
  const data = sanitize(normalized, PLAYER_SCHEMA, { partial: true });
  if (normalized.bornYear === null || normalized.bornYear === '') {
    data.bornYear = null;
  }
  if (normalized.skillRank === null) {
    data.skillRank = null;
  }
  const updated = await updatePlayer(req.params.id, data);
  res.json(updated);
});

playersRouter.put('/players/:id', requireSuperAdmin, handleUpdatePlayer);
playersRouter.patch('/players/:id', requireSuperAdmin, handleUpdatePlayer);

playersRouter.delete(
  '/players/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deletePlayer(req.params.id);
    res.json(result);
  })
);

playersRouter.patch(
  '/players/:id/level',
  requireSuperAdmin,
  ah(async (req, res) => {
    const { level } = sanitize(normalizePlayerBody(req.body), { level: LEVEL_RULE }, { required: ['level'] });
    const updated = await updatePlayerLevel(req.params.id, level);
    res.json(updated);
  })
);

playersRouter.patch(
  '/players/:id/visibility',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body ?? {}, VISIBILITY_TOGGLE_SCHEMA, { partial: true });
    const updated = await togglePlayerVisibility(req.params.id, data.isActive);
    res.json(updated);
  })
);

// Coaches
playersRouter.get(
  '/coaches',
  ah(async (req, res) => {
    const staff = isStaff(req.user);
    applyPublicCacheHeaders(res, staff, { maxAgeSec: 120, swrSec: 300 });
    const coaches = await listCoaches(staff);
    res.json(coaches);
  })
);

playersRouter.post(
  '/coaches',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body, COACH_SCHEMA, { required: ['name'] });
    const created = await createCoach(data);
    res.status(201).json(created);
  })
);

playersRouter.put(
  '/coaches/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body, COACH_SCHEMA, { partial: true });
    const updated = await updateCoach(req.params.id, data);
    res.json(updated);
  })
);

playersRouter.delete(
  '/coaches/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deleteCoach(req.params.id);
    res.json(result);
  })
);
