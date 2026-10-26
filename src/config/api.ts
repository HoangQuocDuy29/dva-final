/**
 * Cấu hình API Base URL tập trung cho toàn bộ ứng dụng Frontend (Vite/React).
 * Ưu tiên lấy từ biến môi trường VITE_API_URL, tự động fallback về 'http://localhost:5000' nếu chưa cấu hình.
 */
const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
export const API_BASE_URL = (rawApiUrl && rawApiUrl.length > 0 ? rawApiUrl : 'http://localhost:5000').replace(/\/+$/, '');

/**
 * Helper chuẩn hóa URL cho các endpoint API: `${API_BASE_URL}/api/...`
 * Đảm bảo đường dẫn endpoint luôn bắt đầu bằng dấu gạch chéo `/`.
 */
export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}/api${cleanEndpoint}`;
};
