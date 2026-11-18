import React, { useEffect, useState } from 'react';
import { optimizeCloudinaryLogoUrl } from '../../utils/cloudinary';

export interface TeamLogoProps {
  logoUrl?: string | null;
  name: string;
  shortName?: string | null;
  sizeClass?: string;
  imgWidth?: number;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({
  logoUrl,
  name,
  shortName,
  sizeClass = 'w-9 h-9',
  imgWidth = 160,
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const monogram =
    (shortName || '').replace(/\s+/g, '').slice(0, 4).toUpperCase() ||
    (name || 'DV')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 3)
      .toUpperCase() ||
    'DV';
  const optimized = logoUrl && !imgError ? optimizeCloudinaryLogoUrl(logoUrl, imgWidth) : '';

  if (optimized) {
    return (
      <div
        className={`${sizeClass} rounded-full overflow-hidden shrink-0 border border-white/15 bg-white flex items-center justify-center shadow-sm`}
      >
        <img
          src={optimized}
          alt={name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      title={name}
      className={`${sizeClass} rounded-full bg-gradient-to-br from-[#8B0000] via-[#7C2D12] to-[#0B0F19] border border-orange-400/40 overflow-hidden shrink-0 flex items-center justify-center shadow-inner`}
    >
      <span
        className={`font-athletic font-black ${
          monogram.length >= 4 ? 'text-[9px]' : 'text-[11px]'
        } text-white tracking-tight leading-none select-none`}
      >
        {monogram}
      </span>
    </div>
  );
};

export const TeamLogoBadge = TeamLogo;
