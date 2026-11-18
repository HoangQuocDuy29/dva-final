import React, { useMemo, useState } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Mail,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import {
  ApplicationStatus,
  MemberApplication,
  TryoutPaymentStatus,
  VolleyballPosition,
} from '../../../types';
import { Pagination } from '../../../components/common/Pagination';
import { getTryoutDayInfo } from '../../../shared/tryoutEmail';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { useApplicationActions } from '../hooks/useApplicationActions';
import { ScheduleTryoutModal } from '../components/applications/ScheduleTryoutModal';
import { EvaluationScorecardModal } from '../components/applications/EvaluationScorecardModal';

const APPS_PAGE_SIZE = 10;
const POSITIONS_ORDER: VolleyballPosition[] = ['OH', 'MB', 'OP', 'S', 'L'];

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
          <table className="w-full min-w-[960px] text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#0E1524] text-slate-400 font-bold border-b border-slate-800">
                <th className="py-3 px-3">Candidate / Profile</th>
                <th className="py-3 px-3">Division &amp; Metrics</th>
                {isSuperAdmin && <th className="py-3 px-3">Contact (Zalo / Email)</th>}
                <th className="py-3 px-3 min-w-[180px]">Try-Out Fee</th>
                <th className="py-3 px-3 min-w-[195px]">Evaluation &amp; Scorecard</th>
                <th className="py-3 px-3 text-right min-w-[310px]">Actions</th>
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

                  return (
                    <tr key={app.id} className="hover:bg-slate-800/40 align-top">
                      {/* 1. Candidate / Profile */}
                      <td className="py-3.5 px-3 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white text-[13px]">{app.fullName}</span>
                          {birthYearDisplay && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {birthYearDisplay}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Position: <strong className="text-orange-400">{app.position}</strong>
                          {app.desiredJerseyNumber > 0 && (
                            <span> · Jersey #{app.desiredJerseyNumber}</span>
                          )}
                        </div>
                        {app.experience && (
                          <div className="text-[11px] text-slate-300">
                            <span className="text-slate-500">Exp:</span> {app.experience}
                          </div>
                        )}
                        {(app.preferredDays || app.preferredSchedule) && (
                          <div className="text-[10px] text-sky-300 bg-sky-950/30 border border-sky-800/40 rounded-md px-2 py-0.5 inline-block max-w-[240px]">
                            Preferred: {app.preferredDays || app.preferredSchedule}
                          </div>
                        )}
                      </td>

                      {/* 2. Division & Physical */}
                      <td className="py-3.5 px-3 space-y-1">
                        <span className="font-bold text-orange-400 block">{app.level}</span>
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
                          <div className="text-slate-400 break-all max-w-[190px]">
                            {app.gmail || '—'}
                          </div>
                          {app.instagram && app.instagram !== 'None' && (
                            <div className="text-slate-500 text-[10px]">IG: {app.instagram}</div>
                          )}
                        </td>
                      )}

                      {/* 4. Try-Out Fee (Decoupled from APPROVED & Always Unlocked for SUPERADMIN) */}
                      <td className="py-3.5 px-3 min-w-[180px]">
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
                      <td className="py-3.5 px-3 min-w-[195px]">
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
                            <p className="text-[10px] text-slate-400 italic line-clamp-2 max-w-[220px]">
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

                              {app.status !== 'REJECTED' && (
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
          application={schedulingApp}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setSchedulingApp(null)}
          onScheduled={(updatedApp, message) => handleApplicationUpdated(updatedApp, message, false)}
        />

        {/* 4-Criteria Evaluation Scorecard & Result Email Modal */}
        <EvaluationScorecardModal
          application={evaluatingApp}
          onClose={() => setEvaluatingApp(null)}
          onUpdated={handleApplicationUpdated}
        />
      </div>
    </div>
  );
};
