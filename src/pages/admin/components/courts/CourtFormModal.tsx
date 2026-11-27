import React from 'react';
import { X, RefreshCw, Upload } from 'lucide-react';
import { Court, DayOfWeekKey } from '../../../../types';
import {
  uploadToCloudinary,
  buildCloudinaryFolder,
} from '../../../../utils/cloudinary';
import { useAdminDashboard } from '../../context/AdminDashboardContext';
import { WeeklyScheduleEditor } from './WeeklyScheduleEditor';

export interface CourtFormModalProps {
  isOpen: boolean;
  editingCourt: Court | null;
  courtForm: Partial<Court>;
  setCourtForm: React.Dispatch<React.SetStateAction<Partial<Court>>>;
  subCourtsInput: string;
  handleSubCourtsInputChange: (val: string) => void;
  isUploadingCourtImage: boolean;
  setIsUploadingCourtImage: React.Dispatch<React.SetStateAction<boolean>>;
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
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const CourtFormModal: React.FC<CourtFormModalProps> = ({
  isOpen,
  editingCourt,
  courtForm,
  setCourtForm,
  subCourtsInput,
  handleSubCourtsInputChange,
  isUploadingCourtImage,
  setIsUploadingCourtImage,
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
  onSave,
  onClose,
}) => {
  const { setFeedback } = useAdminDashboard();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="dva-glass-modal w-full max-w-2xl md:max-w-3xl p-4 sm:p-6 space-y-5 max-h-[90dvh] overflow-y-auto no-scrollbar shadow-[0_24px_64px_rgba(0,0,0,0.8)]">
        <div className="flex items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="min-w-0">
            <h3 className="text-lg font-heading font-black text-white">
              {editingCourt
                ? 'Chỉnh Sửa Sân & Lịch Hoạt Động Tuần'
                : 'Thêm Sân Mới & Lịch Hoạt Động Tuần'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cấu hình thông tin cơ sở vật chất, giá thuê và khung ca hoạt động từ Thứ 2 đến Chủ Nhật
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Tên Sân *
              </label>
              <input
                type="text"
                required
                value={courtForm.name}
                onChange={(e) =>
                  setCourtForm({ ...courtForm, name: e.target.value })
                }
                placeholder="VD: Sân Bóng Chuyền Bắc Từ Liêm"
                className="dva-glass-input w-full px-3.5 py-2.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Đơn Giá Thuê / Giờ (VNĐ) *
              </label>
              <input
                type="number"
                min="0"
                step="10000"
                required
                value={courtForm.hourlyRate}
                onChange={(e) =>
                  setCourtForm({
                    ...courtForm,
                    hourlyRate: Number(e.target.value),
                  })
                }
                placeholder="VD: 350000"
                className="dva-glass-input w-full px-3.5 py-2.5 text-xs font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Địa Chỉ Sân *
              </label>
              <input
                type="text"
                required
                value={courtForm.address}
                onChange={(e) =>
                  setCourtForm({ ...courtForm, address: e.target.value })
                }
                placeholder="VD: Quận Bắc Từ Liêm, Hà Nội"
                className="dva-glass-input w-full px-3.5 py-2.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Loại Mặt Sân / Mô Tả Ngắn
              </label>
              <input
                type="text"
                value={courtForm.floorType || ''}
                onChange={(e) =>
                  setCourtForm({ ...courtForm, floorType: e.target.value })
                }
                placeholder="VD: Gerflor Taraflex Sport Pro"
                className="dva-glass-input w-full px-3.5 py-2.5 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Danh Sách Sân Con (Sub-Courts)
            </label>
            <input
              type="text"
              value={subCourtsInput}
              onChange={(e) => handleSubCourtsInputChange(e.target.value)}
              placeholder="VD: Sân A, Sân B (để trống nếu cơ sở chỉ có 1 sân đơn)"
              className="dva-glass-input w-full px-3.5 py-2.5 font-mono text-xs"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Cơ sở có từ 2 sân con trở lên (VD: BTL Thông Tin) sẽ tự động mở tab thiết lập lịch riêng biệt cho từng sân. Để trống hoặc 1 sân sẽ áp dụng giao diện đơn giản thông thường.
            </p>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                <label className="block text-slate-300 font-semibold">
                  Ảnh Đại Diện Sân
                </label>
                <span className="text-[10px] font-mono text-slate-400 break-all">
                  Folder:{' '}
                  {buildCloudinaryFolder(
                    'courts',
                    editingCourt?.id || courtForm.name || 'facilities'
                  )}
                </span>
              </div>
              <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/35 text-orange-300 font-bold text-[11px] cursor-pointer transition-colors duration-150 shrink-0">
                {isUploadingCourtImage ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" /> Đang tải lên...
                  </>
                ) : (
                  <>
                    <Upload className="w-3 h-3" /> Tải ảnh từ máy
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={isUploadingCourtImage}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsUploadingCourtImage(true);
                    try {
                      const subFolder =
                        editingCourt?.id || courtForm.name || 'facilities';
                      const uploaded = await uploadToCloudinary(
                        file,
                        'courts',
                        subFolder
                      );
                      setCourtForm((prev) => ({
                        ...prev,
                        imageUrl: uploaded.url,
                      }));
                      setFeedback(
                        `Đã tải ảnh sân lên thư mục Cloud: ${uploaded.folder}`
                      );
                      setTimeout(() => setFeedback(null), 3500);
                    } catch (err: any) {
                      alert(err?.message || 'Upload ảnh sân thất bại.');
                    } finally {
                      setIsUploadingCourtImage(false);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
            <div className="flex items-center gap-3">
              {courtForm.imageUrl && (
                <img
                  src={courtForm.imageUrl}
                  alt="Court Preview"
                  className="w-16 h-12 rounded-2xl object-cover border border-white/15 shrink-0 bg-white/[0.04]"
                />
              )}
              <input
                type="text"
                value={courtForm.imageUrl || ''}
                onChange={(e) =>
                  setCourtForm({ ...courtForm, imageUrl: e.target.value })
                }
                placeholder="Dán link ảnh hoặc bấm 'Tải ảnh từ máy'..."
                className="dva-glass-input w-full min-w-0 px-3.5 py-2.5 text-xs"
              />
            </div>
          </div>

          {/* WEEKLY SCHEDULE SETTINGS */}
          <WeeklyScheduleEditor
            weeklySchedule={courtForm.weeklySchedule}
            modalSubCourts={modalSubCourts}
            hasMultipleSubCourts={hasMultipleSubCourts}
            modalSubCourtTab={modalSubCourtTab}
            setModalSubCourtTab={setModalSubCourtTab}
            selectedScheduleDay={selectedScheduleDay}
            setSelectedScheduleDay={setSelectedScheduleDay}
            copyFeedback={copyFeedback}
            newSlotInput={newSlotInput}
            setNewSlotInput={setNewSlotInput}
            getModalDaySlots={getModalDaySlots}
            handleAddSlotToDay={handleAddSlotToDay}
            handleRemoveSlotFromDay={handleRemoveSlotFromDay}
            handleCopyDayScheduleToWeekdays={handleCopyDayScheduleToWeekdays}
            handleCopyScheduleToOtherSubCourts={
              handleCopyScheduleToOtherSubCourts
            }
          />

          <div className="flex flex-wrap justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/12 text-slate-300 hover:text-white font-bold cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="h-9 px-5 rounded-full bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] text-white font-bold cursor-pointer hover:brightness-110 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(249,115,22,0.3)] transition-all"
            >
              {editingCourt ? 'Lưu Cập Nhật Sân' : 'Tạo Sân Mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
