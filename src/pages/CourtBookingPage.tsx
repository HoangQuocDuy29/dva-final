import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ShieldCheck, 
  Check, 
  CreditCard, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Droplet, 
  Flame, 
  UserCheck,
  Send,
  Sparkles,
  Info,
  RefreshCw,
  Lock,
  ChevronRight,
  MapPin
} from 'lucide-react';
import { Booking, Court, BookingAddons, ClosedSlot } from '../types';
import { INITIAL_COURTS, INITIAL_BOOKINGS } from '../data/mockData';
import { bookingService, courtService, googleScriptSyncService } from '../services/api';
import { VietQRModal } from '../components/common/VietQRModal';
import { ContactBanner } from '../components/common/ContactBanner';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class CourtBookingErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CourtBooking caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#161F30] border border-red-800 rounded-3xl p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-red-950 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-700">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold font-heading text-white">Court Engine Recovery</h2>
            <p className="text-xs text-slate-300">
              A temporary display error was caught. Click below to reload court availability.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Reload Court Booking Engine
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Interface for dynamic court schedule slot
export interface CourtTimeSlot {
  start: string;
  end: string;
  label: string;
  durationHours: number;
  period: string; // 'Morning' | 'Afternoon' | 'Evening'
  courtId: string;
}

// Schedule calculation based on court and day of week
export const getScheduleSlotsForCourtAndDate = (courtId: string, dateString: string): CourtTimeSlot[] => {
  const [y, m, d] = dateString.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const day = dateObj.getDay(); // 0 = Sunday, 1 = Mon, ..., 6 = Sat

  // Court 1: BTL Thong Tin court ('court-btl')
  if (courtId === 'court-btl') {
    // Sunday (Chủ nhật): 10h-12h, 12h-14h, 14h-17h, 17h-19h
    if (day === 0) {
      return [
        { courtId, start: '10:00', end: '12:00', label: '10:00 - 12:00', durationHours: 2.0, period: 'Morning' },
        { courtId, start: '12:00', end: '14:00', label: '12:00 - 14:00', durationHours: 2.0, period: 'Afternoon' },
        { courtId, start: '14:00', end: '17:00', label: '14:00 - 17:00', durationHours: 3.0, period: 'Afternoon' },
        { courtId, start: '17:00', end: '19:00', label: '17:00 - 19:00', durationHours: 2.0, period: 'Evening' },
      ];
    }
    // Saturday (Thứ bảy): 12h-21h30 divided into 1.5h - 2h slots
    if (day === 6) {
      return [
        { courtId, start: '12:00', end: '14:00', label: '12:00 - 14:00', durationHours: 2.0, period: 'Afternoon' },
        { courtId, start: '14:00', end: '16:00', label: '14:00 - 16:00', durationHours: 2.0, period: 'Afternoon' },
        { courtId, start: '16:00', end: '18:00', label: '16:00 - 18:00', durationHours: 2.0, period: 'Evening' },
        { courtId, start: '18:00', end: '19:30', label: '18:00 - 19:30', durationHours: 1.5, period: 'Evening' },
        { courtId, start: '19:30', end: '21:30', label: '19:30 - 21:30', durationHours: 2.0, period: 'Evening' },
      ];
    }
    // Monday to Friday (Thứ 2 đến Thứ 6): 17h30-19h và 19h-21h30
    return [
      { courtId, start: '17:30', end: '19:00', label: '17:30 - 19:00', durationHours: 1.5, period: 'Evening' },
      { courtId, start: '19:00', end: '21:30', label: '19:00 - 21:30', durationHours: 2.5, period: 'Evening' },
    ];
  }

  // Court 2: The Cong court ('court-thecong') & Court 3: My Dinh court ('court-mydinh')
  // Saturday & Sunday: Open All Day
  if (day === 0 || day === 6) {
    return [
      { courtId, start: '08:00', end: '10:00', label: '08:00 - 10:00', durationHours: 2.0, period: 'Morning' },
      { courtId, start: '10:00', end: '12:00', label: '10:00 - 12:00', durationHours: 2.0, period: 'Morning' },
      { courtId, start: '14:00', end: '16:00', label: '14:00 - 16:00', durationHours: 2.0, period: 'Afternoon' },
      { courtId, start: '16:00', end: '18:00', label: '16:00 - 18:00', durationHours: 2.0, period: 'Afternoon' },
      { courtId, start: '18:00', end: '20:00', label: '18:00 - 20:00', durationHours: 2.0, period: 'Evening' },
      { courtId, start: '20:00', end: '22:00', label: '20:00 - 22:00', durationHours: 2.0, period: 'Evening' },
    ];
  }

  // Monday to Friday: 19h - 22h
  return [
    { courtId, start: '19:00', end: '20:30', label: '19:00 - 20:30', durationHours: 1.5, period: 'Evening' },
    { courtId, start: '20:30', end: '22:00', label: '20:30 - 22:00', durationHours: 1.5, period: 'Evening' },
    { courtId, start: '19:00', end: '22:00', label: '19:00 - 22:00 (Full 3h Block)', durationHours: 3.0, period: 'Evening' },
  ];
};

const CourtBookingContent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const paramCourtId = searchParams.get('courtId');

  // Real-time current date helper
  const getTodayDateString = () => {
    try {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '2026-10-20';
    }
  };

  const todayStr = useMemo(() => getTodayDateString(), []);

  // Generate next 14 days for quick date selector
  const upcomingDays = useMemo(() => {
    const list = [];
    const base = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      list.push({ dateStr, dayName, monthDay, isWeekend: d.getDay() === 0 || d.getDay() === 6 });
    }
    return list;
  }, []);

  // Courts state initialized safely with the 3 official courts
  const [courts, setCourts] = useState<Court[]>(INITIAL_COURTS);
  const [selectedCourtId, setSelectedCourtId] = useState<string>(
    paramCourtId && INITIAL_COURTS.some(c => c.id === paramCourtId)
      ? paramCourtId
      : INITIAL_COURTS[0]?.id || 'court-btl'
  );

  const [bookingDate, setBookingDate] = useState<string>(todayStr);
  const [existingBookings, setExistingBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [closedSlots, setClosedSlots] = useState<ClosedSlot[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Compute dynamic slots based on court & date
  const availableSlots = useMemo(() => {
    return getScheduleSlotsForCourtAndDate(selectedCourtId, bookingDate);
  }, [selectedCourtId, bookingDate]);

  // Selected Slot State: null by default so user picks deliberately
  const [selectedSlotObj, setSelectedSlotObj] = useState<CourtTimeSlot | null>(null);

  // If court or date changes, reset slot if it does not exist in the newly configured schedule
  useEffect(() => {
    if (selectedSlotObj) {
      const exists = availableSlots.some(s => s.label === selectedSlotObj.label);
      if (!exists) {
        setSelectedSlotObj(null);
      }
    }
  }, [availableSlots]);

  // Customer Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Addons State
  const [addons, setAddons] = useState<BookingAddons>({
    mineralWaterBottles: 4,
    mikasaBallCrate: false,
    certifiedReferee: false,
  });

  // Modal & Checkout states
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<Booking | null>(null);

// Load real-time bookings & closed slots (có thêm cờ silent để quét nền không giật nút refresh)
  const fetchRealtimeStatus = async (silent: boolean = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [fetchedCourts, fetchedBookings, fetchedClosed] = await Promise.all([
        courtService.getCourts(),
        bookingService.getBookings({ date: bookingDate, courtId: selectedCourtId }),
        courtService.getClosedSlots(selectedCourtId, bookingDate)
      ]);

      if (Array.isArray(fetchedCourts) && fetchedCourts.length > 0) {
        const mergedCourts = fetchedCourts.map(fc => {
          const local = INITIAL_COURTS.find(ic => ic.id === fc.id);
          return local ? { ...fc, imageUrl: local.imageUrl || fc.imageUrl } : fc;
        });
        setCourts(mergedCourts);
      }
      if (Array.isArray(fetchedBookings)) {
        setExistingBookings(fetchedBookings);
      }
      if (Array.isArray(fetchedClosed)) {
        setClosedSlots(fetchedClosed);
      }
    } catch (err) {
      console.warn('Real-time sync notice:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // 1. Tải ngay khi vào trang hoặc đổi sân/ngày
    fetchRealtimeStatus(false);

    // 2. Tự động đồng bộ mỗi 3 giây để bắt kịp lệnh Admin Lock hoặc đơn đặt mới
    const syncInterval = setInterval(() => {
      fetchRealtimeStatus(true);
    }, 3000);

    return () => clearInterval(syncInterval);
  }, [selectedCourtId, bookingDate]);

  const selectedCourt: Court = courts.find((c) => c.id === selectedCourtId) || courts[0] || INITIAL_COURTS[0];

  // Pricing calculation
  const sessionHours = selectedSlotObj?.durationHours || 1.5;
  const hourlyRate = selectedCourt?.hourlyRate || 550000;
  const courtPrice = Math.round(hourlyRate * sessionHours);

  const waterPrice = (addons?.mineralWaterBottles || 0) * 15000;
  const ballCratePrice = addons?.mikasaBallCrate ? 100000 : 0;
  const refereePrice = addons?.certifiedReferee ? 200000 : 0;
  const addonsPrice = waterPrice + ballCratePrice + refereePrice;
  const totalPrice = courtPrice + addonsPrice;

  // Auto-generate dynamic transfer syntax:
  // Must include: which time slot/ca, and court name!
  const generatedTransferContent = useMemo(() => {
    const courtTag = selectedCourt?.shortName || (selectedCourtId === 'court-btl' ? 'BTL TT' : (selectedCourtId === 'court-thecong' ? 'THE CONG' : 'MY DINH'));
    const startClean = (selectedSlotObj?.start || '18:00').replace(':', 'H');
    const endClean = (selectedSlotObj?.end || '19:30').replace(':', 'H');
    const dateNum = (bookingDate || '20261020').replace(/-/g, '');
    return `DVA ${courtTag} ${startClean} ${endClean} ${dateNum}`.replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase();
  }, [selectedCourt, selectedCourtId, selectedSlotObj, bookingDate]);

  const getSlotStatus = (slot: CourtTimeSlot): 'AVAILABLE' | 'HOLDING' | 'BOOKED' | 'CLOSED' => {
    // 1. Check nếu Admin đã Lock/Close khung giờ này
    const isClosedByAdmin = closedSlots.some(
      cs => cs.courtId === selectedCourtId && cs.date === bookingDate && cs.slotLabel === slot.label
    );
    if (isClosedByAdmin) return 'CLOSED';

    if (!Array.isArray(existingBookings)) return 'AVAILABLE';

    // 2. Check nếu ca đã thanh toán thành công (Màu xám BOOKED)
    const paidBooking = existingBookings.find(
      (b) =>
        b &&
        b.courtId === selectedCourtId &&
        b.bookingDate === bookingDate &&
        b.paymentStatus === 'PAID' &&
        (b.startTime === slot.start || `${b.startTime} - ${b.endTime}` === slot.label)
    );
    if (paidBooking) return 'BOOKED';

    // 3. Check nếu ca đang chờ chuyển khoản VietQR (Màu vàng hổ phách HOLDING)
    const holdingBooking = existingBookings.find(
      (b) =>
        b &&
        b.courtId === selectedCourtId &&
        b.bookingDate === bookingDate &&
        b.paymentStatus === 'PENDING' &&
        (b.startTime === slot.start || `${b.startTime} - ${b.endTime}` === slot.label)
    );
    if (holdingBooking) return 'HOLDING';

    return 'AVAILABLE';
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerName.trim() || !customerPhone.trim() || !customerEmail.trim()) {
      setErrorMessage('Please fill in your name, phone number, and email address.');
      return;
    }

    if (!selectedSlotObj) {
      setErrorMessage('Please choose an available time slot.');
      return;
    }

    // Verify slot is not closed or duplicate
    const currentStatus = getSlotStatus(selectedSlotObj);
    if (currentStatus !== 'AVAILABLE') {
      setErrorMessage(`This time slot is ${currentStatus.toLowerCase()} and cannot be booked. Please pick another available session.`);
      fetchRealtimeStatus();
      return;
    }

    setIsSubmitting(true);
    try {
      const newBooking = await bookingService.createBooking({
        courtId: selectedCourt.id,
        courtName: selectedCourt.name,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        bookingDate,
        startTime: selectedSlotObj.start,
        endTime: selectedSlotObj.end,
        totalHours: sessionHours,
        courtPrice,
        addons,
        addonsPrice,
        totalPrice,
        notes: notes.trim(),
        transferContent: generatedTransferContent,
      });

      setExistingBookings((prev) => [newBooking, ...prev]);
      setActiveBooking(newBooking);
      setShowQRModal(true);

      // Realtime Google Sheets Sync (Sheet: DatSan)
      googleScriptSyncService.syncToGoogleSheet('DatSan', {
        'Mã đặt sân': newBooking.bookingCode,
        'Tên sân': newBooking.courtName,
        'Ngày đặt': newBooking.bookingDate,
        'Khung giờ': `${newBooking.startTime} - ${newBooking.endTime}`,
        'Tổng số giờ': newBooking.totalHours,
        'Họ tên khách': newBooking.customerName,
        'Số điện thoại': newBooking.customerPhone,
        'Email': newBooking.customerEmail,
        'Tổng tiền (VNĐ)': newBooking.totalPrice,
        'Trạng thái': newBooking.paymentStatus,
        'Nội dung CK': newBooking.transferContent || '',
        'Ghi chú': newBooking.notes || 'Không có',
        'Thời gian tạo': new Date().toLocaleString('vi-VN')
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not complete reservation. The slot may have just been booked by another user.');
      fetchRealtimeStatus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = (updatedBooking: Booking) => {
    setShowQRModal(false);
    setSuccessReceipt(updatedBooking);
    setExistingBookings((prev) =>
      prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b))
    );

    // Sync updated payment status to Google Sheets
    googleScriptSyncService.syncToGoogleSheet('DatSan', {
      'Mã đặt sân': updatedBooking.bookingCode,
      'Tên sân': updatedBooking.courtName,
      'Ngày đặt': updatedBooking.bookingDate,
      'Khung giờ': `${updatedBooking.startTime} - ${updatedBooking.endTime}`,
      'Tổng số giờ': updatedBooking.totalHours,
      'Họ tên khách': updatedBooking.customerName,
      'Số điện thoại': updatedBooking.customerPhone,
      'Email': updatedBooking.customerEmail,
      'Tổng tiền (VNĐ)': updatedBooking.totalPrice,
      'Trạng thái': 'PAID (Đã thanh toán VietQR)',
      'Nội dung CK': updatedBooking.transferContent || '',
      'Ghi chú': 'Thanh toán tự động thành công qua VietQR MB Bank',
      'Thời gian cập nhật': new Date().toLocaleString('vi-VN')
    });
  };

  // Helper to format date display in English
  const formatFriendlyDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-red-500 uppercase tracking-widest bg-red-950/60 border border-red-800 px-3 py-1 rounded-full">
              DVA Real-Time Court Reservation
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-heading mt-3">
              Book Court Online & Instant VietQR Reconciliation
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Real-time court availability with automated banking transfer syntax · 550,000 VND / hour · Includes 1 Free Official Mikasa V200W Olympic Match Ball.
            </p>
          </div>

          <button
            onClick={() => fetchRealtimeStatus()}
            disabled={isRefreshing}
            className="self-start md:self-auto px-4 py-2 bg-[#161F30] border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
            <span>Check Live Availability</span>
          </button>
        </div>

        {/* ERROR NOTIFICATION BANNER */}
        {errorMessage && (
          <div className="bg-red-950/80 border-2 border-red-600 text-red-200 p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white font-bold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SUCCESS CONFIRMATION RECEIPT BANNER */}
        {successReceipt && (
          <div className="bg-emerald-950/80 border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 shadow-2xl text-emerald-100 space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                <Check className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-xl text-white">
                  Booking Confirmed & Payment Reconciled!
                </h3>
                <p className="text-xs text-emerald-300">
                  Transfer Reference: <strong className="font-mono text-white bg-emerald-900/60 px-2 py-0.5 rounded">{successReceipt.transferContent || successReceipt.bookingCode}</strong> · Confirmation email dispatched to <strong>{successReceipt.customerEmail}</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0B0F19] p-4 rounded-2xl border border-emerald-800/80 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Court:</span>
                <span className="font-bold text-white text-sm">{successReceipt.courtName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Date & Session:</span>
                <span className="font-bold text-white text-sm">{successReceipt.bookingDate} ({successReceipt.startTime} - {successReceipt.endTime})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Customer:</span>
                <span className="font-bold text-white text-sm">{successReceipt.customerName} ({successReceipt.customerPhone})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total Paid:</span>
                <span className="font-bold text-orange-400 font-mono text-sm">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(successReceipt.totalPrice)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-emerald-300 gap-2 pt-2 border-t border-emerald-900">
              <span>Your complimentary Mikasa V200W match ball and reserved court will be ready upon check-in.</span>
              <button
                onClick={() => setSuccessReceipt(null)}
                className="text-xs font-bold text-white underline hover:no-underline cursor-pointer"
              >
                Book another court session
              </button>
            </div>
            {/* Show emergency contact banner on completed booking screen */}
            <div className="pt-2">
              <ContactBanner />
            </div>
          </div>
        )}

        {/* STEP 1: 3 OFFICIAL COURTS WITH HIGH-RES PHOTOS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white font-heading flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>Choose Your Preferred Court</span>
            </h2>
            <span className="text-xs font-mono text-orange-400 font-semibold">Giá thuê: Từ 500,000 đ/h (The Cong & Mỹ Đình: 500k/h)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {courts.map((court) => {
              const isSelected = court.id === selectedCourtId;

              return (
                <button
                  key={court.id}
                  type="button"
                  onClick={() => setSelectedCourtId(court.id)}
                  className={`text-left rounded-3xl border-2 overflow-hidden transition-all duration-300 flex flex-col justify-between cursor-pointer group ${
                    isSelected
                      ? 'border-red-500 bg-[#161F30] shadow-2xl ring-2 ring-red-500/30 scale-[1.02]'
                      : 'border-slate-800 bg-[#121826] hover:border-slate-700 shadow-md hover:bg-[#151c2c]'
                  }`}
                >
                  {/* Court Photograph Banner */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                    <img
                      src={court.imageUrl}
                      alt={court.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121826] via-black/40 to-black/20" />
                    
                    {/* Badges on Court Photo */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        isSelected ? 'bg-red-600 text-white shadow-lg' : 'bg-black/70 text-slate-200 backdrop-blur'
                      }`}>
                        {court.code}
                      </span>
                      {isSelected && (
                        <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="font-heading font-black text-xl text-white drop-shadow-md">
                        {court.name}
                      </h3>
                      <span className="text-[11px] text-orange-300 font-mono font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>DVA Sports Center</span>
                      </span>
                    </div>
                  </div>

                  {/* Court Details Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {court.description}
                    </p>

                    <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Taraflex Pro Flooring</span>
                      <span className="font-bold text-orange-400 font-mono text-sm">{court.hourlyRate.toLocaleString('vi-VN')} đ/h</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 2: REAL-TIME DATES (PRESENT TO FUTURE) & DYNAMIC COURT-SPECIFIC SLOTS */}
        <div className="space-y-6 bg-[#121826] rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h2 className="text-base font-extrabold text-white font-heading flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <span>Select Date & Dynamic Session Slot</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Active Court: <strong className="text-orange-400 font-bold">{selectedCourt?.name}</strong> · Showing verified slots for: <strong className="text-white">{formatFriendlyDate(bookingDate)}</strong>
              </p>
            </div>

            {/* Custom Date Input for any future date */}
            <div className="flex items-center gap-2 bg-[#0B0F19] px-3.5 py-2 rounded-xl border border-slate-700">
              <CalendarIcon className="w-4 h-4 text-orange-400 shrink-0" />
              <input
                type="date"
                value={bookingDate}
                min={todayStr}
                onChange={(e) => setBookingDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Date Strip (Today, Tomorrow, Up to 14 days) */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Quick Date Select (Present to Future):
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {upcomingDays.map((day) => {
                const isDaySelected = day.dateStr === bookingDate;
                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => setBookingDate(day.dateStr)}
                    className={`px-3.5 py-2.5 rounded-2xl flex flex-col items-center justify-center min-w-[85px] transition-all cursor-pointer border ${
                      isDaySelected
                        ? 'border-red-500 bg-gradient-to-b from-red-600 to-orange-600 text-white shadow-lg ring-2 ring-red-400/40'
                        : 'border-slate-800 bg-[#0E1524] hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isDaySelected ? 'text-red-100' : day.isWeekend ? 'text-orange-400' : 'text-slate-400'}`}>
                      {day.dayName}
                    </span>
                    <span className="text-xs font-mono font-extrabold mt-0.5">
                      {day.monthDay}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Legend */}
          <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span>Available (Open for booking)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span>Holding Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-600"></span>
              <span>Booked (Duplicate Protected)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-900 border border-red-700"></span>
              <span>Closed / Maintenance by Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600"></span>
              <span>Your Selected Session</span>
            </div>
          </div>

          {/* Dynamic Slot Grid based on court rules */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Available Sessions for {selectedCourt.name}:
              </span>
              <span className="text-[11px] text-slate-400">
                {availableSlots.length} available sessions configured
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {availableSlots.map((slot) => {
                const status = getSlotStatus(slot);
                const isSelected = selectedSlotObj?.label === slot.label;
                const isAvailable = status === 'AVAILABLE';
                const calculatedPrice = Math.round(hourlyRate * slot.durationHours);

                return (
                  <button
                    key={slot.label}
                    type="button"
                    disabled={!isAvailable && !isSelected}
                    onClick={() => {
                      if (!isAvailable && !isSelected) return;
                      setSelectedSlotObj(prev => (prev?.label === slot.label ? null : slot));
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-red-500 bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-xl ring-2 ring-red-400/40 cursor-pointer scale-[1.02]'
                        : isAvailable
                        ? 'border-slate-800 bg-[#0E1524] hover:border-red-500/60 hover:bg-[#141E30] text-slate-200 cursor-pointer'
                        : status === 'HOLDING'
                        ? 'border-amber-800/80 bg-amber-950/20 text-amber-300 cursor-not-allowed opacity-75'
                        : status === 'CLOSED'
                        ? 'border-red-900/60 bg-red-950/20 text-red-400 cursor-not-allowed opacity-60'
                        : 'border-slate-800 bg-slate-900/60 text-slate-500 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                        <span className="font-mono font-bold text-sm tracking-tight">
                          {slot.label}
                        </span>
                      </div>

                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                        isSelected 
                          ? 'bg-white text-red-600' 
                          : isAvailable
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : status === 'HOLDING'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : status === 'CLOSED'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isSelected ? 'Selected' : status === 'AVAILABLE' ? 'Open' : status === 'HOLDING' ? 'Holding' : status === 'CLOSED' ? 'Closed' : 'Booked'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/10 text-[11px]">
                      <span className={isSelected ? 'text-red-100' : 'text-slate-400'}>
                        {slot.durationHours} Hours Session
                      </span>
                      <span className={`font-mono font-bold ${isSelected ? 'text-white' : 'text-orange-400'}`}>
                        {calculatedPrice.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* STEP 3: ADD-ONS & CUSTOMER FORM */}
        <form onSubmit={handleBookingSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Add-on Services & Inputs (Left 7 cols) */}
          <div className="lg:col-span-7 bg-[#121826] rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
            <h2 className="text-base font-extrabold text-white font-heading flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">
                3
              </span>
              <span>Court Add-ons & Amenities</span>
            </h2>

            <div className="space-y-4">
              
              {/* Add-on 1: Water */}
              <div className="p-4 rounded-2xl border border-slate-800 bg-[#0E1524] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center">
                    <Droplet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Chilled Mineral Water / Pocari Sweat</h4>
                    <p className="text-[11px] text-slate-400">15,000 VND / Bottle (Chilled & served court-side)</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAddons(prev => ({ ...prev, mineralWaterBottles: Math.max(0, (prev?.mineralWaterBottles || 0) - 1) }))}
                    className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-800 font-bold text-white hover:bg-slate-700 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-xs w-6 text-center text-white">{addons?.mineralWaterBottles || 0}</span>
                  <button
                    type="button"
                    onClick={() => setAddons(prev => ({ ...prev, mineralWaterBottles: (prev?.mineralWaterBottles || 0) + 1 }))}
                    className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-800 font-bold text-white hover:bg-slate-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add-on 2: Ball crate */}
              <label className="p-4 rounded-2xl border border-slate-800 bg-[#0E1524] flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-400 border border-amber-800 flex items-center justify-center">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Extra Mikasa 5-Ball Training Crate</h4>
                    <p className="text-[11px] text-slate-400">+100,000 VND / Session (Ideal for team spiking drills)</p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={addons?.mikasaBallCrate || false}
                  onChange={(e) => setAddons(prev => ({ ...prev, mikasaBallCrate: e.target.checked }))}
                  className="w-5 h-5 accent-red-600 rounded cursor-pointer"
                />
              </label>

              {/* Add-on 3: Certified Referee */}
              <label className="p-4 rounded-2xl border border-slate-800 bg-[#0E1524] flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-950 text-red-400 border border-red-800 flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Certified Official Referee (FIVB Standard)</h4>
                    <p className="text-[11px] text-slate-400">+200,000 VND / Match (Match officiating & whistle)</p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={addons?.certifiedReferee || false}
                  onChange={(e) => setAddons(prev => ({ ...prev, certifiedReferee: e.target.checked }))}
                  className="w-5 h-5 accent-red-600 rounded cursor-pointer"
                />
              </label>

            </div>

            {/* Customer Inputs */}
            <div className="border-t border-slate-800 pt-5 space-y-4">
              <h3 className="font-bold text-xs text-white uppercase tracking-wider">
                Booking Contact Information:
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Marcus Tran"
                    className="w-full px-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-600 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Phone Number (WhatsApp / Zalo) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0903 123 456"
                    className="w-full px-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-600 text-white outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">
                    Email Address (For Instant Receipt) *
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="marcus.tran@gmail.com"
                    className="w-full px-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-600 text-white outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">
                    Notes or Net Height Preference (Optional):
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Set net height for Men (2.43m) or Women (2.24m)"
                    className="w-full px-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-600 text-white outline-none"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Pricing Summary, Auto VietQR Transfer Memo & Checkout Button (Right 5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-[#121826] rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-xl space-y-5">
              <h3 className="font-heading font-extrabold text-base text-white border-b border-slate-800 pb-3">
                Order Summary & Checkout
              </h3>

              <div className="space-y-3 text-xs">
                
                <div className="flex justify-between text-slate-400">
                  <span>Selected Court:</span>
                  <span className="font-bold text-white">{selectedCourt?.name}</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Session Slot:</span>
                  <span className="font-bold text-white">{selectedSlotObj?.label} ({sessionHours}h)</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Date:</span>
                  <span className="font-bold text-white">{bookingDate}</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Court Fee ({sessionHours}h @ {(hourlyRate / 1000).toLocaleString('vi-VN')}k/h):</span>
                  <span className="font-mono font-semibold text-white">{courtPrice.toLocaleString('vi-VN')} đ</span>
                </div>

                {addonsPrice > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Selected Add-ons:</span>
                    <span className="font-mono font-semibold text-orange-400">+{addonsPrice.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-emerald-400 font-semibold bg-emerald-950/60 p-3 rounded-xl border border-emerald-800">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Includes 1 Free Mikasa V200W Match Ball</span>
                </div>

                {/* AUTO-GENERATED TRANSFER MEMO PREVIEW */}
                <div className="bg-[#0B0F19] p-3.5 rounded-2xl border border-orange-500/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-orange-400 uppercase font-black tracking-wider flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Auto-Generated Bank Transfer Memo</span>
                    </span>
                    <span className="text-[9px] bg-orange-950 text-orange-300 px-1.5 py-0.2 rounded font-mono">VietQR Ready</span>
                  </div>
                  <div className="font-mono font-black text-xs text-white tracking-wide bg-slate-900/80 p-2 rounded-lg border border-slate-800 select-all">
                    {generatedTransferContent}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Includes your chosen court and session time. Scanned instantly via your mobile banking app.
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-3 flex justify-between items-baseline">
                  <span className="font-bold text-white text-sm">Total Due:</span>
                  <span className="font-mono font-black text-2xl text-orange-400 tabular-nums">
                    {totalPrice.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>

              </div>

              {/* VietQR Bank Info preview */}
              <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-4 space-y-1 text-[11px] text-slate-400">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-red-500" />
                  <span>Beneficiary Account Information:</span>
                </div>
                <div>Bank: <strong className="text-white">MB Bank</strong> · Account: <strong className="font-mono text-orange-400">0002090671521</strong></div>
                <div>Beneficiary: <strong className="text-white">HOANG QUOC DUY</strong></div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 shadow-lg shadow-red-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Generating VietQR code...</span>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Proceed to VietQR Payment</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-500 text-center">
                Your session time slot is immediately reserved and duplicate-protected upon checkout.
              </p>

            </div>

          </div>

        </form>

      </div>

      {/* VIETQR PAYMENT MODAL */}
      {showQRModal && (
        <VietQRModal
          booking={activeBooking}
          onClose={() => setShowQRModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

    </div>
  );
};

export const CourtBookingPage: React.FC = () => {
  return (
    <CourtBookingErrorBoundary>
      <CourtBookingContent />
    </CourtBookingErrorBoundary>
  );
};
