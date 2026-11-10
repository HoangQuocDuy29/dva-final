import React, { useEffect } from 'react';
import { Shield, X, LogOut } from 'lucide-react';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { getAdminNavBadges, getVisibleNavGroups } from '../constants';
import { useAdminMetrics } from '../hooks/useAdminMetrics';
import { AdminNavItem } from '../types';

/**
 * Collapsible grouped sidebar (Spec 005).
 * - lg+: fixed rail, expanded (w-64) or collapsed icon-only (w-[72px])
 * - <lg: off-canvas drawer controlled by `isMobileNavOpen`
 */
export const AdminSidebar: React.FC = () => {
  const {
    activeModule,
    setActiveModule,
    isSuperAdmin,
    isSidebarCollapsed,
    isMobileNavOpen,
    setIsMobileNavOpen,
    handleLogout,
  } = useAdminDashboard();
  const metrics = useAdminMetrics();
  const badges = getAdminNavBadges(metrics);
  const groups = getVisibleNavGroups(isSuperAdmin);

  useEffect(() => {
    if (!isMobileNavOpen) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobileNavOpen, setIsMobileNavOpen]);

  const renderNav = (collapsed: boolean) => (
    <nav
      aria-label="Admin modules"
      className="flex-1 overflow-y-auto py-4 space-y-5 scrollbar-none no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      {groups.map((group) => (
        <div key={group.id} className="px-3">
          {collapsed ? (
            <div className="mx-auto mb-2 h-px w-8 bg-[#1E293B]" aria-hidden="true" />
          ) : (
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {group.label}
            </p>
          )}
          <ul className="space-y-1">
            {group.items.map((item) => (
              <li key={item.id}>
                <SidebarItem
                  item={item}
                  collapsed={collapsed}
                  active={activeModule === item.id}
                  badge={badges[item.id]}
                  onSelect={() => setActiveModule(item.id)}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const brand = (collapsed: boolean) => (
    <div className={`flex items-center gap-3 h-16 border-b border-[#1E293B] ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
      <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-[#8B0000] to-[#F97316] flex items-center justify-center text-white shadow">
        <Shield className="w-4.5 h-4.5" />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="font-heading font-black text-sm text-white leading-tight truncate">DVA Admin Hub</p>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Club Operations</p>
        </div>
      )}
    </div>
  );

  const footer = (collapsed: boolean) => (
    <div className="p-3 border-t border-[#1E293B]">
      <button
        type="button"
        onClick={handleLogout}
        title={collapsed ? 'Sign Out / Đăng xuất' : undefined}
        aria-label="Sign Out / Đăng xuất"
        className={`w-full flex items-center gap-3 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors cursor-pointer select-none ${
          collapsed ? 'justify-center h-10' : 'px-3 py-2.5'
        }`}
      >
        <LogOut className="w-4 h-4 shrink-0 text-red-400" />
        {!collapsed && <span className="truncate">Sign Out / Đăng xuất</span>}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop fixed rail below h-20 Navbar + width spacer so only Main Content scrolls on Y-axis */}
      <div
        className={`hidden lg:block shrink-0 transition-[width] duration-200 ${
          isSidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
        aria-hidden="true"
      />
      <aside
        className={`hidden lg:flex flex-col shrink-0 fixed top-20 left-0 bottom-0 z-30 h-[calc(100vh-5rem)] bg-[#111827] border-r border-[#1E293B] transition-[width] duration-200 ${
          isSidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {brand(isSidebarCollapsed)}
        {renderNav(isSidebarCollapsed)}
        {footer(isSidebarCollapsed)}
      </aside>

      {/* Mobile drawer */}
      {isMobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <aside className="relative flex flex-col w-72 max-w-[85vw] h-full bg-[#111827] border-r border-[#1E293B] shadow-2xl">
            <div className="relative">
              {brand(false)}
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setIsMobileNavOpen(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderNav(false)}
            {footer(false)}
          </aside>
        </div>
      )}
    </>
  );
};

interface SidebarItemProps {
  item: AdminNavItem;
  collapsed: boolean;
  active: boolean;
  badge?: { value: number; tone: 'alert' | 'count' };
  onSelect: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ item, collapsed, active, badge, onSelect }) => {
  const Icon = item.icon;
  const showBadge = Boolean(badge && badge.value > 0);

  return (
    <button
      type="button"
      onClick={onSelect}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`group relative w-full flex items-center gap-3 rounded-xl text-xs transition-colors cursor-pointer select-none ${
        collapsed ? 'justify-center h-10' : 'px-3 py-2.5'
      } ${
        active
          ? 'bg-gradient-to-r from-[#8B0000] to-[#F97316] text-white font-bold shadow'
          : 'text-slate-400 hover:text-white hover:bg-[#1E293B] font-medium'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}

      {!collapsed && item.status && (
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide ${
            item.status === 'NEW'
              ? 'bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/40'
              : 'bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/40'
          }`}
        >
          {item.status === 'NEW' ? 'New' : 'Soon'}
        </span>
      )}

      {!collapsed && showBadge && (
        <span
          className={`min-w-5 h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center tabular-nums ${
            badge!.tone === 'alert'
              ? active
                ? 'bg-white text-[#8B0000]'
                : 'bg-[#F97316] text-white'
              : active
                ? 'bg-white/20 text-white'
                : 'bg-[#1E293B] text-slate-300'
          }`}
        >
          {badge!.value}
        </span>
      )}

      {collapsed && showBadge && badge!.tone === 'alert' && (
        <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-[#F97316] ring-2 ring-[#111827]" aria-hidden="true" />
      )}
    </button>
  );
};
