import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  RefreshCw,
  ArrowLeft,
  Search,
  X,
  ChevronDown,
  LogOut,
  KeyRound,
  Camera,
  Loader2,
  UserCog,
} from 'lucide-react';
import { authService } from '../../../services/api';
import { uploadToCloudinary } from '../../../utils/cloudinary';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { useAdminMetrics } from '../hooks/useAdminMetrics';
import { findNavItem, USER_ROLE_BADGE } from '../constants';
import { AdminQuickSearch } from './AdminQuickSearch';
import { RoleAvatarRing } from '../components/RoleAvatarRing';
import { StaffProfileModal } from '../components/StaffProfileModal';
import { AdminTabId } from '../types';
import { StoreSubView } from '../../../types';

interface SubPill {
  id: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

function getVietnamGreeting(): string {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }).format(new Date())) % 24;
  return hour >= 5 && hour < 12 ? '☀️ Chào buổi sáng' : hour >= 12 && hour < 18 ? '🌤️ Chào buổi chiều' : '🌙 Chào buổi tối';
}

/**
 * Top Floating Glass Bar (Spec 011):
 * `rounded-full bg-white/[0.05] backdrop-blur-2xl border border-white/10`
 * containing quick search, role-contextual sub-navigation pill tabs, and User + Role badge cluster.
 */
export const AdminHeader: React.FC = () => {
  const {
    currentUser,
    isSuperAdmin,
    isCaptain,
    isMemberPortal,
    loading,
    fetchData,
    openGuestModal,
    openChangePasswordModal,
    onUserChange,
    notify,
    handleLogout,
    activeModule,
    setActiveModule,
    storeSubView,
    setStoreSubView,
    data: { venuesList },
  } = useAdminDashboard();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUploadingQuickAvatar, setIsUploadingQuickAvatar] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const quickAvatarInputRef = useRef<HTMLInputElement>(null);
  const { pendingGuestSessionsCount, pendingApplicationsCount, pendingBookingsCount } = useAdminMetrics();
  const hasUnreadAlert = pendingGuestSessionsCount + pendingApplicationsCount + pendingBookingsCount > 0;

  useEffect(() => {
    if (isCaptain) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCaptain]);

  useEffect(() => {
    if (!isProfileMenuOpen) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  const moduleLabel = findNavItem(activeModule)?.label ?? 'Overview & Analytics';
  const roleBadgeClass = USER_ROLE_BADGE[currentUser.role] || USER_ROLE_BADGE.GUEST;
  const captainTeamName = isCaptain ? venuesList.flatMap((v) => v.clubs || []).find((c) => c.captainUserId === currentUser.id)?.name : undefined;
  const greetingText = `${getVietnamGreeting()}, ${currentUser.fullName?.trim() || captainTeamName || currentUser.email}`;

  // Contextual sub-navigation pill tabs inside the floating glass topbar
  const subPills: SubPill[] = (() => {
    if (isCaptain) {
      return [
        { id: 'VENUES', label: 'Lịch & Slot', active: activeModule === 'VENUES', onClick: () => setActiveModule('VENUES') },
        { id: 'CAPTAIN_PROFILE', label: 'Hồ Sơ Đội', active: activeModule === 'CAPTAIN_PROFILE', onClick: () => setActiveModule('CAPTAIN_PROFILE') },
      ];
    }
    if (isMemberPortal) {
      return [
        { id: 'MEMBER_OVERVIEW', label: 'Tổng Quan', active: activeModule === 'MEMBER_OVERVIEW', onClick: () => setActiveModule('MEMBER_OVERVIEW') },
        { id: 'MEMBER_SCHEDULE', label: 'Lịch Tập', active: activeModule === 'MEMBER_SCHEDULE', onClick: () => setActiveModule('MEMBER_SCHEDULE') },
        { id: 'MEMBER_VENUES', label: 'Sân & Đội', active: activeModule === 'MEMBER_VENUES', onClick: () => setActiveModule('MEMBER_VENUES') },
      ];
    }
    if (isSuperAdmin && activeModule === 'STORE') {
      return (['ORDERS', 'PRODUCTS', 'CATEGORIES'] as StoreSubView[]).map((v) => ({
        id: v,
        label: v === 'ORDERS' ? 'Orders' : v === 'PRODUCTS' ? 'Products' : 'Categories',
        active: storeSubView === v,
        onClick: () => setStoreSubView(v),
      }));
    }
    const quickTabs: { id: AdminTabId; label: string }[] = isSuperAdmin
      ? [
          { id: 'OVERVIEW', label: 'Overview' },
          { id: 'APPLICATIONS', label: 'Tryouts' },
          { id: 'BOOKINGS', label: 'Bookings' },
          { id: 'VENUES', label: 'Venues' },
          { id: 'PLAYERS', label: 'Squad' },
        ]
      : [
          { id: 'OVERVIEW', label: 'Overview' },
          { id: 'APPLICATIONS', label: 'Tryouts' },
          { id: 'TOURNAMENTS', label: 'Tournaments' },
          { id: 'NEWS', label: 'News' },
        ];
    return quickTabs.map((t) => ({
      id: t.id,
      label: t.label,
      active: activeModule === t.id,
      onClick: () => setActiveModule(t.id),
    }));
  })();

  const handleQuickAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Vui lòng chọn tệp hình ảnh hợp lệ.', 3500);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notify('Ảnh đại diện vượt quá giới hạn 10MB.', 3500);
      return;
    }

    setIsUploadingQuickAvatar(true);
    try {
      const uploaded = await uploadToCloudinary(file, 'staff');
      const res = await authService.updateProfile({ avatarUrl: uploaded.url });
      if (res.user && onUserChange) {
        onUserChange(res.user);
      }
      notify('Đã cập nhật ảnh đại diện thành công!', 3500);
    } catch (err: any) {
      notify(err?.message || 'Không thể cập nhật ảnh đại diện.', 3500);
    } finally {
      setIsUploadingQuickAvatar(false);
    }
  };

  const handleSaveSelfProfile = async (payload: { fullName: string; avatarUrl: string }) => {
    const res = await authService.updateProfile({
      fullName: payload.fullName,
      avatarUrl: payload.avatarUrl,
    });
    if (res.user && onUserChange) {
      onUserChange(res.user);
    }
    notify('Đã cập nhật hồ sơ & ảnh đại diện!', 3500);
  };

  return (
    <>
      <div className="sticky top-0 z-40 pt-3 pb-2 px-3 sm:px-5 lg:px-6 shrink-0 bg-transparent pointer-events-none">
        <div ref={profileDropdownRef} className="relative w-full max-w-[1440px] mx-auto pointer-events-none">
        <header className="pointer-events-auto w-full max-w-full overflow-hidden min-h-[52px] sm:h-14 px-3 py-2 sm:px-4 rounded-full bg-[#10131C]/65 backdrop-blur-2xl border border-white/12 shadow-[0_12px_36px_rgba(0,0,0,0.28)] flex items-center gap-1.5 sm:gap-3">
          {/* Compact active module badge + Vietnam time-of-day greeting (all 5 roles) */}
          <div className="min-w-0 flex-1 lg:flex-none lg:max-w-[235px] flex flex-col pl-0.5 pr-1">
            <span className="text-[10px] font-semibold text-orange-300/95 leading-none truncate" title={greetingText}>
              {greetingText}
            </span>
            <h1 className="font-heading font-black text-xs text-white truncate mt-1">{moduleLabel}</h1>
          </div>

          {/* Contextual Sub-Navigation Pill Tabs */}
          <div
            role="tablist"
            aria-label="Quick module switch"
            className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/10 mx-auto shrink-0"
          >
            {subPills.map((pill) => (
              <button
                key={pill.id}
                type="button"
                role="tab"
                aria-selected={pill.active}
                onClick={pill.onClick}
                className={`px-3.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  pill.active
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Right Action Cluster + User & Role Badge */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {!isCaptain && (
              <button
                type="button"
                aria-label="Quick search (⌘K)"
                title="Tìm kiếm nhanh (⌘K)"
                onClick={() => setIsSearchOpen(true)}
                className="w-8 h-8 sm:w-auto sm:h-9 sm:px-3 rounded-full bg-white/[0.06] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <kbd className="hidden md:inline text-[10px] font-mono text-slate-400">⌘K</kbd>
              </button>
            )}

            {isSuperAdmin && (
              <button
                type="button"
                onClick={openGuestModal}
                title="Guest Session Email"
                aria-label="Guest Session Email"
                className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/[0.06] border border-white/10 hover:bg-white/10 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {hasUnreadAlert && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-[#0B0D12]" aria-hidden="true" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              title="Refresh data"
              aria-label="Refresh data"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <Link
              to="/"
              title="Về trang chủ DVA"
              aria-label="Về trang chủ DVA"
              className="hidden sm:flex w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 hover:text-white items-center justify-center shrink-0 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>

            {/* User Avatar + Role Badge Trigger */}
            <div className="pl-1 sm:pl-1.5 ml-0.5 border-l border-white/10 shrink-0">
              <input
                ref={quickAvatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploadingQuickAvatar}
                onChange={handleQuickAvatarUpload}
              />
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => quickAvatarInputRef.current?.click()}
                  disabled={isUploadingQuickAvatar}
                  title="Bấm để đổi ảnh đại diện ngay (Cloudinary)"
                  aria-label="Đổi ảnh đại diện"
                  className="relative group rounded-full cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-wait"
                >
                  <RoleAvatarRing
                    name={currentUser.fullName}
                    avatarUrl={currentUser.avatarUrl}
                    role={currentUser.role}
                    email={currentUser.email}
                    size="sm"
                  />
                  <span
                    className={`absolute inset-[3px] z-20 rounded-full flex items-center justify-center bg-black/60 text-white transition-opacity ${
                      isUploadingQuickAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isUploadingQuickAvatar ? (
                      <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                    ) : (
                      <Camera className="w-3 h-3" />
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen((v) => !v)}
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="menu"
                  title="Account menu"
                  className="flex items-center gap-1 sm:gap-1.5 p-1 sm:px-2 sm:py-1 rounded-full hover:bg-white/[0.08] transition-colors cursor-pointer text-left shrink-0"
                >
                  <div className="hidden sm:flex items-center gap-1.5 min-w-0 max-w-[175px]">
                    <span className="text-xs font-bold text-white truncate max-w-[95px]">
                      {currentUser.fullName}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border font-mono shrink-0 ${roleBadgeClass}`}>
                      {currentUser.role}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isProfileMenuOpen ? 'rotate-180 text-orange-400' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </header>

        {isProfileMenuOpen && (
          <div
            role="menu"
            aria-label="Profile options"
            className="pointer-events-auto absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-3xl bg-[#111520]/95 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/80 py-2 z-50 text-xs"
          >
                  <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-3">
                    <RoleAvatarRing
                      name={currentUser.fullName}
                      avatarUrl={currentUser.avatarUrl}
                      role={currentUser.role}
                      email={currentUser.email}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Signed in
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border font-mono ${roleBadgeClass}`}>
                          {currentUser.role}
                        </span>
                      </div>
                      <p className="font-bold text-white text-sm mt-0.5 truncate">{currentUser.fullName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                    </div>
                  </div>

                  <div className="p-1.5 border-b border-white/10 space-y-0.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-2xl text-slate-200 hover:text-white hover:bg-white/[0.08] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <UserCog className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Hồ Sơ & Ảnh Đại Diện</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        openChangePasswordModal();
                      }}
                      className="w-full text-left px-3 py-2 rounded-2xl text-orange-300 hover:text-orange-200 hover:bg-orange-500/15 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-orange-400 shrink-0" />
                      <span>Đổi Mật Khẩu Của Tôi</span>
                    </button>
                    <Link
                      to="/"
                      role="menuitem"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="w-full px-3 py-2 rounded-2xl text-slate-300 hover:text-white hover:bg-white/[0.08] font-semibold flex items-center gap-2.5 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Return to Public Website</span>
                    </Link>
                  </div>

                  <div className="p-1.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-2xl text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Sign Out / Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
        </div>
      </div>

      {/* Quick Search Modal Overlay (Desktop ⌘K & Mobile) */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#0B0D12]/80 backdrop-blur-xl p-4 sm:pt-24 flex items-start justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Quick search"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSearchOpen(false);
          }}
        >
          <div className="w-full max-w-lg flex items-start gap-2">
            <div className="flex-1">
              <AdminQuickSearch autoFocus enableHotkey={false} onDone={() => setIsSearchOpen(false)} />
            </div>
            <button
              type="button"
              aria-label="Close search"
              onClick={() => setIsSearchOpen(false)}
              className="p-2.5 rounded-full bg-white/[0.06] border border-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Self Profile & Avatar Modal */}
      <StaffProfileModal
        isOpen={isProfileModalOpen}
        mode="self"
        targetUser={currentUser}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={handleSaveSelfProfile}
        notify={notify}
      />
    </>
  );
};
