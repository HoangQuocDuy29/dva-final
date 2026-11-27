import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Table,
  CheckCheck,
  Code,
  Copy,
} from 'lucide-react';
import { googleScriptSyncService } from '../../../services/api';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '../components/sheets/appsScriptTemplate';

export interface SheetsTabProps {
  onOpenSheets?: () => void;
}

export const SheetsTab: React.FC<SheetsTabProps> = ({ onOpenSheets: onOpenSheetsProp }) => {
  const { notify, onOpenSheets: contextOnOpenSheets } = useAdminDashboard();
  const handleOpenSheets = onOpenSheetsProp || contextOnOpenSheets;

  const [googleScriptUrl, setGoogleScriptUrl] = useState<string>(() =>
    googleScriptSyncService.getScriptUrl()
  );
  const [scriptCopied, setScriptCopied] = useState<boolean>(false);
  const [isTestingSync, setIsTestingSync] = useState<boolean>(false);
  const [syncTestMessage, setSyncTestMessage] = useState<string | null>(null);

  return (
    <div className="dva-glass-panel rounded-3xl p-4 sm:p-6 space-y-6 dva-content-reveal">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/35">
              Google Sheets Auto-Sync Webhook
            </span>
            {googleScriptUrl ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đã kết nối Webhook</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 font-bold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Chưa cấu hình URL Script</span>
              </span>
            )}
          </div>
          <h3 className="font-heading font-black text-xl text-white mt-1.5">
            Đồng Bộ Dữ Liệu Tự Động Về Google Sheets (Mỗi Form 1 Sheet)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Mỗi khi có người điền form (Đặt Sân, Đăng Ký Khóa Học, Tuyển Thành Viên, Đơn Hàng DVA Shop), hệ thống sẽ tự động bắn webhook gửi dữ liệu về Google Sheets theo từng Sheet riêng biệt trong cùng 1 file trang tính của CLB.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenSheets}
            className="h-9 px-4 bg-white/[0.06] hover:bg-white/[0.12] text-white font-bold text-xs rounded-full inline-flex items-center gap-1.5 cursor-pointer border border-white/12 transition-colors duration-150"
          >
            <Table className="w-4 h-4 text-emerald-400" />
            <span>Open Live Data Inspector</span>
          </button>
        </div>
      </div>

      {/* URL INPUT & SAVE/TEST ACTION */}
      <div className="bg-white/[0.03] p-4 sm:p-5 rounded-2xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] space-y-3">
        <label className="block text-xs font-bold text-slate-200">
          1. Google Apps Script Web App Deployment URL:
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            value={googleScriptUrl}
            onChange={(e) => setGoogleScriptUrl(e.target.value)}
            className="flex-1 px-3.5 py-2.5 dva-glass-input text-xs font-mono"
          />
          <button
            type="button"
            onClick={async () => {
              await googleScriptSyncService.setScriptUrl(googleScriptUrl);
              notify('Google Apps Script URL saved and synchronized to server!', 3500);
            }}
            className="h-10 px-4 bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] hover:brightness-110 text-white font-bold text-xs rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(249,115,22,0.3)] cursor-pointer transition-colors duration-150 shrink-0"
          >
            Save Configuration
          </button>
          <button
            type="button"
            disabled={isTestingSync || !googleScriptUrl}
            onClick={async () => {
              setIsTestingSync(true);
              setSyncTestMessage(null);
              try {
                // Đảm bảo lưu URL mới nhất lên server trước khi bắn test
                await googleScriptSyncService.setScriptUrl(googleScriptUrl);

                const rand = Math.floor(Math.random() * 9000 + 1000);
                const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);
                const todayDate = new Date().toISOString().split('T')[0];
                const nowVi = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                const nowEn = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });

                // Gửi đồng thời dữ liệu test chuẩn cho cả 5 sheet (bao gồm DonHang_Shop)
                await Promise.all([
                  googleScriptSyncService.testSync('DatSan', {
                    'Mã đặt sân': `TEST-BK-${rand}`,
                    'Tên sân': 'The Cong court',
                    'Ngày đặt': todayDate,
                    'Khung giờ': '19:00 - 20:30',
                    'Tổng số giờ': 1.5,
                    'Họ tên khách': 'Admin Test Sync',
                    'Số điện thoại': '0768299329',
                    'Email': 'admin.test@dva.vn',
                    'Tổng tiền (VNĐ)': 750000,
                    'Trạng thái': 'TEST_SUCCESS',
                    'Ghi chú': 'Kiểm tra kết nối Webhook từ DVA Admin Portal',
                  }),
                  googleScriptSyncService.testSync('Training_Registrations', {
                    Timestamp: nowIso,
                    Manual_Trigger: 'Admin Console Test Sync',
                    Status: 'TEST_SUCCESS',
                  }),
                  googleScriptSyncService.testSync('DangKyKhoaHoc', {
                    'Mã đăng ký': `TR-${rand}`,
                    'Gói tập / Khóa học': 'Học 1-1 với coach kèm từ cơ bản',
                    'Cấp độ / Đội': 'Junior',
                    'Họ và tên học viên': 'Admin Test Sync',
                    'Số điện thoại': '0768299329',
                    'Email': 'admin.test@dva.vn',
                    'Vị trí thi đấu / Mục tiêu tập': 'Tấn công & Bật đà',
                    'Khung giờ mong muốn': 'Tối T2 - T4 - T6 (19:00 - 21:30)',
                    'Mức học phí (VNĐ)': 1500000,
                    'Nội dung chuyển khoản': 'DVA SKILL 0768299329',
                    'Trạng thái': 'Pending',
                    'Ghi chú': 'Kiểm tra kết nối khóa học từ Admin Portal',
                    'Thời gian đăng ký': nowVi,
                  }),
                  googleScriptSyncService.testSync('TuyenThanhVien', {
                    'Họ và tên': 'Admin Test Athlete',
                    'Ngày sinh': '2005-01-01',
                    'Vị trí': 'OH',
                    'Cấp độ': 'Junior (Intermediate)',
                    'Số áo mong muốn': 15,
                    'Chiều cao (cm)': 185,
                    'Cân nặng (kg)': 75,
                    'Bật đập (cm)': 330,
                    'Bật chắn (cm)': 315,
                    'Số Zalo': '0768299329',
                    'Email': 'admin.test@dva.vn',
                    'Instagram': '@dva.volleyball',
                    'Chiến thuật 5-1': '5-1',
                    'Quê quán': 'Hà Nội',
                    'Thời gian gửi': nowEn,
                    'Giới tính': 'Nam',
                  }),
                  googleScriptSyncService.testSync('DonHang_Shop', {
                    'Mã đơn hàng': `DVA-SHOP-TEST-${rand}`,
                    'Phân loại danh mục': 'Sleeveless Jersey',
                    'Tên sản phẩm': 'DVA Pro Sleeveless Jersey 2026 (x1)',
                    'Size': 'XL',
                    'Số lượng': 1,
                    'Họ tên khách': 'Admin Test Shop',
                    'SĐT': '0768299329',
                    'Email': 'admin.test@dva.vn',
                    'Instagram/Facebook': '@dva.volleyball',
                    'Hình thức nhận': 'Nhận tại Sân BTL Thông Tin (Miễn phí)',
                    'Địa chỉ nhận': 'Sân bóng chuyền BTL Thông Tin (168 Phố Nguyễn Ngọc Nại, Thanh Xuân, Hà Nội)',
                    'Chiều cao/Cân nặng': '185cm / 76kg',
                    'Tên in áo': 'HOANG DUY',
                    'Số áo in': '12',
                    'Tổng tiền (VNĐ)': 350000,
                    'Nội dung CK': `DVA SLV ${rand}`,
                    'Trạng thái đơn': 'PAID (Test Idempotent Upsert)',
                    'Ghi chú': 'Kiểm tra đồng bộ đơn hàng DVA Shop từ Admin Portal',
                  }),
                ]);

                setSyncTestMessage(
                  'Đã gửi thành công dữ liệu test vào cả 5 sheet: DatSan, Training_Registrations, DangKyKhoaHoc, TuyenThanhVien và DonHang_Shop!'
                );
              } catch (err: any) {
                setSyncTestMessage('Test dispatch error: ' + (err?.message || 'Could not connect'));
              } finally {
                setIsTestingSync(false);
              }
            }}
            className="h-10 px-4 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 disabled:opacity-50 text-emerald-300 font-bold text-xs rounded-full cursor-pointer transition-colors duration-150 shrink-0"
          >
            {isTestingSync ? 'Sending...' : 'Test Send to Sheet'}
          </button>
        </div>

        {syncTestMessage && (
          <div className="p-3 bg-emerald-500/12 border border-emerald-500/35 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCheck className="w-4 h-4 shrink-0" />
            <span>{syncTestMessage}</span>
          </div>
        )}
      </div>

      {/* 4 SHEETS INFO CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.055] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] space-y-1.5 transition-colors duration-150">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-white">Tab: DatSan</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/35">Court Bookings</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Stores booking code, court, date, session, athlete name, phone, email, fee, VietQR memo, and payment status.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.055] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] space-y-1.5 transition-colors duration-150">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-white">Tab: DangKyKhoaHoc</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-500/15 text-orange-300 border border-orange-500/35">Training</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Stores scrimmage matchplay and 1-on-1 private masterclass enrollments, skill tier, preferred slot, and contact details.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.055] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] space-y-1.5 transition-colors duration-150">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-white">Tab: TuyenThanhVien</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/35">Tryouts</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Stores athlete recruit applications: position, division, height, spike reach, block reach, Zalo, and 5-1 knowledge.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.055] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] space-y-1.5 transition-colors duration-150">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-white">Tab: DonHang_Shop</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/35">DVA Store</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Stores DVA Shop merchandise orders, jersey printing specs, court pick-up / COD delivery, VietQR memo, and idempotent status updates.
          </p>
        </div>
      </div>

      {/* SCRIPT CODE BOX & 4 STEPS SETUP GUIDE */}
      <div className="bg-white/[0.03] p-4 sm:p-5 rounded-2xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="font-bold text-white text-xs">
              Updated Google Apps Script Code (Copy & Paste into Apps Script)
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
              setScriptCopied(true);
              setTimeout(() => setScriptCopied(false), 3000);
            }}
            className="h-8 px-3.5 bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 text-xs font-bold rounded-full inline-flex items-center gap-1.5 cursor-pointer border border-white/12 transition-colors duration-150 shrink-0"
          >
            {scriptCopied ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Code Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-orange-400" />
                <span>Copy Apps Script Code</span>
              </>
            )}
          </button>
        </div>

        {/* 4-Step Guide */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[11px] text-slate-300">
          <div className="p-3 bg-white/[0.025] rounded-xl border border-white/[0.08] space-y-1">
            <span className="font-bold text-orange-400">Step 1: Open Google Sheet</span>
            <p className="text-slate-400">
              Create a new Google Spreadsheet on your Google Drive (e.g. named <em>DVA Volleyball Database</em>).
            </p>
          </div>
          <div className="p-3 bg-white/[0.025] rounded-xl border border-white/[0.08] space-y-1">
            <span className="font-bold text-orange-400">Step 2: Open Apps Script</span>
            <p className="text-slate-400">
              On the Google Sheets top menu, click <strong>Extensions</strong> &gt; <strong>Apps Script</strong>.
            </p>
          </div>
          <div className="p-3 bg-white/[0.025] rounded-xl border border-white/[0.08] space-y-1">
            <span className="font-bold text-orange-400">Step 3: Paste Code & Save</span>
            <p className="text-slate-400">
              Replace all existing code in <code className="text-slate-200">Code.gs</code> with the copied code above, and click <strong>Save</strong>.
            </p>
          </div>
          <div className="p-3 bg-white/[0.025] rounded-xl border border-white/[0.08] space-y-1">
            <span className="font-bold text-orange-400">Step 4: Deploy Web App</span>
            <p className="text-slate-400">
              Click <strong>Deploy</strong> &gt; <strong>New deployment</strong> &gt; select <strong>Web app</strong>. Set <em>Who has access</em> to <strong>Anyone</strong>. Copy the Web App URL and paste it into the field above.
            </p>
          </div>
        </div>

        {/* Readonly script snippet */}
        <pre className="p-3.5 bg-black/35 rounded-xl border border-white/10 text-[10px] font-mono text-slate-300 max-h-52 overflow-y-auto no-scrollbar leading-relaxed">
          {GOOGLE_APPS_SCRIPT_TEMPLATE}
        </pre>
      </div>
    </div>
  );
};
