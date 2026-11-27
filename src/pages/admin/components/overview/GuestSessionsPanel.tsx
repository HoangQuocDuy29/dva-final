import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Mail,
  Plus,
  Ticket,
  Trash2,
  XCircle,
} from 'lucide-react';
import { GuestSessionRecord, PaymentStatus } from '../../../../types';
import { adminService } from '../../../../services/api';
import { Pagination } from '../../../../components/common/Pagination';
import { useAdminDashboard } from '../../context/AdminDashboardContext';
import { useAdminMetrics } from '../../hooks/useAdminMetrics';

const GUEST_PAGE_SIZE = 8;
type StatusFilter = 'ALL' | PaymentStatus;

interface GuestSessionsPanelProps {
  panelRef?: React.RefObject<HTMLDivElement | null>;
}

export const GuestSessionsPanel: React.FC<GuestSessionsPanelProps> = ({ panelRef }) => {
  const {
    openGuestModal,
    notify,
    data: { guestSessions },
    setData: { setGuestSessions },
  } = useAdminDashboard();
  const { guestSessionRevenue, paidGuestSessionsCount, pendingGuestSessionsCount } =
    useAdminMetrics();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(() => {
    let pending = 0;
    let paid = 0;
    let cancelled = 0;
    let pendingAmount = 0;
    for (const g of guestSessions) {
      if (g.paymentStatus === 'PAID') paid += 1;
      else if (g.paymentStatus === 'CANCELLED') cancelled += 1;
      else {
        pending += 1;
        pendingAmount += Number(g.amount) || 0;
      }
    }
    return {
      ALL: guestSessions.length,
      PENDING: pending,
      PAID: paid,
      CANCELLED: cancelled,
      pendingAmount,
    };
  }, [guestSessions]);

  const filteredSessions = useMemo(
    () =>
      statusFilter === 'ALL'
        ? guestSessions
        : guestSessions.filter((g) => g.paymentStatus === statusFilter),
    [guestSessions, statusFilter]
  );

  const safePage = Math.min(
    Math.max(1, currentPage),
    Math.max(1, Math.ceil(filteredSessions.length / GUEST_PAGE_SIZE))
  );
  const paginatedSessions = filteredSessions.slice(
    (safePage - 1) * GUEST_PAGE_SIZE,
    safePage * GUEST_PAGE_SIZE
  );

  const handleUpdateStatus = async (session: GuestSessionRecord, nextStatus: PaymentStatus) => {
    setBusyId(session.id);
    try {
      const updated = await adminService.updateGuestSessionStatus(session.id, nextStatus);
      setGuestSessions((prev) =>
        prev.map((item) => (item.id === session.id ? { ...item, ...updated } : item))
      );
      notify(
        nextStatus === 'PAID'
          ? `Confirmed ${session.guestName} (${session.amount.toLocaleString('vi-VN')} đ) as PAID.`
          : `Updated ${session.guestName} status to ${nextStatus}.`,
        3000
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to update guest session status');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (session: GuestSessionRecord) => {
    const warnPaid =
      session.paymentStatus === 'PAID'
        ? `\n\n⚠️ Note: This session is PAID (${session.amount.toLocaleString('vi-VN')} đ). Deleting it will deduct ${session.amount.toLocaleString('vi-VN')} đ from Guest Sessions revenue.`
        : '';
    if (
      !window.confirm(
        `Delete guest session record for ${session.guestName} (${session.sessionDate})?${warnPaid}`
      )
    ) {
      return;
    }

    setBusyId(session.id);
    try {
      await adminService.deleteGuestSession(session.id);
      setGuestSessions((prev) => prev.filter((item) => item.id !== session.id));
      notify(`Deleted guest session record for ${session.guestName}.`, 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete guest session');
    } finally {
      setBusyId(null);
    }
  };

  const filterTabs: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: counts.ALL },
    { id: 'PENDING', label: 'Pending', count: counts.PENDING },
    { id: 'PAID', label: 'Paid', count: counts.PAID },
    { id: 'CANCELLED', label: 'Cancelled', count: counts.CANCELLED },
  ];

  return (
    <section
      id="guest-sessions-panel"
      ref={panelRef}
      className="dva-glass-panel rounded-3xl p-4 sm:p-6 space-y-4 scroll-mt-20"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[#A855F7]" />
              Guest Sessions &amp; Drop-in Pass
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#A855F7]/15 text-[#C084FC] border border-[#A855F7]/30 tabular-nums">
              Verified: {guestSessionRevenue.toLocaleString('vi-VN')} đ ({paidGuestSessionsCount} paid)
            </span>
            {pendingGuestSessionsCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35 tabular-nums">
                Pending: {counts.pendingAmount.toLocaleString('vi-VN')} đ ({pendingGuestSessionsCount})
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Persistent drop-in scrimmage passes issued via Guest Session Email. Auto-reconciles on MB Bank webhook or 1-click Mark Paid.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap items-center p-1 rounded-full bg-white/[0.04] border border-white/10 gap-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`h-7 px-3 rounded-full text-[11px] font-semibold transition-colors duration-150 cursor-pointer border ${
                  statusFilter === tab.id
                    ? 'bg-purple-500/25 border-purple-400/50 text-purple-200'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={openGuestModal}
            className="h-9 px-4 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white inline-flex items-center gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(168,85,247,0.3)] cursor-pointer transition-colors duration-150"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Guest Email</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 no-scrollbar">
        <table className="w-full min-w-[760px] text-xs text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.04] text-slate-300 font-bold border-b border-white/10">
              <th className="py-3 px-3 rounded-tl-xl">Guest &amp; Contact</th>
              <th className="py-3 px-3">Session Schedule</th>
              <th className="py-3 px-3">VietQR Memo</th>
              <th className="py-3 px-3 text-right">Fee</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right rounded-tr-xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.07] text-slate-300">
            {paginatedSessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No guest sessions found for the selected filter. Click{' '}
                  <strong className="text-purple-300">+ New Guest Email</strong> to issue a drop-in pass.
                </td>
              </tr>
            ) : (
              paginatedSessions.map((g) => {
                const isBusy = busyId === g.id;
                return (
                  <tr key={g.id} className="hover:bg-white/[0.035] transition-colors duration-150">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{g.guestName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[200px]">{g.guestEmail}</span>
                        {g.phone && <span className="font-mono text-slate-500 tabular-nums">· {g.phone}</span>}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-mono font-semibold text-white tabular-nums">
                        {g.sessionDate} · <span className="text-[#C084FC]">{g.sessionTime}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {g.position} ({g.positionPrivilege}) · {g.level}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 font-mono text-[11px] text-amber-300">
                        {g.transferContent}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-white tabular-nums">
                      {g.amount.toLocaleString('vi-VN')} đ
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center ${
                          g.paymentStatus === 'PAID'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                            : g.paymentStatus === 'CANCELLED'
                              ? 'bg-white/[0.05] text-slate-400 border-white/10'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                        }`}
                      >
                        {g.paymentStatus}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {g.paymentStatus !== 'PAID' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleUpdateStatus(g, 'PAID')}
                            className="h-8 px-3 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors duration-150"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Paid</span>
                          </button>
                        )}
                        {g.paymentStatus === 'PENDING' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleUpdateStatus(g, 'CANCELLED')}
                            className="h-8 px-3 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/12 text-slate-300 hover:text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors duration-150"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDelete(g)}
                          title="Delete guest session record"
                          className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-rose-500/15 border border-white/12 hover:border-rose-500/35 text-slate-300 hover:text-rose-300 inline-flex items-center justify-center cursor-pointer disabled:opacity-50 transition-colors duration-150"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={safePage}
        totalItems={filteredSessions.length}
        pageSize={GUEST_PAGE_SIZE}
        onPageChange={setCurrentPage}
        itemLabel="guest sessions"
      />
    </section>
  );
};
