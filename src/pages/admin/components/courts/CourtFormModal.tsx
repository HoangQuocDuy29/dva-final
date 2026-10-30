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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="w-[95%] sm:w-full max-w-2xl md:max-w-3xl bg-[#0F1623] border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-black text-white">
              {editingCourt
                ? 'Chỉnh Sửa Sân & Lịch Hoạt Động Tuần'
                : 'Thêm Sân Mới & Lịch Hoạt Động Tuần'}
            </h3>
            <p className="text-xs text-slate-400">
              Cấu hình thông tin cơ sở vật chất, giá thuê và khung ca hoạt động từ Thứ 2 đến Chủ Nhật
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
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
                className="w-full px-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
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
                className="w-full px-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
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
                className="w-full px-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Loại Mặt Sân / Mô Tả Ngắn
              </label>
              <input
                type="text"
                value={courtForm.floorType || ''}
                onChange={(e) =>
                  setCourtForm({ ...courtForm, floorType: e.target.value })
                }
                placeholder="VD: Gerflor Taraflex Sport Pro"
                className="w-full px-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Danh Sách Sân Con (Sub-Courts)
            </label>
            <input
              type="text"
              value={subCourtsInput}
              onChange={(e) => handleSubCourtsInputChange(e.target.value)}
              placeholder="VD: Sân A, Sân B (để trống nếu cơ sở chỉ có 1 sân đơn)"
              className="w-full px-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 font-mono text-xs"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Cơ sở có từ 2 sân con trở lên (VD: BTL Thông Tin) sẽ tự động mở tab thiết lập lịch riêng biệt cho từng sân. Để trống hoặc 1 sân sẽ áp dụng giao diện đơn giản thông thường.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <label className="block text-slate-300 font-semibold">
                  Ảnh Đại Diện Sân
                </label>
                <span className="text-[10px] font-mono text-slate-500">
                  Folder:{' '}
                  {buildCloudinaryFolder(
                    'courts',
                    editingCourt?.id || courtForm.name || 'facilities'
                  )}
                </span>
              </div>
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-400 font-bold text-[11px] cursor-pointer transition-all">
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
                  className="w-16 h-12 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-900"
                />
              )}
              <input
                type="text"
                value={courtForm.imageUrl || ''}
                onChange={(e) =>
                  setCourtForm({ ...courtForm, imageUrl: e.target.value })
                }
                placeholder="Dán link ảnh hoặc bấm 'Tải ảnh từ máy'..."
                className="w-full px-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500"
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

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 rounded-xl text-white font-bold cursor-pointer hover:brightness-110 shadow-lg"
            >
              {editingCourt ? 'Lưu Cập Nhật Sân' : 'Tạo Sân Mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
