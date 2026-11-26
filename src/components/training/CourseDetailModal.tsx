import React, { useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Target,
  CheckCircle2,
  Award,
  Compass,
  ArrowRight,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { TrainingCourse } from '../../types';
import { ShareButton } from '../common/ShareButton';

interface CourseDetailModalProps {
  course: TrainingCourse | null;
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (course: TrainingCourse) => void;
  getPriceUnitLabel: (course: TrainingCourse) => string;
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  course,
  isOpen,
  onClose,
  onEnroll,
  getPriceUnitLabel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !course) return null;

  const shareUrl = `${window.location.origin}/training?courseId=${course.id}`;

  // Tách danh sách quyền lợi theo từng dòng (newline), loại bỏ dòng trống
  const rawBenefits = Array.isArray(course.benefits)
    ? course.benefits
    : typeof course.benefits === 'string'
      ? [course.benefits]
      : [];
  const inclusionItems = rawBenefits
    .flatMap((item) => String(item || '').split('\n'))
    .map((line) => line.trim())
    .filter(Boolean);

  const enrolledCount = Math.max(0, Number(course.enrolledSlots || 0));
  const maxSlots = Math.max(0, Number(course.maxSlots || 0));
  const remainingSlots = maxSlots > 0 ? Math.max(0, maxSlots - enrolledCount) : 0;
  const fillPercent =
    maxSlots > 0 ? Math.min(100, Math.round((enrolledCount / maxSlots) * 100)) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      {/* Spatial Glassmorphism Modal with Flex Scroll Body + Fixed Safe-Area Footer */}
      <div
        className="w-full max-w-2xl max-h-[90dvh] flex flex-col dva-glass-modal overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable Top + Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* 1. HERO HEADER */}
          <div className="relative bg-white/[0.03] p-5 sm:p-7 border-b border-white/10">
            {/* Top Row: Badges (Left) + Actions (Right) */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                {course.level && (
                  <span className="px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider bg-orange-500/15 text-orange-300 border border-orange-500/35 backdrop-blur-md shadow-sm">
                    {course.level}
                  </span>
                )}
                {course.tag && (
                  <span className="px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-200 border border-amber-500/35 backdrop-blur-md shadow-sm">
                    {course.tag}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <ShareButton
                  url={shareUrl}
                  title={course.title}
                  text={course.description}
                  className="bg-white/[0.05] hover:bg-white/[0.12] border-white/15 text-slate-200 hover:text-white"
                />
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close course details"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/[0.06] hover:bg-white/15 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Course Title */}
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-snug">
              {course.title}
            </h2>

            {/* Target Audience */}
            {course.targetAudience && (
              <div className="mt-2.5 flex items-start sm:items-center gap-2 text-xs sm:text-sm text-slate-300">
                <Target className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 sm:mt-0" />
                <span className="leading-relaxed">
                  <strong className="text-slate-200 font-semibold">Target Audience:</strong> {course.targetAudience}
                </span>
              </div>
            )}
          </div>

          {/* BODY CONTENT */}
          <div className="p-5 sm:p-7 space-y-6">
            {/* 2. QUICK STATS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Card 1: Schedule */}
              {course.schedule && (
                <div className="col-span-2 sm:col-span-1 bg-white/[0.035] rounded-2xl border border-white/10 p-3.5 flex flex-col justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Schedule</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white leading-snug">
                    {course.schedule}
                  </p>
                </div>
              )}

              {/* Card 2: Duration */}
              {course.duration && (
                <div className="bg-white/[0.035] rounded-2xl border border-white/10 p-3.5 flex flex-col justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Duration</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white leading-snug">
                    {course.duration}
                  </p>
                </div>
              )}

              {/* Card 3: Max Slots & Registered */}
              {maxSlots > 0 && (
                <div className="bg-white/[0.035] rounded-2xl border border-white/10 p-3.5 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Max Slots</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/35">
                      {remainingSlots} spots left
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-sans tabular-nums font-bold text-white">
                        Registered: {enrolledCount}/{maxSlots}
                      </span>
                      <span className="text-[10px] font-sans tabular-nums text-slate-400">
                        {fillPercent}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. COACH SPOTLIGHT CARD */}
            {(course.coachName || course.coachTitle) && (
              <div className="bg-white/[0.035] rounded-2xl border border-white/10 p-4 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/35 flex items-center justify-center text-orange-400 shrink-0 shadow-inner">
                  <Award className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Coach In Charge
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {course.coachName && (
                      <span className="font-heading font-extrabold text-sm sm:text-base text-white">
                        {course.coachName}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/35">
                      VERIFIED COACH
                    </span>
                  </div>
                  {course.coachTitle && (
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      <span className="text-slate-500">Coach Title:</span> {course.coachTitle}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 4. PROGRAM OVERVIEW */}
            {course.description && (
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Program Overview</span>
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-white/[0.035] p-4 rounded-2xl border border-white/10">
                  {course.description}
                </p>
              </div>
            )}

            {/* 5. PACKAGE INCLUSIONS */}
            {inclusionItems.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  <span>Package Inclusions</span>
                </h4>
                <ul className="space-y-2">
                  {inclusionItems.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.035] hover:bg-white/[0.06] border border-white/10 transition-colors text-xs sm:text-sm text-slate-200 leading-relaxed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* 6. STICKY BOTTOM ACTION BAR (Never clipped on laptop or iOS Safari) */}
        <div className="shrink-0 bg-[#0B0D12]/90 backdrop-blur-xl px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Tuition Fee
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading text-2xl sm:text-3xl font-black text-amber-400 font-sans tabular-nums tracking-tight">
                {new Intl.NumberFormat('en-US').format(course.price)}
              </span>
              <span className="text-base font-bold text-amber-400">VND</span>
            </div>
            <span className="text-xs text-slate-400 font-medium block mt-0.5">
              Billing Unit: {getPriceUnitLabel(course)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onEnroll(course)}
            className="w-full sm:w-auto px-7 py-3.5 rounded-full font-black text-xs sm:text-sm text-white bg-gradient-to-r from-[#B91C1C] via-red-600 to-orange-500 hover:brightness-110 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_28px_rgba(249,115,22,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Enroll Now</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
