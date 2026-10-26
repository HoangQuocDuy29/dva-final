/**
 * Cấu hình API Base URL tập trung cho toàn bộ ứng dụng Frontend (Vite/React).
 * Sử dụng biến môi trường linh hoạt VITE_API_URL, mặc định fallback về 'http://localhost:5000'.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

/**
 * Helper chuẩn hóa URL cho các endpoint API: `${API_BASE_URL}/api/...`
 * Đảm bảo đường dẫn endpoint luôn bắt đầu bằng dấu gạch chéo `/`.
 */
export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}/api${cleanEndpoint}`;
};
