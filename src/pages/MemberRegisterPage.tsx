import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  UserPlus, 
  Home,
  MapPin,
  Printer,
  QrCode,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { VolleyballPosition, PlayerLevel, RotationKnowledge, MemberApplication } from '../types';
import { memberService, googleScriptSyncService } from '../services/api';

export const MemberRegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialLevel = (() => {
    const raw = (searchParams.get('level') || '').trim().toUpperCase();
    return raw === 'SENIOR' || raw === 'JUNIOR' || raw === 'YOUTH' ? (raw as PlayerLevel) : 'JUNIOR';
  })();

  const [formData, setFormData] = useState({
    fullName: '',
    dob: '2005-01-01',
    position: 'OH' as VolleyballPosition,
    hometownCountry: '',
    desiredJerseyNumber: '' as string | number,
    level: initialLevel,
    height: '',
    weight: '',
    spikeReach: '',
    blockReach: '',
    gmail: '',
    instagram: '',
    zalo: '',
    rotationKnowledge: '5-1' as RotationKnowledge,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<MemberApplication | null>(() => {
    try {
      const saved = sessionStorage.getItem('dva_submitted_app');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleClosePass = () => {
    setSubmittedApp(null);
    try {
      sessionStorage.removeItem('dva_submitted_app');
    } catch {
      // ignore
    }
  };

  const handleNumericInput = (
    field: 'height' | 'weight' | 'spikeReach' | 'blockReach' | 'desiredJerseyNumber',
    val: string,
    errorExample: string
  ) => {
    // If cleared, reset value and clear error
    if (val === '') {
      setFormData((prev) => ({ ...prev, [field]: '' }));
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
      return;
    }

    // Only allow integer digits (0-9)
    if (!/^\d+$/.test(val)) {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: `Please enter a whole number only (e.g., ${errorExample})`,
      }));
      setFormData((prev) => ({ ...prev, [field]: val }));
    } else {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
      setFormData((prev) => ({ ...prev, [field]: val }));
    }
  };

  const handleNumericKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: 'height' | 'weight' | 'spikeReach' | 'blockReach' | 'desiredJerseyNumber',
    errorExample: string
  ) => {
    // Allow navigational and editing keys
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Escape' ||
      e.key === 'Enter' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }

    // Block non-digit characters and display error
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      setFieldErrors((prev) => ({
        ...prev,
        [field]: `Please enter a whole number only (e.g., ${errorExample})`,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Please enter your Full Name';
    }
    if (!formData.dob) {
      errors.dob = 'Please select your Date of Birth';
    }
    if (!formData.hometownCountry.trim()) {
      errors.hometownCountry = 'Please enter your Hometown / City';
    }
    if (!formData.gmail.trim()) {
      errors.gmail = 'Please enter your Email Address';
    }
    if (!formData.zalo.trim()) {
      errors.zalo = 'Please enter your Phone / Zalo Number';
    }

    // Height validation
    const heightStr = String(formData.height).trim();
    if (!heightStr) {
      errors.height = 'Please enter your Height';
    } else if (!/^\d+$/.test(heightStr)) {
      errors.height = 'Please enter a whole number only (e.g., 178 instead of 1.78m)';
    }

    // Weight validation
    const weightStr = String(formData.weight).trim();
    if (!weightStr) {
      errors.weight = 'Please enter your Weight';
    } else if (!/^\d+$/.test(weightStr)) {
      errors.weight = 'Please enter a whole number only (e.g., 70 instead of 70kg)';
    }

    // Spike reach validation
    const spikeStr = String(formData.spikeReach).trim();
    if (!spikeStr) {
      errors.spikeReach = 'Please enter your Spike Reach';
    } else if (!/^\d+$/.test(spikeStr)) {
      errors.spikeReach = 'Please enter a whole number only (e.g., 305 instead of 3.05m)';
    }

    // Block reach validation
    const blockStr = String(formData.blockReach).trim();
    if (!blockStr) {
      errors.blockReach = 'Please enter your Block Reach';
    } else if (!/^\d+$/.test(blockStr)) {
      errors.blockReach = 'Please enter a whole number only (e.g., 290 instead of 2.90m)';
    }

    // Preferred Jersey validation (if provided)
    const jerseyStr = String(formData.desiredJerseyNumber).trim();
    if (jerseyStr && !/^\d+$/.test(jerseyStr)) {
      errors.desiredJerseyNumber = 'Please enter a whole number only (e.g., 15)';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      alert('Please fill in all required fields (*) with valid values.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedJersey = jerseyStr ? parseInt(jerseyStr, 10) : 0;
      const parsedHeight = parseInt(heightStr, 10);
      const parsedWeight = parseInt(weightStr, 10);
      const parsedSpike = parseInt(spikeStr, 10);
      const parsedBlock = parseInt(blockStr, 10);

      const created = await memberService.register({
        ...formData,
        desiredJerseyNumber: parsedJersey,
        height: parsedHeight,
        weight: parsedWeight,
        spikeReach: parsedSpike,
        blockReach: parsedBlock,
        instagram: formData.instagram.trim() ? formData.instagram.trim() : 'None',
      });
      setSubmittedApp(created);
      try {
        sessionStorage.setItem('dva_submitted_app', JSON.stringify(created));
      } catch {
        // ignore
      }

      // Realtime Google Sheets Sync (Tab: TuyenThanhVien)
      googleScriptSyncService.syncToGoogleSheet('TuyenThanhVien', {
        'Họ và tên': formData.fullName,
        'Ngày sinh': formData.dob,
        'Vị trí': formData.position,
        'Cấp độ': formData.level === 'SENIOR' ? 'Senior (Advanced, 3+ yrs)' : formData.level === 'JUNIOR' ? 'Junior (Intermediate)' : 'Youth',
        'Số áo mong muốn': parsedJersey,
        'Chiều cao (cm)': parsedHeight,
        'Cân nặng (kg)': parsedWeight,
        'Bật đập (cm)': parsedSpike,
        'Bật chắn (cm)': parsedBlock,
        'Số Zalo': formData.zalo,
        'Email': formData.gmail,
        'Instagram': formData.instagram.trim() || 'None',
        'Chiến thuật 5-1': formData.rotationKnowledge,
        'Quê quán': formData.hometownCountry,
        'Thời gian gửi': new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })
      });
    } catch (err) {
      alert('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const glassInput = (hasError?: boolean) =>
    `w-full min-w-0 py-2.5 sm:py-3 px-3.5 text-base sm:text-sm placeholder:text-sm placeholder:text-white/40 rounded-xl bg-white/[0.05] border ${
      hasError ? 'border-red-500/80 focus:border-red-500' : 'border-white/10 focus:border-orange-500/60'
    } focus:bg-white/[0.08] text-white outline-none transition-all`;

  const tryoutFee = submittedApp?.entryFee ?? 100000;
  const tryoutQrUrl = submittedApp
    ? `https://img.vietqr.io/image/MB-0002090671521-compact2.png?amount=${tryoutFee}&addInfo=${encodeURIComponent(`TRYOUT ${submittedApp.fullName}`)}&accountName=HOANG%20QUOC%20DUY`
    : '';

  return (
    <div className="min-h-screen text-white py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2.5 sm:space-y-3">
          <span className="dva-glass-pill inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-[11px] sm:text-xs font-bold text-orange-300 uppercase tracking-wider sm:tracking-widest rounded-full max-w-full">
            <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span>Season 2026 Tryouts &amp; Registration</span>
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white font-heading">
            Official Player Registration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Submit your athletic profile and jump reach metrics. Applications are reviewed directly by the DVA coaching staff within 24 hours.
          </p>
          <div className="pt-1 flex justify-center">
            <Link
              to="/information/skill-levels"
              className="dva-glass-pill inline-flex items-center justify-center gap-2 max-w-full px-4 py-2 text-xs sm:text-sm font-bold text-blue-200 hover:bg-white/10 !rounded-2xl sm:!rounded-full leading-snug transition-colors"
            >
              <span className="sm:hidden">🇺🇸 Bảng Trình Độ USAV (C → Open)</span>
              <span className="hidden sm:inline">🇺🇸 Xem Bảng Phân Cấp Trình Độ Chuẩn USAV (C → Open)</span>
            </Link>
          </div>
        </div>

        {/* Official DVA Athlete Membership Card Notification Modal */}
        {submittedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
            <div className="max-w-xl w-full rounded-3xl bg-[#0B0D12]/85 backdrop-blur-2xl border border-white/15 shadow-[0_24px_64px_rgba(0,0,0,0.65)] overflow-hidden text-white relative max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="bg-white/[0.03] px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center font-black text-white text-base shadow-lg shadow-orange-950/50 shrink-0">
                    DVA
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-black text-sm sm:text-base text-white tracking-wide truncate">
                      ĐĂNG KÝ THÀNH CÔNG!
                    </h3>
                    <p className="text-[11px] text-orange-300 font-semibold truncate">
                      DVA Official Tryout / Member Pass
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClosePass}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/15 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer shrink-0 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Pass Body */}
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto no-scrollbar">
                {/* Spatial Glass DVA Member Pass Card */}
                <div className="rounded-3xl bg-gradient-to-br from-orange-500/20 via-rose-600/15 to-white/[0.04] backdrop-blur-2xl border border-white/20 p-4 sm:p-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute right-4 -bottom-6 font-black text-8xl text-white/[0.04] select-none pointer-events-none font-heading">
                    DVA
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-2.5">
                    <div className="min-w-0 w-full sm:w-auto">
                      <span className="text-[10px] font-black uppercase tracking-widest text-orange-300 block">
                        DVA VOLLEYBALL CLUB · OFFICIAL MEMBER PASS
                      </span>
                      <h2 className="font-heading font-black text-xl sm:text-2xl text-white tracking-tight mt-1 truncate">
                        {submittedApp.fullName}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-red-600 to-orange-500 text-white shadow">
                          {submittedApp.position} · {submittedApp.level === 'YOUTH' ? 'KID / YOUTH' : submittedApp.level}
                        </span>
                        <span className="dva-glass-pill px-2.5 py-0.5 text-[11px] font-mono text-white">
                          Jersey #{submittedApp.desiredJerseyNumber || 'TBD'}
                        </span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-200 border border-amber-400/40 shrink-0">
                      PENDING REVIEW
                    </span>
                  </div>

                  {/* Metrics Grid (1-col mobile -> 2-col sm+) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/10">
                    <div className="bg-white/[0.05] px-3 py-2 rounded-xl border border-white/10 flex items-center justify-between sm:block overflow-hidden">
                      <span className="text-[10px] uppercase font-bold text-slate-300 block">Height / Weight</span>
                      <span className="font-mono font-bold text-white text-xs">{submittedApp.height}cm · {submittedApp.weight}kg</span>
                    </div>
                    <div className="bg-white/[0.05] px-3 py-2 rounded-xl border border-white/10 flex items-center justify-between sm:block overflow-hidden">
                      <span className="text-[10px] uppercase font-bold text-slate-300 block">Spike / Block Reach</span>
                      <span className="font-mono font-bold text-orange-300 text-xs">{submittedApp.spikeReach}cm / {submittedApp.blockReach}cm</span>
                    </div>
                    <div className="bg-white/[0.05] px-3 py-2 rounded-xl border border-white/10 flex items-center justify-between sm:block overflow-hidden">
                      <span className="text-[10px] uppercase font-bold text-slate-300 block">Tactical System</span>
                      <span className="font-mono font-bold text-amber-300 text-xs">{submittedApp.rotationKnowledge}</span>
                    </div>
                    <div className="bg-white/[0.05] px-3 py-2 rounded-xl border border-white/10 flex items-center justify-between sm:block overflow-hidden">
                      <span className="text-[10px] uppercase font-bold text-slate-300 block">Mã hồ sơ</span>
                      <span className="font-mono font-bold text-white text-xs truncate">{submittedApp.id}</span>
                    </div>
                  </div>
                </div>

                {/* VietQR Try-Out Fee Info */}
                {submittedApp.paymentStatus !== 'FREE' && tryoutFee > 0 && (
                  <div className="dva-glass-card !rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                    <img
                      src={tryoutQrUrl}
                      alt="VietQR lệ phí Try-Out DVA"
                      className="w-28 h-28 rounded-xl bg-white p-1 shrink-0 object-contain"
                    />
                    <div className="space-y-1 text-center sm:text-left text-xs min-w-0">
                      <div className="inline-flex items-center gap-1.5 text-orange-300 font-bold">
                        <QrCode className="w-3.5 h-3.5 shrink-0" />
                        <span>Lệ phí Try-Out: {tryoutFee.toLocaleString('vi-VN')} đ (VietQR)</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        MB Bank · <strong className="font-mono text-white">0002090671521</strong> · <strong>HOANG QUOC DUY</strong>
                      </p>
                      <p className="text-[10px] text-slate-400 break-words">
                        Nội dung CK: <span className="font-mono text-amber-300">TRYOUT {submittedApp.fullName}</span> (hoặc đóng trực tiếp tại sân).
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <Link
                    to="/"
                    onClick={handleClosePass}
                    className="sm:flex-1 py-2.5 px-4 rounded-full font-bold text-xs text-white bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 shadow-lg inline-flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Về Trang Chủ</span>
                  </Link>
                  <Link
                    to="/services/court-map"
                    onClick={handleClosePass}
                    className="dva-glass-pill sm:flex-1 py-2.5 px-4 font-bold text-xs text-slate-200 hover:text-white hover:bg-white/10 inline-flex items-center justify-center gap-1.5 transition-all"
                  >
                    <MapPin className="w-3.5 h-3.5 text-orange-400" />
                    <span>Xem Bản Đồ Sân</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="dva-glass-pill py-2.5 px-4 font-semibold text-xs text-slate-300 hover:text-white hover:bg-white/10 inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>In thẻ</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="dva-glass-panel rounded-3xl backdrop-blur-2xl p-4 sm:p-8 space-y-5 sm:space-y-6">
          
          {/* Section 1: Basic Information */}
          <div className="my-2 sm:my-4 space-y-3.5 sm:space-y-5">
            <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider border-b border-white/10 pb-2.5 sm:pb-3 flex items-start sm:items-center gap-3">
              <span className="w-5 h-5 mt-0.5 sm:mt-0 rounded-full bg-gradient-to-br from-red-600 to-orange-500 text-white text-[10px] flex items-center justify-center font-bold shrink-0">1</span>
              <span>PERSONAL INFORMATION &amp; PREFERRED PLAYING POSITION</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  id="register-fullname"
                  autoComplete="name"
                  required
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData({ ...formData, fullName: e.target.value });
                    if (e.target.value.trim() && fieldErrors.fullName) {
                      setFieldErrors((prev) => ({ ...prev, fullName: '' }));
                    }
                  }}
                  placeholder="e.g., Marcus Tran / Alex Nguyen"
                  className={glassInput(Boolean(fieldErrors.fullName))}
                />
                {fieldErrors.fullName && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.fullName}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  required
                  value={formData.dob}
                  onChange={(e) => {
                    setFormData({ ...formData, dob: e.target.value });
                    if (e.target.value && fieldErrors.dob) {
                      setFieldErrors((prev) => ({ ...prev, dob: '' }));
                    }
                  }}
                  className={`${glassInput(Boolean(fieldErrors.dob))} font-mono`}
                />
                {fieldErrors.dob && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.dob}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5">
                  Primary Playing Position *
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value as VolleyballPosition })}
                  className={`${glassInput()} font-semibold cursor-pointer`}
                >
                  <option value="OH" className="bg-[#0B0D12] text-white">Outside Hitter (OH)</option>
                  <option value="OP" className="bg-[#0B0D12] text-white">Opposite Spiker (OP)</option>
                  <option value="MB" className="bg-[#0B0D12] text-white">Middle Blocker (MB)</option>
                  <option value="S" className="bg-[#0B0D12] text-white">Setter (S)</option>
                  <option value="L" className="bg-[#0B0D12] text-white">Libero (L)</option>
                </select>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1 sm:mb-1.5">
                  <label className="block text-xs sm:text-sm font-medium text-slate-300">
                    Competitive Squad Level *
                  </label>
                  <Link
                    to="/information/skill-levels"
                    className="text-[11px] font-bold text-blue-300 hover:text-orange-400 transition-colors inline-flex items-center gap-1"
                  >
                    <span>🇺🇸 Bảng phân cấp USAV</span>
                  </Link>
                </div>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value as PlayerLevel })}
                  className={`${glassInput()} font-semibold cursor-pointer`}
                >
                  <option value="SENIOR" className="bg-[#0B0D12] text-white">SENIOR (Advanced &amp; Tactics · 3+ Years Experience)</option>
                  <option value="JUNIOR" className="bg-[#0B0D12] text-white">JUNIOR (Intermediate Development Squad)</option>
                  <option value="YOUTH" className="bg-[#0B0D12] text-white">YOUTH (Beginner / Fundamentals · U14 - U18)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5">
                  Preferred Jersey Number (#)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.desiredJerseyNumber}
                  onKeyDown={(e) => handleNumericKeyDown(e, 'desiredJerseyNumber', '15')}
                  onChange={(e) => handleNumericInput('desiredJerseyNumber', e.target.value, '15')}
                  placeholder="e.g., 15"
                  className={`${glassInput(Boolean(fieldErrors.desiredJerseyNumber))} font-mono appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  style={{ MozAppearance: 'textfield' }}
                />
                {fieldErrors.desiredJerseyNumber && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.desiredJerseyNumber}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5">
                  Hometown / City *
                </label>
                <input
                  type="text"
                  required
                  value={formData.hometownCountry}
                  onChange={(e) => {
                    setFormData({ ...formData, hometownCountry: e.target.value });
                    if (e.target.value.trim() && fieldErrors.hometownCountry) {
                      setFieldErrors((prev) => ({ ...prev, hometownCountry: '' }));
                    }
                  }}
                  placeholder="e.g., Hanoi, Ho Chi Minh City, Da Nang..."
                  className={glassInput(Boolean(fieldErrors.hometownCountry))}
                />
                {fieldErrors.hometownCountry && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.hometownCountry}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Physical Metrics */}
          <div className="my-2 sm:my-4 space-y-3.5 sm:space-y-5">
            <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider border-b border-white/10 pb-2.5 sm:pb-3 flex items-start sm:items-center gap-3">
              <span className="w-5 h-5 mt-0.5 sm:mt-0 rounded-full bg-gradient-to-br from-red-600 to-orange-500 text-white text-[10px] flex items-center justify-center font-bold shrink-0">2</span>
              <span>PHYSICAL MEASUREMENTS &amp; JUMP REACH</span>
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="flex flex-col">
                <label className="text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5 min-h-[38px] sm:min-h-[44px] flex items-end leading-snug">
                  <span>Height (cm) *</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={formData.height}
                  onKeyDown={(e) => handleNumericKeyDown(e, 'height', '178 instead of 1.78m')}
                  onChange={(e) => handleNumericInput('height', e.target.value, '178 instead of 1.78m')}
                  placeholder="e.g., 178"
                  className={`${glassInput(Boolean(fieldErrors.height))} font-mono font-bold appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  style={{ MozAppearance: 'textfield' }}
                />
                {fieldErrors.height && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-semibold flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.height}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col">
                <label className="text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5 min-h-[38px] sm:min-h-[44px] flex items-end leading-snug">
                  <span>Weight (kg) *</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={formData.weight}
                  onKeyDown={(e) => handleNumericKeyDown(e, 'weight', '70 instead of 70kg')}
                  onChange={(e) => handleNumericInput('weight', e.target.value, '70 instead of 70kg')}
                  placeholder="e.g., 70"
                  className={`${glassInput(Boolean(fieldErrors.weight))} font-mono font-bold appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  style={{ MozAppearance: 'textfield' }}
                />
                {fieldErrors.weight && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-semibold flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.weight}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col">
                <label className="text-xs sm:text-sm font-medium text-rose-400 mb-1 sm:mb-1.5 min-h-[38px] sm:min-h-[44px] flex items-end leading-snug">
                  <span>Spike Reach (cm) *</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={formData.spikeReach}
                  onKeyDown={(e) => handleNumericKeyDown(e, 'spikeReach', '305 instead of 3.05m')}
                  onChange={(e) => handleNumericInput('spikeReach', e.target.value, '305 instead of 3.05m')}
                  placeholder="e.g., 305"
                  className={`${glassInput(Boolean(fieldErrors.spikeReach))} font-mono font-bold !text-rose-300 appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  style={{ MozAppearance: 'textfield' }}
                />
                {fieldErrors.spikeReach && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-semibold flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.spikeReach}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col">
                <label className="text-xs sm:text-sm font-medium text-orange-400 mb-1 sm:mb-1.5 min-h-[38px] sm:min-h-[44px] flex items-end leading-snug">
                  <span>Block Reach (cm) *</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={formData.blockReach}
                  onKeyDown={(e) => handleNumericKeyDown(e, 'blockReach', '290 instead of 2.90m')}
                  onChange={(e) => handleNumericInput('blockReach', e.target.value, '290 instead of 2.90m')}
                  placeholder="e.g., 290"
                  className={`${glassInput(Boolean(fieldErrors.blockReach))} font-mono font-bold !text-orange-300 appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  style={{ MozAppearance: 'textfield' }}
                />
                {fieldErrors.blockReach && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-semibold flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.blockReach}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Tactical Rotation & Contact */}
          <div className="my-2 sm:my-4 space-y-3.5 sm:space-y-5">
            <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider border-b border-white/10 pb-2.5 sm:pb-3 flex items-start sm:items-center gap-3">
              <span className="w-5 h-5 mt-0.5 sm:mt-0 rounded-full bg-gradient-to-br from-red-600 to-orange-500 text-white text-[10px] flex items-center justify-center font-bold shrink-0">3</span>
              <span>TACTICAL ROTATION SYSTEMS &amp; CONTACT</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                  Familiarity with Volleyball Rotational Systems:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {[
                    { 
                      id: '5-1', 
                      label: '5-1 System', 
                      desc: '1 dedicated setter across all 6 rotations' 
                    },
                    { 
                      id: '6-2', 
                      label: '6-2 System', 
                      desc: '2 back-row setters with 3 front-row hitters' 
                    },
                    { 
                      id: '4-2', 
                      label: '4-2 System', 
                      desc: '2 front-row setters' 
                    },
                    { 
                      id: 'BEGINNER', 
                      label: 'Beginner / Fundamentals', 
                      desc: 'Will learn court rotations during training' 
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, rotationKnowledge: item.id as RotationKnowledge })}
                      className={`dva-glass-pill !rounded-2xl p-3.5 text-left transition-all cursor-pointer ${
                        formData.rotationKnowledge === item.id
                          ? '!border-orange-500/70 !bg-gradient-to-br from-orange-500/20 to-rose-600/20 text-white shadow-lg shadow-orange-950/30'
                          : 'hover:!bg-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs sm:text-sm">{item.label}</div>
                      <div className="text-[10px] sm:text-xs text-slate-400 mt-1">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5">
                  Contact Email *
                </label>
                <input
                  type="email"
                  name="email"
                  id="register-email"
                  autoComplete="email"
                  required
                  value={formData.gmail}
                  onChange={(e) => {
                    setFormData({ ...formData, gmail: e.target.value });
                    if (e.target.value.trim() && fieldErrors.gmail) {
                      setFieldErrors((prev) => ({ ...prev, gmail: '' }));
                    }
                  }}
                  placeholder="marcus.tran@gmail.com"
                  className={glassInput(Boolean(fieldErrors.gmail))}
                />
                {fieldErrors.gmail && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.gmail}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5">
                  Phone Number (WhatsApp / Zalo) *
                </label>
                <input
                  type="tel"
                  name="tel"
                  id="register-tel"
                  autoComplete="tel"
                  required
                  value={formData.zalo}
                  onChange={(e) => {
                    setFormData({ ...formData, zalo: e.target.value });
                    if (e.target.value.trim() && fieldErrors.zalo) {
                      setFieldErrors((prev) => ({ ...prev, zalo: '' }));
                    }
                  }}
                  placeholder="e.g., 0912 345 678"
                  className={glassInput(Boolean(fieldErrors.zalo))}
                />
                {fieldErrors.zalo && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.zalo}</span>
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5">
                  Instagram Handle (Optional)
                </label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="@your_handle or None"
                  className={glassInput()}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-full bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white shadow-lg shadow-orange-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <div className="flex flex-col items-center text-center">
                <span className="text-sm font-bold tracking-wide uppercase leading-tight">Submitting Application...</span>
                <span className="text-xs font-medium text-white/90 leading-tight">Syncing your athlete profile...</span>
              </div>
            ) : (
              <>
                <UserPlus className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-bold tracking-wide uppercase leading-tight text-white">
                  Submit Registration
                </span>
              </>
            )}
          </button>

        </form>

      </div>
    </div>
  );
};
