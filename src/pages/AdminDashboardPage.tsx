import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  Calendar, 
  CreditCard, 
  Check, 
  X, 
  AlertCircle, 
  Table, 
  FileText, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Edit3, 
  Plus,
  RefreshCw,
  Award,
  Sparkles,
  ArrowLeft,
  Upload,
  Database,
  ExternalLink,
  Lock,
  Unlock,
  MapPin,
  Copy,
  CheckCheck,
  FileSpreadsheet,
  Code,
  HelpCircle,
  Send,
  Loader2,
  Image as ImageIcon,
  UserCheck,
  Search
} from 'lucide-react';
import { 
  Booking, 
  Court,
  MemberApplication, 
  NewsPost, 
  Player, 
  TrainingRegistration, 
  TrainingCourse,
  CoachProfile,
  User as UserType,
  ManagedUserRole,
  MANAGED_USER_ROLES,
  VolleyballPosition,
  PlayerLevel,
  ClosedSlot,
  DayOfWeekKey,
  WeeklySchedule,
  DAYS_OF_WEEK,
  PLAYER_COUNTRIES,
  countryCodeToFlagEmoji
} from '../types';
import { 
  bookingService, 
  courtService,
  memberService, 
  trainingService, 
  coachService,
  playerService, 
  newsService, 
  sheetsService,
  googleScriptSyncService,
  userService
} from '../services/api';
import { INITIAL_PLAYERS, INITIAL_COURTS, INITIAL_COACHES, INITIAL_TRAINING_COURSES } from '../data/mockData';
import {
  getDefaultWeeklyScheduleForCourt,
  getScheduleSlotsForCourtAndDate,
  normalizeWeeklySchedule,
  parseSlotLabel,
} from '../shared/schedule';
import { uploadToCloudinary, buildCloudinaryFolder } from '../utils/cloudinary';

interface AdminDashboardPageProps {
  currentUser: UserType;
  onOpenSheets: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ currentUser, onOpenSheets }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation modules with direct URL synchronization: ?tab=courts, ?tab=players, etc.
  const validTabs = ['OVERVIEW', 'COURTS', 'BOOKINGS', 'APPLICATIONS', 'PLAYERS', 'TRAINING', 'COACHES', 'NEWS', 'SHEETS', 'USERS'] as const;
  type ModuleType = typeof validTabs[number];

  const currentTabParam = (searchParams.get('tab') || 'OVERVIEW').toUpperCase();
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const activeModule: ModuleType =
    validTabs.includes(currentTabParam as any) && (currentTabParam !== 'USERS' || isSuperAdmin)
      ? (currentTabParam as ModuleType)
      : 'OVERVIEW';

  const setActiveModule = (mod: ModuleType | string) => {
    setSearchParams({ tab: mod.toLowerCase() });
  };

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courtsList, setCourtsList] = useState<Court[]>(INITIAL_COURTS);
  const [applications, setApplications] = useState<MemberApplication[]>([]);
  const [trainingRegs, setTrainingRegs] = useState<TrainingRegistration[]>([]);
  const [coursesList, setCoursesList] = useState<TrainingCourse[]>(INITIAL_TRAINING_COURSES);
  const [coachesList, setCoachesList] = useState<CoachProfile[]>(INITIAL_COACHES);
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [newsList, setNewsList] = useState<NewsPost[]>([]);
  const [sheetsData, setSheetsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // User account management (SUPERADMIN only)
  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<{ name: string; email: string; password: string; role: ManagedUserRole }>({
    name: '',
    email: '',
    password: '',
    role: 'STAFF',
  });

  const USER_ROLE_BADGE: Record<string, string> = {
    SUPERADMIN: 'bg-red-950/80 text-red-300 border-red-500/60',
    ADMIN: 'bg-orange-950/80 text-orange-300 border-orange-500/60',
    STAFF: 'bg-sky-950/80 text-sky-300 border-sky-500/60',
    COACH: 'bg-purple-950/80 text-purple-300 border-purple-500/60',
    PLAYER: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60',
    GUEST: 'bg-slate-800 text-slate-300 border-slate-600',
  };

  const loadUsers = async () => {
    try {
      setUsersList(await userService.getUsers());
    } catch (err: any) {
      setFeedback(err?.message || 'Không tải được danh sách tài khoản.');
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && activeModule === 'USERS') loadUsers();
  }, [isSuperAdmin, activeModule]);

  const openCreateUserModal = () => {
    setUserForm({ name: '', email: '', password: '', role: 'STAFF' });
    setUserFormError(null);
    setIsUserModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError(null);
    if (userForm.name.trim().length < 2) return setUserFormError('Tên phải có ít nhất 2 ký tự.');
    if (!/^\S+@\S+\.\S+$/.test(userForm.email.trim())) return setUserFormError('Email không hợp lệ.');
    if (userForm.password.length < 8) return setUserFormError('Mật khẩu phải có ít nhất 8 ký tự.');
    setIsSavingUser(true);
    try {
      const created = await userService.createUser({
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        password: userForm.password,
        role: userForm.role,
      });
      setUsersList((prev) => [created, ...prev]);
      setIsUserModalOpen(false);
      setFeedback(`Đã tạo tài khoản ${created.email} (${created.role}).`);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setUserFormError(err?.message || 'Không thể tạo tài khoản.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleChangeUserRole = async (user: UserType, role: ManagedUserRole) => {
    if (role === user.role) return;
    try {
      const updated = await userService.updateUserRole(user.id, role);
      setUsersList((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
      setFeedback(`Đã đổi quyền ${user.email} thành ${role}.`);
    } catch (err: any) {
      setFeedback(err?.message || 'Không thể cập nhật quyền.');
    }
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleDeleteUser = async (user: UserType) => {
    if (!window.confirm(`Xóa tài khoản ${user.email}? Hành động này không thể hoàn tác.`)) return;
    try {
      await userService.deleteUser(user.id);
      setUsersList((prev) => prev.filter((u) => u.id !== user.id));
      setFeedback(`Đã xóa tài khoản ${user.email}.`);
    } catch (err: any) {
      setFeedback(err?.message || 'Không thể xóa tài khoản.');
    }
    setTimeout(() => setFeedback(null), 3500);
  };
  const [feedback, setFeedback] = useState<string | null>(null);

  // Player CRUD modal state
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerForm, setPlayerForm] = useState<Partial<Player>>({
    fullName: '',
    jerseyNumber: 1,
    height: 185,
    weight: 75,
    spikeTouch: 330,
    blockTouch: 315,
    hometownCountry: 'Hà Nội',
    country: 'Vietnam',
    countryName: 'Vietnam',
    countryCode: 'VN',
    countryFlag: '🇻🇳',
    bornYear: 2005,
    joined: 2025,
    joinedYear: 2025,
    level: 'SENIOR',
    position: 'OH',
    bio: '',
    captain: false,
    isCaptain: false,
  });

  // Google Apps Script Deploy state
  const [googleScriptUrl, setGoogleScriptUrl] = useState<string>(() => googleScriptSyncService.getScriptUrl());
  const [scriptCopied, setScriptCopied] = useState<boolean>(false);
  const [isTestingSync, setIsTestingSync] = useState<boolean>(false);
  const [syncTestMessage, setSyncTestMessage] = useState<string | null>(null);

  // Upload loading states
  const [isUploadingPlayerPhoto, setIsUploadingPlayerPhoto] = useState(false);
  const [isUploadingNewsThumb, setIsUploadingNewsThumb] = useState(false);

  // News Create/Edit modal state
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsPost | null>(null);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsThumbnail, setNewsThumbnail] = useState('');
  const [newsCategory, setNewsCategory] = useState<NewsPost['category']>('TOURNAMENT');
  const [newsExcerpt, setNewsExcerpt] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsAuthorName, setNewsAuthorName] = useState(currentUser.fullName);
  const [newsAuthorRole, setNewsAuthorRole] = useState('Club Administration');

  // Booking CRUD modal state
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

  // Course CRUD modal state
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TrainingCourse | null>(null);
  const [courseForm, setCourseForm] = useState<Partial<TrainingCourse>>({
    title: '',
    level: 'JUNIOR',
    schedule: 'Thứ 3 & Thứ 5 (18:00 - 20:00)',
    duration: '8 tuần (16 buổi)',
    maxSlots: 16,
    enrolledSlots: 0,
    price: 2400000,
    coachName: 'Hoàng Quốc Duy',
    coachTitle: 'Head Coach & Founder',
    description: '',
    curriculum: ['Khởi động chuyên sâu', 'Tấn công biên 4', 'Phòng thủ hàng sau'],
    benefits: ['Áo đấu DVA chính hãng', 'Phân tích video kỹ thuật'],
  });

  // Coach CRUD modal state
  const [isCoachModalOpen, setIsCoachModalOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<CoachProfile | null>(null);
  const [isUploadingCoachPhoto, setIsUploadingCoachPhoto] = useState(false);
  const [coachForm, setCoachForm] = useState<Partial<CoachProfile>>({
    name: '',
    role: 'Chuyên Gia Tấn Công Biên',
    experience: '5 năm kinh nghiệm',
    bio: '',
    avatarUrl: '/coaches/duy.png',
    certifications: ['FIVB Level 1 Certified', 'Cựu VĐV Quốc Gia'],
  });

  // Court Schedule & Slot Lock Control state
  const [selectedManageCourtId, setSelectedManageCourtId] = useState<string>('court-btl');
  const [selectedManageDate, setSelectedManageDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [closedSlots, setClosedSlots] = useState<ClosedSlot[]>([]);
  const [lockReason, setLockReason] = useState<string>('Rented to Offline Team / Club Match');
  const [isTogglingSlot, setIsTogglingSlot] = useState<boolean>(false);

  // Court CRUD & Weekly Schedule Modal state
  const [isCourtModalOpen, setIsCourtModalOpen] = useState<boolean>(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [selectedScheduleDay, setSelectedScheduleDay] = useState<DayOfWeekKey>('monday');
  const [newSlotInput, setNewSlotInput] = useState<string>('18:00 - 20:00');
  const [isUploadingCourtImage, setIsUploadingCourtImage] = useState<boolean>(false);
  const [togglingCourtId, setTogglingCourtId] = useState<string | null>(null);
  const [courtForm, setCourtForm] = useState<Partial<Court>>({
    name: '',
    code: '',
    shortName: '',
    address: 'DVA Sports Center, Hà Nội',
    description: 'Sân bóng chuyền tiêu chuẩn FIVB trang bị thảm Taraflex Pro chống chấn thương.',
    floorType: 'Gerflor Taraflex Sport Pro',
    hourlyRate: 500000,
    minHours: 1.5,
    imageUrl: '/courts/btl.png',
    status: 'ACTIVE',
    isMaintenance: false,
    isAvailable: true,
    isActive: true,
    weeklySchedule: getDefaultWeeklyScheduleForCourt(),
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [b, a, t, p, n, s, cs, courses, coaches, fetchedCourts] = await Promise.all([
        bookingService.getBookings(),
        memberService.getApplications(),
        trainingService.getRegistrations(),
        playerService.getPlayers(),
        newsService.getNews(),
        sheetsService.getSheetsData(),
        courtService.getClosedSlots(),
        trainingService.getCourses(),
        coachService.getCoaches(),
        courtService.getCourts(),
      ]);
      setBookings(b);
      setApplications(a);
      setTrainingRegs(t);
      if (p && p.length > 0) setPlayers(p);
      setNewsList(n);
      setSheetsData(s);
      if (Array.isArray(cs)) setClosedSlots(cs);
      if (Array.isArray(courses) && courses.length > 0) setCoursesList(courses);
      if (Array.isArray(coaches) && coaches.length > 0) setCoachesList(coaches);
      if (Array.isArray(fetchedCourts) && fetchedCourts.length > 0) {
        const activeCourts = fetchedCourts
          .filter((fc) => fc.isActive !== false)
          .map((fc) => {
            const local = INITIAL_COURTS.find((ic) => ic.id === fc.id);
            return local
              ? {
                  ...local,
                  ...fc,
                  imageUrl: fc.imageUrl || local.imageUrl,
                  weeklySchedule: normalizeWeeklySchedule(fc.weeklySchedule ?? local.weeklySchedule, fc.id),
                }
              : {
                  ...fc,
                  weeklySchedule: normalizeWeeklySchedule(fc.weeklySchedule, fc.id),
                };
          });
        setCourtsList(activeCourts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSlotLock = async (slotLabel: string) => {
    setIsTogglingSlot(true);
    try {
      const res = await courtService.toggleClosedSlot({
        courtId: selectedManageCourtId,
        date: selectedManageDate,
        slotLabel,
        reason: lockReason,
        closedBy: currentUser.fullName,
      });

      if (res.action === 'CLOSED') {
        setClosedSlots(prev => [...prev, res.slot]);
        setFeedback(`Slot "${slotLabel}" has been CLOSED/LOCKED. Customers cannot book this slot.`);
      } else {
        setClosedSlots(prev => prev.filter(
          cs => !(cs.courtId === selectedManageCourtId && cs.date === selectedManageDate && cs.slotLabel === slotLabel)
        ));
        setFeedback(`Slot "${slotLabel}" has been RE-OPENED for online booking.`);
      }
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setFeedback('Error updating court slot availability.');
    } finally {
      setIsTogglingSlot(false);
    }
  };

  const handleReleaseBookingSlot = async (bookingId: string, slotLabel: string) => {
    setIsTogglingSlot(true);
    try {
      await bookingService.updateStatus(bookingId, 'CANCELLED');
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, paymentStatus: 'CANCELLED' } : b));
      setClosedSlots(prev => prev.filter(
        cs => !(cs.courtId === selectedManageCourtId && cs.date === selectedManageDate && cs.slotLabel === slotLabel)
      ));
      setFeedback(`Đã hủy đặt chỗ ca "${slotLabel}" và mở lại thành công! Khung giờ hiện đã sẵn sàng cho khách đặt online.`);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setFeedback('Lỗi khi mở lại ca đặt.');
    } finally {
      setIsTogglingSlot(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN';

  // Metrics
  const totalRevenue = bookings
    .filter((b) => b.paymentStatus === 'PAID')
    .reduce((sum, b) => sum + b.totalPrice, 0);

  const pendingBookingsCount = bookings.filter((b) => b.paymentStatus === 'PENDING').length;
  const pendingApplicationsCount = applications.filter((a) => a.status === 'PENDING').length;

  // Actions
  const handleUpdateBookingStatus = async (bookingId: string, status: 'PAID' | 'CANCELLED') => {
    try {
      await bookingService.updateStatus(bookingId, status);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, paymentStatus: status } : b))
      );
      setFeedback(`Booking updated to ${status} and synced to Google Sheets Court_Bookings.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      alert('Error updating booking status');
    }
  };

  const handleUpdateApplicationStatus = async (appId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await memberService.updateStatus(appId, status);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status } : a))
      );

      if (status === 'APPROVED') {
        setFeedback('Application approved! Athlete has been automatically promoted into the official Player Roster.');
        playerService.getPlayers().then(setPlayers);
      } else {
        setFeedback('Application rejected.');
      }
      setTimeout(() => setFeedback(null), 4000);
    } catch (e) {
      alert('Error updating application status');
    }
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resolvedCode = (playerForm.countryCode || 'VN').toUpperCase();
      const matchedCountry = PLAYER_COUNTRIES.find((c) => c.code === resolvedCode);
      const resolvedCountry = playerForm.country || playerForm.countryName || matchedCountry?.name || 'Vietnam';
      const resolvedFlag = playerForm.countryFlag || matchedCountry?.flag || countryCodeToFlagEmoji(resolvedCode);
      const resolvedJoinedYear = Number(playerForm.joined ?? playerForm.joinedYear ?? 2025) || 2025;

      const payload: Partial<Player> = {
        ...playerForm,
        country: resolvedCountry,
        countryName: resolvedCountry,
        countryCode: resolvedCode,
        countryFlag: resolvedFlag,
        joined: resolvedJoinedYear,
        joinedYear: resolvedJoinedYear,
      };

      if (editingPlayer) {
        const updated = await playerService.updatePlayer(editingPlayer.id, payload);
        setPlayers((prev) => prev.map((p) => (p.id === editingPlayer.id ? { ...p, ...payload, ...updated } : p)));
        setFeedback(`Player ${payload.fullName} updated successfully.`);
      } else {
        const created = await playerService.addPlayer(payload);
        setPlayers((prev) => [{ ...payload, ...created } as Player, ...prev]);
        setFeedback(`Athlete ${payload.fullName} added to DVA roster.`);
      }
      setIsPlayerModalOpen(false);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      alert('Error saving player');
    }
  };

  const handleDeletePlayer = async (id: string, name: string) => {
    if (!window.confirm(`Delete athlete ${name} from roster?`)) return;
    try {
      await playerService.deletePlayer(id);
      setPlayers((prev) => prev.filter((p) => p.id !== id));
      setFeedback(`Athlete ${name} removed.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      alert('Error deleting player');
    }
  };

  // News CRUD handlers
  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsContent.trim()) return;
    if (isUploadingNewsThumb) {
      alert('Vui lòng đợi ảnh tải lên Cloudinary hoàn tất trước khi lưu bài viết.');
      return;
    }
    const resolvedImageUrl =
      newsThumbnail.trim() ||
      editingNews?.imageUrl ||
      editingNews?.image ||
      editingNews?.thumbnail ||
      'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80';
    try {
      const payload = {
        title: newsTitle.trim(),
        category: newsCategory,
        imageUrl: resolvedImageUrl,
        image: resolvedImageUrl,
        thumbnail: resolvedImageUrl,
        excerpt: newsExcerpt.trim() || (newsContent.trim().substring(0, 150) + '...'),
        content: newsContent.trim(),
        authorName: newsAuthorName.trim() || currentUser.fullName,
        authorRole: newsAuthorRole.trim() || 'Club Administration',
      };
      if (editingNews) {
        const updated = await newsService.updateNews(editingNews.id, payload);
        setNewsList(prev => prev.map(n => n.id === editingNews.id ? { ...n, ...payload, ...updated } : n));
        setFeedback(`Đã cập nhật bài viết "${newsTitle}"!`);
      } else {
        const created = await newsService.createNews(payload);
        setNewsList([created, ...newsList]);
        setFeedback(`Đã xuất bản bài viết mới "${newsTitle}"!`);
      }
      setIsNewsModalOpen(false);
      setEditingNews(null);
      setNewsTitle('');
      setNewsThumbnail('');
      setNewsExcerpt('');
      setNewsContent('');
      setTimeout(() => setFeedback(null), 3500);
    } catch (e) {
      alert('Lỗi lưu bài viết');
    }
  };

  const handleDeleteNews = async (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bài viết "${title}"?`)) return;
    try {
      await newsService.deleteNews(id);
      setNewsList(prev => prev.filter(n => n.id !== id));
      setFeedback(`Đã xóa bài viết "${title}".`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      alert('Error deleting news story');
    }
  };

  // Booking CRUD handlers
  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBooking) {
        const updated = await bookingService.updateBooking(editingBooking.id, bookingForm);
        setBookings(prev => prev.map(b => b.id === editingBooking.id ? { ...b, ...updated } : b));
        setFeedback(`Đã cập nhật đặt chỗ thành công!`);
      } else {
        const created = await bookingService.createBooking({
          ...bookingForm,
          courtId: bookingForm.courtId || 'court-btl',
          courtName: bookingForm.courtName || INITIAL_COURTS.find(c => c.id === bookingForm.courtId)?.name || 'Sân Thể Công (Court 1)',
          bookingDate: bookingForm.bookingDate || new Date().toISOString().split('T')[0],
          startTime: bookingForm.startTime || '17:30',
          endTime: bookingForm.endTime || '19:30',
          totalHours: bookingForm.totalHours || 2,
          totalPrice: bookingForm.totalPrice || 1000000,
          customerName: bookingForm.customerName || 'Khách Đặt Tại Sân',
          customerPhone: bookingForm.customerPhone || '0768299329',
          customerEmail: bookingForm.customerEmail || 'booking@dva.vn',
          addons: { mikasaBallCrate: false, mineralWaterBottles: 0, certifiedReferee: false },
        });
        setBookings(prev => [created, ...prev]);
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
    if (!window.confirm(`Xóa đơn đặt chỗ ${code}? Khung giờ này sẽ được giải phóng.`)) return;
    try {
      await bookingService.deleteBooking(id);
      setBookings(prev => prev.filter(b => b.id !== id));
      setFeedback(`Đã xóa đơn đặt chỗ ${code}.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      alert('Lỗi xóa đơn đặt chỗ');
    }
  };

  // Court CRUD & Weekly Schedule handlers
  const handleOpenAddCourtModal = () => {
    setEditingCourt(null);
    setSelectedScheduleDay('monday');
    setNewSlotInput('17:30 - 19:30');
    setCourtForm({
      name: '',
      code: '',
      shortName: '',
      address: 'DVA Sports Center, Hà Nội',
      description: 'Sân bóng chuyền tiêu chuẩn thi đấu FIVB trang bị thảm Taraflex Pro chống chấn thương và hệ thống chiếu sáng tiêu chuẩn.',
      floorType: 'Gerflor Taraflex Sport Pro',
      hourlyRate: 500000,
      minHours: 1.5,
      imageUrl: '/courts/btl.png',
      isAvailable: true,
      isActive: true,
      weeklySchedule: getDefaultWeeklyScheduleForCourt(),
    });
    setIsCourtModalOpen(true);
  };

  const handleOpenEditCourtModal = (court: Court) => {
    setEditingCourt(court);
    setSelectedScheduleDay('monday');
    setNewSlotInput('18:00 - 20:00');
    setCourtForm({
      ...court,
      address: court.address || 'DVA Sports Center, Hà Nội',
      hourlyRate: Number(court.hourlyRate) || 500000,
      weeklySchedule: normalizeWeeklySchedule(court.weeklySchedule, court.id),
    });
    setIsCourtModalOpen(true);
  };

  const handleSaveCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courtForm.name?.trim()) return;
    try {
      const payload: Partial<Court> = {
        ...courtForm,
        name: courtForm.name.trim(),
        address: (courtForm.address || 'DVA Sports Center, Hà Nội').trim(),
        hourlyRate: Math.round(Number(courtForm.hourlyRate) || 500000),
        weeklySchedule: normalizeWeeklySchedule(courtForm.weeklySchedule, editingCourt?.id),
      };

      if (editingCourt) {
        const updated = await courtService.updateCourt(editingCourt.id, payload);
        setCourtsList((prev) =>
          prev.map((c) =>
            c.id === editingCourt.id
              ? {
                  ...c,
                  ...payload,
                  ...updated,
                  weeklySchedule: normalizeWeeklySchedule(updated.weeklySchedule ?? payload.weeklySchedule, c.id),
                }
              : c
          )
        );
        setFeedback(`Đã cập nhật sân "${payload.name}" và lịch hoạt động hàng tuần!`);
      } else {
        const created = await courtService.createCourt(payload);
        const normalizedCreated: Court = {
          ...created,
          weeklySchedule: normalizeWeeklySchedule(created.weeklySchedule ?? payload.weeklySchedule, created.id),
        };
        setCourtsList((prev) => [...prev, normalizedCreated]);
        setSelectedManageCourtId(normalizedCreated.id);
        setFeedback(`Đã tạo sân mới "${normalizedCreated.name}" kèm lịch tuần thành công!`);
      }
      setIsCourtModalOpen(false);
      setEditingCourt(null);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi lưu thông tin sân');
    }
  };

  const handleDeleteCourt = async (court: Court) => {
    if (!window.confirm(`Bạn có chắc muốn xóa sân "${court.name}"? (Nếu sân đã có đơn đặt chỗ, hệ thống sẽ chuyển sang trạng thái ngừng hoạt động isActive = false)`)) {
      return;
    }
    try {
      const res = await courtService.deleteCourt(court.id);
      setCourtsList((prev) => {
        const remaining = prev.filter((c) => c.id !== court.id);
        if (selectedManageCourtId === court.id && remaining.length > 0) {
          setSelectedManageCourtId(remaining[0].id);
        }
        return remaining;
      });
      setFeedback(
        res.softDeleted
          ? `Đã ẩn sân "${court.name}" (Soft Delete: isActive = false do có lịch sử đặt sân).`
          : `Đã xóa sân "${court.name}" thành công.`
      );
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi xóa sân');
    }
  };

  const handleToggleCourtMaintenance = async (court: Court) => {
    const currentlyMaintenance = Boolean(
      court.isMaintenance === true || court.status === 'MAINTENANCE' || court.isAvailable === false
    );
    const nextMaint = !currentlyMaintenance;
    setTogglingCourtId(court.id);
    try {
      const updated = await courtService.toggleMaintenance(court.id, nextMaint);
      setCourtsList((prev) =>
        prev.map((c) =>
          c.id === court.id
            ? {
                ...c,
                ...updated,
                status: nextMaint ? 'MAINTENANCE' : 'ACTIVE',
                isMaintenance: nextMaint,
                isAvailable: !nextMaint,
                weeklySchedule: normalizeWeeklySchedule(updated.weeklySchedule ?? c.weeklySchedule, c.id),
              }
            : c
        )
      );
      setFeedback(
        nextMaint
          ? `🛠️ Đã chuyển sân "${court.name}" sang chế độ Bảo trì / Tạm ngưng cho thuê.`
          : `✅ Đã kích hoạt lại sân "${court.name}". Sân hiện đã sẵn sàng nhận khách đặt online!`
      );
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi cập nhật trạng thái bảo trì sân');
    } finally {
      setTogglingCourtId(null);
    }
  };

  const handleAddSlotToDay = () => {
    const clean = newSlotInput.trim();
    if (!clean) return;
    if (!parseSlotLabel(clean)) {
      alert('Vui lòng nhập đúng định dạng khung giờ "HH:mm - HH:mm" (Ví dụ: 17:30 - 19:30 hoặc 18:00 - 20:00).');
      return;
    }
    const currentSchedule = normalizeWeeklySchedule(courtForm.weeklySchedule, editingCourt?.id);
    const daySlots = currentSchedule[selectedScheduleDay] || [];
    if (daySlots.includes(clean)) {
      alert('Khung giờ này đã tồn tại trong ngày đã chọn.');
      return;
    }
    setCourtForm({
      ...courtForm,
      weeklySchedule: {
        ...currentSchedule,
        [selectedScheduleDay]: [...daySlots, clean],
      },
    });
    setNewSlotInput('');
  };

  const handleRemoveSlotFromDay = (dayKey: DayOfWeekKey, index: number) => {
    const currentSchedule = normalizeWeeklySchedule(courtForm.weeklySchedule, editingCourt?.id);
    const daySlots = currentSchedule[dayKey] || [];
    setCourtForm({
      ...courtForm,
      weeklySchedule: {
        ...currentSchedule,
        [dayKey]: daySlots.filter((_, idx) => idx !== index),
      },
    });
  };

  const handleCopyDayScheduleToWeekdays = (sourceDay: DayOfWeekKey) => {
    const currentSchedule = normalizeWeeklySchedule(courtForm.weeklySchedule, editingCourt?.id);
    const sourceSlots = [...(currentSchedule[sourceDay] || [])];
    setCourtForm({
      ...courtForm,
      weeklySchedule: {
        ...currentSchedule,
        monday: [...sourceSlots],
        tuesday: [...sourceSlots],
        wednesday: [...sourceSlots],
        thursday: [...sourceSlots],
        friday: [...sourceSlots],
      },
    });
  };

  // Course CRUD handlers
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Partial<TrainingCourse> = {
        ...courseForm,
        tag: courseForm.tag?.trim() || '',
        targetAudience: courseForm.targetAudience?.trim() || '',
        benefits: (courseForm.benefits || []).map(b => b.trim()).filter(Boolean),
      };
      if (editingCourse) {
        const updated = await trainingService.updateCourse(editingCourse.id, payload);
        setCoursesList(prev => prev.map(c => c.id === editingCourse.id ? { ...c, ...updated } : c));
        setFeedback(`Đã cập nhật khóa học "${courseForm.title}"!`);
      } else {
        const created = await trainingService.createCourse(payload);
        setCoursesList(prev => [created, ...prev]);
        setFeedback(`Đã tạo khóa học mới "${courseForm.title}"!`);
      }
      setIsCourseModalOpen(false);
      setEditingCourse(null);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      alert('Lỗi lưu khóa học');
    }
  };

  const handleDeleteCourse = async (id: string, title: string) => {
    if (!window.confirm(`Xóa khóa đào tạo "${title}"?`)) return;
    try {
      await trainingService.deleteCourse(id);
      setCoursesList(prev => prev.filter(c => c.id !== id));
      setFeedback(`Đã xóa khóa đào tạo "${title}".`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      alert('Lỗi xóa khóa học');
    }
  };

  // Coach CRUD handlers
  const handleSaveCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCoach) {
        const updated = await coachService.updateCoach(editingCoach.id, coachForm);
        setCoachesList(prev => prev.map(c => c.id === editingCoach.id ? { ...c, ...updated } : c));
        setFeedback(`Đã cập nhật HLV ${coachForm.name}!`);
      } else {
        const created = await coachService.addCoach(coachForm);
        setCoachesList(prev => [created, ...prev]);
        setFeedback(`Đã thêm HLV mới ${coachForm.name}!`);
      }
      setIsCoachModalOpen(false);
      setEditingCoach(null);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      alert('Lỗi lưu huấn luyện viên');
    }
  };

  const handleDeleteCoach = async (id: string, name: string) => {
    if (!window.confirm(`Xóa HLV ${name} khỏi ban huấn luyện?`)) return;
    try {
      await coachService.deleteCoach(id);
      setCoachesList(prev => prev.filter(c => c.id !== id));
      setFeedback(`Đã xóa HLV ${name}.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      alert('Lỗi xóa HLV');
    }
  };

  // Application delete
  const handleDeleteApplication = async (id: string, name: string) => {
    if (!window.confirm(`Xóa hồ sơ tuyển thành viên của ứng viên ${name}?`)) return;
    try {
      await memberService.deleteApplication(id);
      setApplications(prev => prev.filter(a => a.id !== id));
      setFeedback(`Đã xóa hồ sơ của ứng viên ${name}.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      alert('Lỗi xóa hồ sơ');
    }
  };

  // Training registration handlers
  const handleUpdateTrainingStatus = async (id: string, status: 'PENDING' | 'CONFIRMED' | 'CANCELLED') => {
    try {
      await trainingService.updateStatus(id, status);
      setTrainingRegs(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      setFeedback(`Trạng thái học viên đã chuyển thành ${status}.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      alert('Lỗi cập nhật học viên');
    }
  };

  const handleDeleteRegistration = async (id: string, name: string) => {
    if (!window.confirm(`Xóa đăng ký học của học viên ${name}?`)) return;
    try {
      await trainingService.deleteRegistration(id);
      setTrainingRegs(prev => prev.filter(r => r.id !== id));
      setFeedback(`Đã xóa lượt đăng ký của học viên ${name}.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      alert('Lỗi xóa lượt đăng ký');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white py-24 text-center space-y-4">
        <Shield className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold">Access Restricted to Club Administrators</h2>
        <p className="text-slate-400 text-xs max-w-md mx-auto">
          Please switch to SUPERADMIN (Hoang Quoc Duy) or ADMIN (Tran Minh Tuan) from the profile menu to access the workspace.
        </p>
        <Link
          to="/"
          className="inline-block px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      
      {/* Dedicated Admin Portal Header */}
      <header className="bg-[#121826] border-b border-slate-800 px-6 py-4 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center text-white shadow font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-black text-lg text-white">
                  DVA Club Management Workspace
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-900 text-red-200 border border-red-700 font-mono">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Connected Admin: <strong>{currentUser.fullName}</strong> ({currentUser.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#161F30] border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <Link
              to="/"
              className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit to Public Website</span>
            </Link>
          </div>

        </div>

        {/* Dedicated Admin Module Navigation Tabs */}
        <div className="max-w-7xl mx-auto mt-4 pt-2 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs font-bold">
          {[
            { id: 'OVERVIEW', label: 'Overview & Metrics' },
            { id: 'COURTS', label: 'Court Schedule & Slots' },
            { 
              id: 'BOOKINGS', 
              label: 'Court Bookings & VietQR', 
              badge: pendingBookingsCount 
            },
            { id: 'PLAYERS', label: `Squad Roster (${players.length})` },
            { id: 'TRAINING', label: `Academy & Courses (${coursesList.length})` },
            { id: 'COACHES', label: `Coaching Staff (${coachesList.length})` },
            { 
              id: 'APPLICATIONS', 
              label: 'Tryout Applications', 
              badge: pendingApplicationsCount 
            },
            { id: 'NEWS', label: `News Articles (${newsList.length})` },
            { id: 'SHEETS', label: 'Google Sheets Live Sync' },
            ...(isSuperAdmin ? [{ id: 'USERS', label: 'Quản lý Tài Khoản' }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setActiveModule(tab.id as any);
              }}
              className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeModule === tab.id
                  ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow ring-1 ring-red-400'
                  : 'bg-[#161F30] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              {Boolean(tab.badge && tab.badge > 0) && (
                <span className="w-4 h-4 rounded-full bg-white text-red-900 text-[9px] flex items-center justify-center font-black">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Notification feedback */}
        {feedback && (
          <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* MODULE 1: OVERVIEW & METRICS */}
        {activeModule === 'OVERVIEW' && (
          <div className="space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-5 space-y-1 shadow">
                <span className="text-xs text-slate-400 font-semibold block">Total Court Revenue</span>
                <div className="font-mono font-black text-2xl text-orange-400 tabular-nums">
                  {totalRevenue.toLocaleString('vi-VN')} đ
                </div>
                <span className="text-[10px] text-slate-500 block">MB Bank: 0002090671521</span>
              </div>

              <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-5 space-y-1 shadow">
                <span className="text-xs text-slate-400 font-semibold block">Pending Court Orders</span>
                <div className="font-mono font-black text-2xl text-amber-400 tabular-nums">
                  {pendingBookingsCount} Sessions
                </div>
                <span className="text-[10px] text-slate-500 block">Awaiting VietQR verification</span>
              </div>

              <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-5 space-y-1 shadow">
                <span className="text-xs text-slate-400 font-semibold block">Tryout Applications</span>
                <div className="font-mono font-black text-2xl text-blue-400 tabular-nums">
                  {pendingApplicationsCount} Pending
                </div>
                <span className="text-[10px] text-slate-500 block">Approve to promote into squad</span>
              </div>

              <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-5 space-y-1 shadow">
                <span className="text-xs text-slate-400 font-semibold block">Active Squad Athletes</span>
                <div className="font-mono font-black text-2xl text-emerald-400 tabular-nums">
                  {players.length} Athletes
                </div>
                <span className="text-[10px] text-slate-500 block">Senior, Junior & Kid divisions</span>
              </div>
            </div>

            {/* Quick summary tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-white">Recent Court Reservations</h3>
                  <button
                    onClick={() => setActiveModule('BOOKINGS')}
                    className="text-xs text-orange-400 hover:underline font-bold"
                  >
                    View All
                  </button>
                </div>
                <div className="divide-y divide-slate-800/80 text-xs">
                  {bookings.slice(0, 4).map((b) => (
                    <div key={b.id} className="py-3 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">{b.courtName} ({b.startTime} - {b.endTime})</div>
                        <div className="text-[11px] text-slate-400">{b.customerName} · Ref: <span className="font-mono text-slate-300">{b.bookingCode}</span></div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.paymentStatus === 'PAID' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {b.paymentStatus}
                        </span>
                        <div className="font-mono text-orange-400 font-bold mt-0.5">{b.totalPrice.toLocaleString('vi-VN')} đ</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-white">Pending Tryout Candidates</h3>
                  <button
                    onClick={() => setActiveModule('APPLICATIONS')}
                    className="text-xs text-orange-400 hover:underline font-bold"
                  >
                    Review All
                  </button>
                </div>
                <div className="divide-y divide-slate-800/80 text-xs">
                  {applications.slice(0, 4).map((app) => (
                    <div key={app.id} className="py-3 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">{app.fullName} ({app.position})</div>
                        <div className="text-[11px] text-slate-400">Reach: {app.spikeReach}cm · {app.level} · 5-1: {app.rotationKnowledge}</div>
                      </div>
                      <div>
                        {app.status === 'PENDING' ? (
                          <button
                            onClick={() => handleUpdateApplicationStatus(app.id, 'APPROVED')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            Approve
                          </button>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">{app.status}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* MODULE: COURTS CRUD, WEEKLY SCHEDULE & LIVE SLOT LOCK MANAGEMENT */}
        {activeModule === 'COURTS' && (
          <div className="space-y-6">
            {/* 1. COURTS LIST CRUD & WEEKLY SCHEDULE OVERVIEW */}
            <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-heading font-black text-lg text-white">
                    Quản Lý Hệ Thống Sân & Khung Giờ Hàng Tuần (Courts & Weekly Schedule CRUD)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Thêm sân mới, cập nhật địa chỉ, giá thuê/giờ và tùy chỉnh khung giờ hoạt động theo từng thứ trong tuần (Thứ 2 → Chủ Nhật).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddCourtModal}
                  className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Sân Mới</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {courtsList.map((court) => {
                  const schedule = normalizeWeeklySchedule(court.weeklySchedule, court.id);
                  const totalWeeklySlots = DAYS_OF_WEEK.reduce(
                    (acc, d) => acc + (schedule[d.key]?.length || 0),
                    0
                  );
                  const isMaintenance = Boolean(
                    court.isMaintenance === true || court.status === 'MAINTENANCE' || court.isAvailable === false
                  );
                  const isTogglingThis = togglingCourtId === court.id;

                  return (
                    <div
                      key={court.id}
                      className={`rounded-2xl border bg-[#0E1524] overflow-hidden flex flex-col justify-between shadow-lg transition-all ${
                        isMaintenance
                          ? 'border-amber-500/60 ring-1 ring-amber-500/20'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="relative h-36 w-full bg-slate-900 overflow-hidden">
                          <img
                            src={court.imageUrl || '/courts/btl.png'}
                            alt={court.name}
                            referrerPolicy="no-referrer"
                            className={`w-full h-full object-cover transition-all ${
                              isMaintenance ? 'opacity-50 grayscale-[40%]' : ''
                            }`}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0E1524] via-black/40 to-transparent" />
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase bg-red-600 text-white shadow">
                                {court.code}
                              </span>
                              {isMaintenance ? (
                                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-950/95 text-amber-300 border border-amber-500/70 shadow flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                  <span>Bảo trì / Tạm ngưng</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-950/95 text-emerald-300 border border-emerald-500/60 shadow flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span>Hoạt động</span>
                                </span>
                              )}
                            </div>
                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-black/75 text-orange-400 border border-orange-500/30">
                              {Number(court.hourlyRate || 500000).toLocaleString('vi-VN')} đ/h
                            </span>
                          </div>
                          <div className="absolute bottom-2.5 left-3 right-3">
                            <h4 className="font-heading font-black text-base text-white truncate">
                              {court.name}
                            </h4>
                            <div className="text-[11px] text-slate-300 flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
                              <span className="truncate">{court.address || 'DVA Sports Center, Hà Nội'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 space-y-3 text-xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Trạng thái vận hành:</span>
                            {isMaintenance ? (
                              <span className="font-bold text-amber-400">🛠️ Đang bảo trì (Ngừng nhận đơn)</span>
                            ) : (
                              <span className="font-bold text-emerald-400">✓ Sẵn sàng cho thuê</span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Tổng số ca / tuần:</span>
                            <strong className="font-mono text-emerald-400">{totalWeeklySlots} ca hoạt động</strong>
                          </div>

                          <div className="bg-[#161F30] p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">T2 – T6 (Ngày thường):</span>
                              <span className="font-mono text-white font-semibold truncate max-w-[155px]">
                                {(schedule.monday || []).length > 0
                                  ? `${schedule.monday.length} ca (${schedule.monday[0]?.split(' ')[0]}...)`
                                  : 'Nghỉ'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Thứ 7 (Sat):</span>
                              <span className="font-mono text-orange-300 font-semibold">
                                {(schedule.saturday || []).length} ca
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Chủ Nhật (Sun):</span>
                              <span className="font-mono text-orange-300 font-semibold">
                                {(schedule.sunday || []).length} ca
                              </span>
                            </div>
                          </div>

                          {/* Quick Toggle Maintenance Button */}
                          <button
                            type="button"
                            disabled={isTogglingThis}
                            onClick={() => handleToggleCourtMaintenance(court)}
                            className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                              isMaintenance
                                ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
                            } ${isTogglingThis ? 'opacity-60 cursor-wait' : ''}`}
                          >
                            {isTogglingThis ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Đang cập nhật...</span>
                              </>
                            ) : isMaintenance ? (
                              <>
                                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Kích hoạt lại</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                                <span>Tạm dừng sân (Bảo trì)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="px-4 py-3 border-t border-slate-800/80 flex items-center justify-between gap-2 bg-[#0B101C]">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCourtModal(court)}
                          className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-orange-400" />
                          <span>Sửa Sân & Lịch Tuần</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCourt(court)}
                          className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-950 text-slate-400 hover:text-red-300 border border-slate-700/80 hover:border-red-800 cursor-pointer transition-colors"
                          title="Xóa sân"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. LIVE COURT SCHEDULE & SLOT LOCK MANAGEMENT */}
            <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="font-heading font-black text-lg text-white">
                      Live Court Schedule & Slot Lock Management
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Khóa ca thi đấu/giao hữu ngoại tuyến hoặc bảo trì sân theo ngày cụ thể. Ca bị khóa sẽ lập tức hiển thị "Closed / Rented" ở phía khách hàng.
                  </p>
                </div>

                {/* Date Picker */}
                <div className="flex items-center gap-2 bg-[#0E1524] px-3.5 py-2 rounded-xl border border-slate-700">
                  <Calendar className="w-4 h-4 text-orange-400 shrink-0" />
                  <input
                    type="date"
                    value={selectedManageDate}
                    onChange={(e) => setSelectedManageDate(e.target.value)}
                    className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Court Selector Pills */}
              <div className="flex flex-wrap items-center gap-2.5">
                {courtsList.map((court) => {
                  const isSelected = court.id === selectedManageCourtId;
                  return (
                    <button
                      key={court.id}
                      type="button"
                      onClick={() => setSelectedManageCourtId(court.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg shadow-red-950/40 ring-1 ring-red-400'
                          : 'bg-[#0E1524] text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <span>{court.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isSelected ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        {court.code}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Lock Reason Optional Input */}
              <div className="flex items-center gap-3 bg-[#0E1524] p-3 rounded-2xl border border-slate-800 text-xs">
                <span className="text-slate-400 font-semibold whitespace-nowrap">Lý do khóa ca mặc định:</span>
                <input
                  type="text"
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="VD: Đội ngoài thuê cố định, Trận đấu giao hữu CLB, Vệ sinh mặt sàn..."
                  className="flex-1 bg-transparent text-white border-b border-slate-700 focus:border-orange-500 focus:outline-none px-2 py-1 text-xs"
                />
              </div>

              {/* Slot Grid for the chosen Court & Date */}
              {(() => {
                const selectedManageCourt = courtsList.find((c) => c.id === selectedManageCourtId);
                const slots = getScheduleSlotsForCourtAndDate(
                  selectedManageCourtId,
                  selectedManageDate,
                  selectedManageCourt?.weeklySchedule
                );
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {slots.map((slot) => {
                      const isClosed = closedSlots.find(
                        cs => cs.courtId === selectedManageCourtId && cs.date === selectedManageDate && cs.slotLabel === slot.label
                      );
                      const bookingMatch = bookings.find(
                        b => b.courtId === selectedManageCourtId && b.bookingDate === selectedManageDate && b.paymentStatus !== 'CANCELLED' &&
                        (b.startTime === slot.start || `${b.startTime} - ${b.endTime}` === slot.label)
                      );

                      return (
                        <div
                          key={slot.label}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                            isClosed
                              ? 'bg-red-950/30 border-red-800/80'
                              : bookingMatch
                              ? 'bg-blue-950/30 border-blue-800/80'
                              : 'bg-[#0E1524] border-slate-800'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-mono font-bold text-sm text-white flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-orange-400" />
                                <span>{slot.label}</span>
                              </div>
                              <span className="text-[10px] text-slate-400">{slot.period} · {slot.durationHours} hours</span>
                            </div>

                            {isClosed ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-900 text-red-200 border border-red-700 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                <span>CLOSED</span>
                              </span>
                            ) : bookingMatch ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900 text-blue-200 border border-blue-700">
                                {bookingMatch.paymentStatus === 'PAID' ? 'BOOKED' : 'HOLDING'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                OPEN
                              </span>
                            )}
                          </div>

                          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs gap-2">
                            <div className="text-[11px] text-slate-400 truncate">
                              {isClosed ? (
                                <span className="text-red-400 font-semibold">Đã khóa: {isClosed.reason || 'Bảo trì'}</span>
                              ) : bookingMatch ? (
                                <span>
                                  <strong className="text-white">{bookingMatch.customerName}</strong>
                                  <span className="text-slate-500 ml-1">({bookingMatch.customerPhone})</span>
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-semibold">Ca trống (Sẵn sàng cho thuê)</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {bookingMatch && (
                                <button
                                  type="button"
                                  disabled={isTogglingSlot}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleReleaseBookingSlot(bookingMatch.id, slot.label);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 flex items-center gap-1 transition-all cursor-pointer shadow"
                                  title="Hủy đặt chỗ của khách và giải phóng ca này ngay lập tức"
                                >
                                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Mở lại ca này</span>
                                </button>
                              )}

                              {isClosed ? (
                                <button
                                  type="button"
                                  disabled={isTogglingSlot}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleToggleSlotLock(slot.label);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Mở lại ca</span>
                                </button>
                              ) : !bookingMatch ? (
                                <button
                                  type="button"
                                  disabled={isTogglingSlot}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleToggleSlotLock(slot.label);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Lock className="w-3.5 h-3.5 text-red-400" />
                                  <span>Khóa ca</span>
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* MODULE: COURT BOOKINGS & PAYMENT APPROVAL */}
        {activeModule === 'BOOKINGS' && (
          <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-base text-white">Court Reservations & VietQR Payment Approvals</h3>
                <p className="text-xs text-slate-400">Kiểm tra giao dịch MB Bank (0002090671521, HOANG QUOC DUY), quản lý CRUD đơn đặt sân và mở lại ca khi khách hủy.</p>
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
                    setEditingBooking(null);
                    setBookingForm({
                      customerName: '',
                      customerPhone: '',
                      customerEmail: '',
                      courtId: selectedManageCourtId,
                      courtName: INITIAL_COURTS.find(c => c.id === selectedManageCourtId)?.name || 'Sân Thể Công (Court 1)',
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

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
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
                        <span className="font-bold text-white block">{b.bookingCode}</span>
                        <span className="text-[10px] text-slate-500">{b.bookingDate}</span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-white block">{b.courtName}</span>
                        <span className="text-[11px] text-slate-400">{b.startTime} - {b.endTime} ({b.totalHours}h)</span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-semibold text-white block">{b.customerName}</span>
                        <span className="font-mono text-[11px] text-slate-400">{b.customerPhone}</span>
                      </td>

                      <td className="py-3 px-3 text-[11px]">
                        {b.addons.mineralWaterBottles > 0 && <div>• {b.addons.mineralWaterBottles} bottles</div>}
                        {b.addons.mikasaBallCrate && <div>• Ball Crate</div>}
                        {b.addons.certifiedReferee && <div className="text-orange-400">• Referee</div>}
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-orange-400 text-xs">
                        {b.totalPrice.toLocaleString('vi-VN')} đ
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.paymentStatus === 'PAID'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : b.paymentStatus === 'CANCELLED'
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
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
                                onClick={() => handleUpdateBookingStatus(b.id, 'PAID')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                              >
                                Approve Paid
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateBookingStatus(b.id, 'CANCELLED')}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg transition-colors cursor-pointer"
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
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                            title="Chỉnh sửa thông tin đặt sân"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBooking(b.id, b.bookingCode)}
                            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 cursor-pointer"
                            title="Xóa đơn đặt sân"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODULE 3: MEMBER APPLICATIONS & AUTO-PLAYER PROMOTION */}
        {activeModule === 'APPLICATIONS' && (
          <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-base text-white">Review Member Tryout Applications</h3>
                <p className="text-xs text-slate-400">
                  Clicking <strong>"Approve & Promote to Squad"</strong> immediately creates the athlete card in the public roster.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#0E1524] text-slate-400 font-bold border-b border-slate-800">
                    <th className="py-3 px-3">Candidate / Position</th>
                    <th className="py-3 px-3">Division</th>
                    <th className="py-3 px-3">Height / Weight</th>
                    <th className="py-3 px-3">Spike Reach</th>
                    <th className="py-3 px-3">5-1 Knowledge</th>
                    <th className="py-3 px-3">Contact (Zalo / Email)</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3">
                        <span className="font-bold text-white block">{app.fullName}</span>
                        <span className="text-[11px] text-slate-400">Position: <strong className="text-orange-400">{app.position}</strong> (Preferred #{app.desiredJerseyNumber})</span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-orange-400">{app.level}</td>
                      <td className="py-3 px-3 font-mono">{app.height}cm / {app.weight}kg</td>
                      <td className="py-3 px-3 font-mono font-bold text-red-400">{app.spikeReach}cm</td>
                      <td className="py-3 px-3">{app.rotationKnowledge}</td>
                      <td className="py-3 px-3 text-[11px]">
                        <div>Zalo: <strong className="font-mono text-white">{app.zalo}</strong></div>
                        <div className="text-slate-400">{app.gmail}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          app.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {app.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {app.status === 'PENDING' ? (
                            <>
                              <button
                                onClick={() => handleUpdateApplicationStatus(app.id, 'APPROVED')}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                              >
                                Approve & Promote
                              </button>
                              <button
                                onClick={() => handleUpdateApplicationStatus(app.id, 'REJECTED')}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] rounded-lg transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-500 text-[11px] mr-1">Decided</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteApplication(app.id, app.fullName)}
                            className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 cursor-pointer"
                            title="Xóa hồ sơ ứng viên"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODULE 4: SQUAD ROSTER CRUD WITH SEARCH */}
        {activeModule === 'PLAYERS' && (() => {
          const filteredPlayers = players.filter((p) => {
            if (!playerSearchQuery.trim()) return true;
            const q = playerSearchQuery.toLowerCase().trim();
            const matchName = p.fullName.toLowerCase().includes(q);
            const matchJersey = String(p.jerseyNumber).includes(q) || `#${p.jerseyNumber}`.includes(q);
            const matchPos = p.position.toLowerCase().includes(q);
            const matchLevel = p.level.toLowerCase().includes(q);
            const matchHometown = (p.hometownCountry || '').toLowerCase().includes(q);
            const matchCountry = (p.country || p.countryName || '').toLowerCase().includes(q) || (p.countryCode || '').toLowerCase().includes(q);
            const matchJoined = String(p.joined ?? p.joinedYear ?? '').includes(q);
            return matchName || matchJersey || matchPos || matchLevel || matchHometown || matchCountry || matchJoined;
          });

          return (
            <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-base text-white">Player Roster Management</h3>
                  <p className="text-xs text-slate-400">Search, edit, or add official athlete cards and adjust division tiers.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingPlayer(null);
                    setPlayerForm({
                      fullName: '',
                      jerseyNumber: Math.floor(Math.random() * 50) + 1,
                      height: 185,
                      weight: 75,
                      spikeTouch: 330,
                      blockTouch: 315,
                      hometownCountry: 'Hà Nội',
                      country: 'Vietnam',
                      countryName: 'Vietnam',
                      countryCode: 'VN',
                      countryFlag: '🇻🇳',
                      bornYear: 2005,
                      joined: 2025,
                      joinedYear: 2025,
                      level: 'SENIOR',
                      position: 'OH',
                      bio: '',
                      captain: false,
                      isCaptain: false,
                    });
                    setIsPlayerModalOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Athlete</span>
                </button>
              </div>

              {/* SEARCH INPUT BAR */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0E1524] p-3.5 rounded-2xl border border-slate-800">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={playerSearchQuery}
                    onChange={(e) => setPlayerSearchQuery(e.target.value)}
                    placeholder="Search athlete by name, jersey #, position (OH/OP/MB/S/L), or division..."
                    className="w-full pl-10 pr-9 py-2.5 bg-[#161F30] border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  />
                  {playerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPlayerSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-xs text-slate-400 font-medium px-1 flex items-center gap-1.5 shrink-0">
                  <span>Showing:</span>
                  <strong className="text-white font-mono">{filteredPlayers.length}</strong>
                  <span>of</span>
                  <span className="text-slate-500 font-mono">{players.length} athletes</span>
                </div>
              </div>

              {filteredPlayers.length === 0 ? (
                <div className="p-8 text-center bg-[#0E1524] rounded-2xl border border-slate-800 space-y-3">
                  <p className="text-xs text-slate-400">
                    No athletes found matching <strong className="text-white">"{playerSearchQuery}"</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPlayerSearchQuery('')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Clear Search Filter
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPlayers.map((p) => {
                    const flagEmoji = p.countryFlag || countryCodeToFlagEmoji(p.countryCode || 'VN');
                    const countryLabel = p.country || p.countryName || 'Vietnam';
                    const joinedLabel = p.joined ?? p.joinedYear ?? 2025;
                    return (
                    <div key={p.id} className="p-4 rounded-2xl border border-slate-800 bg-[#0E1524] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-athletic font-black text-orange-400 text-lg">
                          #{p.jerseyNumber}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs flex items-center gap-1.5">
                            <span>{p.fullName}</span>
                            {(p.captain || p.isCaptain) && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-sm border border-yellow-200">
                                CAPTAIN
                              </span>
                            )}
                            <span className="text-xs select-none" title={`${countryLabel} (${p.countryCode || 'VN'})`}>
                              {flagEmoji}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {p.position} · {p.level} · {p.height}cm · Reach {p.spikeTouch}cm · Joined {joinedLabel}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const initCode = (p.countryCode || 'VN').toUpperCase();
                            const initCountry = p.country || p.countryName || PLAYER_COUNTRIES.find((c) => c.code === initCode)?.name || 'Vietnam';
                            const initFlag = p.countryFlag || countryCodeToFlagEmoji(initCode);
                            const initJoined = Number(p.joined ?? p.joinedYear ?? 2025) || 2025;
                            setEditingPlayer(p);
                            setPlayerForm({ 
                              ...p,
                              country: initCountry,
                              countryName: initCountry,
                              countryCode: initCode,
                              countryFlag: initFlag,
                              joined: initJoined,
                              joinedYear: initJoined,
                              captain: Boolean(p.captain || p.isCaptain),
                              isCaptain: Boolean(p.captain || p.isCaptain)
                            });
                            setIsPlayerModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                          title="Edit athlete profile"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePlayer(p.id, p.fullName)}
                          className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 cursor-pointer"
                          title="Delete athlete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* MODULE 5: ACADEMY COURSES & SCRIMMAGE TRAINEES */}
        {activeModule === 'TRAINING' && (
          <div className="space-y-6">
            {/* Trainees List */}
            <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-base text-white">Academy & Scrimmage Trainee Registrations</h3>
                  <p className="text-xs text-slate-400">Danh sách học viên đăng ký ghép team thi đấu hoặc kèm riêng 1-on-1 với HLV.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0E1524] text-slate-400 font-bold border-b border-slate-800">
                      <th className="py-3 px-3">Trainee / Contact</th>
                      <th className="py-3 px-3">Enrolled Program</th>
                      <th className="py-3 px-3">Skill Level</th>
                      <th className="py-3 px-3">Time Slot & Notes</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {trainingRegs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                          Chưa có lượt đăng ký khóa học nào.
                        </td>
                      </tr>
                    ) : (
                      trainingRegs.map((reg) => (
                        <tr key={reg.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-3">
                            <span className="font-bold text-white block">{reg.fullName}</span>
                            <span className="font-mono text-[11px] text-slate-400">{reg.phone} · {reg.email}</span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-amber-400">
                            {reg.courseTitle}
                          </td>
                          <td className="py-3 px-3">{reg.experienceLevel}</td>
                          <td className="py-3 px-3 text-[11px] text-slate-400">
                            <div>Slot: {reg.preferredTimeSlot}</div>
                            {reg.notes && <div className="italic text-slate-300 line-clamp-1">"{reg.notes}"</div>}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              reg.status === 'CONFIRMED'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}>
                              {reg.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {reg.status === 'PENDING' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateTrainingStatus(reg.id, 'CONFIRMED')}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateTrainingStatus(reg.id, 'CANCELLED')}
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] rounded-lg transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <span className="text-slate-500 text-[11px]">Finalized</span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteRegistration(reg.id, reg.fullName)}
                                className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 cursor-pointer ml-1"
                                title="Xóa lượt đăng ký"
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
            </div>

            {/* Courses Management CRUD Section */}
            <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-base text-white">Quản Lý Các Khóa Học & Lộ Trình (Course CRUD)</h3>
                  <p className="text-xs text-slate-400">Thêm, sửa học phí, lịch học hoặc xóa các chương trình đào tạo hiển thị trên trang Học Viện.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCourse(null);
                    setCourseForm({
                      title: '',
                      level: 'JUNIOR',
                      schedule: 'Thứ 3 & Thứ 5 (18:00 - 20:00)',
                      duration: '8 tuần (16 buổi)',
                      maxSlots: 16,
                      enrolledSlots: 0,
                      price: 2400000,
                      coachName: 'Hoàng Quốc Duy',
                      coachTitle: 'Head Coach & Founder',
                      description: '',
                      curriculum: ['Khởi động chuyên sâu', 'Tấn công biên 4', 'Phòng thủ hàng sau'],
                      benefits: ['Áo đấu DVA chính hãng', 'Phân tích video kỹ thuật'],
                    });
                    setIsCourseModalOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Khóa Học Mới</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coursesList.map((course) => (
                  <div key={course.id} className="p-5 rounded-2xl border border-slate-800 bg-[#0E1524] flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                          {course.level}
                        </span>
                        <span className="font-mono text-orange-400 font-bold text-xs">
                          {course.price.toLocaleString('vi-VN')} đ
                        </span>
                      </div>

                      <h4 className="font-heading font-black text-base text-white">
                        {course.title}
                      </h4>

                      <p className="text-xs text-slate-400 line-clamp-2">
                        {course.description}
                      </p>

                      <div className="pt-2 text-[11px] text-slate-400 space-y-1">
                        <div>📅 <strong>Lịch:</strong> {course.schedule}</div>
                        <div>⏱ <strong>Thời lượng:</strong> {course.duration} ({course.enrolledSlots}/{course.maxSlots} học viên)</div>
                        <div>🏆 <strong>HLV:</strong> {course.coachName} ({course.coachTitle})</div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCourse(course);
                          setCourseForm(course);
                          setIsCourseModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-orange-400" />
                        <span>Sửa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCourse(course.id, course.title)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODULE: COACHING STAFF MANAGEMENT */}
        {activeModule === 'COACHES' && (
          <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-base text-white">Ban Huấn Luyện & Chuyên Gia (Coaching Staff CRUD)</h3>
                <p className="text-xs text-slate-400">Quản lý đội ngũ HLV, chuyên gia thể lực và chứng chỉ hiển thị cho học viên đặt lịch đào tạo.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingCoach(null);
                  setCoachForm({
                    name: '',
                    role: 'Chuyên Gia Tấn Công Biên',
                    experience: '5 năm kinh nghiệm',
                    height: '',
                    bornYear: undefined,
                    age: undefined,
                    specialty: '',
                    bio: '',
                    avatarUrl: '/coaches/duy.png',
                    certifications: ['FIVB Level 1 Certified', 'Cựu VĐV Quốc Gia'],
                  });
                  setIsCoachModalOpen(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Huấn Luyện Viên</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {coachesList.map((coach) => (
                <div key={coach.id} className="p-5 rounded-2xl border border-slate-800 bg-[#0E1524] flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-[#161F30] border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                        {coach.avatarUrl ? (
                          <img
                            src={coach.avatarUrl}
                            alt={coach.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Award className="w-6 h-6 text-orange-400" />
                        )}
                      </div>

                      <div>
                        <h4 className="font-heading font-black text-base text-white">
                          {coach.name}
                        </h4>
                        <span className="text-xs text-orange-400 font-semibold block">
                          {coach.role}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {coach.experience}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {coach.bio}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {coach.certifications.map((cert, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                          ✓ {cert}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCoach(coach);
                        setCoachForm(coach);
                        setIsCoachModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-orange-400" />
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCoach(coach.id, coach.name)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODULE 6: NEWS & STORY PUBLISHING (Required by user) */}
        {activeModule === 'NEWS' && (
          <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-base text-white">Club Bulletin & Story Publishing</h3>
                <p className="text-xs text-slate-400">Publish tournament announcements, tryout updates, tactical guides, or community stories.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingNews(null);
                  setNewsTitle('');
                  setNewsThumbnail('');
                  setNewsCategory('TOURNAMENT');
                  setNewsExcerpt('');
                  setNewsContent('');
                  setNewsAuthorName(currentUser.fullName);
                  setNewsAuthorRole('Club Administration');
                  setIsNewsModalOpen(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Publish New Story</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {newsList.map((story) => (
                <div key={story.id} className="p-5 rounded-2xl border border-slate-800 bg-[#0E1524] flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    {(story.imageUrl || story.image || story.thumbnail) && (
                      <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 mb-2">
                        <img
                          src={story.imageUrl || story.image || story.thumbnail}
                          alt={story.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src =
                              'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80';
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-red-950 text-red-400 border border-red-800">
                        {story.category}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">{story.publishedAt}</span>
                    </div>

                    <h4 className="font-heading font-black text-base text-white line-clamp-2">
                      {story.title}
                    </h4>

                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {story.excerpt || story.content}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <div className="text-[11px] text-slate-400">
                      By <strong className="text-white">{story.authorName}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/news/${story.id}`}
                        target="_blank"
                        className="text-orange-400 hover:underline font-bold text-[11px]"
                      >
                        Read
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNews(story);
                          setNewsTitle(story.title);
                          setNewsCategory(story.category);
                          setNewsThumbnail(story.imageUrl || story.image || story.thumbnail || '');
                          setNewsExcerpt(story.excerpt || '');
                          setNewsContent(story.content);
                          setNewsAuthorName(story.authorName);
                          setNewsAuthorRole(story.authorRole || 'Club Administration');
                          setIsNewsModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                        title="Chỉnh sửa bài viết"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNews(story.id, story.title)}
                        className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 cursor-pointer"
                        title="Delete story"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODULE 8: USER ACCOUNT MANAGEMENT (SUPERADMIN only) */}
        {activeModule === 'USERS' && isSuperAdmin && (
          <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-white">Quản lý Tài Khoản ({usersList.length})</h2>
                <p className="text-xs text-slate-400">Tạo, phân quyền và xóa tài khoản người dùng / nhân sự.</p>
              </div>
              <button
                type="button"
                onClick={openCreateUserModal}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Tài Khoản Mới</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2 pr-4">Tên</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {usersList.map((u) => {
                    const isProtected = u.role === 'SUPERADMIN' || u.id === currentUser.id;
                    return (
                      <tr key={u.id} className="text-slate-200">
                        <td className="py-3 pr-4 font-semibold">{u.fullName}</td>
                        <td className="py-3 pr-4 text-slate-400">{u.email}</td>
                        <td className="py-3 pr-4">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${USER_ROLE_BADGE[u.role] || USER_ROLE_BADGE.GUEST}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {isProtected ? (
                            <span className="text-[10px] text-slate-500 italic">Được bảo vệ</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <select
                                value={u.role}
                                onChange={(e) => handleChangeUserRole(u, e.target.value as ManagedUserRole)}
                                className="bg-[#0B1220] border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white cursor-pointer"
                              >
                                {MANAGED_USER_ROLES.map((r) => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg bg-red-950/60 text-red-400 hover:bg-red-900/70 border border-red-500/40 cursor-pointer"
                                title="Xóa tài khoản"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {usersList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">Chưa có tài khoản nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {isUserModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                <form
                  onSubmit={handleCreateUser}
                  className="w-full max-w-md bg-[#0F1727] border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-white">Tạo Tài Khoản Mới</h3>
                    <button type="button" onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {userFormError && (
                    <div className="bg-red-950/70 border border-red-500/60 text-red-200 text-xs px-3 py-2 rounded-xl">{userFormError}</div>
                  )}

                  {([
                    { key: 'name', label: 'Tên', type: 'text' },
                    { key: 'email', label: 'Email', type: 'email' },
                    { key: 'password', label: 'Mật khẩu (tối thiểu 8 ký tự)', type: 'password' },
                  ] as const).map((f) => (
                    <label key={f.key} className="block space-y-1">
                      <span className="text-[11px] font-bold text-slate-400">{f.label}</span>
                      <input
                        type={f.type}
                        required
                        value={userForm[f.key]}
                        onChange={(e) => setUserForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        autoComplete={f.key === 'password' ? 'new-password' : 'off'}
                        className="w-full bg-[#0B1220] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </label>
                  ))}

                  <label className="block space-y-1">
                    <span className="text-[11px] font-bold text-slate-400">Role</span>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value as ManagedUserRole }))}
                      className="w-full bg-[#0B1220] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white cursor-pointer"
                    >
                      {MANAGED_USER_ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </label>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsUserModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingUser}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
                    >
                      {isSavingUser ? 'Đang tạo...' : 'Tạo tài khoản'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* MODULE 7: GOOGLE SHEETS LIVE SYNC INSPECTOR */}
        {activeModule === 'SHEETS' && (
          <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Google Sheets Auto-Sync Webhook
                  </span>
                  {googleScriptUrl ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Đã kết nối Webhook</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-amber-400 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Chưa cấu hình URL Script</span>
                    </span>
                  )}
                </div>
                <h3 className="font-heading font-black text-xl text-white mt-1">
                  Đồng Bộ Dữ Liệu Tự Động Về Google Sheets (Mỗi Form 1 Sheet)
                </h3>
                <p className="text-xs text-slate-400">
                  Mỗi khi có người điền form (Đặt Sân, Đăng Ký Khóa Học, Tuyển Thành Viên), hệ thống sẽ tự động bắn webhook gửi dữ liệu về Google Sheets theo từng Sheet riêng biệt trong 1 file trang tính.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenSheets}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <Table className="w-4 h-4 text-emerald-400" />
                  <span>Open Live Data Inspector</span>
                </button>
              </div>
            </div>

            {/* URL INPUT & SAVE/TEST ACTION */}
            <div className="bg-[#0E1524] p-5 rounded-2xl border border-slate-800 space-y-3">
              <label className="block text-xs font-bold text-slate-200">
                1. Google Apps Script Web App Deployment URL:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  value={googleScriptUrl}
                  onChange={(e) => setGoogleScriptUrl(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-[#080C14] border border-slate-700 rounded-xl text-white text-xs font-mono outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await googleScriptSyncService.setScriptUrl(googleScriptUrl);
                    setFeedback('Google Apps Script URL saved and synchronized to server!');
                    setTimeout(() => setFeedback(null), 3500);
                  }}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-colors shrink-0"
                >
                  Save Configuration
                </button>
                <button
                  type="button"
                  disabled={isTestingSync || !googleScriptUrl}
                  onClick={async () => {
                    setIsTestingSync(true);
                    setSyncTestMessage(null);
                    try {
                      // Đảm bảo lưu URL mới nhất lên server trước khi bắn test
                      await googleScriptSyncService.setScriptUrl(googleScriptUrl);

                      const rand = Math.floor(Math.random() * 9000 + 1000);
                      const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);
                      const todayDate = new Date().toISOString().split('T')[0];
                      const nowVi = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                      const nowEn = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });

                      // Gửi đồng thời dữ liệu test chuẩn cho cả 4 sheet
                      await Promise.all([
                        googleScriptSyncService.testSync('DatSan', {
                          'Mã đặt sân': `TEST-BK-${rand}`,
                          'Tên sân': 'The Cong court',
                          'Ngày đặt': todayDate,
                          'Khung giờ': '19:00 - 20:30',
                          'Tổng số giờ': 1.5,
                          'Họ tên khách': 'Admin Test Sync',
                          'Số điện thoại': '0768299329',
                          'Email': 'admin.test@dva.vn',
                          'Tổng tiền (VNĐ)': 750000,
                          'Trạng thái': 'TEST_SUCCESS',
                          'Ghi chú': 'Kiểm tra kết nối Webhook từ DVA Admin Portal',
                        }),
                        googleScriptSyncService.testSync('Training_Registrations', {
                          Timestamp: nowIso,
                          Manual_Trigger: 'Admin Console Test Sync',
                          Status: 'TEST_SUCCESS',
                        }),
                        googleScriptSyncService.testSync('DangKyKhoaHoc', {
                          'Mã đăng ký': `TEST-TR-${rand}`,
                          'Gói tập / Khóa học': '1-on-1 Coaching from Basic',
                          'Họ và tên học viên': 'Admin Test Sync',
                          'Số điện thoại': '0768299329',
                          'Email': 'admin.test@dva.vn',
                          'Trình độ hiện tại': 'Beginner / Fundamental',
                          'Khung giờ mong muốn': '19:00 - 21:30',
                          'Mức học phí (VNĐ)': 1500000,
                          'Nội dung chuyển khoản': `DVA TEST TR ${rand} 299329`,
                          'Trạng thái': 'TEST_SUCCESS',
                          'Ghi chú': 'Kiểm tra kết nối khóa học từ Admin Portal',
                          'Thời gian đăng ký': nowVi,
                        }),
                        googleScriptSyncService.testSync('TuyenThanhVien', {
                          'Họ và tên': 'Admin Test Athlete',
                          'Ngày sinh': '2005-01-01',
                          'Vị trí': 'OH',
                          'Cấp độ': 'Junior (Intermediate)',
                          'Số áo mong muốn': 15,
                          'Chiều cao (cm)': 185,
                          'Cân nặng (kg)': 75,
                          'Bật đập (cm)': 330,
                          'Bật chắn (cm)': 315,
                          'Số Zalo': '0768299329',
                          'Email': 'admin.test@dva.vn',
                          'Instagram': '@dva.volleyball',
                          'Chiến thuật 5-1': '5-1',
                          'Quê quán': 'Hà Nội',
                          'Thời gian gửi': nowEn,
                        }),
                      ]);

                      setSyncTestMessage(
                        'Đã gửi thành công dữ liệu test vào cả 4 sheet: DatSan, Training_Registrations, DangKyKhoaHoc và TuyenThanhVien!'
                      );
                    } catch (err: any) {
                      setSyncTestMessage('Test dispatch error: ' + (err?.message || 'Could not connect'));
                    } finally {
                      setIsTestingSync(false);
                    }
                  }}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-colors shrink-0"
                >
                  {isTestingSync ? 'Sending...' : 'Test Send to Sheet'}
                </button>
              </div>

              {syncTestMessage && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-700 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 shrink-0" />
                  <span>{syncTestMessage}</span>
                </div>
              )}
            </div>

            {/* 4 SHEETS INFO CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-[#0E1524] border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Tab: DatSan</span>
                  <span className="px-2 py-0.5 rounded text-[9px] bg-red-950 text-red-300 border border-red-800">Court Bookings</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Stores booking code, court, date, session, athlete name, phone, email, fee, VietQR memo, and payment status.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0E1524] border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Tab: DangKyKhoaHoc</span>
                  <span className="px-2 py-0.5 rounded text-[9px] bg-orange-950 text-orange-300 border border-orange-800">Training</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Stores scrimmage matchplay and 1-on-1 private masterclass enrollments, skill tier, preferred slot, and contact details.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0E1524] border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Tab: TuyenThanhVien</span>
                  <span className="px-2 py-0.5 rounded text-[9px] bg-blue-950 text-blue-300 border border-blue-800">Tryouts</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Stores athlete recruit applications: position, division, height, spike reach, block reach, Zalo, and 5-1 knowledge.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0E1524] border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Tab: LienHe</span>
                  <span className="px-2 py-0.5 rounded text-[9px] bg-purple-950 text-purple-300 border border-purple-800">Contact</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Stores urgent reservations, service feedback, and inquiries submitted by website visitors.
                </p>
              </div>
            </div>

            {/* SCRIPT CODE BOX & 4 STEPS SETUP GUIDE */}
            <div className="bg-[#0E1524] p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-orange-400" />
                  <span className="font-bold text-white text-xs">
                    Updated Google Apps Script Code (Copy & Paste into Apps Script)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const code = `var STANDARD_HEADERS = {
  DatSan: [
    'Thời Gian Nhận',
    'Mã đặt sân',
    'Tên sân',
    'Ngày đặt',
    'Khung giờ',
    'Tổng số giờ',
    'Họ tên khách',
    'Số điện thoại',
    'Email',
    'Tổng tiền (VNĐ)',
    'Trạng thái',
    'Ghi chú'
  ],
  Training_Registrations: [
    'Thời Gian Nhận',
    'Timestamp',
    'Manual_Trigger',
    'Status'
  ],
  DangKyKhoaHoc: [
    'Thời Gian Nhận',
    'Mã đăng ký',
    'Gói tập / Khóa học',
    'Họ và tên học viên',
    'Số điện thoại',
    'Email',
    'Trình độ hiện tại',
    'Khung giờ mong muốn',
    'Mức học phí (VNĐ)',
    'Nội dung chuyển khoản',
    'Trạng thái',
    'Ghi chú',
    'Thời gian đăng ký'
  ],
  TuyenThanhVien: [
    'Thời Gian Nhận',
    'Họ và tên',
    'Ngày sinh',
    'Vị trí',
    'Cấp độ',
    'Số áo mong muốn',
    'Chiều cao (cm)',
    'Cân nặng (kg)',
    'Bật đập (cm)',
    'Bật chắn (cm)',
    'Số Zalo',
    'Email',
    'Instagram',
    'Chiến thuật 5-1',
    'Quê quán',
    'Thời gian gửi'
  ]
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var sheetName = String(payload.sheetName || 'DatSan').trim();
    var data = payload.data || payload;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (ex) { data = {}; }
    }

    var timestamp = payload.timestamp || new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    // 1. Tạo mới tab hoặc khởi tạo dòng tiêu đề chuẩn nếu sheet đang trống
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var headers = [];

    if (lastRow === 0 || lastCol === 0) {
      headers = STANDARD_HEADERS[sheetName] ? STANDARD_HEADERS[sheetName].slice() : ['Thời Gian Nhận'].concat(Object.keys(data));
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground('#B91C1C')
        .setFontColor('#FFFFFF')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    } else {
      headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
        return String(h || '').trim();
      });
    }

    // 2. Chuẩn hóa key trong data (trim khoảng trắng) để khớp chính xác với tiêu đề cột
    var normalizedData = {};
    var rawKeys = Object.keys(data || {});
    for (var i = 0; i < rawKeys.length; i++) {
      var k = String(rawKeys[i]).trim();
      normalizedData[k] = data[rawKeys[i]];
    }

    // 3. Đảm bảo toàn bộ các cột chuẩn của bảng (STANDARD_HEADERS) hoặc trường mới trong data đều có mặt trên dòng 1
    var requiredCols = STANDARD_HEADERS[sheetName] || [];
    for (var c = 0; c < requiredCols.length; c++) {
      var stdCol = requiredCols[c];
      if (headers.indexOf(stdCol) === -1) {
        sheet.getRange(1, headers.length + 1)
          .setValue(stdCol)
          .setBackground('#B91C1C')
          .setFontColor('#FFFFFF')
          .setFontWeight('bold');
        headers.push(stdCol);
      }
    }

    for (var j = 0; j < rawKeys.length; j++) {
      var cleanKey = String(rawKeys[j]).trim();
      if (cleanKey && headers.indexOf(cleanKey) === -1) {
        sheet.getRange(1, headers.length + 1)
          .setValue(cleanKey)
          .setBackground('#B91C1C')
          .setFontColor('#FFFFFF')
          .setFontWeight('bold');
        headers.push(cleanKey);
      }
    }

    // 4. Dựng dữ liệu dòng theo đúng thứ tự từng cột trên Sheet
    var rowValues = [];
    for (var h = 0; h < headers.length; h++) {
      var colName = headers[h];
      if (colName === 'Thời Gian Nhận' || colName === 'Received_Timestamp') {
        rowValues.push(timestamp);
      } else if (colName === 'Timestamp') {
        rowValues.push(normalizedData['Timestamp'] !== undefined ? normalizedData['Timestamp'] : timestamp);
      } else if (colName === 'Thời gian đăng ký') {
        rowValues.push(normalizedData['Thời gian đăng ký'] !== undefined ? normalizedData['Thời gian đăng ký'] : timestamp);
      } else if (colName === 'Thời gian gửi') {
        rowValues.push(normalizedData['Thời gian gửi'] !== undefined ? normalizedData['Thời gian gửi'] : timestamp);
      } else {
        var val = normalizedData[colName];
        rowValues.push(val !== undefined && val !== null ? val : '');
      }
    }

    // 5. Chống ghi đúp dòng (Idempotent Upsert theo 'Mã đặt sân' hoặc 'Mã đăng ký')
    var idColIndex = headers.indexOf('Mã đặt sân');
    if (idColIndex === -1) idColIndex = headers.indexOf('Mã đăng ký');
    var recordId = idColIndex !== -1 ? String(rowValues[idColIndex] || '').trim() : '';

    var updatedExistingRow = false;
    if (recordId && sheet.getLastRow() > 1) {
      var existingIds = sheet.getRange(2, idColIndex + 1, sheet.getLastRow() - 1, 1).getValues();
      for (var r = 0; r < existingIds.length; r++) {
        if (String(existingIds[r][0] || '').trim() === recordId) {
          sheet.getRange(r + 2, 1, 1, rowValues.length).setValues([rowValues]);
          updatedExistingRow = true;
          break;
        }
      }
    }

    if (!updatedExistingRow) {
      sheet.appendRow(rowValues);
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        status: 'success',
        action: updatedExistingRow ? 'updated' : 'appended',
        sheet: sheetName,
        row: rowValues
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: 'active', message: 'DVA Google Apps Script Webhook is ready' })
  ).setMimeType(ContentService.MimeType.JSON);
}`;
                    navigator.clipboard.writeText(code);
                    setScriptCopied(true);
                    setTimeout(() => setScriptCopied(false), 3000);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  {scriptCopied ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Code Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-orange-400" />
                      <span>Copy Apps Script Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* 4-Step Guide */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[11px] text-slate-300">
                <div className="p-3 bg-[#080C14] rounded-xl border border-slate-800/80 space-y-1">
                  <span className="font-bold text-orange-400">Step 1: Open Google Sheet</span>
                  <p className="text-slate-400">
                    Create a new Google Spreadsheet on your Google Drive (e.g. named <em>DVA Volleyball Database</em>).
                  </p>
                </div>
                <div className="p-3 bg-[#080C14] rounded-xl border border-slate-800/80 space-y-1">
                  <span className="font-bold text-orange-400">Step 2: Open Apps Script</span>
                  <p className="text-slate-400">
                    On the Google Sheets top menu, click <strong>Extensions</strong> &gt; <strong>Apps Script</strong>.
                  </p>
                </div>
                <div className="p-3 bg-[#080C14] rounded-xl border border-slate-800/80 space-y-1">
                  <span className="font-bold text-orange-400">Step 3: Paste Code & Save</span>
                  <p className="text-slate-400">
                    Replace all existing code in <code className="text-slate-200">Code.gs</code> with the copied code above, and click <strong>Save</strong>.
                  </p>
                </div>
                <div className="p-3 bg-[#080C14] rounded-xl border border-slate-800/80 space-y-1">
                  <span className="font-bold text-orange-400">Step 4: Deploy Web App</span>
                  <p className="text-slate-400">
                    Click <strong>Deploy</strong> &gt; <strong>New deployment</strong> &gt; select <strong>Web app</strong>. Set <em>Who has access</em> to <strong>Anyone</strong>. Copy the Web App URL and paste it into the field above.
                  </p>
                </div>
              </div>

              {/* Readonly script snippet */}
              <pre className="p-3.5 bg-[#080C14] rounded-xl border border-slate-800 text-[10px] font-mono text-slate-300 max-h-40 overflow-y-auto leading-relaxed">
{`function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);
  
  try {
    var payload;
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    } else {
      payload = {};
    }

    var sheetName = payload.sheetName || 'DatSan';
    var data = payload.data || payload;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (ex) {}
    }

    var timestamp = payload.timestamp || new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var initialHeaders = ['Received_Timestamp'].concat(Object.keys(data));
      sheet.appendRow(initialHeaders);
      var headerRange = sheet.getRange(1, 1, 1, initialHeaders.length);
      headerRange.setBackground('#B91C1C').setFontColor('#FFFFFF').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    var dataKeys = Object.keys(data);
    for (var k = 0; k < dataKeys.length; k++) {
      var key = dataKeys[k];
      if (headers.indexOf(key) === -1) {
        sheet.getRange(1, headers.length + 1).setValue(key)
          .setBackground('#B91C1C').setFontColor('#FFFFFF').setFontWeight('bold');
        headers.push(key);
      }
    }

    var rowValues = [];
    for (var h = 0; h < headers.length; h++) {
      var colName = headers[h];
      if (colName === 'Received_Timestamp' || colName === 'Timestamp' || colName === 'Thời Gian Nhận') {
        rowValues.push(timestamp);
      } else {
        rowValues.push(data[colName] !== undefined ? data[colName] : '');
      }
    }

    sheet.appendRow(rowValues);

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', sheet: sheetName, row: rowValues }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'active', message: 'DVA Google Apps Script Webhook is ready' }))
    .setMimeType(ContentService.MimeType.JSON);
}`}
              </pre>
            </div>

          </div>
        )}

      </div>

      {/* ATHLETE CREATE / EDIT MODAL */}
      {isPlayerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#161F30] rounded-3xl max-w-lg w-full border border-slate-700 p-6 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base">
                {editingPlayer ? `Edit Athlete: ${editingPlayer.fullName}` : 'Add New Athlete'}
              </h3>
              <button
                onClick={() => setIsPlayerModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlayer} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Họ và tên VĐV (Full Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nguyễn Văn An"
                  value={playerForm.fullName}
                  onChange={(e) => setPlayerForm({ ...playerForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                />
              </div>

              {/* LEVEL SELECTION: SENIOR / JUNIOR / KID (Required by user) */}
              <div className="bg-[#0B0F19] p-3.5 rounded-2xl border border-red-900/60 space-y-2">
                <label className="block text-slate-200 font-bold">
                  Phân Cấp Độ / Đội Tuyển (Level) *
                </label>
                <select
                  value={playerForm.level}
                  onChange={(e) => setPlayerForm({ ...playerForm, level: e.target.value as PlayerLevel })}
                  className="w-full px-3 py-2 bg-[#161F30] border border-slate-700 rounded-xl text-white font-semibold outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="SENIOR">SENIOR — Người chơi tốt, trên 3 năm kinh nghiệm</option>
                  <option value="JUNIOR">JUNIOR — Người chơi trung bình (Intermediate)</option>
                  <option value="KID">KID — Dưới 15 tuổi (Học viện trẻ)</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  Sau khi lưu, VĐV sẽ xuất hiện ngay lập tức trong cột tương ứng ({playerForm.level}) trên danh sách Roster của CLB.
                </p>
              </div>

              {/* CAPTAIN TOGGLE (Required by user) */}
              <div className="bg-[#0B0F19] p-3.5 rounded-2xl border border-yellow-500/40 flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-yellow-400 flex items-center gap-1.5 cursor-pointer">
                    <span>⭐ Đội Trưởng (Team Captain)</span>
                  </label>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Nếu bật (true), thẻ cầu thủ sẽ nổi bật dòng chữ "★ CAPTAIN" ở đầu card. Nếu tắt (false) sẽ không hiện.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(playerForm.captain || playerForm.isCaptain)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPlayerForm({ ...playerForm, captain: checked, isCaptain: checked });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* PHOTO UPLOAD & CLOUD STORAGE */}
              <div className="bg-[#0B0F19] p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-bold block">
                    Ảnh Chân Dung VĐV (Tải lên hoặc dán link Cloud)
                  </label>
                  {playerForm.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setPlayerForm({ ...playerForm, avatarUrl: '' })}
                      className="text-[10px] text-red-400 hover:underline cursor-pointer"
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-20 rounded-xl bg-[#161F30] border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                    {playerForm.avatarUrl ? (
                      <img
                        src={playerForm.avatarUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-500 font-bold text-center px-1">Chưa có ảnh</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      isUploadingPlayerPhoto 
                        ? 'bg-slate-700 text-slate-300 border-slate-600 cursor-wait' 
                        : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 cursor-pointer'
                    }`}>
                      {isUploadingPlayerPhoto ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                          <span>Đang tải lên Cloud...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-orange-400" />
                          <span>Tải ảnh lên (Cloudinary / File)</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingPlayerPhoto}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIsUploadingPlayerPhoto(true);
                            try {
                              const subFolder = `${playerForm.level || 'SENIOR'}/${playerForm.position || 'OH'}`;
                              const res = await uploadToCloudinary(file, 'players', subFolder);
                              setPlayerForm((prev) => ({ ...prev, avatarUrl: res.url }));
                              setFeedback(`Đã tải ảnh VĐV lên thư mục Cloud: ${res.folder}`);
                              setTimeout(() => setFeedback(null), 3500);
                            } catch (err) {
                              console.error('Upload error:', err);
                            } finally {
                              setIsUploadingPlayerPhoto(false);
                            }
                          }
                        }}
                      />
                    </label>

                    <input
                      type="url"
                      placeholder="Hoặc dán URL ảnh trực tiếp (Cloudinary / Unsplash / CDN)..."
                      value={playerForm.avatarUrl || ''}
                      onChange={(e) => setPlayerForm({ ...playerForm, avatarUrl: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#161F30] border border-slate-700 rounded-xl text-white outline-none text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Số áo thi đấu (#)</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={playerForm.jerseyNumber}
                    onChange={(e) => setPlayerForm({ ...playerForm, jerseyNumber: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Vị trí (Position)</label>
                  <select
                    value={playerForm.position}
                    onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value as VolleyballPosition })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-semibold"
                  >
                    <option value="OH">Chủ công (OH - Outside Hitter)</option>
                    <option value="OP">Đối chuyền (OP - Opposite Hitter)</option>
                    <option value="MB">Phụ công (MB - Middle Blocker)</option>
                    <option value="S">Chuyền hai (S - Setter)</option>
                    <option value="L">Libero (L - Defense Specialist)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chiều cao (cm)</label>
                  <input
                    type="number"
                    required
                    value={playerForm.height}
                    onChange={(e) => setPlayerForm({ ...playerForm, height: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tầm bật đập (cm)</label>
                  <input
                    type="number"
                    required
                    value={playerForm.spikeTouch}
                    onChange={(e) => setPlayerForm({ ...playerForm, spikeTouch: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono text-orange-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tầm bật chắn (cm)</label>
                  <input
                    type="number"
                    placeholder="270"
                    value={playerForm.blockTouch ?? ''}
                    onChange={(e) => setPlayerForm({ ...playerForm, blockTouch: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono text-orange-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Năm sinh (Born Year)</label>
                  <input
                    type="number"
                    value={playerForm.bornYear ?? 2005}
                    onChange={(e) => setPlayerForm({ ...playerForm, bornYear: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Năm gia nhập CLB (Joined) *</label>
                  <input
                    type="number"
                    min={2010}
                    max={2035}
                    required
                    value={playerForm.joined ?? playerForm.joinedYear ?? 2025}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPlayerForm({ ...playerForm, joined: val, joinedYear: val });
                    }}
                    placeholder="e.g. 2025"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono text-emerald-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quốc gia / Quốc tịch (Country & Flag) *</label>
                  <select
                    value={(playerForm.countryCode || 'VN').toUpperCase()}
                    onChange={(e) => {
                      const code = e.target.value.toUpperCase();
                      const found = PLAYER_COUNTRIES.find((c) => c.code === code);
                      const countryName = found?.name || code;
                      const countryFlag = found?.flag || countryCodeToFlagEmoji(code);
                      setPlayerForm({
                        ...playerForm,
                        country: countryName,
                        countryName,
                        countryCode: code,
                        countryFlag,
                      });
                    }}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-semibold"
                  >
                    {PLAYER_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quê quán / Tỉnh thành (Hometown)</label>
                  <input
                    type="text"
                    value={playerForm.hometownCountry || ''}
                    onChange={(e) => setPlayerForm({ ...playerForm, hometownCountry: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Giới thiệu ngắn / Điểm mạnh phong trào</label>
                <textarea
                  rows={2}
                  value={playerForm.bio || ''}
                  onChange={(e) => setPlayerForm({ ...playerForm, bio: e.target.value })}
                  placeholder="e.g. Cựu tuyển thủ trường đại học, đập biên uy lực, phát bóng tấn công..."
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPlayerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-red-600 to-orange-500 rounded-xl text-white font-bold cursor-pointer hover:brightness-110 shadow-lg"
                >
                  Lưu VĐV Vào Danh Sách
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEWS STORY PUBLISH MODAL (Required by user) */}
      {isNewsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#161F30] rounded-3xl max-w-xl w-full border border-slate-700 p-6 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-heading font-black text-lg text-white">
                  {editingNews ? 'Chỉnh Sửa Bài Viết / Tin Tức' : 'Publish Story / News Article'}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingNews ? 'Cập nhật nội dung, danh mục hoặc ảnh bìa bài viết.' : 'Post announcements or match highlights to the public Club Bulletin.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNewsModalOpen(false);
                  setEditingNews(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNews} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Story / Article Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DVA Championship Match Recap & MVP Spotlight"
                  value={newsTitle}
                  onChange={(e) => setNewsTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category *</label>
                  <select
                    value={newsCategory}
                    onChange={(e) => setNewsCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="TOURNAMENT">TOURNAMENT (Giải đấu & Trận đấu)</option>
                    <option value="TECHNIQUE">TECHNIQUE (Kỹ thuật & Biomechanics)</option>
                    <option value="TRYOUT">TRYOUT (Tuyển chọn & Tryout)</option>
                    <option value="CLUB_EVENT">CLUB_EVENT (Hoạt động CLB)</option>
                    <option value="TACTICAL">TACTICAL (Chiến thuật & Kỹ thuật)</option>
                    <option value="COMMUNITY">COMMUNITY (Cộng đồng & Hoạt động)</option>
                    <option value="PARTNERSHIP">PARTNERSHIP (Tài trợ & Đối tác)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Author Name</label>
                  <input
                    type="text"
                    value={newsAuthorName}
                    onChange={(e) => setNewsAuthorName(e.target.value)}
                    placeholder="Author name"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                  />
                </div>
              </div>

              {/* COVER / THUMBNAIL PHOTO */}
              <div className="bg-[#0B0F19] p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-slate-200 font-semibold block text-xs">
                      Cover Image / Thumbnail (Cloudinary CDN or Link)
                    </label>
                    <span className="text-[10px] font-mono text-slate-500">
                      Folder: {buildCloudinaryFolder('news', newsCategory)} (Preset: dva_sports)
                    </span>
                  </div>
                  {newsThumbnail && (
                    <button
                      type="button"
                      onClick={() => setNewsThumbnail('')}
                      className="text-[10px] text-red-400 hover:underline cursor-pointer"
                    >
                      Clear Image
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-20 h-14 rounded-xl bg-[#161F30] border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                    {newsThumbnail ? (
                      <img
                        src={newsThumbnail}
                        alt="News preview"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src =
                            'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80';
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-500" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      isUploadingNewsThumb 
                        ? 'bg-slate-700 text-slate-300 border-slate-600 cursor-wait' 
                        : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 cursor-pointer'
                    }`}>
                      {isUploadingNewsThumb ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                          <span>Uploading to Cloud...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-orange-400" />
                          <span>Upload Cover Image</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingNewsThumb}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIsUploadingNewsThumb(true);
                            try {
                              const res = await uploadToCloudinary(file, 'news', newsCategory);
                              const uploadedUrl = res.secure_url || res.url;
                              setNewsThumbnail(uploadedUrl);
                              setFeedback(`Đã tải ảnh bìa tin tức lên thư mục Cloud: ${res.folder}`);
                              setTimeout(() => setFeedback(null), 3500);
                            } catch (err) {
                              console.error('News thumb upload error:', err);
                            } finally {
                              setIsUploadingNewsThumb(false);
                              e.target.value = '';
                            }
                          }
                        }}
                      />
                    </label>

                    <input
                      type="url"
                      placeholder="Or paste direct image URL (Unsplash / Cloudinary / Imgur)..."
                      value={newsThumbnail}
                      onChange={(e) => setNewsThumbnail(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#161F30] border border-slate-700 rounded-xl text-white outline-none text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Short Excerpt / Teaser</label>
                <input
                  type="text"
                  value={newsExcerpt}
                  onChange={(e) => setNewsExcerpt(e.target.value)}
                  placeholder="Brief 1-2 sentence preview for cards..."
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Article / Story Content *</label>
                <textarea
                  rows={6}
                  required
                  value={newsContent}
                  onChange={(e) => setNewsContent(e.target.value)}
                  placeholder="Write the full story details, match sets, key highlights, quotes..."
                  className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-red-500 leading-relaxed font-sans"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewsModalOpen(false);
                    setEditingNews(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 rounded-xl text-white font-bold cursor-pointer hover:brightness-110 shadow-lg shadow-red-950 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{editingNews ? 'Lưu Thay Đổi Bài Viết' : 'Publish Story Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOOKING MANUAL CREATE / EDIT MODAL */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#161F30] rounded-3xl max-w-lg w-full border border-slate-700 p-6 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-heading font-black text-lg text-white">
                  {editingBooking ? `Chỉnh Sửa Đặt Sân: ${editingBooking.bookingCode}` : 'Tạo Đặt Sân Thủ Công'}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingBooking ? 'Cập nhật thông tin khách, khung giờ hoặc trạng thái thanh toán.' : 'Tạo đơn đặt giữ sân cho khách đặt trực tiếp hoặc qua hotline/Zalo.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBookingModalOpen(false);
                  setEditingBooking(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBooking} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Họ tên khách hàng *</label>
                  <input
                    type="text"
                    required
                    value={bookingForm.customerName || ''}
                    onChange={(e) => setBookingForm({ ...bookingForm, customerName: e.target.value })}
                    placeholder="VD: Nguyễn Văn Nam"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={bookingForm.customerPhone || ''}
                    onChange={(e) => setBookingForm({ ...bookingForm, customerPhone: e.target.value })}
                    placeholder="VD: 0768299329"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={bookingForm.customerEmail || ''}
                  onChange={(e) => setBookingForm({ ...bookingForm, customerEmail: e.target.value })}
                  placeholder="VD: customer@gmail.com"
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chọn Sân *</label>
                  <select
                    value={bookingForm.courtId || 'court-btl'}
                    onChange={(e) => {
                      const courtId = e.target.value;
                      const court = courtsList.find(c => c.id === courtId);
                      setBookingForm({
                        ...bookingForm,
                        courtId,
                        courtName: court?.name || 'Sân Bóng Chuyền',
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

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ngày Thuê (YYYY-MM-DD) *</label>
                  <input
                    type="date"
                    required
                    value={bookingForm.bookingDate || selectedManageDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, bookingDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bắt đầu *</label>
                  <input
                    type="text"
                    required
                    value={bookingForm.startTime || '17:30'}
                    onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                    placeholder="17:30"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kết thúc *</label>
                  <input
                    type="text"
                    required
                    value={bookingForm.endTime || '19:30'}
                    onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                    placeholder="19:30"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tổng giờ</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={bookingForm.totalHours || 2}
                    onChange={(e) => setBookingForm({ ...bookingForm, totalHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tổng tiền (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    step="50000"
                    value={bookingForm.totalPrice || 1000000}
                    onChange={(e) => setBookingForm({ ...bookingForm, totalPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono text-orange-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Trạng thái thanh toán *</label>
                  <select
                    value={bookingForm.paymentStatus || 'PAID'}
                    onChange={(e) => setBookingForm({ ...bookingForm, paymentStatus: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-semibold"
                  >
                    <option value="PAID">PAID (Đã thanh toán / Giữ sân)</option>
                    <option value="PENDING">PENDING (Chờ chuyển khoản VietQR)</option>
                    <option value="CANCELLED">CANCELLED (Đã hủy / Mở lại ca)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsBookingModalOpen(false);
                    setEditingBooking(null);
                  }}
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
      )}

      {/* TRAINING COURSE CREATE / EDIT MODAL */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#161F30] rounded-3xl max-w-lg w-full border border-slate-700 p-6 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-heading font-black text-lg text-white">
                  {editingCourse ? `Chỉnh Sửa Khóa Học: ${editingCourse.title}` : 'Thêm Khóa Học Mới'}
                </h3>
                <p className="text-xs text-slate-400">
                  Cập nhật chương trình đào tạo, học phí, lịch tập hiển thị trên trang Học Viện.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCourseModalOpen(false);
                  setEditingCourse(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nhãn nổi bật (Badge)</label>
                  <input
                    type="text"
                    value={courseForm.tag || ''}
                    onChange={(e) => setCourseForm({ ...courseForm, tag: e.target.value })}
                    placeholder="VD: MOST POPULAR, POPULAR CHOICE..."
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Đối tượng học viên (Target Audience)</label>
                  <input
                    type="text"
                    value={courseForm.targetAudience || ''}
                    onChange={(e) => setCourseForm({ ...courseForm, targetAudience: e.target.value })}
                    placeholder="VD: Dành cho người mới tập, VĐV phong trào..."
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tên khóa học / Chương trình *</label>
                <input
                  type="text"
                  required
                  value={courseForm.title || ''}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  placeholder="VD: Masterclass Tấn Công Biên 4 & Đối Chuyền"
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phân Cấp Độ *</label>
                  <select
                    value={courseForm.level || 'JUNIOR'}
                    onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-semibold"
                  >
                    <option value="SENIOR">SENIOR (Nâng cao & Chiến thuật)</option>
                    <option value="JUNIOR">JUNIOR (Trung cấp & Kỹ năng nền tảng)</option>
                    <option value="KID">KID (Thiếu nhi & Trẻ em dưới 15t)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Học phí (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    step="100000"
                    value={courseForm.price || 2400000}
                    onChange={(e) => setCourseForm({ ...courseForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono text-orange-400 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Thời lượng (VD: 8 tuần)</label>
                  <input
                    type="text"
                    value={courseForm.duration || '8 tuần (16 buổi)'}
                    onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Số học viên tối đa</label>
                  <input
                    type="number"
                    value={courseForm.maxSlots || 16}
                    onChange={(e) => setCourseForm({ ...courseForm, maxSlots: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Đã đăng ký</label>
                  <input
                    type="number"
                    value={courseForm.enrolledSlots || 0}
                    onChange={(e) => setCourseForm({ ...courseForm, enrolledSlots: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Lịch học chi tiết *</label>
                <input
                  type="text"
                  required
                  value={courseForm.schedule || ''}
                  onChange={(e) => setCourseForm({ ...courseForm, schedule: e.target.value })}
                  placeholder="VD: Thứ 3 & Thứ 5 hàng tuần (18:00 - 20:00)"
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Huấn luyện viên phụ trách</label>
                  <input
                    type="text"
                    value={courseForm.coachName || ''}
                    onChange={(e) => setCourseForm({ ...courseForm, coachName: e.target.value })}
                    placeholder="VD: Hoàng Quốc Duy"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chức danh HLV</label>
                  <input
                    type="text"
                    value={courseForm.coachTitle || ''}
                    onChange={(e) => setCourseForm({ ...courseForm, coachTitle: e.target.value })}
                    placeholder="VD: Head Coach & Founder"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mô tả tổng quan khóa học</label>
                <textarea
                  rows={3}
                  value={courseForm.description || ''}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Tóm tắt nội dung khóa học và mục tiêu đạt được sau 8 tuần..."
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Đặc quyền / Quyền lợi gói tập (Package Inclusions)</label>
                <textarea
                  rows={5}
                  value={(courseForm.benefits || []).join('\n')}
                  onChange={(e) => setCourseForm({ ...courseForm, benefits: e.target.value.split('\n') })}
                  placeholder={'Mỗi quyền lợi một dòng, VD:\nÁo đấu DVA chính hãng\nPhân tích video kỹ thuật'}
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">Mỗi dòng là một mục có tick xanh ngoài trang Public.</p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCourseModalOpen(false);
                    setEditingCourse(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 rounded-xl text-white font-bold cursor-pointer hover:brightness-110 shadow-lg"
                >
                  {editingCourse ? 'Lưu Thay Đổi' : 'Tạo Khóa Học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COACH CREATE / EDIT MODAL */}
      {isCoachModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#161F30] rounded-3xl max-w-lg w-full border border-slate-700 p-6 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-heading font-black text-lg text-white">
                  {editingCoach ? `Chỉnh Sửa HLV: ${editingCoach.name}` : 'Thêm Huấn Luyện Viên Mới'}
                </h3>
                <p className="text-xs text-slate-400">
                  Cập nhật hồ sơ HLV, kinh nghiệm và chứng chỉ huấn luyện.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCoachModalOpen(false);
                  setEditingCoach(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCoach} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Họ và tên HLV *</label>
                <input
                  type="text"
                  required
                  value={coachForm.name || ''}
                  onChange={(e) => setCoachForm({ ...coachForm, name: e.target.value })}
                  placeholder="VD: Hoàng Quốc Duy"
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chuyên môn / Vai trò *</label>
                  <input
                    type="text"
                    required
                    value={coachForm.role || ''}
                    onChange={(e) => setCoachForm({ ...coachForm, role: e.target.value })}
                    placeholder="VD: Head Coach & Chuyên Gia Tấn Công"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kinh nghiệm</label>
                  <input
                    type="text"
                    value={coachForm.experience || '5 năm kinh nghiệm'}
                    onChange={(e) => setCoachForm({ ...coachForm, experience: e.target.value })}
                    placeholder="VD: 5 năm kinh nghiệm thi đấu chuyên nghiệp"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chiều cao (cm)</label>
                  <input
                    type="text"
                    value={coachForm.height || ''}
                    onChange={(e) => setCoachForm({ ...coachForm, height: e.target.value })}
                    placeholder="VD: 168 cm"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Năm sinh</label>
                  <input
                    type="number"
                    value={coachForm.bornYear ?? ''}
                    onChange={(e) => {
                      const year = e.target.value === '' ? undefined : Number(e.target.value);
                      setCoachForm({
                        ...coachForm,
                        bornYear: year,
                        ...(year && year >= 1930 && year <= 2030 ? { age: new Date().getFullYear() - year } : {}),
                      });
                    }}
                    placeholder="VD: 2010"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tuổi</label>
                  <input
                    type="number"
                    value={coachForm.age ?? ''}
                    onChange={(e) => setCoachForm({ ...coachForm, age: e.target.value === '' ? undefined : Number(e.target.value) })}
                    placeholder="Tự tính từ năm sinh"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Sở trường kỹ thuật (Specialty)</label>
                <input
                  type="text"
                  value={coachForm.specialty || ''}
                  onChange={(e) => setCoachForm({ ...coachForm, specialty: e.target.value })}
                  placeholder="VD: Youth Skill Development, Setting Fundamentals & Bilingual Coaching"
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                />
              </div>

              {/* PHOTO UPLOAD / URL */}
              <div className="bg-[#0B0F19] p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-bold block">
                    Ảnh Chân Dung HLV (Tải lên hoặc dán link Cloud)
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">
                    Folder: {buildCloudinaryFolder('coaches', 'coaching-staff')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-[#161F30] border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                    {coachForm.avatarUrl ? (
                      <img
                        src={coachForm.avatarUrl}
                        alt="Coach preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Award className="w-6 h-6 text-orange-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      isUploadingCoachPhoto
                        ? 'bg-slate-700 text-slate-300 border-slate-600 cursor-wait'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 cursor-pointer'
                    }`}>
                      {isUploadingCoachPhoto ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                          <span>Đang tải lên Cloud...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-orange-400" />
                          <span>Tải ảnh HLV lên Cloudinary</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingCoachPhoto}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploadingCoachPhoto(true);
                          try {
                            const res = await uploadToCloudinary(file, 'coaches', 'coaching-staff');
                            setCoachForm((prev) => ({ ...prev, avatarUrl: res.url }));
                            setFeedback(`Đã tải ảnh HLV lên thư mục Cloud: ${res.folder}`);
                            setTimeout(() => setFeedback(null), 3500);
                          } catch (err) {
                            console.error('Coach upload error:', err);
                          } finally {
                            setIsUploadingCoachPhoto(false);
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                    <input
                      type="url"
                      placeholder="Dán link ảnh (Cloudinary / Unsplash)..."
                      value={coachForm.avatarUrl || ''}
                      onChange={(e) => setCoachForm({ ...coachForm, avatarUrl: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#161F30] border border-slate-700 rounded-xl text-white outline-none text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Chứng chỉ (cách nhau bởi dấu phẩy)</label>
                <input
                  type="text"
                  value={Array.isArray(coachForm.certifications) ? coachForm.certifications.join(', ') : ''}
                  onChange={(e) => setCoachForm({
                    ...coachForm,
                    certifications: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="VD: FIVB Level 1 Certified, Cựu VĐV Quốc Gia, HLV Thể Lực Chuyên Nghiệp"
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tiểu sử & Thành tích</label>
                <textarea
                  rows={3}
                  value={coachForm.bio || ''}
                  onChange={(e) => setCoachForm({ ...coachForm, bio: e.target.value })}
                  placeholder="Giới thiệu kinh nghiệm thi đấu và phong cách huấn luyện..."
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCoachModalOpen(false);
                    setEditingCoach(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 rounded-xl text-white font-bold cursor-pointer hover:brightness-110 shadow-lg"
                >
                  {editingCoach ? 'Lưu Thay Đổi' : 'Thêm Huấn Luyện Viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COURT CREATE / EDIT & WEEKLY SCHEDULE MODAL */}
      {isCourtModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0F1623] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">
                  {editingCourt ? 'Chỉnh Sửa Sân & Lịch Hoạt Động Tuần' : 'Thêm Sân Mới & Lịch Hoạt Động Tuần'}
                </h3>
                <p className="text-xs text-slate-400">
                  Cấu hình thông tin cơ sở vật chất, giá thuê và khung ca hoạt động từ Thứ 2 đến Chủ Nhật
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCourtModalOpen(false);
                  setEditingCourt(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCourt} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tên Sân *</label>
                  <input
                    type="text"
                    required
                    value={courtForm.name}
                    onChange={(e) => setCourtForm({ ...courtForm, name: e.target.value })}
                    placeholder="VD: Sân Bóng Chuyền Bắc Từ Liêm"
                    className="w-full px-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Đơn Giá Thuê / Giờ (VNĐ) *</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    required
                    value={courtForm.hourlyRate}
                    onChange={(e) => setCourtForm({ ...courtForm, hourlyRate: Number(e.target.value) })}
                    placeholder="VD: 350000"
                    className="w-full px-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Địa Chỉ Sân *</label>
                  <input
                    type="text"
                    required
                    value={courtForm.address}
                    onChange={(e) => setCourtForm({ ...courtForm, address: e.target.value })}
                    placeholder="VD: Quận Bắc Từ Liêm, Hà Nội"
                    className="w-full px-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Loại Mặt Sân / Mô Tả Ngắn</label>
                  <input
                    type="text"
                    value={courtForm.floorType || ''}
                    onChange={(e) => setCourtForm({ ...courtForm, floorType: e.target.value })}
                    placeholder="VD: Gerflor Taraflex Sport Pro"
                    className="w-full px-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <label className="block text-slate-300 font-semibold">Ảnh Đại Diện Sân</label>
                    <span className="text-[10px] font-mono text-slate-500">
                      Folder: {buildCloudinaryFolder('courts', editingCourt?.id || courtForm.name || 'facilities')}
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-400 font-bold text-[11px] cursor-pointer transition-all">
                    {isUploadingCourtImage ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" /> Đang tải lên...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3" /> Tải ảnh từ máy
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={isUploadingCourtImage}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploadingCourtImage(true);
                        try {
                          const subFolder = editingCourt?.id || courtForm.name || 'facilities';
                          const uploaded = await uploadToCloudinary(file, 'courts', subFolder);
                          setCourtForm((prev) => ({ ...prev, imageUrl: uploaded.url }));
                          setFeedback(`Đã tải ảnh sân lên thư mục Cloud: ${uploaded.folder}`);
                          setTimeout(() => setFeedback(null), 3500);
                        } catch (err: any) {
                          alert(err?.message || 'Upload ảnh sân thất bại.');
                        } finally {
                          setIsUploadingCourtImage(false);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  {courtForm.imageUrl && (
                    <img
                      src={courtForm.imageUrl}
                      alt="Court Preview"
                      className="w-16 h-12 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-900"
                    />
                  )}
                  <input
                    type="text"
                    value={courtForm.imageUrl || ''}
                    onChange={(e) => setCourtForm({ ...courtForm, imageUrl: e.target.value })}
                    placeholder="Dán link ảnh hoặc bấm 'Tải ảnh từ máy'..."
                    className="w-full px-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* WEEKLY SCHEDULE SETTINGS */}
              <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-400" />
                      Thiết Lập Lịch Tuần (Weekly Schedule Settings)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Chọn thứ trong tuần và thêm/xóa các khung ca tập trong ngày đó
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyDayScheduleToWeekdays(selectedScheduleDay)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-[10px] cursor-pointer transition-all self-start sm:self-auto"
                    title="Sao chép các ca của thứ đang chọn sang Thứ 2 -> Thứ 6"
                  >
                    Sao chép sang T2 - T6
                  </button>
                </div>

                {/* Day Tabs (Monday -> Sunday) */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = selectedScheduleDay === day.key;
                    const slotCount = (courtForm.weeklySchedule?.[day.key] || []).length;
                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => setSelectedScheduleDay(day.key)}
                        className={`px-2 py-2 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-black shadow-md'
                            : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 font-semibold'
                        }`}
                      >
                        <div className="text-[11px]">{day.shortVi}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{slotCount} ca</div>
                      </button>
                    );
                  })}
                </div>

                {/* Active Day Slots List + Add Slot */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">
                      Danh sách ca hoạt động:{' '}
                      <span className="text-orange-400">
                        {DAYS_OF_WEEK.find((d) => d.key === selectedScheduleDay)?.labelVi}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {(courtForm.weeklySchedule?.[selectedScheduleDay] || []).length} khung giờ
                    </span>
                  </div>

                  {(courtForm.weeklySchedule?.[selectedScheduleDay] || []).length === 0 ? (
                    <div className="py-5 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                      Chưa có khung ca nào cho ngày này. Nhập khung giờ bên dưới và bấm "+ Thêm ca".
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(courtForm.weeklySchedule?.[selectedScheduleDay] || []).map((slot, slotIdx) => (
                        <div
                          key={`${slot}-${slotIdx}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs font-bold"
                        >
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span>{slot}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlotFromDay(selectedScheduleDay, slotIdx)}
                            className="w-4 h-4 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                            title="Xóa ca này"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Slot Input */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <input
                      type="text"
                      value={newSlotInput}
                      onChange={(e) => setNewSlotInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSlotToDay();
                        }
                      }}
                      placeholder="VD: 18:00 - 20:00 hoặc 07:30 - 09:30"
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSlotToDay}
                      className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Thêm ca
                    </button>
                  </div>

                  {/* Quick Preset Slots */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold mr-1">Gợi ý nhanh:</span>
                    {[
                      '05:30 - 07:30',
                      '07:30 - 09:30',
                      '09:30 - 11:30',
                      '13:30 - 15:30',
                      '15:30 - 17:30',
                      '17:30 - 19:30',
                      '18:00 - 20:00',
                      '19:30 - 21:30',
                      '21:30 - 23:30',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewSlotInput(preset)}
                        className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-400 hover:text-white font-mono cursor-pointer transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCourtModalOpen(false);
                    setEditingCourt(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 rounded-xl text-white font-bold cursor-pointer hover:brightness-110 shadow-lg"
                >
                  {editingCourt ? 'Lưu Cập Nhật Sân' : 'Tạo Sân Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
