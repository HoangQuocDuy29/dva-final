import React, { useState } from 'react';
import { Plus, Search, X, Edit3, Trash2 } from 'lucide-react';
import { Player, countryCodeToFlagEmoji } from '../../../types';
import { PLAYER_COUNTRIES } from '../../../data/countries';
import { playerService } from '../../../services/api';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { createDefaultPlayerForm } from '../constants';
import { AthleteRosterAvatar } from '../components/AthleteRosterAvatar';
import { PlayerFormModal } from '../components/players/PlayerFormModal';

export const PlayersTab: React.FC = () => {
  const {
    data: { players },
    setData: { setPlayers },
    notify,
  } = useAdminDashboard();

  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isUploadingPlayerPhoto, setIsUploadingPlayerPhoto] = useState(false);
  const [playerForm, setPlayerForm] = useState<Partial<Player>>(() => createDefaultPlayerForm(1));

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resolvedCode = (playerForm.countryCode || 'VN').toUpperCase();
      const matchedCountry = PLAYER_COUNTRIES.find((c) => c.code === resolvedCode);
      const resolvedCountry =
        playerForm.country || playerForm.countryName || matchedCountry?.name || 'Vietnam';
      const resolvedFlag =
        playerForm.countryFlag || matchedCountry?.flag || countryCodeToFlagEmoji(resolvedCode);
      const resolvedJoinedYear = Number(playerForm.joined ?? playerForm.joinedYear ?? 2025) || 2025;

      const payload: Partial<Player> = {
        ...playerForm,
        country: resolvedCountry,
        countryName: resolvedCountry,
        countryCode: resolvedCode,
        countryFlag: resolvedFlag,
        joined: resolvedJoinedYear,
        joinedYear: resolvedJoinedYear,
      };

      if (editingPlayer) {
        const updated = await playerService.updatePlayer(editingPlayer.id, payload);
        setPlayers((prev) =>
          prev.map((p) => (p.id === editingPlayer.id ? { ...p, ...payload, ...updated } : p))
        );
        notify(`Player ${payload.fullName} updated successfully.`, 3000);
      } else {
        const created = await playerService.addPlayer(payload);
        setPlayers((prev) => [{ ...payload, ...created } as Player, ...prev]);
        notify(`Athlete ${payload.fullName} added to DVA roster.`, 3000);
      }
      setIsPlayerModalOpen(false);
    } catch (err) {
      alert('Error saving player');
    }
  };

  const handleDeletePlayer = async (id: string, name: string) => {
    if (!window.confirm(`Delete athlete ${name} from roster?`)) return;
    try {
      await playerService.deletePlayer(id);
      setPlayers((prev) => prev.filter((p) => p.id !== id));
      notify(`Athlete ${name} removed.`, 3000);
    } catch (e) {
      alert('Error deleting player');
    }
  };

  const filteredPlayers = players.filter((p) => {
    if (!playerSearchQuery.trim()) return true;
    const q = playerSearchQuery.toLowerCase().trim();
    const matchName = p.fullName.toLowerCase().includes(q);
    const matchJersey = String(p.jerseyNumber).includes(q) || `#${p.jerseyNumber}`.includes(q);
    const matchPos = p.position.toLowerCase().includes(q);
    const matchLevel = p.level.toLowerCase().includes(q);
    const matchHometown = (p.hometownCountry || '').toLowerCase().includes(q);
    const matchCountry =
      (p.country || p.countryName || '').toLowerCase().includes(q) ||
      (p.countryCode || '').toLowerCase().includes(q);
    const matchJoined = String(p.joined ?? p.joinedYear ?? '').includes(q);
    return (
      matchName ||
      matchJersey ||
      matchPos ||
      matchLevel ||
      matchHometown ||
      matchCountry ||
      matchJoined
    );
  });

  return (
    <>
      <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-base text-white">Player Roster Management</h3>
            <p className="text-xs text-slate-400">
              Search, edit, or add official athlete cards and adjust division tiers.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingPlayer(null);
              setPlayerForm(createDefaultPlayerForm(Math.floor(Math.random() * 50) + 1));
              setIsPlayerModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Athlete</span>
          </button>
        </div>

        {/* SEARCH INPUT BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0E1524] p-3.5 rounded-2xl border border-slate-800">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={playerSearchQuery}
              onChange={(e) => setPlayerSearchQuery(e.target.value)}
              placeholder="Search athlete by name, jersey #, position (OH/OP/MB/S/L), or division..."
              className="w-full pl-10 pr-9 py-2.5 bg-[#161F30] border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-red-500 transition-all"
            />
            {playerSearchQuery && (
              <button
                type="button"
                onClick={() => setPlayerSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="text-xs text-slate-400 font-medium px-1 flex items-center gap-1.5 shrink-0">
            <span>Showing:</span>
            <strong className="text-white font-mono">{filteredPlayers.length}</strong>
            <span>of</span>
            <span className="text-slate-500 font-mono">{players.length} athletes</span>
          </div>
        </div>

        {filteredPlayers.length === 0 ? (
          <div className="p-8 text-center bg-[#0E1524] rounded-2xl border border-slate-800 space-y-3">
            <p className="text-xs text-slate-400">
              No athletes found matching <strong className="text-white">"{playerSearchQuery}"</strong>.
            </p>
            <button
              type="button"
              onClick={() => setPlayerSearchQuery('')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Clear Search Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlayers.map((p) => {
              const flagEmoji = p.countryFlag || countryCodeToFlagEmoji(p.countryCode || 'VN');
              const countryLabel = p.country || p.countryName || 'Vietnam';
              const joinedLabel = p.joined ?? p.joinedYear ?? 2025;
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl border border-slate-800 bg-[#0E1524] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <AthleteRosterAvatar
                      avatarUrl={p.avatarUrl || (p as any).avatar || (p as any).image}
                      fullName={p.fullName}
                      jerseyNumber={p.jerseyNumber}
                    />
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span>{p.fullName}</span>
                        {(p.captain || p.isCaptain) && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-sm border border-yellow-200">
                            CAPTAIN
                          </span>
                        )}
                        <span
                          className="text-xs select-none"
                          title={`${countryLabel} (${p.countryCode || 'VN'})`}
                        >
                          {flagEmoji}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {p.position} · {p.level} · {p.height}cm · Reach {p.spikeTouch}cm · Joined{' '}
                        {joinedLabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const initCode = (p.countryCode || 'VN').toUpperCase();
                        const initCountry =
                          p.country ||
                          p.countryName ||
                          PLAYER_COUNTRIES.find((c) => c.code === initCode)?.name ||
                          'Vietnam';
                        const initFlag = p.countryFlag || countryCodeToFlagEmoji(initCode);
                        const initJoined = Number(p.joined ?? p.joinedYear ?? 2025) || 2025;
                        setEditingPlayer(p);
                        setPlayerForm({
                          ...p,
                          country: initCountry,
                          countryName: initCountry,
                          countryCode: initCode,
                          countryFlag: initFlag,
                          joined: initJoined,
                          joinedYear: initJoined,
                          captain: Boolean(p.captain || p.isCaptain),
                          isCaptain: Boolean(p.captain || p.isCaptain),
                        });
                        setIsPlayerModalOpen(true);
                      }}
                      className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-300 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 cursor-pointer transition-colors"
                      title="Edit athlete profile"
                    >
                      <Edit3 className="w-4 h-4 text-orange-400" />
                    </button>
                    <button
                      onClick={() => handleDeletePlayer(p.id, p.fullName)}
                      className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-red-300 rounded-xl bg-slate-800/80 hover:bg-red-950/80 cursor-pointer transition-colors"
                      title="Delete athlete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PlayerFormModal
        isOpen={isPlayerModalOpen}
        editingPlayer={editingPlayer}
        playerForm={playerForm}
        setPlayerForm={setPlayerForm}
        isUploadingPlayerPhoto={isUploadingPlayerPhoto}
        setIsUploadingPlayerPhoto={setIsUploadingPlayerPhoto}
        onClose={() => setIsPlayerModalOpen(false)}
        onSubmit={handleSavePlayer}
        notify={notify}
      />
    </>
  );
};
