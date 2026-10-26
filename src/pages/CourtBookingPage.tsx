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
import { INITIAL_COURTS } from '../data/mockData';
import {
  ADDON_PRICES,
  CourtTimeSlot,
  getScheduleSlotsForCourtAndDate,
  getSlotsForSubCourt,
  getDayOfWeekKey,
  parseSlotLabel,
  rangesOverlap,
} from '../shared/schedule';
import { bookingService, courtService } from '../services/api';
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

// Schedule rules & pricing constants are shared with the server (single source of truth)
export type { CourtTimeSlot } from '../shared/schedule';
export { getScheduleSlotsForCourtAndDate } from '../shared/schedule';

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
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [closedSlots, setClosedSlots] = useState<ClosedSlot[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedCourt: Court = courts.find((c) => c.id === selectedCourtId) || courts[0] || INITIAL_COURTS[0];

  const subCourts = useMemo(() => {
    if (selectedCourt?.subCourts && selectedCourt.subCourts.length > 0) {
      return selectedCourt.subCourts;
    }
    if (selectedCourt?.id === 'court-btl' || selectedCourt?.code === 'BTL_TT') {
      return ['Sân A', 'Sân B'];
    }
    return [];
  }, [selectedCourt]);

  const hasSubCourts = subCourts.length > 0;
  const [selectedSubCourt, setSelectedSubCourt] = useState<string>('Sân A');

  // Synchronize default subCourt when court changes
  useEffect(() => {
    if (hasSubCourts) {
      if (!subCourts.includes(selectedSubCourt)) {
        setSelectedSubCourt(subCourts[0]);
      }
    }
  }, [hasSubCourts, subCourts, selectedCourtId]);

  const isCourtMaintenance = (court?: Court | null): boolean =>
    Boolean(court && (court.status === 'MAINTENANCE' || court.isMaintenance === true || court.isAvailable === false));

  const selectedCourtIsMaintenance = isCourtMaintenance(selectedCourt);

  // Compute dynamic slots based on court's weeklySchedule & selected date (Day of week)
  const availableSlots = useMemo(() => {
    return getScheduleSlotsForCourtAndDate(
      selectedCourt?.id || selectedCourtId,
      bookingDate,
      selectedCourt?.weeklySchedule,
      hasSubCourts ? selectedSubCourt : undefined
    );
  }, [selectedCourt, selectedCourtId, bookingDate, hasSubCourts, selectedSubCourt]);

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

  // If the currently selected court enters MAINTENANCE mode while the user is on the page, warn and clear slot
  useEffect(() => {
    if (selectedCourtIsMaintenance) {
      setSelectedSlotObj(null);
      setErrorMessage(
        `⚠️ Sân "${selectedCourt?.name}" vừa chuyển sang chế độ bảo trì / tạm dừng phục vụ. Không thể tiến hành đặt tiếp trên sân này, vui lòng chọn sân khác!`
      );
    }
  }, [selectedCourtIsMaintenance, selectedCourt?.id]);

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
  const [activeBooking, setActiveBooking] = useState<Booking | null>(() => {
    try {
      const saved = sessionStorage.getItem('dva_active_booking');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showQRModal, setShowQRModal] = useState<boolean>(() => {
    try {
      return !!sessionStorage.getItem('dva_active_booking');
    } catch {
      return false;
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<Booking | null>(null);

  const handleCloseQRModal = () => {
    setShowQRModal(false);
    try {
      sessionStorage.removeItem('dva_active_booking');
    } catch {
      // ignore
    }
  };

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
        const activeCourts = fetchedCourts
          .filter((fc) => fc.isActive !== false)
          .map((fc) => {
            const local = INITIAL_COURTS.find((ic) => ic.id === fc.id);
            return local ? { ...local, ...fc, imageUrl: fc.imageUrl || local.imageUrl } : fc;
          });
        if (activeCourts.length > 0) {
          setCourts(activeCourts);
          if (!activeCourts.some((c) => c.id === selectedCourtId)) {
            setSelectedCourtId(activeCourts[0].id);
          }
        }
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

  // Pricing calculation
  const sessionHours = selectedSlotObj?.durationHours || 1.5;
  const hourlyRate = selectedCourt?.hourlyRate || 550000;
  const courtPrice = Math.round(hourlyRate * sessionHours);

  const waterPrice = (addons?.mineralWaterBottles || 0) * ADDON_PRICES.mineralWaterBottle;
  const ballCratePrice = addons?.mikasaBallCrate ? ADDON_PRICES.mikasaBallCrate : 0;
  const refereePrice = addons?.certifiedReferee ? ADDON_PRICES.certifiedReferee : 0;
  const addonsPrice = waterPrice + ballCratePrice + refereePrice;
  const totalPrice = courtPrice + addonsPrice;

  // Auto-generate dynamic transfer syntax:
  // Must include: which time slot/ca, and court name!
  const generatedTransferContent = useMemo(() => {
    const courtTag = selectedCourt?.shortName || (selectedCourtId === 'court-btl' ? 'BTL TT' : (selectedCourtId === 'court-thecong' ? 'THE CONG' : 'MY DINH'));
    const subMemo = hasSubCourts && selectedSubCourt ? ` ${selectedSubCourt.toUpperCase()}` : '';
    const startClean = (selectedSlotObj?.start || '18:00').replace(':', 'H');
    const endClean = (selectedSlotObj?.end || '19:30').replace(':', 'H');
    const dateNum = (bookingDate || '20261020').replace(/-/g, '');
    return `DVA ${courtTag}${subMemo} ${startClean} ${endClean} ${dateNum}`.replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase();
  }, [selectedCourt, selectedCourtId, selectedSlotObj, bookingDate, hasSubCourts, selectedSubCourt]);

  const getSlotStatus = (slot: CourtTimeSlot, subCourtTarget?: string): 'AVAILABLE' | 'HOLDING' | 'BOOKED' | 'CLOSED' => {
    // 0. Nếu toàn bộ sân đang trong chế độ bảo trì của Admin
    if (selectedCourtIsMaintenance) return 'CLOSED';

    const effectiveSubCourt = subCourtTarget !== undefined ? subCourtTarget : (hasSubCourts ? selectedSubCourt : undefined);

    // 1. Check nếu Admin đã Lock/Close khung giờ này (overlap-aware, same rule as the server)
    const isClosedByAdmin = closedSlots.some((cs) => {
      if (cs.courtId !== selectedCourtId || cs.date !== bookingDate) return false;
      // If closed slot specifies a subCourt, it only applies to that subCourt!
      if (effectiveSubCourt && cs.subCourt && cs.subCourt !== effectiveSubCourt) {
        return false;
      }
      const range = parseSlotLabel(cs.slotLabel);
      return !!range && rangesOverlap(slot.start, slot.end, range.start, range.end);
    });
    if (isClosedByAdmin) return 'CLOSED';

    if (!Array.isArray(existingBookings)) return 'AVAILABLE';

    const overlapping = (status: Booking['paymentStatus']) =>
      existingBookings.find((b) => {
        if (!b) return false;
        if (b.courtId !== selectedCourtId || b.bookingDate !== bookingDate || b.paymentStatus !== status) {
          return false;
        }
        // Sub-court isolation:
        // If effectiveSubCourt is specified (e.g. "Sân A"), bookings for a DIFFERENT subCourt (e.g. "Sân B") do not overlap!
        if (effectiveSubCourt && b.subCourt && b.subCourt !== effectiveSubCourt) {
          return false;
        }
        return rangesOverlap(slot.start, slot.end, b.startTime, b.endTime);
      });

    // 2. Check nếu ca đã thanh toán thành công (Màu xám BOOKED)
    if (overlapping('PAID')) return 'BOOKED';

    // 3. Check nếu ca đang chờ chuyển khoản VietQR (Màu vàng hổ phách HOLDING)
    if (overlapping('PENDING')) return 'HOLDING';

    return 'AVAILABLE';
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (selectedCourtIsMaintenance) {
      setErrorMessage('Sân hiện đang trong thời gian bảo trì, vui lòng chọn sân khác hoặc quay lại sau.');
      setSelectedSlotObj(null);
      fetchRealtimeStatus();
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !customerEmail.trim()) {
      setErrorMessage('Please fill in your name, phone number, and email address.');
      return;
    }

    if (!selectedSlotObj) {
      setErrorMessage('Please choose an available time slot.');
      return;
    }

    // Verify slot is not closed by admin
    const currentStatus = getSlotStatus(selectedSlotObj);
    if (currentStatus === 'CLOSED') {
      setErrorMessage('This court session is currently closed for maintenance or fully booked. Please select another slot.');
      fetchRealtimeStatus();
      return;
    }

    setIsSubmitting(true);
    try {
      // Only the customer's choices are sent - the server recomputes prices & validates the slot itself.
      const finalBooking = await bookingService.createBooking({
        courtId: selectedCourt.id,
        subCourt: hasSubCourts ? selectedSubCourt : undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        bookingDate,
        startTime: selectedSlotObj.start,
        endTime: selectedSlotObj.end,
        addons,
        notes: notes.trim(),
      });

      setExistingBookings((prev) => [finalBooking, ...prev.filter(b => b.id !== finalBooking.id)]);
      setActiveBooking(finalBooking);
      setShowQRModal(true);
      try {
        sessionStorage.setItem('dva_active_booking', JSON.stringify(finalBooking));
      } catch {
        // ignore
      }
      // Google Sheets sync is performed by the server when the booking is created.
    } catch (err: any) {
      // e.g. 409: someone else took the slot a moment ago - show the real reason and refresh availability
      setErrorMessage(err?.message || 'Could not create the booking. Please try again.');
      setSelectedSlotObj(null);
      fetchRealtimeStatus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = (updatedBooking: Booking) => {
    setShowQRModal(false);
    try {
      sessionStorage.removeItem('dva_active_booking');
    } catch {
      // ignore
    }
    setSuccessReceipt(updatedBooking);
    setExistingBookings((prev) =>
      prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b))
    );
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
              Book Court Online
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
                <span className="font-bold text-white text-sm">
                  {successReceipt.courtName}{successReceipt.subCourt ? ` - ${successReceipt.subCourt}` : ''}
                </span>
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
            <span className="text-xs font-mono text-orange-400 font-semibold">Rates: From 500,000 VND/h (The Cong & My Dinh: 500k/h · BTL: 550k/h)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {courts.map((court) => {
              const isSelected = court.id === selectedCourtId;
              const isMaintenance = isCourtMaintenance(court);

              return (
                <button
                  key={court.id}
                  type="button"
                  disabled={isMaintenance}
                  onClick={() => {
                    if (isMaintenance) return;
                    setSelectedCourtId(court.id);
                    setErrorMessage(null);
                  }}
                  className={`text-left rounded-3xl border-2 overflow-hidden transition-all duration-300 flex flex-col justify-between relative group ${
                    isMaintenance
                      ? 'border-amber-700/60 bg-[#101520] opacity-65 cursor-not-allowed select-none'
                      : isSelected
                      ? 'border-red-500 bg-[#161F30] shadow-2xl ring-2 ring-red-500/30 scale-[1.02] cursor-pointer'
                      : 'border-slate-800 bg-[#121826] hover:border-slate-700 shadow-md hover:bg-[#151c2c] cursor-pointer'
                  }`}
                >
                  {/* Court Photograph Banner */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                    <img
                      src={court.imageUrl}
                      alt={court.name}
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover transition-transform duration-500 ${
                        isMaintenance ? 'grayscale-[60%] brightness-50' : 'group-hover:scale-105'
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121826] via-black/40 to-black/20" />

                    {/* Maintenance Overlay Banner */}
                    {isMaintenance && (
                      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-4 z-10">
                        <div className="px-3.5 py-2 rounded-2xl bg-amber-950/95 border-2 border-amber-500 text-amber-200 font-extrabold text-xs text-center shadow-2xl flex items-center gap-1.5">
                          <span>🛠️ Đang bảo trì / Tạm dừng phục vụ</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Badges on Court Photo */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        isMaintenance
                          ? 'bg-amber-900/90 text-amber-200 border border-amber-600'
                          : isSelected
                          ? 'bg-red-600 text-white shadow-lg'
                          : 'bg-black/70 text-slate-200 backdrop-blur'
                      }`}>
                        {court.code}
                      </span>
                      {isMaintenance ? (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-950/90 text-red-300 border border-red-700">
                          Tạm ngưng
                        </span>
                      ) : isSelected ? (
                        <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      ) : null}
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 z-20">
                      <h3 className="font-heading font-black text-xl text-white drop-shadow-md">
                        {court.name}
                      </h3>
                      <span className="text-[11px] text-orange-300 font-mono font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{court.address || 'DVA Sports Center'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Court Details Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {court.description}
                    </p>

                    <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs">
                      {isMaintenance ? (
                        <span className="text-amber-400 font-bold">🛠️ Đang bảo trì / Tạm dừng phục vụ</span>
                      ) : (
                        <span className="text-slate-400 font-medium">Taraflex Pro Flooring</span>
                      )}
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
            <div className="flex flex-nowrap overflow-x-auto scrollbar-none gap-2 py-2 touch-pan-x -mx-2 px-2 sm:mx-0 sm:px-0">
              {upcomingDays.map((day) => {
                const isDaySelected = day.dateStr === bookingDate;
                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => setBookingDate(day.dateStr)}
                    className={`px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl flex flex-col items-center justify-center min-w-[76px] sm:min-w-[85px] transition-all cursor-pointer border shrink-0 ${
                      isDaySelected
                        ? 'border-red-500 bg-gradient-to-b from-red-600 to-orange-600 text-white shadow-lg ring-2 ring-red-400/40'
                        : 'border-slate-800 bg-[#0E1524] hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${isDaySelected ? 'text-red-100' : day.isWeekend ? 'text-orange-400' : 'text-slate-400'}`}>
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

          {/* Sub-Court Tab Switcher for clusters like BTL Thong Tin */}
          {hasSubCourts && (
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    <span>Chọn Sân Con (Sub-Courts) - {selectedCourt.name}:</span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Trong cùng 1 khung giờ có 2 sân thi đấu độc lập. Trạng thái đặt chỗ giữa Sân A và Sân B hoàn toàn riêng biệt.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
                  Đang chọn: <strong className="text-orange-400">{selectedSubCourt}</strong>
                </span>
              </div>

              {/* Sub-court Tabs (Mobile: flex-col or compact grid; Tablet/Laptop: 2 tabs) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full sm:max-w-xl">
                {subCourts.map((sc) => {
                  const isTabSelected = selectedSubCourt === sc;
                  const currentDay = getDayOfWeekKey(bookingDate);
                  const configuredLabels = getSlotsForSubCourt(selectedCourt?.weeklySchedule, currentDay, sc);
                  const scSlots = getScheduleSlotsForCourtAndDate(
                    selectedCourt?.id || selectedCourtId,
                    bookingDate,
                    selectedCourt?.weeklySchedule,
                    sc
                  );
                  const availableCount = scSlots.filter((s) => getSlotStatus(s, sc) === 'AVAILABLE').length;

                  return (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => {
                        setSelectedSubCourt(sc);
                        if (selectedSlotObj && selectedSlotObj.subCourt && selectedSlotObj.subCourt !== sc) {
                          const sameSlot = scSlots.find((s) => s.label === selectedSlotObj.label);
                          if (sameSlot && getSlotStatus(sameSlot, sc) === 'AVAILABLE') {
                            setSelectedSlotObj({ ...sameSlot, subCourt: sc });
                          } else {
                            setSelectedSlotObj(null);
                          }
                        }
                      }}
                      className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer gap-2 ${
                        isTabSelected
                          ? 'border-red-500 bg-gradient-to-r from-red-950/70 via-[#182338] to-[#121826] text-white ring-2 ring-red-500/50 shadow-xl'
                          : 'border-slate-800 bg-[#0E1524] text-slate-300 hover:border-slate-700 hover:bg-[#131c2e]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isTabSelected
                              ? 'bg-gradient-to-br from-red-600 to-orange-500 text-white shadow'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {sc.replace('Sân ', '')}
                        </div>
                        <div className="text-left truncate">
                          <span className="font-heading font-black text-sm block text-white flex items-center gap-1.5 truncate">
                            <span>{sc}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({sc === 'Sân A' ? 'Court A' : 'Court B'})
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            Sân độc lập tiêu chuẩn
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider whitespace-nowrap shrink-0 ${
                            availableCount > 0
                              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                              : 'bg-red-950/80 text-red-400 border-red-800/80'
                          }`}
                        >
                          {availableCount} ca trống
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic Slot Grid based on court rules */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Available Sessions for {selectedCourt.name}{hasSubCourts ? ` (${selectedSubCourt})` : ''}:
              </span>
              <span className="text-[11px] text-slate-400">
                {availableSlots.length} available sessions configured
              </span>
            </div>

            {selectedCourtIsMaintenance && (
              <div className="mb-4 p-4 rounded-2xl bg-amber-950/80 border-2 border-amber-500 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-extrabold text-sm text-amber-300">
                    🛠️ Đang bảo trì / Tạm dừng phục vụ ({selectedCourt.name})
                  </div>
                  <p className="text-amber-100/90">
                    Sân hiện đang trong thời gian bảo trì, vui lòng chọn sân khác hoặc quay lại sau. Toàn bộ khung giờ của sân này hiện đã bị khóa đặt chỗ.
                  </p>
                </div>
                {courts.some((c) => !isCourtMaintenance(c)) && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextActive = courts.find((c) => !isCourtMaintenance(c));
                      if (nextActive) {
                        setSelectedCourtId(nextActive.id);
                        setErrorMessage(null);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shrink-0 cursor-pointer transition-colors"
                  >
                    Chuyển sang sân đang hoạt động
                  </button>
                )}
              </div>
            )}

            {/* Lưới danh sách khung giờ trống (Available Sessions Grid: Tự động phân bổ linh hoạt, tối thiểu 280px) */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {availableSlots.map((slot) => {
                const status = getSlotStatus(slot);
                const isSelected = selectedSlotObj?.label === slot.label && (!hasSubCourts || selectedSlotObj?.subCourt === selectedSubCourt);
                const isAvailable = status === 'AVAILABLE';
                const calculatedPrice = Math.round(hourlyRate * slot.durationHours);
                const timeRangeText = slot.start && slot.end ? `${slot.start} - ${slot.end}` : slot.label;
                const extraNote = slot.label.replace(timeRangeText, '').replace(/[()]/g, '').trim();

                return (
                  <button
                    key={slot.label}
                    type="button"
                    disabled={!isAvailable && !isSelected}
                    onClick={() => {
                      if (!isAvailable && !isSelected) return;
                      setSelectedSlotObj(prev =>
                        prev?.label === slot.label && (!hasSubCourts || prev?.subCourt === selectedSubCourt)
                          ? null
                          : { ...slot, subCourt: hasSubCourts ? selectedSubCourt : undefined }
                      );
                    }}
                    className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden w-full min-w-[280px] flex flex-col justify-between ${
                      isSelected
                        ? 'border-red-500 bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-xl ring-2 ring-red-400/40 cursor-pointer'
                        : isAvailable
                        ? 'border-slate-800 bg-[#0E1524] hover:border-red-500/60 hover:bg-[#141E30] text-slate-200 cursor-pointer'
                        : status === 'HOLDING'
                        ? 'border-amber-800/80 bg-amber-950/20 text-amber-300 cursor-not-allowed opacity-75'
                        : status === 'CLOSED'
                        ? 'border-red-900/60 bg-red-950/20 text-red-400 cursor-not-allowed opacity-60'
                        : 'border-slate-800 bg-slate-900/60 text-slate-500 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {/* Hàng trên: Icon đồng hồ + Khung giờ đầy đủ căn bên trái, các badge căn bên phải */}
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                        <span className={`font-mono font-semibold text-sm tracking-tight whitespace-nowrap ${
                          isSelected ? 'text-white' : 'text-slate-100'
                        }`}>
                          {timeRangeText}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasSubCourts && (
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold tracking-wider whitespace-nowrap shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white border border-white/30'
                              : 'bg-orange-950/80 text-orange-300 border border-orange-800/80'
                          }`}>
                            {selectedSubCourt.toUpperCase()}
                          </span>
                        )}

                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider whitespace-nowrap shrink-0 ${
                          isSelected 
                            ? 'bg-white text-red-600 shadow-sm' 
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
                    </div>

                    {/* Hàng dưới: Thời lượng buổi tập và mức giá */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/10 text-[11px] sm:text-xs w-full">
                      <span className={isSelected ? 'text-red-100 font-medium' : 'text-slate-400 font-medium'}>
                        {slot.durationHours}h Session{extraNote ? ` · ${extraNote}` : ''}
                      </span>
                      <span className={`font-mono font-bold text-xs sm:text-sm ${isSelected ? 'text-white' : 'text-orange-400'}`}>
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
                    <h4 className="font-bold text-xs text-white">Extra Mikasa 1-Ball Training Crate</h4>
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
                    <h4 className="font-bold text-xs text-white">Certified Official Referee</h4>
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
                  <span className="font-bold text-white text-right">
                    {selectedCourt?.name}{hasSubCourts ? ` - ${selectedSubCourt}` : ''}
                  </span>
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
                disabled={isSubmitting || selectedCourtIsMaintenance}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 ${
                  selectedCourtIsMaintenance
                    ? 'bg-slate-800 border border-amber-700/60 text-amber-300 cursor-not-allowed opacity-75'
                    : 'bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 shadow-lg shadow-red-900/40 cursor-pointer'
                }`}
              >
                {selectedCourtIsMaintenance ? (
                  <span>🛠️ Sân đang bảo trì - Không thể đặt</span>
                ) : isSubmitting ? (
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
          onClose={handleCloseQRModal}
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
