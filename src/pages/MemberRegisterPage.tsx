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
  const [submittedApp, setSubmittedApp] = useState<MemberApplication | null>(() => {
    try {
      const saved = sessionStorage.getItem('dva_submitted_app');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleClosePass = () => {
    setSubmittedApp(null);
    try {
      sessionStorage.removeItem('dva_submitted_app');
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.gmail.trim() || !formData.zalo.trim()) {
      alert('Please fill out all required fields (*)');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await memberService.register({
        ...formData,
        instagram: formData.instagram.trim() ? formData.instagram : 'None',
      });
      setSubmittedApp(created);
      try {
        sessionStorage.setItem('dva_submitted_app', JSON.stringify(created));
      } catch {
        // ignore
      }

      // Realtime Google Sheets Sync (Tab: TuyenThanhVien)
      googleScriptSyncService.syncToGoogleSheet('TuyenThanhVien', {
        'Họ và tên': formData.fullName,
        'Ngày sinh': formData.dob,
        'Vị trí': formData.position,
        'Cấp độ': formData.level === 'SENIOR' ? 'Senior (Advanced, 3+ yrs)' : formData.level === 'JUNIOR' ? 'Junior (Intermediate)' : 'Youth',
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
        'Thời gian gửi': new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })
      });
    } catch (err) {
      alert('Error submitting application. Please try again.');
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
            Season 2026
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white font-heading">
            Player Registration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Submit your athletic profile and reach metrics. Applications will be reviewed directly by the team captain, and we will contact you within 24 hours.
          </p>
        </div>

        {/* Official DVA Athlete Membership Card Notification Modal */}
        {submittedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div className="max-w-xl w-full bg-[#0F141F] rounded-3xl border border-amber-500/50 shadow-2xl overflow-hidden text-white relative">
              {/* Card Ambient Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="bg-gradient-to-r from-red-950 via-[#161B26] to-[#121620] px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center font-black text-white text-base shadow-lg shadow-red-950">
                    DVA
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-sm sm:text-base text-white tracking-wide">
                      PLAYER REGISTRATION SUBMITTED!
                    </h3>
                    <p className="text-[11px] text-amber-400 font-semibold">
                      DVA Volleyball Club · Official Athlete Membership Pass
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClosePass}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Physical Athlete Card Representation */}
              <div className="p-6 space-y-6">
                
                {/* The Pass Card */}
                <div className="rounded-3xl border-2 border-amber-500/60 bg-gradient-to-br from-[#1A2234] via-[#121826] to-[#0A0E17] p-6 shadow-2xl relative overflow-hidden group">
                  {/* Decorative background watermark */}
                  <div className="absolute right-4 -bottom-6 font-black text-8xl text-white/[0.03] select-none pointer-events-none font-heading">
                    DVA
                  </div>

                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                        DVA VOLLEYBALL CLUB · ATHLETE MEMBERSHIP PASS
                      </span>
                      <h2 className="font-heading font-black text-2xl sm:text-3xl text-white tracking-tight mt-1">
                        {submittedApp.fullName}
                      </h2>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow">
                          {submittedApp.position} · {submittedApp.level}
                        </span>
                        <span className="text-[11px] font-mono text-slate-300">
                          Jersey #{submittedApp.desiredJerseyNumber}
                        </span>
                      </div>
                    </div>

                    <div className="w-16 h-16 rounded-2xl bg-[#090D14] border border-amber-500/40 p-1.5 flex flex-col items-center justify-center shrink-0 shadow-inner">
                      <span className="text-[8px] font-mono text-slate-400 uppercase">VERIFIED</span>
                      <span className="font-mono font-bold text-xs text-amber-400">PASSED</span>
                      <span className="text-[8px] text-emerald-400">✓ SYNCED</span>
                    </div>
                  </div>

                  {/* Metrics grid inside card */}
                  <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-slate-800/80 text-center">
                    <div className="bg-[#0B0F19]/80 p-2 rounded-xl border border-slate-800">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Height / Weight</span>
                      <span className="font-mono font-bold text-white text-xs">{submittedApp.height}cm · {submittedApp.weight}kg</span>
                    </div>
                    <div className="bg-[#0B0F19]/80 p-2 rounded-xl border border-slate-800">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Spike Reach</span>
                      <span className="font-mono font-bold text-red-400 text-xs">{submittedApp.spikeReach} cm</span>
                    </div>
                    <div className="bg-[#0B0F19]/80 p-2 rounded-xl border border-slate-800">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Tactical System</span>
                      <span className="font-mono font-bold text-amber-400 text-xs">System {submittedApp.rotationKnowledge}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Pass ID: <strong>{submittedApp.id}</strong></span>
                    <span>Contact: <strong className="text-white">{submittedApp.zalo}</strong></span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <Link
                    to="/players"
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl font-black text-xs text-white bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 shadow-lg text-center transition-all cursor-pointer"
                  >
                    View Squad Roster
                  </Link>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full sm:w-auto py-3 px-5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
                  >
                    Print / Save Pass
                  </button>
                  <button
                    type="button"
                    onClick={handleClosePass}
                    className="w-full sm:w-auto py-3 px-5 rounded-xl font-bold text-xs bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}
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
                    Full Name *
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
                    Level *
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as PlayerLevel })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-600 text-white outline-none font-semibold"
                  >
                    <option value="SENIOR">SENIOR (Người chơi tốt, trên 3 năm kinh nghiệm)</option>
                    <option value="JUNIOR">JUNIOR (Người chơi trung bình - Intermediate)</option>
                    <option value="YOUTH">Youth</option>
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
                  <span>Submit Registration</span>
                </>
              )}
            </button>

          </form>

      </div>
    </div>
  );
};
