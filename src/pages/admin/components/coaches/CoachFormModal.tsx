import React from 'react';
import { X, Award, Loader2, Upload } from 'lucide-react';
import { CoachProfile } from '../../../../types';
import { uploadToCloudinary, buildCloudinaryFolder } from '../../../../utils/cloudinary';

export interface CoachFormModalProps {
  isOpen: boolean;
  editingCoach: CoachProfile | null;
  coachForm: Partial<CoachProfile>;
  setCoachForm: React.Dispatch<React.SetStateAction<Partial<CoachProfile>>>;
  isUploadingCoachPhoto: boolean;
  setIsUploadingCoachPhoto: React.Dispatch<React.SetStateAction<boolean>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  notify: (message: string, durationMs?: number) => void;
}

export const CoachFormModal: React.FC<CoachFormModalProps> = ({
  isOpen,
  editingCoach,
  coachForm,
  setCoachForm,
  isUploadingCoachPhoto,
  setIsUploadingCoachPhoto,
  onClose,
  onSubmit,
  notify,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-[95%] sm:w-full max-w-lg md:max-w-2xl bg-[#161F30] rounded-2xl sm:rounded-3xl border border-slate-700 p-4 sm:p-6 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-heading font-black text-lg text-white">
              {editingCoach ? `Chỉnh Sửa HLV: ${editingCoach.name}` : 'Thêm Huấn Luyện Viên Mới'}
            </h3>
            <p className="text-xs text-slate-400">
              Cập nhật hồ sơ HLV, kinh nghiệm và chứng chỉ huấn luyện.
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
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Họ và tên HLV *</label>
            <input
              type="text"
              required
              value={coachForm.name || ''}
              onChange={(e) => setCoachForm({ ...coachForm, name: e.target.value })}
              placeholder="VD: Hoàng Quốc Duy"
              className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Chuyên môn / Vai trò *</label>
              <input
                type="text"
                required
                value={coachForm.role || ''}
                onChange={(e) => setCoachForm({ ...coachForm, role: e.target.value })}
                placeholder="VD: Head Coach & Chuyên Gia Tấn Công"
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Kinh nghiệm</label>
              <input
                type="text"
                value={coachForm.experience || '5 năm kinh nghiệm'}
                onChange={(e) => setCoachForm({ ...coachForm, experience: e.target.value })}
                placeholder="VD: 5 năm kinh nghiệm thi đấu chuyên nghiệp"
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Chiều cao (cm)</label>
              <input
                type="text"
                value={coachForm.height || ''}
                onChange={(e) => setCoachForm({ ...coachForm, height: e.target.value })}
                placeholder="VD: 168 cm"
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Năm sinh</label>
              <input
                type="number"
                value={coachForm.bornYear ?? ''}
                onChange={(e) => {
                  const year = e.target.value === '' ? undefined : Number(e.target.value);
                  setCoachForm({
                    ...coachForm,
                    bornYear: year,
                    ...(year && year >= 1930 && year <= 2030 ? { age: new Date().getFullYear() - year } : {}),
                  });
                }}
                placeholder="VD: 2010"
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Tuổi</label>
              <input
                type="number"
                value={coachForm.age ?? ''}
                onChange={(e) => setCoachForm({ ...coachForm, age: e.target.value === '' ? undefined : Number(e.target.value) })}
                placeholder="Tự tính từ năm sinh"
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Sở trường kỹ thuật (Specialty)</label>
            <input
              type="text"
              value={coachForm.specialty || ''}
              onChange={(e) => setCoachForm({ ...coachForm, specialty: e.target.value })}
              placeholder="VD: Youth Skill Development, Setting Fundamentals & Bilingual Coaching"
              className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
            />
          </div>

          {/* PHOTO UPLOAD / URL */}
          <div className="bg-[#0B0F19] p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-200 font-bold block">
                Ảnh Chân Dung HLV (Tải lên hoặc dán link Cloud)
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                Folder: {buildCloudinaryFolder('coaches', 'coaching-staff')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-[#161F30] border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                {coachForm.avatarUrl ? (
                  <img
                    src={coachForm.avatarUrl}
                    alt="Coach preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Award className="w-6 h-6 text-orange-400" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  isUploadingCoachPhoto
                    ? 'bg-slate-700 text-slate-300 border-slate-600 cursor-wait'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 cursor-pointer'
                }`}>
                  {isUploadingCoachPhoto ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                      <span>Đang tải lên Cloud...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-orange-400" />
                      <span>Tải ảnh HLV lên Cloudinary</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingCoachPhoto}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploadingCoachPhoto(true);
                      try {
                        const res = await uploadToCloudinary(file, 'coaches', 'coaching-staff');
                        setCoachForm((prev) => ({ ...prev, avatarUrl: res.url }));
                        notify(`Đã tải ảnh HLV lên thư mục Cloud: ${res.folder}`, 3500);
                      } catch (err) {
                        console.error('Coach upload error:', err);
                      } finally {
                        setIsUploadingCoachPhoto(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
                <input
                  type="url"
                  placeholder="Dán link ảnh (Cloudinary / Unsplash)..."
                  value={coachForm.avatarUrl || ''}
                  onChange={(e) => setCoachForm({ ...coachForm, avatarUrl: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#161F30] border border-slate-700 rounded-xl text-white outline-none text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Chứng chỉ (cách nhau bởi dấu phẩy)</label>
            <input
              type="text"
              value={Array.isArray(coachForm.certifications) ? coachForm.certifications.join(', ') : ''}
              onChange={(e) => setCoachForm({
                ...coachForm,
                certifications: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              })}
              placeholder="VD: FIVB Level 1 Certified, Cựu VĐV Quốc Gia, HLV Thể Lực Chuyên Nghiệp"
              className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Tiểu sử & Thành tích</label>
            <textarea
              rows={3}
              value={coachForm.bio || ''}
              onChange={(e) => setCoachForm({ ...coachForm, bio: e.target.value })}
              placeholder="Giới thiệu kinh nghiệm thi đấu và phong cách huấn luyện..."
              className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
            />
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
              {editingCoach ? 'Lưu Thay Đổi' : 'Thêm Huấn Luyện Viên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
