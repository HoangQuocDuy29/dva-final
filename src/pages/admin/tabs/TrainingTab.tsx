import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Eye, EyeOff } from 'lucide-react';
import { TrainingCourse } from '../../../types';
import { trainingService } from '../../../services/api';
import { Pagination } from '../../../components/common/Pagination';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { createDefaultCourseForm } from '../constants';
import { CourseFormModal } from '../components/training/CourseFormModal';

const REGS_PAGE_SIZE = 10;
const COURSES_PAGE_SIZE = 6;

export const TrainingTab: React.FC = () => {
  const {
    data: { trainingRegs, coursesList },
    setData: { setTrainingRegs, setCoursesList },
    notify,
  } = useAdminDashboard();

  const [courseStatusFilter, setCourseStatusFilter] = useState<'ALL' | 'ACTIVE' | 'HIDDEN'>('ALL');
  const [regsPage, setRegsPage] = useState<number>(1);
  const [coursesPage, setCoursesPage] = useState<number>(1);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TrainingCourse | null>(null);
  const [courseForm, setCourseForm] = useState<Partial<TrainingCourse>>(createDefaultCourseForm);

  const handleToggleCourseVisibility = async (course: TrainingCourse) => {
    const nextState = course.isActive === false;
    try {
      setCoursesList((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, isActive: nextState } : c))
      );
      await trainingService.toggleVisibility(course.id, nextState);
      notify(
        `Gói tập "${course.title}" đã chuyển sang ${nextState ? 'Published (Active)' : 'Hidden'}.`,
        3000
      );
    } catch {
      setCoursesList((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, isActive: !nextState } : c))
      );
      notify('Lỗi cập nhật trạng thái khóa học', 3000);
    }
  };

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

  useEffect(() => {
    setCoursesPage(1);
  }, [courseStatusFilter]);

  const safeRegsPage = Math.min(
    Math.max(1, regsPage),
    Math.max(1, Math.ceil(trainingRegs.length / REGS_PAGE_SIZE))
  );
  const paginatedRegs = trainingRegs.slice(
    (safeRegsPage - 1) * REGS_PAGE_SIZE,
    safeRegsPage * REGS_PAGE_SIZE
  );

  const filteredCourses = coursesList.filter((course) => {
    if (courseStatusFilter === 'ACTIVE' && course.isActive === false) return false;
    if (courseStatusFilter === 'HIDDEN' && course.isActive !== false) return false;
    return true;
  });
  const safeCoursesPage = Math.min(
    Math.max(1, coursesPage),
    Math.max(1, Math.ceil(filteredCourses.length / COURSES_PAGE_SIZE))
  );
  const paginatedCourses = filteredCourses.slice(
    (safeCoursesPage - 1) * COURSES_PAGE_SIZE,
    safeCoursesPage * COURSES_PAGE_SIZE
  );

  return (
    <>
      <div className="space-y-6 dva-content-reveal">
        {/* Trainees List */}
        <div className="dva-glass-panel rounded-3xl p-4 sm:p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <div className="min-w-0">
              <h3 className="font-bold text-base text-white">
                Academy & Scrimmage Trainee Registrations
              </h3>
              <p className="text-xs text-slate-400">
                Danh sách học viên đăng ký ghép team thi đấu hoặc kèm riêng 1-on-1 với HLV.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 no-scrollbar">
            <table className="w-full min-w-[700px] text-xs text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.04] text-slate-300 font-bold border-b border-white/10">
                  <th className="py-3 px-3 rounded-tl-xl">Trainee / Contact</th>
                  <th className="py-3 px-3">Enrolled Program</th>
                  <th className="py-3 px-3">Skill Level</th>
                  <th className="py-3 px-3">Time Slot & Notes</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07] text-slate-300">
                {trainingRegs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      Chưa có lượt đăng ký khóa học nào.
                    </td>
                  </tr>
                ) : (
                  paginatedRegs.map((reg) => (
                    <tr key={reg.id} className="hover:bg-white/[0.035] transition-colors duration-150">
                      <td className="py-3 px-3">
                        <span className="font-bold text-white block">{reg.fullName}</span>
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                          {reg.phone} · {reg.email}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-amber-300">{reg.courseTitle}</td>
                      <td className="py-3 px-3">{reg.experienceLevel}</td>
                      <td className="py-3 px-3 text-[11px] text-slate-400">
                        <div>Slot: {reg.preferredTimeSlot}</div>
                        {reg.notes && (
                          <div className="italic text-slate-300 line-clamp-1">"{reg.notes}"</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center ${
                            reg.status === 'CONFIRMED'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                              : reg.status === 'CANCELLED'
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/35'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/35'
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
                                className="h-8 px-3.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 font-bold text-[11px] rounded-full transition-colors duration-150 cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateTrainingStatus(reg.id, 'CANCELLED')}
                                className="h-8 px-3 bg-white/[0.05] hover:bg-white/[0.1] border border-white/12 text-slate-300 hover:text-white text-[11px] font-semibold rounded-full transition-colors duration-150 cursor-pointer"
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
                            className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-300 rounded-full bg-white/[0.05] hover:bg-rose-500/15 border border-white/12 hover:border-rose-500/35 cursor-pointer ml-1 transition-colors duration-150"
                            title="Xóa lượt đăng ký"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={safeRegsPage}
            totalItems={trainingRegs.length}
            pageSize={REGS_PAGE_SIZE}
            onPageChange={setRegsPage}
            itemLabel="registrations"
          />
        </div>

        {/* Courses Management CRUD Section */}
        <div className="dva-glass-panel rounded-3xl p-4 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="min-w-0">
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
              className="h-9 px-4 bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] hover:brightness-110 text-white font-bold text-xs rounded-full inline-flex items-center justify-center gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(249,115,22,0.3)] cursor-pointer shrink-0 transition-colors duration-150"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Khóa Học Mới</span>
            </button>
          </div>

          {/* QUICK STATUS FILTERS */}
          <div className="flex flex-wrap items-center gap-1 bg-white/[0.04] p-1 rounded-full border border-white/10 w-fit">
            <button
              type="button"
              onClick={() => setCourseStatusFilter('ALL')}
              className={`h-8 px-3 rounded-full text-xs font-bold transition-colors duration-150 cursor-pointer flex items-center gap-1.5 border ${
                courseStatusFilter === 'ALL'
                  ? 'bg-orange-500/20 border-orange-500/50 text-orange-200'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <span>All</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-black/30 font-mono tabular-nums">
                {coursesList.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCourseStatusFilter('ACTIVE')}
              className={`h-8 px-3 rounded-full text-xs font-bold transition-colors duration-150 cursor-pointer flex items-center gap-1.5 border ${
                courseStatusFilter === 'ACTIVE'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                  : 'border-transparent text-slate-400 hover:text-emerald-300 hover:bg-white/[0.05]'
              }`}
            >
              <span>Active</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-black/30 font-mono tabular-nums">
                {coursesList.filter((c) => c.isActive !== false).length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCourseStatusFilter('HIDDEN')}
              className={`h-8 px-3 rounded-full text-xs font-bold transition-colors duration-150 cursor-pointer flex items-center gap-1.5 border ${
                courseStatusFilter === 'HIDDEN'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                  : 'border-transparent text-slate-400 hover:text-amber-300 hover:bg-white/[0.05]'
              }`}
            >
              <span>Hidden</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-black/30 font-mono tabular-nums">
                {coursesList.filter((c) => c.isActive === false).length}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedCourses.map((course) => (
              <div
                key={course.id}
                className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.055] hover:border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-col justify-between space-y-4 transition-colors duration-150"
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35">
                        {course.level}
                      </span>
                      {course.isActive === false ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-300 border border-amber-500/35 inline-flex items-center gap-1">
                          <EyeOff className="w-2.5 h-2.5" />
                          Hidden
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 inline-flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5" />
                          Published
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-orange-400 font-bold text-xs tabular-nums">
                      {course.price.toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  <h4 className="font-heading font-black text-base text-white">{course.title}</h4>

                  <p className="text-xs text-slate-400 line-clamp-2">{course.description}</p>

                  <div className="pt-1 text-[11px] text-slate-400 space-y-1">
                    <div>
                      📅 <strong className="text-slate-200">Lịch:</strong> {course.schedule}
                    </div>
                    <div className="tabular-nums">
                      ⏱ <strong className="text-slate-200">Thời lượng:</strong> {course.duration} ({course.enrolledSlots}/
                      {course.maxSlots} học viên)
                    </div>
                    <div>
                      🏆 <strong className="text-slate-200">HLV:</strong> {course.coachName} ({course.coachTitle})
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleCourseVisibility(course)}
                    className={`h-8 px-3.5 text-xs font-semibold rounded-full inline-flex items-center gap-1.5 cursor-pointer border transition-colors duration-150 ${
                      course.isActive === false
                        ? 'bg-amber-500/12 text-amber-300 hover:bg-amber-500/20 border-amber-500/35'
                        : 'bg-emerald-500/12 text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/35'
                    }`}
                    title={course.isActive === false ? 'Publish program to public catalog' : 'Hide program from public catalog'}
                  >
                    {course.isActive === false ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hidden</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Published</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCourse(course);
                      setCourseForm(course);
                      setIsCourseModalOpen(true);
                    }}
                    className="h-8 px-3.5 bg-white/[0.05] hover:bg-white/[0.12] border border-white/12 text-white text-xs font-semibold rounded-full inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-orange-400" />
                    <span>Sửa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCourse(course.id, course.title)}
                    className="h-8 px-3.5 bg-white/[0.05] hover:bg-rose-500/15 border border-white/12 hover:border-rose-500/35 text-slate-300 hover:text-rose-300 text-xs font-semibold rounded-full inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            currentPage={safeCoursesPage}
            totalItems={filteredCourses.length}
            pageSize={COURSES_PAGE_SIZE}
            onPageChange={setCoursesPage}
            itemLabel="courses"
          />
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
