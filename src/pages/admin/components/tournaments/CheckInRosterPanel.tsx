import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Copy,
  Link2,
  Loader2,
  Lock,
  QrCode,
  RefreshCw,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  Tournament,
  TournamentCheckIn,
  TournamentCheckInAdminResponse,
  VolleyballPosition,
} from '../../../../types';
import { tournamentService } from '../../../../services/api';
import {
  POSITION_QUOTA_ORDER,
  buildCheckInVietQrUrl,
  formatBtcRosterText,
  formatCheckInDeadlineDisplay,
} from '../../../../shared/tournaments';

interface CheckInRosterPanelProps {
  tournament: Tournament;
  notify: (msg: string, durationMs?: number) => void;
  readOnly?: boolean;
}

const POS_META: Record<VolleyballPosition, { vi: string; badge: string }> = {
  OH: { vi: 'Chủ công', badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  MB: { vi: 'Phụ công', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  OP: { vi: 'Đối chuyền', badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  S: { vi: 'Chuyền hai', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  L: { vi: 'Libero', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
};

type ListFilter = 'ALL' | 'CONFIRMED' | 'RESERVE' | 'UNPAID' | 'GUEST';

export const CheckInRosterPanel: React.FC<CheckInRosterPanelProps> = ({
  tournament,
  notify,
  readOnly = false,
}) => {
  const [data, setData] = useState<TournamentCheckInAdminResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<ListFilter>('ALL');
  const [posFilter, setPosFilter] = useState<VolleyballPosition | 'ALL'>('ALL');

  // Inline VietQR Modal state
  const [qrTarget, setQrTarget] = useState<{ title: string; memo: string; amount: number } | null>(null);

  const loadCheckIns = useCallback(async () => {
    if (readOnly) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await tournamentService.getAdminCheckIns(tournament.id);
      setData(res);
    } catch (err: any) {
      notify(err?.message || 'Không thể tải danh sách điểm danh giải mời.');
    } finally {
      setLoading(false);
    }
  }, [tournament.id, readOnly, notify]);

  useEffect(() => {
    void loadCheckIns();
  }, [loadCheckIns]);

  const copyText = (key: string, text: string, toastMsg: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    notify(toastMsg);
  };

  const handleToggleStatus = async (item: TournamentCheckIn) => {
    const nextStatus = item.status === 'CONFIRMED' ? 'RESERVE' : 'CONFIRMED';
    setBusyId(item.id);
    try {
      await tournamentService.updateAdminCheckIn(item.id, { status: nextStatus });
      await loadCheckIns();
      notify(
        `Đã chuyển ${item.fullName} sang ${nextStatus === 'CONFIRMED' ? 'Chắc chắn tham gia' : 'Dự bị'}.`
      );
    } catch (err: any) {
      notify(err?.message || 'Không thể cập nhật trạng thái.');
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePaid = async (item: TournamentCheckIn) => {
    const nextPaid = !item.isPaid;
    setBusyId(item.id);
    try {
      await tournamentService.updateAdminCheckIn(item.id, { isPaid: nextPaid });
      await loadCheckIns();
      notify(
        nextPaid
          ? `Đã xác nhận ${item.fullName} đóng lệ phí giải.`
          : `Đã bỏ đánh dấu đóng lệ phí cho ${item.fullName}.`
      );
    } catch (err: any) {
      notify(err?.message || 'Không thể cập nhật trạng thái lệ phí.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: TournamentCheckIn) => {
    if (!window.confirm(`Xóa lượt điểm danh của "${item.fullName}" khỏi giải này?`)) return;
    setBusyId(item.id);
    try {
      await tournamentService.deleteAdminCheckIn(item.id);
      await loadCheckIns();
      notify(`Đã xóa ${item.fullName} khỏi danh sách điểm danh.`);
    } catch (err: any) {
      notify(err?.message || 'Không thể xóa lượt điểm danh.');
    } finally {
      setBusyId(null);
    }
  };

  const filteredList = useMemo(() => {
    const list = data?.checkIns || [];
    return list.filter((item) => {
      if (posFilter !== 'ALL' && item.position !== posFilter) return false;
      if (filter === 'CONFIRMED') return item.status === 'CONFIRMED';
      if (filter === 'RESERVE') return item.status === 'RESERVE';
      if (filter === 'UNPAID') return !item.isPaid;
      if (filter === 'GUEST') return item.isGuest;
      return true;
    });
  }, [data, filter, posFilter]);

  const groupedByPosition = useMemo(() => {
    const map = new Map<VolleyballPosition, TournamentCheckIn[]>();
    for (const pos of POSITION_QUOTA_ORDER) {
      const items = filteredList.filter((i) => i.position === pos);
      if (items.length > 0) map.set(pos, items);
    }
    return map;
  }, [filteredList]);

  if (readOnly) {
    return (
      <div className="rounded-3xl bg-[#111827] border border-[#1E293B] p-8 text-center space-y-2">
        <Lock className="w-7 h-7 text-amber-400 mx-auto" />
        <p className="text-sm font-bold text-white">Quyền Quản lý Điểm danh thuộc SUPERADMIN</p>
        <p className="text-xs text-slate-400">
          Danh sách chi tiết SĐT/Zalo, lệ phí giải và xuất danh sách BTC chỉ hiển thị với tài khoản SUPERADMIN.
        </p>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="rounded-3xl bg-[#111827] border border-[#1E293B] p-10 text-center space-y-3">
        <Loader2 className="w-6 h-6 text-[#F97316] animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Đang tổng hợp ma trận vị trí &amp; danh sách điểm danh...</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const checkInUrl = `${window.location.origin}/tournaments/${tournament.slug}/checkin`;
  const deadlineText = formatCheckInDeadlineDisplay(
    data.registrationDeadline,
    data.registrationDeadlineTime
  );
  const qrPayload = qrTarget ? buildCheckInVietQrUrl(qrTarget.amount, qrTarget.memo) : null;

  return (
    <div className="space-y-5">
      {/* Position Matrix & Action Bar (Single backdrop-blur-xl container in this panel) */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 space-y-4">
        {/* Readiness Banner + Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {data.positionQuotas ? (
                data.summary.isReadyToAccept ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-black inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      ĐỦ QUÂN NHẬN GIẢI ({data.summary.totalConfirmed}/{data.summary.totalQuota} chính thức)
                    </span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-black inline-flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>
                      THIẾU VỊ TRÍ:{' '}
                      {data.summary.missingPositions.map((m) => `${m.position} ×${m.missing}`).join(', ')}
                    </span>
                  </span>
                )
              ) : (
                <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold">
                  Chưa bật cấu hình Slot vị trí (bấm Edit giải đấu để thiết lập)
                </span>
              )}

              {data.quotaHardLock && (
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 text-[10px] font-bold">
                  Khóa trần tự hạ Dự bị
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              <span className="font-mono tabular-nums">
                Tổng: <strong className="text-white">{data.checkIns.length}</strong> VĐV (
                <strong className="text-emerald-400">{data.summary.totalConfirmed}</strong> chính thức ·{' '}
                <strong className="text-amber-300">{data.summary.totalReserve}</strong> dự bị)
              </span>
              {deadlineText && (
                <span className="font-mono text-sky-300 tabular-nums">Hạn chốt: {deadlineText}</span>
              )}
              <span className="font-mono text-[#FACC15] tabular-nums inline-flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" />
                Đã đóng phí: {data.summary.paidCount}/{data.checkIns.length} (
                {data.summary.collectedAmount.toLocaleString('vi-VN')} đ
                {data.feePerPlayer > 0 ? ` / ${data.feePerPlayer.toLocaleString('vi-VN')}đ/ng` : ''})
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() =>
                copyText('checkin-link', checkInUrl, `Đã sao chép link điểm danh: ${checkInUrl}`)
              }
              className="px-3 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] border border-[#1E293B] text-sky-300 font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              {copiedKey === 'checkin-link' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Link2 className="w-3.5 h-3.5" />
              )}
              <span>Copy Link Điểm Danh</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const text = formatBtcRosterText(tournament.name, data.checkIns);
                copyText(
                  'btc-roster',
                  text,
                  `Đã sao chép danh sách ${data.summary.totalConfirmed} VĐV chính thức gửi BTC!`
                );
              }}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#8B0000] to-[#F97316] hover:brightness-110 text-white font-bold inline-flex items-center gap-1.5 shadow cursor-pointer"
            >
              {copiedKey === 'btc-roster' ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <ClipboardCopy className="w-3.5 h-3.5" />
              )}
              <span>Copy Danh Sách Gửi BTC</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setQrTarget({
                  title: `VietQR Thu Lệ Phí · ${tournament.name}`,
                  memo: `DVA ${tournament.slug} LE PHI`,
                  amount: data.feePerPlayer,
                })
              }
              className="px-3 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-700/60 text-emerald-200 font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>VietQR Lệ Phí</span>
            </button>

            <button
              type="button"
              onClick={() => void loadCheckIns()}
              title="Làm mới danh sách"
              className="p-2 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] border border-[#1E293B] text-slate-300 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 5-Position Aggregation Matrix (Solid tiles, ZERO backdrop-blur) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {POSITION_QUOTA_ORDER.map((pos) => {
            const c = data.counts[pos];
            const meta = POS_META[pos];
            const met = c.quota > 0 && c.remaining === 0;
            const missing = c.remaining > 0;

            return (
              <button
                key={pos}
                type="button"
                onClick={() => setPosFilter((prev) => (prev === pos ? 'ALL' : pos))}
                className={`text-left rounded-2xl p-3 border transition-colors cursor-pointer ${
                  posFilter === pos
                    ? 'bg-[#161F30] border-[#F97316]'
                    : met
                      ? 'bg-emerald-950/25 border-emerald-700/40 hover:border-emerald-500/60'
                      : missing
                        ? 'bg-amber-950/25 border-amber-700/40 hover:border-amber-500/60'
                        : 'bg-[#0B0F19] border-[#1E293B] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${meta.badge}`}>
                    {pos}
                  </span>
                  <span className="font-mono font-black text-lg text-white tabular-nums">
                    {c.confirmed}
                    <span className="text-slate-500 text-xs">/{c.quota}</span>
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{meta.vi}</span>
                  {c.overflow > 0 ? (
                    <span className="text-sky-300 font-bold tabular-nums">Vượt +{c.overflow}</span>
                  ) : met ? (
                    <span className="text-emerald-400 font-bold">✓ Đủ</span>
                  ) : missing ? (
                    <span className="text-amber-300 font-bold tabular-nums">Thiếu {c.remaining}</span>
                  ) : (
                    <span className="text-slate-500">0</span>
                  )}
                </div>
                <div className="mt-0.5 text-[10px] font-mono text-slate-400 tabular-nums">
                  Dự bị: {c.reserve}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Attendee List Panel (Solid surface + solid rows, ZERO backdrop-blur) */}
      <div className="rounded-3xl bg-[#111827] border border-[#1E293B] p-4 sm:p-5 space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'ALL', label: `Tất cả (${data.checkIns.length})` },
                { id: 'CONFIRMED', label: `Chính thức (${data.summary.totalConfirmed})` },
                { id: 'RESERVE', label: `Dự bị (${data.summary.totalReserve})` },
                {
                  id: 'UNPAID',
                  label: `Chưa đóng phí (${data.checkIns.filter((c) => !c.isPaid).length})`,
                },
                {
                  id: 'GUEST',
                  label: `Ngoài Squad (${data.checkIns.filter((c) => c.isGuest).length})`,
                },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  filter === f.id
                    ? 'bg-[#F97316]/15 border-[#F97316] text-white'
                    : 'bg-[#0B0F19] border-[#1E293B] text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {posFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setPosFilter('ALL')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700 cursor-pointer"
            >
              Đang lọc vị trí: {posFilter} ×
            </button>
          )}
        </div>

        {filteredList.length === 0 ? (
          <div className="rounded-2xl bg-[#0B0F19] border border-[#1E293B] p-8 text-center space-y-2">
            <Users className="w-7 h-7 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">
              {data.checkIns.length === 0
                ? 'Chưa có VĐV nào điểm danh. Hãy bấm "Copy Link Điểm Danh" để gửi vào nhóm Zalo đội.'
                : 'Không có VĐV nào khớp bộ lọc hiện tại.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(groupedByPosition.entries()).map(([pos, items]) => (
              <div
                key={pos}
                className="rounded-2xl bg-[#0B0F19] border border-[#1E293B] overflow-hidden"
              >
                <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${POS_META[pos].badge}`}>
                      {pos}
                    </span>
                    <span className="font-bold text-white">{POS_META[pos].vi}</span>
                  </div>
                  <span className="font-mono text-slate-400 tabular-nums">
                    {items.length} VĐV
                  </span>
                </div>

                <div className="divide-y divide-white/[0.06]">
                  {items.map((item, idx) => {
                    const isBusy = busyId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-white/[0.02]"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                              {idx + 1}.
                            </span>
                            <span className="text-sm font-bold text-white">{item.fullName}</span>
                            {item.jerseyNumber != null && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[11px] font-bold text-[#FACC15] tabular-nums">
                                #{item.jerseyNumber}
                              </span>
                            )}
                            {item.isGuest ? (
                              <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                                Ngoài Squad
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                                Squad DVA
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                item.status === 'CONFIRMED'
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {item.status === 'CONFIRMED' ? 'Chính thức' : 'Dự bị'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-mono tabular-nums">
                            <span>NS: {item.birthYear}</span>
                            <span>{item.gender === 'FEMALE' ? '♀ Nữ' : '♂ Nam'}</span>
                            <span className="text-amber-300 font-bold">USAV {item.skillRank}</span>
                            {item.spikeTouch != null && <span>Đà: {item.spikeTouch}cm</span>}
                            {item.blockTouch != null && <span>Chắn: {item.blockTouch}cm</span>}
                            <span className="text-sky-300 font-semibold">SĐT/Zalo: {item.phone}</span>
                          </div>

                          {item.note && (
                            <p className="text-[11px] text-slate-400 italic">Ghi chú: {item.note}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleStatus(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Đổi giữa Chính thức và Dự bị"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5 text-[#38BDF8]" />
                            <span>
                              {item.status === 'CONFIRMED' ? 'Chuyển Dự bị' : 'Lên Chính thức'}
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleTogglePaid(item)}
                            className={`px-2.5 py-1.5 rounded-xl border font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                              item.isPaid
                                ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-300'
                                : 'bg-[#111827] border-[#1E293B] text-slate-300 hover:border-emerald-600/50'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{item.isPaid ? 'Đã đóng phí' : 'Đóng phí'}</span>
                          </button>

                          {data.feePerPlayer > 0 && !item.isPaid && (
                            <button
                              type="button"
                              onClick={() =>
                                setQrTarget({
                                  title: `VietQR Lệ Phí · ${item.fullName}`,
                                  memo: `DVA ${tournament.slug} ${item.fullName}`,
                                  amount: data.feePerPlayer,
                                })
                              }
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-emerald-950 text-emerald-300 cursor-pointer"
                              title={`Tạo mã VietQR cho ${item.fullName}`}
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 cursor-pointer disabled:opacity-50"
                            title="Xóa khỏi danh sách điểm danh"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inline VietQR Collection Modal */}
      {qrTarget && qrPayload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setQrTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[#0E1422] border border-white/15 shadow-2xl overflow-hidden text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-heading font-black text-sm text-white truncate">
                  {qrTarget.title}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {qrPayload.bankName} · {qrPayload.accountNo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQrTarget(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex flex-col items-center bg-white p-4 rounded-2xl">
                <img
                  src={qrPayload.qrUrl}
                  alt="VietQR MB Bank DVA"
                  className="w-52 h-52 object-contain"
                  referrerPolicy="no-referrer"
                />
                <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Quét bằng App Ngân hàng hoặc MoMo
                </span>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Chủ tài khoản</span>
                    <span className="font-bold text-white">{qrPayload.accountName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText('qr-acc', qrPayload.accountNo, 'Đã sao chép STK MB Bank')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-orange-300 font-mono font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{qrPayload.accountNo}</span>
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Số tiền / VĐV</span>
                    <span className="font-mono font-black text-sm text-[#FACC15] tabular-nums">
                      {qrTarget.amount > 0
                        ? `${qrTarget.amount.toLocaleString('vi-VN')} đ`
                        : 'Nhập tay khi chuyển'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-white/10 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block text-[10px] text-slate-400 uppercase">Nội dung CK (không dấu)</span>
                    <span className="font-mono font-bold text-emerald-300 break-all">
                      {qrPayload.transferContent}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyText('qr-memo', qrPayload.transferContent, 'Đã sao chép nội dung chuyển khoản')
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'qr-memo' ? 'Đã chép' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
