import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { User as UserType } from '../../types';
import {
  AdminDashboardProvider,
  useAdminDashboard,
} from './context/AdminDashboardContext';
import { AdminHeader } from './layout/AdminHeader';
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

export interface AdminDashboardPageProps {
  currentUser: UserType;
  onOpenSheets: () => void;
}

const AdminDashboardShell: React.FC = () => {
  const { isAdmin, isSuperAdmin, onOpenSheets, activeModule } =
    useAdminDashboard();

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
    <div className="min-h-screen bg-[#0B0F19] text-white">
      {/* Dedicated Admin Portal Header & Tab Navigation */}
      <AdminHeader />

      {/* Main Workspace Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
      </div>

      {/* GUEST SESSION EMAIL MODAL */}
      <GuestSessionEmailModal />
    </div>
  );
};

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  currentUser,
  onOpenSheets,
}) => {
  return (
    <AdminDashboardProvider
      currentUser={currentUser}
      onOpenSheets={onOpenSheets}
    >
      <AdminDashboardShell />
    </AdminDashboardProvider>
  );
};

export default AdminDashboardPage;
