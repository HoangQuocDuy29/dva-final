import { Router, type Request, type Response } from 'express';
import { isStaff } from '../../middlewares/auth.middleware';
import { requireCaptainOrSuperAdmin, requireSuperAdmin } from '../../middlewares/rbac.middleware';
import { ah } from '../../middlewares/error.middleware';
import { applyPublicCacheHeaders } from '../../utils/cache';
import { sanitize } from '../../utils/validation';
import { VENUE_CLUB_SCHEMA, VENUE_SCHEMA, VENUE_SESSION_SCHEMA } from '../../utils/schemas';
import {
  SessionConflictError,
  deleteClub,
  deleteSession,
  deleteVenue,
  getPublicClubBySlug,
  listAdminVenues,
  listPublicVenues,
  upsertClub,
  upsertSession,
  upsertVenue,
} from './venues.service';

export const venuesRouter = Router();

const preserveNulls = (raw: unknown, data: Record<string, any>, keys: string[]) => {
  if (!raw || typeof raw !== 'object') return data;
  const src = raw as Record<string, unknown>;
  for (const k of keys) if (src[k] === null || src[k] === '') data[k] = null;
  return data;
};

// Public API (5-min TTL Cache, strips captainEmail)
venuesRouter.get('/venues', ah(async (req, res) => {
  applyPublicCacheHeaders(res, isStaff(req.user), { maxAgeSec: 120, swrSec: 300 });
  res.json(await listPublicVenues());
}));

venuesRouter.get('/venues/teams/:slug', ah(async (req, res) => {
  applyPublicCacheHeaders(res, isStaff(req.user), { maxAgeSec: 120, swrSec: 300 });
  res.json(await getPublicClubBySlug(req.params.slug));
}));

// Admin / Captain Read: Venues (SUPERADMIN sees all; CAPTAIN sees strictly their own club & venue)
venuesRouter.get('/admin/venues', requireCaptainOrSuperAdmin, ah(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await listAdminVenues(req.user));
}));

venuesRouter.post('/admin/venues', requireSuperAdmin, ah(async (req, res) => {
  const data = sanitize(req.body, VENUE_SCHEMA, { required: ['name', 'address', 'district', 'latitude', 'longitude', 'surfaceType'] });
  res.status(201).json(await upsertVenue(data));
}));

const updateVenueHandler = ah(async (req, res) => {
  const data = preserveNulls(req.body, sanitize(req.body, VENUE_SCHEMA, { partial: true }), ['coverUrl', 'rentalPriceInfo', 'entryNote', 'closureReason', 'closedUntil']);
  res.json(await upsertVenue(data, req.params.id));
});
venuesRouter.put('/admin/venues/:id', requireSuperAdmin, updateVenueHandler);
venuesRouter.patch('/admin/venues/:id', requireSuperAdmin, updateVenueHandler);
venuesRouter.delete('/admin/venues/:id', requireSuperAdmin, ah(async (req, res) => res.json(await deleteVenue(req.params.id))));

// Admin CRUD: Club Profiles & Captains (SUPERADMIN; CAPTAIN may PATCH/PUT own assigned club only)
venuesRouter.post('/admin/venues/:venueId/clubs', requireSuperAdmin, ah(async (req, res) => {
  const data = preserveNulls(req.body, sanitize(req.body, VENUE_CLUB_SCHEMA, { required: ['name', 'captainName', 'captainPhone'] }), ['captainUserId']);
  res.status(201).json(await upsertClub(req.params.venueId, data, undefined, req.user));
}));

const updateClubHandler = ah(async (req, res) => {
  const data = preserveNulls(req.body, sanitize(req.body, VENUE_CLUB_SCHEMA, { partial: true }), ['logoUrl', 'coverUrl', 'captainZalo', 'captainEmail', 'captainUserId', 'description', 'feeAmount']);
  res.json(await upsertClub(req.params.venueId, data, req.params.clubId, req.user));
});
venuesRouter.put('/admin/venues/:venueId/clubs/:clubId', requireCaptainOrSuperAdmin, updateClubHandler);
venuesRouter.patch('/admin/venues/:venueId/clubs/:clubId', requireCaptainOrSuperAdmin, updateClubHandler);
venuesRouter.delete('/admin/venues/:venueId/clubs/:clubId', requireSuperAdmin, ah(async (req, res) => res.json(await deleteClub(req.params.venueId, req.params.clubId))));

// Admin CRUD: Session Slots + Sub-Court Conflict Guard (SUPERADMIN; CAPTAIN may PATCH/PUT own club's sessions)
const handleSessionMutation = (isCreate: boolean) => ah(async (req: Request, res: Response) => {
  const rawData = isCreate
    ? sanitize(req.body, VENUE_SESSION_SCHEMA, { required: ['clubId', 'daysOfWeek', 'startTime', 'endTime', 'subCourts'] })
    : sanitize(req.body, VENUE_SESSION_SCHEMA, { partial: true });
  const data = preserveNulls(req.body, rawData, ['cancelReason']);
  try {
    const out = await upsertSession(req.params.venueId, data, isCreate ? undefined : req.params.sessionId, req.user);
    res.status(isCreate ? 201 : 200).json(out);
  } catch (err) {
    if (err instanceof SessionConflictError) {
      return void res.status(409).json({ error: err.message, conflicts: err.conflicts, code: 'SUB_COURT_CONFLICT' });
    }
    throw err;
  }
});
venuesRouter.post('/admin/venues/:venueId/sessions', requireSuperAdmin, handleSessionMutation(true));
venuesRouter.put('/admin/venues/:venueId/sessions/:sessionId', requireCaptainOrSuperAdmin, handleSessionMutation(false));
venuesRouter.patch('/admin/venues/:venueId/sessions/:sessionId', requireCaptainOrSuperAdmin, handleSessionMutation(false));
venuesRouter.delete('/admin/venues/:venueId/sessions/:sessionId', requireSuperAdmin, ah(async (req, res) => res.json(await deleteSession(req.params.venueId, req.params.sessionId))));
