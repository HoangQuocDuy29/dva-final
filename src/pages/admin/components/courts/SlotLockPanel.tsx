import React from 'react';
import { Calendar, Sparkles, Clock, Lock, Unlock } from 'lucide-react';
import {
  getScheduleSlotsForCourtAndDate,
  compareSlotsByStartTime,
} from '../../../../shared/schedule';
import { useAdminDashboard } from '../../context/AdminDashboardContext';
import { useCourtSlotLock } from '../../hooks/useCourtSlotLock';

export const SlotLockPanel: React.FC = () => {
  const {
    data: { courtsList, closedSlots, bookings },
    courtSelection: {
      selectedManageCourtId,
      setSelectedManageCourtId,
      adminSelectedSubCourt,
      setAdminSelectedSubCourt,
      selectedManageDate,
      setSelectedManageDate,
    },
  } = useAdminDashboard();

  const {
    lockReason,
    setLockReason,
    isTogglingSlot,
    handleToggleSlotLock,
    handleReleaseBookingSlot,
  } = useCourtSlotLock();

  const selectedManageCourt = courtsList.find(
    (c) => c.id === selectedManageCourtId
  );
  const manageCourtSubCourts = selectedManageCourt?.subCourts?.length
    ? selectedManageCourt.subCourts
    : selectedManageCourtId === 'court-btl' ||
      selectedManageCourt?.code === 'BTL_TT'
    ? ['Sân A', 'Sân B']
    : [];
  const manageCourtHasSubCourts = manageCourtSubCourts.length > 0;

  const slots = getScheduleSlotsForCourtAndDate(
    selectedManageCourtId,
    selectedManageDate,
    selectedManageCourt?.weeklySchedule,
    manageCourtHasSubCourts ? adminSelectedSubCourt : undefined
  );

  return (
    <div className="dva-glass-panel rounded-3xl p-4 sm:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <h3 className="font-heading font-black text-lg text-white">
              Live Court Schedule & Slot Lock Management
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Khóa ca thi đấu/giao hữu ngoại tuyến hoặc bảo trì sân theo ngày cụ thể. Ca bị khóa sẽ lập tức hiển thị "Closed / Rented" ở phía khách hàng.
          </p>
        </div>

        {/* Date Picker */}
        <div className="dva-glass-input !rounded-full flex items-center gap-2 px-3.5 py-2 w-full sm:w-auto shrink-0">
          <Calendar className="w-4 h-4 text-orange-400 shrink-0" />
          <input
            type="date"
            aria-label="Chọn ngày quản lý lịch sân"
            value={selectedManageDate}
            onChange={(e) => setSelectedManageDate(e.target.value)}
            className="bg-transparent text-xs font-bold font-mono tabular-nums text-white focus:outline-none cursor-pointer [color-scheme:dark] w-full sm:w-auto"
          />
        </div>
      </div>

      {/* Court Selector Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {courtsList.map((court) => {
          const isSelected = court.id === selectedManageCourtId;
          return (
            <button
              key={court.id}
              type="button"
              onClick={() => setSelectedManageCourtId(court.id)}
              className={`h-9 px-4 rounded-full text-xs font-bold border transition-colors duration-150 inline-flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] text-white border-orange-400/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_20px_rgba(249,115,22,0.28)]'
                  : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border-white/12'
              }`}
            >
              <span className="truncate">{court.name}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                  isSelected
                    ? 'bg-black/25 text-white'
                    : 'bg-white/[0.06] text-slate-300'
                }`}
              >
                {court.code}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lock Reason Optional Input */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-white/[0.025] p-3 rounded-2xl border border-white/[0.08] text-xs">
        <span className="text-slate-300 font-semibold whitespace-nowrap shrink-0">
          Lý do khóa ca mặc định:
        </span>
        <input
          type="text"
          value={lockReason}
          onChange={(e) => setLockReason(e.target.value)}
          placeholder="VD: Đội ngoài thuê cố định, Trận đấu giao hữu CLB, Vệ sinh mặt sàn..."
          className="dva-glass-input flex-1 min-w-0 px-3.5 py-2 text-xs"
        />
      </div>

      {/* Slot Grid for the chosen Court & Date */}
      <div className="space-y-4">
        {/* Sub-Court Selector for Court Clusters (BTL Thông Tin) */}
        {manageCourtHasSubCourts && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.025] p-3.5 rounded-2xl border border-white/[0.08]">
            <div className="flex items-start sm:items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-orange-400 shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Quản lý theo Sân Con (Sub-Courts) - {selectedManageCourt?.name}:
                </span>
                <span className="text-[11px] text-slate-400">
                  Đóng/mở bảo trì riêng từng sân độc lập. Trạng thái không bị ảnh hưởng chéo giữa các sân con.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {manageCourtSubCourts.map((sc) => {
                const isSubSelected = adminSelectedSubCourt === sc;
                const closedCount = closedSlots.filter(
                  (cs) =>
                    cs.courtId === selectedManageCourtId &&
                    cs.date === selectedManageDate &&
                    (cs.subCourt || '') === sc
                ).length;
                const bookedCount = bookings.filter(
                  (b) =>
                    b.courtId === selectedManageCourtId &&
                    b.bookingDate === selectedManageDate &&
                    b.paymentStatus !== 'CANCELLED' &&
                    (b.subCourt || 'Sân A') === sc
                ).length;

                return (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setAdminSelectedSubCourt(sc)}
                    className={`h-8 px-3.5 rounded-full text-xs font-bold border transition-colors duration-150 inline-flex items-center gap-2 cursor-pointer ${
                      isSubSelected
                        ? 'bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] text-white border-orange-400/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_6px_18px_rgba(249,115,22,0.28)]'
                        : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border-white/12'
                    }`}
                  >
                    <span>{sc}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono tabular-nums ${
                        isSubSelected
                          ? 'bg-black/25 text-white'
                          : 'bg-white/[0.06] text-slate-300'
                      }`}
                    >
                      {closedCount > 0
                        ? `${closedCount} khóa`
                        : bookedCount > 0
                        ? `${bookedCount} đã đặt`
                        : 'Trống'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {slots
            .slice()
            .sort(compareSlotsByStartTime)
            .map((slot) => {
              const isClosed = closedSlots.find(
                (cs) =>
                  cs.courtId === selectedManageCourtId &&
                  cs.date === selectedManageDate &&
                  cs.slotLabel === slot.label &&
                  (!manageCourtHasSubCourts ||
                    (cs.subCourt || '') === adminSelectedSubCourt ||
                    !cs.subCourt)
              );
              const bookingMatch = bookings.find(
                (b) =>
                  b.courtId === selectedManageCourtId &&
                  b.bookingDate === selectedManageDate &&
                  b.paymentStatus !== 'CANCELLED' &&
                  (b.startTime === slot.start ||
                    `${b.startTime} - ${b.endTime}` === slot.label) &&
                  (!manageCourtHasSubCourts ||
                    (b.subCourt || 'Sân A') === adminSelectedSubCourt)
              );

              return (
                <div
                  key={slot.label}
                  className={`p-4 rounded-2xl border transition-colors duration-150 flex flex-col justify-between ${
                    isClosed
                      ? 'bg-rose-500/[0.08] border-rose-500/35 hover:border-rose-400/50'
                      : bookingMatch
                      ? 'bg-sky-500/[0.08] border-sky-500/35 hover:border-sky-400/50'
                      : 'dva-glass-card !rounded-2xl'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="font-mono font-bold tabular-nums text-sm text-white flex flex-wrap items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span>{slot.label}</span>
                        {manageCourtHasSubCourts && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-500/15 text-orange-300 border border-orange-500/35">
                            {adminSelectedSubCourt}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {slot.period} · {slot.durationHours} hours
                      </span>
                    </div>

                    {isClosed ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/35 inline-flex items-center gap-1 shrink-0">
                        <Lock className="w-2.5 h-2.5" />
                        <span>CLOSED</span>
                      </span>
                    ) : bookingMatch ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-400/35 shrink-0">
                        {bookingMatch.paymentStatus === 'PAID'
                          ? 'BOOKED'
                          : 'HOLDING'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/12 text-emerald-300 border border-emerald-500/30 shrink-0">
                        OPEN
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between text-xs gap-2">
                    <div className="text-[11px] text-slate-400 truncate min-w-0 flex-1">
                      {isClosed ? (
                        <span className="text-rose-300 font-semibold">
                          Đã khóa: {isClosed.reason || 'Bảo trì'}
                        </span>
                      ) : bookingMatch ? (
                        <span>
                          <strong className="text-white">
                            {bookingMatch.customerName}
                          </strong>
                          <span className="text-slate-400 ml-1">
                            ({bookingMatch.customerPhone})
                          </span>
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">
                          Ca trống (Sẵn sàng cho thuê)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {bookingMatch && (
                        <button
                          type="button"
                          disabled={isTogglingSlot}
                          onClick={(e) => {
                            e.preventDefault();
                            handleReleaseBookingSlot(
                              bookingMatch.id,
                              slot.label,
                              bookingMatch.subCourt || adminSelectedSubCourt
                            );
                          }}
                          className="px-3 py-1.5 rounded-full font-bold text-[11px] bg-emerald-500/12 hover:bg-emerald-500/22 text-emerald-300 border border-emerald-500/35 inline-flex items-center gap-1 transition-colors duration-150 cursor-pointer"
                          title="Hủy đặt chỗ của khách và giải phóng ca này ngay lập tức"
                        >
                          <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Mở lại ca này</span>
                        </button>
                      )}

                      {isClosed ? (
                        <button
                          type="button"
                          disabled={isTogglingSlot}
                          onClick={(e) => {
                            e.preventDefault();
                            handleToggleSlotLock(slot.label);
                          }}
                          className="px-3 py-1.5 rounded-full font-bold text-[11px] bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 hover:text-white border border-white/12 inline-flex items-center gap-1 transition-colors duration-150 cursor-pointer"
                        >
                          <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Mở lại ca</span>
                        </button>
                      ) : !bookingMatch ? (
                        <button
                          type="button"
                          disabled={isTogglingSlot}
                          onClick={(e) => {
                            e.preventDefault();
                            handleToggleSlotLock(slot.label);
                          }}
                          className="px-3 py-1.5 rounded-full font-bold text-[11px] bg-rose-500/12 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1 transition-colors duration-150 cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                          <span>Khóa ca</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
