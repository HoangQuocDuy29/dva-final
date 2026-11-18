import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Sparkles,
  Target,
  UserPlus,
  Users,
} from 'lucide-react';
import { MemberApplication, PlayerLevel, RotationKnowledge, VolleyballPosition } from '../types';
import { googleScriptSyncService, memberService } from '../services/api';
import { ContactBanner } from '../components/common/ContactBanner';
import { TRYOUT_COURT_MAPS_URL } from '../shared/tryoutEmail';

interface TryoutCriterionItem {
  number: string;
  title: string;
  subtitle: string;
  desc: string;
}

interface TryoutDaySlotOption {
  id: string;
  label: string;
}

function mapExperienceToSquad(expIndex: number, birthYearNum: number): {
  level: PlayerLevel;
  rotationKnowledge: RotationKnowledge;
} {
  if (expIndex === 3) return { level: 'SENIOR', rotationKnowledge: '5-1' };
  if (expIndex === 2) return { level: 'JUNIOR', rotationKnowledge: '5-1' };
  if (expIndex === 1) {
    return {
      level: birthYearNum >= 2010 ? 'YOUTH' : 'JUNIOR',
      rotationKnowledge: '4-2',
    };
  }
  return { level: 'YOUTH', rotationKnowledge: 'BEGINNER' };
}

export const TryoutPage: React.FC = () => {
  const { t, i18n } = useTranslation('tryout');

  const experienceOptions = t('form.experienceOptions', { returnObjects: true }) as string[];
  const daySlotOptions = t('form.daySlots', { returnObjects: true }) as TryoutDaySlotOption[];
  const criteriaItems = t('criteria.items', { returnObjects: true }) as TryoutCriterionItem[];

  const [fullName, setFullName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [zalo, setZalo] = useState('');
  const [gmail, setGmail] = useState('');
  const [height, setHeight] = useState('');
  const [position, setPosition] = useState<VolleyballPosition>('OH');
  const [experienceIdx, setExperienceIdx] = useState<number>(2);
  const [experienceDetail, setExperienceDetail] = useState('');
  const [selectedDaySlots, setSelectedDaySlots] = useState<string[]>([]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<MemberApplication | null>(null);

  const criteriaIcons = useMemo(
    () => [Activity, Target, Compass, HeartHandshake],
    []
  );

  const toggleDaySlot = (slotId: string) => {
    setSelectedDaySlots((prev) =>
      prev.includes(slotId) ? prev.filter((s) => s !== slotId) : [...prev, slotId]
    );
    if (fieldErrors.preferredDays) {
      setFieldErrors((prev) => ({ ...prev, preferredDays: '' }));
    }
  };

  const scrollToForm = () => {
    const el = document.getElementById('tryout-register-form');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const errors: Record<string, string> = {};
    const cleanName = fullName.trim();
    const cleanPhone = zalo.replace(/[\s.\-()]/g, '').trim();
    const cleanEmail = gmail.trim().toLowerCase();
    const parsedYear = Number(birthYear.trim());
    const parsedHeight = Number(height.trim());

    if (cleanName.length < 2) {
      errors.fullName = t('form.errors.fullName');
    }
    if (!Number.isInteger(parsedYear) || parsedYear < 1960 || parsedYear > 2016) {
      errors.birthYear = t('form.errors.birthYear');
    }
    if (!/^\+?\d{8,15}$/.test(cleanPhone)) {
      errors.phone = t('form.errors.phone');
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = t('form.errors.email');
    }
    if (!Number.isFinite(parsedHeight) || parsedHeight < 100 || parsedHeight > 250) {
      errors.height = t('form.errors.height');
    }
    if (selectedDaySlots.length === 0) {
      errors.preferredDays = t('form.errors.preferredDays');
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const baseExperience = experienceOptions[experienceIdx] || experienceOptions[0] || '1 – 3 years';
      const combinedExperience = experienceDetail.trim()
        ? `${baseExperience} — ${experienceDetail.trim()}`
        : baseExperience;
      const preferredDaysText = selectedDaySlots.join(', ');
      const { level, rotationKnowledge } = mapExperienceToSquad(experienceIdx, parsedYear);

      const created = await memberService.register({
        source: 'TRYOUT_PAGE',
        fullName: cleanName,
        birthYear: parsedYear,
        dob: `${parsedYear}-01-01`,
        position,
        level,
        height: Math.round(parsedHeight),
        weight: 0,
        spikeReach: 0,
        blockReach: 0,
        hometownCountry: 'Hà Nội',
        desiredJerseyNumber: 0,
        gmail: cleanEmail,
        instagram: 'None',
        zalo: cleanPhone,
        rotationKnowledge,
        experience: combinedExperience,
        preferredDays: preferredDaysText,
      });

      setSubmittedApp(created);

      // Realtime Google Sheets Sync (non-blocking)
      googleScriptSyncService.syncToGoogleSheet('TuyenThanhVien', {
        'Họ và tên': cleanName,
        'Ngày sinh': `${parsedYear}-01-01`,
        'Vị trí': position,
        'Cấp độ': level,
        'Số áo mong muốn': 0,
        'Chiều cao (cm)': Math.round(parsedHeight),
        'Cân nặng (kg)': 0,
        'Bật đập (cm)': 0,
        'Bật chắn (cm)': 0,
        'Số Zalo': cleanPhone,
        'Email': cleanEmail,
        'Instagram': 'None',
        'Chiến thuật 5-1': rotationKnowledge,
        'Kinh nghiệm': combinedExperience,
        'Khung ngày mong muốn': preferredDaysText,
        'Thời gian gửi': new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
      });
    } catch (err: any) {
      setSubmitError(
        err?.message ||
          (i18n.language?.startsWith('vi')
            ? 'Không thể gửi đăng ký Try-Out. Vui lòng thử lại.'
            : 'Unable to submit Try-Out registration. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedApp(null);
    setFullName('');
    setBirthYear('');
    setZalo('');
    setGmail('');
    setHeight('');
    setExperienceDetail('');
    setSelectedDaySlots([]);
    setFieldErrors({});
    setSubmitError(null);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white py-10 sm:py-12 overflow-x-hidden">
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161F30] via-[#1B1325] to-[#0E1524] border border-orange-500/30 p-6 sm:p-10 shadow-2xl">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-950/70 border border-red-700/70 text-red-300 text-xs font-bold uppercase tracking-widest">
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
                <button
                  type="button"
                  onClick={scrollToForm}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 shadow-lg shadow-red-900/40 hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t('hero.applyCta')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <Link
                  to="/information"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl font-bold text-xs sm:text-sm text-slate-200 bg-[#0E1524] hover:bg-slate-800 border border-slate-700 transition-colors"
                >
                  <span>{t('hero.backToInfo')}</span>
                </Link>
              </div>
            </div>

            {/* Minimum 5+ Athletes Callout Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-[#0B0F19]/90 border-2 border-orange-500/50 p-5 sm:p-6 shadow-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-950/80 border border-orange-700/60 text-orange-300 text-[10px] font-black uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5" />
                    <span>{t('hero.groupRuleBadge')}</span>
                  </span>
                  <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-2.5 py-1 rounded-lg">
                    5+ VĐV / Athletes
                  </span>
                </div>

                <h2 className="font-heading font-black text-lg sm:text-xl text-white leading-snug">
                  {t('hero.groupRuleTitle')}
                </h2>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('hero.groupRuleDesc')}
                </p>

                <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-400">
                  <MapPin className="w-4 h-4 text-red-500 shrink-0" />
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
            <span className="hidden sm:inline-block text-[11px] font-mono text-orange-400 bg-orange-950/40 border border-orange-800/60 px-3 py-1 rounded-lg">
              {t('schedule.sectionBadge')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Weekday & Saturday Evening */}
            <div className="bg-[#161F30] rounded-3xl border border-red-900/50 p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 rounded-lg text-[11px] font-bold uppercase bg-red-950 text-red-300 border border-red-800">
                  {t('schedule.eveningLabel')}
                </span>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono font-black text-2xl sm:text-3xl text-orange-400">
                    <Clock className="w-5 h-5 text-red-500 shrink-0" />
                    <span>{t('schedule.eveningTime')}</span>
                  </div>
                  <p className="text-sm font-bold text-white pt-1">{t('schedule.eveningDays')}</p>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
                  {t('schedule.eveningNote')}
                </p>
              </div>
            </div>

            {/* Card 2: Sunday Afternoon */}
            <div className="bg-[#161F30] rounded-3xl border border-sky-900/50 p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 rounded-lg text-[11px] font-bold uppercase bg-sky-950 text-sky-300 border border-sky-800">
                  {t('schedule.sundayLabel')}
                </span>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono font-black text-2xl sm:text-3xl text-sky-400">
                    <Clock className="w-5 h-5 text-sky-400 shrink-0" />
                    <span>{t('schedule.sundayTime')}</span>
                  </div>
                  <p className="text-sm font-bold text-white pt-1">{t('schedule.sundayDays')}</p>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
                  {t('schedule.sundayNote')}
                </p>
              </div>
            </div>

            {/* Card 3: Main Training Venue + Google Maps Button */}
            <div className="bg-gradient-to-b from-[#161F30] to-[#1A1628] rounded-3xl border-2 border-orange-500/40 p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 rounded-lg text-[11px] font-bold uppercase bg-orange-950 text-orange-300 border border-orange-800">
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

                <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-800 pt-3">
                  {t('schedule.venueStandards')}
                </p>
              </div>

              <a
                href={TRYOUT_COURT_MAPS_URL}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 flex items-center justify-center gap-2 shadow-lg transition-all"
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
                  className="bg-[#161F30] rounded-3xl border border-slate-800 hover:border-orange-500/40 p-6 shadow-xl transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600/20 to-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
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
                    <span className="font-mono font-black text-lg text-slate-600">{item.number}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 3: DIRECT TRY-OUT REGISTRATION FORM */}
        <section id="tryout-register-form" className="scroll-mt-24 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-red-500 shrink-0" />
              <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
                {t('form.sectionTitle')}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">{t('form.sectionSubtitle')}</p>
          </div>

          {submittedApp ? (
            <div className="rounded-3xl bg-gradient-to-br from-[#161F30] via-[#131C2D] to-[#0E1524] border-2 border-emerald-500/50 p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                      {t('success.badge')}
                    </span>
                    <h3 className="font-heading font-black text-xl sm:text-2xl text-white">
                      {t('success.title')}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{t('success.subtitle')}</p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-[#0B0F19] border border-slate-800 font-mono text-xs text-amber-400 font-bold self-start sm:self-center">
                  {t('success.passId')}: {submittedApp.id}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    {t('success.athlete')}
                  </span>
                  <strong className="text-white text-sm">{submittedApp.fullName}</strong>
                </div>
                <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    {t('success.position')}
                  </span>
                  <strong className="text-orange-400 text-sm">
                    {submittedApp.position} · {submittedApp.height}cm
                  </strong>
                </div>
                <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    {t('success.division')}
                  </span>
                  <strong className="text-sky-400 text-sm">{submittedApp.level}</strong>
                </div>
                <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    {t('success.preferred')}
                  </span>
                  <strong className="text-emerald-300 text-xs">
                    {submittedApp.preferredDays || 'Flexible'}
                  </strong>
                </div>
              </div>

              <div className="rounded-2xl bg-sky-950/30 border border-sky-700/40 p-4 space-y-1">
                <div className="text-xs font-bold text-sky-300">{t('success.nextStepTitle')}</div>
                <p className="text-xs text-slate-300 leading-relaxed">{t('success.nextStepDesc')}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-5 py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 cursor-pointer transition-all"
                >
                  {t('success.registerAnother')}
                </button>
                <Link
                  to="/information"
                  className="px-5 py-3 rounded-xl font-bold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  {t('success.viewInfo')}
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-[#161F30] rounded-3xl border border-slate-800 p-5 sm:p-8 shadow-2xl space-y-6"
            >
              {submitError && (
                <div className="bg-red-950/80 border border-red-500/60 text-red-200 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t('form.fullName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: '' }));
                    }}
                    placeholder={t('form.fullNamePlaceholder')}
                    className={`w-full py-2.5 px-3.5 text-sm rounded-xl bg-slate-900/70 border ${
                      fieldErrors.fullName ? 'border-red-500' : 'border-slate-700/80 focus:border-orange-500'
                    } text-white outline-none transition-colors placeholder:text-slate-500`}
                  />
                  {fieldErrors.fullName && (
                    <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.fullName}</span>
                    </p>
                  )}
                </div>

                {/* 2. Birth Year */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t('form.birthYear')}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    maxLength={4}
                    value={birthYear}
                    onChange={(e) => {
                      setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4));
                      if (fieldErrors.birthYear) setFieldErrors((p) => ({ ...p, birthYear: '' }));
                    }}
                    placeholder={t('form.birthYearPlaceholder')}
                    className={`w-full py-2.5 px-3.5 text-sm font-mono rounded-xl bg-slate-900/70 border ${
                      fieldErrors.birthYear ? 'border-red-500' : 'border-slate-700/80 focus:border-orange-500'
                    } text-white outline-none transition-colors placeholder:text-slate-500`}
                  />
                  {fieldErrors.birthYear && (
                    <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.birthYear}</span>
                    </p>
                  )}
                </div>

                {/* 3. Phone / Zalo */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t('form.phone')}
                  </label>
                  <input
                    type="tel"
                    required
                    value={zalo}
                    onChange={(e) => {
                      setZalo(e.target.value);
                      if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: '' }));
                    }}
                    placeholder={t('form.phonePlaceholder')}
                    className={`w-full py-2.5 px-3.5 text-sm font-mono rounded-xl bg-slate-900/70 border ${
                      fieldErrors.phone ? 'border-red-500' : 'border-slate-700/80 focus:border-orange-500'
                    } text-white outline-none transition-colors placeholder:text-slate-500`}
                  />
                  {fieldErrors.phone && (
                    <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.phone}</span>
                    </p>
                  )}
                </div>

                {/* 4. Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t('form.email')}
                  </label>
                  <input
                    type="email"
                    required
                    value={gmail}
                    onChange={(e) => {
                      setGmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
                    }}
                    placeholder={t('form.emailPlaceholder')}
                    className={`w-full py-2.5 px-3.5 text-sm rounded-xl bg-slate-900/70 border ${
                      fieldErrors.email ? 'border-red-500' : 'border-slate-700/80 focus:border-orange-500'
                    } text-white outline-none transition-colors placeholder:text-slate-500`}
                  />
                  {fieldErrors.email && (
                    <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.email}</span>
                    </p>
                  )}
                </div>

                {/* 5. Height (cm) */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t('form.height')}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    maxLength={3}
                    value={height}
                    onChange={(e) => {
                      setHeight(e.target.value.replace(/\D/g, '').slice(0, 3));
                      if (fieldErrors.height) setFieldErrors((p) => ({ ...p, height: '' }));
                    }}
                    placeholder={t('form.heightPlaceholder')}
                    className={`w-full py-2.5 px-3.5 text-sm font-mono font-bold rounded-xl bg-slate-900/70 border ${
                      fieldErrors.height ? 'border-red-500' : 'border-slate-700/80 focus:border-orange-500'
                    } text-white outline-none transition-colors placeholder:text-slate-500`}
                  />
                  {fieldErrors.height && (
                    <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.height}</span>
                    </p>
                  )}
                </div>

                {/* 6. Primary Position */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t('form.position')}
                  </label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value as VolleyballPosition)}
                    className="w-full py-2.5 px-3.5 text-sm font-semibold rounded-xl bg-slate-900/70 border border-slate-700/80 focus:border-orange-500 text-white outline-none cursor-pointer"
                  >
                    <option value="OH">{t('form.positions.OH')}</option>
                    <option value="MB">{t('form.positions.MB')}</option>
                    <option value="OP">{t('form.positions.OP')}</option>
                    <option value="S">{t('form.positions.S')}</option>
                    <option value="L">{t('form.positions.L')}</option>
                  </select>
                </div>
              </div>

              {/* 7. Volleyball Experience */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <label className="block text-xs font-bold text-slate-300">
                  {t('form.experience')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {experienceOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setExperienceIdx(idx)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                        experienceIdx === idx
                          ? 'border-orange-500 bg-orange-950/40 text-white ring-2 ring-orange-500/20'
                          : 'border-slate-800 bg-[#0E1524] hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={experienceDetail}
                  onChange={(e) => setExperienceDetail(e.target.value)}
                  placeholder={t('form.experienceDetailPlaceholder')}
                  className="w-full py-2.5 px-3.5 text-xs rounded-xl bg-slate-900/70 border border-slate-700/80 focus:border-orange-500 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              {/* 8. Preferred Try-Out Days */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="block text-xs font-bold text-slate-300">
                    {t('form.preferredDays')}
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t('form.preferredDaysHint')}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {daySlotOptions.map((slot) => {
                    const selected = selectedDaySlots.includes(slot.id);
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => toggleDaySlot(slot.id)}
                        className={`px-3.5 py-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          selected
                            ? 'border-red-500 bg-gradient-to-r from-red-950/80 to-orange-950/60 text-white shadow'
                            : 'border-slate-800 bg-[#0E1524] hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <span className="truncate">{slot.label}</span>
                        <span
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            selected
                              ? 'bg-orange-500 border-orange-400 text-white'
                              : 'border-slate-600 bg-slate-900'
                          }`}
                        >
                          {selected && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {fieldErrors.preferredDays && (
                  <p className="text-red-400 text-[11px] flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.preferredDays}</span>
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2.5 shadow-lg shadow-orange-950/30 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? t('form.submitting') : t('form.submit')}</span>
              </button>
            </form>
          )}
        </section>

        {/* Contact Banner */}
        <ContactBanner />
      </div>
    </div>
  );
};
