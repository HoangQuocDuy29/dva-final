import React from 'react';
import {
  Clock,
  Copy,
  CheckCircle2,
  Sparkles,
  CheckCheck,
  X,
  Plus,
} from 'lucide-react';
import {
  CourtWeeklySchedule,
  DayOfWeekKey,
  DAYS_OF_WEEK,
} from '../../../../types';
import { getSlotsForSubCourt } from '../../../../shared/schedule';

export interface WeeklyScheduleEditorProps {
  weeklySchedule: CourtWeeklySchedule | undefined;
  modalSubCourts: string[];
  hasMultipleSubCourts: boolean;
  modalSubCourtTab: string;
  setModalSubCourtTab: (tab: string) => void;
  selectedScheduleDay: DayOfWeekKey;
  setSelectedScheduleDay: (day: DayOfWeekKey) => void;
  copyFeedback: string | null;
  newSlotInput: string;
  setNewSlotInput: (val: string) => void;
  getModalDaySlots: (dayKey: DayOfWeekKey) => string[];
  handleAddSlotToDay: () => void;
  handleRemoveSlotFromDay: (
    dayKey: DayOfWeekKey,
    index: number,
    slotValue?: string
  ) => void;
  handleCopyDayScheduleToWeekdays: (sourceDay: DayOfWeekKey) => void;
  handleCopyScheduleToOtherSubCourts: (sourceSubCourt: string) => void;
}

const PRESET_SLOTS = [
  '05:30 - 07:30',
  '07:30 - 09:30',
  '09:30 - 11:30',
  '13:30 - 15:30',
  '15:30 - 17:30',
  '17:30 - 19:30',
  '18:00 - 20:00',
  '19:30 - 21:30',
  '21:30 - 23:30',
];

export const WeeklyScheduleEditor: React.FC<WeeklyScheduleEditorProps> = ({
  weeklySchedule,
  modalSubCourts,
  hasMultipleSubCourts,
  modalSubCourtTab,
  setModalSubCourtTab,
  selectedScheduleDay,
  setSelectedScheduleDay,
  copyFeedback,
  newSlotInput,
  setNewSlotInput,
  getModalDaySlots,
  handleAddSlotToDay,
  handleRemoveSlotFromDay,
  handleCopyDayScheduleToWeekdays,
  handleCopyScheduleToOtherSubCourts,
}) => {
  const activeDaySlots = getModalDaySlots(selectedScheduleDay);

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 pb-3">
        <div className="min-w-0">
          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            Thiết Lập Lịch Tuần (Weekly Schedule Settings)
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {hasMultipleSubCourts
              ? `Cơ sở có ${modalSubCourts.length} sân con. Chọn sân con và thứ trong tuần để cấu hình khung ca riêng biệt.`
              : 'Chọn thứ trong tuần và thêm/xóa các khung ca tập trong ngày đó'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Copy Day Schedule to Weekdays */}
          <button
            type="button"
            onClick={() => handleCopyDayScheduleToWeekdays(selectedScheduleDay)}
            className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-slate-200 hover:text-white font-bold text-[10px] cursor-pointer transition-colors duration-150 inline-flex items-center gap-1.5"
            title={`Sao chép các ca của ${DAYS_OF_WEEK.find((d) => d.key === selectedScheduleDay)?.labelVi} sang Thứ 2 -> Thứ 6`}
          >
            <Copy className="w-3 h-3 text-slate-400" />
            <span>
              Sao chép sang T2 - T6
              {hasMultipleSubCourts && modalSubCourtTab !== '__ALL__'
                ? ` (${modalSubCourtTab})`
                : ''}
            </span>
          </button>

          {/* Copy full weekly schedule to other sub-court */}
          {hasMultipleSubCourts && modalSubCourtTab !== '__ALL__' && (
            <button
              type="button"
              onClick={() =>
                handleCopyScheduleToOtherSubCourts(modalSubCourtTab)
              }
              className="px-3 py-1.5 rounded-full bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/35 text-orange-300 font-bold text-[10px] cursor-pointer transition-colors duration-150 inline-flex items-center gap-1.5"
              title={`Sao chép toàn bộ lịch tuần của ${modalSubCourtTab} sang ${modalSubCourts
                .filter((sc) => sc !== modalSubCourtTab)
                .join(', ')}`}
            >
              <Copy className="w-3 h-3 text-orange-400" />
              <span>
                Sao chép lịch sang{' '}
                {modalSubCourts.filter((sc) => sc !== modalSubCourtTab)
                  .length === 1
                  ? modalSubCourts.filter((sc) => sc !== modalSubCourtTab)[0]
                  : 'sân còn lại'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Inline Copy Feedback */}
      {copyFeedback && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-emerald-500/12 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
          <span>{copyFeedback}</span>
        </div>
      )}

      {/* 1. Conditional Sub-court Tabs if hasMultipleSubCourts */}
      {hasMultipleSubCourts && (
        <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/10 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              Chọn Sân Con Để Cấu Hình:
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {modalSubCourts.length} sân con độc lập
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {modalSubCourts.map((sc) => {
              const isTabActive = modalSubCourtTab === sc;
              const totalSlots = DAYS_OF_WEEK.reduce(
                (acc, d) =>
                  acc + getSlotsForSubCourt(weeklySchedule, d.key, sc).length,
                0
              );
              return (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setModalSubCourtTab(sc)}
                  className={`h-8 px-3.5 rounded-full text-xs font-bold border transition-colors duration-150 inline-flex items-center gap-2 cursor-pointer ${
                    isTabActive
                      ? 'bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] text-white border-orange-400/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_6px_16px_rgba(249,115,22,0.28)]'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border-white/12'
                  }`}
                >
                  <span>{sc}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono tabular-nums ${
                      isTabActive
                        ? 'bg-black/25 text-white'
                        : 'bg-white/[0.06] text-slate-300'
                    }`}
                  >
                    {totalSlots} ca
                  </span>
                </button>
              );
            })}

            {/* Tab: Áp dụng tất cả */}
            <button
              type="button"
              onClick={() => setModalSubCourtTab('__ALL__')}
              className={`h-8 px-3.5 rounded-full text-xs font-bold border transition-colors duration-150 inline-flex items-center gap-1.5 cursor-pointer ${
                modalSubCourtTab === '__ALL__'
                  ? 'bg-indigo-500/25 border-indigo-400/55 text-indigo-100 shadow-[0_0_16px_rgba(99,102,241,0.25)]'
                  : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border-white/12'
              }`}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Áp dụng tất cả</span>
            </button>
          </div>

          {modalSubCourtTab === '__ALL__' ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-indigo-500/12 border border-indigo-400/30 text-indigo-200 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
              <span>
                Chế độ áp dụng chung: Thao tác thêm hoặc xóa ca sẽ đồng thời áp dụng cho tất cả các sân ({modalSubCourts.join(', ')}).
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>
                Đang xem và sửa khung giờ của:{' '}
                <strong className="text-orange-400">{modalSubCourtTab}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Day Tabs (Monday -> Sunday) */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
        {DAYS_OF_WEEK.map((day) => {
          const isSelected = selectedScheduleDay === day.key;
          const daySlots = getModalDaySlots(day.key);
          const slotCount = daySlots.length;
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => setSelectedScheduleDay(day.key)}
              className={`px-2 py-2 rounded-2xl border text-center transition-colors duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-orange-500/20 border-orange-500/60 text-orange-200 font-black shadow-[0_0_14px_rgba(249,115,22,0.22)]'
                  : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07] hover:text-white font-semibold'
              }`}
            >
              <div className="text-[11px]">{day.shortVi}</div>
              <div className="text-[9px] text-slate-400 mt-0.5 tabular-nums">
                {slotCount} ca
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Day Slots List + Add Slot */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-200">
            Danh sách ca hoạt động:{' '}
            <span className="text-orange-400">
              {DAYS_OF_WEEK.find((d) => d.key === selectedScheduleDay)?.labelVi}
            </span>
            {hasMultipleSubCourts && (
              <span className="text-slate-400 font-normal ml-1">
                (
                {modalSubCourtTab === '__ALL__'
                  ? 'Tất cả sân con'
                  : modalSubCourtTab}
                )
              </span>
            )}
          </span>
          <span className="text-[11px] text-slate-400 tabular-nums">
            {activeDaySlots.length} khung giờ
          </span>
        </div>

        {activeDaySlots.length === 0 ? (
          <div className="py-5 px-3 text-center border border-dashed border-white/15 bg-white/[0.02] rounded-2xl text-slate-400 text-xs">
            Chưa có khung ca nào cho ngày này
            {hasMultipleSubCourts && modalSubCourtTab !== '__ALL__'
              ? ` của ${modalSubCourtTab}`
              : ''}
            . Nhập khung giờ bên dưới và bấm "+ Thêm ca".
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activeDaySlots.map((slot, slotIdx) => (
              <div
                key={`${slot}-${slotIdx}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/12 text-white font-mono tabular-nums text-xs font-bold"
              >
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>{slot}</span>
                <button
                  type="button"
                  onClick={() =>
                    handleRemoveSlotFromDay(selectedScheduleDay, slotIdx, slot)
                  }
                  className="w-4 h-4 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 flex items-center justify-center transition-colors duration-150 cursor-pointer"
                  title="Xóa ca này"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Slot Input */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <input
            type="text"
            value={newSlotInput}
            onChange={(e) => setNewSlotInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSlotToDay();
              }
            }}
            placeholder="VD: 18:00 - 20:00 hoặc 07:30 - 09:30"
            className="dva-glass-input flex-1 min-w-0 px-3.5 py-2 font-mono tabular-nums text-xs"
          />
          <button
            type="button"
            onClick={handleAddSlotToDay}
            className="h-9 px-4 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors duration-150 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> + Thêm ca
          </button>
        </div>

        {/* Quick Preset Slots */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] text-slate-400 font-semibold mr-1">
            Gợi ý nhanh:
          </span>
          {PRESET_SLOTS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setNewSlotInput(preset)}
              className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-[10px] text-slate-300 hover:text-white font-mono tabular-nums cursor-pointer transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
