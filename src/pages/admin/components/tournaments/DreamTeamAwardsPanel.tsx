import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  Check,
  ChevronDown,
  Filter,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import {
  DreamTeamSlotKey,
  Tournament,
  TournamentDreamTeamSelection,
  TournamentPlayer,
  TournamentTeam,
} from '../../../../types';
import {
  DREAM_TEAM_SLOTS,
  DreamTeamSlotMeta,
  resolveDreamTeamSelection,
} from '../../../../shared/tournaments';
import { tournamentService } from '../../../../services/api';
import { TeamLogo } from '../../../../components/tournaments/TeamLogoBadge';
import { optimizeCloudinaryUrl } from '../../../../utils/cloudinary';

interface DreamTeamAwardsPanelProps {
  tournament: Tournament;
  onRefresh: () => Promise<void>;
  notify: (msg: string, durationMs?: number) => void;
}

interface AthleteOption {
  player: TournamentPlayer;
  team?: TournamentTeam;
  teamName: string;
}

interface SlotPickerCardProps {
  slot: DreamTeamSlotMeta;
  selectedPlayerId: string | null;
  pairedPlayerId: string | null;
  verifiedOptions: AthleteOption[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onSelect: (playerId: string | null) => void;
}

const DreamTeamSlotPickerCard: React.FC<SlotPickerCardProps> = ({
  slot,
  selectedPlayerId,
  pairedPlayerId,
  verifiedOptions,
  isOpen,
  onToggleOpen,
  onSelect,
}) => {
  const [query, setQuery] = useState('');
  const [showAllPositions, setShowAllPositions] = useState(slot.suggestedPosition === 'ALL');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return undefined;
    }
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onToggleOpen();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onToggleOpen();
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onToggleOpen]);

  const selectedOption = useMemo(
    () => verifiedOptions.find((o) => o.player.id === selectedPlayerId) || null,
    [verifiedOptions, selectedPlayerId]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return verifiedOptions.filter(({ player, teamName }) => {
      if (!showAllPositions && slot.suggestedPosition !== 'ALL') {
        if (player.position !== slot.suggestedPosition) return false;
      }
      if (!q) return true;
      const haystack = `${teamName} #${player.jerseyNumber} ${player.fullName} ${player.position}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [verifiedOptions, showAllPositions, slot.suggestedPosition, query]);

  const matchingPosCount = useMemo(() => {
    if (slot.suggestedPosition === 'ALL') return verifiedOptions.length;
    return verifiedOptions.filter((o) => o.player.position === slot.suggestedPosition).length;
  }, [verifiedOptions, slot.suggestedPosition]);

  return (
    <div
      ref={containerRef}
      className={`relative rounded-2xl border p-4 space-y-2.5 transition-all ${
        slot.isMvp
          ? 'bg-gradient-to-br from-[#FACC15]/10 via-[#111827] to-[#111827] border-[#FACC15]/40'
          : 'bg-[#0B0F19] border-[#1E293B]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {slot.isMvp ? (
            <Trophy className="w-4 h-4 text-[#FACC15]" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
          )}
          <span className={`font-bold text-xs ${slot.isMvp ? 'text-[#FACC15]' : 'text-white'}`}>
            {slot.label}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-[#111827] border border-[#1E293B] text-[10px] font-mono text-slate-300">
          {slot.suggestedPosition === 'ALL'
            ? `All Pos (${verifiedOptions.length})`
            : `Suggested: ${slot.suggestedPosition} (${matchingPosCount})`}
        </span>
      </div>

      {/* Selector Trigger */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleOpen}
          className={`flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-[#111827] border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
            isOpen ? 'border-[#F97316]' : 'border-[#1E293B] hover:border-slate-600'
          }`}
        >
          {selectedOption ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <TeamLogo
                logoUrl={selectedOption.team?.logoUrl}
                name={selectedOption.teamName || 'Team'}
                shortName={selectedOption.team?.shortName}
                sizeClass="w-7 h-7"
              />
              {selectedOption.player.avatarUrl && (
                <img
                  src={optimizeCloudinaryUrl(selectedOption.player.avatarUrl, 'thumb')}
                  alt={selectedOption.player.fullName}
                  className="w-7 h-7 rounded-lg object-cover border border-slate-700 shrink-0"
                />
              )}
              <div className="min-w-0 truncate text-xs">
                <span className="text-slate-400">{selectedOption.teamName || 'Team'}</span>
                <span className="text-slate-500"> — </span>
                <span className="font-mono font-bold text-[#F97316]">#{selectedOption.player.jerseyNumber}</span>{' '}
                <strong className="text-white">{selectedOption.player.fullName}</strong>{' '}
                <span className="text-[10px] font-mono text-[#38BDF8]">({selectedOption.player.position})</span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-500 truncate">
              Select verified athlete ({slot.shortLabel})...
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {selectedOption && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 border border-slate-700 cursor-pointer shrink-0"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Searchable Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-2xl bg-[#111827] border border-[#F97316]/60 shadow-2xl overflow-hidden">
          <div className="p-2.5 bg-[#0B0F19] border-b border-[#1E293B] space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search athlete name, #jersey, or team..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#111827] border border-[#1E293B] text-xs text-white focus:outline-none focus:border-[#F97316]"
              />
            </div>

            {slot.suggestedPosition !== 'ALL' && (
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-[#38BDF8]" />
                  {showAllPositions
                    ? 'Showing all verified athletes'
                    : `Filtered by position: ${slot.suggestedPosition}`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllPositions((v) => !v)}
                  className="px-2 py-0.5 rounded bg-[#1E293B] hover:bg-slate-700 text-sky-300 font-bold cursor-pointer"
                >
                  {showAllPositions
                    ? `Only ${slot.suggestedPosition}`
                    : 'Show All Positions'}
                </button>
              </div>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-[#1E293B]">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-[11px] text-slate-500">
                No matching VERIFIED athletes found.
                {slot.suggestedPosition !== 'ALL' && !showAllPositions && (
                  <button
                    type="button"
                    onClick={() => setShowAllPositions(true)}
                    className="block mx-auto mt-1.5 text-sky-400 underline cursor-pointer font-semibold"
                  >
                    Switch to All Positions
                  </button>
                )}
              </div>
            ) : (
              filteredOptions.map(({ player, team, teamName }) => {
                const isSelected = player.id === selectedPlayerId;
                const isDisabledPaired = Boolean(pairedPlayerId && player.id === pairedPlayerId);
                return (
                  <button
                    key={player.id}
                    type="button"
                    disabled={isDisabledPaired}
                    onClick={() => {
                      onSelect(player.id);
                      onToggleOpen();
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors ${
                      isDisabledPaired
                        ? 'opacity-45 cursor-not-allowed bg-[#0B0F19]/40'
                        : isSelected
                        ? 'bg-[#F97316]/15 text-white cursor-pointer'
                        : 'hover:bg-slate-800/70 text-slate-200 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <TeamLogo
                        logoUrl={team?.logoUrl}
                        name={teamName || 'Team'}
                        shortName={team?.shortName}
                        sizeClass="w-7 h-7"
                      />
                      <div className="min-w-0 truncate text-xs">
                        <span className="text-slate-400">{teamName || 'Team'}</span>
                        <span className="text-slate-500"> — </span>
                        <span className="font-mono font-bold text-orange-400">#{player.jerseyNumber}</span>{' '}
                        <span className="font-semibold text-white">{player.fullName}</span>{' '}
                        <span className="font-mono text-[10px] text-[#38BDF8]">({player.position})</span>
                      </div>
                    </div>

                    {isSelected ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isDisabledPaired ? (
                      <span className="text-[9px] font-bold uppercase text-amber-300 shrink-0">
                        Already paired
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const DreamTeamAwardsPanel: React.FC<DreamTeamAwardsPanelProps> = ({
  tournament,
  onRefresh,
  notify,
}) => {
  const verifiedOptions = useMemo<AthleteOption[]>(() => {
    const teamMap = new Map(tournament.teams.map((tm) => [tm.id, tm]));
    return tournament.players
      .filter((pl) => (pl.eligibilityStatus || 'VERIFIED') === 'VERIFIED')
      .map((player) => {
        const team = teamMap.get(player.teamId);
        return {
          player,
          team,
          teamName: team?.name || 'Unknown Team',
        };
      })
      .sort(
        (a, b) =>
          a.teamName.localeCompare(b.teamName) ||
          a.player.jerseyNumber - b.player.jerseyNumber
      );
  }, [tournament.players, tournament.teams]);

  const verifiedIdSet = useMemo(
    () => new Set(verifiedOptions.map((o) => o.player.id)),
    [verifiedOptions]
  );

  const initialSelection = useMemo(() => {
    const raw = resolveDreamTeamSelection(
      tournament.podiumOverride?.dreamTeam,
      tournament.players.filter((p) => (p.eligibilityStatus || 'VERIFIED') === 'VERIFIED')
    );
    // Drop stale / non-verified IDs cleanly
    const clean: TournamentDreamTeamSelection = {};
    for (const slot of DREAM_TEAM_SLOTS) {
      const id = raw[slot.slotKey];
      clean[slot.slotKey] = id && verifiedIdSet.has(id) ? id : null;
    }
    return clean;
  }, [tournament.podiumOverride, tournament.players, verifiedIdSet]);

  const [draft, setDraft] = useState<TournamentDreamTeamSelection>(initialSelection);
  const [openSlot, setOpenSlot] = useState<DreamTeamSlotKey | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(initialSelection);
    setOpenSlot(null);
  }, [initialSelection]);

  const assignedCount = DREAM_TEAM_SLOTS.filter((s) => Boolean(draft[s.slotKey])).length;
  const isDirty = DREAM_TEAM_SLOTS.some(
    (s) => (draft[s.slotKey] || null) !== (initialSelection[s.slotKey] || null)
  );

  const handleSelectSlot = (slotKey: DreamTeamSlotKey, playerId: string | null) => {
    setDraft((prev) => ({
      ...prev,
      [slotKey]: playerId,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await tournamentService.saveDreamTeam(tournament.id, draft);
      await onRefresh();
      notify('Saved Honor Roll & synced FIVB Dream Team badges across all rosters!');
    } catch (err: any) {
      notify(err?.message || 'Unable to save Dream Team awards.');
    } finally {
      setSaving(false);
    }
  };

  const mvpSlot = DREAM_TEAM_SLOTS[0];
  const positionalSlots = DREAM_TEAM_SLOTS.slice(1);

  return (
    <div className="space-y-5">
      {/* Header & Save Bar */}
      <div className="rounded-3xl border border-[#1E293B] bg-[#111827] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Award className="w-5 h-5 text-[#FACC15]" />
            <h4 className="font-heading font-black text-base text-white">
              FIVB Dream Team Award Picker (8 Standard Honors)
            </h4>
            <span className="px-2.5 py-0.5 rounded-full bg-[#0B0F19] border border-[#1E293B] font-mono text-[11px] font-bold text-[#FACC15]">
              {assignedCount} / 8 Selected
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Select verified athletes by position. Saving syncs both the public Dream Team showcase and individual player award badges (old awards automatically clear on swap).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDirty && (
            <button
              type="button"
              disabled={saving}
              onClick={() => setDraft(initialSelection)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B0000] to-[#F97316] hover:brightness-110 text-white font-bold text-xs inline-flex items-center gap-2 shadow cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Honor Roll &amp; Sync Awards</span>
          </button>
        </div>
      </div>

      {verifiedOptions.length === 0 ? (
        <div className="rounded-3xl border border-amber-700/40 bg-amber-950/20 p-6 flex items-center gap-3 text-xs text-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            No <strong>VERIFIED</strong> athletes found yet for this tournament. Open <strong>Teams, Fees &amp; Rosters</strong> to add or approve team players first.
          </span>
        </div>
      ) : (
        <div className="rounded-3xl border border-[#1E293B] bg-[#111827] p-5 space-y-5">
          {/* Featured MVP Picker */}
          <DreamTeamSlotPickerCard
            slot={mvpSlot}
            selectedPlayerId={draft[mvpSlot.slotKey] || null}
            pairedPlayerId={null}
            verifiedOptions={verifiedOptions}
            isOpen={openSlot === mvpSlot.slotKey}
            onToggleOpen={() =>
              setOpenSlot((prev) => (prev === mvpSlot.slotKey ? null : mvpSlot.slotKey))
            }
            onSelect={(id) => handleSelectSlot(mvpSlot.slotKey, id)}
          />

          {/* 7 Positional Dream Team Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {positionalSlots.map((slot) => {
              const pairedId = slot.pairedSlot ? draft[slot.pairedSlot] || null : null;
              return (
                <DreamTeamSlotPickerCard
                  key={slot.slotKey}
                  slot={slot}
                  selectedPlayerId={draft[slot.slotKey] || null}
                  pairedPlayerId={pairedId}
                  verifiedOptions={verifiedOptions}
                  isOpen={openSlot === slot.slotKey}
                  onToggleOpen={() =>
                    setOpenSlot((prev) => (prev === slot.slotKey ? null : slot.slotKey))
                  }
                  onSelect={(id) => handleSelectSlot(slot.slotKey, id)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
