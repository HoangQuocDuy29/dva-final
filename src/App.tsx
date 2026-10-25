import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AuthModal } from './components/auth/AuthModal';
import { GoogleSheetsViewerModal } from './components/common/GoogleSheetsViewerModal';
import { HomePage } from './pages/HomePage';
import { PlayersPage } from './pages/PlayersPage';
import { InformationPage } from './pages/InformationPage';
import { NewsPage } from './pages/NewsPage';
import { NewsDetailPage } from './pages/NewsDetailPage';
import { CourtBookingPage } from './pages/CourtBookingPage';
import { TrainingPage } from './pages/TrainingPage';
import { MemberRegisterPage } from './pages/MemberRegisterPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { authService } from './services/api';
import { User } from './types';
import { BackToTop } from './components/common/BackToTop';

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [pathname, search]);
  return null;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(() => authService.getCurrentUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);

  const handleUserChange = (user: User) => {
    setCurrentUser(user);
    authService.setCurrentUser(user);
  };

  // Re-validate the stored session with the server on load (the role shown in the UI must come from the server),
  // and sign out automatically whenever the API reports an expired/invalid token.
  useEffect(() => {
    const handleExpired = () => setCurrentUser(authService.logout());
    window.addEventListener('dva:session-expired', handleExpired);

    if (authService.getCurrentUser().role !== 'GUEST') {
      authService.me().then(setCurrentUser).catch(() => {
        // 401 is handled via the session-expired event; keep the UI as-is on network errors
      });
    }
    return () => window.removeEventListener('dva:session-expired', handleExpired);
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-[#0B0F19] text-white font-sans selection:bg-red-600 selection:text-white">
        
        {/* Navbar (Clean international sports club navigation, no internal scripts/sheets buttons) */}
        <Navbar
          currentUser={currentUser}
          onUserChange={handleUserChange}
          onOpenAuth={() => setAuthModalOpen(true)}
        />

        {/* Main Routes */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            
            {/* Module 2: Players */}
            <Route path="/players" element={<PlayersPage currentUser={currentUser} />} />
            <Route path="/players/:levelParam" element={<PlayersPage currentUser={currentUser} />} />
            <Route path="/senior" element={<Navigate to="/players/senior" replace />} />
            <Route path="/junior" element={<Navigate to="/players/junior" replace />} />
            <Route path="/youth" element={<Navigate to="/players/youth" replace />} />
            <Route path="/kid" element={<Navigate to="/players/youth" replace />} />

            {/* Module 3: Information */}
            <Route path="/information" element={<InformationPage />} />

            {/* Module 4: News */}
            <Route path="/news" element={<NewsPage currentUser={currentUser} />} />
            <Route path="/news/:id" element={<NewsDetailPage />} />

            {/* Module 5: Services */}
            <Route path="/services/court-booking" element={<CourtBookingPage />} />
            <Route path="/services/training" element={<TrainingPage />} />

            {/* Module 6: Member Registration */}
            <Route path="/register" element={<MemberRegisterPage />} />

            {/* Module 8: Admin Dedicated Dashboard */}
            <Route
              path="/admin/dashboard"
              element={
                <AdminDashboardPage
                  currentUser={currentUser}
                  onOpenSheets={() => setSheetsModalOpen(true)}
                />
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Professional Footer with Embedded Arena Map */}
        <Footer />

        {/* Authentication Modal */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={handleUserChange}
        />

        {/* Google Sheets Live Multi-Tab Viewer (Accessed via Admin Workspace) */}
        <GoogleSheetsViewerModal
          isOpen={sheetsModalOpen}
          onClose={() => setSheetsModalOpen(false)}
        />

        {/* Floating Back to Top Button */}
        <BackToTop />

      </div>
    </BrowserRouter>
  );
}
