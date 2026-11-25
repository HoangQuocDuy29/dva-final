import type { LeadershipAccentColor, LeadershipMember } from '../types';

export interface LeadershipAccentTheme {
  id: LeadershipAccentColor;
  label: string;
  swatch: string;
  badgeColor: string;
  subtitleColor: string;
  avatarGradient: string;
  hoverBorder: string;
}

export const LEADERSHIP_ACCENT_THEMES: Record<LeadershipAccentColor, LeadershipAccentTheme> = {
  emerald: {
    id: 'emerald',
    label: 'Xanh lá',
    swatch: 'bg-emerald-500',
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    subtitleColor: 'text-emerald-400',
    avatarGradient: 'from-emerald-600 to-teal-500',
    hoverBorder: 'hover:border-emerald-500/50',
  },
  orange: {
    id: 'orange',
    label: 'Cam DVA',
    swatch: 'bg-orange-500',
    badgeColor: 'bg-orange-950 text-orange-300 border-orange-800',
    subtitleColor: 'text-orange-400',
    avatarGradient: 'from-orange-600 to-amber-500',
    hoverBorder: 'hover:border-orange-500/50',
  },
  red: {
    id: 'red',
    label: 'Đỏ Cherry',
    swatch: 'bg-red-600',
    badgeColor: 'bg-red-950 text-red-400 border-red-800',
    subtitleColor: 'text-orange-400',
    avatarGradient: 'from-red-600 to-orange-500',
    hoverBorder: 'hover:border-red-500/50',
  },
  blue: {
    id: 'blue',
    label: 'Xanh dương',
    swatch: 'bg-blue-500',
    badgeColor: 'bg-blue-950 text-blue-300 border-blue-800',
    subtitleColor: 'text-blue-400',
    avatarGradient: 'from-blue-700 to-cyan-600',
    hoverBorder: 'hover:border-blue-500/50',
  },
};

export const LEADERSHIP_ACCENT_OPTIONS: LeadershipAccentTheme[] = [
  LEADERSHIP_ACCENT_THEMES.emerald,
  LEADERSHIP_ACCENT_THEMES.orange,
  LEADERSHIP_ACCENT_THEMES.red,
  LEADERSHIP_ACCENT_THEMES.blue,
];

export const getLeadershipTheme = (accent?: string): LeadershipAccentTheme =>
  LEADERSHIP_ACCENT_THEMES[(accent as LeadershipAccentColor)] || LEADERSHIP_ACCENT_THEMES.orange;

export const getLeadershipInitials = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'DVA';
  const last = parts[parts.length - 1];
  return last.slice(0, 5).toUpperCase();
};

export const DEFAULT_LEADERSHIP_FALLBACK: LeadershipMember[] = [
  {
    id: 'fallback-duy',
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
    id: 'fallback-kien',
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
    id: 'fallback-phong',
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
    id: 'fallback-huy',
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
    id: 'fallback-hieu',
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
];
