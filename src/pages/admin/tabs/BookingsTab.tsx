import React, { useState } from 'react';
import { Calendar, Plus, Edit3, Trash2 } from 'lucide-react';
import { Booking } from '../../../types';
import { bookingService } from '../../../services/api';
import { Pagination } from '../../../components/common/Pagination';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { BookingFormModal } from '../components/bookings/BookingFormModal';
import { SlowServerPill } from '../../../components/common/GlassLoading';

const BOOKINGS_PAGE_SIZE = 10;

export const BookingsTab: React.FC = () => {
  const {
    setActiveModule,
    setFeedback,
    data: { bookings, courtsList, loadedScopes },
    setData: { setBookings },
    courtSelection: {
      selectedManageCourtId,
      adminSelectedSubCourt,
      selectedManageDate,
    },
  } = useAdminDashboard();

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
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

  const safePage = Math.min(
    Math.max(1, currentPage),
    Math.max(1, Math.ceil(bookings.length / BOOKINGS_PAGE_SIZE))
  );
  const paginatedBookings = bookings.slice(
    (safePage - 1) * BOOKINGS_PAGE_SIZE,
    safePage * BOOKINGS_PAGE_SIZE
  );

  const isBookingsLoaded = loadedScopes.has('BOOKINGS');

  return (
    <>
      <div className="dva-glass-panel rounded-3xl p-4 sm:p-6 space-y-4 dva-content-reveal">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-bold text-base text-white">
              Court Reservations & VietQR Payment Approvals
            </h3>
            <p className="text-xs text-slate-400">
              Kiểm tra giao dịch MB Bank (0002090671521, HOANG QUOC DUY), quản lý CRUD đơn đặt sân và mở lại ca khi khách hủy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveModule('COURTS')}
              className="h-9 px-3.5 bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 hover:text-white font-bold text-xs rounded-full inline-flex items-center gap-1.5 border border-white/12 cursor-pointer transition-colors duration-150"
            >
              <Calendar className="w-4 h-4 text-orange-400" />
              <span>Xem Lịch Ca Sân Trực Quan</span>
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
              className="h-9 px-4 bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] hover:brightness-110 text-white font-bold text-xs rounded-full inline-flex items-center gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(249,115,22,0.3)] cursor-pointer shrink-0 transition-colors duration-150"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Đặt Sân Thủ Công</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 no-scrollbar">
          <table className="w-full min-w-[740px] text-xs text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.04] text-slate-300 font-bold border-b border-white/10">
                <th className="py-3 px-3">Booking Code / Date</th>
                <th className="py-3 px-3">Court / Slot</th>
                <th className="py-3 px-3">Customer Contact</th>
                <th className="py-3 px-3">Add-ons</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.07] text-slate-300">
              {!isBookingsLoaded ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`sk-${idx}`}>
                    <td colSpan={7} className="py-3 px-3">
                      <div className="dva-skeleton p-3.5 rounded-2xl flex items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="dva-skeleton-bar h-3.5 w-44" />
                          <div className="dva-skeleton-bar h-2.5 w-56 max-w-full" />
                        </div>
                        <div className="dva-skeleton-bar h-7 w-24 rounded-full shrink-0" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : paginatedBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Chưa có đơn đặt sân nào.
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((b) => (
                <tr key={b.id} className="hover:bg-white/[0.035] transition-colors duration-150">
                  <td className="py-3 px-3 font-mono tabular-nums">
                    <span className="font-bold text-white block">
                      {b.bookingCode}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {b.bookingDate}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-white block">
                        {b.courtName}
                      </span>
                      {b.subCourt && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-500/15 text-orange-300 border border-orange-500/35">
                          {b.subCourt}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {b.startTime} - {b.endTime} ({b.totalHours}h)
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-semibold text-white block">
                      {b.customerName}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
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

                  <td className="py-3 px-3 font-mono font-bold tabular-nums text-orange-400 text-xs whitespace-nowrap">
                    {b.totalPrice.toLocaleString('vi-VN')} đ
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block ${
                        b.paymentStatus === 'PAID'
                          ? 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30'
                          : b.paymentStatus === 'CANCELLED'
                          ? 'bg-white/[0.05] text-slate-400 border-white/10'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/35'
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
                            className="h-8 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 font-bold text-[11px] rounded-full transition-colors duration-150 cursor-pointer whitespace-nowrap"
                          >
                            Approve Paid
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBookingStatus(b.id, 'CANCELLED')
                            }
                            className="h-8 px-3 bg-white/[0.05] hover:bg-white/[0.1] border border-white/12 text-slate-300 hover:text-white text-[11px] rounded-full transition-colors duration-150 cursor-pointer"
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
                        className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/12 flex items-center justify-center text-slate-300 hover:bg-orange-500/15 hover:border-orange-500/35 hover:text-orange-300 cursor-pointer transition-colors duration-150 shrink-0"
                        title="Chỉnh sửa thông tin đặt sân"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBooking(b.id, b.bookingCode)}
                        className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/12 flex items-center justify-center text-slate-400 hover:bg-rose-500/15 hover:border-rose-500/35 hover:text-rose-300 cursor-pointer transition-colors duration-150 shrink-0"
                        title="Xóa đơn đặt sân"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
        {!isBookingsLoaded && <SlowServerPill active />}
        <Pagination
          currentPage={safePage}
          totalItems={bookings.length}
          pageSize={BOOKINGS_PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="bookings"
        />
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
