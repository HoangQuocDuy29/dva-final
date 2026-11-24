import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AuthModal, getPostLoginPath } from './components/auth/AuthModal';
import { HomePage } from './pages/HomePage';

const GoogleSheetsViewerModal = lazy(() =>
  import('./components/common/GoogleSheetsViewerModal').then((m) => ({ default: m.GoogleSheetsViewerModal }))
);
import { authService } from './services/api';
import { User } from './types';
import { BackToTop } from './components/common/BackToTop';

// Code Splitting / Lazy Loading cho các trang thứ cấp và module quản trị
const PlayersPage = lazy(() => import('./pages/PlayersPage').then((m) => ({ default: m.PlayersPage })));
const InformationPage = lazy(() => import('./pages/InformationPage').then((m) => ({ default: m.InformationPage })));
const TryoutPage = lazy(() => import('./pages/TryoutPage').then((m) => ({ default: m.TryoutPage })));
const NewsPage = lazy(() => import('./pages/NewsPage').then((m) => ({ default: m.NewsPage })));
const NewsDetailPage = lazy(() => import('./pages/NewsDetailPage').then((m) => ({ default: m.NewsDetailPage })));
const CourtBookingPage = lazy(() => import('./pages/CourtBookingPage').then((m) => ({ default: m.CourtBookingPage })));
const CourtMapPage = lazy(() => import('./pages/CourtMapPage').then((m) => ({ default: m.CourtMapPage })));
const CourtClubDetailPage = lazy(() =>
  import('./pages/CourtClubDetailPage').then((m) => ({ default: m.CourtClubDetailPage }))
);
const TrainingPage = lazy(() => import('./pages/TrainingPage').then((m) => ({ default: m.TrainingPage })));
const ShopPage = lazy(() => import('./pages/ShopPage').then((m) => ({ default: m.ShopPage })));
const TournamentsPage = lazy(() => import('./pages/TournamentsPage').then((m) => ({ default: m.TournamentsPage })));
const MemberRegisterPage = lazy(() => import('./pages/MemberRegisterPage').then((m) => ({ default: m.MemberRegisterPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));

// Fallback loader chuẩn phong cách Dark Theme DVA (tránh giật trắng màn hình khi tải trang)
const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-[#0B0F19] text-white">
    <div className="relative flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-2 border-slate-800 border-t-orange-500 animate-spin" />
      <div className="absolute w-6 h-6 rounded-full bg-orange-500/20 animate-pulse" />
    </div>
    <div className="flex flex-col items-center gap-1">
      <p className="text-sm font-semibold tracking-wide text-slate-300">Loading page...</p>
      <p className="text-xs text-slate-500 font-medium">DVA Sports Club</p>
    </div>
  </div>
);

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [pathname, search]);
  return null;
}

const RedirectPreserveQuery: React.FC<{ to: string }> = ({ to }) => {
  const location = useLocation();
  return <Navigate to={{ pathname: to, search: location.search }} replace />;
};

const PublicNavbarGuard: React.FC<{ currentUser: User; onUserChange: (u: User) => void }> = (props) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return pathname === '/login' ? null : <Navbar {...props} onOpenAuth={() => navigate('/login')} />;
};

const PublicFooterGuard: React.FC = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin') || pathname === '/login') return null;
  return <Footer />;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(() => authService.getCurrentUser());
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
      <div className="min-h-screen flex flex-col bg-[#0B0F19] text-white font-sans selection:bg-red-600 selection:text-white overflow-x-clip w-full max-w-full">
        
        {/* Navbar (Clean international sports club navigation, no internal scripts/sheets buttons) */}
        <PublicNavbarGuard
          currentUser={currentUser}
          onUserChange={handleUserChange}
        />

        {/* Main Routes */}
        <main className="flex-1 pt-20">
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              
              {/* Module 2: Players */}
              <Route path="/players" element={<PlayersPage currentUser={currentUser} />} />
              <Route path="/players/:levelParam" element={<PlayersPage currentUser={currentUser} />} />
              <Route path="/senior" element={<Navigate to="/players/senior" replace />} />
              <Route path="/junior" element={<Navigate to="/players/junior" replace />} />
              <Route path="/youth" element={<Navigate to="/players/youth" replace />} />
              <Route path="/kid" element={<Navigate to="/players/youth" replace />} />

              {/* Module 3: Information & Try-Out Subpage */}
              <Route path="/information" element={<InformationPage />} />
              <Route path="/information/try-out" element={<TryoutPage />} />

              {/* Module 4: News */}
              <Route path="/news" element={<NewsPage currentUser={currentUser} />} />
              <Route path="/news/:id" element={<NewsDetailPage />} />

              {/* Module 5: Services & DVA Shop */}
              <Route path="/services/court-booking" element={<CourtBookingPage />} />
              <Route path="/services/court-map" element={<CourtMapPage />} />
              <Route path="/services/court-map/teams/:slug" element={<CourtClubDetailPage />} />
              <Route path="/services/training-scrimmage" element={<TrainingPage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/shop/:categorySlug/:productSlug" element={<ShopPage />} />
              <Route path="/services/shop" element={<ShopPage />} />

              {/* Module 7: Tournaments & Leagues */}
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/tournaments/:slug" element={<TournamentsPage />} />
              <Route path="/tournaments/:slug/:subView" element={<TournamentsPage />} />

              {/* Automatic Redirects for Legacy Service URLs */}
              <Route path="/booking" element={<RedirectPreserveQuery to="/services/court-booking" />} />
              <Route path="/court-booking" element={<RedirectPreserveQuery to="/services/court-booking" />} />
              <Route path="/court-map" element={<RedirectPreserveQuery to="/services/court-map" />} />
              <Route path="/training" element={<RedirectPreserveQuery to="/services/training-scrimmage" />} />
              <Route path="/services/training" element={<RedirectPreserveQuery to="/services/training-scrimmage" />} />
              <Route path="/store" element={<RedirectPreserveQuery to="/shop" />} />

              {/* Module 6: Member Registration */}
              <Route path="/register" element={<MemberRegisterPage />} />

              {/* Dedicated Login & Admin Routes */}
              <Route path="/login" element={currentUser.role !== 'GUEST' ? <Navigate to={getPostLoginPath(currentUser.role)} replace /> : <AuthModal isOpen mode="page" onClose={() => {}} onSuccess={handleUserChange} />} />
              <Route path="/admin" element={<Navigate to={currentUser.role === 'GUEST' ? '/login' : getPostLoginPath(currentUser.role)} replace />} />
              <Route
                path="/admin/dashboard"
                element={currentUser.role === 'GUEST' ? <Navigate to="/login" replace /> : (
                  <AdminDashboardPage
                    currentUser={currentUser}
                    onOpenSheets={() => setSheetsModalOpen(true)}
                    onUserChange={handleUserChange}
                  />
                )}
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        {/* Professional Footer with Embedded Arena Map (Hidden on /admin/* routes) */}
        <PublicFooterGuard />

        {/* Google Sheets Live Multi-Tab Viewer (Lazy-loaded on demand) */}
        {sheetsModalOpen && (
          <Suspense fallback={null}>
            <GoogleSheetsViewerModal
              isOpen={sheetsModalOpen}
              onClose={() => setSheetsModalOpen(false)}
            />
          </Suspense>
        )}

        {/* Floating Back to Top Button */}
        <BackToTop />

      </div>
      <Analytics />
    </BrowserRouter>
  );
}
