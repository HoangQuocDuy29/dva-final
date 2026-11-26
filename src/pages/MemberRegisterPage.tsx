import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User,
  UserPlus,
  Calendar,
  Home,
  MapPin,
  Mail,
  Phone,
  Printer,
  QrCode,
  Sparkles,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  Check,
} from 'lucide-react';
import { VolleyballPosition, PlayerGender, PlayerLevel, RotationKnowledge, MemberApplication } from '../types';
import { memberService, googleScriptSyncService } from '../services/api';

type PageLang = 'vi' | 'en';

type NumericField = 'height' | 'weight' | 'spikeReach' | 'blockReach' | 'desiredJerseyNumber';
type FormField =
  | 'fullName'
  | 'dob'
  | 'gender'
  | 'hometownCountry'
  | 'gmail'
  | 'zalo'
  | NumericField;

type FieldErrorCode = 'required' | 'integer' | 'range' | 'format';
type FormAlertCode = 'validation' | 'submitFailed' | null;

interface RotationOptionCopy {
  id: RotationKnowledge;
  label: string;
  desc: string;
}

interface LevelOptionCopy {
  title: string;
  usav: string;
  desc: string;
}

interface RegisterCopy {
  langSwitcherAria: string;
  badge: string;
  title: string;
  subtitle: string;
  usavLinkMobile: string;
  usavLinkDesktop: string;
  section1Title: string;
  section2Title: string;
  section3Title: string;
  labels: {
    fullName: string;
    dob: string;
    gender: string;
    position: string;
    level: string;
    usavInlineLink: string;
    desiredJerseyNumber: string;
    hometownCountry: string;
    height: string;
    weight: string;
    spikeReach: string;
    spikeReachHint: string;
    blockReach: string;
    blockReachHint: string;
    rotationKnowledge: string;
    gmail: string;
    gmailHint: string;
    zalo: string;
    zaloHint: string;
    instagram: string;
  };
  placeholders: {
    fullName: string;
    desiredJerseyNumber: string;
    hometownCountry: string;
    height: string;
    weight: string;
    spikeReach: string;
    blockReach: string;
    gmail: string;
    zalo: string;
    instagram: string;
  };
  genders: Record<PlayerGender, { symbol: string; label: string }>;
  positions: Record<VolleyballPosition, string>;
  levels: Record<PlayerLevel, LevelOptionCopy>;
  rotations: readonly RotationOptionCopy[];
  submitIdle: string;
  submitLoading: string;
  submitLoadingSub: string;
  formAlerts: Record<Exclude<FormAlertCode, null>, string>;
  errors: Record<FormField, Partial<Record<FieldErrorCode, string>>>;
  pass: {
    headerTitle: string;
    headerSubtitle: string;
    closeAria: string;
    cardEyebrow: string;
    statusPending: string;
    jerseyPrefix: string;
    jerseyTbd: string;
    positionShort: Record<VolleyballPosition, string>;
    levelName: Record<PlayerLevel, string>;
    rotationValue: Record<RotationKnowledge, string>;
    fields: {
      position: string;
      squadLevel: string;
      heightWeight: string;
      spikeBlock: string;
      tacticalSystem: string;
      applicationId: string;
    };
    qrAlt: string;
    qrFeePrefix: string;
    qrFeeUnit: string;
    btnHome: string;
    btnRegisterAnother: string;
    btnCourtMap: string;
    btnPrint: string;
  };
}

const CONTENT: Record<PageLang, RegisterCopy> = {
  vi: {
    langSwitcherAria: 'Chuyển đổi ngôn ngữ',
    badge: 'Tuyển Quân & Đăng Ký Mùa Giải 2026',
    title: 'Đăng Ký Thành Viên Chính Thức',
    subtitle:
      'Gửi hồ sơ chuyên môn và chỉ số sức bật của bạn. DVA sẽ duyệt hồ sơ trực tiếp trong vòng 24 giờ.',
    usavLinkMobile: '🇻🇳 Bảng Trình Độ USAV (C → Open)',
    usavLinkDesktop: '🇻🇳 Xem Bảng Phân Cấp Trình Độ Chuẩn USAV (C → Open)',
    section1Title: 'THÔNG TIN CÁ NHÂN & VỊ TRÍ THI ĐẤU',
    section2Title: 'CHỈ SỐ THỂ HÌNH & SỨC BẬT',
    section3Title: 'ĐỘI HÌNH CHIẾN THUẬT & THÔNG TIN LIÊN HỆ',
    labels: {
      fullName: 'Họ và tên *',
      dob: 'Ngày sinh *',
      gender: 'Giới tính *',
      position: 'Vị trí sở trường *',
      level: 'Phân hạng trình độ *',
      usavInlineLink: '🇻🇳 Bảng phân cấp USAV',
      desiredJerseyNumber: 'Số áo (#)',
      hometownCountry: 'Quê quán / Tỉnh thành *',
      height: 'Chiều cao *',
      weight: 'Cân nặng *',
      spikeReach: 'Tầm đập bóng *',
      spikeReachHint: 'Chiều cao chạm bóng tối đa khi bật đà đập bóng',
      blockReach: 'Tầm chắn bóng *',
      blockReachHint: 'Chiều cao chạm tay tối đa khi bật nhảy chắn bóng tại lưới',
      rotationKnowledge: 'Mức độ am hiểu chiến thuật xoay vòng & chạy vị trí:',
      gmail: 'Email liên hệ *',
      gmailHint: 'Hãy nhập chính xác địa chỉ Gmail của bạn để nhận phản hồi của chúng tôi',
      zalo: 'Số điện thoại / Zalo *',
      zaloHint: 'Hãy nhập chính xác SĐT Zalo để nhận thông báo từ nhóm chat',
      instagram: 'Tài khoản Instagram (Không bắt buộc)',
    },
    placeholders: {
      fullName: 'VD: Nguyễn Văn A / Trần Minh Quân',
      desiredJerseyNumber: 'VD: 15',
      hometownCountry: 'VD: Hà Nội, TP. Hồ Chí Minh, Đà Nẵng...',
      height: 'VD: 175',
      weight: 'VD: 68',
      spikeReach: 'VD: 305',
      blockReach: 'VD: 290',
      gmail: 'VD: minhquan.dva@gmail.com',
      zalo: 'VD: 0912 345 678',
      instagram: '@ten_tai_khoan hoặc bỏ trống',
    },
    genders: {
      MALE: { symbol: '♂', label: 'Nam' },
      FEMALE: { symbol: '♀', label: 'Nữ' },
    },
    positions: {
      OH: 'Chủ công',
      MB: 'Phụ công',
      OP: 'Đối chuyền',
      S: 'Chuyền hai',
      L: 'Libero',
    },
    levels: {
      SENIOR: {
        title: 'SENIOR',
        usav: 'USAV A – AA / Open',
        desc: 'Phủi cứng / Năng khiếu · Nhịp bóng nhanh & thi đấu giải',
      },
      JUNIOR: {
        title: 'JUNIOR',
        usav: 'USAV B – BB',
        desc: 'Phong trào khá / Bán chuyên · Vững bước 1 & xoay vòng',
      },
      YOUTH: {
        title: 'YOUTH',
        usav: 'USAV C – B',
        desc: 'Phong trào cơ bản / Nhập môn · Rèn kỹ thuật nền tảng',
      },
    },
    rotations: [
      {
        id: '5-1',
        label: 'Đội hình 5-1',
        desc: 'Đội hình gồm 5 người tấn công và duy nhất 1 chuyền hai',
      },
      {
        id: '6-2',
        label: 'Đội hình 6-2',
        desc: 'Đội hình linh hoạt gồm 6 người tấn công, trong đó có 2 người kiêm cả vị trí chuyền hai',
      },
      {
        id: '4-2',
        label: 'Đội hình 4-2',
        desc: 'Đội hình gồm 4 người tấn công và 2 chuyền hai đối diện nhau hàng trên và hàng dưới',
      },
      {
        id: 'BEGINNER',
        label: 'Mới tập / Cơ bản',
        desc: 'Sẽ được đội trưởng hướng dẫn chạy vị trí khi chơi',
      },
    ],
    submitIdle: 'Gửi Hồ Sơ Đăng Ký →',
    submitLoading: 'Đang gửi hồ sơ...',
    submitLoadingSub: 'Đang đồng bộ thông tin thành viên...',
    formAlerts: {
      validation: 'Vui lòng kiểm tra lại các trường bắt buộc (*) và điền đúng định dạng trước khi gửi.',
      submitFailed: 'Không thể gửi hồ sơ đăng ký lúc này. Vui lòng thử lại sau.',
    },
    errors: {
      fullName: {
        required: 'Vui lòng nhập họ và tên của bạn',
      },
      dob: {
        required: 'Vui lòng chọn ngày sinh',
      },
      gender: {
        required: 'Vui lòng chọn giới tính của bạn',
      },
      hometownCountry: {
        required: 'Vui lòng nhập quê quán hoặc tỉnh/thành phố đang sinh sống',
      },
      gmail: {
        required: 'Vui lòng nhập địa chỉ email liên hệ',
        format: 'Email chưa đúng định dạng (VD: tenban@gmail.com)',
      },
      zalo: {
        required: 'Vui lòng nhập số điện thoại hoặc số Zalo',
        format: 'Số điện thoại / Zalo chưa hợp lệ (cần 8–15 chữ số)',
      },
      height: {
        required: 'Vui lòng nhập chiều cao (cm)',
        integer: 'Chỉ nhập số nguyên theo cm (VD: 175 thay vì 1.75m)',
        range: 'Chiều cao cần nằm trong khoảng 100 – 250 cm',
      },
      weight: {
        required: 'Vui lòng nhập cân nặng (kg)',
        integer: 'Chỉ nhập số nguyên theo kg (VD: 68 thay vì 68kg)',
        range: 'Cân nặng cần nằm trong khoảng 25 – 180 kg',
      },
      spikeReach: {
        required: 'Vui lòng nhập tầm đập bóng (cm)',
        integer: 'Chỉ nhập số nguyên theo cm (VD: 305 thay vì 3.05m)',
        range: 'Tầm đập bóng cần nằm trong khoảng 140 – 420 cm',
      },
      blockReach: {
        required: 'Vui lòng nhập tầm chắn bóng (cm)',
        integer: 'Chỉ nhập số nguyên theo cm (VD: 290 thay vì 2.90m)',
        range: 'Tầm chắn bóng cần nằm trong khoảng 130 – 400 cm',
      },
      desiredJerseyNumber: {
        integer: 'Số áo chỉ gồm chữ số nguyên (VD: 15)',
      },
    },
    pass: {
      headerTitle: 'ĐĂNG KÝ THÀNH CÔNG!',
      headerSubtitle: 'Thẻ Thành Viên / Dự Tuyển Chính Thức DVA',
      closeAria: 'Đóng thẻ thành viên',
      cardEyebrow: 'CLB BÓNG CHUYỀN DVA · THẺ THÀNH VIÊN CHÍNH THỨC',
      statusPending: 'CHỜ DUYỆT HỒ SƠ',
      jerseyPrefix: 'Số áo',
      jerseyTbd: 'Chưa chọn',
      positionShort: {
        OH: 'Chủ công (OH)',
        MB: 'Phụ công (MB)',
        OP: 'Đối chuyền (OP)',
        S: 'Chuyền hai (S)',
        L: 'Libero (L)',
      },
      levelName: {
        SENIOR: 'SENIOR · Phủi cứng / Nâng cao',
        JUNIOR: 'JUNIOR · Phong trào khá',
        YOUTH: 'YOUTH · Phong trào cơ bản',
      },
      rotationValue: {
        '5-1': 'Đội hình 5-1',
        '6-2': 'Đội hình 6-2',
        '4-2': 'Đội hình 4-2',
        BEGINNER: 'Cơ bản',
      },
      fields: {
        position: 'Vị trí',
        squadLevel: 'Phân hạng',
        heightWeight: 'Chiều cao / Cân nặng',
        spikeBlock: 'Tầm đập / Tầm chắn',
        tacticalSystem: 'Chiến thuật xoay vòng',
        applicationId: 'Mã hồ sơ',
      },
      qrAlt: 'VietQR Club Entry (Phí gia nhập CLB) DVA',
      qrFeePrefix: 'Club Entry (Phí gia nhập CLB):',
      qrFeeUnit: 'đ (VietQR)',
      btnHome: 'Về Trang Chủ',
      btnRegisterAnother: 'Đăng Ký Hồ Sơ Khác',
      btnCourtMap: 'Xem Bản Đồ Sân',
      btnPrint: 'In thẻ',
    },
  },
  en: {
    langSwitcherAria: 'Language switcher',
    badge: 'Season 2026 Tryouts & Registration',
    title: 'Official Member Registration',
    subtitle:
      'Submit your playing profile and jump reach metrics. DVA will review your application directly within 24 hours.',
    usavLinkMobile: '🇺🇸 USAV Skill Levels (C → Open)',
    usavLinkDesktop: '🇺🇸 View Official USAV Skill Levels Guide (C → Open)',
    section1Title: 'PERSONAL INFORMATION & PREFERRED PLAYING POSITION',
    section2Title: 'PHYSICAL MEASUREMENTS & JUMP REACH',
    section3Title: 'TACTICAL ROTATION SYSTEMS & CONTACT',
    labels: {
      fullName: 'Full Name *',
      dob: 'Date of Birth *',
      gender: 'Gender *',
      position: 'Primary Playing Position *',
      level: 'Competitive Squad Level *',
      usavInlineLink: '🇺🇸 USAV Skill Guide',
      desiredJerseyNumber: 'Jersey (#)',
      hometownCountry: 'Hometown / City *',
      height: 'Height *',
      weight: 'Weight *',
      spikeReach: 'Spike Reach *',
      spikeReachHint: 'Max ball touch height on a full spike approach',
      blockReach: 'Block Reach *',
      blockReachHint: 'Max hand touch height on a vertical block jump at the net',
      rotationKnowledge: 'Familiarity with Volleyball Rotational Systems:',
      gmail: 'Contact Email *',
      gmailHint: 'Please enter your exact Gmail address to receive our response',
      zalo: 'Phone Number (WhatsApp / Zalo) *',
      zaloHint: 'Please enter your exact Zalo phone number to receive group chat updates',
      instagram: 'Instagram Handle (Optional)',
    },
    placeholders: {
      fullName: 'e.g., Marcus Tran / Alex Nguyen',
      desiredJerseyNumber: 'e.g., 15',
      hometownCountry: 'e.g., Hanoi, Ho Chi Minh City, Da Nang...',
      height: 'e.g., 178',
      weight: 'e.g., 70',
      spikeReach: 'e.g., 305',
      blockReach: 'e.g., 290',
      gmail: 'marcus.tran@gmail.com',
      zalo: 'e.g., 0912 345 678',
      instagram: '@your_handle or None',
    },
    genders: {
      MALE: { symbol: '♂', label: 'Male' },
      FEMALE: { symbol: '♀', label: 'Female' },
    },
    positions: {
      OH: 'Outside Hitter',
      MB: 'Middle Blocker',
      OP: 'Opposite',
      S: 'Setter',
      L: 'Libero',
    },
    levels: {
      SENIOR: {
        title: 'SENIOR',
        usav: 'USAV A – AA / Open',
        desc: 'Advanced & Competitive · Fast-tempo tournament volleyball',
      },
      JUNIOR: {
        title: 'JUNIOR',
        usav: 'USAV B – BB',
        desc: 'Intermediate Development · Solid passing & structured rotations',
      },
      YOUTH: {
        title: 'YOUTH',
        usav: 'USAV C – B',
        desc: 'Beginner / Fundamentals · Building core volleyball mechanics',
      },
    },
    rotations: [
      {
        id: '5-1',
        label: '5-1 System',
        desc: '5 attackers with 1 dedicated setter',
      },
      {
        id: '6-2',
        label: '6-2 System',
        desc: 'Flexible 6-attacker system where 2 players also serve as setters',
      },
      {
        id: '4-2',
        label: '4-2 System',
        desc: '4 attackers with 2 setters positioned opposite each other in the front and back rows',
      },
      {
        id: 'BEGINNER',
        label: 'Beginner / Fundamentals',
        desc: 'The team captain will guide you on court rotations while playing',
      },
    ],
    submitIdle: 'Submit Registration →',
    submitLoading: 'Submitting Application...',
    submitLoadingSub: 'Syncing your member profile...',
    formAlerts: {
      validation: 'Please fill in all required fields (*) with valid values before submitting.',
      submitFailed: 'Failed to submit application. Please try again.',
    },
    errors: {
      fullName: {
        required: 'Please enter your Full Name',
      },
      dob: {
        required: 'Please select your Date of Birth',
      },
      gender: {
        required: 'Please select your Gender',
      },
      hometownCountry: {
        required: 'Please enter your Hometown / City',
      },
      gmail: {
        required: 'Please enter your Contact Email',
        format: 'Please enter a valid email address (e.g., name@gmail.com)',
      },
      zalo: {
        required: 'Please enter your Phone / Zalo Number',
        format: 'Please enter a valid phone number (8–15 digits)',
      },
      height: {
        required: 'Please enter your Height (cm)',
        integer: 'Please enter a whole number only (e.g., 178 instead of 1.78m)',
        range: 'Height must be between 100 and 250 cm',
      },
      weight: {
        required: 'Please enter your Weight (kg)',
        integer: 'Please enter a whole number only (e.g., 70 instead of 70kg)',
        range: 'Weight must be between 25 and 180 kg',
      },
      spikeReach: {
        required: 'Please enter your Spike Reach (cm)',
        integer: 'Please enter a whole number only (e.g., 305 instead of 3.05m)',
        range: 'Spike Reach must be between 140 and 420 cm',
      },
      blockReach: {
        required: 'Please enter your Block Reach (cm)',
        integer: 'Please enter a whole number only (e.g., 290 instead of 2.90m)',
        range: 'Block Reach must be between 130 and 400 cm',
      },
      desiredJerseyNumber: {
        integer: 'Please enter a whole number only (e.g., 15)',
      },
    },
    pass: {
      headerTitle: 'REGISTRATION SUCCESSFUL!',
      headerSubtitle: 'DVA Official Tryout / Member Pass',
      closeAria: 'Close member pass',
      cardEyebrow: 'DVA VOLLEYBALL CLUB · OFFICIAL MEMBER PASS',
      statusPending: 'PENDING REVIEW',
      jerseyPrefix: 'Jersey',
      jerseyTbd: 'TBD',
      positionShort: {
        OH: 'Outside Hitter (OH)',
        MB: 'Middle Blocker (MB)',
        OP: 'Opposite (OP)',
        S: 'Setter (S)',
        L: 'Libero (L)',
      },
      levelName: {
        SENIOR: 'SENIOR · Advanced Squad',
        JUNIOR: 'JUNIOR · Development Squad',
        YOUTH: 'YOUTH · Fundamentals',
      },
      rotationValue: {
        '5-1': '5-1 System',
        '6-2': '6-2 System',
        '4-2': '4-2 System',
        BEGINNER: 'Beginner',
      },
      fields: {
        position: 'Position',
        squadLevel: 'Squad Level',
        heightWeight: 'Height / Weight',
        spikeBlock: 'Spike / Block Reach',
        tacticalSystem: 'Tactical System',
        applicationId: 'Application ID',
      },
      qrAlt: 'DVA Club Entry Fee VietQR',
      qrFeePrefix: 'Club Entry Fee:',
      qrFeeUnit: 'VND (VietQR)',
      btnHome: 'Back to Home',
      btnRegisterAnother: 'Register Another Player',
      btnCourtMap: 'View Court Map',
      btnPrint: 'Print Pass',
    },
  },
};

const GENDER_ORDER: readonly PlayerGender[] = ['MALE', 'FEMALE'];
const POSITION_ORDER: readonly VolleyballPosition[] = ['OH', 'MB', 'OP', 'S', 'L'];
const LEVEL_ORDER: readonly PlayerLevel[] = ['SENIOR', 'JUNIOR', 'YOUTH'];

const createInitialFormData = (level: PlayerLevel) => ({
  fullName: '',
  dob: '2005-01-01',
  gender: '' as '' | PlayerGender,
  position: 'OH' as VolleyballPosition,
  hometownCountry: '',
  desiredJerseyNumber: '' as string | number,
  level,
  height: '',
  weight: '',
  spikeReach: '',
  blockReach: '',
  gmail: '',
  instagram: '',
  zalo: '',
  rotationKnowledge: '5-1' as RotationKnowledge,
});

export const MemberRegisterPage: React.FC = () => {
  const { i18n } = useTranslation('common');
  const [searchParams] = useSearchParams();

  const initialLevel = (() => {
    const raw = (searchParams.get('level') || '').trim().toUpperCase();
    return raw === 'SENIOR' || raw === 'JUNIOR' || raw === 'YOUTH' ? (raw as PlayerLevel) : 'JUNIOR';
  })();

  const [lang, setLang] = useState<PageLang>(() => {
    const qLang = (searchParams.get('lang') || '').trim().toLowerCase();
    return qLang === 'en' ? 'en' : 'vi';
  });

  useEffect(() => {
    const handleGlobalLangChange = (lng: string) => {
      setLang(lng.startsWith('vi') ? 'vi' : 'en');
    };
    i18n.on('languageChanged', handleGlobalLangChange);
    return () => {
      i18n.off('languageChanged', handleGlobalLangChange);
    };
  }, [i18n]);

  const handleSelectLang = (next: PageLang) => {
    setLang(next);
    if ((i18n.language?.startsWith('vi') ? 'vi' : 'en') !== next) {
      void i18n.changeLanguage(next);
    }
  };

  const copy = CONTENT[lang];

  const [formData, setFormData] = useState(() => createInitialFormData(initialLevel));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, FieldErrorCode>>>({});
  const [formAlert, setFormAlert] = useState<FormAlertCode>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [levelMenuOpen, setLevelMenuOpen] = useState(false);
  const levelDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!levelMenuOpen) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (levelDropdownRef.current && !levelDropdownRef.current.contains(event.target as Node)) {
        setLevelMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLevelMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [levelMenuOpen]);
  const [submittedApp, setSubmittedApp] = useState<MemberApplication | null>(() => {
    try {
      const saved = sessionStorage.getItem('dva_submitted_app');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const getFieldError = (field: FormField): string | undefined => {
    const code = fieldErrors[field];
    return code ? copy.errors[field][code] : undefined;
  };

  const clearFieldError = (field: FormField) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (formAlert) setFormAlert(null);
  };

  const handleClosePass = () => {
    setSubmittedApp(null);
    try {
      sessionStorage.removeItem('dva_submitted_app');
    } catch {
      // ignore
    }
  };

  const handleRegisterAnother = () => {
    handleClosePass();
    setFormData(createInitialFormData(initialLevel));
    setFieldErrors({});
    setFormAlert(null);
  };

  const handleNumericInput = (field: NumericField, val: string) => {
    if (val === '') {
      setFormData((prev) => ({ ...prev, [field]: '' }));
      clearFieldError(field);
      return;
    }

    if (!/^\d+$/.test(val)) {
      setFieldErrors((prev) => ({ ...prev, [field]: 'integer' }));
      setFormData((prev) => ({ ...prev, [field]: val }));
    } else {
      clearFieldError(field);
      setFormData((prev) => ({ ...prev, [field]: val }));
    }
  };

  const handleNumericKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: NumericField
  ) => {
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

    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      setFieldErrors((prev) => ({ ...prev, [field]: 'integer' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Partial<Record<FormField, FieldErrorCode>> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'required';
    }
    if (!formData.dob) {
      errors.dob = 'required';
    }
    if (!formData.gender) {
      errors.gender = 'required';
    }
    if (!formData.hometownCountry.trim()) {
      errors.hometownCountry = 'required';
    }

    const emailStr = formData.gmail.trim();
    if (!emailStr) {
      errors.gmail = 'required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      errors.gmail = 'format';
    }

    const phoneStr = formData.zalo.trim();
    const phoneDigits = phoneStr.replace(/\D/g, '');
    if (!phoneStr) {
      errors.zalo = 'required';
    } else if (!/^[+\d\s().-]+$/.test(phoneStr) || phoneDigits.length < 8 || phoneDigits.length > 15) {
      errors.zalo = 'format';
    }

    const heightStr = String(formData.height).trim();
    if (!heightStr) {
      errors.height = 'required';
    } else if (!/^\d+$/.test(heightStr)) {
      errors.height = 'integer';
    } else {
      const h = parseInt(heightStr, 10);
      if (h < 100 || h > 250) errors.height = 'range';
    }

    const weightStr = String(formData.weight).trim();
    if (!weightStr) {
      errors.weight = 'required';
    } else if (!/^\d+$/.test(weightStr)) {
      errors.weight = 'integer';
    } else {
      const w = parseInt(weightStr, 10);
      if (w < 25 || w > 180) errors.weight = 'range';
    }

    const spikeStr = String(formData.spikeReach).trim();
    if (!spikeStr) {
      errors.spikeReach = 'required';
    } else if (!/^\d+$/.test(spikeStr)) {
      errors.spikeReach = 'integer';
    } else {
      const s = parseInt(spikeStr, 10);
      if (s < 140 || s > 420) errors.spikeReach = 'range';
    }

    const blockStr = String(formData.blockReach).trim();
    if (!blockStr) {
      errors.blockReach = 'required';
    } else if (!/^\d+$/.test(blockStr)) {
      errors.blockReach = 'integer';
    } else {
      const b = parseInt(blockStr, 10);
      if (b < 130 || b > 400) errors.blockReach = 'range';
    }

    const jerseyStr = String(formData.desiredJerseyNumber).trim();
    if (jerseyStr && !/^\d+$/.test(jerseyStr)) {
      errors.desiredJerseyNumber = 'integer';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormAlert('validation');
      return;
    }

    setFieldErrors({});
    setFormAlert(null);
    setIsSubmitting(true);
    try {
      const parsedJersey = jerseyStr ? parseInt(jerseyStr, 10) : 0;
      const parsedHeight = parseInt(heightStr, 10);
      const parsedWeight = parseInt(weightStr, 10);
      const parsedSpike = parseInt(spikeStr, 10);
      const parsedBlock = parseInt(blockStr, 10);

      const created = await memberService.register({
        ...formData,
        gender: formData.gender || null,
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
        'Thời gian gửi': new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
        'Giới tính': formData.gender === 'MALE' ? 'Nam' : formData.gender === 'FEMALE' ? 'Nữ' : '',
      });
    } catch {
      setFormAlert('submitFailed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const glassInput = (hasError?: boolean, paddingClass = 'px-3.5') =>
    `dva-glass-input w-full min-w-0 py-2.5 sm:py-3 ${paddingClass} text-base sm:text-sm placeholder:text-sm ${
      hasError ? '!border-red-500/80 focus:!border-red-500 focus:!ring-red-500/15' : ''
    }`;

  const selectedLevelOption = copy.levels[formData.level];

  const clubEntryFee = submittedApp?.entryFee ?? 100000;
  const clubEntryQrUrl = (() => {
    if (!submittedApp) return '';
    if (submittedApp.vietqrUrl) return submittedApp.vietqrUrl;
    const cleanPhone = (submittedApp.zalo || '').replace(/\D/g, '').slice(-12);
    const prefix = 'register_';
    const infix = '_clubentry_';
    const maxNameLen = Math.max(6, 50 - prefix.length - infix.length - cleanPhone.length);
    const rawSlug = (submittedApp.fullName || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const trimmedName = rawSlug.slice(0, maxNameLen).replace(/_+$/g, '') || 'member';
    const fallbackTransfer = cleanPhone
      ? `${prefix}${trimmedName}${infix}${cleanPhone}`
      : `${prefix}${trimmedName}_clubentry`;
    const addInfo = submittedApp.transferContent || fallbackTransfer;
    return `https://img.vietqr.io/image/MB-0002090671521-compact2.png?amount=${clubEntryFee}&addInfo=${encodeURIComponent(addInfo)}&accountName=HOANG%20QUOC%20DUY`;
  })();

  return (
    <div className="min-h-screen text-white py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Top Bar: Spatial Glassmorphism Language Switcher (synced with /information/skill-levels) */}
        <div className="flex items-center justify-center sm:justify-end">
          <div
            role="group"
            aria-label={copy.langSwitcherAria}
            className="inline-flex items-center p-1 dva-glass-pill shadow-lg"
          >
            <button
              type="button"
              onClick={() => handleSelectLang('vi')}
              aria-pressed={lang === 'vi'}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                lang === 'vi'
                  ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇻🇳 Tiếng Việt
            </button>
            <button
              type="button"
              onClick={() => handleSelectLang('en')}
              aria-pressed={lang === 'en'}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                lang === 'en'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇺🇸 English
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-2.5 sm:space-y-3">
          <span className="dva-glass-pill inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-[11px] sm:text-xs font-bold text-orange-300 uppercase tracking-wider sm:tracking-widest rounded-full max-w-full">
            <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span>{copy.badge}</span>
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white font-heading">
            {copy.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            {copy.subtitle}
          </p>
          <div className="pt-1 flex justify-center">
            <Link
              to="/information/skill-levels"
              className="inline-flex items-center justify-center gap-2 max-w-full rounded-full bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 px-4 py-2 text-xs sm:text-sm font-medium text-orange-200 hover:text-white leading-snug shadow-[0_0_20px_rgba(249,115,22,0.12)] transition-all duration-200"
            >
              <span className="sm:hidden whitespace-nowrap">{copy.usavLinkMobile}</span>
              <span className="hidden sm:inline">{copy.usavLinkDesktop}</span>
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
                      {copy.pass.headerTitle}
                    </h3>
                    <p className="text-[11px] text-orange-300 font-semibold truncate">
                      {copy.pass.headerSubtitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClosePass}
                  aria-label={copy.pass.closeAria}
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
                        {copy.pass.cardEyebrow}
                      </span>
                      <h2 className="font-heading font-black text-xl sm:text-2xl text-white tracking-tight mt-1 truncate">
                        {submittedApp.fullName}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-red-600 to-orange-500 text-white shadow">
                          {copy.pass.positionShort[submittedApp.position]} · {submittedApp.level}
                        </span>
                        <span className="dva-glass-pill px-2.5 py-0.5 text-[11px] font-mono text-white">
                          {copy.pass.jerseyPrefix} #{submittedApp.desiredJerseyNumber || copy.pass.jerseyTbd}
                        </span>
                        {submittedApp.gender && (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              submittedApp.gender === 'MALE'
                                ? 'bg-sky-500/15 text-sky-200 border-sky-400/40'
                                : 'bg-pink-500/15 text-pink-200 border-pink-400/40'
                            }`}
                          >
                            {copy.genders[submittedApp.gender].symbol} {copy.genders[submittedApp.gender].label}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-200 border border-amber-400/40 shrink-0">
                      {copy.pass.statusPending}
                    </span>
                  </div>

                  {/* Metrics Grid (1-col mobile -> 2-col sm+) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/10">
                    <div className="bg-white/[0.05] px-3 py-2 rounded-xl border border-white/10 flex items-center justify-between sm:block overflow-hidden gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-300 block shrink-0">
                        {copy.pass.fields.position}
                      </span>
                      <span className="font-semibold text-white text-xs truncate">
                        {copy.pass.positionShort[submittedApp.position]}
                      </span>
                    </div>
                    <div className="bg-white/[0.05] px-3 py-2 rounded-xl border border-white/10 flex items-center justify-between sm:block overflow-hidden gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-300 block shrink-0">
                        {copy.pass.fields.squadLevel}
                      </span>
                      <span className="font-semibold text-amber-200 text-xs truncate">
                        {copy.pass.levelName[submittedApp.level]}
                      </span>
                    </div>
                    <div className="bg-white/[0.05] px-3 py-2 rounded-xl border border-white/10 flex items-center justify-between sm:block overflow-hidden gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-300 block shrink-0">
                        {copy.pass.fields.heightWeight}
                      </span>
                      <span className="font-mono font-bold text-white text-xs">
                        {submittedApp.height}cm · {submittedApp.weight}kg
                      </span>
                    </div>
                    <div className="bg-white/[0.05] px-3 py-2 rounded-xl border border-white/10 flex items-center justify-between sm:block overflow-hidden gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-300 block shrink-0">
                        {copy.pass.fields.spikeBlock}
                      </span>
                      <span className="font-mono font-bold text-orange-300 text-xs">
                        {submittedApp.spikeReach}cm / {submittedApp.blockReach}cm
                      </span>
                    </div>
                    <div className="bg-white/[0.05] px-3 py-2 rounded-xl border border-white/10 flex items-center justify-between sm:block overflow-hidden gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-300 block shrink-0">
                        {copy.pass.fields.tacticalSystem}
                      </span>
                      <span className="font-mono font-bold text-amber-300 text-xs">
                        {copy.pass.rotationValue[submittedApp.rotationKnowledge]}
                      </span>
                    </div>
                    <div className="bg-white/[0.05] px-3 py-2 rounded-xl border border-white/10 flex items-center justify-between sm:block overflow-hidden gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-300 block shrink-0">
                        {copy.pass.fields.applicationId}
                      </span>
                      <span className="font-mono font-bold text-white text-xs truncate">
                        {submittedApp.id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* VietQR Club Entry Fee Info (synced with Resend Email QR) */}
                {submittedApp.paymentStatus !== 'FREE' && clubEntryFee > 0 && (
                  <div className="dva-glass-card !rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                    <img
                      src={clubEntryQrUrl}
                      alt={copy.pass.qrAlt}
                      className="w-28 h-28 rounded-xl bg-white p-1 shrink-0 object-contain"
                    />
                    <div className="space-y-1.5 text-center sm:text-left text-xs min-w-0">
                      <div className="inline-flex items-center gap-1.5 text-orange-300 font-bold">
                        <QrCode className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {copy.pass.qrFeePrefix} {clubEntryFee.toLocaleString('vi-VN')} {copy.pass.qrFeeUnit}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        MB Bank · <strong className="font-mono text-white">0002090671521</strong> · <strong>HOANG QUOC DUY</strong>
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <Link
                    to="/"
                    onClick={handleClosePass}
                    className="py-2.5 px-4 rounded-full font-bold text-xs text-white bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 shadow-lg inline-flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Home className="w-3.5 h-3.5 shrink-0" />
                    <span>{copy.pass.btnHome}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleRegisterAnother}
                    className="dva-glass-pill py-2.5 px-4 font-bold text-xs text-white hover:bg-white/15 inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>{copy.pass.btnRegisterAnother}</span>
                  </button>
                  <Link
                    to="/services/court-map"
                    onClick={handleClosePass}
                    className="dva-glass-pill py-2.5 px-4 font-semibold text-xs text-slate-200 hover:text-white hover:bg-white/10 inline-flex items-center justify-center gap-1.5 transition-all"
                  >
                    <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>{copy.pass.btnCourtMap}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="dva-glass-pill py-2.5 px-4 font-semibold text-xs text-slate-300 hover:text-white hover:bg-white/10 inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                    <span>{copy.pass.btnPrint}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="dva-glass-panel rounded-3xl backdrop-blur-2xl p-4 sm:p-8 space-y-5 sm:space-y-6"
        >
          {/* Section 1: Basic Information */}
          <div className="my-2 sm:my-4 space-y-3.5 sm:space-y-5">
            <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider border-b border-white/10 pb-2.5 sm:pb-3 flex items-start sm:items-center gap-3">
              <span className="w-5 h-5 mt-0.5 sm:mt-0 rounded-full bg-gradient-to-br from-red-600 to-orange-500 text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                1
              </span>
              <span>{copy.section1Title}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label htmlFor="register-fullname" className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5">
                  {copy.labels.fullName}
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10" />
                  <input
                    type="text"
                    name="fullName"
                    id="register-fullname"
                    autoComplete="name"
                    required
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData({ ...formData, fullName: e.target.value });
                      if (e.target.value.trim()) clearFieldError('fullName');
                    }}
                    placeholder={copy.placeholders.fullName}
                    className={`${glassInput(Boolean(fieldErrors.fullName), 'pl-10 pr-3.5')} min-h-[48px] h-[48px] text-[16px] sm:text-sm`}
                  />
                </div>
                {getFieldError('fullName') && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{getFieldError('fullName')}</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="register-dob" className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5">
                  {copy.labels.dob}
                </label>
                <div className="relative flex items-center">
                  <Calendar className="w-4 h-4 text-slate-400 pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10" />
                  <input
                    type="date"
                    id="register-dob"
                    required
                    value={formData.dob}
                    onChange={(e) => {
                      setFormData({ ...formData, dob: e.target.value });
                      if (e.target.value) clearFieldError('dob');
                    }}
                    className={`${glassInput(Boolean(fieldErrors.dob), 'pl-11 pr-4')} appearance-none [-webkit-appearance:none] min-h-[48px] h-[48px] w-full flex items-center text-[16px] sm:text-sm font-sans tabular-nums [color-scheme:dark]`}
                  />
                </div>
                {getFieldError('dob') && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{getFieldError('dob')}</span>
                  </p>
                )}
              </div>

              {/* Position Quick-Select Glass Pills */}
              <div className="sm:col-span-2">
                <span id="register-position-label" className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                  {copy.labels.position}
                </span>
                <div
                  role="group"
                  aria-labelledby="register-position-label"
                  className="flex flex-wrap gap-2"
                >
                  {POSITION_ORDER.map((pos) => {
                    const isSelected = formData.position === pos;
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setFormData({ ...formData, position: pos })}
                        aria-pressed={isSelected}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                          isSelected
                            ? 'border-orange-500/60 bg-orange-500/15 text-white shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                            : 'bg-white/[0.035] border-white/10 text-slate-300 hover:bg-white/[0.07] hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <span className={`font-extrabold tracking-wide ${isSelected ? 'text-orange-300' : 'text-slate-400'}`}>
                          {pos}
                        </span>
                        <span className="opacity-40">·</span>
                        <span>{copy.positions[pos]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Glass Popover Dropdown: Squad Level */}
              <div className="sm:col-span-2" ref={levelDropdownRef}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <span id="register-level-label" className="block text-xs sm:text-sm font-medium text-slate-300">
                    {copy.labels.level}
                  </span>
                  <Link
                    to="/information/skill-levels"
                    className="rounded-full bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 px-3 py-1 text-xs font-medium text-orange-200 hover:text-white transition-all duration-200 inline-flex items-center gap-1"
                  >
                    <span>{copy.labels.usavInlineLink}</span>
                  </Link>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    id="register-level"
                    aria-labelledby="register-level-label"
                    aria-haspopup="listbox"
                    aria-expanded={levelMenuOpen}
                    onClick={() => setLevelMenuOpen((open) => !open)}
                    className={`${glassInput(false, 'px-3.5')} flex items-center justify-between gap-3 text-left cursor-pointer ${
                      levelMenuOpen ? '!border-orange-500/60 !bg-white/[0.07] ring-4 ring-orange-500/10' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white text-sm">{selectedLevelOption.title}</span>
                        <span className="text-[11px] font-semibold text-orange-300 bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 rounded-full">
                          {selectedLevelOption.usav}
                        </span>
                      </div>
                      <div className="text-[11px] sm:text-xs text-slate-400 truncate mt-0.5">
                        {selectedLevelOption.desc}
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                        levelMenuOpen ? 'rotate-180 text-orange-400' : 'text-slate-400'
                      }`}
                    />
                  </button>

                  {levelMenuOpen && (
                    <div
                      role="listbox"
                      aria-labelledby="register-level-label"
                      className="absolute left-0 right-0 mt-2 rounded-2xl bg-[#0E1118]/95 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 p-1.5 space-y-1 animate-in fade-in"
                    >
                      {LEVEL_ORDER.map((lvl) => {
                        const opt = copy.levels[lvl];
                        const isSelected = formData.level === lvl;
                        return (
                          <button
                            key={lvl}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setFormData({ ...formData, level: lvl });
                              setLevelMenuOpen(false);
                            }}
                            className={`w-full px-3.5 py-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-orange-500/15 border-orange-500/40 text-white'
                                : 'bg-transparent border-transparent text-slate-200 hover:bg-white/[0.06] hover:border-white/10'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-xs sm:text-sm text-white">{opt.title}</span>
                                <span className="text-[10px] sm:text-[11px] font-semibold text-orange-300 bg-white/[0.06] px-2 py-0.5 rounded-md">
                                  {opt.usav}
                                </span>
                              </div>
                              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-snug">
                                {opt.desc}
                              </p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-orange-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Unified Bottom Row: Jersey (#) + Gender + Hometown */}
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4">
                <div className="md:col-span-3">
                  <label htmlFor="register-jersey" className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5 whitespace-nowrap">
                    {copy.labels.desiredJerseyNumber}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none select-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      #
                    </span>
                    <input
                      type="text"
                      id="register-jersey"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.desiredJerseyNumber}
                      onKeyDown={(e) => handleNumericKeyDown(e, 'desiredJerseyNumber')}
                      onChange={(e) => handleNumericInput('desiredJerseyNumber', e.target.value)}
                      placeholder={copy.placeholders.desiredJerseyNumber}
                      className={`${glassInput(Boolean(fieldErrors.desiredJerseyNumber), 'pl-8 pr-3.5')} h-[46px] font-sans tabular-nums appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      style={{ MozAppearance: 'textfield' }}
                    />
                  </div>
                  {getFieldError('desiredJerseyNumber') && (
                    <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{getFieldError('desiredJerseyNumber')}</span>
                    </p>
                  )}
                </div>

                <div className="md:col-span-4">
                  <span id="register-gender-label" className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5 whitespace-nowrap">
                    {copy.labels.gender}
                  </span>
                  <div
                    role="group"
                    aria-labelledby="register-gender-label"
                    className="grid grid-cols-2 gap-2"
                  >
                    {GENDER_ORDER.map((g) => {
                      const isSelected = formData.gender === g;
                      const opt = copy.genders[g];
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, gender: g });
                            clearFieldError('gender');
                          }}
                          aria-pressed={isSelected}
                          className={`h-[46px] inline-flex items-center justify-center gap-1.5 px-3 rounded-2xl border text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                            isSelected
                              ? 'border-orange-500/60 bg-orange-500/15 text-white shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                              : fieldErrors.gender
                                ? 'bg-white/[0.035] border-red-500/70 text-slate-300 hover:bg-white/[0.07] hover:text-white'
                                : 'bg-white/[0.035] border-white/10 text-slate-300 hover:bg-white/[0.07] hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <span
                            className={`text-sm font-extrabold leading-none ${
                              isSelected
                                ? 'text-orange-300'
                                : g === 'MALE'
                                  ? 'text-sky-400'
                                  : 'text-pink-400'
                            }`}
                          >
                            {opt.symbol}
                          </span>
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {getFieldError('gender') && (
                    <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{getFieldError('gender')}</span>
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2 md:col-span-5">
                  <label htmlFor="register-hometown" className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5 whitespace-nowrap">
                    {copy.labels.hometownCountry}
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      id="register-hometown"
                      required
                      value={formData.hometownCountry}
                      onChange={(e) => {
                        setFormData({ ...formData, hometownCountry: e.target.value });
                        if (e.target.value.trim()) clearFieldError('hometownCountry');
                      }}
                      placeholder={copy.placeholders.hometownCountry}
                      className={`${glassInput(Boolean(fieldErrors.hometownCountry), 'pl-10 pr-3.5')} h-[46px]`}
                    />
                  </div>
                  {getFieldError('hometownCountry') && (
                    <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{getFieldError('hometownCountry')}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Physical Metrics */}
          <div className="my-2 sm:my-4 space-y-3.5 sm:space-y-5">
            <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider border-b border-white/10 pb-2.5 sm:pb-3 flex items-start sm:items-center gap-3">
              <span className="w-5 h-5 mt-0.5 sm:mt-0 rounded-full bg-gradient-to-br from-red-600 to-orange-500 text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                2
              </span>
              <span>{copy.section2Title}</span>
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="flex flex-col">
                <label htmlFor="register-height" className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5 leading-snug">
                  {copy.labels.height}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="register-height"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={formData.height}
                    onKeyDown={(e) => handleNumericKeyDown(e, 'height')}
                    onChange={(e) => handleNumericInput('height', e.target.value)}
                    placeholder={copy.placeholders.height}
                    className={`${glassInput(Boolean(fieldErrors.height), 'pl-3.5 pr-12')} font-sans tabular-nums font-semibold appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    style={{ MozAppearance: 'textfield' }}
                  />
                  <span className="pointer-events-none select-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 bg-white/[0.06] px-2 py-0.5 rounded-md">
                    cm
                  </span>
                </div>
                {getFieldError('height') && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-semibold flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{getFieldError('height')}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col">
                <label htmlFor="register-weight" className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5 leading-snug">
                  {copy.labels.weight}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="register-weight"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={formData.weight}
                    onKeyDown={(e) => handleNumericKeyDown(e, 'weight')}
                    onChange={(e) => handleNumericInput('weight', e.target.value)}
                    placeholder={copy.placeholders.weight}
                    className={`${glassInput(Boolean(fieldErrors.weight), 'pl-3.5 pr-12')} font-sans tabular-nums font-semibold appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    style={{ MozAppearance: 'textfield' }}
                  />
                  <span className="pointer-events-none select-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 bg-white/[0.06] px-2 py-0.5 rounded-md">
                    kg
                  </span>
                </div>
                {getFieldError('weight') && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-semibold flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{getFieldError('weight')}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col">
                <label htmlFor="register-spike" className="block text-xs sm:text-sm font-medium text-rose-400 mb-1 sm:mb-1.5 leading-snug">
                  {copy.labels.spikeReach}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="register-spike"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={formData.spikeReach}
                    onKeyDown={(e) => handleNumericKeyDown(e, 'spikeReach')}
                    onChange={(e) => handleNumericInput('spikeReach', e.target.value)}
                    placeholder={copy.placeholders.spikeReach}
                    className={`${glassInput(Boolean(fieldErrors.spikeReach), 'pl-3.5 pr-12')} font-sans tabular-nums font-semibold !text-rose-300 appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    style={{ MozAppearance: 'textfield' }}
                  />
                  <span className="pointer-events-none select-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 bg-white/[0.06] px-2 py-0.5 rounded-md">
                    cm
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 leading-snug">
                  {copy.labels.spikeReachHint}
                </p>
                {getFieldError('spikeReach') && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-semibold flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{getFieldError('spikeReach')}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col">
                <label htmlFor="register-block" className="block text-xs sm:text-sm font-medium text-orange-400 mb-1 sm:mb-1.5 leading-snug">
                  {copy.labels.blockReach}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="register-block"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={formData.blockReach}
                    onKeyDown={(e) => handleNumericKeyDown(e, 'blockReach')}
                    onChange={(e) => handleNumericInput('blockReach', e.target.value)}
                    placeholder={copy.placeholders.blockReach}
                    className={`${glassInput(Boolean(fieldErrors.blockReach), 'pl-3.5 pr-12')} font-sans tabular-nums font-semibold !text-orange-300 appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    style={{ MozAppearance: 'textfield' }}
                  />
                  <span className="pointer-events-none select-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 bg-white/[0.06] px-2 py-0.5 rounded-md">
                    cm
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 leading-snug">
                  {copy.labels.blockReachHint}
                </p>
                {getFieldError('blockReach') && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-semibold flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{getFieldError('blockReach')}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Tactical Rotation & Contact */}
          <div className="my-2 sm:my-4 space-y-3.5 sm:space-y-5">
            <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider border-b border-white/10 pb-2.5 sm:pb-3 flex items-start sm:items-center gap-3">
              <span className="w-5 h-5 mt-0.5 sm:mt-0 rounded-full bg-gradient-to-br from-red-600 to-orange-500 text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                3
              </span>
              <span>{copy.section3Title}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                  {copy.labels.rotationKnowledge}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {copy.rotations.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, rotationKnowledge: item.id })}
                      aria-pressed={formData.rotationKnowledge === item.id}
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
                <label htmlFor="register-email" className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5">
                  {copy.labels.gmail}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    name="email"
                    id="register-email"
                    autoComplete="email"
                    required
                    value={formData.gmail}
                    onChange={(e) => {
                      setFormData({ ...formData, gmail: e.target.value });
                      if (e.target.value.trim()) clearFieldError('gmail');
                    }}
                    placeholder={copy.placeholders.gmail}
                    className={glassInput(Boolean(fieldErrors.gmail), 'pl-10 pr-3.5')}
                  />
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 leading-snug">
                  {copy.labels.gmailHint}
                </p>
                {getFieldError('gmail') && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{getFieldError('gmail')}</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="register-tel" className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5">
                  {copy.labels.zalo}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    name="tel"
                    id="register-tel"
                    autoComplete="tel"
                    required
                    value={formData.zalo}
                    onChange={(e) => {
                      setFormData({ ...formData, zalo: e.target.value });
                      if (e.target.value.trim()) clearFieldError('zalo');
                    }}
                    placeholder={copy.placeholders.zalo}
                    className={`${glassInput(Boolean(fieldErrors.zalo), 'pl-10 pr-3.5')} font-sans tabular-nums`}
                  />
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 leading-snug">
                  {copy.labels.zaloHint}
                </p>
                {getFieldError('zalo') && (
                  <p className="text-red-400 text-[11px] sm:text-xs mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{getFieldError('zalo')}</span>
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="register-instagram" className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-1.5">
                  {copy.labels.instagram}
                </label>
                <input
                  type="text"
                  id="register-instagram"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder={copy.placeholders.instagram}
                  className={glassInput()}
                />
              </div>
            </div>
          </div>

          {formAlert && (
            <div
              role="alert"
              className="rounded-2xl bg-red-500/10 border border-red-500/40 px-4 py-3 text-xs sm:text-sm text-red-300 font-medium flex items-center gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{copy.formAlerts[formAlert]}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-full bg-gradient-to-r from-[#B91C1C] via-red-600 to-orange-500 hover:brightness-110 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_28px_rgba(249,115,22,0.35)] active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <div className="flex flex-col items-center text-center">
                <span className="text-sm font-bold tracking-wide uppercase leading-tight">
                  {copy.submitLoading}
                </span>
                <span className="text-xs font-medium text-white/90 leading-tight">
                  {copy.submitLoadingSub}
                </span>
              </div>
            ) : (
              <>
                <UserPlus className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-bold tracking-wide uppercase leading-tight text-white">
                  {copy.submitIdle}
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
