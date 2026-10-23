import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Clock, CheckCircle2, QrCode, Phone, MessageSquare, AlertCircle } from 'lucide-react';
import { Booking } from '../../types';
import { bookingService, googleScriptSyncService } from '../../services/api';

interface VietQRModalProps {
  booking: Booking | null;
  onClose: () => void;
  onPaymentSuccess: (updatedBooking: Booking) => void;
}

export const VietQRModal: React.FC<VietQRModalProps> = ({ booking, onClose, onPaymentSuccess }) => {
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes hold

  useEffect(() => {
    if (!booking) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [booking]);

  // Real-time polling: automatically detect when Bank Webhook (SePay/Casso) marks the booking as PAID
  useEffect(() => {
    if (!booking || isSubmitted) return;
    const poll = setInterval(async () => {
      try {
        const list = await bookingService.getBookings({
          date: booking.bookingDate,
          courtId: booking.courtId,
        });
        const matched = Array.isArray(list) ? list.find((b) => b.id === booking.id) : undefined;
        if (matched && matched.paymentStatus === 'PAID') {
          const updated: Booking = {
            ...booking,
            ...matched,
            paymentStatus: 'PAID',
          };
          setConfirmedBooking(updated);
          setIsSubmitted(true);
        }
      } catch {
        // ignore transient network errors during background polling
      }
    }, 3000);
    return () => clearInterval(poll);
  }, [booking, isSubmitted]);

  if (!booking) return null;

  const bankName = 'MB Bank (Military Commercial Joint Stock Bank)';
  const accountNo = '0002090671521';
  const accountName = 'HOANG QUOC DUY';
  const transferContent = booking.transferContent || booking.bookingCode;
  const amountFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.totalPrice);
  
  // Real dynamic VietQR URL
  const qrUrl = `https://img.vietqr.io/image/MB-${accountNo}-compact2.png?amount=${booking.totalPrice}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(accountName)}`;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  // One-way explicit confirmation from the customer (reports transfer; Admin verifies & marks PAID)
  const handleConfirmTransfer = async () => {
    setIsConfirming(true);
    setConfirmError(null);

    try {
      const res = await bookingService.confirmPayment(booking.id);
      const updated: Booking = res?.booking || {
        ...booking,
        customerConfirmedAt: new Date().toISOString(),
      };
      setConfirmedBooking(updated);
      setIsSubmitted(true);
    } catch (err: any) {
      setConfirmError(err?.message || 'Unable to confirm transfer. Your 15-minute hold may have expired.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleFinishAndClose = () => {
    if (confirmedBooking) {
      onPaymentSuccess(confirmedBooking);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#121826] rounded-3xl max-w-xl w-full shadow-2xl border border-slate-700 overflow-hidden text-white flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-[#0B0F19] px-6 py-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center font-black text-white text-sm shadow">
              QR
            </div>
            <div>
              <h3 className="text-base font-heading font-black text-white">
                {isSubmitted ? 'Payment Confirmation Submitted' : 'VietQR Payment & Court Reservation'}
              </h3>
              <p className="text-xs text-slate-400">
                MB Bank · 0002090671521 · HOANG QUOC DUY
              </p>
            </div>
          </div>
          <button
            onClick={handleFinishAndClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">

          {/* VIEW STATE 2: ONE-WAY CONFIRMATION SCREEN (NO TIMEOUT AUTO-CLOSE) */}
          {isSubmitted ? (
            <div className="text-center py-6 space-y-5 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-950/50">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>

              <div className="space-y-1.5">
                <h4 className="font-heading font-black text-xl text-white">
                  Payment Submitted Successfully!
                </h4>
                <p className="text-xs text-emerald-400 font-semibold max-w-md mx-auto leading-relaxed">
                  We will verify your transaction and contact you shortly to confirm your reservation.
                </p>
              </div>

              {/* Reservation summary card */}
              <div className="p-4 rounded-2xl bg-[#0B0F19] border border-slate-800 text-xs text-left space-y-2.5 max-w-md mx-auto">
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Booking Code:</span>
                  <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">{booking.bookingCode}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Court:</span>
                  <span className="font-bold text-orange-400">{booking.courtName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Session & Date:</span>
                  <span className="font-bold text-white">{booking.startTime} - {booking.endTime} ({booking.bookingDate})</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Customer:</span>
                  <span className="font-bold text-white">{booking.customerName} ({booking.customerPhone})</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Total Amount:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">{amountFormatted}</span>
                </div>
                <div className="flex justify-between items-center pt-1 text-[11px] text-slate-400">
                  <span>Transfer Reference:</span>
                  <span className="font-mono font-bold text-amber-300">{transferContent}</span>
                </div>
              </div>

              {/* Urgent Contact notice */}
              <div className="p-3 bg-[#131A29] rounded-2xl border border-blue-500/30 max-w-md mx-auto text-left text-xs space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  <span>Need Immediate Confirmation?</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Call or Zalo the venue manager at <strong className="text-amber-400 font-mono">0768 299 329</strong> for urgent inquiries.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleFinishAndClose}
                  className="w-full max-w-md py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-red-950/50 transition-all cursor-pointer"
                >
                  Done & Close Receipt
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* VIEW STATE 1: QR CODE & TRANSFER INFO */}

              {/* Reservation Hold Timer Bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-orange-950/40 rounded-2xl border border-orange-500/30 text-xs">
                <div className="flex items-center gap-2 text-orange-200 font-medium">
                  <Clock className="w-4 h-4 text-orange-400 animate-pulse" />
                  <span>Court slot hold duration:</span>
                </div>
                <span className="font-mono font-bold text-orange-400 text-sm">{formatTime(timeLeft)}</span>
              </div>

              {/* VietQR Image + Bank Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                
                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl border border-slate-700 shadow-xl">
                  <img
                    src={qrUrl}
                    alt="VietQR MB Bank DVA"
                    className="w-48 h-48 object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                  <div className="mt-2.5 text-center">
                    <span className="inline-block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Scan with Any Vietnam Banking App or MoMo
                    </span>
                  </div>
                </div>

                {/* Beneficiary Details & Copy buttons */}
                <div className="space-y-2.5 text-xs">
                  
                  <div className="p-2.5 bg-[#0B0F19] rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Beneficiary Bank:</span>
                    <span className="font-bold text-white text-xs">{bankName}</span>
                  </div>

                  <div className="p-2.5 bg-[#0B0F19] rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Account Number:</span>
                      <span className="font-mono font-black text-sm text-orange-400">{accountNo}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(accountNo, setCopiedAccount)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAccount ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="p-2.5 bg-[#0B0F19] rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Account Holder:</span>
                    <span className="font-bold text-white uppercase text-xs">{accountName}</span>
                  </div>

                  <div className="p-2.5 bg-[#0B0F19] rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Due:</span>
                      <span className="font-mono font-black text-sm text-red-400 tabular-nums">{amountFormatted}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(String(booking.totalPrice), setCopiedAmount)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAmount ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Transfer Note with Court & Slot */}
                  <div className="p-2.5 bg-red-950/30 rounded-xl border border-red-800/80 flex items-center justify-between">
                    <div className="pr-1 overflow-hidden">
                      <span className="text-[10px] text-red-300 uppercase font-bold block">Transfer Memo (Required):</span>
                      <span className="font-mono font-black text-xs text-white tracking-wide break-all">{transferContent}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(transferContent, setCopiedCode)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-900/60 border border-red-700 text-red-200 hover:text-white flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                </div>

              </div>

              {/* Direct Support Callout */}
              <div className="p-3 bg-[#131A29] rounded-2xl border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                    <span>Need immediate booking assistance?</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Contact DVA hotline / Zalo: <strong className="text-amber-400 font-mono">0768 299 329</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="https://zalo.me/0768299329"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-[#1E6FFF] hover:bg-[#155de0] text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors"
                  >
                    <span>Chat Zalo</span>
                  </a>
                  <a
                    href="tel:0768299329"
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1 shadow transition-colors"
                  >
                    <span>0768 299 329</span>
                  </a>
                </div>
              </div>

              {/* One-Way Customer Confirmation Button */}
              <div className="pt-2">
                {confirmError && (
                  <div className="mb-3 p-3 rounded-xl bg-red-950/60 border border-red-700 text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{confirmError}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleConfirmTransfer}
                  disabled={isConfirming}
                  className="w-full py-4 px-6 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:brightness-110 shadow-xl shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
                >
                  {isConfirming ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Payment Confirmation...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>I Have Completed Payment Transfer</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-2">
                  Click after completing your banking transfer. Our team will verify and contact you shortly.
                </p>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};

