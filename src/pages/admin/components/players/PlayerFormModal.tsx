import React from 'react';
import { X, Loader2, Upload } from 'lucide-react';
import { Player, PlayerLevel, VolleyballPosition } from '../../../../types';
import { uploadToCloudinary } from '../../../../utils/cloudinary';
import { CountrySelect } from '../../../../components/common/CountrySelect';

export interface PlayerFormModalProps {
  isOpen: boolean;
  editingPlayer: Player | null;
  playerForm: Partial<Player>;
  setPlayerForm: React.Dispatch<React.SetStateAction<Partial<Player>>>;
  isUploadingPlayerPhoto: boolean;
  setIsUploadingPlayerPhoto: React.Dispatch<React.SetStateAction<boolean>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  notify: (message: string, durationMs?: number) => void;
}

export const PlayerFormModal: React.FC<PlayerFormModalProps> = ({
  isOpen,
  editingPlayer,
  playerForm,
  setPlayerForm,
  isUploadingPlayerPhoto,
  setIsUploadingPlayerPhoto,
  onClose,
  onSubmit,
  notify,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-[95%] sm:w-full max-w-lg md:max-w-2xl bg-[#161F30] rounded-2xl sm:rounded-3xl border border-slate-700 p-4 sm:p-6 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base">
            {editingPlayer ? `Edit Athlete: ${editingPlayer.fullName}` : 'Add New Athlete'}
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Họ và tên VĐV (Full Name) *</label>
            <input
              type="text"
              required
              placeholder="e.g. Nguyễn Văn An"
              value={playerForm.fullName}
              onChange={(e) => setPlayerForm({ ...playerForm, fullName: e.target.value })}
              className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
            />
          </div>

          {/* LEVEL SELECTION: SENIOR / JUNIOR / YOUTH (Required by user) */}
          <div className="bg-[#0B0F19] p-3.5 rounded-2xl border border-red-900/60 space-y-2">
            <label className="block text-slate-200 font-bold">
              Phân Cấp Độ / Đội Tuyển (Level) *
            </label>
            <select
              value={playerForm.level}
              onChange={(e) => setPlayerForm({ ...playerForm, level: e.target.value as PlayerLevel })}
              className="w-full px-3 py-2 bg-[#161F30] border border-slate-700 rounded-xl text-white font-semibold outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="SENIOR">SENIOR — Người chơi tốt, trên 3 năm kinh nghiệm</option>
              <option value="JUNIOR">JUNIOR — Người chơi trung bình (Intermediate)</option>
              <option value="YOUTH">Youth</option>
            </select>
            <p className="text-[10px] text-slate-400">
              Sau khi lưu, VĐV sẽ xuất hiện ngay lập tức trong cột tương ứng ({playerForm.level}) trên danh sách Roster của CLB.
            </p>
          </div>

          {/* CAPTAIN TOGGLE (Required by user) */}
          <div className="bg-[#0B0F19] p-3.5 rounded-2xl border border-yellow-500/40 flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-yellow-400 flex items-center gap-1.5 cursor-pointer">
                <span>⭐ Đội Trưởng (Team Captain)</span>
              </label>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Nếu bật (true), thẻ cầu thủ sẽ nổi bật dòng chữ "★ CAPTAIN" ở đầu card. Nếu tắt (false) sẽ không hiện.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(playerForm.captain || playerForm.isCaptain)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setPlayerForm({ ...playerForm, captain: checked, isCaptain: checked });
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* PHOTO UPLOAD & CLOUD STORAGE */}
          <div className="bg-[#0B0F19] p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-200 font-bold block">
                Ảnh Chân Dung VĐV (Tải lên hoặc dán link Cloud)
              </label>
              {playerForm.avatarUrl && (
                <button
                  type="button"
                  onClick={() => setPlayerForm({ ...playerForm, avatarUrl: '' })}
                  className="text-[10px] text-red-400 hover:underline cursor-pointer"
                >
                  Xóa ảnh
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-16 h-20 rounded-xl bg-[#161F30] border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                {playerForm.avatarUrl ? (
                  <img
                    src={playerForm.avatarUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] text-slate-500 font-bold text-center px-1">Chưa có ảnh</span>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  isUploadingPlayerPhoto 
                    ? 'bg-slate-700 text-slate-300 border-slate-600 cursor-wait' 
                    : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 cursor-pointer'
                }`}>
                  {isUploadingPlayerPhoto ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                      <span>Đang tải lên Cloud...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-orange-400" />
                      <span>Tải ảnh lên (Cloudinary / File)</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingPlayerPhoto}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setIsUploadingPlayerPhoto(true);
                        try {
                          const subFolder = `${playerForm.level || 'SENIOR'}/${playerForm.position || 'OH'}`;
                          const res = await uploadToCloudinary(file, 'players', subFolder);
                          setPlayerForm((prev) => ({ ...prev, avatarUrl: res.url }));
                          notify(`Đã tải ảnh VĐV lên thư mục Cloud: ${res.folder}`, 3500);
                        } catch (err) {
                          console.error('Upload error:', err);
                        } finally {
                          setIsUploadingPlayerPhoto(false);
                        }
                      }
                    }}
                  />
                </label>

                <input
                  type="url"
                  placeholder="Hoặc dán URL ảnh trực tiếp (Cloudinary / Unsplash / CDN)..."
                  value={playerForm.avatarUrl || ''}
                  onChange={(e) => setPlayerForm({ ...playerForm, avatarUrl: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#161F30] border border-slate-700 rounded-xl text-white outline-none text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Số áo thi đấu (#)</label>
              <input
                type="number"
                min={1}
                max={99}
                required
                value={playerForm.jerseyNumber}
                onChange={(e) => setPlayerForm({ ...playerForm, jerseyNumber: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Vị trí (Position)</label>
              <select
                value={playerForm.position}
                onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value as VolleyballPosition })}
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-semibold"
              >
                <option value="OH">Chủ công (OH - Outside Hitter)</option>
                <option value="OP">Đối chuyền (OP - Opposite Hitter)</option>
                <option value="MB">Phụ công (MB - Middle Blocker)</option>
                <option value="S">Chuyền hai (S - Setter)</option>
                <option value="L">Libero (L - Defense Specialist)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Chiều cao (cm)</label>
              <input
                type="number"
                required
                value={playerForm.height}
                onChange={(e) => setPlayerForm({ ...playerForm, height: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Tầm bật đập (cm)</label>
              <input
                type="number"
                required
                value={playerForm.spikeTouch}
                onChange={(e) => setPlayerForm({ ...playerForm, spikeTouch: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono text-orange-400 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Tầm bật chắn (cm)</label>
              <input
                type="number"
                placeholder="270"
                value={playerForm.blockTouch ?? ''}
                onChange={(e) => setPlayerForm({ ...playerForm, blockTouch: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono text-orange-400 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Năm sinh (Born Year)</label>
              <input
                type="number"
                value={playerForm.bornYear ?? 2005}
                onChange={(e) => setPlayerForm({ ...playerForm, bornYear: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Năm gia nhập CLB (Joined) *</label>
              <input
                type="number"
                min={2010}
                max={2035}
                required
                value={playerForm.joined ?? playerForm.joinedYear ?? 2025}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPlayerForm({ ...playerForm, joined: val, joinedYear: val });
                }}
                placeholder="e.g. 2025"
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none font-mono text-emerald-400 font-bold"
              />
            </div>

            <div>
              <CountrySelect
                label="Quốc gia / Quốc tịch (Country & Flag) *"
                value={(playerForm.countryCode || 'VN').toUpperCase()}
                onChange={(country) => {
                  setPlayerForm({
                    ...playerForm,
                    country: country.name,
                    countryName: country.name,
                    countryCode: country.code,
                    countryFlag: country.flag,
                  });
                }}
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Quê quán / Tỉnh thành (Hometown)</label>
              <input
                type="text"
                value={playerForm.hometownCountry || ''}
                onChange={(e) => setPlayerForm({ ...playerForm, hometownCountry: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Giới thiệu ngắn / Điểm mạnh phong trào</label>
            <textarea
              rows={2}
              value={playerForm.bio || ''}
              onChange={(e) => setPlayerForm({ ...playerForm, bio: e.target.value })}
              placeholder="e.g. Cựu tuyển thủ trường đại học, đập biên uy lực, phát bóng tấn công..."
              className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-red-600 to-orange-500 rounded-xl text-white font-bold cursor-pointer hover:brightness-110 shadow-lg"
            >
              Lưu VĐV Vào Danh Sách
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
