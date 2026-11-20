import {
  invalidateUserLookupCache,
  prisma,
  toStoredUser,
} from '../../config/prisma';
import {
  DUMMY_HASH,
  hashPassword,
  publicUser,
  signToken,
  verifyPassword,
} from '../../middlewares/auth.middleware';
import { HttpError } from '../../utils/validation';

export async function authenticateUser(email: string, password: string) {
  const dbUser = await prisma.user.findUnique({ where: { email } });
  const valid = await verifyPassword(password, dbUser?.passwordHash || DUMMY_HASH);
  if (!dbUser || !dbUser.passwordHash || !valid) {
    throw new HttpError(401, 'Invalid email or password.');
  }
  if (dbUser.isActive === false) {
    throw new HttpError(403, 'Tài khoản đã bị tạm khóa. Vui lòng liên hệ Superadmin.');
  }

  const updated = await prisma.user.update({
    where: { id: dbUser.id },
    data: { lastLoginAt: new Date() },
  });
  invalidateUserLookupCache(dbUser.id);

  const user = toStoredUser(updated);
  return { token: signToken(user), user: publicUser(user) };
}

export async function listAllUsers() {
  const dbUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      phoneNumber: true,
      avatarUrl: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  return dbUsers.map((u) => publicUser(toStoredUser(u)));
}

export async function createManagedUser(data: {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role?: 'ADMIN' | 'STAFF' | 'COACH' | 'PLAYER';
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (existing) {
    throw new HttpError(409, 'An account with this email already exists.');
  }
  const passwordHash = await hashPassword(data.password);
  const created = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber ?? null,
      avatarUrl: data.avatarUrl ?? null,
      role: data.role || 'PLAYER',
    },
  });
  return publicUser(toStoredUser(created));
}

export async function updateManagedUserRole(
  id: string,
  role: 'ADMIN' | 'STAFF' | 'COACH' | 'PLAYER',
  actorId: string
) {
  const { user } = await updateManagedStaff(id, { role }, actorId);
  return user;
}

export async function deleteManagedUser(id: string, actorId: string) {
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) throw new HttpError(404, 'User not found.');
  if (target.id === actorId || target.role === 'SUPERADMIN') {
    throw new HttpError(403, 'SUPERADMIN accounts cannot be deleted.');
  }
  await prisma.user.delete({ where: { id } });
  invalidateUserLookupCache(id);
  return { success: true };
}

export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser || !dbUser.passwordHash) {
    throw new HttpError(404, 'Account not found.');
  }

  const isCurrentValid = await verifyPassword(currentPassword, dbUser.passwordHash);
  if (!isCurrentValid) {
    throw new HttpError(400, 'Current password is incorrect.');
  }

  const isSamePassword =
    currentPassword === newPassword || (await verifyPassword(newPassword, dbUser.passwordHash));
  if (isSamePassword) {
    throw new HttpError(400, 'New password must be different from your current password.');
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      tokenVersion: { increment: 1 },
    },
  });
  invalidateUserLookupCache(userId);

  const stored = toStoredUser(updated);
  return {
    success: true,
    message: 'Password updated successfully.',
    token: signToken(stored),
    user: publicUser(stored),
  };
}

export async function resetStaffPassword(
  targetUserId: string,
  newPassword: string,
  actorId: string
) {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, role: true },
  });
  if (!target) {
    throw new HttpError(404, 'Account not found.');
  }
  if (target.id === actorId) {
    throw new HttpError(400, 'Please use Change My Password to update your own password.');
  }
  if (target.role === 'SUPERADMIN') {
    throw new HttpError(403, 'SUPERADMIN accounts cannot be reset from this endpoint.');
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      passwordHash,
      tokenVersion: { increment: 1 },
    },
  });
  invalidateUserLookupCache(targetUserId);

  return {
    success: true,
    message: `Password reset for ${updated.email}. Active sessions have been invalidated.`,
    user: publicUser(toStoredUser(updated)),
  };
}

export async function updateOwnProfile(
  userId: string,
  data: { fullName?: string; avatarUrl?: string }
) {
  const updateData: { fullName?: string; avatarUrl?: string | null } = {};
  if (data.fullName !== undefined) updateData.fullName = data.fullName;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl || null;

  if (Object.keys(updateData).length === 0) {
    throw new HttpError(400, 'At least one profile field (name or avatarUrl) is required.');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
  invalidateUserLookupCache(userId);

  return {
    success: true,
    user: publicUser(toStoredUser(updated)),
  };
}

export async function updateManagedStaff(
  targetUserId: string,
  data: {
    fullName?: string;
    avatarUrl?: string;
    role?: 'ADMIN' | 'STAFF' | 'COACH' | 'PLAYER';
    isActive?: boolean;
    forceLogout?: boolean;
  },
  actorId: string
) {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, role: true, isActive: true },
  });
  if (!target) {
    throw new HttpError(404, 'Account not found.');
  }

  const isSelf = target.id === actorId;
  const isTargetSuperAdmin = target.role === 'SUPERADMIN';

  if (data.role !== undefined && (isSelf || isTargetSuperAdmin)) {
    throw new HttpError(403, 'SUPERADMIN accounts cannot be demoted.');
  }
  if (data.isActive === false && (isSelf || isTargetSuperAdmin)) {
    throw new HttpError(403, 'Cannot suspend your own account or another SUPERADMIN.');
  }
  if (data.forceLogout === true && (isSelf || isTargetSuperAdmin)) {
    throw new HttpError(403, 'Cannot force-logout a SUPERADMIN account from this endpoint.');
  }

  const isSuspending = target.isActive !== false && data.isActive === false;
  const shouldRevokeSessions = isSuspending || data.forceLogout === true;

  const updateData: {
    fullName?: string;
    avatarUrl?: string | null;
    role?: 'ADMIN' | 'STAFF' | 'COACH' | 'PLAYER';
    isActive?: boolean;
    tokenVersion?: { increment: number };
  } = {};

  if (data.fullName !== undefined) updateData.fullName = data.fullName;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl || null;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (shouldRevokeSessions) updateData.tokenVersion = { increment: 1 };

  if (Object.keys(updateData).length === 0) {
    throw new HttpError(400, 'No valid fields provided for update.');
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: updateData,
  });
  invalidateUserLookupCache(targetUserId);

  return {
    success: true,
    sessionRevoked: shouldRevokeSessions,
    user: publicUser(toStoredUser(updated)),
  };
}
