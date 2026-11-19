import { useCallback } from 'react';
import { ApplicationStatus, MemberApplication, PlayerLevel, TryoutPaymentStatus } from '../../../types';
import { memberService, playerService } from '../../../services/api';
import { useAdminDashboard } from '../context/AdminDashboardContext';

export function useApplicationActions() {
  const {
    isSuperAdmin,
    setData: { setApplications, setPlayers },
    notify,
  } = useAdminDashboard();

  const handleUpdateApplicationStatus = useCallback(
    async (appId: string, status: ApplicationStatus, entryFee?: number) => {
      if (!isSuperAdmin && (status === 'APPROVED' || status === 'REJECTED')) return;
      try {
        const res = await memberService.updateStatus(appId, status, undefined, entryFee);
        setApplications((prev) =>
          prev.map((a) =>
            a.id === appId
              ? {
                  ...a,
                  ...res.application,
                  status,
                }
              : a
          )
        );

        if (status === 'APPROVED') {
          notify(
            'Đã duyệt chính thức (APPROVED) & thêm VĐV vào Roster. Mở "Chấm điểm" để chỉnh Level & gửi mail nhóm Zalo/IG.',
            4500
          );
          if (isSuperAdmin) {
            playerService.getPlayers({ adminMode: true }).then(setPlayers);
          }
        } else if (status === 'REJECTED') {
          notify('Application rejected.', 4000);
        } else {
          notify(`Application status updated to ${status}.`, 3500);
        }
      } catch (err: any) {
        alert(err?.message || 'Error updating application status');
      }
    },
    [isSuperAdmin, setApplications, setPlayers, notify]
  );

  const handleApproveApplication = useCallback(
    (appId: string, entryFee?: number) => {
      if (!isSuperAdmin) return Promise.resolve();
      return handleUpdateApplicationStatus(appId, 'APPROVED', entryFee);
    },
    [isSuperAdmin, handleUpdateApplicationStatus]
  );

  const handleRejectApplication = useCallback(
    (appId: string) => {
      if (!isSuperAdmin) return Promise.resolve();
      return handleUpdateApplicationStatus(appId, 'REJECTED');
    },
    [isSuperAdmin, handleUpdateApplicationStatus]
  );

  const handleUpdateApplicationLevel = useCallback(
    async (app: MemberApplication, nextLevel: PlayerLevel): Promise<MemberApplication | null> => {
      if (!isSuperAdmin) return null;
      const currentLevel = String(app.level || 'JUNIOR').trim().toUpperCase();
      if (currentLevel === nextLevel) return null;

      const updated = await memberService.updateTryout(app.id, { level: nextLevel });
      setApplications((prev) =>
        prev.map((a) =>
          a.id === app.id
            ? { ...a, ...updated, level: updated.level || nextLevel }
            : a
        )
      );
      notify(`Đã cập nhật cấp độ ${app.fullName} → ${nextLevel}.`, 3500);
      return updated;
    },
    [isSuperAdmin, setApplications, notify]
  );

  /**
   * SUPERADMIN only (Completely decoupled from approval status & always unlocked):
   * - Updates paymentStatus ONLY (PENDING <-> PAID / FREE) and entryFee.
   * - Never sets status = 'APPROVED' and never auto-promotes to Player Roster.
   */
  const handleChangePaymentStatus = useCallback(
    async (app: MemberApplication, targetStatus: TryoutPaymentStatus) => {
      if (!isSuperAdmin) return;
      if (app.paymentStatus === targetStatus) return;

      if (
        targetStatus === 'PENDING' &&
        !window.confirm(
          `Chuyển trạng thái thanh toán của ${app.fullName} về lại PENDING?\n(Trạng thái duyệt hồ sơ hiện tại là ${app.status} vẫn được giữ nguyên.)`
        )
      ) {
        return;
      }

      try {
        const updated = await memberService.updatePaymentStatus(app.id, targetStatus);
        setApplications((prev) =>
          prev.map((a) => (a.id === app.id ? { ...a, ...updated } : a))
        );
        notify(
          targetStatus === 'PAID'
            ? `Đã chuyển phí Try-Out của ${app.fullName} → PAID (trạng thái duyệt giữ nguyên: ${app.status}).`
            : targetStatus === 'FREE'
              ? `Đã miễn phí (FREE) cho ${app.fullName} (trạng thái duyệt giữ nguyên: ${app.status}).`
              : `Đã chuyển thanh toán của ${app.fullName} → PENDING.`,
          4000
        );
      } catch (err: any) {
        alert(err?.message || 'Error updating try-out payment status');
      }
    },
    [isSuperAdmin, setApplications, notify]
  );

  const handleApplicationUpdated = useCallback(
    (updatedApp: MemberApplication, message: string, refreshPlayers = false) => {
      setApplications((prev) =>
        prev.map((a) => (a.id === updatedApp.id ? { ...a, ...updatedApp } : a))
      );
      if (refreshPlayers && isSuperAdmin) {
        playerService.getPlayers({ adminMode: true }).then(setPlayers);
      }
      notify(message, 4500);
    },
    [isSuperAdmin, setApplications, setPlayers, notify]
  );

  const handleUpdateEntryFee = useCallback(
    async (appId: string, entryFee: number) => {
      if (!isSuperAdmin) return;
      try {
        const updated = await memberService.updateEntryFee(appId, entryFee);
        setApplications((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, ...updated } : a))
        );
        notify(
          entryFee === 0
            ? 'Tryout fee waived (0 đ) for this athlete.'
            : `Tryout fee updated to ${entryFee.toLocaleString('vi-VN')} đ.`,
          3000
        );
      } catch (err: any) {
        alert(err?.message || 'Error updating tryout entry fee');
      }
    },
    [isSuperAdmin, setApplications, notify]
  );

  const handleDeleteApplication = useCallback(
    async (id: string, name: string, isApproved: boolean = false, entryFee: number = 100000) => {
      if (!isSuperAdmin) return;
      const confirmMsg = isApproved
        ? `⚠️ WARNING — HISTORICAL REVENUE PROTECTION:\n\n"${name}" is an APPROVED tryout athlete (${entryFee.toLocaleString('vi-VN')} đ).\nDeleting this record will permanently deduct ${entryFee.toLocaleString('vi-VN')} đ from Dashboard Tryout Cashflow analytics.\n\nAre you sure you want to permanently delete this application?`
        : `Delete tryout application of ${name}?`;
      if (!window.confirm(confirmMsg)) return;
      try {
        await memberService.deleteApplication(id);
        setApplications((prev) => prev.filter((a) => a.id !== id));
        notify(`Deleted application of ${name}.`, 3000);
      } catch (err: any) {
        alert(err?.message || 'Error deleting application');
      }
    },
    [isSuperAdmin, setApplications, notify]
  );

  return {
    handleUpdateApplicationStatus,
    handleApproveApplication,
    handleRejectApplication,
    handleUpdateApplicationLevel,
    handleChangePaymentStatus,
    handleApplicationUpdated,
    handleUpdateEntryFee,
    handleDeleteApplication,
  };
}
