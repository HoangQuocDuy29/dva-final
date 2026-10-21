import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Send
} from 'lucide-react';
import { 
  Booking, 
  MemberApplication, 
  NewsPost, 
  Player, 
  TrainingRegistration, 
  User as UserType,
  VolleyballPosition,
  PlayerLevel,
  ClosedSlot
} from '../types';
import { 
  bookingService, 
  courtService,
  memberService, 
  trainingService, 
  playerService, 
  newsService, 
  sheetsService,
  googleScriptSyncService 
} from '../services/api';
import { INITIAL_PLAYERS, INITIAL_COURTS } from '../data/mockData';
import { getScheduleSlotsForCourtAndDate } from './CourtBookingPage';

interface AdminDashboardPageProps {
  currentUser: UserType;
  onOpenSheets: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ currentUser, onOpenSheets }) => {
  const navigate = useNavigate();

  // Navigation modules inside the dedicated Admin Portal
  const [activeModule, setActiveModule] = useState<
    'OVERVIEW' | 'BOOKINGS' | 'APPLICATIONS' | 'PLAYERS' | 'TRAINING' | 'NEWS' | 'SHEETS'
  >('OVERVIEW');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [applications, setApplications] = useState<MemberApplication[]>([]);
  const [trainingRegs, setTrainingRegs] = useState<TrainingRegistration[]>([]);
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [newsList, setNewsList] = useState<NewsPost[]>([]);
  const [sheetsData, setSheetsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
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
    countryName: 'Vietnam',
    countryCode: 'VN',
    countryFlag: '🇻🇳',
    bornYear: 2005,
    level: 'SENIOR',
    position: 'OH',
    bio: '',
  });

  // Google Apps Script Deploy state
  const [googleScriptUrl, setGoogleScriptUrl] = useState<string>(() => googleScriptSyncService.getScriptUrl());
  const [scriptCopied, setScriptCopied] = useState<boolean>(false);
  const [isTestingSync, setIsTestingSync] = useState<boolean>(false);
  const [syncTestMessage, setSyncTestMessage] = useState<string | null>(null);

  // News Create modal state
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsCategory, setNewsCategory] = useState<NewsPost['category']>('TOURNAMENT');
  const [newsExcerpt, setNewsExcerpt] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsAuthorName, setNewsAuthorName] = useState(currentUser.fullName);
  const [newsAuthorRole, setNewsAuthorRole] = useState('Club Administration');

  // Court Schedule & Slot Lock Control state
  const [selectedManageCourtId, setSelectedManageCourtId] = useState<string>('court-btl');
  const [selectedManageDate, setSelectedManageDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [closedSlots, setClosedSlots] = useState<ClosedSlot[]>([]);
  const [lockReason, setLockReason] = useState<string>('Rented to Offline Team / Club Match');
  const [isTogglingSlot, setIsTogglingSlot] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [b, a, t, p, n, s, cs] = await Promise.all([
        bookingService.getBookings(),
        memberService.getApplications(),
        trainingService.getRegistrations(),
        playerService.getPlayers(),
        newsService.getNews(),
        sheetsService.getSheetsData(),
        courtService.getClosedSlots(),
      ]);
      setBookings(b);
      setApplications(a);
      setTrainingRegs(t);
      if (p && p.length > 0) setPlayers(p);
      setNewsList(n);
      setSheetsData(s);
      if (Array.isArray(cs)) setClosedSlots(cs);
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
      if (editingPlayer) {
        const updated = await playerService.updatePlayer(editingPlayer.id, playerForm);
        setPlayers((prev) => prev.map((p) => (p.id === editingPlayer.id ? { ...p, ...updated } : p)));
        setFeedback(`Player ${playerForm.fullName} updated successfully.`);
      } else {
        const created = await playerService.addPlayer(playerForm);
        setPlayers((prev) => [created, ...prev]);
        setFeedback(`Athlete ${playerForm.fullName} added to DVA roster.`);
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

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsContent.trim()) return;
    try {
      const created = await newsService.createNews({
        title: newsTitle.trim(),
        category: newsCategory,
        excerpt: newsExcerpt.trim() || (newsContent.trim().substring(0, 150) + '...'),
        content: newsContent.trim(),
        authorName: newsAuthorName.trim() || currentUser.fullName,
        authorRole: newsAuthorRole.trim() || 'Club Administration',
      });
      setNewsList([created, ...newsList]);
      setFeedback(`News story "${newsTitle}" published successfully!`);
      setIsNewsModalOpen(false);
      setNewsTitle('');
      setNewsExcerpt('');
      setNewsContent('');
      setTimeout(() => setFeedback(null), 3500);
    } catch (e) {
      alert('Error creating news story');
    }
  };

  const handleDeleteNews = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete article "${title}"?`)) return;
    try {
      await newsService.deleteNews(id);
      setNewsList(prev => prev.filter(n => n.id !== id));
      setFeedback(`Story "${title}" has been deleted.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      alert('Error deleting news story');
    }
  };

  const handleUpdateTrainingStatus = async (id: string, status: 'PENDING' | 'CONFIRMED' | 'CANCELLED') => {
    try {
      await trainingService.updateStatus(id, status);
      setTrainingRegs(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      setFeedback(`Trainee status updated to ${status}.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      alert('Error updating trainee status');
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
            { 
              id: 'BOOKINGS', 
              label: 'Court Bookings & VietQR', 
              badge: pendingBookingsCount 
            },
            { 
              id: 'APPLICATIONS', 
              label: 'Tryout Applications', 
              badge: pendingApplicationsCount 
            },
            { id: 'PLAYERS', label: `Squad Roster (${players.length})` },
            { id: 'TRAINING', label: `Academy Trainees (${trainingRegs.length})` },
            { id: 'NEWS', label: `News Articles (${newsList.length})` },
            { id: 'SHEETS', label: 'Google Sheets Live Sync' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveModule(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeModule === tab.id
                  ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow'
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

        {/* MODULE 2: COURT BOOKINGS & PAYMENT APPROVAL */}
        {activeModule === 'BOOKINGS' && (
          <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-base text-white">Court Reservations & VietQR Payment Approvals</h3>
                <p className="text-xs text-slate-400">Verify transfers into MB Bank (0002090671521, HOANG QUOC DUY) and confirm court slots.</p>
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
                          b.paymentStatus === 'PAID' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {b.paymentStatus}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        {b.paymentStatus === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleUpdateBookingStatus(b.id, 'PAID')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                            >
                              Approve Paid
                            </button>
                            <button
                              onClick={() => handleUpdateBookingStatus(b.id, 'CANCELLED')}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Real-time Slot Availability & Lock Control for Admin */}
            <div className="mt-8 pt-6 border-t border-slate-800 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h4 className="font-heading font-black text-base text-white">
                      Live Court Schedule & Slot Lock Management
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Lock rented slots or maintenance hours instantly. Locked slots appear immediately as "Closed / Rented" on the customer booking page to prevent duplicate reservations.
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
                {INITIAL_COURTS.map((court) => {
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
                <span className="text-slate-400 font-semibold whitespace-nowrap">Default Lock Reason:</span>
                <input
                  type="text"
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="e.g. Rented to offline team, Tournament match, Maintenance"
                  className="flex-1 bg-transparent text-white border-b border-slate-700 focus:border-orange-500 focus:outline-none px-2 py-1 text-xs"
                />
              </div>

              {/* Slot Grid for the chosen Court & Date */}
              {(() => {
                const slots = getScheduleSlotsForCourtAndDate(selectedManageCourtId, selectedManageDate);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {slots.map((slot) => {
                      const isClosed = closedSlots.some(
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

                          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-[11px] text-slate-400">
                              {isClosed ? 'Locked by Admin' : bookingMatch ? bookingMatch.customerName : 'Available for Rent'}
                            </span>

                            <button
                              type="button"
                              disabled={isTogglingSlot}
                              onClick={() => handleToggleSlotLock(slot.label)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                                isClosed
                                  ? 'bg-slate-800 hover:bg-slate-700 text-white'
                                  : 'bg-red-950 hover:bg-red-900 text-red-300 border border-red-800'
                              }`}
                            >
                              {isClosed ? (
                                <>
                                  <Unlock className="w-3 h-3 text-emerald-400" />
                                  <span>Re-open</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3 text-red-400" />
                                  <span>Lock Slot</span>
                                </>
                              )}
                            </button>
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
                        {app.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
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
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Decided</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODULE 4: SQUAD ROSTER CRUD */}
        {activeModule === 'PLAYERS' && (
          <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-base text-white">Player Roster Management</h3>
                <p className="text-xs text-slate-400">Create, edit, or delete official athlete cards and adjust division tiers.</p>
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
                    countryName: 'Vietnam',
                    countryCode: 'VN',
                    countryFlag: '🇻🇳',
                    bornYear: 2005,
                    level: 'SENIOR',
                    position: 'OH',
                    bio: '',
                  });
                  setIsPlayerModalOpen(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Athlete</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl border border-slate-800 bg-[#0E1524] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-athletic font-black text-orange-400 text-lg">
                      #{p.jerseyNumber}
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span>{p.fullName}</span>
                        <span className="text-[10px] text-slate-400">{p.countryFlag || '🇻🇳'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {p.position} · {p.level} · {p.height}cm · Reach {p.spikeTouch}cm
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingPlayer(p);
                        setPlayerForm({ ...p });
                        setIsPlayerModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePlayer(p.id, p.fullName)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODULE 5: ACADEMY & SCRIMMAGE TRAINEES */}
        {activeModule === 'TRAINING' && (
          <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-base text-white">Academy & Scrimmage Registrations</h3>
                <p className="text-xs text-slate-400">Review student athletes enrolled in scrimmage matchplay or 1-on-1 private coaching.</p>
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
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {trainingRegs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                        No training registrations recorded yet.
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
                          {reg.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-1.5">
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
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Finalized</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
                  setNewsTitle('');
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
                  <span>Mở Bảng Xem Dữ Liệu</span>
                </button>
              </div>
            </div>

            {/* URL INPUT & SAVE/TEST ACTION */}
            <div className="bg-[#0E1524] p-5 rounded-2xl border border-slate-800 space-y-3">
              <label className="block text-xs font-bold text-slate-200">
                1. Dán URL Triển Khai Ứng Dụng Web Google Apps Script (Web App Deployment URL):
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
                  onClick={() => {
                    googleScriptSyncService.setScriptUrl(googleScriptUrl);
                    setFeedback('Đã lưu URL Google Apps Script thành công!');
                    setTimeout(() => setFeedback(null), 3500);
                  }}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-colors shrink-0"
                >
                  Lưu Cấu Hình
                </button>
                <button
                  type="button"
                  disabled={isTestingSync || !googleScriptUrl}
                  onClick={async () => {
                    setIsTestingSync(true);
                    setSyncTestMessage(null);
                    try {
                      await googleScriptSyncService.syncToGoogleSheet('DatSan', {
                        'Mã đặt sân': 'TEST-' + Math.floor(Math.random() * 9000 + 1000),
                        'Tên sân': 'Sân Thể Công (Court 1)',
                        'Ngày đặt': new Date().toISOString().split('T')[0],
                        'Khung giờ': '17:30 - 19:30',
                        'Tổng số giờ': 2,
                        'Họ tên khách': 'Nguyễn Văn Test (Admin)',
                        'Số điện thoại': '0768299329',
                        'Email': 'admin.test@dva.vn',
                        'Tổng tiền (VNĐ)': 1000000,
                        'Trạng thái': 'TEST_SUCCESS',
                        'Ghi chú': 'Kiểm tra kết nối Webhook từ DVA Admin Portal',
                      });
                      setSyncTestMessage('Đã gửi thành công 1 dòng dữ liệu thử nghiệm lên Sheet "DatSan"! Vui lòng kiểm tra trang tính Google Sheet của bạn.');
                    } catch (err: any) {
                      setSyncTestMessage('Lỗi gửi thử nghiệm: ' + (err?.message || 'Không thể kết nối'));
                    } finally {
                      setIsTestingSync(false);
                    }
                  }}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-colors shrink-0"
                >
                  {isTestingSync ? 'Đang gửi...' : 'Gửi Test Lên Sheet'}
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
                  <span className="font-bold text-white">Sheet 1: DatSan</span>
                  <span className="px-2 py-0.5 rounded text-[9px] bg-red-950 text-red-300 border border-red-800">Đặt Sân</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Lưu mã ca, sân, ngày thuê, khung giờ, họ tên khách, SĐT, email, tổng tiền, nội dung CK và trạng thái thanh toán VietQR.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0E1524] border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Sheet 2: DangKyKhoaHoc</span>
                  <span className="px-2 py-0.5 rounded text-[9px] bg-orange-950 text-orange-300 border border-orange-800">Khóa Học</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Lưu gói Scrimmage thi đấu hoặc khóa huấn luyện, trình độ VĐV, khung giờ mong muốn, SĐT và ghi chú thể lực.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0E1524] border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Sheet 3: TuyenThanhVien</span>
                  <span className="px-2 py-0.5 rounded text-[9px] bg-blue-950 text-blue-300 border border-blue-800">Tuyển Quân</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Lưu hồ sơ tryout: vị trí, cấp độ (Senior/Junior/Kid), chiều cao, bật đập, bật chắn, Zalo, hiểu biết xoay tua 5-1.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0E1524] border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Sheet 4: LienHe</span>
                  <span className="px-2 py-0.5 rounded text-[9px] bg-purple-950 text-purple-300 border border-purple-800">Liên Hệ</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Lưu yêu cầu giữ sân gấp, góp ý dịch vụ và thắc mắc của hội viên gửi về ban quản trị CLB.
                </p>
              </div>
            </div>

            {/* SCRIPT CODE BOX & 4 STEPS SETUP GUIDE */}
            <div className="bg-[#0E1524] p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-orange-400" />
                  <span className="font-bold text-white text-xs">
                    Mã Google Apps Script Tự Động Tạo Sheet Và Ghi Dòng (Copy & Dán)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const code = `function doPost(e) {
  try {
    var raw = e.postData.contents;
    var payload = JSON.parse(raw);
    var sheetName = payload.sheetName || 'DatSan';
    var data = payload.data || {};
    var timestamp = payload.timestamp || new Date().toLocaleString('vi-VN');
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    // Tự động tạo Sheet riêng theo từng form nếu chưa có
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var headers = ['Thời Gian Nhận'].concat(Object.keys(data));
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#B91C1C').setFontColor('#FFFFFF').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    
    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var rowValues = [timestamp];
    for (var i = 1; i < headerRow.length; i++) {
      var key = headerRow[i];
      rowValues.push(data[key] !== undefined ? data[key] : '');
    }
    sheet.appendRow(rowValues);
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', sheet: sheetName }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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
                      <span className="text-emerald-400">Đã Sao Chép Mã!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-orange-400" />
                      <span>Sao Chép Toàn Bộ Mã Script</span>
                    </>
                  )}
                </button>
              </div>

              {/* 4-Step Guide */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[11px] text-slate-300">
                <div className="p-3 bg-[#080C14] rounded-xl border border-slate-800/80 space-y-1">
                  <span className="font-bold text-orange-400">Bước 1: Mở Google Sheet</span>
                  <p className="text-slate-400">
                    Tạo 1 trang tính Google Sheets mới trên Google Drive của bạn (ví dụ đặt tên: <em>DVA Master Database</em>).
                  </p>
                </div>
                <div className="p-3 bg-[#080C14] rounded-xl border border-slate-800/80 space-y-1">
                  <span className="font-bold text-orange-400">Bước 2: Mở Apps Script</span>
                  <p className="text-slate-400">
                    Trên thanh menu của Google Sheets, chọn <strong>Tiện ích mở rộng (Extensions)</strong> &gt; <strong>Apps Script</strong>.
                  </p>
                </div>
                <div className="p-3 bg-[#080C14] rounded-xl border border-slate-800/80 space-y-1">
                  <span className="font-bold text-orange-400">Bước 3: Dán Mã & Lưu</span>
                  <p className="text-slate-400">
                    Xóa hết mã mặc định trong file <code className="text-slate-200">Code.gs</code>, dán đoạn mã bên trên vào và bấm biểu tượng <strong>Lưu (Save)</strong>.
                  </p>
                </div>
                <div className="p-3 bg-[#080C14] rounded-xl border border-slate-800/80 space-y-1">
                  <span className="font-bold text-orange-400">Bước 4: Triển Khai Web App</span>
                  <p className="text-slate-400">
                    Bấm <strong>Triển khai (Deploy)</strong> &gt; <strong>Tùy chọn triển khai mới (New deployment)</strong> &gt; Chọn <strong>Ứng dụng web (Web app)</strong>. Ở mục "Ai có quyền truy cập", chọn <strong>Bất kỳ ai (Anyone)</strong>. Copy URL dán vào ô bên trên.
                  </p>
                </div>
              </div>

              {/* Readonly script snippet */}
              <pre className="p-3.5 bg-[#080C14] rounded-xl border border-slate-800 text-[10px] font-mono text-slate-300 max-h-40 overflow-y-auto leading-relaxed">
{`function doPost(e) {
  try {
    var raw = e.postData.contents;
    var payload = JSON.parse(raw);
    var sheetName = payload.sheetName || 'DatSan';
    var data = payload.data || {};
    var timestamp = payload.timestamp || new Date().toLocaleString('vi-VN');
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var headers = ['Thời Gian Nhận'].concat(Object.keys(data));
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#B91C1C').setFontColor('#FFFFFF').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    
    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var rowValues = [timestamp];
    for (var i = 1; i < headerRow.length; i++) {
      var key = headerRow[i];
      rowValues.push(data[key] !== undefined ? data[key] : '');
    }
    sheet.appendRow(rowValues);
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', sheet: sheetName }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs cursor-pointer border border-slate-700 font-medium transition-colors">
                      <Upload className="w-3.5 h-3.5 text-orange-400" />
                      <span>Chọn ảnh từ thiết bị</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (loadEvt) => {
                              const img = new Image();
                              img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const maxDim = 400;
                                let w = img.width;
                                let h = img.height;
                                if (w > h) {
                                  if (w > maxDim) {
                                    h = Math.round((h * maxDim) / w);
                                    w = maxDim;
                                  }
                                } else {
                                  if (h > maxDim) {
                                    w = Math.round((w * maxDim) / h);
                                    h = maxDim;
                                  }
                                }
                                canvas.width = w;
                                canvas.height = h;
                                const ctx = canvas.getContext('2d');
                                ctx?.drawImage(img, 0, 0, w, h);
                                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                                setPlayerForm((prev) => ({ ...prev, avatarUrl: compressedDataUrl }));
                              };
                              img.src = loadEvt.target?.result as string;
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    <input
                      type="url"
                      placeholder="Hoặc dán URL ảnh trực tiếp (Cloud/Imgur/CDN)..."
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
                  <label className="block text-slate-300 font-semibold mb-1">Năm sinh</label>
                  <input
                    type="number"
                    value={playerForm.bornYear}
                    onChange={(e) => setPlayerForm({ ...playerForm, bornYear: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quê quán / Tỉnh thành</label>
                  <input
                    type="text"
                    value={playerForm.hometownCountry}
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
                <h3 className="font-heading font-black text-lg text-white">Publish Story / News Article</h3>
                <p className="text-xs text-slate-400">Post announcements or match highlights to the public Club Bulletin.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNews} className="space-y-4 text-xs">
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
                    <option value="TOURNAMENT">TOURNAMENT (Giải đấu & Thi đấu)</option>
                    <option value="TRYOUT">TRYOUT (Tuyển chọn VĐV)</option>
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
                  onClick={() => setIsNewsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 rounded-xl text-white font-bold cursor-pointer hover:brightness-110 shadow-lg shadow-red-950 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Story Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
