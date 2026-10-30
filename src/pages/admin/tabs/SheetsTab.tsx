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
    <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
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
          <h3 className="font-heading font-black text-xl text-white mt-1">
            Đồng Bộ Dữ Liệu Tự Động Về Google Sheets (Mỗi Form 1 Sheet)
          </h3>
          <p className="text-xs text-slate-400">
            Mỗi khi có người điền form (Đặt Sân, Đăng Ký Khóa Học, Tuyển Thành Viên), hệ thống sẽ tự động bắn webhook gửi dữ liệu về Google Sheets theo từng Sheet riêng biệt trong 1 file trang tính.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenSheets}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-slate-700"
          >
            <Table className="w-4 h-4 text-emerald-400" />
            <span>Open Live Data Inspector</span>
          </button>
        </div>
      </div>

      {/* URL INPUT & SAVE/TEST ACTION */}
      <div className="bg-[#0E1524] p-5 rounded-2xl border border-slate-800 space-y-3">
        <label className="block text-xs font-bold text-slate-200">
          1. Google Apps Script Web App Deployment URL:
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            value={googleScriptUrl}
            onChange={(e) => setGoogleScriptUrl(e.target.value)}
            className="flex-1 px-3.5 py-2.5 bg-[#080C14] border border-slate-700 rounded-xl text-white text-xs font-mono outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            type="button"
            onClick={async () => {
              await googleScriptSyncService.setScriptUrl(googleScriptUrl);
              notify('Google Apps Script URL saved and synchronized to server!', 3500);
            }}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-colors shrink-0"
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

                // Gửi đồng thời dữ liệu test chuẩn cho cả 4 sheet
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
                  }),
                ]);

                setSyncTestMessage(
                  'Đã gửi thành công dữ liệu test vào cả 4 sheet: DatSan, Training_Registrations, DangKyKhoaHoc và TuyenThanhVien!'
                );
              } catch (err: any) {
                setSyncTestMessage('Test dispatch error: ' + (err?.message || 'Could not connect'));
              } finally {
                setIsTestingSync(false);
              }
            }}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-colors shrink-0"
          >
            {isTestingSync ? 'Sending...' : 'Test Send to Sheet'}
          </button>
        </div>

        {syncTestMessage && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-700 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCheck className="w-4 h-4 shrink-0" />
            <span>{syncTestMessage}</span>
          </div>
        )}
      </div>

      {/* 4 SHEETS INFO CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-[#0E1524] border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white">Tab: DatSan</span>
            <span className="px-2 py-0.5 rounded text-[9px] bg-red-950 text-red-300 border border-red-800">Court Bookings</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Stores booking code, court, date, session, athlete name, phone, email, fee, VietQR memo, and payment status.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0E1524] border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white">Tab: DangKyKhoaHoc</span>
            <span className="px-2 py-0.5 rounded text-[9px] bg-orange-950 text-orange-300 border border-orange-800">Training</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Stores scrimmage matchplay and 1-on-1 private masterclass enrollments, skill tier, preferred slot, and contact details.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0E1524] border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white">Tab: TuyenThanhVien</span>
            <span className="px-2 py-0.5 rounded text-[9px] bg-blue-950 text-blue-300 border border-blue-800">Tryouts</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Stores athlete recruit applications: position, division, height, spike reach, block reach, Zalo, and 5-1 knowledge.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0E1524] border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white">Tab: LienHe</span>
            <span className="px-2 py-0.5 rounded text-[9px] bg-purple-950 text-purple-300 border border-purple-800">Contact</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Stores urgent reservations, service feedback, and inquiries submitted by website visitors.
          </p>
        </div>
      </div>

      {/* SCRIPT CODE BOX & 4 STEPS SETUP GUIDE */}
      <div className="bg-[#0E1524] p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-orange-400" />
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
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer border border-slate-700"
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
          <div className="p-3 bg-[#080C14] rounded-xl border border-slate-800/80 space-y-1">
            <span className="font-bold text-orange-400">Step 1: Open Google Sheet</span>
            <p className="text-slate-400">
              Create a new Google Spreadsheet on your Google Drive (e.g. named <em>DVA Volleyball Database</em>).
            </p>
          </div>
          <div className="p-3 bg-[#080C14] rounded-xl border border-slate-800/80 space-y-1">
            <span className="font-bold text-orange-400">Step 2: Open Apps Script</span>
            <p className="text-slate-400">
              On the Google Sheets top menu, click <strong>Extensions</strong> &gt; <strong>Apps Script</strong>.
            </p>
          </div>
          <div className="p-3 bg-[#080C14] rounded-xl border border-slate-800/80 space-y-1">
            <span className="font-bold text-orange-400">Step 3: Paste Code & Save</span>
            <p className="text-slate-400">
              Replace all existing code in <code className="text-slate-200">Code.gs</code> with the copied code above, and click <strong>Save</strong>.
            </p>
          </div>
          <div className="p-3 bg-[#080C14] rounded-xl border border-slate-800/80 space-y-1">
            <span className="font-bold text-orange-400">Step 4: Deploy Web App</span>
            <p className="text-slate-400">
              Click <strong>Deploy</strong> &gt; <strong>New deployment</strong> &gt; select <strong>Web app</strong>. Set <em>Who has access</em> to <strong>Anyone</strong>. Copy the Web App URL and paste it into the field above.
            </p>
          </div>
        </div>

        {/* Readonly script snippet */}
        <pre className="p-3.5 bg-[#080C14] rounded-xl border border-slate-800 text-[10px] font-mono text-slate-300 max-h-52 overflow-y-auto leading-relaxed">
          {GOOGLE_APPS_SCRIPT_TEMPLATE}
        </pre>
      </div>
    </div>
  );
};
