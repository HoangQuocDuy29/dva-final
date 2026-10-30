import React, { useState } from 'react';
import { Send, X, AlertCircle, Loader2 } from 'lucide-react';
import { GuestSessionPayload } from '../../../types';
import { adminService } from '../../../services/api';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { createDefaultGuestForm } from '../constants';

export const GuestSessionEmailModal: React.FC = () => {
  const {
    isGuestModalOpen,
    closeGuestModal,
    guestModalError,
    setGuestModalError,
    notify,
  } = useAdminDashboard();

  const [isSendingGuestMail, setIsSendingGuestMail] = useState(false);
  const [guestForm, setGuestForm] = useState<GuestSessionPayload>(createDefaultGuestForm);

  const handleSendGuestSessionEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestModalError(null);

    const emailTrim = guestForm.guestEmail.trim();
    if (!emailTrim || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setGuestModalError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (!guestForm.fullName.trim() || guestForm.fullName.trim().length < 2) {
      setGuestModalError('Họ và tên khách hàng phải có ít nhất 2 ký tự.');
      return;
    }
    if (!guestForm.phone.trim() || guestForm.phone.trim().length < 8) {
      setGuestModalError('Số điện thoại không hợp lệ (tối thiểu 8 chữ số).');
      return;
    }
    if (!guestForm.sessionDate) {
      setGuestModalError('Vui lòng chọn ngày diễn ra session.');
      return;
    }
    if (!guestForm.sessionTime.trim()) {
      setGuestModalError('Vui lòng nhập hoặc chọn khung giờ session.');
      return;
    }
    const parsedAmount = Number(guestForm.amount);
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setGuestModalError('Mức phí giữ chỗ không hợp lệ.');
      return;
    }

    setIsSendingGuestMail(true);
    try {
      await adminService.sendGuestSessionEmail({
        ...guestForm,
        guestEmail: emailTrim.toLowerCase(),
        fullName: guestForm.fullName.trim(),
        phone: guestForm.phone.trim(),
        height:
          guestForm.height !== '' && guestForm.height !== undefined
            ? Number(guestForm.height)
            : undefined,
        weight:
          guestForm.weight !== '' && guestForm.weight !== undefined
            ? Number(guestForm.weight)
            : undefined,
        amount: parsedAmount,
        courtAddress: guestForm.courtAddress?.trim() || '155 Trường Chinh, Thanh Xuân, Hà Nội',
        notes: guestForm.notes?.trim() || undefined,
      });

      closeGuestModal();
      setGuestForm(createDefaultGuestForm());
      notify('Đã gửi email thông tin session cho khách vãng lai thành công!', 3500);
    } catch (err: any) {
      setGuestModalError(err?.message || 'Không thể gửi email. Vui lòng kiểm tra lại cấu hình.');
    } finally {
      setIsSendingGuestMail(false);
    }
  };

  if (!isGuestModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-[#111827] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative my-8 text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow font-bold">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                Gửi Thông Tin Session Cho Khách Vãng Lai
              </h3>
              <p className="text-xs text-slate-400">
                Hệ thống sẽ gửi email song ngữ kèm mã VietQR tự động và hướng dẫn đường đi tới hòm thư của khách.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeGuestModal}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {guestModalError && (
          <div className="mb-4 bg-red-950/80 border border-red-500/60 text-red-200 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{guestModalError}</span>
          </div>
        )}

        <form onSubmit={handleSendGuestSessionEmail} className="space-y-4">
          {/* Họ tên & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Họ và tên khách <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Nguyễn Văn A"
                value={guestForm.fullName}
                onChange={(e) => setGuestForm({ ...guestForm, fullName: e.target.value })}
                className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Email nhận thông tin <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="VD: nguyenvana@gmail.com"
                value={guestForm.guestEmail}
                onChange={(e) => setGuestForm({ ...guestForm, guestEmail: e.target.value })}
                className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* SĐT & Chiều cao/Cân nặng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Số điện thoại / Zalo <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="VD: 0912345678"
                value={guestForm.phone}
                onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
                className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 placeholder:text-slate-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Chiều cao (cm)
                </label>
                <input
                  type="number"
                  placeholder="180"
                  value={guestForm.height}
                  onChange={(e) => setGuestForm({ ...guestForm, height: e.target.value })}
                  className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Cân nặng (kg)
                </label>
                <input
                  type="number"
                  placeholder="72"
                  value={guestForm.weight}
                  onChange={(e) => setGuestForm({ ...guestForm, weight: e.target.value })}
                  className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Vị trí thi đấu, Đặc quyền vị trí, Cấp độ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Vị trí thi đấu <span className="text-red-400">*</span>
              </label>
              <select
                value={guestForm.position}
                onChange={(e) => setGuestForm({ ...guestForm, position: e.target.value })}
                className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="OH">OH (Chủ công - Outside Hitter)</option>
                <option value="MB">MB (Phụ công - Middle Blocker)</option>
                <option value="OP">OP (Đối chuyền - Opposite)</option>
                <option value="S">S (Chuyền hai - Setter)</option>
                <option value="L">L (Libero - Chuyên thủ)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Đặc quyền vị trí <span className="text-red-400">*</span>
              </label>
              <select
                value={guestForm.positionPrivilege}
                onChange={(e) => setGuestForm({ ...guestForm, positionPrivilege: e.target.value })}
                className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="FIXED">Cố định vị trí (Fixed)</option>
                <option value="RANDOM">Xoay vòng vị trí (Random)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Cấp độ thi đấu <span className="text-red-400">*</span>
              </label>
              <select
                value={guestForm.level}
                onChange={(e) => setGuestForm({ ...guestForm, level: e.target.value })}
                className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="Junior">Junior (Bán chuyên / Intermediate)</option>
                <option value="Senior">Senior (Đội 1 / Advanced)</option>
                <option value="Youth">Youth (Tuyến trẻ / Development)</option>
                <option value="All Levels">All Levels (Mọi cấp độ)</option>
              </select>
            </div>
          </div>

          {/* Ngày thi đấu & Khung giờ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Ngày thi đấu <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={guestForm.sessionDate}
                onChange={(e) => setGuestForm({ ...guestForm, sessionDate: e.target.value })}
                className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Khung giờ tập <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="19:00 - 21:30"
                value={guestForm.sessionTime}
                onChange={(e) => setGuestForm({ ...guestForm, sessionTime: e.target.value })}
                className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 placeholder:text-slate-500 mb-1.5"
              />
              <div className="flex flex-wrap gap-1.5">
                {['19:00 - 21:30', '14:00 - 16:30', '17:00 - 19:00'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setGuestForm({ ...guestForm, sessionTime: preset })}
                    className={`text-[10px] px-2 py-0.5 rounded-lg border cursor-pointer transition-colors ${
                      guestForm.sessionTime === preset
                        ? 'bg-purple-900/60 border-purple-500 text-purple-200 font-bold'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Địa chỉ sân */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Địa chỉ sân thi đấu
            </label>
            <input
              type="text"
              placeholder="155 Trường Chinh, Thanh Xuân, Hà Nội"
              value={guestForm.courtAddress}
              onChange={(e) => setGuestForm({ ...guestForm, courtAddress: e.target.value })}
              className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 placeholder:text-slate-500"
            />
          </div>

          {/* Phí giữ chỗ & Quick presets */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Mức phí giữ chỗ (VNĐ) <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="number"
                required
                min={0}
                step={10000}
                value={guestForm.amount}
                onChange={(e) => setGuestForm({ ...guestForm, amount: Number(e.target.value) })}
                className="flex-1 bg-[#161F30] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-bold font-mono focus:outline-none focus:border-purple-500"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                {[60000, 70000, 150000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setGuestForm({ ...guestForm, amount: amt })}
                    className={`text-xs px-3 py-2 rounded-xl border cursor-pointer transition-colors font-mono ${
                      Number(guestForm.amount) === amt
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {amt.toLocaleString('vi-VN')}đ
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ghi chú thêm */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Ghi chú thêm (Tùy chọn)
            </label>
            <textarea
              rows={2}
              placeholder="Ghi chú về đồ tập, cọc bóng, yêu cầu riêng..."
              value={guestForm.notes}
              onChange={(e) => setGuestForm({ ...guestForm, notes: e.target.value })}
              className="w-full bg-[#161F30] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500 placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              disabled={isSendingGuestMail}
              onClick={closeGuestModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSendingGuestMail}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-purple-950/40 disabled:opacity-50 cursor-pointer transition-all"
            >
              {isSendingGuestMail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
                  <span>Đang phát hành email...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Phát Email Thông Tin Cho Khách</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
