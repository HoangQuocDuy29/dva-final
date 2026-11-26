import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, MessageCircle, Phone, Copy, Check, Loader2, ChevronRight } from 'lucide-react';
import { authService, venueService } from '../../services/api';
import type { CourtClubProfile, RevealedSessionContact, VenueSessionSlot, VolleyballVenue } from '../../types';
import { buildZaloContact, sanitizePhoneForLink } from '../../utils/venueSchedule';
import type { ContactRevealTarget } from './ContactRevealModal';

const REVEAL_STORAGE_KEY = 'dva_revealed_contacts_v1';

export function readRevealedContactCache(sessionId: string): RevealedSessionContact | null {
  if (typeof window === 'undefined' || !sessionId) return null;
  try {
    const raw = window.sessionStorage.getItem(REVEAL_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, RevealedSessionContact>;
    return map && map[sessionId] ? map[sessionId] : null;
  } catch {
    return null;
  }
}

export function writeRevealedContactCache(contact: RevealedSessionContact): void {
  if (typeof window === 'undefined' || !contact?.sessionId) return;
  try {
    const raw = window.sessionStorage.getItem(REVEAL_STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, RevealedSessionContact>) : {};
    map[contact.sessionId] = contact;
    window.sessionStorage.setItem(REVEAL_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
}

export function formatDisplayPhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  if (digits.length === 11) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return phone;
}

interface SessionContactRowProps {
  sessionId: string;
  club: Pick<CourtClubProfile, 'name' | 'slug' | 'captainName' | 'captainPhone' | 'captainZalo' | 'hasContact'>;
  venue: Pick<VolleyballVenue, 'name'>;
  session?: Pick<VenueSessionSlot, 'daysOfWeek' | 'startTime' | 'endTime' | 'subCourts'>;
  revealedContact: RevealedSessionContact | null;
  isVisible: boolean;
  onRevealSuccess: (contact: RevealedSessionContact) => void;
  onToggleVisibility: (sessionId: string, visible: boolean) => void;
  onRequireVerify: (target: ContactRevealTarget) => void;
  onNotify: (msg: string) => void;
  detailHref?: string;
}

export const SessionContactRow: React.FC<SessionContactRowProps> = ({
  sessionId,
  club,
  venue,
  session,
  revealedContact,
  isVisible,
  onRevealSuccess,
  onToggleVisibility,
  onRequireVerify,
  onNotify,
  detailHref,
}) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleEyeClick = async () => {
    if (isVisible && revealedContact) {
      onToggleVisibility(sessionId, false);
      return;
    }
    if (revealedContact) {
      onToggleVisibility(sessionId, true);
      return;
    }
    const cached = readRevealedContactCache(sessionId);
    if (cached) {
      onRevealSuccess(cached);
      return;
    }
    const isLoggedIn = authService.hasToken() && authService.getCurrentUser().role !== 'GUEST';
    if (isLoggedIn) {
      setLoading(true);
      try {
        const res = await venueService.revealSessionContact(sessionId);
        writeRevealedContactCache(res);
        onRevealSuccess(res);
      } catch (err: any) {
        onNotify(err?.message || 'Không thể mở SĐT đội trưởng lúc này.');
      } finally {
        setLoading(false);
      }
      return;
    }
    onRequireVerify({
      sessionId,
      clubName: club.name,
      captainName: club.captainName,
    });
  };

  const handleOpenZalo = async () => {
    if (!revealedContact) return;
    const { zaloUrl, messageTemplate } = buildZaloContact(
      {
        name: club.name,
        captainName: revealedContact.captainName || club.captainName,
        captainPhone: revealedContact.captainPhone,
        captainZalo: revealedContact.captainZalo,
      },
      venue,
      session
    );
    try {
      await navigator.clipboard.writeText(messageTemplate);
      onNotify('Đã sao chép tin nhắn mẫu hỏi slot — dán vào Zalo để gửi!');
    } catch { /* ignore */ }
    window.open(zaloUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyPhone = async () => {
    if (!revealedContact) return;
    try {
      await navigator.clipboard.writeText(revealedContact.captainPhone);
      setCopied(true);
      onNotify(`Đã sao chép SĐT đội trưởng: ${formatDisplayPhone(revealedContact.captainPhone)}`);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      onNotify('Không thể sao chép vào bộ nhớ tạm.');
    }
  };

  const showingReal = Boolean(isVisible && revealedContact);
  const displayPhone = showingReal && revealedContact
    ? formatDisplayPhone(revealedContact.captainPhone)
    : club.captainPhone || '*** ***';

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/10">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-slate-400">SĐT / Zalo đội trưởng</p>
          <p className={`font-mono text-xs font-black tracking-wide truncate ${showingReal ? 'text-emerald-300' : 'text-slate-200'}`}>
            {displayPhone}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleEyeClick()}
            title={showingReal ? 'Ẩn số điện thoại' : 'Xác thực để xem SĐT / Zalo đội trưởng'}
            aria-label={showingReal ? 'Ẩn số điện thoại' : 'Xem số điện thoại đội trưởng'}
            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-60 ${
              showingReal
                ? 'bg-orange-500/15 border-orange-500/50 text-orange-300 hover:bg-orange-500/25'
                : 'bg-white/[0.06] border-white/15 text-slate-200 hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-300'
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
            ) : showingReal ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
          {detailHref && (
            <Link
              to={detailHref}
              className="h-9 px-3 rounded-full dva-glass-pill text-slate-100 hover:text-orange-300 hover:bg-white/10 font-bold text-xs inline-flex items-center justify-center gap-0.5 whitespace-nowrap shrink-0"
            >
              <span>Chi tiết</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            </Link>
          )}
        </div>
      </div>

      {showingReal && revealedContact && (
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => void handleOpenZalo()}
            className="min-h-[38px] py-2 px-2 rounded-xl bg-[#0068FF] hover:bg-[#0058D9] text-white font-bold text-[11px] inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Nhắn Zalo</span>
          </button>
          <a
            href={`tel:${sanitizePhoneForLink(revealedContact.captainPhone)}`}
            className="min-h-[38px] py-2 px-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/45 text-emerald-300 font-bold text-[11px] inline-flex items-center justify-center gap-1 whitespace-nowrap transition-colors"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>Gọi điện</span>
          </a>
          <button
            type="button"
            onClick={() => void handleCopyPhone()}
            className="min-h-[38px] py-2 px-2 rounded-xl bg-white/[0.06] hover:bg-white/12 border border-white/15 text-slate-100 font-bold text-[11px] inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
            <span>{copied ? 'Đã copy' : 'Copy'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
