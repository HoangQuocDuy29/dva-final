import React, { useEffect, useState } from 'react';
import { CloudinaryImagePreset, optimizeCloudinaryUrl } from '../../utils/cloudinary';

export interface OfficialAvatarProps {
  avatarUrl?: string | null;
  fullName: string;
  sizeClass?: string;
  bgClass?: string;
  textClass?: string;
  preset?: CloudinaryImagePreset | number;
}

/**
 * Shared referee/official avatar with Cloudinary optimization, external HTTPS URL passthrough,
 * and automatic monogram fallback when empty or when image loading fails.
 */
export const OfficialAvatar: React.FC<OfficialAvatarProps> = ({
  avatarUrl,
  fullName,
  sizeClass = 'w-12 h-12',
  bgClass = 'bg-[#0B0F19] border-[#1E293B]',
  textClass = 'font-black text-sky-400',
  preset = 'thumb',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const trimmedUrl = avatarUrl?.trim() || '';
  const resolvedSrc = trimmedUrl && !imgError ? optimizeCloudinaryUrl(trimmedUrl, preset) : '';
  const fallbackText = (fullName.trim() || 'OF').slice(0, 2).toUpperCase();

  return (
    <div
      className={`${sizeClass} rounded-2xl border ${bgClass} overflow-hidden shrink-0 flex items-center justify-center ${textClass} select-none`}
    >
      {resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={fullName}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{fallbackText}</span>
      )}
    </div>
  );
};
