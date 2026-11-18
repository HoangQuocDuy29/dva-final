import React from 'react';
import { TournamentStandingRow, TournamentTeam } from '../../types';
import { TeamLogoBadge } from './TeamLogoBadge';

interface PoolStandingsTableProps {
  title: string;
  subtitle?: string;
  rows: TournamentStandingRow[];
  teamMap: Map<string, TournamentTeam>;
  onSelectTeam?: (team: TournamentTeam) => void;
  compact?: boolean;
}

/** Shared FIVB Pool Standings table (1–4 ranking) reused across Bracket and Schedule tabs. */
export const PoolStandingsTable: React.FC<PoolStandingsTableProps> = ({
  title,
  subtitle = '4 Teams · Round Robin',
  rows,
  teamMap,
  onSelectTeam,
  compact = false,
}) => (
  <div className="rounded-3xl border border-[#1E293B] bg-[#111827] overflow-hidden">
    <div
      className={`${
        compact ? 'px-4 py-2.5' : 'px-5 py-3.5'
      } bg-[#0B0F19] border-b border-[#1E293B] flex items-center justify-between gap-2`}
    >
      <h4 className="font-heading font-black text-sm text-white uppercase tracking-wider">{title}</h4>
      <span className="text-[10px] font-mono text-slate-400">{subtitle}</span>
    </div>
    {rows.length === 0 ? (
      <div className="p-6 text-center text-xs text-slate-500">Teams pending draw assignment.</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-[#1E293B] bg-[#0B0F19]/40">
              <th className={compact ? 'py-2 px-3' : 'py-2.5 px-3'}>#</th>
              <th className={compact ? 'py-2 px-3' : 'py-2.5 px-3'}>Team</th>
              <th className={compact ? 'py-2 px-2 text-center' : 'py-2.5 px-2 text-center'}>P</th>
              <th className={compact ? 'py-2 px-2 text-center' : 'py-2.5 px-2 text-center'}>W-L</th>
              <th className={compact ? 'py-2 px-2 text-center' : 'py-2.5 px-2 text-center'}>Pts</th>
              <th className={compact ? 'py-2 px-2 text-center' : 'py-2.5 px-2 text-center'}>Sets</th>
              <th className={compact ? 'py-2 px-3 text-right' : 'py-2.5 px-3 text-right'}>Pt Ratio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]">
            {rows.map((r) => {
              const tm = teamMap.get(r.teamId);
              return (
                <tr key={r.teamId} className="hover:bg-slate-800/35">
                  <td className={`${compact ? 'py-2 px-3' : 'py-3 px-3'} font-mono font-black text-[#F97316]`}>
                    {r.rank}
                  </td>
                  <td className={compact ? 'py-2 px-3' : 'py-3 px-3'}>
                    <button
                      type="button"
                      disabled={!tm || !onSelectTeam}
                      onClick={() => tm && onSelectTeam?.(tm)}
                      className="flex items-center gap-2.5 text-left group cursor-pointer disabled:cursor-default"
                    >
                      <TeamLogoBadge
                        logoUrl={r.logoUrl}
                        name={r.teamName}
                        shortName={r.shortName}
                        sizeClass={compact ? 'w-7 h-7' : 'w-8 h-8'}
                        imgWidth={160}
                      />
                      <span className="font-bold text-white group-hover:text-orange-400 transition-colors">
                        {r.teamName}
                      </span>
                    </button>
                  </td>
                  <td className={`${compact ? 'py-2 px-2' : 'py-3 px-2'} text-center font-mono text-slate-400`}>
                    {r.played}
                  </td>
                  <td className={`${compact ? 'py-2 px-2' : 'py-3 px-2'} text-center font-mono text-slate-200`}>
                    {r.wins}-{r.losses}
                  </td>
                  <td className={`${compact ? 'py-2 px-2' : 'py-3 px-2'} text-center font-mono font-black text-[#FACC15]`}>
                    {r.fivbPoints}
                  </td>
                  <td className={`${compact ? 'py-2 px-2' : 'py-3 px-2'} text-center font-mono text-slate-300`}>
                    {r.setsWon}:{r.setsLost}
                  </td>
                  <td className={`${compact ? 'py-2 px-3' : 'py-3 px-3'} text-right font-mono text-slate-400`}>
                    {r.pointsAgainst === 0 && r.pointsFor === 0
                      ? '—'
                      : r.pointsAgainst === 0
                      ? 'MAX'
                      : r.pointRatio.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
);
