import React, { useState, useEffect } from 'react';

export interface AthleteRosterAvatarProps {
  avatarUrl?: string;
  fullName: string;
  jerseyNumber: number | string;
}

export const AthleteRosterAvatar: React.FC<AthleteRosterAvatarProps> = ({
  avatarUrl,
  fullName,
  jerseyNumber,
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  if (!avatarUrl || imageError) {
    return (
      <div className="w-12 h-14 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-center font-athletic font-black text-orange-400 text-lg shrink-0 shadow-inner">
        #{jerseyNumber}
      </div>
    );
  }

  return (
    <div className="w-12 h-14 rounded-xl border border-slate-700/60 bg-slate-900 overflow-hidden relative shrink-0 flex items-center justify-center shadow-sm">
      <img
        src={avatarUrl}
        alt={fullName}
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
        className="w-full h-full object-cover object-top"
      />
      <span className="text-[10px] font-bold text-amber-500 bg-black/70 px-1 rounded absolute bottom-0.5 right-0.5 font-mono leading-tight select-none">
        #{jerseyNumber}
      </span>
    </div>
  );
};
