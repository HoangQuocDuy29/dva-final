import { Router } from 'express';
import { isStaff } from '../../middlewares/auth.middleware';
import { requireSuperAdmin } from '../../middlewares/rbac.middleware';
import { ah } from '../../middlewares/error.middleware';
import { applyPublicCacheHeaders } from '../../utils/cache';
import { sanitize } from '../../utils/validation';
import { LEADERSHIP_MEMBER_SCHEMA } from '../../utils/schemas';
import {
  createLeadershipMember,
  deleteLeadershipMember,
  listAdminLeadership,
  listPublicLeadership,
  updateLeadershipMember,
} from './leadership.service';

export const leadershipRouter = Router();

leadershipRouter.get('/leadership', ah(async (req, res) => {
  applyPublicCacheHeaders(res, isStaff(req.user), { maxAgeSec: 120, swrSec: 300 });
  res.json(await listPublicLeadership());
}));

leadershipRouter.get('/leadership/admin', requireSuperAdmin, ah(async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await listAdminLeadership());
}));

leadershipRouter.post('/leadership', requireSuperAdmin, ah(async (req, res) => {
  const data = sanitize(req.body, LEADERSHIP_MEMBER_SCHEMA, {
    required: ['name', 'badgeRole', 'subtitle', 'bio', 'footerRole'],
  });
  res.status(201).json(await createLeadershipMember(data));
}));

leadershipRouter.patch('/leadership/:id', requireSuperAdmin, ah(async (req, res) => {
  const data = sanitize(req.body, LEADERSHIP_MEMBER_SCHEMA, { partial: true });
  if (req.body && typeof req.body === 'object' && (req.body.avatarUrl === null || req.body.avatarUrl === '')) {
    data.avatarUrl = null;
  }
  res.json(await updateLeadershipMember(req.params.id, data));
}));

leadershipRouter.delete('/leadership/:id', requireSuperAdmin, ah(async (req, res) => {
  res.json(await deleteLeadershipMember(req.params.id));
}));
