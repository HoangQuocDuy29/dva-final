import { useCallback } from 'react';
import { memberService, playerService } from '../../../services/api';
import { useAdminDashboard } from '../context/AdminDashboardContext';

export function useApplicationActions() {
  const {
    setData: { setApplications, setPlayers },
    notify,
  } = useAdminDashboard();

  const handleUpdateApplicationStatus = useCallback(
    async (appId: string, status: 'APPROVED' | 'REJECTED', entryFee?: number) => {
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
            'Application approved! Athlete promoted to Player Roster & Tryout fee recorded.',
            4000
          );
          playerService.getPlayers().then(setPlayers);
        } else {
          notify('Application rejected.', 4000);
        }
      } catch (e) {
        alert('Error updating application status');
      }
    },
    [setApplications, setPlayers, notify]
  );

  const handleApproveApplication = useCallback(
    (appId: string, entryFee?: number) =>
      handleUpdateApplicationStatus(appId, 'APPROVED', entryFee),
    [handleUpdateApplicationStatus]
  );

  const handleRejectApplication = useCallback(
    (appId: string) => handleUpdateApplicationStatus(appId, 'REJECTED'),
    [handleUpdateApplicationStatus]
  );

  const handleUpdateEntryFee = useCallback(
    async (appId: string, entryFee: number) => {
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
      } catch (err) {
        alert('Error updating tryout entry fee');
      }
    },
    [setApplications, notify]
  );

  const handleDeleteApplication = useCallback(
    async (id: string, name: string, isApproved: boolean = false, entryFee: number = 100000) => {
      const confirmMsg = isApproved
        ? `⚠️ WARNING — HISTORICAL REVENUE PROTECTION:\n\n"${name}" is an APPROVED tryout athlete (${entryFee.toLocaleString('vi-VN')} đ).\nDeleting this record will permanently deduct ${entryFee.toLocaleString('vi-VN')} đ from Dashboard Tryout Cashflow analytics.\n\nAre you sure you want to permanently delete this application?`
        : `Delete tryout application of ${name}?`;
      if (!window.confirm(confirmMsg)) return;
      try {
        await memberService.deleteApplication(id);
        setApplications((prev) => prev.filter((a) => a.id !== id));
        notify(`Deleted application of ${name}.`, 3000);
      } catch (err) {
        alert('Error deleting application');
      }
    },
    [setApplications, notify]
  );

  return {
    handleUpdateApplicationStatus,
    handleApproveApplication,
    handleRejectApplication,
    handleUpdateEntryFee,
    handleDeleteApplication,
  };
}
