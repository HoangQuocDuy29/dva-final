import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  Lock,
  MapPin,
  Search,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  PlayerGender,
  PublicCheckInSquadOption,
  SkillRank,
  Tournament,
  TournamentCheckInPublicResponse,
  TournamentCheckInStatus,
  TournamentCheckInSubmitResponse,
  VolleyballPosition,
} from '../../types';
import { tournamentService } from '../../services/api';
import { SKILL_RANK_LIST } from '../../shared/skillRanks';
import {
  POSITION_QUOTA_ORDER,
  formatCheckInDeadlineDisplay,
  formatTournamentScheduleDisplay,
  isCheckInDeadlinePassed,
  isValidVnPhone,
  normalizeCheckInPhone,
} from '../../shared/tournaments';

interface TournamentCheckInViewProps {
  tournament: Tournament;
}

type CheckInTab = 'SQUAD' | 'GUEST';

const POSITION_LABELS: Record<VolleyballPosition, { short: string; vi: string; badge: string }> = {
  OH: { short: 'OH', vi: 'Chủ công', badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  MB: { short: 'MB', vi: 'Phụ công', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  OP: { short: 'OP', vi: 'Đối chuyền', badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  S: { short: 'S', vi: 'Chuyền hai', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  L: { short: 'L', vi: 'Libero', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
};

export const TournamentCheckInView: React.FC<TournamentCheckInViewProps> = ({ tournament }) => {
  const [data, setData] = useState<TournamentCheckInPublicResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form mode: Squad vs Guest (NO image uploads anywhere)
  const [activeTab, setActiveTab] = useState<CheckInTab>('SQUAD');
  const [squadSearch, setSquadSearch] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  // Shared & Guest fields
  const [position, setPosition] = useState<VolleyballPosition>('OH');
  const [status, setStatus] = useState<TournamentCheckInStatus>('CONFIRMED');
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState('');

  // Guest-specific fields
  const [fullName, setFullName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [gender, setGender] = useState<PlayerGender>('MALE');
  const [skillRank, setSkillRank] = useState<SkillRank>('B');
  const [spikeTouch, setSpikeTouch] = useState('');
  const [blockTouch, setBlockTouch] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');

  // Inline USAV Guide Bottom Sheet
  const [usavSheetOpen, setUsavSheetOpen] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<TournamentCheckInSubmitResponse | null>(null);

  // Local tick to lock form immediately when exact VN deadline passes
  const [nowMs, setNowMs] = useState(() => Date.now());

  const fetchCheckInState = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await tournamentService.getPublicCheckIn(tournament.slug);
      setData(res);
      setLoadError(null);
    } catch (err: any) {
      if (!silent) setLoadError(err?.message || 'Không thể tải dữ liệu điểm danh giải đấu.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [tournament.slug]);

  useEffect(() => {
    void fetchCheckInState(false);
  }, [fetchCheckInState]);

  // Visibility-aware 15s live quota & attendee refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void fetchCheckInState(true);
    }, 15_000);
    return () => clearInterval(interval);
  }, [fetchCheckInState]);

  const selectedSquadPlayer: PublicCheckInSquadOption | null = useMemo(() => {
    if (!data || !selectedPlayerId) return null;
    return data.squadOptions.find((p) => p.id === selectedPlayerId) || null;
  }, [data, selectedPlayerId]);

  const filteredSquadOptions = useMemo(() => {
    if (!data) return [];
    const q = squadSearch.trim().toLowerCase();
    if (!q) return data.squadOptions;
    return data.squadOptions.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        String(p.jerseyNumber).includes(q.replace('#', '')) ||
        p.position.toLowerCase().includes(q) ||
        p.level.toLowerCase().includes(q)
    );
  }, [data, squadSearch]);

  const deadlinePassed = useMemo(() => {
    const tInfo = data?.tournament;
    return (
      Boolean(data?.isExpired) ||
      isCheckInDeadlinePassed(
        tInfo?.registrationDeadline ?? tournament.registrationDeadline,
        tInfo?.registrationDeadlineTime ?? tournament.registrationDeadlineTime,
        new Date(nowMs)
      )
    );
  }, [data, tournament.registrationDeadline, tournament.registrationDeadlineTime, nowMs]);

  const canSubmit = useMemo(() => {
    if (!data) return false;
    return data.checkInEnabled && data.tournament.isRegistrationOpen && !data.tournament.isRosterLocked && data.tournament.status === 'UPCOMING' && !deadlinePassed;
  }, [data, deadlinePassed]);

  const selectedPosCount = data?.counts?.[position];
  const isSelectedPosFull = Boolean(selectedPosCount && selectedPosCount.quota > 0 && selectedPosCount.isFull);
  const quotaHardLock = Boolean(data?.tournament.quotaHardLock);

  // When selecting a Squad player, inherit their primary position automatically
  const handleSelectSquadPlayer = (player: PublicCheckInSquadOption) => {
    if (player.alreadyCheckedIn) return;
    setSelectedPlayerId(player.id);
    setPosition(player.position);
    setSubmitError(null);
    const posState = data?.counts?.[player.position];
    if (posState && posState.quota > 0 && posState.isFull && data?.tournament.quotaHardLock) {
      setStatus('RESERVE');
    }
  };

  const handleSelectPosition = (pos: VolleyballPosition) => {
    setPosition(pos);
    setSubmitError(null);
    const posState = data?.counts?.[pos];
    if (posState && posState.quota > 0 && posState.isFull && quotaHardLock) {
      setStatus('RESERVE');
    }
  };

  const handleResetForAnother = () => {
    setSubmitResult(null);
    setSubmitError(null);
    setSelectedPlayerId('');
    setPhone('');
    setNote('');
    setFullName('');
    setBirthYear('');
    setSpikeTouch('');
    setBlockTouch('');
    setJerseyNumber('');
    setStatus('CONFIRMED');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitError(null);

    if (activeTab === 'SQUAD') {
      if (!selectedSquadPlayer) {
        setSubmitError('Vui lòng chọn tên của bạn trong danh sách Squad DVA.');
        return;
      }
      const trimmedPhone = phone.trim();
      if (!trimmedPhone && !selectedSquadPlayer.hasAccountPhone) {
        setSubmitError('Vui lòng nhập Số Zalo / SĐT để liên hệ và chống đăng ký trùng.');
        return;
      }
      if (trimmedPhone && !isValidVnPhone(normalizeCheckInPhone(trimmedPhone))) {
        setSubmitError('Số Zalo / SĐT không hợp lệ (cần 10 chữ số, bắt đầu bằng 0).');
        return;
      }
    } else {
      if (fullName.trim().length < 2) {
        setSubmitError('Vui lòng nhập Họ và tên đầy đủ.');
        return;
      }
      const yr = Number(birthYear);
      if (!Number.isInteger(yr) || yr < 1950 || yr > 2016) {
        setSubmitError('Vui lòng nhập Năm sinh hợp lệ (1950–2016).');
        return;
      }
      const normPhone = normalizeCheckInPhone(phone);
      if (!isValidVnPhone(normPhone)) {
        setSubmitError('Vui lòng nhập Số Zalo / SĐT hợp lệ (10 chữ số, bắt đầu bằng 0).');
        return;
      }
      if (spikeTouch.trim()) {
        const st = Number(spikeTouch);
        if (!Number.isFinite(st) || st < 150 || st > 420) {
          setSubmitError('Tầm bật đà cần nằm trong khoảng 150–420 cm.');
          return;
        }
      }
      if (blockTouch.trim()) {
        const bt = Number(blockTouch);
        if (!Number.isFinite(bt) || bt < 140 || bt > 400) {
          setSubmitError('Tầm bật chắn cần nằm trong khoảng 140–400 cm.');
          return;
        }
      }
      if (jerseyNumber.trim()) {
        const jn = Number(jerseyNumber);
        if (!Number.isInteger(jn) || jn < 0 || jn > 99) {
          setSubmitError('Số áo dự kiến cần từ 0 đến 99.');
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const payload =
        activeTab === 'SQUAD'
          ? {
              playerId: selectedSquadPlayer!.id,
              position,
              status: quotaHardLock && isSelectedPosFull ? ('RESERVE' as const) : status,
              ...(phone.trim() ? { phone: phone.trim() } : {}),
              ...(note.trim() ? { note: note.trim() } : {}),
            }
          : {
              fullName: fullName.trim(),
              birthYear: Number(birthYear),
              gender,
              position,
              skillRank,
              ...(spikeTouch.trim() ? { spikeTouch: Number(spikeTouch) } : {}),
              ...(blockTouch.trim() ? { blockTouch: Number(blockTouch) } : {}),
              ...(jerseyNumber.trim() ? { jerseyNumber: Number(jerseyNumber) } : {}),
              phone: phone.trim(),
              status: quotaHardLock && isSelectedPosFull ? ('RESERVE' as const) : status,
              ...(note.trim() ? { note: note.trim() } : {}),
            };

      const res = await tournamentService.submitPublicCheckIn(tournament.slug, payload);
      setSubmitResult(res);
      await fetchCheckInState(true);
    } catch (err: any) {
      setSubmitError(err?.message || 'Không thể gửi điểm danh. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmedAttendees = useMemo(
    () => (data?.attendees || []).filter((a) => a.status === 'CONFIRMED'),
    [data]
  );
  const reserveAttendees = useMemo(
    () => (data?.attendees || []).filter((a) => a.status === 'RESERVE'),
    [data]
  );

  if (loading && !data) {
    return (
      <div className="rounded-3xl bg-[#111827] border border-white/10 p-8 text-center space-y-3">
        <Loader2 className="w-7 h-7 text-[#F97316] animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Đang tải trạng thái slot vị trí & danh sách điểm danh...</p>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="rounded-3xl bg-[#111827] border border-red-500/30 p-8 text-center space-y-3">
        <AlertTriangle className="w-7 h-7 text-red-400 mx-auto" />
        <p className="text-sm font-bold text-white">{loadError || 'Không tìm thấy đợt điểm danh.'}</p>
      </div>
    );
  }

  if (!data.checkInEnabled) {
    return (
      <div className="rounded-3xl bg-[#111827] border border-white/10 p-8 text-center space-y-2">
        <Users className="w-8 h-8 text-slate-500 mx-auto" />
        <p className="text-sm font-bold text-white">Chưa mở đợt điểm danh giải mời</p>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Giải đấu này chưa cấu hình chỉ tiêu vị trí để điểm danh đội hình tham dự.
        </p>
      </div>
    );
  }

  const deadlineText = formatCheckInDeadlineDisplay(
    data.tournament.registrationDeadline,
    data.tournament.registrationDeadlineTime
  );

  return (
    <div className="space-y-5">
      {/* Header Summary + Real-Time Position Quota Bar (Solid dark surface — zero extra blur) */}
      <div className="rounded-3xl bg-[#111827]/95 border border-white/10 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/15 text-[#F97316] border border-orange-500/30">
                Điểm danh Giải mời
              </span>
              {data.tournament.quotaHardLock && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Khóa trần suất chính thức</span>
                </span>
              )}
              <span className="text-[11px] font-mono text-emerald-400 font-bold tabular-nums">
                {data.totals.confirmed}/{data.totals.totalQuota} chính thức
                {data.totals.reserve > 0 ? ` · +${data.totals.reserve} dự bị` : ''}
              </span>
            </div>
            <h2 className="font-heading font-black text-xl sm:text-2xl text-white">
              {data.tournament.name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span className="font-mono">{formatTournamentScheduleDisplay(tournament)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
                <span>{data.tournament.location}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 shrink-0 text-xs">
            {deadlineText && (
              <div
                className={`px-3 py-1.5 rounded-xl border font-mono font-bold tabular-nums inline-flex items-center gap-1.5 ${
                  deadlinePassed
                    ? 'bg-red-950/60 border-red-500/40 text-red-300'
                    : 'bg-sky-950/50 border-sky-500/30 text-sky-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Hạn chốt: {deadlineText}</span>
              </div>
            )}
            <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 font-mono font-bold text-[#FACC15] tabular-nums inline-flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              <span>
                {data.tournament.feePerPlayer > 0
                  ? `${data.tournament.feePerPlayer.toLocaleString('vi-VN')} đ / người`
                  : 'Miễn phí / Quỹ CLB'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Position Quota Chips (Solid translucent pills, no backdrop-blur) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-white/10">
          {POSITION_QUOTA_ORDER.map((pos) => {
            const c = data.counts[pos];
            const meta = POSITION_LABELS[pos];
            const isFull = c.quota > 0 && c.isFull;
            return (
              <div
                key={pos}
                className={`rounded-2xl px-3 py-2.5 border transition-colors ${
                  isFull
                    ? 'bg-amber-500/10 border-amber-500/35'
                    : 'bg-white/[0.03] border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${meta.badge}`}>
                    {pos}
                  </span>
                  <span className="font-mono font-black text-sm tabular-nums text-white">
                    {c.confirmed}/{c.quota}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 truncate">{meta.vi}</span>
                  {isFull ? (
                    <span className="text-amber-300 font-bold whitespace-nowrap">Đã đủ</span>
                  ) : c.quota > 0 ? (
                    <span className="text-emerald-400 font-bold whitespace-nowrap tabular-nums">
                      Còn {c.remaining}
                    </span>
                  ) : (
                    <span className="text-slate-500 font-semibold">—</span>
                  )}
                </div>
                {c.reserve > 0 && (
                  <div className="mt-0.5 text-[10px] text-slate-400 font-mono tabular-nums">
                    +{c.reserve} dự bị
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Responsive Layout: Form (blur layer #2) + Public Attendee List (solid surface) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Check-In Form Card (Single backdrop-blur-xl container inside this view) */}
        <div className="lg:col-span-7 rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-4 sm:p-6 space-y-5">
          {!canSubmit ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-300">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-black text-lg text-white">
                {deadlinePassed ? 'Đã quá hạn chót điểm danh' : 'Cổng điểm danh đang đóng'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {deadlinePassed
                  ? `Thời hạn điểm danh (${deadlineText}) đã kết thúc. Nếu cần bổ sung khẩn cấp, vui lòng nhắn trực tiếp Đội trưởng trong nhóm Zalo.`
                  : 'Đội trưởng đã tạm đóng hoặc khóa danh sách điểm danh cho giải đấu này.'}
              </p>
            </div>
          ) : submitResult ? (
            <div className="py-6 text-center space-y-4">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto border-2 ${
                  submitResult.downgraded
                    ? 'bg-amber-500/15 border-amber-400 text-amber-300'
                    : 'bg-emerald-500/15 border-emerald-400 text-emerald-400'
                }`}
              >
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-heading font-black text-xl text-white">
                  {submitResult.downgraded
                    ? 'Đã ghi nhận vào Danh sách Dự bị!'
                    : 'Điểm danh thành công!'}
                </h3>
                {submitResult.downgraded ? (
                  <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-2.5 max-w-md mx-auto leading-relaxed">
                    Vị trí <strong>{submitResult.checkIn.position}</strong> đã đủ suất chính thức, hệ thống đã ghi nhận bạn vào danh sách <strong>Dự bị / Chờ bổ sung</strong>.
                  </p>
                ) : (
                  <p className="text-xs text-slate-300">
                    Cảm ơn <strong className="text-white">{submitResult.checkIn.fullName}</strong>! Đội trưởng đã nhận được thông tin điểm danh của bạn.
                  </p>
                )}
              </div>

              <div className="max-w-sm mx-auto rounded-2xl bg-[#0B0F19] border border-white/10 p-4 text-xs text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Họ tên:</span>
                  <span className="font-bold text-white">
                    {submitResult.checkIn.fullName}
                    {submitResult.checkIn.jerseyNumber != null ? ` (#${submitResult.checkIn.jerseyNumber})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vị trí thi đấu:</span>
                  <span className="font-mono font-bold text-[#38BDF8]">{submitResult.checkIn.position}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Trạng thái:</span>
                  <span
                    className={`font-bold ${
                      submitResult.status === 'CONFIRMED' ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {submitResult.status === 'CONFIRMED' ? 'Chắc chắn tham gia' : 'Dự bị / Chờ bổ sung'}
                  </span>
                </div>
                {submitResult.checkIn.isGuest && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phân loại:</span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                      Ngoài Squad
                    </span>
                  </div>
                )}
              </div>

              {submitResult.squadMatchHint && (
                <div className="max-w-md mx-auto rounded-2xl bg-sky-500/10 border border-sky-500/30 px-4 py-2.5 text-[11px] text-sky-200 flex items-start gap-2 text-left">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
                  <span>{submitResult.squadMatchHint}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleResetForAnother}
                className="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Điểm danh cho đồng đội khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Segmented Mode Switcher: Squad vs Guest */}
              <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[#0B0F19] border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('SQUAD');
                    setSubmitError(null);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'SQUAD'
                      ? 'bg-gradient-to-r from-[#8B0000] to-[#F97316] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>Đã có trong Squad</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('GUEST');
                    setSubmitError(null);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'GUEST'
                      ? 'bg-gradient-to-r from-[#8B0000] to-[#F97316] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>Khách mời / Ngoài Squad</span>
                </button>
              </div>

              {activeTab === 'SQUAD' ? (
                <div className="space-y-4">
                  {/* Searchable Squad List */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-200">
                      Tìm và chọn tên của bạn trong Squad DVA *
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={squadSearch}
                        onChange={(e) => setSquadSearch(e.target.value)}
                        placeholder="Nhập tên, số áo (#7) hoặc vị trí (OH, S)..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0F19] border border-white/10 focus:border-[#F97316] text-sm text-white placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>

                    <div className="max-h-56 overflow-y-auto rounded-2xl bg-[#0B0F19] border border-white/10 divide-y divide-white/[0.06]">
                      {filteredSquadOptions.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          Không tìm thấy thành viên nào khớp từ khóa. Nếu bạn chưa có trong Squad, hãy chuyển sang tab{' '}
                          <button
                            type="button"
                            onClick={() => setActiveTab('GUEST')}
                            className="text-[#F97316] font-bold underline cursor-pointer"
                          >
                            Khách mời / Ngoài Squad
                          </button>
                          .
                        </div>
                      ) : (
                        filteredSquadOptions.map((p) => {
                          const isSelected = p.id === selectedPlayerId;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={p.alreadyCheckedIn}
                              onClick={() => handleSelectSquadPlayer(p)}
                              className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 transition-colors ${
                                p.alreadyCheckedIn
                                  ? 'opacity-45 cursor-not-allowed bg-white/[0.01]'
                                  : isSelected
                                    ? 'bg-[#F97316]/15 text-white cursor-pointer'
                                    : 'bg-white/[0.02] hover:bg-white/[0.05] text-slate-200 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-8 h-8 rounded-lg bg-[#111827] border border-white/10 font-mono font-black text-xs text-[#FACC15] flex items-center justify-center shrink-0 tabular-nums">
                                  #{p.jerseyNumber}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold truncate">{p.fullName}</div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                    <span>{p.level}</span>
                                    <span>·</span>
                                    <span className="font-mono">{p.position}</span>
                                    {p.skillRank && (
                                      <>
                                        <span>·</span>
                                        <span className="text-sky-300 font-bold">USAV {p.skillRank}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0">
                                {p.alreadyCheckedIn ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                    Đã điểm danh ✓
                                  </span>
                                ) : isSelected ? (
                                  <span className="px-2 py-0.5 rounded-full bg-[#F97316] text-white text-[10px] font-bold">
                                    Đã chọn
                                  </span>
                                ) : null}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Inherited Athletic Summary */}
                  {selectedSquadPlayer && (
                    <div className="rounded-2xl bg-[#0B0F19] border border-sky-500/30 p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
                          Hồ sơ kế thừa: {selectedSquadPlayer.fullName} (#{selectedSquadPlayer.jerseyNumber})
                        </span>
                        <span className="text-[10px] font-mono text-sky-300 font-bold">
                          {selectedSquadPlayer.level}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] text-slate-300 font-mono tabular-nums">
                        {selectedSquadPlayer.bornYear && (
                          <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/10">
                            NS: {selectedSquadPlayer.bornYear}
                          </span>
                        )}
                        {selectedSquadPlayer.gender && (
                          <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/10">
                            {selectedSquadPlayer.gender === 'FEMALE' ? '♀ Nữ' : '♂ Nam'}
                          </span>
                        )}
                        {selectedSquadPlayer.skillRank && (
                          <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-amber-300">
                            USAV {selectedSquadPlayer.skillRank}
                          </span>
                        )}
                        {selectedSquadPlayer.spikeTouch && (
                          <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/10">
                            Đà: {selectedSquadPlayer.spikeTouch}cm
                          </span>
                        )}
                        {selectedSquadPlayer.blockTouch && (
                          <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/10">
                            Chắn: {selectedSquadPlayer.blockTouch}cm
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Phone / Zalo for Squad */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1">
                      Số Zalo / SĐT {selectedSquadPlayer?.hasAccountPhone ? '(tùy chọn — đã có trên tài khoản)' : '*'}
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={
                        selectedSquadPlayer?.hasAccountPhone
                          ? 'Để trống để dùng SĐT tài khoản, hoặc nhập số Zalo khác'
                          : 'VD: 0987 654 321'
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-white/10 focus:border-[#F97316] text-sm text-white font-mono tabular-nums placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Guest info banner */}
                  <div className="rounded-2xl bg-purple-500/10 border border-purple-500/25 px-3.5 py-2.5 text-[11px] text-purple-200 leading-relaxed">
                    Thông tin khách mời chỉ lưu trong phạm vi giải đấu này (gắn nhãn <strong>Ngoài Squad</strong>) để Đội trưởng xếp đội hình &amp; nộp danh sách BTC. Không cần tải ảnh đại diện.
                  </div>

                  {/* Name, BirthYear, Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                      <label className="block text-xs font-bold text-slate-200 mb-1">Họ và tên *</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-white/10 focus:border-[#F97316] text-sm text-white placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-200 mb-1">Năm sinh *</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        required
                        min={1950}
                        max={2016}
                        value={birthYear}
                        onChange={(e) => setBirthYear(e.target.value)}
                        placeholder="1999"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0B0F19] border border-white/10 focus:border-[#F97316] text-sm text-white font-mono tabular-nums placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-200 mb-1">Giới tính *</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(
                          [
                            { id: 'MALE', label: '♂ Nam' },
                            { id: 'FEMALE', label: '♀ Nữ' },
                          ] as const
                        ).map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setGender(g.id)}
                            className={`py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                              gender === g.id
                                ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-white'
                                : 'bg-[#0B0F19] border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* USAV Skill Rank + Inline USAV Guide Trigger */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-200">
                        Phân hạng trình độ (USAV Rank) *
                      </label>
                      <button
                        type="button"
                        onClick={() => setUsavSheetOpen(true)}
                        className="rounded-full bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 px-3 py-1 text-xs font-medium text-orange-200 hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5 text-[#F97316]" />
                        <span>🇻🇳 Bảng phân cấp USAV</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {SKILL_RANK_LIST.map((meta) => {
                        const active = skillRank === meta.code;
                        return (
                          <button
                            key={meta.code}
                            type="button"
                            onClick={() => setSkillRank(meta.code)}
                            className={`py-2.5 px-2 rounded-xl border text-center transition-colors cursor-pointer ${
                              active
                                ? 'bg-gradient-to-r from-[#8B0000] to-[#F97316] border-orange-400 text-white shadow'
                                : 'bg-[#0B0F19] border-white/10 text-slate-300 hover:border-white/25'
                            }`}
                          >
                            <div className="font-mono font-black text-sm">{meta.code}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Spike Touch & Block Touch (side by side tabular-nums) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1">
                        Bật đà (cm)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={150}
                        max={420}
                        step="1"
                        value={spikeTouch}
                        onChange={(e) => setSpikeTouch(e.target.value)}
                        placeholder="VD: 315"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-white/10 focus:border-[#F97316] text-sm text-white font-mono tabular-nums placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1">
                        Bật chắn (cm)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={140}
                        max={400}
                        step="1"
                        value={blockTouch}
                        onChange={(e) => setBlockTouch(e.target.value)}
                        placeholder="VD: 300"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-white/10 focus:border-[#F97316] text-sm text-white font-mono tabular-nums placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Jersey Number & Zalo/Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-bold text-slate-200 mb-1">
                        Số áo dự kiến
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={99}
                        value={jerseyNumber}
                        onChange={(e) => setJerseyNumber(e.target.value)}
                        placeholder="VD: 7"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-white/10 focus:border-[#F97316] text-sm text-white font-mono tabular-nums placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-8">
                      <label className="block text-xs font-bold text-slate-200 mb-1">
                        Số Zalo / SĐT *
                      </label>
                      <input
                        type="tel"
                        inputMode="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0987 654 321 (dùng liên hệ & chống trùng)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-white/10 focus:border-[#F97316] text-sm text-white font-mono tabular-nums placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Position Selector with Live Slot Indicators (Shared for both Squad & Guest) */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="block text-xs font-bold text-slate-200">
                  Vị trí thi đấu giải này *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {POSITION_QUOTA_ORDER.map((pos) => {
                    const c = data.counts[pos];
                    const meta = POSITION_LABELS[pos];
                    const isSelected = position === pos;
                    const posFull = c.quota > 0 && c.isFull;

                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => handleSelectPosition(pos)}
                        className={`p-2.5 rounded-2xl border text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#F97316]/15 border-[#F97316] text-white'
                            : posFull
                              ? 'bg-amber-500/[0.06] border-amber-500/30 text-slate-200 hover:border-amber-400/60'
                              : 'bg-[#0B0F19] border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono font-black text-sm">{pos}</span>
                          <span className="font-mono text-[11px] font-bold tabular-nums text-slate-300">
                            {c.confirmed}/{c.quota}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">{meta.vi}</div>
                        <div
                          className={`text-[10px] font-bold mt-1 ${
                            posFull
                              ? 'text-amber-300'
                              : c.remaining > 0
                                ? 'text-emerald-400'
                                : 'text-slate-500'
                          }`}
                        >
                          {posFull
                            ? `Đã đủ (${c.confirmed}/${c.quota})`
                            : c.remaining > 0
                              ? `Còn ${c.remaining} slot`
                              : '0 slot'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Soft / Hard Quota Full Guidance */}
                {isSelectedPosFull && (
                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2.5 text-xs text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div className="space-y-1">
                      {quotaHardLock ? (
                        <p>
                          Vị trí <strong>{position}</strong> đã đủ chỉ tiêu ({selectedPosCount?.confirmed}/
                          {selectedPosCount?.quota}). Chế độ khóa trần đang bật — đăng ký của bạn sẽ tự động ghi nhận vào danh sách <strong>Dự bị / Chờ bổ sung</strong>.
                        </p>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span>
                            Vị trí <strong>{position}</strong> đã đủ ({selectedPosCount?.confirmed}/
                            {selectedPosCount?.quota}). Gợi ý chuyển sang <strong>Dự bị</strong>.
                          </span>
                          {status !== 'RESERVE' && (
                            <button
                              type="button"
                              onClick={() => setStatus('RESERVE')}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-[11px] font-bold text-amber-100 cursor-pointer"
                            >
                              Chọn Dự bị
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Attendance Status + Note */}
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-bold text-slate-200">Trạng thái tham gia *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={quotaHardLock && isSelectedPosFull}
                    onClick={() => setStatus('CONFIRMED')}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold transition-colors ${
                      quotaHardLock && isSelectedPosFull
                        ? 'opacity-40 cursor-not-allowed bg-[#0B0F19] border-white/10 text-slate-500'
                        : status === 'CONFIRMED'
                          ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200 cursor-pointer'
                          : 'bg-[#0B0F19] border-white/10 text-slate-400 hover:text-white cursor-pointer'
                    }`}
                  >
                    ✓ Chắc chắn tham gia
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('RESERVE')}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold transition-colors cursor-pointer ${
                      status === 'RESERVE'
                        ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                        : 'bg-[#0B0F19] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    ⏳ Dự bị / Chờ bổ sung
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Ghi chú ngắn (tùy chọn)
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="VD: Có thể đánh phụ cả OP, hoặc đến sân lúc 7h45..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-white/10 focus:border-[#F97316] text-xs text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              {submitError && (
                <div className="rounded-2xl bg-red-950/60 border border-red-500/40 px-3.5 py-2.5 text-xs text-red-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#8B0000] to-[#F97316] hover:brightness-110 disabled:opacity-60 text-white font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gửi điểm danh...</span>
                  </>
                ) : (
                  <span>Xác nhận Điểm danh</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Public Attendee List Card (Solid surface + bg-white/[0.03] rows — ZERO backdrop-blur) */}
        <div className="lg:col-span-5 rounded-3xl bg-[#111827]/95 border border-white/10 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading font-black text-base text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#38BDF8]" />
              <span>Danh sách anh em đã điểm danh</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 font-mono text-[11px] font-bold text-slate-200 tabular-nums">
              {data.attendees.length} VĐV
            </span>
          </div>

          {data.attendees.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 text-center text-xs text-slate-400">
              Chưa có ai điểm danh. Hãy là người mở bát đầu tiên cho đội hình DVA!
            </div>
          ) : (
            <div className="space-y-4">
              {/* Confirmed Group */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  <span>Chắc chắn tham gia</span>
                  <span className="font-mono tabular-nums">{confirmedAttendees.length}</span>
                </div>
                {confirmedAttendees.length === 0 ? (
                  <p className="text-xs text-slate-500 italic px-1">Chưa có suất chính thức nào.</p>
                ) : (
                  <div className="space-y-1.5">
                    {confirmedAttendees.map((item, idx) => (
                      <div
                        key={item.id}
                        className="rounded-xl bg-white/[0.03] border border-white/[0.07] px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[11px] font-mono text-slate-500 w-5 tabular-nums">
                            {idx + 1}.
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black border shrink-0 ${
                              POSITION_LABELS[item.position].badge
                            }`}
                          >
                            {item.position}
                          </span>
                          <span className="text-xs font-bold text-white truncate">{item.fullName}</span>
                          {item.jerseyNumber != null && (
                            <span className="text-[11px] font-mono text-[#FACC15] shrink-0 tabular-nums">
                              #{item.jerseyNumber}
                            </span>
                          )}
                        </div>
                        {item.isGuest && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-bold shrink-0">
                            Ngoài Squad
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reserve Group */}
              {reserveAttendees.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    <span>Dự bị / Chờ bổ sung</span>
                    <span className="font-mono tabular-nums">{reserveAttendees.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {reserveAttendees.map((item, idx) => (
                      <div
                        key={item.id}
                        className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[11px] font-mono text-slate-500 w-5 tabular-nums">
                            {idx + 1}.
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black border shrink-0 ${
                              POSITION_LABELS[item.position].badge
                            }`}
                          >
                            {item.position}
                          </span>
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {item.fullName}
                          </span>
                          {item.jerseyNumber != null && (
                            <span className="text-[11px] font-mono text-slate-400 shrink-0 tabular-nums">
                              #{item.jerseyNumber}
                            </span>
                          )}
                        </div>
                        {item.isGuest && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-bold shrink-0">
                            Ngoài Squad
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inline USAV Skill Level Quick-Reference Bottom Sheet (reuses SKILL_RANK_LIST without losing form state) */}
      {usavSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4"
          onClick={() => setUsavSheetOpen(false)}
        >
          <div
            className="w-full sm:max-w-2xl max-h-[85dvh] rounded-t-3xl sm:rounded-3xl bg-[#0E1422] border border-white/15 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
              <div>
                <h3 className="font-heading font-black text-base text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#F97316]" />
                  <span>Bảng Phân Cấp Trình Độ Chuẩn USAV (C → OPEN)</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Chạm vào một hạng bên dưới để chọn nhanh cho form điểm danh mà không mất dữ liệu đã nhập.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUsavSheetOpen(false)}
                aria-label="Đóng bảng phân cấp USAV"
                className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-300 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5">
              {SKILL_RANK_LIST.map((rank) => {
                const isSelected = skillRank === rank.code;
                return (
                  <button
                    key={rank.code}
                    type="button"
                    onClick={() => {
                      setSkillRank(rank.code);
                      setUsavSheetOpen(false);
                    }}
                    className={`w-full text-left rounded-2xl p-3.5 border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#F97316]/15 border-[#F97316]'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-black border ${rank.badgeClass}`}
                        >
                          {rank.code}
                        </span>
                        <span className="font-bold text-sm text-white truncate">{rank.labelVi}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {isSelected ? 'Đang chọn ✓' : 'Chạm để chọn'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{rank.descriptionVi}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {rank.highlightsVi.map((h) => (
                        <span
                          key={h}
                          className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-slate-300"
                        >
                          • {h}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t border-white/10 bg-[#0B0F19] flex items-center justify-between gap-2 shrink-0 text-xs">
              <a
                href="/information/skill-levels"
                target="_blank"
                rel="noreferrer"
                className="text-orange-300 hover:text-orange-200 font-bold inline-flex items-center gap-1"
              >
                <span>Xem trang hướng dẫn USAV đầy đủ</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setUsavSheetOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
