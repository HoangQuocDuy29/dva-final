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
    <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-heading font-black text-lg text-white">
              Live Court Schedule & Slot Lock Management
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Khóa ca thi đấu/giao hữu ngoại tuyến hoặc bảo trì sân theo ngày cụ thể. Ca bị khóa sẽ lập tức hiển thị "Closed / Rented" ở phía khách hàng.
          </p>
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-2 bg-[#0E1524] px-3.5 py-2 rounded-xl border border-slate-700">
          <Calendar className="w-4 h-4 text-orange-400 shrink-0" />
          <input
            type="date"
            value={selectedManageDate}
            onChange={(e) => setSelectedManageDate(e.target.value)}
            className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Court Selector Pills */}
      <div className="flex flex-wrap items-center gap-2.5">
        {courtsList.map((court) => {
          const isSelected = court.id === selectedManageCourtId;
          return (
            <button
              key={court.id}
              type="button"
              onClick={() => setSelectedManageCourtId(court.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg shadow-red-950/40 ring-1 ring-red-400'
                  : 'bg-[#0E1524] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{court.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isSelected
                    ? 'bg-black/30 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {court.code}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lock Reason Optional Input */}
      <div className="flex items-center gap-3 bg-[#0E1524] p-3 rounded-2xl border border-slate-800 text-xs">
        <span className="text-slate-400 font-semibold whitespace-nowrap">
          Lý do khóa ca mặc định:
        </span>
        <input
          type="text"
          value={lockReason}
          onChange={(e) => setLockReason(e.target.value)}
          placeholder="VD: Đội ngoài thuê cố định, Trận đấu giao hữu CLB, Vệ sinh mặt sàn..."
          className="flex-1 bg-transparent text-white border-b border-slate-700 focus:border-orange-500 focus:outline-none px-2 py-1 text-xs"
        />
      </div>

      {/* Slot Grid for the chosen Court & Date */}
      <div className="space-y-4">
        {/* Sub-Court Selector for Court Clusters (BTL Thông Tin) */}
        {manageCourtHasSubCourts && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B0F19] p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Quản lý theo Sân Con (Sub-Courts) - {selectedManageCourt?.name}:
                </span>
                <span className="text-[11px] text-slate-400">
                  Đóng/mở bảo trì riêng từng sân độc lập. Trạng thái không bị ảnh hưởng chéo giữa các sân con.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isSubSelected
                        ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md shadow-red-950/40 ring-1 ring-red-400'
                        : 'bg-[#121826] text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    <span>{sc}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isSubSelected
                          ? 'bg-black/40 text-white'
                          : 'bg-slate-800 text-slate-400'
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
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isClosed
                      ? 'bg-red-950/30 border-red-800/80'
                      : bookingMatch
                      ? 'bg-blue-950/30 border-blue-800/80'
                      : 'bg-[#0E1524] border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono font-bold text-sm text-white flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-orange-400" />
                        <span>{slot.label}</span>
                        {manageCourtHasSubCourts && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-orange-950 text-orange-300 border border-orange-800">
                            {adminSelectedSubCourt}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {slot.period} · {slot.durationHours} hours
                      </span>
                    </div>

                    {isClosed ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-900 text-red-200 border border-red-700 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>CLOSED</span>
                      </span>
                    ) : bookingMatch ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900 text-blue-200 border border-blue-700">
                        {bookingMatch.paymentStatus === 'PAID'
                          ? 'BOOKED'
                          : 'HOLDING'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        OPEN
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs gap-2">
                    <div className="text-[11px] text-slate-400 truncate">
                      {isClosed ? (
                        <span className="text-red-400 font-semibold">
                          Đã khóa: {isClosed.reason || 'Bảo trì'}
                        </span>
                      ) : bookingMatch ? (
                        <span>
                          <strong className="text-white">
                            {bookingMatch.customerName}
                          </strong>
                          <span className="text-slate-500 ml-1">
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
                          className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 flex items-center gap-1 transition-all cursor-pointer shadow"
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
                          className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 transition-all cursor-pointer"
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
                          className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5 text-red-400" />
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
