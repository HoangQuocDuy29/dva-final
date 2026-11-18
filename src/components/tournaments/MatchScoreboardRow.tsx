import React from 'react';
import { Shield } from 'lucide-react';
import { TournamentMatch, TournamentTeam } from '../../types';
import { TeamLogo } from './TeamLogoBadge';

interface MatchScoreboardRowProps {
  match: TournamentMatch;
  homeTeam?: TournamentTeam | null;
  awayTeam?: TournamentTeam | null;
  onSelectTeam?: (team: TournamentTeam) => void;
  homeBadge?: React.ReactNode;
  awayBadge?: React.ReactNode;
}

/**
 * Symmetrical 3-column sports matchup strip shared across Admin and Public match cards:
 * Left: `[Logo 40x40] [Team 1]` | Center: `[VS or Sets + Set Scores]` | Right: `[Team 2] [Logo 40x40]`
 */
export const MatchScoreboardRow: React.FC<MatchScoreboardRowProps> = ({
  match,
  homeTeam,
  awayTeam,
  onSelectTeam,
  homeBadge,
  awayBadge,
}) => {
  const isLive = match.status === 'LIVE';
  const isDone = match.status === 'COMPLETED';
  const showScore = isLive || isDone;

  const renderTeamSide = (
    side: 'HOME' | 'AWAY',
    team: TournamentTeam | null | undefined,
    fallbackLabel: string | undefined,
    badge?: React.ReactNode
  ) => {
    const isHome = side === 'HOME';
    const teamId = team?.id || (isHome ? match.homeTeamId : match.awayTeamId) || null;
    const won = Boolean(isDone && match.winnerTeamId && teamId && match.winnerTeamId === teamId);
    const lost = Boolean(isDone && match.winnerTeamId && teamId && match.winnerTeamId !== teamId);
    const displayName = team?.name || fallbackLabel || 'TBD';

    const avatarNode = team ? (
      <TeamLogo
        logoUrl={team.logoUrl}
        name={displayName}
        shortName={team.shortName}
        sizeClass="w-10 h-10"
        imgWidth={160}
      />
    ) : (
      <div
        title={displayName}
        className="w-10 h-10 rounded-full shrink-0 border border-dashed border-white/20 bg-slate-900/70 flex items-center justify-center text-slate-400"
      >
        <Shield className="w-4 h-4 opacity-65" />
      </div>
    );

    const textNode = (
      <div className="min-w-0 flex-1 space-y-0.5">
        <div
          className={`text-xs sm:text-sm leading-tight line-clamp-2 transition-colors ${
            won
              ? 'font-black text-emerald-400'
              : lost
              ? 'font-semibold text-slate-400'
              : !team
              ? 'font-semibold text-slate-300'
              : 'font-bold text-white'
          } ${team && onSelectTeam ? 'group-hover:text-orange-400' : ''}`}
        >
          {displayName}
        </div>
        {badge && (
          <div className={`pt-0.5 flex ${isHome ? 'justify-start' : 'justify-end'}`}>
            {badge}
          </div>
        )}
      </div>
    );

    const sideClass = `flex items-center gap-2.5 sm:gap-3 min-w-0 ${
      isHome ? 'justify-start text-left' : 'justify-end text-right'
    } ${lost ? 'opacity-65' : ''}`;

    const orderedChildren = isHome ? (
      <>
        {avatarNode}
        {textNode}
      </>
    ) : (
      <>
        {textNode}
        {avatarNode}
      </>
    );

    if (team && onSelectTeam) {
      return (
        <button
          type="button"
          onClick={() => onSelectTeam(team)}
          className={`${sideClass} w-full group cursor-pointer`}
        >
          {orderedChildren}
        </button>
      );
    }

    return <div className={sideClass}>{orderedChildren}</div>;
  };

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 sm:gap-3 py-1">
      {renderTeamSide('HOME', homeTeam, match.homeLabel, homeBadge)}

      {/* Center VS / Set Scoreline Pill */}
      <div className="flex flex-col items-center justify-center px-3 sm:px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 min-w-[72px] shrink-0">
        {showScore ? (
          <>
            <span className="font-mono font-black text-base leading-tight text-amber-400 tabular-nums whitespace-nowrap">
              {match.homeSetsWon} - {match.awaySetsWon}
            </span>
            {match.setScores?.length > 0 && (
              <span className="text-[10px] font-mono text-slate-400 mt-0.5 text-center leading-tight max-w-[116px] sm:max-w-none tabular-nums">
                {match.setScores.map((s) => `${s.home}-${s.away}`).join(' · ')}
              </span>
            )}
          </>
        ) : (
          <span className="text-amber-400 font-extrabold text-sm tracking-wider">VS</span>
        )}
      </div>

      {renderTeamSide('AWAY', awayTeam, match.awayLabel, awayBadge)}
    </div>
  );
};
