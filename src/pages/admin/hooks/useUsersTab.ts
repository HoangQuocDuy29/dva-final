import React, { useState, useEffect, useCallback } from 'react';
import { User as UserType, ManagedUserRole } from '../../../types';
import { authService, userService } from '../../../services/api';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { createDefaultUserForm } from '../constants';

export function useUsersTab() {
  const { currentUser, isSuperAdmin, onUserChange, notify } = useAdminDashboard();

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

  // Reset staff password modal state (SUPERADMIN only)
  const [resetTargetUser, setResetTargetUser] = useState<UserType | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);

  // Edit staff profile & avatar modal state
  const [editingProfileUser, setEditingProfileUser] = useState<UserType | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

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

  // Keep current user's row synced immediately when avatar/name is updated from AdminHeader
  useEffect(() => {
    setUsersList((prev) =>
      prev.map((u) =>
        u.id === currentUser.id
          ? { ...u, fullName: currentUser.fullName, avatarUrl: currentUser.avatarUrl }
          : u
      )
    );
  }, [currentUser.id, currentUser.fullName, currentUser.avatarUrl]);

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
    setBusyUserId(user.id);
    try {
      const res = await userService.updateStaff(user.id, { role });
      setUsersList((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...res.user } : u)));
      notify(`Đã đổi quyền ${user.email} thành ${role}.`, 3500);
    } catch (err: any) {
      notify(err?.message || 'Không thể cập nhật quyền.', 3500);
    } finally {
      setBusyUserId(null);
    }
  };

  const handleToggleUserActive = async (user: UserType) => {
    const currentlyActive = user.isActive !== false;
    const nextActive = !currentlyActive;
    if (
      !nextActive &&
      !window.confirm(
        `Tạm khóa tài khoản ${user.email}? Tài khoản này sẽ bị đăng xuất ngay lập tức khỏi mọi thiết bị.`
      )
    ) {
      return;
    }

    setBusyUserId(user.id);
    try {
      const res = await userService.updateStaff(user.id, { isActive: nextActive });
      setUsersList((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...res.user } : u)));
      notify(
        nextActive
          ? `Đã mở khóa tài khoản ${user.email}.`
          : `Đã tạm khóa ${user.email} và đăng xuất toàn bộ phiên cũ.`,
        4000
      );
    } catch (err: any) {
      notify(err?.message || 'Không thể thay đổi trạng thái tài khoản.', 3500);
    } finally {
      setBusyUserId(null);
    }
  };

  const handleForceLogoutUser = async (user: UserType) => {
    if (
      !window.confirm(
        `Đăng xuất toàn bộ thiết bị đang dùng tài khoản ${user.email}? Nhân sự sẽ phải đăng nhập lại.`
      )
    ) {
      return;
    }

    setBusyUserId(user.id);
    try {
      const res = await userService.updateStaff(user.id, { forceLogout: true });
      if (res.user) {
        setUsersList((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...res.user } : u)));
      }
      notify(`Đã Force Logout toàn bộ phiên đăng nhập của ${user.email}.`, 4000);
    } catch (err: any) {
      notify(err?.message || 'Không thể thực hiện Force Logout.', 3500);
    } finally {
      setBusyUserId(null);
    }
  };

  const openEditProfileModal = (user: UserType) => {
    setEditingProfileUser(user);
  };

  const closeEditProfileModal = () => {
    setEditingProfileUser(null);
  };

  const handleSaveStaffProfile = async (payload: { fullName: string; avatarUrl: string; email?: string }) => {
    if (!editingProfileUser) return;
    const target = editingProfileUser;
    const res =
      target.id === currentUser.id
        ? await authService.updateProfile({ fullName: payload.fullName, avatarUrl: payload.avatarUrl })
        : await userService.updateStaff(target.id, payload);

    if (res.user) {
      setUsersList((prev) => prev.map((u) => (u.id === target.id ? { ...u, ...res.user } : u)));
      if (target.id === currentUser.id && onUserChange) {
        onUserChange(res.user);
      }
    }
    notify(`Đã cập nhật tài khoản cho ${res.user?.email || target.email}.`, 3500);
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

  const openResetPasswordModal = (user: UserType) => {
    setResetPasswordError(null);
    setResetTargetUser(user);
  };

  const closeResetPasswordModal = () => {
    if (isResettingPassword) return;
    setResetTargetUser(null);
    setResetPasswordError(null);
  };

  const handleResetUserPassword = async (
    targetUser: UserType,
    newPassword: string
  ): Promise<boolean> => {
    setResetPasswordError(null);
    setIsResettingPassword(true);
    try {
      const res = await userService.resetPassword(targetUser.id, newPassword);
      if (res.user) {
        setUsersList((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, ...res.user } : u)));
      }
      notify(
        `Đã đặt lại mật khẩu cho ${targetUser.email} và đăng xuất toàn bộ phiên cũ.`,
        4500
      );
      return true;
    } catch (err: any) {
      setResetPasswordError(err?.message || 'Không thể đặt lại mật khẩu.');
      return false;
    } finally {
      setIsResettingPassword(false);
    }
  };

  return {
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
  };
}
