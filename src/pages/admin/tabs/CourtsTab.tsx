import React from 'react';
import { Plus } from 'lucide-react';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { useCourtCrud } from '../hooks/useCourtCrud';
import { CourtCard } from '../components/courts/CourtCard';
import { SlotLockPanel } from '../components/courts/SlotLockPanel';
import { CourtFormModal } from '../components/courts/CourtFormModal';

export const CourtsTab: React.FC = () => {
  const {
    data: { courtsList },
  } = useAdminDashboard();

  const {
    isCourtModalOpen,
    setIsCourtModalOpen,
    editingCourt,
    setEditingCourt,
    courtForm,
    setCourtForm,
    selectedScheduleDay,
    setSelectedScheduleDay,
    modalSubCourtTab,
    setModalSubCourtTab,
    subCourtsInput,
    copyFeedback,
    newSlotInput,
    setNewSlotInput,
    isUploadingCourtImage,
    setIsUploadingCourtImage,
    togglingCourtId,
    modalSubCourts,
    hasMultipleSubCourts,
    handleOpenAddCourtModal,
    handleOpenEditCourtModal,
    handleSubCourtsInputChange,
    handleSaveCourt,
    handleDeleteCourt,
    handleToggleCourtMaintenance,
    getModalDaySlots,
    handleAddSlotToDay,
    handleRemoveSlotFromDay,
    handleCopyDayScheduleToWeekdays,
    handleCopyScheduleToOtherSubCourts,
  } = useCourtCrud();

  return (
    <div className="space-y-6">
      {/* 1. COURTS LIST CRUD & WEEKLY SCHEDULE OVERVIEW */}
      <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-heading font-black text-lg text-white">
              Quản Lý Hệ Thống Sân & Khung Giờ Hàng Tuần (Courts & Weekly Schedule CRUD)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Thêm sân mới, cập nhật địa chỉ, giá thuê/giờ và tùy chỉnh khung giờ hoạt động theo từng thứ trong tuần (Thứ 2 → Chủ Nhật).
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddCourtModal}
            className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Sân Mới</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courtsList.map((court) => (
            <CourtCard
              key={court.id}
              court={court}
              togglingCourtId={togglingCourtId}
              onToggleMaintenance={handleToggleCourtMaintenance}
              onEdit={handleOpenEditCourtModal}
              onDelete={handleDeleteCourt}
            />
          ))}
        </div>
      </div>

      {/* 2. LIVE COURT SCHEDULE & SLOT LOCK MANAGEMENT */}
      <SlotLockPanel />

      {/* COURT CREATE / EDIT & WEEKLY SCHEDULE MODAL */}
      <CourtFormModal
        isOpen={isCourtModalOpen}
        editingCourt={editingCourt}
        courtForm={courtForm}
        setCourtForm={setCourtForm}
        subCourtsInput={subCourtsInput}
        handleSubCourtsInputChange={handleSubCourtsInputChange}
        isUploadingCourtImage={isUploadingCourtImage}
        setIsUploadingCourtImage={setIsUploadingCourtImage}
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
        handleCopyScheduleToOtherSubCourts={handleCopyScheduleToOtherSubCourts}
        onSave={handleSaveCourt}
        onClose={() => {
          setIsCourtModalOpen(false);
          setEditingCourt(null);
        }}
      />
    </div>
  );
};
