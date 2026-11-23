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
const NewsTab = lazy(() => import('./tabs/NewsTab').then((m) => ({ default: m.NewsTab })));
const UsersTab = lazy(() => import('./tabs/UsersTab').then((m) => ({ default: m.UsersTab })));
const SheetsTab = lazy(() => import('./tabs/SheetsTab').then((m) => ({ default: m.SheetsTab })));
const StoreTab = lazy(() => import('./tabs/StoreTab').then((m) => ({ default: m.StoreTab })));
const TournamentsTab = lazy(() => import('./tabs/TournamentsTab').then((m) => ({ default: m.TournamentsTab })));
const VenuesTab = lazy(() => import('./tabs/VenuesTab').then((m) => ({ default: m.VenuesTab })));

const AdminTabLoadingFallback: React.FC = () => (
  <div className="min-h-[320px] rounded-3xl bg-[#111827] border border-[#1E293B] flex flex-col items-center justify-center gap-3 text-slate-400">
    <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-orange-500 animate-spin" />
    <span className="text-xs font-semibold tracking-wide">Loading workspace module...</span>
  </div>
);

export interface AdminDashboardPageProps {
  currentUser: UserType;
  onOpenSheets: () => void;
  onUserChange?: (user: UserType) => void;
}

const AdminDashboardShell: React.FC = () => {
  const { isSuperAdmin, isCaptain, onOpenSheets, activeModule } =
    useAdminDashboard();
  const mainScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeModule]);

  return (
    <div className="h-[calc(100vh-5rem)] bg-[#0B0F19] text-white flex overflow-hidden">
      {/* Collapsible grouped sidebar (desktop rail + mobile drawer) */}
      <AdminSidebar />

      <div
        ref={mainScrollRef}
        className="flex-1 min-w-0 h-[calc(100vh-5rem)] overflow-y-auto no-scrollbar flex flex-col"
      >
        {/* Sticky Topbar: toggles, module title, quick search, admin identity & actions */}
        <AdminHeader />

        {/* Main Workspace Body */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16 space-y-6">
          {/* Notification feedback */}
          <FeedbackBanner />

          {/* MODULE 1: OVERVIEW & METRICS */}
          {activeModule === 'OVERVIEW' && <OverviewTab />}

          {/* SECONDARY MODULES (Lazy-Loaded & Suspense-Wrapped) */}
          <Suspense fallback={<AdminTabLoadingFallback />}>
            {/* MODULE 2: COURTS CRUD, WEEKLY SCHEDULE & LIVE SLOT LOCK MANAGEMENT */}
            {activeModule === 'COURTS' && isSuperAdmin && <CourtsTab />}

            {/* MODULE 3: COURT BOOKINGS & PAYMENT APPROVAL */}
            {activeModule === 'BOOKINGS' && isSuperAdmin && <BookingsTab />}

            {/* MODULE 4: MEMBER APPLICATIONS & AUTO-PLAYER PROMOTION */}
            {activeModule === 'APPLICATIONS' && <ApplicationsTab />}

            {/* MODULE 5: SQUAD ROSTER CRUD WITH SEARCH */}
            {activeModule === 'PLAYERS' && isSuperAdmin && <PlayersTab />}

            {/* MODULE 6: ACADEMY COURSES & SCRIMMAGE TRAINEES */}
            {activeModule === 'TRAINING' && isSuperAdmin && <TrainingTab />}

            {/* MODULE 7: COACHING STAFF MANAGEMENT */}
            {activeModule === 'COACHES' && isSuperAdmin && <CoachesTab />}

            {/* MODULE 8: NEWS & STORY PUBLISHING */}
            {activeModule === 'NEWS' && <NewsTab />}

            {/* MODULE 9: USER ACCOUNT MANAGEMENT (SUPERADMIN only) */}
            {activeModule === 'USERS' && isSuperAdmin && <UsersTab />}

            {/* MODULE 10: GOOGLE SHEETS LIVE SYNC INSPECTOR */}
            {activeModule === 'SHEETS' && isSuperAdmin && <SheetsTab onOpenSheets={onOpenSheets} />}

            {/* MODULE 11: DVA STORE */}
            {activeModule === 'STORE' && isSuperAdmin && <StoreTab />}

            {/* MODULE 12: TOURNAMENTS */}
            {activeModule === 'TOURNAMENTS' && <TournamentsTab />}

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

      {/* SELF-SERVICE CHANGE MY PASSWORD MODAL (All authenticated admins) */}
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
  const isHubAllowed = currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN' || currentUser.role === 'CAPTAIN';
  if (!isHubAllowed) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white py-24 text-center space-y-4">
        <Shield className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold">
          Access Restricted to Club Administrators
        </h2>
        <p className="text-slate-400 text-xs max-w-md mx-auto">
          Please sign in with a SUPERADMIN or ADMIN account from the profile menu to access the workspace.
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
