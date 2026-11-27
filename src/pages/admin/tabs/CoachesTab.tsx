import React, { useState } from 'react';
import { Plus, Award, Edit3, Trash2 } from 'lucide-react';
import { CoachProfile } from '../../../types';
import { coachService } from '../../../services/api';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { createDefaultCoachForm } from '../constants';
import { CoachFormModal } from '../components/coaches/CoachFormModal';

export const CoachesTab: React.FC = () => {
  const {
    data: { coachesList },
    setData: { setCoachesList },
    notify,
  } = useAdminDashboard();

  const [isCoachModalOpen, setIsCoachModalOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<CoachProfile | null>(null);
  const [isUploadingCoachPhoto, setIsUploadingCoachPhoto] = useState(false);
  const [coachForm, setCoachForm] = useState<Partial<CoachProfile>>(createDefaultCoachForm);

  const handleSaveCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCoach) {
        const updated = await coachService.updateCoach(editingCoach.id, coachForm);
        setCoachesList((prev) =>
          prev.map((c) => (c.id === editingCoach.id ? { ...c, ...updated } : c))
        );
        notify(`Đã cập nhật HLV ${coachForm.name}!`, 3000);
      } else {
        const created = await coachService.addCoach(coachForm);
        setCoachesList((prev) => [created, ...prev]);
        notify(`Đã thêm HLV mới ${coachForm.name}!`, 3000);
      }
      setIsCoachModalOpen(false);
      setEditingCoach(null);
    } catch (err) {
      alert('Lỗi lưu huấn luyện viên');
    }
  };

  const handleDeleteCoach = async (id: string, name: string) => {
    if (!window.confirm(`Xóa HLV ${name} khỏi ban huấn luyện?`)) return;
    try {
      await coachService.deleteCoach(id);
      setCoachesList((prev) => prev.filter((c) => c.id !== id));
      notify(`Đã xóa HLV ${name}.`, 3000);
    } catch (err) {
      alert('Lỗi xóa HLV');
    }
  };

  return (
    <>
      <div className="dva-glass-panel rounded-3xl p-4 sm:p-6 space-y-5 dva-content-reveal">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="min-w-0">
            <h3 className="font-bold text-base text-white">
              Ban Huấn Luyện & Chuyên Gia (Coaching Staff CRUD)
            </h3>
            <p className="text-xs text-slate-400">
              Quản lý đội ngũ HLV, chuyên gia thể lực và chứng chỉ hiển thị cho học viên đặt lịch đào tạo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingCoach(null);
              setCoachForm({
                name: '',
                role: 'Chuyên Gia Tấn Công Biên',
                experience: '5 năm kinh nghiệm',
                height: '',
                bornYear: undefined,
                age: undefined,
                specialty: '',
                bio: '',
                avatarUrl: '/coaches/duy.png',
                certifications: ['FIVB Level 1 Certified', 'Cựu VĐV Quốc Gia'],
              });
              setIsCoachModalOpen(true);
            }}
            className="h-9 px-4 bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] hover:brightness-110 text-white font-bold text-xs rounded-full inline-flex items-center justify-center gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(249,115,22,0.3)] cursor-pointer shrink-0 transition-colors duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Huấn Luyện Viên</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coachesList.map((coach) => (
            <div
              key={coach.id}
              className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.055] hover:border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-col justify-between space-y-4 transition-colors duration-150"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/12 overflow-hidden flex items-center justify-center shrink-0">
                    {coach.avatarUrl ? (
                      <img
                        src={coach.avatarUrl}
                        alt={coach.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Award className="w-6 h-6 text-orange-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-heading font-black text-base text-white truncate">{coach.name}</h4>
                    <span className="text-xs text-orange-400 font-semibold block truncate">
                      {coach.role}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {coach.experience}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{coach.bio}</p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {coach.certifications.map((cert, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.04] text-slate-300 border border-white/10"
                    >
                      ✓ {cert}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCoach(coach);
                    setCoachForm(coach);
                    setIsCoachModalOpen(true);
                  }}
                  className="h-9 px-4 bg-white/[0.05] hover:bg-white/[0.1] border border-white/12 text-white text-xs font-semibold rounded-full inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
                >
                  <Edit3 className="w-3.5 h-3.5 text-orange-400" />
                  <span>Sửa</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCoach(coach.id, coach.name)}
                  className="h-9 px-4 bg-white/[0.05] hover:bg-rose-500/15 border border-white/12 hover:border-rose-500/35 text-slate-300 hover:text-rose-300 text-xs font-semibold rounded-full inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CoachFormModal
        isOpen={isCoachModalOpen}
        editingCoach={editingCoach}
        coachForm={coachForm}
        setCoachForm={setCoachForm}
        isUploadingCoachPhoto={isUploadingCoachPhoto}
        setIsUploadingCoachPhoto={setIsUploadingCoachPhoto}
        onClose={() => {
          setIsCoachModalOpen(false);
          setEditingCoach(null);
        }}
        onSubmit={handleSaveCoach}
        notify={notify}
      />
    </>
  );
};
