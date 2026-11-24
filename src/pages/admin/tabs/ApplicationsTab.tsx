import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Loader2,
  Mail,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  ApplicationStatus,
  MemberApplication,
  PlayerLevel,
  TryoutPaymentStatus,
  VolleyballPosition,
} from '../../../types';
import { Pagination } from '../../../components/common/Pagination';
import { getSkillRankMeta } from '../../../shared/skillRanks';
import { getTryoutDayInfo } from '../../../shared/tryoutEmail';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { useApplicationActions } from '../hooks/useApplicationActions';
import { ScheduleTryoutModal } from '../components/applications/ScheduleTryoutModal';
import { EvaluationScorecardModal } from '../components/applications/EvaluationScorecardModal';

const APPS_PAGE_SIZE = 10;
const POSITIONS_ORDER: VolleyballPosition[] = ['OH', 'MB', 'OP', 'S', 'L'];
const LEVEL_OPTIONS: readonly PlayerLevel[] = ['SENIOR', 'JUNIOR', 'YOUTH'] as const;
const LEVEL_BADGE_STYLES: Record<PlayerLevel, string> = {
  SENIOR: 'bg-orange-950/80 text-orange-300 border-orange-600/60 hover:border-orange-400',
  JUNIOR: 'bg-sky-950/80 text-sky-300 border-sky-600/60 hover:border-sky-400',
  YOUTH: 'bg-purple-950/80 text-purple-300 border-purple-600/60 hover:border-purple-400',
};

function normalizePlayerLevel(raw?: string): PlayerLevel {
  const upper = String(raw || 'JUNIOR').trim().toUpperCase();
  if (upper === 'SENIOR' || upper === 'JUNIOR' || upper === 'YOUTH') return upper;
  return 'JUNIOR';
}

const VN_TIME_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hourCycle: 'h23',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  day: '2-digit', month: '2-digit', year: 'numeric',
});

function formatSubmittedAtVN(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = Object.fromEntries(VN_TIME_FMT.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.hour}:${p.minute}:${p.second} · ${p.day}/${p.month}/${p.year}`;
}

type StatusFilter = 'ALL' | ApplicationStatus;
type PaymentFilter = 'ALL' | TryoutPaymentStatus;

export const ApplicationsTab: React.FC = () => {
  const {
    isSuperAdmin,
    data: { applications },
  } = useAdminDashboard();
  const {
    handleApproveApplication,
    handleRejectApplication,
    handleUpdateApplicationLevel,
    handleUpdateApplicationName,
    handleChangePaymentStatus,
    handleApplicationUpdated,
    handleDeleteApplication,
  } = useApplicationActions();

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [schedulingApp, setSchedulingApp] = useState<MemberApplication | null>(null);
  const [evaluatingApp, setEvaluatingApp] = useState<MemberApplication | null>(null);
  const [updatingLevelId, setUpdatingLevelId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [savingNameId, setSavingNameId] = useState<string | null>(null);
  const [levelToast, setLevelToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const levelToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (levelToastTimerRef.current) clearTimeout(levelToastTimerRef.current);
    };
  }, []);

  const showLevelToast = (type: 'success' | 'error', text: string) => {
    if (levelToastTimerRef.current) clearTimeout(levelToastTimerRef.current);
    setLevelToast({ type, text });
    levelToastTimerRef.current = setTimeout(() => {
      setLevelToast(null);
      levelToastTimerRef.current = null;
    }, 3200);
  };

  const onInlineLevelChange = async (app: MemberApplication, nextLevel: PlayerLevel) => {
    if (!isSuperAdmin) return;
    if (normalizePlayerLevel(app.level) === nextLevel) return;
    setUpdatingLevelId(app.id);
    try {
      await handleUpdateApplicationLevel(app, nextLevel);
      showLevelToast('success', `Đã cập nhật cấp độ ${app.fullName} → ${nextLevel}`);
    } catch (err: any) {
      showLevelToast('error', err?.message || 'Không thể cập nhật cấp độ. Vui lòng thử lại.');
    } finally {
      setUpdatingLevelId(null);
    }
  };

  const startEditName = (app: MemberApplication) => {
    if (!isSuperAdmin || savingNameId) return;
    setEditingNameId(app.id);
    setEditingNameValue(app.fullName || '');
  };

  const cancelEditName = () => {
    if (savingNameId) return;
    setEditingNameId(null);
    setEditingNameValue('');
  };

  const onSaveInlineName = async (app: MemberApplication) => {
    if (!isSuperAdmin || savingNameId) return;
    const trimmed = editingNameValue.trim();
    if (!trimmed) {
      showLevelToast('error', 'Họ tên ứng viên không được để trống.');
      return;
    }
    if (trimmed === (app.fullName || '').trim()) {
      setEditingNameId(null);
      setEditingNameValue('');
      return;
    }
    setSavingNameId(app.id);
    try {
      await handleUpdateApplicationName(app, trimmed);
      setEditingNameId(null);
      setEditingNameValue('');
      showLevelToast(
        'success',
        app.status === 'APPROVED'
          ? `Đã cập nhật tên → ${trimmed} (đã đồng bộ Squad Roster)`
          : `Đã cập nhật tên ứng viên → ${trimmed}`
      );
    } catch (err: any) {
      showLevelToast('error', err?.message || 'Không thể cập nhật tên ứng viên. Vui lòng thử lại.');
    } finally {
      setSavingNameId(null);
    }
  };

  const activeSchedulingApp = useMemo(
    () => (schedulingApp ? applications.find((a) => a.id === schedulingApp.id) || schedulingApp : null),
    [applications, schedulingApp]
  );

  const activeEvaluatingApp = useMemo(
    () => (evaluatingApp ? applications.find((a) => a.id === evaluatingApp.id) || evaluatingApp : null),
    [applications, evaluatingApp]
  );

  const analytics = useMemo(() => {
    let pending = 0;
    let scheduled = 0;
    let retest = 0;
    let approved = 0;
    let rejected = 0;
    let paid = 0;
    let free = 0;

    const approvedByPos: Record<VolleyballPosition, number> = {
      OH: 0,
      MB: 0,
      OP: 0,
      S: 0,
      L: 0,
    };

    for (const app of applications) {
      if (app.status === 'APPROVED') {
        approved += 1;
        if (app.position in approvedByPos) {
          approvedByPos[app.position as VolleyballPosition] += 1;
        }
      } else if (app.status === 'SCHEDULED') {
        scheduled += 1;
      } else if (app.status === 'RETEST') {
        retest += 1;
      } else if (app.status === 'REJECTED') {
        rejected += 1;
      } else {
        pending += 1;
      }

      if (app.paymentStatus === 'PAID') paid += 1;
      else if (app.paymentStatus === 'FREE') free += 1;
    }

    const total = applications.length;
    const paidOrFreeTotal = paid + free;
    const awaitingTryout = pending + scheduled + retest;
    const decided = approved + rejected;
    const passRatePct = decided > 0 ? Math.round((approved / decided) * 100) : 0;

    return {
      ALL: total,
      PENDING: pending,
      SCHEDULED: scheduled,
      RETEST: retest,
      APPROVED: approved,
      REJECTED: rejected,
      PAID: paid,
      FREE: free,
      UNPAID: total - paid - free,
      paidOrFreeTotal,
      awaitingTryout,
      decided,
      passRatePct,
      approvedByPos,
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return applications.filter((app) => {
      if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
      const appPay: TryoutPaymentStatus =
        app.paymentStatus === 'PAID' || app.paymentStatus === 'FREE'
          ? app.paymentStatus
          : 'PENDING';
      if (paymentFilter !== 'ALL' && appPay !== paymentFilter) return false;
      if (!q) return true;
      return (
        (app.fullName || '').toLowerCase().includes(q) ||
        (app.position || '').toLowerCase().includes(q) ||
        (app.level || '').toLowerCase().includes(q) ||
        (app.skillRank || '').toLowerCase().includes(q) ||
        (app.preferredDays || '').toLowerCase().includes(q) ||
        (isSuperAdmin && (app.gmail || '').toLowerCase().includes(q)) ||
        (isSuperAdmin && (app.zalo || '').toLowerCase().includes(q))
      );
    });
  }, [applications, statusFilter, paymentFilter, searchQuery, isSuperAdmin]);

  const safePage = Math.min(
    Math.max(1, currentPage),
    Math.max(1, Math.ceil(filteredApplications.length / APPS_PAGE_SIZE))
  );
  const paginatedApplications = filteredApplications.slice(
    (safePage - 1) * APPS_PAGE_SIZE,
    safePage * APPS_PAGE_SIZE
  );

  const statusTabs: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: analytics.ALL },
    { id: 'PENDING', label: 'Pending', count: analytics.PENDING },
    { id: 'SCHEDULED', label: 'Scheduled', count: analytics.SCHEDULED },
    { id: 'RETEST', label: 'Retest', count: analytics.RETEST },
    { id: 'APPROVED', label: 'Approved', count: analytics.APPROVED },
    { id: 'REJECTED', label: 'Rejected', count: analytics.REJECTED },
  ];

  return (
    <div className="space-y-5">
      {/* 1. Try-Out Analytics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-[#111827] border border-[#1E293B] p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Tổng đơn Try-Out</span>
            <Users className="w-4 h-4 text-[#F97316]" />
          </div>
          <div className="font-mono font-black text-2xl text-white tabular-nums">
            {analytics.ALL}
          </div>
          <div className="text-[11px] text-slate-400">
            {analytics.APPROVED} Approved · {analytics.REJECTED} Rejected
          </div>
        </div>

        <div className="rounded-3xl bg-[#111827] border border-[#1E293B] p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Đã đóng phí / Miễn phí</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono font-black text-2xl text-emerald-400 tabular-nums">
            {analytics.paidOrFreeTotal}
          </div>
          <div className="text-[11px] text-slate-400">
            <span className="text-emerald-300 font-semibold">{analytics.PAID} PAID</span> ·{' '}
            <span className="text-sky-300 font-semibold">{analytics.FREE} FREE</span> (Độc lập duyệt)
          </div>
        </div>

        <div className="rounded-3xl bg-[#111827] border border-[#1E293B] p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Chờ / Đã hẹn test</span>
            <Clock className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <div className="font-mono font-black text-2xl text-[#38BDF8] tabular-nums">
            {analytics.awaitingTryout}
          </div>
          <div className="text-[11px] text-slate-400">
            {analytics.PENDING} Chờ · {analytics.SCHEDULED} Đã hẹn · {analytics.RETEST} Retest
          </div>
        </div>

        <div className="rounded-3xl bg-[#111827] border border-[#1E293B] p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Tỷ lệ Đạt &amp; Theo vị trí</span>
            <Award className="w-4 h-4 text-[#FACC15]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono font-black text-2xl text-[#FACC15] tabular-nums">
              {analytics.passRatePct}%
            </span>
            <span className="text-[10px] text-slate-400">
              ({analytics.APPROVED}/{analytics.decided || 0} đã kết luận)
            </span>
          </div>
          <div className="flex flex-wrap gap-1 pt-0.5">
            {POSITIONS_ORDER.map((pos) => (
              <span
                key={pos}
                className="px-1.5 py-0.5 rounded bg-[#0B0F19] border border-[#1E293B] font-mono text-[10px] text-slate-300"
              >
                <strong className="text-orange-400">{pos}</strong>:{analytics.approvedByPos[pos]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-base text-white">Tryout Applications &amp; Scorecard</h3>
              {!isSuperAdmin && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-sky-950/70 text-sky-300 border border-sky-700/60">
                  Coach / Admin Mode (Privacy Protected)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {isSuperAdmin
                ? 'Chuyển PENDING ↔ PAID / FREE độc lập với duyệt thành viên (không tự động APPROVED). Chỉ khi bấm Approve hoặc chốt APPROVED trong Chấm điểm mới nhận chính thức & thu gọn dòng.'
                : 'Hẹn lịch Try-Out (email bảo mật trên server) và mở Chấm điểm để điều chỉnh Level, đánh giá 4 tiêu chí & gửi email kết quả. Thông tin liên hệ VĐV được ẩn.'}
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={
                isSuperAdmin
                  ? 'Search name, Zalo, email, position...'
                  : 'Search name, position, division...'
              }
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0E1524] border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#0E1524] border border-slate-800 w-fit">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#0E1524] border border-slate-800 w-fit">
            {(
              [
                { id: 'ALL', label: 'All Fees' },
                { id: 'PENDING', label: `PENDING (${analytics.UNPAID})` },
                { id: 'PAID', label: `PAID (${analytics.PAID})` },
                { id: 'FREE', label: `FREE (${analytics.FREE})` },
              ] as const
            ).map((pf) => (
              <button
                key={pf.id}
                type="button"
                onClick={() => {
                  setPaymentFilter(pf.id);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  paymentFilter === pf.id
                    ? pf.id === 'PAID'
                      ? 'bg-emerald-600 text-white'
                      : pf.id === 'FREE'
                        ? 'bg-sky-600 text-white'
                        : pf.id === 'PENDING'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {pf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Applications Table */}
        <div className="overflow-x-auto no-scrollbar">
          <table
            className={`w-full table-fixed text-xs text-left border-collapse ${
              isSuperAdmin ? 'min-w-[1080px]' : 'min-w-[880px]'
            }`}
          >
            <colgroup>
              {isSuperAdmin ? (
                <>
                  <col className="w-[21%]" />
                  <col className="w-[12%]" />
                  <col className="w-[15%]" />
                  <col className="w-[14%]" />
                  <col className="w-[15%]" />
                  <col className="w-[23%]" />
                </>
              ) : (
                <>
                  <col className="w-[27%]" />
                  <col className="w-[16%]" />
                  <col className="w-[15%]" />
                  <col className="w-[18%]" />
                  <col className="w-[24%]" />
                </>
              )}
            </colgroup>
            <thead>
              <tr className="bg-[#0E1524] text-slate-400 font-bold border-b border-slate-800">
                <th className="py-3 px-3 min-w-[190px]">Candidate / Profile</th>
                <th className="py-3 px-3">Division &amp; Metrics</th>
                {isSuperAdmin && <th className="py-3 px-3">Contact (Zalo / Email)</th>}
                <th className="py-3 px-3">Try-Out Fee</th>
                <th className="py-3 px-3">Evaluation &amp; Scorecard</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {paginatedApplications.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="py-10 text-center text-slate-500">
                    No try-out applications match the current filters.
                  </td>
                </tr>
              ) : (
                paginatedApplications.map((app) => {
                  const payStatus: TryoutPaymentStatus =
                    app.paymentStatus === 'PAID' || app.paymentStatus === 'FREE'
                      ? app.paymentStatus
                      : 'PENDING';
                  const fee =
                    payStatus === 'FREE'
                      ? 0
                      : app.entryFee !== undefined
                        ? app.entryFee
                        : 100000;
                  const birthYearDisplay =
                    app.birthYear || (app.dob ? app.dob.slice(0, 4) : '');
                  const scheduledInfo = app.scheduledDate
                    ? getTryoutDayInfo(app.scheduledDate)
                    : null;
                  const inviteCount = Array.isArray(app.scheduleHistory)
                    ? app.scheduleHistory.length
                    : 0;
                  const scorecard = app.scores || app.evaluationScores;
                  const scoreTotal = Number(scorecard?.total) || 0;
                  const hasResultEmail =
                    Boolean(app.resultEmailSentAt) ||
                    (Array.isArray(app.resultEmailHistory) && app.resultEmailHistory.length > 0);
                  const isApproved = app.status === 'APPROVED';
                  const submittedAtVN = formatSubmittedAtVN(app.createdAt);

                  return (
                    <tr key={app.id} className="hover:bg-slate-800/40 align-top">
                      {/* 1. Candidate / Profile */}
                      <td className="py-3.5 px-3 space-y-1.5 min-w-[190px]">
                        {isSuperAdmin && editingNameId === app.id ? (
                          <div className="flex items-center gap-1 w-full">
                            <input
                              type="text"
                              autoFocus
                              maxLength={100}
                              value={editingNameValue}
                              disabled={savingNameId === app.id}
                              onChange={(e) => setEditingNameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  void onSaveInlineName(app);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  cancelEditName();
                                }
                              }}
                              aria-label="Edit applicant full name"
                              className="flex-1 min-w-0 bg-[#0B0F19] border border-orange-500/80 rounded-lg px-2.5 py-1 text-[13px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-60"
                            />
                            <button
                              type="button"
                              disabled={savingNameId === app.id}
                              onClick={() => void onSaveInlineName(app)}
                              title="Lưu tên (Enter)"
                              aria-label="Save name"
                              className="p-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white transition-colors cursor-pointer disabled:opacity-60 shrink-0"
                            >
                              {savingNameId === app.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={savingNameId === app.id}
                              onClick={cancelEditName}
                              title="Hủy (Esc)"
                              aria-label="Cancel edit name"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-60 shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : isSuperAdmin ? (
                          <div className="inline-flex items-center gap-1.5 max-w-full">
                            <span
                              onDoubleClick={() => startEditName(app)}
                              title="Double-click để sửa tên"
                              className="font-bold text-white text-[13px] leading-snug cursor-text hover:text-orange-200 transition-colors"
                            >
                              {app.fullName}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditName(app)}
                              title="Edit Name"
                              aria-label={`Edit name for ${app.fullName}`}
                              className="p-1 rounded-md text-slate-400 hover:text-orange-300 hover:bg-slate-800/90 transition-colors cursor-pointer shrink-0"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="font-bold text-white text-[13px] leading-snug">
                            {app.fullName}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400">
                          {birthYearDisplay && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {birthYearDisplay}
                            </span>
                          )}
                          <span>
                            Position: <strong className="text-orange-400">{app.position}</strong>
                            {app.desiredJerseyNumber > 0 && (
                              <span> · Jersey #{app.desiredJerseyNumber}</span>
                            )}
                          </span>
                        </div>
                        {submittedAtVN && (
                          <div className="text-xs tabular-nums text-amber-300/90">
                            🕒 Gửi đơn: {submittedAtVN}
                          </div>
                        )}
                        {app.experience && (
                          <div className="text-[11px] text-slate-300">
                            <span className="text-slate-500">Exp:</span> {app.experience}
                          </div>
                        )}
                        {(app.preferredDays || app.preferredSchedule) && (
                          <div className="text-[10px] text-sky-300 bg-sky-950/30 border border-sky-800/40 rounded-md px-2 py-0.5 inline-block max-w-full">
                            Preferred: {app.preferredDays || app.preferredSchedule}
                          </div>
                        )}
                      </td>

                      {/* 2. Division & Physical */}
                      <td className="py-3.5 px-3 space-y-1">
                        {(() => {
                          const currentLevel = normalizePlayerLevel(app.level);
                          const isUpdatingThis = updatingLevelId === app.id;
                          return isSuperAdmin ? (
                            <div className="relative inline-flex items-center">
                              <select
                                aria-label={`Level for ${app.fullName}`}
                                value={currentLevel}
                                disabled={isUpdatingThis}
                                onChange={(e) =>
                                  void onInlineLevelChange(app, e.target.value as PlayerLevel)
                                }
                                title="Đổi nhanh cấp độ SENIOR / JUNIOR / YOUTH"
                                className={`appearance-none pl-2.5 pr-7 py-1 rounded-lg border text-[11px] font-black tracking-wide uppercase cursor-pointer focus:outline-none transition-colors disabled:opacity-60 ${LEVEL_BADGE_STYLES[currentLevel]}`}
                              >
                                {LEVEL_OPTIONS.map((lvl) => (
                                  <option key={lvl} value={lvl} className="bg-[#0B0F19] text-white">
                                    {lvl}
                                  </option>
                                ))}
                              </select>
                              {isUpdatingThis ? (
                                <Loader2 className="w-3 h-3 animate-spin text-white absolute right-2 pointer-events-none" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 opacity-80 absolute right-1.5 pointer-events-none" />
                              )}
                            </div>
                          ) : (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-lg border text-[11px] font-black tracking-wide uppercase ${LEVEL_BADGE_STYLES[currentLevel]}`}
                            >
                              {currentLevel}
                            </span>
                          );
                        })()}
                        {(() => {
                          const rankMeta = getSkillRankMeta(app.skillRank);
                          if (!rankMeta) return null;
                          return (
                            <div>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${rankMeta.badgeClass}`}
                                title={`USAV ${rankMeta.code} — ${rankMeta.labelVi}`}
                              >
                                🇺🇸 RANK: {rankMeta.code}
                              </span>
                            </div>
                          );
                        })()}
                        <div className="font-mono text-[11px] text-slate-300">
                          {app.height}cm
                          {app.weight > 0 ? ` / ${app.weight}kg` : ''}
                        </div>
                        <div className="font-mono text-[11px]">
                          {app.spikeReach > 0 ? (
                            <span className="font-bold text-red-400">Spike: {app.spikeReach}cm</span>
                          ) : (
                            <span className="text-slate-500 italic">Reach: At Tryout</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Tactics: {app.rotationKnowledge}
                        </div>
                      </td>

                      {/* 3. Contact (SUPERADMIN ONLY) */}
                      {isSuperAdmin && (
                        <td className="py-3.5 px-3 text-[11px] space-y-1">
                          <div>
                            Zalo: <strong className="font-mono text-white">{app.zalo || '—'}</strong>
                          </div>
                          <div className="text-slate-400 break-all">
                            {app.gmail || '—'}
                          </div>
                          {app.instagram && app.instagram !== 'None' && (
                            <div className="text-slate-500 text-[10px]">IG: {app.instagram}</div>
                          )}
                        </td>
                      )}

                      {/* 4. Try-Out Fee (Decoupled from APPROVED & Always Unlocked for SUPERADMIN) */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col items-start gap-1.5">
                          {isSuperAdmin ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {payStatus === 'PENDING' ? (
                                <button
                                  type="button"
                                  onClick={() => handleChangePaymentStatus(app, 'PAID')}
                                  title="Đánh dấu đã đóng phí (PAID) — giữ nguyên trạng thái duyệt hồ sơ"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border bg-amber-950/80 text-amber-300 border-amber-600/70 hover:bg-emerald-950/90 hover:text-emerald-300 hover:border-emerald-600/70 cursor-pointer transition-all whitespace-nowrap"
                                >
                                  <Clock className="w-3 h-3" />
                                  <span>PENDING → Paid</span>
                                </button>
                              ) : payStatus === 'PAID' ? (
                                <button
                                  type="button"
                                  onClick={() => handleChangePaymentStatus(app, 'PENDING')}
                                  title="Đã PAID (bấm để chuyển lại PENDING nếu cần)"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border bg-emerald-950/90 text-emerald-300 border-emerald-600/70 hover:bg-amber-950/80 hover:text-amber-300 hover:border-amber-600/70 cursor-pointer transition-all whitespace-nowrap"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>PAID ⇄ Pending</span>
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleChangePaymentStatus(app, 'PENDING')}
                                    title="Đang FREE (bấm để chuyển lại PENDING nếu cần)"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border bg-sky-950/90 text-sky-300 border-sky-600/70 hover:bg-amber-950/80 hover:text-amber-300 hover:border-amber-600/70 cursor-pointer transition-all whitespace-nowrap"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-sky-400" />
                                    <span>FREE ⇄ Pending</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleChangePaymentStatus(app, 'PAID')}
                                    title="Chuyển từ FREE sang PAID"
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-700/70 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/70 cursor-pointer transition-colors whitespace-nowrap"
                                  >
                                    → Paid
                                  </button>
                                </>
                              )}

                              {payStatus !== 'FREE' && (
                                <button
                                  type="button"
                                  onClick={() => handleChangePaymentStatus(app, 'FREE')}
                                  title="Miễn phí (Waive → FREE, giữ nguyên trạng thái duyệt hồ sơ)"
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold border border-sky-700/70 bg-sky-950/70 text-sky-300 hover:bg-sky-900/80 cursor-pointer transition-colors whitespace-nowrap"
                                >
                                  Waive
                                </button>
                              )}
                            </div>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border ${
                                payStatus === 'FREE'
                                  ? 'bg-sky-950/90 text-sky-300 border-sky-600/70'
                                  : payStatus === 'PAID'
                                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/70'
                                    : 'bg-amber-950/80 text-amber-300 border-amber-600/70'
                              }`}
                            >
                              {payStatus === 'PENDING' ? (
                                <Clock className="w-3 h-3 text-amber-400" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              <span>{payStatus}</span>
                            </span>
                          )}

                          {isSuperAdmin ? (
                            <span
                              className={`font-mono text-[11px] font-bold whitespace-nowrap tabular-nums ${
                                payStatus === 'FREE'
                                  ? 'text-sky-300'
                                  : payStatus === 'PAID'
                                    ? 'text-emerald-400'
                                    : 'text-slate-400'
                              }`}
                            >
                              {payStatus === 'FREE'
                                ? '0 đ · FREE (Waived)'
                                : `${fee.toLocaleString('vi-VN')} đ`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                              {payStatus === 'FREE'
                                ? 'Waived'
                                : payStatus === 'PAID'
                                  ? 'Fee Verified'
                                  : 'Awaiting Verification'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Evaluation Status & Scorecard */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col items-start gap-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wide whitespace-nowrap border ${
                                app.status === 'APPROVED'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : app.status === 'SCHEDULED'
                                    ? 'bg-sky-950 text-sky-300 border-sky-700'
                                    : app.status === 'RETEST'
                                      ? 'bg-amber-950 text-amber-300 border-amber-700'
                                      : app.status === 'REJECTED'
                                        ? 'bg-red-950/70 text-red-300 border-red-800'
                                        : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {app.status}
                            </span>

                            {scoreTotal > 0 && (
                              <span
                                title={`TL:${scorecard?.physical} · KT:${scorecard?.technique} · CT:${scorecard?.tactical} · TĐ:${scorecard?.attitude}`}
                                className="px-2 py-0.5 rounded font-mono text-[10px] font-black bg-emerald-950/50 text-emerald-300 border border-emerald-800/70"
                              >
                                {scoreTotal}/20
                              </span>
                            )}
                          </div>

                          {app.scheduledDate && !isApproved && (
                            <div className="text-[10px] bg-[#0E1524] border border-sky-800/50 rounded-lg px-2 py-1 text-slate-300 space-y-0.5">
                              <div className="font-mono font-bold text-sky-300 flex items-center gap-1">
                                <Calendar className="w-3 h-3 shrink-0" />
                                <span>
                                  {scheduledInfo?.valid
                                    ? `${scheduledInfo.viDay} (${scheduledInfo.formattedDate})`
                                    : app.scheduledDate}
                                </span>
                              </div>
                              {app.scheduledTime && (
                                <div className="font-mono text-orange-300">
                                  ⏰ {app.scheduledTime}
                                  {inviteCount > 1 && (
                                    <span className="text-slate-500 ml-1">({inviteCount}x)</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {app.coachNotes && (
                            <p className="text-[10px] text-slate-400 italic line-clamp-2 max-w-[180px]">
                              “{app.coachNotes}”
                            </p>
                          )}

                          {hasResultEmail && (
                            <span className="text-[10px] text-emerald-400/90 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Đã gửi Mail KQ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Actions Matrix: Non-APPROVED = full actions; APPROVED = compact Accepted badge + Chấm điểm + Delete (SUPERADMIN) */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {isApproved ? (
                            <>
                              <span className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-700/70 text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1.5 whitespace-nowrap">
                                <span>✓ ĐÃ CHẤP NHẬN</span>
                                {scoreTotal > 0 && (
                                  <span className="font-mono text-emerald-200 bg-emerald-900/80 px-1.5 py-0.5 rounded text-[10px]">
                                    {scoreTotal}/20
                                  </span>
                                )}
                              </span>

                              <button
                                type="button"
                                onClick={() => setEvaluatingApp(app)}
                                title="Mở phiếu chấm để chỉnh lại Level (SENIOR/JUNIOR/YOUTH), ghi chú & gửi email mời vào nhóm Zalo/IG"
                                className="min-h-[36px] px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white font-bold text-[11px] rounded-xl inline-flex items-center gap-1.5 shadow cursor-pointer transition-all whitespace-nowrap"
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" />
                                <span>Chấm điểm</span>
                              </button>
                            </>
                          ) : (
                            <>
                              {isSuperAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveApplication(app.id, fee)}
                                  title="Chốt nhận chính thức (APPROVED) & thêm vào Player Roster"
                                  className="min-h-[36px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setEvaluatingApp(app)}
                                title="Mở phiếu chấm điểm 4 tiêu chí, chốt Level & gửi mail kết quả"
                                className="min-h-[36px] px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white font-bold text-[11px] rounded-xl inline-flex items-center gap-1.5 shadow cursor-pointer transition-all whitespace-nowrap"
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" />
                                <span>{scoreTotal > 0 ? `Chấm điểm (${scoreTotal}/20)` : 'Chấm điểm'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setSchedulingApp(app)}
                                title="Mở form hẹn lịch Try-Out & gửi email qua Resend"
                                className="min-h-[36px] px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-[11px] rounded-xl inline-flex items-center gap-1.5 shadow-md shadow-indigo-950/40 cursor-pointer transition-all whitespace-nowrap"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                <Mail className="w-3.5 h-3.5 -ml-0.5" />
                                <span>{app.scheduledDate ? 'Hẹn lại' : 'Hẹn Try-Out'}</span>
                              </button>

                              {isSuperAdmin && app.status !== 'REJECTED' && (
                                <button
                                  type="button"
                                  onClick={() => handleRejectApplication(app.id)}
                                  className="min-h-[36px] px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  Reject
                                </button>
                              )}
                            </>
                          )}

                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteApplication(
                                  app.id,
                                  app.fullName,
                                  app.status === 'APPROVED',
                                  fee
                                )
                              }
                              className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-red-300 rounded-xl bg-slate-800/80 hover:bg-red-950/80 cursor-pointer transition-colors"
                              title={
                                app.status === 'APPROVED'
                                  ? 'Xóa hồ sơ đã duyệt (nếu VĐV rút khỏi đội — trừ khỏi thống kê)'
                                  : 'Delete application'
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={safePage}
          totalItems={filteredApplications.length}
          pageSize={APPS_PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="applications"
        />

        {/* Schedule Try-Out Invitation Modal */}
        <ScheduleTryoutModal
          application={activeSchedulingApp}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setSchedulingApp(null)}
          onScheduled={(updatedApp, message) => handleApplicationUpdated(updatedApp, message, false)}
        />

        {/* 4-Criteria Evaluation Scorecard & Result Email Modal */}
        <EvaluationScorecardModal
          application={activeEvaluatingApp}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setEvaluatingApp(null)}
          onUpdated={handleApplicationUpdated}
        />
      </div>

      {levelToast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-2xl border shadow-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
            levelToast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/70 text-emerald-200'
              : 'bg-red-950/95 border-red-500/70 text-red-200'
          }`}
        >
          {levelToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{levelToast.text}</span>
        </div>
      )}
    </div>
  );
};
