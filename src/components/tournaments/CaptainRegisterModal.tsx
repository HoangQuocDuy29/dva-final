import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Phone,
  Plus,
  QrCode,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { Tournament, VolleyballPosition } from '../../types';
import { tournamentService } from '../../services/api';
import { buildCloudinaryFolder, uploadToCloudinary } from '../../utils/cloudinary';

interface CaptainRegisterModalProps {
  isOpen: boolean;
  tournament: Tournament;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

interface DraftPlayerRow {
  jerseyNumber: number;
  fullName: string;
  position: VolleyballPosition;
  height: string;
  spikeTouch: string;
  isCaptain: boolean;
}

const POSITIONS: VolleyballPosition[] = ['OH', 'OP', 'MB', 'S', 'L'];

const createInitialRoster = (): DraftPlayerRow[] =>
  Array.from({ length: 7 }, (_, i) => ({
    jerseyNumber: i + 1,
    fullName: '',
    position: (['S', 'OH', 'OH', 'MB', 'MB', 'OP', 'L'][i] || 'OH') as VolleyballPosition,
    height: '',
    spikeTouch: '',
    isCaptain: i === 0,
  }));

export const CaptainRegisterModal: React.FC<CaptainRegisterModalProps> = ({
  isOpen,
  tournament,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'FORM' | 'VIETQR' | 'CONFIRMED'>('FORM');
  const [teamName, setTeamName] = useState('');
  const [shortName, setShortName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [captainPhone, setCaptainPhone] = useState('');
  const [captainEmail, setCaptainEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [players, setPlayers] = useState<DraftPlayerRow[]>(createInitialRoster);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // VietQR Step Data
  const [registeredTeamId, setRegisteredTeamId] = useState('');
  const [paymentInfo, setPaymentInfo] = useState<{
    bankName: string;
    accountNo: string;
    accountName: string;
    amount: number;
    transferContent: string;
    qrUrl: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep('FORM');
    setErrorMsg(null);
    setTeamName('');
    setShortName('');
    setLogoUrl('');
    setCaptainName('');
    setCaptainPhone('');
    setCaptainEmail('');
    setNotes('');
    setPlayers(createInitialRoster());
    setPaymentInfo(null);
    setRegisteredTeamId('');
  }, [isOpen]);

  // Poll every 5s while VietQR modal is open so webhook PAID updates transition automatically
  useEffect(() => {
    if (!isOpen || step !== 'VIETQR' || !registeredTeamId) return undefined;
    const interval = setInterval(async () => {
      try {
        const fresh = await tournamentService.getTournament(tournament.slug, { noCache: true });
        const paidMatch = fresh.teams.find((t) => t.id === registeredTeamId && t.paymentStatus === 'PAID');
        if (paidMatch) {
          setStep('CONFIRMED');
          void onSuccess();
        }
      } catch {
        // ignore polling transient errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen, step, registeredTeamId, tournament.slug, onSuccess]);

  if (!isOpen) return null;

  const handleLogoUpload = async (file?: File) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await uploadToCloudinary(file, buildCloudinaryFolder('tournaments', 'logos'));
      setLogoUrl(res.secure_url || res.url);
    } catch {
      setErrorMsg('Logo upload failed. You can leave the logo blank or retry.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCopy = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validPlayers = players.filter((p) => p.fullName.trim().length >= 2);
    if (validPlayers.length < 6) {
      setErrorMsg('Please enter at least 6 athletes with valid names (minimum 2 characters each).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await tournamentService.registerTeam(tournament.slug, {
        name: teamName.trim(),
        shortName: shortName.trim().toUpperCase() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        captainName: captainName.trim(),
        captainPhone: captainPhone.trim(),
        captainEmail: captainEmail.trim() || undefined,
        notes: notes.trim() || undefined,
        players: validPlayers.map((p) => ({
          fullName: p.fullName.trim(),
          jerseyNumber: Number(p.jerseyNumber) || 0,
          position: p.position,
          height: p.height ? Number(p.height) : undefined,
          spikeTouch: p.spikeTouch ? Number(p.spikeTouch) : undefined,
          isCaptain: p.isCaptain,
        })),
      });

      setRegisteredTeamId(res.teamId);
      setPaymentInfo(res.payment);

      if (res.payment.amount <= 0) {
        setStep('CONFIRMED');
        await onSuccess();
      } else {
        setStep('VIETQR');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to submit team registration. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!registeredTeamId) return;
    setConfirmingPayment(true);
    setErrorMsg(null);
    try {
      await tournamentService.confirmTeamPayment(tournament.slug, registeredTeamId);
      setStep('CONFIRMED');
      await onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to submit transfer confirmation.');
    } finally {
      setConfirmingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-[#111827] border border-[#1E293B] rounded-3xl shadow-2xl text-white flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-[#0B0F19] px-5 sm:px-6 py-4 border-b border-[#1E293B] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B0000] to-[#F97316] flex items-center justify-center text-white shrink-0">
              {step === 'VIETQR' ? <QrCode className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-black text-base text-white truncate">
                {step === 'FORM'
                  ? `Register Team · ${tournament.name}`
                  : step === 'VIETQR'
                  ? `Entry Fee VietQR · ${teamName}`
                  : 'Registration Submitted'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {tournament.entryFeePerTeam > 0
                  ? `Entry Fee: ${tournament.entryFeePerTeam.toLocaleString('vi-VN')} đ / team · Official slot locks upon payment verification`
                  : 'Free Entry Tournament'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto text-xs space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-700 text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'FORM' && (
            <form onSubmit={handleSubmitForm} className="space-y-5">
              {/* Section 1: Team & Captain Info */}
              <div className="p-4 rounded-2xl bg-[#0B0F19] border border-[#1E293B] space-y-3.5">
                <h4 className="font-bold text-sm text-white">1. Team &amp; Captain Information</h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1">Team Name *</label>
                    <input
                      type="text"
                      required
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. Hanoi Spikers Club"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-[#1E293B] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Short Code (Bracket)</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={shortName}
                      onChange={(e) => setShortName(e.target.value)}
                      placeholder="HSC"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-[#1E293B] text-white font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Captain Full Name *</label>
                    <input
                      type="text"
                      required
                      value={captainName}
                      onChange={(e) => setCaptainName(e.target.value)}
                      placeholder="Captain Name"
                      className="w-full px-3 py-2.5 rounded-xl bg-[#111827] border border-[#1E293B]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Captain Phone / Zalo *</label>
                    <input
                      type="tel"
                      required
                      value={captainPhone}
                      onChange={(e) => setCaptainPhone(e.target.value)}
                      placeholder="0912345678"
                      className="w-full px-3 py-2.5 rounded-xl bg-[#111827] border border-[#1E293B] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Captain Email (for Receipt)</label>
                    <input
                      type="email"
                      value={captainEmail}
                      onChange={(e) => setCaptainEmail(e.target.value)}
                      placeholder="captain@email.com"
                      className="w-full px-3 py-2.5 rounded-xl bg-[#111827] border border-[#1E293B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1">Team Logo (Optional)</label>
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="Paste logo URL or upload image ->"
                      className="w-full px-3 py-2 rounded-xl bg-[#111827] border border-[#1E293B] text-slate-300"
                    />
                  </div>
                  <label className="sm:mt-5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                    {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[#38BDF8]" />}
                    <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e.target.files?.[0])} />
                  </label>
                </div>
              </div>

              {/* Section 2: Roster 7-10 Players */}
              <div className="p-4 rounded-2xl bg-[#0B0F19] border border-[#1E293B] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-white">2. Team Roster (6–14 Athletes)</h4>
                    <p className="text-[11px] text-slate-400">
                      Enter jersey number, full name, and position. Height &amp; spike reach are optional during registration.
                    </p>
                  </div>
                  {players.length < 14 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPlayers((prev) => [
                          ...prev,
                          {
                            jerseyNumber: prev.length + 1,
                            fullName: '',
                            position: 'OH',
                            height: '',
                            spikeTouch: '',
                            isCaptain: false,
                          },
                        ])
                      }
                      className="px-3 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-[#38BDF8] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Athlete</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {players.map((pl, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={pl.jerseyNumber}
                        onChange={(e) =>
                          setPlayers((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, jerseyNumber: Number(e.target.value) || 0 } : item
                            )
                          )
                        }
                        placeholder="#"
                        title="Jersey #"
                        className="col-span-2 sm:col-span-1 px-2 py-2 rounded-lg bg-[#111827] border border-[#1E293B] font-mono text-center"
                      />
                      <input
                        type="text"
                        required={idx < 6}
                        value={pl.fullName}
                        onChange={(e) =>
                          setPlayers((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, fullName: e.target.value } : item))
                          )
                        }
                        placeholder={`Athlete ${idx + 1} Full Name${idx < 6 ? ' *' : ''}`}
                        className="col-span-6 sm:col-span-4 px-2.5 py-2 rounded-lg bg-[#111827] border border-[#1E293B]"
                      />
                      <select
                        value={pl.position}
                        onChange={(e) =>
                          setPlayers((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, position: e.target.value as VolleyballPosition } : item
                            )
                          )
                        }
                        className="col-span-4 sm:col-span-2 px-2 py-2 rounded-lg bg-[#111827] border border-[#1E293B]"
                      >
                        {POSITIONS.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={pl.height}
                        onChange={(e) =>
                          setPlayers((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, height: e.target.value } : item))
                          )
                        }
                        placeholder="Ht(cm)"
                        className="col-span-4 sm:col-span-2 px-2 py-2 rounded-lg bg-[#111827] border border-[#1E293B]"
                      />
                      <label className="col-span-5 sm:col-span-2 flex items-center justify-center gap-1 text-[11px] cursor-pointer">
                        <input
                          type="radio"
                          name="captain-select"
                          checked={pl.isCaptain}
                          onChange={() =>
                            setPlayers((prev) =>
                              prev.map((item, i) => ({ ...item, isCaptain: i === idx }))
                            )
                          }
                          className="accent-amber-400"
                        />
                        <span>Capt.</span>
                      </label>
                      <div className="col-span-3 sm:col-span-1 flex justify-end">
                        {players.length > 6 && (
                          <button
                            type="button"
                            onClick={() => setPlayers((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#1E293B]">
                <div>
                  <span className="text-slate-400 block text-[11px]">Tournament Entry Fee</span>
                  <span className="font-mono font-black text-lg text-[#FACC15]">
                    {tournament.entryFeePerTeam > 0
                      ? `${tournament.entryFeePerTeam.toLocaleString('vi-VN')} đ`
                      : 'Free Entry'}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#8B0000] to-[#F97316] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {tournament.entryFeePerTeam > 0
                      ? 'Submit & Proceed to VietQR'
                      : 'Submit Registration'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {step === 'VIETQR' && paymentInfo && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                <div className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl border border-slate-700 shadow-xl">
                  <img
                    src={paymentInfo.qrUrl}
                    alt="VietQR MB Bank"
                    className="w-48 h-48 object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <span className="mt-2 text-[10px] font-bold text-slate-700 uppercase">
                    Scan with Any Banking App
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-2.5 bg-[#0B0F19] rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Bank:</span>
                    <span className="font-bold text-white">{paymentInfo.bankName}</span>
                  </div>

                  <div className="p-2.5 bg-[#0B0F19] rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Account No:</span>
                      <span className="font-mono font-black text-sm text-orange-400">{paymentInfo.accountNo}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('acct', paymentInfo.accountNo)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'acct' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'acct' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="p-2.5 bg-[#0B0F19] rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Amount Due:</span>
                      <span className="font-mono font-black text-sm text-[#FACC15]">
                        {paymentInfo.amount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('amt', String(paymentInfo.amount))}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'amt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'amt' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="p-2.5 bg-red-950/30 rounded-xl border border-red-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-red-300 uppercase font-bold block">Transfer Memo (Required):</span>
                      <span className="font-mono font-black text-xs text-white">{paymentInfo.transferContent}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('memo', paymentInfo.transferContent)}
                      className="px-2.5 py-1 rounded-lg bg-red-900/60 border border-red-700 text-red-200 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'memo' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'memo' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={confirmingPayment}
                onClick={handleConfirmTransfer}
                className="w-full py-3.5 px-6 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 shadow-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                {confirmingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                <span>I Have Completed Payment Transfer</span>
              </button>
            </div>
          )}

          {step === 'CONFIRMED' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="font-heading font-black text-xl text-white">
                Team Registration Recorded!
              </h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Thank you Captain <strong>{captainName}</strong>! Your roster for <strong>{teamName}</strong> has been submitted. Our Organizing Committee will verify your transfer and publish your team to the official tournament roster.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-xs text-slate-300">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>Tournament Hotline / Zalo: <strong className="font-mono text-white">0768 299 329</strong></span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#8B0000] to-[#F97316] text-white font-bold cursor-pointer"
                >
                  Back to Tournament
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
