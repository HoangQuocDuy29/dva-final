import React, { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { User as UserType } from '../../types';
import {
  AdminDashboardProvider,
  useAdminDashboard,
} from './context/AdminDashboardContext';
import { AdminHeader } from './layout/AdminHeader';
import { AdminSidebar } from './layout/AdminSidebar';
import { FeedbackBanner } from './layout/FeedbackBanner';
import { OverviewTab } from './tabs/OverviewTab';
import { SlowServerPill } from '../../components/common/GlassLoading';

// Code-split heavy Admin Hub tabs & modals so initial Overview bundle stays lightweight
const GuestSessionEmailModal = lazy(() =>
  import('./components/GuestSessionEmailModal').then((m) => ({ default: m.GuestSessionEmailModal }))
);
const ChangePasswordModal = lazy(() =>
  import('./components/ChangePasswordModal').then((m) => ({ default: m.ChangePasswordModal }))
);
const CourtsTab = lazy(() => import('./tabs/CourtsTab').then((m) => ({ default: m.CourtsTab })));
const BookingsTab = lazy(() => import('./tabs/BookingsTab').then((m) => ({ default: m.BookingsTab })));
const ApplicationsTab = lazy(() => import('./tabs/ApplicationsTab').then((m) => ({ default: m.ApplicationsTab })));
const PlayersTab = lazy(() => import('./tabs/PlayersTab').then((m) => ({ default: m.PlayersTab })));
const TrainingTab = lazy(() => import('./tabs/TrainingTab').then((m) => ({ default: m.TrainingTab })));
const CoachesTab = lazy(() => import('./tabs/CoachesTab').then((m) => ({ default: m.CoachesTab })));
const LeadershipTab = lazy(() => import('./tabs/LeadershipTab').then((m) => ({ default: m.LeadershipTab })));
const NewsTab = lazy(() => import('./tabs/NewsTab').then((m) => ({ default: m.NewsTab })));
const UsersTab = lazy(() => import('./tabs/UsersTab').then((m) => ({ default: m.UsersTab })));
const SheetsTab = lazy(() => import('./tabs/SheetsTab').then((m) => ({ default: m.SheetsTab })));
const StoreTab = lazy(() => import('./tabs/StoreTab').then((m) => ({ default: m.StoreTab })));
const TournamentsTab = lazy(() => import('./tabs/TournamentsTab').then((m) => ({ default: m.TournamentsTab })));
const VenuesTab = lazy(() => import('./tabs/VenuesTab').then((m) => ({ default: m.VenuesTab })));
const MemberPortalTab = lazy(() => import('./tabs/MemberPortalTab').then((m) => ({ default: m.MemberPortalTab })));

const HUB_ALLOWED_ROLES = new Set(['SUPERADMIN', 'ADMIN', 'CAPTAIN', 'COACH', 'PLAYER', 'STAFF']);

const AdminTabLoadingFallback: React.FC = () => (
  <div className="space-y-6">
    <div className="dva-glass-panel rounded-3xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-2">
          <div className="dva-skeleton-bar h-5 w-48" />
          <div className="dva-skeleton-bar h-3 w-72 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <div className="dva-skeleton h-9 w-32 rounded-full" />
          <div className="dva-skeleton h-9 w-36 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="dva-skeleton p-4 h-36 rounded-2xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="dva-skeleton-bar w-10 h-10 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="dva-skeleton-bar h-3.5 w-32" />
                <div className="dva-skeleton-bar h-2.5 w-24" />
              </div>
            </div>
            <div className="dva-skeleton-bar h-3 w-full" />
            <div className="dva-skeleton-bar h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
    <SlowServerPill active />
  </div>
);

export interface AdminDashboardPageProps {
  currentUser: UserType;
  onOpenSheets: () => void;
  onUserChange?: (user: UserType) => void;
}

const AdminDashboardShell: React.FC = () => {
  const { isAdmin, isSuperAdmin, isCaptain, isMemberPortal, onOpenSheets, activeModule } =
    useAdminDashboard();
  const mainScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeModule]);

  return (
    <div className="dva-dashboard-shell relative h-[100dvh] bg-[#0B0D12] text-white flex overflow-hidden">
      {/* Warm Dark Ambient Mesh Lighting Layer (DVA Orange + Cherry Rose + Deep Amber) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-24 -left-16 w-[440px] h-[440px] rounded-full bg-orange-500/15 blur-[130px]" />
        <div className="absolute top-1/4 -right-24 w-[460px] h-[460px] rounded-full bg-rose-600/15 blur-[130px]" />
        <div className="absolute -bottom-28 left-1/3 w-[520px] h-[420px] rounded-full bg-amber-900/20 blur-[130px]" />
      </div>

      {/* Spatial Floating Pill Dock (Desktop left-4 pill + Mobile bottom pill + Glass drawer) */}
      <AdminSidebar />

      <div
        ref={mainScrollRef}
        className="relative z-10 flex-1 min-w-0 h-[100dvh] overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col"
      >
        {/* Top Floating Glass Bar */}
        <AdminHeader />

        {/* Main Workspace Body */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-28 md:pb-10 space-y-6">
          {/* Notification feedback */}
          <FeedbackBanner />

          {/* MODULE 1: ADMIN / SUPERADMIN OVERVIEW & ANALYTICS */}
          {activeModule === 'OVERVIEW' && isAdmin && <OverviewTab />}

          {/* SECONDARY & ROLE-SPECIFIC MODULES (Lazy-Loaded & Suspense-Wrapped) */}
          <Suspense fallback={<AdminTabLoadingFallback />}>
            {/* COACH / PLAYER / STAFF SPATIAL PORTAL */}
            {isMemberPortal && <MemberPortalTab />}

            {/* MODULE 2: COURTS CRUD, WEEKLY SCHEDULE & LIVE SLOT LOCK MANAGEMENT */}
            {activeModule === 'COURTS' && isSuperAdmin && <CourtsTab />}

            {/* MODULE 3: COURT BOOKINGS & PAYMENT APPROVAL */}
            {activeModule === 'BOOKINGS' && isSuperAdmin && <BookingsTab />}

            {/* MODULE 4: MEMBER APPLICATIONS & AUTO-PLAYER PROMOTION */}
            {activeModule === 'APPLICATIONS' && isAdmin && <ApplicationsTab />}

            {/* MODULE 5: SQUAD ROSTER CRUD WITH SEARCH */}
            {activeModule === 'PLAYERS' && isSuperAdmin && <PlayersTab />}

            {/* MODULE 6: ACADEMY COURSES & SCRIMMAGE TRAINEES */}
            {activeModule === 'TRAINING' && isSuperAdmin && <TrainingTab />}

            {/* MODULE 7: COACHING STAFF MANAGEMENT */}
            {activeModule === 'COACHES' && isSuperAdmin && <CoachesTab />}

            {/* MODULE 7B: HOME LEADERSHIP & OPERATIONS TEAM (SUPERADMIN only) */}
            {activeModule === 'LEADERSHIP' && isSuperAdmin && <LeadershipTab />}

            {/* MODULE 8: NEWS & STORY PUBLISHING */}
            {activeModule === 'NEWS' && isAdmin && <NewsTab />}

            {/* MODULE 9: USER ACCOUNT MANAGEMENT (SUPERADMIN only) */}
            {activeModule === 'USERS' && isSuperAdmin && <UsersTab />}

            {/* MODULE 10: GOOGLE SHEETS LIVE SYNC INSPECTOR */}
            {activeModule === 'SHEETS' && isSuperAdmin && <SheetsTab onOpenSheets={onOpenSheets} />}

            {/* MODULE 11: DVA STORE */}
            {activeModule === 'STORE' && isSuperAdmin && <StoreTab />}

            {/* MODULE 12: TOURNAMENTS */}
            {activeModule === 'TOURNAMENTS' && isAdmin && <TournamentsTab />}

            {/* MODULE 13: COURT MAP & VENUES (SUPERADMIN & CAPTAIN self-service) */}
            {(activeModule === 'VENUES' || activeModule === 'CAPTAIN_PROFILE') && (isSuperAdmin || isCaptain) && <VenuesTab />}
          </Suspense>
        </main>
      </div>

      {/* GUEST SESSION EMAIL MODAL */}
      {isSuperAdmin && (
        <Suspense fallback={null}>
          <GuestSessionEmailModal />
        </Suspense>
      )}

      {/* SELF-SERVICE CHANGE MY PASSWORD MODAL (All authenticated roles) */}
      <Suspense fallback={null}>
        <ChangePasswordModal />
      </Suspense>
    </div>
  );
};

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  currentUser,
  onOpenSheets,
  onUserChange,
}) => {
  const isHubAllowed = HUB_ALLOWED_ROLES.has(currentUser.role);
  if (!isHubAllowed) {
    return (
      <div className="min-h-screen bg-[#0B0D12] text-white py-24 text-center space-y-4">
        <Shield className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-slate-400 text-xs max-w-md mx-auto">
          Please sign in with an authorized DVA account from the profile menu to access the dashboard.
        </p>
        <Link
          to="/"
          className="inline-block px-5 py-2.5 bg-white text-slate-950 rounded-full text-xs font-bold hover:brightness-95"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <AdminDashboardProvider
      key={currentUser.id}
      currentUser={currentUser}
      onOpenSheets={onOpenSheets}
      onUserChange={onUserChange}
    >
      <AdminDashboardShell />
    </AdminDashboardProvider>
  );
};

export default AdminDashboardPage;
