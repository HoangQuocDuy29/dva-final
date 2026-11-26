import React, { useEffect, useState } from 'react';
import { Shield, X, LogOut, Phone, LayoutGrid } from 'lucide-react';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { getAdminNavBadges, getVisibleNavGroups } from '../constants';
import { useAdminMetrics } from '../hooks/useAdminMetrics';
import { AdminNavItem } from '../types';
import { getMonthlyQuotaStatus, isVenueClosedNow } from '../../../utils/venueSchedule';

interface HoverTooltip {
  label: string;
  badge?: number;
  tone?: 'alert' | 'count';
  top: number;
}

/**
 * Spatial Floating Pill Dock (Spec 011):
 * - lg+: Vertical floating glass pill dock at left-4 (`rounded-full bg-white/[0.05] backdrop-blur-2xl border-white/15`)
 *        with white elevated active icon pill & non-clipped fixed hover tooltips.
 * - <lg: Horizontal floating bottom glass pill dock + full glass drawer for roles with >5 modules.
 */
export const AdminSidebar: React.FC = () => {
  const {
    currentUser,
    activeModule,
    setActiveModule,
    isSuperAdmin,
    isCaptain,
    data: { venuesList },
    isMobileNavOpen,
    setIsMobileNavOpen,
    handleLogout,
  } = useAdminDashboard();
  const [tooltip, setTooltip] = useState<HoverTooltip | null>(null);

  const captainVenue = isCaptain ? venuesList[0] : undefined;
  const captainClub = captainVenue?.clubs?.[0];
  const metrics = useAdminMetrics();
  const badges = getAdminNavBadges(metrics);
  const groups = getVisibleNavGroups(isSuperAdmin, isCaptain, currentUser.role);
  const allItems = groups.flatMap((g) => g.items);

  // Mobile bottom dock shows up to 4 primary items + "More" trigger when role has >5 modules
  const mobileHasMore = allItems.length > 5;
  const mobileDockItems = mobileHasMore ? allItems.slice(0, 4) : allItems;

  useEffect(() => {
    if (!isMobileNavOpen) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobileNavOpen, setIsMobileNavOpen]);

  const showTooltip = (e: React.MouseEvent<HTMLElement>, label: string, badge?: { value: number; tone: 'alert' | 'count' }) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      label,
      badge: badge && badge.value > 0 ? badge.value : undefined,
      tone: badge?.tone,
      top: rect.top + rect.height / 2,
    });
  };

  return (
    <>
      {/* Desktop width spacer so main workspace aligns cleanly beside the floating pill dock */}
      <div className="hidden lg:block w-[84px] shrink-0" aria-hidden="true" />

      {/* Desktop Left Floating Pill Dock (fixed left-4, vertically centered / bounded) */}
      <aside
        aria-label="Spatial navigation dock"
        className="hidden lg:flex flex-col items-center fixed left-4 top-24 bottom-5 z-30 w-[60px] pointer-events-none justify-center"
      >
        <div className="pointer-events-auto flex flex-col items-center max-h-full rounded-full bg-white/[0.05] backdrop-blur-2xl border border-white/15 p-2 shadow-2xl shadow-black/60 gap-1.5">
          {/* Brand emblem */}
          <div
            onMouseEnter={(e) => showTooltip(e, 'DVA Spatial Hub')}
            onMouseLeave={() => setTooltip(null)}
            className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-rose-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-950/50 ring-1 ring-white/25"
          >
            <Shield className="w-4 h-4" />
          </div>

          <div className="w-6 h-px bg-white/10 shrink-0 my-0.5" aria-hidden="true" />

          {/* Role-specific vertical icon rail */}
          <nav
            aria-label="Workspace modules"
            className="flex flex-col items-center gap-1 overflow-y-auto no-scrollbar py-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {groups.map((group, gIdx) => (
              <React.Fragment key={group.id}>
                {gIdx > 0 && <div className="w-5 h-px bg-white/10 my-1 shrink-0" aria-hidden="true" />}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeModule === item.id;
                  const badge = badges[item.id];
                  const hasAlert = Boolean(badge && badge.value > 0 && badge.tone === 'alert');
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveModule(item.id)}
                      onMouseEnter={(e) => showTooltip(e, item.label, badge)}
                      onMouseLeave={() => setTooltip(null)}
                      aria-label={item.label}
                      aria-current={active ? 'page' : undefined}
                      className={`relative w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer select-none ${
                        active
                          ? 'bg-white text-slate-950 shadow-lg shadow-white/20 scale-105'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.10]'
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                      {hasAlert && (
                        <span
                          className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                            active ? 'bg-orange-500 ring-2 ring-white' : 'bg-orange-500 ring-2 ring-[#0B0D12]'
                          }`}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </nav>

          <div className="w-6 h-px bg-white/10 shrink-0 my-0.5" aria-hidden="true" />

          {/* Sign Out circular button */}
          <button
            type="button"
            onClick={handleLogout}
            onMouseEnter={(e) => showTooltip(e, 'Sign Out / Đăng xuất')}
            onMouseLeave={() => setTooltip(null)}
            aria-label="Sign Out / Đăng xuất"
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-rose-400 hover:text-white hover:bg-rose-500/80 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Non-clipped Floating Hover Tooltip for Desktop Pill Dock */}
      {tooltip && (
        <div
          role="tooltip"
          style={{ top: tooltip.top }}
          className="hidden lg:flex fixed left-[86px] -translate-y-1/2 z-50 pointer-events-none items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121622]/95 backdrop-blur-2xl border border-white/15 shadow-2xl text-xs font-bold text-white whitespace-nowrap animate-in fade-in duration-100"
        >
          <span>{tooltip.label}</span>
          {tooltip.badge !== undefined && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
                tooltip.tone === 'alert' ? 'bg-orange-500 text-white' : 'bg-white/10 text-slate-200'
              }`}
            >
              {tooltip.badge}
            </span>
          )}
        </div>
      )}

      {/* Mobile Floating Horizontal Bottom Pill Dock (< lg) */}
      <nav
        aria-label="Mobile quick dock"
        className="lg:hidden fixed bottom-3 left-3 right-3 z-40 mx-auto max-w-md rounded-full bg-[#0E1118]/90 backdrop-blur-2xl border border-white/15 px-2 py-1.5 shadow-2xl shadow-black/70 flex items-center justify-around gap-1"
      >
        {mobileDockItems.map((item) => {
          const Icon = item.icon;
          const active = activeModule === item.id;
          const badge = badges[item.id];
          const hasAlert = Boolean(badge && badge.value > 0 && badge.tone === 'alert');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveModule(item.id)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={`relative flex-1 max-w-[74px] h-11 rounded-full flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                active
                  ? 'bg-white text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-[9px] font-bold leading-none truncate max-w-[58px]">
                {item.label.split(' ')[0]}
              </span>
              {hasAlert && (
                <span className="absolute top-1.5 right-3 w-1.5 h-1.5 rounded-full bg-orange-500" aria-hidden="true" />
              )}
            </button>
          );
        })}

        {mobileHasMore && (
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="All modules"
            className={`flex-1 max-w-[74px] h-11 rounded-full flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
              isMobileNavOpen
                ? 'bg-orange-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span className="text-[9px] font-bold leading-none">More</span>
          </button>
        )}
      </nav>

      {/* Mobile Glass Drawer (All Modules + Captain Support Card + Sign Out) */}
      {isMobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Workspace navigation">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <aside className="relative flex flex-col w-72 max-w-[85vw] h-full bg-[#0E1118]/95 backdrop-blur-2xl border-r border-white/15 shadow-2xl">
            <div className="flex items-center justify-between gap-3 h-16 px-5 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-rose-600 to-orange-500 flex items-center justify-center text-white shadow">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-heading font-black text-sm text-white leading-tight truncate">DVA Spatial Hub</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{currentUser.role}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setIsMobileNavOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 space-y-5 no-scrollbar">
              {groups.map((group) => (
                <div key={group.id} className="px-3">
                  <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    {group.label}
                  </p>
                  <ul className="space-y-1">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <DrawerItem
                          item={item}
                          active={activeModule === item.id}
                          badge={badges[item.id]}
                          onSelect={() => {
                            setActiveModule(item.id);
                            setIsMobileNavOpen(false);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {isCaptain && (
                <div className="px-3 pt-2">
                  <div className="rounded-3xl p-3.5 bg-white/[0.04] border border-white/10 space-y-2.5 text-[11px]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trạng thái & Hỗ trợ</p>
                    {captainVenue && (
                      <div className={`px-2.5 py-1.5 rounded-2xl border font-bold ${isVenueClosedNow(captainVenue) ? 'bg-red-950/60 border-red-500/45 text-red-200' : 'bg-emerald-950/40 border-emerald-500/35 text-emerald-300'}`}>
                        {isVenueClosedNow(captainVenue) ? '🔴 Sân tạm nghỉ' : '🟢 Sân đang mở cửa'}
                      </div>
                    )}
                    {captainClub && (
                      <div className="flex items-center justify-between text-[10px] text-slate-300 px-0.5">
                        <span>Ảnh bìa: <strong className="text-white">{getMonthlyQuotaStatus(captainClub.coverUpdatedAt).locked ? '1/1' : '0/1'}</strong></span>
                        <span className="text-slate-600">•</span>
                        <span>Gallery: <strong className="text-white">{Math.min(5, (captainClub.galleryUrls || []).length)}/5</strong></span>
                      </div>
                    )}
                    <a
                      href="https://zalo.me/0768299329"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-2.5 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/35 text-cyan-200 font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">Hỗ trợ Quốc Duy · 0768299329</span>
                    </a>
                  </div>
                </div>
              )}
            </nav>

            <div className="p-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="truncate">Sign Out / Đăng xuất</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

interface DrawerItemProps {
  item: AdminNavItem;
  active: boolean;
  badge?: { value: number; tone: 'alert' | 'count' };
  onSelect: () => void;
}

const DrawerItem: React.FC<DrawerItemProps> = ({ item, active, badge, onSelect }) => {
  const Icon = item.icon;
  const showBadge = Boolean(badge && badge.value > 0);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'page' : undefined}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs transition-all cursor-pointer select-none ${
        active
          ? 'bg-white text-slate-950 font-bold shadow-lg'
          : 'text-slate-300 hover:text-white hover:bg-white/[0.08] font-medium'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-left truncate">{item.label}</span>
      {showBadge && (
        <span
          className={`min-w-5 h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center tabular-nums ${
            badge!.tone === 'alert'
              ? active
                ? 'bg-orange-500 text-white'
                : 'bg-orange-500/90 text-white'
              : active
                ? 'bg-slate-900/15 text-slate-900'
                : 'bg-white/10 text-slate-200'
          }`}
        >
          {badge!.value}
        </span>
      )}
    </button>
  );
};
