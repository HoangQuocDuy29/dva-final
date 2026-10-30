import React, { useState } from 'react';
import { Calendar, Send, Plus, Edit3, Trash2 } from 'lucide-react';
import { Booking } from '../../../types';
import { bookingService } from '../../../services/api';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { BookingFormModal } from '../components/bookings/BookingFormModal';

export const BookingsTab: React.FC = () => {
  const {
    setActiveModule,
    setFeedback,
    data: { bookings, courtsList },
    setData: { setBookings },
    courtSelection: {
      selectedManageCourtId,
      adminSelectedSubCourt,
      selectedManageDate,
    },
    setIsGuestModalOpen,
    setGuestModalError,
  } = useAdminDashboard();

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [bookingForm, setBookingForm] = useState<Partial<Booking>>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    courtId: 'court-btl',
    courtName: 'Sân Thể Công (Court 1)',
    bookingDate: new Date().toISOString().split('T')[0],
    startTime: '17:30',
    endTime: '19:30',
    totalHours: 2,
    totalPrice: 1000000,
    paymentStatus: 'PAID',
  });

  const handleUpdateBookingStatus = async (
    bookingId: string,
    status: 'PAID' | 'CANCELLED'
  ) => {
    try {
      await bookingService.updateStatus(bookingId, status);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, paymentStatus: status } : b
        )
      );
      setFeedback(
        `Booking updated to ${status} and synced to Google Sheets Court_Bookings.`
      );
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      alert('Error updating booking status');
    }
  };

  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBooking) {
        const updated = await bookingService.updateBooking(
          editingBooking.id,
          bookingForm
        );
        setBookings((prev) =>
          prev.map((b) =>
            b.id === editingBooking.id ? { ...b, ...updated } : b
          )
        );
        setFeedback(`Đã cập nhật đặt chỗ thành công!`);
      } else {
        const created = await bookingService.createBooking({
          ...bookingForm,
          courtId: bookingForm.courtId || 'court-btl',
          courtName:
            bookingForm.courtName ||
            courtsList.find((c) => c.id === bookingForm.courtId)?.name ||
            'Sân Thể Công (Court 1)',
          bookingDate:
            bookingForm.bookingDate || new Date().toISOString().split('T')[0],
          startTime: bookingForm.startTime || '17:30',
          endTime: bookingForm.endTime || '19:30',
          totalHours: bookingForm.totalHours || 2,
          totalPrice: bookingForm.totalPrice || 1000000,
          customerName: bookingForm.customerName || 'Khách Đặt Tại Sân',
          customerPhone: bookingForm.customerPhone || '0768299329',
          customerEmail: bookingForm.customerEmail || 'booking@dva.vn',
          addons: {
            mikasaBallCrate: false,
            mineralWaterBottles: 0,
            certifiedReferee: false,
          },
        });
        setBookings((prev) => [created, ...prev]);
        setFeedback(`Đã thêm đặt chỗ thủ công mới thành công!`);
      }
      setIsBookingModalOpen(false);
      setEditingBooking(null);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      alert('Lỗi lưu đơn đặt chỗ');
    }
  };

  const handleDeleteBooking = async (id: string, code: string) => {
    if (
      !window.confirm(
        `Xóa đơn đặt chỗ ${code}? Khung giờ này sẽ được giải phóng.`
      )
    )
      return;
    try {
      await bookingService.deleteBooking(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
      setFeedback(`Đã xóa đơn đặt chỗ ${code}.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      alert('Lỗi xóa đơn đặt chỗ');
    }
  };

  return (
    <>
      <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-base text-white">
              Court Reservations & VietQR Payment Approvals
            </h3>
            <p className="text-xs text-slate-400">
              Kiểm tra giao dịch MB Bank (0002090671521, HOANG QUOC DUY), quản lý CRUD đơn đặt sân và mở lại ca khi khách hủy.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveModule('COURTS')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-orange-400" />
              <span>Xem Lịch Ca Sân Trực Quan</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setGuestModalError(null);
                setIsGuestModalOpen(true);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Gửi Mail Khách Vãng Lai</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingBooking(null);
                setBookingForm({
                  customerName: '',
                  customerPhone: '',
                  customerEmail: '',
                  courtId: selectedManageCourtId,
                  courtName:
                    courtsList.find((c) => c.id === selectedManageCourtId)
                      ?.name || 'BTL Thong Tin court',
                  subCourt:
                    selectedManageCourtId === 'court-btl'
                      ? adminSelectedSubCourt
                      : undefined,
                  bookingDate: selectedManageDate,
                  startTime: '17:30',
                  endTime: '19:30',
                  totalHours: 2,
                  totalPrice: 1000000,
                  paymentStatus: 'PAID',
                });
                setIsBookingModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Đặt Sân Thủ Công</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[720px] text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#0E1524] text-slate-400 font-bold border-b border-slate-800">
                <th className="py-3 px-3">Booking Code / Date</th>
                <th className="py-3 px-3">Court / Slot</th>
                <th className="py-3 px-3">Customer Contact</th>
                <th className="py-3 px-3">Add-ons</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-mono">
                    <span className="font-bold text-white block">
                      {b.bookingCode}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {b.bookingDate}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-white block">
                        {b.courtName}
                      </span>
                      {b.subCourt && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-orange-950 text-orange-300 border border-orange-800">
                          {b.subCourt}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {b.startTime} - {b.endTime} ({b.totalHours}h)
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-semibold text-white block">
                      {b.customerName}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {b.customerPhone}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-[11px]">
                    {b.addons.mineralWaterBottles > 0 && (
                      <div>• {b.addons.mineralWaterBottles} bottles</div>
                    )}
                    {b.addons.mikasaBallCrate && <div>• Ball Crate</div>}
                    {b.addons.certifiedReferee && (
                      <div className="text-orange-400">• Referee</div>
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono font-bold text-orange-400 text-xs">
                    {b.totalPrice.toLocaleString('vi-VN')} đ
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.paymentStatus === 'PAID'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : b.paymentStatus === 'CANCELLED'
                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {b.paymentStatus}
                    </span>
                    {b.paymentStatus === 'PENDING' && b.customerConfirmedAt && (
                      <span className="block mt-1 text-[10px] font-semibold text-cyan-300">
                        ✓ Khách báo đã CK
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {b.paymentStatus === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBookingStatus(b.id, 'PAID')
                            }
                            className="min-h-[40px] px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                          >
                            Approve Paid
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBookingStatus(b.id, 'CANCELLED')
                            }
                            className="min-h-[40px] px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-xl transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBooking(b);
                          setBookingForm(b);
                          setIsBookingModalOpen(true);
                        }}
                        className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-300 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 cursor-pointer transition-colors"
                        title="Chỉnh sửa thông tin đặt sân"
                      >
                        <Edit3 className="w-4 h-4 text-orange-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBooking(b.id, b.bookingCode)}
                        className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-red-300 rounded-xl bg-slate-800/80 hover:bg-red-950/80 cursor-pointer transition-colors"
                        title="Xóa đơn đặt sân"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BookingFormModal
        isOpen={isBookingModalOpen}
        editingBooking={editingBooking}
        bookingForm={bookingForm}
        setBookingForm={setBookingForm}
        courtsList={courtsList}
        selectedManageDate={selectedManageDate}
        onSave={handleSaveBooking}
        onClose={() => {
          setIsBookingModalOpen(false);
          setEditingBooking(null);
        }}
      />
    </>
  );
};
