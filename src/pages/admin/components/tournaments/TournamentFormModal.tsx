import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, Plus, Trash2, Trophy } from 'lucide-react';
import {
  Tournament,
  TournamentMode,
  TournamentPrizeTier,
  TournamentSetFormat,
  TournamentStatus,
  TournamentTrackingMode,
} from '../../../../types';
import { buildCloudinaryFolder, uploadToCloudinary } from '../../../../utils/cloudinary';

export interface TournamentFormModalProps {
  isOpen: boolean;
  editing: Tournament | null;
  onClose: () => void;
  onSave: (payload: Partial<Tournament>, existingId?: string) => Promise<void>;
  notify: (msg: string, durationMs?: number) => void;
}

const DEFAULT_PRIZES: TournamentPrizeTier[] = [
  { rank: '1ST', label: 'Champion', cashAmount: 5000000, nonCashReward: 'Championship Trophy + Gold Medals + Banner' },
  { rank: '2ND', label: 'Runner-Up', cashAmount: 2500000, nonCashReward: 'Silver Medals + Banner' },
  { rank: '3RD', label: '3rd Place', cashAmount: 1000000, nonCashReward: 'Bronze Medals + Banner' },
  { rank: 'INDIVIDUAL', label: 'Individual Awards', cashAmount: 0, nonCashReward: 'MVP, Best Setter, Best Spiker, Best Libero Trophies' },
];

export const TournamentFormModal: React.FC<TournamentFormModalProps> = ({
  isOpen,
  editing,
  onClose,
  onSave,
  notify,
}) => {
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [slug, setSlug] = useState('');
  const [mode, setMode] = useState<TournamentMode>('HOSTED');
  const [trackingMode, setTrackingMode] = useState<TournamentTrackingMode>('FULL_BRACKET');
  const [status, setStatus] = useState<TournamentStatus>('UPCOMING');
  const [isActive, setIsActive] = useState(true);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [maxTeams, setMaxTeams] = useState(8);
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('07:30');
  const [location, setLocation] = useState('155 Truong Chinh, Thanh Xuan, Hanoi (DVA Court - BTL Thong Tin)');
  const [mapsUrl, setMapsUrl] = useState('https://maps.app.goo.gl/hkqofjzojcUoE39M7');
  const [bannerUrl, setBannerUrl] = useState('');
  const [groupSetFormat, setGroupSetFormat] = useState<TournamentSetFormat>('BO3');
  const [knockoutSetFormat, setKnockoutSetFormat] = useState<TournamentSetFormat>('BO3');
  const [entryFeePerTeam, setEntryFeePerTeam] = useState(1000000);
  const [internalExpenseNote, setInternalExpenseNote] = useState('');
  const [dvaResultSummary, setDvaResultSummary] = useState('');
  const [rulesContent, setRulesContent] = useState('');
  const [prizeConfig, setPrizeConfig] = useState<TournamentPrizeTier[]>(DEFAULT_PRIZES);

  // DVA_FOCUS optional podium overrides
  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [thirdName, setThirdName] = useState('');

  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setName(editing.name);
      setSubtitle(editing.subtitle || '');
      setSlug(editing.slug || '');
      setMode(editing.mode);
      setTrackingMode(editing.trackingMode || 'FULL_BRACKET');
      setStatus(editing.status);
      setIsActive(editing.isActive !== false);
      setIsRegistrationOpen(Boolean(editing.isRegistrationOpen));
      setMaxTeams(editing.maxTeams || 8);
      setRegistrationDeadline(editing.registrationDeadline || '');
      setStartDate(editing.startDate || '');
      setEndDate(editing.endDate || editing.startDate || '');
      setStartTime(editing.startTime || '07:30');
      setLocation(editing.location || '155 Truong Chinh, Thanh Xuan, Hanoi (DVA Court - BTL Thong Tin)');
      setMapsUrl(editing.mapsUrl || '');
      setBannerUrl(editing.bannerUrl || '');
      setGroupSetFormat(editing.groupSetFormat || 'BO3');
      setKnockoutSetFormat(editing.knockoutSetFormat || 'BO3');
      setEntryFeePerTeam(editing.entryFeePerTeam || 0);
      setInternalExpenseNote(editing.internalExpenseNote || '');
      setDvaResultSummary(editing.dvaResultSummary || '');
      setRulesContent(editing.rulesContent || '');
      setPrizeConfig(editing.prizeConfig?.length ? editing.prizeConfig : DEFAULT_PRIZES);
      setFirstName(editing.podiumOverride?.firstName || '');
      setSecondName(editing.podiumOverride?.secondName || '');
      setThirdName(editing.podiumOverride?.thirdName || '');
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setName('');
      setSubtitle('1-Day 8-Team Championship · 2 Parallel Courts');
      setSlug('');
      setMode('HOSTED');
      setTrackingMode('FULL_BRACKET');
      setStatus('UPCOMING');
      setIsActive(true);
      setIsRegistrationOpen(true);
      setMaxTeams(8);
      setRegistrationDeadline('');
      setStartDate(today);
      setEndDate(today);
      setStartTime('07:30');
      setLocation('155 Truong Chinh, Thanh Xuan, Hanoi (DVA Court - BTL Thong Tin)');
      setMapsUrl('https://maps.app.goo.gl/hkqofjzojcUoE39M7');
      setBannerUrl('');
      setGroupSetFormat('BO3');
      setKnockoutSetFormat('BO3');
      setEntryFeePerTeam(1000000);
      setInternalExpenseNote('');
      setDvaResultSummary('');
      setRulesContent(
        `1. COMPETITION FORMAT\n- 8 teams divided into 2 pools (Pool A & Pool B).\n- Group Stage: Single round-robin, BO3 (Sets 1-2 to 25 pts, Deciding Set 3 to 15 pts).\n- All 8 teams advance to Quarterfinals (1A vs 4B, 3A vs 2B, 2A vs 3B, 4A vs 1B).\n\n2. STANDINGS & TIE-BREAKERS\n- FIVB Points: 2-0 = 3 pts | 2-1 = 2 pts | 1-2 = 1 pt | 0-2 = 0 pts.\n- Order: Wins -> FIVB Points -> Set Ratio -> Point Ratio -> Head-to-Head.\n\n3. CHECK-IN & UNIFORM\n- Captains must check in 30 minutes before kick-off with matching numbered jerseys.`
      );
      setPrizeConfig(DEFAULT_PRIZES);
      setFirstName('');
      setSecondName('');
      setThirdName('');
    }
  }, [isOpen, editing]);

  if (!isOpen) return null;

  const handleBannerUpload = async (file?: File) => {
    if (!file) return;
    setUploadingBanner(true);
    try {
      const res = await uploadToCloudinary(file, buildCloudinaryFolder('tournaments', 'banners'));
      setBannerUrl(res.secure_url || res.url);
      notify(`Banner uploaded (${res.folder}).`);
    } catch {
      notify('Banner upload failed.');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate) {
      notify('Tournament name and start date are required.');
      return;
    }
    setSaving(true);
    try {
      const hasPodiumOverride =
        trackingMode === 'DVA_FOCUS' && (firstName.trim() || secondName.trim() || thirdName.trim());

      await onSave(
        {
          name: name.trim(),
          subtitle: subtitle.trim() || undefined,
          slug: slug.trim() || undefined,
          mode,
          trackingMode: mode === 'HOSTED' ? 'FULL_BRACKET' : trackingMode,
          status,
          isActive,
          isRegistrationOpen: mode === 'HOSTED' ? isRegistrationOpen : false,
          maxTeams: Math.max(2, Math.min(32, Number(maxTeams) || 8)),
          registrationDeadline: registrationDeadline || undefined,
          startDate,
          endDate: endDate || startDate,
          startTime: startTime.trim() || '07:30',
          location: location.trim(),
          mapsUrl: mapsUrl.trim() || undefined,
          bannerUrl: bannerUrl.trim() || undefined,
          groupSetFormat,
          knockoutSetFormat,
          entryFeePerTeam: mode === 'HOSTED' ? Math.max(0, Math.round(Number(entryFeePerTeam) || 0)) : 0,
          internalExpenseNote: mode === 'PARTICIPATING' ? internalExpenseNote.trim() : undefined,
          dvaResultSummary: dvaResultSummary.trim() || undefined,
          rulesContent: rulesContent.trim() || undefined,
          prizeConfig: prizeConfig.filter((p) => p.label.trim()),
          podiumOverride: hasPodiumOverride
            ? {
                firstName: firstName.trim() || undefined,
                secondName: secondName.trim() || undefined,
                thirdName: thirdName.trim() || undefined,
              }
            : null,
        },
        editing?.id
      );
      onClose();
    } catch (err: any) {
      notify(err?.message || 'Unable to save tournament.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-[#111827] border border-[#1E293B] rounded-3xl shadow-2xl text-white max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#111827]/95 backdrop-blur px-6 py-4 border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-[#F97316]" />
            <div>
              <h3 className="font-heading font-black text-base text-white">
                {editing ? `Edit Tournament: ${editing.name}` : 'Create New Tournament'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure Hosting vs. Participating mode, entry fee, format, prizes, and rules.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* Mode & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Role / Mode *</label>
              <select
                value={mode}
                onChange={(e) => {
                  const next = e.target.value as TournamentMode;
                  setMode(next);
                  if (next === 'HOSTED') {
                    setTrackingMode('FULL_BRACKET');
                    if (!location) {
                      setLocation('155 Truong Chinh, Thanh Xuan, Hanoi (DVA Court - BTL Thong Tin)');
                    }
                  } else {
                    setEntryFeePerTeam(0);
                    setIsRegistrationOpen(false);
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white font-semibold"
              >
                <option value="HOSTED">DVA Hosted (Revenue Enabled)</option>
                <option value="PARTICIPATING">DVA Participating / Away (No Revenue)</option>
              </select>
            </div>

            {mode === 'PARTICIPATING' ? (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tracking Scope</label>
                <select
                  value={trackingMode}
                  onChange={(e) => setTrackingMode(e.target.value as TournamentTrackingMode)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white font-semibold"
                >
                  <option value="FULL_BRACKET">Full Bracket Mode (8 Teams)</option>
                  <option value="DVA_FOCUS">DVA Focus Mode (Quick Entry)</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Entry Fee / Team (VND)</label>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  value={entryFeePerTeam}
                  onChange={(e) => setEntryFeePerTeam(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-[#FACC15] font-mono font-bold"
                />
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Tournament Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TournamentStatus)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white font-semibold"
              >
                <option value="UPCOMING">UPCOMING (Registration / Pre-event)</option>
                <option value="ONGOING">ONGOING (Live Matchday)</option>
                <option value="COMPLETED">COMPLETED (Archive & Podium)</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          {/* Core Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Tournament Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. DVA Open Cup 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">URL Slug (auto if blank)</label>
              <input
                type="text"
                placeholder="e.g. dva-open-cup-2026"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-slate-300 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Subtitle / Tagline</label>
            <input
              type="text"
              placeholder="e.g. 1-Day 8-Team Invitational Championship · 2 Parallel Courts"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white"
            />
          </div>

          {/* Dates, Time & Format */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Group Format</label>
              <select
                value={groupSetFormat}
                onChange={(e) => setGroupSetFormat(e.target.value as TournamentSetFormat)}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white"
              >
                <option value="BO3">BO3 (Best of 3)</option>
                <option value="BO2">BO2 (2 Sets)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Knockout Format</label>
              <select
                value={knockoutSetFormat}
                onChange={(e) => setKnockoutSetFormat(e.target.value as TournamentSetFormat)}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white"
              >
                <option value="BO3">BO3 (Best of 3)</option>
                <option value="BO2">BO2 (2 Sets)</option>
              </select>
            </div>
          </div>

          {/* Location & Registration Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1">Venue Location *</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Max Teams</label>
              <input
                type="number"
                min={2}
                max={32}
                value={maxTeams}
                onChange={(e) => setMaxTeams(Number(e.target.value) || 8)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white font-mono"
              />
            </div>
          </div>

          {/* Visibility & Registration Toggles */}
          <div className="flex flex-wrap items-center gap-4 p-3.5 rounded-2xl bg-[#0B0F19] border border-[#1E293B]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-[#F97316] w-4 h-4"
              />
              <span className="font-bold text-white">Published on Public /tournaments</span>
            </label>
            {mode === 'HOSTED' && (
              <>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRegistrationOpen}
                    onChange={(e) => setIsRegistrationOpen(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4"
                  />
                  <span className="font-bold text-emerald-300">Open Public Captain Registration</span>
                </label>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-slate-400">Reg. Deadline:</span>
                  <input
                    type="date"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-[#111827] border border-[#1E293B] text-white"
                  />
                </div>
              </>
            )}
          </div>

          {/* Banner Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1">Tournament Banner URL</label>
              <input
                type="text"
                placeholder="https://res.cloudinary.com/..."
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-slate-300"
              />
            </div>
            <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center justify-center gap-2 cursor-pointer">
              {uploadingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-[#38BDF8]" />}
              <span>{uploadingBanner ? 'Uploading...' : 'Upload Banner'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleBannerUpload(e.target.files?.[0])}
              />
            </label>
          </div>

          {/* PARTICIPATING Mode Summary & Expense Note */}
          {mode === 'PARTICIPATING' && (
            <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-800/40 space-y-3">
              <p className="text-[11px] font-bold text-sky-300 uppercase tracking-wider">
                DVA Participating Mode (Zero Club Revenue Impact)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">DVA Final Result Summary</label>
                  <input
                    type="text"
                    placeholder="e.g. 3rd Place — FCB Open Cup 2025"
                    value={dvaResultSummary}
                    onChange={(e) => setDvaResultSummary(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Internal Expense / Fund Note (Admin Only)</label>
                  <input
                    type="text"
                    placeholder="e.g. Entry fund 1.2M + travel (not counted in revenue)"
                    value={internalExpenseNote}
                    onChange={(e) => setInternalExpenseNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-slate-300"
                  />
                </div>
              </div>
              {trackingMode === 'DVA_FOCUS' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="1st Place Team (Optional)"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white"
                  />
                  <input
                    type="text"
                    placeholder="2nd Place Team (Optional)"
                    value={secondName}
                    onChange={(e) => setSecondName(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white"
                  />
                  <input
                    type="text"
                    placeholder="3rd Place Team (Optional)"
                    value={thirdName}
                    onChange={(e) => setThirdName(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white"
                  />
                </div>
              )}
            </div>
          )}

          {/* Flexible Prize Structure */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold">Flexible Prize Structure (Cash + Trophies/Medals)</label>
              <button
                type="button"
                onClick={() =>
                  setPrizeConfig((prev) => [
                    ...prev,
                    { rank: 'BONUS', label: 'Special Award', cashAmount: 0, nonCashReward: 'Commemorative Flag' },
                  ])
                }
                className="px-2.5 py-1 rounded-lg bg-[#1E293B] hover:bg-slate-700 text-white font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Tier
              </button>
            </div>
            <div className="space-y-2">
              {prizeConfig.map((tier, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={tier.rank}
                    onChange={(e) =>
                      setPrizeConfig((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, rank: e.target.value } : p))
                      )
                    }
                    placeholder="1ST"
                    className="col-span-2 px-2.5 py-2 rounded-lg bg-[#0B0F19] border border-[#1E293B] font-mono text-amber-300"
                  />
                  <input
                    type="text"
                    value={tier.label}
                    onChange={(e) =>
                      setPrizeConfig((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, label: e.target.value } : p))
                      )
                    }
                    placeholder="Champion"
                    className="col-span-3 px-2.5 py-2 rounded-lg bg-[#0B0F19] border border-[#1E293B]"
                  />
                  <input
                    type="number"
                    min={0}
                    step={100000}
                    value={tier.cashAmount ?? 0}
                    onChange={(e) =>
                      setPrizeConfig((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, cashAmount: Number(e.target.value) || 0 } : p))
                      )
                    }
                    placeholder="Cash VND (0 = none)"
                    className="col-span-3 px-2.5 py-2 rounded-lg bg-[#0B0F19] border border-[#1E293B] font-mono text-emerald-400"
                  />
                  <input
                    type="text"
                    value={tier.nonCashReward || ''}
                    onChange={(e) =>
                      setPrizeConfig((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, nonCashReward: e.target.value } : p))
                      )
                    }
                    placeholder="Trophy / Medals / Banner"
                    className="col-span-3 px-2.5 py-2 rounded-lg bg-[#0B0F19] border border-[#1E293B]"
                  />
                  <button
                    type="button"
                    onClick={() => setPrizeConfig((prev) => prev.filter((_, i) => i !== idx))}
                    className="col-span-1 p-2 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Rules & Regulations */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Rules &amp; Regulations (Direct link: /tournaments/&lt;slug&gt;/rules)
            </label>
            <textarea
              rows={5}
              value={rulesContent}
              onChange={(e) => setRulesContent(e.target.value)}
              placeholder="Write tournament rules, eligibility, tie-breaker criteria, and check-in times..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-slate-200 leading-relaxed"
            />
          </div>

          <div className="pt-3 border-t border-[#1E293B] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B0000] to-[#F97316] hover:brightness-110 text-white font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editing ? 'Save Changes' : 'Create Tournament'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
