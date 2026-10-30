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
      className={`rounded-2xl border bg-[#0E1524] overflow-hidden flex flex-col justify-between shadow-lg transition-all ${
        isMaintenance
          ? 'border-amber-500/60 ring-1 ring-amber-500/20'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <div>
        <div className="relative h-36 w-full bg-slate-900 overflow-hidden">
          <img
            src={court.imageUrl || '/courts/btl.png'}
            alt={court.name}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover transition-all ${
              isMaintenance ? 'opacity-50 grayscale-[40%]' : ''
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0E1524] via-black/40 to-transparent" />
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase bg-red-600 text-white shadow">
                {court.code}
              </span>
              {isMaintenance ? (
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-950/95 text-amber-300 border border-amber-500/70 shadow flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Bảo trì / Tạm ngưng</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-950/95 text-emerald-300 border border-emerald-500/60 shadow flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Hoạt động</span>
                </span>
              )}
            </div>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-black/75 text-orange-400 border border-orange-500/30">
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
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Trạng thái vận hành:</span>
            {isMaintenance ? (
              <span className="font-bold text-amber-400">
                🛠️ Đang bảo trì (Ngừng nhận đơn)
              </span>
            ) : (
              <span className="font-bold text-emerald-400">
                ✓ Sẵn sàng cho thuê
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Tổng số ca / tuần:</span>
            <strong className="font-mono text-emerald-400">
              {totalWeeklySlots} ca hoạt động
            </strong>
          </div>

          <div className="bg-[#161F30] p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">T2 – T6 (Ngày thường):</span>
              <span className="font-mono text-white font-semibold truncate max-w-[155px]">
                {(schedule.monday || []).length > 0
                  ? `${schedule.monday.length} ca (${schedule.monday[0]?.split(' ')[0]}...)`
                  : 'Nghỉ'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Thứ 7 (Sat):</span>
              <span className="font-mono text-orange-300 font-semibold">
                {(schedule.saturday || []).length} ca
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Chủ Nhật (Sun):</span>
              <span className="font-mono text-orange-300 font-semibold">
                {(schedule.sunday || []).length} ca
              </span>
            </div>
          </div>

          {/* Quick Toggle Maintenance Button */}
          <button
            type="button"
            disabled={isTogglingThis}
            onClick={() => onToggleMaintenance(court)}
            className={`w-full min-h-[40px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              isMaintenance
                ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
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

      <div className="px-4 py-3 border-t border-slate-800/80 flex items-center justify-between gap-2 bg-[#0B101C]">
        <button
          type="button"
          onClick={() => onEdit(court)}
          className="flex-1 min-h-[40px] py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5 text-orange-400" />
          <span>Sửa Sân & Lịch Tuần</span>
        </button>
        <button
          type="button"
          onClick={() => onDelete(court)}
          className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-slate-800/80 hover:bg-red-950 text-slate-400 hover:text-red-300 border border-slate-700/80 hover:border-red-800 flex items-center justify-center cursor-pointer transition-colors"
          title="Xóa sân"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
