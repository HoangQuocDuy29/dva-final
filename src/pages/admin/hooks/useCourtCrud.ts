import React, { useMemo, useState } from 'react';
import { Court, DayOfWeekKey } from '../../../types';
import { courtService } from '../../../services/api';
import {
  getDefaultWeeklyScheduleForCourt,
  normalizeCourtWeeklySchedule,
  parseSlotLabel,
} from '../../../shared/schedule';
import {
  resolveModalSubCourts,
  getDaySlotsForSchedule,
  addSlotToSchedule,
  removeSlotFromSchedule,
  copyDayToWeekdaysInSchedule,
  copySubCourtScheduleToOthers,
  mergeCourtWeeklyScheduleOnSave,
} from '../utils/scheduleEditor';
import { useAdminDashboard } from '../context/AdminDashboardContext';

export function useCourtCrud() {
  const {
    setFeedback,
    setData: { setCourtsList },
    courtSelection: { selectedManageCourtId, setSelectedManageCourtId },
  } = useAdminDashboard();

  const [isCourtModalOpen, setIsCourtModalOpen] = useState<boolean>(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [selectedScheduleDay, setSelectedScheduleDay] =
    useState<DayOfWeekKey>('monday');
  const [modalSubCourtTab, setModalSubCourtTab] = useState<string>('Sân A');
  const [subCourtsInput, setSubCourtsInput] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [newSlotInput, setNewSlotInput] = useState<string>('18:00 - 20:00');
  const [isUploadingCourtImage, setIsUploadingCourtImage] =
    useState<boolean>(false);
  const [togglingCourtId, setTogglingCourtId] = useState<string | null>(null);
  const [courtForm, setCourtForm] = useState<Partial<Court>>({
    name: '',
    code: '',
    shortName: '',
    address: 'DVA Sports Center, Hà Nội',
    description:
      'Sân bóng chuyền tiêu chuẩn FIVB trang bị thảm Taraflex Pro chống chấn thương.',
    floorType: 'Gerflor Taraflex Sport Pro',
    hourlyRate: 500000,
    minHours: 1.5,
    imageUrl: '/courts/btl.png',
    status: 'ACTIVE',
    isMaintenance: false,
    isAvailable: true,
    isActive: true,
    subCourts: [],
    weeklySchedule: getDefaultWeeklyScheduleForCourt(),
  });

  const modalSubCourts: string[] = useMemo(
    () =>
      resolveModalSubCourts(
        courtForm.subCourts,
        courtForm.id || editingCourt?.id,
        courtForm.code || editingCourt?.code
      ),
    [courtForm.subCourts, courtForm.id, courtForm.code, editingCourt]
  );

  const hasMultipleSubCourts = modalSubCourts.length > 1;

  const handleOpenAddCourtModal = () => {
    setEditingCourt(null);
    setSelectedScheduleDay('monday');
    setNewSlotInput('17:30 - 19:30');
    setSubCourtsInput('');
    setCopyFeedback(null);
    setCourtForm({
      name: '',
      code: '',
      shortName: '',
      address: 'DVA Sports Center, Hà Nội',
      description:
        'Sân bóng chuyền tiêu chuẩn thi đấu FIVB trang bị thảm Taraflex Pro chống chấn thương và hệ thống chiếu sáng tiêu chuẩn.',
      floorType: 'Gerflor Taraflex Sport Pro',
      hourlyRate: 500000,
      minHours: 1.5,
      imageUrl: '/courts/btl.png',
      isAvailable: true,
      isActive: true,
      subCourts: [],
      weeklySchedule: getDefaultWeeklyScheduleForCourt(),
    });
    setModalSubCourtTab('');
    setIsCourtModalOpen(true);
  };

  const handleOpenEditCourtModal = (court: Court) => {
    setEditingCourt(court);
    setSelectedScheduleDay('monday');
    setNewSlotInput('18:00 - 20:00');
    setCopyFeedback(null);
    const courtSubCourts = resolveModalSubCourts(
      court.subCourts,
      court.id,
      court.code
    );
    setSubCourtsInput(courtSubCourts.join(', '));

    const normalizedSchedule = normalizeCourtWeeklySchedule(
      court.weeklySchedule,
      court.id,
      courtSubCourts
    );

    setCourtForm({
      ...court,
      subCourts: courtSubCourts,
      address: court.address || 'DVA Sports Center, Hà Nội',
      hourlyRate: Number(court.hourlyRate) || 500000,
      weeklySchedule: normalizedSchedule,
    });
    setModalSubCourtTab(courtSubCourts.length > 1 ? courtSubCourts[0] : '');
    setIsCourtModalOpen(true);
  };

  const handleSubCourtsInputChange = (val: string) => {
    setSubCourtsInput(val);
    const updatedSubCourts = val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const reNormalized = normalizeCourtWeeklySchedule(
      courtForm.weeklySchedule,
      editingCourt?.id,
      updatedSubCourts
    );
    setCourtForm((prev) => ({
      ...prev,
      subCourts: updatedSubCourts,
      weeklySchedule: reNormalized,
    }));
    if (updatedSubCourts.length > 1) {
      if (
        !updatedSubCourts.includes(modalSubCourtTab) &&
        modalSubCourtTab !== '__ALL__'
      ) {
        setModalSubCourtTab(updatedSubCourts[0]);
      }
    } else {
      setModalSubCourtTab('');
    }
  };

  const handleSaveCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courtForm.name?.trim()) return;
    try {
      const resolvedSubs =
        modalSubCourts.length > 0 ? modalSubCourts : undefined;
      const finalSchedule = mergeCourtWeeklyScheduleOnSave({
        formSchedule: courtForm.weeklySchedule,
        existingSchedule: editingCourt?.weeklySchedule,
        courtId: editingCourt?.id,
        modalSubCourts,
      });

      const payload: Partial<Court> = {
        ...courtForm,
        name: courtForm.name.trim(),
        address: (courtForm.address || 'DVA Sports Center, Hà Nội').trim(),
        hourlyRate: Math.round(Number(courtForm.hourlyRate) || 500000),
        subCourts: resolvedSubs,
        weeklySchedule: finalSchedule,
      };

      if (editingCourt) {
        const updated = await courtService.updateCourt(
          editingCourt.id,
          payload
        );
        const nextSubs = payload.subCourts || [];
        setCourtsList((prev) =>
          prev.map((c) =>
            c.id === editingCourt.id
              ? {
                  ...c,
                  ...payload,
                  ...updated,
                  subCourts: nextSubs,
                  weeklySchedule: normalizeCourtWeeklySchedule(
                    updated.weeklySchedule ?? payload.weeklySchedule,
                    c.id,
                    nextSubs
                  ),
                }
              : c
          )
        );
        setFeedback(
          `Đã cập nhật sân "${payload.name}" và lịch hoạt động hàng tuần!`
        );
      } else {
        const created = await courtService.createCourt(payload);
        const nextSubs = payload.subCourts || [];
        const normalizedCreated: Court = {
          ...created,
          subCourts: nextSubs,
          weeklySchedule: normalizeCourtWeeklySchedule(
            created.weeklySchedule ?? payload.weeklySchedule,
            created.id,
            nextSubs
          ),
        };
        setCourtsList((prev) => [...prev, normalizedCreated]);
        setSelectedManageCourtId(normalizedCreated.id);
        setFeedback(
          `Đã tạo sân mới "${normalizedCreated.name}" kèm lịch tuần thành công!`
        );
      }
      setIsCourtModalOpen(false);
      setEditingCourt(null);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi lưu thông tin sân');
    }
  };

  const handleDeleteCourt = async (court: Court) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa sân "${court.name}"? (Nếu sân đã có đơn đặt chỗ, hệ thống sẽ chuyển sang trạng thái ngừng hoạt động isActive = false)`
      )
    ) {
      return;
    }
    try {
      const res = await courtService.deleteCourt(court.id);
      setCourtsList((prev) => {
        const remaining = prev.filter((c) => c.id !== court.id);
        if (selectedManageCourtId === court.id && remaining.length > 0) {
          setSelectedManageCourtId(remaining[0].id);
        }
        return remaining;
      });
      setFeedback(
        res.softDeleted
          ? `Đã ẩn sân "${court.name}" (Soft Delete: isActive = false do có lịch sử đặt sân).`
          : `Đã xóa sân "${court.name}" thành công.`
      );
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi xóa sân');
    }
  };

  const handleToggleCourtMaintenance = async (court: Court) => {
    const currentlyMaintenance = Boolean(
      court.isMaintenance === true ||
        court.status === 'MAINTENANCE' ||
        court.isAvailable === false
    );
    const nextMaint = !currentlyMaintenance;
    setTogglingCourtId(court.id);
    try {
      const updated = await courtService.toggleMaintenance(court.id, nextMaint);
      setCourtsList((prev) =>
        prev.map((c) =>
          c.id === court.id
            ? {
                ...c,
                ...updated,
                status: nextMaint ? 'MAINTENANCE' : 'ACTIVE',
                isMaintenance: nextMaint,
                isAvailable: !nextMaint,
                weeklySchedule: normalizeCourtWeeklySchedule(
                  updated.weeklySchedule ?? c.weeklySchedule,
                  c.id,
                  c.subCourts
                ),
              }
            : c
        )
      );
      setFeedback(
        nextMaint
          ? `🛠️ Đã chuyển sân "${court.name}" sang chế độ Bảo trì / Tạm ngưng cho thuê.`
          : `✅ Đã kích hoạt lại sân "${court.name}". Sân hiện đã sẵn sàng nhận khách đặt online!`
      );
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi cập nhật trạng thái bảo trì sân');
    } finally {
      setTogglingCourtId(null);
    }
  };

  const getModalDaySlots = (dayKey: DayOfWeekKey): string[] =>
    getDaySlotsForSchedule(
      courtForm.weeklySchedule,
      dayKey,
      modalSubCourts,
      modalSubCourtTab
    );

  const handleAddSlotToDay = () => {
    const clean = newSlotInput.trim();
    if (!clean) return;
    if (!parseSlotLabel(clean)) {
      alert(
        'Vui lòng nhập đúng định dạng khung giờ "HH:mm - HH:mm" (Ví dụ: 17:30 - 19:30 hoặc 18:00 - 20:00).'
      );
      return;
    }
    const { nextSchedule, duplicateError } = addSlotToSchedule({
      weeklySchedule: courtForm.weeklySchedule,
      courtId: editingCourt?.id,
      modalSubCourts,
      modalSubCourtTab,
      dayKey: selectedScheduleDay,
      slotLabel: clean,
    });
    if (duplicateError) {
      alert(duplicateError);
      return;
    }
    setCourtForm({ ...courtForm, weeklySchedule: nextSchedule });
    setNewSlotInput('');
  };

  const handleRemoveSlotFromDay = (
    dayKey: DayOfWeekKey,
    index: number,
    slotValue?: string
  ) => {
    const nextSchedule = removeSlotFromSchedule({
      weeklySchedule: courtForm.weeklySchedule,
      courtId: editingCourt?.id,
      modalSubCourts,
      modalSubCourtTab,
      dayKey,
      index,
      slotValue,
    });
    setCourtForm({ ...courtForm, weeklySchedule: nextSchedule });
  };

  const handleCopyDayScheduleToWeekdays = (sourceDay: DayOfWeekKey) => {
    const { nextSchedule, feedbackMessage } = copyDayToWeekdaysInSchedule({
      weeklySchedule: courtForm.weeklySchedule,
      courtId: editingCourt?.id,
      modalSubCourts,
      modalSubCourtTab,
      sourceDay,
    });
    setCourtForm({ ...courtForm, weeklySchedule: nextSchedule });
    setCopyFeedback(feedbackMessage);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const handleCopyScheduleToOtherSubCourts = (sourceSubCourt: string) => {
    const res = copySubCourtScheduleToOthers({
      weeklySchedule: courtForm.weeklySchedule,
      courtId: editingCourt?.id,
      modalSubCourts,
      sourceSubCourt,
    });
    if (!res) return;
    setCourtForm({ ...courtForm, weeklySchedule: res.nextSchedule });
    setCopyFeedback(res.feedbackMessage);
    setTimeout(() => setCopyFeedback(null), 3500);
  };

  return {
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
  };
}
