import React, { useState } from 'react';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { TrainingCourse } from '../../../types';
import { trainingService } from '../../../services/api';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { createDefaultCourseForm } from '../constants';
import { CourseFormModal } from '../components/training/CourseFormModal';

export const TrainingTab: React.FC = () => {
  const {
    data: { trainingRegs, coursesList },
    setData: { setTrainingRegs, setCoursesList },
    notify,
  } = useAdminDashboard();

  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TrainingCourse | null>(null);
  const [courseForm, setCourseForm] = useState<Partial<TrainingCourse>>(createDefaultCourseForm);

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Partial<TrainingCourse> = {
        ...courseForm,
        tag: courseForm.tag?.trim() || '',
        targetAudience: courseForm.targetAudience?.trim() || '',
        benefits: (courseForm.benefits || []).map((b) => b.trim()).filter(Boolean),
      };
      if (editingCourse) {
        const updated = await trainingService.updateCourse(editingCourse.id, payload);
        setCoursesList((prev) =>
          prev.map((c) => (c.id === editingCourse.id ? { ...c, ...updated } : c))
        );
        notify(`Đã cập nhật khóa học "${courseForm.title}"!`, 3000);
      } else {
        const created = await trainingService.createCourse(payload);
        setCoursesList((prev) => [created, ...prev]);
        notify(`Đã tạo khóa học mới "${courseForm.title}"!`, 3000);
      }
      setIsCourseModalOpen(false);
      setEditingCourse(null);
    } catch (err) {
      alert('Lỗi lưu khóa học');
    }
  };

  const handleDeleteCourse = async (id: string, title: string) => {
    if (!window.confirm(`Xóa khóa đào tạo "${title}"?`)) return;
    try {
      await trainingService.deleteCourse(id);
      setCoursesList((prev) => prev.filter((c) => c.id !== id));
      notify(`Đã xóa khóa đào tạo "${title}".`, 3000);
    } catch (err) {
      alert('Lỗi xóa khóa học');
    }
  };

  const handleUpdateTrainingStatus = async (
    id: string,
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  ) => {
    try {
      await trainingService.updateStatus(id, status);
      setTrainingRegs((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      notify(`Trạng thái học viên đã chuyển thành ${status}.`, 3000);
    } catch (e) {
      alert('Lỗi cập nhật học viên');
    }
  };

  const handleDeleteRegistration = async (id: string, name: string) => {
    if (!window.confirm(`Xóa đăng ký học của học viên ${name}?`)) return;
    try {
      await trainingService.deleteRegistration(id);
      setTrainingRegs((prev) => prev.filter((r) => r.id !== id));
      notify(`Đã xóa lượt đăng ký của học viên ${name}.`, 3000);
    } catch (err) {
      alert('Lỗi xóa lượt đăng ký');
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Trainees List */}
        <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-white">
                Academy & Scrimmage Trainee Registrations
              </h3>
              <p className="text-xs text-slate-400">
                Danh sách học viên đăng ký ghép team thi đấu hoặc kèm riêng 1-on-1 với HLV.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[700px] text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#0E1524] text-slate-400 font-bold border-b border-slate-800">
                  <th className="py-3 px-3">Trainee / Contact</th>
                  <th className="py-3 px-3">Enrolled Program</th>
                  <th className="py-3 px-3">Skill Level</th>
                  <th className="py-3 px-3">Time Slot & Notes</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {trainingRegs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      Chưa có lượt đăng ký khóa học nào.
                    </td>
                  </tr>
                ) : (
                  trainingRegs.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3">
                        <span className="font-bold text-white block">{reg.fullName}</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {reg.phone} · {reg.email}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-amber-400">{reg.courseTitle}</td>
                      <td className="py-3 px-3">{reg.experienceLevel}</td>
                      <td className="py-3 px-3 text-[11px] text-slate-400">
                        <div>Slot: {reg.preferredTimeSlot}</div>
                        {reg.notes && (
                          <div className="italic text-slate-300 line-clamp-1">"{reg.notes}"</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            reg.status === 'CONFIRMED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {reg.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {reg.status === 'PENDING' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateTrainingStatus(reg.id, 'CONFIRMED')}
                                className="min-h-[40px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateTrainingStatus(reg.id, 'CANCELLED')}
                                className="min-h-[40px] px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-xl transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Finalized</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteRegistration(reg.id, reg.fullName)}
                            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-red-300 rounded-xl bg-slate-800/80 hover:bg-red-950/80 cursor-pointer ml-1 transition-colors"
                            title="Xóa lượt đăng ký"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Courses Management CRUD Section */}
        <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-white">
                Quản lý Gói Tập & Giao Lưu (Training & Scrimmage)
              </h3>
              <p className="text-xs text-slate-400">
                Thêm, sửa học phí, lịch học hoặc xóa các chương trình đào tạo hiển thị trên trang Training & Scrimmage.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingCourse(null);
                setCourseForm(createDefaultCourseForm());
                setIsCourseModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Khóa Học Mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coursesList.map((course) => (
              <div
                key={course.id}
                className="p-5 rounded-2xl border border-slate-800 bg-[#0E1524] flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                      {course.level}
                    </span>
                    <span className="font-mono text-orange-400 font-bold text-xs">
                      {course.price.toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  <h4 className="font-heading font-black text-base text-white">{course.title}</h4>

                  <p className="text-xs text-slate-400 line-clamp-2">{course.description}</p>

                  <div className="pt-2 text-[11px] text-slate-400 space-y-1">
                    <div>
                      📅 <strong>Lịch:</strong> {course.schedule}
                    </div>
                    <div>
                      ⏱ <strong>Thời lượng:</strong> {course.duration} ({course.enrolledSlots}/
                      {course.maxSlots} học viên)
                    </div>
                    <div>
                      🏆 <strong>HLV:</strong> {course.coachName} ({course.coachTitle})
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCourse(course);
                      setCourseForm(course);
                      setIsCourseModalOpen(true);
                    }}
                    className="min-h-[40px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-orange-400" />
                    <span>Sửa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCourse(course.id, course.title)}
                    className="min-h-[40px] px-3.5 py-2 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CourseFormModal
        isOpen={isCourseModalOpen}
        editingCourse={editingCourse}
        courseForm={courseForm}
        setCourseForm={setCourseForm}
        onClose={() => {
          setIsCourseModalOpen(false);
          setEditingCourse(null);
        }}
        onSubmit={handleSaveCourse}
      />
    </>
  );
};
