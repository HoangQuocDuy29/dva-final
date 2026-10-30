import React, { createContext, useContext, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User as UserType } from '../../../types';
import { AdminDashboardContextValue, AdminTabId } from '../types';
import { VALID_TABS, createInitialManageDate } from '../constants';
import { useFeedback } from '../hooks/useFeedback';
import { useAdminData } from '../hooks/useAdminData';

const AdminDashboardContext = createContext<AdminDashboardContextValue | undefined>(undefined);

interface AdminDashboardProviderProps {
  currentUser: UserType;
  onOpenSheets: () => void;
  children: React.ReactNode;
}

export const AdminDashboardProvider: React.FC<AdminDashboardProviderProps> = ({
  currentUser,
  onOpenSheets,
  children,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTabParam = (searchParams.get('tab') || 'OVERVIEW').toUpperCase();
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN';

  const activeModule: AdminTabId =
    VALID_TABS.includes(currentTabParam as any) && (currentTabParam !== 'USERS' || isSuperAdmin)
      ? (currentTabParam as AdminTabId)
      : 'OVERVIEW';

  const setActiveModule = useCallback(
    (mod: AdminTabId | string) => {
      setSearchParams({ tab: mod.toLowerCase() });
    },
    [setSearchParams]
  );

  const { feedback, setFeedback, notify } = useFeedback();
  const { loading, fetchData, data, setData } = useAdminData();

  // Court Schedule & Slot Lock Control state (shared across COURTS and BOOKINGS)
  const [selectedManageCourtId, setSelectedManageCourtId] = useState<string>('court-btl');
  const [adminSelectedSubCourt, setAdminSelectedSubCourt] = useState<string>('Sân A');
  const [selectedManageDate, setSelectedManageDate] = useState<string>(createInitialManageDate);

  // Shared Guest Session Email Modal visibility
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [guestModalError, setGuestModalError] = useState<string | null>(null);

  const openGuestModal = useCallback(() => {
    setGuestModalError(null);
    setIsGuestModalOpen(true);
  }, []);

  const closeGuestModal = useCallback(() => {
    setIsGuestModalOpen(false);
  }, []);

  const value: AdminDashboardContextValue = {
    currentUser,
    isAdmin,
    isSuperAdmin,
    onOpenSheets,
    activeModule,
    setActiveModule,
    feedback,
    setFeedback,
    notify,
    loading,
    fetchData,
    data,
    setData,
    courtSelection: {
      selectedManageCourtId,
      setSelectedManageCourtId,
      adminSelectedSubCourt,
      setAdminSelectedSubCourt,
      selectedManageDate,
      setSelectedManageDate,
    },
    isGuestModalOpen,
    setIsGuestModalOpen,
    guestModalError,
    setGuestModalError,
    openGuestModal,
    closeGuestModal,
  };

  return (
    <AdminDashboardContext.Provider value={value}>
      {children}
    </AdminDashboardContext.Provider>
  );
};

export function useAdminDashboard(): AdminDashboardContextValue {
  const ctx = useContext(AdminDashboardContext);
  if (!ctx) {
    throw new Error('useAdminDashboard must be used within an AdminDashboardProvider');
  }
  return ctx;
}
