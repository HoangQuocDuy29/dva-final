import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Menu, 
  X, 
  ChevronDown, 
  UserPlus,
  LogOut,
  LayoutDashboard,
  CalendarDays,
  Users,
  ShoppingBag
} from 'lucide-react';
import { User as UserType } from '../../types';
import { authService } from '../../services/api';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

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
  const { t, i18n } = useTranslation('common');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Scroll detection with passive listener and unmount cleanup
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Close menus on route change & auto-expand mobile accordion on service pages
  useEffect(() => {
    setMobileMenuOpen(false);
    setServicesDropdownOpen(false);
    if (location.pathname.startsWith('/services')) {
      setMobileServicesOpen(true);
    }
  }, [location.pathname]);

  // Cleanup hover timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleServicesMouseEnter = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setServicesDropdownOpen(true);
  };

  const handleServicesMouseLeave = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = window.setTimeout(() => {
      setServicesDropdownOpen(false);
    }, 150);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (servicesRef.current && !servicesRef.current.contains(event.target as Node)) {
        setServicesDropdownOpen(false);
      }
    };
    if (userDropdownOpen || servicesDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen, servicesDropdownOpen]);

  const primaryNavLinks = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.players'), path: '/players' },
  ];

  const secondaryNavLinks = [
    { label: t('nav.shop', 'Shop'), path: '/shop' },
    { label: t('nav.clubInfo', 'Information'), path: '/information' },
    { label: t('nav.news'), path: '/news' },
  ];

  const serviceItems = [
    {
      title: t('nav.courtBooking', 'Court Booking'),
      subtitle: 'Reserve indoor courts & practice slots',
      path: '/services/court-booking',
      icon: CalendarDays,
    },
    {
      title: t('nav.training', 'Training & Scrimmage'),
      subtitle: 'Coaching clinics & weekly open games',
      path: '/services/training-scrimmage',
      icon: Users,
    },
    {
      title: t('nav.shop', 'Shop'),
      subtitle: 'Official jerseys, custom printing & gear',
      path: '/shop',
      icon: ShoppingBag,
    },
  ];

  const isServicesActive =
    location.pathname.startsWith('/services') ||
    location.pathname.startsWith('/booking') ||
    location.pathname.startsWith('/court-booking') ||
    location.pathname.startsWith('/training');

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const compactNav = isScrolled && !isAdminRoute;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none ${
        compactNav ? 'pt-3 px-4 sm:px-6' : 'pt-0 px-0'
      }`}
    >
      {/* Khối Navbar chính (Inner Capsule): Single Container tránh giật layout */}
      <div
        className={`pointer-events-auto transition-[background-color,box-shadow,border-color] duration-300 ease-out flex items-center justify-between w-full gap-2 sm:gap-3 md:gap-2.5 lg:gap-5 ${
          isAdminRoute
            ? 'max-w-none rounded-none h-20 border-b border-[#1E293B] bg-[#0B0F19] px-4 sm:px-6 lg:px-8'
            : compactNav
              ? 'max-w-6xl rounded-2xl h-14 border border-slate-700/60 shadow-2xl shadow-black/50 bg-[#0B0F19]/95 px-4 sm:px-6'
              : 'max-w-7xl rounded-none h-20 border-b border-slate-800/80 bg-[#0B0F19] px-4 sm:px-6 lg:px-8'
        }`}
      >
        {/* Brand Wordmark & Dynamic Logo Slot */}
        <Link to="/" className="flex items-center gap-2 sm:gap-2.5 text-white group whitespace-nowrap shrink-0">
          <div
            className={`overflow-hidden bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-lg shadow-red-900/30 group-hover:scale-105 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 relative ${
              compactNav ? 'w-8 h-8 rounded-xl' : 'w-9 h-9 sm:w-10 sm:h-10 rounded-2xl'
            }`}
          >
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
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
            <span
              className={`font-heading font-black tracking-tight text-white flex items-center gap-1 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                compactNav ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
              }`}
            >
              DVA <span className="text-orange-500">VOLLEYBALL</span>
            </span>
            <span
              className={`tracking-widest text-slate-400 uppercase font-bold transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                compactNav ? 'text-[8px] leading-tight' : 'text-[9px] sm:text-[10px] leading-normal'
              }`}
            >
              {t('nav.sportsArena')}
            </span>
          </div>
        </Link>

        {/* Public Nav Links (Tablet & Desktop: responsive gap & font size) */}
        <nav
          className={`hidden md:flex items-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] font-semibold shrink-0 ${
            compactNav
              ? 'gap-2 lg:gap-3 xl:gap-4 text-xs lg:text-[13px]'
              : 'gap-2.5 lg:gap-5 xl:gap-6 text-xs lg:text-sm'
          }`}
        >
          {primaryNavLinks.map((link) => (
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

          {/* Services Hover Dropdown */}
          <div
            ref={servicesRef}
            className="relative"
            onMouseEnter={handleServicesMouseEnter}
            onMouseLeave={handleServicesMouseLeave}
          >
            <button
              type="button"
              onClick={() => setServicesDropdownOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer relative ${
                isServicesActive || servicesDropdownOpen
                  ? 'text-white font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
              aria-expanded={servicesDropdownOpen}
              aria-haspopup="true"
            >
              <span>{t('nav.services', i18n.language?.startsWith('vi') ? 'Dịch vụ' : 'Services')}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  servicesDropdownOpen ? 'rotate-180 text-orange-400' : 'text-slate-400'
                }`}
              />
              {isServicesActive && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-full" />
              )}
            </button>

            {/* Desktop Dropdown Flyout */}
            {servicesDropdownOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2.5 z-50 w-72 lg:w-80 animate-in fade-in zoom-in-95 duration-150">
                <div className="rounded-2xl backdrop-blur-md bg-[#0B0E14]/95 border border-white/10 shadow-2xl shadow-black/80 p-2 space-y-1">
                  {serviceItems.map((item) => {
                    const ItemIcon = item.icon;
                    const itemActive = location.pathname.startsWith(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setServicesDropdownOpen(false)}
                        className={`group flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 ${
                          itemActive
                            ? 'bg-white/[0.08] text-white'
                            : 'hover:bg-white/[0.05] text-slate-200 hover:text-white'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200 ${
                            itemActive
                              ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-orange-500/50 text-orange-400 shadow-sm'
                              : 'bg-white/[0.03] border-white/10 text-slate-400 group-hover:border-orange-500/40 group-hover:text-orange-400 group-hover:bg-orange-500/10'
                          }`}
                        >
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold leading-tight group-hover:text-orange-400 transition-colors">
                            {item.title}
                          </span>
                          <span className="text-[11px] text-slate-400 leading-tight mt-0.5 truncate">
                            {item.subtitle}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {secondaryNavLinks.map((link) => (
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
        <div className="relative z-30 pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Segmented Pill Language Switcher (Visible on both Mobile Topbar & Desktop) */}
          <LanguageSwitcher />

          {/* User Account / Role Pill (Desktop & Tablet) — hidden on /admin/* routes to avoid duplicate profile header */}
          {!isAdminRoute && (
          <div ref={dropdownRef} className="relative shrink-0">
            {currentUser.role === 'GUEST' ? (
              <button
                onClick={onOpenAuth}
                className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold rounded-xl border border-slate-700 bg-[#161F30] text-slate-200 hover:bg-slate-800 transition-all duration-300 cursor-pointer shrink-0 ${
                  isScrolled ? 'px-2.5 py-1 text-xs' : 'px-3 sm:px-3.5 py-2 text-xs'
                }`}
              >
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{t('nav.signIn')}</span>
              </button>
            ) : (
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className={`flex items-center gap-1.5 text-xs font-semibold rounded-xl border transition-all duration-300 cursor-pointer shadow-sm shrink-0 ${
                  isScrolled ? 'px-2.5 py-1 text-xs' : 'px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs'
                } ${
                  isAdmin 
                    ? 'border-red-800 bg-red-950/40 text-red-200 hover:bg-red-950/70' 
                    : 'border-slate-700 bg-[#161F30] text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span className={`px-1.5 py-0.5 text-[9px] rounded uppercase font-bold font-mono border shrink-0 ${
                  currentUser.role === 'SUPERADMIN' 
                    ? 'bg-red-900 text-red-200 border-red-700'
                    : currentUser.role === 'ADMIN'
                    ? 'bg-amber-900 text-amber-200 border-amber-700'
                    : 'bg-blue-900 text-blue-200 border-blue-700'
                }`}>
                  {currentUser.role}
                </span>
                <span className={`${isScrolled ? 'max-w-[60px] sm:max-w-[80px]' : 'max-w-[70px] sm:max-w-[100px]'} truncate text-white`}>
                  {currentUser.fullName.split(' ').slice(-1)[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            )}

            {userDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 sm:w-72 bg-[#121826] border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 text-xs animate-in fade-in"
              >
                <div className="px-4 py-2.5 border-b border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">{t('nav.loggedInAs')}</div>
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
                      <span>{t('nav.openAdminDashboard')}</span>
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
                    <span>{t('nav.signOut')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Primary CTA Button: Join DVA */}
          <Link
            to="/register"
            className={`hidden sm:inline-flex text-white bg-gradient-to-r from-red-600 to-orange-500 rounded-xl hover:brightness-110 shadow-lg shadow-red-900/30 hover:scale-[1.02] transition-all duration-300 whitespace-nowrap shrink-0 items-center gap-1.5 ${
              isScrolled
                ? 'px-3.5 py-1.5 text-xs font-semibold'
                : 'px-4 sm:px-5 py-2.5 text-xs font-bold'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span>{t('nav.joinDva')}</span>
          </Link>

          {/* Mobile hamburger button (< 768px: md:hidden) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className={`md:hidden rounded-xl bg-[#161F30] border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-all duration-300 shrink-0 ${
              isScrolled ? 'w-8 h-8 min-w-[32px] min-h-[32px]' : 'w-10 h-10 min-w-[40px] min-h-[40px]'
            }`}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          className={`w-full md:hidden pointer-events-auto transition-all duration-300 ease-out animate-in slide-in-from-top-2 max-h-[calc(100vh-5rem)] overflow-y-auto ${
            isScrolled
              ? 'mt-2 max-w-6xl rounded-2xl bg-[#0F1420] border border-slate-700/60 shadow-2xl p-4 space-y-3'
              : 'max-w-7xl rounded-b-2xl bg-[#0F1420] border-x border-b border-slate-800 px-4 pt-4 pb-6 space-y-3 shadow-2xl'
          }`}
        >
          
          {/* User status in mobile drawer if logged in (hidden on /admin/* routes) */}
          {!isAdminRoute && (currentUser.role !== 'GUEST' ? (
            <div className="p-3 bg-[#161F30] rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 font-medium">{t('nav.loggedInAs')}</div>
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
                <span>{t('nav.signInPortal')}</span>
              </button>
            </div>
          ))}

          {/* Navigation Links list */}
          <div className="space-y-1">
            {primaryNavLinks.map((link) => (
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

            {/* Mobile Accordion for Services */}
            <div>
              <button
                type="button"
                onClick={() => setMobileServicesOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  isServicesActive
                    ? 'bg-gradient-to-r from-red-950/60 to-orange-950/40 text-white font-bold border-l-4 border-orange-500'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
                aria-expanded={mobileServicesOpen}
              >
                <span>{t('nav.services', i18n.language?.startsWith('vi') ? 'Dịch vụ' : 'Services')}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    mobileServicesOpen ? 'rotate-180 text-orange-400' : 'text-slate-400'
                  }`}
                />
              </button>

              {mobileServicesOpen && (
                <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-800 space-y-1 animate-in fade-in duration-150">
                  {serviceItems.map((item) => {
                    const ItemIcon = item.icon;
                    const itemActive = location.pathname.startsWith(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors ${
                          itemActive
                            ? 'bg-red-950/80 text-white font-bold border-l-2 border-red-500'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                            itemActive
                              ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                              : 'bg-white/[0.03] border-white/10 text-slate-400'
                          }`}
                        >
                          <ItemIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-xs leading-tight text-white">
                            {item.title}
                          </span>
                          <span className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">
                            {item.subtitle}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {secondaryNavLinks.map((link) => (
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
                <span>{t('nav.goToAdminDashboard')}</span>
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
                <span>{t('nav.signOut')}</span>
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
              {t('nav.applyTryouts')}
            </Link>
          </div>

          {/* Mobile Drawer Footer: Language Switcher */}
          <div className="relative z-30 pointer-events-auto pt-3 border-t border-slate-800/80 flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-400 select-none">
              {t('nav.language')}
            </span>
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </header>
  );
};
