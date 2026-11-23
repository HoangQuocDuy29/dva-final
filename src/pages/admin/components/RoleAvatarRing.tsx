import React, { useState, useEffect } from 'react';
import type { UserRole } from '../../../types';
import { optimizeCloudinaryUrl } from '../../../utils/cloudinary';

export type RoleAvatarRingSize = 'sm' | 'md' | 'lg' | 'xl';

interface RoleRingStyle {
  gradient: string;
  spinClass: string;
  glowClass?: string;
  thin?: boolean;
}

const ROLE_RING_STYLES: Record<UserRole, RoleRingStyle> = {
  SUPERADMIN: {
    gradient: 'conic-gradient(from 0deg, #FF3B30, #FF9500, #34C759, #007AFF, #AF52DE, #FF3B30)',
    spinClass: 'animate-[spin_6s_linear_infinite] motion-reduce:animate-none will-change-transform',
    glowClass: 'blur-[2px] opacity-75',
  },
  ADMIN: {
    gradient: 'conic-gradient(from 0deg, #F97316, #EC4899, #FACC15, #F97316)',
    spinClass: 'animate-[spin_10s_linear_infinite] motion-reduce:animate-none will-change-transform',
    glowClass: 'blur-[2px] opacity-60',
  },
  COACH: {
    gradient: 'conic-gradient(from 135deg, #8B5CF6, #3B82F6, #06B6D4, #8B5CF6)',
    spinClass: '',
    glowClass: 'blur-[2px] opacity-40',
  },
  STAFF: {
    gradient: 'conic-gradient(from 135deg, #10B981, #14B8A6, #84CC16, #10B981)',
    spinClass: '',
  },
  CAPTAIN: {
    gradient: 'conic-gradient(from 0deg, #06B6D4, #10B981, #FACC15, #06B6D4)',
    spinClass: 'animate-[spin_12s_linear_infinite] motion-reduce:animate-none will-change-transform',
    glowClass: 'blur-[2px] opacity-55',
  },
  PLAYER: {
    gradient: 'conic-gradient(from 135deg, #38BDF8, #94A3B8, #38BDF8)',
    spinClass: '',
    thin: true,
  },
  GUEST: {
    gradient: 'conic-gradient(from 135deg, #38BDF8, #94A3B8, #38BDF8)',
    spinClass: '',
    thin: true,
  },
};

const SIZE_CONFIG: Record<
  RoleAvatarRingSize,
  { outer: string; ringPad: string; thinRingPad: string; text: string }
> = {
  sm: { outer: 'w-9 h-9', ringPad: 'p-[2px]', thinRingPad: 'p-[1.5px]', text: 'text-[10px]' },
  md: { outer: 'w-10 h-10', ringPad: 'p-[2px]', thinRingPad: 'p-[1.5px]', text: 'text-xs' },
  lg: { outer: 'w-12 h-12', ringPad: 'p-[2px]', thinRingPad: 'p-[1.5px]', text: 'text-sm' },
  xl: { outer: 'w-[72px] h-[72px]', ringPad: 'p-[2.5px]', thinRingPad: 'p-[2px]', text: 'text-lg' },
};

export function getUserInitials(name?: string, email?: string): string {
  const source = (name || email || 'A').trim();
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return initials || 'A';
}

export interface RoleAvatarRingProps {
  name?: string;
  avatarUrl?: string | null;
  role?: UserRole;
  size?: RoleAvatarRingSize;
  email?: string;
  dimmed?: boolean;
  className?: string;
}

/**
 * Google Pro-inspired 3-layer Magic Avatar Ring differentiated by RBAC role:
 * 1. Outer conic-gradient ring (+ optional soft aura glow & smooth independent spin)
 * 2. Inner dark gap (`bg-[#0B1120] p-[2px]`) for razor-sharp separation
 * 3. Stationary circular avatar core (Cloudinary-optimized photo or initials fallback)
 */
export const RoleAvatarRing: React.FC<RoleAvatarRingProps> = ({
  name,
  avatarUrl,
  role = 'PLAYER',
  size = 'md',
  email,
  dimmed = false,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const ringStyle = ROLE_RING_STYLES[role] ?? ROLE_RING_STYLES.PLAYER;
  const dims = SIZE_CONFIG[size];
  const ringPad = ringStyle.thin ? dims.thinRingPad : dims.ringPad;
  const trimmedUrl = avatarUrl?.trim() || '';
  const resolvedSrc = trimmedUrl ? optimizeCloudinaryUrl(trimmedUrl, 'thumb') : '';
  const activeSpin = dimmed ? '' : ringStyle.spinClass;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full shrink-0 ${dims.outer} ${ringPad} ${
        dimmed ? 'opacity-50 grayscale' : ''
      } ${className}`}
    >
      {/* Layer 1a: Optional soft outer aura glow (spins independently with ring) */}
      {ringStyle.glowClass && !dimmed && (
        <span
          aria-hidden="true"
          style={{ background: ringStyle.gradient }}
          className={`pointer-events-none absolute inset-0 rounded-full ${ringStyle.glowClass} ${activeSpin}`}
        />
      )}

      {/* Layer 1b: Crisp conic-gradient ring (rotates independently; inner core stays stationary) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full overflow-hidden"
      >
        <span
          style={{ background: ringStyle.gradient }}
          className={`block w-full h-full rounded-full ${activeSpin}`}
        />
      </span>

      {/* Layer 2: Inner dark gap separating ring and portrait */}
      <div className="relative z-10 w-full h-full rounded-full bg-[#0B1120] p-[2px]">
        {/* Layer 3: Stationary avatar core */}
        <div
          className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center ${
            resolvedSrc && !imgError
              ? 'bg-[#0B1120]'
              : 'bg-gradient-to-br from-slate-800 to-slate-900 font-black text-white select-none'
          } ${dims.text}`}
        >
          {resolvedSrc && !imgError ? (
            <img
              src={resolvedSrc}
              alt={name || email || 'User avatar'}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            getUserInitials(name, email)
          )}
        </div>
      </div>
    </div>
  );
};
