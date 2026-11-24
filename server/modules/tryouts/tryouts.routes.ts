import { Router } from 'express';
import { isSuperAdmin } from '../../middlewares/auth.middleware';
import { requireAdminOrSuperAdmin, requireSuperAdmin } from '../../middlewares/rbac.middleware';
import { ah, publicWriteLimiter } from '../../middlewares/error.middleware';
import { HttpError, sanitize } from '../../utils/validation';
import {
  APPLICATION_ENTRY_FEE_SCHEMA,
  APPLICATION_PAYMENT_STATUS_SCHEMA,
  APPLICATION_STATUS_UPDATE_SCHEMA,
  MEMBER_REGISTER_SCHEMA,
  TRYOUT_EVALUATE_SCHEMA,
  TRYOUT_PATCH_SCHEMA,
  TRYOUT_REGISTER_SCHEMA,
  TRYOUT_SCHEDULE_EMAIL_SCHEMA,
  TRYOUT_UNIFIED_EMAIL_SCHEMA,
} from '../../utils/schemas';
import {
  assertCanRejectApplication,
  deleteApplication,
  evaluateApplication,
  listApplications,
  registerApplication,
  sendTryoutEmail,
  updateApplicationEntryFee,
  updateApplicationPaymentStatus,
  updateApplicationStatus,
  updateTryoutApplication,
} from './tryouts.service';

export const tryoutsRouter = Router();

tryoutsRouter.get(
  '/members/applications',
  requireAdminOrSuperAdmin,
  ah(async (req, res) => {
    const apps = await listApplications(isSuperAdmin(req.user));
    res.json(apps);
  })
);

tryoutsRouter.post(
  ['/members/register', '/members/apply'],
  publicWriteLimiter,
  ah(async (req, res) => {
    const isTryoutPage = req.body?.source === 'TRYOUT_PAGE';
    const data = isTryoutPage
      ? sanitize(req.body, TRYOUT_REGISTER_SCHEMA, {
          required: ['fullName', 'position', 'height', 'gmail', 'zalo', 'experience', 'preferredDays'],
        })
      : sanitize(req.body, MEMBER_REGISTER_SCHEMA, {
          required: ['fullName', 'dob', 'position', 'hometownCountry', 'level', 'height', 'weight', 'spikeReach', 'blockReach', 'gmail', 'zalo'],
        });
    const dto = await registerApplication(data, isTryoutPage);
    res.status(200).json(dto);
  })
);

tryoutsRouter.patch(
  '/admin/tryouts/:id',
  requireAdminOrSuperAdmin,
  ah(async (req, res) => {
    const superAdmin = isSuperAdmin(req.user);
    if (!superAdmin && (req.body?.fullName !== undefined || req.body?.name !== undefined)) {
      throw new HttpError(403, 'Only SUPERADMIN can edit applicant name.');
    }
    assertCanRejectApplication(superAdmin, req.body?.status, req.body?.conclusion, req.body?.outcome);
    const data = sanitize(req.body, TRYOUT_PATCH_SCHEMA, { partial: true });
    if (req.body?.skillRank === null || req.body?.skillRank === '') {
      data.skillRank = null;
    }
    if (Object.keys(data).length === 0) {
      throw new HttpError(400, 'No valid update fields provided.');
    }
    const dto = await updateTryoutApplication(req.params.id, data as any, superAdmin);
    res.json(dto);
  })
);

tryoutsRouter.patch(
  '/members/applications/:id/status',
  requireAdminOrSuperAdmin,
  ah(async (req, res) => {
    const superAdmin = isSuperAdmin(req.user);
    assertCanRejectApplication(superAdmin, req.body?.status, req.body?.conclusion, req.body?.outcome);
    const data = sanitize(req.body, APPLICATION_STATUS_UPDATE_SCHEMA, { required: ['status'] });
    const result = await updateApplicationStatus(req.params.id, data as any, superAdmin);
    res.json(result);
  })
);

tryoutsRouter.patch(
  '/members/applications/:id/entry-fee',
  requireSuperAdmin,
  ah(async (req, res) => {
    const { entryFee } = sanitize(req.body, APPLICATION_ENTRY_FEE_SCHEMA, { required: ['entryFee'] });
    const dto = await updateApplicationEntryFee(req.params.id, entryFee);
    res.json(dto);
  })
);

tryoutsRouter.patch(
  '/members/applications/:id/payment-status',
  requireSuperAdmin,
  ah(async (req, res) => {
    const { paymentStatus } = sanitize(req.body, APPLICATION_PAYMENT_STATUS_SCHEMA, {
      required: ['paymentStatus'],
    });
    const dto = await updateApplicationPaymentStatus(req.params.id, paymentStatus);
    res.json(dto);
  })
);

const handleEvaluate = ah(async (req, res) => {
  const superAdmin = isSuperAdmin(req.user);
  assertCanRejectApplication(superAdmin, req.body?.status, req.body?.conclusion, req.body?.outcome);
  const data = sanitize(req.body, TRYOUT_EVALUATE_SCHEMA, { required: ['scores', 'status'] });
  if (req.body?.skillRank === null || req.body?.skillRank === '') {
    data.skillRank = null;
  }
  const dto = await evaluateApplication(
    req.params.id,
    data as any,
    req.user || {},
    superAdmin
  );
  res.json(dto);
});

tryoutsRouter.patch('/members/applications/:id/evaluate', requireAdminOrSuperAdmin, handleEvaluate);
tryoutsRouter.patch('/admin/tryouts/:id/evaluate', requireAdminOrSuperAdmin, handleEvaluate);

tryoutsRouter.post(
  '/members/applications/:id/schedule-tryout',
  requireAdminOrSuperAdmin,
  ah(async (req, res) => {
    const body = sanitize(req.body ?? {}, TRYOUT_SCHEDULE_EMAIL_SCHEMA, { required: ['date', 'timeSlot'] });
    const result = await sendTryoutEmail(
      req.params.id,
      body,
      'SCHEDULE',
      req.user || {},
      isSuperAdmin(req.user)
    );
    res.json(result);
  })
);

tryoutsRouter.post(
  '/admin/tryouts/:id/send-email',
  requireAdminOrSuperAdmin,
  ah(async (req, res) => {
    const superAdmin = isSuperAdmin(req.user);
    assertCanRejectApplication(superAdmin, req.body?.outcome, req.body?.status, req.body?.conclusion);
    const body = sanitize(req.body ?? {}, TRYOUT_UNIFIED_EMAIL_SCHEMA, { required: ['kind'] });
    if (req.body?.skillRank === null || req.body?.skillRank === '') {
      body.skillRank = null;
    }
    const result = await sendTryoutEmail(
      req.params.id,
      body,
      body.kind,
      req.user || {},
      superAdmin
    );
    res.json(result);
  })
);

tryoutsRouter.delete(
  '/members/applications/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deleteApplication(req.params.id);
    res.json(result);
  })
);
