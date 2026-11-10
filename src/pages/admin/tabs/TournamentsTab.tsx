import React from 'react';
import { Trophy, GitBranch, UsersRound, MonitorPlay, Construction } from 'lucide-react';

/** Exact copy required by spec FR-007 — do not edit. */
export const TOURNAMENTS_COMING_SOON_NOTICE =
  'Feature Under Development - Hệ thống quản lý giải đấu đang được phát triển và dịch vụ sẽ sớm được triển khai.';

const ROADMAP = [
  { icon: GitBranch, title: 'Bracket Generator', body: 'Single & double elimination, pool play and seeding.' },
  { icon: UsersRound, title: 'Team Registration', body: 'Roster submission, entry fees and eligibility checks.' },
  { icon: MonitorPlay, title: 'Live Scoreboards', body: 'Set-by-set scoring with real-time standings.' },
];

/** Tournaments module — read-only Coming Soon state (Spec 005, US4). */
export const TournamentsTab: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-2xl bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center">
        <Trophy className="w-5 h-5 text-[#38BDF8]" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-heading font-black text-xl text-white">Tournaments & Leagues Hub</h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/40">
            Coming Soon
          </span>
        </div>
        <p className="text-xs text-slate-400">Competition management for DVA leagues and invitationals.</p>
      </div>
    </div>

    <div className="relative overflow-hidden rounded-3xl border border-[#1E293B] bg-gradient-to-br from-[#111827] via-[#111827] to-[#0B2233] p-8 sm:p-12 text-center">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#38BDF8]/10 blur-3xl" aria-hidden="true" />
      <Construction className="relative w-12 h-12 text-[#FACC15] mx-auto mb-4" />
      <p className="relative text-base sm:text-lg font-bold text-white max-w-2xl mx-auto leading-relaxed">
        {TOURNAMENTS_COMING_SOON_NOTICE}
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {ROADMAP.map(({ icon: Icon, title, body }) => (
        <div key={title} className="rounded-3xl border border-[#1E293B] bg-[#111827] p-5 space-y-2 opacity-80">
          <div className="flex items-center justify-between">
            <Icon className="w-5 h-5 text-[#F97316]" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Roadmap</span>
          </div>
          <h3 className="font-bold text-sm text-white">{title}</h3>
          <p className="text-xs text-slate-400">{body}</p>
        </div>
      ))}
    </div>
  </div>
);
