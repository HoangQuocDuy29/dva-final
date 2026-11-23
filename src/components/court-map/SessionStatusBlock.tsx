import React from 'react';
import { AlertTriangle, Users } from 'lucide-react';
import type { VenueSessionSlot } from '../../types';
import { formatShortVnDate, getSessionDailyState, getVietnamNow, isSessionCancelledOnDate } from '../../utils/venueSchedule';

export const SessionStatusBlock: React.FC<{ session: VenueSessionSlot; venueClosed?: boolean; targetDate?: string; todayDate?: string }> = ({ session, venueClosed = false, targetDate, todayDate }) => {
  const today = todayDate || getVietnamNow().dateStr;
  const checkDate = targetDate || today;
  const isCancelled = !venueClosed && isSessionCancelledOnDate(session, checkDate);
  const upcomingOff = !venueClosed && !isCancelled && checkDate === today ? (session.cancelledDates || []).filter((d) => d > today) : [];
  const isLimited = session.capacityMode === 'LIMITED_SLOTS';
  const max = Math.max(1, session.maxPlayers ?? 14);
  const daily = getSessionDailyState(session, checkDate);
  const cur = daily.currentPlayers;
  const left = Math.max(0, max - cur);
  const pct = Math.min(100, Math.round((cur / max) * 100));
  const positions = daily.neededPositions;

  return (
    <div className="space-y-1.5">
      {isCancelled && (
        <div className="px-2.5 py-1.5 rounded-xl bg-amber-950/70 border border-amber-500/50 text-[11px] text-amber-100 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="font-black text-amber-200">{checkDate === today ? '⚠️ Hôm nay đội tạm nghỉ' : `⚠️ Tạm nghỉ ngày ${formatShortVnDate(checkDate)}`}</span>
            {session.cancelReason && <span className="text-amber-200/85"> — {session.cancelReason}</span>}
          </div>
        </div>
      )}
      {upcomingOff.length > 0 && (
        <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200 font-semibold">
          📅 Báo nghỉ trước: {upcomingOff.map(formatShortVnDate).join(', ')}{session.cancelReason ? ` (${session.cancelReason})` : ''}
        </div>
      )}

      {!isLimited ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-[10px] font-semibold text-slate-300">
            ∞ Không giới hạn người tham gia
          </span>
        </div>
      ) : (
        <div className="px-2.5 py-2 rounded-xl bg-[#0B0F19]/85 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 font-bold text-slate-200 tabular-nums">
              <Users className="w-3 h-3 text-sky-400" />
              {cur} / {max} người
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${left > 0 ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
              {left > 0 ? `Còn ${left} slot` : 'Đã đủ slot'}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-slate-500' : pct >= 80 ? 'bg-amber-400' : 'bg-gradient-to-r from-sky-500 to-emerald-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {positions.length > 0 && !isCancelled && (
        <div className="flex flex-wrap items-center gap-1 text-[10px]">
          <span className="font-bold text-orange-300">Thiếu vị trí:</span>
          {positions.map((pos, i) => (
            <React.Fragment key={pos}>
              {i > 0 && <span className="text-slate-600">•</span>}
              <span className="px-2 py-0.5 rounded-md bg-orange-500/20 border border-orange-400/50 text-orange-200 font-black tracking-wide">
                {pos}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
