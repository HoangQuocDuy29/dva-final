import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User as UserType, StoreSubView } from '../../../types';
import { authService } from '../../../services/api';
import { AdminDashboardContextValue, AdminTabId } from '../types';
import { VALID_TABS, createInitialManageDate } from '../constants';
import { useFeedback } from '../hooks/useFeedback';
import { useAdminData } from '../hooks/useAdminData';

const SIDEBAR_STORAGE_KEY = 'dva_admin_sidebar_collapsed';
const VALID_STORE_VIEWS: readonly StoreSubView[] = ['PRODUCTS', 'ORDERS', 'CATEGORIES'] as const;

const AdminDashboardContext = createContext<AdminDashboardContextValue | undefined>(undefined);

interface AdminDashboardProviderProps {
  currentUser: UserType;
  onOpenSheets: () => void;
  onUserChange?: (user: UserType) => void;
  children: React.ReactNode;
}

export const AdminDashboardProvider: React.FC<AdminDashboardProviderProps> = ({
  currentUser,
  onOpenSheets,
  onUserChange,
  children,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    const guestUser = authService.logout();
    try {
      document.cookie.split(';').forEach((cookie) => {
        const eqPos = cookie.indexOf('=');
        const name = (eqPos > -1 ? cookie.slice(0, eqPos) : cookie).trim();
        if (name) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
    } catch {
      // Ignore cookie access errors
    }
    if (onUserChange) {
      onUserChange(guestUser);
    }
    window.dispatchEvent(new Event('dva:session-expired'));
    navigate('/', { replace: true });
  }, [navigate, onUserChange]);

  const currentTabParam = (searchParams.get('tab') || 'OVERVIEW').toUpperCase();
  const currentViewParam = (searchParams.get('view') || 'PRODUCTS').toUpperCase();
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN';

  const activeModule: AdminTabId =
    VALID_TABS.includes(currentTabParam as any) && (currentTabParam !== 'USERS' || isSuperAdmin)
      ? (currentTabParam as AdminTabId)
      : 'OVERVIEW';

  const storeSubView: StoreSubView = VALID_STORE_VIEWS.includes(currentViewParam as StoreSubView)
    ? (currentViewParam as StoreSubView)
    : 'PRODUCTS';

  const setActiveModule = useCallback(
    (mod: AdminTabId | string, subView?: string) => {
      const nextParams: Record<string, string> = { tab: mod.toLowerCase() };
      if (subView) {
        nextParams.view = subView.toLowerCase();
      }
      setSearchParams(nextParams);
    },
    [setSearchParams]
  );

  const setStoreSubView = useCallback(
    (view: StoreSubView) => {
      setSearchParams({ tab: 'store', view: view.toLowerCase() });
    },
    [setSearchParams]
  );

  const { feedback, setFeedback, notify } = useFeedback();
  const { loading, fetchData, data, setData } = useAdminData(activeModule);

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

  // Sidebar UI state (Spec 005) — client-only, persisted to localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, isSidebarCollapsed ? '1' : '0');
    } catch {
      // Storage unavailable (private mode) — keep in-memory state only
    }
  }, [isSidebarCollapsed]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [activeModule]);

  const value: AdminDashboardContextValue = {
    currentUser,
    isAdmin,
    isSuperAdmin,
    onOpenSheets,
    handleLogout,
    activeModule,
    setActiveModule,
    storeSubView,
    setStoreSubView,
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
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileNavOpen,
    setIsMobileNavOpen,
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
