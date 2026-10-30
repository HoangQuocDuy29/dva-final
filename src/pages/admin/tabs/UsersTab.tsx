import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ManagedUserRole, MANAGED_USER_ROLES } from '../../../types';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { USER_ROLE_BADGE } from '../constants';
import { useUsersTab } from '../hooks/useUsersTab';
import { CreateUserModal } from '../components/users/CreateUserModal';

export const UsersTab: React.FC = () => {
  const { currentUser, isSuperAdmin } = useAdminDashboard();
  const {
    usersList,
    isUserModalOpen,
    setIsUserModalOpen,
    isSavingUser,
    userFormError,
    userForm,
    setUserForm,
    openCreateUserModal,
    handleCreateUser,
    handleChangeUserRole,
    handleDeleteUser,
  } = useUsersTab();

  if (!isSuperAdmin) return null;

  return (
    <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-black text-white">Quản lý Tài Khoản ({usersList.length})</h2>
          <p className="text-xs text-slate-400">
            Tạo, phân quyền và xóa tài khoản người dùng / nhân sự.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateUserModal}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Tài Khoản Mới</span>
        </button>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[560px] text-xs text-left">
          <thead className="text-slate-400 uppercase text-[10px] border-b border-slate-800">
            <tr>
              <th className="py-3 pr-4">Tên</th>
              <th className="py-3 pr-4">Email</th>
              <th className="py-3 pr-4">Role</th>
              <th className="py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {usersList.map((u) => {
              const isProtected = u.role === 'SUPERADMIN' || u.id === currentUser.id;
              return (
                <tr key={u.id} className="text-slate-200">
                  <td className="py-3 pr-4 font-semibold">{u.fullName}</td>
                  <td className="py-3 pr-4 text-slate-400">{u.email}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${
                        USER_ROLE_BADGE[u.role] || USER_ROLE_BADGE.GUEST
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {isProtected ? (
                      <span className="text-[10px] text-slate-500 italic">Được bảo vệ</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={u.role}
                          onChange={(e) =>
                            handleChangeUserRole(u, e.target.value as ManagedUserRole)
                          }
                          className="bg-[#0B1220] border border-slate-700 rounded-xl px-2.5 min-h-[40px] text-[11px] text-white cursor-pointer"
                        >
                          {MANAGED_USER_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-red-950/60 text-red-400 hover:bg-red-900/70 border border-red-500/40 cursor-pointer transition-colors"
                          title="Xóa tài khoản"
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

      <CreateUserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        userForm={userForm}
        setUserForm={setUserForm}
        userFormError={userFormError}
        isSavingUser={isSavingUser}
        onSubmit={handleCreateUser}
      />
    </div>
  );
};
