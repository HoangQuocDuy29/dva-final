import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useAdminDashboard } from '../context/AdminDashboardContext';

export const FeedbackBanner: React.FC = () => {
  const { feedback, setFeedback } = useAdminDashboard();

  if (!feedback) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[60] max-w-md bg-emerald-950/95 backdrop-blur-md border border-emerald-500/80 text-emerald-100 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2.5 shadow-2xl shadow-black/70 animate-in fade-in slide-in-from-bottom-2"
    >
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      <span className="leading-snug">{feedback}</span>
      <button
        type="button"
        onClick={() => setFeedback(null)}
        aria-label="Đóng thông báo"
        className="ml-1 p-1 rounded-lg text-emerald-300/80 hover:text-white hover:bg-emerald-900/60 cursor-pointer transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
