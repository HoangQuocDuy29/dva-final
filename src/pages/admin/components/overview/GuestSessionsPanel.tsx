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
      className="bg-[#111827] border border-[#1E293B] rounded-3xl p-6 space-y-4 scroll-mt-20"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1E293B] pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[#A855F7]" />
              Guest Sessions &amp; Drop-in Pass
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#A855F7]/15 text-[#C084FC] border border-[#A855F7]/30">
              Verified: {guestSessionRevenue.toLocaleString('vi-VN')} đ ({paidGuestSessionsCount} paid)
            </span>
            {pendingGuestSessionsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/70 text-amber-300 border border-amber-700/50">
                Pending: {counts.pendingAmount.toLocaleString('vi-VN')} đ ({pendingGuestSessionsCount})
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Persistent drop-in scrimmage passes issued via Guest Session Email. Auto-reconciles on MB Bank webhook or 1-click Mark Paid.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-1 rounded-xl bg-[#0B0F19] border border-[#1E293B] gap-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#A855F7] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={openGuestModal}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-purple-950/40 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Guest Email</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[760px] text-xs text-left border-collapse">
          <thead>
            <tr className="bg-[#0B0F19] text-slate-400 font-bold border-b border-[#1E293B]">
              <th className="py-3 px-3">Guest &amp; Contact</th>
              <th className="py-3 px-3">Session Schedule</th>
              <th className="py-3 px-3">VietQR Memo</th>
              <th className="py-3 px-3 text-right">Fee</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B] text-slate-300">
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
                  <tr key={g.id} className="hover:bg-slate-800/35 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{g.guestName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[200px]">{g.guestEmail}</span>
                        {g.phone && <span className="font-mono text-slate-500">· {g.phone}</span>}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-mono font-semibold text-white">
                        {g.sessionDate} · <span className="text-[#A855F7]">{g.sessionTime}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {g.position} ({g.positionPrivilege}) · {g.level}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded bg-[#0B0F19] border border-[#1E293B] font-mono text-[11px] text-amber-300">
                        {g.transferContent}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-white tabular-nums">
                      {g.amount.toLocaleString('vi-VN')} đ
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          g.paymentStatus === 'PAID'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : g.paymentStatus === 'CANCELLED'
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
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
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
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
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
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
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-950/80 text-slate-400 hover:text-red-300 cursor-pointer disabled:opacity-50 transition-colors"
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
