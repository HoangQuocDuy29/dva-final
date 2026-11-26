import React from 'react';
import { Link } from 'react-router-dom';
import { Home, MapPin, Users, Compass } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <div className="dva-glass-panel max-w-lg w-full mx-auto rounded-3xl p-8 sm:p-10 text-center space-y-6 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-20 -right-20 w-48 h-48 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-rose-600/20 blur-3xl" />

        <div className="relative space-y-4">
          <div className="dva-glass-pill inline-flex items-center gap-2 px-3.5 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-orange-300">
            <Compass className="w-3.5 h-3.5 text-orange-400" />
            <span>PAGE NOT FOUND · ĐƯỜNG DẪN KHÔNG TỒN TẠI</span>
          </div>

          <h1 className="font-heading font-black text-7xl sm:text-8xl leading-none tracking-tight bg-gradient-to-r from-orange-400 via-orange-500 to-rose-600 bg-clip-text text-transparent select-none">
            404
          </h1>

          <div className="space-y-1.5">
            <h2 className="font-heading font-bold text-lg sm:text-xl text-white">
              Không tìm thấy trang bạn yêu cầu
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Đường dẫn có thể đã thay đổi hoặc không còn tồn tại trên hệ thống DVA Volleyball Club. Chọn một điểm đến nhanh bên dưới nhé!
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 shadow-lg shadow-orange-950/40 transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Về Trang Chủ</span>
            </Link>

            <Link
              to="/services/court-map"
              className="dva-glass-pill inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-all"
            >
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              <span>Bản Đồ Sân</span>
            </Link>

            <Link
              to="/players"
              className="dva-glass-pill inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-all"
            >
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Danh Sách VĐV</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
