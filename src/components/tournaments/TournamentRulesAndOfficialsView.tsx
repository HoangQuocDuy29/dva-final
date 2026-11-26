import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Award,
  Ban,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Gavel,
  GitBranch,
  ListOrdered,
  Mail,
  MapPin,
  PackageCheck,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  Ticket,
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
  const [copiedProtestEmail, setCopiedProtestEmail] = useState(false);

  const handleCopyProtestEmail = () => {
    const email = t('rules.discipline.p3Email');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(email).catch(() => undefined);
    }
    setCopiedProtestEmail(true);
    setTimeout(() => setCopiedProtestEmail(false), 2000);
  };

  const disciplineRows = t('rules.discipline.rows', { returnObjects: true }) as Array<{
    no: string;
    violation: string;
    penalty: string;
  }>;
  const sectionXiiItems = t('rules.sectionXII.items', { returnObjects: true }) as string[];

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
  const formatSetRuleDesc = (fmt?: string) => {
    const code = String(fmt || 'BO3').toUpperCase();
    if (code === 'BO1_25') return t('rules.quick.bo1Desc');
    if (code === 'BO2') return t('rules.quick.bo2Desc');
    return t('rules.quick.bo3Desc');
  };

  return (
    <div className="space-y-6">
      {/* Header + Quick Share Link for Zalo Captain Group */}
      <div className="dva-glass-panel rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
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
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-1.5">
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
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#F97316]">
                <Trophy className="w-4 h-4 shrink-0" />
                <span>{t('rules.quick.setRulesLabel')}</span>
              </div>
              <div className="text-xs text-slate-200 leading-relaxed space-y-1">
                {isSameSetFormat && tournament.groupSetFormat !== 'BO1_25' ? (
                  <p className="font-medium">
                    {formatSetRuleDesc(tournament.groupSetFormat)}
                  </p>
                ) : (
                  <>
                    <p>
                      <span className="font-bold text-sky-300">{t('rules.quick.groupPrefix')}:</span>{' '}
                      {formatSetRuleDesc(tournament.groupSetFormat)}
                    </p>
                    <p>
                      <span className="font-bold text-amber-300">{t('rules.quick.knockoutPrefix')}:</span>{' '}
                      {formatSetRuleDesc(tournament.knockoutSetFormat)}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* 3. FIVB Points */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#FACC15]">
                <Award className="w-4 h-4 shrink-0" />
                <span>{t('rules.quick.fivbLabel')}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {tournament.groupSetFormat === 'BO1_25'
                  ? t('rules.quick.fivbBo1Lines')
                  : t('rules.quick.fivbLines')}
              </p>
              {tournament.groupSetFormat === 'BO2' && (
                <span className="inline-block px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-[10px] font-bold text-sky-300">
                  {t('rules.quick.fivbBo2Note')}
                </span>
              )}
            </div>

            {/* 4. Tie-Breakers */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-2">
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
      <section className="dva-glass-panel rounded-3xl p-5 sm:p-7 space-y-6">
        <div className="flex items-center gap-2 border-b border-white/10 pb-4">
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

        {/* Parsed Rich Rules Document (Admin Custom Notes if provided) */}
        {parsedSections.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {parsedSections.map((sec, sIdx) => (
              <div
                key={`${sec.heading || 'sec'}-${sIdx}`}
                className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 space-y-3"
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
        )}
      </section>

      {/* BLOCK 4: FIVB Official Rules & Updates + Local Amateur Eligibility Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FIVB Official Rules & Updates */}
        <section className="dva-glass-panel rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3.5">
              <h3 className="font-heading font-black text-base sm:text-lg text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#38BDF8] shrink-0" />
                <span>{t('rules.fivb.sectionTitle')}</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
                {t('rules.fivb.badge')}
              </span>
            </div>

            <div className="space-y-3">
              {[
                { title: t('rules.fivb.rule1Title'), desc: t('rules.fivb.rule1Desc') },
                { title: t('rules.fivb.rule2Title'), desc: t('rules.fivb.rule2Desc') },
                { title: t('rules.fivb.rule3Title'), desc: t('rules.fivb.rule3Desc') },
              ].map((rule) => (
                <div
                  key={rule.title}
                  className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-1.5"
                >
                  <h4 className="font-bold text-xs sm:text-sm text-[#38BDF8]">{rule.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{rule.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <a
            href="https://www.fivb.com/volleyball/the-game/official-volleyball-rules/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] border border-[#38BDF8]/40 text-xs font-bold text-[#38BDF8] flex items-center justify-center gap-2 transition-colors"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>{t('rules.fivb.ctaLabel')}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
        </section>

        {/* Local Amateur Eligibility Rules + Spectator Venue Fee */}
        <div className="space-y-6 flex flex-col">
          {/* Amateur Eligibility */}
          <section className="dva-glass-panel rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3.5">
              <h3 className="font-heading font-black text-base sm:text-lg text-white flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-400 shrink-0" />
                <span>{t('rules.eligibility.sectionTitle')}</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/15 text-red-300 border border-red-500/30">
                {t('rules.eligibility.badge')}
              </span>
            </div>

            <div className="rounded-2xl bg-red-950/20 border border-red-800/40 p-4 space-y-2.5">
              <div className="text-xs sm:text-sm font-bold text-red-300">
                {t('rules.eligibility.notAllowedTitle')}
              </div>
              <ul className="space-y-2 text-xs text-slate-200 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                  <span>{t('rules.eligibility.notAllowed1')}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                  <span>{t('rules.eligibility.notAllowed2')}</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl bg-[#0B0F19] border border-[#1E293B] px-4 py-3 text-xs text-slate-300 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{t('rules.eligibility.captainNote')}</span>
            </div>
          </section>

          {/* Spectator Entry Fee Card */}
          <section className="dva-glass-panel rounded-3xl border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-white/[0.04] to-white/[0.02] p-5 sm:p-6 space-y-4 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-3.5">
              <h3 className="font-heading font-black text-base sm:text-lg text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-[#FACC15] shrink-0" />
                <span>{t('rules.spectator.title')}</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/30">
                {t('rules.spectator.badge')}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-2xl bg-[#0B0F19]/90 border border-[#FACC15]/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-slate-300 font-semibold block">
                    {t('rules.spectator.feeLabel')}
                  </span>
                  <span className="text-[11px] text-slate-400">{t('rules.spectator.feeNote')}</span>
                </div>
                <span className="font-mono font-black text-lg sm:text-xl text-[#FACC15] whitespace-nowrap shrink-0">
                  {t('rules.spectator.feeValue')}
                </span>
              </div>

              <div className="rounded-2xl bg-emerald-950/25 border border-emerald-700/40 p-4 space-y-1">
                <div className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                  {t('rules.spectator.freeLabel')}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {t('rules.spectator.freeValue')}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* BLOCK 5: Section IX. Discipline & Protests */}
      <section className="dva-glass-panel rounded-3xl p-5 sm:p-7 space-y-6">
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
          <Gavel className="w-5 h-5 text-[#F97316]" />
          <h3 className="font-heading font-black text-lg sm:text-xl text-white">
            {t('rules.discipline.title')}
          </h3>
        </div>

        {/* 1. General Principles */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 space-y-3 text-xs sm:text-sm">
          <h4 className="font-heading font-bold text-sm sm:text-base text-[#F97316]">
            {t('rules.discipline.part1Title')}
          </h4>
          <div className="space-y-2.5 text-slate-200 leading-relaxed">
            <p>
              <strong className="text-white">{t('rules.discipline.p1_1Label')}</strong>{' '}
              {t('rules.discipline.p1_1Desc')}
            </p>
            <div className="space-y-1.5">
              <p className="font-bold text-white">{t('rules.discipline.p1_2Label')}</p>
              <div className="pl-3 space-y-1.5 text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="text-[#38BDF8] font-bold">+</span>
                  <span>{t('rules.discipline.p1_2Item1')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#38BDF8] font-bold">+</span>
                  <span>{t('rules.discipline.p1_2Item2')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Violations & Penalties Table */}
        <div className="space-y-3">
          <h4 className="font-heading font-bold text-sm sm:text-base text-[#F97316]">
            {t('rules.discipline.part2Title')}
          </h4>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full min-w-[540px] text-xs sm:text-sm text-left border-collapse">
                <thead className="bg-transparent">
                  <tr className="bg-transparent text-slate-300 text-[11px] uppercase tracking-wider border-b border-white/[0.08]">
                    <th className="py-3 px-4 w-16 text-center">{t('rules.discipline.colNo')}</th>
                    <th className="py-3 px-4">{t('rules.discipline.colViolation')}</th>
                    <th className="py-3 px-4">{t('rules.discipline.colPenalty')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] bg-transparent">
                  {Array.isArray(disciplineRows) &&
                    disciplineRows.map((row) => (
                      <tr key={row.no} className="bg-transparent hover:bg-white/[0.05] transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-bold text-[#F97316]">
                          {row.no}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">{row.violation}</td>
                        <td className="py-3 px-4 text-amber-200 font-medium">{row.penalty}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 3. Protest Procedure & Email */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 space-y-3 text-xs sm:text-sm">
          <h4 className="font-heading font-bold text-sm sm:text-base text-[#F97316]">
            {t('rules.discipline.part3Title')}
          </h4>
          <ul className="space-y-2.5 text-slate-200 leading-relaxed">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] mt-2 shrink-0" />
              <span>{t('rules.discipline.p3Item1')}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] mt-2 shrink-0" />
              <div className="flex flex-wrap items-center gap-2">
                <span>
                  {t('rules.discipline.p3Item2Prefix')}{' '}
                  <code className="px-2 py-0.5 rounded bg-[#111827] border border-[#1E293B] font-mono font-bold text-[#FACC15]">
                    {t('rules.discipline.p3EmailSubject')}
                  </code>{' '}
                  {t('rules.discipline.p3Item2Mid')}{' '}
                  <a
                    href={`mailto:${t('rules.discipline.p3Email')}?subject=${encodeURIComponent(
                      t('rules.discipline.p3EmailSubject')
                    )}`}
                    className="font-mono font-bold text-[#38BDF8] hover:underline"
                  >
                    {t('rules.discipline.p3Email')}
                  </a>
                </span>
                <button
                  type="button"
                  onClick={handleCopyProtestEmail}
                  className="px-2.5 py-1 rounded-lg bg-[#111827] hover:bg-[#1E293B] border border-[#1E293B] text-[11px] font-bold text-sky-300 inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedProtestEmail ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300">{t('rules.discipline.copiedEmail')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{t('rules.discipline.copyEmail')}</span>
                    </>
                  )}
                </button>
                <a
                  href={`mailto:${t('rules.discipline.p3Email')}?subject=${encodeURIComponent(
                    t('rules.discipline.p3EmailSubject')
                  )}`}
                  className="px-2.5 py-1 rounded-lg bg-[#F97316]/15 hover:bg-[#F97316]/25 border border-[#F97316]/40 text-[11px] font-bold text-orange-300 inline-flex items-center gap-1"
                >
                  <Mail className="w-3 h-3" />
                  <span>{t('rules.discipline.sendEmail')}</span>
                </a>
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] mt-2 shrink-0" />
              <span>{t('rules.discipline.p3Item3')}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] mt-2 shrink-0" />
              <span>{t('rules.discipline.p3Item4')}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] mt-2 shrink-0" />
              <span className="font-bold text-white">{t('rules.discipline.p3Item5')}</span>
            </li>
          </ul>
        </div>
      </section>

      {/* BLOCK 6: Sections X, XI & XII */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* X. Officiating */}
        <section className="dva-glass-panel rounded-3xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <ShieldCheck className="w-5 h-5 text-[#38BDF8]" />
            <h3 className="font-heading font-black text-base sm:text-lg text-white">
              {t('rules.sectionX.title')}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {t('rules.sectionX.desc')}
          </p>
        </section>

        {/* XI. Other Regulations */}
        <section className="dva-glass-panel rounded-3xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Scale className="w-5 h-5 text-[#FACC15]" />
            <h3 className="font-heading font-black text-base sm:text-lg text-white">
              {t('rules.sectionXI.title')}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {t('rules.sectionXI.desc')}
          </p>
        </section>
      </div>

      {/* XII. Logistics & Venue Requirements + Sign-off */}
      <section className="dva-glass-panel rounded-3xl p-5 sm:p-7 space-y-6">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3.5">
          <PackageCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="font-heading font-black text-lg sm:text-xl text-white">
            {t('rules.sectionXII.title')}
          </h3>
        </div>

        <ul className="space-y-2.5 text-xs sm:text-sm text-slate-200 leading-relaxed">
          {Array.isArray(sectionXiiItems) &&
            sectionXiiItems.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
        </ul>

        {/* Formal Organizing Committee Sign-off */}
        <div className="pt-4 border-t border-[#1E293B] flex justify-end">
          <div className="text-right space-y-1 px-4 py-2">
            <p className="text-xs text-slate-400 italic">{t('rules.signoff.regards')}</p>
            <p className="font-heading font-black text-sm sm:text-base tracking-wider uppercase text-[#F97316]">
              {t('rules.signoff.committee')}
            </p>
            <p className="font-heading font-black text-lg sm:text-xl text-white pt-2">
              {t('rules.signoff.name')}
            </p>
            <p className="text-xs font-medium italic text-[#38BDF8]">{t('rules.signoff.club')}</p>
          </div>
        </div>
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
        <div className="dva-glass-panel rounded-3xl p-10 text-center space-y-2">
          <UserCheck className="w-9 h-9 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400">{t('officials.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournament.officials.map((off) => (
            <div
              key={off.id}
              className="dva-glass-card p-5 flex items-center gap-4"
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
