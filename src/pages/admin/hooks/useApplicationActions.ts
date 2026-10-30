import { useCallback } from 'react';
import { memberService, playerService } from '../../../services/api';
import { useAdminDashboard } from '../context/AdminDashboardContext';

export function useApplicationActions() {
  const {
    setData: { setApplications, setPlayers },
    notify,
  } = useAdminDashboard();

  const handleUpdateApplicationStatus = useCallback(
    async (appId: string, status: 'APPROVED' | 'REJECTED') => {
      try {
        await memberService.updateStatus(appId, status);
        setApplications((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, status } : a))
        );

        if (status === 'APPROVED') {
          notify(
            'Application approved! Athlete has been automatically promoted into the official Player Roster.',
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
    (appId: string) => handleUpdateApplicationStatus(appId, 'APPROVED'),
    [handleUpdateApplicationStatus]
  );

  const handleRejectApplication = useCallback(
    (appId: string) => handleUpdateApplicationStatus(appId, 'REJECTED'),
    [handleUpdateApplicationStatus]
  );

  const handleDeleteApplication = useCallback(
    async (id: string, name: string) => {
      if (!window.confirm(`Xóa hồ sơ tuyển thành viên của ứng viên ${name}?`)) return;
      try {
        await memberService.deleteApplication(id);
        setApplications((prev) => prev.filter((a) => a.id !== id));
        notify(`Đã xóa hồ sơ của ứng viên ${name}.`, 3000);
      } catch (err) {
        alert('Lỗi xóa hồ sơ');
      }
    },
    [setApplications, notify]
  );

  return {
    handleUpdateApplicationStatus,
    handleApproveApplication,
    handleRejectApplication,
    handleDeleteApplication,
  };
}
