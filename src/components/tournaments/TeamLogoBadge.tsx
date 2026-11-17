import React, { useState } from 'react';
import { optimizeCloudinaryUrl } from '../../utils/cloudinary';

interface TeamLogoBadgeProps {
  logoUrl?: string | null;
  name: string;
  shortName?: string | null;
  sizeClass?: string;
  imgWidth?: number;
}

export const TeamLogoBadge: React.FC<TeamLogoBadgeProps> = ({
  logoUrl,
  name,
  shortName,
  sizeClass = 'w-9 h-9',
  imgWidth = 96,
}) => {
  const [imgError, setImgError] = useState(false);
  const monogram = (shortName || name || 'DV').slice(0, 3).toUpperCase();
  const optimized = logoUrl && !imgError ? optimizeCloudinaryUrl(logoUrl, imgWidth) : '';

  return (
    <div
      className={`${sizeClass} rounded-xl bg-[#0B0F19] border border-white/10 overflow-hidden shrink-0 flex items-center justify-center p-1 shadow-inner`}
    >
      {optimized ? (
        <img
          src={optimized}
          alt={name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain"
        />
      ) : (
        <span className="font-athletic font-black text-[11px] text-orange-400 tracking-tight select-none">
          {monogram}
        </span>
      )}
    </div>
  );
};
