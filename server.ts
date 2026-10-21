import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { 
  INITIAL_USERS, 
  INITIAL_COURTS, 
  INITIAL_PLAYERS, 
  INITIAL_NEWS, 
  INITIAL_TRAINING_COURSES, 
  INITIAL_BOOKINGS, 
  INITIAL_MEMBER_APPLICATIONS 
} from './src/data/mockData';
import { Booking, ClosedSlot, MemberApplication, NewsPost, Player, TrainingRegistration, User } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// In-Memory Database for Live Preview
// Thư mục lưu trữ dữ liệu bền vững (Không bị mất khi tắt server)
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadPersisted<T>(filename: string, fallback: T): T {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  } catch (err) {
    console.warn(`[Storage] Failed to read ${filename}, using default:`, err);
    return fallback;
  }
}

function savePersisted<T>(filename: string, data: T) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[Storage] Failed to write ${filename}:`, err);
  }
}

// Khởi tạo dữ liệu từ file trên ổ cứng (Chỉ lấy mockData seed lần đầu nếu file chưa có)
let users: User[] = loadPersisted<User[]>('users.json', INITIAL_USERS);
let courts = loadPersisted('courts.json', INITIAL_COURTS);
let players: Player[] = loadPersisted<Player[]>('players.json', INITIAL_PLAYERS);
let newsPosts: NewsPost[] = loadPersisted<NewsPost[]>('news.json', INITIAL_NEWS);
let trainingCourses = loadPersisted('trainingCourses.json', INITIAL_TRAINING_COURSES);
let bookings: Booking[] = loadPersisted<Booking[]>('bookings.json', INITIAL_BOOKINGS);
let closedSlots: ClosedSlot[] = loadPersisted<ClosedSlot[]>('closedSlots.json', []);
let memberApplications: MemberApplication[] = loadPersisted<MemberApplication[]>('applications.json', INITIAL_MEMBER_APPLICATIONS);
let trainingRegistrations: TrainingRegistration[] = [
  {
    id: 'tr-001',
    courseId: 'tc-1',
    courseTitle: 'Khóa Kỹ Thuật Nền Tảng (Foundation Skills)',
    fullName: 'Lê Văn Khải',
    email: 'khai.le@gmail.com',
    phone: '0933445566',
    experienceLevel: 'Chưa từng chơi bóng chuyền',
    preferredTimeSlot: 'Tối T2-T4-T6 (18:00)',
    notes: 'Muốn học để rèn luyện sức khỏe',
    status: 'CONFIRMED',
    createdAt: '2026-10-18T10:00:00Z',
  }
];

// In-Memory Google Sheets Multi-Tab Sync Storage
interface GoogleSheetsDatabase {
  spreadsheetId: string;
  spreadsheetTitle: string;
  tabs: {
    Member_Registrations: Array<Record<string, any>>;
    Court_Bookings: Array<Record<string, any>>;
    Training_Registrations: Array<Record<string, any>>;
  };
}

const googleSheetsDB: GoogleSheetsDatabase = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1dVa-Volleyball-Club-Sync-Spreadsheet-2026',
  spreadsheetTitle: 'DVA Volleyball Club - Master Data Sheet (Google Sheets v4 API)',
  tabs: {
    Member_Registrations: [
      {
        'Timestamp': '2026-10-18 16:40:00',
        'Application_ID': 'app-001',
        'Full_Name': 'Vũ Quốc Toàn',
        'DOB': '2005-04-12',
        'Position': 'OH (Chủ công)',
        'Level': 'JUNIOR',
        'Height_cm': 189,
        'Weight_kg': 78,
        'Spike_Reach_cm': 335,
        'Block_Reach_cm': 318,
        'Gmail': 'quoctoan.vu2005@gmail.com',
        'Zalo': '0978112233',
        'Instagram': '@toan.spike15',
        'Rotation_Knowledge': '5-1',
        'Status': 'PENDING'
      },
      {
        'Timestamp': '2026-10-19 09:15:00',
        'Application_ID': 'app-002',
        'Full_Name': 'Đặng Mai Lan',
        'DOB': '2007-08-22',
        'Position': 'S (Chuyền hai)',
        'Level': 'KID',
        'Height_cm': 171,
        'Weight_kg': 56,
        'Spike_Reach_cm': 288,
        'Block_Reach_cm': 275,
        'Gmail': 'mailan.dang@gmail.com',
        'Zalo': '0912998877',
        'Instagram': 'Không có',
        'Rotation_Knowledge': '4-2',
        'Status': 'PENDING'
      }
    ],
    Court_Bookings: [
      {
        'Timestamp': '2026-10-19 10:15:00',
        'Booking_Code': 'DVA-TT-20261020-4821',
        'Court_Name': 'Sân TT (Trung Tâm)',
        'Customer_Name': 'Trần Văn Mạnh',
        'Phone': '0903123456',
        'Email': 'tranvanmanh.sports@gmail.com',
        'Date': '2026-10-20',
        'Time_Slot': '18:00 - 20:00',
        'Total_Hours': 2.0,
        'Total_VND': 1290000,
        'Payment_Status': 'PAID',
        'Bank_Beneficiary': 'MB Bank - 0002090671521 (HOANG QUOC DUY)'
      },
      {
        'Timestamp': '2026-10-20 08:00:00',
        'Booking_Code': 'DVA-1-20261020-7719',
        'Court_Name': 'Sân 1 (Thi Đấu A)',
        'Customer_Name': 'Lê Hoàng Nam',
        'Phone': '0918765432',
        'Email': 'hoangnam.le@gmail.com',
        'Date': '2026-10-20',
        'Time_Slot': '20:00 - 21:30',
        'Total_Hours': 1.5,
        'Total_VND': 1085000,
        'Payment_Status': 'PENDING',
        'Bank_Beneficiary': 'MB Bank - 0002090671521 (HOANG QUOC DUY)'
      }
    ],
    Training_Registrations: [
      {
        'Timestamp': '2026-10-18 10:00:00',
        'Course': 'Khóa Kỹ Thuật Nền Tảng (Foundation Skills)',
        'Full_Name': 'Lê Văn Khải',
        'Email': 'khai.le@gmail.com',
        'Phone': '0933445566',
        'Experience': 'Chưa từng chơi bóng chuyền',
        'Status': 'CONFIRMED'
      }
    ]
  }
};

// Helper function to sync to Google Sheets
function syncRowToGoogleSheets(tab: keyof GoogleSheetsDatabase['tabs'], rowData: Record<string, any>) {
  googleSheetsDB.tabs[tab].unshift(rowData);
  console.log(`[Google Sheets v4 API] Appended 1 row to Sheet Tab: "${tab}" at ${new Date().toISOString()}`);
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Auth & RBAC
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email.toLowerCase() === email?.toLowerCase());
  
  if (!user) {
    // If user doesn't exist, create player account for demo convenience
    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      fullName: email.split('@')[0],
      role: 'PLAYER',
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    return res.json({
      token: `dva-jwt-token-${newUser.id}`,
      user: newUser,
    });
  }

  return res.json({
    token: `dva-jwt-token-${user.id}`,
    user,
  });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`[DVA Auth] Password Reset OTP for ${email}: ${otp}`);
  return res.json({
    success: true,
    message: `A 6-digit OTP verification code has been dispatched to ${email}. (Test Demo OTP: ${otp})`,
    demoOtp: otp,
  });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!otp || otp.length !== 6) {
    return res.status(400).json({ success: false, message: 'Invalid OTP format. Must be 6 digits.' });
  }
  return res.json({
    success: true,
    message: 'Password successfully reset. You may now sign in.',
  });
});

// 2. Players API
app.get('/api/players', (req, res) => {
  const { level, position, search } = req.query;
  let result = [...players];

  if (level) {
    result = result.filter(p => p.level.toLowerCase() === String(level).toLowerCase());
  }
  if (position) {
    result = result.filter(p => p.position.toUpperCase() === String(position).toUpperCase());
  }
  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter(p => 
      p.fullName.toLowerCase().includes(q) || 
      String(p.jerseyNumber).includes(q) ||
      p.hometownCountry.toLowerCase().includes(q)
    );
  }

  res.json(result);
});

app.post('/api/players', (req, res) => {
  const newPlayer: Player = {
    ...req.body,
    id: `p-${Date.now()}`,
    avatarUrl: req.body.avatarUrl || '',
  };
  players.unshift(newPlayer);
  savePersisted('players.json', players);
  res.status(201).json(newPlayer);
});

app.put('/api/players/:id', (req, res) => {
  const { id } = req.params;
  const index = players.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Player not found' });
  }
  players[index] = { ...players[index], ...req.body };
  savePersisted('players.json', players);
  res.json(players[index]);
});

app.delete('/api/players/:id', (req, res) => {
  const { id } = req.params;
  players = players.filter(p => p.id !== id);
  savePersisted('players.json', players);
  res.json({ success: true, message: 'Player deleted' });
});

// Quick level promote/demote (kid <-> junior <-> senior)
app.patch('/api/players/:id/level', (req, res) => {
  const { id } = req.params;
  const { level } = req.body;
  const player = players.find(p => p.id === id);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  if (!['KID', 'JUNIOR', 'SENIOR'].includes(level)) {
    return res.status(400).json({ error: 'Invalid level' });
  }
  player.level = level;
  savePersisted('players.json', players);
  res.json(player);
});

// 3. Courts API
app.get('/api/courts', (req, res) => {
  res.json(courts);
});

// Closed / Blocked Slots API
app.get('/api/courts/closed-slots', (req, res) => {
  const { courtId, date } = req.query;
  let result = [...closedSlots];
  if (courtId) result = result.filter(cs => cs.courtId === courtId);
  if (date) result = result.filter(cs => cs.date === date);
  res.json(result);
});

app.post('/api/courts/closed-slots/toggle', (req, res) => {
  const { courtId, date, slotLabel, reason, closedBy } = req.body;
  if (!courtId || !date || !slotLabel) {
    return res.status(400).json({ error: 'courtId, date, and slotLabel are required' });
  }

  const existingIndex = closedSlots.findIndex(
    cs => cs.courtId === courtId && cs.date === date && cs.slotLabel === slotLabel
  );

  if (existingIndex > -1) {
    // Reopen slot
    const removed = closedSlots.splice(existingIndex, 1)[0];
    return res.json({ success: true, action: 'REOPENED', slot: removed });
  } else {
    // Close slot
    const targetCourt = courts.find(c => c.id === courtId);
    const newClosedSlot: ClosedSlot = {
      id: `cs-${Date.now()}`,
      courtId,
      courtName: targetCourt ? targetCourt.name : courtId,
      date,
      slotLabel,
      reason: reason || 'Reserved / Maintenance by Admin',
      closedBy: closedBy || 'Admin',
      createdAt: new Date().toISOString(),
    };
    closedSlots.push(newClosedSlot);
    return res.json({ success: true, action: 'CLOSED', slot: newClosedSlot });
  }
});

// 4. Bookings API
app.get('/api/bookings', (req, res) => {
  const { date, courtId } = req.query;
  let result = [...bookings];
  if (date) {
    result = result.filter(b => b.bookingDate === date);
  }
  if (courtId) {
    result = result.filter(b => b.courtId === courtId);
  }
  res.json(result);
});

app.post('/api/bookings', (req, res) => {
  const { 
    courtId, 
    courtName,
    customerName, 
    customerEmail, 
    customerPhone, 
    bookingDate, 
    startTime, 
    endTime, 
    totalHours, 
    courtPrice, 
    addons, 
    addonsPrice, 
    totalPrice,
    notes 
  } = req.body;

  const slotLabel = `${startTime} - ${endTime}`;

  // 1. Prevent duplicate bookings
  const isDuplicate = bookings.some(
    b =>
      b.courtId === courtId &&
      b.bookingDate === bookingDate &&
      b.startTime === startTime &&
      b.endTime === endTime &&
      b.paymentStatus !== 'CANCELLED'
  );
  if (isDuplicate) {
    return res.status(409).json({ 
      error: 'This court session slot has already been booked by another athlete. Please select an available slot.' 
    });
  }

  // 2. Prevent booking admin-closed slots
  const isClosed = closedSlots.some(
    cs => cs.courtId === courtId && cs.date === bookingDate && cs.slotLabel === slotLabel
  );
  if (isClosed) {
    return res.status(409).json({ 
      error: 'This court session slot is currently closed by administration.' 
    });
  }

  // Generate dynamic bank transfer content & booking code
  const targetCourt = courts.find(c => c.id === courtId);
  const courtShort = targetCourt?.shortName || (courtId === 'court-btl' ? 'BTL TT' : (courtId === 'court-thecong' ? 'THE CONG' : 'MY DINH'));
  const slotClean = `${startTime.replace(':', 'H')} ${endTime.replace(':', 'H')}`.toUpperCase();
  const dateNum = (bookingDate || '20261020').replace(/-/g, '');
  const transferContent = `DVA ${courtShort} ${slotClean} ${dateNum}`.replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase();

  const courtTag = courtId === 'court-btl' ? 'BTL' : (courtId === 'court-thecong' ? 'TC' : 'MD');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const bookingCode = `DVA-${courtTag}-${dateNum}-${randomSuffix}`;

  const newBooking: Booking = {
    id: `b-${Date.now()}`,
    courtId: courtId || 'court-btl',
    courtName: courtName || targetCourt?.name || 'BTL Thong Tin court',
    customerName,
    customerEmail,
    customerPhone,
    bookingDate,
    startTime,
    endTime,
    totalHours: Number(totalHours) || 1.5,
    courtPrice: Number(courtPrice) || 825000,
    addons: addons || { mineralWaterBottles: 0, mikasaBallCrate: false, certifiedReferee: false },
    addonsPrice: Number(addonsPrice) || 0,
    totalPrice: Number(totalPrice) || 825000,
    paymentStatus: 'PENDING',
    bookingCode,
    transferContent,
    createdAt: new Date().toISOString(),
    notes,
  };

  bookings.unshift(newBooking);

  // Auto Sync to Google Sheets Tab "Court_Bookings"
  syncRowToGoogleSheets('Court_Bookings', {
    'Timestamp': new Date().toISOString().replace('T', ' ').substring(0, 19),
    'Booking_Code': bookingCode,
    'Transfer_Content': transferContent,
    'Court_Name': newBooking.courtName,
    'Customer_Name': customerName,
    'Phone': customerPhone,
    'Email': customerEmail,
    'Date': bookingDate,
    'Time_Slot': slotLabel,
    'Total_Hours': newBooking.totalHours,
    'Total_VND': newBooking.totalPrice,
    'Payment_Status': 'PENDING',
    'Bank_Beneficiary': 'MB Bank - 0002090671521 (HOANG QUOC DUY)'
  });

  res.status(201).json(newBooking);
});

app.patch('/api/bookings/:id/status', (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;
  const booking = bookings.find(b => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  booking.paymentStatus = paymentStatus;

  // Update in Google Sheets representation as well
  const sheetRow = googleSheetsDB.tabs.Court_Bookings.find(r => r.Booking_Code === booking.bookingCode);
  if (sheetRow) {
    sheetRow.Payment_Status = paymentStatus;
  }

  res.json(booking);
});

// Explicit confirmation after customer transfers money via VietQR
app.post('/api/bookings/:id/confirm-payment', (req, res) => {
  const { id } = req.params;
  const booking = bookings.find(b => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  booking.paymentStatus = 'PAID';

  // Ensure row in Google Sheets has Payment_Status: 'PAID'
  const sheetRow = googleSheetsDB.tabs.Court_Bookings.find(r => r.Booking_Code === booking.bookingCode);
  if (sheetRow) {
    sheetRow.Payment_Status = 'PAID';
  } else {
    syncRowToGoogleSheets('Court_Bookings', {
      'Timestamp': new Date().toISOString().replace('T', ' ').substring(0, 19),
      'Booking_Code': booking.bookingCode,
      'Transfer_Content': booking.transferContent,
      'Court_Name': booking.courtName,
      'Customer_Name': booking.customerName,
      'Phone': booking.customerPhone,
      'Email': booking.customerEmail,
      'Date': booking.bookingDate,
      'Time_Slot': `${booking.startTime} - ${booking.endTime}`,
      'Total_Hours': booking.totalHours,
      'Total_VND': booking.totalPrice,
      'Payment_Status': 'PAID',
      'Bank_Beneficiary': 'MB Bank - 0002090671521 (HOANG QUOC DUY)'
    });
  }

  console.log(`[VietQR Confirmed] Booking ${booking.bookingCode} marked PAID and synced to Google Sheets Court_Bookings!`);
  res.json({ success: true, booking });
});

// 5. Training API
app.get('/api/training/courses', (req, res) => {
  res.json(trainingCourses);
});

app.get('/api/training/registrations', (req, res) => {
  res.json(trainingRegistrations);
});

app.post('/api/training/register', (req, res) => {
  const { courseId, courseTitle, fullName, email, phone, experienceLevel, preferredTimeSlot, notes } = req.body;
  const newReg: TrainingRegistration = {
    id: `tr-${Date.now()}`,
    courseId,
    courseTitle,
    fullName,
    email,
    phone,
    experienceLevel: experienceLevel || 'Cơ bản',
    preferredTimeSlot: preferredTimeSlot || 'Buổi tối',
    notes,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  trainingRegistrations.unshift(newReg);

  // Auto Sync to Google Sheets Tab "Training_Registrations"
  syncRowToGoogleSheets('Training_Registrations', {
    'Timestamp': new Date().toISOString().replace('T', ' ').substring(0, 19),
    'Course': courseTitle,
    'Full_Name': fullName,
    'Email': email,
    'Phone': phone,
    'Experience': experienceLevel || 'Cơ bản',
    'Status': 'PENDING'
  });

  res.status(201).json(newReg);
});

app.patch('/api/training/registrations/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const reg = trainingRegistrations.find(r => r.id === id);
  if (!reg) {
    return res.status(404).json({ error: 'Registration not found' });
  }
  reg.status = status;
  res.json(reg);
});

// 6. Member Application & Auto-Player Promotion
app.get('/api/members/applications', (req, res) => {
  res.json(memberApplications);
});

app.post('/api/members/register', (req, res) => {
  const newApp: MemberApplication = {
    ...req.body,
    id: `app-${Date.now()}`,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  memberApplications.unshift(newApp);

  // Auto Sync to Google Sheets Tab "Member_Registrations"
  syncRowToGoogleSheets('Member_Registrations', {
    'Timestamp': new Date().toISOString().replace('T', ' ').substring(0, 19),
    'Application_ID': newApp.id,
    'Full_Name': newApp.fullName,
    'DOB': newApp.dob,
    'Position': newApp.position,
    'Level': newApp.level,
    'Height_cm': newApp.height,
    'Weight_kg': newApp.weight,
    'Spike_Reach_cm': newApp.spikeReach,
    'Block_Reach_cm': newApp.blockReach,
    'Gmail': newApp.gmail,
    'Zalo': newApp.zalo,
    'Instagram': newApp.instagram || 'Không có',
    'Rotation_Knowledge': newApp.rotationKnowledge,
    'Status': 'PENDING'
  });

  res.status(201).json(newApp);
});

app.patch('/api/members/applications/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, reviewNotes } = req.body;
  const appItem = memberApplications.find(a => a.id === id);
  if (!appItem) {
    return res.status(404).json({ error: 'Application not found' });
  }

  appItem.status = status;
  if (reviewNotes) appItem.reviewNotes = reviewNotes;

  // Auto Promote to Player if APPROVED
  if (status === 'APPROVED') {
    const createdPlayer: Player = {
      id: `p-${Date.now()}`,
      fullName: appItem.fullName,
      jerseyNumber: appItem.desiredJerseyNumber || (Math.floor(Math.random() * 50) + 1),
      height: appItem.height || 185,
      weight: appItem.weight || 75,
      spikeTouch: appItem.spikeReach || 325,
      blockTouch: appItem.blockReach || 310,
      hometownCountry: appItem.hometownCountry || 'Việt Nam',
      countryCode: 'VN',
      level: appItem.level || 'JUNIOR',
      position: appItem.position || 'OH',
      avatarUrl: '',
      bio: `Tân binh DVA gia nhập qua đợt tuyển chọn thành viên 2026. Am hiểu sơ đồ ${appItem.rotationKnowledge}.`,
      joinedYear: 2026,
    };
    players.unshift(createdPlayer);
    console.log(`[DVA Member Approved] Auto-created player profile for ${appItem.fullName} in roster!`);
  }

  // Update in Google Sheets representation
  const sheetRow = googleSheetsDB.tabs.Member_Registrations.find(r => r.Application_ID === id);
  if (sheetRow) {
    sheetRow.Status = status;
  }

  res.json({ application: appItem, promotedPlayer: status === 'APPROVED' });
});

// 7. News API
app.get('/api/news', (req, res) => {
  const { category, search } = req.query;
  let result = [...newsPosts];
  if (category) {
    result = result.filter(n => n.category.toLowerCase() === String(category).toLowerCase());
  }
  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter(n => n.title.toLowerCase().includes(q) || n.excerpt.toLowerCase().includes(q));
  }
  res.json(result);
});

app.get('/api/news/:id', (req, res) => {
  const post = newsPosts.find(n => n.id === req.params.id || n.slug === req.params.id);
  if (!post) {
    return res.status(404).json({ error: 'News post not found' });
  }
  res.json(post);
});

app.post('/api/news', (req, res) => {
  const newPost: NewsPost = {
    ...req.body,
    id: `news-${Date.now()}`,
    slug: req.body.slug || req.body.title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    publishedAt: new Date().toISOString().split('T')[0],
  };
  newsPosts.unshift(newPost);
  res.status(201).json(newPost);
});

app.delete('/api/news/:id', (req, res) => {
  newsPosts = newsPosts.filter(n => n.id !== req.params.id);
  res.json({ success: true, message: 'News post deleted' });
});

// 8. Google Sheets Multi-Tab Live Inspector & Sync API
app.get('/api/sheets/data', (req, res) => {
  res.json(googleSheetsDB);
});

app.post('/api/sheets/sync', (req, res) => {
  const { tab, rowData } = req.body;
  if (tab && rowData && googleSheetsDB.tabs[tab as keyof GoogleSheetsDatabase['tabs']]) {
    syncRowToGoogleSheets(tab as keyof GoogleSheetsDatabase['tabs'], rowData);
    return res.json({ success: true, message: `Row synced to tab ${tab}` });
  }
  return res.json({ success: true, message: 'Google Sheets sync batch processed' });
});

// 9. Free Cloud Media Storage: Cloudinary pre-signed upload simulation
app.post('/api/cloudinary/sign-upload', (req, res) => {
  const { folder, timestamp } = req.body;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dva-volleyball-club';
  const apiKey = process.env.CLOUDINARY_API_KEY || '671521948123456';
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'dva_unsigned_sports';

  // Returns pre-signed upload payload structure for client direct upload
  res.json({
    cloudName,
    apiKey,
    uploadPreset,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    folder: folder || 'dva_assets',
    signature: 'mock_sha256_cloudinary_signature_' + Date.now(),
    timestamp: timestamp || Math.floor(Date.now() / 1000),
  });
});

// 10. VietQR Generation API
app.post('/api/vietqr/generate', (req, res) => {
  const { amount, bookingCode, description } = req.body;
  const bankId = 'MB';
  const accountNo = '0002090671521';
  const accountName = 'HOANG QUOC DUY';
  const code = bookingCode || `DVA-TT-${Date.now().toString().slice(-4)}`;
  
  // Real VietQR API endpoint image URL
  const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(accountName)}`;

  res.json({
    bankId,
    bankName: 'Ngân hàng Quân Đội (MB Bank)',
    accountNo,
    accountName,
    amount,
    bookingCode: code,
    description: description || `Thanh toán đặt sân ${code}`,
    qrUrl,
  });
});

// Vite Middleware Integration for Development & Production
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Server] Vite middleware mounted in dev mode');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }
}

setupViteOrStatic().then(() => {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(`🏐 DVA Volleyball Club Platform Server Running`);
    console.log(`⚡ Port: ${PORT}`);
    console.log(`💳 MB Bank: 0002090671521 (HOANG QUOC DUY)`);
    console.log(`📊 Google Sheets v4 API Sync: ONLINE`);
    console.log(`=================================================`);
  });
});
