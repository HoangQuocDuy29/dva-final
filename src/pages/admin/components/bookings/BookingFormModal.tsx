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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-[95%] sm:w-full max-w-lg md:max-w-2xl bg-[#161F30] rounded-2xl sm:rounded-3xl border border-slate-700 p-4 sm:p-6 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
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
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
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
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
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
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
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
              className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
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
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-semibold"
              >
                {courtsList.map((court) => (
                  <option key={court.id} value={court.id}>
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
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-semibold"
                >
                  <option value="Sân A">Sân A (Court A)</option>
                  <option value="Sân B">Sân B (Court B)</option>
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
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono cursor-pointer"
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
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
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
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
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
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
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
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono text-orange-400 font-bold"
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
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-semibold"
              >
                <option value="PAID">PAID (Đã thanh toán / Giữ sân)</option>
                <option value="PENDING">
                  PENDING (Chờ chuyển khoản VietQR)
                </option>
                <option value="CANCELLED">
                  CANCELLED (Đã hủy / Mở lại ca)
                </option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 rounded-xl text-white font-bold cursor-pointer hover:brightness-110 shadow-lg"
            >
              {editingBooking ? 'Lưu Thay Đổi' : 'Tạo Đơn Đặt Sân'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
