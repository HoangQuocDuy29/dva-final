import React from 'react';
import { X } from 'lucide-react';
import { Booking, Court } from '../../../../types';

export interface BookingFormModalProps {
  isOpen: boolean;
  editingBooking: Booking | null;
  bookingForm: Partial<Booking>;
  setBookingForm: React.Dispatch<React.SetStateAction<Partial<Booking>>>;
  courtsList: Court[];
  selectedManageDate: string;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const BookingFormModal: React.FC<BookingFormModalProps> = ({
  isOpen,
  editingBooking,
  bookingForm,
  setBookingForm,
  courtsList,
  selectedManageDate,
  onSave,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="dva-glass-modal w-full max-w-full sm:max-w-lg md:max-w-2xl p-4 sm:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.8)] text-white space-y-4 max-h-[90dvh] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div>
            <h3 className="font-heading font-black text-lg text-white">
              {editingBooking
                ? `Chỉnh Sửa Đặt Sân: ${editingBooking.bookingCode}`
                : 'Tạo Đặt Sân Thủ Công'}
            </h3>
            <p className="text-xs text-slate-400">
              {editingBooking
                ? 'Cập nhật thông tin khách, khung giờ hoặc trạng thái thanh toán.'
                : 'Tạo đơn đặt giữ sân cho khách đặt trực tiếp hoặc qua hotline/Zalo.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 flex items-center justify-center text-slate-300 hover:text-white transition-colors duration-150 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Họ tên khách hàng *
              </label>
              <input
                type="text"
                required
                value={bookingForm.customerName || ''}
                onChange={(e) =>
                  setBookingForm({
                    ...bookingForm,
                    customerName: e.target.value,
                  })
                }
                placeholder="VD: Nguyễn Văn Nam"
                className="dva-glass-input w-full px-3.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Số điện thoại *
              </label>
              <input
                type="tel"
                required
                value={bookingForm.customerPhone || ''}
                onChange={(e) =>
                  setBookingForm({
                    ...bookingForm,
                    customerPhone: e.target.value,
                  })
                }
                placeholder="VD: 0768299329"
                className="dva-glass-input w-full px-3.5 py-2 text-xs font-mono tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Email
            </label>
            <input
              type="email"
              value={bookingForm.customerEmail || ''}
              onChange={(e) =>
                setBookingForm({
                  ...bookingForm,
                  customerEmail: e.target.value,
                })
              }
              placeholder="VD: customer@gmail.com"
              className="dva-glass-input w-full px-3.5 py-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Chọn Sân *
              </label>
              <select
                value={bookingForm.courtId || 'court-btl'}
                onChange={(e) => {
                  const courtId = e.target.value;
                  const court = courtsList.find((c) => c.id === courtId);
                  const hasSubs =
                    (court?.subCourts && court.subCourts.length > 0) ||
                    courtId === 'court-btl' ||
                    court?.code === 'BTL_TT';
                  setBookingForm({
                    ...bookingForm,
                    courtId,
                    courtName: court?.name || 'Sân Bóng Chuyền',
                    subCourt: hasSubs
                      ? bookingForm.subCourt || 'Sân A'
                      : undefined,
                  });
                }}
                className="dva-glass-input w-full px-3.5 py-2 text-xs font-semibold [color-scheme:dark]"
              >
                {courtsList.map((court) => (
                  <option key={court.id} value={court.id} className="bg-[#0E1118] text-white">
                    {court.name}
                  </option>
                ))}
              </select>
            </div>

            {(bookingForm.courtId === 'court-btl' ||
              courtsList.find((c) => c.id === bookingForm.courtId)?.subCourts
                ?.length) && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Sân Con (Sub-court) *
                </label>
                <select
                  value={bookingForm.subCourt || 'Sân A'}
                  onChange={(e) =>
                    setBookingForm({
                      ...bookingForm,
                      subCourt: e.target.value,
                    })
                  }
                  className="dva-glass-input w-full px-3.5 py-2 text-xs font-semibold [color-scheme:dark]"
                >
                  <option value="Sân A" className="bg-[#0E1118] text-white">Sân A (Court A)</option>
                  <option value="Sân B" className="bg-[#0E1118] text-white">Sân B (Court B)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Ngày Thuê (YYYY-MM-DD) *
              </label>
              <input
                type="date"
                required
                value={bookingForm.bookingDate || selectedManageDate}
                onChange={(e) =>
                  setBookingForm({
                    ...bookingForm,
                    bookingDate: e.target.value,
                  })
                }
                className="dva-glass-input w-full px-3.5 py-2 text-xs font-mono tabular-nums cursor-pointer [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Bắt đầu *
              </label>
              <input
                type="text"
                required
                value={bookingForm.startTime || '17:30'}
                onChange={(e) =>
                  setBookingForm({ ...bookingForm, startTime: e.target.value })
                }
                placeholder="17:30"
                className="dva-glass-input w-full px-3.5 py-2 text-xs font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Kết thúc *
              </label>
              <input
                type="text"
                required
                value={bookingForm.endTime || '19:30'}
                onChange={(e) =>
                  setBookingForm({ ...bookingForm, endTime: e.target.value })
                }
                placeholder="19:30"
                className="dva-glass-input w-full px-3.5 py-2 text-xs font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Tổng giờ
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                value={bookingForm.totalHours || 2}
                onChange={(e) =>
                  setBookingForm({
                    ...bookingForm,
                    totalHours: Number(e.target.value),
                  })
                }
                className="dva-glass-input w-full px-3.5 py-2 text-xs font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Tổng tiền (VNĐ) *
              </label>
              <input
                type="number"
                required
                step="50000"
                value={bookingForm.totalPrice || 1000000}
                onChange={(e) =>
                  setBookingForm({
                    ...bookingForm,
                    totalPrice: Number(e.target.value),
                  })
                }
                className="dva-glass-input w-full px-3.5 py-2 text-xs font-mono tabular-nums !text-orange-400 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Trạng thái thanh toán *
              </label>
              <select
                value={bookingForm.paymentStatus || 'PAID'}
                onChange={(e) =>
                  setBookingForm({
                    ...bookingForm,
                    paymentStatus: e.target.value as any,
                  })
                }
                className="dva-glass-input w-full px-3.5 py-2 text-xs font-semibold [color-scheme:dark]"
              >
                <option value="PAID" className="bg-[#0E1118] text-white">PAID (Đã thanh toán / Giữ sân)</option>
                <option value="PENDING" className="bg-[#0E1118] text-white">
                  PENDING (Chờ chuyển khoản VietQR)
                </option>
                <option value="CANCELLED" className="bg-[#0E1118] text-white">
                  CANCELLED (Đã hủy / Mở lại ca)
                </option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/12 text-slate-300 hover:text-white font-bold cursor-pointer transition-colors duration-150"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="h-9 px-5 bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] rounded-full text-white font-bold cursor-pointer hover:brightness-110 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(249,115,22,0.3)] transition-colors duration-150"
            >
              {editingBooking ? 'Lưu Thay Đổi' : 'Tạo Đơn Đặt Sân'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
