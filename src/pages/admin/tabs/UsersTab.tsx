import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  KeyRound,
  UserCog,
  Lock,
  Unlock,
  LogOut,
  Clock,
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

const USERS_PAGE_SIZE = 10;

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
  if (!isSuperAdmin) return null;

  const safePage = Math.min(
    Math.max(1, currentPage),
    Math.max(1, Math.ceil(usersList.length / USERS_PAGE_SIZE))
  );
  const paginatedUsers = usersList.slice(
    (safePage - 1) * USERS_PAGE_SIZE,
    safePage * USERS_PAGE_SIZE
  );

  return (
    <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
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
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <KeyRound className="w-4 h-4 text-orange-400" />
            <span>Đổi mật khẩu của tôi</span>
          </button>
          <button
            type="button"
            onClick={openCreateUserModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Tài Khoản Mới</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[820px] text-xs text-left">
          <thead className="text-slate-400 uppercase text-[10px] border-b border-slate-800">
            <tr>
              <th className="py-3 pr-4">Nhân sự</th>
              <th className="py-3 pr-4">Email &amp; Hoạt động</th>
              <th className="py-3 pr-4">Role &amp; Trạng thái</th>
              <th className="py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {paginatedUsers.map((u) => {
              const isSelf = u.id === currentUser.id;
              const isProtected = u.role === 'SUPERADMIN' || isSelf;
              const isActive = u.isActive !== false;
              const isRowBusy = busyUserId === u.id;

              return (
                <tr key={u.id} className={isActive ? 'text-slate-200' : 'text-slate-400 bg-red-950/10'}>
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
                            <span className="px-1.5 py-0.25 rounded text-[9px] font-bold bg-sky-950/80 text-sky-300 border border-sky-500/40">
                              Bạn
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 pr-4">
                    <p className="text-slate-300 font-medium truncate max-w-[230px]">{u.email}</p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>Last login: {formatLastLogin(u.lastLoginAt)}</span>
                    </p>
                  </td>

                  <td className="py-3.5 pr-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${
                          USER_ROLE_BADGE[u.role] || USER_ROLE_BADGE.GUEST
                        }`}
                      >
                        {u.role}
                      </span>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-500/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          Đã khóa
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 text-right">
                    {isProtected ? (
                      <div className="flex items-center justify-end gap-2">
                        {isSelf && (
                          <button
                            type="button"
                            onClick={() => openEditProfileModal(u)}
                            className="h-9 px-3 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold cursor-pointer transition-colors"
                            title="Sửa Hồ Sơ & Avatar của bạn"
                          >
                            <UserCog className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span>Sửa Hồ Sơ</span>
                          </button>
                        )}
                        <span className="text-[10px] text-slate-500 italic">Được bảo vệ</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <select
                          value={u.role}
                          disabled={isRowBusy}
                          onChange={(e) =>
                            handleChangeUserRole(u, e.target.value as ManagedUserRole)
                          }
                          aria-label={`Đổi vai trò cho ${u.fullName}`}
                          className="bg-[#0B1220] border border-slate-700 rounded-xl px-2.5 h-9 text-[11px] text-white cursor-pointer disabled:opacity-50"
                        >
                          {MANAGED_USER_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={isRowBusy}
                          onClick={() => openEditProfileModal(u)}
                          className="w-9 h-9 min-w-[36px] flex items-center justify-center rounded-xl bg-sky-950/60 text-sky-300 hover:bg-sky-900/70 border border-sky-500/40 cursor-pointer transition-colors disabled:opacity-50"
                          title="Sửa Hồ Sơ & Avatar"
                          aria-label={`Sửa Hồ Sơ & Avatar của ${u.fullName}`}
                        >
                          <UserCog className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          disabled={isRowBusy}
                          onClick={() => handleToggleUserActive(u)}
                          className={`h-9 px-2.5 flex items-center justify-center gap-1 rounded-xl border text-[11px] font-bold cursor-pointer transition-colors whitespace-nowrap disabled:opacity-50 ${
                            isActive
                              ? 'bg-rose-950/50 text-rose-300 hover:bg-rose-900/60 border-rose-500/40'
                              : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/70 border-emerald-500/40'
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

                        <button
                          type="button"
                          disabled={isRowBusy}
                          onClick={() => handleForceLogoutUser(u)}
                          className="w-9 h-9 min-w-[36px] flex items-center justify-center rounded-xl bg-purple-950/60 text-purple-300 hover:bg-purple-900/70 border border-purple-500/40 cursor-pointer transition-colors disabled:opacity-50"
                          title="Force Logout — Đăng xuất tất cả thiết bị"
                          aria-label={`Force Logout tài khoản ${u.fullName}`}
                        >
                          <LogOut className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          disabled={isRowBusy}
                          onClick={() => openResetPasswordModal(u)}
                          className="w-9 h-9 min-w-[36px] flex items-center justify-center rounded-xl bg-amber-950/60 text-amber-300 hover:bg-amber-900/70 border border-amber-500/40 cursor-pointer transition-colors disabled:opacity-50"
                          title="Reset Password — Đặt lại mật khẩu"
                          aria-label={`Đặt lại mật khẩu cho ${u.fullName}`}
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          disabled={isRowBusy}
                          onClick={() => handleDeleteUser(u)}
                          className="w-9 h-9 min-w-[36px] flex items-center justify-center rounded-xl bg-red-950/60 text-red-400 hover:bg-red-900/70 border border-red-500/40 cursor-pointer transition-colors disabled:opacity-50"
                          title="Xóa tài khoản"
                          aria-label={`Xóa tài khoản ${u.fullName}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {usersList.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  Chưa có tài khoản nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={safePage}
        totalItems={usersList.length}
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
