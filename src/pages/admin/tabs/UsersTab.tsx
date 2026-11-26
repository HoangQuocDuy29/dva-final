import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Trash2,
  KeyRound,
  UserCog,
  Lock,
  Unlock,
  LogOut,
  Clock,
  Eye,
  EyeOff,
  Copy,
  Search,
  X,
  ChevronDown,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { ManagedUserRole, MANAGED_USER_ROLES } from '../../../types';
import { Pagination } from '../../../components/common/Pagination';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { USER_ROLE_BADGE } from '../constants';
import { useUsersTab } from '../hooks/useUsersTab';
import { CreateUserModal } from '../components/users/CreateUserModal';
import { ResetPasswordModal } from '../components/users/ResetPasswordModal';
import { RoleAvatarRing } from '../components/RoleAvatarRing';
import { StaffProfileModal } from '../components/StaffProfileModal';
import { SlowServerPill } from '../../../components/common/GlassLoading';

const USERS_PAGE_SIZE = 10;
const ROLE_GROUPS = [
  { id: 'SUPERADMIN', roles: ['SUPERADMIN'], badge: 'SUPERADMIN', badgeKey: 'SUPERADMIN', label: '👑 SUPERADMIN · Chủ Tịch & Điều Hành Tối Cao' },
  { id: 'ADMIN', roles: ['ADMIN'], badge: 'ADMIN', badgeKey: 'ADMIN', label: '🛡️ ADMIN · Quản Trị Viên Hệ Thống' },
  { id: 'STAFF_COACH', roles: ['COACH', 'STAFF'], badge: 'COACH / STAFF', badgeKey: 'COACH', label: '📋 BAN HUẤN LUYỆN & ĐIỀU PHỐI (COACH / STAFF)' },
  { id: 'CAPTAIN', roles: ['CAPTAIN'], badge: 'CAPTAIN', badgeKey: 'CAPTAIN', label: '🏐 ĐỘI TRƯỞNG CÁC CLB / SÂN (CAPTAIN)' },
  { id: 'PLAYER', roles: ['PLAYER', 'GUEST'], badge: 'PLAYER', badgeKey: 'PLAYER', label: '🏃 THÀNH VIÊN (PLAYER)' },
] as const;
const ROLE_FILTERS = [['ALL', 'Tất cả'], ['SUPERADMIN', 'Superadmin'], ['ADMIN', 'Admin'], ['CAPTAIN', 'Captain'], ['OTHER', 'Khác']] as const;
const normVi = (s?: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
const getRoleGroup = (role?: string) => ROLE_GROUPS.find((g) => (g.roles as readonly string[]).includes(role || '')) || ROLE_GROUPS[4];

function formatLastLogin(iso?: string): string {
  if (!iso) return 'Chưa đăng nhập';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Chưa đăng nhập';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const UsersTab: React.FC = () => {
  const { currentUser, isSuperAdmin, openChangePasswordModal, notify } = useAdminDashboard();
  const {
    usersList,
    isLoadingUsers,
    hasLoadedUsers,
    busyUserId,
    isUserModalOpen,
    setIsUserModalOpen,
    isSavingUser,
    userFormError,
    userForm,
    setUserForm,
    openCreateUserModal,
    handleCreateUser,
    handleChangeUserRole,
    handleToggleUserActive,
    handleForceLogoutUser,
    handleDeleteUser,
    editingProfileUser,
    openEditProfileModal,
    closeEditProfileModal,
    handleSaveStaffProfile,
    resetTargetUser,
    isResettingPassword,
    resetPasswordError,
    setResetPasswordError,
    openResetPasswordModal,
    closeResetPasswordModal,
    handleResetUserPassword,
  } = useUsersTab();

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number][0]>('ALL');
  const [openRoleMenu, setOpenRoleMenu] = useState<{
    userId: string;
    top: number;
    left: number;
    openUpward: boolean;
  } | null>(null);
  const roleMenuRef = useRef<HTMLDivElement | null>(null);
  const roleTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!openRoleMenu) return;
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        roleMenuRef.current?.contains(target) ||
        roleTriggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpenRoleMenu(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenRoleMenu(null);
    };
    const handleRepositionClose = () => setOpenRoleMenu(null);

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleRepositionClose, true);
    window.addEventListener('resize', handleRepositionClose);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleRepositionClose, true);
      window.removeEventListener('resize', handleRepositionClose);
    };
  }, [openRoleMenu]);

  if (!isSuperAdmin) return null;

  const toggleRoleMenu = (userId: string, triggerEl: HTMLButtonElement) => {
    if (openRoleMenu?.userId === userId) {
      setOpenRoleMenu(null);
      return;
    }
    roleTriggerRef.current = triggerEl;
    const rect = triggerEl.getBoundingClientRect();
    const menuWidth = 172;
    const estimatedHeight = MANAGED_USER_ROLES.length * 36 + 16;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedHeight + 12 && rect.top > estimatedHeight;
    const clampedLeft = Math.min(
      Math.max(12, rect.right - menuWidth),
      window.innerWidth - menuWidth - 12
    );
    setOpenRoleMenu({
      userId,
      top: openUpward ? rect.top - 8 : rect.bottom + 8,
      left: clampedLeft,
      openUpward,
    });
  };

  const activeRoleMenuUser = openRoleMenu
    ? usersList.find((item) => item.id === openRoleMenu.userId) || null
    : null;

  const copyCredentials = async (u: (typeof usersList)[number]) => {
    const text = `Tài khoản quản lý DVA Volleyball:\n- Link đăng nhập: https://dva-volleyball-hanoi.com/login\n- Email: ${u.email}\n- Mật khẩu: ${u.issuedPassword || '(Chưa lưu — Đặt lại MK để lưu)'}`;
    try { await navigator.clipboard.writeText(text); notify('Đã copy tài khoản & mật khẩu', 3000); } catch { notify('Không thể copy vào bộ nhớ tạm.', 3000); }
  };

  const renderRowActions = (
    u: (typeof usersList)[number],
    opts: { isSelf: boolean; isProtected: boolean; isActive: boolean; isRowBusy: boolean; mobile?: boolean }
  ) => {
    const { isSelf, isProtected, isActive, isRowBusy, mobile } = opts;
    const containerClass = mobile
      ? 'flex flex-wrap items-center gap-2 pt-3 border-t border-white/[0.07]'
      : 'flex items-center justify-end gap-1.5';

    if (isProtected) {
      return (
        <div className={containerClass}>
          {isSelf && (
            <button
              type="button"
              onClick={() => openEditProfileModal(u)}
              className="h-9 px-3.5 rounded-full bg-white/[0.05] hover:bg-sky-500/15 border border-white/12 hover:border-sky-400/40 backdrop-blur-xl text-slate-200 hover:text-sky-200 text-xs font-medium flex items-center justify-center gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Sửa Hồ Sơ & Avatar của bạn"
            >
              <UserCog className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              <span>Sửa Hồ Sơ</span>
            </button>
          )}
          <span className="h-9 px-3 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-xl text-[11px] font-medium text-slate-400 inline-flex items-center gap-1.5 select-none whitespace-nowrap">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
            <span>Được bảo vệ</span>
          </span>
        </div>
      );
    }

    const isMenuOpen = openRoleMenu?.userId === u.id;
    const iconBtnBase =
      'w-9 h-9 min-w-[36px] rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all active:scale-95 cursor-pointer disabled:opacity-50';

    return (
      <div className={containerClass}>
        {/* Custom Spatial Glass Role Dropdown */}
        <button
          type="button"
          disabled={isRowBusy}
          aria-haspopup="listbox"
          aria-expanded={isMenuOpen}
          aria-label={`Đổi vai trò cho ${u.fullName}`}
          onClick={(e) => toggleRoleMenu(u.id, e.currentTarget)}
          className={`h-9 px-3.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border backdrop-blur-xl text-xs font-semibold tracking-wide text-white flex items-center gap-2 transition-all focus:outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50 cursor-pointer whitespace-nowrap active:scale-95 ${
            isMenuOpen
              ? 'border-orange-500/60 bg-white/[0.08] ring-2 ring-orange-500/20'
              : 'border-white/12 hover:border-white/25'
          }`}
        >
          <span>{u.role}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isMenuOpen ? 'rotate-180 text-orange-400' : ''
            }`}
          />
        </button>

        {/* Copy Credentials Pill */}
        <button
          type="button"
          onClick={() => void copyCredentials(u)}
          className="h-9 px-3.5 rounded-full bg-emerald-500/[0.08] hover:bg-emerald-500/[0.16] border border-emerald-500/25 hover:border-emerald-400/50 backdrop-blur-xl text-emerald-300 text-xs font-medium flex items-center gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          title="Copy Email & Mật khẩu gửi Zalo"
        >
          <Copy className="w-3.5 h-3.5 shrink-0" />
          <span>Copy TK &amp; MK</span>
        </button>

        {/* Lock / Unlock Pill */}
        <button
          type="button"
          disabled={isRowBusy}
          onClick={() => handleToggleUserActive(u)}
          className={`h-9 px-3.5 rounded-full backdrop-blur-xl border text-xs font-medium flex items-center gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all active:scale-95 cursor-pointer whitespace-nowrap disabled:opacity-50 ${
            isActive
              ? 'bg-rose-500/[0.08] hover:bg-rose-500/[0.16] border-rose-500/25 hover:border-rose-400/50 text-rose-300'
              : 'bg-emerald-500/[0.08] hover:bg-emerald-500/[0.16] border-emerald-500/25 hover:border-emerald-400/50 text-emerald-300'
          }`}
          title={
            isActive
              ? 'Khóa tạm thời tài khoản (Suspend & đá phiên đăng nhập)'
              : 'Mở khóa tài khoản (Active)'
          }
        >
          {isActive ? (
            <>
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Khóa</span>
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5 shrink-0" />
              <span>Mở khóa</span>
            </>
          )}
        </button>

        {/* 1. Edit Profile */}
        <button
          type="button"
          disabled={isRowBusy}
          onClick={() => openEditProfileModal(u)}
          className={`${iconBtnBase} text-sky-300 hover:bg-sky-500/15 hover:border-sky-400/40`}
          title="Sửa tài khoản (Tên, Email & Avatar)"
          aria-label={`Sửa tài khoản của ${u.fullName}`}
        >
          <UserCog className="w-4 h-4" />
        </button>

        {/* 2. Force Logout */}
        <button
          type="button"
          disabled={isRowBusy}
          onClick={() => handleForceLogoutUser(u)}
          className={`${iconBtnBase} text-violet-300 hover:bg-violet-500/15 hover:border-violet-400/40`}
          title="Force Logout — Đăng xuất tất cả thiết bị"
          aria-label={`Force Logout tài khoản ${u.fullName}`}
        >
          <LogOut className="w-4 h-4" />
        </button>

        {/* 3. Reset Password */}
        <button
          type="button"
          disabled={isRowBusy}
          onClick={() => openResetPasswordModal(u)}
          className={`${iconBtnBase} text-amber-300 hover:bg-amber-500/15 hover:border-amber-400/40`}
          title="Reset Password — Đặt lại mật khẩu"
          aria-label={`Đặt lại mật khẩu cho ${u.fullName}`}
        >
          <KeyRound className="w-4 h-4" />
        </button>

        {/* 4. Delete Account */}
        <button
          type="button"
          disabled={isRowBusy}
          onClick={() => handleDeleteUser(u)}
          className={`${iconBtnBase} text-rose-400 hover:bg-rose-500/15 hover:border-rose-400/40`}
          title="Xóa tài khoản"
          aria-label={`Xóa tài khoản ${u.fullName}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const q = normVi(searchQuery.trim());
  const filteredUsers = usersList
    .filter((u) => {
      const gid = getRoleGroup(u.role).id;
      if (roleFilter === 'OTHER' ? gid !== 'STAFF_COACH' && gid !== 'PLAYER' : roleFilter !== 'ALL' && gid !== roleFilter) return false;
      return !q || normVi(`${u.fullName} ${u.email} ${u.role}`).includes(q);
    })
    .sort((a, b) => ROLE_GROUPS.indexOf(getRoleGroup(a.role)) - ROLE_GROUPS.indexOf(getRoleGroup(b.role)));
  const groupCounts = filteredUsers.reduce<Record<string, number>>((acc, u) => {
    const id = getRoleGroup(u.role).id;
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE)));
  const paginatedUsers = filteredUsers.slice((safePage - 1) * USERS_PAGE_SIZE, safePage * USERS_PAGE_SIZE);

  if (isLoadingUsers && !hasLoadedUsers) {
    return (
      <div className="dva-glass-panel rounded-3xl p-4 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-2">
            <div className="dva-skeleton-bar h-5 w-48" />
            <div className="dva-skeleton-bar h-3 w-80 max-w-full" />
          </div>
          <div className="flex items-center gap-2">
            <div className="dva-skeleton h-9 w-36 rounded-full" />
            <div className="dva-skeleton h-9 w-36 rounded-full" />
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="dva-skeleton h-10 w-full md:w-80 rounded-2xl" />
          <div className="dva-skeleton h-9 w-64 rounded-2xl" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="dva-skeleton p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="dva-skeleton-bar w-10 h-10 rounded-full shrink-0" />
                <div className="space-y-2">
                  <div className="dva-skeleton-bar h-3.5 w-36" />
                  <div className="dva-skeleton-bar h-2.5 w-48" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="dva-skeleton-bar h-9 w-24 rounded-full" />
                <div className="dva-skeleton-bar h-9 w-28 rounded-full" />
                <div className="dva-skeleton-bar h-9 w-20 rounded-full" />
                <div className="dva-skeleton-bar h-9 w-9 rounded-full" />
                <div className="dva-skeleton-bar h-9 w-9 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <SlowServerPill active />
      </div>
    );
  }

  return (
    <div className="dva-glass-panel rounded-3xl p-4 sm:p-6 shadow-xl space-y-6 dva-content-reveal">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-black text-white">Quản lý Tài Khoản ({usersList.length})</h2>
          <p className="text-xs text-slate-400">
            Tạo tài khoản, cập nhật hồ sơ/avatar, phân quyền, khóa tạm thời và quản lý phiên đăng nhập nhân sự.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openChangePasswordModal}
            className="h-9 px-3.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/12 hover:border-white/25 backdrop-blur-xl text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <KeyRound className="w-3.5 h-3.5 text-orange-400" />
            <span>Đổi mật khẩu của tôi</span>
          </button>
          <button
            type="button"
            onClick={openCreateUserModal}
            className="h-9 px-4 rounded-full bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-950/40 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Tài Khoản Mới</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Tìm theo tên, email, tên đội..."
            className="dva-glass-input w-full h-10 pl-10 pr-8 text-[16px] sm:text-xs"
          />
          {searchQuery && (
            <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }} aria-label="Xóa từ khóa" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-white/[0.035] border border-white/10 w-fit">
          {ROLE_FILTERS.map(([id, label]) => (
            <button key={id} type="button" onClick={() => { setRoleFilter(id); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${roleFilter === id ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* DESKTOP TABLE VIEW (md and up) */}
      <div className="hidden md:block overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[820px] text-xs text-left">
          <thead className="text-slate-400 uppercase text-[10px] border-b border-white/10">
            <tr>
              <th className="py-3 pr-4">Nhân sự</th>
              <th className="py-3 pr-4">Email, Mật khẩu &amp; Hoạt động</th>
              <th className="py-3 pr-4">Role &amp; Trạng thái</th>
              <th className="py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {paginatedUsers.map((u, idx) => {
              const group = getRoleGroup(u.role);
              const showHeader = idx === 0 || getRoleGroup(paginatedUsers[idx - 1].role).id !== group.id;
              const isSelf = u.id === currentUser.id;
              const isProtected = u.role === 'SUPERADMIN' || isSelf;
              const isActive = u.isActive !== false;
              const isRowBusy = busyUserId === u.id;

              return (
                <React.Fragment key={u.id}>
                  {showHeader && (
                    <tr className="bg-white/[0.03]">
                      <td colSpan={4} className="py-2 px-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-black tracking-wide text-slate-200">{group.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${USER_ROLE_BADGE[group.badgeKey]}`}>{group.badge} ({groupCounts[group.id] || 0})</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr className={`transition-colors ${isActive ? 'text-slate-200 hover:bg-white/[0.02]' : 'text-slate-400 bg-rose-950/15'}`}>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <RoleAvatarRing
                          name={u.fullName}
                          avatarUrl={u.avatarUrl}
                          role={u.role}
                          email={u.email}
                          size="sm"
                          dimmed={!isActive}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-white truncate max-w-[180px]">
                              {u.fullName}
                            </span>
                            {isSelf && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/15 text-sky-300 border border-sky-400/35">
                                Bạn
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 pr-4">
                      <p className="text-slate-300 font-medium truncate max-w-[230px]">{u.email}</p>
                      {u.role !== 'SUPERADMIN' && (
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                          {u.issuedPassword ? (
                            <>
                              <span className="text-slate-500">MK:</span>
                              <span className="font-sans tabular-nums text-amber-200">{revealedIds[u.id] ? u.issuedPassword : '••••••••'}</span>
                              <button type="button" onClick={() => setRevealedIds((p) => ({ ...p, [u.id]: !p[u.id] }))} className="p-0.5 text-slate-400 hover:text-white cursor-pointer" title={revealedIds[u.id] ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-label={revealedIds[u.id] ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                                {revealedIds[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          ) : <span className="text-[10px] italic text-slate-500">Chưa lưu — Đặt lại MK để lưu</span>}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>Last login: {formatLastLogin(u.lastLoginAt)}</span>
                      </p>
                    </td>

                    <td className="py-3.5 pr-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            USER_ROLE_BADGE[u.role] || USER_ROLE_BADGE.GUEST
                          }`}
                        >
                          {u.role}
                        </span>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/35">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Đã khóa
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 text-right">
                      {renderRowActions(u, { isSelf, isProtected, isActive, isRowBusy })}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  {usersList.length === 0 ? 'Chưa có tài khoản nào.' : 'Không tìm thấy tài khoản phù hợp.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARD VIEW (< md) */}
      <div className="md:hidden space-y-3">
        {paginatedUsers.map((u, idx) => {
          const group = getRoleGroup(u.role);
          const showHeader = idx === 0 || getRoleGroup(paginatedUsers[idx - 1].role).id !== group.id;
          const isSelf = u.id === currentUser.id;
          const isProtected = u.role === 'SUPERADMIN' || isSelf;
          const isActive = u.isActive !== false;
          const isRowBusy = busyUserId === u.id;

          return (
            <React.Fragment key={`m-${u.id}`}>
              {showHeader && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/10">
                  <span className="text-[11px] font-black tracking-wide text-slate-200 truncate">{group.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border shrink-0 ${USER_ROLE_BADGE[group.badgeKey]}`}>
                    {group.badge} ({groupCounts[group.id] || 0})
                  </span>
                </div>
              )}
              <div
                className={`rounded-2xl p-3.5 border backdrop-blur-xl space-y-2.5 ${
                  isActive
                    ? 'bg-white/[0.03] border-white/10'
                    : 'bg-rose-950/15 border-rose-500/25'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <RoleAvatarRing
                      name={u.fullName}
                      avatarUrl={u.avatarUrl}
                      role={u.role}
                      email={u.email}
                      size="sm"
                      dimmed={!isActive}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-white truncate">{u.fullName}</span>
                        {isSelf && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/15 text-sky-300 border border-sky-400/35 shrink-0">
                            Bạn
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                        USER_ROLE_BADGE[u.role] || USER_ROLE_BADGE.GUEST
                      }`}
                    >
                      {u.role}
                    </span>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/35">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Đã khóa
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  {u.role !== 'SUPERADMIN' && (
                    <div className="flex items-center gap-1.5">
                      {u.issuedPassword ? (
                        <>
                          <span className="text-slate-500">MK:</span>
                          <span className="font-sans tabular-nums text-amber-200">{revealedIds[u.id] ? u.issuedPassword : '••••••••'}</span>
                          <button type="button" onClick={() => setRevealedIds((p) => ({ ...p, [u.id]: !p[u.id] }))} className="p-0.5 text-slate-400 hover:text-white cursor-pointer" title={revealedIds[u.id] ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-label={revealedIds[u.id] ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                            {revealedIds[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] italic text-slate-500">Chưa lưu — Đặt lại MK để lưu</span>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{formatLastLogin(u.lastLoginAt)}</span>
                  </p>
                </div>

                {renderRowActions(u, { isSelf, isProtected, isActive, isRowBusy, mobile: true })}
              </div>
            </React.Fragment>
          );
        })}
        {filteredUsers.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-500 rounded-2xl bg-white/[0.02] border border-dashed border-white/10">
            {usersList.length === 0 ? 'Chưa có tài khoản nào.' : 'Không tìm thấy tài khoản phù hợp.'}
          </div>
        )}
      </div>

      {/* Portal-Rendered Spatial Glass Role Menu (Never Clipped by Table Overflow) */}
      {openRoleMenu && activeRoleMenuUser && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={roleMenuRef}
            role="listbox"
            aria-label={`Chọn vai trò cho ${activeRoleMenuUser.fullName}`}
            style={{
              top: openRoleMenu.top,
              left: openRoleMenu.left,
              transform: openRoleMenu.openUpward ? 'translateY(-100%)' : undefined,
            }}
            className="fixed rounded-2xl bg-[#0E1118]/95 backdrop-blur-2xl border border-white/15 shadow-[0_18px_45px_rgba(0,0,0,0.85)] p-1.5 z-[9999] min-w-[165px]"
          >
            {MANAGED_USER_ROLES.map((roleOption) => {
              const isSelected = activeRoleMenuUser.role === roleOption;
              return (
                <button
                  key={roleOption}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    const target = activeRoleMenuUser;
                    setOpenRoleMenu(null);
                    if (roleOption !== target.role) {
                      void handleChangeUserRole(target, roleOption as ManagedUserRole);
                    }
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-orange-500/20 text-orange-200'
                      : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  <span>{roleOption}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}

      <Pagination
        currentPage={safePage}
        totalItems={filteredUsers.length}
        pageSize={USERS_PAGE_SIZE}
        onPageChange={setCurrentPage}
        itemLabel="accounts"
      />

      <CreateUserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        userForm={userForm}
        setUserForm={setUserForm}
        userFormError={userFormError}
        isSavingUser={isSavingUser}
        onSubmit={handleCreateUser}
      />

      <StaffProfileModal
        isOpen={Boolean(editingProfileUser)}
        mode={editingProfileUser?.id === currentUser.id ? 'self' : 'staff'}
        targetUser={editingProfileUser}
        onClose={closeEditProfileModal}
        onSave={handleSaveStaffProfile}
        notify={notify}
      />

      <ResetPasswordModal
        targetUser={resetTargetUser}
        onClose={closeResetPasswordModal}
        onSubmit={handleResetUserPassword}
        isResetting={isResettingPassword}
        error={resetPasswordError}
        setError={setResetPasswordError}
      />
    </div>
  );
};
