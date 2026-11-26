import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  History,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { MemberApplication } from '../../../../types';
import { memberService } from '../../../../services/api';
import {
  TRYOUT_TIME_PRESETS,
  buildTryoutInvitationEmailHtml,
  getNextTryoutDateString,
  getTryoutDayInfo,
} from '../../../../shared/tryoutEmail';

interface ScheduleTryoutModalProps {
  application: MemberApplication | null;
  isSuperAdmin: boolean;
  onClose: () => void;
  onScheduled: (updatedApp: MemberApplication, message: string) => void;
}

const COACH_NOTE_PRESETS = [
  'Mang giày bóng chuyền indoor đế bằng (non-marking) để bảo vệ mặt thảm.',
  'Có mặt trước giờ hẹn 15 phút để điểm danh và khởi động cùng HLV.',
  'Mang theo nước uống cá nhân và trang phục thể thao thoải mái.',
] as const;

export const ScheduleTryoutModal: React.FC<ScheduleTryoutModalProps> = ({
  application,
  isSuperAdmin,
  onClose,
  onScheduled,
}) => {
  const [toEmail, setToEmail] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState<string>('18:00 - 19:00');
  const [notes, setNotes] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'FORM' | 'PREVIEW'>('FORM');

  useEffect(() => {
    if (!application) return;
    const initialDate = application.scheduledDate || getNextTryoutDateString();
    const dayInfo = getTryoutDayInfo(initialDate);
    setToEmail(isSuperAdmin ? (application.gmail || '') : '');
    setDate(initialDate);
    setTimeSlot(application.scheduledTime || dayInfo.recommendedSlot);
    setNotes(
      application.scheduledNotes ||
        'Mang giày đế bằng chuyên dụng indoor (non-marking), có mặt trước 15 phút để khởi động cùng HLV.'
    );
    setErrorMsg(null);
    setMobileView('FORM');
  }, [application, isSuperAdmin]);

  const dayInfo = useMemo(() => getTryoutDayInfo(date), [date]);

  const handleDateChange = (nextDate: string) => {
    setDate(nextDate);
    const nextInfo = getTryoutDayInfo(nextDate);
    if (
      nextInfo.valid &&
      (timeSlot === '18:00 - 19:00' || timeSlot === '13:30 - 14:30')
    ) {
      setTimeSlot(nextInfo.recommendedSlot);
    }
  };

  const handleAppendNote = (snippet: string) => {
    setNotes((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return snippet;
      if (trimmed.includes(snippet)) return prev;
      return `${trimmed}\n${snippet}`;
    });
  };

  const previewHtml = useMemo(() => {
    if (!application) return '';
    return buildTryoutInvitationEmailHtml({
      fullName: application.fullName,
      position: application.position,
      level: application.level,
      phone: isSuperAdmin ? application.zalo : undefined,
      toEmail: isSuperAdmin ? (toEmail.trim() || application.gmail || '') : '',
      date,
      dayLabel: dayInfo.combinedLabel,
      timeSlot: timeSlot.trim() || dayInfo.recommendedSlot,
      notes,
      paymentStatus: application.paymentStatus || 'PENDING',
    });
  }, [application, isSuperAdmin, toEmail, date, dayInfo, timeSlot, notes]);

  if (!application) return null;

  const subjectLine = `[DVA Volleyball Club] Thư mời tham gia Try-Out / Try-Out Invitation - ${application.fullName} (${
    dayInfo.valid ? `${dayInfo.viDay} ${dayInfo.formattedDate}` : date
  })`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = toEmail.trim().toLowerCase();
    if (isSuperAdmin && (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))) {
      setErrorMsg('Vui lòng nhập địa chỉ email người nhận hợp lệ.');
      return;
    }
    if (!date || !dayInfo.valid) {
      setErrorMsg('Vui lòng chọn ngày hẹn Try-Out hợp lệ.');
      return;
    }
    const cleanTime = timeSlot.trim();
    if (!cleanTime || cleanTime.length < 3) {
      setErrorMsg('Vui lòng chọn hoặc nhập khung giờ hẹn Try-Out.');
      return;
    }

    setIsSending(true);
    try {
      const res = await memberService.scheduleTryout(application.id, {
        ...(isSuperAdmin ? { toEmail: cleanEmail } : {}),
        date,
        timeSlot: cleanTime,
        notes: notes.trim(),
      });
      onScheduled(res.application, res.message);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể gửi email hẹn lịch Try-Out. Vui lòng thử lại.');
    } finally {
      setIsSending(false);
    }
  };

  const historyList = Array.isArray(application.scheduleHistory) ? application.scheduleHistory : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-tryout-modal-title"
    >
      <div className="rounded-3xl bg-[#0B0D12]/85 backdrop-blur-2xl border border-white/15 shadow-[0_24px_64px_rgba(0,0,0,0.65)] max-w-6xl w-full relative text-white flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 sm:px-6 py-3.5 shrink-0 bg-white/[0.03]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-950/50 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="schedule-tryout-modal-title" className="text-base sm:text-lg font-black text-white truncate">
                Schedule Try-Out Invitation
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Gửi thư mời hẹn lịch đánh giá Try-Out qua Resend kèm bản đồ &amp; hướng dẫn vào sân 155 Trường Chinh.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSending}
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-white p-2 rounded-full bg-white/[0.05] hover:bg-white/10 border border-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Form / Preview Toggle */}
        <div className="lg:hidden flex items-center gap-2 px-5 py-2.5 border-b border-white/10 bg-white/[0.02] shrink-0">
          <button
            type="button"
            onClick={() => setMobileView('FORM')}
            className={`flex-1 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              mobileView === 'FORM'
                ? 'bg-orange-500 text-white'
                : 'bg-white/[0.05] border border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule Form</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileView('PREVIEW')}
            className={`flex-1 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              mobileView === 'PREVIEW'
                ? 'bg-orange-500 text-white'
                : 'bg-white/[0.05] border border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Email Preview</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 sm:p-6">
          {errorMsg && (
            <div className="mb-4 bg-red-500/15 border border-red-500/40 text-red-200 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form */}
            <form
              id="schedule-tryout-form"
              onSubmit={handleSubmit}
              className={`lg:col-span-5 space-y-4 ${mobileView === 'PREVIEW' ? 'hidden lg:block' : ''}`}
            >
              {/* Auto-filled Candidate Card */}
              <div className="dva-glass-card !rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-4 h-4 text-orange-400 shrink-0" />
                    <span className="font-bold text-sm text-white truncate">{application.fullName}</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                      application.paymentStatus === 'FREE'
                        ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                        : application.paymentStatus === 'PAID'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    Fee: {application.paymentStatus || 'PENDING'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="bg-white/[0.04] rounded-xl px-3 py-2 border border-white/10">
                    <span className="text-slate-400 block text-[10px]">Position &amp; Level</span>
                    <strong className="text-orange-400 font-bold">
                      {application.position} · {application.level}
                    </strong>
                  </div>
                  {isSuperAdmin ? (
                    <div className="bg-white/[0.04] rounded-xl px-3 py-2 border border-white/10">
                      <span className="text-slate-400 block text-[10px]">Phone / Zalo</span>
                      <strong className="text-white font-mono inline-flex items-center gap-1">
                        <Phone className="w-3 h-3 text-sky-400" />
                        {application.zalo || '—'}
                      </strong>
                    </div>
                  ) : (
                    <div className="bg-white/[0.04] rounded-xl px-3 py-2 border border-white/10">
                      <span className="text-slate-400 block text-[10px]">Physical Metrics</span>
                      <strong className="text-white font-mono">
                        {application.height}cm{application.spikeReach > 0 ? ` · ${application.spikeReach}cm` : ''}
                      </strong>
                    </div>
                  )}
                </div>

                {application.preferredDays && (
                  <div className="text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/30 rounded-xl px-3 py-2">
                    <span className="font-bold text-sky-400">Khung ngày VĐV mong muốn:</span>{' '}
                    {application.preferredDays}
                  </div>
                )}
              </div>

              {/* Recipient Email */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Email người nhận (toEmail) {isSuperAdmin && <span className="text-red-400">*</span>}
                </label>
                {isSuperAdmin ? (
                  <div className="relative">
                    <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={toEmail}
                      onChange={(e) => setToEmail(e.target.value)}
                      placeholder="athlete@gmail.com"
                      className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500/60 focus:bg-white/[0.08] placeholder:text-white/40 transition-colors"
                    />
                  </div>
                ) : (
                  <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-sky-300 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Server tự động đọc email của {application.fullName} &amp; gửi qua Resend (Ẩn theo quyền ADMIN).</span>
                  </div>
                )}
              </div>

              {/* Date + Auto Weekday Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Ngày hẹn Try-Out <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500/60 focus:bg-white/[0.08] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Thứ trong tuần (Tự động)
                  </label>
                  <div
                    className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-bold border flex items-center justify-between ${
                      dayInfo.valid
                        ? dayInfo.isStandardTryoutDay
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        : 'bg-white/[0.05] border-white/10 text-slate-400'
                    }`}
                  >
                    <span>{dayInfo.valid ? dayInfo.combinedLabel : '—'}</span>
                    {dayInfo.valid && (
                      <span className="text-[10px] font-mono opacity-85">
                        {dayInfo.isStandardTryoutDay ? 'Lịch chuẩn' : 'Lịch riêng'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {dayInfo.valid && !dayInfo.isStandardTryoutDay && (
                <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                  Lưu ý: Lịch Try-Out cố định là Thứ 2, 4, 6, 7 (18:00 - 19:00) &amp; Chủ Nhật (13:30 - 14:30). Bạn vẫn có thể hẹn lịch riêng vào {dayInfo.viDay}.
                </div>
              )}

              {/* Time Slot Presets & Custom Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Khung giờ Try-Out <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    placeholder="18:00 - 19:00"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500/60 focus:bg-white/[0.08] transition-colors"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {TRYOUT_TIME_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTimeSlot(preset)}
                      className={`text-[11px] px-3 py-1 rounded-full border font-mono cursor-pointer transition-colors ${
                        timeSlot === preset
                          ? 'bg-orange-500/20 border-orange-500/60 text-orange-300 font-bold'
                          : 'bg-white/[0.05] border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {preset}{' '}
                      <span className="text-[10px] opacity-75">
                        ({preset === '13:30 - 14:30' ? 'Chủ Nhật' : 'T2, T4, T6, T7'})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Coach / Admin Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Ghi chú riêng của HLV / Admin (notes)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="VD: Mang giày đế bằng chuyên dụng indoor, có mặt trước 15 phút để khởi động..."
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500/60 focus:bg-white/[0.08] placeholder:text-white/40 resize-y transition-colors"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {COACH_NOTE_PRESETS.map((snippet, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAppendNote(snippet)}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer transition-colors"
                    >
                      + {idx === 0 ? 'Giày indoor' : idx === 1 ? 'Đến sớm 15p' : 'Nước & đồ tập'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Venue reminder pill */}
              <div className="dva-glass-card !rounded-2xl p-3 text-[11px] text-slate-400 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-200 block">
                    Sân tập: Nhà thi đấu 155 Trường Chinh, Thanh Xuân, Hà Nội
                  </span>
                  <span>
                    Email tự động đính kèm nút Google Maps, hướng dẫn gửi xe, ảnh cổng vào &amp; sơ đồ vào nhà thi đấu.
                  </span>
                </div>
              </div>

              {/* Invite History if previously sent */}
              {historyList.length > 0 && (
                <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/25 space-y-1.5">
                  <div className="text-[11px] font-bold text-sky-300 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span>Lịch sử hẹn đã gửi ({historyList.length})</span>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar">
                    {historyList.slice(0, 4).map((h, i) => (
                      <div key={i} className="text-[10px] text-slate-300 flex items-center justify-between gap-2">
                        <span className="truncate">
                          {h.dayLabel} ({h.date}) · {h.timeSlot}
                          {isSuperAdmin && h.toEmail ? ` → ${h.toEmail}` : ''}
                        </span>
                        <span className={h.emailSent ? 'text-emerald-400 font-bold shrink-0' : 'text-amber-400 shrink-0'}>
                          {h.emailSent ? 'Sent ✓' : 'Saved'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>

            {/* Right Column: Live Email Preview */}
            <div className={`lg:col-span-7 space-y-2.5 ${mobileView === 'FORM' ? 'hidden lg:block' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  Live Email Preview (Resend HTML)
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                  dva-volleyball-hanoi.com
                </span>
              </div>

              <div className="dva-glass-card !rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/10 text-[11px] space-y-1 bg-white/[0.03]">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="font-semibold shrink-0">To:</span>
                    <span className="font-mono text-sky-300 truncate">
                      {isSuperAdmin
                        ? (toEmail || application.gmail)
                        : `${application.fullName} (Server tự động gửi qua Resend)`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="font-semibold shrink-0">Subject:</span>
                    <span className="text-white font-semibold truncate">{subjectLine}</span>
                  </div>
                </div>

                <iframe
                  title="Live Try-Out Invitation Email Preview"
                  sandbox=""
                  srcDoc={previewHtml}
                  className="w-full h-[420px] sm:h-[450px] bg-[#0b0f19] border-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 border-t border-white/10 bg-white/[0.03] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Trạng thái hồ sơ sẽ chuyển sang <strong className="text-sky-300">SCHEDULED</strong> và{' '}
              <strong className="text-white">giữ nguyên trạng thái thanh toán ({application.paymentStatus || 'PENDING'})</strong>.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              disabled={isSending}
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/10 border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="schedule-tryout-form"
              disabled={isSending}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-950/40 disabled:opacity-50 cursor-pointer transition-all"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gửi qua Resend...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Gửi Mail Hẹn Lịch</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
