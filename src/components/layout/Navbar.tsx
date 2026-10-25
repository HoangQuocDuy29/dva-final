import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  User, 
  Menu, 
  X, 
  ChevronDown, 
  UserPlus,
  LogOut,
  Shield,
  ShieldCheck,
  LayoutDashboard
} from 'lucide-react';
import { User as UserType, UserRole } from '../../types';
import { authService } from '../../services/api';

interface NavbarProps {
  currentUser: UserType;
  onUserChange: (user: UserType) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentUser, 
  onUserChange, 
  onOpenAuth 
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen]);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Players', path: '/players' },
    { label: 'Court Booking', path: '/services/court-booking' },
    { label: 'Training & Scrimmage', path: '/services/training' },
    { label: 'Club Info & Fees', path: '/information' },
    { label: 'News', path: '/news' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN';

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-800 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2 sm:gap-4 md:gap-3 lg:gap-8">
        
        {/* Brand Wordmark & Dynamic Logo Slot */}
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 text-white group whitespace-nowrap shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-lg shadow-red-900/30 group-hover:scale-105 transition-transform shrink-0 relative">
            <img
              src="/logo.png"
              alt="DVA Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
                const fallback = (e.target as HTMLElement).nextElementSibling;
                if (fallback) (fallback as HTMLElement).style.display = 'flex';
              }}
            />
            <div className="hidden items-center justify-center w-full h-full text-white">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m4.93 4.93 4.24 4.24" />
                <path d="m14.83 9.17 4.24-4.24" />
                <path d="m14.83 14.83 4.24 4.24" />
                <path d="m9.17 14.83-4.24 4.24" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-black text-lg sm:text-xl tracking-tight text-white flex items-center gap-1">
              DVA <span className="text-orange-500">VOLLEYBALL</span>
            </span>
            <span className="text-[9px] sm:text-[10px] tracking-widest text-slate-400 uppercase font-bold"> Sports Arena</span>
          </div>
        </Link>

        {/* Public Nav Links (Tablet & Desktop: responsive gap & font size) */}
        <nav className="hidden md:flex items-center gap-2.5 lg:gap-6 xl:gap-7 text-xs lg:text-sm font-semibold">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
                isActive(link.path)
                  ? 'text-white font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {link.label}
              {isActive(link.path) && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-full" />
              )}
            </Link>
          ))}
        </nav>

        {/* Action Area */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* User Account / Role Pill (Desktop & Tablet) */}
          <div ref={dropdownRef} className="relative">
            {currentUser.role === 'GUEST' ? (
              <button
                onClick={onOpenAuth}
                className="hidden sm:flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-700 bg-[#161F30] text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Sign In</span>
              </button>
            ) : (
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer shadow-sm ${
                  isAdmin 
                    ? 'border-red-800 bg-red-950/40 text-red-200 hover:bg-red-950/70' 
                    : 'border-slate-700 bg-[#161F30] text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span className={`px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] rounded uppercase font-bold font-mono border ${
                  currentUser.role === 'SUPERADMIN' 
                    ? 'bg-red-900 text-red-200 border-red-700'
                    : currentUser.role === 'ADMIN'
                    ? 'bg-amber-900 text-amber-200 border-amber-700'
                    : 'bg-blue-900 text-blue-200 border-blue-700'
                }`}>
                  {currentUser.role}
                </span>
                <span className="max-w-[70px] sm:max-w-[110px] truncate text-white">{currentUser.fullName.split(' ').slice(-1)[0]}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-[#121826] border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 text-xs animate-in fade-in">
                <div className="px-4 py-2.5 border-b border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">Logged in as:</div>
                  <div className="font-bold text-white text-sm">{currentUser.fullName}</div>
                  <div className="text-slate-400 text-[11px]">{currentUser.email}</div>
                </div>

                {/* If Admin or SuperAdmin, quick link to dedicated dashboard */}
                {isAdmin && (
                  <div className="p-2 border-b border-slate-800">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        navigate('/admin/dashboard');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold flex items-center gap-2 hover:brightness-110 shadow cursor-pointer"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Open Admin Dashboard</span>
                    </button>
                  </div>
                )}

                <div className="p-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      const guest = authService.logout();
                      onUserChange(guest);
                      setUserDropdownOpen(false);
                      navigate('/');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-red-400 hover:bg-red-950/40 hover:text-red-300 font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Primary CTA Button: Join DVA (Hidden on mobile < 640px to leave space for hamburger) */}
          <Link
            to="/register"
            className="hidden sm:inline-flex px-3.5 sm:px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-orange-500 rounded-xl hover:brightness-110 shadow-lg shadow-red-900/30 hover:scale-[1.02] transition-all whitespace-nowrap shrink-0 items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Join DVA</span>
          </Link>

          {/* Mobile hamburger button (< 768px: md:hidden) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="md:hidden w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-[#161F30] border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu (Mobile Sheet trượt xuống/trượt ngang) */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0F1420]/98 backdrop-blur-xl border-t border-slate-800 px-4 pt-4 pb-6 space-y-3 shadow-2xl animate-in slide-in-from-top-3 duration-200">
          
          {/* User status in mobile drawer if logged in */}
          {currentUser.role !== 'GUEST' ? (
            <div className="p-3 bg-[#161F30] rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 font-medium">Logged in as:</div>
                <div className="font-bold text-white text-xs">{currentUser.fullName}</div>
                <div className="text-[10px] text-slate-400">{currentUser.email}</div>
              </div>
              <span className={`px-2 py-0.5 text-[10px] rounded uppercase font-bold font-mono border ${
                currentUser.role === 'SUPERADMIN' 
                  ? 'bg-red-900 text-red-200 border-red-700'
                  : currentUser.role === 'ADMIN'
                  ? 'bg-amber-900 text-amber-200 border-amber-700'
                  : 'bg-blue-900 text-blue-200 border-blue-700'
              }`}>
                {currentUser.role}
              </span>
            </div>
          ) : (
            <div className="pb-1">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="w-full py-2.5 px-4 text-xs font-bold text-center text-slate-200 bg-[#161F30] border border-slate-700 hover:bg-slate-800 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <User className="w-4 h-4 text-orange-400" />
                <span>Sign In to Member Portal</span>
              </button>
            </div>
          )}

          {/* Navigation Links list */}
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive(link.path)
                    ? 'bg-gradient-to-r from-red-950/90 to-orange-950/70 text-white font-bold border-l-4 border-red-500'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Admin Dashboard shortcut if admin */}
          {isAdmin && (
            <div className="pt-2">
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 px-4 text-xs font-bold text-center text-white bg-red-950/90 hover:bg-red-900 border border-red-700 rounded-xl flex items-center justify-center gap-2 shadow"
              >
                <LayoutDashboard className="w-4 h-4 text-red-400" />
                <span>Go to Admin Dashboard</span>
              </Link>
            </div>
          )}

          {/* Sign out button in drawer if logged in */}
          {currentUser.role !== 'GUEST' && (
            <div>
              <button
                onClick={() => {
                  const guest = authService.logout();
                  onUserChange(guest);
                  setMobileMenuOpen(false);
                  navigate('/');
                }}
                className="w-full py-2 px-3 text-xs font-semibold text-red-400 hover:bg-red-950/40 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* Primary CTA in drawer */}
          <div className="pt-2 border-t border-slate-800">
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3 px-4 text-xs font-bold text-center text-white bg-gradient-to-r from-red-600 to-orange-500 rounded-xl block shadow-lg shadow-red-900/30"
            >
              Apply for DVA Squad Tryouts
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
