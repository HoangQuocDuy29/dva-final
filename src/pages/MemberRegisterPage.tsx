import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  UserPlus, 
  Check, 
  Send, 
  Table, 
  ShieldCheck, 
  Info
} from 'lucide-react';
import { VolleyballPosition, PlayerLevel, RotationKnowledge, MemberApplication } from '../types';
import { memberService, googleScriptSyncService } from '../services/api';

export const MemberRegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '2005-01-01',
    position: 'OH' as VolleyballPosition,
    hometownCountry: 'Hà Nội',
    desiredJerseyNumber: 15,
    level: 'JUNIOR' as PlayerLevel,
    height: 186,
    weight: 76,
    spikeReach: 335,
    blockReach: 318,
    gmail: '',
    instagram: '',
    zalo: '',
    rotationKnowledge: '5-1' as RotationKnowledge,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<MemberApplication | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.gmail || !formData.zalo) {
      alert('Vui lòng điền đầy đủ các trường thông tin bắt buộc (*)');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await memberService.register({
        ...formData,
        instagram: formData.instagram.trim() ? formData.instagram : 'None',
      });
      setSubmittedApp(created);

      // Realtime Google Sheets Sync (mỗi form 1 sheet)
      googleScriptSyncService.syncToGoogleSheet('TuyenThanhVien', {
        'Họ và tên': formData.fullName,
        'Ngày sinh': formData.dob,
        'Vị trí': formData.position,
        'Cấp độ': formData.level === 'SENIOR' ? 'Senior (Chơi tốt, trên 3 năm KN)' : formData.level === 'JUNIOR' ? 'Junior (Trung bình)' : 'Kid (Dưới 15 tuổi)',
        'Số áo mong muốn': formData.desiredJerseyNumber,
        'Chiều cao (cm)': formData.height,
        'Cân nặng (kg)': formData.weight,
        'Bật đập (cm)': formData.spikeReach,
        'Bật chắn (cm)': formData.blockReach,
        'Số Zalo': formData.zalo,
        'Email': formData.gmail,
        'Instagram': formData.instagram || 'None',
        'Chiến thuật 5-1': formData.rotationKnowledge,
        'Quê quán': formData.hometownCountry,
        'Thời gian gửi': new Date().toLocaleString('vi-VN')
      });
    } catch (err) {
      alert('Lỗi gửi hồ sơ đăng ký');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-red-500 uppercase tracking-widest bg-red-950/60 border border-red-800 px-3 py-1 rounded-full">
            Season 2026 Competitive Recruitment
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white font-heading">
            DVA Squad Tryout Application
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Submit your athletic profile and reach metrics. Applications are reviewed by DVA coaching staff and automatically synced into Google Sheets for tryout scheduling.
          </p>
        </div>

        {/* Confirmation State */}
        {submittedApp ? (
          <div className="bg-[#161F30] rounded-3xl border border-emerald-500 p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-950 border-2 border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow">
              <Check className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-heading font-black text-2xl text-white">
                Application Submitted Successfully!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
                Thank you <strong className="text-white">{submittedApp.fullName}</strong>. Your application for <strong className="text-orange-400">{submittedApp.position}</strong> has been recorded and synced to Google Sheets Tab <strong className="text-emerald-400">Member_Registrations</strong>.
              </p>
            </div>

            <div className="bg-[#0E1524] border border-slate-800 rounded-2xl p-5 max-w-md mx-auto text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Application ID:</span>
                <span className="font-mono font-bold text-white">{submittedApp.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Division:</span>
                <span className="font-bold text-orange-400">{submittedApp.level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Physical Metrics:</span>
                <span className="font-mono font-bold text-white">{submittedApp.height}cm / {submittedApp.weight}kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Spike Reach:</span>
                <span className="font-mono font-bold text-red-400">{submittedApp.spikeReach}cm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rotation System:</span>
                <span className="font-bold text-white">System {submittedApp.rotationKnowledge}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Link
                to="/players"
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-red-600 hover:bg-red-500 transition-colors shadow"
              >
                View Active Squad
              </Link>
              <button
                onClick={() => setSubmittedApp(null)}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Submit Another Application
              </button>
            </div>
          </div>
        ) : (
          /* Main Application Form */
          <form onSubmit={handleSubmit} className="bg-[#161F30] rounded-3xl border border-slate-800 p-6 sm:p-10 shadow-2xl space-y-8">
            
            {/* Section 1: Basic Information */}
            <div className="space-y-4">
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                <span>Personal Information & Desired Playing Position</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Marcus Tran"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-600 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-600 text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Primary Position *
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value as VolleyballPosition })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-600 text-white outline-none font-semibold"
                  >
                    <option value="OH">Outside Hitter (OH)</option>
                    <option value="OP">Opposite Hitter (OP)</option>
                    <option value="MB">Middle Blocker (MB)</option>
                    <option value="S">Setter (S)</option>
                    <option value="L">Libero (L)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Target Squad Division *
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as PlayerLevel })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-600 text-white outline-none font-semibold"
                  >
                    <option value="SENIOR">SENIOR (Người chơi tốt, trên 3 năm kinh nghiệm)</option>
                    <option value="JUNIOR">JUNIOR (Người chơi trung bình - Intermediate)</option>
                    <option value="KID">KID (Dưới 15 tuổi)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Preferred Jersey Number (#):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={formData.desiredJerseyNumber}
                    onChange={(e) => setFormData({ ...formData, desiredJerseyNumber: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-600 text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Hometown / City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.hometownCountry}
                    onChange={(e) => setFormData({ ...formData, hometownCountry: e.target.value })}
                    placeholder="Hanoi, Vietnam"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-600 text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Physical Metrics */}
            <div className="space-y-4">
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                <span>Physical Measurements & Jump Reach</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Height (cm) *</label>
                  <input
                    type="number"
                    required
                    min={140}
                    max={225}
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl font-mono font-bold text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Weight (kg) *</label>
                  <input
                    type="number"
                    required
                    min={40}
                    max={130}
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl font-mono font-bold text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-red-400 mb-1">Spike Reach (cm) *</label>
                  <input
                    type="number"
                    required
                    min={220}
                    max={380}
                    value={formData.spikeReach}
                    onChange={(e) => setFormData({ ...formData, spikeReach: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-red-900 rounded-xl font-mono font-bold text-red-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-orange-400 mb-1">Block Reach (cm) *</label>
                  <input
                    type="number"
                    required
                    min={210}
                    max={360}
                    value={formData.blockReach}
                    onChange={(e) => setFormData({ ...formData, blockReach: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-orange-900 rounded-xl font-mono font-bold text-orange-400 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Tactical Rotation & Contact */}
            <div className="space-y-4">
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                <span>Tactical Systems & Contact Information</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-300 mb-2">
                    Familiarity with Volleyball Rotational Systems:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: '5-1', label: '5-1 System', desc: '1 dedicated setter' },
                      { id: '6-2', label: '6-2 System', desc: 'Back-row setters' },
                      { id: '4-2', label: '4-2 System', desc: 'Front-row setters' },
                      { id: 'BEGINNER', label: 'Beginner', desc: 'Will learn at tryout' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, rotationKnowledge: item.id as RotationKnowledge })}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          formData.rotationKnowledge === item.id
                            ? 'border-red-500 bg-red-950/80 text-white ring-2 ring-red-500/20'
                            : 'border-slate-800 bg-[#0E1524] hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="font-bold">{item.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Contact Email (Gmail preferred) *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.gmail}
                    onChange={(e) => setFormData({ ...formData, gmail: e.target.value })}
                    placeholder="marcus.tran@gmail.com"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Phone / Zalo Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.zalo}
                    onChange={(e) => setFormData({ ...formData, zalo: e.target.value })}
                    placeholder="0912 345 678"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-300 mb-1">
                    Instagram Handle (or enter "None"):
                  </label>
                  <input
                    type="text"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="@your_handle or None"
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 shadow-xl shadow-red-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Submitting & Syncing to Google Sheets...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Submit Official Tryout Application</span>
                </>
              )}
            </button>

          </form>
        )}

      </div>
    </div>
  );
};
