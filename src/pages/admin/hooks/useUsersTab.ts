import React, { useState, useEffect, useCallback } from 'react';
import { User as UserType, ManagedUserRole } from '../../../types';
import { userService } from '../../../services/api';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { createDefaultUserForm } from '../constants';

export function useUsersTab() {
  const { isSuperAdmin, notify } = useAdminDashboard();

  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<{
    name: string;
    email: string;
    password: string;
    role: ManagedUserRole;
  }>(createDefaultUserForm);

  const loadUsers = useCallback(async () => {
    try {
      setUsersList(await userService.getUsers());
    } catch (err: any) {
      notify(err?.message || 'Không tải được danh sách tài khoản.', 3500);
    }
  }, [notify]);

  useEffect(() => {
    if (isSuperAdmin) loadUsers();
  }, [isSuperAdmin, loadUsers]);

  const openCreateUserModal = () => {
    setUserForm(createDefaultUserForm());
    setUserFormError(null);
    setIsUserModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError(null);
    if (userForm.name.trim().length < 2) return setUserFormError('Tên phải có ít nhất 2 ký tự.');
    if (!/^\S+@\S+\.\S+$/.test(userForm.email.trim())) return setUserFormError('Email không hợp lệ.');
    if (userForm.password.length < 8) return setUserFormError('Mật khẩu phải có ít nhất 8 ký tự.');
    setIsSavingUser(true);
    try {
      const created = await userService.createUser({
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        password: userForm.password,
        role: userForm.role,
      });
      setUsersList((prev) => [created, ...prev]);
      setIsUserModalOpen(false);
      notify(`Đã tạo tài khoản ${created.email} (${created.role}).`, 3500);
    } catch (err: any) {
      setUserFormError(err?.message || 'Không thể tạo tài khoản.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleChangeUserRole = async (user: UserType, role: ManagedUserRole) => {
    if (role === user.role) return;
    try {
      const updated = await userService.updateUserRole(user.id, role);
      setUsersList((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
      notify(`Đã đổi quyền ${user.email} thành ${role}.`, 3500);
    } catch (err: any) {
      notify(err?.message || 'Không thể cập nhật quyền.', 3500);
    }
  };

  const handleDeleteUser = async (user: UserType) => {
    if (!window.confirm(`Xóa tài khoản ${user.email}? Hành động này không thể hoàn tác.`)) return;
    try {
      await userService.deleteUser(user.id);
      setUsersList((prev) => prev.filter((u) => u.id !== user.id));
      notify(`Đã xóa tài khoản ${user.email}.`, 3500);
    } catch (err: any) {
      notify(err?.message || 'Không thể xóa tài khoản.', 3500);
    }
  };

  return {
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
  };
}
