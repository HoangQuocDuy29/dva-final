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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <form
        onSubmit={onSubmit}
        className="w-[95%] sm:w-full max-w-md dva-glass-modal shadow-[0_24px_64px_rgba(0,0,0,0.8)] p-5 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto no-scrollbar"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-base font-black text-white">Tạo Tài Khoản Mới</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors duration-150"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {userFormError && (
          <div className="bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs px-3.5 py-2 rounded-2xl">
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
            <span className="text-[11px] font-bold text-slate-300">{f.label}</span>
            <input
              type={f.type}
              name={f.key}
              id={`user-form-${f.key}`}
              required
              value={userForm[f.key]}
              onChange={(e) => setUserForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              autoComplete={f.autoComplete}
              className="w-full dva-glass-input px-3.5 py-2 text-xs"
            />
          </label>
        ))}

        <label className="block space-y-1">
          <span className="text-[11px] font-bold text-slate-300">Role</span>
          <select
            value={userForm.role}
            onChange={(e) =>
              setUserForm((prev) => ({ ...prev, role: e.target.value as ManagedUserRole }))
            }
            className="w-full dva-glass-input px-3.5 py-2 text-xs cursor-pointer [color-scheme:dark]"
          >
            {MANAGED_USER_ROLES.map((r) => (
              <option className="bg-[#0E1118] text-white" key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/12 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors duration-150"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSavingUser}
            className="h-9 px-5 rounded-full bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] hover:brightness-110 text-white text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(249,115,22,0.3)] disabled:opacity-60 cursor-pointer transition-colors duration-150"
          >
            {isSavingUser ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>
    </div>
  );
};
