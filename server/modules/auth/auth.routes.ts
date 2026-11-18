import { Router } from 'express';
import { publicUser } from '../../middlewares/auth.middleware';
import { requireAuth, requireSuperAdmin } from '../../middlewares/rbac.middleware';
import { ah, loginLimiter } from '../../middlewares/error.middleware';
import { sanitize } from '../../utils/validation';
import { LOGIN_SCHEMA, USER_CREATE_SCHEMA, USER_ROLE_UPDATE_SCHEMA } from '../../utils/schemas';
import {
  authenticateUser,
  createManagedUser,
  deleteManagedUser,
  listAllUsers,
  updateManagedUserRole,
} from './auth.service';

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
  ah(async (_req, res) => {
    const users = await listAllUsers();
    res.json(users);
  })
);

authRouter.post(
  '/users',
  requireSuperAdmin,
  ah(async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? { ...req.body } : {};
    if (body.fullName === undefined && body.name !== undefined) body.fullName = body.name;
    delete body.name;
    const data = sanitize(body, USER_CREATE_SCHEMA, { required: ['email', 'password', 'fullName'] });
    const created = await createManagedUser(data as any);
    res.status(201).json(created);
  })
);

authRouter.patch(
  '/users/:id/role',
  requireSuperAdmin,
  ah(async (req, res) => {
    const { role } = sanitize(req.body, USER_ROLE_UPDATE_SCHEMA, { required: ['role'] });
    const updated = await updateManagedUserRole(req.params.id, role, req.user!.id);
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
