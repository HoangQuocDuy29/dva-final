import { Router } from 'express';
import { publicUser } from '../../middlewares/auth.middleware';
import { requireAuth, requireSuperAdmin } from '../../middlewares/rbac.middleware';
import { ah, loginLimiter, passwordChangeLimiter } from '../../middlewares/error.middleware';
import { sanitize } from '../../utils/validation';
import {
  CHANGE_PASSWORD_SCHEMA,
  LOGIN_SCHEMA,
  SELF_PROFILE_UPDATE_SCHEMA,
  STAFF_RESET_PASSWORD_SCHEMA,
  STAFF_UPDATE_SCHEMA,
  USER_CREATE_SCHEMA,
  USER_ROLE_UPDATE_SCHEMA,
} from '../../utils/schemas';
import {
  authenticateUser,
  changeOwnPassword,
  createManagedUser,
  deleteManagedUser,
  listAllUsers,
  resetStaffPassword,
  updateManagedStaff,
  updateManagedUserRole,
  updateOwnProfile,
} from './auth.service';

/** Normalizes legacy `name` -> `fullName` and `avatarUrl: null` -> `''` before schema validation. */
function normalizeProfilePayload(raw: unknown): Record<string, unknown> {
  const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...(raw as Record<string, unknown>) } : {};
  if (body.fullName === undefined && body.name !== undefined) {
    body.fullName = body.name;
  }
  delete body.name;
  if (body.avatarUrl === null) {
    body.avatarUrl = '';
  }
  return body;
}

export const authRouter = Router();

authRouter.post(
  '/auth/login',
  loginLimiter,
  ah(async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password || password.length > 200) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const sanitized = sanitize({ email, password }, LOGIN_SCHEMA, { required: ['email', 'password'] });
    const result = await authenticateUser(sanitized.email, sanitized.password);
    return res.json(result);
  })
);

authRouter.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user!) });
});

authRouter.post('/auth/forgot-password', (_req, res) => {
  return res.json({
    success: true,
    message: 'If this email is registered, please contact the club administrator to reset your password.',
  });
});

authRouter.post('/auth/verify-otp', (_req, res) => {
  return res.status(501).json({ success: false, error: 'Self-service password reset is not available yet.' });
});

authRouter.get(
  '/users',
  requireSuperAdmin,
  ah(async (req, res) => {
    const users = await listAllUsers(req.user!.role);
    res.json(users);
  })
);

authRouter.post(
  '/users',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(normalizeProfilePayload(req.body), USER_CREATE_SCHEMA, {
      required: ['email', 'password', 'fullName'],
    });
    const created = await createManagedUser(data as any, req.user!.role);
    res.status(201).json(created);
  })
);

authRouter.patch(
  '/users/:id/role',
  requireSuperAdmin,
  ah(async (req, res) => {
    const { role } = sanitize(req.body, USER_ROLE_UPDATE_SCHEMA, { required: ['role'] });
    const updated = await updateManagedUserRole(req.params.id, role, req.user!.id, req.user!.role);
    res.json(updated);
  })
);

authRouter.delete(
  '/users/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deleteManagedUser(req.params.id, req.user!.id);
    res.json(result);
  })
);

authRouter.post(
  '/admin/auth/change-password',
  requireAuth,
  passwordChangeLimiter,
  ah(async (req, res) => {
    const rawCurrent = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const rawNew = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (!rawCurrent.trim()) {
      return res.status(400).json({ error: 'Current password is required.' });
    }
    if (rawNew.trim().length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    const sanitized = sanitize(
      { currentPassword: rawCurrent, newPassword: rawNew },
      CHANGE_PASSWORD_SCHEMA,
      { required: ['currentPassword', 'newPassword'] }
    );
    const result = await changeOwnPassword(
      req.user!.id,
      sanitized.currentPassword,
      sanitized.newPassword
    );
    return res.json(result);
  })
);

authRouter.patch(
  '/admin/auth/profile',
  requireAuth,
  ah(async (req, res) => {
    const data = sanitize(normalizeProfilePayload(req.body), SELF_PROFILE_UPDATE_SCHEMA, {
      partial: true,
    });
    const result = await updateOwnProfile(req.user!.id, data);
    return res.json(result);
  })
);

authRouter.patch(
  '/admin/staff/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(normalizeProfilePayload(req.body), STAFF_UPDATE_SCHEMA, {
      partial: true,
    });
    const result = await updateManagedStaff(req.params.id, data as any, req.user!.id, req.user!.role);
    return res.json(result);
  })
);

authRouter.patch(
  '/admin/staff/:id/reset-password',
  requireSuperAdmin,
  ah(async (req, res) => {
    const rawNew = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (rawNew.trim().length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    const sanitized = sanitize(
      { newPassword: rawNew },
      STAFF_RESET_PASSWORD_SCHEMA,
      { required: ['newPassword'] }
    );
    const result = await resetStaffPassword(
      req.params.id,
      sanitized.newPassword,
      req.user!.id,
      req.user!.role
    );
    return res.json(result);
  })
);
