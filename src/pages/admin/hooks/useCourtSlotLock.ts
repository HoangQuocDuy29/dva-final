import { useState } from 'react';
import { bookingService, courtService } from '../../../services/api';
import { useAdminDashboard } from '../context/AdminDashboardContext';

export function useCourtSlotLock() {
  const {
    currentUser,
    setFeedback,
    data: { courtsList },
    setData: { setBookings, setClosedSlots },
    courtSelection: {
      selectedManageCourtId,
      adminSelectedSubCourt,
      selectedManageDate,
    },
  } = useAdminDashboard();

  const [lockReason, setLockReason] = useState<string>(
    'Rented to Offline Team / Club Match'
  );
  const [isTogglingSlot, setIsTogglingSlot] = useState<boolean>(false);

  const handleToggleSlotLock = async (slotLabel: string) => {
    setIsTogglingSlot(true);
    const targetCourt = courtsList.find((c) => c.id === selectedManageCourtId);
    const hasSubs =
      (targetCourt?.subCourts && targetCourt.subCourts.length > 0) ||
      selectedManageCourtId === 'court-btl' ||
      targetCourt?.code === 'BTL_TT';
    const effectiveSubCourt = hasSubs ? adminSelectedSubCourt : undefined;
    try {
      const res = await courtService.toggleClosedSlot({
        courtId: selectedManageCourtId,
        date: selectedManageDate,
        slotLabel,
        subCourt: effectiveSubCourt,
        reason: lockReason,
        closedBy: currentUser.fullName,
      });

      if (res.action === 'CLOSED') {
        setClosedSlots((prev) => [...prev, res.slot]);
        setFeedback(
          `Slot "${slotLabel}" ${effectiveSubCourt ? `(${effectiveSubCourt}) ` : ''}đã được KHÓA BẢO TRÌ.`
        );
      } else {
        setClosedSlots((prev) =>
          prev.filter(
            (cs) =>
              !(
                cs.courtId === selectedManageCourtId &&
                cs.date === selectedManageDate &&
                cs.slotLabel === slotLabel &&
                (cs.subCourt || '') === (effectiveSubCourt || '')
              )
          )
        );
        setFeedback(
          `Slot "${slotLabel}" ${effectiveSubCourt ? `(${effectiveSubCourt}) ` : ''}đã được MỞ LẠI cho khách đặt.`
        );
      }
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setFeedback('Lỗi khi cập nhật trạng thái khung giờ.');
    } finally {
      setIsTogglingSlot(false);
    }
  };

  const handleReleaseBookingSlot = async (
    bookingId: string,
    slotLabel: string,
    bookingSubCourt?: string
  ) => {
    setIsTogglingSlot(true);
    const targetCourt = courtsList.find((c) => c.id === selectedManageCourtId);
    const hasSubs =
      (targetCourt?.subCourts && targetCourt.subCourts.length > 0) ||
      selectedManageCourtId === 'court-btl' ||
      targetCourt?.code === 'BTL_TT';
    const effectiveSubCourt =
      bookingSubCourt || (hasSubs ? adminSelectedSubCourt : undefined);
    try {
      await bookingService.updateStatus(bookingId, 'CANCELLED');
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, paymentStatus: 'CANCELLED' } : b
        )
      );
      setClosedSlots((prev) =>
        prev.filter(
          (cs) =>
            !(
              cs.courtId === selectedManageCourtId &&
              cs.date === selectedManageDate &&
              cs.slotLabel === slotLabel &&
              (!effectiveSubCourt || (cs.subCourt || '') === effectiveSubCourt)
            )
        )
      );
      setFeedback(
        `Đã hủy đặt chỗ ca "${slotLabel}" ${effectiveSubCourt ? `(${effectiveSubCourt}) ` : ''}và mở lại thành công! Khung giờ hiện đã sẵn sàng cho khách đặt online.`
      );
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setFeedback('Lỗi khi mở lại ca đặt.');
    } finally {
      setIsTogglingSlot(false);
    }
  };

  return {
    lockReason,
    setLockReason,
    isTogglingSlot,
    handleToggleSlotLock,
    handleReleaseBookingSlot,
  };
}
