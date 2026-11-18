import { Router } from 'express';
import { isStaff } from '../../middlewares/auth.middleware';
import { requireAdminOrSuperAdmin, requireSuperAdmin } from '../../middlewares/rbac.middleware';
import { ah } from '../../middlewares/error.middleware';
import { applyPublicCacheHeaders } from '../../utils/cache';
import { sanitize } from '../../utils/validation';
import { CLOUDINARY_SIGN_SCHEMA, NEWS_SCHEMA } from '../../utils/schemas';
import {
  createNewsPost,
  deleteNewsPost,
  generateCloudinaryUploadSignature,
  getHomeSummary,
  getNewsByIdOrSlug,
  listNews,
  updateNewsPost,
} from './content.service';

export const contentRouter = Router();

contentRouter.get(
  '/home/summary',
  ah(async (req, res) => {
    const staff = isStaff(req.user);
    applyPublicCacheHeaders(res, staff, { maxAgeSec: 60, swrSec: 180 });
    const summary = await getHomeSummary();
    res.json(summary);
  })
);

contentRouter.get(
  '/news',
  ah(async (req, res) => {
    const staff = isStaff(req.user);
    applyPublicCacheHeaders(res, staff, { maxAgeSec: 60, swrSec: 180 });
    const items = await listNews({
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      staff,
    });
    res.json(items);
  })
);

contentRouter.get(
  '/news/:id',
  ah(async (req, res) => {
    const staff = isStaff(req.user);
    applyPublicCacheHeaders(res, staff, { maxAgeSec: 60, swrSec: 180 });
    const post = await getNewsByIdOrSlug(req.params.id, staff);
    res.json(post);
  })
);

contentRouter.post(
  '/news',
  requireAdminOrSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body, NEWS_SCHEMA, { required: ['title', 'content'] });
    const created = await createNewsPost(data, req.user);
    res.status(201).json(created);
  })
);

contentRouter.put(
  '/news/:id',
  requireAdminOrSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body, NEWS_SCHEMA, { partial: true });
    const updated = await updateNewsPost(req.params.id, data);
    res.json(updated);
  })
);

contentRouter.delete(
  '/news/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deleteNewsPost(req.params.id);
    res.json(result);
  })
);

contentRouter.post('/cloudinary/sign-upload', requireAdminOrSuperAdmin, (req, res) => {
  const { folder } = sanitize(req.body ?? {}, CLOUDINARY_SIGN_SCHEMA);
  const signed = generateCloudinaryUploadSignature(folder);
  res.json(signed);
});
