import { prisma } from '../../config/prisma';
import { getOrSetCache, invalidateCache } from '../../utils/cache';
import { HttpError } from '../../utils/validation';

const PUBLIC_TTL_MS = 5 * 60 * 1000;

export const DEFAULT_LEADERSHIP_SEED = [
  {
    name: 'Hoang Quoc Duy',
    badgeRole: 'FOUNDER & CLUB MANAGER',
    subtitle: 'Operations & Community Lead',
    bio: 'Founder and manager of DVA Volleyball Club. Oversees match scheduling, court coordination, and community activities to maintain an accessible, organized playing environment for all members.',
    footerRole: 'Role : Senior Squad Captain',
    avatarUrl: 'https://res.cloudinary.com/dsezvx7xf/image/upload/v1792859772/88fd036d-168d-4c9b-b74d-48448e5808da.png',
    accentColor: 'red',
    displayOrder: 0,
    isActive: true,
  },
  {
    name: 'Hoang Manh Kien',
    badgeRole: 'TECHNICAL & SYSTEM MANAGER',
    subtitle: 'Information Technology',
    bio: 'Manages the technical infrastructure and digital platforms of DVA. Responsible for system stability, match data tracking, and coordinating technical support during events.',
    footerRole: 'Role : System Technical',
    avatarUrl: 'https://res.cloudinary.com/dsezvx7xf/image/upload/v1792859693/dedfed66-f2fc-44ad-b4d8-e8b4bb66ef24.png',
    accentColor: 'blue',
    displayOrder: 1,
    isActive: true,
  },
  {
    name: 'Luong The Phong',
    badgeRole: 'JUNIOR TEAM CAPTAIN',
    subtitle: 'Squad Leader & Match Support',
    bio: 'Captain of the DVA Junior Team. Leads training drills on the court, supports match organization, and helps connect younger members with club activities.',
    footerRole: 'Role: Junior Squad Captain',
    avatarUrl: 'https://res.cloudinary.com/dsezvx7xf/image/upload/v1792864125/46219df4-39ee-4418-a31d-3c0d69cbf589.png',
    accentColor: 'orange',
    displayOrder: 2,
    isActive: true,
  },
  {
    name: 'Tran Cong Huy',
    badgeRole: 'YOUTH SQUAD CAPTAIN',
    subtitle: 'Squad Leader & Youth Development',
    bio: 'Captain of the DVA Youth Team, responsible for leading training sessions, instructing youth athletes on fundamental skills, and fostering team cohesion.',
    footerRole: 'Role : Youth Squad Captain',
    avatarUrl: 'https://res.cloudinary.com/dsezvx7xf/image/upload/v1793037457/dva_club/players/youth/mb/z9ttorct7lcif5wnvehe.png',
    accentColor: 'emerald',
    displayOrder: 3,
    isActive: true,
  },
  {
    name: 'Hoang Minh Hieu',
    badgeRole: 'SOCIAL MEDIA & COMMUNICATIONS',
    subtitle: 'Media & Community Channels',
    bio: 'Manages social media channels and communications for DVA. Captures match photos, posts game schedules, and keeps members updated across club platforms.',
    footerRole: 'Role: Social Media & Communications',
    avatarUrl: 'https://res.cloudinary.com/dsezvx7xf/image/upload/v1792919620/6d3b1902-b8d9-4097-b65e-fca87ecff4aa.png',
    accentColor: 'orange',
    displayOrder: 4,
    isActive: true,
  },
] as const;

let seedInflight: Promise<void> | null = null;

async function ensureLeadershipSeeded(): Promise<void> {
  if (seedInflight) return seedInflight;
  seedInflight = (async () => {
    const count = await prisma.leadershipMember.count();
    if (count === 0) {
      await prisma.leadershipMember.createMany({ data: [...DEFAULT_LEADERSHIP_SEED] });
    }
  })().finally(() => {
    seedInflight = null;
  });
  return seedInflight;
}

export async function listPublicLeadership() {
  return getOrSetCache('leadership:public', PUBLIC_TTL_MS, async () => {
    await ensureLeadershipSeeded();
    return prisma.leadershipMember.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
  });
}

export async function listAdminLeadership() {
  await ensureLeadershipSeeded();
  return prisma.leadershipMember.findMany({
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function createLeadershipMember(data: Record<string, any>) {
  await ensureLeadershipSeeded();
  const maxOrder = await prisma.leadershipMember.aggregate({ _max: { displayOrder: true } });
  const nextOrder = data.displayOrder !== undefined ? Number(data.displayOrder) : ((maxOrder._max.displayOrder ?? -1) + 1);
  const created = await prisma.leadershipMember.create({
    data: {
      name: data.name,
      badgeRole: data.badgeRole,
      subtitle: data.subtitle,
      bio: data.bio,
      footerRole: data.footerRole,
      avatarUrl: data.avatarUrl ? String(data.avatarUrl) : null,
      accentColor: data.accentColor || 'orange',
      displayOrder: nextOrder,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    },
  });
  invalidateCache('leadership');
  return created;
}

export async function updateLeadershipMember(id: string, data: Record<string, any>) {
  const existing = await prisma.leadershipMember.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Không tìm thấy thành viên Leadership.');
  const patch: Record<string, any> = {};
  for (const k of ['name', 'badgeRole', 'subtitle', 'bio', 'footerRole', 'accentColor'] as const) {
    if (data[k] !== undefined) patch[k] = data[k];
  }
  if (data.avatarUrl !== undefined) patch.avatarUrl = data.avatarUrl ? String(data.avatarUrl) : null;
  if (data.displayOrder !== undefined) patch.displayOrder = Number(data.displayOrder);
  if (data.isActive !== undefined) patch.isActive = Boolean(data.isActive);
  const updated = await prisma.leadershipMember.update({ where: { id }, data: patch });
  invalidateCache('leadership');
  return updated;
}

export async function deleteLeadershipMember(id: string) {
  const existing = await prisma.leadershipMember.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Không tìm thấy thành viên Leadership.');
  await prisma.leadershipMember.delete({ where: { id } });
  invalidateCache('leadership');
  return { success: true, id };
}
