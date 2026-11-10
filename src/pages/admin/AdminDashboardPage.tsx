import React from 'react';
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
import { GuestSessionEmailModal } from './components/GuestSessionEmailModal';
import { OverviewTab } from './tabs/OverviewTab';
import { CourtsTab } from './tabs/CourtsTab';
import { BookingsTab } from './tabs/BookingsTab';
import { ApplicationsTab } from './tabs/ApplicationsTab';
import { PlayersTab } from './tabs/PlayersTab';
import { TrainingTab } from './tabs/TrainingTab';
import { CoachesTab } from './tabs/CoachesTab';
import { NewsTab } from './tabs/NewsTab';
import { UsersTab } from './tabs/UsersTab';
import { SheetsTab } from './tabs/SheetsTab';
import { StoreTab } from './tabs/StoreTab';
import { TournamentsTab } from './tabs/TournamentsTab';

export interface AdminDashboardPageProps {
  currentUser: UserType;
  onOpenSheets: () => void;
  onUserChange?: (user: UserType) => void;
}

const AdminDashboardShell: React.FC = () => {
  const { isAdmin, isSuperAdmin, onOpenSheets, activeModule } =
    useAdminDashboard();
  const mainScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeModule]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white py-24 text-center space-y-4">
        <Shield className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold">
          Access Restricted to Club Administrators
        </h2>
        <p className="text-slate-400 text-xs max-w-md mx-auto">
          Please switch to SUPERADMIN (Hoang Quoc Duy) or ADMIN (Tran Minh Tuan)
          from the profile menu to access the workspace.
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
    <div className="h-[calc(100vh-5rem)] bg-[#0B0F19] text-white flex overflow-hidden">
      {/* Collapsible grouped sidebar (desktop rail + mobile drawer) */}
      <AdminSidebar />

      <div
        ref={mainScrollRef}
        className="flex-1 min-w-0 h-[calc(100vh-5rem)] overflow-y-auto flex flex-col"
      >
        {/* Sticky Topbar: toggles, module title, quick search, admin identity & actions */}
        <AdminHeader />

        {/* Main Workspace Body */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16 space-y-6">
          {/* Notification feedback */}
          <FeedbackBanner />

          {/* MODULE 1: OVERVIEW & METRICS */}
          {activeModule === 'OVERVIEW' && <OverviewTab />}

          {/* MODULE 2: COURTS CRUD, WEEKLY SCHEDULE & LIVE SLOT LOCK MANAGEMENT */}
          {activeModule === 'COURTS' && <CourtsTab />}

          {/* MODULE 3: COURT BOOKINGS & PAYMENT APPROVAL */}
          {activeModule === 'BOOKINGS' && <BookingsTab />}

          {/* MODULE 4: MEMBER APPLICATIONS & AUTO-PLAYER PROMOTION */}
          {activeModule === 'APPLICATIONS' && <ApplicationsTab />}

          {/* MODULE 5: SQUAD ROSTER CRUD WITH SEARCH */}
          {activeModule === 'PLAYERS' && <PlayersTab />}

          {/* MODULE 6: ACADEMY COURSES & SCRIMMAGE TRAINEES */}
          {activeModule === 'TRAINING' && <TrainingTab />}

          {/* MODULE 7: COACHING STAFF MANAGEMENT */}
          {activeModule === 'COACHES' && <CoachesTab />}

          {/* MODULE 8: NEWS & STORY PUBLISHING */}
          {activeModule === 'NEWS' && <NewsTab />}

          {/* MODULE 9: USER ACCOUNT MANAGEMENT (SUPERADMIN only) */}
          {activeModule === 'USERS' && isSuperAdmin && <UsersTab />}

          {/* MODULE 10: GOOGLE SHEETS LIVE SYNC INSPECTOR */}
          {activeModule === 'SHEETS' && <SheetsTab onOpenSheets={onOpenSheets} />}

          {/* MODULE 11: DVA STORE (Phase 2 placeholder) */}
          {activeModule === 'STORE' && <StoreTab />}

          {/* MODULE 12: TOURNAMENTS (Coming Soon) */}
          {activeModule === 'TOURNAMENTS' && <TournamentsTab />}
        </main>
      </div>

      {/* GUEST SESSION EMAIL MODAL */}
      <GuestSessionEmailModal />
    </div>
  );
};

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  currentUser,
  onOpenSheets,
  onUserChange,
}) => {
  return (
    <AdminDashboardProvider
      currentUser={currentUser}
      onOpenSheets={onOpenSheets}
      onUserChange={onUserChange}
    >
      <AdminDashboardShell />
    </AdminDashboardProvider>
  );
};

export default AdminDashboardPage;
