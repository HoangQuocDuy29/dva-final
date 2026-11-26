import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AuthModal, getPostLoginPath } from './components/auth/AuthModal';
import { WaterRippleReveal, RippleOrigin } from './components/WaterRippleReveal';
import { HomePage } from './pages/HomePage';

const GoogleSheetsViewerModal = lazy(() =>
  import('./components/common/GoogleSheetsViewerModal').then((m) => ({ default: m.GoogleSheetsViewerModal }))
);
import { authService } from './services/api';
import { User } from './types';
import { BackToTop } from './components/common/BackToTop';
import { GlobalTopLoader, SlowServerPill } from './components/common/GlassLoading';

// Code Splitting / Lazy Loading cho các trang thứ cấp và module quản trị
const PlayersPage = lazy(() => import('./pages/PlayersPage').then((m) => ({ default: m.PlayersPage })));
const InformationPage = lazy(() => import('./pages/InformationPage').then((m) => ({ default: m.InformationPage })));
const TryoutPage = lazy(() => import('./pages/TryoutPage').then((m) => ({ default: m.TryoutPage })));
const SkillLevelsPage = lazy(() => import('./pages/SkillLevelsPage').then((m) => ({ default: m.SkillLevelsPage })));
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
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

// Spatial Glassmorphism Fallback Loader (keeps Sidebar + Header + KPI skeleton on Dashboard routes to eliminate CLS)
const PageLoadingFallback: React.FC = () => {
  const { pathname } = useLocation();
  if (isDashboardPath(pathname)) {
    return (
      <div className="min-h-[100dvh] bg-[#0B0D12] text-white flex overflow-hidden">
        {/* Desktop Floating Glass Sidebar Skeleton */}
        <aside className="hidden md:flex flex-col w-[220px] shrink-0 p-4 gap-3 border-r border-white/[0.06]">
          <div className="dva-skeleton h-12 rounded-2xl" />
          <div className="space-y-2 pt-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="dva-skeleton h-9 rounded-xl" />
            ))}
          </div>
        </aside>
        <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Top Header Skeleton */}
          <div className="dva-skeleton h-16 rounded-full" />
          {/* 4 KPI Skeleton Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="dva-skeleton p-5 h-32 rounded-3xl space-y-3">
                <div className="dva-skeleton-bar h-3 w-24" />
                <div className="dva-skeleton-bar h-7 w-36" />
                <div className="dva-skeleton-bar h-2.5 w-28" />
              </div>
            ))}
          </div>
          {/* Bento Workspace Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="dva-skeleton h-64 rounded-3xl lg:col-span-2" />
            <div className="dva-skeleton h-64 rounded-3xl" />
          </div>
          <SlowServerPill active />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[65vh] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col items-center gap-3">
        <div className="dva-skeleton h-6 w-40 rounded-full" />
        <div className="dva-skeleton h-10 w-72 sm:w-96 rounded-2xl" />
        <div className="dva-skeleton h-4 w-64 sm:w-80 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="dva-skeleton h-64 rounded-3xl" />
        ))}
      </div>
      <SlowServerPill active />
    </div>
  );
};

function ScrollToTop() {
  const { pathname, search } = useLocation();
  const prevPathRef = useRef<string | null>(null);
  useEffect(() => {
    const sameCourtMap = pathname === '/services/court-map' && prevPathRef.current === '/services/court-map';
    prevPathRef.current = pathname;
    if (sameCourtMap) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [pathname, search]);
  return null;
}

const RedirectPreserveQuery: React.FC<{ to: string }> = ({ to }) => {
  const location = useLocation();
  return <Navigate to={{ pathname: to, search: location.search }} replace />;
};

const isDashboardPath = (p: string) => p.startsWith('/admin') || p.startsWith('/dashboard');

const PublicNavbarGuard: React.FC<{ currentUser: User; onUserChange: (u: User) => void }> = (props) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return pathname === '/login' || isDashboardPath(pathname) ? null : <Navbar {...props} onOpenAuth={() => navigate('/login')} />;
};

const PublicFooterGuard: React.FC = () => {
  const { pathname } = useLocation();
  if (isDashboardPath(pathname) || pathname === '/login') return null;
  return <Footer />;
};

const MainShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const dash = isDashboardPath(pathname);
  return <main className={`relative flex-1 ${dash ? '' : 'pt-20 dva-public-canvas'}`}>{children}</main>;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(() => authService.getCurrentUser());
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);
  const [rippleOrigin, setRippleOrigin] = useState<RippleOrigin | null>(null);
  const handleRippleComplete = useCallback(() => setRippleOrigin(null), []);

  const handleUserChange = (user: User, origin?: RippleOrigin) => {
    if (origin) setRippleOrigin(origin);
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
      <GlobalTopLoader />
      <ScrollToTop />
      <div className="relative min-h-screen flex flex-col bg-[#0B0D12] text-white font-sans selection:bg-red-600 selection:text-white overflow-x-clip w-full max-w-full">
        {/* Global Public Spatial Ambient Mesh (DVA Orange + Cherry Red) */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 -left-20 w-[460px] h-[460px] rounded-full bg-orange-500 blur-[140px] opacity-20" />
          <div className="absolute top-1/3 -right-24 w-[480px] h-[480px] rounded-full bg-rose-600 blur-[140px] opacity-20" />
        </div>
        
        {/* Navbar (Clean international sports club navigation, no internal scripts/sheets buttons) */}
        <PublicNavbarGuard
          currentUser={currentUser}
          onUserChange={handleUserChange}
        />

        {/* Main Routes */}
        <MainShell>
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

              {/* Module 3: Information, Try-Out & USAV Skill Levels Subpages */}
              <Route path="/information" element={<InformationPage />} />
              <Route path="/information/try-out" element={<TryoutPage />} />
              <Route path="/information/skill-levels" element={<SkillLevelsPage />} />

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

              {/* Catch-all 404 Not Found */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </MainShell>

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

        {/* WebGL 3D Water Ripple & Circular Reveal Login Transition */}
        <WaterRippleReveal origin={rippleOrigin} onComplete={handleRippleComplete} />

      </div>
      <Analytics />
    </BrowserRouter>
  );
}
