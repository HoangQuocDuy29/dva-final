import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  RefreshCw,
  ArrowLeft,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
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
import { findNavItem } from '../constants';
import { AdminQuickSearch } from './AdminQuickSearch';
import { RoleAvatarRing } from '../components/RoleAvatarRing';
import { StaffProfileModal } from '../components/StaffProfileModal';

/**
 * Sticky admin topbar (Spec 005): sidebar toggles, module title, Hybrid Quick Search,
 * connected admin identity dropdown with direct logout, and pre-existing actions.
 */
export const AdminHeader: React.FC = () => {
  const {
    currentUser,
    isSuperAdmin,
    isCaptain,
    loading,
    fetchData,
    openGuestModal,
    openChangePasswordModal,
    onUserChange,
    notify,
    handleLogout,
    activeModule,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    setIsMobileNavOpen,
  } = useAdminDashboard();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUploadingQuickAvatar, setIsUploadingQuickAvatar] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const quickAvatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isProfileMenuOpen) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  const moduleLabel = isCaptain ? 'Quản lý Đội & Lịch Chơi Của Tôi' : (findNavItem(activeModule)?.label ?? 'Overview & Analytics');

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
      <header className="sticky top-0 z-20 h-16 shrink-0 bg-[#0B0E14]/90 backdrop-blur-md border-b border-[#1E293B]">
        <div className="h-full px-4 sm:px-6 flex items-center gap-3">
          {/* Sidebar toggles */}
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setIsMobileNavOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setIsSidebarCollapsed((v) => !v)}
            className="hidden lg:inline-flex p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] cursor-pointer"
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

          {/* Module title */}
          <div className="min-w-0 hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 leading-none">DVA Admin Hub</p>
            <h1 className="font-heading font-black text-sm text-white truncate mt-1">{moduleLabel}</h1>
          </div>

          {/* Quick search (hidden for CAPTAIN) */}
          {!isCaptain ? (
            <div className="hidden md:block flex-1 max-w-md mx-auto">
              <AdminQuickSearch />
            </div>
          ) : (
            <div className="flex-1" />
          )}
          {!isCaptain && <div className="flex-1 md:hidden" />}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!isCaptain && (
              <button
                type="button"
                aria-label="Search"
                onClick={() => setIsMobileSearchOpen(true)}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] cursor-pointer"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            {isSuperAdmin && (
              <button
                type="button"
                onClick={openGuestModal}
                title="Guest Session Email"
                className="px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-purple-950/40 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Guest Session Email</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              title="Refresh data"
              aria-label="Refresh data"
              className="p-2 rounded-lg text-xs font-semibold bg-[#111827] border border-[#1E293B] text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <Link
              to="/"
              title="Exit to Public Website"
              aria-label="Exit to Public Website"
              className="p-2 rounded-lg text-white bg-[#111827] hover:bg-[#1E293B] border border-[#1E293B] flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden 2xl:inline text-xs font-bold">Exit to Public Website</span>
            </Link>

            {/* Connected admin profile dropdown with direct avatar upload & logout */}
            <div ref={profileDropdownRef} className="relative pl-2 ml-1 border-l border-[#1E293B]">
              <input
                ref={quickAvatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploadingQuickAvatar}
                onChange={handleQuickAvatarUpload}
              />
              <div className="flex items-center gap-1.5">
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
                    size="md"
                  />
                  <span
                    className={`absolute inset-[4px] z-20 rounded-full flex items-center justify-center bg-black/60 text-white transition-opacity ${
                      isUploadingQuickAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isUploadingQuickAvatar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen((v) => !v)}
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="menu"
                  title="Admin account menu"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[#111827] border border-transparent hover:border-[#1E293B] transition-colors cursor-pointer text-left"
                >
                  <div className="hidden lg:block min-w-0 max-w-[180px]">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white truncate">{currentUser.fullName}</p>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-900/70 text-red-200 border border-red-700 font-mono">
                        {currentUser.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isProfileMenuOpen ? 'rotate-180 text-orange-400' : ''
                    }`}
                  />
                </button>
              </div>

              {isProfileMenuOpen && (
                <div
                  role="menu"
                  aria-label="Admin profile options"
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#111827] border border-[#1E293B] shadow-2xl shadow-black/70 py-2 z-50 text-xs"
                >
                  <div className="px-4 py-2.5 border-b border-[#1E293B] flex items-center gap-3">
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
                          Signed in as
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-900/70 text-red-200 border border-red-700 font-mono">
                          {currentUser.role}
                        </span>
                      </div>
                      <p className="font-bold text-white text-sm mt-0.5 truncate">{currentUser.fullName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                    </div>
                  </div>

                  <div className="p-1.5 border-b border-[#1E293B] space-y-0.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-[#1E293B] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
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
                      className="w-full text-left px-3 py-2 rounded-xl text-orange-300 hover:text-orange-200 hover:bg-orange-950/40 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-orange-400 shrink-0" />
                      <span>Đổi Mật Khẩu Của Tôi</span>
                    </button>
                    <Link
                      to="/"
                      role="menuitem"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="w-full px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#1E293B] font-semibold flex items-center gap-2.5 transition-colors"
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
                      className="w-full text-left px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-950/40 hover:text-red-300 font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-400 shrink-0" />
                      <span>Sign Out / Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile search overlay — rendered outside <header> because backdrop-filter would trap position:fixed */}
      {isMobileSearchOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-[#0B0F19]/95 backdrop-blur p-4" role="dialog" aria-modal="true" aria-label="Quick search">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <AdminQuickSearch autoFocus enableHotkey={false} onDone={() => setIsMobileSearchOpen(false)} />
            </div>
            <button
              type="button"
              aria-label="Close search"
              onClick={() => setIsMobileSearchOpen(false)}
              className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      {/* Self Profile & Avatar Modal — rendered outside <header> so position:fixed isn't trapped */}
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
