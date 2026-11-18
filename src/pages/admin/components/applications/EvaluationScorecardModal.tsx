import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  History,
  Instagram,
  Loader2,
  Mail,
  MessageSquare,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { MemberApplication, PlayerLevel, TryoutEvaluationScores } from '../../../../types';
import { memberService } from '../../../../services/api';
import {
  TRYOUT_CRITERIA_LABELS,
  TRYOUT_IG_COACH_HANDLE,
  TRYOUT_ZALO_JUNIOR_URL,
  TRYOUT_ZALO_SENIOR_URL,
  buildTryoutResultEmailHtml,
} from '../../../../shared/tryoutEmail';

const ASSIGNABLE_LEVELS: ReadonlyArray<{
  value: PlayerLevel;
  label: string;
  hint: string;
}> = [
  { value: 'SENIOR', label: 'SENIOR', hint: 'Zalo Senior' },
  { value: 'JUNIOR', label: 'JUNIOR', hint: 'Zalo Junior' },
  { value: 'YOUTH', label: 'YOUTH', hint: 'IG @_nathan.hq_' },
];

function normalizeAssignedLevel(raw?: string): PlayerLevel {
  const upper = String(raw || 'JUNIOR').trim().toUpperCase();
  if (upper === 'SENIOR' || upper === 'JUNIOR' || upper === 'YOUTH') return upper;
  return 'JUNIOR';
}

interface EvaluationScorecardModalProps {
  application: MemberApplication | null;
  isSuperAdmin: boolean;
  onClose: () => void;
  onUpdated: (
    updatedApp: MemberApplication,
    message: string,
    refreshPlayers?: boolean
  ) => void;
}

type ConclusionChoice = 'APPROVED' | 'RETEST' | 'REJECTED';
type CriterionKey = (typeof TRYOUT_CRITERIA_LABELS)[number]['key'];

const RATING_LABELS: Record<number, { label: string; tone: string }> = {
  1: { label: '1 · Yếu', tone: 'bg-red-950 text-red-300 border-red-700' },
  2: { label: '2 · Cải thiện', tone: 'bg-amber-950 text-amber-300 border-amber-700' },
  3: { label: '3 · Đạt', tone: 'bg-sky-950 text-sky-300 border-sky-700' },
  4: { label: '4 · Tốt', tone: 'bg-emerald-950 text-emerald-300 border-emerald-700' },
  5: { label: '5 · Xuất sắc', tone: 'bg-orange-600 text-white border-orange-400' },
};

const COACH_FEEDBACK_PRESETS: Record<ConclusionChoice, readonly string[]> = {
  APPROVED: [
    'Thể lực & bật nhảy tốt, bước 1 ổn định, phối hợp vị trí linh hoạt và tinh thần đồng đội tích cực.',
    'Kỹ thuật cơ bản vững, tư duy chiến thuật tốt, đủ tiêu chuẩn gia nhập đội hình chính thức DVA.',
  ],
  RETEST: [
    'Có tố chất thể lực và thái độ tốt, cần kiểm tra thêm khả năng phối hợp bước 1 – chuyền 2 ở buổi test tiếp theo.',
    'Phong độ buổi đầu chưa ổn định do tâm lý; HLV đề xuất tham gia thêm 1 buổi đánh giá thực chiến.',
  ],
  REJECTED: [
    'Cần cải thiện thêm kỹ thuật đệm bóng bước 1, phát bóng ổn định và tốc độ di chuyển ngang trước đợt tuyển chọn tới.',
    'Khả năng bật đà và đọc tình huống trên lưới cần rèn luyện thêm; khuyến khích tham gia lớp Training & Scrimmage của DVA.',
  ],
};

function resolveInitialConclusion(app: MemberApplication, isSuperAdmin: boolean): ConclusionChoice {
  if (app.status === 'APPROVED') return 'APPROVED';
  if (app.status === 'RETEST') return 'RETEST';
  if (app.status === 'REJECTED' && isSuperAdmin) return 'REJECTED';
  return 'APPROVED';
}

function getGroupPreviewMeta(levelRaw: string): {
  title: string;
  detail: string;
  badgeClass: string;
} {
  const lvl = (levelRaw || 'JUNIOR').toUpperCase();
  if (lvl === 'SENIOR') {
    return {
      title: 'Tự động đính kèm Link Nhóm Zalo SENIOR',
      detail: TRYOUT_ZALO_SENIOR_URL,
      badgeClass: 'bg-sky-950/60 border-sky-700/60 text-sky-200',
    };
  }
  if (lvl === 'YOUTH') {
    return {
      title: `Tự động đính kèm Hướng dẫn Follow & DM Instagram ${TRYOUT_IG_COACH_HANDLE}`,
      detail: 'Coach Nathan sẽ thêm VĐV vào nhóm đội hình YOUTH trên Instagram.',
      badgeClass: 'bg-purple-950/60 border-purple-700/60 text-purple-200',
    };
  }
  return {
    title: 'Tự động đính kèm Link Nhóm Zalo JUNIOR',
    detail: TRYOUT_ZALO_JUNIOR_URL,
    badgeClass: 'bg-emerald-950/60 border-emerald-700/60 text-emerald-200',
  };
}

export const EvaluationScorecardModal: React.FC<EvaluationScorecardModalProps> = ({
  application,
  isSuperAdmin,
  onClose,
  onUpdated,
}) => {
  const [physical, setPhysical] = useState(3);
  const [technique, setTechnique] = useState(3);
  const [tactical, setTactical] = useState(3);
  const [attitude, setAttitude] = useState(4);
  const [coachNotes, setCoachNotes] = useState('');
  const [assignedLevel, setAssignedLevel] = useState<PlayerLevel>('JUNIOR');
  const [conclusion, setConclusion] = useState<ConclusionChoice>('APPROVED');
  const [submitting, setSubmitting] = useState<'SAVE' | 'SEND' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'SCORECARD' | 'PREVIEW'>('SCORECARD');

  useEffect(() => {
    if (!application) return;
    const prev = application.scores || application.evaluationScores;
    setPhysical(Number(prev?.physical) >= 1 && Number(prev?.physical) <= 5 ? Number(prev?.physical) : 3);
    setTechnique(Number(prev?.technique) >= 1 && Number(prev?.technique) <= 5 ? Number(prev?.technique) : 3);
    setTactical(Number(prev?.tactical) >= 1 && Number(prev?.tactical) <= 5 ? Number(prev?.tactical) : 3);
    setAttitude(Number(prev?.attitude) >= 1 && Number(prev?.attitude) <= 5 ? Number(prev?.attitude) : 4);
    setCoachNotes(application.coachNotes || '');
    setAssignedLevel(normalizeAssignedLevel(application.level));
    setConclusion(resolveInitialConclusion(application, isSuperAdmin));
    setErrorMsg(null);
    setMobileView('SCORECARD');
  }, [application, isSuperAdmin]);

  const totalScore = physical + technique + tactical + attitude;

  const scoreValues: Record<CriterionKey, number> = {
    physical,
    technique,
    tactical,
    attitude,
  };

  const setScoreValue = (key: CriterionKey, val: number) => {
    if (key === 'physical') setPhysical(val);
    else if (key === 'technique') setTechnique(val);
    else if (key === 'tactical') setTactical(val);
    else setAttitude(val);
  };

  const scoresPayload: TryoutEvaluationScores = useMemo(
    () => ({
      physical,
      technique,
      tactical,
      attitude,
      total: totalScore,
    }),
    [physical, technique, tactical, attitude, totalScore]
  );

  const previewHtml = useMemo(() => {
    if (!application) return '';
    return buildTryoutResultEmailHtml({
      fullName: application.fullName,
      position: application.position,
      level: assignedLevel,
      outcome: conclusion === 'REJECTED' ? 'REJECTED' : 'APPROVED',
      scores: scoresPayload,
      coachNotes,
    });
  }, [application, assignedLevel, conclusion, scoresPayload, coachNotes]);

  if (!application) return null;

  const birthYearDisplay = application.birthYear || (application.dob ? application.dob.slice(0, 4) : '');
  const registeredLevel = normalizeAssignedLevel(application.level);
  const levelAdjusted = assignedLevel !== registeredLevel;
  const groupMeta = getGroupPreviewMeta(assignedLevel);
  const resultHistory = Array.isArray(application.resultEmailHistory)
    ? application.resultEmailHistory
    : [];

  const handleAppendFeedback = (snippet: string) => {
    setCoachNotes((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return snippet;
      if (trimmed.includes(snippet)) return prev;
      return `${trimmed}\n${snippet}`;
    });
  };

  const handleSaveOnly = async () => {
    if (!isSuperAdmin && conclusion === 'REJECTED') {
      setErrorMsg('Only SUPERADMIN can reject applications');
      return;
    }
    setErrorMsg(null);
    setSubmitting('SAVE');
    try {
      const updated = await memberService.evaluate(application.id, {
        scores: scoresPayload,
        coachNotes: coachNotes.trim(),
        status: conclusion,
        level: assignedLevel,
      });
      onUpdated(
        updated,
        conclusion === 'APPROVED'
          ? `Đã lưu phiếu chấm (${totalScore}/20 · Level ${assignedLevel}) & chốt APPROVED cho ${application.fullName}.`
          : conclusion === 'RETEST'
            ? `Đã lưu phiếu chấm (${totalScore}/20 · Level ${assignedLevel}) & chuyển ${application.fullName} sang Test lại buổi 2 (RETEST).`
            : `Đã lưu phiếu chấm (${totalScore}/20 · Level ${assignedLevel}) & chốt REJECTED cho ${application.fullName}.`,
        conclusion === 'APPROVED'
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể lưu phiếu chấm điểm. Vui lòng thử lại.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleSaveAndSendEmail = async () => {
    if (conclusion === 'RETEST') {
      await handleSaveOnly();
      return;
    }
    if (!isSuperAdmin && conclusion === 'REJECTED') {
      setErrorMsg('Only SUPERADMIN can reject applications');
      return;
    }
    setErrorMsg(null);
    setSubmitting('SEND');
    try {
      const res = await memberService.sendTryoutEmail(application.id, {
        kind: 'RESULT',
        outcome: conclusion,
        scores: scoresPayload,
        coachNotes: coachNotes.trim(),
        level: assignedLevel,
      });
      onUpdated(res.application, res.message, conclusion === 'APPROVED');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể gửi email kết quả. Vui lòng thử lại.');
    } finally {
      setSubmitting(null);
    }
  };

  const scoreBand =
    totalScore >= 16
      ? { label: 'Xuất sắc (Đạt chuẩn cao)', cls: 'text-emerald-300 bg-emerald-950/70 border-emerald-700/60' }
      : totalScore >= 13
        ? { label: 'Đạt chuẩn đội hình', cls: 'text-sky-300 bg-sky-950/70 border-sky-700/60' }
        : totalScore >= 10
          ? { label: 'Cân nhắc / Test lại', cls: 'text-amber-300 bg-amber-950/70 border-amber-700/60' }
          : { label: 'Chưa đạt yêu cầu', cls: 'text-red-300 bg-red-950/70 border-red-700/60' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto no-scrollbar animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scorecard-modal-title"
    >
      <div className="bg-[#111827] border border-slate-800 rounded-3xl max-w-6xl w-full shadow-2xl relative my-4 text-white flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 sm:px-6 py-4 shrink-0 bg-[#0E1524]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-sky-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50 shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="scorecard-modal-title" className="text-base sm:text-lg font-black text-white truncate">
                Phiếu Chấm Điểm 4 Tiêu Chí &amp; Gửi Kết Quả
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Đánh giá thang 1–5 theo chuẩn Try-Out DVA ({totalScore}/20) và gửi email kết quả kèm link nhóm đội hình qua Resend.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting !== null}
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Toggle */}
        <div className="lg:hidden flex items-center gap-2 px-5 py-2.5 border-b border-slate-800 bg-[#0B0F19]">
          <button
            type="button"
            onClick={() => setMobileView('SCORECARD')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              mobileView === 'SCORECARD'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Phiếu chấm điểm</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileView('PREVIEW')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              mobileView === 'PREVIEW'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Xem trước Email</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 sm:p-6">
          {errorMsg && (
            <div className="mb-4 bg-red-950/80 border border-red-500/60 text-red-200 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Scorecard Controls */}
            <div className={`lg:col-span-6 space-y-4 ${mobileView === 'PREVIEW' ? 'hidden lg:block' : ''}`}>
              {/* Technical Profile Card (Zero PII) */}
              <div className="p-4 rounded-2xl bg-[#0B0F19] border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold text-sm text-white truncate">{application.fullName}</span>
                    {birthYearDisplay && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {birthYearDisplay}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        application.paymentStatus === 'FREE'
                          ? 'bg-sky-950 text-sky-300 border-sky-700'
                          : application.paymentStatus === 'PAID'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : 'bg-amber-950 text-amber-300 border-amber-700'
                      }`}
                    >
                      {application.paymentStatus || 'PENDING'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                      {application.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-[#161F30] rounded-xl px-3 py-2 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px]">Position · Registered</span>
                    <strong className="text-orange-400 font-bold">
                      {application.position} · Registered: {registeredLevel}
                    </strong>
                  </div>
                  <div className="bg-[#161F30] rounded-xl px-3 py-2 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px]">Height / Weight</span>
                    <strong className="text-white font-mono">
                      {application.height}cm{application.weight > 0 ? ` / ${application.weight}kg` : ''}
                    </strong>
                  </div>
                  <div className="bg-[#161F30] rounded-xl px-3 py-2 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px]">Spike / Tactics</span>
                    <strong className="text-sky-300 font-mono">
                      {application.spikeReach > 0 ? `${application.spikeReach}cm` : application.rotationKnowledge}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 4 Criteria (1–5 Rating Selectors) */}
              <div className="p-4 rounded-2xl bg-[#0B0F19] border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      Bảng Chấm Điểm (Thang 1 – 5)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${scoreBand.cls}`}>
                      {scoreBand.label}
                    </span>
                    <span className="font-mono font-black text-base text-emerald-400 tabular-nums">
                      {totalScore} / 20
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {TRYOUT_CRITERIA_LABELS.map((crit, idx) => {
                    const currentVal = scoreValues[crit.key];
                    return (
                      <div key={crit.key} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="font-bold text-slate-200">
                              {idx + 1}. {crit.vi}
                            </span>
                            <span className="text-[10px] text-slate-500 block italic">{crit.en}</span>
                          </div>
                          <span className="font-mono font-bold text-amber-300 text-xs shrink-0">
                            {RATING_LABELS[currentVal]?.label || `${currentVal}/5`}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map((score) => {
                            const active = currentVal === score;
                            return (
                              <button
                                key={score}
                                type="button"
                                onClick={() => setScoreValue(crit.key, score)}
                                className={`py-2 rounded-xl font-mono font-black text-xs border transition-all cursor-pointer ${
                                  active
                                    ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white border-orange-400 shadow'
                                    : 'bg-[#161F30] text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white'
                                }`}
                              >
                                {score}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Level Selector (Coach overrides mis-registered division) */}
              <div className="p-4 rounded-2xl bg-[#0B0F19] border border-slate-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-200">
                      Cấp độ chính thức sau đánh giá (Assigned Level)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Level đăng ký ban đầu:{' '}
                      <strong className="text-slate-200 font-mono">Registered: {registeredLevel}</strong>
                    </span>
                  </div>
                  {levelAdjusted && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-950/80 text-sky-300 border border-sky-700/70">
                      Điều chỉnh: {registeredLevel} → {assignedLevel}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {ASSIGNABLE_LEVELS.map((lvl) => {
                    const active = assignedLevel === lvl.value;
                    return (
                      <button
                        key={lvl.value}
                        type="button"
                        onClick={() => setAssignedLevel(lvl.value)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer space-y-0.5 ${
                          active
                            ? 'bg-sky-950/90 border-sky-500 text-sky-100 shadow shadow-sky-950/50'
                            : 'bg-[#161F30] border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'
                        }`}
                      >
                        <div className="font-mono font-black text-xs">{lvl.label}</div>
                        <div className="text-[10px] opacity-80 truncate">{lvl.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conclusion Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Kết luận chuyên môn của Ban Huấn luyện
                </label>
                <div className={`grid grid-cols-1 ${isSuperAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2`}>
                  <button
                    type="button"
                    onClick={() => setConclusion('APPROVED')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer space-y-0.5 ${
                      conclusion === 'APPROVED'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-lg shadow-emerald-950/40'
                        : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Chúc mừng (Đạt)</span>
                    </div>
                    <span className="text-[10px] opacity-80 block">APPROVED · +Player Roster</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConclusion('RETEST')}
                    title="Đề xuất tham gia test lại buổi 2"
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer space-y-0.5 ${
                      conclusion === 'RETEST'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow-lg shadow-amber-950/40'
                        : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Test lại buổi 2</span>
                    </div>
                    <span className="text-[10px] opacity-80 block">RETEST · Đánh giá thêm</span>
                  </button>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setConclusion('REJECTED')}
                      title="Chưa đạt tiêu chuẩn đợt này"
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer space-y-0.5 ${
                        conclusion === 'REJECTED'
                          ? 'bg-red-950/80 border-red-500 text-red-200 shadow-lg shadow-red-950/40'
                          : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black text-xs">
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>Rất tiếc (Chưa đạt)</span>
                      </div>
                      <span className="text-[10px] opacity-80 block">REJECTED · Gửi góp ý</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Coach Notes */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                  <span>Nhận xét chuyên môn của HLV (hiển thị trong email kết quả)</span>
                </label>
                <textarea
                  rows={3}
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  placeholder="Ghi chú điểm mạnh, điểm cần cải thiện về kỹ thuật bước 1, bật đà, chắn bóng..."
                  className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
                />
                <div className="flex flex-wrap gap-1.5">
                  {COACH_FEEDBACK_PRESETS[conclusion].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAppendFeedback(preset)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-left cursor-pointer transition-colors"
                    >
                      + {preset.slice(0, 62)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Result Email History (No PII / no toEmail) */}
              {resultHistory.length > 0 && (
                <div className="p-3 rounded-2xl bg-sky-950/20 border border-sky-800/40 space-y-1.5">
                  <div className="text-[11px] font-bold text-sky-300 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span>Lịch sử gửi email kết quả ({resultHistory.length})</span>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar">
                    {resultHistory.slice(0, 4).map((h, i) => (
                      <div key={i} className="text-[10px] text-slate-400 flex items-center justify-between gap-2">
                        <span className="truncate">
                          {h.outcome} · {h.sentAt ? new Date(h.sentAt).toLocaleString('vi-VN') : ''} · bởi {h.sentBy}
                        </span>
                        <span className={h.emailSent ? 'text-emerald-400 font-bold shrink-0' : 'text-amber-400 shrink-0'}>
                          {h.emailSent ? 'Sent ✓' : 'Saved'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Email Preview + Group Info */}
            <div className={`lg:col-span-6 space-y-2.5 ${mobileView === 'SCORECARD' ? 'hidden lg:block' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Live Result Email Preview (Resend HTML)
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 text-[10px] font-bold">
                  Assigned: {assignedLevel}
                  {levelAdjusted ? ` (was ${registeredLevel})` : ''}
                </span>
              </div>

              {conclusion === 'APPROVED' && (
                <div className={`p-3 rounded-2xl border text-[11px] flex items-start gap-2.5 ${groupMeta.badgeClass}`}>
                  {assignedLevel === 'YOUTH' ? (
                    <Instagram className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <Mail className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="font-bold">{groupMeta.title}</div>
                    <div className="font-mono text-[10px] opacity-90 truncate">{groupMeta.detail}</div>
                  </div>
                </div>
              )}

              {conclusion === 'RETEST' ? (
                <div className="rounded-2xl border border-amber-700/50 bg-amber-950/20 p-6 text-xs text-amber-200 space-y-2">
                  <div className="font-bold text-sm flex items-center gap-2 text-amber-300">
                    <RotateCcw className="w-4 h-4" />
                    <span>Trạng thái Test Lại Buổi 2 (RETEST)</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Chọn <strong>Lưu điểm &amp; Đặt RETEST</strong> sẽ lưu bảng điểm {totalScore}/20, cấp độ <strong className="text-white">{assignedLevel}</strong> và nhận xét HLV lên hệ thống, đồng thời giữ hồ sơ ở trạng thái chờ đánh giá buổi 2.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Sau khi lưu RETEST, bạn có thể bấm nút <strong>Hẹn Try-Out / Hẹn lại</strong> ở danh sách để gửi thư mời lịch buổi 2 cho VĐV.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#090D16] border border-slate-800 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-800 text-[11px] space-y-1 bg-[#0E1524]">
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="font-semibold shrink-0">To:</span>
                      <span className="font-mono text-sky-300 truncate">
                        {application.fullName} (Server tự động đọc email VĐV &amp; gửi qua Resend)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="font-semibold shrink-0">Outcome:</span>
                      <span
                        className={`font-bold ${
                          conclusion === 'APPROVED' ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                      >
                        {conclusion === 'APPROVED'
                          ? `🎉 Trúng tuyển (${assignedLevel})`
                          : `🏐 Chưa đạt (${assignedLevel}) + Nhận xét HLV`}
                      </span>
                    </div>
                  </div>

                  <iframe
                    title="Live Try-Out Result Email Preview"
                    sandbox=""
                    srcDoc={previewHtml}
                    className="w-full h-[460px] sm:h-[500px] bg-[#0b0f19] border-0"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-5 sm:px-6 py-4 bg-[#0E1524] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400">
            Tổng điểm: <strong className="font-mono text-emerald-400">{totalScore}/20</strong> · Level:{' '}
            <strong className="font-mono text-sky-300">{assignedLevel}</strong> · Kết luận:{' '}
            <strong className="text-white">{conclusion}</strong>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              disabled={submitting !== null}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Đóng
            </button>

            <button
              type="button"
              disabled={submitting !== null}
              onClick={handleSaveOnly}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {submitting === 'SAVE' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-sky-400" />
                  <span>{conclusion === 'RETEST' ? 'Lưu điểm & Đặt RETEST' : `Chỉ lưu điểm (${conclusion})`}</span>
                </>
              )}
            </button>

            {conclusion !== 'RETEST' && (
              <button
                type="button"
                disabled={submitting !== null}
                onClick={handleSaveAndSendEmail}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50 cursor-pointer transition-all"
              >
                {submitting === 'SEND' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gửi Email...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Lưu &amp; Gửi Mail Kết Quả</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
