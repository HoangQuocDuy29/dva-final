import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useAdminDashboard } from '../context/AdminDashboardContext';

export const FeedbackBanner: React.FC = () => {
  const { feedback } = useAdminDashboard();

  if (!feedback) return null;

  return (
    <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      <span>{feedback}</span>
    </div>
  );
};
