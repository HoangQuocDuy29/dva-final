import React from 'react';
import {
  MapPin,
  RefreshCw,
  Unlock,
  Lock,
  Edit3,
  Trash2,
} from 'lucide-react';
import { Court, DAYS_OF_WEEK } from '../../../../types';
import {
  getSlotsForSubCourt,
  normalizeWeeklySchedule,
} from '../../../../shared/schedule';

export interface CourtCardProps {
  court: Court;
  togglingCourtId: string | null;
  onToggleMaintenance: (court: Court) => void;
  onEdit: (court: Court) => void;
  onDelete: (court: Court) => void;
}

export const CourtCard: React.FC<CourtCardProps> = ({
  court,
  togglingCourtId,
  onToggleMaintenance,
  onEdit,
  onDelete,
}) => {
  const courtSubCourts = court.subCourts?.length
    ? court.subCourts
    : court.id === 'court-btl' || court.code === 'BTL_TT'
    ? ['Sân A', 'Sân B']
    : [];
  const isMultiSubs = courtSubCourts.length > 1;
  const totalWeeklySlots = isMultiSubs
    ? courtSubCourts.reduce(
        (total, sc) =>
          total +
          DAYS_OF_WEEK.reduce(
            (acc, d) =>
              acc + getSlotsForSubCourt(court.weeklySchedule, d.key, sc).length,
            0
          ),
        0
      )
    : DAYS_OF_WEEK.reduce(
        (acc, d) =>
          acc + getSlotsForSubCourt(court.weeklySchedule, d.key).length,
        0
      );
  const schedule = normalizeWeeklySchedule(court.weeklySchedule, court.id);
  const isMaintenance = Boolean(
    court.isMaintenance === true ||
      court.status === 'MAINTENANCE' ||
      court.isAvailable === false
  );
  const isTogglingThis = togglingCourtId === court.id;

  return (
    <div
      className={`dva-glass-card rounded-3xl overflow-hidden flex flex-col justify-between shadow-lg ${
        isMaintenance
          ? '!border-amber-500/45 shadow-[0_0_24px_rgba(245,158,11,0.12)]'
          : ''
      }`}
    >
      <div>
        <div className="relative h-36 w-full bg-white/[0.04] overflow-hidden">
          <img
            src={court.imageUrl || '/courts/btl.png'}
            alt={court.name}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover transition-all ${
              isMaintenance ? 'opacity-50 grayscale-[40%]' : ''
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D12]/90 via-black/35 to-transparent" />
          <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-[#B91C1C] to-[#EA580C] text-white shadow">
                {court.code}
              </span>
              {isMaintenance ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0B0D12]/80 text-amber-200 border border-amber-400/45 shadow flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Bảo trì / Tạm ngưng</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0B0D12]/80 text-emerald-200 border border-emerald-400/40 shadow flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Hoạt động</span>
                </span>
              )}
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tabular-nums bg-[#0B0D12]/80 text-orange-300 border border-orange-500/35">
              {Number(court.hourlyRate || 500000).toLocaleString('vi-VN')} đ/h
            </span>
          </div>
          <div className="absolute bottom-2.5 left-3 right-3">
            <h4 className="font-heading font-black text-base text-white truncate">
              {court.name}
            </h4>
            <div className="text-[11px] text-slate-300 flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
              <span className="truncate">
                {court.address || 'DVA Sports Center, Hà Nội'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-400">Trạng thái vận hành:</span>
            {isMaintenance ? (
              <span className="font-bold text-amber-300 text-right">
                🛠️ Đang bảo trì (Ngừng nhận đơn)
              </span>
            ) : (
              <span className="font-bold text-emerald-400 text-right">
                ✓ Sẵn sàng cho thuê
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>Tổng số ca / tuần:</span>
            <strong className="font-mono tabular-nums text-emerald-400">
              {totalWeeklySlots} ca hoạt động
            </strong>
          </div>

          <div className="bg-white/[0.025] p-3 rounded-2xl border border-white/[0.08] space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">T2 – T6 (Ngày thường):</span>
              <span className="font-mono tabular-nums text-white font-semibold truncate max-w-[155px]">
                {(schedule.monday || []).length > 0
                  ? `${schedule.monday.length} ca (${schedule.monday[0]?.split(' ')[0]}...)`
                  : 'Nghỉ'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">Thứ 7 (Sat):</span>
              <span className="font-mono tabular-nums text-orange-300 font-semibold">
                {(schedule.saturday || []).length} ca
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">Chủ Nhật (Sun):</span>
              <span className="font-mono tabular-nums text-orange-300 font-semibold">
                {(schedule.sunday || []).length} ca
              </span>
            </div>
          </div>

          {/* Quick Toggle Maintenance Button */}
          <button
            type="button"
            disabled={isTogglingThis}
            onClick={() => onToggleMaintenance(court)}
            className={`w-full h-9 px-3.5 rounded-full font-bold text-xs flex items-center justify-center gap-2 border transition-colors transition-transform duration-150 cursor-pointer ${
              isMaintenance
                ? 'bg-emerald-500/[0.1] hover:bg-emerald-500/[0.18] text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/[0.1] hover:bg-amber-500/[0.18] text-amber-300 border-amber-500/30'
            } ${isTogglingThis ? 'opacity-60 cursor-wait' : ''}`}
          >
            {isTogglingThis ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang cập nhật...</span>
              </>
            ) : isMaintenance ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kích hoạt lại</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Tạm dừng sân (Bảo trì)</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-white/[0.08] flex items-center justify-between gap-2 bg-white/[0.02]">
        <button
          type="button"
          onClick={() => onEdit(court)}
          className="flex-1 h-9 px-3.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors transition-transform duration-150"
        >
          <Edit3 className="w-3.5 h-3.5 text-orange-400" />
          <span>Sửa Sân & Lịch Tuần</span>
        </button>
        <button
          type="button"
          onClick={() => onDelete(court)}
          className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-rose-500/15 border border-white/12 hover:border-rose-500/35 text-slate-400 hover:text-rose-400 flex items-center justify-center cursor-pointer transition-colors transition-transform duration-150 shrink-0"
          title="Xóa sân"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
