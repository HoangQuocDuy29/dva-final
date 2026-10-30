import React from 'react';
import { X } from 'lucide-react';
import { TrainingCourse } from '../../../../types';

export interface CourseFormModalProps {
  isOpen: boolean;
  editingCourse: TrainingCourse | null;
  courseForm: Partial<TrainingCourse>;
  setCourseForm: React.Dispatch<React.SetStateAction<Partial<TrainingCourse>>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const CourseFormModal: React.FC<CourseFormModalProps> = ({
  isOpen,
  editingCourse,
  courseForm,
  setCourseForm,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-[95%] sm:w-full max-w-lg md:max-w-2xl bg-[#161F30] rounded-2xl sm:rounded-3xl border border-slate-700 p-4 sm:p-6 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-heading font-black text-lg text-white">
              {editingCourse ? `Chỉnh Sửa Khóa Học: ${editingCourse.title}` : 'Thêm Khóa Học Mới'}
            </h3>
            <p className="text-xs text-slate-400">
              Cập nhật chương trình đào tạo, học phí, lịch tập hiển thị trên trang Training & Scrimmage.
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

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Nhãn nổi bật (Badge)</label>
              <input
                type="text"
                value={courseForm.tag || ''}
                onChange={(e) => setCourseForm({ ...courseForm, tag: e.target.value })}
                placeholder="VD: MOST POPULAR, POPULAR CHOICE..."
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Đối tượng học viên (Target Audience)</label>
              <input
                type="text"
                value={courseForm.targetAudience || ''}
                onChange={(e) => setCourseForm({ ...courseForm, targetAudience: e.target.value })}
                placeholder="VD: Dành cho người mới tập, VĐV phong trào..."
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Tên khóa học / Chương trình *</label>
            <input
              type="text"
              required
              value={courseForm.title || ''}
              onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
              placeholder="VD: Masterclass Tấn Công Biên 4 & Đối Chuyền"
              className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Phân Cấp Độ *</label>
              <select
                value={courseForm.level || 'JUNIOR'}
                onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-semibold"
              >
                <option value="SENIOR">SENIOR (Nâng cao & Chiến thuật)</option>
                <option value="JUNIOR">JUNIOR (Trung cấp & Kỹ năng nền tảng)</option>
                <option value="YOUTH">Youth</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Học phí (VNĐ) *</label>
              <input
                type="number"
                required
                step="100000"
                value={courseForm.price || 2400000}
                onChange={(e) => setCourseForm({ ...courseForm, price: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono text-orange-400 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Đơn vị tính học phí (Billing Unit)</label>
            <input
              type="text"
              list="course-billing-units"
              value={courseForm.priceUnit || ''}
              onChange={(e) => setCourseForm({ ...courseForm, priceUnit: e.target.value })}
              placeholder="VD: / buổi, / tháng, / năm, / session, / year (để trống = tự nhận diện)"
              className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
            />
            <datalist id="course-billing-units">
              <option value="/ buổi" />
              <option value="/ tháng" />
              <option value="/ năm" />
              <option value="/ session" />
              <option value="/ year" />
              <option value="/ player / session" />
            </datalist>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Thời lượng/Quy cách (Duration Detail)</label>
              <input
                type="text"
                value={courseForm.duration || '8 tuần (16 buổi)'}
                onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                placeholder="VD: 120 phút, 2.5 tiếng, 12 tháng..."
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Số lượng tối đa nhận (Max Slots)</label>
              <input
                type="number"
                min={1}
                value={courseForm.maxSlots || 16}
                onChange={(e) => setCourseForm({ ...courseForm, maxSlots: Number(e.target.value) })}
                placeholder="VD: 6, 12, 24..."
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Đã đăng ký</label>
              <input
                type="number"
                value={courseForm.enrolledSlots || 0}
                onChange={(e) => setCourseForm({ ...courseForm, enrolledSlots: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Lịch học chi tiết *</label>
            <input
              type="text"
              required
              value={courseForm.schedule || ''}
              onChange={(e) => setCourseForm({ ...courseForm, schedule: e.target.value })}
              placeholder="VD: Thứ 3 & Thứ 5 hàng tuần (18:00 - 20:00)"
              className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Huấn luyện viên phụ trách</label>
              <input
                type="text"
                value={courseForm.coachName || ''}
                onChange={(e) => setCourseForm({ ...courseForm, coachName: e.target.value })}
                placeholder="VD: Hoàng Quốc Duy"
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Chức danh HLV</label>
              <input
                type="text"
                value={courseForm.coachTitle || ''}
                onChange={(e) => setCourseForm({ ...courseForm, coachTitle: e.target.value })}
                placeholder="VD: Head Coach & Founder"
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Mô tả tổng quan khóa học</label>
            <textarea
              rows={3}
              value={courseForm.description || ''}
              onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
              placeholder="Tóm tắt nội dung khóa học và mục tiêu đạt được sau 8 tuần..."
              className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Đặc quyền / Quyền lợi gói tập (Package Inclusions)</label>
            <textarea
              rows={5}
              value={(courseForm.benefits || []).join('\n')}
              onChange={(e) => setCourseForm({ ...courseForm, benefits: e.target.value.split('\n') })}
              placeholder={'Mỗi quyền lợi một dòng, VD:\nÁo đấu DVA chính hãng\nPhân tích video kỹ thuật'}
              className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">Mỗi dòng là một mục có tick xanh ngoài trang Public.</p>
          </div>

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
              {editingCourse ? 'Lưu Thay Đổi' : 'Tạo Khóa Học'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
