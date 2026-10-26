import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  UserPlus, 
  Check, 
  Send, 
  Table, 
  ShieldCheck, 
  Info,
  AlertCircle
} from 'lucide-react';
import { VolleyballPosition, PlayerLevel, RotationKnowledge, MemberApplication } from '../types';
import { memberService, googleScriptSyncService } from '../services/api';

export const MemberRegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '2005-01-01',
    position: 'OH' as VolleyballPosition,
    hometownCountry: '',
    desiredJerseyNumber: '' as string | number,
    level: 'JUNIOR' as PlayerLevel,
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
        [field]: `Vui lòng chỉ nhập số nguyên (ví dụ: ${errorExample})`,
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
        [field]: `Vui lòng chỉ nhập số nguyên (ví dụ: ${errorExample})`,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Vui lòng nhập Họ và tên / Please enter Full Name';
    }
    if (!formData.dob) {
      errors.dob = 'Vui lòng chọn Ngày sinh / Please select Date of Birth';
    }
    if (!formData.hometownCountry.trim()) {
      errors.hometownCountry = 'Vui lòng nhập Quê quán / Please enter Hometown';
    }
    if (!formData.gmail.trim()) {
      errors.gmail = 'Vui lòng nhập Email / Please enter Email';
    }
    if (!formData.zalo.trim()) {
      errors.zalo = 'Vui lòng nhập Số điện thoại hoặc Zalo / Please enter Phone/Zalo';
    }

    // Height validation
    const heightStr = String(formData.height).trim();
    if (!heightStr) {
      errors.height = 'Vui lòng nhập Chiều cao / Please enter Height';
    } else if (!/^\d+$/.test(heightStr)) {
      errors.height = 'Vui lòng chỉ nhập số nguyên (ví dụ: 160 thay vì 1m6)';
    }

    // Weight validation
    const weightStr = String(formData.weight).trim();
    if (!weightStr) {
      errors.weight = 'Vui lòng nhập Cân nặng / Please enter Weight';
    } else if (!/^\d+$/.test(weightStr)) {
      errors.weight = 'Vui lòng chỉ nhập số nguyên (ví dụ: 55 thay vì 55kg)';
    }

    // Spike reach validation
    const spikeStr = String(formData.spikeReach).trim();
    if (!spikeStr) {
      errors.spikeReach = 'Vui lòng nhập Tầm bật đà / Please enter Spike Reach';
    } else if (!/^\d+$/.test(spikeStr)) {
      errors.spikeReach = 'Vui lòng chỉ nhập số nguyên (ví dụ: 300 thay vì 3m)';
    }

    // Block reach validation
    const blockStr = String(formData.blockReach).trim();
    if (!blockStr) {
      errors.blockReach = 'Vui lòng nhập Tầm bật chắn / Please enter Block Reach';
    } else if (!/^\d+$/.test(blockStr)) {
      errors.blockReach = 'Vui lòng chỉ nhập số nguyên (ví dụ: 285 thay vì 2m85)';
    }

    // Preferred Jersey validation (if provided)
    const jerseyStr = String(formData.desiredJerseyNumber).trim();
    if (jerseyStr && !/^\d+$/.test(jerseyStr)) {
      errors.desiredJerseyNumber = 'Vui lòng chỉ nhập số nguyên (ví dụ: 15)';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      alert('Vui lòng kiểm tra và hoàn thiện các trường thông tin hợp lệ (*) / Please complete all required fields.');
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
      alert('Lỗi gửi hồ sơ. Vui lòng thử lại. / Error submitting application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2.5 sm:space-y-3">
          <span className="text-xs font-bold text-red-500 uppercase tracking-widest bg-red-950/60 border border-red-800 px-3 py-1 rounded-full">
            Mùa Giải 2026 / Season 2026
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white font-heading">
            Player Registration / Đăng Ký
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Submit your athletic profile and reach metrics. Applications will be reviewed directly by the coaching staff within 24 hours. / 
            Điền hồ sơ thể hình và tầm với của bạn. Chúng tôi sẽ xét duyệt và phản hồi trong 24 giờ.
          </p>
        </div>

        {/* Official DVA Athlete Membership Card Notification Modal */}
        {submittedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div className="max-w-xl w-full bg-[#0F141F] rounded-2xl sm:rounded-3xl border border-amber-500/50 shadow-2xl overflow-hidden text-white relative">
              {/* Card Ambient Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="bg-gradient-to-r from-red-950 via-[#161B26] to-[#121620] px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center font-black text-white text-base shadow-lg shadow-red-950">
                    DVA
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-sm sm:text-base text-white tracking-wide">
                      REGISTRATION SUBMITTED / ĐÃ GỬI HỒ SƠ!
                    </h3>
                    <p className="text-[11px] text-amber-400 font-semibold">
                      DVA Volleyball Club · Athlete Membership Pass / Thẻ Vận Động Viên
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClosePass}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Physical Athlete Card Representation */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                
                {/* The Pass Card */}
                <div className="rounded-2xl sm:rounded-3xl border-2 border-amber-500/60 bg-gradient-to-br from-[#1A2234] via-[#121826] to-[#0A0E17] p-4 sm:p-6 shadow-2xl relative overflow-hidden group">
                  {/* Decorative background watermark */}
                  <div className="absolute right-4 -bottom-6 font-black text-8xl text-white/[0.03] select-none pointer-events-none font-heading">
                    DVA
                  </div>

                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                        DVA VOLLEYBALL CLUB · ATHLETE MEMBERSHIP PASS
                      </span>
                      <h2 className="font-heading font-black text-xl sm:text-3xl text-white tracking-tight mt-1">
                        {submittedApp.fullName}
                      </h2>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow">
                          {submittedApp.position} · {submittedApp.level}
                        </span>
                        <span className="text-[11px] font-mono text-slate-300">
                          Jersey #{submittedApp.desiredJerseyNumber}
                        </span>
                      </div>
                    </div>

                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#090D14] border border-amber-500/40 p-1.5 flex flex-col items-center justify-center shrink-0 shadow-inner">
                      <span className="text-[8px] font-mono text-slate-400 uppercase">VERIFIED</span>
                      <span className="font-mono font-bold text-xs text-amber-400">PASSED</span>
                      <span className="text-[8px] text-emerald-400">✓ SYNCED</span>
                    </div>
                  </div>

                  {/* Metrics grid inside card */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-800/80 text-center">
                    <div className="bg-[#0B0F19]/80 p-2 rounded-xl border border-slate-800">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Height / Weight</span>
                      <span className="font-mono font-bold text-white text-xs">{submittedApp.height}cm · {submittedApp.weight}kg</span>
                    </div>
                    <div className="bg-[#0B0F19]/80 p-2 rounded-xl border border-slate-800">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Spike Reach</span>
                      <span className="font-mono font-bold text-red-400 text-xs">{submittedApp.spikeReach} cm</span>
                    </div>
                    <div className="bg-[#0B0F19]/80 p-2 rounded-xl border border-slate-800">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Tactical System</span>
                      <span className="font-mono font-bold text-amber-400 text-xs">System {submittedApp.rotationKnowledge}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Pass ID: <strong>{submittedApp.id}</strong></span>
                    <span>Contact: <strong className="text-white">{submittedApp.zalo}</strong></span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
                  <Link
                    to="/players"
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl font-black text-xs text-white bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 shadow-lg text-center transition-all cursor-pointer"
                  >
                    View Squad Roster / Xem Đội Hình
                  </Link>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full sm:w-auto py-3 px-5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
                  >
                    Print / Lưu Thẻ
                  </button>
                  <button
                    type="button"
                    onClick={handleClosePass}
                    className="w-full sm:w-auto py-3 px-5 rounded-xl font-bold text-xs bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    Close / Đóng
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[#161F30] rounded-2xl sm:rounded-3xl border border-slate-800 p-4 sm:p-8 md:p-10 shadow-2xl space-y-4 sm:space-y-6">
          
          {/* Section 1: Basic Information */}
          <div className="my-4 sm:my-6 space-y-3.5 sm:space-y-5">
            <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider border-b border-slate-800 pb-2.5 sm:pb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold shrink-0">1</span>
              <span>PERSONAL INFORMATION & DESIRED PLAYING POSITION / THÔNG TIN CÁ NHÂN & VỊ TRÍ THI ĐẤU</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5">
                  Full Name / Họ và tên *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData({ ...formData, fullName: e.target.value });
                    if (e.target.value.trim() && fieldErrors.fullName) {
                      setFieldErrors((prev) => ({ ...prev, fullName: '' }));
                    }
                  }}
                  placeholder="VD: Nguyễn Văn A / Marcus Tran"
                  className={`w-full py-2.5 sm:py-3 px-3.5 text-sm placeholder:text-sm placeholder:text-slate-500 rounded-lg bg-slate-900/60 border ${
                    fieldErrors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-slate-700/80 focus:ring-red-600'
                  } focus:ring-2 text-white outline-none transition-colors`}
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
                  Date of Birth / Ngày sinh *
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
                  className={`w-full py-2.5 sm:py-3 px-3.5 text-sm placeholder:text-sm placeholder:text-slate-500 rounded-lg bg-slate-900/60 border ${
                    fieldErrors.dob ? 'border-red-500 focus:ring-red-500' : 'border-slate-700/80 focus:ring-red-600'
                  } focus:ring-2 text-white outline-none font-mono transition-colors`}
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
                  Primary Position / Vị trí thi đấu chính *
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value as VolleyballPosition })}
                  className="w-full py-2.5 sm:py-3 px-3.5 text-sm rounded-lg bg-slate-900/60 border border-slate-700/80 focus:ring-2 focus:ring-red-600 text-white outline-none font-semibold cursor-pointer transition-colors"
                >
                  <option value="OH">Outside Hitter (OH) / Chủ công</option>
                  <option value="OP">Opposite Hitter (OP) / Đối chuyền</option>
                  <option value="MB">Middle Blocker (MB) / Phụ công</option>
                  <option value="S">Setter (S) / Chuyền hai</option>
                  <option value="L">Libero (L) / Libero</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5">
                  Playing Level / Cấp độ thi đấu *
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value as PlayerLevel })}
                  className="w-full py-2.5 sm:py-3 px-3.5 text-sm rounded-lg bg-slate-900/60 border border-slate-700/80 focus:ring-2 focus:ring-red-600 text-white outline-none font-semibold cursor-pointer transition-colors"
                >
                  <option value="SENIOR">SENIOR (Nâng cao / Advanced - 3+ năm kinh nghiệm)</option>
                  <option value="JUNIOR">JUNIOR (Trung bình / Intermediate)</option>
                  <option value="YOUTH">YOUTH (Người mới / Cơ bản - Trẻ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5">
                  Preferred Jersey Number (#) / Số áo mong muốn (#)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.desiredJerseyNumber}
                  onKeyDown={(e) => handleNumericKeyDown(e, 'desiredJerseyNumber', '15')}
                  onChange={(e) => handleNumericInput('desiredJerseyNumber', e.target.value, '15')}
                  placeholder="VD: 15"
                  className={`w-full py-2.5 sm:py-3 px-3.5 text-sm placeholder:text-sm placeholder:text-slate-500 rounded-lg bg-slate-900/60 border ${
                    fieldErrors.desiredJerseyNumber ? 'border-red-500 focus:ring-red-500' : 'border-slate-700/80 focus:ring-red-600'
                  } focus:ring-2 text-white outline-none font-mono appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors`}
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
                  Hometown / City / Quê quán / Thành phố *
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
                  placeholder="VD: Hà Nội, TP. Hồ Chí Minh..."
                  className={`w-full py-2.5 sm:py-3 px-3.5 text-sm placeholder:text-sm placeholder:text-slate-500 rounded-lg bg-slate-900/60 border ${
                    fieldErrors.hometownCountry ? 'border-red-500 focus:ring-red-500' : 'border-slate-700/80 focus:ring-red-600'
                  } focus:ring-2 text-white outline-none transition-colors`}
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
          <div className="my-4 sm:my-6 space-y-3.5 sm:space-y-5">
            <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider border-b border-slate-800 pb-2.5 sm:pb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold shrink-0">2</span>
              <span>PHYSICAL MEASUREMENTS & JUMP REACH / CHỈ SỐ THỂ HÌNH & TẦM VỚI</span>
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="flex flex-col">
                <label className="text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5 min-h-[38px] sm:min-h-[44px] flex items-end leading-snug">
                  <span>Height (cm) / Chiều cao (cm) *</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={formData.height}
                  onKeyDown={(e) => handleNumericKeyDown(e, 'height', '160 thay vì 1m6')}
                  onChange={(e) => handleNumericInput('height', e.target.value, '160 thay vì 1m6')}
                  placeholder="VD: 160"
                  className={`w-full py-2.5 sm:py-3 px-3.5 text-sm placeholder:text-sm placeholder:text-slate-500 rounded-lg bg-slate-900/60 border ${
                    fieldErrors.height 
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500' 
                      : 'border-slate-700/80 focus:ring-2 focus:ring-red-600'
                  } font-mono font-bold text-white outline-none appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors`}
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
                  <span>Weight (kg) / Cân nặng (kg) *</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={formData.weight}
                  onKeyDown={(e) => handleNumericKeyDown(e, 'weight', '55 thay vì 55kg')}
                  onChange={(e) => handleNumericInput('weight', e.target.value, '55 thay vì 55kg')}
                  placeholder="VD: 55"
                  className={`w-full py-2.5 sm:py-3 px-3.5 text-sm placeholder:text-sm placeholder:text-slate-500 rounded-lg bg-slate-900/60 border ${
                    fieldErrors.weight 
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500' 
                      : 'border-slate-700/80 focus:ring-2 focus:ring-red-600'
                  } font-mono font-bold text-white outline-none appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors`}
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
                <label className="text-xs sm:text-sm font-medium text-red-400 mb-1 sm:mb-1.5 min-h-[38px] sm:min-h-[44px] flex items-end leading-snug">
                  <span>Spike Reach (cm) / Tầm bật đà tấn công (cm) *</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={formData.spikeReach}
                  onKeyDown={(e) => handleNumericKeyDown(e, 'spikeReach', '300 thay vì 3m')}
                  onChange={(e) => handleNumericInput('spikeReach', e.target.value, '300 thay vì 3m')}
                  placeholder="VD: 300"
                  className={`w-full py-2.5 sm:py-3 px-3.5 text-sm placeholder:text-sm placeholder:text-slate-500 rounded-lg bg-slate-900/60 border ${
                    fieldErrors.spikeReach 
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500' 
                      : 'border-red-900/80 focus:ring-2 focus:ring-red-500'
                  } font-mono font-bold text-red-400 outline-none appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors`}
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
                  <span>Block Reach (cm) / Tầm bật chắn bóng (cm) *</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={formData.blockReach}
                  onKeyDown={(e) => handleNumericKeyDown(e, 'blockReach', '285 thay vì 2m85')}
                  onChange={(e) => handleNumericInput('blockReach', e.target.value, '285 thay vì 2m85')}
                  placeholder="VD: 285"
                  className={`w-full py-2.5 sm:py-3 px-3.5 text-sm placeholder:text-sm placeholder:text-slate-500 rounded-lg bg-slate-900/60 border ${
                    fieldErrors.blockReach 
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500' 
                      : 'border-orange-900/80 focus:ring-2 focus:ring-orange-500'
                  } font-mono font-bold text-orange-400 outline-none appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors`}
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
          <div className="my-4 sm:my-6 space-y-3.5 sm:space-y-5">
            <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider border-b border-slate-800 pb-2.5 sm:pb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold shrink-0">3</span>
              <span>TACTICAL SYSTEMS & CONTACT / CHIẾN THUẬT & LIÊN HỆ</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                  Familiarity with Volleyball Rotational Systems / Mức độ hiểu biết về chiến thuật xoay vòng:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {[
                    { 
                      id: '5-1', 
                      label: '5-1 System / Chiến thuật 5-1', 
                      desc: '1 dedicated setter / 1 chuyền hai cố định' 
                    },
                    { 
                      id: '6-2', 
                      label: '6-2 System / Chiến thuật 6-2', 
                      desc: 'Back-row setters / 2 chuyền hai hàng sau' 
                    },
                    { 
                      id: '4-2', 
                      label: '4-2 System / Chiến thuật 4-2', 
                      desc: 'Front-row setters / 2 chuyền hai hàng trước' 
                    },
                    { 
                      id: 'BEGINNER', 
                      label: 'Beginner / Người mới', 
                      desc: 'Will learn at tryout / Sẽ được hướng dẫn khi tham gia' 
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, rotationKnowledge: item.id as RotationKnowledge })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        formData.rotationKnowledge === item.id
                          ? 'border-red-500 bg-red-950/80 text-white ring-2 ring-red-500/20'
                          : 'border-slate-800 bg-[#0E1524] hover:border-slate-700 text-slate-300'
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
                  Contact Email / Email liên hệ *
                </label>
                <input
                  type="email"
                  required
                  value={formData.gmail}
                  onChange={(e) => {
                    setFormData({ ...formData, gmail: e.target.value });
                    if (e.target.value.trim() && fieldErrors.gmail) {
                      setFieldErrors((prev) => ({ ...prev, gmail: '' }));
                    }
                  }}
                  placeholder="marcus.tran@gmail.com"
                  className={`w-full py-2.5 sm:py-3 px-3.5 text-sm placeholder:text-sm placeholder:text-slate-500 rounded-lg bg-slate-900/60 border ${
                    fieldErrors.gmail ? 'border-red-500 focus:ring-red-500' : 'border-slate-700/80 focus:ring-red-600'
                  } focus:ring-2 text-white outline-none transition-colors`}
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
                  Phone / Zalo Number / Số điện thoại hoặc Zalo *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.zalo}
                  onChange={(e) => {
                    setFormData({ ...formData, zalo: e.target.value });
                    if (e.target.value.trim() && fieldErrors.zalo) {
                      setFieldErrors((prev) => ({ ...prev, zalo: '' }));
                    }
                  }}
                  placeholder="VD: 0912 345 678"
                  className={`w-full py-2.5 sm:py-3 px-3.5 text-sm placeholder:text-sm placeholder:text-slate-500 rounded-lg bg-slate-900/60 border ${
                    fieldErrors.zalo ? 'border-red-500 focus:ring-red-500' : 'border-slate-700/80 focus:ring-red-600'
                  } focus:ring-2 text-white outline-none transition-colors`}
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
                  Instagram Handle / Tên tài khoản Instagram
                </label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="@your_handle hoặc None"
                  className="w-full py-2.5 sm:py-3 px-3.5 text-sm placeholder:text-sm placeholder:text-slate-500 rounded-lg bg-slate-900/60 border border-slate-700/80 focus:ring-2 focus:ring-red-600 text-white outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white shadow-lg shadow-orange-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <div className="flex flex-col items-center text-center">
                <span className="text-sm font-bold tracking-wide uppercase leading-tight">Submitting...</span>
                <span className="text-xs font-medium text-white/90 leading-tight">Đang gửi hồ sơ... / Submitting & Syncing...</span>
              </div>
            ) : (
              <>
                <UserPlus className="w-5 h-5 flex-shrink-0" />
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                  <span className="text-sm font-bold tracking-wide uppercase leading-tight text-white">
                    Submit Registration
                  </span>
                  <span className="text-xs font-medium text-white/90 leading-tight">
                    Gửi Hồ Sơ Đăng Ký
                  </span>
                </div>
              </>
            )}
          </button>

        </form>

      </div>
    </div>
  );
};
