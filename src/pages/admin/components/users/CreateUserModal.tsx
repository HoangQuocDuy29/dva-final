import React from 'react';
import { X } from 'lucide-react';
import { ManagedUserRole, MANAGED_USER_ROLES } from '../../../../types';

export interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userForm: {
    name: string;
    email: string;
    password: string;
    role: ManagedUserRole;
  };
  setUserForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      email: string;
      password: string;
      role: ManagedUserRole;
    }>
  >;
  userFormError: string | null;
  isSavingUser: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  userForm,
  setUserForm,
  userFormError,
  isSavingUser,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <form
        onSubmit={onSubmit}
        className="w-[95%] sm:w-full max-w-md bg-[#0F1727] border border-slate-700 rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-black text-white">Tạo Tài Khoản Mới</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {userFormError && (
          <div className="bg-red-950/70 border border-red-500/60 text-red-200 text-xs px-3 py-2 rounded-xl">
            {userFormError}
          </div>
        )}

        {(
          [
            { key: 'name', label: 'Tên', type: 'text', autoComplete: 'name' },
            { key: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
            {
              key: 'password',
              label: 'Mật khẩu (tối thiểu 8 ký tự)',
              type: 'password',
              autoComplete: 'new-password',
            },
          ] as const
        ).map((f) => (
          <label key={f.key} className="block space-y-1">
            <span className="text-[11px] font-bold text-slate-400">{f.label}</span>
            <input
              type={f.type}
              name={f.key}
              id={`user-form-${f.key}`}
              required
              value={userForm[f.key]}
              onChange={(e) => setUserForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              autoComplete={f.autoComplete}
              className="w-full bg-[#0B1220] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
          </label>
        ))}

        <label className="block space-y-1">
          <span className="text-[11px] font-bold text-slate-400">Role</span>
          <select
            value={userForm.role}
            onChange={(e) =>
              setUserForm((prev) => ({ ...prev, role: e.target.value as ManagedUserRole }))
            }
            className="w-full bg-[#0B1220] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white cursor-pointer"
          >
            {MANAGED_USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSavingUser}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
          >
            {isSavingUser ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>
    </div>
  );
};
