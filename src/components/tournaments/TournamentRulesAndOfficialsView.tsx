import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  GitBranch,
  ListOrdered,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';
import { OFFICIAL_ROLE_LABELS, Tournament, TournamentTeam } from '../../types';
import { ShareButton } from '../common/ShareButton';
import { formatTournamentScheduleDisplay } from '../../shared/tournaments';
import { OfficialAvatar } from './OfficialAvatar';
import { TournamentBracketView } from './TournamentBracketView';

interface RulesSectionBlock {
  heading?: string;
  items: Array<{ type: 'bullet' | 'paragraph'; text: string }>;
}

/** Parse Admin rulesContent safely into structured headings, bullet lists, and paragraphs. */
function parseRulesContent(raw: string): RulesSectionBlock[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const sections: RulesSectionBlock[] = [];
  let current: RulesSectionBlock = { items: [] };

  const pushCurrent = () => {
    if (current.heading || current.items.length > 0) {
      sections.push(current);
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const mdHeadingMatch = /^#{1,3}\s+(.+)$/.exec(line);
    const numberedHeadingMatch = /^(\d+[.)]\s+.+)$/.exec(line);
    const restAfterNumber = line.replace(/^\d+[.)]\s+/, '');
    const isLikelyNumberedHeading =
      Boolean(numberedHeadingMatch) &&
      line.length <= 85 &&
      !line.includes(' - ') &&
      (line === line.toUpperCase() || !restAfterNumber.includes('. '));

    if (mdHeadingMatch) {
      pushCurrent();
      current = { heading: mdHeadingMatch[1].replace(/\*\*/g, '').trim(), items: [] };
      continue;
    }

    if (numberedHeadingMatch && isLikelyNumberedHeading) {
      pushCurrent();
      current = { heading: numberedHeadingMatch[1].replace(/\*\*/g, '').trim(), items: [] };
      continue;
    }

    const bulletMatch = /^[-*•+]\s+(.+)$/.exec(line);
    if (bulletMatch) {
      current.items.push({ type: 'bullet', text: bulletMatch[1] });
      continue;
    }

    current.items.push({ type: 'paragraph', text: line });
  }

  pushCurrent();
  return sections;
}

/** Safely render inline `**bold**` segments and concise `Key: value` prefixes without HTML injection. */
function renderInlineRuleText(text: string): React.ReactNode {
  if (text.includes('**')) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={idx} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <React.Fragment key={idx}>{part}</React.Fragment>
      )
    );
  }

  const colonIdx = text.indexOf(':');
  if (colonIdx > 1 && colonIdx <= 38) {
    return (
      <>
        <strong className="font-bold text-slate-100">{text.slice(0, colonIdx + 1)}</strong>
        <span>{text.slice(colonIdx + 1)}</span>
      </>
    );
  }

  return text;
}

interface TournamentRulesViewProps {
  tournament: Tournament;
  onSelectTeam?: (team: TournamentTeam) => void;
  onOpenRegister?: () => void;
}

export const TournamentRulesView: React.FC<TournamentRulesViewProps> = ({
  tournament,
  onSelectTeam,
  onOpenRegister,
}) => {
  const { t } = useTranslation('tournaments');
  const rulesUrl = `${window.location.origin}/tournaments/${tournament.slug}/rules`;

  const parsedSections = React.useMemo(
    () => (tournament.rulesContent ? parseRulesContent(tournament.rulesContent) : []),
    [tournament.rulesContent]
  );

  const tieBreakers = [
    t('rules.quick.tieStep1'),
    t('rules.quick.tieStep2'),
    t('rules.quick.tieStep3'),
    t('rules.quick.tieStep4'),
    t('rules.quick.tieStep5'),
  ];

  const captainHighlights = [
    {
      icon: Clock,
      title: t('rules.highlights.checkinTitle'),
      desc: t('rules.highlights.checkinDesc', {
        time: tournament.startTime ? ` (${tournament.startTime})` : '',
      }),
      tone: 'border-sky-500/30 bg-sky-500/5 text-sky-300',
    },
    {
      icon: Shirt,
      title: t('rules.highlights.uniformTitle'),
      desc: t('rules.highlights.uniformDesc'),
      tone: 'border-orange-500/30 bg-orange-500/5 text-orange-300',
    },
    {
      icon: Users,
      title: t('rules.highlights.rosterTitle'),
      desc: t('rules.highlights.rosterDesc'),
      tone: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300',
    },
    {
      icon: ShieldAlert,
      title: t('rules.highlights.protestTitle'),
      desc: t('rules.highlights.protestDesc'),
      tone: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
    },
  ];

  const isSameSetFormat = tournament.groupSetFormat === tournament.knockoutSetFormat;

  return (
    <div className="space-y-6">
      {/* Header + Quick Share Link for Zalo Captain Group */}
      <div className="rounded-3xl border border-[#1E293B] bg-[#111827] p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#F97316]" />
              <h2 className="font-heading font-black text-xl sm:text-2xl text-white">
                {t('rules.title')}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
              <span className="font-bold text-white">{tournament.name}</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-[#F97316]" />
                {formatTournamentScheduleDisplay(tournament)}
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-[#38BDF8]" />
                {tournament.location}
              </span>
            </div>
          </div>

          <ShareButton
            url={rulesUrl}
            title={`${tournament.name} — Official Rules`}
            text={`Official Rules & Tournament Blueprint for ${tournament.name}`}
            label={t('rules.copyZalo')}
          />
        </div>

        {/* BLOCK 1: Quick Format & Scoring Strip */}
        <div className="space-y-3">
          <div className="text-[11px] font-black uppercase tracking-widest text-[#F97316]">
            {t('rules.quick.title')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {/* 1. Format */}
            <div className="rounded-2xl bg-[#0B0F19] border border-[#1E293B] p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#38BDF8]">
                <GitBranch className="w-4 h-4 shrink-0" />
                <span>{t('rules.quick.formatLabel')}</span>
              </div>
              <p className="text-xs text-slate-200 font-medium leading-relaxed">
                {tournament.trackingMode === 'FULL_BRACKET'
                  ? t('rules.quick.formatFull', { maxTeams: tournament.maxTeams || 8 })
                  : t('rules.quick.formatFocus')}
              </p>
            </div>

            {/* 2. Dynamic Set Scoring Rules */}
            <div className="rounded-2xl bg-[#0B0F19] border border-[#1E293B] p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#F97316]">
                <Trophy className="w-4 h-4 shrink-0" />
                <span>{t('rules.quick.setRulesLabel')}</span>
              </div>
              <div className="text-xs text-slate-200 leading-relaxed space-y-1">
                {isSameSetFormat ? (
                  <p className="font-medium">
                    {tournament.groupSetFormat === 'BO2'
                      ? t('rules.quick.bo2Desc')
                      : t('rules.quick.bo3Desc')}
                  </p>
                ) : (
                  <>
                    <p>
                      <span className="font-bold text-sky-300">{t('rules.quick.groupPrefix')}:</span>{' '}
                      {tournament.groupSetFormat === 'BO2'
                        ? t('rules.quick.bo2Desc')
                        : t('rules.quick.bo3Desc')}
                    </p>
                    <p>
                      <span className="font-bold text-amber-300">{t('rules.quick.knockoutPrefix')}:</span>{' '}
                      {tournament.knockoutSetFormat === 'BO2'
                        ? t('rules.quick.bo2Desc')
                        : t('rules.quick.bo3Desc')}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* 3. FIVB Points */}
            <div className="rounded-2xl bg-[#0B0F19] border border-[#1E293B] p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#FACC15]">
                <Award className="w-4 h-4 shrink-0" />
                <span>{t('rules.quick.fivbLabel')}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{t('rules.quick.fivbLines')}</p>
              {tournament.groupSetFormat === 'BO2' && (
                <span className="inline-block px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-[10px] font-bold text-sky-300">
                  {t('rules.quick.fivbBo2Note')}
                </span>
              )}
            </div>

            {/* 4. Tie-Breakers */}
            <div className="rounded-2xl bg-[#0B0F19] border border-[#1E293B] p-4 space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-emerald-400">
                <ListOrdered className="w-4 h-4 shrink-0" />
                <span>{t('rules.quick.tieBreakLabel')}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tieBreakers.map((step) => (
                  <span
                    key={step}
                    className="px-2 py-0.5 rounded-md bg-[#111827] border border-[#1E293B] text-[10px] font-semibold text-slate-200"
                  >
                    {step}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCK 2: Visual Tournament Pathway Blueprint */}
      <TournamentBracketView
        tournament={tournament}
        blueprintMode
        onSelectTeam={onSelectTeam}
        onOpenRegister={onOpenRegister}
      />

      {/* BLOCK 3: Detailed Official Rules & Captain Checklist */}
      <section className="rounded-3xl border border-[#1E293B] bg-[#111827] p-5 sm:p-7 space-y-6">
        <div className="flex items-center gap-2 border-b border-[#1E293B] pb-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <h3 className="font-heading font-black text-lg sm:text-xl text-white">
            {t('rules.detailsTitle')}
          </h3>
        </div>

        {/* Captain Key Regulations Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {captainHighlights.map(({ icon: Icon, title, desc, tone }) => (
            <div key={title} className={`rounded-2xl border p-4 space-y-1.5 ${tone}`}>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{title}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Parsed Rich Rules Document */}
        {parsedSections.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {parsedSections.map((sec, sIdx) => (
              <div
                key={`${sec.heading || 'sec'}-${sIdx}`}
                className="rounded-2xl bg-[#0B0F19] border border-[#1E293B] p-5 space-y-3"
              >
                {sec.heading && (
                  <h4 className="font-heading font-black text-sm sm:text-base text-[#F97316] tracking-wide flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-[#FACC15] to-[#F97316] shrink-0" />
                    <span>{sec.heading}</span>
                  </h4>
                )}
                <div className="space-y-2 text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {sec.items.map((item, iIdx) =>
                    item.type === 'bullet' ? (
                      <div key={iIdx} className="flex items-start gap-2.5 pl-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] mt-2 shrink-0" />
                        <p className="flex-1">{renderInlineRuleText(item.text)}</p>
                      </div>
                    ) : (
                      <p key={iIdx} className="text-slate-300">
                        {renderInlineRuleText(item.text)}
                      </p>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-xs text-slate-500">{t('rules.empty')}</p>
        )}
      </section>
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
              <OfficialAvatar
                avatarUrl={off.avatarUrl}
                fullName={off.fullName}
                sizeClass="w-16 h-16"
                textClass="font-heading font-black text-lg text-[#38BDF8]"
                preset="card"
              />
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
