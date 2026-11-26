import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PieChart,
  ArrowRight,
  CreditCard,
  Dumbbell,
  ShoppingBag,
  Ticket,
  UserCheck,
  Trophy,
  Newspaper,
  Shield,
  Users,
  Wallet,
  Activity,
} from 'lucide-react';
import { playerService, userService } from '../../../services/api';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { useAdminMetrics } from '../hooks/useAdminMetrics';
import { RevenueKpiCards } from '../components/overview/RevenueKpiCards';
import { RevenueTrendChart } from '../components/overview/RevenueTrendChart';
import { GuestSessionsPanel } from '../components/overview/GuestSessionsPanel';
import { SpatialKpiRow, SpatialKpiItem } from '../components/spatial/SpatialKpiRow';
import { SpatialBentoGrid, SpatialBentoItem, BentoFilterKey } from '../components/spatial/SpatialBentoGrid';
import { SlowServerPill } from '../../../components/common/GlassLoading';
import {
  getSessionDailyState,
  getUpcomingSessionDates,
  getVietnamNow,
  isVenueClosedNow,
} from '../../../utils/venueSchedule';

export const OverviewTab: React.FC = () => {
  const {
    isSuperAdmin,
    setActiveModule,
    data: { bookings, trainingRegs, venuesList, players, loadedScopes },
  } = useAdminDashboard();
  const {
    verifiedClubRevenue,
    totalClubRevenue,
    courtRevenue,
    trainingRevenue,
    storeRevenue,
    guestSessionRevenue,
    tryoutRevenue,
    tournamentRevenue,
    paidBookingsCount,
    paidStoreOrdersCount,
    paidGuestSessionsCount,
    approvedTryoutsCount,
    paidTryoutsCount,
    pendingApplicationsCount,
    scheduledApplicationsCount,
    applicationsCount,
    paidTournamentTeamsCount,
    tournamentsCount,
    hostedTournamentsCount,
    playersCount,
    activePlayersCount,
    coachesCount,
    newsCount,
    confirmedTrainingCount,
    totalBookingsCount,
    storeOrdersCount,
    guestSessionsCount,
    totalTrainingRegsCount,
    monthlyRevenue,
  } = useAdminMetrics();

  const nowVn = useMemo(() => getVietnamNow(), []);
  const [bentoStats, setBentoStats] = useState({ totalPlayers: 0, rankedPlayers: 0, totalUsers: 0, activeUsers: 0, captains: 0, coaches: 0 });
  useEffect(() => {
    if (!isSuperAdmin) return;
    let alive = true;
    Promise.all([playerService.getPlayers().catch(() => []), userService.getUsers().catch(() => [])]).then(([ps, us]) => {
      if (!alive) return;
      const pArr = Array.isArray(ps) ? ps : [], uArr = Array.isArray(us) ? us : [];
      setBentoStats({ totalPlayers: pArr.length, rankedPlayers: pArr.filter((p) => Boolean(p.skillRank)).length, totalUsers: uArr.length, activeUsers: uArr.filter((u) => u.isActive !== false).length, captains: uArr.filter((u) => u.role === 'CAPTAIN' && u.isActive !== false).length, coaches: uArr.filter((u) => u.role === 'COACH' && u.isActive !== false).length });
    });
    return () => { alive = false; };
  }, [isSuperAdmin]);

  // Compute real average slot occupancy % across active Court Map venues (or fallback to booking confirmation %)
  const avgSlotFillPct = useMemo(() => {
    let totalReg = 0;
    let totalCap = 0;
    for (const v of venuesList) {
      if (isVenueClosedNow(v)) continue;
      for (const s of v.sessions || []) {
        if (s.capacityMode === 'LIMITED_SLOTS') {
          const nextDate = getUpcomingSessionDates(s.daysOfWeek, nowVn)[0]?.dateStr || nowVn.dateStr;
          const st = getSessionDailyState(s, nextDate);
          totalReg += st.currentPlayers;
          totalCap += Math.max(1, s.maxPlayers ?? 14);
        }
      }
    }
    if (totalCap > 0) return Math.min(100, Math.round((totalReg / totalCap) * 100));
    if (totalBookingsCount > 0) return Math.min(100, Math.round((paidBookingsCount / totalBookingsCount) * 100));
    return venuesList.length > 0 ? 78 : 0;
  }, [venuesList, nowVn, paidBookingsCount, totalBookingsCount]);

  // All hooks MUST stay unconditionally above any early return (Rules of Hooks)
  const guestSessionsPanelRef = useRef<HTMLDivElement>(null);

  const superAdminBentoItems = useMemo<SpatialBentoItem[]>(() => {
    if (!isSuperAdmin) return [];
    const venueCards: SpatialBentoItem[] = venuesList.slice(0, 8).map((v) => {
      const closed = isVenueClosedNow(v);
      const sessions = v.sessions || [];
      let reg = 0;
      let cap = 0;
      sessions.forEach((s) => {
        if (s.capacityMode === 'LIMITED_SLOTS') {
          const nextDate = getUpcomingSessionDates(s.daysOfWeek, nowVn)[0]?.dateStr || nowVn.dateStr;
          const st = getSessionDailyState(s, nextDate);
          reg += st.currentPlayers;
          cap += Math.max(1, s.maxPlayers ?? 14);
        }
      });
      const pct = closed ? 0 : cap > 0 ? Math.min(100, Math.round((reg / cap) * 100)) : sessions.length > 0 ? 76 : 30;
      const filterTags: BentoFilterKey[] = ['ALL'];
      if (closed) filterTags.push('PAUSED');
      else {
        filterTags.push('ACTIVE');
        if (pct < 75) filterTags.push('OPEN_SLOTS');
      }
      return {
        id: `bento-venue-${v.id}`,
        category: `${v.district} · ${(v.clubs || []).length} đội`,
        title: v.name,
        description: `${v.address} · ${sessions.length} ca sinh hoạt · ${v.surfaceType}`,
        percent: pct,
        gaugeSublabel: closed ? 'Tạm nghỉ' : 'Lấp đầy',
        statusTag: closed ? 'Tạm nghỉ' : pct < 75 ? 'Còn nhiều slot' : 'Đang hoạt động',
        metaRight: cap > 0 ? `${reg}/${cap} slot` : `${sessions.length} ca`,
        filterTags,
        onAction: () => setActiveModule('VENUES'),
      };
    });

    if (venueCards.length >= 4) return venueCards;

    // Combine with core management module cards if fewer than 4 venues exist
    const totalPlayers = players.length || bentoStats.totalPlayers || playersCount;
    const rankedCount = players.length ? players.filter((p) => Boolean(p.skillRank)).length : bentoStats.rankedPlayers;
    const moduleCards: SpatialBentoItem[] = [
      {
        id: 'bento-mod-bookings',
        category: 'Court Bookings & VietQR',
        title: 'Lịch Đặt Sân & Thu Phí',
        description: `${paidBookingsCount}/${totalBookingsCount} ca đã thanh toán VietQR · ${courtRevenue.toLocaleString('vi-VN')} đ.`,
        percent: totalBookingsCount > 0 ? Math.round((paidBookingsCount / totalBookingsCount) * 100) : 0,
        gaugeSublabel: 'Đã thanh toán',
        statusTag: 'Đang hoạt động',
        metaRight: `${totalBookingsCount} lượt`,
        filterTags: ['ALL', 'ACTIVE'],
        tone: 'orange',
        onAction: () => setActiveModule('BOOKINGS'),
      },
      {
        id: 'bento-mod-applications',
        category: 'Tuyển quân CLB',
        title: 'Tryout Applications',
        description: `${pendingApplicationsCount} đơn chờ duyệt · ${approvedTryoutsCount} VĐV đã lên đội hình chính thức.`,
        percent: applicationsCount > 0 ? Math.round(((approvedTryoutsCount + scheduledApplicationsCount) / applicationsCount) * 100) : 100,
        gaugeSublabel: 'Đã duyệt',
        statusTag: pendingApplicationsCount > 0 ? 'Còn nhiều slot' : 'Đang hoạt động',
        metaRight: `${applicationsCount} hồ sơ`,
        filterTags: pendingApplicationsCount > 0 ? ['ALL', 'ACTIVE', 'OPEN_SLOTS'] : ['ALL', 'ACTIVE'],
        tone: 'emerald',
        onAction: () => setActiveModule('APPLICATIONS'),
      },
      {
        id: 'bento-mod-training',
        category: 'Học viện DVA',
        title: 'Training & Scrimmages',
        description: `${confirmedTrainingCount}/${totalTrainingRegsCount} học viên xác nhận · Ước tính ${trainingRevenue.toLocaleString('vi-VN')} đ.`,
        percent: totalTrainingRegsCount > 0 ? Math.round((confirmedTrainingCount / totalTrainingRegsCount) * 100) : 0,
        gaugeSublabel: 'Xác nhận',
        statusTag: 'Còn nhiều slot',
        metaRight: `${totalTrainingRegsCount} ĐK`,
        filterTags: ['ALL', 'ACTIVE', 'OPEN_SLOTS'],
        tone: 'indigo',
        onAction: () => setActiveModule('TRAINING'),
      },
      {
        id: 'bento-mod-tournaments',
        category: 'Giải đấu & Leagues',
        title: 'Tournaments Hub',
        description: `${tournamentsCount} giải đấu · ${hostedTournamentsCount} giải DVA đăng cai · ${paidTournamentTeamsCount} đội đã đóng phí.`,
        percent: tournamentsCount > 0 ? Math.min(100, Math.round((hostedTournamentsCount / tournamentsCount) * 100) || 68) : 0,
        gaugeSublabel: 'Hosted',
        statusTag: tournamentsCount > 0 ? 'Đang hoạt động' : 'Tạm nghỉ',
        metaRight: `${tournamentsCount} giải`,
        filterTags: tournamentsCount > 0 ? ['ALL', 'ACTIVE'] : ['ALL', 'PAUSED'],
        tone: 'rose',
        onAction: () => setActiveModule('TOURNAMENTS'),
      },
      {
        id: 'bento-mod-players', category: 'ĐỘI HÌNH CHÍNH THỨC', title: 'Roster Squad & USAV Rank',
        description: `${rankedCount}/${totalPlayers} VĐV có hạng USAV · Senior, Junior & Kid`,
        percent: totalPlayers > 0 ? Math.round((rankedCount / totalPlayers) * 100) : 0,
        gaugeSublabel: 'ĐÃ XẾP HẠNG', statusTag: 'Đang hoạt động', metaRight: `${totalPlayers} VĐV`,
        filterTags: ['ALL', 'ACTIVE'], tone: 'emerald', onAction: () => setActiveModule('PLAYERS'),
      },
      {
        id: 'bento-mod-users', category: 'PHÂN QUYỀN & NHÂN SỰ', title: 'Captains, Coaches & Users',
        description: `${bentoStats.captains} Captain CLB · ${bentoStats.coaches || coachesCount} HLV đang hoạt động`,
        percent: bentoStats.totalUsers > 0 ? Math.round((bentoStats.activeUsers / bentoStats.totalUsers) * 100) : 0,
        gaugeSublabel: 'HOẠT ĐỘNG', statusTag: 'Hệ thống', metaRight: `${bentoStats.totalUsers} TK`,
        filterTags: ['ALL', 'ACTIVE'], tone: 'orange', onAction: () => setActiveModule('USERS'),
      },
    ];
    return [...venueCards, ...moduleCards];
  }, [
    isSuperAdmin,
    venuesList, players, playersCount, coachesCount, bentoStats, nowVn,
    paidBookingsCount,
    totalBookingsCount,
    courtRevenue,
    pendingApplicationsCount,
    approvedTryoutsCount,
    scheduledApplicationsCount,
    applicationsCount,
    confirmedTrainingCount,
    totalTrainingRegsCount,
    trainingRevenue,
    tournamentsCount,
    hostedTournamentsCount,
    paidTournamentTeamsCount,
    setActiveModule,
  ]);

  // Prevent flashing placeholder "0" KPI numbers while initial overview summary is loading
  if (!loadedScopes.has('OVERVIEW')) {
    return (
      <div className="space-y-6">
        {/* 4 KPI Shimmer Skeleton Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="dva-skeleton p-5 rounded-3xl space-y-3 min-h-[136px]">
              <div className="flex items-center justify-between">
                <div className="dva-skeleton-bar h-3 w-28" />
                <div className="dva-skeleton-bar h-6 w-16 rounded-full" />
              </div>
              <div className="dva-skeleton-bar h-8 w-40" />
              <div className="dva-skeleton-bar h-2.5 w-32" />
            </div>
          ))}
        </div>

        {/* Spatial Bento Module Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="dva-skeleton p-5 rounded-3xl h-44 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="dva-skeleton-bar h-3 w-24" />
                <div className="dva-skeleton-bar h-5 w-44" />
                <div className="dva-skeleton-bar h-3 w-full" />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <div className="dva-skeleton-bar h-5 w-20 rounded-full" />
                <div className="dva-skeleton-bar h-4 w-16" />
              </div>
            </div>
          ))}
        </div>

        {/* Revenue Chart & Recent Activity Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="dva-skeleton p-6 rounded-3xl h-64 space-y-4">
            <div className="dva-skeleton-bar h-4 w-48" />
            <div className="dva-skeleton-bar h-44 w-full rounded-2xl" />
          </div>
          <div className="dva-skeleton p-6 rounded-3xl h-64 space-y-3">
            <div className="dva-skeleton-bar h-4 w-48" />
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="dva-skeleton-bar h-10 w-full rounded-xl" />
            ))}
          </div>
        </div>

        <SlowServerPill active />
      </div>
    );
  }

  // --- ADMIN (Restricted RBAC: strictly non-financial & PII-free) ---
  if (!isSuperAdmin) {
    const processedTryouts = approvedTryoutsCount + scheduledApplicationsCount;
    const tryoutProgressPct = applicationsCount > 0 ? Math.round((processedTryouts / applicationsCount) * 100) : 100;

    const adminKpis: SpatialKpiItem[] = [
      {
        id: 'admin-members-tryouts',
        label: 'Thành viên & Tryout chờ duyệt',
        value: `${activePlayersCount} VĐV · ${pendingApplicationsCount} chờ`,
        subtitle: `${playersCount} tổng hồ sơ · ${scheduledApplicationsCount} lịch test`,
        badge: pendingApplicationsCount > 0 ? `${pendingApplicationsCount} chờ duyệt` : 'Đã xử lý hết',
        badgeTone: pendingApplicationsCount > 0 ? 'orange' : 'emerald',
        icon: Users,
        accentColor: '#FB923C',
        sparkline: [Math.max(1, activePlayersCount - 8), Math.max(1, activePlayersCount - 5), activePlayersCount - 2, activePlayersCount],
        onClick: () => setActiveModule('APPLICATIONS'),
      },
      {
        id: 'admin-ops',
        label: 'Giải Đấu & Truyền Thông',
        value: `${tournamentsCount} Giải · ${newsCount} Tin`,
        subtitle: `${hostedTournamentsCount} giải do DVA đăng cai · RBAC Scoped`,
        badge: 'ADMIN Scope',
        badgeTone: 'sky',
        icon: Trophy,
        accentColor: '#38BDF8',
        sparkline: [2, 4, 3, Math.max(4, tournamentsCount + 2), Math.max(5, newsCount)],
        onClick: () => setActiveModule('TOURNAMENTS'),
      },
      {
        id: 'admin-fill',
        label: 'Tỷ lệ xử lý Tryout & Tiến độ',
        value: `${tryoutProgressPct}%`,
        subtitle: `${approvedTryoutsCount} đạt · ${scheduledApplicationsCount} hẹn lịch / ${applicationsCount} đơn`,
        badge: 'Tiến độ duyệt',
        badgeTone: 'emerald',
        icon: Activity,
        accentColor: '#34D399',
        gaugePct: tryoutProgressPct,
        gaugeSublabel: 'Đã duyệt',
        onClick: () => setActiveModule('APPLICATIONS'),
      },
    ];

    const adminBentoItems: SpatialBentoItem[] = [
      {
        id: 'mod-applications',
        category: 'Tuyển quân · RBAC',
        title: 'Tryout Applications',
        description: `${pendingApplicationsCount} đơn chờ đánh giá, ${scheduledApplicationsCount} lịch kiểm tra, ${approvedTryoutsCount} đã duyệt.`,
        percent: tryoutProgressPct,
        gaugeSublabel: 'Xử lý',
        statusTag: pendingApplicationsCount > 0 ? 'Cần duyệt' : 'Đang hoạt động',
        metaRight: `${applicationsCount} đơn`,
        filterTags: pendingApplicationsCount > 0 ? ['ALL', 'ACTIVE', 'OPEN_SLOTS'] : ['ALL', 'ACTIVE'],
        tone: 'orange',
        onAction: () => setActiveModule('APPLICATIONS'),
      },
      {
        id: 'mod-tournaments',
        category: 'Giải đấu · Read-Only',
        title: 'Tournaments & Leagues',
        description: `Theo dõi ${tournamentsCount} giải đấu, bảng xếp hạng, nhánh knockout & lịch thi đấu.`,
        percent: tournamentsCount > 0 ? Math.min(100, Math.round((hostedTournamentsCount / tournamentsCount) * 100) || 65) : 0,
        gaugeSublabel: 'DVA Cup',
        statusTag: tournamentsCount > 0 ? 'Đang hoạt động' : 'Tạm nghỉ',
        metaRight: `${tournamentsCount} giải`,
        filterTags: tournamentsCount > 0 ? ['ALL', 'ACTIVE'] : ['ALL', 'PAUSED'],
        tone: 'rose',
        onAction: () => setActiveModule('TOURNAMENTS'),
      },
      {
        id: 'mod-news',
        category: 'Truyền thông',
        title: 'News & Media Stories',
        description: `Xuất bản ${newsCount} bản tin CLB, tường thuật trận đấu & thông báo học viện.`,
        percent: Math.min(100, Math.max(25, newsCount * 12)),
        gaugeSublabel: 'Bài viết',
        statusTag: 'Đang hoạt động',
        metaRight: `${newsCount} bài`,
        filterTags: ['ALL', 'ACTIVE', 'OPEN_SLOTS'],
        tone: 'indigo',
        onAction: () => setActiveModule('NEWS'),
      },
      {
        id: 'mod-squad',
        category: 'Đội hình CLB',
        title: 'Active Squad Athletes',
        description: `${activePlayersCount}/${playersCount} vận động viên đang hoạt động tại Senior, Junior & Youth.`,
        percent: playersCount > 0 ? Math.round((activePlayersCount / playersCount) * 100) : 0,
        gaugeSublabel: 'Active',
        statusTag: 'Đang hoạt động',
        metaRight: `${activePlayersCount} VĐV`,
        filterTags: ['ALL', 'ACTIVE'],
        tone: 'emerald',
      },
    ];

    return (
      <div className="space-y-6 dva-content-reveal">
        <SpatialKpiRow items={adminKpis} />

        <div className="rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-400/35 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <h2 className="font-heading font-black text-base text-white">Club Operations Overview</h2>
              <p className="text-xs text-slate-300/80 mt-0.5">
                Signed in as <strong className="text-sky-300">ADMIN</strong>. Access is scoped to Tryout Evaluations,
                News &amp; Media publishing, and Read-Only Tournament brackets/rosters (financial &amp; PII fields hidden).
              </p>
            </div>
          </div>
        </div>

        <SpatialBentoGrid
          title="Phân Hệ Quản Trị Được Cấp Quyền"
          subtitle="Bấm vào nút mũi tên trắng trên mỗi thẻ Bento để mở nhanh khu vực thao tác"
          items={adminBentoItems}
        />
      </div>
    );
  }

  // --- SUPERADMIN FULL SPATIAL DASHBOARD ---
  const jumpToGuestSessions = () => {
    guestSessionsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const monthlyTotals = monthlyRevenue.map(
    (p) => p.court + p.store + p.guest + p.tryout + p.tournament + p.training
  );

  const superAdminKpis: SpatialKpiItem[] = [
    {
      id: 'sa-members-tryouts',
      label: 'Tổng thành viên & Tryout chờ duyệt',
      value: `${activePlayersCount} VĐV · ${pendingApplicationsCount} chờ`,
      subtitle: `${playersCount} tổng đội hình · ${approvedTryoutsCount} đơn đã duyệt`,
      badge: pendingApplicationsCount > 0 ? `${pendingApplicationsCount} Tryout mới` : 'Ổn định',
      badgeTone: pendingApplicationsCount > 0 ? 'orange' : 'emerald',
      icon: Users,
      accentColor: '#FB923C',
      sparkline: [
        Math.max(1, activePlayersCount - 10),
        Math.max(1, activePlayersCount - 7),
        Math.max(1, activePlayersCount - 4),
        Math.max(1, activePlayersCount - 2),
        activePlayersCount,
      ],
      onClick: () => setActiveModule(pendingApplicationsCount > 0 ? 'APPLICATIONS' : 'PLAYERS'),
    },
    {
      id: 'sa-revenue-vietqr',
      label: 'Tổng doanh thu sân & VietQR',
      value: `${verifiedClubRevenue.toLocaleString('vi-VN')} đ`,
      subtitle: `Sân: ${courtRevenue.toLocaleString('vi-VN')} đ · ${paidBookingsCount} ca PAID`,
      badge: 'Verified VietQR',
      badgeTone: 'emerald',
      icon: Wallet,
      accentColor: '#34D399',
      sparkline: monthlyTotals.length >= 2 ? monthlyTotals : [0, courtRevenue, verifiedClubRevenue],
      onClick: () => setActiveModule('BOOKINGS'),
    },
    {
      id: 'sa-slot-fill',
      label: 'Tỷ lệ lấp đầy slot trung bình',
      value: `${avgSlotFillPct}%`,
      subtitle: `${venuesList.length} cụm sân Court Map · ${totalBookingsCount} lượt đặt sân`,
      badge: avgSlotFillPct >= 70 ? 'Hiệu suất cao' : 'Còn nhiều slot',
      badgeTone: avgSlotFillPct >= 70 ? 'orange' : 'sky',
      icon: Activity,
      accentColor: '#FB7185',
      gaugePct: avgSlotFillPct,
      gaugeSublabel: 'Slot fill',
      onClick: () => setActiveModule('VENUES'),
    },
  ];

  const pctOf = (value: number) =>
    totalClubRevenue > 0 ? Math.round((value / totalClubRevenue) * 1000) / 10 : 0;

  const bookingSharePct = pctOf(courtRevenue);
  const storeSharePct = pctOf(storeRevenue);
  const guestSharePct = pctOf(guestSessionRevenue);
  const tryoutSharePct = pctOf(tryoutRevenue);
  const tournamentSharePct = pctOf(tournamentRevenue);
  const trainingSharePct =
    totalClubRevenue > 0
      ? Math.max(
          0,
          Math.round(
            (100 - bookingSharePct - storeSharePct - guestSharePct - tryoutSharePct - tournamentSharePct) * 10
          ) / 10
        )
      : 0;

  const serviceStreams = [
    {
      id: 'BOOKINGS' as const,
      icon: CreditCard,
      label: 'Court Bookings',
      revenue: courtRevenue,
      pct: bookingSharePct,
      volume: `${paidBookingsCount} paid / ${totalBookingsCount} total bookings`,
      color: 'bg-[#F97316]',
      textColor: 'text-[#F97316]',
      onClick: isSuperAdmin ? () => setActiveModule('BOOKINGS') : undefined,
    },
    {
      id: 'STORE' as const,
      icon: ShoppingBag,
      label: 'DVA Store',
      revenue: storeRevenue,
      pct: storeSharePct,
      volume: `${paidStoreOrdersCount} paid / ${storeOrdersCount} total orders`,
      color: 'bg-[#FACC15]',
      textColor: 'text-[#FACC15]',
      onClick: isSuperAdmin ? () => setActiveModule('STORE') : undefined,
    },
    {
      id: 'GUEST_SESSIONS' as const,
      icon: Ticket,
      label: 'Guest Sessions',
      revenue: guestSessionRevenue,
      pct: guestSharePct,
      volume: `${paidGuestSessionsCount} paid / ${guestSessionsCount} drop-in passes`,
      color: 'bg-[#A855F7]',
      textColor: 'text-[#A855F7]',
      onClick: isSuperAdmin ? jumpToGuestSessions : undefined,
    },
    {
      id: 'APPLICATIONS' as const,
      icon: UserCheck,
      label: 'Tryout Fees',
      revenue: tryoutRevenue,
      pct: tryoutSharePct,
      volume: `${paidTryoutsCount} paid · ${approvedTryoutsCount} approved / ${applicationsCount} apps`,
      color: 'bg-[#10B981]',
      textColor: 'text-[#10B981]',
      onClick: () => setActiveModule('APPLICATIONS'),
    },
    {
      id: 'TOURNAMENTS' as const,
      icon: Trophy,
      label: 'Tournament Fees (Hosted)',
      revenue: tournamentRevenue,
      pct: tournamentSharePct,
      volume: `${paidTournamentTeamsCount} paid teams / ${hostedTournamentsCount} hosted cups`,
      color: 'bg-[#EC4899]',
      textColor: 'text-[#EC4899]',
      onClick: () => setActiveModule('TOURNAMENTS'),
    },
    {
      id: 'TRAINING' as const,
      icon: Dumbbell,
      label: 'Training & Scrimmages (Est.)',
      revenue: trainingRevenue,
      pct: trainingSharePct,
      volume: `${confirmedTrainingCount} confirmed / ${totalTrainingRegsCount} enrollments`,
      color: 'bg-[#38BDF8]',
      textColor: 'text-[#38BDF8]',
      onClick: isSuperAdmin ? () => setActiveModule('TRAINING') : undefined,
    },
  ];

  return (
    <div className="space-y-6 dva-content-reveal">
      {/* 0. Spatial 3-Column Executive KPI Row */}
      <SpatialKpiRow items={superAdminKpis} />

      {/* 0B. Spatial Gradient Bento Grid (Court Map Venues & Core Modules with RingGauge + Filter Pills) */}
      <SpatialBentoGrid
        title={venuesList.length > 0 ? 'Bento Tổng Quan Sân & Phân Hệ Quản Trị' : 'Bento Tổng Quan Phân Hệ Quản Trị'}
        subtitle="Theo dõi tỷ lệ lấp đầy slot trực tiếp bằng biểu đồ vòng cung SVG và truy cập chi tiết chỉ với 1 chạm"
        items={superAdminBentoItems}
      />

      {/* 1. 8-Card Balanced 2x4 Financial Breakdown Grid */}
      <RevenueKpiCards onJumpToGuestSessions={jumpToGuestSessions} />

      {/* 2. Middle Section: Revenue Trend Chart & 6-Stream Service Share */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 h-full">
          <RevenueTrendChart />
        </div>

        {/* Service Revenue & Activity Share */}
        <div className="rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-6 flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#38BDF8]" />
              Service Revenue Share (All Streams)
            </h3>
            <p className="text-[11px] text-slate-400">
              Revenue distribution across verified cashflow &amp; estimated academy tuition
            </p>
          </div>

          {/* Stacked horizontal proportion bar */}
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full bg-white/[0.06] border border-white/10 overflow-hidden flex">
              {serviceStreams.map((s) =>
                s.pct > 0 ? (
                  <div
                    key={s.id}
                    className={`h-full ${s.color} transition-all duration-500`}
                    style={{ width: `${s.pct}%` }}
                    title={`${s.label}: ${s.pct}%`}
                  />
                ) : null
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px] text-slate-400 font-mono">
              <span>Bookings {bookingSharePct}%</span>
              <span>Shop {storeSharePct}%</span>
              <span>Guest {guestSharePct}%</span>
              <span>Tryouts {tryoutSharePct}%</span>
              <span>Tour {tournamentSharePct}%</span>
              <span>Training {trainingSharePct}%</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {serviceStreams.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={s.onClick}
                  disabled={!s.onClick}
                  className={`w-full text-left p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 transition-colors space-y-1 ${
                    s.onClick ? 'hover:bg-white/[0.07] cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-bold text-white">
                      <Icon className={`w-3.5 h-3.5 ${s.textColor}`} />
                      {s.label}
                    </span>
                    <span className={`font-mono text-xs font-black tabular-nums ${s.textColor}`}>
                      {s.pct}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{s.volume}</span>
                    <span className="font-mono text-slate-200 font-semibold tabular-nums">
                      {s.revenue.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Guest Sessions & Drop-in Pass Cashflow Management (SUPERADMIN only) */}
      {isSuperAdmin && <GuestSessionsPanel panelRef={guestSessionsPanelRef} />}

      {/* 4. Bottom Section: Recent Activity (Top 5 Bookings & Top 5 Training Registrations — SUPERADMIN only) */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Court Bookings (Top 5) */}
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-white">Recent Activity — Court Bookings</h3>
                <p className="text-[11px] text-slate-400">Latest 5 court reservation requests</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('BOOKINGS')}
                className="text-xs text-[#F97316] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-white/10 text-xs">
              {bookings.length === 0 ? (
                <p className="py-6 text-center text-slate-500">No court reservations recorded yet.</p>
              ) : (
                bookings.slice(0, 5).map((b) => (
                  <div key={b.id} className="py-3 flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">
                        {b.courtName} ({b.startTime} - {b.endTime})
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {b.customerName} · {b.bookingDate} · Ref:{' '}
                        <span className="font-mono text-slate-300">{b.bookingCode}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.paymentStatus === 'PAID'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35'
                            : b.paymentStatus === 'CANCELLED'
                              ? 'bg-white/10 text-slate-400 border border-white/15'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/35'
                        }`}
                      >
                        {b.paymentStatus}
                      </span>
                      <div className="font-mono text-[#F97316] font-bold mt-0.5 tabular-nums">
                        {b.totalPrice.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Training & Scrimmage Enrollments (Top 5) */}
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-white">Recent Activity — Training &amp; Scrimmages</h3>
                <p className="text-[11px] text-slate-400">Latest 5 academy &amp; scrimmage enrollments</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('TRAINING')}
                className="text-xs text-[#38BDF8] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-white/10 text-xs">
              {trainingRegs.length === 0 ? (
                <p className="py-6 text-center text-slate-500">No training enrollments recorded yet.</p>
              ) : (
                trainingRegs.slice(0, 5).map((reg) => (
                  <div key={reg.id} className="py-3 flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">
                        {reg.fullName}{' '}
                        <span className="text-slate-400 font-normal">({reg.experienceLevel})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        <span className="text-[#38BDF8] font-semibold">{reg.courseTitle}</span> ·{' '}
                        {reg.preferredTimeSlot}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          reg.status === 'CONFIRMED'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35'
                            : reg.status === 'CANCELLED'
                              ? 'bg-white/10 text-slate-400 border border-white/15'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/35'
                        }`}
                      >
                        {reg.status}
                      </span>
                      <div className="font-mono text-[11px] text-slate-400 mt-0.5">{reg.phone}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
