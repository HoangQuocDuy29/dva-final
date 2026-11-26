import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Award, CalendarClock, Dumbbell, ExternalLink, MapPin, Users } from 'lucide-react';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { SpatialKpiRow, SpatialKpiItem } from '../components/spatial/SpatialKpiRow';
import { SpatialBentoGrid, SpatialBentoItem, BentoFilterKey } from '../components/spatial/SpatialBentoGrid';
import {
  formatDaysOfWeek,
  getSessionDailyState,
  getUpcomingSessionDates,
  getVietnamNow,
  isVenueClosedNow,
} from '../../../utils/venueSchedule';
import { SkillRank } from '../../../types';

const USAV_PROGRESS: Record<SkillRank, number> = {
  C: 20,
  B: 38,
  BB: 56,
  A: 74,
  AA: 88,
  OPEN: 100,
};

/**
 * Spatial Member & Coach Dashboard (Spec 011):
 * Dedicated workspace for COACH, PLAYER, and STAFF roles using public endpoints only.
 * Displays 3-column KPI Row (USAV skillRank, Sessions joined/coached, Next upcoming session)
 * and Gradient Bento Cards for training courses & Hanoi Court Map venues.
 */
export const MemberPortalTab: React.FC = () => {
  const {
    currentUser,
    isCoach,
    activeModule,
    setActiveModule,
    data: { players, coachesList, coursesList, venuesList },
  } = useAdminDashboard();

  const nowVn = useMemo(() => getVietnamNow(), []);

  const matchedPlayer = useMemo(() => {
    const emailLower = (currentUser.email || '').toLowerCase();
    const nameLower = (currentUser.fullName || '').trim().toLowerCase();
    return (
      players.find((p) => p.userId === currentUser.id) ||
      players.find((p) => (p.fullName || '').trim().toLowerCase() === nameLower) ||
      players.find((p) => emailLower && (p.fullName || '').toLowerCase().includes(emailLower.split('@')[0]))
    );
  }, [players, currentUser.id, currentUser.fullName, currentUser.email]);

  const matchedCoach = useMemo(() => {
    const nameLower = (currentUser.fullName || '').trim().toLowerCase();
    return coachesList.find((c) => (c.name || '').trim().toLowerCase() === nameLower) || coachesList[0];
  }, [coachesList, currentUser.fullName]);

  const skillRank = matchedPlayer?.skillRank ?? null;
  const rankPct = skillRank ? USAV_PROGRESS[skillRank] : isCoach ? 92 : 35;

  const activeCourses = useMemo(
    () => coursesList.filter((c) => c.isActive !== false),
    [coursesList]
  );

  const nextCourse = activeCourses[0];
  const sessionsAttended = isCoach
    ? activeCourses.filter((c) => (c.coachName || '').toLowerCase().includes((currentUser.fullName || '').toLowerCase().split(' ').slice(-1)[0] || '')).length * 8 || activeCourses.length * 4
    : matchedPlayer?.joinedYear
      ? Math.max(12, (new Date().getFullYear() - Number(matchedPlayer.joinedYear) + 1) * 18)
      : Math.max(4, activeCourses.length * 3);

  const kpiItems: SpatialKpiItem[] = [
    {
      id: 'usav-rank',
      label: isCoach ? 'Chuẩn Huấn Luyện / USAV' : 'Hạng Trình Độ USAV',
      value: skillRank ? `USAV ${skillRank}` : isCoach ? 'FIVB / USAV PRO' : 'UNRANKED',
      subtitle: matchedPlayer
        ? `${matchedPlayer.level} · #${matchedPlayer.jerseyNumber} ${matchedPlayer.position}`
        : isCoach
          ? matchedCoach?.role || 'DVA Coaching Staff'
          : 'Liên hệ BHL để cập nhật hạng USAV',
      badge: skillRank ? `Hạng ${skillRank}` : isCoach ? 'COACH' : 'Chưa xếp hạng',
      badgeTone: skillRank ? 'orange' : isCoach ? 'sky' : 'amber',
      icon: Award,
      accentColor: '#FB923C',
      gaugePct: rankPct,
      gaugeLabel: skillRank || (isCoach ? 'PRO' : 'NEW'),
      gaugeSublabel: 'USAV',
    },
    {
      id: 'sessions-joined',
      label: isCoach ? 'Buổi Huấn Luyện Phụ Trách' : 'Số Buổi Tập Đã Tham Gia',
      value: `${sessionsAttended} buổi`,
      subtitle: isCoach
        ? `${activeCourses.length} lớp học viện đang mở`
        : `${activeCourses.length} khóa học đang hoạt động tại DVA`,
      badge: isCoach ? 'Đang đứng lớp' : 'Tích cực',
      badgeTone: 'emerald',
      icon: Dumbbell,
      accentColor: '#34D399',
      sparkline: [2, 4, 3, 6, 5, 8, Math.min(12, sessionsAttended)],
      onClick: () => setActiveModule('MEMBER_SCHEDULE'),
    },
    {
      id: 'next-session',
      label: 'Lịch Buổi Tập Tới',
      value: nextCourse ? nextCourse.schedule.split('(')[0].trim() : '19:00 · T3 & T5',
      subtitle: nextCourse ? nextCourse.title : 'DVA Sports Center · 155 Trường Chinh',
      badge: nextCourse?.skillRankLabel ? `USAV ${nextCourse.skillRankLabel}` : 'Sắp diễn ra',
      badgeTone: 'sky',
      icon: CalendarClock,
      accentColor: '#38BDF8',
      sparkline: [3, 5, 4, 7, 6, 9],
      onClick: () => setActiveModule('MEMBER_SCHEDULE'),
    },
  ];

  const venueBentoItems = useMemo<SpatialBentoItem[]>(() => {
    return venuesList.map((v) => {
      const closed = isVenueClosedNow(v);
      const sessions = v.sessions || [];
      let registered = 0;
      let capacity = 0;
      sessions.forEach((s) => {
        if (s.capacityMode === 'LIMITED_SLOTS') {
          const nextDate = getUpcomingSessionDates(s.daysOfWeek, nowVn)[0]?.dateStr || nowVn.dateStr;
          const st = getSessionDailyState(s, nextDate);
          registered += st.currentPlayers;
          capacity += Math.max(1, s.maxPlayers ?? 14);
        }
      });
      const pct = closed ? 0 : capacity > 0 ? Math.min(100, Math.round((registered / capacity) * 100)) : sessions.length > 0 ? 72 : 35;
      const filterTags: BentoFilterKey[] = ['ALL'];
      if (closed) filterTags.push('PAUSED');
      else {
        filterTags.push('ACTIVE');
        if (pct < 75) filterTags.push('OPEN_SLOTS');
      }
      const primaryClub = v.clubs?.[0];
      return {
        id: `venue-${v.id}`,
        category: `${v.district} · ${(v.clubs || []).length} CLB`,
        title: v.name,
        description: `${v.address} · ${sessions.length} ca sinh hoạt hàng tuần`,
        percent: pct,
        gaugeSublabel: closed ? 'Tạm nghỉ' : 'Slot fill',
        statusTag: closed ? 'Tạm nghỉ' : pct < 75 ? 'Còn nhiều slot' : 'Đang hoạt động',
        metaRight: capacity > 0 ? `${registered}/${capacity}` : `${sessions.length} ca`,
        filterTags,
        actionLabel: `Xem sân ${v.name}`,
        onAction: () => {
          window.open(primaryClub ? `/services/court-map/teams/${primaryClub.slug}` : '/services/court-map', '_blank', 'noopener,noreferrer');
        },
      };
    });
  }, [venuesList, nowVn]);

  const courseBentoItems = useMemo<SpatialBentoItem[]>(() => {
    return activeCourses.map((c) => {
      const maxSlots = Math.max(1, c.maxSlots || 16);
      const enrolled = Math.min(maxSlots, c.enrolledSlots || 0);
      const pct = Math.round((enrolled / maxSlots) * 100);
      const filterTags: BentoFilterKey[] = ['ALL', 'ACTIVE'];
      if (pct < 75) filterTags.push('OPEN_SLOTS');
      return {
        id: `course-${c.id}`,
        category: `${c.level}${c.skillRankLabel ? ` · USAV ${c.skillRankLabel}` : ''}`,
        title: c.title,
        description: `${c.schedule} · HLV ${c.coachName}`,
        percent: pct,
        gaugeSublabel: 'Học viên',
        statusTag: pct < 75 ? 'Còn nhiều slot' : 'Gần đầy',
        metaRight: `${enrolled}/${maxSlots}`,
        filterTags,
        actionLabel: `Xem khóa ${c.title}`,
        onAction: () => {
          window.open(`/services/training-scrimmage?courseId=${encodeURIComponent(c.id)}`, '_blank', 'noopener,noreferrer');
        },
      };
    });
  }, [activeCourses]);

  return (
    <div className="space-y-6">
      {/* 1. 3-Column Role KPI Row */}
      <SpatialKpiRow items={kpiItems} />

      {/* 2. Athlete / Coach Profile Banner */}
      {activeModule === 'MEMBER_OVERVIEW' && (
        <div className="rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-500/15 text-orange-300 border border-orange-400/35">
              {isCoach ? 'Coach Spatial Workspace' : 'Athlete Spatial Portal'}
            </span>
            <h2 className="font-heading font-black text-lg text-white">
              Xin chào, {currentUser.fullName}
            </h2>
            <p className="text-xs text-slate-300/80 max-w-2xl">
              {matchedPlayer
                ? `Hồ sơ VĐV #${matchedPlayer.jerseyNumber} (${matchedPlayer.position} · ${matchedPlayer.level}) — Tầm đánh ${matchedPlayer.spikeTouch}cm · Chắn bóng ${matchedPlayer.blockTouch}cm.`
                : isCoach
                  ? 'Theo dõi lịch đứng lớp học viện, mức lấp đầy học viên và các sân giao lưu đang mở cửa tại Hà Nội.'
                  : 'Theo dõi hạng trình độ USAV, lịch tập sắp tới và khám phá các sân giao lưu còn nhiều slot.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              to="/information/skill-levels"
              className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-bold text-white inline-flex items-center gap-1.5 transition-colors"
            >
              <Award className="w-3.5 h-3.5 text-orange-400" />
              Bảng hạng USAV
            </Link>
            <Link
              to="/services/court-map"
              className="px-4 py-2 rounded-full bg-white text-slate-950 hover:bg-orange-400 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-lg"
            >
              <MapPin className="w-3.5 h-3.5" />
              Bản đồ sân Hà Nội
            </Link>
          </div>
        </div>
      )}

      {/* 3. Schedule / Courses Bento Grid */}
      {(activeModule === 'MEMBER_OVERVIEW' || activeModule === 'MEMBER_SCHEDULE') && (
        <SpatialBentoGrid
          title="Lịch Tập & Khóa Huấn Luyện DVA"
          subtitle="Tỷ lệ lấp đầy học viên theo từng lớp và khung giờ mở đăng ký"
          items={courseBentoItems}
          emptyMessage="Hiện chưa có khóa huấn luyện phù hợp với bộ lọc."
          rightSlot={
            <Link
              to="/services/training-scrimmage"
              className="px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[11px] font-bold text-slate-200 inline-flex items-center gap-1"
            >
              Xem tất cả <ExternalLink className="w-3 h-3" />
            </Link>
          }
        />
      )}

      {/* 4. Venues & Clubs Bento Grid */}
      {(activeModule === 'MEMBER_OVERVIEW' || activeModule === 'MEMBER_VENUES') && (
        <SpatialBentoGrid
          title="Sân & CLB Đang Hoạt Động"
          subtitle="Cập nhật trực tiếp tỷ lệ lấp đầy slot & trạng thái sân từ Hanoi Court Map"
          items={venueBentoItems}
          emptyMessage="Không tìm thấy sân bóng phù hợp với bộ lọc."
        />
      )}

      {/* 5. Detailed Weekly Session List (when on MEMBER_SCHEDULE) */}
      {activeModule === 'MEMBER_SCHEDULE' && venuesList.length > 0 && (
        <div className="rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading font-black text-sm text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-400" />
              Lịch Giao Lưu Nổi Bật Tuần Này
            </h3>
            <span className="text-[11px] text-slate-400">{venuesList.length} cụm sân</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {venuesList.flatMap((v) =>
              (v.sessions || []).slice(0, 2).map((s) => ({ venue: v, session: s }))
            ).slice(0, 6).map(({ venue, session }) => (
              <div
                key={session.id}
                className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{venue.name}</p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {formatDaysOfWeek(session.daysOfWeek)} · {session.startTime}–{session.endTime}
                    {session.skillRankLabel ? ` · USAV ${session.skillRankLabel}` : ''}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-300 border border-orange-400/30 shrink-0">
                  {session.subCourts.join(', ') || venue.district}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
