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
  const user = toStoredUser(dbUser);
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
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) throw new HttpError(404, 'User not found.');
  if (target.id === actorId || target.role === 'SUPERADMIN') {
    throw new HttpError(403, 'SUPERADMIN accounts cannot be demoted.');
  }
  const updated = await prisma.user.update({ where: { id }, data: { role } });
  invalidateUserLookupCache(id);
  return publicUser(toStoredUser(updated));
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
