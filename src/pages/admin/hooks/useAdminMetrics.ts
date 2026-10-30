import { useMemo } from 'react';
import { useAdminDashboard } from '../context/AdminDashboardContext';

export interface AdminMetrics {
  totalRevenue: number;
  paidBookingsCount: number;
  pendingBookingsCount: number;
  pendingApplicationsCount: number;
  pendingTrainingCount: number;
  playersCount: number;
  coursesCount: number;
  coachesCount: number;
  newsCount: number;
}

export function useAdminMetrics(): AdminMetrics {
  const { data } = useAdminDashboard();
  const { bookings, applications, trainingRegs, players, coursesList, coachesList, newsList } =
    data;

  return useMemo(() => {
    const paidBookings = bookings.filter((b) => b.paymentStatus === 'PAID');
    const totalRevenue = paidBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const paidBookingsCount = paidBookings.length;
    const pendingBookingsCount = bookings.filter((b) => b.paymentStatus === 'PENDING').length;
    const pendingApplicationsCount = applications.filter((a) => a.status === 'PENDING').length;
    const pendingTrainingCount = trainingRegs.filter((r) => r.status === 'PENDING').length;

    return {
      totalRevenue,
      paidBookingsCount,
      pendingBookingsCount,
      pendingApplicationsCount,
      pendingTrainingCount,
      playersCount: players.length,
      coursesCount: coursesList.length,
      coachesCount: coachesList.length,
      newsCount: newsList.length,
    };
  }, [bookings, applications, trainingRegs, players, coursesList, coachesList, newsList]);
}
