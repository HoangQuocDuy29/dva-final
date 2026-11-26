import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ArrowRight,
  Award,
  Calendar,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  HeartHandshake,
  MapPin,
  Sparkles,
  Target,
  UserPlus,
  Users,
} from 'lucide-react';
import { ContactBanner } from '../components/common/ContactBanner';
import { TRYOUT_COURT_MAPS_URL } from '../shared/tryoutEmail';

interface TryoutCriterionItem {
  number: string;
  title: string;
  subtitle: string;
  desc: string;
}

export const TryoutPage: React.FC = () => {
  const { t } = useTranslation('tryout');

  const criteriaItems = t('criteria.items', { returnObjects: true }) as TryoutCriterionItem[];

  const criteriaIcons = useMemo(
    () => [Activity, Target, Compass, HeartHandshake],
    []
  );

  return (
    <div className="min-h-screen text-white py-10 sm:py-12 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-400">
          <Link to="/information" className="hover:text-white transition-colors font-semibold">
            {t('breadcrumb.information')}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-orange-400 font-bold">{t('breadcrumb.tryout')}</span>
        </nav>

        {/* HERO & OVERVIEW SECTION */}
        <section className="relative overflow-hidden dva-glass-panel rounded-3xl border-orange-500/25 p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="dva-glass-pill inline-flex items-center gap-2 px-3.5 py-1.5 text-orange-300 border-orange-500/30 text-xs font-bold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>{t('hero.badge')}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-heading tracking-tight leading-tight">
                {t('hero.title')}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                {t('hero.subtitle')}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-black text-xs sm:text-sm text-white bg-gradient-to-r from-[#B91C1C] via-red-600 to-orange-500 hover:brightness-110 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_28px_rgba(249,115,22,0.35)] active:scale-[0.98] transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t('hero.applyCta')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/information/skill-levels"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full font-semibold text-xs sm:text-sm text-orange-200 hover:text-white bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 backdrop-blur-md transition-all"
                >
                  <span>🇺🇸</span>
                  <span>Bảng Phân Cấp Trình Độ (USAV)</span>
                </Link>

                <Link
                  to="/information"
                  className="dva-glass-pill inline-flex items-center gap-2 px-5 py-3.5 font-semibold text-xs sm:text-sm text-slate-200 hover:text-white hover:bg-white/10 transition-all"
                >
                  <span>{t('hero.backToInfo')}</span>
                </Link>
              </div>
            </div>

            {/* Minimum 5+ Athletes Callout Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-orange-500/35 p-5 sm:p-6 shadow-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/35 text-orange-300 text-[10px] font-black uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5" />
                    <span>{t('hero.groupRuleBadge')}</span>
                  </span>
                  <span className="font-sans tabular-nums text-xs font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/35 px-3 py-1 rounded-full">
                    5+ VĐV / Athletes
                  </span>
                </div>

                <h2 className="font-heading font-black text-lg sm:text-xl text-white leading-snug">
                  {t('hero.groupRuleTitle')}
                </h2>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('hero.groupRuleDesc')}
                </p>

                <div className="pt-2.5 border-t border-white/10 flex items-center gap-2 text-xs text-slate-300">
                  <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                  <span className="font-semibold text-slate-200">{t('hero.venueChip')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 1: WEEKLY SCHEDULE CARDS & MAIN VENUE */}
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-red-500 shrink-0" />
              <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
                {t('schedule.sectionTitle')}
              </h2>
            </div>
            <span className="hidden sm:inline-block text-[11px] font-sans tabular-nums font-semibold text-orange-300 bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-full">
              {t('schedule.sectionBadge')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {/* Card 1: Weekday & Saturday Evening */}
            <div className="dva-glass-card border-white/10 hover:border-red-500/35 p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase bg-red-500/15 text-red-300 border border-red-500/35">
                  {t('schedule.eveningLabel')}
                </span>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-sans tabular-nums font-black text-2xl sm:text-3xl text-orange-400">
                    <Clock className="w-5 h-5 text-red-500 shrink-0" />
                    <span>{t('schedule.eveningTime')}</span>
                  </div>
                  <p className="text-sm font-bold text-white pt-1">{t('schedule.eveningDays')}</p>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed border-t border-white/10 pt-3">
                  {t('schedule.eveningNote')}
                </p>
              </div>
            </div>

            {/* Card 2: Sunday Afternoon */}
            <div className="dva-glass-card border-white/10 hover:border-sky-500/35 p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase bg-sky-500/15 text-sky-300 border border-sky-500/35">
                  {t('schedule.sundayLabel')}
                </span>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-sans tabular-nums font-black text-2xl sm:text-3xl text-sky-400">
                    <Clock className="w-5 h-5 text-sky-400 shrink-0" />
                    <span>{t('schedule.sundayTime')}</span>
                  </div>
                  <p className="text-sm font-bold text-white pt-1">{t('schedule.sundayDays')}</p>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed border-t border-white/10 pt-3">
                  {t('schedule.sundayNote')}
                </p>
              </div>
            </div>

            {/* Card 3: Main Training Venue + Google Maps Button */}
            <div className="dva-glass-card border-orange-500/35 hover:border-orange-400/60 p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase bg-orange-500/15 text-orange-300 border border-orange-500/35">
                  {t('schedule.venueTitle')}
                </span>

                <div className="space-y-1">
                  <h3 className="font-heading font-black text-lg text-white">
                    {t('schedule.venueName')}
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-orange-400 flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{t('schedule.venueAddress')}</span>
                  </p>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed border-t border-white/10 pt-3">
                  {t('schedule.venueStandards')}
                </p>
              </div>

              <a
                href={TRYOUT_COURT_MAPS_URL}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-full font-bold text-xs text-white bg-gradient-to-r from-[#B91C1C] via-red-600 to-orange-500 hover:brightness-110 flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_22px_rgba(249,115,22,0.3)] active:scale-[0.98] transition-all"
              >
                <MapPin className="w-4 h-4" />
                <span>{t('schedule.openMaps')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </section>

        {/* SECTION 2: SKILL TESTS & EVALUATION CRITERIA */}
        <section className="space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-red-500 shrink-0" />
              <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
                {t('criteria.sectionTitle')}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">{t('criteria.sectionSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {criteriaItems.map((item, idx) => {
              const Icon = criteriaIcons[idx % criteriaIcons.length];
              return (
                <div
                  key={item.number}
                  className="dva-glass-card hover:border-orange-500/40 p-6 shadow-xl transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600/20 to-orange-500/20 border border-orange-500/35 flex items-center justify-center text-orange-400 shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 block">
                          {item.subtitle}
                        </span>
                        <h3 className="font-heading font-black text-base sm:text-lg text-white">
                          {item.title}
                        </h3>
                      </div>
                    </div>
                    <span className="font-sans tabular-nums font-black text-lg text-slate-600">{item.number}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/10 pt-3">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact Banner */}
        <ContactBanner />

        {/* SECTION 3: TRY-OUT REGISTRATION CTA CARD */}
        <section className="relative overflow-hidden dva-glass-panel rounded-3xl border-orange-500/35 p-7 sm:p-10 shadow-2xl shadow-orange-950/20 text-center">
          <div className="absolute -top-20 right-1/4 w-72 h-72 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 left-1/4 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/35 text-orange-300 text-xs font-bold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-orange-400" />
              <span>{t('cta.badge')}</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight">
                {t('cta.title')}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-orange-300">
                {t('cta.scheduleSummary')}
              </p>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl mx-auto">
              {t('cta.desc')}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs">
              <span className="dva-glass-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 text-slate-200 font-sans tabular-nums">
                <Clock className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>{t('cta.eveningChip')}</span>
              </span>
              <span className="dva-glass-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 text-slate-200 font-sans tabular-nums">
                <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>{t('cta.sundayChip')}</span>
              </span>
              <span className="dva-glass-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 text-slate-200 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>{t('cta.venueChip')}</span>
              </span>
            </div>

            <div className="pt-2">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full font-black text-sm text-white bg-gradient-to-r from-[#B91C1C] via-red-600 to-orange-500 hover:brightness-110 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_28px_rgba(249,115,22,0.35)] active:scale-[0.98] transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t('cta.button')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
