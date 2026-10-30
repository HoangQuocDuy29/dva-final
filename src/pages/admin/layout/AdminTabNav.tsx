import React from 'react';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { buildAdminTabs } from '../constants';
import { useAdminMetrics } from '../hooks/useAdminMetrics';

export const AdminTabNav: React.FC = () => {
  const { activeModule, setActiveModule, isSuperAdmin } = useAdminDashboard();
  const {
    pendingBookingsCount,
    pendingApplicationsCount,
    playersCount,
    coursesCount,
    coachesCount,
    newsCount,
  } = useAdminMetrics();

  const tabs = buildAdminTabs({
    pendingBookingsCount,
    pendingApplicationsCount,
    playersCount,
    coursesCount,
    coachesCount,
    newsCount,
    isSuperAdmin,
  });

  return (
    <div
      className="max-w-7xl mx-auto mt-4 pt-2 border-t border-slate-800/80 flex flex-nowrap items-center gap-2 overflow-x-auto text-xs font-bold scrollbar-none scroll-smooth touch-pan-x py-1.5 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      style={{
        display: 'flex',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        gap: '0.5rem',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setActiveModule(tab.id as any);
          }}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer select-none ${
            activeModule === tab.id
              ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow ring-1 ring-red-400 font-bold'
              : 'bg-[#161F30] text-slate-400 hover:text-white border border-slate-800 font-medium'
          }`}
          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <span className="whitespace-nowrap">{tab.label}</span>
          {Boolean(tab.badge && tab.badge > 0) && (
            <span className="w-4 h-4 rounded-full bg-white text-red-900 text-[9px] flex items-center justify-center font-black shrink-0">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
