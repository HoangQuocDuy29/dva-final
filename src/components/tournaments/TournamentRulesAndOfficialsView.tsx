import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, FileText, MapPin, ShieldCheck, UserCheck } from 'lucide-react';
import { OFFICIAL_ROLE_LABELS, Tournament } from '../../types';
import { ShareButton } from '../common/ShareButton';
import { formatEnglishDate } from '../../utils/date';
import { optimizeCloudinaryUrl } from '../../utils/cloudinary';

export const TournamentRulesView: React.FC<{ tournament: Tournament }> = ({ tournament }) => {
  const { t } = useTranslation('tournaments');
  const rulesUrl = `${window.location.origin}/tournaments/${tournament.slug}/rules`;

  return (
    <div className="rounded-3xl border border-[#1E293B] bg-[#111827] p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#F97316]" />
            <h3 className="font-heading font-black text-xl text-white">{t('rules.title')}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#F97316]" />
              {formatEnglishDate(tournament.startDate)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#38BDF8]" />
              {tournament.location}
            </span>
          </div>
        </div>

        <ShareButton
          url={rulesUrl}
          title={`${tournament.name} — Official Rules`}
          text={`Official Rules & Regulations for ${tournament.name}`}
          label={t('rules.copyZalo')}
        />
      </div>

      {tournament.rulesContent ? (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0B0F19] border border-[#1E293B]">
          <pre className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
            {tournament.rulesContent}
          </pre>
        </div>
      ) : (
        <p className="py-8 text-center text-xs text-slate-500">{t('rules.empty')}</p>
      )}
    </div>
  );
};

export const TournamentOfficialsView: React.FC<{ tournament: Tournament }> = ({ tournament }) => {
  const { t } = useTranslation('tournaments');

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-[#38BDF8]" />
        <h3 className="font-heading font-black text-xl text-white">{t('officials.title')}</h3>
      </div>

      {tournament.officials.length === 0 ? (
        <div className="rounded-3xl border border-[#1E293B] bg-[#111827] p-10 text-center space-y-2">
          <UserCheck className="w-9 h-9 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400">{t('officials.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournament.officials.map((off) => (
            <div
              key={off.id}
              className="rounded-3xl bg-[#111827] border border-[#1E293B] p-5 flex items-center gap-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#0B0F19] border border-[#1E293B] overflow-hidden shrink-0 flex items-center justify-center font-heading font-black text-lg text-[#38BDF8]">
                {off.avatarUrl ? (
                  <img
                    src={optimizeCloudinaryUrl(off.avatarUrl, 'card')}
                    alt={off.fullName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  off.fullName.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <span className="px-2 py-0.5 rounded bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 text-[10px] font-black uppercase">
                  {OFFICIAL_ROLE_LABELS[off.role] || off.role}
                </span>
                <h4 className="font-heading font-bold text-base text-white truncate">
                  {off.fullName}
                </h4>
                {off.certification && (
                  <p className="text-xs text-slate-400 truncate">{off.certification}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
