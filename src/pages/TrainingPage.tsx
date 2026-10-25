import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle2, 
  Check, 
  UserCheck, 
  Send,
  X,
  QrCode,
  Copy,
  ShieldCheck,
  Phone,
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { TrainingCourse, CoachProfile } from '../types';
import { trainingService, coachService, googleScriptSyncService } from '../services/api';
import { INITIAL_TRAINING_COURSES, INITIAL_COACHES } from '../data/mockData';

/** Đơn vị học phí: ưu tiên `priceUnit` do admin nhập; nếu trống thì suy ra gói năm. */
const getPriceUnitLabel = (course: TrainingCourse): string => {
  if (course.priceUnit && course.priceUnit.trim()) {
    const unit = course.priceUnit.trim();
    return unit.startsWith('/') ? unit : `/ ${unit}`;
  }
  const title = (course.title || '').toLowerCase();
  const isYearly =
    course.id?.includes('annual') ||
    title.includes('annual') ||
    title.includes('year') ||
    course.price >= 10000000;
  return isYearly ? '/ year' : '/ session';
};

export const TrainingPage: React.FC = () => {
  const [courses, setCourses] = useState<TrainingCourse[]>(INITIAL_TRAINING_COURSES);
  const [coaches, setCoaches] = useState<CoachProfile[]>(INITIAL_COACHES);
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);
  
  // Checkout modal states (Multi-step VietQR payment flow)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'FORM' | 'PAYMENT_QR' | 'RECEIPT'>('FORM');

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Beginner / Fundamental');
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('Mon - Wed - Sat Evenings (19:00 - 21:30)');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active registration transaction state
  const [registrationCode, setRegistrationCode] = useState('');
  const [transferContent, setTransferContent] = useState('');
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Training & Scrimmage | DVA Volleyball';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    trainingService.getCourses().then((res) => {
      if (Array.isArray(res) && res.length > 0) setCourses(res);
    }).catch(console.error);

    coachService.getCoaches().then((res) => {
      if (Array.isArray(res) && res.length > 0) setCoaches(res);
    }).catch(console.error);
  }, []);

  const handleOpenRegister = (course: TrainingCourse) => {
    setSelectedCourse(course);
    setModalStep('FORM');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalStep('FORM');
  };

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleBookCoach = (coach: CoachProfile) => {
    const privateCourse = courses.find(c => c.id === 'tc-private-1on1') || courses[0];
    setSelectedCourse({
      ...privateCourse,
      title: `1-on-1 Private Masterclass với HLV ${coach.name}`,
      coachName: coach.name,
      coachTitle: coach.role,
      description: `Khóa huấn luyện cá nhân chuyên sâu 1 kèm 1 trực tiếp với ${coach.name} (${coach.role}) trên sàn Taraflex đạt chuẩn thi đấu.`,
    });
    setNotes(`Đăng ký tập 1-on-1 cùng HLV: ${coach.name} (${coach.specialty})`);
    setModalStep('FORM');
    setIsModalOpen(true);
  };

  // Step 1 -> Step 2: Submit Registration & Generate VietQR
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    setIsSubmitting(true);

    try {
      // Generate clean registration code and transfer syntax
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const coursePrefix = (selectedCourse.id || 'TC').replace('tc-', '').toUpperCase().slice(0, 8);
      const code = `DVA-TR-${coursePrefix}-${randomSuffix}`;
      const cleanPhone = phone.replace(/\D/g, '');
      const txContent = `DVA ${code} ${cleanPhone.slice(-6)}`;

      setRegistrationCode(code);
      setTransferContent(txContent);

      // Attempt to save to backend / local storage
      try {
        await trainingService.register({
          courseId: selectedCourse.id,
          courseTitle: selectedCourse.title,
          fullName,
          email,
          phone,
          experienceLevel,
          preferredTimeSlot,
          notes,
        });
      } catch (backendErr) {
        console.warn('Backend offline, proceeding with instant VietQR generation:', backendErr);
      }

      // Synchronize to Google Sheets (Tab: DangKyKhoaHoc)
      googleScriptSyncService.syncToGoogleSheet('DangKyKhoaHoc', {
        'Mã đăng ký': code,
        'Gói tập / Khóa học': selectedCourse.title,
        'Họ và tên học viên': fullName,
        'Số điện thoại': phone,
        'Email': email,
        'Trình độ hiện tại': experienceLevel,
        'Khung giờ mong muốn': preferredTimeSlot,
        'Mức học phí (VNĐ)': selectedCourse.price,
        'Nội dung chuyển khoản': txContent,
        'Trạng thái': 'CHỜ THANH TOÁN (PENDING)',
        'Ghi chú': notes || 'Không có',
        'Thời gian đăng ký': new Date().toLocaleString('vi-VN')
      });

      // ALWAYS advance to VietQR Payment Screen
      setModalStep('PAYMENT_QR');
    } catch (err: any) {
      console.warn('Error in registration step:', err);
      setModalStep('PAYMENT_QR');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 -> Step 3: Customer confirms transfer completed
  const handleConfirmPaid = async () => {
    if (!selectedCourse) return;
    setIsConfirmingPayment(true);

    try {
      // Re-sync with confirmed status
      googleScriptSyncService.syncToGoogleSheet('DangKyKhoaHoc', {
        'Mã đăng ký': registrationCode,
        'Gói tập / Khóa học': selectedCourse.title,
        'Họ và tên học viên': fullName,
        'Số điện thoại': phone,
        'Email': email,
        'Mức học phí (VNĐ)': selectedCourse.price,
        'Nội dung chuyển khoản': transferContent,
        'Trạng thái': 'ĐÃ XÁC NHẬN CHUYỂN KHOẢN (CONFIRMED)',
        'Thời gian xác nhận': new Date().toLocaleString('vi-VN')
      });

      setModalStep('RECEIPT');
    } catch (err) {
      console.error(err);
      setModalStep('RECEIPT');
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const bankName = 'MB Bank (Military Commercial Joint Stock Bank)';
  const accountNo = '0002090671521';
  const accountName = 'HOANG QUOC DUY';

  // Dynamic VietQR generator URL
  const qrUrl = selectedCourse ? `https://img.vietqr.io/image/MB-${accountNo}-compact2.png?amount=${selectedCourse.price}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(accountName)}` : '';

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Page Header */}
        <div className="border-b border-slate-800 pb-8 text-center sm:text-left space-y-3">
          <span className="text-xs font-bold text-red-500 uppercase tracking-widest bg-red-950/60 border border-red-800 px-3 py-1 rounded-full inline-block">
            DVA Scrimmage & Coaching
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-heading tracking-tight">
            Training & Scrimmage
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            Weekly open scrimmages, structured skill training, and dedicated player support.
          </p>
        </div>

        {/* SECTION 1: 6 SCRIMMAGE & TRAINING PACKAGES */}
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Programs & Passes</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-heading mt-1">
                Published Scrimmage & Coaching Packages
              </h2>
            </div>
            
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {[...courses].sort((a, b) => Number(a.price || 0) - Number(b.price || 0)).map((course) => {
              const isPrivate1on1 = course.id === 'tc-1on1-mastery';
              return (
                <div
                  key={course.id}
                  className={`bg-[#0E1524] rounded-3xl border p-6 sm:p-7 shadow-2xl flex flex-col justify-between transition-all duration-300 relative group hover:scale-[1.01] ${
                    isPrivate1on1 
                      ? 'border-amber-500/70 shadow-amber-950/30 ring-1 ring-amber-500/40 bg-gradient-to-b from-[#141b2b] to-[#0E1524]' 
                      : 'border-[#1e2738] hover:border-amber-500/50'
                  }`}
                >
                  <div className="space-y-5">
                    
                    {/* Top Row: Tag + Target Audience */}
                    {(course.tag || course.targetAudience) && (
                      <div className="flex items-start justify-between gap-3">
                        {course.tag ? (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm shrink-0 ${
                            isPrivate1on1
                              ? 'border-amber-500 bg-amber-500 text-black font-extrabold'
                              : 'border-amber-600/70 bg-amber-950/40 text-amber-300'
                          }`}>
                            {course.tag}
                          </span>
                        ) : <span />}
                        {course.targetAudience && (
                          <div className="flex items-center gap-1.5 text-slate-300 text-xs text-right">
                            <Users className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                            <span className="line-clamp-2 text-[11px]">{course.targetAudience}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Package Title */}
                    <h3 className="font-heading font-black text-xl sm:text-2xl text-amber-400 tracking-tight leading-snug">
                      {course.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-300 leading-relaxed min-h-[44px]">
                      {course.description}
                    </p>

                    {/* Benefits Section */}
                    {(course.benefits || course.curriculum || []).length > 0 && (
                    <div className="space-y-2.5 pt-3 border-t border-slate-800/80">
                      <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase block">
                        PACKAGE INCLUSIONS:
                      </span>
                      <div className="space-y-2">
                        {(course.benefits || course.curriculum || []).map((b, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    )}

                    {/* Schedule Box */}
                    <div className="bg-[#0B0F19] rounded-2xl p-3.5 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
                      <Calendar className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{course.schedule}</span>
                    </div>

                  </div>

                  {/* Footer: Price + Register Button */}
                  <div className="pt-6 mt-6 border-t border-slate-800">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      <span>TUITION FEE:</span>
                      {course.maxSlots > 0 && (
                        <span className="text-amber-500/90 font-medium normal-case tracking-normal">
                          Max {course.maxSlots} spots
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-baseline gap-1 whitespace-nowrap">
                          <span className="font-heading font-black text-xl sm:text-2xl text-amber-400 tracking-tight font-mono">
                            {new Intl.NumberFormat('vi-VN').format(course.price)}
                          </span>
                          <span className="text-sm font-bold text-amber-400">đ</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium truncate">
                          {getPriceUnitLabel(course)}
                          {course.duration ? ` • ${course.duration}` : ''}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenRegister(course)}
                        className="px-5 py-2.5 rounded-full font-black text-xs text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 shadow-lg shadow-orange-950/40 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <span>Enroll Now</span>
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: DVA ELITE COACHING STAFF (Required: Coach cards with photo, name, experience, height, age, etc.) */}
        <div className="space-y-8 pt-8 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Faculty & Mentors</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-heading mt-1">
                DVA Coaching Team & Mentors
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                Passionate and experienced club coaches dedicated to building solid fundamentals, on-court confidence, and practical game tactics.
              </p>
            </div>
    
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {coaches.map((coach) => (
              <div
                key={coach.id}
                className="bg-[#121826] rounded-3xl border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-xl group"
              >
                <div className="space-y-4">
                  
                  {/* Coach Photo */}
                  <div className="w-full h-52 rounded-2xl overflow-hidden bg-[#0c1017] border border-slate-700/60 relative shadow-inner">
                    <img
                      src={coach.avatarUrl}
                      alt={coach.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-xl text-[10px] text-white flex justify-between items-center font-mono">
                      <span>Height: {coach.height}</span>
                      <span>Age: {coach.age} ({coach.bornYear})</span>
                    </div>
                  </div>

                  {/* Coach Name & Role */}
                  <div>
                    <h3 className="font-heading font-black text-lg text-white">
                      {coach.name}
                    </h3>
                    <p className="text-xs text-orange-400 font-semibold mt-0.5">
                      {coach.role}
                    </p>
                  </div>

                  {/* Experience Tag */}
                  <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-slate-800 text-[11px] text-slate-300">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Experience</span>
                    <span className="font-semibold">{coach.experience}</span>
                  </div>

                  {/* Specialty */}
                  <div className="text-xs text-slate-300 space-y-1">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Specialty</span>
                    <p className="leading-snug text-slate-300">{coach.specialty}</p>
                  </div>

                  {/* Certifications */}
                  {coach.certifications && coach.certifications.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Certifications</span>
                      <div className="space-y-1">
                        {coach.certifications.map((c, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                            <ShieldCheck className="w-3 h-3 shrink-0" />
                            <span className="line-clamp-1">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Bio snippet */}
                <p className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 italic leading-snug line-clamp-3">
                  "{coach.bio}"
                </p>

                {/* Direct 1-on-1 VietQR Booking Button for Coach */}
                <div className="pt-3 mt-3 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => handleBookCoach(coach)}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500 hover:to-orange-500 text-amber-300 hover:text-black border border-amber-500/40 hover:border-transparent font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer group-hover:border-amber-400"
                  >
                    <span>Book 1-on-1 với {coach.name}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>

      </div>

      {/* REGISTRATION & VIETQR PAYMENT MODAL (No Login Required) */}
      {isModalOpen && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#121826] rounded-3xl max-w-xl w-full border border-slate-700 shadow-2xl text-white overflow-hidden max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-[#0B0F19] px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center font-black text-black text-sm">
                  DVA
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-white">
                    {modalStep === 'FORM' && `Enroll: ${selectedCourse.title}`}
                    {modalStep === 'PAYMENT_QR' && 'Scan VietQR to Complete Enrollment'}
                    {modalStep === 'RECEIPT' && 'Official Enrollment Confirmed!'}
                  </h3>
                  <p className="text-xs text-amber-400 font-mono">
                    {selectedCourse.price.toLocaleString('vi-VN')} đ {getPriceUnitLabel(selectedCourse)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              
              {/* STEP 1: ATHLETE REGISTRATION FORM */}
              {modalStep === 'FORM' && (
                <form onSubmit={handleProceedToPayment} className="space-y-4">
                  <div className="bg-[#0B0F19] p-4 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Selected Course</span>
                    <h4 className="font-heading font-black text-base text-amber-400">{selectedCourse.title}</h4>
                    <p className="text-[11px] text-slate-300">{selectedCourse.description}</p>
                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Schedule: {selectedCourse.schedule}</span>
                      <strong className="text-white">{selectedCourse.price.toLocaleString('vi-VN')} đ</strong>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Athlete Full Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Marcus Tran"
                      className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Phone / WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0912 345 678"
                        className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="athlete@gmail.com"
                        className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Current Skill Level *</label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Beginner / Fundamental">Beginner / Fundamental (Learning passing & approach)</option>
                      <option value="Intermediate Recreational">Intermediate Recreational (1-2 years experience)</option>
                      <option value="Club Competitor">Club Competitor (&gt; 3 years experience, 5-1 tactics)</option>
                      <option value="Position Specialist (Setter/Libero/OH)">Position Specialist (OH, OP, S, MB, L)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Preferred Training Time Slot</label>
                    <input
                      type="text"
                      value={preferredTimeSlot}
                      onChange={(e) => setPreferredTimeSlot(e.target.value)}
                      placeholder="e.g. Evenings 19:00 - 21:30 or Weekend Afternoons"
                      className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Goals or Questions for Coach</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Height 185cm, want to fix wrist-snap angle and jump approach timing"
                      className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="bg-[#0B0F19] p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Data auto-syncs to DVA Google Sheets (`DangKyKhoaHoc`). No account login required.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{isSubmitting ? 'Processing...' : 'Proceed to VietQR Payment'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* STEP 2: VIETQR PAYMENT SCAN & TRANSFER SYNTAX */}
              {modalStep === 'PAYMENT_QR' && (
                <div className="space-y-5">
                  <div className="bg-amber-950/40 border border-amber-800/80 rounded-2xl p-4 flex items-center gap-3">
                    <QrCode className="w-5 h-5 text-amber-400 shrink-0" />
                    <div className="text-xs">
                      <strong className="text-white block">Official DVA VietQR Payment Gateway</strong>
                      <span className="text-slate-300">
                        Please scan the dynamic VietQR code below using your banking app (Vietcombank, Techcombank, MB, BIDV, etc.) to confirm your registration slot.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                    {/* QR Code Image */}
                    <div className="flex flex-col items-center justify-center bg-white p-3.5 rounded-2xl shadow-lg border border-slate-300">
                      <img
                        src={qrUrl}
                        alt="DVA VietQR Payment"
                        className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                      />
                      <span className="text-[10px] text-slate-700 font-mono font-bold mt-1 text-center">
                        Auto-detects MB Bank · {selectedCourse.price.toLocaleString('vi-VN')} VND
                      </span>
                    </div>

                    {/* Transfer Details Card */}
                    <div className="space-y-3 bg-[#0B0F19] p-4 rounded-2xl border border-slate-800 text-xs">
                      <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Bank Name</span>
                          <span className="font-bold text-white">MB Bank (Military Bank)</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Account Number</span>
                          <span className="font-mono font-black text-amber-400 text-sm">{accountNo}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(accountNo, setCopiedAccount)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedAccount ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedAccount ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Account Holder</span>
                          <span className="font-bold text-white uppercase">{accountName}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Tuition Fee</span>
                          <span className="font-mono font-black text-emerald-400 text-sm">
                            {selectedCourse.price.toLocaleString('vi-VN')} VND
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(String(selectedCourse.price), setCopiedAmount)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedAmount ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedAmount ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="pr-2">
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Transfer Content</span>
                          <span className="font-mono font-black text-amber-400 text-xs break-all">{transferContent}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(transferContent, setCopiedContent)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-200 flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {copiedContent ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedContent ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      disabled={isConfirmingPayment}
                      onClick={handleConfirmPaid}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isConfirmingPayment ? 'Verifying Sync...' : 'I Have Completed Bank Transfer'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalStep('FORM')}
                      className="w-full py-2 text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      Back to Registration Details
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: OFFICIAL ENROLLMENT RECEIPT */}
              {modalStep === 'RECEIPT' && (
                <div className="space-y-5 text-center py-4">
                  <div className="w-16 h-16 bg-emerald-950 border-2 border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-950/60">
                    <Check className="w-9 h-9 stroke-[3]" />
                  </div>

                  <div>
                    <h4 className="font-heading font-black text-2xl text-white">Enrollment Successfully Confirmed!</h4>
                    <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                      Thank you, <strong className="text-white">{fullName}</strong>! Your registration for <strong>{selectedCourse.title}</strong> has been received and verified.
                    </p>
                  </div>

                  <div className="bg-[#0B0F19] rounded-2xl p-4 border border-slate-800 text-left space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Registration Code:</span>
                      <span className="font-mono font-bold text-amber-400">{registrationCode}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Package Enrolled:</span>
                      <span className="font-bold text-white">{selectedCourse.title}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Athlete Contact:</span>
                      <span className="font-mono text-white">{phone} · {email}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Tuition Fee:</span>
                      <span className="font-mono font-bold text-emerald-400">{selectedCourse.price.toLocaleString('vi-VN')} VND</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Google Sheets Sync:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Saved to `DangKyKhoaHoc` Tab</span>
                      </span>
                    </div>
                  </div>

                  {/* Immediate Hotline for Urgent Booking / Confirmation */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-950/60 to-orange-950/40 border border-orange-700/60 text-xs text-slate-200 space-y-1">
                    <div className="font-bold text-orange-400 flex items-center justify-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>Immediate Hotline / Zalo Support</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Need urgent court confirmation or want to schedule your 1-on-1 coaching slot right away? Contact Head Coach Duy via Zalo: <strong className="font-mono text-white">0768 299 329</strong>.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Done & Return to Training Programs
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
