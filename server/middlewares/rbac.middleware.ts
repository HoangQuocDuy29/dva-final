import type { RequestHandler } from 'express';
import type { UserRole } from '../../src/types';

/** Ensures `req.user` is populated via Bearer auth; responds 401 otherwise. */
export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.user) {
    return void res.status(401).json({ error: 'Authentication required.' });
  }
  next();
};

/** Requires `req.user.role` to be one of `allowedRoles`; responds 401/403 otherwise. */
export function requireRole(allowedRoles: readonly UserRole[], message?: string): RequestHandler {
  const allowed = new Set<UserRole>(allowedRoles);
  return (req, res, next) => {
    if (!req.user) {
      return void res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowed.has(req.user.role)) {
      return void res.status(403).json({
        error: message || 'You do not have permission to perform this action.',
      });
    }
    next();
  };
}

export const requireSuperAdmin: RequestHandler = requireRole(
  ['SUPERADMIN'],
  'Only SUPERADMIN can perform this action.'
);

export const requireAdminOrSuperAdmin: RequestHandler = requireRole(
  ['SUPERADMIN', 'ADMIN'],
  'Administrator access required.'
);

const SENSITIVE_FIELD_KEYS = new Set([
  'phone',
  'phoneNumber',
  'customerPhone',
  'captainPhone',
  'zalo',
  'email',
  'customerEmail',
  'captainEmail',
  'gmail',
  'instagram',
  'toEmail',
  'emergencyContact',
  'paymentProof',
  'transferContent',
  'entryFee',
  'entryFeeAmount',
  'entryFeePerTeam',
  'paidAt',
  'internalExpenseNote',
  'courtRevenue',
  'trainingRevenue',
  'storeRevenue',
  'guestSessionRevenue',
  'tryoutRevenue',
  'tournamentRevenue',
]);

/**
 * Recursive defense-in-depth sanitizer: strips any sensitive PII or financial fields
 * when the requester is NOT SUPERADMIN.
 */
export function stripSensitiveDataForRole<T>(payload: T, role?: UserRole): T {
  if (role === 'SUPERADMIN') return payload;
  if (Array.isArray(payload)) {
    return payload.map((item) => stripSensitiveDataForRole(item, role)) as unknown as T;
  }
  if (payload && typeof payload === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
      if (SENSITIVE_FIELD_KEYS.has(k)) continue;
      out[k] = stripSensitiveDataForRole(v, role);
    }
    return out as T;
  }
  return payload;
}
